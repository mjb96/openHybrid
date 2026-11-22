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
// =============================================================================
import { SET_MODE, isValidWorkingSet, setModeOf } from '../set-utils.js';
import { buildSavedWorkoutDraft } from '../workout/edit-saved.js';
import { getExerciseRestOverride } from '../workout/exercise-config.js';
import { newRoutineId } from './store.js';

const ROUTINE_BADGE = 'Routine';
const ROUTINE_COLOR = 'var(--accent-blue)';

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
 * The rep target for a routine: the persisted prescription (`tr`) when the
 * session carries one, otherwise what was actually performed.
 * @param {any[]} working
 * @param {any} anchor
 * @returns {number}
 */
function repTargetFor(working, anchor) {
  for (const set of working) {
    const prescribed = parseInt(set?.tr, 10);
    if (Number.isFinite(prescribed) && prescribed > 0) return prescribed;
  }
  const performed = parseInt(anchor?.r, 10);
  return Number.isFinite(performed) && performed > 0 ? performed : 0;
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
    sets: working.length,
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
  // Load basis and mode change what a recorded weight MEANS, so they travel
  // with it; without them a dumbbell pair would come back as a single bell.
  if (anchor?.basis) prescription.basis = anchor.basis;
  if (anchor?.loadMode) prescription.loadMode = anchor.loadMode;
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
    const prescription = prescriptionForSets(state, lift, draft.lifts?.[lift]);
    if (!prescription) continue;
    prescriptions[lift] = prescription;
    lifts.push(lift);
  }
  if (!lifts.length) return null;

  const now = options.now instanceof Date ? options.now : new Date();
  const stamp = now.toISOString();
  return {
    id: newRoutineId(),
    name,
    folderId: null,
    sortOrder: 0,
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
  if (prescription?.basis) set.basis = prescription.basis;
  if (prescription?.loadMode) set.loadMode = prescription.loadMode;
  return set;
}

/**
 * A week-shaped source for `createOneOffStrengthSession`: every routine day's
 * exercises, in routine order, with one set per prescribed set.
 * @param {any} routine
 * @returns {{ lifts: Record<string, Record<string, any[]>>, liftOrder: Record<string, string[]> }}
 */
export function routineSourceWeek(routine) {
  /** @type {Record<string, Record<string, any[]>>} */
  const lifts = {};
  /** @type {Record<string, string[]>} */
  const liftOrder = {};
  const days = routine?.days && typeof routine.days === 'object' ? Object.keys(routine.days) : [];
  for (const day of days) {
    /** @type {Record<string, any[]>} */
    const dayLifts = {};
    /** @type {string[]} */
    const order = [];
    for (const name of routine.days[day]?.lifts || []) {
      const prescription = routine.prescriptions?.[day]?.[name];
      if (!prescription || typeof prescription !== 'object') continue;
      const count = Math.max(1, Math.round(Number(prescription.sets) || 1));
      dayLifts[name] = Array.from({ length: count }, () => routineSet(prescription));
      order.push(name);
    }
    lifts[day] = dayLifts;
    liftOrder[day] = order;
  }
  return { lifts, liftOrder };
}
