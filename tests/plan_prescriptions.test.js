import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampRest, clampSets, clampWeight, clearLiftTarget, deloadSets, effectiveSets,
  normalizeReps, prunePrescriptions, renameLiftTarget, setLiftTarget, targetFor,
} from '../js/programs/editor/prescriptions.js';

const program = (overrides = {}) => ({
  id: 'prog_editor',
  totalWeeks: 4,
  days: {
    mon: { title: 'Upper', lifts: ['Bench Press', 'Barbell Row'], runs: 'Rest' },
    tue: { title: 'Lower', lifts: ['Back Squat'], runs: 'Rest' },
  },
  weeklyVolModifiers: {
    1: { sets: 3, reps: '8', intensityLabel: 'Build' },
    4: { sets: 2, reps: '8', intensityLabel: 'Deload week' },
  },
  ...overrides,
});

test('writing a target stores sets/reps and leaves other lifts alone', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  assert.deepEqual(targetFor(p, 'mon', 'Bench Press'), { sets: 4, reps: '6-8' });
  assert.equal(targetFor(p, 'mon', 'Barbell Row'), null);
});

test('a second write merges instead of replacing', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8', restSec: 150 });
  setLiftTarget(p, 'mon', 'Bench Press', { reps: '5' });
  assert.deepEqual(targetFor(p, 'mon', 'Bench Press'), { sets: 4, reps: '5', restSec: 150 });
});

test('values are clamped and blank rest/load is not stored', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 99, reps: '  6-8  ', restSec: 0, weight: 0 });
  assert.deepEqual(targetFor(p, 'mon', 'Bench Press'), { sets: 12, reps: '6-8' });
  assert.equal(clampSets('abc'), 3);
  assert.equal(clampSets(-5), 1);
  assert.equal(clampRest(5000), 900);
  assert.equal(clampRest('nope'), null);
  assert.equal(clampWeight(9999), 500);
  assert.equal(normalizeReps(' 8–10 '), '8–10');
});

test('clearing a target removes the empty day bucket', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6' });
  assert.equal(clearLiftTarget(p, 'mon', 'Bench Press'), true);
  assert.equal(p.prescriptions, undefined, 'no empty prescriptions object is left behind');
});

test('renaming a lift carries its target and never leaves the old key', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  p.days.mon.lifts = ['Dumbbell Bench Press', 'Barbell Row'];
  renameLiftTarget(p, 'mon', 'Bench Press', 'Dumbbell Bench Press');
  assert.equal(targetFor(p, 'mon', 'Bench Press'), null);
  assert.deepEqual(targetFor(p, 'mon', 'Dumbbell Bench Press'), { sets: 4, reps: '6-8' });
});

test('a rename into an already-edited slot keeps the destination', () => {
  const p = program();
  // Both lifts exist while both targets are written (pruning would otherwise
  // drop a target for a lift the day does not contain).
  p.days.mon.lifts = ['Bench Press', 'Dumbbell Bench Press'];
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6-8' });
  setLiftTarget(p, 'mon', 'Dumbbell Bench Press', { sets: 3, reps: '12' });
  p.days.mon.lifts = ['Dumbbell Bench Press'];
  renameLiftTarget(p, 'mon', 'Bench Press', 'Dumbbell Bench Press');
  assert.deepEqual(targetFor(p, 'mon', 'Dumbbell Bench Press'), { sets: 3, reps: '12' });
  assert.equal(targetFor(p, 'mon', 'Bench Press'), null);
});

test('orphan targets are pruned (an alias rename or an imported plan)', () => {
  const p = program({
    prescriptions: {
      mon: { 'Bench Press': { sets: 4, reps: '6' }, 'Ghost Lift': { sets: 3, reps: '10' } },
      wed: { 'Never Trained': { sets: 2, reps: '5' } },
    },
  });
  const removed = prunePrescriptions(p);
  assert.equal(removed, 2);
  assert.deepEqual(Object.keys(p.prescriptions.mon), ['Bench Press']);
  assert.equal(p.prescriptions.wed, undefined, 'an empty day is removed');
});

test('a deload halves prescribed sets with a floor of two', () => {
  assert.equal(deloadSets(4), 2);
  assert.equal(deloadSets(5), 3);
  assert.equal(deloadSets(2), 2);
  assert.equal(deloadSets(1), 2);
});

test('effectiveSets applies the deload only on a deload week', () => {
  const p = program();
  setLiftTarget(p, 'mon', 'Bench Press', { sets: 4, reps: '6' });
  assert.equal(effectiveSets(p, 'mon', 'Bench Press', p.weeklyVolModifiers[1]), 4);
  assert.equal(effectiveSets(p, 'mon', 'Bench Press', p.weeklyVolModifiers[4]), 2);
  assert.equal(effectiveSets(p, 'mon', 'Barbell Row', p.weeklyVolModifiers[1]), null, 'no target → the week modifier decides');
});
