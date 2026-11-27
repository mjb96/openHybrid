// @ts-check
// =============================================================================
// PROGRESS LANDING MODEL (js/analytics/progress-landing.js)
//
// What remains of the retired "four domains" landing: the two pieces the app
// still uses, and one honest flag.
//
//   • plannedTrainingDays — the canonical count of authored training days, used
//     by Week in Review's adherence line.
//   • buildRecentWeekSeries — the dated weekly series the training-context
//     export reads.
//   • buildProgressLanding — only `allEmpty`, so the hub can lead with one
//     honest empty state. The four domain cards were retired in P8a; their
//     duplicate consistency/strength/running/recovery models, the old
//     sessions-vs-planned-days adherence formula and the secondary-link list
//     were deleted rather than left as a trap.
//
// Every period here is a CALENDAR week (never state.currentWeek, which is a
// program-week counter that only advances on an explicit step).
// =============================================================================

import {
  addDaysISO, DAY_KEYS, gymTimeIsSession, indexSlotsByDate, loggedSessionsByDate, weekStartOf,
} from './weekly-aggregate.js';
import { classifyPlannedSession } from '../workout/completion-policy.js';

/**
 * How many days of an authored program week are training days.
 *
 * Uses the SAME classifier the Today card, coach and cockpit use rather than a
 * second reading of `day.runs` — otherwise Progress could tell you a session is
 * planned on a day Home calls a rest day. Returns null (not 0) when there is no
 * usable program, so callers can drop the "of N planned" framing entirely
 * instead of claiming a plan of zero sessions.
 *
 * @param {any} program
 * @returns {number|null}
 */
export function plannedTrainingDays(program) {
  const days = program?.days;
  if (!days || typeof days !== 'object') return null;
  let n = 0;
  for (const key of DAY_KEYS) {
    const day = days[key];
    if (!day || typeof day !== 'object') continue;
    if (!classifyPlannedSession(day).isRest) n++;
  }
  return n > 0 ? n : null;
}

/** @param {any} slot */
function slotSessionCount(slot) {
  const strength = ((slot?.stats?.workingSets || 0) > 0 || gymTimeIsSession(slot)) ? 1 : 0;
  const runs = Array.isArray(slot?.runSessions) ? slot.runSessions.length : 0;
  return strength + runs;
}

/** @param {any} slot */
function slotDistanceKm(slot) {
  if (Array.isArray(slot?.runSessions) && slot.runSessions.length) {
    return slot.runSessions.reduce((sum, run) => sum + (parseFloat(run?.dist) || 0), 0);
  }
  return parseFloat(slot?.run?.dist) || 0;
}

/**
 * The last N calendar weeks, oldest → newest. One pass over the canonical date
 * index so a dated export and the History calendar cannot disagree.
 *
 * @param {any} state
 * @param {string} weekStartISO
 * @param {number} [weeks]
 * @param {ReturnType<typeof indexSlotsByDate>|null} [index]
 */
export function buildRecentWeekSeries(state, weekStartISO, weeks = 12, index = null) {
  const idx = index || indexSlotsByDate(state);
  const earliest = /** @type {string} */ (addDaysISO(weekStartISO, -(weeks - 1) * 7));
  const byWeek = new Map();
  for (let i = 0; i < weeks; i++) {
    const key = /** @type {string} */ (addDaysISO(earliest, i * 7));
    byWeek.set(key, { weekStart: key, sessions: 0, volumeKg: 0, distanceKm: 0 });
  }
  for (const [date, slots] of idx.allByDate) {
    if (date < earliest || date > addDaysISO(weekStartISO, 6)) continue;
    const key = weekStartOf(date);
    const entry = byWeek.get(key);
    if (!entry) continue;
    for (const slot of slots) {
      entry.sessions += slotSessionCount(slot);
      entry.volumeKg += slot.stats?.volumeKg || 0;
      entry.distanceKm += slotDistanceKm(slot);
    }
  }
  return [...byWeek.values()].map((entry) => ({
    ...entry,
    volumeKg: Math.round(entry.volumeKg),
    distanceKm: Math.round(entry.distanceKm * 10) / 10,
  }));
}

/**
 * The hub contract: is anything logged at all? The hub then leads with one
 * honest empty state instead of a wall of dashes. Trained dates are counted by
 * their real stamped date, so imported/archived work is real work.
 *
 * @param {any} state
 * @returns {{ allEmpty: boolean }}
 */
export function buildProgressLanding(state) {
  return { allEmpty: loggedSessionsByDate(state).dates.size === 0 };
}
