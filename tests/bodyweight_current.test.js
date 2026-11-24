// ==========================================
// CURRENT BODYWEIGHT TEST (tests/bodyweight_current.test.js)
// A back-dated weigh-in appended after today's must not become "current".
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestWeighIn } from '../js/metrics/bodyweight.js';
import { currentBodyweight } from '../js/workout/set-mutations.js';

test('latestWeighIn orders by date, not array position', () => {
  const log = [
    { date: '2026-11-20', weight: 78 },
    { date: '2026-10-15', weight: 75 },
    { date: '2026-11-01', weight: 80 },
  ];
  assert.deepEqual(latestWeighIn(log), { date: '2026-11-20', weight: 78 });
});

test('currentBodyweight uses the latest dated weigh-in', () => {
  const state = {
    bodyWeightLog: [
      { date: '2026-11-20', weight: 78 },
      { date: '2026-10-15', weight: 75 },
    ],
    settings: { defaultBodyWeight: 90 },
  };
  assert.equal(currentBodyweight(state), 78);
});

test('currentBodyweight falls back to the default only with no valid readings', () => {
  assert.equal(currentBodyweight({ bodyWeightLog: [], settings: { defaultBodyWeight: 90 } }), 90);
  assert.equal(currentBodyweight({ bodyWeightLog: [{ date: 'bad', weight: 70 }], settings: { defaultBodyWeight: 90 } }), 90);
  assert.equal(currentBodyweight({ bodyWeightLog: [], settings: {} }), null);
});

test('latestWeighIn keeps a legacy undated reading but prefers dated rows', () => {
  assert.deepEqual(latestWeighIn([{ weight: 80 }]), { date: '', weight: 80 });
  assert.deepEqual(
    latestWeighIn([{ weight: 80 }, { date: '2026-11-01', weight: 78 }]),
    { date: '2026-11-01', weight: 78 },
  );
});
