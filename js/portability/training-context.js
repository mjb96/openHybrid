// @ts-check
// =============================================================================
// TRAINING CONTEXT (js/portability/training-context.js)
//
// A compact, self-contained export for an external coach or AI: the athlete's
// stated goals/settings, their active plan, and the last few weeks of training.
// It is deliberately NOT a backup and NOT a full state dump.
//
// Never included: name, notes, exercise notes/links, GPS routes, photos, health
// records, body tape/body-fat, or any account identifier. There is no backend;
// the file leaves only when the athlete exports it.
// =============================================================================
import { addDaysISO, localDayKey, todayKey } from '../dates.js';
import { getWeekModifier } from '../schema.js';
import { liftTarget } from '../engine.js';
import { normalizeWeighIns } from '../metrics/bodyweight.js';
import { isValidWorkingSet } from '../set-utils.js';
import { indexSlotsByDate, weekStartOf } from '../analytics/weekly-aggregate.js';
import { buildRecentWeekSeries } from '../analytics/progress-landing.js';
import { parseDurationSeconds } from '../state/run-sessions.js';
import { moduleEnabled } from '../modules.js';

export const TRAINING_CONTEXT_FORMAT = 'openhybrid-training-context';
export const TRAINING_CONTEXT_VERSION = 1;
export const CONTEXT_WEEKS = 8;
export const CONTEXT_MAX_SESSIONS = 24;

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const round1 = (value) => Math.round(Number(value) * 10) / 10;
const numberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const intOrNull = (value) => {
  const number = parseInt(String(value ?? ''), 10);
  return Number.isFinite(number) ? number : null;
};

/**
 * One completed set, reduced to the fields a coach can actually use. A load's
 * identity travels with it so an assisted pull-up cannot be read as a barbell
 * lift; arbitrary row metadata and notes do not.
 * @param {any} set
 */
function contextSet(set) {
  if (!isValidWorkingSet(set)) return null;
  const out = {
    weight: numberOrNull(set?.w),
    reps: intOrNull(set?.r),
  };
  if (set?.mode === 'time' || Number(set?.sec) > 0) out.seconds = numberOrNull(set?.sec);
  if (set?.mode === 'distance' || Number(set?.dist) > 0) out.metres = numberOrNull(set?.dist);
  if (set?.loadMode) out.loadMode = String(set.loadMode);
  if (set?.basis) out.basis = String(set.basis);
  if (set?.band) out.band = String(set.band);
  if (set?.bw === true) out.bodyweight = true;
  if (set?.failure === true) out.failure = true;
  if (set?.rir != null) out.rir = numberOrNull(set.rir);
  else if (set?.rpe != null) out.rpe = numberOrNull(set.rpe);
  return out;
}

/**
 * One dated session, merging same-day slots into the single training day the
 * calendar reports. Strength exercises merge their sets; runs add their distance
 * and duration. Routes are never read.
 * @param {string} dateISO
 * @param {any[]} slots
 */
function contextDay(dateISO, slots) {
  /** @type {Map<string, any[]>} */
  const exercises = new Map();
  let runKm = 0;
  let runSeconds = 0;
  let runType = null;
  for (const slot of slots) {
    for (const [name, sets] of Object.entries(slot?.lifts || {})) {
      if (!Array.isArray(sets)) continue;
      const cleaned = sets.map(contextSet).filter(Boolean);
      if (cleaned.length) exercises.set(name, [...(exercises.get(name) || []), ...cleaned]);
    }
    const run = slot?.run;
    if (run) {
      runKm += Number(run.dist) || 0;
      runSeconds += parseDurationSeconds(run.time) || 0;
      runType = runType === 'run' || run.type !== 'walk' ? 'run' : (runType || 'walk');
    }
  }
  if (!exercises.size && runKm <= 0) return null;
  return {
    date: dateISO,
    ...(exercises.size
      ? { exercises: [...exercises.entries()].map(([name, sets]) => ({ name, sets })) }
      : {}),
    ...(runKm > 0
      ? { run: { type: runType || 'run', distanceKm: round1(runKm), ...(runSeconds > 0 ? { seconds: Math.round(runSeconds) } : {}) } }
      : {}),
  };
}

/** Current week, clamped to the plan's real range. */
function currentPlanWeek(state, program) {
  const total = Math.max(1, Number(program?.totalWeeks) || 12);
  return Math.min(total, Math.max(1, parseInt(String(state?.currentWeek ?? 1), 10) || 1));
}

/**
 * The active plan at the CURRENT program week, using the same `liftTarget` the
 * cockpit uses. No progression sidecars or history are copied.
 * @param {any} state
 * @param {any} program
 */
function contextPlan(state, program) {
  if (!program) return null;
  const week = currentPlanWeek(state, program);
  const modifier = getWeekModifier(program, week);
  const days = {};
  for (const day of DAYS) {
    const source = program.days?.[day];
    if (!source) continue;
    const lifts = (source.lifts || []).filter((name) => typeof name === 'string' && name.trim());
    if (!lifts.length) continue;
    days[day] = {
      title: String(source.title || 'Training'),
      lifts: lifts.map((name) => {
        const target = liftTarget(source.desc, name, modifier, {
          program, week, dayKey: day,
        });
        return {
          name,
          sets: target.sets,
          reps: target.reps,
          ...(target.weight != null ? { weight: target.weight } : {}),
          ...(target.restSec != null ? { restSec: target.restSec } : {}),
          ...(target.mode ? { mode: target.mode } : {}),
        };
      }),
    };
  }
  return {
    id: String(program.id || ''),
    name: String(program.name || ''),
    week,
    totalWeeks: Math.max(1, Number(program.totalWeeks) || 12),
    ...(program.progressionStyle ? { progressionStyle: program.progressionStyle } : {}),
    days,
  };
}

/**
 * Build the compact context object.
 *
 * @param {any} state
 * @param {{ program?: any, todayISO?: string, recentWeeks?: number, maxSessions?: number }} [options]
 */
export function buildTrainingContext(state, options = {}) {
  const today = localDayKey(options.todayISO || todayKey());
  if (!today) throw new Error('buildTrainingContext: invalid todayISO');
  const weeks = Math.max(1, Math.min(26, Math.round(Number(options.recentWeeks) || CONTEXT_WEEKS)));
  const maxSessions = Math.max(1, Math.min(80, Math.round(Number(options.maxSessions) || CONTEXT_MAX_SESSIONS)));
  const weekStart = weekStartOf(today);
  const windowStart = addDaysISO(today, -(weeks * 7 - 1));

  const settings = state?.settings || {};
  const weighIns = normalizeWeighIns(state?.bodyWeightLog);
  const latestWeight = weighIns.length ? weighIns[weighIns.length - 1] : null;

  const index = indexSlotsByDate(state);
  /** @type {string[]} */
  const dates = [];
  for (const [date] of index.allByDate) {
    if (date >= windowStart && date <= today) dates.push(date);
  }
  dates.sort((a, b) => b.localeCompare(a));
  const trainingDays = [];
  for (const date of dates) {
    const day = contextDay(date, index.allByDate.get(date) || []);
    if (day) trainingDays.push(day);
  }

  const profile = {
    fitnessGoal: settings.fitnessGoal || 'hybrid',
    weightGoal: settings.weightGoal || 'maintain',
    fitnessLevel: settings.fitnessLevel || 'intermediate',
    equipmentTier: settings.equipmentTier || 'gym',
    weekStartDay: settings.weekStartDay === 'sun' ? 'sun' : 'mon',
    units: {
      // ST6: values in this file are canonical kilograms, so the declared unit
      // is the DATA unit, not the athlete's display preference.
      weight: 'kg',
      distance: settings.distanceUnit === 'mi' ? 'mi' : 'km',
      measurements: settings.measurementUnit === 'in' ? 'in' : 'cm',
    },
    modules: Object.fromEntries(['running', 'fasting', 'health', 'recovery'].map((id) => [id, moduleEnabled(state, id)])),
    equipment: Object.entries(settings.equipment || {})
      .filter(([, owned]) => owned === true)
      .map(([name]) => name),
  };

  return {
    format: TRAINING_CONTEXT_FORMAT,
    version: TRAINING_CONTEXT_VERSION,
    generated: today,
    profile,
    body: latestWeight
      ? { weight: latestWeight.weight, unit: 'kg', ...(settings.targetWeight != null ? { targetWeight: settings.targetWeight } : {}) }
      : null,
    activePlan: contextPlan(state, options.program),
    recent: {
      weeks: buildRecentWeekSeries(state, weekStart, weeks, index),
      trainingDays: trainingDays.slice(0, maxSessions),
      trainingDaysInWindow: trainingDays.length,
      trainingDaysOmitted: Math.max(0, trainingDays.length - maxSessions),
      window: { start: windowStart, end: today, weeks },
    },
  };
}

/** A portable, dated filename. */
export function trainingContextFilename(todayISO = todayKey()) {
  return `openhybrid-training-context-${localDayKey(todayISO) || todayKey()}.json`;
}
