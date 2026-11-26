// @ts-check
// =============================================================================
// BODYWEIGHT CSV IMPORT — clean-room reader for the second OpenGym export file
// (`date, weight_kg` / `weight_lb`). It only touches bodyWeightLog; workout
// history is handled by import-workout-csv.js.
// =============================================================================
import { parseCsv, CSV_IMPORT_LIMITS } from './import-workout-csv.js';

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
const round2 = (n) => Math.round(n * 100) / 100;

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

/** True for the bodyweight export shape, without mistaking a workout CSV. */
export function looksLikeBodyCsv(text) {
  const headers = headersOf(text);
  if (!headers.includes('date')) return false;
  if (headers.includes('exercise') || headers.includes('exercise_name') || headers.includes('exercise_title')) return false;
  return headers.includes('weight_kg') || headers.includes('weightkg')
    || headers.includes('weight_lb') || headers.includes('weight_lbs')
    || headers.includes('weightlb') || headers.includes('weightlbs')
    || headers.includes('weight');
}

/**
 * @param {string} text
 * @param {{ unit?: 'kg'|'lbs' }} [opts]
 */
export function parseBodyCsv(text, opts = {}) {
  const targetUnit = opts.unit === 'lbs' ? 'lbs' : 'kg';
  if (typeof text !== 'string') throw new Error('The file is not text.');
  if (text.length > CSV_IMPORT_LIMITS.maxBytes) throw new Error('The CSV file is too large.');
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error('The CSV has no bodyweight rows.');
  if (rows.length > CSV_IMPORT_LIMITS.maxRows + 1) throw new Error('The CSV has too many rows.');

  const headers = rows[0].map(normalizeHeader);
  const idx = {
    date: headers.indexOf('date'),
    // `WeightKg` normalises to `weightkg`; accept both spellings so the app's
    // own canonical export is never misread as an unknown unit.
    kg: headers.indexOf('weight_kg') >= 0 ? headers.indexOf('weight_kg') : headers.indexOf('weightkg'),
    lb: headers.indexOf('weight_lb') >= 0 ? headers.indexOf('weight_lb')
      : headers.indexOf('weight_lbs') >= 0 ? headers.indexOf('weight_lbs')
      : headers.indexOf('weightlb') >= 0 ? headers.indexOf('weightlb')
      : headers.indexOf('weightlbs'),
    weight: headers.indexOf('weight'),
    unit: headers.indexOf('unit') >= 0 ? headers.indexOf('unit') : headers.indexOf('weight_unit'),
  };
  if (headers.includes('exercise') || headers.includes('exercise_name') || headers.includes('exercise_title')) {
    throw new Error('This is a workout CSV, not a bodyweight export.');
  }
  if (idx.date < 0) throw new Error('The CSV has no date column.');
  if (idx.kg < 0 && idx.lb < 0 && idx.weight < 0) throw new Error('The CSV has no weight column.');

  const byDate = new Map();
  let skipped = 0;
  let duplicates = 0;
  for (const row of rows.slice(1)) {
    const date = dateOf(cell(row, idx.date));
    const raw = idx.kg >= 0 ? number(cell(row, idx.kg))
      : idx.lb >= 0 ? number(cell(row, idx.lb))
      : number(cell(row, idx.weight));
    if (!date || !(raw > 0)) { skipped++; continue; }
    const rowUnit = idx.kg >= 0 ? 'kg'
      : idx.lb >= 0 ? 'lb'
      : (cell(row, idx.unit) || targetUnit).toLowerCase();
    const unit = rowUnit === 'lb' || rowUnit === 'lbs' ? 'lbs' : 'kg';
    const weight = unit === targetUnit ? raw
      : targetUnit === 'kg' ? raw * 0.45359237 : raw / 0.45359237;
    if (byDate.has(date)) duplicates++;
    // The last reading for a day wins; openHybrid stores one bodyweight per date.
    byDate.set(date, { date, weight: round2(weight) });
  }

  const entries = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) throw new Error('The CSV has no valid bodyweight readings.');
  return { entries, skipped, duplicates, total: rows.length - 1 };
}

/**
 * Merge parsed readings without overwriting an existing date. Returns the
 * number added/skipped so the UI can be honest.
 * @param {any} state
 * @param {ReturnType<typeof parseBodyCsv>} parsed
 */
export function applyBodyweightCsvImport(state, parsed) {
  if (!state || typeof state !== 'object') return { added: 0, skipped: 0 };
  if (!Array.isArray(state.bodyWeightLog)) state.bodyWeightLog = [];
  const existing = new Set(state.bodyWeightLog.filter((e) => e?.date).map((e) => e.date));
  let added = 0;
  let skipped = 0;
  for (const entry of parsed.entries || []) {
    if (existing.has(entry.date)) { skipped++; continue; }
    state.bodyWeightLog.push({ date: entry.date, weight: entry.weight });
    existing.add(entry.date);
    added++;
  }
  state.bodyWeightLog.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (!state.settings) state.settings = {};
  const latest = state.bodyWeightLog.at(-1);
  if (latest && !(Number(state.settings.defaultBodyWeight) > 0)) {
    state.settings.defaultBodyWeight = latest.weight;
  }
  return { added, skipped };
}
