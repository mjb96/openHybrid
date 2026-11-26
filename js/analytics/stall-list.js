// @ts-check
// =============================================================================
// STALL LIST (A1)
//
// The cockpit already explains a PROGRESS CHECK. This is the analytics list of
// the same fact, for the ACTIVE programme only, because `computeDiagnosticForLift`
// is deliberately scoped to one activation + workout day. Nothing is re-derived:
// the engine owns the stall decision and its evidence sentence.
// =============================================================================
import { computeDiagnosticForLift, liftTarget, repGoalFromTarget } from '../engine.js';
import { getWeekModifier } from '../schema.js';
import { resolveExercise } from '../exercises/catalog.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * @param {any} state
 * @param {any} program
 * @returns {Array<{ lift: string, liftId: string, day: string, target: string, message: string }>}
 */
export function buildStallList(state, program) {
  if (!state || !program?.days) return [];
  const week = state.currentWeek;
  const modifier = getWeekModifier(program, week);
  /** @type {Array<any>} */
  const out = [];
  for (const day of DAYS) {
    const lifts = program.days?.[day]?.lifts;
    if (!Array.isArray(lifts)) continue;
    for (const lift of lifts) {
      if (!lift) continue;
      try {
        const target = liftTarget(program.days?.[day]?.desc, lift, modifier, {
          program, week, dayKey: day,
        });
        const diagnostic = computeDiagnosticForLift(
          week, day, lift, Number(repGoalFromTarget(target?.reps)) || 0,
          { progressionStyle: program.progressionStyle },
        );
        if (!diagnostic?.isStalled) continue;
        out.push({
          lift,
          liftId: resolveExercise(lift)?.id || lift,
          day,
          target: `${target?.sets || 0} × ${target?.reps == null ? '' : target.reps}`,
          message: diagnostic.message || `${lift} has not improved — hold the load and review recovery.`,
        });
      } catch {
        // A diagnostic is advisory: one bad lift must not empty the list.
      }
    }
  }
  return out;
}
