// =============================================================================
// VOLUME FORMAT — one label for Weekly Review, the Training Report and the
// Year in Review.
//
// Stored weights are already in the athlete's entered unit; volume must be
// LABELLED, never converted. The kg output is byte-identical to the two older
// surfaces (`1.1t` with no space, `550 kg`), so moving them onto the helper
// cannot change what they show.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatVolume } from '../js/analytics/utils.js';

test('kg volume keeps the existing tonne compaction and plain kilogram label', () => {
  assert.equal(formatVolume(550, 'kg'), '550 kg');
  assert.equal(formatVolume(999, 'kg'), '999 kg');
  assert.equal(formatVolume(0, 'kg'), '0 kg');
  assert.equal(formatVolume(14050, 'kg'), '14.1t');
});

test('the 1000 boundary switches to tonnes exactly at 1000 kg', () => {
  assert.equal(formatVolume(1000, 'kg'), '1.0t');
  assert.equal(formatVolume(1001, 'kg'), '1.0t');
});

test('lbs volume converts canonical kilograms into grouped pounds', () => {
  // ST6: tonnage is stored in kilograms, so 14,050 kg reads as 30,975 lb.
  assert.equal(formatVolume(14050, 'lbs'), '30,975 lb');
  assert.equal(formatVolume(1000, 'lbs'), '2,205 lb');
  assert.equal(formatVolume(550, 'lbs'), '1,213 lb');
  assert.equal(formatVolume(0, 'lbs'), '0 lb');
});

test('missing or implausible volume is an honest zero in the athlete’s unit', () => {
  assert.equal(formatVolume(undefined, 'kg'), '0 kg');
  assert.equal(formatVolume(null, 'lbs'), '0 lb');
  assert.equal(formatVolume(-20, 'kg'), '0 kg');
});
