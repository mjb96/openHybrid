// @ts-check
// =============================================================================
// SET MUTATIONS — row structure and row metadata in the workout cockpit.
//
// This module owns adding/removing rows, removal Undo, set type, load mode,
// bodyweight/band handling and per-set RIR. The event router stays in
// js/workout.js and calls these handlers. State and redraws flow through the
// forward-only workout context, so this module never imports workout.js back.
//
// Quick-log, checkbox completion and finish-review persistence deliberately stay
// out: they coordinate PRs, timers, accordion flow and session completion, which
// are separate seams rather than simple row mutations.
// =============================================================================
import { setRowNumberLabel } from './set-entry.js';
import { showToast } from '../state.js';
import { dateKey } from '../dates.js';
import { numberPromptModal, textPromptModal } from '../ui/confirm-modal.js';
import { applySetRemoval, restoreSetRemoval } from './set-plan.js';
import { preferredSetMode } from './set-shape.js';
import { SET_MODE, setModeOf } from '../set-utils.js';
import { applyBandLoad, applyLoadMode, bandRole, resolvedLoadMode } from './load-mode.js';
import {
  defaultBasisForExercise, nextBasis, normalizeBasis,
} from './load-basis.js';
import { effortForSet, normalizeEffortRir } from './effort.js';
import { activeWorkoutDay, activeWorkoutWeekKey } from './one-off-session.js';
import {
  getState as _getState,
  getSelectedDay as _getSelectedDay,
  saveState as _saveState,
  rerenderWorkout,
} from './context.js';

export function appendCustomSetRow(btnNode, liftName) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);

  if (!appState.weeks[weekKey].lifts[selectedDay]) appState.weeks[weekKey].lifts[selectedDay] = {};
  if (!appState.weeks[weekKey].lifts[selectedDay][liftName]) {
    appState.weeks[weekKey].lifts[selectedDay][liftName] = [];
  }
  const set = { w: '', r: '', c: false };
  const mode = preferredSetMode(appState, liftName);
  if (mode !== SET_MODE.REPS) set.mode = mode;
  appState.weeks[weekKey].lifts[selectedDay][liftName].push(set);
  _saveState(true);
  rerenderWorkout();
}

// A drop set is the same lift at a lighter load, performed immediately after
// the set it follows. The shortcut only SEEDS the row: 20% off the last
// working set, rounded to a loadable step, with the shape and reps copied so
// the athlete can tick it and adjust. Nothing is inferred at completion time.
const DROP_SET_FACTOR = 0.8;
const DROP_SET_STEP = { kg: 2.5, lb: 5 };

function _dropSetLoad(weight, unit) {
  const step = DROP_SET_STEP[unit] || DROP_SET_STEP.kg;
  const target = weight * DROP_SET_FACTOR;
  const rounded = Math.round(target / step) * step;
  // With no lighter rung available (a 2.5 kg dumbbell), keep the source load
  // rather than inventing a weight the equipment does not have.
  const next = rounded > 0 && rounded < weight ? rounded : weight;
  return Number(next.toFixed(2));
}

// A prescribed card often has blank rows after the one just ticked. Seeding
// from "the last row" would therefore produce an empty drop; the source is the
// last row that actually carries work (completed or typed ahead).
function _hasDropSource(set) {
  if (!set || set.type === 'W') return false;
  if (set.c) return true;
  if (Number.parseFloat(set.w) > 0) return true;
  return Number(set.sec) > 0 || Number(set.dist) > 0;
}

/**
 * Add a drop-set row after the last working row, seeded from it. Drop sets are
 * separate rows (never a nested `drops` array): the type is `D`, so volume,
 * history and the type pill already understand it, and the athlete can edit
 * every seeded value like any other set.
 */
export function appendDropSetRow(btnNode, liftName) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);

  if (!appState.weeks[weekKey].lifts[selectedDay]) appState.weeks[weekKey].lifts[selectedDay] = {};
  if (!appState.weeks[weekKey].lifts[selectedDay][liftName]) {
    appState.weeks[weekKey].lifts[selectedDay][liftName] = [];
  }
  const sets = appState.weeks[weekKey].lifts[selectedDay][liftName];

  let source = null;
  for (let i = sets.length - 1; i >= 0; i -= 1) {
    if (_hasDropSource(sets[i])) { source = sets[i]; break; }
  }
  const next = { w: '', r: '', c: false, type: 'D' };

  if (source) {
    const mode = setModeOf(source);
    if (mode !== SET_MODE.REPS) next.mode = mode;

    const unit = appState.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
    const sourceLoadMode = resolvedLoadMode(source, liftName);
    const weight = parseFloat(source.w);
    if (sourceLoadMode === 'weighted' && Number.isFinite(weight) && weight > 0) {
      next.w = String(_dropSetLoad(weight, unit));
    } else if (source.w != null && source.w !== '') {
      // Bodyweight/assisted/banded: the load is not a free weight to discount.
      next.w = source.w;
    }
    if (source.bw) next.bw = true;
    if (source.band) next.band = source.band;
    if (source.loadMode) next.loadMode = source.loadMode;
    if (source.basis) next.basis = source.basis;

    if (mode === SET_MODE.TIME) {
      if (source.sec != null && source.sec !== '') next.sec = source.sec;
    } else if (mode === SET_MODE.DISTANCE) {
      if (source.dist != null && source.dist !== '') next.dist = source.dist;
    } else if (source.r != null && source.r !== '') {
      next.r = source.r;
    }
  } else {
    const mode = preferredSetMode(appState, liftName);
    if (mode !== SET_MODE.REPS) next.mode = mode;
  }

  // Extra rows belong at the end, after the prescribed sets, not wedged
  // between rows the plan already owns.
  sets.push(next);
  _saveState(true);
  rerenderWorkout();
}

export function appendWarmupSetRow(btnNode, liftName) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);

  if (!appState.weeks[weekKey].lifts[selectedDay]) appState.weeks[weekKey].lifts[selectedDay] = {};
  if (!appState.weeks[weekKey].lifts[selectedDay][liftName]) {
    appState.weeks[weekKey].lifts[selectedDay][liftName] = [];
  }
  const sets = appState.weeks[weekKey].lifts[selectedDay][liftName];
  const firstWorkingIndex = sets.findIndex((set) => !set.type || set.type !== 'W');
  const newSet = { w: '', r: '', c: false, type: 'W' };
  const mode = preferredSetMode(appState, liftName);
  if (mode !== SET_MODE.REPS) newSet.mode = mode;
  if (firstWorkingIndex === -1) sets.push(newSet);
  else sets.splice(firstWorkingIndex, 0, newSet);

  _saveState(true);
  rerenderWorkout();
}

/**
 * Set a row's shape directly. The set sheet offers the three shapes as a
 * segment, so it must not have to cycle through the two it does not want.
 * @param {string} liftName
 * @param {number} setIndex
 * @param {'reps'|'time'|'distance'} mode
 */
export function setSetMode(liftName, setIndex, mode) {
  const appState = _getState();
  if (!appState) return;
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const set = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName]?.[setIndex];
  if (!set) return;
  if (setModeOf(set) === mode) return;
  // A completed row must not stay ticked when the new shape has no value to
  // show (60×8 is not a hold). Switching back to a shape that still carries its
  // old value keeps completion; nothing typed is ever deleted.
  const hasValue = mode === SET_MODE.TIME ? (Number(set.sec) || 0) > 0
    : mode === SET_MODE.DISTANCE ? (Number(set.dist) || 0) > 0
    : (parseInt(set.r, 10) || 0) > 0;
  if (!hasValue) {
    set.c = false;
    delete set.isPR;
  }
  set.mode = mode;
  _saveState(true);
  rerenderWorkout();
}

/** Cycle a row's shape: Reps → Time → Distance → Reps. */
export function cycleSetMode(liftName, setIndex) {
  const appState = _getState();
  if (!appState) return;
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const set = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName]?.[setIndex];
  if (!set) return;
  const current = setModeOf(set);
  const next = current === SET_MODE.REPS ? SET_MODE.TIME
    : current === SET_MODE.TIME ? SET_MODE.DISTANCE : SET_MODE.REPS;
  setSetMode(liftName, setIndex, /** @type {any} */ (next));
}

export function removeCustomSetRow(liftName, setIndex) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const week = appState.weeks?.[weekKey];
  if (!week) return;

  // set-plan.js owns the data operation and stamps the athlete's chosen count so
  // the scaffolding pass cannot silently pad a deleted row back into the workout.
  const result = applySetRemoval(week, selectedDay, liftName, setIndex);
  if (!result.ok) return;

  _saveState(true);
  rerenderWorkout();
  _offerSetUndo({ liftName, selectedDay, weekKey, snapshot: result });
}

function _restoreRemovedSet(undo) {
  const appState = _getState();
  const week = appState.weeks?.[undo.weekKey];
  if (!week) return;
  if (!restoreSetRemoval(week, undo.selectedDay, undo.liftName, undo.snapshot)) return;
  _saveState(true);
  rerenderWorkout();
  showToast('Set restored ✓');
}

// This snackbar predates the shared workout-discard Undo. Its exact interaction
// is preserved during extraction; consolidating visual primitives is separate.
let _undoSnackTimer = null;
function _offerSetUndo(undo) {
  if (typeof document === 'undefined') return;
  document.getElementById('setUndoSnack')?.remove();
  if (_undoSnackTimer) {
    clearTimeout(_undoSnackTimer);
    _undoSnackTimer = null;
  }

  const snack = document.createElement('div');
  snack.id = 'setUndoSnack';
  snack.setAttribute('role', 'status');
  snack.style.cssText =
    'position:fixed;left:50%;transform:translateX(-50%);' +
    'bottom:calc(88px + env(safe-area-inset-bottom, 0px));z-index:9998;' +
    'display:flex;align-items:center;gap:14px;max-width:calc(100% - 32px);' +
    'background:#1e293b;color:#f8fafc;border:1px solid rgba(255,255,255,0.14);' +
    'border-radius:12px;padding:11px 16px;box-shadow:0 8px 28px rgba(0,0,0,0.4);font-size:0.85rem;';
  snack.innerHTML =
    '<span style="flex:1;">Set removed</span>' +
    '<button type="button" id="setUndoBtn" style="min-height:44px;background:none;border:none;' +
    'color:#60a5fa;font-weight:800;font-size:0.85rem;cursor:pointer;padding:4px 8px;">UNDO</button>';
  document.body.appendChild(snack);

  const dismiss = () => {
    snack.remove();
    if (_undoSnackTimer) clearTimeout(_undoSnackTimer);
    _undoSnackTimer = null;
  };
  snack.querySelector('#setUndoBtn')?.addEventListener('click', () => {
    _restoreRemovedSet(undo);
    dismiss();
  });
  _undoSnackTimer = setTimeout(dismiss, 6000);
}

/**
 * Set the type directly (the set sheet offers four choices) instead of cycling
 * through them. Same DOM refresh as the cycle path so the row's colour, label
 * and stored shape cannot disagree.
 * @param {string} liftName
 * @param {number} setIndex
 * @param {''|'W'|'D'|'F'} type
 */
export function setSetType(liftName, setIndex, type) {
  const next = type === 'W' || type === 'D' || type === 'F' ? type : '';
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName];
  if (!sets || setIndex >= sets.length) return;
  if ((sets[setIndex].type || '') === next) return;
  sets[setIndex].type = next;

  const exerciseCard = document.querySelector(`.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"]`);
  const row = exerciseCard?.querySelectorAll('.cockpit-set-row')?.[setIndex];
  if (row) {
    row.classList.remove('type-warmup', 'type-dropset', 'type-amrap');
    if (next === 'W') row.classList.add('type-warmup');
    else if (next === 'D') row.classList.add('type-dropset');
    else if (next === 'F') row.classList.add('type-amrap');
    const label = row.querySelector('.set-num-lbl');
    if (label) label.textContent = setRowNumberLabel(next, setIndex);
  }
  _saveState(true);
}

export function cycleSetType(liftName, setIndex) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName];
  if (!sets || setIndex >= sets.length) return;
  const cycle = /** @type {Record<string, string>} */ ({ '': 'W', W: 'D', D: 'F', F: '' });
  setSetType(liftName, setIndex, /** @type {any} */ (cycle[sets[setIndex].type || '']));
}

/** The latest athlete-supplied body weight, or null. Never fabricate a default. */
export function currentBodyweight(appState) {
  const log = appState.bodyWeightLog || [];
  for (let index = log.length - 1; index >= 0; index -= 1) {
    const weight = parseFloat(log[index]?.weight);
    if (Number.isFinite(weight) && weight > 0) return weight;
  }
  const defaultWeight = parseFloat(appState.settings?.defaultBodyWeight);
  if (Number.isFinite(defaultWeight) && defaultWeight > 0) return defaultWeight;
  return null;
}

function _replaceSet(sets, index, next) {
  // Preserve array identity because other workout consumers can hold this list.
  sets[index] = next;
}

function _syncLoadModeRow(liftName, setIndex, set) {
  const exerciseCard = document.querySelector(`.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"]`);
  const row = /** @type {HTMLElement|undefined} */ (exerciseCard?.querySelectorAll('.cockpit-set-row')?.[setIndex]);
  if (!row) return;
  const mode = resolvedLoadMode(set, liftName);
  row.dataset.loadMode = mode;
  const weightInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.input-weight-node'));
  if (weightInput) weightInput.value = set.w || '';
}

/** Ask once when a bodyweight-dependent load mode has no real body weight. */
async function _ensureBodyweight(appState) {
  const known = currentBodyweight(appState);
  if (known != null) return known;

  const unit = appState.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
  const entered = await numberPromptModal({
    title: 'What do you weigh?',
    message: 'Bodyweight and band-assisted sets are logged against your body weight, so this is the load for those sets.',
    label: 'Body weight',
    unit,
    confirmLabel: 'Save',
    max: unit === 'lbs' ? 1000 : 450,
  });
  if (entered == null) return null;

  if (!appState.settings) appState.settings = {};
  appState.settings.defaultBodyWeight = entered;
  if (!Array.isArray(appState.bodyWeightLog)) appState.bodyWeightLog = [];
  const today = dateKey();
  const existing = appState.bodyWeightLog.findIndex((entry) => entry?.date === today);
  if (existing >= 0) appState.bodyWeightLog[existing].weight = entered;
  else appState.bodyWeightLog.push({ date: today, weight: entered });
  _saveState(true);
  return entered;
}

export async function setSetLoadMode(liftName, setIndex, mode) {
  if (!['bodyweight', 'weighted', 'assisted'].includes(mode)) return;
  const appState = _getState();
  if ((mode === 'bodyweight' || mode === 'assisted') && await _ensureBodyweight(appState) == null) return;

  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName];
  if (!sets || setIndex < 0 || setIndex >= sets.length) return;
  const next = applyLoadMode(sets[setIndex], mode, {
    bodyweight: currentBodyweight(appState),
    bandWeights: appState.settings?.bandWeights,
  });
  _replaceSet(sets, setIndex, next);
  _syncLoadModeRow(liftName, setIndex, next);
  _saveState(true);
}

export async function cycleSetLoad(liftName, setIndex) {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[selectedDay]?.[liftName];
  if (!sets || setIndex < 0 || setIndex >= sets.length) return;
  const set = sets[setIndex];
  const bands = appState.settings?.bandWeights || { L: 10, M: 20, H: 30 };

  const order = ['', 'BW', 'L', 'M', 'H'];
  const current = set.bw ? 'BW' : (set.band || '');
  const next = order[(order.indexOf(current) + 1) % order.length];
  const needsBodyweight = next === 'BW' || (next && bandRole(liftName) === 'assist');
  if (needsBodyweight && await _ensureBodyweight(appState) == null) return;

  let nextSet;
  if (next === 'BW') {
    nextSet = applyLoadMode(set, 'bodyweight', {
      bodyweight: currentBodyweight(appState), bandWeights: bands,
    });
  } else if (next) {
    nextSet = applyBandLoad(set, next, {
      exercise: liftName,
      bodyweight: currentBodyweight(appState),
      bandWeights: bands,
    });
  } else {
    nextSet = applyLoadMode(set, 'weighted', {
      bodyweight: currentBodyweight(appState), bandWeights: bands,
    });
  }
  _replaceSet(sets, setIndex, nextSet);

  const exerciseCard = document.querySelector(`.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"]`);
  const row = exerciseCard?.querySelectorAll('.cockpit-set-row')?.[setIndex];
  if (row) {
    const chip = /** @type {HTMLElement|null} */ (row.querySelector('.btn-load'));
    const labels = { '': 'Weighted', BW: 'Bodyweight', L: '🟢 Light band', M: '🟡 Med band', H: '🔴 Heavy band' };
    const className = next === '' ? 'weighted' : next === 'BW' ? 'bw' : next;
    if (chip) {
      chip.textContent = labels[next];
      chip.className = `btn-load tactile-scale load-${className}`;
    }
    const weightInput = /** @type {HTMLInputElement|null} */ (row.querySelector('.input-weight-node'));
    if (weightInput) weightInput.value = nextSet.w;
  }
  _syncLoadModeRow(liftName, setIndex, nextSet);
  _saveState(true);
}

/**
 * Failure is a per-set fact independent of set type. `type: 'F'` is AMRAP and
 * must stay that way; a set taken to failure can be a normal working set.
 */
export function toggleSetFailure(liftName, setIndex) {
  const appState = _getState();
  const day = _getSelectedDay();
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName];
  if (!sets || !sets[setIndex]) return;
  const set = sets[setIndex];
  set.failure = !set.failure;
  if (!set.failure) delete set.failure;
  _saveState(true);
  const row = document.querySelector(
    `.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"] .cockpit-set-row[data-set-index="${setIndex}"]`,
  );
  row?.setAttribute('data-failure', set.failure ? '1' : '');
}

/**
 * Cycle a dumbbell set's load basis between Each (the entered number is per
 * dumbbell) and Both (the entered number is the pair total). Volume only; e1RM
 * remains per-implement. Legacy completed sets with no basis read as Both.
 */
/**
 * Set what the entered weight means. The set sheet offers all three choices as
 * a segment, so this takes the value directly instead of cycling — `nextBasis`
 * only ever toggles between the exercise's primary basis and `total`, which
 * would make "Per side" unreachable on a dumbbell lift.
 * @param {string} liftName
 * @param {number} setIndex
 * @param {'each'|'total'|'per-side'} basis
 */
export function setLoadBasis(liftName, setIndex, basis) {
  const appState = _getState();
  const day = _getSelectedDay();
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName];
  if (!sets || !sets[setIndex]) return;
  const set = sets[setIndex];
  const current = normalizeBasis(set.basis || (set.c ? 'total' : defaultBasisForExercise(liftName)));
  const next = normalizeBasis(basis);
  if (current === next) return;
  set.basis = next;
  _saveState(true);
  const row = document.querySelector(
    `.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"] .cockpit-set-row[data-set-index="${setIndex}"]`,
  );
  if (row) row.setAttribute('data-load-basis', next);
}

export function toggleLoadBasis(liftName, setIndex) {
  const appState = _getState();
  const day = _getSelectedDay();
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName];
  if (!sets || !sets[setIndex]) return;
  const set = sets[setIndex];
  const current = normalizeBasis(set.basis || (set.c ? 'total' : defaultBasisForExercise(liftName)));
  setLoadBasis(liftName, setIndex, /** @type {any} */ (nextBasis(liftName, current)));
}

function _setAt(liftName, setIndex) {
  const appState = _getState();
  const day = _getSelectedDay();
  const weekKey = activeWorkoutWeekKey(appState);
  return { appState, day, weekKey, sets: appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName] };
}

function _syncSetMetaRow(liftName, setIndex) {
  const row = document.querySelector(
    `.cockpit-exercise[data-liftname="${CSS.escape(liftName)}"] .cockpit-set-row[data-set-index="${setIndex}"]`,
  );
  if (!row) return;
  const set = _setAt(liftName, setIndex).sets?.[setIndex] || {};
  // The row states its rest as an attribute; the set sheet reads it back and
  // the accessibility label uses it. The visible control lives in the sheet, so
  // this must be updated here rather than by rewriting a button that no longer
  // exists in the row.
  const rest = Number(set.restSec);
  row.setAttribute('data-rest-label', set.restSec == null
    ? 'Rest default'
    : rest <= 0 ? 'Rest off' : `Rest ${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`);
  row.querySelector('.set-num-lbl')?.setAttribute(
    'aria-label',
    `Set ${setIndex + 1} options: ${(row.getAttribute('data-rest-label') || '').toLowerCase()}`,
  );
  let noteEl = row.querySelector('.set-note');
  if (set.note) {
    if (!noteEl) {
      noteEl = document.createElement('div');
      noteEl.className = 'set-note';
      const plate = row.querySelector('.set-plate-line');
      if (plate) row.insertBefore(noteEl, plate);
      else row.appendChild(noteEl);
    }
    noteEl.textContent = set.note;
  } else {
    noteEl?.remove();
  }
}

export function setSetRest(liftName, setIndex, seconds) {
  const { sets } = _setAt(liftName, setIndex);
  if (!sets?.[setIndex]) return;
  if (seconds == null) delete sets[setIndex].restSec;
  else sets[setIndex].restSec = Math.max(0, Math.min(600, Math.round(Number(seconds) || 0)));
  _saveState(true);
  _syncSetMetaRow(liftName, setIndex);
}

export async function editSetRest(liftName, setIndex) {
  const { sets } = _setAt(liftName, setIndex);
  if (!sets?.[setIndex]) return;
  const value = await numberPromptModal({
    title: 'Rest after this set',
    message: 'Seconds. 0 turns the timer off for this set; cancel keeps the current setting.',
    label: 'Seconds',
    unit: 's',
    min: -1,
    max: 600,
    confirmLabel: 'Save rest',
  });
  if (value == null) return;
  setSetRest(liftName, setIndex, value);
}

export function clearSetRest(liftName, setIndex) {
  setSetRest(liftName, setIndex, null);
}

export function setSetNote(liftName, setIndex, note) {
  const { sets } = _setAt(liftName, setIndex);
  if (!sets?.[setIndex]) return;
  const value = String(note || '').trim().slice(0, 140);
  if (value) sets[setIndex].note = value;
  else delete sets[setIndex].note;
  _saveState(true);
  _syncSetMetaRow(liftName, setIndex);
}

export async function editSetNote(liftName, setIndex) {
  const { sets } = _setAt(liftName, setIndex);
  if (!sets?.[setIndex]) return;
  const value = await textPromptModal({
    title: 'Set note',
    message: 'A short cue for this set only. Clearing the field removes it.',
    label: 'Note',
    placeholder: 'e.g. paused, belt, left side felt heavy',
    value: sets[setIndex].note || '',
    maxLength: 140,
    confirmLabel: 'Save note',
  });
  if (value == null) return;
  setSetNote(liftName, setIndex, value);
}

export function setPerSetRir(liftName, setIndex, rir) {
  const appState = _getState();
  const day = _getSelectedDay();
  const weekKey = activeWorkoutWeekKey(appState);
  const sets = appState.weeks[weekKey].lifts?.[day]?.[liftName];
  if (!sets || !sets[setIndex]) return;
  const next = normalizeEffortRir(rir);
  // An unrepresentable tap is a no-op, not a silent clear of a real rating.
  if (next == null) return;
  // Compare the EFFECTIVE RIR, so a legacy set that stored only `rpe: 8`
  // clears when its already-active "2" is tapped. Numeric, because a stored
  // imported value may be the string '2'.
  const current = effortForSet(sets[setIndex]);
  const cleared = current.rated && current.rir === next;
  sets[setIndex].rir = cleared ? null : next;
  sets[setIndex].rpe = cleared ? null : 10 - next;
  _saveState(true);
}
