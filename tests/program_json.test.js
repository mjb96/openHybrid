// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlanFile, parsePlanFile, createImportedProgram, planFilename } from '../js/programs/program-json.js';

const plan = {
  name: 'Test Block',
  totalWeeks: 4,
  days: {
    mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' },
    tue: { title: 'Rest', lifts: [], runs: 'Rest' },
    wed: { title: 'Pull', lifts: ['Barbell Row'], runs: 'Rest' },
  },
  weeklyVolModifiers: { 1: { sets: 4, reps: 6, intensityLabel: 'Build' } },
};

test('a plan round-trips through the JSON file', () => {
  const file = buildPlanFile(plan);
  assert.equal(file.format, 'openhybrid-plan');
  const parsed = parsePlanFile(JSON.stringify(file));
  assert.equal(parsed.name, 'Test Block');
  assert.equal(parsed.totalWeeks, 4);
  assert.deepEqual(parsed.days.mon.lifts, ['Bench Press']);
  assert.equal(parsed.days.tue.title, 'Rest');
  assert.equal(parsed.weeklyVolModifiers['4'].sets, 3);
  assert.equal(parsed.weeklyVolModifiers['1'].intensityLabel, 'Build');
});

test('import creates a fresh custom id and never claims a source program', () => {
  const parsed = parsePlanFile(JSON.stringify({ plan }));
  const imported = createImportedProgram(parsed, ['prog_import_fixed']);
  assert.match(imported.id, /^prog_import_/);
  assert.equal(imported.id === 'prog_import_fixed', false);
  assert.equal(imported.sourceProgramId, null);
  assert.equal(imported.days.mon.lifts[0], 'Bench Press');
});

test('per-exercise targets round-trip and are bounded', () => {
  const withTargets = {
    ...plan,
    days: { ...plan.days, mon: { ...plan.days.mon, lifts: ['Bench Press', 'Barbell Row'] } },
    prescriptions: {
      mon: {
        'Bench Press': { sets: 4, reps: '6-8', restSec: 150, weight: 80 },
        'Ghost Lift': { sets: 3, reps: '10' },          // not on the day → dropped
        'Barbell Row': { sets: 99, reps: ' 12 ', restSec: 5000, weight: 9999 },
      },
      wed: { 'Barbell Row': { sets: 3, reps: '10' } },
    },
  };
  const parsed = parsePlanFile(JSON.stringify(buildPlanFile(withTargets)));
  assert.deepEqual(parsed.prescriptions.mon['Bench Press'], { sets: 4, reps: '6-8', restSec: 150, weight: 80 });
  assert.equal(parsed.prescriptions.mon['Ghost Lift'], undefined, 'an orphan target is dropped');
  assert.deepEqual(parsed.prescriptions.mon['Barbell Row'], { sets: 20, reps: '12', restSec: 900, weight: 500 });
  assert.deepEqual(parsed.prescriptions.wed, { 'Barbell Row': { sets: 3, reps: '10' } });
});

test('an old plan file without targets imports cleanly', () => {
  const parsed = parsePlanFile(JSON.stringify({ plan }));
  assert.equal(parsed.prescriptions, undefined);
});

test('bad or empty plans are rejected', () => {
  assert.throws(() => parsePlanFile('not json'), /valid JSON/);
  assert.throws(() => parsePlanFile(JSON.stringify({ format: 'something-else' })), /not an openHybrid plan/);
  assert.throws(() => parsePlanFile(JSON.stringify({ plan: { name: 'Empty', days: {} } })), /no training days/);
  assert.throws(() => parsePlanFile(JSON.stringify({ plan: { days: plan.days } })), /no name/);
});

test('a filename is safe and readable', () => {
  assert.equal(planFilename({ name: 'My Plan: 5×5!' }), 'my-plan-5-5.json');
});
