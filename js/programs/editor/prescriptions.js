// @ts-check
// =============================================================================
// PLAN PRESCRIPTIONS (js/programs/editor/prescriptions.js)
// -----------------------------------------------------------------------------
// Roadmap §22 / PL5. The editor's per-exercise target layer.
//
// `program.prescriptions[day][lift]` already exists: imported plans and routines
// write it, `liftTarget` reads it FIRST, the weight-unit converter converts it,
// and the cockpit honours its rest. What never happened was the athlete being
// able to write it — the builder could only set ONE sets/reps pair for the whole
// week, so "bench 4×6, rows 3×12" was impossible.
//
// Rules:
//   • Keys are the lift NAME (the app's contract everywhere), so every mutation
//     that renames/removes a lift must move/remove its target. These helpers own
//     that, and `prunePrescriptions` is the safety net for imported/legacy data.
//   • An absent field means "use the week's target"; a present one wins.
//   • Values are clamped, never stored as garbage. A deload is DERIVED (see
//     `deloadSets`) so it applies to prescribed lifts without writing anything.
//
// Pure: no DOM, no storage.
// =============================================================================

export const MIN_SETS = 1;
export const MAX_SETS = 12;
export const MAX_REST_SEC = 900;
export const MAX_WEIGHT = 500;

const isRecord = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

/** Clamp a set count; a non-number falls back (never NaN). */
export function clampSets(value, fallback = 3) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return Math.max(MIN_SETS, Math.min(MAX_SETS, fallback));
  return Math.max(MIN_SETS, Math.min(MAX_SETS, n));
}

/**
 * Reps are a short free-text target ("8", "6-8", "8–10", "12+"). Keep it plain
 * text — the week modifier has always accepted a range, and the logger shows it
 * verbatim.
 */
export function normalizeReps(value) {
  const text = String(value == null ? '' : value).trim().slice(0, 24);
  return text;
}

/** Rest seconds: 0 means "no timer", anything unusable becomes absent. */
export function clampRest(value) {
  if (value == null || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_REST_SEC, n);
}

/** Starting load; 0/blank means "no starting load". */
export function clampWeight(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(MAX_WEIGHT, Math.round(n * 100) / 100);
}

/** The stored target for one lift, or null. */
export function targetFor(program, dayKey, liftName) {
  const entry = program?.prescriptions?.[dayKey]?.[liftName];
  return isRecord(entry) ? entry : null;
}

/**
 * Write/merge one lift's target. Only `sets` and `reps` are required; rest and
 * weight are stored when given. Returns the stored entry.
 *
 * @param {any} program
 * @param {string} dayKey
 * @param {string} liftName
 * @param {{sets?:any, reps?:any, restSec?:any, weight?:any}} patch
 */
export function setLiftTarget(program, dayKey, liftName, patch) {
  if (!program || !dayKey || typeof liftName !== 'string' || !liftName.trim()) return null;
  if (!isRecord(program.prescriptions)) program.prescriptions = {};
  if (!isRecord(program.prescriptions[dayKey])) program.prescriptions[dayKey] = {};
  const current = targetFor(program, dayKey, liftName) || {};
  const next = {
    sets: clampSets(patch.sets != null ? patch.sets : current.sets, 3),
    reps: normalizeReps(patch.reps != null ? patch.reps : current.reps) || '8',
  };
  const rest = patch.restSec !== undefined ? clampRest(patch.restSec) : clampRest(current.restSec);
  const weight = patch.weight !== undefined ? clampWeight(patch.weight) : clampWeight(current.weight);
  if (rest != null) next.restSec = rest;
  if (weight != null) next.weight = weight;
  program.prescriptions[dayKey][liftName] = next;
  prunePrescriptions(program);
  return program.prescriptions[dayKey]?.[liftName] || null;
}

/** Remove one lift's target (the week's target takes over again). */
export function clearLiftTarget(program, dayKey, liftName) {
  const day = program?.prescriptions?.[dayKey];
  if (!isRecord(day) || !(liftName in day)) return false;
  delete day[liftName];
  prunePrescriptions(program);
  return true;
}

/**
 * Move a target when a lift is renamed/replaced. If the destination already has
 * a target, that one wins (the athlete may have edited it deliberately) and the
 * source is simply dropped.
 */
export function renameLiftTarget(program, dayKey, oldName, newName) {
  const day = program?.prescriptions?.[dayKey];
  if (!isRecord(day) || !oldName || !newName || oldName === newName) return false;
  if (!(oldName in day)) return false;
  if (!(newName in day)) day[newName] = day[oldName];
  delete day[oldName];
  prunePrescriptions(program);
  return true;
}

/**
 * Drop targets that no longer correspond to a lift on their day, and empty day
 * objects. Safe to call after any structural edit and on import.
 * @param {any} program
 */
export function prunePrescriptions(program) {
  const prescriptions = program?.prescriptions;
  if (!isRecord(prescriptions)) {
    if (program && prescriptions !== undefined) delete program.prescriptions;
    return 0;
  }
  let removed = 0;
  const days = program?.days && typeof program.days === 'object' ? program.days : {};
  for (const [dayKey, byLift] of Object.entries(prescriptions)) {
    if (!isRecord(byLift)) { delete prescriptions[dayKey]; continue; }
    const lifts = new Set(
      (Array.isArray(days?.[dayKey]?.lifts) ? days[dayKey].lifts : [])
        .filter((name) => typeof name === 'string' && name.trim()),
    );
    for (const liftName of Object.keys(byLift)) {
      if (!lifts.has(liftName)) { delete byLift[liftName]; removed++; }
    }
    if (!Object.keys(byLift).length) delete prescriptions[dayKey];
  }
  if (!Object.keys(prescriptions).length) delete program.prescriptions;
  return removed;
}

/**
 * A deload halves working sets (floor 2). Derived, never stored: a deload is an
 * instruction for the week, not a new prescription, and it must reach lifts that
 * have their own target.
 */
export function deloadSets(sets) {
  return Math.max(2, Math.round(clampSets(sets, 3) / 2));
}

/** The set count a prescribed lift actually trains in a given week. */
export function effectiveSets(program, dayKey, liftName, weekModifier) {
  const target = targetFor(program, dayKey, liftName);
  if (!target || !(Number(target.sets) > 0)) return null;
  const deload = /deload/i.test(weekModifier?.intensityLabel || '');
  return deload ? deloadSets(target.sets) : clampSets(target.sets);
}
