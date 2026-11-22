// @ts-check
// Independent strength sessions live in their own non-numeric week-shaped
// records. This lets the existing logger/history/export paths reuse one durable
// shape without ever completing or overwriting a programmed day.
import { dateKey } from '../dates.js';
import { secureRandomSuffix } from '../util/secure-id.js';
import { findRoutine, MAX_ROUTINE_NOTE } from '../routines/store.js';
import { explicitSessionStatus, SESSION_STATUS } from './session-status.js';
import { normaliseGroupId, pruneSingleMemberGroups } from './superset.js';

const PREFIX = 'session:';
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

export function newStrengthSessionId() {
  return `str_${Date.now().toString(36)}_${secureRandomSuffix(6)}`;
}

export function isOneOffWeek(week) {
  return !!week && typeof week === 'object' && typeof week.sessionId === 'string'
    && (week.sessionKind === 'empty' || week.sessionKind === 'copy');
}

export function activeOneOffSession(state) {
  const key = state?.activeStrengthSessionKey;
  const week = key && state?.weeks?.[key];
  return isOneOffWeek(week) ? { key, week } : null;
}

export function activeWorkoutWeekKey(state) {
  return activeOneOffSession(state)?.key || String(state?.currentWeek || '1');
}

export function activeWorkoutDay(state, fallbackDay) {
  return activeOneOffSession(state)?.week?.sessionDay || fallbackDay;
}

export function clearActiveOneOffSession(state) {
  if (state && state.activeStrengthSessionKey) delete state.activeStrengthSessionKey;
}

/** Remove the active unfinished one-off without touching programmed workouts. */
export function discardActiveOneOffSession(state) {
  const active = activeOneOffSession(state);
  if (!active) return null;
  const day = active.week.sessionDay || null;
  const sessionId = active.week.sessionId;
  delete state.weeks[active.key];
  clearActiveOneOffSession(state);
  return { key: active.key, day, sessionId };
}

function blankCopiedSet(set) {
  const next = clone(set) || {};
  next.c = false;
  delete next.isPR;
  return next;
}

function weekdayForDateKey(localDate) {
  const [year, month, day] = localDate.split('-').map(Number);
  return DAYS[new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()];
}

/**
 * @param {any} state
 * @param {{ kind?:'empty'|'copy', title?:string, sourceWeek?:any, sourceDay?:string,
 * sourceActivityId?:string, sourceRoutineId?:string, now?:Date, tz?:string }} [options]
 */
export function createOneOffStrengthSession(state, options = {}) {
  if (!state.weeks || typeof state.weeks !== 'object') state.weeks = {};
  const now = options.now || new Date();
  const sessionId = newStrengthSessionId();
  const key = `${PREFIX}${sessionId}`;
  const localDate = dateKey(now, options.tz);
  const day = weekdayForDateKey(localDate);
  const sourceLifts = options.sourceWeek?.lifts?.[options.sourceDay] || {};
  const sourceOrder = options.sourceWeek?.liftOrder?.[options.sourceDay];
  const lifts = {};
  for (const [name, sets] of Object.entries(sourceLifts)) {
    if (Array.isArray(sets)) lifts[name] = sets.map(blankCopiedSet);
  }
  const liftOrder = Array.isArray(sourceOrder)
    ? sourceOrder.filter((name) => Object.hasOwn(lifts, name))
    : Object.keys(lifts);
  // Only circuit membership travels with a copied workout. Planned-set counts,
  // swap origins and warm-up-ramp stamps belong to the source session, not to a
  // fresh one — cloning the whole liftMeta made a copy inherit decisions it
  // never made. Filtering to live lifts and pruning a lone tag keeps a deleted
  // partner from recreating a one-member circuit.
  const sourceMeta = options.sourceWeek?.liftMeta?.[options.sourceDay];
  /** @type {Record<string, {groupId: string}>} */
  const liftMeta = {};
  if (sourceMeta && typeof sourceMeta === 'object') {
    for (const name of Object.keys(lifts)) {
      const groupId = normaliseGroupId(sourceMeta[name]?.groupId);
      if (groupId) liftMeta[name] = { groupId };
    }
  }
  pruneSingleMemberGroups(liftMeta);
  const kind = options.kind === 'copy' ? 'copy' : 'empty';
  state.weeks[key] = {
    sessionId,
    sessionKind: kind,
    sessionTitle: String(options.title || (kind === 'copy' ? 'Copied Workout' : 'Empty Workout')),
    sessionDay: day,
    sourceActivityId: options.sourceActivityId || null,
    // A routine-started session remembers only WHERE the note lives. The note
    // itself is never copied, so editing/deleting the routine is reflected on
    // the next cockpit render instead of showing a stale snapshot.
    sourceRoutineId: options.sourceRoutineId || null,
    startedAt: now.toISOString(),
    programId: null,
    dates: { [day]: localDate },
    runs: {}, runSessions: {},
    lifts: { [day]: lifts },
    liftOrder: { [day]: liftOrder },
    liftMeta: { [day]: liftMeta },
    notes: { [day]: '' },
    gymRpe: { [day]: '' },
    bodyWeight: {},
    gymStats: { [day]: { time: '', avgHR: '', maxHR: '', cals: '' } },
  };
  state.activeStrengthSessionKey = key;
  return { key, day, sessionId, week: state.weeks[key] };
}

/**
 * The CURRENT routine note for a one-off session started from a routine.
 *
 * Read by reference on every render (`sourceRoutineId` is the only thing stored
 * on the week): editing the routine changes what this returns, and deleting the
 * routine returns null. A finished session hides the banner — the note belongs
 * to preparation, not to the historical record.
 *
 * @param {any} state
 * @param {any} week
 * @param {string|null|undefined} [day]
 * @returns {{ routineId:string, routineName:string, note:string }|null}
 */
export function routineNoteForSession(state, week, day = null) {
  const routineId = week?.sourceRoutineId;
  if (!routineId) return null;
  const sessionDay = day || week?.sessionDay || null;
  if (explicitSessionStatus(week, sessionDay) === SESSION_STATUS.FINISHED) return null;
  const routine = findRoutine(state, routineId);
  const note = String(routine?.note || '').trim().slice(0, MAX_ROUTINE_NOTE);
  if (!note) return null;
  return { routineId, routineName: String(routine.name || 'Routine'), note };
}

export function oneOffBlueprint(state, fallback = null) {
  const active = activeOneOffSession(state);
  if (!active) return fallback;
  const day = active.week.sessionDay;
  return {
    title: active.week.sessionTitle || 'Workout',
    lifts: Object.keys(active.week.lifts?.[day] || {}),
    runs: 'Rest',
    desc: '',
    oneOff: true,
  };
}
