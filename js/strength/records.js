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
// metres, not in a fabricated load. A bodyweight movement that arrives with a
// bare `w` (an imported "Pull Up 80 kg" with no `bw`/`loadMode`) is refused by
// its identity too: the number cannot open a rep bucket just because the e1RM
// estimate declined it.
//
// Rep records are bucketed by (load, loadMode): 20 reps at 60 kg and 15 reps at
// 80 kg are different achievements, so a session exposes one best per bucket and
// every caller must iterate them. Comparing only the heaviest bucket silently
// threw away a record at a lighter load.
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
import { isBodyweightExercise, resolvedLoadMode } from '../workout/load-mode.js';
import { exercisePerformanceHistory } from '../workout/exercise-history.js';
import { exerciseStatForName, resolveExercise } from '../exercises/catalog.js';

// Re-exported so every existing importer keeps one import path. The template
// imports the leaf module directly so a row render cannot pull the catalogue.
export { PR_KIND_LABELS, prKindLabel } from './pr-labels.js';

export const RECORD_KIND = Object.freeze({
  E1RM: 'e1rm',
  HOLD: 'hold',
  CARRY: 'carry',
  REPS: 'reps',
});

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
 * Does this exercise's load mean body mass rather than external resistance?
 *
 * The NAME pattern catches pull-ups/dips/push-ups even outside the catalogue;
 * the catalogue's own `bodyweight` flag catches everything else (inverted rows,
 * glute-ham raises). Both are needed because an imported set can arrive with a
 * bare numeric `w` and no `bw`/`loadMode` for either.
 * @param {string} exerciseName
 */
function hasBodyweightLoadMeaning(exerciseName) {
  if (isBodyweightExercise(exerciseName)) return true;
  return resolveExercise(exerciseName)?.bodyweight === true;
}

/**
 * Which record a single set can set, or null when it cannot set one.
 *
 * Shape wins: a timed set is a hold and a distance set is a carry, even if the
 * same exercise also has rep sessions. A completed rep set with a comparable
 * load is an e1RM when the shared estimate accepts it and a rep record when it
 * does not (too many reps, or a conditioning exercise the estimate refuses).
 *
 * The rep fallback is deliberately closed to bodyweight movements. The estimate
 * refuses a pull-up because its `w` is body mass, but an import can carry a
 * numeric `w` with no `bw`/`loadMode`; treating that as "80 kg of pull-up" would
 * award a Rep PR that no other surface can reproduce. Both the exercise-name
 * pattern and the catalogue's own `bodyweight` flag are consulted. Sled Push and
 * other loaded conditioning work keep their rep buckets.
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
  if (estimatedE1rmForSet(exerciseName, set) > 0) return RECORD_KIND.E1RM;
  return hasBodyweightLoadMeaning(exerciseName) ? null : RECORD_KIND.REPS;
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

/** Are two rep records the same comparable load? Stored strings are numeric. */
function sameLoad(a, b) {
  return numeric(a?.load) === numeric(b?.load)
    && String(a?.loadMode || 'weighted') === String(b?.loadMode || 'weighted');
}

/** Merge one record (or an array of buckets) into a best-map. */
function mergeRecord(target, record) {
  if (!target || !record) return;
  if (Array.isArray(record)) {
    for (const entry of record) mergeRecord(target, entry);
    return;
  }
  if (record.kind === RECORD_KIND.REPS) {
    const bucket = target.reps.find((entry) => sameLoad(entry, record));
    if (!bucket) target.reps.push(record);
    else if (record.value > bucket.value) target.reps[target.reps.indexOf(bucket)] = record;
    return;
  }
  if (!target[record.kind] || record.value > target[record.kind].value) {
    target[record.kind] = record;
  }
}

/**
 * The best record of each kind inside one session's set list.
 *
 * A mixed session can legitimately hold an e1RM, a hold and a carry at once;
 * they are returned side by side and never compared with each other. `reps` is
 * an ARRAY with one best per (load, load mode) bucket — the same shape
 * `bestRecordBefore` returns — because reps at 60 kg are only comparable with
 * reps at 60 kg. Callers use `recordCandidates` to walk every earned record.
 *
 * @param {string} exerciseName
 * @param {any[]} sets
 * @returns {{e1rm:any, hold:any, carry:any, reps:any[]}}
 */
export function bestRecordForSession(exerciseName, sets) {
  /** @type {{e1rm:any, hold:any, carry:any, reps:any[]}} */
  const best = { e1rm: null, hold: null, carry: null, reps: [] };
  for (const set of sets || []) {
    if (!isValidWorkingSet(set)) continue;
    const kind = recordKindForSet(set, exerciseName);
    if (!kind) continue;
    mergeRecord(best, recordForSet(kind, set, exerciseName));
  }
  return best;
}

/**
 * Flatten a per-kind best map into every candidate record it holds.
 *
 * e1rm/hold/carry yield at most one record each; reps yields one per load
 * bucket. Callers that must not miss a bucket (the recap, the finish review,
 * the exercise drilldown) iterate this instead of `Object.values(RECORD_KIND)`
 * and indexing `records[kind]`.
 *
 * @param {{e1rm:any, hold:any, carry:any, reps:any[]}|null|undefined} records
 * @returns {any[]}
 */
export function recordCandidates(records) {
  if (!records) return [];
  const out = [];
  for (const kind of Object.values(RECORD_KIND)) {
    const value = records[kind];
    if (Array.isArray(value)) out.push(...value.filter(Boolean));
    else if (value) out.push(value);
  }
  return out;
}

/**
 * Merge one session's per-kind bests into a running best-map. Exposed for the
 * exercise drilldown, which walks history oldest → newest and needs the same
 * all-time baseline without rescanning every prior session per row.
 *
 * @param {{e1rm:any, hold:any, carry:any, reps:any[]}} target
 * @param {{e1rm:any, hold:any, carry:any, reps:any[]}} records
 */
export function mergeRecordBests(target, records) {
  if (!target || !records) return target;
  for (const kind of Object.values(RECORD_KIND)) mergeRecord(target, records[kind]);
  return target;
}

/**
 * The best record of each kind from an already-scanned history.
 *
 * `exercisePerformanceHistory` is the expensive part of a PR decision; the
 * recap also needs its newest row for the "Last time" line. Calling both
 * `bestRecordBefore` and the history query scanned the same weeks twice, so the
 * recap passes its one scan here instead.
 *
 * The pre-catalogue `legacyMax` aggregate is kept as an e1RM floor because its
 * source sets no longer exist; without it a genuine old best would be re-awarded.
 *
 * @param {string} exerciseName
 * @param {any[]} rows rows from `exercisePerformanceHistory`
 * @param {any} [state] used only for the legacy e1RM floor
 * @returns {{e1rm:any, hold:any, carry:any, reps:any[]}}
 */
export function bestRecordFromHistory(exerciseName, rows, state = null) {
  /** @type {{e1rm:any, hold:any, carry:any, reps:any[]}} */
  const best = { e1rm: null, hold: null, carry: null, reps: [] };
  for (const row of rows || []) {
    for (const set of row?.workingSets || []) {
      if (!isValidWorkingSet(set)) continue;
      const kind = recordKindForSet(set, exerciseName);
      if (!kind) continue;
      mergeRecord(best, recordForSet(kind, set, exerciseName));
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

/**
 * The best record of each kind from every OTHER session before a date.
 *
 * Uses the canonical exercise history (aliases merged, archived `arch:*` weeks
 * included, dates required), so switching programmes or importing an old log
 * cannot hand out a fresh set of records for a lift the athlete already beat.
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
  const rows = exercisePerformanceHistory(state, exerciseName, {
    scope: 'all',
    exclude: opts.excludeWeekKey == null
      ? undefined
      : { weekKey: opts.excludeWeekKey, day: opts.excludeDay },
    beforeDate: opts.beforeDate,
  });
  return bestRecordFromHistory(exerciseName, rows, state);
}

function priorValue(previousBest) {
  if (previousBest == null) return 0;
  if (typeof previousBest === 'number') return numeric(previousBest);
  return numeric(previousBest.value);
}

/**
 * The previous best the candidate is actually compared with.
 *
 * For reps that is the bucket at the candidate's own (load, load mode), never
 * "whichever bucket happened to be heaviest". Callers that show a delta or a
 * "previous best" figure use this so a Rep PR cannot report a prior value of 0.
 *
 * @param {'e1rm'|'hold'|'carry'|'reps'} kind
 * @param {any} candidate
 * @param {any} previousBest
 * @returns {number}
 */
export function recordPreviousValue(kind, candidate, previousBest) {
  if (kind === RECORD_KIND.REPS) {
    const buckets = Array.isArray(previousBest)
      ? previousBest
      : (previousBest ? [previousBest] : []);
    const bucket = buckets.find((entry) => sameLoad(entry, candidate));
    return priorValue(bucket);
  }
  return priorValue(previousBest);
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
 * An UNDATED day is refused (0): `beforeDate: null` means "no date cut-off", so
 * the day's own sets would be part of its baseline and a saved edit could award
 * itself a record against itself. History without a date is not a baseline.
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
  if (!beforeDate) return 0;
  let stamped = 0;
  for (const [liftName, sets] of Object.entries(dayLifts)) {
    if (!Array.isArray(sets)) continue;
    const prior = bestRecordBefore(state, liftName, {
      excludeWeekKey: weekKey,
      excludeDay: day,
      beforeDate,
    });
    for (const set of sets) {
      if (!set || typeof set !== 'object') continue;
      delete set.isPR;
      delete set.prKind;
      if (!isValidWorkingSet(set)) continue;
      // Each set is judged against the all-time baseline for its OWN shape, not
      // against another set in the same session — the same rule the live
      // cockpit applies when it ticks the set.
      const kind = recordKindForSet(set, liftName);
      if (!kind) continue;
      const record = recordForSet(kind, set, liftName);
      if (!isRecord(kind, record, prior[kind])) continue;
      set.isPR = true;
      set.prKind = kind;
      stamped += 1;
    }
  }
  return stamped;
}
