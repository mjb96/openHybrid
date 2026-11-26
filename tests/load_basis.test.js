import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  basisLabel, defaultBasisForExercise, normalizeBasis, perSideRepsLabel, supportsLoadBasis,
} from '../js/workout/load-basis.js';

test('dumbbell exercises offer a basis; barbell lifts do not', () => {
  assert.equal(supportsLoadBasis('Dumbbell Bench Press'), true);
  assert.equal(supportsLoadBasis('Barbell Bench Press'), false);
  assert.equal(supportsLoadBasis('Back Squat'), false);
});

test('new dumbbell sets default to Each (or Per side when unilateral)', () => {
  assert.equal(defaultBasisForExercise('Dumbbell Bench Press'), 'each');
  assert.equal(defaultBasisForExercise('One-Arm Dumbbell Row'), 'per-side');
  assert.equal(defaultBasisForExercise('Barbell Bench Press'), 'total');
  assert.equal(normalizeBasis('each'), 'each');
  assert.equal(normalizeBasis('per-side'), 'per-side');
  assert.equal(normalizeBasis('total'), 'total');
  assert.equal(normalizeBasis(undefined), 'total');
  assert.equal(basisLabel('each'), 'Each');
  assert.equal(basisLabel('per-side'), 'Per side');
  assert.equal(basisLabel('total'), 'Both');
});

test('a logged total states its per-side split (display only)', () => {
  assert.equal(perSideRepsLabel(8), '4 per side');
  assert.equal(perSideRepsLabel('12'), '6 per side');
  assert.equal(perSideRepsLabel(9), '4.5 per side', 'an odd total is stated honestly, not rounded away');
  assert.equal(perSideRepsLabel(0), '');
  assert.equal(perSideRepsLabel(''), '');
});
