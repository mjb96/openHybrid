// =============================================================================
// HYBRID BALANCE — calendar-week strength/endurance split.
//
// Locks the three things that could make this metric lie:
//   1. calendar attribution (dates, archived activations, never currentWeek),
//   2. honest coverage (working sets without a session duration ≠ endurance-only),
//   3. pace-matched trend (a Monday is not compared with a completed week).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHybridBalance, BALANCED_BAND } from '../js/analytics/hybrid-balance.js';
import { addDaysISO } from '../js/dates.js';

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const dayDate = (weekStart, day) => addDaysISO(weekStart, DAY_KEYS.indexOf(day));

const CURRENT_MONDAY = '2026-07-13';
const PRIOR_MONDAY = '2026-07-06';
const PRIOR2_MONDAY = '2026-06-29';

/**
 * A week built from day entries:
 *   { day, strength: <minutes>, rpe, run: <minutes>, runRpe }
 */
function weekWithDays(entries) {
  const week = { dates: {}, lifts: {}, gymRpe: {}, gymStats: {}, runs: {}, runSessions: {} };
  for (const entry of entries) {
    week.dates[entry.day] = entry.date;
    if (entry.strength != null) {
      week.lifts[entry.day] = { Squat: [{ c: true, w: '100', r: '5' }] };
      week.gymRpe[entry.day] = String(entry.rpe ?? 8);
      week.gymStats[entry.day] = { time: String(entry.strength) };
    }
    if (entry.run != null) {
      week.runSessions[entry.day] = [{
        sessionId: `run_${entry.day}`,
        time: `${entry.run}:00`,
        rpe: String(entry.runRpe ?? 8),
      }];
    }
  }
  return week;
}

const strengthDay = (weekStart, minutes = 60, rpe = 8) => weekWithDays([
  { day: 'mon', date: weekStart, strength: minutes, rpe },
]);

const runDay = (date, minutes = 60, rpe = 8) => ({ time: `${minutes}:00`, rpe: String(rpe) });

test('sessions without an RPE still split the week by training time', () => {
  // The reported defect: logging never forces an RPE, so a normal lifter has
  // real sessions with zero sRPE. Minutes are measured data, not invented
  // effort, and the basis says so.
  const date = CURRENT_MONDAY;
  const state = { weeks: {
    '3': {
      dates: { mon: date, tue: dayDate(date, 'tue') },
      lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
      gymStats: { mon: { time: '60' } }, // no gymRpe, no per-set RPE
      runs: {},
      runSessions: { tue: [{ sessionId: 'r1', time: '60:00' }] }, // no run RPE
    },
  } };
  const model = buildHybridBalance(state, { today: '2026-07-14' });
  assert.equal(model.basis, 'minutes');
  assert.equal(model.basisLabel, 'Training time');
  assert.equal(model.hasData, true, 'a session with a duration is data');
  assert.equal(model.strengthPct, 50);
  assert.equal(model.endurancePct, 50);
  assert.equal(model.strengthMin, 60);
  assert.equal(model.enduranceMin, 60);
  assert.equal(model.status, 'balanced');
});

test('working sets with no recorded duration are unmeasured, never "no data"', () => {
  const state = { weeks: {
    '3': {
      dates: { mon: CURRENT_MONDAY },
      lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
      runs: {},
      runSessions: {},
    },
  } };
  const model = buildHybridBalance(state, { today: CURRENT_MONDAY });
  assert.equal(model.hasData, false);
  assert.equal(model.basis, 'none');
  assert.equal(model.status, 'unmeasured-strength');
  assert.equal(model.coverage.strengthDurationMissing, true);
  assert.equal(model.coverage.strengthSets, 1);
});

test('a week with no sessions at all stays an honest empty state', () => {
  const model = buildHybridBalance({ weeks: {} }, { today: '2026-07-14' });
  assert.equal(model.status, 'no-data');
  assert.equal(model.basis, 'none');
  assert.equal(model.hasData, false);
});

test('an even split is balanced, and percentages always add to 100', () => {
  const state = { weeks: {
    '3': weekWithDays([
      { day: 'mon', date: CURRENT_MONDAY, strength: 60, rpe: 8 },   // 480
      { day: 'tue', date: dayDate(CURRENT_MONDAY, 'tue'), run: 60, runRpe: 8 }, // 480
    ]),
  } };
  const model = buildHybridBalance(state, { today: '2026-07-14' });
  assert.equal(model.hasData, true);
  assert.equal(model.status, 'balanced');
  assert.equal(model.strengthPct, 50);
  assert.equal(model.endurancePct, 50);
  assert.equal(model.strengthPct + model.endurancePct, 100);
  assert.equal(model.ratio, 1);
  assert.equal(model.strengthLoad, 480);
  assert.equal(model.enduranceLoad, 480);
  assert.equal(model.totalLoad, 960);
  assert.equal(model.basis, 'srpe');
  assert.equal(model.strengthMin, 60);
  assert.equal(model.enduranceMin, 60);
});

test('the split leans when one discipline owns most of the week', () => {
  const strengthHeavy = buildHybridBalance({ weeks: {
    '3': weekWithDays([
      { day: 'mon', date: CURRENT_MONDAY, strength: 60, rpe: 8 },              // 480
      { day: 'tue', date: dayDate(CURRENT_MONDAY, 'tue'), run: 20, runRpe: 6 }, // 120
    ]),
  } }, { today: '2026-07-14' });
  assert.equal(strengthHeavy.strengthPct, 80);
  assert.equal(strengthHeavy.endurancePct, 20);
  assert.equal(strengthHeavy.status, 'strength-heavy');
  assert.equal(strengthHeavy.statusLabel, 'Strength-heavy');

  const enduranceHeavy = buildHybridBalance({ weeks: {
    '3': weekWithDays([
      { day: 'mon', date: CURRENT_MONDAY, strength: 20, rpe: 6 },               // 120
      { day: 'tue', date: dayDate(CURRENT_MONDAY, 'tue'), run: 60, runRpe: 8 }, // 480
    ]),
  } }, { today: '2026-07-14' });
  assert.equal(enduranceHeavy.strengthPct, 20);
  assert.equal(enduranceHeavy.status, 'endurance-heavy');
});

test('the balanced band is 40–60% and is inclusive at both edges', () => {
  assert.equal(BALANCED_BAND.min, 40);
  assert.equal(BALANCED_BAND.max, 60);
  // 400 / 600 → exactly 40% strength is still balanced, 39% is not.
  const edge = buildHybridBalance({ weeks: {
    '3': weekWithDays([
      { day: 'mon', date: CURRENT_MONDAY, strength: 40, rpe: 10 },               // 400
      { day: 'tue', date: dayDate(CURRENT_MONDAY, 'tue'), run: 100, runRpe: 6 },  // 600
    ]),
  } }, { today: '2026-07-14' });
  assert.equal(edge.strengthPct, 40);
  assert.equal(edge.status, 'balanced');
});

test('working sets without a session duration are an honest empty state, not an endurance-only week', () => {
  const date = CURRENT_MONDAY;
  const week = {
    dates: { mon: date, tue: dayDate(date, 'tue') },
    lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
    gymRpe: { mon: '8' }, // no gymStats time at all
    runs: {},
    runSessions: { tue: [runDay(dayDate(date, 'tue'))] },
  };
  const model = buildHybridBalance({ weeks: { '3': week } }, { today: '2026-07-14' });
  assert.equal(model.status, 'unmeasured-strength');
  assert.equal(model.coverage.strengthDurationMissing, true);
  assert.ok(model.coverage.strengthSets > 0, 'the sets are still visible to the reader');
  assert.equal(model.strengthLoad, 0);
  assert.equal(model.strengthMin, 0, 'no session duration was recorded');
});

test('a week with no load is a true zero with no fabricated ratio', () => {
  const model = buildHybridBalance({ weeks: {} }, { today: '2026-07-14' });
  assert.equal(model.hasData, false);
  assert.equal(model.status, 'no-data');
  assert.equal(model.ratio, null);
  assert.equal(model.strengthPct, null);
  assert.equal(model.weeks.length, 5, 'the window is always five calendar weeks');
  assert.deepEqual(model.modalities, { strength: false, endurance: false });
});

test('archived activations and one-off sessions count, because the date decides the week', () => {
  const archived = {
    dates: { mon: PRIOR_MONDAY },
    lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
    gymRpe: { mon: '8' },
    gymStats: { mon: { time: '60' } },
    activationId: 'act_old',
    programId: 'old_program',
    runs: {},
  };
  const oneOff = {
    dates: { tue: dayDate(CURRENT_MONDAY, 'tue') },
    lifts: {},
    runs: {},
    runSessions: { tue: [runDay(dayDate(CURRENT_MONDAY, 'tue'), 60, 8)] },
    sessionId: 'str_one_off',
    sessionKind: 'empty',
  };
  const model = buildHybridBalance({ weeks: {
    'arch:act_old:2': archived,
    'session:str_one_off': oneOff,
  } }, { today: '2026-07-14' });
  assert.equal(model.hasData, true);
  assert.equal(model.strengthLoad, 0, 'the archived week is in a prior calendar week');
  assert.equal(model.enduranceLoad, 480);
  assert.equal(model.priorWeeksWithLoad, 1);
});

test('the current week is compared with the same weekdays, never with a completed week', () => {
  const state = { weeks: {
    '1': weekWithDays([
      { day: 'mon', date: PRIOR2_MONDAY, strength: 60, rpe: 8 },
      { day: 'tue', date: dayDate(PRIOR2_MONDAY, 'tue'), run: 60, runRpe: 8 },
    ]),
    '2': weekWithDays([
      { day: 'mon', date: PRIOR_MONDAY, strength: 60, rpe: 8 },
      { day: 'tue', date: dayDate(PRIOR_MONDAY, 'tue'), run: 60, runRpe: 8 },
    ]),
    '3': strengthDay(CURRENT_MONDAY, 60, 8),
  } };
  // Today is the Monday itself: only Monday has happened. Raw totals would say
  // 480 vs 960 (−50%). Pace-matched says 480 vs 480 (holding).
  const model = buildHybridBalance(state, { today: CURRENT_MONDAY });
  assert.ok(model.trend);
  assert.equal(model.trend.dir, 'holding');
  assert.equal(model.trend.pct, 0);
  assert.equal(model.trend.paceMatched, true);
  assert.equal(model.trend.comparedWeeks, 2);
});

test('a real build against the same weekdays reads as building', () => {
  const state = { weeks: {
    '2': strengthDay(PRIOR_MONDAY, 30, 8), // 240
    '3': strengthDay(CURRENT_MONDAY, 60, 8), // 480
  } };
  const model = buildHybridBalance(state, { today: CURRENT_MONDAY });
  assert.equal(model.trend.dir, 'building');
  assert.equal(model.trend.pct, 100);
});

test('the reader is date-derived: the program-week counter cannot change the answer', () => {
  const weeks = {
    '3': weekWithDays([
      { day: 'mon', date: CURRENT_MONDAY, strength: 60, rpe: 8 },
      { day: 'tue', date: dayDate(CURRENT_MONDAY, 'tue'), run: 30, runRpe: 6 },
    ]),
  };
  const a = buildHybridBalance({ currentWeek: '1', weeks }, { today: '2026-07-14' });
  const b = buildHybridBalance({ currentWeek: '99', weeks }, { today: '2026-07-14' });
  assert.deepEqual(a, b);
});

test('the window is oldest-first and the last entry is the current calendar week', () => {
  const model = buildHybridBalance({ weeks: { '3': strengthDay(CURRENT_MONDAY) } }, { today: '2026-07-14' });
  assert.equal(model.weeks.at(-1).weekStart, CURRENT_MONDAY);
  assert.equal(model.weeks.at(-1).isCurrent, true);
  assert.equal(model.weeks.at(0).weekStart, addDaysISO(CURRENT_MONDAY, -28));
  assert.equal(model.weekStart, CURRENT_MONDAY);
  assert.equal(model.weekEnd, addDaysISO(CURRENT_MONDAY, 6));
});
