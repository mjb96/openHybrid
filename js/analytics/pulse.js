// @ts-check
// =============================================================================
// PULSE MODEL (js/analytics/pulse.js)
//
// "Am I showing up, in both?" — one calendar week of training, with strength
// and endurance counted SEPARATELY.
//
// Calendar-week strict, like every other analytics model: sessions are bucketed
// by their real stamped date, so an archived `arch:` week or a `session:` one-off
// still lands in the week it happened. `state.currentWeek` is never read — a
// program week is not a period.
//
// Runs and walks never merge: `runKm` excludes walks, `walkKm` excludes runs.
// That rule is owned by §7.2 of the plan and asserted in the tests.
// =============================================================================
import { addDaysISO, formatWeekRange, localDayKey } from '../dates.js';
import { DAY_KEYS, indexSlotsByDate, loggedSessionsByDate, weekStartOf } from './weekly-aggregate.js';
// The classifier the Today card, coach and cockpit use: one reading of "is this
// a planned training day", so Pulse cannot disagree with them.
import { classifyPlannedSession } from '../workout/completion-policy.js';
// The same credit model Home's day recap uses. Pulse is the week version of it.
import { buildSessionMuscles } from '../home/session-muscles.js';

/**
 * @typedef {Object} PulseDay
 * @property {string} day          mon..sun
 * @property {string} dateISO
 * @property {boolean} isToday
 * @property {boolean} isFuture
 * @property {boolean} isRest      no session and not in the future
 * @property {number} sessions
 * @property {number} workingSets
 * @property {number} volumeKg
 * @property {number} runKm
 * @property {number} runCount
 * @property {number} walkKm
 * @property {number} walkCount
 */

/**
 * Sessions in a date window, counting SESSIONS (not dates) — a strength + run
 * day is two, and two programmed days completed on one date are two.
 *
 * @param {Map<string, number>} counts
 * @param {string} startISO
 * @param {number} days
 */
function sessionsIn(counts, startISO, days) {
  let total = 0;
  for (let i = 0; i < days; i++) {
    const date = addDaysISO(startISO, i);
    if (date) total += counts.get(date) || 0;
  }
  return total;
}

/**
 * Consecutive Monday-weeks with at least one session, ending at `weekStart`.
 * When the current week is untrained the streak still counts the run that ended
 * last week — it is not "lost" until the week closes — and `atRisk` says so.
 *
 * @param {Set<string>} trainedDates
 * @param {string} weekStart
 * @param {number} [limit]
 */
function streakWeeks(trainedDates, weekStart, limit = 260) {
  const weekHasTraining = (start) => {
    for (let i = 0; i < 7; i++) {
      const date = addDaysISO(start, i);
      if (date && trainedDates.has(date)) return true;
    }
    return false;
  };

  const currentTrained = weekHasTraining(weekStart);
  let count = 0;
  let cursor = currentTrained ? weekStart : /** @type {string} */ (addDaysISO(weekStart, -7));
  while (count < limit && weekHasTraining(cursor)) {
    count++;
    cursor = /** @type {string} */ (addDaysISO(cursor, -7));
  }

  // The best run of consecutive trained weeks, independent of where today is.
  // Pulse shows the current streak; this is the number it can be compared with.
  const trainedWeeks = [...new Set([...trainedDates].map((date) => weekStartOf(date)).filter(Boolean))].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  for (const start of trainedWeeks) {
    run = previous && addDaysISO(previous, 7) === start ? run + 1 : 1;
    if (run > best) best = run;
    previous = start;
  }

  return { weeks: count, atRisk: !currentTrained && count > 0, best };
}

/**
 * @param {any} state
 * @param {{
 *   todayISO?: string,
 *   weekStartISO?: string|null,  // follow the shared week navigator when it selects a past week
 *   program?: any,
 *   days?: string[],
 * }} [options]
 */
export function buildPulseModel(state, options = {}) {
  const todayISO = localDayKey(options.todayISO || new Date());
  if (!todayISO) throw new Error('buildPulseModel: invalid todayISO');

  // The hub's navigator is the page's time control for week-scoped content, so
  // a selected past week must move Pulse too — otherwise the navigator says
  // "9 Nov" while the band above it says "this week".
  const requested = localDayKey(options.weekStartISO || '');
  const weekStart = /** @type {string} */ (requested ? weekStartOf(requested) : weekStartOf(todayISO));
  const weekEnd = /** @type {string} */ (addDaysISO(weekStart, 6));
  const index = indexSlotsByDate(state);
  const { counts, dates } = loggedSessionsByDate(state, { index });

  /** @type {Record<string, any[]>} */
  const weekLifts = {};

  /** @type {PulseDay[]} */
  const days = DAY_KEYS.map((day, offset) => {
    const dateISO = /** @type {string} */ (addDaysISO(weekStart, offset));
    const slots = index.allByDate.get(dateISO) || [];

    let workingSets = 0;
    let volumeKg = 0;
    let runKm = 0;
    let runCount = 0;
    let walkKm = 0;
    let walkCount = 0;

    for (const slot of slots) {
      workingSets += slot.stats?.workingSets || 0;
      volumeKg += slot.stats?.volumeKg || 0;
      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        (weekLifts[lift] ||= []).push(...sets);
      }
      for (const run of slot.runSessions || []) {
        const distance = Math.max(0, parseFloat(run?.dist) || 0);
        if (run?.type === 'walk') {
          walkKm += distance;
          walkCount += 1;
        } else {
          runKm += distance;
          runCount += 1;
        }
      }
    }

    const isFuture = dateISO > todayISO;
    const sessions = counts.get(dateISO) || 0;
    return {
      day,
      dateISO,
      isToday: dateISO === todayISO,
      isFuture,
      isRest: !isFuture && sessions === 0,
      sessions,
      workingSets,
      volumeKg,
      runKm,
      runCount,
      walkKm,
      walkCount,
    };
  });

  const sessions = days.reduce((total, entry) => total + entry.sessions, 0);
  const workingSets = days.reduce((total, entry) => total + entry.workingSets, 0);

  // Elapsed-day matching: a Wednesday is compared with Mon–Wed of last week,
  // never with a full seven days. The week total is still what adherence uses,
  // because "of 4 planned" is a whole-week question.
  const elapsedDays = days.filter((entry) => !entry.isFuture).length || 1;
  const elapsedSessions = sessionsIn(counts, weekStart, elapsedDays);
  const previousStart = /** @type {string} */ (addDaysISO(weekStart, -7));
  const previousSessions = sessionsIn(counts, previousStart, elapsedDays);
  const change = elapsedSessions - previousSessions;

  // Adherence compares like with like: PLANNED DAYS with days that got a
  // session. Comparing total sessions (strength + every run) against planned
  // DAYS produced "10 of 4" and labelled 100 % adherence for a week where the
  // planned lifts were skipped but runs were logged.
  const programDays = options.program?.days && typeof options.program.days === 'object'
    ? options.program.days
    : null;
  const isPlanned = (dayKey) => {
    const blueprint = programDays?.[dayKey];
    if (!blueprint || typeof blueprint !== 'object') return false;
    return !classifyPlannedSession(blueprint).isRest;
  };

  const plannedDays = days.filter((entry) => isPlanned(entry.day));
  const plannedElapsed = plannedDays.filter((entry) => !entry.isFuture);
  const completedPlanned = plannedElapsed.filter((entry) => entry.sessions > 0);
  const adherencePct = plannedElapsed.length
    ? Math.round((completedPlanned.length / plannedElapsed.length) * 100)
    : null;
  const streak = streakWeeks(dates, weekStart);

  return {
    week: { startISO: weekStart, endISO: weekEnd, days, elapsedDays },
    spanLabel: formatWeekRange(weekStart, weekEnd),
    sessions,
    elapsedSessions,
    workingSets,
    // Planned DAYS, and how many of the elapsed ones were trained.
    sessionsPlanned: plannedDays.length || null,
    plannedDaysElapsed: plannedElapsed.length,
    completedPlannedDays: completedPlanned.length,
    adherencePct,
    muscles: buildSessionMuscles(weekLifts),
    streakWeeks: streak.weeks,
    streakAtRisk: streak.atRisk,
    streakBestWeeks: streak.best,
    delta: {
      text: change === 0
        ? `Level with last week at this point`
        : `${change > 0 ? '+' : ''}${change} session${Math.abs(change) === 1 ? '' : 's'} vs last week at this point`,
      tone: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      value: change,
    },
    isPartial: todayISO < weekEnd,
    hasData: sessions > 0,
  };
}