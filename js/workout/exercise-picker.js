// @ts-check
// =============================================================================
// EXERCISE SELECTION — the add-exercise library and the in-session swap.
//
// Split out of js/workout.js (2,670 lines, 44 exports). This is the roadmap's
// "exercise selection" seam: choosing what goes into today's session, as
// distinct from rendering it, logging it or finishing it.
//
// HOW IT REACHES THE APP
// State, the selected day and saving come from ./context.js, not from
// workout.js — importing workout.js here would create a cycle, since workout.js
// imports this module. `rerenderWorkout()` is the same story for redrawing the
// cockpit: workout.js registers its own renderWorkout with the context and this
// module asks for a redraw without owning how one happens.
//
// `weightUnitLabel` moved to ./units.js for the same reason: workout.js reads it
// too, so neither side can own it.
//
// WHAT STAYED BEHIND
// `renderExerciseLibraryList` is exported because workout.js's `change` router
// re-renders the list when a filter select changes. That router is the next thing
// worth moving; until then this export is the seam between them, and naming it
// (rather than reaching back into a private) is what keeps the direction clear.
// =============================================================================
import { getProgramById, saveNewCustomExerciseToLibrary, showToast } from '../state.js';
import { escapeHtml } from '../util.js';
import { isE1rmExercise } from '../strength/e1rm.js';
import {
  browseExercises, equipmentLabel, exerciseStatForName, EXERCISE_CATEGORY_LABELS, resolveExercise,
} from '../exercises/catalog.js';
import { activeWorkoutDay, activeWorkoutWeekKey, oneOffBlueprint } from './one-off-session.js';
import { applyExerciseSwap } from '../workout-order.js';
import { getSubstitutions } from './substitutions.js';
import {
  getState as _getState,
  getSelectedDay as _getSelectedDay,
  saveState as _saveState,
  rerenderWorkout,
  focusExerciseCard,
} from './context.js';
import { closeManagedModal, openManagedModal, replaceManagedModal } from '../ui/modal-stack.js';
import { weightUnitLabel } from './units.js';
import { favouriteStarHTML, isFavourite, setFavourite, sortFavouritesFirst } from '../exercises/favourites.js';


/**
 * Best estimated 1RM on record for a lift. `allTimeMax` is derived from the
 * stored sets (so edits and deletions propagate); `legacyMax` is rescued
 * pre-catalogue history whose source sets are not in state.weeks.
 */
function _bestKnownE1rm(appState, name) {
  const stat = exerciseStatForName(appState?.exerciseStats, name);
  return Math.max(Number(stat?.allTimeMax) || 0, Number(stat?.legacyMax) || 0);
}

function _exChip(item, appState) {
  const pr = isE1rmExercise(item.name) ? _bestKnownE1rm(appState, item.name) : 0;
  const prStr = pr ? `<span class="el-pr">${Math.round(pr)}${weightUnitLabel(appState)} PR</span>` : '';
  const meta = `${item.movement.replaceAll('_', ' ')} · ${item.equipment.map(equipmentLabel).join(', ')}`;
  return `<div class="el-exercise-row">
    <button class="el-chip tactile-scale" data-action="el-pick" data-exname="${escapeHtml(item.name)}">
      <span class="el-chip-copy"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(meta)}</small></span>${prStr}
    </button>
    ${favouriteStarHTML(appState, item.name)}
    <button class="el-info-btn" data-action="el-info" data-exname="${escapeHtml(item.name)}" aria-label="View details for ${escapeHtml(item.name)}">i</button>
  </div>`;
}

function _customExChip(name, appState) {
  const pr = isE1rmExercise(name) ? _bestKnownE1rm(appState, name) : 0;
  const prStr = pr ? `<span class="el-pr">${Math.round(pr)}${weightUnitLabel(appState)} PR</span>` : '';
  return `<div class="el-exercise-row el-exercise-row--custom"><button class="el-chip tactile-scale" data-action="el-pick" data-exname="${escapeHtml(name)}"><span class="el-chip-copy"><strong>${escapeHtml(name)}</strong><small>Custom exercise</small></span>${prStr}</button>${favouriteStarHTML(appState, name)}</div>`;
}

export function renderExerciseLibraryList(query = '') {
  const container = document.getElementById('elList');
  if (!container) return;
  const appState = _getState();
  const q = String(query || '').trim();
  const category = /** @type {HTMLSelectElement|null} */ (document.getElementById('elCategoryFilter'))?.value || '';
  const equipment = /** @type {HTMLSelectElement|null} */ (document.getElementById('elEquipmentFilter'))?.value || '';
  const muscleGroup = /** @type {HTMLSelectElement|null} */ (document.getElementById('elMuscleFilter'))?.value || '';
  const matches = browseExercises({ query: q, category, equipment, muscleGroup }, 500);
  // Custom exercises carry no catalogue muscle data, so a muscle filter cannot
  // honestly include them — same reasoning as the existing category/equipment
  // filters. They stay first-class whenever no such filter is applied.
  const customMatches = !category && !equipment && !muscleGroup
    ? (appState.customExercises || []).filter((name) => !q || name.toLowerCase().includes(q.toLowerCase()))
    : [];
  let html = '';

  if (!matches.length && !customMatches.length) {
    html = '<div class="el-empty">No matches. Try another search or clear a filter.</div>';
  } else if (q || category || equipment || muscleGroup) {
    // A filtered list is one flat result set: favourites lead it, and the rest
    // keep the catalogue's order. Nothing is duplicated.
    html = sortFavouritesFirst(matches, appState).map((item) => _exChip(item, appState)).join('');
    if (customMatches.length) {
      html += '<div class="el-cat-label">Custom</div>';
      html += sortFavouritesFirst(
        [...customMatches].sort().map((name) => ({ name })),
        appState,
      ).map(({ name }) => _customExChip(name, appState)).join('');
    }
  } else {
    // The unfiltered library leads with ONE Favourites section (catalogue and
    // custom together), then the usual categories without those rows, so a
    // starred lift is never rendered twice.
    const favouriteMatches = matches.filter((item) => isFavourite(appState, item.name));
    const otherMatches = matches.filter((item) => !isFavourite(appState, item.name));
    const favouriteCustom = [...(appState.customExercises || [])].sort().filter((name) => isFavourite(appState, name));
    const otherCustom = [...(appState.customExercises || [])].sort().filter((name) => !isFavourite(appState, name));
    if (favouriteMatches.length || favouriteCustom.length) {
      html += '<div class="el-cat-label">Favourites</div>';
      html += favouriteMatches.map((item) => _exChip(item, appState)).join('');
      html += favouriteCustom.map((name) => _customExChip(name, appState)).join('');
    }
    for (const categoryKey of Object.keys(EXERCISE_CATEGORY_LABELS)) {
      const items = otherMatches.filter((item) => item.category === categoryKey);
      if (!items.length) continue;
      html += `<div class="el-cat-label">${EXERCISE_CATEGORY_LABELS[categoryKey]}</div>`;
      html += items.map((item) => _exChip(item, appState)).join('');
    }
    if (otherCustom.length) {
      html += `<div class="el-cat-label">Custom</div>`;
      html += otherCustom.map((name) => _customExChip(name, appState)).join('');
    }
  }
  container.innerHTML = html;
  const summary = document.getElementById('elResultSummary');
  if (summary) {
    const total = matches.length + customMatches.length;
    summary.textContent = `${total} exercise${total === 1 ? '' : 's'}${equipment ? ` · ${equipmentLabel(equipment)}` : ''}`;
  }
}

export function handleExerciseSearch(query) {
  renderExerciseLibraryList(query);
}

/** Toggle the star and repaint the list in place, preserving the live search. */
export function toggleExerciseFavourite(name) {
  const appState = _getState();
  if (!appState || !name) return false;
  setFavourite(appState, name);
  _saveState();
  renderExerciseLibraryList(/** @type {HTMLInputElement|null} */ (document.getElementById('elSearchInput'))?.value || '');
  return true;
}

export function addExerciseToDayFromLibrary(name) {
  if (!name) return;
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  // An exercise already in today's session is not an addition. The old path
  // re-stamped `origin:'added'` and toasted "Added: X" while changing nothing —
  // the screen said one thing and state did another.
  const existing = appState.weeks?.[wk]?.lifts?.[selectedDay]?.[name];
  if (Array.isArray(existing)) {
    closeAddExerciseModal();
    showToast(`${name} is already in today's session`, true);
    return;
  }
  if (!appState.weeks[wk].lifts[selectedDay]) appState.weeks[wk].lifts[selectedDay] = {};
  if (!appState.weeks[wk].lifts[selectedDay][name]) {
    appState.weeks[wk].lifts[selectedDay][name] = [{ w: '', r: '10', c: false }];
  }
  if (!appState.weeks[wk].liftMeta) appState.weeks[wk].liftMeta = {};
  if (!appState.weeks[wk].liftMeta[selectedDay]) appState.weeks[wk].liftMeta[selectedDay] = {};
  appState.weeks[wk].liftMeta[selectedDay][name] = {
    ...(appState.weeks[wk].liftMeta[selectedDay][name] || {}),
    origin: 'added',
  };
  // Append to the explicit display order so the new exercise lands at the bottom.
  if (!appState.weeks[wk].liftOrder) appState.weeks[wk].liftOrder = {};
  if (!Array.isArray(appState.weeks[wk].liftOrder[selectedDay])) appState.weeks[wk].liftOrder[selectedDay] = [];
  if (!appState.weeks[wk].liftOrder[selectedDay].includes(name)) {
    appState.weeks[wk].liftOrder[selectedDay].push(name);
  }
  _saveState(true);
  closeAddExerciseModal();
  rerenderWorkout();
  // The new card is appended at the bottom of the day. Expanding and scrolling
  // it (the accordion's own rule) shows the lift that was added and puts its
  // first set in reach without another tap.
  focusExerciseCard(name);
  showToast(`Added: ${name}`);
}

// ── Exercise swap (B3) ────────────────────────────────────────────────────────
// Re-keys the day's logged entry from the old exercise to the new one, so the
// prescribed target and any sets already logged carry across intact, and keeps
// the exercise in its original position in the day.
let _swapSourceLift = null;

// The library modal does double duty: it is the add picker and the swap
// picker. One list means one owner for search, filters, favourites and the
// 500-row cap — the alternative was a second, smaller library inside the swap
// sheet, which is how the old empty state could promise a "full list below"
// that did not exist (L-F6).
/** @type {'add'|'swap'} */
let _libraryMode = 'add';

export function openSwapModal(liftName) {
  if (!liftName) return;
  _swapSourceLift = liftName;
  const modal = document.getElementById('swapExerciseModal');
  if (!modal) return;
  const subtitle = document.getElementById('swapSubtitle');
  if (subtitle) subtitle.textContent = `Swapping "${liftName}" — similar movement pattern, kit you have. Your target and logged sets carry over.`;
  _renderSwapList(liftName);
  modal.classList.add('active');
  openManagedModal(modal);
}

export function closeSwapModal() {
  _swapSourceLift = null;
  const modal = document.getElementById('swapExerciseModal');
  if (!modal) return;
  modal.classList.remove('active');
  closeManagedModal(modal);
}

function _renderSwapList(liftName) {
  const list = document.getElementById('swapList');
  if (!list) return;
  const appState = _getState();
  const equipment = appState?.settings?.equipment || {};
  const subs = getSubstitutions(liftName, equipment, 8);

  // The browse control is appended in BOTH branches: a direct match is the
  // fast path, but the athlete can always search the whole library, including
  // for a custom exercise (which has no movement pattern and therefore no
  // direct matches at all).
  const browse = `
    <button type="button" class="el-browse-all tactile-scale" data-action="swap-browse-all" data-liftname="${escapeHtml(liftName)}">
      <span class="el-browse-all__title">Browse all exercises</span>
      <span class="el-browse-all__sub">Search the full library</span>
    </button>`;

  if (subs.length === 0) {
    list.innerHTML = `<div class="el-empty">No similar exercise for this movement. Browse the full library, or type a name below.</div>${browse}`;
    return;
  }
  list.innerHTML = subs.map(s => `
    <button class="el-chip tactile-scale" data-action="swap-pick" data-exname="${escapeHtml(s.name)}">
      ${escapeHtml(s.name)}<span class="el-pr">${s.bodyweight ? 'Bodyweight' : escapeHtml(s.equip.map(labelEquip).join(' · '))}</span>
    </button>
  `).join('') + browse;
}

function labelEquip(k) {
  return ({ barbell: 'Barbell', ezBar: 'EZ bar', rack: 'Rack', dumbbells: 'Dumbbells', cables: 'Cables', pullupBar: 'Pull-up bar', bands: 'Bands', kettlebells: 'Kettlebell' })[k] || k;
}

/**
 * Swap the source lift for `newName`. A no-op and a duplicate are refused
 * OUT LOUD: silently closing the sheet looked like a successful swap that had
 * simply not happened.
 */
export function executeSwapExercise(newName) {
  const oldName = _swapSourceLift;
  if (!oldName || !newName) { closeSwapModal(); return; }
  const appState = _getState();
  const selectedDay = activeWorkoutDay(appState, _getSelectedDay());
  const wk = activeWorkoutWeekKey(appState);
  const blueprint = oneOffBlueprint(appState,
    getProgramById(appState.activeProgramId)?.days?.[selectedDay] || {});

  const res = applyExerciseSwap(appState.weeks?.[wk], selectedDay, oldName, newName, blueprint);
  if (!res.ok) {
    if (res.reason === 'duplicate') {
      showToast(`${newName} is already in today's session`, true);
    } else if (res.reason === 'noop') {
      showToast('That is already this exercise', true);
    } else {
      closeSwapModal();
    }
    return;
  }
  _swapSourceLift = null;
  _saveState(true);
  closeSwapModal();
  closeAddExerciseModal();
  rerenderWorkout();
  // The card keeps its position, but the render rebuilt it: reveal the lift the
  // athlete just swapped so the target and sets they carried over are on screen.
  focusExerciseCard(newName);
  showToast(`Swapped to ${newName}`);
}

/** Resolve a typed name to the catalogue's own spelling when it is known. */
function typedExerciseName(raw) {
  const typed = String(raw || '').trim();
  if (!typed) return null;
  const known = resolveExercise(typed);
  return known ? known.name : typed;
}

export function confirmCustomSwap() {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('swapCustomInput'));
  const name = typedExerciseName(input?.value);
  if (!name) { showToast('Type an exercise name to swap in'); return; }
  if (name === _swapSourceLift) { showToast('That is already this exercise', true); return; }
  // Only an exercise the catalogue does not know is a custom exercise. Saving
  // "squat" here used to add a duplicate custom entry beside "Back Squat".
  if (!resolveExercise(name)) saveNewCustomExerciseToLibrary(name);
  if (input) input.value = '';
  executeSwapExercise(name);
}

/**
 * Reset the shared library modal for a mode without opening it, so a hand-off
 * from another dialog can open it with a single history marker.
 * @param {'add'|'swap'} mode
 * @param {string} [liftName]
 */
function prepareLibraryModal(mode, liftName) {
  const modal = document.getElementById('addExerciseModal');
  if (!modal) return null;
  _libraryMode = mode;
  const searchInput = /** @type {HTMLInputElement|null} */ (document.getElementById('elSearchInput'));
  const customInput = /** @type {HTMLInputElement|null} */ (document.getElementById('customExerciseTextInput'));
  const categoryFilter = /** @type {HTMLSelectElement|null} */ (document.getElementById('elCategoryFilter'));
  const equipmentFilter = /** @type {HTMLSelectElement|null} */ (document.getElementById('elEquipmentFilter'));
  const muscleFilter = /** @type {HTMLSelectElement|null} */ (document.getElementById('elMuscleFilter'));
  if (searchInput) searchInput.value = '';
  if (customInput) customInput.value = '';
  if (categoryFilter) categoryFilter.value = '';
  if (equipmentFilter) equipmentFilter.value = '';
  if (muscleFilter) muscleFilter.value = '';
  renderExerciseLibraryList('');

  // The same five groups, relabelled for what the pick will do. Search results
  // overwrite the result summary, so the intent is carried on the title (which
  // results never touch) and in the accessible name.
  const title = modal.querySelector('.el-title');
  if (title) title.textContent = mode === 'swap' ? 'Swap Exercise' : 'Add Exercise';
  modal.setAttribute('aria-label', mode === 'swap' ? `Swap ${liftName || ''}`.trim() : 'Add Exercise');
  // The typed-name row means the same thing in both modes; only the nouns
  // change, so the control never promises to ADD while the pick would swap.
  if (customInput) {
    customInput.placeholder = mode === 'swap' ? 'Or type any exercise to swap in…' : 'Or type a custom exercise name…';
    customInput.setAttribute('aria-label', mode === 'swap' ? 'Exercise to swap in' : 'Custom exercise name');
  }
  const customBtn = document.getElementById('elCustomAddBtn');
  if (customBtn) customBtn.textContent = mode === 'swap' ? 'Swap' : 'Add';
  return modal;
}

/** Open the shared exercise library in one mode. */
function openLibraryModal(mode) {
  const modal = prepareLibraryModal(mode);
  if (!modal) return;
  modal.classList.add('active');
  openManagedModal(modal);
  setTimeout(() => /** @type {HTMLInputElement|null} */ (document.getElementById('elSearchInput'))?.focus(), 80);
}

/** From the swap sheet: browse the same library the add flow uses. */
export function openSwapLibrary(liftName) {
  const name = liftName || _swapSourceLift;
  if (!name) return;
  _swapSourceLift = name;
  const swapRoot = document.getElementById('swapExerciseModal');
  const modal = prepareLibraryModal('swap', name);
  if (!modal) return;
  // ONE history marker for the pair. Closing the swap sheet and immediately
  // opening the library as two separate managed modals raced history.back()
  // against pushState() and popped past the app entry (about:blank) — the same
  // defect the photo viewer fixed with this helper.
  swapRoot?.classList.remove('active');
  replaceManagedModal(swapRoot, modal);
  setTimeout(() => /** @type {HTMLInputElement|null} */ (document.getElementById('elSearchInput'))?.focus(), 80);
}

export function openAddExerciseModal() {
  openLibraryModal('add');
}

export function closeAddExerciseModal() {
  _libraryMode = 'add';
  const modal = document.getElementById('addExerciseModal');
  if (!modal) return;
  modal.classList.remove('active');
  closeManagedModal(modal);
  const title = modal.querySelector('.el-title');
  if (title) title.textContent = 'Add Exercise';
  modal.setAttribute('aria-label', 'Add Exercise');
  const customInput = /** @type {HTMLInputElement|null} */ (document.getElementById('customExerciseTextInput'));
  if (customInput) {
    customInput.placeholder = 'Or type a custom exercise name…';
    customInput.setAttribute('aria-label', 'Custom exercise name');
  }
  const customBtn = document.getElementById('elCustomAddBtn');
  if (customBtn) customBtn.textContent = 'Add';
}

/**
 * One pick handler for both modes: the library row only knows the name it
 * carries, and this is the only place that decides what picking it means.
 */
export function pickExerciseFromLibrary(name) {
  if (!name) return;
  if (_libraryMode === 'swap') {
    // Read the mode before closing: closing resets it.
    closeAddExerciseModal();
    executeSwapExercise(name);
    return;
  }
  addExerciseToDayFromLibrary(name);
}

export function confirmAddExercise() {
  const customInput = /** @type {HTMLInputElement|null} */ (document.getElementById('customExerciseTextInput'));
  const typed = customInput?.value;
  if (!typed || !String(typed).trim()) {
    showToast(_libraryMode === 'swap' ? 'Type an exercise name to swap in' : 'Type a custom exercise name first');
    return;
  }
  const name = typedExerciseName(typed);
  if (_libraryMode === 'swap') {
    if (name === _swapSourceLift) { showToast('That is already this exercise', true); return; }
    if (!resolveExercise(name)) saveNewCustomExerciseToLibrary(name);
    if (customInput) customInput.value = '';
    closeAddExerciseModal();
    executeSwapExercise(name);
    return;
  }
  // A typed catalogue name must not become a duplicate custom exercise.
  if (!resolveExercise(name)) saveNewCustomExerciseToLibrary(name);
  addExerciseToDayFromLibrary(name);
  if (customInput) customInput.value = '';
}
