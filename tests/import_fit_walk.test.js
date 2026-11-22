// =============================================================================
// FIT SPORT CLASSIFICATION
//
// A walking FIT file must not become a run: it would add walked kilometres to
// run distance and give a walk a running pace. The detector is defensive —
// an unknown shape keeps the old behaviour instead of guessing.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWalkingSport } from '../js/portability/import-fit.js';

test('walking and hiking files are recognised', () => {
  assert.equal(isWalkingSport({ sessions: [{ sport: 'walking' }] }), true);
  assert.equal(isWalkingSport({ sessions: [{ sport: 'Hiking' }] }), true);
  assert.equal(isWalkingSport({ sport: 'walking' }), true);
  assert.equal(isWalkingSport({ activity: { sport: 'hiking' } }), true);
});

test('running and cycling are not walks', () => {
  assert.equal(isWalkingSport({ sessions: [{ sport: 'running' }] }), false);
  assert.equal(isWalkingSport({ sessions: [{ sport: 'cycling' }] }), false);
});

test('an unknown or empty shape keeps the previous behaviour', () => {
  assert.equal(isWalkingSport(null), false);
  assert.equal(isWalkingSport(undefined), false);
  assert.equal(isWalkingSport({}), false);
  assert.equal(isWalkingSport({ sessions: [] }), false);
  assert.equal(isWalkingSport({ sessions: [{}] }), false);
});
