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
import { progressSectionModuleOff, PROGRESS_SECTIONS } from './progress-sections.js';
import { normalizeUi } from '../ui/customize.js';
import { previousRange, resolveRange } from './ranges.js';
import { buildPulseModel } from './pulse.js';
import { buildBalanceModel } from './balance.js';
import { buildMuscleModel } from './muscles.js';
import { buildExerciseSummaryModel } from './exercises-summary.js';
import { buildStallList } from './stall-list.js';
import { buildIntensityMix } from './intensity-mix.js';
import { buildEnduranceModel } from './endurance.js';
import { buildBodyMetricsModel } from './body-metrics.js';
import { buildFastingBandModel } from './fasting-band.js';

/**
 * @typedef {'pulse'|'balance'|'muscles'|'exercises'|'endurance'|'body'|'fasting'|'reviews'} BandId
 * @typedef {'all'|'strength'|'endurance'} Focus
 */

/**
 * Catalogue order is the default render order; the athlete may reorder it. The
 * registry is the single declaration, so a section added there cannot be
 * skipped by the composer.
 */
const BAND_DEFINITIONS = Object.freeze(PROGRESS_SECTIONS.map((section) => ({
  id: /** @type {BandId} */ (section.id),
  module: section.module,
  alwaysShow: !!section.alwaysShow,
})));

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
  exercises: (state, ctx) => {
    const model = buildExerciseSummaryModel(state, { range: ctx.range, unit: ctx.unit });
    try { model.stalls = buildStallList(state, ctx.program); } catch { model.stalls = []; }
    try {
      model.intensity = buildIntensityMix(state, {
        range: ctx.range,
        goal: state?.settings?.fitnessGoal || 'hybrid',
      });
    } catch { model.intensity = null; }
    return model;
  },
  endurance: (state, ctx) => buildEnduranceModel(state, {
    range: ctx.range,
    previous: ctx.previous,
  }),
  body: (state, ctx) => buildBodyMetricsModel(state, { range: ctx.range }),
  fasting: (state, ctx) => buildFastingBandModel(state, { range: ctx.range }),
  // Reviews is a static Week | Month | Year row: no range, no data, always
  // available even for a brand-new athlete.
  reviews: () => ({ hasData: true }),
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
  // A band that actually reaches the surface: enabled, not hidden, and either it
  // has data, it is an always-show band, or the athlete has SOMETHING logged.
  let renderableCount = 0;

  // Render order follows the athlete's saved order, then catalogue order for
  // anything missing (a band added in a later release).
  const byId = new Map(BAND_DEFINITIONS.map((def) => [def.id, def]));
  const order = ui.progress.order.filter((id) => byId.has(id));

  /** Built models, rendered in a second pass once we know what the athlete has. */
  const built = [];

  for (const id of order) {
    const def = byId.get(id);
    const moduleOff = progressSectionModuleOff(state, id);
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
        // The athlete's unit, from state — a caller that forgets it must not
        // relabel pounds as kilograms.
        unit: options.unit || (state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg'),
        distanceUnit: options.distanceUnit || 'km',
      });
      const hasData = !!model?.hasData;
      availability[id] = { hasData, moduleOff: false, hidden: isHidden };
      built.push({ id, def, isHidden, model, hasData });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      availability[id] = { hasData: false, moduleOff: false, hidden: isHidden, error: message };
      built.push({ id, def, isHidden, error: message });
    }
  }

  // The toggle contract: once an athlete has logged ANYTHING, every enabled and
  // visible band renders — a band with nothing in THIS range states that in
  // place instead of vanishing, so a Customize switch can never look broken.
  // A completely empty profile still gets the single honest empty lead plus
  // Pulse/Reviews, not eight empty cards. (Two passes: "has the athlete logged
  // anything?" is only knowable after every model is built.)
  // `alwaysShow` bands (Pulse, Reviews) report hasData by design, so they must
  // not count as "this athlete has logged something".
  const anyData = built.some((entry) => entry.hasData && !entry.def.alwaysShow);
  for (const entry of built) {
    if (entry.isHidden) continue;
    if (entry.error) {
      bands.push({ id: entry.id, collapsed: false, error: entry.error });
      renderableCount += 1;
      continue;
    }
    if (entry.hasData || entry.def.alwaysShow || anyData) {
      bands.push({ id: entry.id, collapsed: isCollapsed(entry.id, focus), model: entry.model });
      renderableCount += 1;
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
    // Count BANDS the athlete can actually see. `hidden` also carries sub-cards
    // (`bodyPhotos`, `musclesBody`), so subtracting its size made the last
    // remaining band look hidden; a module-off band is not visible either.
    visibleCount: BAND_DEFINITIONS.filter((band) => !hidden.has(band.id)
      && !progressSectionModuleOff(state, band.id)).length,
    // What the surface can actually put on screen right now.
    renderableCount,
    // The filter is derived from visibility AND data: one modality means no
    // filter at all, because a one-choice control is noise.
    focusAvailable: {
      strength: strengthAvailable && !STRENGTH_BANDS.every((id) => hidden.has(id)),
      endurance: enduranceAvailable && !hidden.has('endurance'),
    },
  };
}
