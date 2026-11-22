// @ts-check
// =============================================================================
// SET SHEET — the per-set metadata that used to live in an expanding row.
//
// The logger contract is one line per set and ONE primary action: the tick.
// Set type, value shape, load, weight meaning, rest, effort and the note are
// real controls, but they are adjustments, not the main loop — so they live
// behind the set number instead of pushing the next set down the screen. The
// previous version expanded eight equally-prominent pills inside the row, which
// both broke the one-line rhythm and made the rare action as loud as the common
// one.
//
// Everything here is a thin view over js/workout/set-mutations.js, which owns
// the data changes. Nothing in this module writes state directly, so the stored
// shape cannot diverge from what the logger shows.
// =============================================================================
import {
  defaultBasisForExercise, normalizeBasis, supportsLoadBasis,
} from './load-basis.js';
import { isBodyweightExercise, resolvedLoadMode } from './load-mode.js';
import {
  editSetNote, editSetRest, removeCustomSetRow, setLoadBasis, setPerSetRir,
  setSetLoadMode, setSetMode, setSetRest, setSetType, toggleSetFailure,
} from './set-mutations.js';
import { effectiveSetMode } from './set-shape.js';
import { activeWorkoutDay, activeWorkoutWeekKey } from './one-off-session.js';
import { closeManagedModal, openManagedModal } from '../ui/modal-stack.js';
import { getSelectedDay, getState } from './context.js';

/** The set the sheet is currently editing, so a redraw can refresh in place. */
let _open = /** @type {{ liftName: string, setIndex: number } | null} */ (null);

function sheetRoot() {
  return document.getElementById('setSheet');
}

/** @param {string} liftName @param {number} setIndex */
function storedSet(liftName, setIndex) {
  const appState = getState();
  if (!appState) return null;
  const day = activeWorkoutDay(appState, getSelectedDay());
  const weekKey = activeWorkoutWeekKey(appState);
  return appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName]?.[setIndex] || null;
}

/**
 * The prior performance for this set index, read from the row that already
 * shows it. The logger computed it once for the PREVIOUS column, so the sheet
 * repeats that number rather than re-deriving history a second way and risking
 * two different "last time" answers on one screen.
 * @param {string} liftName @param {number} setIndex
 */
function previousLabel(liftName, setIndex) {
  const card = document.querySelector(`.cockpit-exercise[data-liftname="${(window.CSS && CSS.escape) ? CSS.escape(liftName) : liftName}"]`);
  const button = card?.querySelectorAll('.cockpit-set-row')[setIndex]?.querySelector('.set-prev-col');
  const title = button?.getAttribute('title') || '';
  return title.startsWith('Last time:') ? title : '';
}

function markActive(container, attribute, value) {
  container?.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('is-active', button.getAttribute(attribute) === value);
  });
}

/**
 * Fill the sheet for one set. Called on open and after every change, so the
 * segmented controls always describe the STORED set rather than the tap that
 * just happened.
 * @param {string} liftName
 * @param {number} setIndex
 */
function render(liftName, setIndex) {
  const set = storedSet(liftName, setIndex);
  const root = sheetRoot();
  if (!set || !root) return;

  const type = String(set.type || '');
  const mode = effectiveSetMode(set, liftName, null);
  const bodyweightCapable = isBodyweightExercise(liftName);
  const basisCapable = supportsLoadBasis(liftName);
  const basis = basisCapable
    ? normalizeBasis(set.basis || (set.c ? 'total' : defaultBasisForExercise(liftName)))
    : null;

  const title = document.getElementById('setSheetTitle');
  if (title) title.textContent = `Set ${setIndex + 1}`;
  const sub = document.getElementById('setSheetSub');
  if (sub) {
    const parts = [liftName];
    const prior = previousLabel(liftName, setIndex);
    if (prior) parts.push(prior);
    sub.textContent = parts.join(' · ');
  }

  markActive(document.getElementById('setSheetType'), 'data-type', type);
  markActive(document.getElementById('setSheetMode'), 'data-mode', mode);
  markActive(document.getElementById('setSheetLoad'), 'data-mode', resolvedLoadMode(set, liftName));
  markActive(document.getElementById('setSheetBasis'), 'data-basis', basis || '');
  markActive(document.getElementById('setSheetRest'), 'data-rest', set.restSec == null ? '-1' : String(Number(set.restSec)));
  const rir = set.rir != null ? Number(set.rir) : (set.rpe != null ? 10 - Number(set.rpe) : null);
  markActive(document.getElementById('setSheetRir'), 'data-rir', rir == null ? '' : String(rir));

  const loadWrap = document.getElementById('setSheetLoadWrap');
  if (loadWrap) loadWrap.toggleAttribute('hidden', !bodyweightCapable);
  const basisWrap = document.getElementById('setSheetBasisWrap');
  if (basisWrap) basisWrap.toggleAttribute('hidden', !basisCapable);

  const failure = root.querySelector('[data-failure-toggle]');
  if (failure) {
    failure.classList.toggle('is-active', !!set.failure);
    failure.setAttribute('aria-pressed', set.failure ? 'true' : 'false');
  }
  const noteState = document.getElementById('setSheetNoteState');
  if (noteState) noteState.textContent = set.note ? '✓' : '';
}

/**
 * Open the sheet for a set. Safe to call twice — it re-renders instead of
 * stacking a second copy.
 * @param {string} liftName
 * @param {number} setIndex
 */
export function openSetSheet(liftName, setIndex) {
  const root = sheetRoot();
  if (!root) return;
  _open = { liftName, setIndex };
  render(liftName, setIndex);
  // The managed-modal helper owns focus, scroll lock and history; the open
  // class is what actually moves the sheet into view, and the backdrop is a
  // companion that has to be told separately.
  root.classList.add('active');
  document.getElementById('setSheetBackdrop')?.classList.add('active');
  openManagedModal(root);
}

export function closeSetSheet() {
  _open = null;
  // The open class is the sheet's own state, not the modal stack's: leaving it
  // on makes the stack's observer see a still-open dialog and re-open it on the
  // next mutation, which is why the sheet used to refuse to close.
  sheetRoot()?.classList.remove('active');
  document.getElementById('setSheetBackdrop')?.classList.remove('active');
  closeManagedModal(sheetRoot());
}

/** Refresh the open sheet from storage; a no-op when nothing is open. */
export function refreshSetSheet() {
  if (_open) render(_open.liftName, _open.setIndex);
}

/**
 * The sheet's own actions. The workout router forwards `set-sheet-*` here so
 * there is still exactly one document-level listener, while the sheet's
 * mechanics stay in this module.
 * @param {Element} target
 * @param {string} action
 * @param {string|null} liftName
 * @param {number} sIdx
 */
export async function handleSetSheetAction(target, action, liftName, sIdx) {
  const root = sheetRoot();
  if (!root || !_open) return;
  const name = liftName || _open.liftName;
  const index = Number.isFinite(sIdx) ? sIdx : _open.setIndex;

  if (action === 'close-set-sheet') { closeSetSheet(); return; }
  if (action === 'set-sheet-type') {
    setSetType(name, index, /** @type {any} */ (target.getAttribute('data-type') || ''));
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-mode') {
    setSetMode(name, index, /** @type {any} */ (target.getAttribute('data-mode') || 'reps'));
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-load') {
    await setSetLoadMode(name, index, target.getAttribute('data-mode') || 'weighted');
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-basis') {
    setLoadBasis(name, index, /** @type {any} */ (target.getAttribute('data-basis') || 'total'));
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-rest') {
    const raw = target.getAttribute('data-rest');
    setSetRest(name, index, raw === '-1' ? null : Number(raw));
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-custom-rest') {
    await editSetRest(name, index);
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-rir') {
    setPerSetRir(name, index, Number(target.getAttribute('data-rir')));
    refreshSetSheet();
    return;
  }
  if (action === 'toggle-set-failure') {
    toggleSetFailure(name, index);
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-note') {
    await editSetNote(name, index);
    refreshSetSheet();
    return;
  }
  if (action === 'set-sheet-remove') {
    removeCustomSetRow(name, index);
    closeSetSheet();
  }
}
