// @ts-check
// =============================================================================
// BODYWEIGHT TREND (js/metrics/bodyweight.js)
//
// Pure helpers behind the Progress → Body weight graph. A single morning can
// move more with salt and water than a real week's change, so the number worth
// steering is the trend, not one weigh-in:
//   • weekly means for the history list
//   • a least-squares weekly rate over the last 21 days
//   • an optional lose/gain/hold corridor and an on-pace verdict
// No DOM and no state mutation; the view and its tests share this vocabulary.
// =============================================================================

import { addDaysISO, dateKey } from '../dates.js';

export const RATE_WINDOW_DAYS = 21;
export const RATE_MIN_WEIGHINS = 6;
export const RATE_MIN_SPAN_DAYS = 10;

/**
 * @typedef {{ date: string, weight: number }} WeighIn
 * @typedef {{ dir: 'lose'|'gain'|'hold', by?: '%'|'w', lo?: number, hi?: number }} RateGoal
 */

/**
 * Valid weigh-ins, oldest first. Duplicate dates keep the last reading, matching
 * the one-entry-per-day storage rule.
 * @param {any} log
 * @returns {WeighIn[]}
 */
/**
 * The DISPLAY label for a body weight: 'kg' or 'lb'. Weigh-ins are stored in the
 * athlete's then-current unit and never converted, so this only names the number.
 * One helper because the sheet, the Measures model and the delete confirmations
 * all quote the same value.
 * @param {any} state
 * @returns {'kg'|'lb'}
 */
export function weightUnitLabel(state) {
  return state?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
}

export function normalizeWeighIns(log) {
  /** @type {Map<string, number>} */
  const byDate = new Map();
  for (const entry of Array.isArray(log) ? log : []) {
    const date = typeof entry?.date === 'string' ? entry.date.trim() : '';
    const weight = Number(entry?.weight);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(weight) || weight <= 0) continue;
    byDate.set(date, weight);
  }
  return [...byDate.entries()]
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * The latest VALID weigh-in by date, not by array order. A back-dated entry
 * appended after today's must not become "current".
 * @param {any} log
 * @returns {{date: string, weight: number}|null}
 */
export function latestWeighIn(log) {
  const rows = normalizeWeighIns(log);
  if (rows.length) return rows[rows.length - 1];
  // Legacy logs written before weigh-ins carried dates are still real readings.
  // Prefer dated rows (above), but never ask for a bodyweight the athlete has
  // already logged just because the entry predates the date field.
  for (let index = (Array.isArray(log) ? log.length : 0) - 1; index >= 0; index -= 1) {
    const entry = log[index];
    const weight = Number(entry?.weight);
    if (!entry?.date && Number.isFinite(weight) && weight > 0) return { date: '', weight };
  }
  return null;
}

/** @param {string} dateISO */
function noon(dateISO) {
  return new Date(`${dateISO}T12:00:00`).getTime();
}

/**
 * The calendar week a date belongs to, as an ISO date.
 * @param {string} dateISO
 * @param {'mon'|'sun'|string} [weekStartDay]
 */
export function weekStartOf(dateISO, weekStartDay = 'mon') {
  const date = new Date(`${dateISO}T12:00:00`);
  const start = weekStartDay === 'sun' ? 0 : 1;
  const diff = (date.getDay() - start + 7) % 7;
  return addDaysISO(dateISO, -diff);
}

/**
 * Weekly means, newest week first. `delta` is this mean minus the previous
 * week's mean (null for the oldest week). Entries are newest first.
 * @param {any} log
 * @param {'mon'|'sun'|string} [weekStartDay]
 */
export function weeklyWeights(log, weekStartDay = 'mon') {
  /** @type {Map<string, WeighIn[]>} */
  const groups = new Map();
  for (const entry of normalizeWeighIns(log)) {
    const key = weekStartOf(entry.date, weekStartDay);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)?.push(entry);
  }
  const weeks = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entries]) => ({
      key,
      avg: entries.reduce((sum, entry) => sum + entry.weight, 0) / entries.length,
      n: entries.length,
      entries: [...entries].sort((a, b) => b.date.localeCompare(a.date)),
      delta: /** @type {number|null} */ (null),
    }));
  weeks.forEach((week, index) => {
    if (index > 0) week.delta = week.avg - weeks[index - 1].avg;
  });
  return weeks.reverse();
}

/**
 * Least-squares trend through the weigh-ins of the last `days` days.
 * Returns `{ enough: false }` until there are enough readings spread far enough
 * apart; a single salty dinner must not produce a confident weekly rate.
 * @param {any} log
 * @param {{ now?: number, days?: number }} [options]
 */
export function weightRate(log, { now = Date.now(), days = RATE_WINDOW_DAYS } = {}) {
  const fromKey = dateKey(new Date(now - (days - 1) * 86400000));
  const toKey = dateKey(new Date(now));
  const points = normalizeWeighIns(log)
    .filter((entry) => entry.date >= fromKey && entry.date <= toKey)
    .map((entry) => ({ x: noon(entry.date) / 86400000, y: entry.weight }));

  const n = points.length;
  const spanDays = n ? Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)) : 0;
  if (n < RATE_MIN_WEIGHINS || spanDays < RATE_MIN_SPAN_DAYS - 0.5) {
    return { enough: /** @type {const} */ (false), n, spanDays, days };
  }

  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const point of points) {
    num += (point.x - meanX) * (point.y - meanY);
    den += (point.x - meanX) ** 2;
  }
  const perDay = den > 0 ? num / den : 0;
  const perWeek = perDay * 7;
  return {
    enough: /** @type {const} */ (true),
    n,
    spanDays,
    days,
    perWeek,
    pct: meanY > 0 ? (perWeek / meanY) * 100 : 0,
    mean: meanY,
    from: fromKey,
    to: toKey,
  };
}

/**
 * Normalise a corridor into signed bounds in the chosen unit.
 * `%` values are percentages per week; `w` values are the profile's weight unit.
 * @param {RateGoal|null|undefined} goal
 * @returns {{ dir: 'lose'|'gain'|'hold', by: '%'|'w', min: number, max: number }|null}
 */
export function rateCorridor(goal) {
  if (!goal || !['lose', 'gain', 'hold'].includes(goal.dir)) return null;
  const lo = Math.abs(Number(goal.lo) || 0);
  const hi = Math.abs(Number(goal.hi) || 0);
  const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
  if (!(b > 0)) return null;
  const by = goal.by === 'w' ? 'w' : '%';
  if (goal.dir === 'hold') return { dir: 'hold', by, min: -b, max: b };
  return goal.dir === 'lose' ? { dir: 'lose', by, min: -b, max: -a } : { dir: 'gain', by, min: a, max: b };
}

/**
 * @param {ReturnType<typeof weightRate>} rate
 * @param {RateGoal|null|undefined} goal
 * @returns {'in'|'slow'|'fast'|'off'|null}
 */
export function rateStatus(rate, goal) {
  const corridor = rateCorridor(goal);
  if (!corridor || !rate?.enough) return null;
  const value = corridor.by === 'w' ? rate.perWeek : rate.pct;
  const rounded = Math.round(value * 100) / 100;
  if (rounded >= corridor.min && rounded <= corridor.max) return 'in';
  if (corridor.dir === 'hold') return 'off';
  if (corridor.dir === 'lose') return rounded < corridor.min ? 'fast' : 'slow';
  return rounded > corridor.max ? 'fast' : 'slow';
}

/**
 * Everything the Progress bodyweight view needs.
 * @param {any} state
 * @param {{ now?: number, rangeDays?: number }} [options]
 */
export function buildBodyweightModel(state, { now = Date.now(), rangeDays = 90 } = {}) {
  const today = dateKey(new Date(now));
  // A weigh-in dated in the future is a data-entry or import artefact; it must
  // never become "latest" or drive the change for a window that ends today.
  const log = normalizeWeighIns(state?.bodyWeightLog).filter((entry) => entry.date <= today);
  const unit = state?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
  // Inclusive window: 30 days ENDING today is today-29 … today, not 31 days.
  const from = rangeDays > 0 ? dateKey(new Date(now - (rangeDays - 1) * 86400000)) : '';
  const points = from ? log.filter((entry) => entry.date >= from) : log;
  const latest = log.length ? log[log.length - 1] : null;
  const rate = weightRate(log, { now });
  const goal = rateCorridor(state?.settings?.rateGoal);
  const status = rateStatus(rate, state?.settings?.rateGoal);
  const target = Number(state?.settings?.targetWeight);
  return {
    unit,
    points,
    latest,
    weekly: weeklyWeights(points, state?.settings?.weekStartDay),
    rate,
    corridor: goal,
    status,
    targetWeight: Number.isFinite(target) && target > 0 ? target : null,
    rangeDays,
  };
}
