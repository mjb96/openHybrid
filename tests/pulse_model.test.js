// =============================================================================
// PULSE MODEL — "am I showing up, in both?"
//
// The cases here are the ones that historically produced wrong numbers across
// this app: archived activations, one-offs, two sessions on one date, warm-up
// only days, and runs that must never be mixed with walks.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPulseModel } from '../js/analytics/pulse.js';
import { renderPulse } from '../js/analytics/views/view-pulse.js';

/** @param {any} model */
const renderPulseFor = (model) => renderPulse(model);

const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warmup = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });

// Tuesday of the week beginning Mon 2026-11-23.
const TODAY = '2026-11-24';

function fixture(overrides = {}) {
  return {
    currentWeek: '9',            // deliberately irrelevant — a program week is not a period
    activeProgramId: 'prog',
    weeks: {
      '1': {
        dates: { mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25' },
        lifts: {
          mon: { 'Bench Press': [done(100), done(100)] },
          // Warm-up only: preparation, not training evidence.
          wed: { 'Back Squat': [warmup(60), warmup(80)] },
        },
        runSessions: {
          tue: [
            { dist: '5', time: '25:00', type: 'run', sessionId: 'run_1' },
            { dist: '2', time: '20:00', type: 'walk', sessionId: 'walk_1' },
          ],
        },
      },
      // Previous calendar week, for the elapsed-matched comparison.
      '2': {
        dates: { mon: '2026-11-16' },
        lifts: { mon: { 'Overhead Press': [done(50)] } },
      },
      // An archived activation's session lands in the week it HAPPENED.
      'arch:old:3': {
        sessionId: 'str_old', activationId: 'old',
        dates: { mon: '2026-11-23' },
        lifts: { mon: { 'Back Squat': [done(140)] } },
      },
      // A one-off session on the same day as a programmed one.
      'session:str_1': {
        sessionId: 'str_1', sessionKind: 'empty',
        dates: { tue: '2026-11-24' },
        lifts: { tue: { 'Barbell Row': [done(80)] } },
      },
    },
    ...overrides,
  };
}

test('sessions on one date are counted as sessions, never as dates', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  // Mon: programmed + archived (2) · Tue: run + walk + one-off (3)
  assert.equal(model.sessions, 5);
  assert.equal(model.week.days.find((d) => d.day === 'mon')?.sessions, 2);
  assert.equal(model.week.days.find((d) => d.day === 'tue')?.sessions, 3);
});

test('runs and walks are separate, always', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  const tue = model.week.days.find((d) => d.day === 'tue');
  assert.equal(tue?.runKm, 5, 'run distance excludes the walk');
  assert.equal(tue?.walkKm, 2, 'walk distance is kept apart');
  assert.equal(tue?.runCount, 1);
  assert.equal(tue?.walkCount, 1);
  assert.equal(tue?.runKm + tue?.walkKm, 7, 'the day still knows its total');
});

test('working-set volume counts working sets only', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  // Bench 2×100×5 = 1000, Squat 1×140×5 = 700, Row 1×80×5 = 400.
  assert.equal(model.workingSets, 4, 'warm-ups are not working sets');
  const mon = model.week.days.find((d) => d.day === 'mon');
  assert.equal(mon?.volumeKg, 1000 + 700);
  const wed = model.week.days.find((d) => d.day === 'wed');
  assert.equal(wed?.workingSets, 0, 'a warm-up-only day has no working sets');
});

test('a warm-up-only day is a rest day, not a failed session', () => {
  // Wednesday is TODAY here, so the day is elapsed rather than future.
  const warmupOnly = {
    weeks: {
      '1': {
        dates: { wed: '2026-11-25' },
        lifts: { wed: { 'Back Squat': [warmup(60), warmup(80)] } },
      },
    },
  };
  const model = buildPulseModel(warmupOnly, { todayISO: '2026-11-25' });
  const wed = model.week.days.find((d) => d.day === 'wed');
  assert.equal(wed?.isFuture, false);
  assert.equal(wed?.workingSets, 0);
  assert.equal(wed?.isRest, true);
  assert.equal(model.hasData, false, 'a warm-up is not training evidence');
});

test('a program-week counter cannot move the week', () => {
  const a = buildPulseModel(fixture({ currentWeek: '1' }), { todayISO: TODAY });
  const b = buildPulseModel(fixture({ currentWeek: '42' }), { todayISO: TODAY });
  assert.deepEqual(a.week, b.week);
  assert.equal(a.sessions, b.sessions);
});

test('the week window is the Monday-based calendar week containing today', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  assert.equal(model.week.startISO, '2026-11-23');
  assert.equal(model.week.endISO, '2026-11-29');
  assert.equal(model.week.days.length, 7);
  assert.equal(model.week.days[0].day, 'mon');
  assert.equal(model.week.days[6].day, 'sun');
});

test('future days are marked, not treated as missed training', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  const thu = model.week.days.find((d) => d.day === 'thu');
  assert.equal(thu?.isFuture, true);
  assert.equal(thu?.isRest, false, 'a future day is not a rest day');
  assert.equal(model.week.elapsedDays, 2, 'Mon + Tue are elapsed');
  assert.equal(model.isPartial, true, 'Tuesday does not close the week');
});

test('the comparison is elapsed-matched, not whole-week', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  // This week Mon–Tue = 5 sessions; last week Mon–Tue = 1 (Monday only).
  assert.equal(model.elapsedSessions, 5);
  assert.equal(model.delta.value, 4);
  assert.match(model.delta.text, /vs last week at this point/);
  assert.equal(model.delta.tone, 'up');
});

test('a level week is stated in words rather than "+0"', () => {
  const equal = fixture({
    weeks: {
      '1': { dates: { mon: '2026-11-23' }, lifts: { mon: { Squat: [done(100)] } } },
      '2': { dates: { mon: '2026-11-16' }, lifts: { mon: { Squat: [done(100)] } } },
    },
  });
  const model = buildPulseModel(equal, { todayISO: TODAY });
  assert.equal(model.delta.value, 0);
  assert.match(model.delta.text, /Level/);
  assert.doesNotMatch(model.delta.text, /\+0/);
});

test('streak counts consecutive trained weeks and flags one at risk', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY });
  assert.equal(model.streakWeeks, 2, 'this week and last week');
  assert.equal(model.streakAtRisk, false);

  // Untrained this week, trained the two before: the run is not lost yet.
  const atRisk = fixture({
    weeks: {
      '2': { dates: { mon: '2026-11-16' }, lifts: { mon: { Squat: [done(100)] } } },
      '3': { dates: { mon: '2026-11-09' }, lifts: { mon: { Squat: [done(100)] } } },
    },
  });
  const risky = buildPulseModel(atRisk, { todayISO: TODAY });
  assert.equal(risky.streakWeeks, 2);
  assert.equal(risky.streakAtRisk, true);
  assert.equal(risky.hasData, false);
});

test('adherence is "of N planned" for the whole week, and null without a plan', () => {
  const program = {
    days: {
      mon: { lifts: ['Bench Press'] }, tue: { lifts: ['Squat'] },
      thu: { lifts: ['Deadlift'] }, sat: { lifts: ['Row'] },
      wed: { rest: true }, fri: { rest: true }, sun: { rest: true },
    },
  };
  const planned = buildPulseModel(fixture(), { todayISO: TODAY, program });
  assert.equal(planned.sessionsPlanned, 4);
  assert.equal(planned.adherencePct, 100, '5 sessions against a 4-session plan caps at 100');

  const unplanned = buildPulseModel(fixture(), { todayISO: TODAY, program: null });
  assert.equal(unplanned.sessionsPlanned, null);
  assert.equal(unplanned.adherencePct, null);
});

test('an empty week is empty, not a row of zeros', () => {
  const model = buildPulseModel({ weeks: {} }, { todayISO: TODAY });
  assert.equal(model.hasData, false);
  assert.equal(model.sessions, 0);
  assert.equal(model.streakWeeks, 0);
  assert.equal(model.streakAtRisk, false);
});

test('a selected past week moves the band and completes it', () => {
  const past = buildPulseModel(fixture(), { todayISO: TODAY, weekStartISO: '2026-11-16' });
  assert.equal(past.week.startISO, '2026-11-16');
  assert.equal(past.sessions, 1, 'only the previous week\'s single session');
  assert.equal(past.isPartial, false, 'a past week is complete');
  assert.equal(past.week.elapsedDays, 7, 'all seven days have elapsed');
});

test('a selected week snaps to its Monday even if a mid-week date is passed', () => {
  const model = buildPulseModel(fixture(), { todayISO: TODAY, weekStartISO: '2026-11-18' });
  assert.equal(model.week.startISO, '2026-11-16');
});

test('an invalid reference day is refused rather than guessed', () => {
  assert.throws(() => buildPulseModel({ weeks: {} }, { todayISO: 'nope' }), /invalid todayISO/);
});

test('adherence compares planned DAYS with trained days, never sessions with days', () => {
  // Mon and Thu are planned. The athlete lifts Mon, runs Tue/Wed/Fri.
  // Sessions (4) outnumber planned days (2): the old ratio said 200 %.
  const program = {
    days: {
      mon: { lifts: ['Bench Press'] }, thu: { lifts: ['Back Squat'] },
      tue: {}, wed: {}, fri: {}, sat: {}, sun: {},
    },
  };
  const state = {
    weeks: {
      '1': {
        dates: {
          mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25', fri: '2026-11-27',
        },
        lifts: { mon: { 'Bench Press': [done(100)] } },
        runSessions: {
          tue: [{ dist: '5', time: '25:00', type: 'run' }],
          wed: [{ dist: '5', time: '25:00', type: 'run' }],
          fri: [{ dist: '5', time: '25:00', type: 'run' }],
        },
      },
    },
  };
  const model = buildPulseModel(state, { todayISO: '2026-11-28', program });
  assert.equal(model.sessions, 4, 'four sessions were logged');
  assert.equal(model.sessionsPlanned, 2, 'the plan asks for two days');
  assert.equal(model.plannedDaysElapsed, 2, 'both planned days have passed');
  assert.equal(model.completedPlannedDays, 1, 'only Monday was trained');
  assert.equal(model.adherencePct, 50, 'and the ratio cannot exceed 100');
});

test('an untrained week keeps the streak visible at the surface', () => {
  const model = buildPulseModel(fixture(), { todayISO: '2026-12-01', });
  // Two trained weeks before, none this week.
  assert.equal(model.streakWeeks >= 1, true);
  assert.equal(model.streakAtRisk, true);
  const html = renderPulseFor(model);
  assert.match(html, /streak is still alive/);
  assert.match(html, /One session keeps it|one session keeps it/i);
});
