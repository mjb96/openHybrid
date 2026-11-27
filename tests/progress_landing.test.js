// =============================================================================
// PROGRESS LANDING — the retained contract
//
// The four domain cards were retired in P8a. What the app still reads from this
// module is: the canonical planned-day count (Week in Review), the dated weekly
// series (training-context export) and the hub's single `allEmpty` flag.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProgressLanding, buildRecentWeekSeries, plannedTrainingDays,
} from '../js/analytics/progress-landing.js';

const TODAY = '2026-07-16';   // Thursday
const WK = '2026-07-13';      // its Monday
const work = (w = 100, r = 5) => ({ c: true, w: String(w), r: String(r) });
const REST = { title: 'Rest', runs: 'Rest', lifts: [] };
const program = (days) => ({ totalWeeks: 8, days });

// ---- planned days -----------------------------------------------------------
test('plannedTrainingDays counts lifting and running days but not rest days', () => {
  assert.equal(plannedTrainingDays(program({
    mon: { title: 'Push', runs: 'Rest', lifts: ['Bench Press'] },
    tue: { title: 'Run', runs: '5 km easy', lifts: [] },
    wed: { title: 'Pull', runs: 'Rest', lifts: ['Barbell Row'] },
    thu: { title: 'Lower', runs: 'Rest', lifts: ['Deadlift'] },
    fri: REST, sat: REST, sun: REST,
  })), 4);
});

test('plannedTrainingDays returns null rather than 0 when there is no usable program', () => {
  assert.equal(plannedTrainingDays(null), null);
  assert.equal(plannedTrainingDays({}), null);
  assert.equal(plannedTrainingDays(program({ mon: REST, tue: REST })), null);
});

test('plannedTrainingDays uses the canonical rest-day classifier, not its own rule', () => {
  // A day with lifts and a "Rest" run is training; a bare Rest day is not. This
  // is the classifier Home and the coach use, not a second reading of the text.
  assert.equal(plannedTrainingDays(program({
    mon: { title: 'Rest', runs: 'Rest', lifts: [] },
    tue: { title: 'Push', runs: 'Rest', lifts: ['Bench Press'] },
  })), 1);
  assert.equal(plannedTrainingDays(program({
    mon: { title: 'Run', runs: '5 km easy', lifts: [] },
    tue: { title: 'Push', runs: 'Rest', lifts: ['Bench Press'] },
  })), 2);
});

// ---- dated weekly series ----------------------------------------------------
test('buildRecentWeekSeries is oldest-to-newest, date-strict and includes archives', () => {
  const state = { weeks: {
    '1': {
      activationId: 'a1',
      dates: { mon: '2026-07-13' },
      lifts: { mon: { Squat: [work()] } },
      gymStats: { mon: { time: '45:00' } },
    },
    'arch:old:1': {
      activationId: 'old',
      dates: { tue: '2026-07-14' },
      runSessions: { tue: [{ sessionId: 'r1', dist: '5', time: '25:00' }] },
    },
  } };
  const series = buildRecentWeekSeries(state, WK, 4);
  assert.equal(series.length, 4);
  assert.deepEqual(series.map((entry) => entry.weekStart), [
    '2026-06-22', '2026-06-29', '2026-07-06', '2026-07-13',
  ]);
  const current = series.at(-1);
  assert.equal(current.sessions, 2, 'a strength day + a run are two sessions');
  assert.equal(current.distanceKm, 5);
  assert.ok(current.volumeKg > 0, 'the archived and live weeks both contribute');
});

test('buildRecentWeekSeries counts a duration-only imported gym day', () => {
  const state = { weeks: { '1': {
    dates: { wed: '2026-07-15' },
    lifts: {},
    gymStats: { wed: { time: '50:00' } },
  } } };
  const current = buildRecentWeekSeries(state, WK, 1)[0];
  assert.equal(current.sessions, 1);
  assert.equal(current.volumeKg, 0);
});

// ---- the hub's one flag -----------------------------------------------------
test('allEmpty is true only when nothing at all has been logged', () => {
  assert.equal(buildProgressLanding({ weeks: {} }).allEmpty, true);
  assert.equal(buildProgressLanding({ settings: {}, bodyWeightLog: [{ date: TODAY, weight: 80 }] }).allEmpty, true,
    'a weigh-in is not training');
});

test('allEmpty is false for a logged set, a run or an imported gym day', () => {
  const strength = { weeks: { '1': { dates: { mon: TODAY }, lifts: { mon: { Squat: [work()] } } } } };
  const run = { weeks: { '1': { dates: { tue: TODAY }, runSessions: { tue: [{ dist: '5', time: '25:00' }] } } } };
  const gym = { weeks: { '1': { dates: { wed: TODAY }, lifts: {}, gymStats: { wed: { time: '45:00' } } } } };
  for (const state of [strength, run, gym]) {
    assert.equal(buildProgressLanding(state).allEmpty, false);
  }
});
