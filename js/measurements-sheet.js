// =============================================================================
// MEASUREMENTS SHEET (js/measurements-sheet.js)
//
// The tape is a slow signal, so the sheet asks for 14 optional sites (six
// primary fields plus eight bilateral fields behind a disclosure) and an
// entered body-fat reading, then saves whatever was actually measured.
// Prefilling a NEW date with last month's numbers would invite saving stale data
// unknowingly, so the last reading is only a placeholder and an existing date is
// prefilled exactly. Pre-14-site single Arm/Thigh readings have no inputs here;
// `preserveLegacySites` carries them across an edit instead of dropping them.
//
// Since Measures, the sheet is one DATED ENTRY rather than tape only: a picture
// sits at the top (camera or library), then body weight, body fat and the tape.
// Every field is optional except the date, and Save writes through
// `saveMeasureEntry` so weight, measurements and photos stay one coherent row.
// The picture is STAGED here and written on Save: choosing a photo and then
// cancelling must not leave a blob (or a metadata record) behind.
//
// Storage stays canonical centimetres; the sheet writes display-unit values
// back through the model, so a cm/in toggle never rewrites stored data.
// =============================================================================
import { appState, saveStateToLocalStorage } from './state.js';
import { openManagedModal, closeManagedModal, replaceManagedModal } from './ui/modal-stack.js';
import { confirmModal } from './ui/confirm-modal.js';
import { formatDayMonth, formatDayMonthShort, todayKey } from './dates.js';
import { showToast } from './toast.js';
import {
  MEASUREMENT_SITES, LEGACY_MEASUREMENT_SITES, cmToDisplay,
  measurementUnit, normalizeMeasurements, roundDisplay,
} from './metrics/measurements.js';
import { normalizeWeighIns, weightUnitLabel } from './metrics/bodyweight.js';
import { displayWeightString } from './metrics/weight-unit.js';
import { measureEntryFor, saveMeasureEntry } from './metrics/measures.js';
import { addPhoto, listPhotos, photoObjectUrl, removePhoto } from './photos/library.js';
import { preparePhoto } from './photos/capture.js';

let _render = () => {};
/** A picked picture, already downscaled once; written only when the entry is saved. */
/** @type {{ blob: Blob, width: number, height: number }|null} */
let _pendingPrepared = null;
/** The canvas the staged picture was decoded onto, shown as the preview. */
/** @type {HTMLCanvasElement|null} */
let _previewCanvas = null;
/** The existing picture was asked to be removed when the entry is saved. */
let _removePhoto = false;
/** The date the photo slot currently describes. */
let _photoDate = '';
/** A token so a slow thumbnail never paints over a newer choice. */
let _photoToken = 0;



/** The eight sites inside the disclosure; used for the auto-open count. */
const BILATERAL_SITES = MEASUREMENT_SITES.filter((site) => site.key.endsWith('_l') || site.key.endsWith('_r'));

/** @param {() => void} render */
export function initMeasurementsSheet(render) {
  _render = typeof render === 'function' ? render : () => {};
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  dateInput?.addEventListener('change', () => {
    fillSheet(validDate(dateInput.value) ? dateInput.value : todayKey());
  });
  const sheet = document.getElementById('measurementsSheet');
  // Delegated on the sheet, not the document: the picture controls only exist
  // inside this dialog, and the global action router does not own them.
  sheet?.addEventListener('change', onPhotoInputChange);
  sheet?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    // The file inputs are hidden (a 1x1 input is not a control and is not
    // keyboard reachable); these buttons are the real targets.
    const pick = target?.closest('[data-ms-photo-pick]');
    if (pick) {
      const kind = pick.getAttribute('data-ms-photo-pick') === 'camera' ? 'camera' : 'library';
      const input = sheet.querySelector(`input[data-ms-photo="${kind}"]`);
      if (input instanceof HTMLInputElement) input.click();
      return;
    }
    if (!target?.closest('[data-action="ms-sheet-photo-remove"]')) return;
    _pendingPrepared = null;
    _previewCanvas = null;
    // Only a SAVED picture can be removed; clearing a staged pick is just a
    // cancel and must not claim it will delete something on Save.
    _removePhoto = listPhotos(appState).some((photo) => photo.date === _photoDate);
    paintPhotoSlot();
  });
}

/**
 * Stage a picked picture. Nothing is written until Save, so a cancelled sheet
 * cannot leave a blob behind.
 * @param {Event} event
 */
async function onPhotoInputChange(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement) || !input.hasAttribute('data-ms-photo')) return;
  const file = input.files?.[0] || null;
  input.value = '';
  if (!file) return;
  if (!String(file.type || '').startsWith('image/')) {
    showToast('That file is not an image.', true);
    return;
  }
  try {
    // Decode + downscale NOW, once: the preview then shows exactly what will be
    // stored, and Save does not encode the same picture a second time.
    const prepared = await preparePhoto(file);
    _pendingPrepared = { blob: prepared.blob, width: prepared.width, height: prepared.height };
    _previewCanvas = prepared.canvas;
    _removePhoto = false;
    paintPhotoSlot();
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That picture could not be read.', true);
  }
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

/** Revoke the staged preview URL and forget the staged picture. */
function resetPhotoStage() {
  _pendingPrepared = null;
  _previewCanvas = null;
  _removePhoto = false;
  _photoToken += 1;
}

/**
 * Paint the picture slot: the staged pick, the saved picture for this date, or
 * an honest empty state. The Remove control only exists when there is something
 * to remove, so it cannot promise a deletion for a date with no picture.
 */
function paintPhotoSlot() {
  const host = document.getElementById('msSheetPhotoPreview');
  if (!host) return;
  const remove = document.querySelector('#msSheetPhoto [data-action="ms-sheet-photo-remove"]');
  host.textContent = '';
  _photoToken += 1;
  const token = _photoToken;

  if (_pendingPrepared && _previewCanvas) {
    // The decoded canvas IS the preview: no URL, and it shows the stored pixels.
    const canvas = _previewCanvas;
    canvas.className = 'ms-sheet-photo__img';
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'New picture to save');
    host.append(canvas);
    if (remove) remove.hidden = false;
    return;
  }

  const existing = _photoDate && !_removePhoto
    ? listPhotos(appState).find((photo) => photo.date === _photoDate)
    : null;
  if (existing) {
    const img = document.createElement('img');
    img.alt = `Picture from ${formatDayMonthShort(existing.date)}`;
    host.append(img);
    if (remove) remove.hidden = false;
    photoObjectUrl(existing.id).then((url) => {
      // A slow read must not paint over a newer date or a staged replacement.
      if (!url || token !== _photoToken) { if (url) URL.revokeObjectURL(url); return; }
      img.src = url;
      img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    });
    return;
  }

  const empty = document.createElement('span');
  empty.className = 'ms-sheet-photo__empty';
  empty.textContent = _removePhoto ? 'Picture will be removed on save' : 'No picture';
  host.append(empty);
  if (remove) remove.hidden = true;
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
  const unit = measurementUnit(appState);
  const weighIns = normalizeWeighIns(appState.bodyWeightLog);
  const weightUnit = weightUnitLabel(appState);

  // A fresh date starts with nothing staged; the picture slot follows the date.
  resetPhotoStage();
  _photoDate = chosen;

  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  if (dateInput) { dateInput.value = chosen; dateInput.max = todayKey(); }
  const title = document.getElementById('measurementsSheetTitle');
  // Title stays keyed to the tape record, as before: the sheet is still opened
  // from the Measurements card, and its existing browser contract names those
  // two modes. A weigh-in or photo on the date does not change the wording.
  if (title) title.textContent = existing ? 'Edit measurements' : 'Log measurements';
  const unitLabel = document.getElementById('msSheetUnit');
  if (unitLabel) unitLabel.textContent = unit;
  const weightUnitEl = document.getElementById('msSheetWeightUnit');
  if (weightUnitEl) weightUnitEl.textContent = weightUnit;

  // Body weight follows the same rule as the tape: an existing date shows its
  // own weigh-in; a new date stays blank and only PLACEHOLDERS the last reading,
  // so a stale number cannot be saved as if it had been measured today.
  const weightInput = inputFor('weight');
  if (weightInput) {
    const ownWeight = weighIns.find((entry) => entry.date === chosen);
    const lastWeight = [...weighIns].reverse().find((entry) => entry.date <= chosen);
    // Stored kilograms -> the athlete's display unit (1 decimal, trimmed).
    weightInput.value = ownWeight ? displayWeightString(ownWeight.weight, weightUnit) : '';
    weightInput.placeholder = lastWeight ? displayWeightString(lastWeight.weight, weightUnit) : weightUnit;
    weightInput.setAttribute('aria-label', `Body weight (${weightUnit})`);
  }
  paintPhotoSlot();

  for (const site of MEASUREMENT_SITES) {
    const input = inputFor(site.key);
    if (!input) continue;
    const own = existing?.[site.key];
    // The last reading ON OR BEFORE the chosen date, never a future one: a
    // back-dated entry must not be suggested this week's tape.
    const last = newest.find((entry) => entry.date <= chosen && typeof entry[site.key] === 'number')?.[site.key];
    input.value = typeof own === 'number' ? String(roundDisplay(cmToDisplay(own, unit), unit)) : '';
    input.placeholder = typeof last === 'number'
      ? String(roundDisplay(cmToDisplay(last, unit), unit))
      : unit;
    input.setAttribute('aria-label', `${site.label} (${unit})`);
  }

  // Stored bilateral values are behind the disclosure; opening it on an edit
  // makes them visible instead of silently hiding half the record.
  const details = /** @type {HTMLDetailsElement|null} */ (document.querySelector('#measurementsSheet .ms-sheet-more'));
  if (details) {
    const recorded = BILATERAL_SITES.filter((site) => typeof existing?.[site.key] === 'number').length;
    details.open = recorded > 0;
    const summary = details.querySelector('summary');
    if (summary) {
      summary.textContent = recorded
        ? `Arms, thighs and calves · ${recorded} recorded`
        : 'Arms, thighs and calves';
    }
  }

  // Body fat is a percentage, so it is neither converted by the cm/in toggle
  // nor prefilled onto a new date — only the latest reading ON OR BEFORE the
  // chosen date is a placeholder. A future reading would suggest a measurement
  // that did not exist yet, and body fat may be measured less often than the
  // tape, so search the history rather than only `latest`.
  const bodyFatInput = inputFor('bodyFat');
  if (bodyFatInput) {
    const own = existing?.bodyFat;
    const lastBodyFat = newest.find((entry) => entry.date <= chosen && typeof entry.bodyFat === 'number')?.bodyFat;
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
/**
 * @param {string} [date]
 * @param {{ replaceRoot?: HTMLElement|null }} [options] `replaceRoot` hands the
 *   dialog over from another open managed modal (the photo viewer) and keeps ONE
 *   browser-history marker, instead of racing history.back() against a new
 *   pushState().
 */
export function openMeasurementsSheet(date, options = {}) {
  const sheet = document.getElementById('measurementsSheet');
  const backdrop = document.getElementById('measurementsSheetBackdrop');
  if (!sheet) return;
  fillSheet(validDate(date) ? date : todayKey());
  sheet.classList.add('active');
  backdrop?.classList.add('active');
  if (options.replaceRoot) {
    replaceManagedModal(options.replaceRoot, sheet, { initialFocus: '#msSheet_waist' });
    return;
  }
  openManagedModal(sheet, { initialFocus: '#msSheet_waist' });
}

/**
 * One readable value per measured field: the 14 canonical sites, a preserved
 * single Arm/Thigh, then body fat. Recent rows and delete confirmations share
 * this order.
 * @param {Record<string, any>} entry
 * @param {'cm'|'in'} unit
 */
function entryValues(entry, unit) {
  /** @type {string[]} */
  const values = [];
  for (const site of [...MEASUREMENT_SITES, ...LEGACY_MEASUREMENT_SITES]) {
    if (typeof entry[site.key] !== 'number') continue;
    values.push(`${site.label} ${roundDisplay(cmToDisplay(entry[site.key], unit), unit)} ${unit}`);
  }
  if (typeof entry.bodyFat === 'number') values.push(`Body fat ${roundDisplay(entry.bodyFat)}%`);
  return values;
}

/**
 * Keep a summary row scannable: four values plus an honest "+N more" instead of
 * a paragraph of measurements.
 * @param {Record<string, any>} entry
 * @param {'cm'|'in'} unit
 * @param {number} [max]
 */
function summariseEntry(entry, unit, max = 4) {
  const values = entryValues(entry, unit);
  const shown = values.slice(0, max);
  if (values.length > max) shown.push(`+${values.length - max} more`);
  return shown.join(' · ');
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

    const summary = summariseEntry(entry, unit);

    const right = document.createElement('span');
    const value = document.createElement('strong');
    value.textContent = summary;

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
  // A cancelled entry must not keep a picked picture in memory.
  resetPhotoStage();
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

/**
 * Save one dated entry: weight, entered body fat, tape sites and a staged
 * picture, through the one model that knows how the three stores stay coherent.
 * A field cleared here removes that part of the entry; the entry itself survives
 * while it still has a picture or any measurement.
 */
export async function saveMeasurementsSheet() {
  const dateInput = /** @type {HTMLInputElement|null} */ (document.getElementById('msSheetDate'));
  const date = validDate(dateInput?.value) ? dateInput.value : todayKey();
  if (date > todayKey()) {
    showToast('Choose today or an earlier date');
    return;
  }
  const unit = measurementUnit(appState);
  const existing = measureEntryFor(appState, date);
  /** @type {Record<string, string>} */
  const sites = {};
  /** @type {Record<string, number>} */
  const unchangedSites = {};
  const existingSites = new Map((existing?.sites || []).map((site) => [site.key, site.cm]));
  for (const site of MEASUREMENT_SITES) {
    const raw = inputFor(site.key)?.value ?? '';
    const own = existingSites.get(site.key);
    // The sheet prefills an existing reading in the athlete's display unit. If
    // the field still shows that rounded value, keep the ORIGINAL centimetres:
    // 76.0 cm prefilled as 29.9 in must not save back as 75.9 cm. Only an
    // actually edited field goes through unit conversion.
    if (own != null && String(raw).trim() !== '' && Number(raw) === roundDisplay(cmToDisplay(own, unit))) {
      unchangedSites[site.key] = own;
      continue;
    }
    sites[site.key] = raw;
  }
  const values = {
    weight: inputFor('weight')?.value ?? '',
    bodyFat: inputFor('bodyFat')?.value ?? '',
    sites,
    unchangedSites,
  };

  // An entry with nothing in it and nothing previously recorded is not worth a
  // row. An EXISTING entry is different: clearing every field is a correction,
  // and `saveMeasureEntry` removes the parts that no longer exist.
  const existingHasValues = Boolean(existing && (existing.weight != null || existing.bodyFat != null || existing.sites.length));
  const photoKept = Boolean(existing?.photo) && !_removePhoto;
  const typed = String(values.weight).trim() !== ''
    || String(values.bodyFat).trim() !== ''
    || MEASUREMENT_SITES.some((site) => String(sites[site.key] ?? '').trim() !== '');
  if (!typed && !existingHasValues && !_pendingPrepared && !photoKept && !_removePhoto) {
    showToast('Add a measurement or a picture');
    return;
  }

  const result = saveMeasureEntry(appState, date, values, { unit, weightUnit: weightUnitLabel(appState) });
  if (!result.ok) {
    showToast(`Check ${result.invalid.join(', ')} — that reading is outside a plausible range.`, true);
    return;
  }

  // Photos last: if the picture cannot be stored, the numbers still are, and
  // the toast says exactly which part failed.
  try {
    if (_pendingPrepared) {
      // Already downscaled at pick time: hand the prepared blob over rather than
      // encoding it again.
      await addPhoto({ state: appState, dateISO: date, prepared: _pendingPrepared });
    } else if (_removePhoto && existing?.photo) {
      await removePhoto({ state: appState, id: existing.photo.id });
    }
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'That picture could not be saved.', true);
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
  const summary = summariseEntry(entry, unit);
  const confirmed = await confirmModal({
    title: 'Delete these tape readings?',
    // The sheet edits a whole dated entry now (weight, body fat, tape, photo),
    // but this list is the TAPE list: deleting must not silently take the
    // weigh-in and the photo with it.
    message: `${formatDayMonthShort(date, { year: true })}${summary ? ` · ${summary}` : ''}. Your weigh-in and any photo for that date stay.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  appState.bodyMeasurements = (appState.bodyMeasurements || []).filter((row) => row?.date !== date);
  saveStateToLocalStorage(true);
  closeMeasurementsSheet();
  _render();
}
