// =============================================================================
// A9 — the Progress range carries into the exercise drilldown
//
// "Is this working this year?" must not be answered with a 12-week chart just
// because the leaf was last used that way. The mapping is the whole decision;
// the all-lifts browser check proves the wiring.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXERCISE_RANGES,
  exerciseRangeForProgress,
  setExerciseRange,
} from '../js/analytics/views/view-strength-entity.js';

test('every hub range maps onto the drilldown vocabulary', () => {
  assert.equal(exerciseRangeForProgress('30d'), '4w');
  assert.equal(exerciseRangeForProgress('3m'), '12w');
  assert.equal(exerciseRangeForProgress('1y'), '1y');
  assert.equal(exerciseRangeForProgress('all'), 'all');
});

test('an unknown range leaves the drilldown\'s own choice alone', () => {
  assert.equal(exerciseRangeForProgress(''), null);
  assert.equal(exerciseRangeForProgress('90d'), null);
  assert.equal(exerciseRangeForProgress(undefined), null);
});

test('the mapped ids are all real drilldown options', () => {
  for (const id of ['30d', '3m', '1y', 'all']) {
    assert.ok(EXERCISE_RANGES.includes(exerciseRangeForProgress(id)), id);
  }
  assert.deepEqual(EXERCISE_RANGES, ['4w', '12w', '6m', '1y', 'all']);
});

test('setting an invalid range does not corrupt the control', () => {
  assert.doesNotThrow(() => setExerciseRange('1y'));
  assert.doesNotThrow(() => setExerciseRange('nonsense'));
  assert.doesNotThrow(() => setExerciseRange(/** @type {any} */ (null)));
});
