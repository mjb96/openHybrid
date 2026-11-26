// @ts-check
// =============================================================================
// REP-RANGE AND INTENSITY MIX (A4)
//
// "What kind of work am I actually doing?" — the share of completed working
// sets by rep range and by recorded effort (RIR, or RPE converted by the shared
// effort owner). Holds and carries have no reps, so they are excluded from the
// rep mix but still count for effort when rated.
//
// This is descriptive: the goal line states the observed mix against what that
// goal emphasises, and never prescribes a rep scheme.
// =============================================================================
import { isValidWorkingSet } from '../set-utils.js';
import { effortForSet } from '../workout/effort.js';
import { inRange } from './ranges.js';
import { indexSlotsByDate } from './weekly-aggregate.js';
import { allocatePercentages } from './percent.js';

export const REP_BANDS = Object.freeze([
  { key: 'max', label: '1–3', min: 1, max: 3 },
  { key: 'strength', label: '4–6', min: 4, max: 6 },
  { key: 'hypertrophy', label: '7–12', min: 7, max: 12 },
  { key: 'endurance', label: '13+', min: 13, max: Infinity },
]);

export const EFFORT_BANDS = Object.freeze([
  { key: 'max', label: 'RIR 0–1', test: (rir) => rir <= 1 },
  { key: 'hard', label: 'RIR 2–3', test: (rir) => rir > 1 && rir <= 3 },
  { key: 'moderate', label: 'RIR 4+', test: (rir) => rir > 3 },
]);

/** @param {number} reps */
function repBandKey(reps) {
  return REP_BANDS.find((band) => reps >= band.min && reps <= band.max)?.key || 'endurance';
}

/** @param {string} goal @param {Record<string, number>} repShare */
function goalFit(goal, repShare) {
  const low = (repShare.max || 0) + (repShare.strength || 0);
  const mid = repShare.hypertrophy || 0;
  if (goal === 'strength') {
    return low >= 50
      ? { tone: 'ok', text: `Most working sets (${low}%) sit in the 1–6 strength range.` }
      : { tone: 'note', text: `Most sets are above 6 reps — the 1–6 strength range is ${low}%.` };
  }
  if (goal === 'hybrid') {
    return low + mid >= 80
      ? { tone: 'ok', text: `${low}% of sets are 1–6 and ${mid}% are 7–12 — strength and hypertrophy lead the mix.` }
      : { tone: 'note', text: `${repShare.endurance || 0}% of sets are 13+ reps; the 1–12 working ranges hold ${low + mid}%.` };
  }
  return {
    tone: 'note',
    text: `Lifting mix: ${low}% at 1–6 and ${mid}% at 7–12 reps. Endurance work is measured in the Endurance band.`,
  };
}

/**
 * @param {any} state
 * @param {{ range: any, goal?: string }} options
 */
export function buildIntensityMix(state, { range, goal = 'hybrid' } = /** @type {any} */ ({})) {
  if (!range) throw new Error('buildIntensityMix: range is required');
  const index = indexSlotsByDate(state);

  /** @type {Record<string, number>} */
  const repCounts = Object.fromEntries(REP_BANDS.map((band) => [band.key, 0]));
  /** @type {Record<string, number>} */
  const effortCounts = Object.fromEntries(EFFORT_BANDS.map((band) => [band.key, 0]));
  let totalRepSets = 0;
  let ratedSets = 0;
  let unratedSets = 0;

  for (const [dateISO, slots] of index.allByDate) {
    if (!inRange(dateISO, range)) continue;
    for (const slot of slots) {
      for (const sets of Object.values(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const reps = parseInt(set?.r, 10) || 0;
          if (reps > 0) {
            repCounts[repBandKey(reps)] += 1;
            totalRepSets += 1;
          }
          const effort = effortForSet(set);
          if (effort.rated) {
            const band = EFFORT_BANDS.find((entry) => entry.test(effort.rir));
            if (band) { effortCounts[band.key] += 1; ratedSets += 1; }
          } else {
            unratedSets += 1;
          }
        }
      }
    }
  }

  const repShare = allocatePercentages(repCounts, totalRepSets);
  const effortShare = allocatePercentages(effortCounts, ratedSets);
  const repBands = REP_BANDS.map((band) => ({
    key: band.key, label: band.label, count: repCounts[band.key], sharePct: repShare[band.key] || 0,
  }));
  const effortBands = EFFORT_BANDS.map((band) => ({
    key: band.key, label: band.label, count: effortCounts[band.key], sharePct: effortShare[band.key] || 0,
  }));

  return {
    range,
    goal,
    totalRepSets,
    ratedSets,
    unratedSets,
    repBands,
    effortBands,
    // Small samples are shown as counts elsewhere; the mix needs a handful of
    // sets before percentages mean anything.
    hasRepMix: totalRepSets >= 5,
    hasEffortMix: ratedSets >= 3,
    goalFit: totalRepSets >= 5 ? goalFit(goal, repShare) : null,
  };
}
