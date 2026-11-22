// @ts-check
// =============================================================================
// SESSION REVIEW — what the athlete actually achieved, at the moment of finishing.
//
// The finish sheet showed Total Volume and Sets Completed and then asked for
// duration and RPE: three inputs and two numbers, which reads as a form to
// complete rather than a session to review. Nothing told the athlete they had
// just hit a best.
//
// Worse, it could not have: `updateExercisePRs()` runs INSIDE the finish
// handler, after the sheet has already been populated and as it is closing. So
// the one moment the athlete is looking at the screen and cares most was the one
// moment the app had nothing to say.
//
// This is the pure model behind that review. No DOM, no state mutation.
//
// It reuses the canonical strength primitives rather than recomputing anything:
// `isValidWorkingSet` (warm-ups and zero-rep sets are not training) and the
// shared shape-aware records model (`recordKindForSet` / `bestRecordForSession`
// / `bestRecordBefore` / `isRecord`). That model refuses bodyweight/assisted/band
// work instead of fabricating a load, uses the shared 0.5 e1RM epsilon, treats a
// first-ever log as a BASELINE, and compares holds with holds and carries with
// carries. A "new best" here that the cockpit does not also show would be worse
// than showing nothing.
// =============================================================================
import { isValidWorkingSet, setVolume } from '../set-utils.js';
import {
  bestRecordBefore, bestRecordForSession, isRecord, prKindLabel,
  recordCandidates, recordPreviousValue,
} from '../strength/records.js';

/**
 * Build the review for one finished session.
 *
 * @param {any} state
 * @param {{ weekKey: string|number, day: string, liftNames?: string[] }} opts
 * @returns {{
 *   volume: number,
 *   workingSets: number,
 *   exercisesWorked: number,
 *   highlights: Array<{ lift: string, kind: string, label: string, value: number,
 *     e1rm: number, load: number, previousBest: number, delta: number }>,
 * }}
 */
export function buildSessionReview(state, opts = /** @type {any} */ ({})) {
  const { weekKey, day } = opts;
  const week = state?.weeks?.[String(weekKey)];
  const dayLifts = week?.lifts?.[day] || {};

  // When the caller knows which lifts belong to THIS session (the cockpit does —
  // a day's stored lifts can include work from a swapped-out exercise), honour
  // it. Otherwise review everything logged on the day.
  const names = Array.isArray(opts.liftNames) && opts.liftNames.length
    ? opts.liftNames.filter((name) => Array.isArray(dayLifts[name]))
    : Object.keys(dayLifts).filter((name) => Array.isArray(dayLifts[name]));

  let volume = 0;
  let workingSets = 0;
  let exercisesWorked = 0;
  const highlights = [];

  for (const lift of names) {
    const sets = dayLifts[lift];
    let liftSets = 0;
    for (const set of sets) {
      if (!isValidWorkingSet(set)) continue;   // warm-ups and 0-rep rows are not training
      volume += setVolume(set);
      liftSets++;
    }
    if (!liftSets) continue;
    workingSets += liftSets;
    exercisesWorked++;

    const sessionBest = bestRecordForSession(lift, sets);
    const previous = bestRecordBefore(state, lift, {
      excludeWeekKey: weekKey,
      excludeDay: day,
      beforeDate: week?.dates?.[day],
    });
    // Every record the session earned, including each rep load bucket. A
    // session that set 60×20 and also trained 80 kg must not have its 60 kg
    // record hidden behind the heavier bucket.
    for (const candidate of recordCandidates(sessionBest)) {
      const kind = candidate.kind;
      if (!isRecord(kind, candidate, previous[kind])) continue;
      const prior = recordPreviousValue(kind, candidate, previous[kind]);
      highlights.push({
        lift,
        kind,
        label: prKindLabel(kind),
        value: candidate.value,
        // `e1rm`/`delta` stay for the existing finish-sheet contract; a hold or
        // carry carries no estimated 1RM, so its weight figure is deliberately 0.
        e1rm: kind === 'e1rm' ? candidate.value : 0,
        load: candidate.load,
        previousBest: prior,
        delta: candidate.value - prior,
      });
    }
  }

  // Biggest gain first — if only one line is ever read, it should be the best one.
  highlights.sort((a, b) => b.delta - a.delta || a.lift.localeCompare(b.lift));

  return { volume, workingSets, exercisesWorked, highlights };
}

/**
 * One plain sentence for the review, or '' when there is nothing honest to say.
 *
 * Deliberately silent rather than encouraging when no best was set: most good
 * sessions are not PR sessions, and inventing praise for every one of them
 * teaches the athlete to ignore the line that matters.
 *
 * @param {{highlights: Array<{lift:string, delta:number, kind?:string}>}} review
 * @param {(value:number)=>string} formatWeight
 */
export function reviewHighlightLine(review, formatWeight = (v) => String(Math.round(v))) {
  const highlights = review?.highlights || [];
  if (!highlights.length) return '';
  const [first] = highlights;
  const gain = `+${formatWeight(first.delta)}`;
  const unit = first?.kind === 'hold' ? 's hold'
    : first?.kind === 'carry' ? 'm carry'
      : first?.kind === 'reps' ? ' reps at this load'
        : ' estimated 1RM';
  if (highlights.length === 1) return `New best: ${first.lift} (${gain}${unit})`;
  return `New best: ${first.lift} (${gain}) and ${highlights.length - 1} more`;
}
