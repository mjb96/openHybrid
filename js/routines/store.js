// @ts-check
// =============================================================================
// ROUTINE STORE (js/routines/store.js)
//
// A routine is a reusable SESSION TEMPLATE — one saved day of exercises with the
// sets, reps, load and rest that were actually trained. It is NOT a programme:
// it never enters `customPrograms`, never resolves through `getProgramById` /
// `resolveProgramForState`, never renders as a `.prog-card`, and never calls
// `startProgramActivation` / `reseedActiveProgramIntoWeek`. Starting one creates
// an ordinary one-off session; the active programme is left alone.
//
// The root arrays and the id namespaces live in this LEAF module (no workout
// imports) so `js/state.js` can guarantee them on boot without pulling the
// editor that turns a finished session into a routine.
// =============================================================================
import { secureRandomSuffix } from '../util/secure-id.js';

// Defensive bounds shared by the builder, the copy path and import validation,
// so the app can never write a routine its own import would refuse. A single
// lift with more than 50 working sets is not a real session; a routine library
// with more than 500 records is not a real library.
export const MAX_ROUTINE_SETS = 50;
export const MAX_ROUTINE_LIFTS = 60;
export const MAX_ROUTINES = 500;
export const MAX_ROUTINE_FOLDERS = 200;

/**
 * Guarantee both root routine arrays exist. Idempotent; returns true when it
 * had to repair something (callers do not need the value).
 * @param {any} state
 * @returns {boolean}
 */
export function ensureRoutines(state) {
  if (!state || typeof state !== 'object') return false;
  let changed = false;
  if (!Array.isArray(state.routines)) { state.routines = []; changed = true; }
  if (!Array.isArray(state.libraryFolders)) { state.libraryFolders = []; changed = true; }
  return changed;
}

/** Collision-resistant routine id (`rtn_…`). */
export function newRoutineId() {
  return `rtn_${Date.now().toString(36)}_${secureRandomSuffix(6)}`;
}

/** Collision-resistant routine-folder id (`fld_…`). */
export function newFolderId() {
  return `fld_${Date.now().toString(36)}_${secureRandomSuffix(6)}`;
}

/**
 * One routine by id, or null.
 * @param {any} state
 * @param {string|null|undefined} id
 * @returns {any|null}
 */
export function findRoutine(state, id) {
  if (!id) return null;
  return (Array.isArray(state?.routines) ? state.routines : [])
    .find((routine) => routine?.id === id) || null;
}

/**
 * Remove one routine by id. This is the Undo half of "Save as routine": the
 * caller already holds the reference it pushed, so returning it is only useful
 * for callers that need the record back.
 * @param {any} state
 * @param {string|null|undefined} id
 * @returns {any|null}
 */
export function removeRoutine(state, id) {
  if (!state || !Array.isArray(state.routines) || !id) return null;
  const index = state.routines.findIndex((routine) => routine?.id === id);
  if (index === -1) return null;
  return state.routines.splice(index, 1)[0] || null;
}
