// @ts-check
// =============================================================================
// ANALYTICS RANGES (js/analytics/ranges.js)
//
// One time-range vocabulary for the Progress surface. Every band resolves its
// window through here, so "30D" means the same 30 days on every card, and so
// the comparison window is EQUAL LENGTH by construction rather than by hope.
//
// There is deliberately NO cap function. openHybrid is FOSS and nothing is
// gated, so "how far back may this user look" does not exist as a concept.
// `tests/progress_no_paywall.test.js` fails if one is ever added.
//
// Trailing windows end TODAY, which makes the comparison inherently
// elapsed-matched: a Wednesday is compared with the same 30 days up to the
// previous Wednesday, never with a full month.
// =============================================================================
import { addDaysISO, formatWeekRange, localDayKey, todayKey } from '../dates.js';
import { weekStartOf } from './weekly-aggregate.js';

/**
 * @typedef {Object} RangePreset
 * @property {'30d'|'3m'|'1y'|'all'} id
 * @property {string} label
 * @property {number|null} days  null = unbounded
 */

/** @type {ReadonlyArray<RangePreset>} */
export const RANGE_PRESETS = Object.freeze([
  { id: '30d', label: '30D', days: 30 },
  { id: '3m', label: '3M', days: 90 },
  { id: '1y', label: '1Y', days: 365 },
  { id: 'all', label: 'All', days: null },
]);

export const DEFAULT_RANGE_ID = '30d';

/** @param {unknown} id */
export function isRangeId(id) {
  return RANGE_PRESETS.some((preset) => preset.id === id);
}

/**
 * @typedef {Object} Range
 * @property {'30d'|'3m'|'1y'|'all'} id
 * @property {string} label
 * @property {string|null} startISO  null only for an unbounded range with no known first record
 * @property {string} endISO
 * @property {number|null} days
 * @property {number|null} elapsedDays
 * @property {boolean} isPartial     the final calendar week in the window is incomplete
 * @property {string} spanLabel      real dates, never a relative phrase
 */

/**
 * Resolve a range preset into concrete dates.
 *
 * @param {unknown} id
 * @param {string} [todayISO]
 * @param {{ earliestISO?: string|null }} [options] `earliestISO` bounds the `all` preset;
 *   omit it and the range is genuinely unbounded above.
 * @returns {Range|null} null when `todayISO` is not a valid calendar key
 */
export function resolveRange(id, todayISO, options = {}) {
  const today = localDayKey(todayISO || todayKey());
  if (!today) return null;

  const preset = RANGE_PRESETS.find((entry) => entry.id === id)
    || RANGE_PRESETS.find((entry) => entry.id === DEFAULT_RANGE_ID)
    || RANGE_PRESETS[0];

  const earliest = localDayKey(options.earliestISO || '') || null;
  const startISO = preset.days
    ? /** @type {string} */ (addDaysISO(today, -(preset.days - 1)))
    : earliest;
  const endISO = today;

  // A window that ends on Wednesday leaves its final Monday–Sunday week
  // incomplete. Charts mark that bar rather than drawing it as a full week.
  const lastWeekStart = weekStartOf(endISO);
  const isPartial = lastWeekStart
    ? endISO < /** @type {string} */ (addDaysISO(lastWeekStart, 6))
    : false;

  return {
    id: preset.id,
    label: preset.label,
    startISO,
    endISO,
    days: preset.days,
    elapsedDays: preset.days,
    isPartial,
    spanLabel: startISO ? formatWeekRange(startISO, endISO) || 'Selected period' : 'All time',
  };
}

/**
 * The immediately preceding window, same length, ending the day before `range`.
 * This is the ONLY comparison window the surface offers, so a period can never
 * be measured against one of a different size.
 *
 * @param {Range|null|undefined} range
 * @returns {{ startISO: string, endISO: string, days: number, label: string }|null}
 *   null for an unbounded range, which has no comparable previous window.
 */
export function previousRange(range) {
  if (!range || !range.days || !range.startISO) return null;
  const endISO = /** @type {string} */ (addDaysISO(range.startISO, -1));
  const startISO = /** @type {string} */ (addDaysISO(endISO, -(range.days - 1)));
  if (!startISO || !endISO) return null;
  return { startISO, endISO, days: range.days, label: formatWeekRange(startISO, endISO) };
}

/**
 * Is a calendar date inside a range? Inclusive on both ends, and an unbounded
 * range (null `startISO`) accepts everything up to `endISO`.
 *
 * @param {string} dateISO
 * @param {{ startISO: string|null, endISO: string }|null|undefined} range
 *   Only the two bounds are required, so a comparison window can be tested
 *   without inventing a full Range.
 */
export function inRange(dateISO, range) {
  const key = localDayKey(dateISO);
  if (!key || !range) return false;
  if (key > range.endISO) return false;
  return range.startISO ? key >= range.startISO : true;
}
