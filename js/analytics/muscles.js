// @ts-check
// =============================================================================
// MUSCLES MODEL (js/analytics/muscles.js)
//
// "Is the volume where I need it?" — credited sets per muscle over the selected
// window, bucketed by week/month/year, with distribution and the change against
// the equal-length previous window.
//
// One credit definition, owned elsewhere: `muscleCreditsForExercise` returns
// 1 for a primary mover, 0.5 for a synergist and 0.25 for an assisting muscle.
// A muscle's "sets" count IS the sum of those credits, so a compound set can be
// one set for the chest and half a set for the triceps — which is exactly how
// the volume guide and the body map already count.
//
// Warm-ups never contribute (they are preparation, not training evidence), and
// holds/carries count as sets with zero tonnage — the set-shape rules live in
// set-utils and are not re-implemented here.
// =============================================================================
import { addDaysISO, daysBetween, formatDayMonthShort } from '../dates.js';
import { MUSCLE_LABELS } from './calculations/volume-landmarks.js';
import { MUSCLE_GROUPS, muscleCreditsForExercise } from '../exercises/catalog.js';
import { buildSessionMuscles } from '../home/session-muscles.js';
import { isValidWorkingSet, setVolume } from '../set-utils.js';
import { indexSlotsByDate, weekStartOf } from './weekly-aggregate.js';
import { inRange } from './ranges.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MAX_BUCKETS = 104;
const round1 = (value) => Math.round(value * 10) / 10;

/** Anatomical muscle → its six-group browsing id, for colour. */
const GROUP_OF = Object.freeze(Object.fromEntries(
  Object.entries(MUSCLE_GROUPS).flatMap(([groupId, group]) => group.muscles.map((muscle) => [muscle, groupId])),
));

/** @param {string} dateISO @param {'week'|'month'|'year'} grouping */
function bucketKeyOf(dateISO, grouping) {
  if (grouping === 'year') return dateISO.slice(0, 4);
  if (grouping === 'month') return dateISO.slice(0, 7);
  return /** @type {string} */ (weekStartOf(dateISO));
}

/** @param {string} key @param {'week'|'month'|'year'} grouping */
function bucketLabelOf(key, grouping) {
  if (grouping === 'year') return key;
  if (grouping === 'month') {
    const [year, month] = key.split('-');
    return `${MONTHS[Number(month) - 1] || month} ${year.slice(2)}`;
  }
  return formatDayMonthShort(key);
}

/** Every bucket start between two dates, oldest → newest. */
function bucketKeysIn(startISO, endISO, grouping) {
  const keys = [];
  if (grouping === 'week') {
    let cursor = /** @type {string} */ (weekStartOf(startISO));
    while (cursor && cursor <= endISO) {
      keys.push(cursor);
      cursor = /** @type {string} */ (addDaysISO(cursor, 7));
    }
    // Keep the NEWEST buckets when the window exceeds the cap: dropping the
    // recent weeks while the headline counted them was the bug.
    return keys.length > MAX_BUCKETS ? keys.slice(-MAX_BUCKETS) : keys;
  }
  if (grouping === 'month') {
    let [year, month] = startISO.split('-').map(Number);
    while (true) {
      const key = `${year}-${String(month).padStart(2, '0')}`;
      if (`${key}-01` > endISO) break;
      keys.push(key);
      month += 1;
      if (month > 12) { month = 1; year += 1; }
      if (keys.length > MAX_BUCKETS * 2) break; // hard stop on absurd spans
    }
    return keys.length > MAX_BUCKETS ? keys.slice(-MAX_BUCKETS) : keys;
  }
  for (let year = Number(startISO.slice(0, 4)); year <= Number(endISO.slice(0, 4)); year++) {
    keys.push(String(year));
  }
  return keys;
}

/**
 * @param {any} state
 * @param {{
 *   range: any,
 *   previous?: { startISO: string, endISO: string }|null,
 *   grouping?: 'week'|'month'|'year',
 *   unit?: string,
 * }} options
 */
export function buildMuscleModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildMuscleModel: range is required');
  const grouping = options.grouping === 'month' || options.grouping === 'year' ? options.grouping : 'week';

  const byDate = state?.weeks ? collectDatedLifts(state) : new Map();

  /** @type {Record<string, number>} muscle → credited sets */
  const totals = {};
  /** @type {Record<string, number>} muscle → credited tonnage */
  const volume = {};
  /** @type {Record<string, number>} */
  const lastTrained = {};
  /** @type {Record<string, Record<string, number>>} bucket → muscle → sets */
  const bucketsByMuscle = {};
  /** @type {Record<string, any[]>} muscle → merged sets, for the body map only */
  const liftsForMap = {};
  let totalSets = 0;
  // The earliest kept date, so an unbounded range can chart its whole history.
  // Falling back to `range.endISO` here charted ONE bucket while the headline
  // counted every session ever.
  /** @type {string|null} */
  let earliestISO = null;

  for (const [dateISO, dayLifts] of byDate) {
    if (!inRange(dateISO, range)) continue;
    if (!earliestISO || dateISO < earliestISO) earliestISO = dateISO;
    const key = bucketKeyOf(dateISO, grouping);
    const bucket = bucketsByMuscle[key] || (bucketsByMuscle[key] = {});

    for (const [liftName, sets] of Object.entries(dayLifts)) {
      if (!Array.isArray(sets)) continue;
      const credits = muscleCreditsForExercise(liftName);
      if (!credits) continue;

      const working = sets.filter(isValidWorkingSet);
      if (!working.length) continue;
      (liftsForMap[liftName] ||= []).push(...working);

      for (const set of working) {
        const tonnage = setVolume(set);
        for (const [muscle, rawCredit] of Object.entries(credits)) {
          const credit = Number(rawCredit);
          if (!(credit > 0)) continue;
          totals[muscle] = (totals[muscle] || 0) + credit;
          volume[muscle] = (volume[muscle] || 0) + tonnage * credit;
          bucket[muscle] = (bucket[muscle] || 0) + credit;
          if (!lastTrained[muscle] || dateISO > lastTrained[muscle]) lastTrained[muscle] = dateISO;
        }
        // The denominator is the sum of ALL credits, so per-muscle shares add
        // up to 100 exactly. A compound set contributes 1 to the prime mover
        // and 0.5 to a synergist — "credited sets", not a raw set count.
        totalSets += Object.values(credits)
          .reduce((sum, credit) => sum + (Number(credit) > 0 ? Number(credit) : 0), 0);
      }
    }
  }

  const previousShares = options.previous ? sharesFor(state, options.previous) : null;

  // Rounding each share independently summed to 99.9 for three equal muscles.
  // Largest-remainder keeps the column honest: the parts add up to the whole.
  const shareOf = allocatePercentages(totals, totalSets);

  const muscles = Object.entries(totals)
    .map(([key, sets]) => {
      const sharePct = shareOf[key] || 0;
      // A muscle with training this window and none last window has a REAL
      // delta (+share), not an unknown one. `null` is reserved for "the
      // previous window had no training at all", where a comparison would be
      // invented rather than measured.
      const previousSharePct = previousShares ? (previousShares[key] ?? 0) : null;
      const deltaPct = previousSharePct == null ? null : round1(sharePct - previousSharePct);
      return {
        key,
        label: MUSCLE_LABELS[key] || key,
        group: GROUP_OF[key] || 'core',
        sets: round1(sets),
        volumeKg: Math.round(volume[key] || 0),
        sharePct,
        previousSharePct,
        deltaPct,
        status: deltaPct == null ? 'none' : deltaPct >= 10 ? 'up' : deltaPct <= -10 ? 'down' : 'steady',
        lastTrainedISO: lastTrained[key] || null,
      };
    })
    .sort((a, b) => b.sets - a.sets || a.label.localeCompare(b.label));

  // The headline is the sum of the ROWS, not an independently rounded total:
  // they disagreed by a tenth whenever a muscle rounded down.
  const displayedTotal = round1(muscles.reduce((sum, muscle) => sum + muscle.sets, 0));

  const startISO = range.startISO || earliestISO;
  const keys = startISO ? bucketKeysIn(startISO, range.endISO, grouping) : [];
  const buckets = keys.map((key) => ({
    key,
    label: bucketLabelOf(key, grouping),
    setsByMuscle: bucketsByMuscle[key] || {},
  }));

  const map = buildSessionMuscles(liftsForMap);

  return {
    range,
    grouping,
    buckets,
    muscles,
    totalSets: displayedTotal,
    totalVolumeKg: Math.round(Object.values(volume).reduce((sum, value) => sum + value, 0)),
    regions: map.regions,
    top: map.top,
    // The ready-made object the shared heat map expects, so the view does not
    // have to reconstruct its shape.
    bodyMap: map,
    // A window with no working sets has nothing to say; the band does not render.
    hasData: muscles.length > 0,
  };
}

/**
 * Percentages that sum to exactly 100 (largest remainder), one decimal.
 * @param {Record<string, number>} values @param {number} total
 */
function allocatePercentages(values, total) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!(total > 0)) return out;
  const entries = Object.entries(values).map(([key, value]) => {
    const exact = (value / total) * 1000; // tenths of a percent
    return { key, floor: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let assigned = entries.reduce((sum, entry) => sum + entry.floor, 0);
  const target = 1000;
  entries.sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; assigned < target && i < entries.length; i++, assigned++) entries[i].floor += 1;
  for (const entry of entries) out[entry.key] = entry.floor / 10;
  return out;
}

/** Every dated day's lifts, deduplicated by the shared slot index. */
function collectDatedLifts(state) {
  /** @type {Map<string, Record<string, any[]>>} */
  const byDate = new Map();
  const index = indexSlotsByDate(state);
  for (const [date, slots] of index.allByDate) {
    /** @type {Record<string, any[]>} */
    const merged = {};
    for (const slot of slots) {
      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        (merged[lift] ||= []).push(...sets);
      }
    }
    if (Object.keys(merged).length) byDate.set(date, merged);
  }
  return byDate;
}

/** Muscle → share percentage for a comparison window. */
function sharesFor(state, window) {
  const byDate = collectDatedLifts(state);
  /** @type {Record<string, number>} */
  const totals = {};
  let total = 0;
  for (const [dateISO, dayLifts] of byDate) {
    if (!inRange(dateISO, window)) continue;
    for (const [liftName, sets] of Object.entries(dayLifts)) {
      const credits = muscleCreditsForExercise(liftName);
      if (!credits) continue;
      for (const set of sets.filter(isValidWorkingSet)) {
        for (const [muscle, rawCredit] of Object.entries(credits)) {
          const credit = Number(rawCredit);
          if (!(credit > 0)) continue;
          totals[muscle] = (totals[muscle] || 0) + credit;
        }
        total += Object.values(credits)
          .reduce((sum, credit) => sum + (Number(credit) > 0 ? Number(credit) : 0), 0);
      }
    }
  }
  if (!(total > 0)) return null;
  /** @type {Record<string, number>} */
  const shares = {};
  for (const [muscle, value] of Object.entries(totals)) {
    shares[muscle] = round1((value / total) * 100);
  }
  return shares;
}

/**
 * How many weeks a window covers, for scaling a weekly reference.
 * @param {any} range
 */
export function weeksInRange(range) {
  const days = range?.days ?? (range?.startISO ? (daysBetween(range.startISO, range.endISO) ?? 0) + 1 : 0);
  return Math.max(1, days / 7);
}
