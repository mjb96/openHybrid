// @ts-check
// =============================================================================
// BODY MEASUREMENTS CSV IMPORT
//
// Reads the file Settings → Data writes (`Date,Waist (cm),…,Body fat (%)`) and
// the same shape hand-made in a spreadsheet. Storage is canonical centimetres,
// so `_in` / `(in)` columns convert on the way in and bare columns follow the
// athlete's unit. Body fat is always a percentage (`body_fat`, `bodyfat`,
// `body_fat_pct`, `body_fat_percent`) and is never converted from cm/in.
// Existing dates are never overwritten — the same rule as the bodyweight reader.
//
// KNOWN LIMITATION: a file carrying a weight column belongs to the bodyweight
// reader, so a combined weigh-in + body-fat export (`date,weight_kg,body_fat`)
// imports the weigh-ins and leaves body fat behind. Split the export (or use a
// measurements-only file) to import body fat.
//
// Clean-room: parseCsv comes from import-workout-csv.js; no third-party reader.
// =============================================================================
import { parseCsv, CSV_IMPORT_LIMITS } from './import-workout-csv.js';
import {
  MEASUREMENT_SITES, MIN_MEASUREMENT_CM, MAX_MEASUREMENT_CM, bodyFatPercent,
} from '../metrics/measurements.js';

const normalizeHeader = (h) => String(h || '')
  .trim()
  .toLowerCase()
  .replace(/^\ufeff/, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

const cell = (row, index) => (index >= 0 && index < row.length ? String(row[index] || '').trim() : '');
const number = (value) => {
  const n = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const round1 = (n) => Math.round(n * 10) / 10;

function dateOf(value) {
  const m = String(value || '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (y < 1970 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function headersOf(text) {
  try {
    const rows = parseCsv(text);
    return rows.length ? rows[0].map(normalizeHeader) : [];
  } catch {
    return [];
  }
}

/** @type {Set<string>} */
const SITE_KEYS = new Set(MEASUREMENT_SITES.map((site) => site.key));

/** Normalized headers that carry an entered body-fat percentage. */
const BODY_FAT_HEADERS = new Set(['body_fat', 'bodyfat', 'body_fat_pct', 'body_fat_percent']);

/** @param {string[]} headers */
function bodyFatIndex(headers) {
  return headers.findIndex((header) => BODY_FAT_HEADERS.has(header));
}

/**
 * True when a CSV has a body-fat percentage column. The weigh-in reader uses
 * this to disclose that a combined file's body fat was not imported.
 * @param {string} text
 */
export function hasBodyFatColumn(text) {
  return bodyFatIndex(headersOf(text)) >= 0;
}

/**
 * Which column feeds which site, and whether that column is centimetres or
 * inches. `waist` with no suffix is resolved by the caller's unit.
 * @param {string[]} headers
 */
function columnMap(headers) {
  /** @type {Record<string, { index: number, unit: 'cm'|'in'|null }>} */
  const map = {};
  headers.forEach((header, index) => {
    const match = header.match(/^(waist|chest|hips|arm|thigh|neck)(?:_(cm|in))?$/);
    if (!match || !SITE_KEYS.has(match[1]) || map[match[1]]) return;
    map[match[1]] = { index, unit: match[2] === 'cm' ? 'cm' : match[2] === 'in' ? 'in' : null };
  });
  return map;
}

/**
 * True for a measurements export without mistaking a weigh-in or workout CSV.
 * A file carrying a weight column belongs to the bodyweight reader — including a
 * combined weigh-in + body-fat export, which therefore does not import body fat.
 * A body-fat-only file is still a measurements file.
 * @param {string} text
 */
export function looksLikeMeasurementsCsv(text) {
  const headers = headersOf(text);
  if (!headers.includes('date')) return false;
  if (headers.some((h) => h === 'exercise' || h === 'exercise_name' || h === 'exercise_title')) return false;
  if (headers.some((h) => h === 'weight' || h.startsWith('weight_'))) return false;
  return Object.keys(columnMap(headers)).length > 0 || bodyFatIndex(headers) >= 0;
}

/**
 * @param {string} text
 * @param {{ unit?: 'kg'|'lbs'|'cm'|'in' }} [opts]  unit for BARE headers
 */
export function parseMeasurementsCsv(text, opts = {}) {
  const bareUnit = opts.unit === 'in' || opts.unit === 'lbs' ? 'in' : 'cm';
  if (typeof text !== 'string') throw new Error('The file is not text.');
  if (text.length > CSV_IMPORT_LIMITS.maxBytes) throw new Error('The CSV file is too large.');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV has no measurement rows.');
  if (rows.length > CSV_IMPORT_LIMITS.maxRows + 1) throw new Error('The CSV has too many rows.');

  const headers = rows[0].map(normalizeHeader);
  const dateIndex = headers.indexOf('date');
  const columns = columnMap(headers);
  const bodyFatColumn = bodyFatIndex(headers);
  if (dateIndex < 0) throw new Error('The CSV has no date column.');
  if (!Object.keys(columns).length && bodyFatColumn < 0) throw new Error('The CSV has no measurement columns.');

  /** @type {Map<string, Record<string, number|string>>} */
  const byDate = new Map();
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const date = dateOf(cell(row, dateIndex));
    if (!date) { skipped++; continue; }
    // Rows for the same date merge site by site, so a waist row and a chest row
    // from the same morning are one record rather than a lost reading.
    const record = byDate.get(date) || { date };
    let touched = false;
    for (const [key, column] of Object.entries(columns)) {
      const raw = number(cell(row, column.index));
      if (raw == null) continue;
      const unit = column.unit || bareUnit;
      const cm = unit === 'in' ? raw * 2.54 : raw;
      if (!(cm >= MIN_MEASUREMENT_CM && cm <= MAX_MEASUREMENT_CM)) continue;
      record[key] = round1(cm);
      touched = true;
    }
    if (bodyFatColumn >= 0) {
      // Always a percentage: never cm/in, and 2–70 rejects a typo or a weight.
      // `number()` handles a decimal comma in semicolon files ("18,4").
      const percent = bodyFatPercent(number(cell(row, bodyFatColumn)));
      if (percent != null) { record.bodyFat = percent; touched = true; }
    }
    if (touched) byDate.set(date, record);
    else skipped++;
  }

  const entries = [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!entries.length) throw new Error('The CSV has no valid measurements.');
  return { entries, skipped, total: rows.length - 1 };
}

/**
 * Merge parsed records without overwriting an existing date. Returns the
 * number added/skipped so the UI can be honest.
 * @param {any} state
 * @param {ReturnType<typeof parseMeasurementsCsv>} parsed
 */
export function applyMeasurementsCsvImport(state, parsed) {
  if (!state || typeof state !== 'object') return { added: 0, skipped: 0 };
  if (!Array.isArray(state.bodyMeasurements)) state.bodyMeasurements = [];
  const existing = new Set(state.bodyMeasurements.filter((entry) => entry?.date).map((entry) => entry.date));
  let added = 0;
  let skipped = 0;
  for (const entry of parsed.entries || []) {
    if (existing.has(entry.date)) { skipped++; continue; }
    state.bodyMeasurements.push({ ...entry });
    existing.add(entry.date);
    added++;
  }
  state.bodyMeasurements.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return { added, skipped };
}
