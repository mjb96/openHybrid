// =============================================================================
// PHOTO CAPTURE GEOMETRY — pure maths, no canvas. The stored blob must stay
// small; a 4 MB camera photo kept at full size would eat a phone's quota.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitWithin } from '../js/photos/capture.js';

test('a large landscape photo is capped on its longest edge', () => {
  assert.deepEqual(fitWithin(4000, 3000, 1200), { width: 1200, height: 900 });
});

test('a portrait photo caps its height and keeps the aspect', () => {
  assert.deepEqual(fitWithin(3000, 4000, 1200), { width: 900, height: 1200 });
});

test('a small photo is not upscaled', () => {
  assert.deepEqual(fitWithin(600, 800, 1200), { width: 600, height: 800 });
});

test('an exact-fit photo is untouched', () => {
  assert.deepEqual(fitWithin(1200, 1200, 1200), { width: 1200, height: 1200 });
});

test('degenerate dimensions never produce a zero-size image', () => {
  assert.deepEqual(fitWithin(0, 0, 1200), { width: 1, height: 1 });
  assert.deepEqual(fitWithin(-5, 100, 1200), { width: 1, height: 100 });
  assert.deepEqual(fitWithin(5000, 0, 1200), { width: 1200, height: 1 });
});
