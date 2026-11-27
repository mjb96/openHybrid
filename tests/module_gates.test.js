// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrainLanding } from '../js/train/train-landing.js';
import { buildProgressDashboard } from '../js/analytics/progress-dashboard.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const program = {
  name: 'Test', totalWeeks: 4,
  days: Object.fromEntries(DAYS.map((d) => [d, { title: d, lifts: ['Back Squat'], runs: 'Rest' }])),
};
const state = (modules = {}) => ({
  currentWeek: '1', activeProgramId: 'test',
  weeks: {
    '1': {
      dates: { mon: '2026-11-16' },
      lifts: {}, runs: {},
      runSessions: { mon: [{ sessionId: 'dummy_run', dist: '5', time: '25:00', localDate: '2026-11-16' }] },
    },
  },
  settings: { modules }, fastingSession: { active: true, history: [{ hours: 16 }] },
});

test('Train quick start follows the running and fasting modules', () => {
  const all = buildTrainLanding({ state: state(), program });
  assert.deepEqual(all.quickStart.map((a) => a.id), ['run', 'walk', 'fast']);

  const noRun = buildTrainLanding({ state: state({ running: false }), program });
  assert.deepEqual(noRun.quickStart.map((a) => a.id), ['fast']);

  const noRunNoFast = buildTrainLanding({ state: state({ running: false, fasting: false }), program });
  assert.deepEqual(noRunNoFast.quickStart.map((a) => a.id), []);

  // Dummy cardio data: the run is visible while Running is on and filtered out
  // when the module is off.
  assert.ok(all.recent.some((row) => row.kind === 'run'));
  assert.ok(!noRun.recent.some((row) => row.kind === 'run'));
});

test('Progress drops module-off bands through the registry', () => {
  const all = buildProgressDashboard(state(), { todayISO: '2026-11-19' });
  assert.ok(all.bands.some((band) => band.id === 'endurance'));
  assert.ok(all.bands.some((band) => band.id === 'fasting'));

  const hidden = buildProgressDashboard(state({ running: false, fasting: false }), { todayISO: '2026-11-19' });
  assert.ok(!hidden.bands.some((band) => band.id === 'endurance'));
  assert.ok(!hidden.bands.some((band) => band.id === 'fasting'));
});

test('Train previews the day exercises through the same liftTarget', () => {
  const landing = buildTrainLanding({ state: state(), program });
  assert.deepEqual(landing.exercises.map((e) => e.name), ['Back Squat']);
  assert.ok(landing.exercises[0].sets > 0);
  assert.ok(String(landing.exercises[0].reps).length > 0);
  assert.equal(landing.week.days.length, 7);
});
