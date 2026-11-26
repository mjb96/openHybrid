// @ts-check
// =============================================================================
// WEIGHT UNIT CONVERSION (js/metrics/weight-unit.js)
//
// CANONICAL STORAGE (ST6): every weight in `appState` is stored in KILOGRAMS.
// `settings.weightUnit` is a DISPLAY preference only — exactly like a language
// setting. Nothing is rewritten when it changes, so history cannot drift and a
// 100 kg squat stays 100 kg forever.
//
// Every boundary converts once:
//   • display  → storage : `toCanonicalWeight` / `canonicalWeightString`
//   • storage  → display : `fromCanonicalWeight` / `formatWeightForUnit`
//
// The v17→v18 migration converts an existing lbs state ONCE
// (`convertStoredWeights(..., { exact: true })`); after that this module is
// never asked to rewrite stored data again.
//
// Bands were already canonical kilograms and equipment plate/dumbbell ladders
// are keyed per unit, so neither is converted here.
// =============================================================================

export const KG_PER_LB = 0.45359237;

/** The unit every stored weight is in. */
export const CANONICAL_WEIGHT_UNIT = 'kg';

/** @param {unknown} unit @returns {'kg'|'lbs'} */
export function normalizeWeightUnit(unit) {
  return unit === 'lb' || unit === 'lbs' ? 'lbs' : 'kg';
}

/**
 * A number typed (or shown) in `unit` → canonical kilograms.
 * Two decimals (10 g), so a lb value round-trips without drifting. Returns null
 * for anything that is not a finite number, so callers can store blank.
 * @param {unknown} value
 * @param {string} [unit]
 * @returns {number|null}
 */
export function toCanonicalWeight(value, unit = CANONICAL_WEIGHT_UNIT) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  const kg = normalizeWeightUnit(unit) === 'lbs' ? number * KG_PER_LB : number;
  // Two decimals (10 g) matches the one-time migration converter exactly, so a
  // migrated value and a freshly typed one are stored identically.
  return Math.round(kg * 100) / 100;
}

/**
 * Canonical kilograms → the number shown in `unit`. Unrounded; the formatter
 * decides display precision.
 * @param {unknown} kg
 * @param {string} [unit]
 * @returns {number|null}
 */
export function fromCanonicalWeight(kg, unit = CANONICAL_WEIGHT_UNIT) {
  const number = Number(kg);
  if (!Number.isFinite(number)) return null;
  if (number === 0) return 0;
  return normalizeWeightUnit(unit) === 'lbs' ? number / KG_PER_LB : number;
}

/**
 * Stored kilograms → the string a text/number input should show. One decimal at
 * most, trailing `.0` removed, and an honest empty string for a blank value.
 * @param {unknown} kg
 * @param {string} [unit]
 * @param {{ decimals?: number }} [options]
 */
export function displayWeightString(kg, unit = CANONICAL_WEIGHT_UNIT, { decimals } = {}) {
  if (kg == null || kg === '') return '';
  const number = fromCanonicalWeight(kg, unit);
  if (number == null) return '';
  if (number === 0) return '0';
  // Kilograms carry micro-plate steps (1.25, 0.5), so they need two decimals;
  // pounds are loaded in 2.5/5 lb jumps and read best with one. Trailing zeros
  // are trimmed, so 100 stays "100".
  const places = decimals == null ? (normalizeWeightUnit(unit) === 'lbs' ? 1 : 2) : decimals;
  const rounded = Number(number.toFixed(Math.max(0, Math.min(3, places))));
  return String(rounded);
}

/**
 * A typed display value → the string to persist in a set/prescription. Keeps
 * an empty input empty (a blank row is not a 0 kg set).
 * @param {unknown} value
 * @param {string} [unit]
 */
export function canonicalWeightString(value, unit = CANONICAL_WEIGHT_UNIT) {
  const text = value == null ? '' : String(value).trim();
  if (text === '') return '';
  const kg = toCanonicalWeight(text, unit);
  return kg == null ? '' : String(kg);
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

/** @param {{ step?: number, allowNegative?: boolean }} [opts] */
function convertBodyWeightMap(map, from, to, opts = {}) {
  if (!map || typeof map !== 'object') return 0;
  const step = Number.isFinite(opts.step) ? opts.step : 0.1;
  let count = 0;
  for (const day of Object.keys(map)) {
    const next = convertWeightValue(map[day], from, to, { step });
    if (next !== map[day]) { map[day] = next; count += 1; }
  }
  return count;
}

/** Convert `prescriptions[day][lift].weight` in place (routines, imported plans). */
function convertPrescriptions(container, from, to, opts = {}) {
  let count = 0;
  for (const day of Object.keys(container || {})) {
    const byLift = container[day];
    if (!byLift || typeof byLift !== 'object') continue;
    for (const lift of Object.keys(byLift)) {
      const item = byLift[lift];
      if (!item || typeof item !== 'object' || !('weight' in item)) continue;
      const next = convertWeightValue(item.weight, from, to, opts);
      if (next !== item.weight) { item.weight = next; count += 1; }
    }
  }
  return count;
}

/**
 * Convert every stored weight in appState. Mutates in place and returns a small
 * report for tests and the toast. The caller must save afterward.
 *
 * `exact` is the CANONICAL migration mode: no rounding, so the stored kilogram
 * value is the athlete's real mass and a display round-trip cannot drift.
 * @param {any} state
 * @param {string} from
 * @param {string} to
 * @param {{ exact?: boolean }} [options]
 */
export function convertStoredWeights(state, from, to, { exact = false } = {}) {
  const source = normalizeWeightUnit(from);
  const target = normalizeWeightUnit(to);
  const report = { from: source, to: target, sets: 0, bodyWeights: 0, prescriptions: 0, settings: 0, goals: 0 };
  if (source === target || !state) return report;
  /** @type {{ step?: number, allowNegative?: boolean }} */
  const opts = exact ? { step: 0 } : {};

  for (const week of Object.values(state.weeks || {})) {
    const lifts = week?.lifts && typeof week.lifts === 'object' ? week.lifts : {};
    for (const day of Object.keys(lifts)) {
      const byLift = lifts[day];
      if (!byLift || typeof byLift !== 'object') continue;
      for (const lift of Object.keys(byLift)) {
        const sets = Array.isArray(byLift[lift]) ? byLift[lift] : [];
        for (const set of sets) {
          if (!set || typeof set !== 'object') continue;
          if ('w' in set) {
            const next = convertWeightValue(set.w, source, target, opts);
            if (next !== set.w) { set.w = next; report.sets += 1; }
          }
          // `tw` is the prescribed target weight captured at log time. It is
          // compared with the logged volume, so it must share the set's unit.
          if ('tw' in set) {
            const next = convertWeightValue(set.tw, source, target, opts);
            if (next !== set.tw) { set.tw = next; report.sets += 1; }
          }
        }
      }
    }
    report.bodyWeights += convertBodyWeightMap(week?.bodyWeight, source, target, opts);
  }

  for (const entry of Array.isArray(state.bodyWeightLog) ? state.bodyWeightLog : []) {
    if (!entry || typeof entry !== 'object' || !('weight' in entry)) continue;
    const next = convertWeightValue(entry.weight, source, target, exact ? { step: 0 } : { step: 0.1 });
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
    const next = convertWeightValue(value, source, target, { step: exact ? 0 : step, allowNegative: key === 'rateGoal' });
    if (next !== value) { settings[key] = Number(next); report.settings += 1; }
  }

  for (const key of Object.keys(state.prGoals || {})) {
    const next = convertWeightValue(state.prGoals[key], source, target, opts);
    if (next !== state.prGoals[key]) { state.prGoals[key] = next; report.goals += 1; }
  }

  for (const routine of Array.isArray(state.routines) ? state.routines : []) {
    report.prescriptions += convertPrescriptions(routine?.prescriptions, source, target, opts);
  }
  for (const program of Array.isArray(state.customPrograms) ? state.customPrograms : []) {
    report.prescriptions += convertPrescriptions(program?.prescriptions, source, target, opts);
  }

  return report;
}
