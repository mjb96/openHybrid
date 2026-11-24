// @ts-check
// =============================================================================
// SESSION PREVIEW (js/workout/session-preview.js)
//
// One resolver for "what is in today's session?" used by the Train landing and
// Home's Today card. It reads the SAME liftTarget the cockpit uses and the SAME
// dated exercise history the logger reads, so the preview cannot promise a
// prescription or a last-time number the workout screen will not honour.
// =============================================================================

import { getWeekModifier } from '../schema.js';
import { liftTarget } from '../engine.js';
import { getExerciseNote } from './exercise-config.js';
import { latestExercisePerformance } from './exercise-history.js';

/**
 * @typedef {{
 *   name: string,
 *   sets: number,
 *   reps: string,
 *   weight: number|null,
 *   note: string,
 *   last: { weight: number, reps: number, date: string }|null,
 * }} SessionExercise
 */

/**
 * @param {any} state
 * @param {any} program
 * @param {string} day
 * @returns {SessionExercise[]}
 */
export function sessionExercisePreview(state, program, day) {
  const blueprint = program?.days?.[day];
  const lifts = Array.isArray(blueprint?.lifts) ? blueprint.lifts : [];
  if (!lifts.length) return [];
  const week = String(state?.currentWeek || '1');
  const modifier = getWeekModifier(program, week);
  return lifts.map((name) => {
    const target = liftTarget(blueprint?.desc, name, modifier, { program, week, dayKey: day });
    const last = latestExercisePerformance(state, String(name));
    return {
      name: String(name),
      sets: Number(target?.sets) || 0,
      reps: target?.reps == null ? '' : String(target.reps),
      weight: Number.isFinite(Number(target?.weight)) && Number(target.weight) > 0
        ? Number(target.weight)
        : null,
      note: getExerciseNote(state, name),
      // The heaviest/e1RM-best set from the most recent dated session. Holds and
      // carries have no comparable weight×rep line, so they stay out of the
      // compact Home preview rather than inventing a number.
      last: last && Number(last.weight) > 0 && Number(last.reps) > 0
        ? { weight: Number(last.weight), reps: Number(last.reps), date: last.date }
        : null,
    };
  });
}
