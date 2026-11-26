// @ts-check
// =============================================================================
// WARM-UP RAMP (js/workout/warmup-ramp.js)
//
// Auto-progression decides the working weight; the ramp is the short ladder that
// gets the athlete there safely. Pure and opt-in: the caller supplies the bar,
// plates and pairs owned, and the ramp only emits weights the rack can build.
// =============================================================================

import { computePlateBreakdown } from './plates.js';
import { isWarmupSet } from '../set-utils.js';
import { toCanonicalWeight } from '../metrics/weight-unit.js';

export const RAMP_SETS = Object.freeze([
  Object.freeze({ pct: 0.4, reps: 5 }),
  Object.freeze({ pct: 0.6, reps: 3 }),
  Object.freeze({ pct: 0.8, reps: 2 }),
]);

/**
 * Single-joint work gets two rungs. A three-rung ladder on a 12 kg lateral raise
 * is mostly admin, and the last jump into the working weight is small anyway.
 */
export const ISOLATION_RAMP_SETS = Object.freeze([
  Object.freeze({ pct: 0.5, reps: 5 }),
  Object.freeze({ pct: 0.75, reps: 3 }),
]);

/**
 * Which ladder a lift deserves. Bodyweight-only movements never reach here —
 * the caller only ramps lifts with a barbell or dumbbells.
 * @param {{ compound?: boolean } | null | undefined} exercise
 */
export function rampSetsFor(exercise) {
  return exercise?.compound === true ? RAMP_SETS : ISOLATION_RAMP_SETS;
}

/** @param {number} value @param {number} step */
function roundTo(value, step) {
  if (!(step > 0)) return Math.round(value * 10) / 10;
  return Math.round(value / step) * step;
}

/**
 * Round each dumbbell rung DOWN to the heaviest bell the rack owns at or below
 * the percentage target — never up into a weight the athlete cannot pick up.
 * `basis` decides the space: Each/Per side are per dumbbell, Both is the pair
 * total, so a pair ramp halves, snaps, then doubles back.
 */
function buildDumbbellRamp(total, ladder, rungs, basis) {
  const perPair = basis === 'total';
  const perDumbbell = perPair ? total / 2 : total;
  /** @type {Array<{ w: number, r: number, c: boolean, type: 'W', ramp: true }>} */
  const rows = [];
  for (const step of rungs) {
    const target = perDumbbell * step.pct;
    /** @type {number|null} */
    let load = null;
    for (const w of ladder) if (w <= target + 1e-9) load = w;
    if (load == null || load <= 0) continue;
    const w = perPair ? load * 2 : load;
    if (!(w < total)) continue;
    if (rows.some((row) => row.w === w)) continue;
    rows.push({ w: Number(w.toFixed(2)), r: step.reps, c: false, type: /** @type {const} */ ('W'), ramp: true });
  }
  return rows;
}

/**
 * Build editable warm-up rows for a barbell or dumbbell lift.
 *
 * The percentages apply to the weight ABOVE the bar, so a 100 kg squat on a
 * 20 kg bar ramps 52 / 68 / 84 kg rather than 40 / 60 / 80. With a dumbbell
 * ladder the rungs snap down to weights the rack actually owns.
 *
 * @param {number|string} workingWeight
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number>, dumbbells?: number[], basis?: 'each'|'per-side'|'total'|string, rungs?: ReadonlyArray<{ pct: number, reps: number }>, unit?: 'kg'|'lb'|string }} [setup]
 * @returns {Array<{ w: number, r: number, c: boolean, type: 'W', ramp: true }>}
 */
export function buildWarmupRamp(workingWeight, setup = {}) {
  const total = Number(workingWeight);
  const unit = setup.unit === 'lb' || setup.unit === 'lbs' ? 'lb' : 'kg';
  const rungs = Array.isArray(setup.rungs) && setup.rungs.length ? setup.rungs : RAMP_SETS;
  const hasDumbbellSetup = Array.isArray(setup.dumbbells);
  const ladder = hasDumbbellSetup
    ? setup.dumbbells.map(Number).filter((w) => Number.isFinite(w) && w > 0).sort((a, b) => a - b)
    : [];
  if (!Number.isFinite(total) || total <= 0) return [];
  // A dumbbell call with an unconfigured ladder has no honest rungs; it must
  // not fall through to barbell math and invent a bar the athlete never used.
  if (hasDumbbellSetup) return ladder.length ? buildDumbbellRamp(total, ladder, rungs, setup.basis) : [];

  const bar = Number(setup.bar) > 0 ? Number(setup.bar) : (unit === 'lb' ? 45 : 20);
  const plates = Array.isArray(setup.plates) && setup.plates.length ? setup.plates : null;
  const counts = setup.counts || null;
  const increment = unit === 'lb' ? 5 : 2.5;
  if (total <= bar + 0.01) return [];

  /** @type {Array<{ w: number, r: number, c: boolean, type: 'W', ramp: true }>} */
  const rows = [];
  for (const step of rungs) {
    const target = bar + (total - bar) * step.pct;
    let load = target;
    if (plates) {
      const breakdown = computePlateBreakdown(target, bar, plates, counts);
      load = breakdown.exact ? target : target - breakdown.leftover * 2;
    }
    load = roundTo(Math.max(bar + increment, Math.min(load, total - increment)), increment);
    if (!(load > bar) || load >= total) continue;
    if (rows.some((row) => row.w === load)) continue;
    rows.push({ w: load, r: step.reps, c: false, type: /** @type {const} */ ('W'), ramp: true });
  }
  return rows;
}

/**
 * Insert a ramp once for this lift/day, before the first working set. The stamp
 * in `liftMeta` means deleting a warm-up does not resurrect it on the next edit.
 *
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {number|string} workingWeight
 * @param {{ bar?: number, plates?: number[], counts?: Record<string, number>, unit?: string }} [setup]
 * @returns {boolean} whether rows were inserted
 */
export function addWarmupRamp(weekData, day, liftName, workingWeight, setup = {}) {
  const sets = weekData?.lifts?.[day]?.[liftName];
  if (!Array.isArray(sets) || sets.some(isWarmupSet)) return false;
  const meta = weekData?.liftMeta?.[day]?.[liftName];
  if (meta?.autoRamp) return false;
  const rows = buildWarmupRamp(workingWeight, setup);
  if (!rows.length) return false;
  // The ramp is built in the DISPLAY unit (bars, plates and steps are per unit)
  // and stored canonically as kilograms.
  const unit = setup.unit === 'lb' || setup.unit === 'lbs' ? 'lbs' : 'kg';
  sets.unshift(...rows.map((row) => ({ ...row, w: toCanonicalWeight(row.w, unit) })));
  if (!weekData.liftMeta) weekData.liftMeta = {};
  if (!weekData.liftMeta[day]) weekData.liftMeta[day] = {};
  if (!weekData.liftMeta[day][liftName]) weekData.liftMeta[day][liftName] = {};
  weekData.liftMeta[day][liftName].autoRamp = true;
  return true;
}
