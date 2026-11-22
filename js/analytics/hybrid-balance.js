// @ts-check
// =============================================================================
// HYBRID BALANCE (js/analytics/hybrid-balance.js)
//
// The strength/endurance split of CALENDAR-week training load.
//
// A hybrid athlete needs one answer Home cannot currently give: is this week's
// work split across both disciplines? Tonnage (kg) and distance (km) cannot be
// added, so the only honest cross-modal currency is sRPE — RPE × minutes. That
// day formula already has ONE owner (js/metrics/training-load.js); this module
// only buckets it into Monday-based calendar weeks and classifies the split.
//
// It never reads `state.currentWeek`: a training WEEK is not a calendar week.
// Archived activations and one-off sessions count through the canonical dated
// slot index, exactly like every other calendar reader.
//
// HONESTY RULE: strength sRPE needs a recorded session duration. If working
// sets were logged without one, strength load reads 0 and a naive percentage
// would claim an endurance-only week. That case returns status
// 'unmeasured-strength' instead of inventing a ratio.
// =============================================================================
import { dailyLoadBreakdownTimeline } from '../metrics/training-load.js';
import { buildCalendarWeekStrength, indexSlotsByDate, weekStartOf } from './weekly-aggregate.js';
import { addDaysISO, daysBetween, localDayKey, todayKey } from '../dates.js';

const DAYS_PER_WEEK = 7;
export const DEFAULT_BALANCE_WEEKS = 5;

/** Share of weekly sRPE inside which work counts as balanced. */
export const BALANCED_BAND = Object.freeze({ min: 40, max: 60 });

/** +/- share of the pace-matched baseline that counts as a real change. */
const TREND_THRESHOLD = 0.1;

const STATUS_LABELS = Object.freeze({
  balanced: 'Balanced',
  'strength-heavy': 'Strength-heavy',
  'endurance-heavy': 'Endurance-heavy',
  'unmeasured-strength': 'Strength time missing',
  'no-data': 'No load logged',
});

const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;

/** @param {number[]} values */
const sum = (values) => values.reduce((total, value) => total + value, 0);

/** @param {number} value @param {number} min @param {number} max */
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Split one load total into whole percentages that always add to 100.
 * @param {number} strength @param {number} endurance
 */
function splitPercent(strength, endurance) {
  const total = strength + endurance;
  if (total <= 0) return { strengthPct: null, endurancePct: null };
  const strengthPct = Math.round((strength / total) * 100);
  return { strengthPct, endurancePct: 100 - strengthPct };
}

/**
 * @param {number} strengthPct
 * @param {number} strengthSets working sets in the current calendar week
 */
function classify(strengthPct, strengthSets) {
  if (strengthPct == null) return 'no-data';
  // Strength work exists but no session duration was recorded: sRPE cannot see
  // it, so the split would be a lie rather than an empty state.
  if (strengthPct === 0 && strengthSets > 0) return 'unmeasured-strength';
  if (strengthPct > BALANCED_BAND.max) return 'strength-heavy';
  if (strengthPct < BALANCED_BAND.min) return 'endurance-heavy';
  return 'balanced';
}

/**
 * Pace-matched total: the in-progress week is judged only over the weekdays it
 * has already lived through, against the SAME weekdays in prior weeks. Without
 * this, every Monday reads as a huge "ease" against completed weeks.
 *
 * @param {Array<{strength:number[], endurance:number[]}>} buckets oldest first
 * @param {number} elapsedDays 1..7
 */
function paceMatchedTrend(buckets, elapsedDays) {
  if (buckets.length < 2) return null;
  const current = buckets[buckets.length - 1];
  const cur = sum(current.strength.slice(0, elapsedDays)) + sum(current.endurance.slice(0, elapsedDays));
  const priors = buckets
    .slice(0, -1)
    .map((bucket) => sum(bucket.strength.slice(0, elapsedDays)) + sum(bucket.endurance.slice(0, elapsedDays)))
    .filter((value) => value > 0);
  if (!priors.length) return null;
  const priorAvg = sum(priors) / priors.length;
  if (priorAvg <= 0) return null;
  const change = (cur - priorAvg) / priorAvg;
  let dir = 'holding';
  if (change >= TREND_THRESHOLD) dir = 'building';
  else if (change <= -TREND_THRESHOLD) dir = 'easing';
  return {
    dir,
    pct: Math.round(change * 100),
    comparedWeeks: priors.length,
    paceMatched: elapsedDays < DAYS_PER_WEEK,
  };
}

/** @returns {any} an explicit empty model, never a zero-shaped lie */
function emptyModel(weekStart, weekEnd) {
  return {
    weekStart,
    weekEnd,
    weeks: [],
    priorWeeksWithLoad: 0,
    strengthMin: 0,
    enduranceMin: 0,
    totalMin: 0,
    strengthPct: null,
    endurancePct: null,
    ratio: null,
    status: 'no-data',
    statusLabel: STATUS_LABELS['no-data'],
    trend: null,
    hasData: false,
    modalities: { strength: false, endurance: false },
    coverage: { strengthDurationMissing: false, strengthSets: 0 },
  };
}

/**
 * Build the calendar-week strength/endurance split.
 *
 * @param {any} state
 * @param {{today?:string|Date, weeks?:number, tz?:string}} [options]
 */
export function buildHybridBalance(state, options = {}) {
  const tz = options.tz;
  const today = localDayKey(options.today || todayKey(tz), tz);
  if (!today) return emptyModel(null, null);

  const windowWeeks = clamp(Math.round(Number(options.weeks) || DEFAULT_BALANCE_WEEKS), 1, 26);
  const currentWeekStart = weekStartOf(today);
  const firstWeekStart = addDaysISO(currentWeekStart, -DAYS_PER_WEEK * (windowWeeks - 1));

  const index = indexSlotsByDate(state, { tz });
  const timeline = dailyLoadBreakdownTimeline(state, { throughDate: today, tz, index });

  /** @type {Map<string, {strength:number[], endurance:number[]}>} */
  const buckets = new Map();
  for (const row of timeline) {
    const start = weekStartOf(row.date);
    if (!start || start < firstWeekStart || start > currentWeekStart) continue;
    const offset = daysBetween(start, row.date);
    if (offset == null || offset < 0 || offset >= DAYS_PER_WEEK) continue;
    const bucket = buckets.get(start) || {
      strength: new Array(DAYS_PER_WEEK).fill(0),
      endurance: new Array(DAYS_PER_WEEK).fill(0),
    };
    bucket.strength[offset] += row.strength;
    bucket.endurance[offset] += row.endurance;
    buckets.set(start, bucket);
  }

  const ordered = [];
  const weeks = [];
  for (let i = 0; i < windowWeeks; i++) {
    const weekStart = addDaysISO(firstWeekStart, i * DAYS_PER_WEEK);
    const bucket = buckets.get(weekStart) || { strength: [], endurance: [] };
    ordered.push(bucket);
    const strengthMin = sum(bucket.strength);
    const enduranceMin = sum(bucket.endurance);
    const totalMin = strengthMin + enduranceMin;
    const split = splitPercent(strengthMin, enduranceMin);
    weeks.push({
      weekStart,
      weekEnd: addDaysISO(weekStart, DAYS_PER_WEEK - 1),
      isCurrent: weekStart === currentWeekStart,
      strengthMin: round1(strengthMin),
      enduranceMin: round1(enduranceMin),
      totalMin: round1(totalMin),
      ...split,
    });
  }

  const current = weeks[weeks.length - 1] || null;
  if (!current) return emptyModel(currentWeekStart, addDaysISO(currentWeekStart, 6));

  const strengthWeek = buildCalendarWeekStrength(state, {
    today,
    weekStart: currentWeekStart,
    tz,
    index,
  });
  const strengthSets = strengthWeek.totalWorkingSets || 0;

  const status = classify(current.strengthPct, strengthSets);
  const elapsedDays = clamp((daysBetween(currentWeekStart, today) ?? 0) + 1, 1, DAYS_PER_WEEK);
  const trend = status === 'no-data' ? null : paceMatchedTrend(ordered, elapsedDays);

  const modalities = {
    strength: weeks.some((week) => week.strengthMin > 0),
    endurance: weeks.some((week) => week.enduranceMin > 0),
  };
  const priorWeeksWithLoad = weeks
    .slice(0, -1)
    .filter((week) => week.totalMin > 0).length;

  return {
    weekStart: currentWeekStart,
    weekEnd: current.weekEnd,
    weeks,
    priorWeeksWithLoad,
    strengthMin: current.strengthMin,
    enduranceMin: current.enduranceMin,
    totalMin: current.totalMin,
    strengthPct: current.strengthPct,
    endurancePct: current.endurancePct,
    ratio: current.enduranceMin > 0
      ? Math.round((current.strengthMin / current.enduranceMin) * 100) / 100
      : null,
    status,
    statusLabel: STATUS_LABELS[status] || STATUS_LABELS['no-data'],
    trend,
    hasData: current.totalMin > 0,
    modalities,
    coverage: {
      // Working sets exist but none of them carry a session duration.
      strengthDurationMissing: status === 'unmeasured-strength',
      strengthSets,
    },
  };
}
