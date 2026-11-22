// =============================================================================
// EFFORT SCALE — half-step RIR / RPE reading (pure)
//
// The set sheet offers ½ steps; stored sets are RIR-first with a derived RPE,
// but imported history may carry only one of the two. These tests pin the
// rounding rules, the legacy fallbacks and the inferred-failure case that sRPE
// depends on.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  EFFORT_SCALE, effortForSet, formatEffort, normalizeEffortRir,
} from '../js/workout/effort.js';

test('EFFORT_SCALE is the sheet’s 0–4 half-step scale', () => {
  assert.deepEqual(EFFORT_SCALE, { MIN: 0, MAX: 4, STEP: 0.5 });
  assert.ok(Object.isFrozen(EFFORT_SCALE));
});

test('normalizeEffortRir snaps to the nearest half step', () => {
  assert.equal(normalizeEffortRir(0), 0);
  assert.equal(normalizeEffortRir(0.5), 0.5);
  assert.equal(normalizeEffortRir(1), 1);
  assert.equal(normalizeEffortRir(1.24), 1);
  assert.equal(normalizeEffortRir(1.26), 1.5);
  assert.equal(normalizeEffortRir(2.74), 2.5);
  assert.equal(normalizeEffortRir(2.76), 3);
  assert.equal(normalizeEffortRir(3.75), 4);
  assert.equal(normalizeEffortRir(4), 4);
});

test('normalizeEffortRir rejects non-finite, blank and out-of-range values', () => {
  for (const value of [null, undefined, '', '   ', 'abc', NaN, Infinity, -Infinity, -0.5, 4.5, 8, [2], ['1.5']]) {
    assert.equal(normalizeEffortRir(value), null, `expected null for ${String(value)}`);
  }
  assert.equal(normalizeEffortRir('1.5'), 1.5, 'numeric strings from imports are readable');
  assert.equal(normalizeEffortRir(' 2 '), 2);
  assert.doesNotThrow(() => normalizeEffortRir({}));
  assert.doesNotThrow(() => normalizeEffortRir(Symbol('rir')));
});

test('effortForSet reads RIR first and derives RPE', () => {
  assert.deepEqual(effortForSet({ rir: 1.5 }), { rir: 1.5, rpe: 8.5, rated: true });
  assert.deepEqual(effortForSet({ rir: 0 }), { rir: 0, rpe: 10, rated: true });
  assert.deepEqual(effortForSet({ rir: 4 }), { rir: 4, rpe: 6, rated: true });
});

test('effortForSet derives a half-step RIR from a stored RPE', () => {
  assert.deepEqual(effortForSet({ rpe: 8.5 }), { rir: 1.5, rpe: 8.5, rated: true });
  assert.deepEqual(effortForSet({ rpe: '8.5' }), { rir: 1.5, rpe: 8.5, rated: true });
  assert.deepEqual(effortForSet({ rpe: 8 }), { rir: 2, rpe: 8, rated: true });
});

test('effortForSet prefers an explicit RIR over a conflicting RPE', () => {
  assert.deepEqual(effortForSet({ rir: 1, rpe: 9 }), { rir: 1, rpe: 9, rated: true });
});

test('effortForSet marks an unrated failure as inferred RPE 10, not a rating', () => {
  assert.deepEqual(effortForSet({ failure: true }), { rir: 0, rpe: 10, rated: false });
  // Imported JSON may carry the flag as a string; it still means failure.
  assert.deepEqual(effortForSet({ failure: 'true' }), { rir: 0, rpe: 10, rated: false });
  assert.deepEqual(effortForSet({ failure: 1 }), { rir: 0, rpe: 10, rated: false });
  // A rated failure keeps what the athlete entered.
  assert.deepEqual(effortForSet({ failure: true, rir: 2 }), { rir: 2, rpe: 8, rated: true });
  // No rating and no failure is simply unrated.
  assert.deepEqual(effortForSet({}), { rir: null, rpe: null, rated: false });
  assert.deepEqual(effortForSet(null), { rir: null, rpe: null, rated: false });
  assert.deepEqual(effortForSet([{ rir: 2 }]), { rir: null, rpe: null, rated: false });
});

test('a stored RIR and its derived RPE round-trip at every half step', () => {
  for (let rir = EFFORT_SCALE.MIN; rir <= EFFORT_SCALE.MAX; rir += EFFORT_SCALE.STEP) {
    const fromRir = effortForSet({ rir });
    assert.equal(fromRir.rpe, 10 - rir);
    const fromRpe = effortForSet({ rpe: fromRir.rpe });
    assert.equal(fromRpe.rir, rir);
    assert.equal(fromRpe.rated, true);
  }
});

test('formatEffort labels the chosen scale and hides inferred effort', () => {
  assert.equal(formatEffort({ rir: 1.5 }), 'RIR 1.5');
  assert.equal(formatEffort({ rir: 2 }), 'RIR 2');
  assert.equal(formatEffort({ rir: 1.5 }, { scale: 'rpe' }), 'RPE 8.5');
  assert.equal(formatEffort({ rpe: 8.5 }), 'RIR 1.5');
  assert.equal(formatEffort({ rpe: 8.5 }, { scale: 'rpe' }), 'RPE 8.5');
  assert.equal(formatEffort({}), '');
  assert.equal(formatEffort({ failure: true }), '', 'the failure tag is a separate signal');
  assert.equal(formatEffort({ rir: 1.5 }, { style: 'reps-left' }), '1.5 reps left');
  assert.equal(formatEffort({ rpe: 8 }, { style: 'reps-left' }), '2 reps left');
});
