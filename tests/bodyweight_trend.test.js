// =============================================================================
// BODYWEIGHT TREND TESTS
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeWeighIns,
  weekStartOf,
  weeklyWeights,
  weightRate,
  rateCorridor,
  rateStatus,
  buildBodyweightModel,
} from '../js/metrics/bodyweight.js';

const entry = (date, weight) => ({ date, weight });

test('normalizeWeighIns keeps valid readings, dedupes dates and sorts', () => {
  const log = [
    entry('2026-11-19', 83.5),
    entry('2026-11-18', '84.1'),
    entry('2026-11-18', 84.0),
    entry('2026-11-17', 0),
    entry('bad', 80),
    entry('2026-11-16', 'x'),
  ];
  assert.deepEqual(normalizeWeighIns(log), [
    { date: '2026-11-18', weight: 84 },
    { date: '2026-11-19', weight: 83.5 },
  ]);
});

test('weekStartOf respects Monday and Sunday starts', () => {
  assert.equal(weekStartOf('2026-11-19', 'mon'), '2026-11-16');
  assert.equal(weekStartOf('2026-11-19', 'sun'), '2026-11-15');
});

test('weeklyWeights averages each calendar week and compares means', () => {
  const log = [
    entry('2026-11-09', 85), entry('2026-11-11', 84),
    entry('2026-11-16', 84), entry('2026-11-19', 83),
  ];
  const weeks = weeklyWeights(log, 'mon');
  assert.equal(weeks.length, 2);
  assert.equal(weeks[0].key, '2026-11-16');
  assert.equal(weeks[0].avg, 83.5);
  assert.equal(weeks[0].delta, -1);
  assert.equal(weeks[1].avg, 84.5);
  assert.equal(weeks[1].delta, null);
  assert.deepEqual(weeks[0].entries.map((e) => e.date), ['2026-11-19', '2026-11-16']);
});

test('weightRate needs six readings across at least ten days', () => {
  const sparse = [
    entry('2026-11-01', 85), entry('2026-11-04', 84.8), entry('2026-11-07', 84.6),
    entry('2026-11-10', 84.4), entry('2026-11-13', 84.2),
  ];
  const notEnough = weightRate(sparse, { now: Date.parse('2026-11-19T12:00:00') });
  assert.equal(notEnough.enough, false);
  assert.equal(notEnough.n, 5);

  const enough = weightRate([...sparse, entry('2026-11-16', 84)], { now: Date.parse('2026-11-19T12:00:00') });
  assert.equal(enough.enough, true);
  assert.ok(enough.perWeek < 0);
  assert.ok(enough.pct < 0);
});

test('rateCorridor normalises directions and signed bounds', () => {
  assert.deepEqual(rateCorridor({ dir: 'lose', by: '%', lo: 0.5, hi: 1 }), {
    dir: 'lose', by: '%', min: -1, max: -0.5,
  });
  assert.deepEqual(rateCorridor({ dir: 'gain', by: 'w', lo: 1, hi: 0.25 }), {
    dir: 'gain', by: 'w', min: 0.25, max: 1,
  });
  assert.deepEqual(rateCorridor({ dir: 'hold', by: '%', hi: 0.25 }), {
    dir: 'hold', by: '%', min: -0.25, max: 0.25,
  });
  assert.equal(rateCorridor({ dir: 'lose', lo: 0, hi: 0 }), null);
});

test('rateStatus says on pace, slow, fast or off', () => {
  const rate = (perWeek, pct) => ({ enough: true, perWeek, pct });
  assert.equal(rateStatus(rate(-0.7, -0.8), { dir: 'lose', by: '%', lo: 0.5, hi: 1 }), 'in');
  assert.equal(rateStatus(rate(-0.2, -0.2), { dir: 'lose', by: '%', lo: 0.5, hi: 1 }), 'slow');
  assert.equal(rateStatus(rate(-1.2, -1.4), { dir: 'lose', by: '%', lo: 0.5, hi: 1 }), 'fast');
  assert.equal(rateStatus(rate(0.1, 0.1), { dir: 'hold', by: '%', hi: 0.25 }), 'in');
  assert.equal(rateStatus(rate(0.5, 0.6), { dir: 'hold', by: '%', hi: 0.25 }), 'off');
});

test('buildBodyweightModel filters the range, carries the goal and unit', () => {
  // ST6: the model carries CANONICAL KILOGRAMS and the display unit; views
  // convert through formatWeight/fromCanonicalWeight exactly once.
  const state = {
    settings: {
      weightUnit: 'lbs', weekStartDay: 'mon', targetWeight: 81.6,
      rateGoal: { dir: 'lose', by: 'w', lo: 0.2, hi: 0.5 },
      bodyWeightLog: [],
    },
    bodyWeightLog: [
      entry('2026-08-01', 90.7), entry('2026-11-01', 86.2), entry('2026-11-19', 83.9),
    ],
  };
  const model = buildBodyweightModel(state, { now: Date.parse('2026-11-19T12:00:00'), rangeDays: 30 });
  assert.equal(model.unit, 'lb');
  assert.equal(model.targetWeight, 81.6, 'the goal stays canonical kilograms');
  assert.deepEqual(model.points.map((p) => p.date), ['2026-11-01', '2026-11-19']);
  assert.equal(model.latest.weight, 83.9);
  assert.equal(model.weekly.length, 2);
  // `lose` keeps a signed min/max corridor in the stored unit.
  assert.ok(Math.abs(model.corridor.min - -0.5) < 0.001, `corridor min ${model.corridor.min}`);
});
