// =============================================================================
// HOME FIRST RUN
//
// Home hides its data cards only for a genuinely empty profile: no training in
// any week (archived and imported included), no weigh-in, and no saved Home
// customization. Anything else restores them.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDashboardModel, showHomeFirstRun } from '../js/home/dashboard-model.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const PROGRAM = {
  totalWeeks: 4,
  days: { mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' } },
  weeklyVolModifiers: { '1': { sets: 2, reps: 5 } },
};

function state(overrides = {}) {
  return {
    currentWeek: '1',
    weekStartedAt: '2026-11-16',
    settings: { weekStartDay: 'mon' },
    weeks: { '1': { dates: {}, lifts: {}, runSessions: {}, gymStats: {} } },
    healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
    wellnessLog: [],
    bodyWeightLog: [],
    ...overrides,
  };
}

test('an empty profile shows the first-run card', () => {
  const s = state();
  const model = computeDashboardModel(s, DAYS, PROGRAM, 'mon', { today: '2026-11-16' });
  assert.equal(model.hasAnyTraining, false);
  assert.equal(showHomeFirstRun(model, s), true);
});

test('any completed set anywhere ends the first run', () => {
  const s = state({
    weeks: { '1': { dates: {}, lifts: { mon: { 'Bench Press': [{ w: '80', r: '5', c: true }] } }, runSessions: {}, gymStats: {} } },
  });
  const model = computeDashboardModel(s, DAYS, PROGRAM, 'mon', { today: '2026-11-16' });
  assert.equal(model.hasAnyTraining, true);
  assert.equal(showHomeFirstRun(model, s), false);
});

test('archived and imported work also ends the first run', () => {
  const s = state({
    weeks: {
      '1': { dates: {}, lifts: {}, runSessions: {}, gymStats: {} },
      'arch:import:x': { dates: { mon: '2026-11-09' }, lifts: { mon: { Bench: [{ w: '80', r: '5', c: true }] } }, runSessions: {} },
    },
  });
  const model = computeDashboardModel(s, DAYS, PROGRAM, 'mon', { today: '2026-11-16' });
  assert.equal(model.hasAnyTraining, true);
  assert.equal(showHomeFirstRun(model, s), false);
});

test('a single weigh-in is enough to show the real cards', () => {
  const s = state({ bodyWeightLog: [{ date: '2026-11-15', weight: 80 }] });
  const model = computeDashboardModel(s, DAYS, PROGRAM, 'mon', { today: '2026-11-16' });
  assert.equal(showHomeFirstRun(model, s), false);
});

test('saved Home customization always wins over the first-run card', () => {
  const s = state({ settings: { weekStartDay: 'mon', ui: { home: { hidden: ['bodyweight'] }, progress: { hidden: [] } } } });
  const model = computeDashboardModel(s, DAYS, PROGRAM, 'mon', { today: '2026-11-16' });
  assert.equal(showHomeFirstRun(model, s), false);
});

test('a missing model never claims a first run', () => {
  assert.equal(showHomeFirstRun(null, state()), false);
});
