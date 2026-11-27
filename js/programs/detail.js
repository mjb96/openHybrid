// @ts-check
// =============================================================================
// PLAN PAGE (js/programs/detail.js)
// -----------------------------------------------------------------------------
// Roadmap §22 / PL4. One page for one plan, with ONE week control.
//
// Before this: the same plan appeared as (a) a catalogue detail page with
// `Overview | Structure | Plan` tabs, a "sample session" of five lifts and
// three separate week previews, and (b) a second "Active Program" view with a
// different hero, its own week stepper and `THIS WEEK | SCHEDULE`. Neither
// showed what you would actually do on a given day, and the day-preview sheet
// silently dropped per-lift prescriptions because it called `liftTarget`
// without the program context.
//
// Now: identity → one primary action → the plan's week, each day expanding
// inline to the exact targets the logger will use (`liftTarget` with ctx) →
// how it progresses → can I run it (fit + equipment) → what it involves →
// past runs → similar plans. The bottom sheet is gone; its content is inline.
// =============================================================================
import { CATEGORIES, DIFFICULTY_LABELS, getCatalogEntry } from './catalog.js';
import { buildWeekSchedule, summarizeProgression, diffWeekPrescription } from './schedule.js';
import { buildProgramTimeline } from './timeline.js';
import { programStats, equipmentFit, programHasLifts } from './compare.js';
import { getSimilarPrograms } from './recommendations.js';
import { buildWhoItsFor } from './detail-fit.js';
import { planLinkRowHTML } from './plan-link-row.js';
import { programAttribution } from './attribution.js';
import { PROGRAMS } from '../constants.js';
import { getWeekModifier } from '../schema.js';
import { liftTarget } from '../engine.js';
import {
  programNotes as jtProgramNotes, weekNote as jtWeekNote, dayExercises as jtDayExercises,
  t1Prescription, t2aPrescription, t2bcPrescription, t3Prescription, jtLiftTarget,
  isJtShedProgram, simplifiedWeekPlan,
} from './jt-shed-model.js';
import {
  isBookmarked, toggleBookmark, isProgramCompleted, markProgramCompleted,
  getProgramById, isCustomProgram, saveStateToLocalStorage,
} from '../state.js';
import { escapeHtml, safeCssColor } from '../util.js';
import { evaluateSessionCompletion } from '../workout/completion-policy.js';
import { getExerciseNote } from '../workout/exercise-config.js';
import { buildActivePlanBanner } from './active-plan-banner.js';
import { priorActivationSummaries } from '../state/activation-identity.js';
import { buildRoutineFromPlanDay } from '../routines/model.js';
import { showToast } from '../toast.js';

// The tier-aware J&T spec label ("4 × 8 · 3 RIR") for one exercise. The generic
// liftTarget returns sets/reps only, so the tier label must come from its model.
function jtSpecLabel(ctx, name) {
  if (!ctx?.program || !isJtShedProgram(ctx.program)) return null;
  const jt = jtLiftTarget(ctx.program, ctx.week, ctx.dayKey, name);
  return jt ? jt.label : null;
}

let _currentProgramId = null;
let _appState = null;
// The week the page is showing. PREVIEW ONLY — never touches appState.currentWeek.
let _scheduleWeek = 0;
let _scheduleTotalWeeks = 1;
// Which day panels are open, so a week step or a re-render keeps the athlete's
// place instead of collapsing everything.
/** @type {Set<string>} */
let _openDays = new Set();

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_NAMES = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
const DAY_SHORT = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
const _WAG_TYPE_ICON = { strength: '🏋️', running: '🏃', mixed: '🔀', rest: '💤' };

function _todayDayKey() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
}

// Neutral origin line for the hero. Uses the centralised attribution mapping.
function _detailAttribution(program) {
  const attr = programAttribution(program);
  if (attr) return attr.text;
  const creator = program?.dossier?.creator && String(program.dossier.creator).trim();
  if (!creator || /^you$/i.test(creator)) return '';
  return `Inspired by ${creator}`;
}

/** Open a plan page. Same name the app already routes to. */
export function renderProgramDetail(programId, appState) {
  if (_currentProgramId !== programId) {
    _scheduleWeek = 0;
    _openDays = new Set();
  }
  _currentProgramId = programId;
  _appState = appState;

  const container = document.getElementById('programDetailContent');
  if (!container) return;

  const catalog = getCatalogEntry(programId);
  const programData = PROGRAMS[programId] || appState?.customPrograms?.find((p) => p.id === programId);
  const program = {
    ...(programData || {}),
    ...(catalog || {}),
    name: (catalog?.name || programData?.name || 'Unknown Program'),
  };
  const resolved = getProgramById(programId) || program;

  const isActive = appState?.activeProgramId === programId;
  const isCustom = isCustomProgram(programId);
  const completed = isProgramCompleted(programId);
  const saved = isBookmarked(programId);
  const wod = program.tags?.includes('hyrox-wod');
  const safeId = escapeHtml(programId || '');
  const diff = DIFFICULTY_LABELS[program.difficulty] || DIFFICULTY_LABELS.intermediate;
  const category = CATEGORIES[program.category] || { label: program.category || 'Plan', icon: '📋', color: '#8b5cf6' };
  const accent = safeCssColor(program.accentColor || category.color, '#8b5cf6');

  const totalWeeks = Number(program.durationWeeks || program.totalWeeks) || 12;
  _scheduleTotalWeeks = totalWeeks;
  if (!_scheduleWeek || _scheduleWeek < 1 || _scheduleWeek > totalWeeks) {
    _scheduleWeek = isActive ? Math.min(totalWeeks, Math.max(1, parseInt(appState?.currentWeek, 10) || 1)) : 1;
  }
  const week = _scheduleWeek;
  const stats = programStats(program);
  const fit = buildWhoItsFor(program, appState);
  const equipment = renderEquipmentFit(program, appState?.settings);

  const daysPerWeek = Number(program.sessionsPerWeek) || Object.values(resolved?.days || {}).filter((day) => {
    const lifts = Array.isArray(day?.lifts) ? day.lifts.filter((n) => typeof n === 'string' && n.trim()) : [];
    return lifts.length || (day?.runs && !/^rest$/i.test(day.runs));
  }).length;

  const attribution = _detailAttribution(program);
  const facts = [
    totalWeeks ? `${totalWeeks} week${totalWeeks === 1 ? '' : 's'}` : null,
    daysPerWeek ? `${daysPerWeek}×/week` : null,
    stats.totalHours ? `~${stats.totalHours}h total` : null,
  ].filter(Boolean);

  // The page's primary action comes from the SAME model the Plans home uses, so
  // a finished session, a rest day or a started workout reads identically here.
  const activeModel = isActive
    ? buildActivePlanBanner({ state: appState, program: resolved, catalog })
    : null;

  const primary = wod
    ? `<button class="detail-cta-btn" data-action="make-active-from-detail" data-program-id="${safeId}">Start this workout</button>`
    : isActive
      ? `<button class="detail-cta-btn" data-action="${escapeHtml(activeModel?.action.action || 'open-program-workout-picker')}"${
        activeModel?.action.day ? ` data-day="${escapeHtml(activeModel.action.day)}"` : ''
      }>${escapeHtml(activeModel?.action.label || 'Start workout')}</button>`
      : completed
        ? `<button class="detail-cta-btn detail-cta-btn--completed" data-action="make-active-from-detail" data-program-id="${safeId}">Train again</button>`
        : `<button class="detail-cta-btn" data-action="make-active-from-detail" data-program-id="${safeId}">Start this plan</button>`;

  const editAction = isCustom ? 'open-builder' : (isActive ? 'edit-active-program' : 'customize-program');
  const editLabel = isCustom || isActive ? 'Edit' : 'Customize';

  const weekHTML = wod ? '' : renderWeek(resolved, { isActive, week, totalWeeks, appState });
  const progressionHTML = wod ? '' : renderProgressionOverview(resolved);
  const notesHTML = renderAuthoredProgramNotes(resolved);
  const outcomes = program.expectedOutcomes?.length ? program.expectedOutcomes : (program.highlights || []);
  const goals = (program.goals || []).slice(0, 3);
  const similar = getSimilarPrograms(program, 3);
  const pastRuns = isActive ? renderPastRuns(resolved, programId, appState) : '';

  container.innerHTML = `
    <div class="detail-back-bar">
      <button class="detail-back-btn" data-action="close-program-detail">
        <span class="detail-back-icon">‹</span> Plans
      </button>
      <div class="detail-back-actions">
        ${isActive ? '<span class="detail-active-badge">ACTIVE</span>' : ''}
        ${completed ? '<span class="detail-completed-badge">COMPLETED</span>' : ''}
        <button class="detail-bookmark-btn detail-overflow-btn"
                data-action="open-program-menu"
                data-program-id="${safeId}"
                aria-label="More plan actions" aria-haspopup="menu" aria-expanded="false">⋯</button>
      </div>
    </div>

    <div class="plan-head" style="--plan-accent: ${accent}">
      <div class="plan-head__eyebrow">
        <span class="plan-head__dot" aria-hidden="true"></span>
        ${escapeHtml(category.label)}${program.difficulty ? ` · ${escapeHtml(diff.label)}` : ''}
      </div>
      <h1 class="plan-head__title detail-title">${escapeHtml(program.name)}</h1>
      ${(program.tagline || program.dossier?.focus) ? `<p class="plan-head__tagline">${escapeHtml(program.tagline || program.dossier.focus)}</p>` : ''}
      ${facts.length ? `<div class="plan-head__meta">${facts.map((fact) => escapeHtml(fact)).join(' · ')}</div>` : ''}
      <div class="plan-head__status">
        ${fit.verdict ? `<span class="detail-fit-verdict detail-fit-verdict--${escapeHtml(fit.verdict.tone)}">${escapeHtml(fit.verdict.label)}</span>` : ''}
        ${attribution ? `<span class="plan-head__author">${escapeHtml(attribution)}</span>` : ''}
      </div>
    </div>

    <div class="detail-cta-wrap">
      <div class="plan-cta">
        ${primary}
        <div class="detail-cta-secondary">
          <button class="detail-complete-btn plan-cta__secondary" data-action="${editAction}" data-program-id="${safeId}">${editLabel}</button>
        </div>
      </div>
    </div>

    ${weekHTML}
    ${progressionHTML}
    ${notesHTML}

    <div class="detail-section detail-fit" id="planFit">
      <div class="detail-section-title detail-fit-head">
        <span>Is this right for me?</span>
        ${fit.verdict ? `<span class="detail-fit-verdict detail-fit-verdict--${fit.verdict.tone}">${escapeHtml(fit.verdict.label)}</span>` : ''}
      </div>
      <p class="detail-fit-audience">${escapeHtml(fit.audience)}</p>
      ${fit.reasons.length || fit.cautions.length ? `
        <ul class="detail-fit-list">
          ${fit.reasons.map((item) => `<li class="detail-fit-item detail-fit-item--reason"><span class="detail-fit-mark" aria-hidden="true">✓</span>${escapeHtml(item)}</li>`).join('')}
          ${fit.cautions.map((item) => `<li class="detail-fit-item detail-fit-item--caution"><span class="detail-fit-mark" aria-hidden="true">!</span>${escapeHtml(item)}</li>`).join('')}
        </ul>` : ''}
      ${equipment}
    </div>

    ${outcomes.length ? `
      <div class="detail-section">
        <div class="detail-section-title">${program.expectedOutcomes?.length ? "What you'll achieve" : 'Highlights'}</div>
        <div class="detail-outcomes">
          ${outcomes.map((o) => `<div class="detail-outcome-chip"><span class="detail-outcome-arrow">→</span> ${escapeHtml(o)}</div>`).join('')}
        </div>
      </div>` : ''}

    ${program.metrics ? `
      <div class="detail-section">
        <div class="detail-section-title">Training focus</div>
        ${renderFocusBars(program.metrics)}
      </div>` : ''}

    ${goals.length ? `
      <div class="detail-tags-row">
        ${goals.map((g) => `<span class="detail-tag detail-tag--goal">${escapeHtml(String(g).replace(/-/g, ' '))}</span>`).join('')}
      </div>` : ''}

    <details class="plan-about">
      <summary>About this plan</summary>
      <p class="detail-description">${escapeHtml(program.description || program.dossier?.philosophy || '')}</p>
    </details>

    ${pastRuns}

    ${similar.length ? `
      <div class="detail-section">
        <div class="detail-section-title">Similar plans</div>
        <div class="rec-list">${similar.map((p) => planLinkRowHTML(p)).join('')}</div>
      </div>` : ''}

    <div style="height: 48px;"></div>
  `;

  // Restore any open panels after a week step / re-render. The toggle itself is
  // the app's one data-action handler (no second listener, which would toggle
  // twice and look like a dead control).
  for (const day of _openDays) {
    const button = container.querySelector(`[data-action="toggle-plan-day"][data-day="${day}"]`);
    if (button) openPlanDay(/** @type {HTMLElement} */ (button));
  }
}

// ── Hero facts ───────────────────────────────────────────────────────────────

function renderFocusBars(metrics) {
  const qualLabel = (v) => v >= 80 ? 'Very High' : v >= 60 ? 'High' : v >= 35 ? 'Moderate' : 'Low';
  const bars = [
    { label: 'Strength', value: metrics.strengthEmphasis, color: '#ef4444' },
    { label: 'Hypertrophy', value: metrics.hypertrophyEmphasis, color: '#3b82f6' },
    { label: 'Endurance', value: metrics.enduranceEmphasis, color: '#22d3ee' },
    { label: 'Conditioning', value: metrics.conditioningEmphasis, color: '#f59e0b' },
    { label: 'Recovery', value: metrics.recoveryDemand, color: '#8b5cf6' },
  ].filter((b) => b.value > 0);
  if (!bars.length) return '';
  return `
    <div class="focus-bars">
      ${bars.map((bar, i) => `
        <div class="focus-bar-row">
          <div class="focus-bar-label">${bar.label}</div>
          <div class="focus-bar-track">
            <div class="focus-bar-fill" style="--bar-target: ${bar.value}%; background: ${bar.color}; animation-delay: ${i * 70}ms"></div>
          </div>
          <div class="focus-bar-qual">${qualLabel(bar.value)}</div>
        </div>
      `).join('')}
    </div>`;
}

// ── The week (one week control, inline day disclosures) ─────────────────────

function _dayCompletionMap(appState, week, program) {
  const out = {};
  const wk = appState?.weeks?.[String(week)];
  if (!wk) return out;
  for (const d of DAY_ORDER) {
    if (evaluateSessionCompletion(appState, program, String(week), d).finished) out[d] = 'done';
  }
  return out;
}

function renderWeek(program, { isActive, week, totalWeeks, appState }) {
  const rows = buildWeekSchedule(program, week);
  if (!rows.length) return '';

  const currentWeek = isActive ? Math.max(1, parseInt(appState?.currentWeek, 10) || 1) : null;
  const isCurrent = currentWeek === week;
  const completion = isCurrent ? _dayCompletionMap(appState, week, program) : null;
  const todayKey = isCurrent ? _todayDayKey() : null;
  const changes = week !== 1 ? diffWeekPrescription(program, 1, week) : null;
  const showChanges = changes && !(changes.length === 1 && /^No prescription changes$/.test(changes[0]));

  const stepper = totalWeeks > 1 ? `
    <div class="wag-weekbar">
      <button class="wag-week-btn" data-action="detail-week-step" data-delta="-1" aria-label="Previous week"${week <= 1 ? ' disabled' : ''}>‹</button>
      <div class="wag-week-label">
        <span class="wag-week-num">Week ${week} <span class="wag-week-total">of ${totalWeeks}</span></span>
        ${isCurrent
          ? '<span class="wag-week-pill">You are here</span>'
          : (isActive ? '<button class="wag-week-reset" data-action="detail-week-current">Back to current</button>' : '')}
      </div>
      <button class="wag-week-btn" data-action="detail-week-step" data-delta="1" aria-label="Next week"${week >= totalWeeks ? ' disabled' : ''}>›</button>
    </div>` : '';

  const body = rows.map((row) => {
    const isToday = todayKey === row.dayKey && !row.isRest;
    const done = completion?.[row.dayKey] === 'done';
    const status = done
      ? '<span class="wag-status wag-status--done">✓ Done</span>'
      : (isToday ? '<span class="wag-status wag-status--today">Today</span>' : '');
    const icon = _WAG_TYPE_ICON[row.type] || '•';
    const key = row.dayKey;

    if (row.isRest) {
      // A rest day can still be AUTHORED ("Active Recovery", "Mobility"). The
      // plan's own name must survive; only a plain rest day reads as "Rest".
      const restTitle = /^rest$/i.test(String(row.title || '').trim()) ? 'Rest' : row.title;
      return `
        <div class="wag-row wag-row--rest">
          <div class="wag-day">${row.dayShort}</div>
          <div class="wag-body">
            <div class="wag-title-line"><span class="wag-type-icon" aria-hidden="true">${icon}</span>
              <span class="wag-title">${escapeHtml(restTitle)}</span>${status}</div>
            <div class="wag-summary">Recovery day</div>
          </div>
        </div>`;
    }

    const panelId = `planDayPanel-${key}`;
    return `
      <button type="button" class="wag-row plan-day__toggle${isToday ? ' wag-row--today' : ''}"
              data-action="toggle-plan-day" data-day="${key}"
              aria-expanded="${_openDays.has(key) ? 'true' : 'false'}" aria-controls="${panelId}">
        <span class="wag-day">${row.dayShort}</span>
        <span class="wag-body">
          <span class="wag-title-line">
            <span class="wag-type-icon" aria-hidden="true">${icon}</span>
            <span class="wag-title">${escapeHtml(row.title)}</span>
            ${status}
          </span>
          <span class="wag-summary">${escapeHtml(row.summary)}</span>
        </span>
        <span class="wag-chevron" aria-hidden="true">›</span>
      </button>
      <div class="plan-day__panel" id="${panelId}" hidden>
        ${renderDayTargets(resolvedDay(program, key), { program, week, dayKey: key, state: appState })}
        <button type="button" class="plan-day__save-routine" data-action="save-day-as-routine"
                data-day="${key}" data-program-id="${escapeHtml(program.id || '')}">Save this day as a routine</button>
      </div>`;
  }).join('');

  return `
    <div class="detail-section plan-week">
      <div class="detail-section-title">${isActive ? 'This week' : 'The week'}</div>
      ${stepper}
      ${renderAuthoredWeekBrief(program, week)}
      ${showChanges ? `<div class="wag-changes"><span class="wag-changes-label">Changes from Week 1</span>${changes.map((c) => `<span class="wag-change">${escapeHtml(c)}</span>`).join('')}</div>` : ''}
      <div class="wag-list">${body}</div>
      <p class="plan-week__hint">Tap a day to see the exact target for every exercise.</p>
    </div>`;
}

function resolvedDay(program, dayKey) {
  return program?.days?.[dayKey] || {};
}

/**
 * The exact targets for one day, resolved the same way the logger resolves them
 * (per-lift prescriptions → progression model → inline spec → week modifier).
 * Read-only: no controls, no state.
 *
 * @param {any} day
 * @param {{ program?:any, week?:number|string, dayKey?:string, state?:any }} [ctx]
 * @returns {string}
 */
export function renderDayTargets(day, ctx = {}) {
  const program = ctx.program || null;
  const week = ctx.week || 1;
  const dayKey = ctx.dayKey || 'mon';
  const state = ctx.state || _appState;
  const modifier = getWeekModifier(program, week) || {};
  const names = (Array.isArray(day?.lifts) ? day.lifts : []).filter((n) => typeof n === 'string' && n.trim());

  const preview = day?.workoutPreview;
  if (preview?.type === 'HYROX') return renderHyroxPreview(preview);
  if (preview?.type === 'RUNNING' && !names.length) return renderRunningPreview(preview.phases);

  const rows = names.map((name) => {
    const target = liftTarget(day.desc, name, modifier, { program, week, dayKey });
    const spec = jtSpecLabel({ program, week, dayKey }, name) || `${target.sets} × ${target.reps}`;
    const note = getExerciseNote(state, name);
    return `<div class="wpm-exercise-item">
      <span>${escapeHtml(name)}</span><span>${escapeHtml(spec)}</span>
      ${note ? `<span class="wpm-ex-note">${escapeHtml(note)}</span>` : ''}
    </div>`;
  }).join('');

  const run = day?.runs && !/^rest$/i.test(day.runs)
    ? `<div class="plan-day__run">🏃 ${escapeHtml(day.runs)}</div>` : '';

  if (!rows && !run) return '<p class="wpm-empty">No exercises listed.</p>';
  return `<div class="wpm-exercise-list">${rows}</div>${run}`;
}

function togglePlanDay(button) {
  const day = button.getAttribute('data-day');
  if (!day) return;
  const panel = document.getElementById(`planDayPanel-${day}`);
  if (!panel) return;
  const open = panel.hidden;
  panel.hidden = !open;
  button.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (open) _openDays.add(day); else _openDays.delete(day);
}

function openPlanDay(button) {
  const day = button.getAttribute('data-day');
  const panel = day ? document.getElementById(`planDayPanel-${day}`) : null;
  if (!panel) return;
  panel.hidden = false;
  button.setAttribute('aria-expanded', 'true');
}

// ── Fit + equipment ──────────────────────────────────────────────────────────

function renderEquipmentFit(program, settings) {
  const needed = program.equipment || [];
  if (!needed.length) return '';
  const fit = equipmentFit(needed, settings?.equipment);
  const missing = new Set(fit.missing);
  const status = fit.missing.length
    ? `<span class="detail-fit-verdict detail-fit-verdict--stretch">${fit.missing.length} item${fit.missing.length === 1 ? '' : 's'} missing</span>`
    : fit.owned.length
      ? '<span class="detail-fit-verdict detail-fit-verdict--fits">You have the kit</span>'
      : '';
  return `
    <div class="detail-equipment-block">
      <div class="detail-section-title detail-fit-head"><span>Equipment</span>${status}</div>
      <div class="detail-equipment">
        ${needed.map((e) => `<span class="detail-equipment-chip${missing.has(e) ? ' detail-equipment-chip--missing' : ''}">${escapeHtml(formatEquipment(e))}</span>`).join('')}
      </div>
    </div>`;
}

function formatEquipment(eq) {
  const labels = {
    barbell: '🏋️ Barbell', rack: '🔧 Rack', bench: '🪑 Bench',
    dumbbells: '💪 Dumbbells', cables: '⚙️ Cables', 'running-shoes': '👟 Running Shoes',
    'ski-erg': '🎿 Ski Erg', 'rowing-machine': '🚣 Rowing Machine', sled: '🛷 Sled',
    kettlebell: '🔔 Kettlebell', sandbag: '🎒 Sandbag', 'pull-up-bar': '🔝 Pull-up Bar',
    'ez-bar': '🏋️ EZ bar', bands: '➰ Bands',
  };
  return labels[eq] || eq;
}

// ── Progression ──────────────────────────────────────────────────────────────

const PLAN_KIND_COLOR = {
  deload: '#22d3ee', peak: '#ef4444', taper: '#a78bfa',
  intensify: '#f59e0b', build: '#8b5cf6', work: '#64748b',
};
const PLAN_KIND_LABEL = {
  deload: 'Deload', peak: 'Peak', taper: 'Taper', intensify: 'Intensity', build: 'Build', work: '',
};

function renderProgressionOverview(program) {
  const { headline, phases, weeks } = summarizeProgression(program);
  if (!weeks) return '';
  const phasesHTML = phases.map((p) => {
    const color = PLAN_KIND_COLOR[p.kind] || PLAN_KIND_COLOR.work;
    const range = p.from === p.to ? `Wk ${p.from}` : `Wk ${p.from}–${p.to}`;
    const tag = PLAN_KIND_LABEL[p.kind];
    return `
      <div class="prog-phase" style="--phase-color:${color}">
        <span class="prog-phase-range">${range}</span>
        <div class="prog-phase-body">
          <span class="prog-phase-label">${escapeHtml(p.label)}</span>
          ${p.spec ? `<span class="prog-phase-spec">${escapeHtml(p.spec)}</span>` : ''}
        </div>
        ${tag ? `<span class="prog-phase-tag" style="color:${color};border-color:${color}55">${tag}</span>` : ''}
      </div>`;
  }).join('');
  return `
    <div class="detail-section plan-progression">
      <div class="detail-section-title">How it progresses</div>
      <p class="prog-headline">${escapeHtml(headline)}</p>
      ${phases.length > 1 ? `<div class="prog-phase-list">${phasesHTML}</div>` : ''}
      ${renderPlanTimeline(program)}
    </div>`;
}

function renderPlanTimeline(program) {
  const rows = buildProgramTimeline(program);
  if (!rows.length) return '';
  const showSpec = programHasLifts(program);
  const items = rows.map((r) => {
    const color = PLAN_KIND_COLOR[r.kind] || PLAN_KIND_COLOR.work;
    const tag = PLAN_KIND_LABEL[r.kind];
    const spec = (showSpec && r.sets != null) ? `${r.sets}×${r.reps ?? ''}` : '';
    return `
      <div class="plan-timeline__row">
        <span class="plan-timeline__wk">Wk ${r.week}</span>
        <div class="plan-timeline__body">
          <div class="plan-timeline__label">${escapeHtml(r.label || '—')}</div>
          <div class="plan-timeline__track"><div class="plan-timeline__fill" style="width:${r.volumeScore}%;background:${color}"></div></div>
        </div>
        ${tag ? `<span class="plan-timeline__tag" style="color:${color};border-color:${color}55">${tag}</span>` : ''}
        ${spec ? `<span class="plan-timeline__spec">${escapeHtml(spec)}</span>` : ''}
      </div>`;
  }).join('');
  return `<details class="plan-timeline"><summary>Week by week</summary>${items}</details>`;
}

// ── Authored notes (J&T / Shed) ──────────────────────────────────────────────

function _isJtShed(program) {
  return isJtShedProgram(program);
}

function renderAuthoredWeekBrief(program, week) {
  if (program?.progressionModel === 'shed-pplul') {
    const authored = program?.weekNotes?.[String(week)];
    if (!authored) return '';
    const notes = Array.isArray(authored.notes) ? authored.notes : [];
    return `
      <div class="jt-week-brief" style="margin:0 0 12px;padding:12px;background:var(--overlay-sm);border-radius:12px;">
        <div style="font-weight:700;font-size:0.9rem;color:var(--text-inverse);">Week ${week} · ${escapeHtml(authored.label || 'Performance-based progression')}</div>
        ${notes.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:var(--text-secondary);font-size:0.78rem;line-height:1.5;">${notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}
      </div>`;
  }
  if (!_isJtShed(program)) return '';
  const wn = jtWeekNote(program, week);
  if (program?.progressionModel === 'jt-shed-simplified') {
    const plan = simplifiedWeekPlan(week);
    if (!plan) return '';
    const mainLine = plan.assessment
      ? `Bench, squat and overhead press: 1 controlled rep-PR set of 4+; deadlift: 1 controlled rep-PR set of 3+. Stop at 1 RIR.`
      : `Bench, squat and overhead press: ${plan.main.sets}×${plan.main.reps}; deadlift: ${plan.deadlift.sets}×${plan.deadlift.reps}. Target ${plan.rir} RIR${plan.deload ? ' and reduce the prior week’s load by 10–15%' : ''}.`;
    const accessoryLine = plan.accessoryScale < 1
      ? 'Accessory sets are halved (3 sets become 2; 2 sets become 1).'
      : 'Accessories keep their authored repetition ranges and use double progression.';
    return `
      <div class="jt-week-brief" style="margin:0 0 12px;padding:12px;background:var(--overlay-sm);border-radius:12px;">
        <div style="font-weight:700;font-size:0.9rem;color:var(--text-inverse);">Week ${wn.week} · ${escapeHtml(wn.label)}</div>
        ${wn.notes.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:var(--text-secondary);font-size:0.78rem;line-height:1.5;">${wn.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}
        <div style="margin-top:10px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:0.76rem;">
          <span style="font-family:ui-monospace,monospace;color:var(--text-muted);">Main lifts</span><span style="color:var(--text-secondary);">${escapeHtml(mainLine)}</span>
          <span style="font-family:ui-monospace,monospace;color:var(--text-muted);">Accessories</span><span style="color:var(--text-secondary);">${escapeHtml(accessoryLine)}</span>
        </div>
      </div>`;
  }
  const t1 = t1Prescription(week);
  const t2a = t2aPrescription(week);
  const t2bc = t2bcPrescription(week);
  const t3 = t3Prescription(week);

  const t1Line = t1
    ? (t1.assessment
        ? 'Assessment — controlled 1RM, 2RM, 3RM or rep PR (true 1RM optional). No back-off.'
        : t1.singleTop
          ? 'To a controlled heavy single — no back-off.'
          : `To a controlled ${t1.repMax}RM, then ${t1.backoff.sets}×${t1.backoff.reps} @ ${t1.backoff.pct}% ${t1.backoff.basis === 'dayMax' ? 'of the day’s rep-max' : 'TM'}${t1.backoff.plusSet ? ' (last set +)' : ''}.`)
    : '';
  const t2aLine = t2a
    ? `${t2a.pct}% ${t2a.basis === 'updatedTm' ? 'updated TM' : 'TM'} · ${t2a.sets}×${t2a.reps}.`
    : 'No T2a work this week.';
  const t2bcLine = t2bc.none
    ? 'No T2b/T2c work this week.'
    : t2bc.recovery
      ? 'Recovery-only.'
      : `Target ${t2bc.target}, then 2 max-rep sets (~1–2 RIR).`;
  const t3Line = t3.rest
    ? (t3.optionalLight ? 'Rest or optional very light pump work.' : 'Rest.')
    : t3.light
      ? `${t3.lightSets} light sets of ~${t3.lightApprox}, no max-rep sets.`
      : `Target ${t3.target}, then 2 max-rep sets (~1–2 RIR).`;

  const rows = [
    { tier: 'T1', text: t1Line },
    { tier: 'T2a', text: t2aLine },
    { tier: 'T2b / T2c', text: t2bcLine },
    { tier: 'T3', text: t3Line },
  ].filter(r => r.text);

  return `
    <div class="jt-week-brief" style="margin:0 0 12px;padding:12px;background:var(--overlay-sm);border-radius:12px;">
      <div style="font-weight:700;font-size:0.9rem;color:var(--text-inverse);">Week ${wn.week} · ${escapeHtml(wn.label)}</div>
      ${wn.notes.length ? `<ul style="margin:8px 0 0;padding-left:18px;color:var(--text-secondary);font-size:0.78rem;line-height:1.5;">${wn.notes.map(n => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}
      <div style="margin-top:10px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:0.76rem;">
        ${rows.map(r => `<span style="font-family:ui-monospace,monospace;color:var(--text-muted);">${r.tier}</span><span style="color:var(--text-secondary);">${escapeHtml(r.text)}</span>`).join('')}
      </div>
    </div>`;
}

// Program-level coaching notes + a per-day tier legend with expandable exercise
// coaching notes. Program notes render in the Overview tab; exercise notes are
// accessible via <details> so they don't clutter the primary surface.
function renderAuthoredProgramNotes(program) {
  const shedPplul = program?.progressionModel === 'shed-pplul';
  if (!_isJtShed(program) && !shedPplul) return '';
  const notes = shedPplul
    ? (Array.isArray(program?.programNotes) ? program.programNotes : [])
    : jtProgramNotes(program);
  const simplified = program?.progressionModel === 'jt-shed-simplified';
  const dayKeys = shedPplul ? ['mon', 'tue', 'wed', 'fri', 'sat'] : ['mon', 'tue', 'thu', 'fri', 'sat'];
  const dayBlocks = dayKeys.map((dk) => {
    const exs = shedPplul
      ? (Array.isArray(program?.dayExercises?.[dk]) ? program.dayExercises[dk] : [])
      : jtDayExercises(program, dk);
    if (!exs.length) return '';
    const rows = exs.map((ex) => `
      <details class="jt-ex-note">
        <summary>
          <span class="jt-ex-note__tier">${escapeHtml(ex.tier)}</span>
          <span class="jt-ex-note__name">${escapeHtml(ex.name)}</span>
          <span class="jt-ex-note__prog">${escapeHtml(ex.progression)}</span>
        </summary>
        ${ex.notes.length ? `<ul>${ex.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>` : ''}
      </details>`).join('');
    return `<div class="jt-day-block"><div class="jt-day-block__name">${escapeHtml(DAY_NAMES[dk])}</div>${rows}</div>`;
  }).join('');
  return `
    <div class="detail-section">
      <div class="detail-section-title">Program notes</div>
      <ul class="jt-program-notes">${notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">${simplified || shedPplul ? 'Exercise progression & notes' : 'Tiers & exercise notes'}</div>
      <p class="text-xs text-muted">${shedPplul
        ? 'Every lift keeps its authored repetition range and progresses from actual performance. Tap an exercise for coaching notes.'
        : simplified
          ? 'Primary lifts use the selected week’s fixed-rep block. Repetition ranges use double progression. Tap an exercise for coaching notes.'
          : 'T1 = main lift · T2a = percentage work · T2b/T2c = target-rep + max-rep sets · T3 = isolation. Tap an exercise for its coaching notes.'}</p>
      ${dayBlocks}
    </div>`;
}

// ── Past runs ────────────────────────────────────────────────────────────────

function renderPastRuns(program, programId, appState) {
  const runs = priorActivationSummaries(appState).filter((run) => run.programId === programId);
  if (!runs.length) return '';
  return `
    <details class="plan-past">
      <summary>Past runs (${runs.length})</summary>
      ${runs.map((run) => {
        const paused = run.pausedAt ? new Date(run.pausedAt) : null;
        const pausedLabel = paused && !Number.isNaN(paused.getTime())
          ? paused.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
          : 'Date unavailable';
        return `<div class="plan-past__row">
          <div>
            <strong>Paused at Week ${run.lastWeek}</strong>
            <span>${run.loggedWeeks} logged week${run.loggedWeeks === 1 ? '' : 's'} · ${escapeHtml(pausedLabel)}</span>
          </div>
          <div class="plan-past__actions">
            <button class="btn-pad" data-action="view-activation-activities" data-activation-id="${escapeHtml(run.id)}">Activities</button>
            <button class="btn-pad btn-blue" data-action="resume-program-activation" data-activation-id="${escapeHtml(run.id)}">Resume</button>
          </div>
        </div>`;
      }).join('')}
    </details>`;
}

// ── Media previews used inside a day panel ───────────────────────────────────

function renderHyroxPreview(preview) {
  const { stations, format, totalTime, notes } = preview;
  const formatLabels = {
    race: '🏟️ HYROX Singles', half: '🏟️ HYROX Half', doubles: '👥 HYROX Doubles',
    pro: '🏅 HYROX PRO', wod: '💪 HYROX WOD', circuit: '⚡ Station Circuit',
  };
  return `
    <div class="wpm-type-label wpm-type-label--hyrox">${escapeHtml(formatLabels[format] || '🏟️ HYROX')}</div>
    ${totalTime ? `<div class="wpm-hyrox-meta">⏱️ Est. time: <strong>${escapeHtml(totalTime)}</strong></div>` : ''}
    <div class="wpm-hyrox-legs">
      ${(Array.isArray(stations) ? stations : []).map((s, i) => `
        ${s.run ? `<div class="wpm-hyrox-run-leg"><span class="wpm-hyrox-run-icon">🏃</span><span class="wpm-hyrox-run-text">Run ${escapeHtml(s.run)}</span></div>` : ''}
        <div class="wpm-hyrox-station-leg">
          <span class="wpm-hyrox-station-num">${i + 1}</span>
          <div class="wpm-hyrox-station-body">
            <span class="wpm-hyrox-station-name">${escapeHtml(s.station || '')}</span>
            ${s.weight ? `<span class="wpm-hyrox-station-weight">${escapeHtml(s.weight)}</span>` : ''}
            ${s.notes ? `<span class="wpm-hyrox-station-note">${escapeHtml(s.notes)}</span>` : ''}
          </div>
        </div>`).join('')}
    </div>
    ${notes ? `<div class="wpm-hyrox-notes">💡 ${escapeHtml(notes)}</div>` : ''}`;
}

function renderRunningPreview(phases) {
  if (!phases?.length) return '<p class="wpm-empty">No phases listed.</p>';
  const phaseIcons = { warmup: '🌡️', mainSet: '⚡', strength: '🏋️', cooldown: '🧊' };
  const phaseColors = { warmup: '#22d3ee', mainSet: '#ef4444', strength: '#8b5cf6', cooldown: '#10b981' };
  return `
    <div class="wpm-type-label wpm-type-label--running">🏃 Running Session</div>
    <div class="wpm-running-timeline">
      ${phases.map((phase, i) => {
        const icon = phaseIcons[phase.type] || '●';
        const color = phaseColors[phase.type] || '#94a3b8';
        const isLast = i === phases.length - 1;
        return `<div class="wpm-phase ${isLast ? 'wpm-phase--last' : ''}">
          <div class="wpm-phase-connector" style="--phase-color:${color}">
            <div class="wpm-phase-dot">${icon}</div>
            ${!isLast ? '<div class="wpm-phase-line"></div>' : ''}
          </div>
          <div class="wpm-phase-content">
            <div class="wpm-phase-header">
              <span class="wpm-phase-name" style="color:${color}">${escapeHtml(phase.name || '')}</span>
              <span class="wpm-phase-duration">${escapeHtml(phase.duration || '')}</span>
            </div>
            <div class="wpm-phase-pace">${escapeHtml(phase.pace || '')}</div>
            <div class="wpm-phase-desc">${escapeHtml(phase.description || '')}</div>
            ${phase.notes ? `<div class="wpm-phase-note">💡 ${escapeHtml(phase.notes)}</div>` : ''}
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ── Actions ─────────────────────────────────────────────────────────────────

export function currentPlanId() { return _currentProgramId; }

export function closeProgramDetail() {
  // Decoupled from library.js (avoids a circular import); app.js owns the
  // library:return handler and calls returnToLibrary().
  document.dispatchEvent(new CustomEvent('library:return'));
}

export function handleDetailAction(action, el) {
  switch (action) {
    case 'close-program-detail':
      closeProgramDetail();
      break;
    case 'make-active-from-detail': {
      const id = el.getAttribute('data-program-id');
      if (id) document.dispatchEvent(new CustomEvent('library:make-active', { detail: { id } }));
      break;
    }
    case 'open-program-detail': {
      const id = el.closest('[data-program-id]')?.getAttribute('data-program-id');
      if (id) renderProgramDetail(id, _appState);
      break;
    }
    case 'detail-week-step': {
      const delta = parseInt(el.getAttribute('data-delta'), 10);
      if (!Number.isNaN(delta) && _currentProgramId) {
        _scheduleWeek = Math.min(_scheduleTotalWeeks, Math.max(1, (_scheduleWeek || 1) + delta));
        renderProgramDetail(_currentProgramId, _appState);
      }
      break;
    }
    case 'detail-week-current': {
      _scheduleWeek = Math.max(1, parseInt(_appState?.currentWeek, 10) || 1);
      renderProgramDetail(_currentProgramId, _appState);
      break;
    }
    case 'toggle-plan-day':
      togglePlanDay(/** @type {HTMLElement} */ (el));
      break;
    case 'save-day-as-routine': {
      // A plan day already owns its intent; copy it into the routine library so
      // one good session can be kept without adopting the whole block.
      const id = el.getAttribute('data-program-id') || _currentProgramId;
      const day = el.getAttribute('data-day');
      const program = getProgramById(id);
      const routine = buildRoutineFromPlanDay(program, day);
      if (!routine) { showToast('This day has no exercises to save', true); break; }
      if (!Array.isArray(_appState.routines)) _appState.routines = [];
      _appState.routines.push(routine);
      saveStateToLocalStorage(true);
      showToast('Saved to your routines');
      break;
    }
    case 'toggle-plan-saved': {
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const saved = toggleBookmark(id);
      showToast(saved ? 'Saved to your plans' : 'Removed from saved');
      renderProgramDetail(id, _appState);
      break;
    }
    case 'mark-program-complete': {
      const id = el.getAttribute('data-program-id');
      if (!id) break;
      const weeks = _appState?.currentWeek ? parseInt(_appState.currentWeek, 10) : undefined;
      markProgramCompleted(id, weeks);
      renderProgramDetail(id, _appState);
      break;
    }
  }
}

