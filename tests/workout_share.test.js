// =============================================================================
// WORKOUT SHARE CARD TESTS
// The summary is built from the recap model, so it must never claim a number the
// recap screen would not show. Pure parts only; the canvas is device-verified.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkoutShareSummary, workoutShareCaption } from '../js/share/workout-share.js';

const strengthRecap = {
  dateISO: '2026-11-19',
  types: ['gym'],
  weightUnit: 'kg',
  distanceUnit: 'km',
  tonnage: 12450,
  workingSets: 18,
  duration: '52:10',
  lifts: [
    { name: 'Back Squat', sets: 5, shape: 'reps', topSet: { w: 140, r: 5 }, pr: true, volume: 5000 },
    { name: 'Bench Press', sets: 4, shape: 'reps', topSet: { w: 90, r: 8 }, pr: false, volume: 3600 },
    { name: 'Plank', sets: 3, shape: 'time', topShape: { value: 90 }, topSet: null, pr: false, volume: 0 },
    { name: 'Row', sets: 3, shape: 'reps', topSet: { w: 70, r: 10 }, pr: true, volume: 2100 },
  ],
  run: null,
  empty: false,
};

test('a strength session becomes a titled summary with honest stats', () => {
  const summary = buildWorkoutShareSummary(strengthRecap, { title: 'Upper strength' });
  assert.equal(summary.title, 'Upper strength');
  assert.equal(summary.kindLabel, 'Strength');
  assert.equal(summary.dateISO, '2026-11-19');
  assert.deepEqual(summary.stats, [
    { label: 'Volume', value: '12,450 kg' },
    { label: 'Sets', value: '18' },
    { label: 'Time', value: '52:10' },
  ]);
  assert.deepEqual(summary.highlights, [
    { name: 'Back Squat', detail: '140 kg × 5' },
    { name: 'Bench Press', detail: '90 kg × 8' },
    { name: 'Plank', detail: '1:30' },
  ]);
  assert.deepEqual(summary.prNames, ['Back Squat', 'Row']);
});

test('the caption states the work and only the PRs that exist', () => {
  const summary = buildWorkoutShareSummary(strengthRecap, { title: 'Upper strength' });
  assert.equal(
    workoutShareCaption(summary),
    'Upper strength — 12,450 kg volume · 18 sets · 52:10 time. 2 PRs (Back Squat, Row). #openHybrid',
  );

  const noPr = buildWorkoutShareSummary({ ...strengthRecap, lifts: [strengthRecap.lifts[1]] }, { title: 'Push' });
  assert.equal(workoutShareCaption(noPr), 'Push — 12,450 kg volume · 18 sets · 52:10 time. #openHybrid');
});

test('a run reports distance and pace in the athlete unit', () => {
  const recap = {
    dateISO: '2026-11-20', types: ['run'], weightUnit: 'kg', distanceUnit: 'mi',
    tonnage: 0, workingSets: 0, duration: '', lifts: [], empty: false,
    run: { distKm: 10, time: '50:00', pace: '5:00' },
  };
  const summary = buildWorkoutShareSummary(recap, { title: 'Easy run' });
  assert.equal(summary.kindLabel, 'Run');
  assert.deepEqual(summary.stats, [
    { label: 'Distance', value: '6.21 mi' },
    { label: 'Pace', value: '8:03 /mi' },
  ]);
  assert.deepEqual(summary.highlights, []);
});

test('a mixed day names both kinds', () => {
  const recap = {
    ...strengthRecap,
    types: ['gym', 'run'],
    run: { distKm: 5, time: '25:00', pace: '5:00' },
  };
  const summary = buildWorkoutShareSummary(recap, { title: 'Hybrid day' });
  assert.equal(summary.kindLabel, 'Strength + Run');
  assert.ok(summary.stats.some((stat) => stat.label === 'Distance'));
});

test('an empty session has nothing to share', () => {
  assert.equal(buildWorkoutShareSummary({ empty: true, lifts: [] }), null);
  assert.equal(buildWorkoutShareSummary(null), null);
  assert.equal(workoutShareCaption(null), '');
});

test('a private workout note never reaches the shared summary or caption', () => {
  const note = 'Knee felt off — private note, do not share';
  const summary = buildWorkoutShareSummary({ ...strengthRecap, notes: note }, { title: 'Upper strength' });
  assert.equal('notes' in summary, false);
  assert.ok(!JSON.stringify(summary).includes(note));
  assert.ok(!workoutShareCaption(summary).includes('Knee felt off'));
});

test('a bodyweight lift with no load still reports its reps', () => {
  const recap = {
    ...strengthRecap,
    lifts: [{ name: 'Push-Up', sets: 3, shape: 'reps', topSet: { w: 0, r: 20 }, pr: false, volume: 0 }],
  };
  const summary = buildWorkoutShareSummary(recap, { title: 'Push' });
  assert.deepEqual(summary.highlights, [{ name: 'Push-Up', detail: '20' }]);
});
