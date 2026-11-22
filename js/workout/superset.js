// @ts-check
// =============================================================================
// SUPERSET / CIRCUIT MODEL (js/workout/superset.js)
//
// A circuit is memory, not a stored mode: members are the same-day lifts that
// share a non-empty `groupId`, and everything the cockpit shows about the group
// is derived from `weekData.lifts` at read time. There is no group-complete flag
// to keep in sync.
//
// Rest belongs to the GROUP, never to a single member. The timer starts only
// after the last exercise in the round has caught up with the one just ticked.
// A warm-up tick is not part of a round (it falls through to the existing
// warm-up rest tier), and a drop set never starts a rest at all.
//
// PURE. No DOM, no app state and — deliberately — no import of
// `../workout.js`, so the panel and the logger can share one definition without
// recreating the module cycle the workout split guard prevents.
// =============================================================================
import { isCompletedSet, isWarmupSet } from '../set-utils.js';
import { DEFAULT_REST_TIERS, resolveRestDuration } from './rest-duration.js';

/** Group ids are A…Z then AA…ZZ. Never punctuation, never a bare number. */
export const GROUP_ID_RE = /^[A-Z]{1,2}$/;

// A–F keep their original colours so an existing pair looks identical after the
// update. The wider palette continues beyond F (the old code fell back to blue
// for every later group) and is stable for two-letter ids.
const BASE_COLORS = /** @type {const} */ ({
  A: '#3b82f6',
  B: '#a855f7',
  C: '#10b981',
  D: '#f59e0b',
  E: '#ec4899',
  F: '#06b6d4',
});
const EXTRA_COLORS = /** @type {const} */ ([
  '#8b5cf6', // G  violet
  '#14b8a6', // H  teal
  '#f97316', // I  orange
  '#84cc16', // J  lime
  '#eab308', // K  yellow
  '#f43f5e', // L  rose
  '#0ea5e9', // M  sky
  '#d946ef', // N  fuchsia
  '#22c55e', // O  emerald
  '#ef4444', // P  red
  '#6366f1', // Q  indigo
  '#64748b', // R  slate
]);

/** True for a well-formed circuit letter (`A`…`Z`, `AA`…`ZZ`). */
export function isGroupId(value) {
  return typeof value === 'string' && GROUP_ID_RE.test(value);
}

/** The id when it is valid, otherwise null. */
export function normaliseGroupId(value) {
  return isGroupId(value) ? value : null;
}

/** The spreadsheet-style id at a zero-based position: A…Z, AA, AB, … ZZ. */
function groupIdAt(index) {
  if (index < 0) return '';
  if (index < 26) return String.fromCharCode(65 + index);
  const first = Math.floor(index / 26) - 1;
  const second = index % 26;
  return String.fromCharCode(65 + first) + String.fromCharCode(65 + second);
}

/** Zero-based position of a well-formed id, or -1. */
function groupIdIndex(groupId) {
  if (!isGroupId(groupId)) return -1;
  if (groupId.length === 1) return groupId.charCodeAt(0) - 65;
  return (groupId.charCodeAt(0) - 64) * 26 + (groupId.charCodeAt(1) - 65);
}

/**
 * The first free group id on this day.
 *
 * The old allocator walked single characters, so the 27th circuit became `[`
 * (and the 28th `\`). Two-letter ids keep the namespace intact. An invalid tag
 * left by that bug is ignored rather than reserved.
 * @param {Record<string, any>|null|undefined} dayMeta
 * @returns {string}
 */
export function nextGroupId(dayMeta) {
  const used = new Set(
    Object.values(dayMeta || {})
      .map((meta) => normaliseGroupId(meta?.groupId))
      .filter(Boolean),
  );
  for (let i = 0; i < 26 * 27; i++) {
    const id = groupIdAt(i);
    if (!used.has(id)) return id;
  }
  return 'ZZ';
}

/**
 * The stable colour for a group id. A–F keep their historic values; later ids
 * continue through a wider palette instead of collapsing to blue.
 * @param {string|null|undefined} groupId
 * @returns {string}
 */
export function colorForGroupId(groupId) {
  const index = groupIdIndex(groupId);
  if (index < 0) return BASE_COLORS.A;
  if (index < 6) return BASE_COLORS[/** @type {keyof typeof BASE_COLORS} */ (groupId)];
  return EXTRA_COLORS[(index - 6) % EXTRA_COLORS.length];
}

/** A row that participates in a circuit round: not a warm-up, not a drop set. */
function isCircuitRow(set) {
  return !isWarmupSet(set) && set?.type !== 'D';
}

/** The working rows that form the round. */
function circuitRows(sets) {
  return (Array.isArray(sets) ? sets : []).filter(isCircuitRow);
}

/**
 * Completed circuit rows. `tickIndex` is the row the caller has just ticked but
 * whose completion flag may not be committed yet (the cockpit commits the DOM
 * after it has fired the rest decision), so it counts as complete.
 * @param {any[]|null|undefined} sets
 * @param {number|null} tickIndex
 * @returns {number}
 */
function doneRows(sets, tickIndex) {
  let done = 0;
  (Array.isArray(sets) ? sets : []).forEach((set, index) => {
    if (!isCircuitRow(set)) return;
    if (isCompletedSet(set) || index === tickIndex) done++;
  });
  return done;
}

/**
 * Every live lift on the same day that shares this lift's non-empty groupId.
 * A stale tag on a lift whose rows were deleted is not a member: it cannot
 * render, cannot be trained and must not block rest for the rest of the group.
 * A lift with zero working rows (warm-ups/drops only) is not a member either —
 * it would otherwise inflate the header count and sit in the progress
 * denominator forever, since it has nothing left to finish.
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @returns {string[]}
 */
export function membersFor(weekData, day, liftName) {
  const meta = weekData?.liftMeta?.[day];
  const groupId = normaliseGroupId(meta?.[liftName]?.groupId);
  if (!groupId) return [];
  const dayLifts = weekData?.lifts?.[day];
  return Object.keys(meta || {}).filter((name) => {
    if (normaliseGroupId(meta[name]?.groupId) !== groupId) return false;
    // When the day's lifts are available, a tag without trainable rows is not a
    // member.
    if (!dayLifts) return true;
    const sets = dayLifts[name];
    return Array.isArray(sets) && circuitRows(sets).length > 0;
  });
}

/**
 * Members in the logger's own order (`liftOrder`/active session order), never
 * object-key order. Names missing from `orderedNames` keep their relative
 * meta order at the end rather than being dropped.
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {string[]|null|undefined} orderedNames
 * @returns {string[]}
 */
export function membersInOrder(weekData, day, liftName, orderedNames) {
  const members = membersFor(weekData, day, liftName);
  if (!members.length) return [];
  const memberSet = new Set(members);
  const result = [];
  const seen = new Set();
  for (const name of Array.isArray(orderedNames) ? orderedNames : []) {
    if (memberSet.has(name) && !seen.has(name)) {
      result.push(name);
      seen.add(name);
    }
  }
  for (const name of members) {
    if (!seen.has(name)) result.push(name);
  }
  return result;
}

/**
 * Derived state for one circuit: per-member progress, the current member's
 * ordinal, and whether the whole group is complete. Never stored.
 *
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {{ orderedNames?: string[], setIndex?: number|null }} [options]
 */
export function roundState(weekData, day, liftName, options = {}) {
  const meta = weekData?.liftMeta?.[day];
  const groupId = normaliseGroupId(meta?.[liftName]?.groupId);
  if (!groupId) return null;
  const members = membersInOrder(weekData, day, liftName, options.orderedNames);
  const tickIndex = Number.isInteger(options.setIndex) ? /** @type {number} */ (options.setIndex) : null;
  const stats = members.map((name) => {
    const sets = weekData?.lifts?.[day]?.[name];
    const total = circuitRows(sets).length;
    const done = doneRows(sets, name === liftName ? tickIndex : null);
    return { name, done, total, complete: total > 0 && done >= total };
  });
  const current = stats.find((member) => member.name === liftName) || null;
  const ordinal = current ? stats.indexOf(current) + 1 : 0;
  return {
    groupId,
    members: stats,
    ordinal,
    done: current?.done || 0,
    total: current?.total || 0,
    doneMembers: stats.filter((member) => member.complete).length,
    complete: stats.length > 1 && stats.every((member) => member.complete),
  };
}

/**
 * Should this tick start a rest?
 *
 * - Warm-up row: yes — the existing warm-up rest tier handles it (a warm-up is
 *   never a circuit round).
 * - Drop-set row: no. A drop is part of the set just done, not a new round.
 * - No group / lone member: yes, exactly the pre-circuit behaviour.
 * - Group: only once every OTHER member has completed at least
 *   `min(done_ticked, its available working rows)` sets. An uneven circuit
 *   therefore rests once the shorter member has caught up, rather than waiting
 *   forever for sets it does not have.
 *
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {{ setIndex?: number|null, set?: any, orderedNames?: string[] }} [options]
 * @returns {boolean}
 */
export function shouldRestAfterSet(weekData, day, liftName, options = {}) {
  const sets = weekData?.lifts?.[day]?.[liftName];
  const index = Number.isInteger(options.setIndex) ? /** @type {number} */ (options.setIndex) : -1;
  const ticked = options.set && typeof options.set === 'object'
    ? options.set
    : (index >= 0 && Array.isArray(sets) ? sets[index] : null);

  // Unknown row: leave the pre-circuit timer behaviour untouched.
  if (!ticked) return true;
  if (isWarmupSet(ticked)) return true;
  if (ticked.type === 'D') return false;

  const groupId = normaliseGroupId(weekData?.liftMeta?.[day]?.[liftName]?.groupId);
  if (!groupId) return true;

  const members = membersInOrder(weekData, day, liftName, options.orderedNames);
  if (members.length < 2) return true;

  const doneTicked = doneRows(sets, index >= 0 ? index : null);
  if (doneTicked <= 0) return true;

  for (const name of members) {
    if (name === liftName) continue;
    const otherSets = weekData?.lifts?.[day]?.[name];
    const otherTotal = circuitRows(otherSets).length;
    if (otherTotal <= 0) continue;
    const otherDone = doneRows(otherSets, null);
    if (otherDone < Math.min(doneTicked, otherTotal)) return false;
  }
  return true;
}

/**
 * The one rest duration a circuit should use after a tick.
 *
 * A circuit's members can have different plans, overrides and movement tiers
 * (Bench 180 s, Curl 90 s). Asking the timer for the ticked member alone made
 * the rest depend on which member happened to be last. This resolves every
 * member through the SAME precedence and takes the longest — enough rest for
 * the most demanding lift in the round, and stable whichever order the athlete
 * ticks them in.
 *
 * A per-set rest on the ticked row is the athlete's explicit choice for THIS
 * set and wins outright (including `0` = no timer). A warm-up tick is not a
 * circuit round, so it falls through to the warm-up tier only.
 *
 * @param {any} weekData
 * @param {string} day
 * @param {string} liftName
 * @param {{
 *   setIndex?: number|null,
 *   set?: any,
 *   setRpe?: number|string|null,
 *   restTiers?: {warmup:number, compound:number, accessory:number, isolation:number},
 *   restOverrides?: Record<string, number|string>,
 *   planRestFor?: (name:string) => number|string|null|undefined,
 *   orderedNames?: string[],
 * }} [options]
 * @returns {number|null} governing seconds (0 = no timer), or null when the
 *   lift is not in a multi-member circuit.
 */
export function groupRestDuration(weekData, day, liftName, options = {}) {
  const sets = weekData?.lifts?.[day]?.[liftName];
  const index = Number.isInteger(options.setIndex) ? /** @type {number} */ (options.setIndex) : -1;
  const ticked = options.set && typeof options.set === 'object'
    ? options.set
    : (index >= 0 && Array.isArray(sets) ? sets[index] : null);
  if (!ticked) return null;

  const groupId = normaliseGroupId(weekData?.liftMeta?.[day]?.[liftName]?.groupId);
  if (!groupId) return null;
  const members = membersInOrder(weekData, day, liftName, options.orderedNames);
  if (members.length < 2) return null;

  const restTiers = options.restTiers || DEFAULT_REST_TIERS;
  const restOverrides = options.restOverrides || {};
  const planRestFor = typeof options.planRestFor === 'function' ? options.planRestFor : () => null;

  // A drop belongs to the set just done and never starts a rest.
  if (ticked.type === 'D') return 0;

  // Per-set rest outranks everything. Return it without letting another
  // member's plan override the athlete's explicit choice for this set.
  if (ticked.restSec != null && ticked.restSec !== '' && Number.isFinite(Number(ticked.restSec))) {
    return resolveRestDuration({
      liftName,
      setRpe: options.setRpe,
      planRestSec: planRestFor(liftName),
      setRestSec: ticked.restSec,
      restTiers,
      restOverrides,
    });
  }

  // A warm-up tick is not a round: only its own warm-up tier applies.
  if (isWarmupSet(ticked)) {
    return resolveRestDuration({
      liftName,
      setRpe: options.setRpe,
      setType: 'W',
      planRestSec: planRestFor(liftName),
      restTiers,
      restOverrides,
    });
  }

  let duration = 0;
  for (const name of members) {
    const isTicked = name === liftName;
    duration = Math.max(duration, resolveRestDuration({
      liftName: name,
      setRpe: isTicked ? options.setRpe : null,
      setType: isTicked ? (ticked.type || '') : '',
      planRestSec: planRestFor(name),
      // Only the ticked row carries a per-set rest; every other member's
      // resting need comes from its own plan/override/tier.
      setRestSec: null,
      restTiers,
      restOverrides,
    }));
  }
  return duration;
}

/**
 * The group a pair action should produce, without mutating anything.
 *
 * Joining an existing circuit must KEEP its letter: the old implementation
 * always minted a new one and re-lettered both lifts, stranding the previous
 * partner under a dead group id. A lift with no group joins an existing one; only
 * a pair with no group at all allocates the next id. Cross-group merges are
 * refused so an athlete can unlink the other circuit deliberately.
 *
 * @param {Record<string, any>|null|undefined} dayMeta
 * @param {string} liftName
 * @param {string} partnerName
 * @returns {{ ok: true, groupId: string } | { ok: false, reason: 'invalid'|'cross-group', mine?: string|null, theirs?: string|null }}
 */
export function resolveJoin(dayMeta, liftName, partnerName) {
  if (!liftName || !partnerName || liftName === partnerName) {
    return { ok: false, reason: 'invalid' };
  }
  const mine = normaliseGroupId(dayMeta?.[liftName]?.groupId);
  const theirs = normaliseGroupId(dayMeta?.[partnerName]?.groupId);
  if (mine && theirs && mine !== theirs) {
    return { ok: false, reason: 'cross-group', mine, theirs };
  }
  if (mine) return { ok: true, groupId: mine };
  if (theirs) return { ok: true, groupId: theirs };
  return { ok: true, groupId: nextGroupId(dayMeta) };
}

/**
 * Remove one member's tag. If only one member would remain, its tag goes too:
 * a one-member "circuit" is a stale badge, not a group. Other liftMeta fields
 * are untouched.
 *
 * @param {Record<string, any>|null|undefined} dayMeta
 * @param {string} memberName
 * @returns {{ groupId: string|null, removed: boolean, remaining: string[] }}
 */
export function detachMember(dayMeta, memberName) {
  const groupId = normaliseGroupId(dayMeta?.[memberName]?.groupId);
  if (!groupId || !dayMeta?.[memberName]) {
    return { groupId: null, removed: false, remaining: [] };
  }
  delete dayMeta[memberName].groupId;
  const remaining = Object.keys(dayMeta).filter(
    (name) => normaliseGroupId(dayMeta[name]?.groupId) === groupId,
  );
  if (remaining.length <= 1) {
    for (const name of remaining) {
      if (dayMeta[name]) delete dayMeta[name].groupId;
    }
  }
  return { groupId, removed: true, remaining };
}

/**
 * Drop group tags that no longer have a partner. Used when a copied/imported
 * session is narrowed to its live lifts, so a stale single-member tag can never
 * render as a circuit.
 * @param {Record<string, any>|null|undefined} dayMeta
 */
export function pruneSingleMemberGroups(dayMeta) {
  if (!dayMeta || typeof dayMeta !== 'object') return;
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const name of Object.keys(dayMeta)) {
    const groupId = normaliseGroupId(dayMeta[name]?.groupId);
    if (groupId) counts.set(groupId, (counts.get(groupId) || 0) + 1);
  }
  for (const name of Object.keys(dayMeta)) {
    const groupId = normaliseGroupId(dayMeta[name]?.groupId);
    if (groupId && (counts.get(groupId) || 0) < 2) delete dayMeta[name].groupId;
  }
}
