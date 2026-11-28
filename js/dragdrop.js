// ==========================================
// DRAG & DROP — thin wiring over the shared sortable engine (js/ui/sortable.js)
// ==========================================
import { showToast } from './state.js';
import { createSortable } from './ui/sortable.js';
import { activeWorkoutDay, activeWorkoutWeekKey } from './workout/one-off-session.js';

let _getState;
let _getSelectedDay;
let _saveState;

export function initDragDrop(getStateFn, getSelectedDayFn, saveStateFn) {
  _getState = getStateFn;
  _getSelectedDay = getSelectedDayFn;
  _saveState = saveStateFn;
}

// ==========================================
// WORKOUT EXERCISE / SUPERSET REORDER
// Grab the grip (or a superset header) and drag. Supersets are top-level units;
// their nested exercises are not independently sortable (directChildrenOnly).
// ==========================================
export function mountExerciseDragAndDropSystems() {
  const container = document.getElementById('cockpitExercisesContainer');
  if (!container) return;
  createSortable(container, {
    itemSelector: '.cockpit-exercise, .superset-group',
    handleSelector: '.drag-handle-grip, .superset-group-header',
    layout: 'list',
    directChildrenOnly: true,
    onReorder: () => commitReorderedDOMStateToStorage(),
  });
}

export function commitReorderedDOMStateToStorage() {
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const container = document.getElementById('cockpitExercisesContainer');
  if (!container) return;
  const wk = activeWorkoutWeekKey(appState);
  const dayLifts = appState.weeks?.[wk]?.lifts?.[selectedDay] || {};

  // Persist the new sequence as an explicit `liftOrder` array. We deliberately
  // do NOT rebuild the lifts object: JS re-sorts integer-like keys to the front
  // on enumeration, which silently reverts the user's reorder. The order array
  // is the single source of truth the renderer reads.
  const newOrder = [];
  Array.from(container.children).forEach(child => {
    if (child.classList.contains('superset-group')) {
      child.querySelectorAll('.cockpit-exercise').forEach(card => {
        const liftName = card.getAttribute('data-liftname');
        if (liftName && dayLifts[liftName] && !newOrder.includes(liftName)) newOrder.push(liftName);
      });
    } else if (child.classList.contains('cockpit-exercise')) {
      const liftName = child.getAttribute('data-liftname');
      if (liftName && dayLifts[liftName] && !newOrder.includes(liftName)) newOrder.push(liftName);
    }
  });
  Object.keys(dayLifts).forEach(n => { if (!newOrder.includes(n)) newOrder.push(n); });

  if (!appState.weeks[wk].liftOrder) appState.weeks[wk].liftOrder = {};
  appState.weeks[wk].liftOrder[selectedDay] = newOrder;
  _saveState(true);
  showToast('Order updated ✓');
}
