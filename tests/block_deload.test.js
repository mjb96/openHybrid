// =============================================================================
// H5 slice 2 — the deload write and its exact Undo
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBlockDeload } from '../js/analytics/block-deload.js';

const program = () => ({
  id: 'custom_1',
  totalWeeks: 8,
  days: { mon: { lifts: ['Back Squat'] } },
  weeklyVolModifiers: {
    '4': { sets: 4, reps: 5, intensityLabel: 'Week 4' },
    '5': { sets: 4, reps: 5, intensityLabel: 'Week 5' },
    '6': { sets: 3, reps: 8, intensityLabel: 'Deload week' },
  },
});

test('the next week is halved and labelled, and Undo restores it exactly', () => {
  const p = program();
  const before = JSON.parse(JSON.stringify(p.weeklyVolModifiers));
  const result = prepareBlockDeload(p, 5);
  assert.ok(result);
  assert.equal(p.weeklyVolModifiers['5'].sets, 2);
  assert.equal(p.weeklyVolModifiers['5'].intensityLabel, 'Deload week');
  assert.equal(p.weeklyVolModifiers['4'].sets, 4, 'other weeks are untouched');
  assert.equal(result.undo(), true);
  assert.deepEqual(p.weeklyVolModifiers, before);
});

test('a planned deload is never halved twice', () => {
  const p = program();
  const result = prepareBlockDeload(p, 6);
  assert.equal(result, null);
  assert.equal(p.weeklyVolModifiers['6'].sets, 3);
});

test('the write refuses a missing week or program', () => {
  assert.equal(prepareBlockDeload(null, 5), null);
  assert.equal(prepareBlockDeload(program(), 99), null);
  assert.equal(prepareBlockDeload(program(), 0), null);
  assert.equal(prepareBlockDeload(program(), /** @type {any} */ ('5')), null);
});
