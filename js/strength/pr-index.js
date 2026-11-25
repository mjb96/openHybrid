// @ts-check
// =============================================================================
// E1RM PR INDEX (js/strength/pr-index.js)
//
// ONE all-time, date-strict reader for estimated-1RM PR events, shared by the
// annual recap and the Records table/feed (PG6). A PR is a DATE that beats every
// earlier date for the same canonical lift; the first-ever date is a baseline,
// a tie is not a record (`isE1rmPr` owns the epsilon), and two sessions on one
// date contribute one event (the best of both).
// =============================================================================
import { E1RM_PR_EPSILON, estimatedE1rmForSet, isE1rmPr } from './e1rm.js';
import { isValidWorkingSet } from '../set-utils.js';
import { resolveExercise } from '../exercises/catalog.js';
import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';

/**
 * @param {Map<string, any[]>} allByDate deduplicated slot index
 * @param {{ year?: number|string|null }} [options]
 * @returns {Array<{ lift: string, e1rm: number, date: string, previousBest: number }>}
 *   Date-ascending events (unsorted for display; callers choose a presentation
 *   order). `year` filters which events are RETURNED, not the running baseline:
 *   a 2025 best still sets the bar for 2026's first record.
 */
export function collectE1rmPrEvents(allByDate, { year = null } = {}) {
  /** @type {Map<string, Map<string, number>>} canonical lift → (date → best e1RM) */
  const bestByLiftDate = new Map();

  for (const [date, slots] of allByDate || []) {
    for (const slot of slots || []) {
      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        let best = 0;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const estimate = estimatedE1rmForSet(lift, set);
          if (estimate > best) best = estimate;
        }
        if (best <= 0) continue;
        const identity = resolveExercise(lift)?.name || lift;
        const dates = bestByLiftDate.get(identity) || new Map();
        if (best > (dates.get(date) || 0)) dates.set(date, best);
        bestByLiftDate.set(identity, dates);
      }
    }
  }

  const prefix = year == null ? null : `${year}-`;
  const events = [];
  for (const [lift, dates] of bestByLiftDate) {
    const ordered = [...dates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let priorBest = 0;
    for (const [date, best] of ordered) {
      if ((prefix == null || date.startsWith(prefix)) && isE1rmPr(best, priorBest)) {
        events.push({
          lift,
          e1rm: Math.round(best * 10) / 10,
          date,
          previousBest: Math.round(priorBest * 10) / 10,
        });
      }
      if (best > priorBest) priorBest = best;
    }
  }
  return events;
}

/**
 * The all-time table plus the dated feed. Both come from the same scan, so the
 * feed can never contradict the table.
 * @param {any} state
 * @param {{ feedLimit?: number }} [options]
 */
export function buildRecordIndex(state, { feedLimit = 60 } = {}) {
  const allByDate = indexSlotsByDate(state).allByDate;
  const allEvents = collectE1rmPrEvents(allByDate);

  /** @type {Map<string, any>} */
  const byLift = new Map();
  for (const [date, slots] of allByDate) {
    for (const slot of slots || []) {
      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        let best = 0;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const estimate = estimatedE1rmForSet(lift, set);
          if (estimate > best) best = estimate;
        }
        if (best <= 0) continue;
        const identity = resolveExercise(lift)?.name || lift;
        const row = byLift.get(identity) || { lift: identity, bestE1rm: 0, bestDate: null, prCount: 0 };
        if (best > row.bestE1rm) {
          row.bestE1rm = best;
          row.bestDate = date;
        }
        row.prCount += 0;
        byLift.set(identity, row);
      }
    }
  }
  for (const event of allEvents) {
    const row = byLift.get(event.lift);
    if (row) row.prCount += 1;
  }

  const rows = [...byLift.values()]
    .map((row) => ({ ...row, bestE1rm: Math.round(row.bestE1rm * 10) / 10 }))
    .sort((a, b) => b.bestE1rm - a.bestE1rm || a.lift.localeCompare(b.lift));
  const feed = [...allEvents].sort((a, b) => b.date.localeCompare(a.date) || b.lift.localeCompare(a.lift));
  return {
    rows,
    feed: feed.slice(0, feedLimit),
    feedTotal: feed.length,
    hasData: rows.length > 0,
    epsilon: E1RM_PR_EPSILON,
  };
}
