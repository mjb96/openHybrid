// @ts-check
// =============================================================================
// PROGRESS DASHBOARD (js/analytics/progress-dashboard.js)
//
// Composes the eight bands into the one model the hub renders. It answers three
// questions and nothing else:
//
//   1. WHICH bands exist for this athlete?  (module off / no data / hidden)
//   2. WHAT does each one say?              (delegated to the band's own model)
//   3. WHICH are collapsed by the modality filter?
//
// Availability is reported for EVERY band — including hidden and module-off
// ones — because the customize sheet has to explain the difference between
// "you hid this", "the module is off" and "there is nothing to show yet".
//
// A band never renders when it has nothing true to say. A band that throws
// renders an error instead of blanking the section.
// =============================================================================
import { localDayKey } from '../dates.js';
import { moduleEnabled } from '../modules.js';
import { normalizeUi } from '../ui/customize.js';
import { previousRange, resolveRange } from './ranges.js';
import { buildPulseModel } from './pulse.js';
import { buildBalanceModel } from './balance.js';
import { buildMuscleModel } from './muscles.js';
import { buildExerciseSummaryModel } from './exercises-summary.js';
import { buildEnduranceModel } from './endurance.js';
import { buildBodyMetricsModel } from './body-metrics.js';
import { buildFastingBandModel } from './fasting-band.js';

/**
 * @typedef {'pulse'|'balance'|'muscles'|'exercises'|'endurance'|'body'|'fasting'|'reports'} BandId
 * @typedef {'all'|'strength'|'endurance'} Focus
 */

/** Catalogue order is the default render order; the athlete may reorder it. */
// `alwaysShow` bands render even with no data, because their empty state is
// itself the answer ("nothing logged this week"). Every other band appears only
// when it has something true to say, which is what keeps eight bands short.
const BAND_DEFINITIONS = Object.freeze([
  { id: 'pulse', module: null, alwaysShow: true },
  { id: 'balance', module: null },
  { id: 'muscles', module: null },
  { id: 'exercises', module: null },
  { id: 'endurance', module: 'running' },
  { id: 'body', module: null },
  { id: 'fasting', module: 'fasting' },
  { id: 'reports', module: null, alwaysShow: true },
]);

/**
 * Bands whose model exists today. The rest are declared in the catalogue so
 * availability and the customize sheet stay accurate while they are built.
 * @type {Record<string, ((state:any, ctx:any) => any)|undefined>}
 */
export const BAND_BUILDERS = Object.freeze({
  pulse: (state, ctx) => buildPulseModel(state, {
    todayISO: ctx.todayISO,
    weekStartISO: ctx.weekStartISO || null,
    program: ctx.program,
    days: ctx.days,
  }),
  balance: (state, ctx) => buildBalanceModel(state, {
    range: ctx.range,
    previous: ctx.previous,
  }),
  muscles: (state, ctx) => buildMuscleModel(state, {
    range: ctx.range,
    previous: ctx.previous,
    grouping: ctx.grouping,
  }),
  exercises: (state, ctx) => buildExerciseSummaryModel(state, {
    range: ctx.range,
    unit: ctx.unit,
  }),
  endurance: (state, ctx) => buildEnduranceModel(state, {
    range: ctx.range,
    previous: ctx.previous,
  }),
  body: (state, ctx) => buildBodyMetricsModel(state, { range: ctx.range }),
  fasting: (state, ctx) => buildFastingBandModel(state, { range: ctx.range }),
});

/** @param {unknown} value */
export function normalizeFocus(value) {
  return value === 'strength' || value === 'endurance' ? value : 'all';
}

/** Collapse rules: the OTHER modality folds away; Balance never does. */
function isCollapsed(id, focus) {
  if (focus === 'strength') return id === 'endurance';
  if (focus === 'endurance') return id === 'muscles' || id === 'exercises';
  return false;
}

const STRENGTH_BANDS = ['muscles', 'exercises'];

/**
 * @param {any} state
 * @param {{
 *   todayISO?: string,
 *   rangeId?: string,
 *   earliestISO?: string|null,
 *   program?: any,
 *   days?: string[],
 *   weekStartISO?: string|null,
 *   grouping?: 'week'|'month'|'year',
 *   focus?: Focus|string,
 *   unit?: string,
 *   distanceUnit?: string,
 *   builders?: Record<string, Function>,
 * }} [options]
 */
export function buildProgressDashboard(state, options = {}) {
  const todayISO = localDayKey(options.todayISO || new Date());
  if (!todayISO) throw new Error('buildProgressDashboard: invalid todayISO');

  const range = /** @type {any} */ (resolveRange(options.rangeId, todayISO, {
    earliestISO: options.earliestISO || null,
  }));
  const previous = previousRange(range);
  const focus = normalizeFocus(options.focus);
  const ui = normalizeUi(state?.settings?.ui);
  const hidden = new Set(ui.progress.hidden);
  const builders = { ...BAND_BUILDERS, ...(options.builders || {}) };

  /** @type {Record<string, any>} */
  const availability = {};
  /** @type {Array<{ id: BandId, collapsed: boolean, model?: any, error?: string }>} */
  const bands = [];

  // Render order follows the athlete's saved order, then catalogue order for
  // anything missing (a band added in a later release).
  const byId = new Map(BAND_DEFINITIONS.map((def) => [def.id, def]));
  const order = ui.progress.order.filter((id) => byId.has(id));

  for (const id of order) {
    const def = byId.get(id);
    const moduleOff = def.module ? !moduleEnabled(state, def.module) : false;
    const isHidden = hidden.has(id);

    if (moduleOff) {
      availability[id] = { hasData: false, moduleOff: true, hidden: isHidden };
      continue;
    }

    const builder = builders[id];
    if (!builder) {
      // Declared but not built yet: visible in the sheet, never on the surface.
      availability[id] = { hasData: false, moduleOff: false, hidden: isHidden, pending: true };
      continue;
    }

    try {
      const model = builder(state, {
        range,
        previous,
        todayISO,
        program: options.program,
        days: options.days,
        weekStartISO: options.weekStartISO || null,
        grouping: options.grouping || 'week',
        unit: options.unit || 'kg',
        distanceUnit: options.distanceUnit || 'km',
      });
      const hasData = !!model?.hasData;
      availability[id] = { hasData, moduleOff: false, hidden: isHidden };
      // A band with nothing to say does not render — unless its empty state is
      // the answer (Pulse) or it is a static link row (Reports).
      if (!isHidden && (hasData || def.alwaysShow)) {
        bands.push({ id, collapsed: isCollapsed(id, focus), model });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      availability[id] = { hasData: false, moduleOff: false, hidden: isHidden, error: message };
      if (!isHidden) bands.push({ id, collapsed: false, error: message });
    }
  }

  const strengthAvailable = STRENGTH_BANDS.some((id) => availability[id]?.hasData);
  const enduranceAvailable = !!availability.endurance?.hasData;

  return {
    range,
    previous,
    focus,
    bands,
    availability,
    totalCount: BAND_DEFINITIONS.length,
    visibleCount: BAND_DEFINITIONS.length - hidden.size,
    // The filter is derived from visibility AND data: one modality means no
    // filter at all, because a one-choice control is noise.
    focusAvailable: {
      strength: strengthAvailable && !STRENGTH_BANDS.every((id) => hidden.has(id)),
      endurance: enduranceAvailable && !hidden.has('endurance'),
    },
  };
}
