// @ts-check
// =============================================================================
// HOME STRENGTH INSIGHT (js/home/strength-insight.js)
//
// HM4: Home carries ONE "because" line, and when it comes from strength data it
// must not contradict the plan or a recovery/safety warning.
//
// Precedence is explicit:
//   1. a safety/recovery warning (or the overtraining escalation on screen)
//      keeps the coach line — a strength nudge never talks over it;
//   2. a deload week tells the athlete to keep loads light;
//   3. a stalled planned lift says hold the load and review recovery;
//   4. otherwise the generic dashboard insight is used.
//
// The stall DECISION is not re-derived here: it comes from
// computeDiagnosticForLift, the same owner the cockpit badge uses. This module
// only gathers the plan context and picks the single line.
// =============================================================================
import { getProgramById } from '../state.js';
import { getWeekModifier } from '../schema.js';
import { computeDiagnosticForLift, liftTarget, repGoalFromTarget } from '../engine.js';

/** @typedef {{ text: string, tone: string, nav: string }} Insight */
/** @typedef {{ lifts?: string[], deload?: boolean, stalledLift?: string|null }} DayInput */

/**
 * A planned deload week is labelled "Deload week". Conditional labels such as
 * "Deload if stalling — reset 10%" describe a rule, not this week's intent.
 * @param {unknown} label
 */
export function isDeloadWeek(label) {
  const value = String(label || '').trim();
  if (/^deload\s+if\b/i.test(value)) return false;
  return /^deload\b/i.test(value);
}

/**
 * Pure: the strength line for one day, or null when there is nothing to say.
 * @param {DayInput} [input]
 * @returns {Insight|null}
 */
export function strengthInsightForDay({ lifts = [], deload = false, stalledLift = null } = {}) {
  if (!Array.isArray(lifts) || lifts.length === 0) return null;
  if (deload) {
    return {
      text: 'Deload week — keep the loads light and let the work settle.',
      tone: 'neutral',
      nav: 'progress',
    };
  }
  if (stalledLift) {
    return {
      text: `${stalledLift} is stalling — hold the load today and review recovery.`,
      tone: 'caution',
      nav: 'progress',
    };
  }
  return null;
}

/**
 * Pure: a strength line may replace a generic insight, never a warning.
 * A safety flag (the overtraining card is on screen) suppresses it entirely.
 * @param {Insight|null|undefined} topInsight
 * @param {Insight|null|undefined} strengthInsight
 * @param {{ safetyActive?: boolean }} [options]
 * @returns {Insight|null}
 */
export function chooseHomeInsight(topInsight, strengthInsight, { safetyActive = false } = {}) {
  if (!topInsight) return strengthInsight || null;
  if (safetyActive) return topInsight;
  if (topInsight.tone === 'warning' || topInsight.tone === 'caution') return topInsight;
  return strengthInsight || topInsight;
}

/** @param {any} slot @param {any} program @param {string} day */
function liftNamesForDay(slot, program, day) {
  const logged = slot?.lifts?.[day];
  if (logged && typeof logged === 'object') {
    const names = Object.keys(logged).filter((name) => Array.isArray(logged[name]));
    if (names.length) return names;
  }
  const planned = program?.days?.[day]?.lifts;
  return Array.isArray(planned) ? planned.filter((name) => typeof name === 'string' && name.trim()) : [];
}

/** @param {string} desc @param {string} liftName @param {any} modifier @param {any} program @param {string|number} week @param {string} day */
function targetFor(desc, liftName, modifier, program, week, day) {
  try {
    const target = liftTarget(desc, liftName, modifier, { program, week, dayKey: day });
    return Number(repGoalFromTarget(target?.reps)) || 0;
  } catch {
    return 0;
  }
}

/**
 * Gather the real plan context and defer the decision to the pure selector.
 * @param {any} state
 * @param {any} model
 * @param {{ safetyActive?: boolean, selectedDay?: string }} [options]
 * @returns {Insight|null}
 */
export function buildStrengthInsight(state, model, { safetyActive = false, selectedDay } = {}) {
  if (safetyActive) return null;
  if (model?.rec?.badge === 'Session Done') return null;
  const day = String(selectedDay || '');
  if (!day) return null;
  const program = getProgramById(state?.activeProgramId);
  if (!program) return null;
  const week = state?.currentWeek;
  const slot = state?.weeks?.[String(week)];
  const lifts = liftNamesForDay(slot, program, day);
  if (!lifts.length) return null;
  const modifier = getWeekModifier(program, week);
  if (isDeloadWeek(modifier?.intensityLabel)) {
    return strengthInsightForDay({ lifts, deload: true });
  }
  const desc = program?.days?.[day]?.desc;
  for (const liftName of lifts) {
    try {
      const diagnostic = computeDiagnosticForLift(
        week,
        day,
        liftName,
        targetFor(desc, liftName, modifier, program, week, day),
        { progressionStyle: program?.progressionStyle },
      );
      if (diagnostic?.isStalled) {
        return strengthInsightForDay({ lifts, stalledLift: liftName });
      }
    } catch {
      // A diagnostic is advisory: never let it take the Home surface down.
    }
  }
  return null;
}
