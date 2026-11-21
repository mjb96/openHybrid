import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReview, reviewToText, pickWeeklyFocus } from '../js/brain/weekly-review.js';
import { addDaysISO } from '../js/analytics/weekly-aggregate.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TODAY = '2026-11-20'; // Friday
const W1 = '2026-11-02';
const W2 = '2026-11-09';
const W3 = '2026-11-16';

function weekData(startMonday, weight, dist) {
  const mon = startMonday;
  const wed = addDaysISO(startMonday, 2);
  return {
    lifts: {
      mon: {
        'Back Squat': [
          { w: String(weight), r: 5, c: true },
          { w: String(weight), r: 5, c: true },
        ],
      },
    },
    runs: {},
    runSessions: {
      wed: [{
        sessionId: `run-${startMonday}`,
        dist: String(dist),
        time: '25:00',
        rpe: '6',
        localDate: wed,
        source: 'gps',
      }],
    },
    gymRpe: { mon: '7' },
    gymStats: { mon: { time: '45:00' } },
    dates: { mon, wed },
    sessionStatus: { mon: 'finished' },
  };
}

function makeState() {
  return {
    currentWeek: '3',
    weekStartedAt: W3,
    settings: { fitnessLevel: 'intermediate' },
    weeks: {
      '1': weekData(W1, 100, 5),
      '2': weekData(W2, 105, 6),
      '3': weekData(W3, 110, 7),
    },
    loadMetrics: { atl: 9, ctl: 10 },
    hybridScore: {
      xp: 900, lastRecordedDate: TODAY,
      history: [
        { date: '2026-11-15', score: 72, level: 2 },
        { date: '2026-11-18', score: 78, level: 2 },
        { date: TODAY, score: 84, level: 2 },
      ],
    },
  };
}
const PROGRAM = { totalWeeks: 12, days: { mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] }, wed: { title: 'Run', runs: '5k easy' } } };

// A real five-day week — the shape that produced the "40% · 2/5 planned" defect
// when a PAST week was scored against the plan the athlete is on today.
const PROGRAM5 = {
  totalWeeks: 12,
  days: {
    mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] },
    tue: { title: 'Run', runs: '5k easy' },
    wed: { title: 'Press', runs: 'Rest', lifts: [{ name: 'Bench Press' }] },
    thu: { title: 'Lower', runs: 'Rest', lifts: [{ name: 'Deadlift' }] },
    fri: { title: 'Upper', runs: 'Rest', lifts: [{ name: 'Barbell Row' }] },
  },
};

test('buildWeeklyReview: calendar totals, PR detection, score arc', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY });
  assert.equal(r.hasData, true);
  assert.equal(r.wkNum, 3);
  assert.equal(r.totals.sessions, 2);                 // mon lift + wed run
  assert.equal(r.totals.volume, 110 * 5 * 2);         // 2×5 @ 110
  assert.equal(r.totals.distanceKm, 7);
  // Week 3 squat e1RM beats weeks 1–2 → PR
  assert.equal(r.prs.length, 1);
  assert.equal(r.prs[0].lift, 'Back Squat');
  // Arc across the recorded week: 72 → 84
  assert.equal(r.arc.hasData, true);
  assert.equal(r.arc.delta, 12);
  assert.ok(r.focus.area.length > 0);
  assert.equal(r.isCurrentWeek, true);
  assert.equal(r.label, 'This week');
});

test('buildWeeklyReview: the score arc follows the reviewed day, not the system clock', () => {
  // On 2026-11-22 the cutoff is 2026-11-16, so the arc holds 18 Nov + 20 Nov
  // (78 → 84). A system-clock read on any other day returns a different arc,
  // which is why this fixture must stay deterministic forever.
  const mid = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: '2026-11-22' });
  assert.equal(mid.arc.hasData, true);
  assert.equal(mid.arc.delta, 6);

  // Far past the recorded week, the same state has no arc at all.
  const expired = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: '2026-12-20' });
  assert.equal(expired.arc.hasData, false);
});

test('buildWeeklyReview: a selected past week reviews that week, labelled by its real range', () => {
  // The Progress hub's Consistency card opens Review while the navigator sits on
  // a historical week. Totals, PR comparison and the label must all belong to
  // that week — never the live one.
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY, weekStart: W2 });
  assert.equal(r.isCurrentWeek, false);
  assert.equal(r.weekStart, W2);
  assert.equal(r.label, '9–15 Nov');
  assert.deepEqual(r.range, { start: W2, end: '2026-11-15' });
  assert.equal(r.totals.sessions, 2);          // Wed run + Mon lift of week 2
  assert.equal(r.totals.volume, 105 * 5 * 2);  // NOT week 3's 110 kg
  assert.equal(r.totals.distanceKm, 6);        // NOT week 3's 7 km
  assert.equal(r.prs.length, 1);               // 105 beats week 1's 100
  // Share copy introduces the range instead of claiming "this week".
  assert.match(reviewToText(r), /^Week of 9–15 Nov on openHybrid: 1,050 kg lifted · 6 km run · 2 sessions · 1 PR/);
});

test('buildWeeklyReview: the live week keeps the literal "This week" label', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY, weekStart: W3 });
  assert.equal(r.isCurrentWeek, true);
  assert.equal(r.label, 'This week');
  assert.match(reviewToText(r), /^This week on openHybrid:/);
});

test('buildWeeklyReview: adherence counts sessions, not sets', () => {
  // The audit's "6% · 5/81" contradiction: five completed sets in a part-finished
  // session must read as sessions against the plan, the same unit the Progress
  // hub uses, and imported archives must count by their real date.
  const state = makeState();
  const importedDay = (day, date) => ({
    lifts: { [day]: { 'Back Squat': [{ w: '100', r: 5, c: true }, { w: '100', r: 5, c: true }] } },
    dates: { [day]: date },
    gymStats: { [day]: { time: '45:00' } },
    sessionStatus: { [day]: 'finished' },
    runs: {}, runSessions: {}, gymRpe: {}, notes: {}, bodyWeight: {}, liftMeta: {},
    sessionId: `og_${day}`, sessionTitle: 'Imported', source: 'csv-import', activationId: 'imported',
  });
  state.weeks['arch:import:thu'] = importedDay('thu', addDaysISO(W3, 3));
  state.weeks['arch:import:fri'] = importedDay('fri', addDaysISO(W3, 4));
  const program = {
    totalWeeks: 12,
    days: {
      mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] },
      tue: { title: 'Run', runs: '5k easy' },
      thu: { title: 'Upper', runs: 'Rest', lifts: [{ name: 'Bench Press' }] },
      fri: { title: 'Lower', runs: 'Rest', lifts: [{ name: 'Deadlift' }] },
    },
  };
  const r = buildWeeklyReview(state, DAYS, program, { today: TODAY });
  assert.equal(r.consistency.total, 4);
  assert.equal(r.consistency.done, 4); // Mon lift, Wed run, Thu + Fri imports
  assert.equal(r.consistency.pct, 100);
  assert.equal(r.consistency.unit, 'sessions');
});

test('buildWeeklyReview: imported archived weeks are this week when their DATE says so', () => {
  const state = {
    currentWeek: '1',
    settings: { fitnessLevel: 'intermediate' },
    weeks: {
      '1': { dates: {}, lifts: {}, runs: {}, runSessions: {}, gymStats: {}, sessionStatus: {} },
      'arch:import:prev': {
        ...weekData(W2, 100, 5),
        activationId: 'imported', programId: 'imported', sessionId: 'og_prev',
        sessionTitle: 'Imported Push', source: 'csv-import',
      },
      'arch:import:this': {
        ...weekData(W3, 120, 8),
        activationId: 'imported', programId: 'imported', sessionId: 'og_this',
        sessionTitle: 'Imported Push', source: 'csv-import',
      },
    },
  };
  const r = buildWeeklyReview(state, DAYS, null, { today: TODAY });
  assert.equal(r.totals.sessions, 2);
  assert.equal(r.totals.volume, 120 * 5 * 2);
  assert.equal(r.totals.distanceKm, 8);
  assert.equal(r.totals.sets, 2);
  assert.equal(r.prs.length, 1);
  assert.equal(r.prs[0].lift, 'Back Squat');
  assert.match(reviewToText(r), /This week on openHybrid: 1,200 kg lifted · 8 km run · 2 sessions · 1 PR/);
});

test('buildWeeklyReview: a frozen program week is not this calendar week', () => {
  const state = {
    currentWeek: '3',
    settings: {},
    weeks: {
      // currentWeek still points at week 3, but its dates are LAST week.
      '3': weekData(W2, 110, 7),
    },
  };
  const r = buildWeeklyReview(state, DAYS, null, { today: TODAY });
  assert.equal(r.totals.sessions, 0);
  assert.equal(r.totals.volume, 0);
  assert.equal(r.totals.distanceKm, 0);
  assert.equal(r.hasData, false);
});

test('buildWeeklyReview: empty week degrades honestly', () => {
  const r = buildWeeklyReview({ currentWeek: '1', settings: {}, weeks: {} }, DAYS, null, { today: TODAY });
  assert.equal(r.hasData, false);
  assert.match(reviewToText(r), /no sessions logged/);
});

test('buildWeeklyReview: a past week is never scored against the ACTIVE plan', () => {
  // A five-day plan is active TODAY; the reviewed week (week 2) holds two
  // sessions from an older run. The hub already stopped scoring historical weeks
  // against the current plan; Review must agree instead of saying "40% · 2/5".
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM5, { today: TODAY, weekStart: W2 });
  assert.equal(r.isCurrentWeek, false);
  assert.equal(r.label, '9–15 Nov');            // the real calendar range
  assert.equal(r.totals.sessions, 2);
  assert.equal(r.consistency.total, null);      // no plan to score against
  assert.equal(r.consistency.pct, null);
  assert.equal(r.consistency.done, 2);          // what WAS logged still counts
  assert.equal(r.focus, null);                  // no advice for a finished week
  assert.equal(r.arc.hasData, false);           // never the live 7-day score
  const txt = reviewToText(r);
  assert.doesNotMatch(txt, /next week/i);
  assert.doesNotMatch(txt, /Hybrid Score/);
  assert.doesNotMatch(txt, /planned/);
  assert.match(txt, /^Week of 9–15 Nov on openHybrid: 1,050 kg lifted · 6 km run · 2 sessions · 1 PR 🏆\.$/);

  // The live week still scores the plan it is actually being trained under.
  const live = buildWeeklyReview(makeState(), DAYS, PROGRAM5, { today: TODAY, weekStart: W3 });
  assert.equal(live.isCurrentWeek, true);
  assert.equal(live.consistency.total, 5);
  assert.equal(live.consistency.done, 2);
  assert.equal(live.consistency.pct, 40);
  assert.ok(live.focus);
});

test('buildWeeklyReview: an empty past week is honestly empty, not "0 sessions" beside a score', () => {
  // The state carries a live Hybrid Score history near TODAY. A June week with
  // no training must still render the empty state — the live arc used to make
  // `hasData` true, which produced a "0 sessions · 0 PRs" review with a score.
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY, weekStart: '2026-06-01' });
  assert.equal(r.hasData, false);
  assert.equal(r.arc.hasData, false);
  assert.equal(r.focus, null);
  assert.equal(r.consistency.total, null);
  assert.equal(reviewToText(r), 'Week of 1–7 Jun: no sessions logged.');
});

test('buildWeeklyReview: the live score arc alone does not count as training data', () => {
  const state = { ...makeState(), weeks: {} };
  const r = buildWeeklyReview(state, DAYS, PROGRAM, { today: TODAY });
  assert.equal(r.isCurrentWeek, true);
  assert.equal(r.arc.hasData, true);   // the score exists …
  assert.equal(r.hasData, false);      // … but the week logged no training
  assert.match(reviewToText(r), /no sessions logged yet/);
});

test('reviewToText: a historical week keeps its numbers and drops the live lines', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY, weekStart: W1 });
  const txt = reviewToText(r);
  assert.match(txt, /^Week of 2–8 Nov on openHybrid: 1,000 kg lifted · 5 km run · 2 sessions\.$/);
  assert.doesNotMatch(txt, /Hybrid Score|next week|focus/i);
});

test('pickWeeklyFocus: priority order', () => {
  assert.equal(pickWeeklyFocus({ consistencyPct: 50, hasPlan: true, acwr: 1.5, distance: 0, volumeDeltaPct: -20 }).area, 'Consistency');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 1.5, distance: 0, volumeDeltaPct: -20 }).area, 'Recovery');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 0, volumeDeltaPct: -20 }).area, 'Endurance');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: -20 }).area, 'Strength');
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: 5 }).area, 'Momentum');
});

test('pickWeeklyFocus: a deload week overrides the volume-dip / momentum praise', () => {
  // Lower volume on a deload would otherwise read as "volume dipped, rebuild" —
  // the deload branch pre-empts it so the review agrees with the coach.
  const f = pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 0.9, distance: 10, volumeDeltaPct: -20, isDeload: true });
  assert.equal(f.area, 'Deload');
  assert.doesNotMatch(f.text, /progressive overload|rebuild/i);
  // But a genuine safety flag (hot load) still wins over the deload framing.
  assert.equal(pickWeeklyFocus({ consistencyPct: 90, hasPlan: true, acwr: 1.5, distance: 10, volumeDeltaPct: -20, isDeload: true }).area, 'Recovery');
});

test('reviewToText: numbers-first share copy with unit conversion', () => {
  const r = buildWeeklyReview(makeState(), DAYS, PROGRAM, { today: TODAY });
  const txt = reviewToText(r, 'km');
  assert.match(txt, /This week on openHybrid: 1,100 kg lifted · 7 km run · 2 sessions · 1 PR 🏆\./);
  assert.match(txt, /Hybrid Score 84 \(\+12 this week\)/);
  assert.match(txt, /Next week's focus — /);
  assert.match(reviewToText(r, 'mi'), /4\.3 mi run/);
});
