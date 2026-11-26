// =============================================================================
// A1 — the analytics stall list uses the engine's own decision
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { initEngine } from '../js/engine.js';
import { getProgramById } from '../js/state.js';
import { buildStallList } from '../js/analytics/stall-list.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const act = 'act';
const set = (w, r) => ({ w: String(w), r: String(r), tr: 5, c: true });
const week = (date, sets) => ({
  activationId: act, programId: 'hybrid_engine', dates: { wed: date },
  lifts: { wed: { 'Back Squat': sets } }, gymStats: {}, runSessions: {},
});

function stateWith(sessions) {
  const weeks = {};
  sessions.forEach(([date, sets], index) => { weeks[String(index + 1)] = week(date, sets); });
  weeks['5'] = { activationId: act, programId: 'hybrid_engine', dates: {}, lifts: {}, gymStats: {}, runSessions: {} };
  return {
    currentWeek: '5', activeProgramId: 'hybrid_engine', activeActivationId: act,
    settings: { weightUnit: 'kg', equipmentProfiles: [] }, weeks,
    bodyWeightLog: [], bodyMeasurements: [], hybridScore: { history: [], xp: 0 }, loadMetrics: { atl: 0, ctl: 0 },
  };
}

test('three flat sessions with the latest missing the target produce a progress check', () => {
  const state = stateWith([
    ['2026-11-04', [set(100, 5), set(100, 5)]],
    ['2026-11-11', [set(100, 5), set(100, 5)]],
    ['2026-11-18', [set(100, 3), set(100, 3)]],
  ]);
  initEngine(() => state, () => DAYS);
  const stalls = buildStallList(state, getProgramById('hybrid_engine'));
  const squat = stalls.find((entry) => entry.lift === 'Back Squat');
  assert.ok(squat, 'the stalled lift is listed');
  assert.equal(squat.day, 'wed');
  assert.match(squat.message, /has not meaningfully improved/);
  assert.match(squat.target, /\d+ × \d+/);
});

test('improving sessions produce no stall', () => {
  const state = stateWith([
    ['2026-11-04', [set(100, 5)]],
    ['2026-11-11', [set(105, 5)]],
    ['2026-11-18', [set(110, 5)]],
  ]);
  initEngine(() => state, () => DAYS);
  assert.deepEqual(buildStallList(state, getProgramById('hybrid_engine')), []);
});

test('no programme means no list, never an invented one', () => {
  assert.deepEqual(buildStallList({ currentWeek: '1', weeks: {} }, null), []);
});
