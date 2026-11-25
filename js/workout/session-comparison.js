// @ts-check
// =============================================================================
// SESSION VS LAST TIME (A5)
//
// The recap already compares each LIFT with its own prior history. This adds
// the SESSION-level answer: how does this workout compare with the last time the
// athlete did the SAME workout — the same routine when the session came from the
// routine library, otherwise the same programmed day.
//
// Only completed working sets count. A run is not compared here (pace/HR have
// their own surfaces), and a session with no strength work returns null.
// =============================================================================
import { isValidWorkingSet, setVolume } from '../set-utils.js';
import { estimatedE1rmForSet } from '../strength/e1rm.js';

/**
 * @param {any} lifts day → lift → sets
 * @returns {{ volume: number, sets: number, bestE1rm: number }}
 */
export function strengthTotals(lifts) {
  let volume = 0;
  let sets = 0;
  let bestE1rm = 0;
  for (const [name, list] of Object.entries(lifts || {})) {
    if (!Array.isArray(list)) continue;
    for (const set of list) {
      if (!isValidWorkingSet(set)) continue;
      sets += 1;
      volume += setVolume(set);
      const e1rm = estimatedE1rmForSet(name, set);
      if (e1rm > bestE1rm) bestE1rm = e1rm;
    }
  }
  return { volume: Math.round(volume), sets, bestE1rm: Math.round(bestE1rm * 10) / 10 };
}

/**
 * Find the last completed session of the same workout before this one.
 * @param {any} state
 * @param {string} weekKey
 * @param {string} day
 * @param {{ dateISO?: string|null, volume: number, sets: number, bestE1rm: number, prs?: number }} current
 */
export function buildSessionComparison(state, weekKey, day, current) {
  const wd = state?.weeks?.[weekKey] || {};
  if (!current || current.sets <= 0) return null;
  const routineId = wd.sourceRoutineId || null;
  const programId = wd.programId || null;
  const currentDate = current.dateISO || null;

  let best = null;
  for (const [key, week] of Object.entries(state?.weeks || {})) {
    if (key === weekKey || !week) continue;
    if (routineId) {
      if (week.sourceRoutineId !== routineId) continue;
    } else {
      if (!programId || week.programId !== programId) continue;
    }
    const prevDay = routineId ? (week.sessionDay || day) : day;
    const date = week.dates?.[prevDay];
    if (!date || (currentDate && date >= currentDate)) continue;
    const totals = strengthTotals(week.lifts?.[prevDay]);
    if (!totals.sets) continue;
    if (!best || date > best.date) best = { date, ...totals };
  }
  if (!best) return null;

  const volumeDelta = current.volume - best.volume;
  const volumePct = best.volume > 0 ? Math.round((volumeDelta / best.volume) * 1000) / 10 : null;
  const bestDelta = current.bestE1rm > 0 && best.bestE1rm > 0
    ? Math.round((current.bestE1rm - best.bestE1rm) * 10) / 10
    : null;
  return {
    previousDate: best.date,
    previousVolume: best.volume,
    previousSets: best.sets,
    previousBestE1rm: best.bestE1rm,
    volumeDelta,
    volumePct,
    setsDelta: current.sets - best.sets,
    bestDelta,
    prs: Math.max(0, Number(current.prs) || 0),
    sameWorkout: routineId ? 'routine' : 'day',
  };
}
