// =============================================================================
// EXERCISE DETAIL — set records are wired into the model the drilldown renders.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExerciseDetailModel } from '../js/analytics/exercise-detail.js';

const done = (w, r) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });

function state() {
  return {
    weeks: {
      '1': { dates: { mon: '2026-11-10' }, lifts: { mon: { 'Back Squat': [done(100, 5), warm(60)] } } },
      '2': { dates: { mon: '2026-11-17' }, lifts: { mon: { 'Back Squat': [done(110, 3)] } } },
      '3': { dates: { mon: '2026-11-20' }, lifts: { mon: { 'Back Squat': [done(105, 8)] } } },
    },
  };
}

test('the drilldown model carries a set-records table', () => {
  const model = buildExerciseDetailModel(state(), 'Back Squat', { range: '12w', now: new Date('2026-11-24T12:00:00') });
  assert.ok(model.setRecords, 'records are attached');
  assert.equal(model.setRecords.hasData, true);
  assert.equal(model.setRecords.shape, 'reps');
  // Heaviest set with at least 8 reps is 105 (not 110, which only had 3).
  const eight = model.setRecords.repTargets.find((row) => row.target === 8);
  assert.equal(eight.weight, 105);
});

test('warm-up sets never enter the records', () => {
  const model = buildExerciseDetailModel(state(), 'Back Squat', { range: '12w', now: new Date('2026-11-24T12:00:00') });
  const weights = model.setRecords.repTargets.map((row) => row.weight);
  assert.equal(weights.includes(60), false, 'the warm-up weight is absent');
});
