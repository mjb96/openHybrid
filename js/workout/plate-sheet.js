// @ts-check
// =============================================================================
// PLATE CALCULATOR SHEET (js/workout/plate-sheet.js)
//
// A read-only answer to "what goes on each end of the bar?" opened from the
// per-set sheet. The result is derived from the ACTIVE equipment profile, so it
// can never show a plate the athlete does not own; when a target is unreachable
// it states the shortfall and the nearest buildable total instead of rounding
// silently.
//
// The one write is an explicit opt-in: on a barbell, weighted, unfinished set
// "Use this weight" types the total into the row's existing weight input and
// lets the logger's own input/change/blur path persist it. This module never
// touches stored state itself, so the row and the stored set cannot disagree.
// =============================================================================

import {
  getActiveEquipmentProfile, getActivePlateSetup,
} from '../equipment-profiles.js';
import { resolveExercise } from '../exercises/catalog.js';
import { closeManagedModal, openManagedModal } from '../ui/modal-stack.js';
import { getSelectedDay, getState } from './context.js';
import { resolvedLoadMode } from './load-mode.js';
import { activeWorkoutDay, activeWorkoutWeekKey } from './one-off-session.js';
import {
  buildPlateSheetModel, formatPlateNumber, plateBelowBarText, plateShortfallText,
} from './plate-sheet-model.js';
import { weightUnitLabel } from './units.js';

/**
 * The set the sheet was opened for. `onApplied` closes the set sheet below it;
 * the caller owns that so this module never imports set-sheet.js back (which
 * would be a cycle, since set-sheet.js opens this sheet).
 * @type {{ liftName: string, setIndex: number, onApplied: (() => void)|null }|null}
 */
let _open = null;

function root() {
  return document.getElementById('plateSheet');
}

function backdrop() {
  return document.getElementById('plateSheetBackdrop');
}

function text(id, value) {
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = value;
  node.hidden = !value;
}

/** Text that keeps its node visible (an empty live region still announces). */
function plainText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

/** The target input is static markup; wire its live re-render once. */
let _wired = false;
function wireTarget() {
  if (_wired) return;
  const input = document.getElementById('plateTarget');
  if (!input) return;
  input.addEventListener('input', render);
  input.addEventListener('change', render);
  _wired = true;
}

/** @param {string} liftName */
function exerciseCard(liftName) {
  const escaped = window.CSS?.escape ? CSS.escape(liftName) : liftName;
  return document.querySelector(`.cockpit-exercise[data-liftname="${escaped}"]`);
}

/** @param {string} liftName @param {number} setIndex */
function rowFor(liftName, setIndex) {
  return exerciseCard(liftName)?.querySelector(`.cockpit-set-row[data-set-index="${setIndex}"]`) || null;
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
 * The row's entered weight, or the visible ghost target when the field is
 * blank. A non-numeric placeholder ("kg") is not a weight.
 * @param {string} liftName @param {number} setIndex
 * @returns {number|null}
 */
function targetFor(liftName, setIndex) {
  const input = /** @type {HTMLInputElement|null} */ (
    rowFor(liftName, setIndex)?.querySelector('.input-weight-node')
  );
  const entered = Number.parseFloat(String(input?.value || '').replace(',', '.'));
  if (Number.isFinite(entered) && entered > 0) return entered;
  const ghost = Number.parseFloat(String(
    input?.getAttribute('data-ghost-default') || input?.getAttribute('placeholder') || '',
  ).replace(',', '.'));
  return Number.isFinite(ghost) && ghost > 0 ? ghost : null;
}

/**
 * Why "Use this weight" is off. Only a barbell lift with an external weighted
 * set that has not been completed can take a plate-math total; writing a
 * barbell plate number onto a bodyweight or band set would store a load the
 * athlete did not lift.
 * @param {import('./plate-sheet-model.js').PlateSheetModel} model
 * @param {string} liftName
 * @param {number} setIndex
 * @returns {{ ok: boolean, reason: string }}
 */
function eligibility(model, liftName, setIndex) {
  if (!model.valid) return { ok: false, reason: model.reason };
  // A barbell cannot be loaded below its own bar; writing the number anyway
  // would store a total the athlete could not lift.
  if (model.belowBar) return { ok: false, reason: `The total is under the ${model.bar} ${model.unit} bar.` };
  const set = storedSet(liftName, setIndex) || {};
  const row = rowFor(liftName, setIndex);
  const complete = /** @type {HTMLInputElement|null} */ (row?.querySelector('.gym-check'));
  if (set.c || complete?.checked) {
    return { ok: false, reason: 'This set is already completed.' };
  }
  const equipment = resolveExercise(liftName)?.equipment;
  if (!Array.isArray(equipment) || !equipment.includes('barbell')) {
    return { ok: false, reason: 'Available on barbell lifts.' };
  }
  const mode = resolvedLoadMode(set, liftName);
  if (mode !== 'weighted') {
    const label = mode === 'bodyweight' ? 'bodyweight'
      : mode === 'assisted' ? 'band-assisted' : 'band-loaded';
    return { ok: false, reason: `This is a ${label} set.` };
  }
  return { ok: true, reason: '' };
}

/**
 * @param {HTMLElement|null} host
 * @param {{ plate: number, count: number }[]} items
 * @param {(item: { plate: number, count: number }) => string} label
 */
function renderChips(host, items, label) {
  if (!host) return;
  host.replaceChildren();
  for (const item of items) {
    const chip = document.createElement('span');
    chip.className = 'plate-sheet-chip';
    chip.dataset.plate = String(item.plate);
    chip.dataset.count = String(item.count);
    chip.textContent = label(item);
    host.append(chip);
  }
  const group = /** @type {HTMLElement|null} */ (host.closest('.plate-sheet-group'));
  if (group) group.hidden = items.length === 0;
}

/** Re-derive and paint the result from the current input + active profile. */
function render() {
  const context = _open;
  const appState = getState();
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('plateTarget'));
  if (!context || !appState) return;

  const unit = weightUnitLabel(appState);
  const setup = getActivePlateSetup(appState, unit);
  const profile = getActiveEquipmentProfile(appState);
  const profileName = profile?.name || 'this profile';
  const model = buildPlateSheetModel({
    target: input?.value ?? '', unit, setup, profileName,
  });

  plainText('plateSheetSub', `${context.liftName} · Set ${context.setIndex + 1} · ${profileName}`);

  text('plateSheetBar', `${formatPlateNumber(setup.bar)} ${model.unit} bar`);
  text('plateSheetPlates', `Plates: ${setup.plates.map(formatPlateNumber).join(' · ')} ${model.unit}`);
  text('plateSheetHeadline', model.headline);
  text('plateSheetShortfall', plateShortfallText(model));
  text('plateSheetBelowBar', plateBelowBarText(model));
  text('plateSheetLimited', model.limited
    ? 'Limited by the pairs you own — only this profile\'s plates are counted.'
    : '');
  renderChips(document.getElementById('plateSheetPerSide'), model.perSide,
    ({ plate, count }) => `${formatPlateNumber(plate)}${count > 1 ? ` ×${count}` : ''}`);
  renderChips(document.getElementById('plateSheetPairs'), model.pairs,
    ({ plate, count }) => `${count} × ${formatPlateNumber(plate)}`);

  const gate = eligibility(model, context.liftName, context.setIndex);
  const use = /** @type {HTMLButtonElement|null} */ (document.getElementById('plateUseWeight'));
  if (use) use.disabled = !gate.ok;
  plainText('plateUseReason', gate.ok ? '' : gate.reason);
  input?.classList.toggle('is-invalid', !model.valid && String(input.value || '').trim() !== '');
  input?.setAttribute('aria-invalid', !model.valid && String(input.value || '').trim() !== '' ? 'true' : 'false');
}

/**
 * Open the calculator for one set, prefilled from that row's weight or ghost.
 * Safe to call twice — it re-renders instead of stacking.
 * @param {string} liftName
 * @param {number} setIndex
 * @param {{ onApplied?: () => void }} [options]
 */
export function openPlateSheet(liftName, setIndex, options = {}) {
  const sheet = root();
  if (!sheet || !liftName) return;
  const index = Number.isFinite(Number(setIndex)) ? Math.max(0, Math.floor(Number(setIndex))) : 0;
  _open = { liftName, setIndex: index, onApplied: typeof options.onApplied === 'function' ? options.onApplied : null };

  wireTarget();
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('plateTarget'));
  if (input) {
    const prefill = targetFor(liftName, index);
    input.value = prefill == null ? '' : String(prefill);
  }
  render();
  sheet.classList.add('active');
  backdrop()?.classList.add('active');
  openManagedModal(sheet, { initialFocus: '#plateTarget' });
}

/** Close only the calculator; the set sheet underneath stays open. */
export function closePlateSheet() {
  _open = null;
  root()?.classList.remove('active');
  backdrop()?.classList.remove('active');
  closeManagedModal(root());
}

/**
 * Write the entered total through the row's own weight input, exactly as a
 * keystroke + blur would. Never writes `w` itself.
 */
function applyCurrentWeight() {
  const context = _open;
  const appState = getState();
  if (!context || !appState) return;
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('plateTarget'));
  const model = buildPlateSheetModel({
    target: input?.value ?? '',
    unit: weightUnitLabel(appState),
    setup: getActivePlateSetup(appState, weightUnitLabel(appState)),
    profileName: getActiveEquipmentProfile(appState)?.name || '',
  });
  const gate = eligibility(model, context.liftName, context.setIndex);
  if (!gate.ok) { render(); return; }

  const rowInput = /** @type {HTMLInputElement|null} */ (
    rowFor(context.liftName, context.setIndex)?.querySelector('.input-weight-node')
  );
  if (!rowInput) {
    plainText('plateUseReason', 'The set row is no longer on screen.');
    return;
  }
  rowInput.value = String(model.target);
  // The logger owns persistence: `input` clears the row's complaint, `change`
  // stamps the stored set, and `focusout` commits immediately (the same blur
  // path a typed value takes) so closing both sheets cannot outrun the write.
  rowInput.dispatchEvent(new Event('input', { bubbles: true }));
  rowInput.dispatchEvent(new Event('change', { bubbles: true }));
  rowInput.dispatchEvent(new Event('focusout', { bubbles: true }));

  const onApplied = context.onApplied;
  closePlateSheet();
  if (onApplied) onApplied();
}

/**
 * The sheet's own actions, forwarded by the single document router.
 * @param {Element} _target
 * @param {string} action
 */
export function handlePlateSheetAction(_target, action) {
  if (action === 'close-plate-sheet') { closePlateSheet(); return; }
  if (action === 'plate-use-weight') { applyCurrentWeight(); }
}
