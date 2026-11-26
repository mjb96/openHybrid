// A deload is a WEEK instruction, so it must reach a lift that carries its own
// per-exercise target. Before this, "bench 4×6" ignored the deload entirely.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { liftTarget } from '../js/engine.js';

const program = {
  id: 'prog_deload',
  totalWeeks: 4,
  days: { mon: { title: 'Upper', lifts: ['Bench Press', 'Barbell Row'], runs: 'Rest' } },
  prescriptions: { mon: { 'Bench Press': { sets: 4, reps: '6-8', restSec: 150 } } },
};

const build = { sets: 3, reps: '8', intensityLabel: 'Build' };
const deload = { sets: 2, reps: '8', intensityLabel: 'Deload week' };

test('a prescribed lift keeps its own target on a normal week', () => {
  const t = liftTarget('', 'Bench Press', build, { program, week: 1, dayKey: 'mon' });
  assert.equal(t.sets, 4);
  assert.equal(t.reps, '6-8');
  assert.equal(t.restSec, 150);
});

test('a deload halves a prescribed lift (floor 2) and keeps its reps', () => {
  assert.equal(liftTarget('', 'Bench Press', deload, { program, week: 4, dayKey: 'mon' }).sets, 2);
  const five = { ...program, prescriptions: { mon: { 'Bench Press': { sets: 5, reps: '5' } } } };
  assert.equal(liftTarget('', 'Bench Press', deload, { program: five, week: 4, dayKey: 'mon' }).sets, 3);
  assert.equal(liftTarget('', 'Bench Press', deload, { program: five, week: 4, dayKey: 'mon' }).reps, '5');
});

test('a lift without a target still follows the deload week modifier', () => {
  assert.equal(liftTarget('', 'Barbell Row', deload, { program, week: 4, dayKey: 'mon' }).sets, 2);
  assert.equal(liftTarget('', 'Barbell Row', build, { program, week: 1, dayKey: 'mon' }).sets, 3);
});
