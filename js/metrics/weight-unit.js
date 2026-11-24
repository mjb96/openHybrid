// @ts-check
// =============================================================================
// WEIGHT UNIT CONVERSION (js/metrics/weight-unit.js)
//
// openHybrid stores weights in the athlete's CURRENT unit. H1/S-F4 makes a
// unit change convert the stored numbers instead of relabelling them: a 100 kg
// squat becomes 220.5 lb, not "100 lb". This module owns the conversion and the
// state walk; the Settings screen owns the confirmation and backup.
//
// Bands stay canonical kilograms and equipment plate/dumbbell ladders are
// already keyed per unit, so neither is touched here.
// =============================================================================

export const KG_PER_LB = 0.45359237;

/** @param {unknown} unit @returns {'kg'|'lbs'} */
export function normalizeWeightUnit(unit) {
  return unit === 'lb' || unit === 'lbs' ? 'lbs' : 'kg';
}

/**
 * Convert one weight, preserving empty/invalid values and the input type.
 * @param {unknown} value
 * @param {string} from
 * @param {string} to
 * @param {{ step?: number, allowNegative?: boolean }} [options] rounding step in the TARGET unit
 * @returns {unknown}
 */
export function convertWeightValue(value, from, to, { step = 0.5, allowNegative = false } = {}) {
  const source = normalizeWeightUnit(from);
  const target = normalizeWeightUnit(to);
  if (source === target) return value;
  const number = Number(value);
  if (!Number.isFinite(number) || number === 0) return value;
  if (number < 0 && !allowNegative) return value;
  const kg = source === 'lbs' ? number * KG_PER_LB : number;
  const converted = target === 'lbs' ? kg / KG_PER_LB : kg;
  const rounded = step > 0 ? Math.round(converted / step) * step : converted;
  const clean = Number(rounded.toFixed(2));
  return typeof value === 'string' ? String(clean) : clean;
}

/** Convert a map of `{ [day]: weight }` values in place. */
function convertBodyWeightMap(map, from, to) {
  if (!map || typeof map !== 'object') return 0;
  let count = 0;
  for (const day of Object.keys(map)) {
    const next = convertWeightValue(map[day], from, to, { step: 0.1 });
    if (next !== map[day]) { map[day] = next; count += 1; }
  }
  return count;
}

/** Convert `prescriptions[day][lift].weight` in place (routines, imported plans). */
function convertPrescriptions(container, from, to) {
  let count = 0;
  for (const day of Object.keys(container || {})) {
    const byLift = container[day];
    if (!byLift || typeof byLift !== 'object') continue;
    for (const lift of Object.keys(byLift)) {
      const item = byLift[lift];
      if (!item || typeof item !== 'object' || !('weight' in item)) continue;
      const next = convertWeightValue(item.weight, from, to);
      if (next !== item.weight) { item.weight = next; count += 1; }
    }
  }
  return count;
}

/**
 * Convert every stored weight in appState. Mutates in place and returns a small
 * report for tests and the toast. The caller must save afterward.
 * @param {any} state
 * @param {string} from
 * @param {string} to
 */
export function convertStoredWeights(state, from, to) {
  const source = normalizeWeightUnit(from);
  const target = normalizeWeightUnit(to);
  const report = { from: source, to: target, sets: 0, bodyWeights: 0, prescriptions: 0, settings: 0, goals: 0 };
  if (source === target || !state) return report;

  for (const week of Object.values(state.weeks || {})) {
    const lifts = week?.lifts && typeof week.lifts === 'object' ? week.lifts : {};
    for (const day of Object.keys(lifts)) {
      const byLift = lifts[day];
      if (!byLift || typeof byLift !== 'object') continue;
      for (const lift of Object.keys(byLift)) {
        const sets = Array.isArray(byLift[lift]) ? byLift[lift] : [];
        for (const set of sets) {
          if (!set || typeof set !== 'object' || !('w' in set)) continue;
          const next = convertWeightValue(set.w, source, target);
          if (next !== set.w) { set.w = next; report.sets += 1; }
        }
      }
    }
    report.bodyWeights += convertBodyWeightMap(week?.bodyWeight, source, target);
  }

  for (const entry of Array.isArray(state.bodyWeightLog) ? state.bodyWeightLog : []) {
    if (!entry || typeof entry !== 'object' || !('weight' in entry)) continue;
    const next = convertWeightValue(entry.weight, source, target, { step: 0.1 });
    if (next !== entry.weight) { entry.weight = next; report.bodyWeights += 1; }
  }

  const settings = state.settings || {};
  /** @type {Array<[string, number]>} */
  const weightSettings = [
    ['defaultBodyWeight', 0.1], ['targetWeight', 0.1], ['rateGoal', 0.1], ['progressionIncrement', 0.5],
  ];
  for (const [key, step] of weightSettings) {
    const value = settings[key];
    if (value == null || value === '') continue;
    const next = convertWeightValue(value, source, target, { step, allowNegative: key === 'rateGoal' });
    if (next !== value) { settings[key] = Number(next); report.settings += 1; }
  }

  for (const key of Object.keys(state.prGoals || {})) {
    const next = convertWeightValue(state.prGoals[key], source, target);
    if (next !== state.prGoals[key]) { state.prGoals[key] = next; report.goals += 1; }
  }

  for (const routine of Array.isArray(state.routines) ? state.routines : []) {
    report.prescriptions += convertPrescriptions(routine?.prescriptions, source, target);
  }
  for (const program of Array.isArray(state.customPrograms) ? state.customPrograms : []) {
    report.prescriptions += convertPrescriptions(program?.prescriptions, source, target);
  }

  return report;
}
