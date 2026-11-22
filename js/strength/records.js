// @ts-check
// =============================================================================
// STRENGTH RECORDS — one shape-aware definition of a personal record.
//
// A record is a fact about a COMPARABLE performance, not about a weight field:
//
//   e1rm   a loaded rep set eligible for the shared Epley estimate
//   hold   seconds held (the set's `sec`) — never reinterpreted as reps
//   carry  metres carried (the set's `dist`) — never reinterpreted as reps
//   reps   most repetitions at the SAME stored load and load mode, for loaded
//          rep sets the e1RM trend deliberately excludes (for example a set
//          beyond MAX_E1RM_REPS)
//
// Bodyweight, assisted and banded sets are NOT rep records. Their `w` is body
// mass or band assistance, so two "80 kg × 10" sets are not the same
// achievement for two athletes (or even for one athlete at two body weights).
// Holds and carries stay comparable because they are measured in seconds and
// metres, not in a fabricated load.
//
// Every rule here is ALL-TIME and date-strict: the previous best is scanned
// across every stored activation, including archived `arch:*` weeks, and a
// session on the same day only counts as "before" when it is a different stored
// slot. Prior history is required — the first-ever log of a lift is a baseline,
// not a trophy — and an e1RM must beat the previous best by the shared
// `E1RM_PR_EPSILON`, because a difference too small to display must not fire a
// badge. Holds, carries and reps compare strictly.
// =============================================================================
import {
  SET_MODE, isWarmupSet, isValidWorkingSet, setModeOf,
} from '../set-utils.js';
import { E1RM_PR_EPSILON, estimatedE1rmForSet } from './e1rm.js';
import { resolvedLoadMode } from '../workout/load-mode.js';
import { exercisePerformanceHistory } from '../workout/exercise-history.js';
import { exerciseStatForName } from '../exercises/catalog.js';

export const RECORD_KIND = Object.freeze({
  E1RM: 'e1rm',
  HOLD: 'hold',
  CARRY: 'carry',
  REPS: 'reps',
});

/** The badge/copy label for one record kind. */
export const PR_KIND_LABELS = Object.freeze({
  e1rm: 'PR',
  hold: 'Hold PR',
  carry: 'Carry PR',
  reps: 'Rep PR',
});

/** @param {string|null|undefined} kind */
export function prKindLabel(kind) {
  return PR_KIND_LABELS[kind] || 'PR';
}

function numeric(value) {
  const n = Number.parseFloat(String(value ?? ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Is this rep set's `w` a comparable external load?
 *
 * `weighted` is the only mode where the number means "the mass on the bar".
 * Bodyweight mode stores the athlete's mass, assisted mode stores mass minus
 * assistance, and a band stores nominal band resistance — none of them are the
 * same quantity, so comparing reps at those "loads" would invent a record.
 * @param {any} set
 * @param {string} exerciseName
 */
function hasComparableRepLoad(set, exerciseName) {
  if (!set || set.bw === true || set.band) return false;
  if (resolvedLoadMode(set, exerciseName) !== 'weighted') return false;
  return numeric(set.w) > 0;
}

/**
 * Which record a single set can set, or null when it cannot set one.
 *
 * Shape wins: a timed set is a hold and a distance set is a carry, even if the
 * same exercise also has rep sessions. A completed rep set with a comparable
 * load is an e1RM when the shared estimate accepts it and a rep record when it
 * does not (too many reps, or an exercise the estimate refuses).
 *
 * Warm-ups are never records but completion is not required here — the live
 * cockpit evaluates the set it is about to complete, and the session scanners
 * apply `isValidWorkingSet` themselves.
 *
 * @param {any} set
 * @param {string} exerciseName
 * @returns {'e1rm'|'hold'|'carry'|'reps'|null}
 */
export function recordKindForSet(set, exerciseName) {
  if (!set || isWarmupSet(set)) return null;
  const mode = setModeOf(set);
  if (mode === SET_MODE.TIME) return numeric(set.sec) > 0 ? RECORD_KIND.HOLD : null;
  if (mode === SET_MODE.DISTANCE) return numeric(set.dist) > 0 ? RECORD_KIND.CARRY : null;
  if ((parseInt(String(set.r ?? ''), 10) || 0) <= 0) return null;
  if (!hasComparableRepLoad(set, exerciseName)) return null;
  return estimatedE1rmForSet(exerciseName, set) > 0 ? RECORD_KIND.E1RM : RECORD_KIND.REPS;
}

/**
 * The measurable value of one set for a record kind. e1RM remains a directional
 * estimate; hold/carry/reps are the measured seconds/metres/reps.
 * @param {string} kind
 * @param {any} set
 * @param {string} exerciseName
 */
function valueForKind(kind, set, exerciseName) {
  if (kind === RECORD_KIND.E1RM) return estimatedE1rmForSet(exerciseName, set);
  if (kind === RECORD_KIND.HOLD) return numeric(set?.sec);
  if (kind === RECORD_KIND.CARRY) return numeric(set?.dist);
  return parseInt(String(set?.r ?? ''), 10) || 0;
}

/**
 * Build the record a set represents. `set` is the live stored object so a
 * session restamp can mark exactly the set that earned the record.
 * @param {string} kind
 * @param {any} set
 * @param {string} exerciseName
 */
function recordForSet(kind, set, exerciseName) {
  return {
    kind,
    value: valueForKind(kind, set, exerciseName),
    load: numeric(set?.w),
    loadMode: resolvedLoadMode(set, exerciseName),
    reps: parseInt(String(set?.r ?? ''), 10) || 0,
    sec: numeric(set?.sec),
    dist: numeric(set?.dist),
    set,
  };
}

/**
 * The best record of each kind inside one session's set list.
 *
 * A mixed session can legitimately hold an e1RM, a hold and a carry at once;
 * they are returned side by side and never compared with each other. `reps`
 * keeps ONE bucket: the heaviest stored load, then the most reps at it, because
 * a lighter 20-rep set is not a better achievement than a heavier 6-rep set.
 *
 * @param {string} exerciseName
 * @param {any[]} sets
 * @returns {{e1rm:any, hold:any, carry:any, reps:any}}
 */
export function bestRecordForSession(exerciseName, sets) {
  /** @type {{e1rm:any, hold:any, carry:any, reps:any}} */
  const best = { e1rm: null, hold: null, carry: null, reps: null };
  for (const set of sets || []) {
    if (!isValidWorkingSet(set)) continue;
    const kind = recordKindForSet(set, exerciseName);
    if (!kind) continue;
    const record = recordForSet(kind, set, exerciseName);
    if (kind === RECORD_KIND.REPS) {
      if (!best.reps || record.load > best.reps.load
        || (record.load === best.reps.load && record.value > best.reps.value)) {
        best.reps = record;
      }
    } else if (!best[kind] || record.value > best[kind].value) {
      best[kind] = record;
    }
  }
  return best;
}

/**
 * The best record of each kind from every OTHER session before a date.
 *
 * Uses the canonical exercise history (aliases merged, archived `arch:*` weeks
 * included, dates required), so switching programmes or importing an old log
 * cannot hand out a fresh set of records for a lift the athlete already beat.
 * The pre-catalogue `legacyMax` aggregate is kept as an e1RM floor because its
 * source sets no longer exist; without it a genuine old best would be re-awarded.
 *
 * `reps` returns an ARRAY of buckets (load + load mode) rather than one value:
 * reps at 60 kg are only comparable with reps at 60 kg. `isRecord` performs that
 * lookup; a session whose reps are at a load never trained before is a baseline.
 *
 * @param {any} state
 * @param {string} exerciseName
 * @param {{excludeWeekKey?:string|number, excludeDay?:string, beforeDate?:string|Date}} [opts]
 * @returns {{e1rm:any, hold:any, carry:any, reps:any[]}}
 */
export function bestRecordBefore(state, exerciseName, opts = {}) {
  /** @type {{e1rm:any, hold:any, carry:any, reps:any[]}} */
  const best = { e1rm: null, hold: null, carry: null, reps: [] };
  const rows = exercisePerformanceHistory(state, exerciseName, {
    scope: 'all',
    exclude: opts.excludeWeekKey == null
      ? undefined
      : { weekKey: opts.excludeWeekKey, day: opts.excludeDay },
    beforeDate: opts.beforeDate,
  });
  for (const row of rows) {
    for (const set of row.workingSets || []) {
      if (!isValidWorkingSet(set)) continue;
      const kind = recordKindForSet(set, exerciseName);
      if (!kind) continue;
      const record = recordForSet(kind, set, exerciseName);
      if (kind === RECORD_KIND.REPS) {
        const bucket = best.reps.find((entry) => sameLoad(entry, record));
        if (!bucket) best.reps.push(record);
        else if (record.value > bucket.value) best.reps[best.reps.indexOf(bucket)] = record;
      } else if (!best[kind] || record.value > best[kind].value) {
        best[kind] = record;
      }
    }
  }
  const legacyMax = numeric(exerciseStatForName(state?.exerciseStats, exerciseName)?.legacyMax);
  if (legacyMax > 0 && (!best.e1rm || legacyMax > best.e1rm.value)) {
    best.e1rm = {
      kind: RECORD_KIND.E1RM,
      value: legacyMax,
      load: 0,
      loadMode: 'weighted',
      reps: 0,
      sec: 0,
      dist: 0,
      legacy: true,
      set: null,
    };
  }
  return best;
}

/** Are two rep records the same comparable load? Stored strings are numeric. */
function sameLoad(a, b) {
  return numeric(a?.load) === numeric(b?.load)
    && String(a?.loadMode || 'weighted') === String(b?.loadMode || 'weighted');
}

function priorValue(previousBest) {
  if (previousBest == null) return 0;
  if (typeof previousBest === 'number') return numeric(previousBest);
  return numeric(previousBest.value);
}

/**
 * Does `candidate` beat `previousBest` under the shared per-kind rule?
 *
 * Requires prior history: a first-ever log is a baseline. e1RM uses the shared
 * epsilon (a tie, or a gain too small to display, is not a record); holds,
 * carries and reps compare strictly. For reps, `previousBest` is the bucket
 * array from `bestRecordBefore` and only the candidate's own load is compared.
 *
 * @param {'e1rm'|'hold'|'carry'|'reps'} kind
 * @param {any} candidate
 * @param {any} previousBest
 * @returns {boolean}
 */
export function isRecord(kind, candidate, previousBest) {
  const current = priorValue(candidate);
  if (!(current > 0)) return false;
  if (kind === RECORD_KIND.REPS) {
    const buckets = Array.isArray(previousBest)
      ? previousBest
      : (previousBest ? [previousBest] : []);
    const bucket = buckets.find((entry) => sameLoad(entry, candidate));
    return !!bucket && current > priorValue(bucket);
  }
  const prior = priorValue(previousBest);
  if (!(prior > 0)) return false;
  if (kind === RECORD_KIND.E1RM) return current > prior + E1RM_PR_EPSILON;
  if (kind === RECORD_KIND.HOLD || kind === RECORD_KIND.CARRY) return current > prior;
  return false;
}

/**
 * Re-derive every stored `isPR`/`prKind` stamp on one saved day from the
 * all-time baseline excluding that day.
 *
 * A finished workout is editable: correcting a mistyped load down must remove a
 * badge it no longer earns, and raising a set into a new best must award one.
 * Recomputing the whole day (rather than only the edited row) also keeps the
 * day's stamps consistent when a set is added or removed. Returns the number of
 * PR sets stamped.
 *
 * @param {any} state
 * @param {string|number} weekKey
 * @param {string} day
 * @returns {number}
 */
export function restampSessionRecords(state, weekKey, day) {
  const week = state?.weeks?.[weekKey];
  const dayLifts = week?.lifts?.[day];
  if (!dayLifts || typeof dayLifts !== 'object') return 0;
  const beforeDate = week?.dates?.[day] || null;
  let stamped = 0;
  for (const [liftName, sets] of Object.entries(dayLifts)) {
    if (!Array.isArray(sets)) continue;
    for (const set of sets) {
      if (!set || typeof set !== 'object') continue;
      delete set.isPR;
      delete set.prKind;
    }
    const sessionBest = bestRecordForSession(liftName, sets);
    const prior = bestRecordBefore(state, liftName, {
      excludeWeekKey: weekKey,
      excludeDay: day,
      beforeDate,
    });
    for (const kind of Object.values(RECORD_KIND)) {
      const candidate = sessionBest[kind];
      if (!candidate || !isRecord(kind, candidate, prior[kind])) continue;
      const target = candidate.set;
      if (!target || typeof target !== 'object') continue;
      target.isPR = true;
      target.prKind = kind;
      stamped += 1;
    }
  }
  return stamped;
}
