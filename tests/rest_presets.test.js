// =============================================================================
// REST PRESETS
//
// The active highlight is DERIVED from the stored tiers, so these tests pin the
// three things that can go wrong: the default must report Standard, every named
// preset must round-trip, and a custom tier set must not pretend to be one.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_REST_TIERS } from '../js/workout/rest-duration.js';
import { REST_PRESETS, restPresetFor } from '../js/settings/rest-presets.js';

test('the product default rest tiers are the Standard preset', () => {
  assert.deepEqual({ ...REST_PRESETS.hypertrophy }, { ...DEFAULT_REST_TIERS });
  assert.equal(restPresetFor(DEFAULT_REST_TIERS), 'hypertrophy');
  // The warm-up tier predates the other three and is optional when absent.
  assert.equal(restPresetFor({ compound: 180, accessory: 120, isolation: 90 }), 'hypertrophy');
});

test('each named preset is recognised and no preset leaks into another', () => {
  for (const [name, tiers] of Object.entries(REST_PRESETS)) {
    assert.equal(restPresetFor(tiers), name);
  }
  assert.equal(new Set(Object.values(REST_PRESETS).map((tiers) => JSON.stringify(tiers))).size,
    Object.keys(REST_PRESETS).length, 'presets must be distinguishable');
});

test('custom tiers show no preset as active', () => {
  assert.equal(restPresetFor({ ...DEFAULT_REST_TIERS, compound: 195 }), null);
  assert.equal(restPresetFor({ ...DEFAULT_REST_TIERS, warmup: 0 }), null);
  assert.equal(restPresetFor({}), null);
  assert.equal(restPresetFor(null), null);
});
