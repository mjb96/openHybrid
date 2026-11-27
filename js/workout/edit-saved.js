// @ts-check
// =============================================================================
// EDIT A SAVED ACTIVITY (js/workout/edit-saved.js)
//
// A finished workout is history, not a frozen screenshot: correcting a typo,
// adding an exercise that was performed but never logged, or removing one that
// was logged by mistake should not require deleting the session.
//
// Strength edits happen on a DRAFT. Add/remove exercise and set never touch the
// stored week until Save, so Cancel is genuinely lossless. Committing preserves
// the session identity, date, activation and route, and keeps the finished
// summary honest about the new working-set count.
// =============================================================================
import {
  SET_MODE, formatDistance, formatDuration, isCompletedSet, isWarmupSet,
  parseDuration, setModeOf,
} from '../set-utils.js';
import { displayWeight, shouldCommitEnteredWeight, storedWeightFromInput } from './units.js';
import { runSessionsForDay, upsertRunSession } from '../state/run-sessions.js';
import { browseExercises, canonicalExerciseId } from '../exercises/catalog.js';
import { showToast } from '../state.js';
import { defaultSetModeForExercise } from './set-shape.js';
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';
import { restampSessionRecords } from '../strength/records.js';
import { computeExercisePRs } from '../engine.js';

const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

let _ctx = null;
/** @type {{day:string,lifts:Record<string,any[]>,liftOrder:string[],notes:string}|null} */
let _draft = null;

/** Update one stored strength set. Returns false when the target is gone. */
export function updateStrengthSet(week, day, lift, index, { w, r }) {
  const sets = week?.lifts?.[day]?.[lift];
  if (!Array.isArray(sets) || !sets[index]) return false;
  const nextW = String(w ?? '').trim();
  const nextR = String(r ?? '').trim();
  sets[index] = { ...sets[index], w: nextW, r: nextR };
  return true;
}

function paceFrom(dist, time) {
  const km = parseFloat(dist);
  const match = String(time || '').match(/^(\d+):([0-5]\d)$/);
  if (!(km > 0) || !match) return '';
  const seconds = Number(match[1]) * 60 + Number(match[2]);
  const perKm = Math.round(seconds / km);
  return `${Math.floor(perKm / 60)}:${String(perKm % 60).padStart(2, '0')}`;
}

/** Update the run session's stored fields, preserving its identity and route. */
export function updateSavedRun(week, day, sessionId, fields) {
  const list = runSessionsForDay(week, day);
  const current = list.find((run) => run.sessionId === sessionId) || list[0] || week?.runs?.[day];
  if (!current) return false;
  const next = {
    ...current,
    dist: String(fields.dist ?? current.dist ?? '').trim(),
    time: String(fields.time ?? current.time ?? '').trim(),
    avgHR: String(fields.avgHR ?? current.avgHR ?? '').trim(),
    maxHR: String(fields.maxHR ?? current.maxHR ?? '').trim(),
    notes: String(fields.notes ?? current.notes ?? '').trim(),
  };
  next.pace = paceFrom(next.dist, next.time) || current.pace || '';
  upsertRunSession(week, day, next, {
    sessionId: current.sessionId || sessionId,
    source: current.source || 'manual',
    localDate: current.localDate || week?.dates?.[day] || null,
    startTs: current.startTs,
  });
  return true;
}

/**
 * A lossless working copy of one saved strength day.
 * @param {any} week
 * @param {string} day
 */
export function buildSavedWorkoutDraft(week, day) {
  const lifts = clone(week?.lifts?.[day] || {}) || {};
  const storedOrder = Array.isArray(week?.liftOrder?.[day]) ? week.liftOrder[day] : [];
  const order = storedOrder.filter((name) => hasOwn(lifts, name));
  // Only lifts that actually carry saved work join the editable list. Later
  // programme scaffolding on the same day is preserved on commit but is not
  // part of this historical session and must not be reordered or shown here.
  for (const name of Object.keys(lifts)) {
    if (!order.includes(name) && (lifts[name] || []).some(visibleSet)) order.push(name);
  }
  return { day, lifts, liftOrder: order, notes: String(week?.notes?.[day] || '') };
}

/** Add an exercise with one editable set in the exercise's natural shape. */
export function addExerciseToDraft(draft, name) {
  const clean = String(name || '').trim();
  if (!draft || !clean || hasOwn(draft.lifts, clean)) return false;
  // An alias of an exercise already in the draft is the same lift; adding it
  // again would create two groups the analytics later merge back together.
  const canonical = canonicalExerciseId(clean);
  if (canonical && Object.keys(draft.lifts).some((entry) => canonicalExerciseId(entry) === canonical)) return false;
  const set = { w: '', r: '', c: false, editNew: true };
  const mode = defaultSetModeForExercise(clean);
  if (mode !== SET_MODE.REPS) set.mode = mode;
  draft.lifts[clean] = [set];
  draft.liftOrder.push(clean);
  return true;
}

export function removeExerciseFromDraft(draft, name) {
  if (!draft || !hasOwn(draft.lifts, name)) return false;
  delete draft.lifts[name];
  draft.liftOrder = draft.liftOrder.filter((entry) => entry !== name);
  return true;
}

/** Add an editable set to an existing draft exercise. */
export function addSetToDraft(draft, name) {
  const sets = draft?.lifts?.[name];
  if (!Array.isArray(sets)) return false;
  const mode = sets.length ? setModeOf(sets[sets.length - 1]) : defaultSetModeForExercise(name);
  const set = { w: '', r: '', c: false, editNew: true };
  if (mode !== SET_MODE.REPS) set.mode = mode;
  sets.push(set);
  return true;
}

export function removeSetFromDraft(draft, name, index) {
  const sets = draft?.lifts?.[name];
  if (!Array.isArray(sets) || !sets[index]) return false;
  sets.splice(index, 1);
  return true;
}

/**
 * Write the draft back to the stored day. New sets with no value are dropped
 * (as is an exercise left with no sets); new sets with a value become completed
 * working sets. Existing sets are preserved exactly.
 * @returns {{ sets:number, exercises:number }}
 */
export function commitSavedWorkoutDraft(week, day, draft) {
  if (!week || typeof week !== 'object' || !draft) return { sets: 0, exercises: 0 };
  const lifts = {};
  const editable = new Set(draft.liftOrder || []);
  // Preserve every lift that was not part of the editable session list (for
  // example the active programme's scaffolding on the same day) exactly.
  for (const [name, sets] of Object.entries(draft.lifts || {})) {
    if (!editable.has(name) && Array.isArray(sets)) lifts[name] = clone(sets);
  }
  const order = [];
  for (const name of draft.liftOrder || []) {
    if (!hasOwn(draft.lifts, name) || hasOwn(lifts, name)) continue;
    const sets = (draft.lifts[name] || []).map((set) => {
      const next = { ...set };
      delete next.editNew;
      if (set.editNew) {
        const hasValue = String(next.w ?? '').trim()
          || String(next.r ?? '').trim()
          || (Number(next.sec) || 0) > 0
          || (Number(next.dist) || 0) > 0;
        if (!hasValue) return null;
        next.c = true;
      }
      if (next.mode === SET_MODE.REPS) delete next.mode;
      return next;
    }).filter(Boolean);
    if (!sets.length) continue;
    lifts[name] = sets;
    order.push(name);
  }
  week.lifts = week.lifts || {};
  week.liftOrder = week.liftOrder || {};
  week.notes = week.notes || {};
  week.lifts[day] = lifts;
  week.liftOrder[day] = order;
  week.notes[day] = String(draft.notes || '');
  if (week.liftMeta?.[day]) {
    for (const name of Object.keys(week.liftMeta[day])) {
      if (!hasOwn(lifts, name)) delete week.liftMeta[day][name];
    }
  }

  const summary = week.sessionSummary?.[day];
  if (summary) {
    const working = Object.values(lifts).reduce((total, sets) =>
      total + sets.filter((set) => isCompletedSet(set) && !isWarmupSet(set)).length, 0);
    const planned = Math.max(0, Number(summary.plannedSets) || 0);
    summary.completedSets = working;
    summary.skippedSets = Math.max(0, planned - working);
    summary.adherencePct = planned > 0
      ? Math.min(100, Math.round((working / planned) * 100))
      : summary.adherencePct;
    summary.modified = true;
  }
  return { sets: Object.values(lifts).reduce((total, sets) => total + sets.length, 0), exercises: order.length };
}

function visibleSet(set) {
  return isCompletedSet(set)
    || set?.type === 'W'
    || set?.editNew === true
    || String(set?.w ?? '').trim() !== ''
    || String(set?.r ?? '').trim() !== ''
    || (Number(set?.sec) || 0) > 0
    || (Number(set?.dist) || 0) > 0;
}

function strengthBody(draft, unit) {
  const groups = (draft?.liftOrder || []).map((lift) => {
    const visible = (draft.lifts[lift] || []).map((set, index) => ({ set, index })).filter(({ set }) => visibleSet(set));
    return `<section class="edit-saved-group" data-edit-group="${esc(lift)}">
      <h4><span>${esc(lift)}</span><button type="button" class="edit-saved-remove" data-edit-remove-lift="${esc(lift)}" aria-label="Remove ${esc(lift)}">Remove</button></h4>
      ${visible.map(({ set, index }) => {
        const mode = setModeOf(set);
        const valueField = mode === SET_MODE.TIME ? 'sec' : mode === SET_MODE.DISTANCE ? 'dist' : 'r';
        const valueLabel = mode === SET_MODE.TIME ? 'Time (M:SS)' : mode === SET_MODE.DISTANCE ? 'Distance (m)' : 'Reps';
        const value = mode === SET_MODE.TIME ? (set.sec ? formatDuration(set.sec) : '')
          : mode === SET_MODE.DISTANCE ? (set.dist ?? '') : (set.r ?? '');
        const shownWeight = displayWeight(_ctx?.state, set.w);
        return `<div class="edit-saved-set" data-edit-set>
          <span class="edit-saved-set__n">${index + 1}${set.type ? ` · ${esc(set.type)}` : ''}</span>
          <label><span>Weight (${esc(unit)})</span><input type="number" inputmode="decimal" step="0.5" min="0" data-edit-lift="${esc(lift)}" data-edit-index="${index}" data-edit-field="w" data-display-value="${esc(shownWeight)}" value="${esc(shownWeight)}"></label>
          <label><span>${valueLabel}</span><input type="${mode === SET_MODE.TIME ? 'text' : 'number'}" ${mode === SET_MODE.TIME ? 'inputmode="text" autocapitalize="off" spellcheck="false"' : 'inputmode="decimal" step="0.01" min="0"'} data-edit-lift="${esc(lift)}" data-edit-index="${index}" data-edit-field="${valueField}" value="${esc(value)}"></label>
          <button type="button" class="edit-saved-remove-set" data-edit-remove-set data-edit-lift="${esc(lift)}" data-edit-index="${index}" aria-label="Remove set ${index + 1} of ${esc(lift)}">✕</button>
        </div>`;
      }).join('')}
      <button type="button" class="edit-saved-add-set" data-edit-add-set="${esc(lift)}">+ Add set</button>
    </section>`;
  }).join('');

  return `${groups || '<p class="edit-saved-empty">No sets are stored. Add the first exercise below.</p>'}
    <section class="edit-saved-add">
      <h4>Add exercise</h4>
      <label class="edit-saved-search"><span>Search the catalogue or type a custom name</span><input id="editAddExerciseSearch" type="search" autocomplete="off" placeholder="Search exercise…"></label>
      <div id="editAddExerciseResults" class="edit-saved-add-results" role="listbox" aria-label="Exercise results"></div>
    </section>
    <label class="edit-saved-notes"><span>Session notes</span><textarea id="editSavedNotes" rows="3">${esc(draft?.notes || '')}</textarea></label>`;
}

function renderAddExerciseResults() {
  const body = document.getElementById('editSavedBody');
  const input = /** @type {HTMLInputElement|null} */ (body?.querySelector('#editAddExerciseSearch'));
  const results = body?.querySelector('#editAddExerciseResults');
  if (!body || !input || !results) return;
  const query = String(input.value || '').trim();
  if (!query) { results.innerHTML = ''; return; }
  const matches = browseExercises({ query }, 6);
  const exact = matches.some((item) => item.name.toLowerCase() === query.toLowerCase());
  results.innerHTML = matches.map((item) => `<button type="button" class="edit-saved-add-result" data-edit-add-lift="${esc(item.name)}" role="option">${esc(item.name)}</button>`).join('')
    + (exact ? '' : `<button type="button" class="edit-saved-add-result edit-saved-add-result--custom" data-edit-add-lift="${esc(query)}" role="option">Add “${esc(query)}” as a new exercise</button>`);
}

function captureDraftInputs() {
  const body = document.getElementById('editSavedBody');
  if (!body || !_draft) return;
  body.querySelectorAll('[data-edit-lift]').forEach((node) => {
    const input = /** @type {HTMLInputElement} */ (node);
    const lift = input.getAttribute('data-edit-lift');
    const index = Number(input.getAttribute('data-edit-index'));
    const field = input.getAttribute('data-edit-field');
    const set = lift ? _draft.lifts[lift]?.[index] : null;
    if (!set || !field) return;
    if (field === 'sec') {
      set.sec = parseDuration(input.value) ?? '';
    } else if (field === 'dist') {
      set.dist = input.value;
    } else if (field === 'w') {
      // The sheet is a display surface; the draft (and therefore storage) is kg.
      // An untouched field still showing the rendered value must not be re-parsed
      // (100 kg → "220.5 lb" → 100.02 kg on a notes-only save).
      const displayed = input.getAttribute('data-display-value');
      if (shouldCommitEnteredWeight({
        entered: input.value,
        displayed,
        hasStoredWeight: String(set.w ?? '').trim() !== '',
      })) {
        set.w = storedWeightFromInput(_ctx?.state, input.value);
      }
    } else {
      set[field] = input.value;
    }
  });
  const notes = /** @type {HTMLTextAreaElement|null} */ (body.querySelector('#editSavedNotes'));
  if (notes) _draft.notes = notes.value;
}

function renderDraft() {
  const body = document.getElementById('editSavedBody');
  if (!body || !_draft) return;
  const scroll = body.scrollTop;
  const unit = _ctx?.state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  body.innerHTML = strengthBody(_draft, unit);
  body.scrollTop = scroll;
}

function bindStrengthEditor(body) {
  body.onclick = (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    const addLift = target.closest('[data-edit-add-lift]');
    if (addLift) {
      captureDraftInputs();
      if (addExerciseToDraft(_draft, addLift.getAttribute('data-edit-add-lift') || '')) renderDraft();
      else showToast('That exercise is already in this workout', true);
      return;
    }
    const removeLift = target.closest('[data-edit-remove-lift]');
    if (removeLift) {
      captureDraftInputs();
      if (removeExerciseFromDraft(_draft, removeLift.getAttribute('data-edit-remove-lift') || '')) renderDraft();
      return;
    }
    const addSet = target.closest('[data-edit-add-set]');
    if (addSet) {
      captureDraftInputs();
      if (addSetToDraft(_draft, addSet.getAttribute('data-edit-add-set') || '')) renderDraft();
      return;
    }
    const removeSet = target.closest('[data-edit-remove-set]');
    if (removeSet) {
      captureDraftInputs();
      if (removeSetFromDraft(_draft, removeSet.getAttribute('data-edit-lift') || '', Number(removeSet.getAttribute('data-edit-index')))) renderDraft();
    }
  };
  body.oninput = (event) => {
    if (/** @type {HTMLElement} */ (event.target).id === 'editAddExerciseSearch') renderAddExerciseResults();
  };
}

function runBody(week, day, sessionId) {
  const list = runSessionsForDay(week, day);
  const run = list.find((entry) => entry.sessionId === sessionId) || list[0] || week?.runs?.[day] || {};
  return `<div class="edit-saved-run">
    <label><span>Distance (km)</span><input type="number" inputmode="decimal" step="0.01" min="0" id="editRunDist" value="${esc(run.dist ?? '')}"></label>
    <label><span>Duration (M:SS)</span><input type="text" inputmode="text" autocapitalize="off" spellcheck="false" id="editRunTime" maxlength="6" value="${esc(run.time ?? '')}"></label>
    <label><span>Avg HR</span><input type="number" inputmode="numeric" min="0" max="260" id="editRunAvgHR" value="${esc(run.avgHR ?? '')}"></label>
    <label><span>Max HR</span><input type="number" inputmode="numeric" min="0" max="260" id="editRunMaxHR" value="${esc(run.maxHR ?? '')}"></label>
    <label class="edit-saved-notes"><span>Notes</span><textarea id="editRunNotes" rows="3">${esc(run.notes ?? '')}</textarea></label>
  </div>`;
}

/** @param {{state:any, weekKey:string, day:string, kind:'strength'|'run', sessionId?:string|null, save:Function, onSaved?:Function}} ctx */
export function openSavedWorkoutEditor(ctx) {
  const sheet = document.getElementById('editSavedSheet');
  const body = document.getElementById('editSavedBody');
  const title = document.getElementById('editSavedTitle');
  if (!sheet || !body || !ctx?.state) return;
  _ctx = ctx;
  if (title) title.textContent = ctx.kind === 'run' ? 'Edit run' : 'Edit workout';
  _draft = ctx.kind === 'strength'
    ? buildSavedWorkoutDraft(ctx.state.weeks?.[ctx.weekKey], ctx.day)
    : null;
  body.innerHTML = _draft
    ? strengthBody(_draft, ctx.state.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg')
    : runBody(ctx.state.weeks?.[ctx.weekKey], ctx.day, ctx.sessionId);
  if (_draft) bindStrengthEditor(body);
  else { body.onclick = null; body.oninput = null; }
  sheet.classList.add('active');
  document.getElementById('editSavedBackdrop')?.classList.add('active');
  openManagedModal(sheet, { initialFocus: body.querySelector('input, textarea, button') });
}

export function closeSavedWorkoutEditor() {
  const sheet = document.getElementById('editSavedSheet');
  if (!sheet) return;
  sheet.classList.remove('active');
  document.getElementById('editSavedBackdrop')?.classList.remove('active');
  closeManagedModal(sheet);
  const body = document.getElementById('editSavedBody');
  if (body) { body.onclick = null; body.oninput = null; }
  _ctx = null;
  _draft = null;
}

export async function saveSavedWorkoutEditor() {
  const ctx = _ctx;
  if (!ctx) return false;
  const week = ctx.state.weeks?.[ctx.weekKey];
  if (!week) { closeSavedWorkoutEditor(); return false; }
  let changed = false;
  if (ctx.kind === 'run') {
    const field = (id) => /** @type {HTMLInputElement|HTMLTextAreaElement|null} */ (document.getElementById(id))?.value;
    changed = updateSavedRun(week, ctx.day, ctx.sessionId, {
      dist: field('editRunDist'),
      time: field('editRunTime'),
      avgHR: field('editRunAvgHR'),
      maxHR: field('editRunMaxHR'),
      notes: field('editRunNotes'),
    });
  } else if (_draft) {
    captureDraftInputs();
    commitSavedWorkoutDraft(week, ctx.day, _draft);
    // The saved day is history again: a corrected-down set must lose the PR it
    // no longer earns, and a raised set that now beats the all-time baseline
    // must gain one. The baseline excludes this whole week/day, so the edit is
    // compared with genuine prior training rather than with itself.
    restampSessionRecords(ctx.state, ctx.weekKey, ctx.day);
    const state = ctx.state;
    if (state) {
      if (!state.exerciseStats) state.exerciseStats = {};
      computeExercisePRs(state, state.exerciseStats);
    }
    changed = true;
  }
  if (!changed) { closeSavedWorkoutEditor(); return false; }
  try { await Promise.resolve(ctx.save?.(true)); } catch { /* save reports its own failure */ }
  const onSaved = ctx.onSaved;
  closeSavedWorkoutEditor();
  onSaved?.();
  return true;
}
