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
 * @param {Array<{loadByDay:number[], minByDay:number[]}>} weeks oldest first
 * @param {number} elapsedDays 1..7
 * @param {'loadByDay'|'minByDay'} key
 */
function paceMatchedTrend(weeks, elapsedDays, key) {
  if (weeks.length < 2) return null;
  const current = weeks[weeks.length - 1];
  const cur = sum(current[key].slice(0, elapsedDays));
  const priors = weeks
    .slice(0, -1)
    .map((week) => sum(week[key].slice(0, elapsedDays)))
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
    basis: 'none',
    basisLabel: '',
    strengthLoad: 0,
    enduranceLoad: 0,
    totalLoad: 0,
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
 * @param {{today?:string|Date, weeks?:number, tz?:string, index?:any}} [options]
 */
export function buildHybridBalance(state, options = {}) {
  const tz = options.tz;
  const today = localDayKey(options.today || todayKey(tz), tz);
  if (!today) return emptyModel(null, null);

  const windowWeeks = clamp(Math.round(Number(options.weeks) || DEFAULT_BALANCE_WEEKS), 1, 26);
  const currentWeekStart = weekStartOf(today);
  const firstWeekStart = addDaysISO(currentWeekStart, -DAYS_PER_WEEK * (windowWeeks - 1));

  const index = options.index || indexSlotsByDate(state, { tz });
  const timeline = dailyLoadBreakdownTimeline(state, { throughDate: today, tz, index });

  /**
   * Two currencies, one decision. sRPE is the physiological currency, but it
   * needs an RPE — optional when logging — so a lifter who never rates effort
   * has real sessions with ZERO load. Minutes are the fallback: the time they
   * actually trained. The chosen basis is reported so the card can say which.
   *
   * @type {Map<string, {loadS:number[], loadE:number[], minS:number[], minE:number[]}>}
   */
  const buckets = new Map();
  for (const row of timeline) {
    const start = weekStartOf(row.date);
    if (!start || start < firstWeekStart || start > currentWeekStart) continue;
    const offset = daysBetween(start, row.date);
    if (offset == null || offset < 0 || offset >= DAYS_PER_WEEK) continue;
    const bucket = buckets.get(start) || {
      loadS: new Array(DAYS_PER_WEEK).fill(0),
      loadE: new Array(DAYS_PER_WEEK).fill(0),
      minS: new Array(DAYS_PER_WEEK).fill(0),
      minE: new Array(DAYS_PER_WEEK).fill(0),
    };
    bucket.loadS[offset] += row.strength;
    // Walks are excluded from the split (§7.2): on the minutes fallback an
    // unrated walk would count like a hard session and outvote real training.
    // The time itself is still reported by the Endurance band.
    bucket.loadE[offset] += Math.max(0, row.endurance - (row.walkLoad || 0));
    bucket.minS[offset] += row.strengthMin || 0;
    bucket.minE[offset] += Math.max(0, (row.enduranceMin || 0) - (row.walkMin || 0));
    buckets.set(start, bucket);
  }

  // Assemble both currencies per week first; the basis is chosen afterwards so
  // every week is measured the same way.
  const raw = [];
  for (let i = 0; i < windowWeeks; i++) {
    const weekStart = addDaysISO(firstWeekStart, i * DAYS_PER_WEEK);
    const bucket = buckets.get(weekStart) || { loadS: [], loadE: [], minS: [], minE: [] };
    const strengthLoad = sum(bucket.loadS);
    const enduranceLoad = sum(bucket.loadE);
    const strengthMin = sum(bucket.minS);
    const enduranceMin = sum(bucket.minE);
    raw.push({
      weekStart,
      weekEnd: addDaysISO(weekStart, DAYS_PER_WEEK - 1),
      isCurrent: weekStart === currentWeekStart,
      strengthLoad,
      enduranceLoad,
      strengthMin,
      enduranceMin,
      loadByDay: new Array(DAYS_PER_WEEK).fill(0)
        .map((_, day) => (bucket.loadS[day] || 0) + (bucket.loadE[day] || 0)),
      minByDay: new Array(DAYS_PER_WEEK).fill(0)
        .map((_, day) => (bucket.minS[day] || 0) + (bucket.minE[day] || 0)),
    });
  }

  const current = raw[raw.length - 1] || null;
  if (!current) return emptyModel(currentWeekStart, addDaysISO(currentWeekStart, 6));

  const weekTotal = (week, key) => week.strengthLoad + week.enduranceLoad;
  let basis = 'none';
  if (weekTotal(current) > 0) basis = 'srpe';
  else if (current.strengthMin + current.enduranceMin > 0) basis = 'minutes';
  else if (raw.some((week) => weekTotal(week) > 0)) basis = 'srpe';
  else if (raw.some((week) => week.strengthMin + week.enduranceMin > 0)) basis = 'minutes';

  const shareFor = (week) => (basis === 'minutes'
    ? splitPercent(week.strengthMin, week.enduranceMin)
    : basis === 'srpe'
      ? splitPercent(week.strengthLoad, week.enduranceLoad)
      : { strengthPct: null, endurancePct: null });

  const weeks = raw.map((week) => ({
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    isCurrent: week.isCurrent,
    strengthLoad: round1(week.strengthLoad),
    enduranceLoad: round1(week.enduranceLoad),
    strengthMin: round1(week.strengthMin),
    enduranceMin: round1(week.enduranceMin),
    ...shareFor(week),
  }));

  const currentShare = shareFor(current);
  const strengthWeek = buildCalendarWeekStrength(state, {
    today,
    weekStart: currentWeekStart,
    tz,
    index,
  });
  const strengthSets = strengthWeek.totalWorkingSets || 0;

  // A week with working sets but no measurable load is NOT "no data": the
  // athlete trained, the session simply lacks a duration/RPE to measure it.
  const status = currentShare.strengthPct == null && strengthSets > 0
    ? 'unmeasured-strength'
    : classify(currentShare.strengthPct, strengthSets);
  const elapsedDays = clamp((daysBetween(currentWeekStart, today) ?? 0) + 1, 1, DAYS_PER_WEEK);
  const trend = basis === 'none'
    ? null
    : paceMatchedTrend(raw, elapsedDays, basis === 'minutes' ? 'minByDay' : 'loadByDay');

  const currentTotal = basis === 'minutes'
    ? current.strengthMin + current.enduranceMin
    : basis === 'srpe' ? weekTotal(current) : 0;
  const modalities = {
    strength: weeks.some((week) => (basis === 'minutes' ? week.strengthMin : week.strengthLoad) > 0),
    endurance: weeks.some((week) => (basis === 'minutes' ? week.enduranceMin : week.enduranceLoad) > 0),
  };
  const priorWeeksWithLoad = weeks
    .slice(0, -1)
    .filter((week) => (basis === 'minutes'
      ? week.strengthMin + week.enduranceMin
      : week.strengthLoad + week.enduranceLoad) > 0).length;

  return {
    weekStart: currentWeekStart,
    weekEnd: current.weekEnd,
    weeks,
    priorWeeksWithLoad,
    basis,
    basisLabel: basis === 'minutes' ? 'Training time' : basis === 'srpe' ? 'Session load' : '',
    strengthLoad: round1(current.strengthLoad),
    enduranceLoad: round1(current.enduranceLoad),
    totalLoad: round1(weekTotal(current)),
    strengthMin: round1(current.strengthMin),
    enduranceMin: round1(current.enduranceMin),
    totalMin: round1(current.strengthMin + current.enduranceMin),
    strengthPct: currentShare.strengthPct,
    endurancePct: currentShare.endurancePct,
    ratio: (() => {
      const s = basis === 'minutes' ? current.strengthMin : current.strengthLoad;
      const e = basis === 'minutes' ? current.enduranceMin : current.enduranceLoad;
      return e > 0 ? Math.round((s / e) * 100) / 100 : null;
    })(),
    status,
    statusLabel: STATUS_LABELS[status] || STATUS_LABELS['no-data'],
    trend,
    hasData: currentTotal > 0,
    modalities,
    coverage: {
      // Working sets exist but nothing measures them: no duration, so neither
      // sRPE nor minutes can split the week.
      strengthDurationMissing: status === 'unmeasured-strength',
      strengthSets,
    },
  };
}
