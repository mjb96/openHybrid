// =============================================================================
// A4 — rep-range and effort mix
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntensityMix } from '../js/analytics/intensity-mix.js';
import { resolveRange } from '../js/analytics/ranges.js';

const range = resolveRange('30d', '2026-11-24');
const state = (setsByDate) => ({
  settings: { weightUnit: 'kg' },
  weeks: Object.fromEntries(Object.entries(setsByDate).map(([date, sets], index) => [String(index + 1), {
    dates: { mon: date },
    lifts: { mon: { 'Bench Press': sets } },
    runs: {}, runSessions: {}, gymStats: {},
  }])),
});
const rep = (r, extra = {}) => ({ c: true, w: '80', r: String(r), ...extra });

test('rep ranges and effort bands are counted from completed working sets', () => {
  const model = buildIntensityMix(state({
    '2026-11-20': [rep(2), rep(5), rep(5), rep(10), rep(15), rep(10, { rir: '2' }), rep(5, { rir: '0' }), rep(10, { rir: '4' })],
  }), { range, goal: 'hybrid' });
  assert.equal(model.totalRepSets, 8);
  const byKey = Object.fromEntries(model.repBands.map((band) => [band.key, band.count]));
  assert.deepEqual(byKey, { max: 1, strength: 3, hypertrophy: 3, endurance: 1 });
  assert.equal(Math.round(model.repBands.reduce((sum, band) => sum + band.sharePct, 0) * 10) / 10, 100);
  assert.equal(model.ratedSets, 3);
  assert.equal(model.unratedSets, 5);
  const effort = Object.fromEntries(model.effortBands.map((band) => [band.key, band.count]));
  assert.deepEqual(effort, { max: 1, hard: 1, moderate: 1 });
  assert.equal(Math.round(model.effortBands.reduce((sum, band) => sum + band.sharePct, 0) * 10) / 10, 100);
});

test('warm-ups are ignored and a hold has no reps but keeps its effort', () => {
  const warm = { c: true, w: '40', r: '10', type: 'W' };
  const hold = { c: true, mode: 'time', sec: '60', w: '20', rir: '1' };
  const model = buildIntensityMix(state({ '2026-11-20': [warm, hold, rep(5), rep(5), rep(5), rep(5), rep(5)] }), { range });
  assert.equal(model.totalRepSets, 5, 'five rep sets; the hold is not a rep range');
  assert.equal(model.ratedSets, 1, 'the hold carries RIR into the effort mix');
});

test('the goal line states the observed mix without prescribing', () => {
  const strength = buildIntensityMix(state({
    '2026-11-20': [rep(2), rep(3), rep(5), rep(5), rep(5)],
  }), { range, goal: 'strength' });
  assert.match(strength.goalFit.text, /1–6 strength range/);
  assert.doesNotMatch(strength.goalFit.text, /add|should|must/i);

  const highRep = buildIntensityMix(state({
    '2026-11-20': [rep(10), rep(10), rep(12), rep(15), rep(15)],
  }), { range, goal: 'strength' });
  assert.match(highRep.goalFit.text, /most sets are above 6 reps/i);
});

test('a small sample reports counts instead of a mix', () => {
  const model = buildIntensityMix(state({ '2026-11-20': [rep(5), rep(10)] }), { range });
  assert.equal(model.hasRepMix, false);
  assert.equal(model.goalFit, null);
});
