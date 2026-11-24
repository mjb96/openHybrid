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
export const MAX_ROUTINE_NOTE = 500;

/**
 * The routine library's small, stable category vocabulary. A category is optional
 * metadata for finding a session again; it never changes what the routine does.
 * `uncategorised` is a FILTER key, not a stored value — an absent category is
 * the honest "not filed yet" state.
 */
export const ROUTINE_CATEGORIES = Object.freeze([
  Object.freeze({ id: 'home', label: 'At home' }),
  Object.freeze({ id: 'travel', label: 'Travel' }),
  Object.freeze({ id: 'dumbbells', label: 'Dumbbells' }),
  Object.freeze({ id: 'band', label: 'Band' }),
  Object.freeze({ id: 'cardio', label: 'Cardio / HIIT' }),
  Object.freeze({ id: 'gym', label: 'Gym' }),
  Object.freeze({ id: 'bodyweight', label: 'Bodyweight' }),
  Object.freeze({ id: 'suspension', label: 'Suspension' }),
  Object.freeze({ id: 'other', label: 'Other' }),
]);

/** One stored category id, or null for absent/unknown values. */
export function normalizeRoutineCategory(value) {
  if (value == null || value === '') return null;
  const id = String(value);
  return ROUTINE_CATEGORIES.some((category) => category.id === id) ? id : null;
}

/** Readable category label, or '' when the routine is uncategorised. */
export function routineCategoryLabel(value) {
  const id = normalizeRoutineCategory(value);
  return ROUTINE_CATEGORIES.find((category) => category.id === id)?.label || '';
}


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

/**
 * Set or clear a routine's private note. The note is copied into NOTHING: it is
 * read back by reference from the routine library when a session starts. Blank
 * clears it entirely (`routine.note` is absent when empty) and the cap is the
 * same bound import validation enforces.
 * @param {any} state
 * @param {string|null|undefined} routineId
 * @param {string} text
 * @returns {boolean}
 */
export function updateRoutineNote(state, routineId, text) {
  const routine = findRoutine(state, routineId);
  if (!routine) return false;
  const note = String(text ?? '').trim().slice(0, MAX_ROUTINE_NOTE);
  if (note) routine.note = note;
  else delete routine.note;
  routine.updatedAt = new Date().toISOString();
  return true;
}

/**
 * Set or clear a routine's category. Unknown values are cleared rather than
 * stored, so a renamed/removed category cannot leave an unreachable routine.
 */
export function setRoutineCategory(state, routineId, category) {
  const routine = findRoutine(state, routineId);
  if (!routine) return false;
  const id = normalizeRoutineCategory(category);
  if (id) routine.category = id;
  else delete routine.category;
  routine.updatedAt = new Date().toISOString();
  return true;
}

// ── Folders ──────────────────────────────────────────────────────────────────
//
// A folder is pure organisation: `{ id, name, sortOrder, createdAt }`. Membership
// is ONE-WAY on the routine (`folderId`); a folder never stores a member list, so
// deleting a folder can never delete routines and a routine can never be listed
// twice. Every helper here touches only `routines`/`libraryFolders`.

/** One folder by id, or null. */
export function findFolder(state, id) {
  if (!id || !Array.isArray(state?.libraryFolders)) return null;
  return state.libraryFolders.find((folder) => folder?.id === id) || null;
}

/** Folders in display order (sortOrder, then name). Returns a copy. */
export function orderedFolders(state) {
  return (Array.isArray(state?.libraryFolders) ? state.libraryFolders : [])
    .filter((folder) => folder && typeof folder === 'object')
    .slice()
    .sort(compareFolders);
}

function compareFolders(a, b) {
  return (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
    || String(a.name || '').localeCompare(String(b.name || ''));
}

/**
 * Sort a folder list into DISPLAY order (sortOrder, then name) and renumber it
 * 0..n-1. Use this when the input may be in an arbitrary/imported order.
 * @param {any[]} folders
 * @returns {any[]}
 */
function normaliseFolderOrder(folders) {
  const ordered = (Array.isArray(folders) ? folders : [])
    .filter((folder) => folder && typeof folder === 'object')
    .slice()
    .sort(compareFolders);
  return renumberFolders(ordered);
}

/**
 * Renumber an ALREADY display-ordered list 0..n-1, positionally. Callers pass
 * the list after an insert/removal/swap, so re-sorting here would undo the move.
 * @param {any[]} folders
 * @returns {any[]}
 */
function renumberFolders(folders) {
  folders.forEach((folder, index) => { folder.sortOrder = index; });
  return folders;
}

/**
 * Create a folder at the end of the DISPLAY order. The list is normalised first,
 * so an imported library with offset/gapped sortOrder appends last with the next
 * dense number (not at `state.libraryFolders.length`, which is raw array order).
 * @param {any} state
 * @param {string} name
 * @returns {any|null} the new folder, or null when the name is blank/capped
 */
export function createFolder(state, name) {
  const clean = String(name || '').trim().slice(0, 60);
  if (!state || !clean) return null;
  ensureRoutines(state);
  if (state.libraryFolders.length >= MAX_ROUTINE_FOLDERS) return null;
  const ordered = normaliseFolderOrder(state.libraryFolders);
  const folder = {
    id: newFolderId(),
    name: clean,
    sortOrder: ordered.length,
    createdAt: new Date().toISOString(),
  };
  state.libraryFolders = [...ordered, folder];
  return folder;
}

/** Rename a folder. Returns false for a missing folder or blank name. */
export function renameFolder(state, id, name) {
  const clean = String(name || '').trim().slice(0, 60);
  const folder = findFolder(state, id);
  if (!folder || !clean) return false;
  folder.name = clean;
  return true;
}

/**
 * Delete a folder, moving every member routine to Unfiled. Routines are NEVER
 * deleted. `index` is the folder's DISPLAY index so Undo can put it back where
 * the athlete saw it. Returns the snapshot Undo needs, or null when it is gone.
 * @returns {{folder:any, index:number, routineIds:string[]}|null}
 */
export function deleteFolder(state, id) {
  if (!state || !Array.isArray(state.libraryFolders) || !id) return null;
  const ordered = orderedFolders(state);
  const index = ordered.findIndex((folder) => folder?.id === id);
  if (index === -1) return null;
  const folder = ordered[index];
  state.libraryFolders = renumberFolders(ordered.filter((entry) => entry.id !== id));
  const routineIds = [];
  for (const routine of Array.isArray(state.routines) ? state.routines : []) {
    if (routine?.folderId !== id) continue;
    routine.folderId = null;
    routineIds.push(routine.id);
  }
  return { folder, index, routineIds };
}

/**
 * Restore a deleted folder at its old DISPLAY index and re-file its routines.
 * The insert happens against the current display order, then the list is
 * renumbered positionally, so Undo restores the exact order that was on screen.
 */
export function restoreFolder(state, snapshot) {
  if (!state || !snapshot?.folder) return false;
  ensureRoutines(state);
  const ordered = orderedFolders(state);
  const index = Math.min(
    Math.max(0, Number(snapshot.index) || 0),
    ordered.length,
  );
  ordered.splice(index, 0, snapshot.folder);
  state.libraryFolders = renumberFolders(ordered);
  for (const routineId of snapshot.routineIds || []) {
    const routine = findRoutine(state, routineId);
    if (routine) routine.folderId = snapshot.folder.id;
  }
  return true;
}

/**
 * Set or clear a routine's folder (one-way membership). A folder id that does
 * not exist is refused rather than hiding the routine in a phantom bucket.
 */
export function moveRoutineToFolder(state, routineId, folderId) {
  const routine = findRoutine(state, routineId);
  if (!routine) return false;
  if (folderId != null && !findFolder(state, folderId)) return false;
  routine.folderId = folderId == null ? null : folderId;
  return true;
}

/**
 * Move a folder one position up (-1) or down (1), reassigning dense sortOrder.
 * @returns {boolean} whether anything moved
 */
export function moveFolder(state, id, direction) {
  const delta = Number(direction) === -1 ? -1 : Number(direction) === 1 ? 1 : 0;
  if (!state || !delta || !Array.isArray(state.libraryFolders)) return false;
  const folders = orderedFolders(state);
  const index = folders.findIndex((folder) => folder?.id === id);
  const next = index + delta;
  if (index === -1 || next < 0 || next >= folders.length) return false;
  const [moved] = folders.splice(index, 1);
  folders.splice(next, 0, moved);
  state.libraryFolders = renumberFolders(folders);
  return true;
}

/** True while the routine library has room for another record. */
export function hasRoutineCapacity(state) {
  return (Array.isArray(state?.routines) ? state.routines.length : 0) < MAX_ROUTINES;
}
