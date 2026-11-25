import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExerciseDetailModel } from '../js/analytics/exercise-detail.js';
import { addDaysISO } from '../js/analytics/weekly-aggregate.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const NOW = new Date('2026-11-21T12:00:00Z');
const TODAY = '2026-11-21';

function stateWith(sessions) {
  const weeks = {};
  sessions.forEach((session, index) => {
    const day = DAYS[index % 7];
    weeks[`w${index}`] = {
      dates: { [day]: session.date },
      lifts: { [day]: { [session.exercise]: session.sets } },
      runs: {}, gymStats: {}, notes: {}, gymRpe: {},
    };
  });
  return { settings: { weightUnit: 'kg' }, weeks };
}

const set = (w, r) => ({ w: String(w), r: String(r), c: true });

test('rep exercise: best e1RM, PR flags, change and series', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -21), exercise: 'Bench Press', sets: [set(80, 5)] },
    { date: addDaysISO(TODAY, -14), exercise: 'Bench Press', sets: [set(82.5, 5)] },
    { date: addDaysISO(TODAY, -7), exercise: 'Bench Press', sets: [set(85, 5)] },
  ]);
  const model = buildExerciseDetailModel(state, 'Bench Press', { now: NOW });
  assert.equal(model.hasData, true);
  assert.equal(model.shape, 'reps');
  assert.equal(model.sessions.length, 3);
  assert.equal(model.latest.top.text, '85kg × 5');
  assert.equal(model.sessions[0].isPr, true, 'the latest session beat the prior e1RM');
  assert.equal(model.sessions[2].isPr, false, 'the first session is a baseline, not a PR');
  assert.ok(model.change.direction === 'up');
  assert.match(model.change.text, /e1RM/);
  assert.equal(model.series.length, 3);
  assert.equal(model.chart.kind, 'e1rm');
  assert.ok(model.bestText.includes('85kg'));
});

test('hold: the longest time is the best set and the chart unit is seconds', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -14), exercise: 'Plank', sets: [{ mode: 'time', sec: 45, w: '20', c: true }] },
    { date: addDaysISO(TODAY, -7), exercise: 'Plank', sets: [{ mode: 'time', sec: 60, w: '20', c: true }] },
  ]);
  const model = buildExerciseDetailModel(state, 'Plank', { now: NOW });
  assert.equal(model.shape, 'time');
  assert.equal(model.latest.top.text, '20kg × 1:00');
  assert.equal(model.bestText, '20kg · 1:00');
  assert.equal(model.change.text, '+15s hold');
  assert.equal(model.chart.kind, 'time');
  assert.equal(model.totals.holdSeconds, 105);
  assert.equal(model.totals.volume, 0);
});

test('carry: distance is the best set, never a rep count', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -14), exercise: 'Farmer Carry', sets: [{ mode: 'distance', dist: 20, w: '40', c: true }] },
    { date: addDaysISO(TODAY, -7), exercise: 'Farmer Carry', sets: [{ mode: 'distance', dist: 25, w: '40', c: true }] },
  ]);
  const model = buildExerciseDetailModel(state, 'Farmer Carry', { now: NOW });
  assert.equal(model.shape, 'distance');
  assert.equal(model.latest.top.text, '40kg × 25m');
  assert.equal(model.bestText, '40kg · 25m');
  assert.equal(model.change.text, '+5m carry');
  assert.equal(model.chart.kind, 'distance');
  assert.equal(model.totals.distanceM, 45);
});

test('range filters the series but PRs compare against all earlier history', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -100), exercise: 'Bench Press', sets: [set(100, 5)] },
    { date: addDaysISO(TODAY, -7), exercise: 'Bench Press', sets: [set(90, 5)] },
  ]);
  const recent = buildExerciseDetailModel(state, 'Bench Press', { now: NOW });
  assert.equal(recent.sessions.length, 1);
  assert.equal(recent.sessions[0].isPr, false, '90 did not beat the out-of-range 100');
  assert.ok(recent.bestText.includes('100kg'), 'all-time best still sees the older session');
  const all = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: 'all' });
  assert.equal(all.sessions.length, 2);
  assert.equal(all.sessions[1].isPr, false, 'the original 100kg baseline is not a PR');
});

test('4-week and 1-year ranges exist and cut at the right boundary', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -200), exercise: 'Bench Press', sets: [set(75, 5)] },
    { date: addDaysISO(TODAY, -21), exercise: 'Bench Press', sets: [set(80, 5)] },
    { date: addDaysISO(TODAY, -14), exercise: 'Bench Press', sets: [set(82.5, 5)] },
    { date: addDaysISO(TODAY, -7), exercise: 'Bench Press', sets: [set(85, 5)] },
  ]);
  const four = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '4w' });
  assert.equal(four.sessions.length, 3, 'the 200-day session is outside 4 weeks');
  const year = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '1y' });
  assert.equal(year.sessions.length, 4);
  const twelve = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '12w' });
  assert.equal(twelve.sessions.length, 3, 'the 200-day session is outside 12 weeks');
});

test('the e1RM trend reports a weekly rate of change', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -14), exercise: 'Bench Press', sets: [set(100, 5)] },
    { date: addDaysISO(TODAY, -7), exercise: 'Bench Press', sets: [set(102.5, 5)] },
    { date: TODAY, exercise: 'Bench Press', sets: [set(105, 5)] },
  ]);
  const model = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '4w' });
  assert.ok(model.rate, 'a two-point trend has a rate');
  assert.equal(model.rate.direction, 'up');
  assert.match(model.rate.text, /^\+.*kg\/week$/);
  assert.equal(model.rate.weeks, 2);
});

test('a hold or a single session has no e1RM rate', () => {
  const hold = stateWith([
    { date: addDaysISO(TODAY, -14), exercise: 'Plank', sets: [{ mode: 'time', sec: 45, w: '20', c: true }] },
    { date: TODAY, exercise: 'Plank', sets: [{ mode: 'time', sec: 60, w: '20', c: true }] },
  ]);
  assert.equal(buildExerciseDetailModel(hold, 'Plank', { now: NOW, range: '4w' }).rate, null);

  const one = stateWith([{ date: TODAY, exercise: 'Bench Press', sets: [set(100, 5)] }]);
  assert.equal(buildExerciseDetailModel(one, 'Bench Press', { now: NOW, range: '4w' }).rate, null);
});

test('relative strength appears for the big three from a recent dated weigh-in (A8)', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -7), exercise: 'Bench Press', sets: [set(100, 5)] },
  ]);
  state.bodyWeightLog = [{ date: addDaysISO(TODAY, -3), weight: 80 }];
  const model = buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '4w' });
  assert.ok(model.relative, 'a recent weigh-in yields a ratio');
  assert.equal(model.relative.weight, 80);
  assert.ok(model.relative.ratio > 1.4 && model.relative.ratio < 1.5);

  state.bodyWeightLog = [{ date: addDaysISO(TODAY, -60), weight: 80 }];
  assert.equal(buildExerciseDetailModel(state, 'Bench Press', { now: NOW, range: '4w' }).relative, null, 'a stale weigh-in is not current');
});

test('relative strength is limited to the big three', () => {
  const state = stateWith([
    { date: addDaysISO(TODAY, -7), exercise: 'Barbell Row', sets: [set(60, 8)] },
  ]);
  state.bodyWeightLog = [{ date: addDaysISO(TODAY, -3), weight: 80 }];
  assert.equal(buildExerciseDetailModel(state, 'Barbell Row', { now: NOW, range: '4w' }).relative, null);
});
