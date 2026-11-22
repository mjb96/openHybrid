// @ts-check
// =============================================================================
// SET RECORDS — the per-exercise "heaviest weight for N reps" table.
//
// A set record here is a LOOKUP, not a trophy: the athlete asks "what is the
// most I have ever lifted for 5 reps?" and the answer must be the heaviest
// WORKING set that actually reached 5 reps. It is deliberately not an e1RM
// estimate: an extrapolated single is a useful trend, but it is not a weight
// the athlete has held. Warm-ups and un-ticked rows are not training, so they
// can never own a record.
//
// The table is shape-aware for the same reason `set-utils` is: a 45-second
// plank and a 40 m carry are not rep sets, and reframing them as "0 kg for 45
// reps" would invent a number. A hold reports its longest seconds and a carry
// its longest metres, and only the fields belonging to the history's current
// shape are populated, because a stale rep row on a hold exercise is worse
// than no row at all.
//
// The shape follows the MOST RECENT session, matching the exercise drilldown
// (`analytics/exercise-detail.js`): switching a lift from holds to loaded reps
// changes what the athlete is training, so older shapes stay in the history
// (and still compete within their own shape) but do not define the table.
// =============================================================================
import {
  SET_MODE, isRepSet, isValidWorkingSet, setModeOf,
} from '../set-utils.js';

/**
 * Rep targets the table answers for: the load you can move for a single, a
 * triple, a five, and the classic hypertrophy range. Frozen so a caller cannot
 * mutate the table's columns at runtime.
 */
export const REP_TARGETS = Object.freeze([1, 3, 5, 8, 10, 12]);

/** @typedef {{ date?: string, workingSets?: any[] }} SessionRow */
/** @typedef {{ target:number, weight:number, reps:number, date:string, sessionIndex:number }} RepTargetRow */
/** @typedef {{ reps:number, weight:number, date:string }} BestSetReps */
/** @typedef {{ reps:number, date:string }} BestSessionReps */
/** @typedef {{ seconds:number, weight:number, date:string }} BestTime */
/** @typedef {{ metres:number, weight:number, date:string }} BestDistance */
/** @typedef {{ set:any, date:string, sessionIndex:number }} WorkingRow */

/**
 * @typedef {Object} SetRecordsModel
 * @property {'reps'|'time'|'distance'|'none'} shape
 * @property {RepTargetRow[]} repTargets
 * @property {BestSetReps|null} bestRepsInSet
 * @property {BestSessionReps|null} bestRepsInSession
 * @property {BestTime|null} bestTimeSec
 * @property {BestDistance|null} bestDistanceM
 * @property {boolean} hasData
 */

/** @param {any} value */
function numeric(value) {
  const n = parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/** @param {any} value */
function whole(value) {
  const n = parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Shape of one session's working sets — the same convention as the exercise
 * drilldown: a single rep set makes the session a rep session, otherwise the
 * first set's mode decides. The caller has already removed invalid sets.
 * @param {any[]} sets
 * @returns {'reps'|'time'|'distance'}
 */
function shapeOfSets(sets) {
  return sets.every((set) => !isRepSet(set)) ? setModeOf(sets[0]) : SET_MODE.REPS;
}

/** @returns {SetRecordsModel} */
function emptyResult() {
  return {
    shape: 'none',
    repTargets: [],
    bestRepsInSet: null,
    bestRepsInSession: null,
    bestTimeSec: null,
    bestDistanceM: null,
    hasData: false,
  };
}

/**
 * Heaviest working set that reached each rep target.
 *
 * Ties resolve in the order that makes a record honest: heavier weight first,
 * then more reps at that weight (8 × 100 kg is a better 5-rep mark than
 * 5 × 100 kg), then the earlier date (the record was set then, not on the
 * repeat). Targets nothing reached are simply absent — no zero rows.
 * @param {WorkingRow[]} working
 * @returns {RepTargetRow[]}
 */
function repTargetsFor(working) {
  /** @type {RepTargetRow[]} */
  const out = [];
  for (const target of REP_TARGETS) {
    /** @type {RepTargetRow|null} */
    let best = null;
    for (const row of working) {
      if (!isRepSet(row.set)) continue;
      const reps = whole(row.set.r);
      const weight = numeric(row.set.w);
      if (reps < target || !(weight > 0)) continue;
      const wins = !best
        || weight > best.weight
        || (weight === best.weight && reps > best.reps)
        || (weight === best.weight && reps === best.reps && row.date < best.date);
      if (!wins) continue;
      best = { target, weight, reps, date: row.date, sessionIndex: row.sessionIndex };
    }
    if (best) out.push(best);
  }
  return out;
}

/**
 * Most reps in a single working set. `weight` is whatever the set stored (0
 * for bodyweight work) and is reported, never used to rank.
 * @param {WorkingRow[]} working
 * @returns {BestSetReps|null}
 */
function bestRepsInSetFor(working) {
  /** @type {BestSetReps|null} */
  let best = null;
  for (const row of working) {
    if (!isRepSet(row.set)) continue;
    const reps = whole(row.set.r);
    const weight = numeric(row.set.w);
    const wins = !best
      || reps > best.reps
      || (reps === best.reps && weight > best.weight)
      || (reps === best.reps && weight === best.weight && row.date < best.date);
    if (wins) best = { reps, weight, date: row.date };
  }
  return best;
}

/**
 * Highest total reps inside one session. A session with several rep sets is the
 * unit the athlete actually trained; comparing single sets alone hid the
 * "20 reps across five sets" kind of session best.
 * @param {SessionRow[]} sessions
 * @returns {BestSessionReps|null}
 */
function bestRepsInSessionFor(sessions) {
  /** @type {BestSessionReps|null} */
  let best = null;
  for (const session of sessions) {
    const sets = Array.isArray(session?.workingSets) ? session.workingSets : [];
    let reps = 0;
    let counted = false;
    for (const set of sets) {
      if (!isValidWorkingSet(set) || !isRepSet(set)) continue;
      reps += whole(set.r);
      counted = true;
    }
    if (!counted) continue;
    const date = String(session?.date || '');
    const wins = !best || reps > best.reps || (reps === best.reps && date < best.date);
    if (wins) best = { reps, date };
  }
  return best;
}

/**
 * Longest hold. A tie goes to the heavier load, then the earlier date.
 * @param {WorkingRow[]} working
 * @returns {BestTime|null}
 */
function bestTimeFor(working) {
  /** @type {BestTime|null} */
  let best = null;
  for (const row of working) {
    if (setModeOf(row.set) !== SET_MODE.TIME) continue;
    const seconds = numeric(row.set.sec);
    if (!(seconds > 0)) continue;
    const weight = numeric(row.set.w);
    const wins = !best
      || seconds > best.seconds
      || (seconds === best.seconds && weight > best.weight)
      || (seconds === best.seconds && weight === best.weight && row.date < best.date);
    if (wins) best = { seconds, weight, date: row.date };
  }
  return best;
}

/**
 * Longest carry. A tie goes to the heavier load, then the earlier date.
 * @param {WorkingRow[]} working
 * @returns {BestDistance|null}
 */
function bestDistanceFor(working) {
  /** @type {BestDistance|null} */
  let best = null;
  for (const row of working) {
    if (setModeOf(row.set) !== SET_MODE.DISTANCE) continue;
    const metres = numeric(row.set.dist);
    if (!(metres > 0)) continue;
    const weight = numeric(row.set.w);
    const wins = !best
      || metres > best.metres
      || (metres === best.metres && weight > best.weight)
      || (metres === best.metres && weight === best.weight && row.date < best.date);
    if (wins) best = { metres, weight, date: row.date };
  }
  return best;
}

/**
 * Build the set-records model for one exercise.
 *
 * `sessions` are `{ date, workingSets }` rows already ordered oldest → newest;
 * they are read only, never sorted or mutated. `exerciseName` is part of the
 * API contract but deliberately unused: these records are decided by the set
 * SHAPE and the stored numbers, never by a name-keyed estimate.
 *
 * @param {SessionRow[]} sessions
 * @param {string} exerciseName
 * @returns {SetRecordsModel}
 */
export function buildSetRecords(sessions, exerciseName) {
  const rows = Array.isArray(sessions) ? sessions : [];
  /** @type {WorkingRow[]} */
  const working = [];
  /** @type {{ sets:any[], index:number }|null} */
  let latest = null;

  rows.forEach((session, sessionIndex) => {
    const sets = Array.isArray(session?.workingSets)
      ? session.workingSets.filter(isValidWorkingSet)
      : [];
    if (!sets.length) return;
    const date = String(session?.date || '');
    for (const set of sets) working.push({ set, date, sessionIndex });
    latest = { sets, index: sessionIndex };
  });

  if (!working.length || !latest) return emptyResult();

  const shape = shapeOfSets(latest.sets);
  if (shape === SET_MODE.TIME) {
    return {
      shape,
      repTargets: [],
      bestRepsInSet: null,
      bestRepsInSession: null,
      bestTimeSec: bestTimeFor(working),
      bestDistanceM: null,
      hasData: true,
    };
  }
  if (shape === SET_MODE.DISTANCE) {
    return {
      shape,
      repTargets: [],
      bestRepsInSet: null,
      bestRepsInSession: null,
      bestTimeSec: null,
      bestDistanceM: bestDistanceFor(working),
      hasData: true,
    };
  }
  return {
    shape: SET_MODE.REPS,
    repTargets: repTargetsFor(working),
    bestRepsInSet: bestRepsInSetFor(working),
    bestRepsInSession: bestRepsInSessionFor(rows),
    bestTimeSec: null,
    bestDistanceM: null,
    hasData: true,
  };
}
