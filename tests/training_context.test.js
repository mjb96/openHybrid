// =============================================================================
// TRAINING CONTEXT
//
// A compact external-coach/AI export: goals, active plan and recent training.
// It must never carry the athlete's name, notes, routes, photos or health
// records, and it must be date-strict and bounded.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTrainingContext, trainingContextFilename, TRAINING_CONTEXT_FORMAT, TRAINING_CONTEXT_VERSION,
} from '../js/portability/training-context.js';
import { addDaysISO } from '../js/dates.js';

const TODAY = '2026-11-24';

function state(overrides = {}) {
  return {
    currentWeek: '2',
    settings: {
      name: 'Secret Athlete',
      weightUnit: 'kg',
      distanceUnit: 'km',
      fitnessGoal: 'hybrid',
      weightGoal: 'maintain',
      fitnessLevel: 'intermediate',
      equipmentTier: 'gym',
      equipment: { barbell: true, rack: true, dumbbells: false },
      targetWeight: 75,
    },
    bodyWeightLog: [{ date: '2026-11-20', weight: 78.4 }],
    progressPhotos: [{ id: 'photo:2026-11-20', date: '2026-11-20' }],
    healthConnect: { steps: [{ date: '2026-11-20', value: 10000 }] },
    weeks: {
      '1': {
        dates: { mon: '2026-11-16', tue: '2026-11-17' },
        lifts: {
          mon: {
            'Bench Press': [
              { c: true, w: '100', r: '5', rir: 2, note: 'secret set note' },
            ],
          },
        },
        notes: { mon: 'secret session note' },
        runs: { tue: { dist: '5', time: '25:00', route: [{ lat: 1, lng: 2 }] } },
      },
      '2': { dates: { mon: '2026-11-23' }, lifts: { mon: { 'Bench Press': [{ c: true, w: '102.5', r: '5' }] } } },
    },
    ...overrides,
  };
}

const program = {
  id: 'prog_test',
  name: 'Test Plan',
  totalWeeks: 8,
  progressionStyle: 'double',
  days: {
    mon: { title: 'Upper', desc: '', lifts: ['Bench Press'] },
    wed: { title: 'Lower', desc: '', lifts: ['Back Squat'] },
  },
  weeklyVolModifiers: {
    '2': { sets: 4, reps: 5, intensityLabel: 'Build' },
  },
};

test('the context names its format/version and carries the active plan week', () => {
  const context = buildTrainingContext(state(), { program, todayISO: TODAY });
  assert.equal(context.format, TRAINING_CONTEXT_FORMAT);
  assert.equal(context.version, TRAINING_CONTEXT_VERSION);
  assert.equal(context.generated, TODAY);
  assert.equal(context.activePlan.week, 2);
  assert.equal(context.activePlan.name, 'Test Plan');
  assert.equal(context.activePlan.days.mon.lifts[0].name, 'Bench Press');
  assert.equal(context.activePlan.days.mon.lifts[0].sets, 4, 'the current week modifier is applied');
  assert.equal(context.activePlan.days.mon.lifts[0].reps, 5);
  assert.equal(context.profile.fitnessGoal, 'hybrid');
  assert.deepEqual(context.profile.equipment, ['barbell', 'rack']);
  assert.equal(context.body.weight, 78.4);
  assert.equal(context.body.targetWeight, 75);
});

test('recent sessions keep exact completed sets and runs, and drop notes/routes', () => {
  const context = buildTrainingContext(state(), { program, todayISO: TODAY });
  assert.equal(context.recent.trainingDays.length, 3);
  const first = context.recent.trainingDays.find((session) => session.date === '2026-11-16');
  assert.equal(first.exercises[0].name, 'Bench Press');
  assert.deepEqual(first.exercises[0].sets[0], {
    weight: 100, reps: 5, rir: 2,
  });
  const run = context.recent.trainingDays.find((session) => session.date === '2026-11-17');
  assert.deepEqual(run.run, { type: 'run', distanceKm: 5, seconds: 1500 });
  const text = JSON.stringify(context);
  assert.doesNotMatch(text, /Secret Athlete/);
  assert.doesNotMatch(text, /secret session note|secret set note/);
  assert.doesNotMatch(text, /route|lat|progressPhotos|healthConnect/);
});

test('the export is bounded and reports what it omitted', () => {
  const weeks = {};
  for (let i = 0; i < 30; i += 1) {
    const date = addDaysISO('2026-10-01', i);
    weeks[String(i + 1)] = {
      dates: { mon: date },
      lifts: { mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }] } },
    };
  }
  const context = buildTrainingContext(state({ weeks }), { program, todayISO: TODAY, maxSessions: 5 });
  assert.equal(context.recent.trainingDays.length, 5);
  assert.equal(context.recent.trainingDaysInWindow, 30);
  assert.equal(context.recent.trainingDaysOmitted, 25);
  assert.equal(context.recent.window.weeks, 8);
});

test('an undated or out-of-window session is never invented into the context', () => {
  const context = buildTrainingContext(state({
    weeks: {
      '1': { dates: {}, lifts: { mon: { Bench: [{ c: true, w: '100', r: '5' }] } } },
      '2': { dates: { mon: '2026-01-01' }, lifts: { mon: { Bench: [{ c: true, w: '100', r: '5' }] } } },
    },
  }), { program, todayISO: TODAY });
  assert.deepEqual(context.recent.trainingDays, []);
});

test('the filename is dated from the same local calendar key', () => {
  assert.equal(trainingContextFilename(TODAY), 'openhybrid-training-context-2026-11-24.json');
});
