// @ts-check
// =============================================================================
// BLOCK REVIEW (H5, slice 1)
//
// "Is the last four weeks of training working?" — a periodic, read-only review
// of the last four COMPLETED calendar weeks, compared with the four before it:
// sessions, tonnage, per-lift e1RM change and all-time PRs, plus the engine's
// own progress checks.
//
// The review never invents a rule: the progress checks come from
// `buildStallList` (the engine owns the stall decision and its evidence
// sentence). The status is descriptive — it does not order a deload. The
// evidence-gated deload action is a separate slice.
// =============================================================================
import {
  addDaysISO, indexSlotsByDate, localDayKey, weekStartOf,
} from './weekly-aggregate.js';
import { estimatedE1rmForSet } from '../strength/e1rm.js';
import { isValidWorkingSet } from '../set-utils.js';
import { buildStallList } from './stall-list.js';
import { isDeloadWeek } from '../programs/progression.js';

export const BLOCK_WEEKS = 4;

/** @param {number} value */
function round1(value) {
  return Math.round(value * 10) / 10;
}

/** @param {number} value @param {number} previous */
function deltaPct(value, previous) {
  if (!(value > 0) || !(previous > 0)) return null;
  return round1(((value - previous) / previous) * 100);
}

/**
 * @param {any} state
 * @param {{ todayISO?: string, weeks?: number, program?: any, checks?: Array<any> }} [options]
 */
export function buildBlockReview(state, { todayISO, weeks = BLOCK_WEEKS, program = null, checks } = {}) {
  const today = localDayKey(todayISO || new Date());
  if (!today) throw new Error('buildBlockReview: could not resolve today');
  const currentWeekStart = weekStartOf(today);
  const span = Math.max(1, Math.trunc(weeks));
  // The four COMPLETED weeks before this one. A partial week would make a
  // "block" comparison depend on which day it is.
  const startISO = /** @type {string} */ (addDaysISO(currentWeekStart, -7 * span));
  const endISO = /** @type {string} */ (addDaysISO(currentWeekStart, -1));
  const prevStartISO = /** @type {string} */ (addDaysISO(startISO, -7 * span));
  const prevEndISO = /** @type {string} */ (addDaysISO(startISO, -1));

  const index = indexSlotsByDate(state);

  /** @type {Map<string, { name: string, sets: number, best: number, prevBest: number }>} */
  const lifts = new Map();
  const liftFor = (name) => {
    if (!lifts.has(name)) lifts.set(name, { name, sets: 0, best: 0, prevBest: 0 });
    return /** @type {{ name: string, sets: number, best: number, prevBest: number }} */ (lifts.get(name));
  };

  let sessions = 0;
  let workingSets = 0;
  let volumeKg = 0;
  let prevVolumeKg = 0;
  /** @type {Record<string, number>} */
  const weekSessions = {};

  const dateSlots = [...index.allByDate.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [date, slots] of dateSlots) {
    const inBlock = date >= startISO && date <= endISO;
    const inPrevious = date >= prevStartISO && date <= prevEndISO;
    if (!inBlock && !inPrevious) continue;
    for (const slot of slots) {
      const slotSets = slot?.stats?.workingSets || 0;
      if (inBlock) {
        if (slotSets > 0) {
          sessions += 1;
          const week = weekStartOf(date) || date;
          weekSessions[week] = (weekSessions[week] || 0) + 1;
        }
        workingSets += slotSets;
        volumeKg += slot?.stats?.volumeKg || 0;
      } else {
        prevVolumeKg += slot?.stats?.volumeKg || 0;
      }
      for (const [name, sets] of Object.entries(slot?.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const best = estimatedE1rmForSet(name, set);
          if (inBlock) {
            const lift = liftFor(name);
            lift.sets += 1;
            if (best > lift.best) lift.best = best;
          } else if (best > 0) {
            const lift = liftFor(name);
            if (best > lift.prevBest) lift.prevBest = best;
          }
        }
      }
    }
  }

  const weeksWithData = Object.keys(weekSessions).length;
  const rows = [...lifts.values()]
    .filter((lift) => lift.sets > 0)
    .sort((a, b) => b.sets - a.sets || b.best - a.best)
    .map((lift) => ({
      name: lift.name,
      sets: lift.sets,
      bestE1rm: round1(lift.best),
      previousBest: round1(lift.prevBest),
      deltaPct: deltaPct(lift.best, lift.prevBest),
      // A PR is a NEW best over every earlier session, which the all-time prior
      // best below decides — not merely an improvement on the last block.
      isPr: false,
      priorBest: 0,
    }));

  // All-time best before the block, only for the lifts we actually show.
  const shown = rows.slice(0, 6);
  for (const row of shown) {
    let prior = 0;
    for (const [date, slots] of dateSlots) {
      if (date >= startISO) break;
      for (const slot of slots) {
        const sets = slot?.lifts?.[row.name];
        if (!Array.isArray(sets)) continue;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const best = estimatedE1rmForSet(row.name, set);
          if (best > prior) prior = best;
        }
      }
    }
    row.priorBest = round1(prior);
    row.isPr = row.bestE1rm > 0 && row.bestE1rm > row.priorBest;
  }

  const progressChecks = Array.isArray(checks)
    ? checks
    : (program ? buildStallList(state, program) : []);
  const volumeDeltaPct = deltaPct(volumeKg, prevVolumeKg);

  // The deload action always targets the NEXT program week: the review looks
  // back, so rewriting the week already in progress would change logged work.
  const currentProgramWeek = parseInt(state?.currentWeek, 10) || 0;
  const totalWeeks = Number(program?.totalWeeks ?? program?.durationWeeks) || 0;
  const candidateWeek = currentProgramWeek > 0 ? currentProgramWeek + 1 : null;
  const nextWeek = candidateWeek && (!totalWeeks || candidateWeek <= totalWeeks) ? candidateWeek : null;
  const nextModifier = nextWeek ? program?.weeklyVolModifiers?.[String(nextWeek)] : null;
  const nextWeekIsDeload = !!nextModifier && isDeloadWeek(nextModifier);

  let status = 'insufficient';
  if (sessions >= 6 && weeksWithData >= 3) {
    if (progressChecks.length >= 2) status = 'stalled';
    else if (progressChecks.length === 1 || (volumeDeltaPct != null && volumeDeltaPct <= -10)) status = 'mixed';
    else status = 'on_track';
  }

  return {
    weeks: span,
    startISO,
    endISO,
    previousStartISO: prevStartISO,
    previousEndISO: prevEndISO,
    label: `${formatRange(startISO, endISO)}`,
    hasData: sessions > 0,
    sessions,
    weeksWithData,
    workingSets,
    volumeKg: Math.round(volumeKg),
    previousVolumeKg: Math.round(prevVolumeKg),
    volumeDeltaPct,
    lifts: rows,
    progressChecks: progressChecks.map((check) => ({
      lift: check.lift,
      message: check.message,
      target: check.target,
    })),
    status,
    nextWeek,
    nextWeekIsDeload,
    // The write is only offered on strong evidence (the engine's own 2+ checks)
    // and only when there is a next week to change.
    deloadEligible: status === 'stalled' && !!nextWeek,
    headline: summaryLine(status, sessions, weeksWithData, span),
    recommendation: recommendationFor(status, progressChecks, volumeDeltaPct),
  };
}

/** @param {string} startISO @param {string} endISO */
function formatRange(startISO, endISO) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const part = (iso, withYear) => {
    const [year, month, day] = iso.split('-').map(Number);
    return `${day} ${months[month - 1]}${withYear ? ` ${year}` : ''}`;
  };
  const sameYear = startISO.slice(0, 4) === endISO.slice(0, 4);
  return `${part(startISO, !sameYear)} – ${part(endISO, true)}`;
}

/** @param {string} status @param {number} sessions @param {number} weeksWithData @param {number} span */
function summaryLine(status, sessions, weeksWithData, span) {
  if (status === 'insufficient') {
    if (sessions === 0) return 'No strength sessions in this block yet.';
    return `${sessions} strength session${sessions === 1 ? '' : 's'} across ${weeksWithData} of ${span} weeks — not enough for a block review.`;
  }
  return `${sessions} strength sessions across ${weeksWithData} of ${span} weeks.`;
}

/** @param {string} status @param {Array<any>} checks @param {number|null} volumeDeltaPct */
function recommendationFor(status, checks, volumeDeltaPct) {
  if (status === 'insufficient') {
    return 'Log at least six strength sessions across three weeks to make this review meaningful.';
  }
  const volume = volumeDeltaPct == null
    ? 'Tonnage has no comparable prior block.'
    : `Tonnage is ${volumeDeltaPct > 0 ? 'up' : volumeDeltaPct < 0 ? 'down' : 'flat'} ${Math.abs(volumeDeltaPct)}% against the previous block.`;
  if (status === 'stalled') {
    return `${volume} ${checks.length} lifts are on progress checks — review next week’s plan before adding load.`;
  }
  if (status === 'mixed') {
    return `${volume} Keep the plan steady and review recovery before changing anything.`;
  }
  return `${volume} Estimated strength held or improved across the block.`;
}
