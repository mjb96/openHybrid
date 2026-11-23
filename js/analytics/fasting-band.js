// @ts-check
// =============================================================================
// FASTING BAND MODEL (js/analytics/fasting-band.js)
//
// "Is my fasting on plan?" — completed fasts in the selected window measured
// against the athlete's OWN goal.
//
// Copy rule, non-negotiable: this reports elapsed time against a self-set target.
// No autophagy, fat-loss, hormone or medical claim, and no physiological stage
// interpretation. A fast is a duration the athlete chose; that is all it is.
// =============================================================================
import { localDayKey } from '../dates.js';
import { computeFastingAnalytics } from '../fasting/fasting-calcs.js';
import { inRange } from './ranges.js';

const MAX_ROWS = 14;
const round1 = (value) => Math.round(value * 10) / 10;

/**
 * @param {any} state
 * @param {{ range: any }} options
 */
export function buildFastingBandModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildFastingBandModel: range is required');

  const session = state?.fastingSession || {};
  const history = Array.isArray(session.history) ? session.history : [];
  const goalHours = Number(session.goal) > 0 ? Number(session.goal) : 16;

  const inWindow = history
    .map((entry) => {
      const dateISO = localDayKey(entry?.endTime || entry?.startTime || '');
      // `js/fasting.js` stores `durationHours`; the `hours` fallback keeps any
      // older record readable. Reading only `hours` made EVERY fast invalid, so
      // the band never rendered anywhere — the fixture in the test used a shape
      // nothing in the app writes.
      const hours = Number(entry?.durationHours ?? entry?.hours);
      if (!dateISO || !Number.isFinite(hours) || hours <= 0) return null;
      // The goal is judged against the goal that applied TO THAT FAST, not
      // today's setting: moving 16 h to 18 h must not retroactively relabel
      // every historical 17 h fast as missed.
      const goalForFast = Number(entry?.goalHours) > 0 ? Number(entry.goalHours) : goalHours;
      return { dateISO, hours: round1(hours), metGoal: hours >= goalForFast };
    })
    .filter(Boolean)
    .filter((entry) => inRange(entry.dateISO, range))
    .sort((a, b) => (a.dateISO < b.dateISO ? -1 : a.dateISO > b.dateISO ? 1 : 0));

  if (!inWindow.length) {
    return {
      range, goalHours, fasts: [], averageHours: null, adherencePct: null,
      streak: 0, longestHours: null, totalHours: 0, hasData: false,
    };
  }

  const total = inWindow.reduce((sum, entry) => sum + entry.hours, 0);
  const met = inWindow.filter((entry) => entry.metGoal).length;
  // The streak is inherently all-time: it counts consecutive days up to today.
  const analytics = computeFastingAnalytics(state);

  return {
    range,
    goalHours,
    // The chart shows the most recent fasts inside the window; the stats below
    // describe the whole window, so the caption says which is which.
    fasts: inWindow.slice(-MAX_ROWS),
    windowCount: inWindow.length,
    averageHours: round1(total / inWindow.length),
    adherencePct: Math.round((met / inWindow.length) * 100),
    streak: Number(analytics?.currentStreak) || 0,
    longestHours: round1(Math.max(...inWindow.map((entry) => entry.hours))),
    totalHours: round1(total),
    hasData: true,
  };
}
