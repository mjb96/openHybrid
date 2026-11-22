// @ts-check
// =============================================================================
// SET ENTRY (js/workout/set-entry.js) — roadmap Phase 2A
//
// Two of the set-row contract's requirements, modelled away from the DOM:
//
//   "previous values visible"
//   "invalid or incomplete input explained inline"
//
// PREVIOUS VALUES. The row already showed last time's numbers as input
// PLACEHOLDERS, which vanish the moment you type — exactly when you want to
// compare against them. `previousSetLabel` produces a label that can sit beside
// the field and stay put. Holds and carries get their own units.
//
// VALIDATION. Completion previously only asked "is this field non-empty?", so
// `-50` and `0` reps were both accepted. Neither is a real set, and a negative
// weight is not merely cosmetic: `setVolume` is `parseFloat(w) * parseInt(r)`,
// so one mistyped minus subtracts from tonnage, weekly volume, muscle credits
// and every landmark comparison built on them. This is the guard for that.
//
// The bounds are deliberately asymmetric. Impossible values are ERRORS and
// block the tick. Merely surprising ones are WARNINGS that inform and get out
// of the way — an athlete really can rep 120 bodyweight squats, and a logger
// that argues with them is a logger they stop using.
//
// PURE. No DOM, no state mutation.
// =============================================================================
import {
  SET_MODE, formatDistance, formatDuration, parseDuration, setModeOf,
} from '../set-utils.js';

/**
 * Above these, a value is surprising but still possible, so it warns rather
 * than blocks. Weight is unit-agnostic on purpose: the app stores whatever unit
 * the athlete entered and never converts, so one bound has to cover both. It is
 * set at the loose (lbs) end so a legitimate heavy lbs load is never called
 * impossible — the cost of a missed warning is far lower than the cost of
 * refusing a real lift.
 */
export const SET_ENTRY_LIMITS = Object.freeze({
  maxReps: 100,
  maxWeight: 1500,
  maxSeconds: 24 * 60 * 60,
  maxMetres: 100000,
});

/**
 * @typedef {object} SetEntryMessage
 * @property {'weight'|'reps'|'value'} field
 * @property {'error'|'warning'} level
 * @property {string} text
 */

/**
 * Validate one set's entered values.
 *
 * `mode` defaults to reps, so every existing caller keeps its exact meaning.
 * Holds read the second input as seconds (`M:SS` or a plain count); carries
 * read it as metres.
 *
 * @param {{weight?: any, reps?: any, value?: any, sec?: any, dist?: any, mode?: string, type?: string, loadMode?: string}} entry
 * @returns {{ok: boolean, errors: SetEntryMessage[], warnings: SetEntryMessage[], firstErrorField: 'weight'|'reps'|'value'|null}}
 */
export function validateSetEntry(entry = {}) {
  /** @type {SetEntryMessage[]} */
  const errors = [];
  /** @type {SetEntryMessage[]} */
  const warnings = [];
  const mode = entry.mode === SET_MODE.TIME || entry.mode === SET_MODE.DISTANCE
    ? entry.mode : SET_MODE.REPS;

  const rawWeight = String(entry.weight ?? '').trim();
  const rawValue = String(
    entry.value ?? (mode === SET_MODE.TIME ? entry.sec : mode === SET_MODE.DISTANCE ? entry.dist : entry.reps) ?? ''
  ).trim();
  const valueField = mode === SET_MODE.REPS ? 'reps' : 'value';
  // Bodyweight and assisted rows derive their effective load from body mass and
  // band assistance, so a blank weight there is normal, not incomplete.
  const weightRequired = (entry.loadMode || 'weighted') === 'weighted';

  if (!rawWeight) {
    if (weightRequired) errors.push({ field: 'weight', level: 'error', text: 'Enter the weight.' });
  } else {
    const weight = Number(rawWeight);
    if (!Number.isFinite(weight)) {
      errors.push({ field: 'weight', level: 'error', text: 'Weight must be a number.' });
    } else if (weight < 0) {
      // The defect this whole module exists for.
      errors.push({ field: 'weight', level: 'error', text: 'Weight cannot be negative.' });
    } else if (weight > SET_ENTRY_LIMITS.maxWeight) {
      warnings.push({ field: 'weight', level: 'warning', text: `Over ${SET_ENTRY_LIMITS.maxWeight} — check the number.` });
    }
  }

  if (!rawValue) {
    const text = mode === SET_MODE.TIME ? 'Enter the time.'
      : mode === SET_MODE.DISTANCE ? 'Enter the distance.' : 'Enter the reps.';
    errors.push({ field: valueField, level: 'error', text });
  } else if (mode === SET_MODE.TIME) {
    const seconds = parseDuration(rawValue);
    if (seconds == null) {
      errors.push({ field: 'value', level: 'error', text: 'Time must be MM:SS or seconds.' });
    } else if (seconds > SET_ENTRY_LIMITS.maxSeconds) {
      warnings.push({ field: 'value', level: 'warning', text: 'Over 24 hours — check the time.' });
    }
  } else if (mode === SET_MODE.DISTANCE) {
    const metres = Number(rawValue);
    if (!Number.isFinite(metres)) {
      errors.push({ field: 'value', level: 'error', text: 'Distance must be a number.' });
    } else if (metres < 1) {
      // A completed carry of zero metres is a set that did not happen.
      errors.push({ field: 'value', level: 'error', text: 'At least 1 m.' });
    } else if (metres > SET_ENTRY_LIMITS.maxMetres) {
      warnings.push({ field: 'value', level: 'warning', text: `Over ${SET_ENTRY_LIMITS.maxMetres} m — check the number.` });
    }
  } else {
    const reps = Number(rawValue);
    if (!Number.isFinite(reps)) {
      errors.push({ field: 'reps', level: 'error', text: 'Reps must be a number.' });
    } else if (!Number.isInteger(reps)) {
      errors.push({ field: 'reps', level: 'error', text: 'Whole reps only.' });
    } else if (reps < 1) {
      // A completed set of zero reps is a set that did not happen. It also reads
      // as done in the cockpit while isValidWorkingSet drops it from analytics —
      // the screen and the numbers would disagree.
      errors.push({ field: 'reps', level: 'error', text: 'At least 1 rep.' });
    } else if (reps > SET_ENTRY_LIMITS.maxReps) {
      warnings.push({ field: 'reps', level: 'warning', text: `Over ${SET_ENTRY_LIMITS.maxReps} reps — check the number.` });
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    firstErrorField: errors.length ? errors[0].field : null,
  };
}

/**
 * The one message to show on the row. Errors outrank warnings; the weight field
 * is read before the value field so the message order matches the row's layout.
 * @param {ReturnType<typeof validateSetEntry>} result
 * @returns {SetEntryMessage|null}
 */
export function primarySetEntryMessage(result) {
  if (!result) return null;
  const ordered = [...result.errors, ...result.warnings];
  if (!ordered.length) return null;
  const byField = (field) => ordered.find((m) => m.field === field);
  return byField('weight') || byField('reps') || byField('value') || ordered[0];
}

/**
 * Last time's numbers for this set, formatted to sit next to the fields and
 * stay visible while typing. Reads the stored shape, so a hold shows its time
 * and a carry shows its distance instead of a fabricated rep count.
 *
 * Returns null rather than a placeholder string when there is nothing to show:
 * a first-ever session must read as blank, not as "-- × --", which looks like
 * data that failed to load.
 *
 * @param {{w?: any, r?: any, sec?: any, dist?: any, mode?: string}|null|undefined} previousSet
 * @param {string} [unit] the athlete's own unit — this app never converts, it labels
 * @returns {{text: string, label: string}|null}
 */
export function previousSetLabel(previousSet, unit = 'kg') {
  if (!previousSet) return null;
  const mode = setModeOf(previousSet);
  const weight = Number(String(previousSet.w ?? '').trim());
  const hasWeight = Number.isFinite(weight) && weight > 0;

  let value = '';
  if (mode === SET_MODE.TIME) {
    const seconds = Number(previousSet.sec);
    if (Number.isFinite(seconds) && seconds > 0) value = formatDuration(seconds);
  } else if (mode === SET_MODE.DISTANCE) {
    const metres = Number(previousSet.dist);
    if (Number.isFinite(metres) && metres > 0) value = `${formatDistance(metres)}m`;
  } else {
    const reps = Number(String(previousSet.r ?? '').trim());
    if (Number.isFinite(reps) && reps > 0) value = trimNumber(reps);
  }
  if (!value && !hasWeight) return null;

  const weightPart = hasWeight ? `${trimNumber(weight)}${unit}` : '';
  const text = weightPart && value ? `${weightPart} × ${value}`
    : weightPart ? weightPart
    : mode === SET_MODE.REPS ? `${value} reps` : value;

  return { text: `Last ${text}`, label: `Last time: ${text}` };
}

/**
 * The row's set label: `S1` for working, `W1`/`D1`/`F1` for the special types.
 * One source for the template and the live update so they cannot drift.
 * @param {string} type
 * @param {number} setIndex
 */
export function setRowNumberLabel(type, setIndex) {
  if (type === 'W') return 'W';
  if (type === 'D') return 'D';
  if (type === 'F') return 'F';
  return `S${setIndex + 1}`;
}

/**
 * How this set compares with the same set index last session.
 *
 * ONE rule, used by the row template and by the in-place refresh after a tick —
 * otherwise the comparison would only appear on the next full re-render, which
 * is exactly the "did it save?" doubt the column exists to remove. A hold/carry
 * compares its seconds/metres first; a rep set keeps weight first (heavier at
 * the same reps is the stronger signal), then reps.
 *
 * @param {{ c?: any, w?: any, r?: any, sec?: any, dist?: any, mode?: string } | null | undefined} current
 * @param {{ c?: any, w?: any, r?: any, sec?: any, dist?: any, mode?: string } | null | undefined} prior
 * @returns {{ glyph: string, tone: 'up'|'down'|'same', label: string } | null}
 */
export function compareWithPrevious(current, prior) {
  if (!current || !prior || !current.c) return null;
  const mode = setModeOf(current);
  if (mode !== setModeOf(prior)) return null;
  const value = (set) => mode === SET_MODE.TIME ? Number(set.sec) || 0
    : mode === SET_MODE.DISTANCE ? Number(set.dist) || 0
    : parseInt(set.r, 10) || 0;
  const currentValue = value(current);
  const priorValue = value(prior);
  if (currentValue <= 0 || priorValue <= 0) return null;
  const currentWeight = Number.parseFloat(current.w);
  const priorWeight = Number.parseFloat(prior.w);
  const delta = mode === SET_MODE.REPS
    ? ((Number.isFinite(currentWeight) ? currentWeight : 0) - (Number.isFinite(priorWeight) ? priorWeight : 0)) || currentValue - priorValue
    : currentValue - priorValue
      || ((Number.isFinite(currentWeight) ? currentWeight : 0) - (Number.isFinite(priorWeight) ? priorWeight : 0));
  return delta > 0 ? { glyph: '↑', tone: 'up', label: 'better than last time' }
    : delta < 0 ? { glyph: '↓', tone: 'down', label: 'lower than last time' }
      : { glyph: '=', tone: 'same', label: 'matched last time' };
}

/**
 * The PREVIOUS column of a set row: the same prior set, compressed to one
 * glanceable token. `60×6`, `60×1:30`, `20×20m`, or `8` for an unloaded set.
 * Returns null when there is no honest prior set to show — the row then renders
 * an em dash rather than a blank that reads as "loading".
 * @param {any} previousSet
 * @param {string} [unit]
 * @returns {{ text: string, label: string } | null}
 */
export function previousSetCompact(previousSet, unit = 'kg') {
  if (!previousSet) return null;
  const mode = setModeOf(previousSet);
  const weight = Number(String(previousSet.w ?? '').trim());
  const hasWeight = Number.isFinite(weight) && weight > 0;

  let value = '';
  if (mode === SET_MODE.TIME) {
    const seconds = Number(previousSet.sec);
    if (Number.isFinite(seconds) && seconds > 0) value = formatDuration(seconds);
  } else if (mode === SET_MODE.DISTANCE) {
    const metres = Number(previousSet.dist);
    if (Number.isFinite(metres) && metres > 0) value = `${formatDistance(metres)}m`;
  } else {
    const reps = Number(String(previousSet.r ?? '').trim());
    if (Number.isFinite(reps) && reps > 0) value = trimNumber(reps);
  }
  if (!value && !hasWeight) return null;

  const weightPart = hasWeight ? trimNumber(weight) : '';
  const text = weightPart && value ? `${weightPart}×${value}` : (weightPart || value);
  const full = previousSetLabel(previousSet, unit);
  return { text, label: full?.label || `Last time: ${text}` };
}

/** 100.0 → "100", 102.5 → "102.5". Stored weights are strings of both shapes. */
function trimNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}
