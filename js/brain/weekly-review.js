// @ts-check
// =============================================================================
// WEEKLY REVIEW (js/brain/weekly-review.js) — roadmap R6
//
// The week's story in one screen: totals, week-over-week deltas, PRs, the
// Hybrid Score arc, and ONE focus for next week. Pure builder — reuses the
// shared dashboard model (consistency / streak), the canonical CALENDAR-week
// strength engine (totals + PRs) and the recorded score history. No DOM.
//
// Only the LIVE calendar week describes the present/future: the plan score, the
// live score arc and the "next week" focus belong to it alone. A historical
// selection reports what was logged that week and nothing about a plan it was
// never trained under (the Progress hub made the same correction).
//
// The review is a CALENDAR-week surface. `state.currentWeek` is a PROGRAM
// counter, not a date: imported/archived training lives under `arch:*` keys and
// a frozen program week can point at last calendar week. Reading
// `weeks[currentWeek]` as "this week" reported 0 sessions / 0 kg while the
// athlete's imported workout was sitting in the archive. Every total below is
// bucketed by the real stamped date via weekly-aggregate.js.
//
// Program adherence is deliberately still program-week based (it compares work
// against the active plan); it is returned as `consistency` and never used to
// decide the calendar totals.
//
// reviewToText() renders the same review as share/notification copy.
// =============================================================================
import { computeDashboardModel } from '../home/dashboard-model.js';
import { plannedTrainingDays } from '../analytics/progress-landing.js';
import { bestE1rmByLiftForWeek, liftE1rmByCalendarWeek } from '../analytics/strength-calendar.js';
import { collectCalendarWeek, weekStartOf, addDaysISO, localDayKey, DAY_KEYS } from '../analytics/weekly-aggregate.js';
import { isE1rmPr } from '../strength/e1rm.js';
import { isProgramDeloadWeek } from './day-verdict.js';
import { todayKey, formatWeekRange } from '../dates.js';
import { isValidWorkingSet, setVolume } from '../set-utils.js';

const round1 = (n) => Math.round(n * 10) / 10;

function pctDelta(current, prev) {
  if (!prev || prev <= 0) return null;
  return Math.round(((current - prev) / prev) * 100);
}

// Lifts whose best estimated 1RM this CALENDAR week beats their best in ALL
// prior calendar weeks. A first-ever lift (no prior best) is not a PR — same
// rule as the session recap. Both maps come from the one calendar engine, so the
// review and the Strength overview cannot disagree.
function calendarWeekPRs(state, weekStart, today) {
  const thisWeek = bestE1rmByLiftForWeek(state, { weekStart, today });
  const byLift = liftE1rmByCalendarWeek(state);
  const prs = [];
  for (const [lift, rec] of Object.entries(thisWeek)) {
    const weeksMap = byLift[lift];
    let priorBest = 0;
    if (weeksMap) {
      for (const [wk, weekRec] of weeksMap) {
        if (wk < weekStart && weekRec.best > priorBest) priorBest = weekRec.best;
      }
    }
    if (!isE1rmPr(rec.bestEstimated1RM, priorBest)) continue;
    prs.push({ lift, e1rm: Math.round(rec.bestEstimated1RM), prevBest: Math.round(priorBest) });
  }
  return prs.sort((a, b) => b.e1rm - a.e1rm);
}

// Every calendar-week total is derived from the same date-strict, deduplicated
// slot index the Home recaps and Progress charts use.
function collectWeekTotals(state, weekStart, index) {
  const week = collectCalendarWeek(state, weekStart, { index });
  const days = DAY_KEYS.map((dayKey, i) => {
    const date = addDaysISO(weekStart, i);
    let workingSets = 0;
    let volumeKg = 0;
    const dayLifts = week.lifts?.[dayKey] || {};
    for (const sets of Object.values(dayLifts)) {
      if (!Array.isArray(sets)) continue;
      for (const set of sets) {
        if (!isValidWorkingSet(set)) continue;
        workingSets++;
        volumeKg += setVolume(set);
      }
    }
    const distanceKm = parseFloat(week.runs?.[dayKey]?.dist) || 0;
    const counts = week.sessionCounts?.[dayKey];
    const strengthSessions = counts ? counts.strength : (workingSets > 0 ? 1 : 0);
    const runningSessions = counts ? counts.running : (distanceKm > 0 ? 1 : 0);
    return {
      date,
      workingSets,
      volumeKg,
      distanceKm,
      sessions: strengthSessions + runningSessions,
    };
  });
  const sum = (key) => days.reduce((total, day) => total + day[key], 0);
  return {
    days,
    workingSets: sum('workingSets'),
    volumeKg: sum('volumeKg'),
    distanceKm: sum('distanceKm'),
    sessions: sum('sessions'),
  };
}

// Pace-matched comparison: an in-progress week is judged against the SAME
// weekdays of the previous calendar week, never a partial week against a full
// one. A past week is compared with the full previous week.
function comparisonWindow(totals, today, weekStart) {
  const elapsed = weekStart === weekStartOf(today)
    ? totals.days.filter((day) => day.date <= today).length
    : totals.days.length;
  return totals.days.slice(0, elapsed || totals.days.length);
}

// The Hybrid Score arc across the last 7 recorded days. It is a LIVE series
// anchored on `today`, so it only ever describes the current calendar week — a
// historical selection must not borrow the athlete's present score.
function scoreArc(state, today = todayKey()) {
  const cutoffISO = addDaysISO(today, -6);
  const entries = (state?.hybridScore?.history || [])
    .filter((h) => h.date >= cutoffISO)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!entries.length) return { hasData: false, series: [] };
  const series = entries.map((e) => e.score);
  const avg = Math.round(series.reduce((a, b) => a + b, 0) / series.length);
  return {
    hasData: true,
    start: series[0],
    end: series[series.length - 1],
    delta: series[series.length - 1] - series[0],
    avg,
    series,
  };
}

// ONE focus for next week, priority-ordered and honest: the biggest fixable
// thing first, praise only when everything genuinely held up.
export function pickWeeklyFocus({ consistencyPct, hasPlan, acwr, distance, volumeDeltaPct, isDeload }) {
  if (hasPlan && consistencyPct < 70) {
    return { area: 'Consistency', text: 'Hit every planned session next week — adherence moves your Hybrid Score most.' };
  }
  if (acwr >= 1.3) {
    return { area: 'Recovery', text: 'Load is running hot — ease volume back toward the productive zone and protect sleep.' };
  }
  // A deload week's lower volume is the plan — pre-empt the "volume dipped,
  // rebuild" / "repeat it, progressive overload" lines that would contradict it.
  if (isDeload) {
    return { area: 'Deload', text: "Deload week — lighter by design. Don't chase volume; let the work you've banked consolidate and come back fresh." };
  }
  if (distance <= 0) {
    return { area: 'Endurance', text: 'No running logged this week — get at least one easy Zone 2 run in.' };
  }
  if (volumeDeltaPct !== null && volumeDeltaPct <= -10) {
    return { area: 'Strength', text: 'Lifting volume dipped — rebuild toward recent levels without forcing intensity.' };
  }
  return { area: 'Momentum', text: 'A strong week across the board — repeat it. Progressive overload plus consistency wins.' };
}

/**
 * @param {any} state
 * @param {string[]} days
 * @param {any} program
 * @param {{ today?: string, weekStart?: string, tz?: string }} [opts]
 */
export function buildWeeklyReview(state, days, program, opts = {}) {
  const today = opts.today || localDayKey(new Date(), opts.tz);
  const weekStart = opts.weekStart || weekStartOf(today);
  const model = computeDashboardModel(state, days, program, 'mon', { today });
  const wkNum = model.wkNum;

  const current = collectWeekTotals(state, weekStart);
  const previous = collectWeekTotals(state, addDaysISO(weekStart, -7));
  const currentWindow = comparisonWindow(current, today, weekStart);
  const previousWindow = previous.days.slice(0, currentWindow.length || 7);
  const prevVolume = previousWindow.reduce((total, day) => total + day.volumeKg, 0);
  const prevDistance = previousWindow.reduce((total, day) => total + day.distanceKm, 0);

  const volumeDeltaPct = pctDelta(current.volumeKg, prevVolume);
  const distanceDeltaPct = pctDelta(current.distanceKm, prevDistance);
  const prs = calendarWeekPRs(state, weekStart, today);
  const isCurrentWeek = weekStart === weekStartOf(today);
  // The plan, the live score arc and the "next week" focus describe the run the
  // athlete is on RIGHT NOW. Scoring a historical week against today's program
  // invented an adherence bar it was never trained under (a past week could read
  // "40% · 2/5 planned" for a plan that did not exist yet), and the arc would
  // leak this week's score into a completed week's review. Same rule as the hub.
  const arc = isCurrentWeek ? scoreArc(state, today) : { hasData: false, series: [] };
  const plan = isCurrentWeek ? program : null;

  // Adherence is a SESSION comparison, the same unit the Progress hub shows.
  // The old model used prescribed-vs-completed SETS, so a normal part-finished
  // week rendered as “6% · 5/81” while the hub said “4 of 4 planned”. Planned
  // sessions stay program-week based (that is what a plan is).
  const plannedSessions = plannedTrainingDays(plan);
  const sessionAdherencePct = plannedSessions
    ? Math.min(100, Math.round((current.sessions / plannedSessions) * 100))
    : null;

  const isDeload = isCurrentWeek && isProgramDeloadWeek(state, program);
  const focus = isCurrentWeek
    ? pickWeeklyFocus({
        consistencyPct: sessionAdherencePct ?? 100,
        hasPlan: plannedSessions != null,
        acwr: model.load.hasData ? model.load.acwr : 0,
        distance: current.distanceKm,
        volumeDeltaPct,
        isDeload,
      })
    : null;

  return {
    wkNum,
    isCurrentWeek,
    weekStart,
    // A past selection names its REAL Monday–Sunday range ("9–15 Nov"); only the
    // live calendar week may claim "This week".
    label: isCurrentWeek ? 'This week' : formatWeekRange(weekStart, addDaysISO(weekStart, 6)),
    range: { start: weekStart, end: addDaysISO(weekStart, 6) },
    // Training only: the live score arc used to make an empty week look like it
    // had a story ("0 sessions · 0 PRs" beside a score), so it no longer counts.
    hasData: current.sessions > 0 || current.workingSets > 0 || current.distanceKm > 0 || prs.length > 0,
    totals: {
      volume: Math.round(current.volumeKg),
      distanceKm: round1(current.distanceKm),
      sessions: current.sessions,
      sets: current.workingSets,
      prCount: prs.length,
    },
    deltas: { volumePct: volumeDeltaPct, distancePct: distanceDeltaPct },
    consistency: {
      done: current.sessions,
      // null — not 0 — when there is no plan to score against (always true for a
      // historical week, whose program run is over). Callers drop the whole
      // adherence claim instead of rendering "0 of 0 planned".
      total: plannedSessions,
      pct: sessionAdherencePct,
      unit: 'sessions',
    },
    prs,
    arc,
    streak: model.streak.current,
    focus,
  };
}

// Share / notification copy. Compact, numbers-first, one focus. The Hybrid Score
// line and the forward-looking focus belong to the live week only — a completed
// week's copy states what was done and stops.
export function reviewToText(r, distUnit = 'km', weightUnit = 'kg') {
  // The current week owns the words "This week"; a historical selection is
  // introduced by its real date range.
  const headline = r.isCurrentWeek === false ? `Week of ${r.label}` : r.label;
  if (!r.hasData) {
    return r.isCurrentWeek === false
      ? `${headline}: no sessions logged.`
      : 'This week: no sessions logged yet — next week is a fresh start.';
  }
  const dist = distUnit === 'mi' ? `${round1(r.totals.distanceKm * 0.621371)} mi` : `${r.totals.distanceKm} km`;
  const bits = [
    `${r.totals.volume.toLocaleString()} ${weightUnit} lifted`,
    `${dist} run`,
    `${r.totals.sessions} session${r.totals.sessions === 1 ? '' : 's'}`,
  ];
  if (r.totals.prCount > 0) bits.push(`${r.totals.prCount} e1RM PR lift${r.totals.prCount === 1 ? '' : 's'} 🏆`);
  let txt = `${headline} on openHybrid: ${bits.join(' · ')}.`;
  const isLive = r.isCurrentWeek !== false;
  if (isLive && r.arc?.hasData) txt += ` Hybrid Score ${r.arc.end}${r.arc.delta !== 0 ? ` (${r.arc.delta > 0 ? '+' : ''}${r.arc.delta} this week)` : ''}.`;
  if (isLive && r.focus) txt += ` Next week's focus — ${r.focus.area}: ${r.focus.text}`;
  return txt;
}
