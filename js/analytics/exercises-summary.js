// @ts-check
// =============================================================================
// MAIN EXERCISES MODEL (js/analytics/exercises-summary.js)
//
// "What am I actually doing?" — the exercises the athlete trained most in the
// selected window, with their best estimated 1RM, the change across the window
// and whether that best is an all-time PR.
//
// e1RM is never re-derived: `estimatedE1rmForSet` owns the formula, and aliases
// resolve through `resolveExercise` so two stored names for one lift are one row.
// The PR flag compares the window's best against the ALL-TIME best for the same
// exercise, which is why the scan covers every date and only then filters.
// =============================================================================
import { estimatedE1rmForSet } from '../strength/e1rm.js';
import { resolveExercise } from '../exercises/catalog.js';
import { isValidWorkingSet } from '../set-utils.js';
import { inRange } from './ranges.js';
import { indexSlotsByDate, weekStartOf } from './weekly-aggregate.js';

const MIN_ROWS = 3;

/**
 * @param {any} state
 * @param {{
 *   range: any,
 *   unit?: string,
 * }} options
 */
export function buildExerciseSummaryModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildExerciseSummaryModel: range is required');
  const unit = options.unit === 'lbs' ? 'lbs' : 'kg';

  const index = indexSlotsByDate(state);
  /** @type {Map<string, any>} */
  const stats = new Map();

  for (const [dateISO, slots] of index.allByDate) {
    for (const slot of slots) {
      for (const [liftName, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        const working = sets.filter(isValidWorkingSet);
        if (!working.length) continue;

        const canonical = resolveExercise(liftName);
        const id = canonical?.id || `custom:${liftName}`;
        const name = canonical?.name || liftName;

        let entry = stats.get(id);
        if (!entry) {
          entry = {
            liftId: id,
            lift: name,
            allTimeBest: 0,
            sessionDates: new Set(),
            sets: 0,
            best: 0,
            first: 0,
            firstDate: null,
            latest: 0,
            lastDate: null,
            series: new Map(),
          };
          stats.set(id, entry);
        }

        let sessionBest = 0;
        for (const set of working) {
          const estimate = estimatedE1rmForSet(liftName, set);
          if (estimate > sessionBest) sessionBest = estimate;
        }
        if (sessionBest > entry.allTimeBest) entry.allTimeBest = sessionBest;

        // Everything below is window-scoped; the all-time best above is not.
        if (!inRange(dateISO, range)) continue;
        entry.sessionDates.add(dateISO);
        entry.sets += working.length;
        if (sessionBest > entry.best) entry.best = sessionBest;
        if (!entry.firstDate || dateISO < entry.firstDate) {
          entry.firstDate = dateISO;
          entry.first = sessionBest;
        }
        if (!entry.lastDate || dateISO > entry.lastDate) {
          entry.lastDate = dateISO;
          entry.latest = sessionBest;
        }
        const week = weekStartOf(dateISO);
        if (week) entry.series.set(week, Math.max(entry.series.get(week) || 0, sessionBest));
      }
    }
  }

  const rows = [...stats.values()]
    .filter((entry) => entry.sessionDates.size > 0)
    .map((entry) => {
      const deltaPct = entry.first > 0
        ? Math.round(((entry.best - entry.first) / entry.first) * 1000) / 10
        : null;
      const series = [...entry.series.entries()]
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([weekISO, e1rm]) => ({ weekISO, e1rm: Math.round(e1rm * 10) / 10 }));
      return {
        lift: entry.lift,
        liftId: entry.liftId,
        sessions: entry.sessionDates.size,
        sets: entry.sets,
        bestE1rm: Math.round(entry.best * 10) / 10,
        latestE1rm: Math.round(entry.latest * 10) / 10,
        deltaPct,
        lastPerformedISO: entry.lastDate,
        // A PR only when the window's best IS the all-time best for this lift.
        prFlag: entry.best > 0 && entry.allTimeBest > 0 && entry.best >= entry.allTimeBest - 0.01,
        series,
      };
    })
    .sort((a, b) => b.sessions - a.sessions || b.sets - a.sets || a.lift.localeCompare(b.lift));

  return {
    range,
    unit,
    rows,
    // Three exercises with at least one repeated session is the threshold where
    // this answers a question. Below it, the band would be a list of one-offs.
    hasData: rows.length >= MIN_ROWS && rows.some((row) => row.sessions >= 2),
  };
}
