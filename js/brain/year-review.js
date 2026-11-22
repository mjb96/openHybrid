// @ts-check
// =============================================================================
// YEAR IN REVIEW (js/brain/year-review.js) — roadmap P12
//
// The calendar-year recap: totals, the best month, annual e1RM PR events, the
// longest training streak inside the year, and the exercises trained most.
//
// Pure and date-strict. Every figure comes from the canonical (deduplicated)
// slot index in analytics/weekly-aggregate.js, bucketed by each session's REAL
// stamped date — never by `state.currentWeek`, which is a PROGRAM counter and
// can point at a prior calendar week. Sessions are counted by identity inside a
// date, so a strength session plus a run is two sessions, two runs are two, and
// a copied/duplicated slot on one date is still one.
//
// No bodyweight is reported: weigh-ins are stored in the unit the athlete was
// using at the time, so a cross-unit annual delta would be a false claim.
// =============================================================================
import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';
import { isValidWorkingSet, setVolume } from '../set-utils.js';
import { resolveExercise } from '../exercises/catalog.js';
import { estimatedE1rmForSet, isE1rmPr } from '../strength/e1rm.js';
import { addDaysISO, localDayKey, todayKey } from '../dates.js';

const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const round1 = (n) => Math.round(n * 10) / 10;

/**
 * The year the seasonal Year in Review describes, or null outside its season.
 *
 * It is a December/January surface: in December it recaps the current (partial)
 * year, and in January it recaps the year that just ended. Any other month
 * returns null so the section is genuinely absent rather than permanently
 * half-empty.
 *
 * @param {string} todayISO today's local calendar key (YYYY-MM-DD)
 * @returns {number|null}
 */
export function yearReviewYear(todayISO) {
  const key = localDayKey(todayISO);
  if (!key) return null;
  const [year, month] = key.split('-').map(Number);
  if (month === 12) return year;
  if (month === 1) return year - 1;
  return null;
}

/** "Jan 1" for a calendar key. */
function monthDay(key) {
  const [, month, day] = key.split('-').map(Number);
  return `${MONTH_ABBR[month - 1]} ${day}`;
}

/**
 * One strength "session" lives in a slot when it has a working set or recorded
 * gym time. Runs are separate sessions: a strength + run day is two, and two
 * runs on one day are two. A date assembled from several slots adds them up.
 * @param {any} slot
 */
function slotSessionCount(slot) {
  const strength = (slot?.stats?.workingSets || 0) > 0
    || String(slot?.gymStats?.time || '').trim() !== '' ? 1 : 0;
  const runs = Array.isArray(slot?.runSessions) && slot.runSessions.length
    ? slot.runSessions.length
    : ((parseFloat(slot?.run?.dist) || 0) > 0 || String(slot?.run?.time || '').trim() !== '' ? 1 : 0);
  return strength + runs;
}

/** Run distance for one slot in km, without double-counting its day summary. */
function slotDistanceKm(slot) {
  if (Array.isArray(slot?.runSessions) && slot.runSessions.length) {
    return slot.runSessions.reduce((total, session) => total + (parseFloat(session?.dist) || 0), 0);
  }
  return parseFloat(slot?.run?.dist) || 0;
}

/**
 * Annual e1RM PR EVENTS, scanned PER DATE rather than per calendar week.
 *
 * A week-keyed scan is blind at a Dec/Jan boundary (the week containing both
 * dates belongs to one year) and can see only one strength slot per date. Here
 * every valid set from EVERY deduplicated slot on a date contributes to that
 * date's best for its canonical lift. Dates are then read in order and a date
 * is a PR when it beats every earlier date for that lift. A first-ever lift is a
 * baseline, and `isE1rmPr` refuses a tie. Same-date sessions therefore produce
 * at most ONE event, and it is the best of both.
 *
 * @param {Map<string, any[]>} allByDate deduplicated slot index
 * @param {number} year
 */
function collectPrEvents(allByDate, year) {
  /** @type {Map<string, Map<string, number>>} canonical lift → (date → best e1RM) */
  const bestByLiftDate = new Map();

  for (const [date, slots] of allByDate) {
    for (const slot of slots) {
      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        let best = 0;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          const e = estimatedE1rmForSet(lift, set);
          if (e > best) best = e;
        }
        if (best <= 0) continue;
        const identity = resolveExercise(lift)?.name || lift;
        const dates = bestByLiftDate.get(identity) || new Map();
        if (best > (dates.get(date) || 0)) dates.set(date, best);
        bestByLiftDate.set(identity, dates);
      }
    }
  }

  const prefix = `${year}-`;
  const events = [];
  for (const [lift, dates] of bestByLiftDate) {
    const ordered = [...dates.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let priorBest = 0;
    for (const [date, best] of ordered) {
      if (date.startsWith(prefix) && isE1rmPr(best, priorBest)) {
        events.push({
          lift,
          e1rm: Math.round(best),
          date,
          previousBest: Math.round(priorBest),
        });
      }
      if (best > priorBest) priorBest = best;
    }
  }
  return events.sort((a, b) => b.e1rm - a.e1rm
    || a.date.localeCompare(b.date)
    || a.lift.localeCompare(b.lift));
}

/**
 * The longest run of consecutive active calendar dates WITHIN the year. Dates
 * before the year are not allowed to extend a January streak.
 * @param {string[]} dates sorted, unique YYYY-MM-DD keys
 */
function longestStreakIn(dates) {
  let longest = 0;
  let current = 0;
  let previous = null;
  for (const date of dates) {
    if (previous && addDaysISO(previous, 1) === date) current++;
    else current = 1;
    if (current > longest) longest = current;
    previous = date;
  }
  return longest;
}

/**
 * The calendar-year recap.
 *
 * @param {any} state
 * @param {string[]} _days accepted for parity with the other brain builders;
 *   attribution comes from the sessions' stamped dates, not the active plan.
 * @param {{ year?: number, today?: string }} [opts]
 * @returns {{
 *   year:number, rangeLabel:string, isPartial:boolean, hasData:boolean,
 *   totals:{ sessions:number, activeDays:number, activeMonths:number,
 *     workingSets:number, volumeKg:number, distanceKm:number,
 *     prCount:number, longestStreak:number },
 *   months:Array<{ month:number, label:string, sessions:number, activeDays:number,
 *     workingSets:number, volumeKg:number, distanceKm:number }>,
 *   bestMonth:{ month:number, label:string, sessions:number, activeDays:number,
 *     workingSets:number, volumeKg:number, distanceKm:number }|null,
 *   prs:Array<{ lift:string, e1rm:number, date:string,
 *     previousBest:number }>,
 *   topExercises:Array<{ name:string, sets:number, volumeKg:number }>
 * }}
 */
export function buildYearInReview(state, _days, opts = {}) {
  const today = localDayKey(opts.today) || todayKey();
  const requested = Number.parseInt(String(opts.year ?? ''), 10);
  const year = Number.isFinite(requested) ? requested : Number(today.slice(0, 4));
  const todayYear = Number(today.slice(0, 4));
  const isPartial = year === todayYear && today < `${year}-12-31`;
  const labelEnd = isPartial ? today : `${year}-12-31`;
  const rangeLabel = `${MONTH_ABBR[0]} 1 – ${monthDay(labelEnd)}, ${year}`;

  const index = indexSlotsByDate(state);
  const prefix = `${year}-`;
  const dates = [...index.allByDate.keys()].filter((date) => date.startsWith(prefix)).sort();

  const months = MONTH_LABELS.map((label, i) => ({
    month: i + 1,
    label,
    sessions: 0,
    activeDays: 0,
    workingSets: 0,
    volumeKg: 0,
    distanceKm: 0,
  }));
  const monthDates = MONTH_LABELS.map(() => new Set());
  const exerciseTotals = new Map();
  const activeDates = [];
  let sessions = 0;
  let workingSets = 0;
  let volumeKg = 0;
  let distanceKm = 0;

  for (const date of dates) {
    const slots = index.allByDate.get(date) || [];
    let dateSessions = 0;
    for (const slot of slots) {
      dateSessions += slotSessionCount(slot);
      workingSets += slot.stats?.workingSets || 0;
      volumeKg += slot.stats?.volumeKg || 0;
      distanceKm += slotDistanceKm(slot);

      for (const [lift, sets] of Object.entries(slot.lifts || {})) {
        if (!Array.isArray(sets)) continue;
        let validSets = 0;
        let liftVolume = 0;
        for (const set of sets) {
          if (!isValidWorkingSet(set)) continue;
          validSets++;
          liftVolume += setVolume(set);
        }
        if (!validSets) continue;
        const identity = resolveExercise(lift)?.name || lift;
        const row = exerciseTotals.get(identity) || { name: identity, sets: 0, volumeKg: 0 };
        row.sets += validSets;
        row.volumeKg += liftVolume;
        exerciseTotals.set(identity, row);
      }
    }
    if (!dateSessions) continue;

    const monthIdx = Number(date.slice(5, 7)) - 1;
    const month = months[monthIdx];
    month.sessions += dateSessions;
    month.workingSets += slots.reduce((total, slot) => total + (slot.stats?.workingSets || 0), 0);
    month.volumeKg += slots.reduce((total, slot) => total + (slot.stats?.volumeKg || 0), 0);
    month.distanceKm += slots.reduce((total, slot) => total + slotDistanceKm(slot), 0);
    monthDates[monthIdx].add(date);
    sessions += dateSessions;
    activeDates.push(date);
  }

  months.forEach((month, i) => {
    month.activeDays = monthDates[i].size;
    month.volumeKg = Math.round(month.volumeKg);
    month.distanceKm = round1(month.distanceKm);
  });

  const trainedMonths = months.filter((month) => month.sessions > 0);
  const bestMonth = trainedMonths.length
    ? [...trainedMonths].sort((a, b) => b.sessions - a.sessions
      || b.volumeKg - a.volumeKg
      || a.month - b.month)[0]
    : null;

  const prs = collectPrEvents(index.allByDate, year);
  const topExercises = [...exerciseTotals.values()]
    .sort((a, b) => b.sets - a.sets
      || b.volumeKg - a.volumeKg
      || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((row) => ({ name: row.name, sets: row.sets, volumeKg: Math.round(row.volumeKg) }));

  return {
    year,
    rangeLabel,
    isPartial,
    hasData: sessions > 0,
    totals: {
      sessions,
      activeDays: activeDates.length,
      activeMonths: trainedMonths.length,
      workingSets,
      volumeKg: Math.round(volumeKg),
      distanceKm: round1(distanceKm),
      prCount: prs.length,
      longestStreak: longestStreakIn(activeDates),
    },
    months,
    bestMonth,
    prs,
    topExercises,
  };
}
