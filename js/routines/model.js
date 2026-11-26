// @ts-check
// =============================================================================
// ROUTINES MODEL (js/routines/model.js)
//
// Turns a FINISHED strength session into a reusable routine, and turns a routine
// back into a source week that `createOneOffStrengthSession` can copy.
//
// What is saved is what was trained: exercise membership and order come from the
// same `buildSavedWorkoutDraft` the History editor uses (so later programme
// scaffolding on the same date is not mistaken for part of the session), and only
// completed working sets count. `prescriptions` is authoritative for
// sets/reps/load/rest; `days[].lifts` stays bare strings exactly like a
// programme, so nothing downstream has to learn a second shape.
//
// What is deliberately NOT saved: completion flags, PR badges, warm-up rows,
// J&T role stamps, target-weight ghosts, per-set effort/notes, session notes and
// gym stats. A routine is a future session, not a copy of the past one.
//
// What MUST be saved is load IDENTITY. A bodyweight or band-assisted set stores
// a derived effective load (bodyweight, or bodyweight minus a band), so copying
// `w` alone would turn an assisted pull-up into a 60 kg barbell lift. The mode
// and its `bw`/`band` flag travel with the prescription instead.
// =============================================================================
import { SET_MODE, isValidWorkingSet, setModeOf } from '../set-utils.js';
import { resolvedLoadMode } from '../workout/load-mode.js';
import { supportsLoadBasis } from '../workout/load-basis.js';
import { buildSavedWorkoutDraft } from '../workout/edit-saved.js';
import { getExerciseRestOverride } from '../workout/exercise-config.js';
import { normaliseGroupId, pruneSingleMemberGroups } from '../workout/superset.js';
import { MAX_ROUTINE_LIFTS, MAX_ROUTINE_SETS, newRoutineId } from './store.js';
import { liftTarget } from '../engine.js';
import { getWeekModifier } from '../schema.js';

const ROUTINE_BADGE = 'Routine';
const ROUTINE_COLOR = 'var(--accent-blue)';
const LOAD_BASES = ['each', 'per-side', 'total'];

/** Parse a stored numeric field, or null when it carries no usable number. */
function numberOrNull(value) {
  const number = parseFloat(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * The set that defines the load for a lift: the heaviest working set.
 * Ties keep the earlier set, so the result is deterministic.
 * @param {any[]} working
 * @returns {any}
 */
function anchorSet(working) {
  let anchor = working[0];
  for (const set of working) {
    if ((numberOrNull(set?.w) ?? 0) > (numberOrNull(anchor?.w) ?? 0)) anchor = set;
  }
  return anchor;
}

/**
 * The rep target for a routine. The anchor (heaviest working) set pairs the
 * prescription with the load: its own target wins, then its performed reps, and
 * only then another set's prescription/performed reps. The old any-`tr` first
 * rule could prescribe 8 reps on a 6-rep top set.
 * @param {any[]} working
 * @param {any} anchor
 * @returns {number}
 */
function repTargetFor(working, anchor) {
  const anchorTarget = parseInt(anchor?.tr, 10);
  if (Number.isFinite(anchorTarget) && anchorTarget > 0) return anchorTarget;
  const anchorReps = parseInt(anchor?.r, 10);
  if (Number.isFinite(anchorReps) && anchorReps > 0) return anchorReps;
  for (const set of working) {
    const prescribed = parseInt(set?.tr, 10);
    if (Number.isFinite(prescribed) && prescribed > 0) return prescribed;
  }
  for (const set of working) {
    const performed = parseInt(set?.r, 10);
    if (Number.isFinite(performed) && performed > 0) return performed;
  }
  return 0;
}

/**
 * The prescribed hold/carry value for a lift, taken from its anchor set.
 * @param {any[]} working
 * @param {any} anchor
 * @param {'sec'|'dist'} field
 * @returns {number}
 */
function shapeValue(working, anchor, field) {
  const own = Number(anchor?.[field]);
  if (Number.isFinite(own) && own > 0) return own;
  for (const set of working) {
    const value = Number(set?.[field]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

/**
 * Preserve WHAT the recorded weight meant.
 *
 * `resolvedLoadMode` understands both modern sets (`loadMode`) and legacy flags
 * (`bw`, `band`), and decides a band's role from the EXERCISE — assistance on a
 * pull-up, resistance on a pushdown. A bodyweight or assisted effective load is
 * derived from the athlete's mass, so it is stored as "no weight" and the
 * cockpit supplies today's number; a banded load is the band itself, which is a
 * fixed product convention and stays numeric.
 *
 * @param {any} prescription
 * @param {any} anchor
 * @param {string} name
 * @returns {any}
 */
function applyLoadIdentity(prescription, anchor, name) {
  const loadMode = resolvedLoadMode(anchor, name);
  const band = anchor?.band ? String(anchor.band) : null;
  if (loadMode === 'bodyweight') {
    prescription.bw = true;
    prescription.weight = null;
  } else if (loadMode === 'assisted') {
    prescription.band = band || 'M';
    prescription.weight = null;
  } else if (loadMode === 'banded') {
    prescription.band = band || 'M';
  }
  // Only a modern set records its mode explicitly. A legacy `bw`/`band` flag is
  // deliberately left to resolve on read, so the round trip keeps the shape it
  // was logged in instead of inventing a mode the set never carried.
  if (anchor?.loadMode && anchor.loadMode !== 'weighted') prescription.loadMode = loadMode;
  return prescription;
}

/**
 * The routine prescription for one exercise, or null when the session has no
 * completed working set for it.
 *
 * Rest precedence: the set's own `restSec` (0 means "no timer") outranks the
 * exercise's durable override, which outranks the app default (null).
 *
 * @param {any} state
 * @param {string} name
 * @param {any[]} sets
 * @returns {any|null}
 */
export function prescriptionForSets(state, name, sets) {
  const working = (Array.isArray(sets) ? sets : []).filter(isValidWorkingSet);
  if (!working.length) return null;

  const anchor = anchorSet(working);
  const mode = setModeOf(anchor);
  const reps = mode === SET_MODE.REPS ? repTargetFor(working, anchor) : 0;
  const restFromSet = working.find((set) => set?.restSec != null && Number.isFinite(Number(set.restSec)));
  const override = getExerciseRestOverride(state, name);
  const restSec = restFromSet
    ? Math.max(0, Math.round(Number(restFromSet.restSec) || 0))
    : (override == null ? null : Math.max(0, Math.round(override)));

  /** @type {any} */
  const prescription = {
    sets: Math.min(working.length, MAX_ROUTINE_SETS),
    reps: reps > 0 ? reps : '',
    weight: numberOrNull(anchor?.w),
    restSec,
  };
  if (mode === SET_MODE.TIME) {
    prescription.mode = SET_MODE.TIME;
    prescription.sec = shapeValue(working, anchor, 'sec');
  } else if (mode === SET_MODE.DISTANCE) {
    prescription.mode = SET_MODE.DISTANCE;
    prescription.dist = shapeValue(working, anchor, 'dist');
  }
  applyLoadIdentity(prescription, anchor, name);

  // A dumbbell legacy set carries no `basis`, which means the entered number was
  // the PAIR (Both). Stamping `total` keeps it Both when the routine seeds a new
  // row; leaving it blank would let a blank dumbbell row default to Each and
  // halve the volume. Non-dumbbell lifts have no basis to record.
  const storedBasis = LOAD_BASES.includes(anchor?.basis) ? anchor.basis : null;
  const basis = storedBasis || (supportsLoadBasis(name) ? 'total' : null);
  if (basis) prescription.basis = basis;
  return prescription;
}

/**
 * Build a routine from one finished strength session.
 *
 * Returns null when the session has no completed working sets — the caller
 * refuses with a message rather than storing an empty routine.
 *
 * @param {any} state
 * @param {any} week          the stored week object that owns the session
 * @param {string} day        the session's weekday key
 * @param {{ name?: string, activityId?: string|null, now?: Date }} [options]
 * @returns {any|null}
 */
export function buildRoutineFromSession(state, week, day, options = {}) {
  if (!state || !week || !day) return null;
  const draft = buildSavedWorkoutDraft(week, day);
  const name = String(options.name || '').trim() || String(week.sessionTitle || '').trim() || 'Workout';

  const lifts = [];
  const prescriptions = {};
  for (const lift of draft.liftOrder || []) {
    if (lifts.length >= MAX_ROUTINE_LIFTS) break;
    const prescription = prescriptionForSets(state, lift, draft.lifts?.[lift]);
    if (!prescription) continue;
    // Circuit membership is a property of the SESSION, not of the sets, so it
    // has to be copied deliberately: a routine that dropped it could never
    // rebuild the pair it was saved from.
    const groupId = normaliseGroupId(week?.liftMeta?.[day]?.[lift]?.groupId);
    if (groupId) prescription.groupId = groupId;
    prescriptions[lift] = prescription;
    lifts.push(lift);
  }
  if (!lifts.length) return null;
  // A routine can narrow a circuit (a partner with no completed working set is
  // skipped). Do not turn the remainder into a one-member "circuit".
  pruneSingleMemberGroups(prescriptions);

  const now = options.now instanceof Date ? options.now : new Date();
  const stamp = now.toISOString();
  return {
    kind: 'routine',
    id: newRoutineId(),
    name,
    folderId: null,
    createdAt: stamp,
    updatedAt: stamp,
    source: {
      activityId: options.activityId || null,
      programId: week.programId || null,
      day,
      date: week.dates?.[day] || null,
    },
    days: {
      [day]: {
        title: name,
        badge: ROUTINE_BADGE,
        color: ROUTINE_COLOR,
        desc: '',
        runs: 'Rest',
        lifts,
      },
    },
    prescriptions: { [day]: prescriptions },
    totalWeeks: 1,
    weeklyVolModifiers: { 1: { sets: 3, reps: 10, intensityLabel: '' } },
  };
}

/**
 * Build a routine from ONE day of a plan (roadmap §22 / PL6). The plan already
 * owns the intent — exercises, order, sets/reps and any per-exercise target —
 * so this copies that intent into a reusable session template instead of
 * waiting for the athlete to log it first.
 *
 * A day with no lifts returns null (a run-only or rest day is not a routine).
 *
 * @param {any} program
 * @param {string} dayKey
 * @param {{ name?: string, now?: Date }} [options]
 */
export function buildRoutineFromPlanDay(program, dayKey, options = {}) {
  const day = program?.days?.[dayKey];
  if (!day) return null;
  const names = (Array.isArray(day.lifts) ? day.lifts : [])
    .filter((name) => typeof name === 'string' && name.trim())
    .slice(0, MAX_ROUTINE_LIFTS);
  if (!names.length) return null;

  const modifier = getWeekModifier(program, '1') || {};
  /** @type {Record<string, any>} */
  const prescriptions = {};
  const lifts = [];
  for (const name of names) {
    const stored = program?.prescriptions?.[dayKey]?.[name];
    const target = liftTarget(day.desc, name, modifier, { program, week: '1', dayKey });
    const sets = Math.min(MAX_ROUTINE_SETS, Math.max(1, Math.round(Number(stored?.sets ?? target.sets) || 1)));
    /** @type {any} */
    const prescription = {
      sets,
      reps: String(stored?.reps ?? target.reps ?? '').trim(),
      weight: Number.isFinite(Number(stored?.weight)) && Number(stored.weight) > 0 ? Number(stored.weight) : null,
      restSec: Number.isFinite(Number(stored?.restSec)) && Number(stored.restSec) > 0 ? Number(stored.restSec) : null,
    };
    const groupId = normaliseGroupId(stored?.groupId);
    if (groupId) prescription.groupId = groupId;
    prescriptions[name] = prescription;
    lifts.push(name);
  }
  pruneSingleMemberGroups(prescriptions);

  const now = options.now instanceof Date ? options.now : new Date();
  const stamp = now.toISOString();
  const name = String(options.name || '').trim()
    || `${String(program?.name || 'Plan').trim()} · ${String(day.title || 'Session').trim()}`;
  return {
    kind: 'routine',
    id: newRoutineId(),
    name,
    folderId: null,
    createdAt: stamp,
    updatedAt: stamp,
    source: { activityId: null, programId: program?.id || null, day: dayKey, date: null },
    days: {
      [dayKey]: {
        title: String(day.title || 'Session').trim() || 'Session',
        badge: ROUTINE_BADGE,
        color: ROUTINE_COLOR,
        desc: '',
        runs: 'Rest',
        lifts,
      },
    },
    prescriptions: { [dayKey]: prescriptions },
    totalWeeks: 1,
    weeklyVolModifiers: { 1: { sets: 3, reps: 10, intensityLabel: '' } },
  };
}

/**
 * One blank, copyable set for a routine prescription. `r` is seeded from the rep
 * target on purpose: the logger prefills it (a copy shows the values to hit) and
 * `tr` records the same prescription for target-scoped history.
 * @param {any} prescription
 * @returns {any}
 */
function routineSet(prescription) {
  /** @type {any} */
  const set = {
    w: prescription?.weight == null ? '' : String(prescription.weight),
    r: '',
    c: false,
  };
  const mode = prescription?.mode === SET_MODE.TIME
    ? SET_MODE.TIME
    : prescription?.mode === SET_MODE.DISTANCE ? SET_MODE.DISTANCE : SET_MODE.REPS;
  if (mode === SET_MODE.REPS) {
    const reps = parseInt(prescription?.reps, 10) || 0;
    if (reps > 0) {
      set.r = String(reps);
      set.tr = String(reps);
    }
  } else {
    set.mode = mode;
    if (mode === SET_MODE.TIME) set.sec = Math.max(0, Math.round(Number(prescription?.sec) || 0));
    else set.dist = Math.max(0, Number(prescription?.dist) || 0);
  }
  if (prescription?.restSec != null) {
    set.restSec = Math.max(0, Math.round(Number(prescription.restSec) || 0));
  }
  // Load identity travels with the set. Without these the cockpit resolves the
  // row as "weighted" and a bodyweight/band movement comes back as a barbell.
  if (prescription?.bw) set.bw = true;
  if (prescription?.band) set.band = String(prescription.band);
  if (prescription?.loadMode && prescription.loadMode !== 'weighted') set.loadMode = prescription.loadMode;
  if (prescription?.basis) set.basis = prescription.basis;
  return set;
}

/**
 * Counts (and an honest time estimate) for a routine card.
 *
 * The estimate exists only when every prescription carries a rest value — an
 * unknown rest would otherwise be replaced by a made-up number. A working set
 * also costs time under load, so a fixed allowance is added per set; the total
 * is rounded to five minutes and labelled with "~" by the caller.
 *
 * @param {any} routine
 * @returns {{ exercises:number, workingSets:number, minutes:number|null }}
 */
export function routineSummary(routine) {
  const WORK_SECONDS_PER_SET = 40;
  const days = routine?.days && typeof routine.days === 'object' ? Object.keys(routine.days) : [];
  let exercises = 0;
  let workingSets = 0;
  let restSeconds = 0;
  let restKnown = true;
  for (const day of days) {
    const names = Array.isArray(routine.days[day]?.lifts) ? routine.days[day].lifts : [];
    for (const name of names) {
      const prescription = routine.prescriptions?.[day]?.[name];
      if (!prescription || typeof prescription !== 'object') continue;
      const sets = Math.min(MAX_ROUTINE_SETS, Math.max(1, Math.round(Number(prescription.sets) || 1)));
      exercises++;
      workingSets += sets;
      if (prescription.restSec == null || !Number.isFinite(Number(prescription.restSec))) restKnown = false;
      else restSeconds += sets * Math.max(0, Number(prescription.restSec));
    }
  }
  const minutes = restKnown && workingSets > 0
    ? Math.max(5, Math.round((restSeconds + workingSets * WORK_SECONDS_PER_SET) / 300) * 5)
    : null;
  return { exercises, workingSets, minutes };
}

/**
 * A week-shaped source for `createOneOffStrengthSession`, paired with the day it
 * describes. Returning the day WITH the week means a future Start cannot pass
 * today's weekday and get an empty session.
 * @param {any} routine
 * @returns {{
 *   sourceWeek: {
 *     lifts: Record<string, Record<string, any[]>>,
 *     liftOrder: Record<string, string[]>,
 *     liftMeta: Record<string, Record<string, { groupId: string }>>,
 *   },
 *   sourceDay: string|null,
 * }}
 */
export function routineSourceWeek(routine) {
  /** @type {Record<string, Record<string, any[]>>} */
  const lifts = {};
  /** @type {Record<string, string[]>} */
  const liftOrder = {};
  /** @type {Record<string, Record<string, { groupId: string }>>} */
  const liftMeta = {};
  const days = routine?.days && typeof routine.days === 'object' ? Object.keys(routine.days) : [];
  for (const day of days) {
    /** @type {Record<string, any[]>} */
    const dayLifts = {};
    /** @type {string[]} */
    const order = [];
    /** @type {Record<string, { groupId: string }>} */
    const dayMeta = {};
    const names = Array.isArray(routine.days[day]?.lifts) ? routine.days[day].lifts : [];
    for (const name of names) {
      const prescription = routine.prescriptions?.[day]?.[name];
      if (!prescription || typeof prescription !== 'object') continue;
      const count = Math.min(
        MAX_ROUTINE_SETS,
        Math.max(1, Math.round(Number(prescription.sets) || 1)),
      );
      dayLifts[name] = Array.from({ length: count }, () => routineSet(prescription));
      const groupId = normaliseGroupId(prescription.groupId);
      if (groupId) dayMeta[name] = { groupId };
      order.push(name);
    }
    // Import may hand us a tag with no partner; the cockpit must not render a
    // one-member circuit from it.
    pruneSingleMemberGroups(dayMeta);
    lifts[day] = dayLifts;
    liftOrder[day] = order;
    liftMeta[day] = dayMeta;
  }
  const sourceDay = Object.keys(lifts).find((day) => Object.keys(lifts[day]).length > 0)
    || days[0] || null;
  return { sourceWeek: { lifts, liftOrder, liftMeta }, sourceDay };
}
