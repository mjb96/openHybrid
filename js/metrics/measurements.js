// @ts-check
// =============================================================================
// BODY MEASUREMENTS (js/metrics/measurements.js)
//
// The scale moves with salt and water; a tape moves in weeks. These are the
// slow signals the scale hides — waist, chest, hips, arm, thigh, neck — stored
// canonically in CENTIMETRES with one record per date, exactly like weigh-ins.
// Display converts to inches when the athlete asks for them; nothing stored is
// ever rewritten by a unit change. The same record may also carry an ENTERED
// body-fat percentage (2–70, one decimal): it is not a centimetre site, it is
// never converted by the cm/in choice, and it is never estimated from the tape.
//
// No DOM and no state mutation: the Progress card, the sheet and the tests all
// share this vocabulary.
// =============================================================================

export const MEASUREMENT_SITES = Object.freeze([
  Object.freeze({ key: 'waist', label: 'Waist' }),
  Object.freeze({ key: 'chest', label: 'Chest' }),
  Object.freeze({ key: 'hips', label: 'Hips' }),
  Object.freeze({ key: 'arm', label: 'Arm' }),
  Object.freeze({ key: 'thigh', label: 'Thigh' }),
  Object.freeze({ key: 'neck', label: 'Neck' }),
]);

export const CM_PER_INCH = 2.54;
/** A tape reading outside this range is a typo, not a body. */
export const MIN_MEASUREMENT_CM = 20;
export const MAX_MEASUREMENT_CM = 300;
/**
 * Body fat is an ENTERED reading (scale, calipers, DEXA), never estimated: there
 * is no height, sex or age, and inventing them would fabricate a number.
 */
export const BODY_FAT_MIN = 2;
export const BODY_FAT_MAX = 70;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {number} cm */
function roundCm(cm) {
  return Math.round(cm * 10) / 10;
}

/** @param {number} value */
export function roundDisplay(value) {
  return Math.round(value * 10) / 10;
}

/**
 * The unit the athlete reads, derived from their kg/lb choice unless they have
 * explicitly picked one. Storage stays centimetres either way.
 * @param {any} state
 * @returns {'cm'|'in'}
 */
export function measurementUnit(state) {
  const chosen = state?.settings?.measurementUnit;
  if (chosen === 'cm' || chosen === 'in') return chosen;
  return state?.settings?.weightUnit === 'lbs' ? 'in' : 'cm';
}

/** @param {number} cm @param {'cm'|'in'|string} unit */
export function cmToDisplay(cm, unit) {
  const value = Number(cm);
  if (!Number.isFinite(value)) return NaN;
  return unit === 'in' ? value / CM_PER_INCH : value;
}

/** @param {number|string} value @param {'cm'|'in'|string} unit */
export function displayToCm(value, unit) {
  const n = Number(value);
  if (!Number.isFinite(n)) return NaN;
  return unit === 'in' ? n * CM_PER_INCH : n;
}

/**
 * One entered value in canonical centimetres, or null when it is blank,
 * unparseable or outside a plausible tape reading.
 * @param {number|string} value
 * @param {'cm'|'in'|string} unit
 * @returns {number|null}
 */
export function measurementCm(value, unit) {
  if (value == null || String(value).trim() === '') return null;
  const cm = displayToCm(value, unit);
  if (!Number.isFinite(cm) || cm < MIN_MEASUREMENT_CM || cm > MAX_MEASUREMENT_CM) return null;
  return roundCm(cm);
}

/**
 * One entered body-fat reading, one decimal, or null when it is blank,
 * unparseable or outside a plausible percentage. Always a percentage — a cm/in
 * toggle must never convert it.
 * @param {number|string} value
 * @returns {number|null}
 */
export function bodyFatPercent(value) {
  if (value == null || String(value).trim() === '') return null;
  const percent = Number(value);
  if (!Number.isFinite(percent) || percent < BODY_FAT_MIN || percent > BODY_FAT_MAX) return null;
  return roundDisplay(percent);
}

/**
 * Valid records, oldest first. Duplicate dates keep the last reading, matching
 * the one-entry-per-day storage rule. Sites are only present when measured, so
 * a waist-only entry is a real record rather than five zeros. Body fat is not a
 * length site: it is retained as its own additive `bodyFat` percentage, and a
 * body-fat-only record is just as real.
 * @param {any} log
 * @returns {Array<{ date: string } & Record<string, number|string>>}
 */
export function normalizeMeasurements(log) {
  /** @type {Map<string, any>} */
  const byDate = new Map();
  for (const entry of Array.isArray(log) ? log : []) {
    const date = typeof entry?.date === 'string' ? entry.date.trim() : '';
    if (!ISO_DATE.test(date)) continue;
    /** @type {Record<string, number>} */
    const values = {};
    for (const site of MEASUREMENT_SITES) {
      const cm = Number(entry?.[site.key]);
      if (Number.isFinite(cm) && cm >= MIN_MEASUREMENT_CM && cm <= MAX_MEASUREMENT_CM) {
        values[site.key] = roundCm(cm);
      }
    }
    const bodyFat = bodyFatPercent(entry?.bodyFat);
    if (bodyFat != null) values.bodyFat = bodyFat;
    if (Object.keys(values).length) byDate.set(date, { date, ...values });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Per-site history, latest reading and the change since that site's previous
 * reading. A site nobody measured is returned with `latest: null` so the card
 * can stay quiet instead of showing a zero.
 * @param {any} log
 */
export function measurementSiteTrends(log) {
  const entries = normalizeMeasurements(log);
  return MEASUREMENT_SITES.map((site) => {
    const points = entries
      .filter((entry) => typeof entry[site.key] === 'number')
      .map((entry) => ({ date: entry.date, cm: /** @type {number} */ (entry[site.key]) }));
    const latest = points.length ? points[points.length - 1] : null;
    const previous = points.length > 1 ? points[points.length - 2] : null;
    const first = points.length ? points[0] : null;
    return {
      ...site,
      points,
      latest,
      previous,
      delta: latest && previous ? latest.cm - previous.cm : null,
      total: latest && first && first.date !== latest.date ? latest.cm - first.cm : null,
    };
  });
}

/**
 * Body-fat history: the entered percentage per date, latest/previous reading,
 * the change in PERCENTAGE POINTS since the previous reading and the total
 * change since the first. A percentage-point delta is what an athlete reads
 * ("down 1.4 pp"); percent-of-percent would be a different, misleading number.
 * @param {any} log
 */
export function bodyFatTrend(log) {
  const entries = normalizeMeasurements(log);
  const points = entries
    .filter((entry) => typeof entry.bodyFat === 'number')
    .map((entry) => ({ date: entry.date, value: /** @type {number} */ (entry.bodyFat) }));
  const latest = points.length ? points[points.length - 1] : null;
  const previous = points.length > 1 ? points[points.length - 2] : null;
  const first = points.length ? points[0] : null;
  return {
    points,
    latest,
    previous,
    delta: latest && previous ? roundDisplay(latest.value - previous.value) : null,
    total: latest && first && first.date !== latest.date ? roundDisplay(latest.value - first.value) : null,
  };
}

/**
 * Build the stored record from raw sheet inputs. `invalid` lists the site
 * labels that were filled but implausible, so the caller can say which field to
 * check instead of silently dropping it.
 * @param {string} date
 * @param {Record<string, string|number>} values
 * @param {'cm'|'in'|string} unit
 */
export function buildMeasurementRecord(date, values, unit) {
  /** @type {Record<string, number|string>} */
  const record = { date };
  /** @type {string[]} */
  const invalid = [];
  for (const site of MEASUREMENT_SITES) {
    const raw = values?.[site.key];
    if (raw == null || String(raw).trim() === '') continue;
    const cm = measurementCm(raw, unit);
    if (cm == null) { invalid.push(site.label); continue; }
    record[site.key] = cm;
  }
  const rawBodyFat = values?.bodyFat;
  if (rawBodyFat != null && String(rawBodyFat).trim() !== '') {
    const percent = bodyFatPercent(rawBodyFat);
    if (percent == null) invalid.push('Body fat');
    else record.bodyFat = percent;
  }
  return { record, invalid };
}

/**
 * Everything the Progress measurements card needs.
 * @param {any} state
 * @param {{ recentCount?: number }} [options]
 */
export function buildMeasurementModel(state, { recentCount = 4 } = {}) {
  const unit = measurementUnit(state);
  const entries = normalizeMeasurements(state?.bodyMeasurements);
  const sites = measurementSiteTrends(entries);
  const tracked = sites.filter((site) => site.latest);
  return {
    unit,
    entries,
    sites,
    tracked,
    bodyFat: bodyFatTrend(entries),
    count: entries.length,
    latestDate: entries.length ? entries[entries.length - 1].date : null,
    recent: [...entries].reverse().slice(0, recentCount),
  };
}
