// @ts-check
// =============================================================================
// MEASURES (js/metrics/measures.js)
//
// One dated entry, composed from the three stores that already own the pieces:
//
//   • `bodyWeightLog[date]`        — the weigh-in
//   • `bodyMeasurements[date]`     — the tape sites + entered body fat
//   • `progressPhotos` (`photo:id`) — the JPEG metadata (the blob is IndexedDB)
//
// Nothing is re-derived here and nothing is invented: an entry exists because at
// least one of those stores has a record for that date, and every field stays
// optional. A photo-only entry is real; so is a weigh-in with no tape.
//
// `saveMeasureEntry` writes the weigh-in and measurement stores coherently: a
// field that is absent REMOVES that part of the date, and an entry with nothing
// left removes the date from the stores it owns. Photos are never touched by it —
// their bytes are written by `js/photos/library.js`, and a photo can only be
// deleted with a confirmation because it has no Undo. `deleteMeasureEntry`
// removes the whole date, including the photo blob through an injected deleter,
// so it stays pure (no DOM, no IndexedDB of its own).
// =============================================================================

import {
  MEASUREMENT_SITES, LEGACY_MEASUREMENT_SITES, buildMeasurementRecord,
  measurementUnit, normalizeMeasurements, preserveLegacySites,
} from './measurements.js';
import { normalizeWeighIns, weightUnitLabel } from './bodyweight.js';
import { listPhotos, photoIdFor } from '../photos/library.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** A body weight outside this range is a typo, not an athlete. */
export const MAX_MEASURE_WEIGHT = 500;

/** @param {unknown} value */
function validDate(value) {
  return ISO_DATE.test(String(value || ''));
}

/**
 * @typedef {{ date: string, weight: number|null, bodyFat: number|null,
 *   sites: Array<{ key: string, label: string, cm: number }>,
 *   photo: any|null }} MeasureEntry
 */

/**
 * The measured sites on one stored record, canonical first then the preserved
 * single Arm/Thigh. Values stay canonical CENTIMETRES; the view converts.
 * @param {Record<string, any>|null|undefined} record
 * @returns {Array<{ key: string, label: string, cm: number }>}
 */
export function measureSitesFor(record) {
  /** @type {Array<{ key: string, label: string, cm: number }>} */
  const sites = [];
  for (const site of [...MEASUREMENT_SITES, ...LEGACY_MEASUREMENT_SITES]) {
    const cm = record?.[site.key];
    if (typeof cm === 'number' && Number.isFinite(cm)) {
      sites.push({ key: site.key, label: site.label, cm });
    }
  }
  return sites;
}

/**
 * Every dated entry, newest first, plus the data the Measures screen needs to
 * label it. The union of the three stores is the entry list: a date that only
 * has a photo still appears, and a date that only has a weigh-in still appears.
 * @param {any} state
 * @returns {{
 *   entries: MeasureEntry[],
 *   photos: Array<any>,
 *   weightUnit: 'kg'|'lb',
 *   measurementUnit: 'cm'|'in',
 *   count: number,
 *   photoCount: number,
 * }}
 */
export function buildMeasuresModel(state) {
  /** @type {Map<string, number>} */
  const weights = new Map();
  for (const weighIn of normalizeWeighIns(state?.bodyWeightLog)) weights.set(weighIn.date, weighIn.weight);

  /** @type {Map<string, any>} */
  const measurements = new Map();
  for (const record of normalizeMeasurements(state?.bodyMeasurements)) measurements.set(record.date, record);

  const photos = listPhotos(state);
  /** @type {Map<string, any>} */
  const photosByDate = new Map(photos.map((photo) => [photo.date, photo]));

  const dates = [...new Set([...weights.keys(), ...measurements.keys(), ...photosByDate.keys()])]
    .sort((a, b) => b.localeCompare(a));

  const entries = dates.map((date) => {
    const record = measurements.get(date) || null;
    const sites = measureSitesFor(record);
    const weight = weights.has(date) ? Number(weights.get(date)) : null;
    const bodyFat = typeof record?.bodyFat === 'number' ? record.bodyFat : null;
    const photo = photosByDate.get(date) || null;
    return { date, weight, bodyFat, sites, photo };
  });

  return {
    entries,
    photos,
    // A display label, never a conversion. Weigh-ins are stored in the
    // athlete's then-current unit, so only the name of that unit changes.
    weightUnit: weightUnitLabel(state),
    measurementUnit: measurementUnit(state),
    count: entries.length,
    photoCount: photos.length,
  };
}

/**
 * One entry by date, or null. The sheet uses it to decide whether clearing every
 * field is a correction (remove) or an empty save (refuse).
 * @param {any} state
 * @param {string} date
 * @returns {MeasureEntry|null}
 */
export function measureEntryFor(state, date) {
  if (!validDate(date)) return null;
  return buildMeasuresModel(state).entries.find((entry) => entry.date === date) || null;
}

/**
 * Upsert one dated entry across the weigh-in and measurement stores.
 *
 * - A blank/absent field removes that part for this date.
 * - A field that is present but implausible changes NOTHING: the whole call is
 *   rejected with the labels to check, so a typo in `waist` cannot half-save a
 *   weight.
 * - Pre-14-site Arm/Thigh readings have no input, so they are carried across an
 *   edit (`preserveLegacySites`) and are only removed with the whole entry.
 * - Photos are deliberately untouched: the library owns their bytes.
 *
 * @param {any} state
 * @param {string} date
 * @param {{ weight?: number|string|null, bodyFat?: number|string|null,
 *   sites?: Record<string, number|string|null> }} [values]
 * @param {{ unit?: 'cm'|'in'|string }} [options]
 * @returns {{ ok: boolean, invalid: string[], hasValues: boolean }}
 */
export function saveMeasureEntry(state, date, values = {}, options = {}) {
  if (!state || !validDate(date)) return { ok: false, invalid: ['Date'], hasValues: false };

  const unit = options.unit === 'cm' || options.unit === 'in' ? options.unit : measurementUnit(state);
  const rawSites = values.sites && typeof values.sites === 'object' ? values.sites : {};
  const rawForRecord = { ...rawSites };
  if ('bodyFat' in values) rawForRecord.bodyFat = values.bodyFat;
  const { record, invalid } = buildMeasurementRecord(date, rawForRecord, unit);

  let weight = null;
  const rawWeight = values.weight;
  if (rawWeight != null && String(rawWeight).trim() !== '') {
    const parsed = Number(rawWeight);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_MEASURE_WEIGHT) invalid.push('Weight');
    else weight = parsed;
  }
  if (invalid.length) return { ok: false, invalid, hasValues: false };

  // ---- weigh-in ------------------------------------------------------------
  // EVERY row for the date, not just the first: `normalizeWeighIns` keeps the
  // LAST reading when a date appears twice, so writing the first one made the
  // athlete's correction invisible on the next read (and clearing left the date
  // populated). A JSON restore can introduce the duplicate; the readers already
  // tolerate it, so the writer must too.
  if (!Array.isArray(state.bodyWeightLog)) state.bodyWeightLog = [];
  state.bodyWeightLog = state.bodyWeightLog.filter((/** @type {any} */ row) => row?.date !== date);
  if (weight != null) state.bodyWeightLog.push({ date, weight });

  // ---- measurements --------------------------------------------------------
  const hasSites = MEASUREMENT_SITES.some((site) => record[site.key] != null) || record.bodyFat != null;
  if (!Array.isArray(state.bodyMeasurements)) state.bodyMeasurements = [];
  // Same duplicate rule as the weigh-in, and the legacy carry-over reads the
  // LAST stored row because that is the one the readers see.
  const dated = state.bodyMeasurements.filter((/** @type {any} */ row) => row?.date === date);
  const previous = dated.length ? dated[dated.length - 1] : null;
  state.bodyMeasurements = state.bodyMeasurements.filter((/** @type {any} */ row) => row?.date !== date);
  let legacyKept = false;
  if (hasSites) {
    // Replace rather than merge: clearing a field is a correction. The
    // exception is the invisible pre-14-site Arm/Thigh reading.
    preserveLegacySites(record, previous);
    state.bodyMeasurements.push(record);
  } else if (previous) {
    const kept = /** @type {Record<string, number|string>} */ ({ date });
    preserveLegacySites(kept, previous);
    if (Object.keys(kept).length > 1) {
      state.bodyMeasurements.push(kept);
      legacyKept = true;
    }
  }

  return { ok: true, invalid: [], hasValues: weight != null || hasSites || legacyKept };
}

/**
 * Remove every part of a date. The photo's bytes live in IndexedDB, so the
 * caller injects `removePhoto` (normally `js/photos/library.js#removePhoto`);
 * without it the metadata is removed but the blob is left for the caller's own
 * cleanup, never silently orphaned by this module.
 *
 * Resolves to the photo id that was deleted (or null) so a caller can report it.
 *
 * @param {any} state
 * @param {string} date
 * @param {{ removePhoto?: (id: string) => any, save?: () => void }} [options]
 * @returns {Promise<{ removed: boolean, photoId: string|null }>}
 */
export async function deleteMeasureEntry(state, date, options = {}) {
  if (!state || !validDate(date)) return { removed: false, photoId: null };
  const photoId = photoIdFor(date);
  const photos = Array.isArray(state.progressPhotos) ? state.progressPhotos : [];
  const hasPhoto = photos.some((/** @type {any} */ photo) => photo?.id === photoId || photo?.date === date);

  // BYTES FIRST, and only then the rows. An earlier version removed the
  // metadata and the weigh-in/tape rows before asking the library to delete the
  // blob, so a failed blob delete left the caller holding a half-deleted state
  // in memory (and an orphan in quota once anything else saved). A throw here
  // now changes nothing at all.
  if (hasPhoto && typeof options.removePhoto === 'function') {
    await options.removePhoto(photoId);
  }

  let removed = false;
  if (Array.isArray(state.bodyWeightLog)) {
    const before = state.bodyWeightLog.length;
    state.bodyWeightLog = state.bodyWeightLog.filter((/** @type {any} */ row) => row?.date !== date);
    if (state.bodyWeightLog.length !== before) removed = true;
  }
  if (Array.isArray(state.bodyMeasurements)) {
    const before = state.bodyMeasurements.length;
    state.bodyMeasurements = state.bodyMeasurements.filter((/** @type {any} */ row) => row?.date !== date);
    if (state.bodyMeasurements.length !== before) removed = true;
  }
  if (hasPhoto) {
    // The library's removePhoto already filtered this, which makes it a no-op;
    // when no deleter was injected this is what removes the metadata.
    state.progressPhotos = photos.filter((/** @type {any} */ photo) => photo?.id !== photoId && photo?.date !== date);
    removed = true;
  }

  options.save?.();
  return { removed, photoId: hasPhoto ? photoId : null };
}
