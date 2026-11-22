// =============================================================================
// MEASUREMENTS SHEET (js/measurements-sheet.js)
//
// The tape is a slow signal, so the sheet asks for six optional tape sites plus
// an entered body-fat reading and saves whatever was actually measured.
// Prefilling a NEW date with last month's numbers would invite saving stale data
// unknowingly, so the last reading is only a placeholder and an existing date is
// prefilled exactly.
//
// Storage stays canonical centimetres; the sheet writes display-unit values
// back through the model, so a cm/in toggle never rewrites stored data.
// =============================================================================
import { appState, saveStateToLocalStorage } from './state.js';
import { openManagedModal, closeManagedModal } from './ui/modal-stack.js';
import { confirmModal } from './ui/confirm-modal.js';
import { formatDayMonth, todayKey } from './dates.js';
import { showToast } from './toast.js';
import {
  MEASUREMENT_SITES, buildMeasurementRecord, cmToDisplay, measurementUnit,
  normalizeMeasurements, roundDisplay,
} from './metrics/measurements.js';

let _render = () => {};

/** @param {() => void} render */
export function initMeasurementsSheet(render) {
  _render = typeof render === 'function' ? render : () => {};
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  dateInput?.addEventListener('change', () => {
    fillSheet(validDate(dateInput.value) ? dateInput.value : todayKey());
  });
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

/** Newest first. */
function entries() {
  return normalizeMeasurements(appState.bodyMeasurements).slice().reverse();
}

/** @param {string} key */
function inputFor(key) {
  return /** @type {HTMLInputElement|null} */ (document.getElementById(`msSheet_${key}`));
}

/**
 * Fill the sheet for one date WITHOUT opening the modal. Changing the date must
 * reload the fields: leaving today's numbers under yesterday's date would save
 * a measurement that was never taken.
 * @param {string} chosen
 */
function fillSheet(chosen) {
  const newest = entries();
  const existing = newest.find((entry) => entry.date === chosen);
  const latest = newest[0];
  const unit = measurementUnit(appState);

  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  if (dateInput) { dateInput.value = chosen; dateInput.max = todayKey(); }
  const title = document.getElementById('measurementsSheetTitle');
  if (title) title.textContent = existing ? 'Edit measurements' : 'Log measurements';
  const unitLabel = document.getElementById('msSheetUnit');
  if (unitLabel) unitLabel.textContent = unit;

  for (const site of MEASUREMENT_SITES) {
    const input = inputFor(site.key);
    if (!input) continue;
    const own = existing?.[site.key];
    const last = latest?.[site.key];
    input.value = typeof own === 'number' ? String(roundDisplay(cmToDisplay(own, unit), unit)) : '';
    input.placeholder = typeof last === 'number'
      ? String(roundDisplay(cmToDisplay(last, unit), unit))
      : unit;
    input.setAttribute('aria-label', `${site.label} (${unit})`);
  }

  // Body fat is a percentage, so it is neither converted by the cm/in toggle
  // nor prefilled onto a new date — only the last body-fat reading is a
  // placeholder. It may be older than the newest tape entry when body fat is
  // measured less often, so search the history rather than only `latest`.
  const bodyFatInput = inputFor('bodyFat');
  if (bodyFatInput) {
    const own = existing?.bodyFat;
    const lastBodyFat = newest.find((entry) => typeof entry.bodyFat === 'number')?.bodyFat;
    bodyFatInput.value = typeof own === 'number' ? String(roundDisplay(own)) : '';
    bodyFatInput.placeholder = typeof lastBodyFat === 'number' ? String(roundDisplay(lastBodyFat)) : '%';
    bodyFatInput.setAttribute('aria-label', 'Body fat (%)');
  }

  renderRecent(newest.filter((entry) => entry.date !== chosen).slice(0, 3), unit);
}

/**
 * Open the sheet on a date. An existing date shows its own numbers; a new date
 * leaves the fields blank and puts the last reading in the placeholder.
 * @param {string} [date]
 */
export function openMeasurementsSheet(date) {
  const sheet = document.getElementById('measurementsSheet');
  const backdrop = document.getElementById('measurementsSheetBackdrop');
  if (!sheet) return;
  fillSheet(validDate(date) ? date : todayKey());
  sheet.classList.add('active');
  backdrop?.classList.add('active');
  openManagedModal(sheet, { initialFocus: '#msSheet_waist' });
}

/**
 * @param {Array<Record<string, any>>} recent
 * @param {'cm'|'in'} unit
 */
function renderRecent(recent, unit) {
  const host = document.getElementById('msSheetRecent');
  if (!host) return;
  host.textContent = '';
  if (!recent.length) return;

  const title = document.createElement('div');
  title.className = 'bw-sheet-recent-title';
  title.textContent = 'Recent measurements';
  host.append(title);

  for (const entry of recent) {
    const row = document.createElement('div');
    row.className = 'bw-sheet-recent-row';

    const when = document.createElement('span');
    when.textContent = formatDayMonth(entry.date);

    const values = MEASUREMENT_SITES
      .filter((site) => typeof entry[site.key] === 'number')
      .map((site) => `${site.label} ${roundDisplay(cmToDisplay(entry[site.key], unit), unit)}`)
      .join(' · ');

    const right = document.createElement('span');
    const value = document.createElement('strong');
    value.textContent = [
      values ? `${values} ${unit}` : '',
      typeof entry.bodyFat === 'number' ? `Body fat ${roundDisplay(entry.bodyFat)}%` : '',
    ].filter(Boolean).join(' · ');

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.dataset.action = 'edit-ms-row';
    edit.dataset.date = entry.date;
    edit.textContent = 'Edit';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.dataset.action = 'delete-ms-row';
    remove.dataset.date = entry.date;
    remove.setAttribute('aria-label', `Delete measurements ${entry.date}`);
    remove.textContent = 'Delete';

    right.append(value, edit, remove);
    row.append(when, right);
    host.append(row);
  }
}

export function closeMeasurementsSheet() {
  const sheet = document.getElementById('measurementsSheet');
  document.getElementById('measurementsSheetBackdrop')?.classList.remove('active');
  sheet?.classList.remove('active');
  if (sheet) closeManagedModal(sheet);
}

/**
 * Persist the chosen display unit. Values already in the state are untouched —
 * only how they are read changes.
 * @param {'cm'|'in'|string} unit
 */
export function setMeasurementUnit(unit) {
  if (unit !== 'cm' && unit !== 'in') return;
  if (!appState.settings || typeof appState.settings !== 'object') appState.settings = {};
  if (measurementUnit(appState) === unit) return;
  appState.settings.measurementUnit = unit;
  saveStateToLocalStorage(true);
  _render();
}

export function saveMeasurementsSheet() {
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  const date = validDate(dateInput?.value) ? dateInput.value : todayKey();
  if (date > todayKey()) {
    showToast('Choose today or an earlier date');
    return;
  }
  const unit = measurementUnit(appState);
  /** @type {Record<string, string>} */
  const values = {};
  for (const site of MEASUREMENT_SITES) values[site.key] = inputFor(site.key)?.value ?? '';
  values.bodyFat = inputFor('bodyFat')?.value ?? '';
  const { record, invalid } = buildMeasurementRecord(date, values, unit);
  if (invalid.length) {
    showToast(`Check ${invalid.join(', ')} — that reading is outside a plausible range.`, true);
    return;
  }
  const measured = record.bodyFat != null || MEASUREMENT_SITES.some((site) => record[site.key] != null);
  if (!measured) {
    showToast('Enter at least one measurement');
    return;
  }
  if (!Array.isArray(appState.bodyMeasurements)) appState.bodyMeasurements = [];
  const index = appState.bodyMeasurements.findIndex((entry) => entry?.date === date);
  if (index >= 0) {
    // Replace rather than merge: clearing a field is a correction, not a reason
    // to keep the old number.
    appState.bodyMeasurements[index] = record;
  } else {
    appState.bodyMeasurements.push(record);
  }
  saveStateToLocalStorage(true);
  closeMeasurementsSheet();
  _render();
}

/** @param {string} date */
export async function deleteMeasurementEntry(date) {
  const entry = entries().find((row) => row.date === date);
  if (!entry) return;
  const unit = measurementUnit(appState);
  const summary = [
    MEASUREMENT_SITES
      .filter((site) => typeof entry[site.key] === 'number')
      .map((site) => `${site.label} ${roundDisplay(cmToDisplay(entry[site.key], unit), unit)} ${unit}`)
      .join(' · '),
    typeof entry.bodyFat === 'number' ? `Body fat ${roundDisplay(entry.bodyFat)}%` : '',
  ].filter(Boolean).join(' · ');
  const confirmed = await confirmModal({
    title: 'Delete measurements?',
    message: `${date}${summary ? ` · ${summary}` : ''}`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  appState.bodyMeasurements = (appState.bodyMeasurements || []).filter((row) => row?.date !== date);
  saveStateToLocalStorage(true);
  closeMeasurementsSheet();
  _render();
}
