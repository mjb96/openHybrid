// =============================================================================
// G2 — a unilateral row states the per-side split; a bilateral row does not
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSetRow } from '../js/templates.js';

const row = (name, set = { c: false, w: '20', r: '8' }) => buildSetRow(set, 0, name, null, 'kg', name);

test('a unilateral lift shows half of the logged total', () => {
  const html = row('Bulgarian Split Squat', { c: false, w: '20', r: '8' });
  assert.match(html, /data-per-side/);
  assert.match(html, /4 per side/);
});

test('an odd total is stated honestly instead of being rounded', () => {
  const html = row('Bulgarian Split Squat', { c: false, w: '20', r: '9' });
  assert.match(html, /4.5 per side/);
});

test('a bilateral lift carries no per-side hint', () => {
  assert.doesNotMatch(row('Back Squat'), /data-per-side/);
  assert.doesNotMatch(row('Barbell Bench Press'), /per side/);
});

test('a hold or carry uses its own input, not a rep split', () => {
  assert.doesNotMatch(row('Plank', { c: false, w: '0', mode: 'time', sec: '60' }), /data-per-side/);
  assert.doesNotMatch(row('Farmer Carry', { c: false, w: '20', mode: 'distance', dist: '40' }), /data-per-side/);
});
