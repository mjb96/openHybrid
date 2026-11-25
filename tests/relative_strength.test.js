// =============================================================================
// A8 — relative strength needs a RECENT dated weigh-in
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { _latestBodyWeight, _recentBodyWeight, _relativeStrength } from '../js/profile-stats.js';

const state = (log, weeks = {}) => ({ bodyWeightLog: log, weeks, settings: { weightUnit: 'kg' } });

test('the latest bodyweight comes from dated weigh-ins, never an undated session weight', () => {
  assert.equal(_latestBodyWeight(state([], { '1': { bodyWeight: { mon: '80' } } })), null);
  assert.equal(_latestBodyWeight(state([{ date: '2026-11-01', weight: 78 }, { date: '2026-11-18', weight: 76.4 }])), 76.4);
});

test('recent bodyweight is withheld when the latest weigh-in is stale', () => {
  const recent = _recentBodyWeight(state([{ date: '2026-11-18', weight: 76.4 }]), { now: '2026-11-25' });
  assert.deepEqual(recent, { weight: 76.4, date: '2026-11-18' });
  assert.equal(_recentBodyWeight(state([{ date: '2026-09-01', weight: 76.4 }]), { now: '2026-11-25' }), null);
  assert.equal(_recentBodyWeight(state([]), { now: '2026-11-25' }), null);
});

test('relative-strength rows carry the weigh-in date they were built from', () => {
  const weeks = {
    w1: {
      dates: { mon: '2026-11-10' },
      lifts: { mon: { 'Back Squat': [{ w: '140', r: '5', c: true }] } },
      runs: {}, runSessions: {}, gymStats: {},
    },
  };
  const rows = _relativeStrength(state([], weeks), ['mon'], 80, '2026-11-18');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].bodyWeightDate, '2026-11-18');
  assert.ok(rows[0].ratio > 1.7);
});
