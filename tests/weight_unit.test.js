// ==========================================
// WEIGHT UNIT CONVERSION TEST (tests/weight_unit.test.js)
// H1/S-F4: a unit switch converts stored weights instead of relabelling them.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  convertStoredWeights,
  convertWeightValue,
  normalizeWeightUnit,
} from '../js/metrics/weight-unit.js';

test('normalizeWeightUnit accepts the onboarding and Settings spellings', () => {
  assert.equal(normalizeWeightUnit('kg'), 'kg');
  assert.equal(normalizeWeightUnit('lb'), 'lbs');
  assert.equal(normalizeWeightUnit('lbs'), 'lbs');
  assert.equal(normalizeWeightUnit('stone'), 'kg');
});

test('convertWeightValue preserves type, empty values and invalid input', () => {
  assert.equal(convertWeightValue('100', 'kg', 'lbs'), '220.5');
  assert.equal(convertWeightValue(100, 'kg', 'lbs'), 220.5);
  assert.equal(convertWeightValue('', 'kg', 'lbs'), '');
  assert.equal(convertWeightValue(null, 'kg', 'lbs'), null);
  assert.equal(convertWeightValue('abc', 'kg', 'lbs'), 'abc');
  assert.equal(convertWeightValue(100, 'kg', 'kg'), 100);
});

test('a kg→lbs switch converts sets, bodyweight, goals and prescriptions', () => {
  const state = {
    settings: {
      defaultBodyWeight: 80, targetWeight: 75, rateGoal: -0.25, progressionIncrement: 2.5,
    },
    bodyWeightLog: [{ date: '2026-11-20', weight: 80 }],
    weeks: {
      '1': {
        lifts: { mon: { Squat: [{ w: '100', r: '5' }, { w: '', r: '' }] } },
        bodyWeight: { mon: '80' },
      },
    },
    prGoals: { Squat: 140 },
    routines: [{ prescriptions: { mon: { Squat: { weight: 100 } } } }],
    customPrograms: [{ prescriptions: { tue: { Bench: { weight: 60 } } } }],
  };
  const report = convertStoredWeights(state, 'kg', 'lbs');
  assert.equal(report.sets, 1);
  assert.equal(report.bodyWeights, 2);
  assert.equal(report.goals, 1);
  assert.equal(report.prescriptions, 2);
  assert.equal(state.weeks['1'].lifts.mon.Squat[0].w, '220.5');
  assert.equal(state.weeks['1'].lifts.mon.Squat[1].w, '');
  assert.equal(state.weeks['1'].bodyWeight.mon, '176.4');
  assert.equal(state.bodyWeightLog[0].weight, 176.4);
  assert.equal(state.settings.defaultBodyWeight, 176.4);
  assert.equal(state.settings.targetWeight, 165.3);
  assert.equal(state.settings.rateGoal, -0.6);
  assert.equal(state.settings.progressionIncrement, 5.5);
  assert.equal(state.prGoals.Squat, 308.5);
  assert.equal(state.routines[0].prescriptions.mon.Squat.weight, 220.5);
  assert.equal(state.customPrograms[0].prescriptions.tue.Bench.weight, 132.5);
});

test('lbs→kg converts back without touching a same-unit call', () => {
  const state = {
    settings: { defaultBodyWeight: 176.4 },
    weeks: { '1': { lifts: { mon: { Squat: [{ w: '220.5' }] } } } },
  };
  convertStoredWeights(state, 'lbs', 'kg');
  assert.equal(state.weeks['1'].lifts.mon.Squat[0].w, '100');
  assert.equal(state.settings.defaultBodyWeight, 80);

  const before = JSON.stringify(state);
  convertStoredWeights(state, 'kg', 'kg');
  assert.equal(JSON.stringify(state), before);
});
