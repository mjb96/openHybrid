// =============================================================================
// WEIGH-IN SHEET (js/bodyweight-sheet.js)
//
// A weigh-in is a number the athlete already knows. The old inline form asked
// them to type it (and the date) every time; openGym's sheet opens at the last
// weight with ±0.1 / ±0.5 / ±1 steppers, remembers today's entry, and keeps the
// recent readings one tap away. This module owns that sheet; the Progress view
// owns the graph.
// =============================================================================
import { appState, saveStateToLocalStorage } from './state.js';
import { openManagedModal, closeManagedModal } from './ui/modal-stack.js';
import { confirmModal } from './ui/confirm-modal.js';
import { formatDayMonth, todayKey } from './dates.js';
import { showToast } from './toast.js';
import { upsertWeighIn } from './metrics/bodyweight.js';
import {
  displayWeightString, fromCanonicalWeight, toCanonicalWeight,
} from './metrics/weight-unit.js';

// Matches MAX_MEASURE_WEIGHT in js/metrics/measures.js: one mistyped 9999 would
// rescale every chart, mean and rate. Canonical kilograms; the sheet converts it
// to the athlete's unit for the input bound.
const MAX_WEIGHT = 500;

let _render = () => {};

/** @param {() => void} render */
export function initBodyweightSheet(render) {
  _render = typeof render === 'function' ? render : () => {};
}

function unit() {
  return appState.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function entries() {
  return (Array.isArray(appState.bodyWeightLog) ? appState.bodyWeightLog : [])
    .filter((entry) => entry && validDate(entry.date) && Number(entry.weight) > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Open the sheet on a date, prefilled with that day's weight or the latest one.
 * @param {string} [date]
 */
export function openBodyweightSheet(date) {
  const sheet = document.getElementById('bwSheet');
  const backdrop = document.getElementById('bwSheetBackdrop');
  if (!sheet) return;
  const entriesNewest = entries();
  const chosen = validDate(date) ? date : todayKey();
  const existing = entriesNewest.find((entry) => entry.date === chosen);
  const latest = entriesNewest[0];
  // A fresh athlete has NO body weight: pre-filling 70 kg put a fabricated
  // number one tap from being saved. The sheet opens blank and asks them to type.
  const weight = existing?.weight ?? latest?.weight ?? appState.settings?.targetWeight ?? null;

  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetDate'));
  if (dateInput) { dateInput.value = chosen; dateInput.max = todayKey(); }
  const weightInput = /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetWeight'));
  if (weightInput) {
    weightInput.value = weight == null ? '' : displayWeightString(weight, unit(), { decimals: 1 });
    weightInput.placeholder = unit() === 'lbs' ? 'e.g. 180' : 'e.g. 80';
  }
  const unitLabel = document.getElementById('bwSheetUnit');
  if (unitLabel) unitLabel.textContent = unit();
  const title = document.getElementById('bwSheetTitle');
  if (title) title.textContent = existing ? 'Edit weigh-in' : 'Log body weight';

  renderRecent(entriesNewest.filter((entry) => entry.date !== chosen).slice(0, 4));
  sheet.classList.add('active');
  backdrop?.classList.add('active');
  // Focus the close button, NOT the weight input. Autofocusing a number field
  // raised the mobile keyboard the moment the sheet opened, covering the
  // steppers and the recent list — the athlete is usually adjusting the
  // prefilled value with ±0.1/±0.5/±1, not typing. The input stays one tap away.
  openManagedModal(sheet, { initialFocus: '.sheet-close-btn' });
}

/** @param {Array<{date:string, weight:number}>} recent */
function renderRecent(recent) {
  const host = document.getElementById('bwSheetRecent');
  if (!host) return;
  host.textContent = '';
  if (!recent.length) return;

  const title = document.createElement('div');
  title.className = 'bw-sheet-recent-title';
  title.textContent = 'Recent weigh-ins';
  host.append(title);

  for (const entry of recent) {
    const row = document.createElement('div');
    row.className = 'bw-sheet-recent-row';

    const when = document.createElement('span');
    when.textContent = formatDayMonth(entry.date);

    const right = document.createElement('span');
    const value = document.createElement('strong');
    value.textContent = `${displayWeightString(entry.weight, unit(), { decimals: 1 })} ${unit()}`;

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.dataset.action = 'edit-bw-row';
    edit.dataset.date = entry.date;
    edit.textContent = 'Edit';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.dataset.action = 'delete-bw-row';
    remove.dataset.date = entry.date;
    remove.setAttribute('aria-label', `Delete weigh-in ${entry.date}`);
    remove.textContent = 'Delete';

    right.append(value, edit, remove);
    row.append(when, right);
    host.append(row);
  }
}

export function closeBodyweightSheet() {
  const sheet = document.getElementById('bwSheet');
  document.getElementById('bwSheetBackdrop')?.classList.remove('active');
  sheet?.classList.remove('active');
  if (sheet) closeManagedModal(sheet);
}

/**
 * @param {number|string} delta
 */
export function stepBodyweight(delta) {
  const input = /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetWeight'));
  if (!input) return;
  // A blank field is "not answered yet": a stepper must not invent a starting
  // weight. The athlete types the number instead.
  if (!String(input.value ?? '').trim()) return;
  const current = parseFloat(input.value) || 0;
  const maxDisplay = Math.round(fromCanonicalWeight(MAX_WEIGHT, unit()) || MAX_WEIGHT);
  const next = Math.min(maxDisplay, Math.max(1, Math.round((current + Number(delta) || 0) * 10) / 10));
  input.value = next.toFixed(1);
}

export function saveBodyweightSheet() {
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetDate'));
  const weightInput = /** @type {HTMLInputElement|null} */ (document.getElementById('bwSheetWeight'));
  const date = validDate(dateInput?.value) ? dateInput.value : todayKey();
  const entered = parseFloat(weightInput?.value || '');
  // Same bound the Measures entry uses, expressed in the unit being typed: one
  // mistyped 9999 permanently rescales every chart, mean and rate.
  const maxDisplay = Math.round(fromCanonicalWeight(MAX_WEIGHT, unit()) || MAX_WEIGHT);
  if (!Number.isFinite(entered) || entered <= 0 || entered > maxDisplay) {
    showToast(`Enter a weight between 1 and ${maxDisplay}`, true);
    return;
  }
  // The input is the athlete's unit; storage is canonical kilograms.
  const weight = toCanonicalWeight(entered, unit());
  if (date > todayKey()) {
    showToast('Choose today or an earlier date');
    return;
  }
  if (!Array.isArray(appState.bodyWeightLog)) appState.bodyWeightLog = [];
  appState.bodyWeightLog = upsertWeighIn(appState.bodyWeightLog, date, weight);
  saveStateToLocalStorage(true);
  closeBodyweightSheet();
  _render();
}

/** @param {string} date */
export async function deleteBodyweightEntry(date) {
  const entry = entries().find((row) => row.date === date);
  if (!entry) return;
  const confirmed = await confirmModal({
    title: 'Delete weigh-in?',
    message: `${date} · ${displayWeightString(entry.weight, unit(), { decimals: 1 })} ${unit()}`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  appState.bodyWeightLog = (appState.bodyWeightLog || []).filter((row) => row?.date !== date);
  saveStateToLocalStorage(true);
  closeBodyweightSheet();
  _render();
}
