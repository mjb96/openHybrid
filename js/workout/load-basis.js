// @ts-check
// =============================================================================
// LOAD BASIS — does the entered number mean each dumbbell or the pair?
//
// Stored sets are the athlete's own numbers and are never rewritten. A set with
// no `basis` is legacy/total and is multiplied once by setVolume(). New dumbbell
// sets default to `each` and are stamped on completion, so their pair tonnage is
// counted correctly without changing any historical volume.
// =============================================================================
import { resolveExercise } from '../exercises/catalog.js';

const DUMBBELL_NAME = /dumbbell|db\b/i;

/** True when a load-basis choice (Each / Per side / Both) is meaningful. */
export function supportsLoadBasis(exerciseName) {
  const entry = resolveExercise(exerciseName);
  if (!entry) return DUMBBELL_NAME.test(String(exerciseName || ''));
  const equipment = Array.isArray(entry.equipment) ? entry.equipment : [];
  return equipment.includes('dumbbells') && !equipment.includes('barbell');
}

/** A unilateral dumbbell movement counts one working side, not a pair. */
export function isUnilateralExercise(exerciseName) {
  return resolveExercise(exerciseName)?.unilateral === true;
}

/** The default for a NEW dumbbell set. Legacy stored sets keep their absence. */
export function defaultBasisForExercise(exerciseName) {
  if (!supportsLoadBasis(exerciseName)) return 'total';
  return isUnilateralExercise(exerciseName) ? 'per-side' : 'each';
}

/**
 * The per-side split shown beside a logged rep total. History and 1RM keep
 * meaning the TOTAL; this is a display-only reading of it.
 * @param {unknown} value total reps
 */
export function perSideRepsLabel(value) {
  const reps = parseInt(String(value ?? ''), 10);
  if (!(reps > 0)) return '';
  const half = reps / 2;
  return `${Number.isInteger(half) ? half : String(Math.round(half * 10) / 10)} per side`;
}

/** Normalise a stored/selected basis. */
export function normalizeBasis(basis) {
  return basis === 'each' || basis === 'per-side' || basis === 'total' ? basis : 'total';
}

/** Human label for the row chip. */
export function basisLabel(basis) {
  const value = normalizeBasis(basis);
  return value === 'each' ? 'Each' : value === 'per-side' ? 'Per side' : 'Both';
}

/** Next state for the chip: bilateral toggles Each↔Both, unilateral Per side↔Both. */
export function nextBasis(name, basis) {
  const current = normalizeBasis(basis);
  const primary = defaultBasisForExercise(name);
  return current === primary ? 'total' : primary;
}
