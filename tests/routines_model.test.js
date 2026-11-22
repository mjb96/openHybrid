// =============================================================================
// ROUTINES MODEL (tests/routines_model.test.js)
//
// A routine is a reusable SESSION TEMPLATE, not a programme. These tests pin the
// saved shape (what is copied, what is never copied), the rest/rep precedence,
// the shape round-trip through a one-off copy session, the refusal on a session
// with no working sets, and that a full-state export/import keeps routines and
// folders intact.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildRoutineFromSession, prescriptionForSets, routineSourceWeek } from '../js/routines/model.js';
import { ensureRoutines, newFolderId, removeRoutine } from '../js/routines/store.js';
import { createOneOffStrengthSession } from '../js/workout/one-off-session.js';
import { wrapExport, parseImport } from '../js/state/route-portability.js';
import { validateImport } from '../js/state/import-validate.js';
import { CURRENT_SCHEMA_VERSION, migrateState } from '../js/state/migrations.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function state() {
  return {
    settings: {
      restOverrides: { 'Bench Press': 120, 'Barbell Row': 90 },
    },
  };
}

/**
 * A finished session carrying every field that must NOT travel into a routine:
 * completion flags, a PR badge, a warm-up, a blank row, J&T role stamps, target
 * ghosts, effort and notes, plus session notes and gym stats.
 */
function sessionWeek() {
  return {
    programId: 'hybrid_engine',
    dates: { mon: '2026-11-16' },
    lifts: {
      mon: {
        'Bench Press': [
          { w: '60', r: '5', c: true, type: 'W', note: 'warm-up' },
          { w: '100', r: '8', c: true, tr: '8', restSec: 180, isPR: true },
          { w: '100', r: '7', c: true, tr: '8' },
          { w: '105', r: '6', c: true, rir: 1, rpe: 8, failure: true, note: 'grinder', tw: '105', role: 'top', roleReps: 6, boPct: 85, boSrc: 'repmax' },
          { w: '', r: '8', c: false },
        ],
        Deadlift: [{ w: '140', r: '5', c: 'true' }],
        Plank: [{ w: '', r: '', c: true, mode: 'time', sec: 60 }],
        'Farmer Carry': [{ w: '40', r: '', c: true, mode: 'distance', dist: 30 }],
        'Barbell Row': [{ w: '60', r: '10', c: true }],
        'Incline DB Press': [{ w: '30', r: '10', c: true, basis: 'each', loadMode: 'weighted' }],
        'Warmup Only': [{ w: '20', r: '5', c: true, type: 'W' }],
      },
    },
    liftOrder: {
      mon: ['Bench Press', 'Deadlift', 'Plank', 'Farmer Carry', 'Barbell Row', 'Incline DB Press', 'Warmup Only'],
    },
    notes: { mon: 'Felt strong. Session note must not travel.' },
    gymStats: { mon: { time: '55:00', avgHR: '120' } },
  };
}

function build(options = {}) {
  return buildRoutineFromSession(state(), sessionWeek(), 'mon', {
    name: 'Push day', activityId: 'strength:str_saved', ...options,
  });
}

test('exercise membership and order follow the saved session, warm-ups skipped', () => {
  const routine = build();
  assert.deepEqual(routine.days.mon.lifts, ['Bench Press', 'Deadlift', 'Plank', 'Farmer Carry', 'Barbell Row', 'Incline DB Press']);
  assert.equal(routine.days.mon.runs, 'Rest');
  assert.equal(routine.days.mon.badge, 'Routine');
  assert.equal(routine.totalWeeks, 1);
  assert.deepEqual(routine.weeklyVolModifiers['1'], { sets: 3, reps: 10, intensityLabel: '' });
  assert.deepEqual(routine.source, {
    activityId: 'strength:str_saved', programId: 'hybrid_engine', day: 'mon', date: '2026-11-16',
  });
  assert.equal(routine.prescriptions.mon['Warmup Only'], undefined);
});

test('only completed working sets count: warm-ups, blank rows and empty lifts are excluded', () => {
  const routine = build();
  const bench = routine.prescriptions.mon['Bench Press'];
  assert.equal(bench.sets, 3, 'one warm-up and one uncompleted row do not count');
  assert.equal(prescriptionForSets(state(), 'Bench Press', [
    { w: '60', r: '5', c: true, type: 'W' },
    { w: '', r: '', c: true },
    { w: '', r: '8', c: false },
  ]), null);

  const empty = buildRoutineFromSession(state(), {
    lifts: { mon: { 'Bench Press': [{ w: '60', r: '5', c: true, type: 'W' }] } },
    liftOrder: { mon: ['Bench Press'] },
  }, 'mon', { name: 'Nothing' });
  assert.equal(empty, null, 'a session with zero working sets is refused');
  assert.equal(buildRoutineFromSession(state(), { lifts: {} }, 'mon', { name: 'Nothing' }), null);
});

test('the load is the heaviest working set; the rep target prefers tr, then r', () => {
  const routine = build();
  const bench = routine.prescriptions.mon['Bench Press'];
  assert.equal(bench.weight, 105);
  assert.equal(bench.reps, 8, 'the persisted prescription (tr) outranks the heaviest set’s 6 reps');
  assert.equal(bench.mode, undefined);

  const deadlift = routine.prescriptions.mon.Deadlift;
  assert.equal(deadlift.weight, 140);
  assert.equal(deadlift.reps, 5, 'with no tr the performed reps are the target');
  assert.equal(deadlift.restSec, null);
});

test('rest precedence: per-set rest, then the exercise override, then the default', () => {
  const routine = build();
  assert.equal(routine.prescriptions.mon['Bench Press'].restSec, 180, 'per-set rest outranks the 120s override');
  assert.equal(routine.prescriptions.mon['Barbell Row'].restSec, 90, 'the exercise override applies when the set has none');
  assert.equal(routine.prescriptions.mon.Deadlift.restSec, null);
  assert.equal(routine.prescriptions.mon.Plank.restSec, null);

  const noTimer = prescriptionForSets(state(), 'Barbell Row', [{ w: '60', r: '10', c: true, restSec: 0 }]);
  assert.equal(noTimer.restSec, 0, 'rest 0 means “no timer” and survives as a real value');
});

test('holds and carries keep their shape, with no invented reps', () => {
  const routine = build();
  assert.deepEqual(routine.prescriptions.mon.Plank, { sets: 1, reps: '', weight: null, restSec: null, mode: 'time', sec: 60 });
  assert.deepEqual(routine.prescriptions.mon['Farmer Carry'], { sets: 1, reps: '', weight: 40, restSec: null, mode: 'distance', dist: 30 });
  assert.deepEqual(routine.prescriptions.mon['Incline DB Press'], {
    sets: 1, reps: 10, weight: 30, restSec: null, basis: 'each', loadMode: 'weighted',
  });
});

test('completion, PR, effort, notes and gym stats are never copied', () => {
  const json = JSON.stringify(build());
  assert.doesNotMatch(json, /"(c|isPR|tw|rir|rpe|failure|role|roleReps|boPct|boSrc|note|notes|gymStats|weeks)":/);
  assert.doesNotMatch(json, /grinder|Felt strong|warm-up/);
  assert.equal(build().source.programId, 'hybrid_engine');
});

test('routineSourceWeek seeds a copyable week: count, order, rep target and rest', () => {
  const routine = build();
  const source = routineSourceWeek(routine);
  assert.deepEqual(source.liftOrder.mon, routine.days.mon.lifts);
  assert.deepEqual(Object.keys(source.lifts.mon), routine.days.mon.lifts);
  assert.deepEqual(source.lifts.mon['Bench Press'][0], { w: '105', r: '8', c: false, tr: '8', restSec: 180 });
  assert.equal(source.lifts.mon['Bench Press'].length, 3);
  assert.deepEqual(source.lifts.mon.Plank[0], { w: '', r: '', c: false, mode: 'time', sec: 60 });
  assert.deepEqual(source.lifts.mon['Farmer Carry'][0], { w: '40', r: '', c: false, mode: 'distance', dist: 30 });
  assert.deepEqual(source.lifts.mon['Barbell Row'][0], { w: '60', r: '10', c: false, tr: '10', restSec: 90 });
});

test('routineSourceWeek drives a one-off copy session without touching the program', () => {
  const routine = build();
  const savedState = { weeks: {}, settings: {} };
  const source = routineSourceWeek(routine);
  const created = createOneOffStrengthSession(savedState, {
    kind: 'copy',
    title: routine.name,
    sourceWeek: source,
    sourceDay: 'mon',
    now: new Date('2026-11-18T12:00:00Z'),
    tz: 'UTC',
  });
  const week = savedState.weeks[created.key];
  assert.equal(week.sessionKind, 'copy');
  assert.equal(week.sessionTitle, 'Push day');
  assert.equal(week.programId, null);
  assert.equal(week.activeProgramId, undefined);
  assert.equal(savedState.currentWeek, undefined);
  assert.deepEqual(week.liftOrder[created.day], routine.days.mon.lifts);

  const lifts = week.lifts[created.day];
  assert.equal(lifts['Bench Press'].length, 3);
  assert.ok(lifts['Bench Press'].every((set) => set.c === false), 'every copied set starts uncompleted');
  assert.equal(lifts['Bench Press'][0].w, '105');
  assert.equal(lifts['Bench Press'][0].r, '8');
  assert.equal(lifts['Bench Press'][0].tr, '8');
  assert.equal(lifts['Bench Press'][0].restSec, 180);
  assert.equal(lifts.Plank[0].mode, 'time');
  assert.equal(lifts.Plank[0].sec, 60);
});

test('the store seeds and repairs both root arrays, and Undo can remove a routine', () => {
  const blank = {};
  assert.equal(ensureRoutines(blank), true);
  assert.deepEqual(blank.routines, []);
  assert.deepEqual(blank.libraryFolders, []);
  assert.equal(ensureRoutines(blank), false);

  const corrupt = { routines: { nope: true }, libraryFolders: 'nope' };
  ensureRoutines(corrupt);
  assert.deepEqual(corrupt.routines, []);
  assert.deepEqual(corrupt.libraryFolders, []);

  const routine = build();
  const withRoutine = { routines: [routine] };
  assert.deepEqual(removeRoutine(withRoutine, routine.id), routine);
  assert.deepEqual(withRoutine.routines, []);
  assert.equal(removeRoutine(withRoutine, routine.id), null);
});

test('a full-state export/import round-trips routines and folders', () => {
  const routine = build();
  const folder = {
    id: newFolderId(), name: 'Travel', sortOrder: 0,
    createdAt: '2026-11-16T10:00:00.000Z', updatedAt: '2026-11-16T10:00:00.000Z',
  };
  const saved = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentWeek: '1',
    weeks: { '1': { lifts: {} } },
    routines: [routine],
    libraryFolders: [folder],
  };
  const file = JSON.parse(JSON.stringify(wrapExport(saved)));
  const parsed = parseImport(file);
  assert.ok(parsed, 'the export envelope is recognised');
  const checked = validateImport(parsed.state, { currentSchemaVersion: CURRENT_SCHEMA_VERSION });
  assert.equal(checked.ok, true);
  const migrated = migrateState(checked.state);
  assert.deepEqual(migrated.routines, [routine]);
  assert.deepEqual(migrated.libraryFolders, [folder]);
});

test('routine modules never activate a program or write a week slot', () => {
  for (const file of ['js/routines/store.js', 'js/routines/model.js']) {
    const source = readFileSync(path.join(ROOT, file), 'utf8');
    assert.doesNotMatch(source, /from '\.\.\/state\.js'/, `${file} must not import the program-aware state module`);
    assert.doesNotMatch(source, /startProgramActivation\(|reseedActiveProgramIntoWeek\(/, `${file} must not start or reseed a program`);
    assert.doesNotMatch(source, /getProgramById\(|resolveProgramForState\(/, `${file} must not resolve a program`);
    assert.doesNotMatch(source, /\.activeProgramId\s*=|\.currentWeek\s*=/, `${file} must not move the active program week`);
    assert.doesNotMatch(source, /state\.weeks\s*[.[]/, `${file} must not read an active week slot`);
  }
});
