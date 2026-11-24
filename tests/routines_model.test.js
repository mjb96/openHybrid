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

import { buildRoutineFromSession, prescriptionForSets, routineSourceWeek, routineSummary } from '../js/routines/model.js';
import {
  createFolder, deleteFolder, ensureRoutines, findFolder, hasRoutineCapacity,
  MAX_ROUTINE_LIFTS, MAX_ROUTINES, MAX_ROUTINE_SETS, moveFolder, moveRoutineToFolder,
  newFolderId, normalizeRoutineCategory, orderedFolders, removeRoutine, renameFolder,
  restoreFolder, ROUTINE_CATEGORIES, routineCategoryLabel, setRoutineCategory,
} from '../js/routines/store.js';
import { createOneOffStrengthSession } from '../js/workout/one-off-session.js';
import { buildSetRow } from '../js/templates.js';
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

/** A one-day session built from an explicit lift map. */
function loadWeek(lifts) {
  return {
    dates: { mon: '2026-11-16' },
    lifts: { mon: lifts },
    liftOrder: { mon: Object.keys(lifts) },
  };
}

test('exercise membership and order follow the saved session, warm-ups skipped', () => {
  const routine = build();
  assert.equal(routine.kind, 'routine', 'a routine is discriminated from a program');
  assert.deepEqual(routine.days.mon.lifts, ['Bench Press', 'Deadlift', 'Plank', 'Farmer Carry', 'Barbell Row', 'Incline DB Press']);
  assert.equal(routine.days.mon.runs, 'Rest');
  assert.equal(routine.days.mon.badge, 'Routine');
  assert.equal(routine.totalWeeks, 1);
  assert.deepEqual(routine.weeklyVolModifiers['1'], { sets: 3, reps: 10, intensityLabel: '' });
  assert.deepEqual(routine.source, {
    activityId: 'strength:str_saved', programId: 'hybrid_engine', day: 'mon', date: '2026-11-16',
  });
  assert.equal(routine.prescriptions.mon['Warmup Only'], undefined);
  assert.equal(routine.prescriptions.mon['Bench Press'].basis, undefined, 'barbell lifts carry no load basis');
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

test('the load is the heaviest working set; the rep target follows the anchor set', () => {
  const routine = build();
  const bench = routine.prescriptions.mon['Bench Press'];
  assert.equal(bench.weight, 105);
  assert.equal(bench.reps, 6, 'the heaviest set has no tr, so its own 6 reps pair with the 105 load');
  assert.equal(bench.mode, undefined);

  const deadlift = routine.prescriptions.mon.Deadlift;
  assert.equal(deadlift.weight, 140);
  assert.equal(deadlift.reps, 5, 'with no tr the performed reps are the target');
  assert.equal(deadlift.restSec, null);
});

test('rep target precedence: anchor tr, anchor r, any tr, then any r', () => {
  // Anchor tr wins over everything.
  assert.equal(prescriptionForSets(state(), 'Bench Press', [
    { w: '100', r: '8', c: true, tr: '8' },
    { w: '110', r: '5', c: true, tr: '5' },
  ]).reps, 5);
  // Anchor r wins over another set's tr.
  assert.equal(prescriptionForSets(state(), 'Bench Press', [
    { w: '100', r: '8', c: true, tr: '8' },
    { w: '110', r: '6', c: true },
  ]).reps, 6);
  // With no anchor values, any tr, then any performed reps are the fallbacks.
  assert.equal(prescriptionForSets(state(), 'Bench Press', [
    { w: '100', r: '8', c: true, tr: '8' },
    { w: '110', r: '', c: true },
  ]).reps, 8);
  assert.equal(prescriptionForSets(state(), 'Bench Press', [
    { w: '100', r: '8', c: true },
    { w: '110', r: '6', c: true },
  ]).reps, 6);
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
  assert.deepEqual(routine.prescriptions.mon['Farmer Carry'], { sets: 1, reps: '', weight: 40, restSec: null, mode: 'distance', dist: 30, basis: 'total' });
  assert.deepEqual(routine.prescriptions.mon['Incline DB Press'], {
    sets: 1, reps: 10, weight: 30, restSec: null, basis: 'each',
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
  const { sourceWeek, sourceDay } = routineSourceWeek(routine);
  assert.equal(sourceDay, 'mon', 'the day travels with the week so Start cannot pick today');
  assert.deepEqual(sourceWeek.liftOrder.mon, routine.days.mon.lifts);
  assert.deepEqual(Object.keys(sourceWeek.lifts.mon), routine.days.mon.lifts);
  assert.deepEqual(sourceWeek.lifts.mon['Bench Press'][0], { w: '105', r: '6', c: false, tr: '6', restSec: 180 });
  assert.equal(sourceWeek.lifts.mon['Bench Press'].length, 3);
  assert.deepEqual(sourceWeek.lifts.mon.Plank[0], { w: '', r: '', c: false, mode: 'time', sec: 60 });
  assert.deepEqual(sourceWeek.lifts.mon['Farmer Carry'][0], { w: '40', r: '', c: false, mode: 'distance', dist: 30, basis: 'total' });
  assert.deepEqual(sourceWeek.lifts.mon['Barbell Row'][0], { w: '60', r: '10', c: false, tr: '10', restSec: 90 });
});

test('load identity survives the routine round trip (modern + legacy)', () => {
  const week = loadWeek({
    'Pull-Ups': [{ w: '80', r: '8', c: true, loadMode: 'bodyweight', bw: true }],
    'Chin-Ups': [{ w: '60', r: '6', c: true, loadMode: 'assisted', band: 'M' }],
    'Band Triceps Pushdown': [{ w: '20', r: '12', c: true, loadMode: 'banded', band: 'M' }],
    Dips: [{ w: '80', r: '10', c: true, bw: true }],
    'Chest Dips': [{ w: '55', r: '6', c: true, band: 'M' }],
    'Band Leg Curl': [{ w: '30', r: '12', c: true, band: 'H' }],
  });
  const routine = buildRoutineFromSession(state(), week, 'mon', { name: 'Loads' });
  const p = routine.prescriptions.mon;

  // Modern sets: the mode and its flag travel, and a derived effective load is
  // never stored as a barbell weight.
  assert.equal(p['Pull-Ups'].loadMode, 'bodyweight');
  assert.equal(p['Pull-Ups'].bw, true);
  assert.equal(p['Pull-Ups'].weight, null);
  assert.equal(p['Chin-Ups'].loadMode, 'assisted');
  assert.equal(p['Chin-Ups'].band, 'M');
  assert.equal(p['Chin-Ups'].weight, null);
  assert.equal(p['Band Triceps Pushdown'].loadMode, 'banded');
  assert.equal(p['Band Triceps Pushdown'].band, 'M');
  assert.equal(p['Band Triceps Pushdown'].weight, 20, 'the band IS the load');

  // Legacy flags: keep the flag and let resolvedLoadMode infer the mode, rather
  // than stamping a weighted load the set never had.
  assert.equal(p.Dips.bw, true);
  assert.equal(p.Dips.weight, null);
  assert.equal(p.Dips.loadMode, undefined);
  assert.equal(p['Chest Dips'].band, 'M');
  assert.equal(p['Chest Dips'].weight, null);
  assert.equal(p['Chest Dips'].loadMode, undefined, 'assistance is inferred from the exercise');
  assert.equal(p['Band Leg Curl'].band, 'H');
  assert.equal(p['Band Leg Curl'].weight, 30);

  // The logger agrees: every one of these rows is about body mass or a band,
  // never a plain barbell load.
  const { sourceWeek } = routineSourceWeek(routine);
  for (const name of Object.keys(week.lifts.mon)) {
    const row = buildSetRow(sourceWeek.lifts.mon[name][0], 0, name, null, 'kg', name, 80);
    assert.doesNotMatch(row, /data-load-label="weighted"/, `${name} must not come back as weighted`);
  }
  const bodyweightRow = buildSetRow(sourceWeek.lifts.mon['Pull-Ups'][0], 0, 'Pull-Ups', null, 'kg', 'Pull-Ups', 80);
  assert.match(bodyweightRow, /data-load-label="bw"/);
  assert.match(bodyweightRow, /data-load-mode="bodyweight"/);
  assert.match(bodyweightRow, /class="input-weight-node"[^>]*value="80"/, 'the cockpit supplies today’s bodyweight');
  assert.match(buildSetRow(sourceWeek.lifts.mon['Chin-Ups'][0], 0, 'Chin-Ups', null, 'kg', 'Chin-Ups', 80), /data-load-label="M"/);
  assert.match(buildSetRow(sourceWeek.lifts.mon.Dips[0], 0, 'Dips', null, 'kg', 'Dips', 80), /data-load-label="bw"/);
});

test('a legacy dumbbell set keeps the pair meaning (Both), not Each', () => {
  const routine = buildRoutineFromSession(state(), loadWeek({
    'Incline DB Press': [{ w: '30', r: '10', c: true }],
  }), 'mon', { name: 'Dumbbells' });
  assert.equal(routine.prescriptions.mon['Incline DB Press'].basis, 'total');
  const { sourceWeek } = routineSourceWeek(routine);
  assert.equal(sourceWeek.lifts.mon['Incline DB Press'][0].basis, 'total');
  // A blank row would otherwise default to Each and halve the recorded volume.
  const row = buildSetRow(sourceWeek.lifts.mon['Incline DB Press'][0], 0, 'Incline DB Press', null, 'kg', 'Incline DB Press');
  assert.match(row, /data-load-basis="total"/);
  assert.match(row, /data-basis-label="Both"/);
});

test('routineSourceWeek refuses to overfill a copy from an absurd set count', () => {
  const routine = {
    days: { mon: { lifts: ['Bench Press', 'Squat'] } },
    prescriptions: {
      mon: {
        'Bench Press': { sets: 1e9, reps: 5 },
        Squat: { sets: '3', reps: 5 },
      },
    },
  };
  const { sourceWeek, sourceDay } = routineSourceWeek(routine);
  assert.equal(sourceDay, 'mon');
  assert.equal(sourceWeek.lifts.mon['Bench Press'].length, MAX_ROUTINE_SETS);
  assert.equal(sourceWeek.lifts.mon.Squat.length, 3);
  assert.equal(sourceWeek.lifts.mon['Bench Press'][0].r, '5');
  assert.equal(sourceWeek.lifts.mon.Squat[0].r, '5');
  // A malformed day list is ignored rather than iterated as a string.
  const noList = routineSourceWeek({ days: { mon: { lifts: 'Bench Press' } }, prescriptions: {} });
  assert.deepEqual(noList.sourceWeek.lifts.mon, {});
  // The builder applies the same bound, so the app cannot write a routine its
  // own import would refuse.
  const huge = prescriptionForSets(state(), 'Bench Press', Array.from(
    { length: MAX_ROUTINE_SETS + 10 }, () => ({ w: '100', r: '5', c: true }),
  ));
  assert.equal(huge.sets, MAX_ROUTINE_SETS);
});

test('routineSourceWeek drives a one-off copy session without touching the program', () => {
  const routine = build();
  const savedState = { weeks: {}, settings: {} };
  const { sourceWeek, sourceDay } = routineSourceWeek(routine);
  const created = createOneOffStrengthSession(savedState, {
    kind: 'copy',
    title: routine.name,
    sourceWeek,
    sourceDay,
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
  assert.equal(lifts['Bench Press'][0].r, '6');
  assert.equal(lifts['Bench Press'][0].tr, '6');
  assert.equal(lifts['Bench Press'][0].restSec, 180);
  assert.equal(lifts.Plank[0].mode, 'time');
  assert.equal(lifts.Plank[0].sec, 60);
});

test('routineSummary counts exercises and working sets, and estimates time only when honest', () => {
  assert.deepEqual(routineSummary(build()), { exercises: 6, workingSets: 8, minutes: null });

  const timed = routineSummary({
    days: { mon: { lifts: ['Bench Press', 'Curl'] } },
    prescriptions: {
      mon: {
        'Bench Press': { sets: 3, reps: 5, restSec: 120 },
        Curl: { sets: 3, reps: 10, restSec: 60 },
      },
    },
  });
  assert.deepEqual(timed, { exercises: 2, workingSets: 6, minutes: 15 });

  assert.deepEqual(routineSummary({ days: {}, prescriptions: {} }), { exercises: 0, workingSets: 0, minutes: null });
  const capped = routineSummary({
    days: { mon: { lifts: ['Bench Press'] } },
    prescriptions: { mon: { 'Bench Press': { sets: 1e9, restSec: 0 } } },
  });
  assert.equal(capped.workingSets, MAX_ROUTINE_SETS, 'the summary reads the same bound the copy path applies');
});

test('the builder caps lifts at the import bound, and the routine library caps records', () => {
  const lifts = {};
  for (let i = 0; i < MAX_ROUTINE_LIFTS + 1; i++) {
    lifts[`Exercise ${i + 1}`] = [{ w: '50', r: '10', c: true }];
  }
  const routine = buildRoutineFromSession(state(), loadWeek(lifts), 'mon', { name: 'Huge' });
  assert.equal(routine.days.mon.lifts.length, MAX_ROUTINE_LIFTS);
  assert.equal(Object.keys(routine.prescriptions.mon).length, MAX_ROUTINE_LIFTS);
  assert.equal(routine.days.mon.lifts.at(-1), `Exercise ${MAX_ROUTINE_LIFTS}`);

  // The app must not write a routine its own import would drop.
  const saved = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentWeek: '1',
    weeks: { '1': { lifts: {} } },
    routines: [routine],
    libraryFolders: [],
  };
  const parsed = parseImport(JSON.parse(JSON.stringify(wrapExport(saved))));
  const checked = validateImport(parsed.state, { currentSchemaVersion: CURRENT_SCHEMA_VERSION });
  assert.equal(checked.ok, true);
  assert.equal(checked.state.routines.length, 1, 'the capped routine survives its own import');

  assert.equal(hasRoutineCapacity({ routines: Array.from({ length: MAX_ROUTINES - 1 }) }), true);
  assert.equal(hasRoutineCapacity({ routines: Array.from({ length: MAX_ROUTINES }) }), false);
  assert.equal(hasRoutineCapacity({}), true);
});

test('folders group routines one-way; deleting a folder never deletes a routine', () => {
  const push = build();
  const pull = build({ name: 'Pull day' });
  const state = { routines: [push, pull], libraryFolders: [] };

  const travel = createFolder(state, 'Travel');
  const home = createFolder(state, 'Home');
  assert.match(travel.id, /^fld_/);
  assert.deepEqual(Object.keys(travel).sort(), ['createdAt', 'id', 'name', 'sortOrder']);
  assert.equal(travel.sortOrder, 0);
  assert.equal(home.sortOrder, 1);
  assert.equal(findFolder(state, travel.id), travel);
  assert.equal(createFolder(state, '   '), null, 'a blank folder name is refused');

  assert.equal(moveRoutineToFolder(state, push.id, travel.id), true);
  assert.equal(push.folderId, travel.id);
  assert.equal(moveRoutineToFolder(state, push.id, 'fld_missing'), false, 'a phantom folder is refused');
  assert.equal(push.folderId, travel.id);
  assert.equal(moveRoutineToFolder(state, pull.id, null), true);
  assert.equal(pull.folderId, null);

  assert.equal(renameFolder(state, travel.id, 'Trips'), true);
  assert.equal(travel.name, 'Trips');
  assert.equal(renameFolder(state, 'fld_missing', 'Nope'), false);

  assert.equal(moveFolder(state, home.id, -1), true);
  assert.equal(moveFolder(state, home.id, -1), false, 'the first folder cannot move up');
  assert.equal(moveFolder(state, home.id, 1), true);
  assert.equal(moveFolder(state, home.id, 2), false, 'only ±1 is a real direction');
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Trips', 'Home']);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.sortOrder), [0, 1]);

  const snapshot = deleteFolder(state, travel.id);
  assert.equal(snapshot.folder.id, travel.id);
  assert.deepEqual(snapshot.routineIds, [push.id]);
  assert.equal(state.routines.length, 2, 'deleting a folder never deletes its routines');
  assert.equal(push.folderId, null, 'members move to Unfiled');
  assert.equal(findFolder(state, travel.id), null);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Home']);

  assert.equal(restoreFolder(state, snapshot), true);
  assert.equal(findFolder(state, travel.id)?.name, 'Trips');
  assert.equal(push.folderId, travel.id, 'Undo restores membership too');
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Trips', 'Home']);
});

test('routine categories are optional, valid vocabulary, and clearable', () => {
  const routine = build({ name: 'Push day' });
  const state = { routines: [routine] };
  assert.equal(routine.category, undefined);
  assert.equal(routineCategoryLabel(routine.category), '');
  assert.equal(normalizeRoutineCategory('home'), 'home');
  assert.equal(normalizeRoutineCategory('not-a-category'), null);
  assert.deepEqual(ROUTINE_CATEGORIES.map((category) => category.id), [
    'home', 'travel', 'dumbbells', 'band', 'cardio', 'gym', 'bodyweight', 'suspension', 'other',
  ]);

  assert.equal(setRoutineCategory(state, routine.id, 'home'), true);
  assert.equal(routine.category, 'home');
  assert.equal(routineCategoryLabel(routine.category), 'At home');
  assert.equal(typeof routine.updatedAt, 'string');
  assert.equal(setRoutineCategory(state, routine.id, 'not-a-category'), true);
  assert.equal('category' in routine, false, 'an unknown category clears rather than stores junk');
  assert.equal(setRoutineCategory(state, routine.id, 'travel'), true);
  assert.equal(setRoutineCategory(state, routine.id, null), true);
  assert.equal('category' in routine, false);
  assert.equal(setRoutineCategory(state, 'rtn_missing', 'home'), false);
});

test('folder reorder, delete and Undo preserve the exact DISPLAY order', () => {
  const state = { routines: [], libraryFolders: [] };
  const alpha = createFolder(state, 'Alpha');
  createFolder(state, 'Beta');
  const gamma = createFolder(state, 'Gamma');
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Alpha', 'Beta', 'Gamma']);

  assert.equal(moveFolder(state, gamma.id, -1), true);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Alpha', 'Gamma', 'Beta']);
  assert.deepEqual(state.libraryFolders.map((folder) => folder.name), ['Alpha', 'Gamma', 'Beta'],
    'the stored array follows display order after a move');
  assert.deepEqual(state.libraryFolders.map((folder) => folder.sortOrder), [0, 1, 2]);

  // Delete the first folder; Undo must restore it at display index 0.
  const snapshot = deleteFolder(state, alpha.id);
  assert.equal(snapshot.index, 0);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Gamma', 'Beta']);
  assert.equal(restoreFolder(state, snapshot), true);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Alpha', 'Gamma', 'Beta']);
  assert.deepEqual(state.libraryFolders.map((folder) => folder.sortOrder), [0, 1, 2]);

  // A folder stored first but displayed last is deleted by DISPLAY index.
  state.libraryFolders = [
    { id: 'fld_z', name: 'Zulu', sortOrder: 20, createdAt: 'x' },
    { id: 'fld_a', name: 'Able', sortOrder: 10, createdAt: 'x' },
  ];
  const zulu = deleteFolder(state, 'fld_z');
  assert.equal(zulu.index, 1, 'the display index, not the array index');
  assert.equal(restoreFolder(state, zulu), true);
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Able', 'Zulu']);
  assert.deepEqual(state.libraryFolders.map((folder) => folder.name), ['Able', 'Zulu']);
});

test('a new folder appends after an imported library with offset sortOrder', () => {
  const state = {
    routines: [],
    libraryFolders: [
      { id: 'fld_a', name: 'Able', sortOrder: 10, createdAt: 'x' },
      { id: 'fld_b', name: 'Baker', sortOrder: 20, createdAt: 'x' },
    ],
  };
  const charlie = createFolder(state, 'Charlie');
  assert.equal(charlie.sortOrder, 2, 'the imported 10/20 list is normalised before appending');
  assert.deepEqual(orderedFolders(state).map((folder) => folder.name), ['Able', 'Baker', 'Charlie']);
  assert.deepEqual(state.libraryFolders.map((folder) => folder.sortOrder), [0, 1, 2]);
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
  routine.folderId = folder.id;
  routine.category = 'home';
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

test('an imported routine with an unknown category keeps the routine and drops the category', () => {
  const routine = build();
  routine.category = 'legacy-category';
  const parsed = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    currentWeek: '1',
    weeks: { '1': { lifts: {} } },
    routines: [routine],
    libraryFolders: [],
  };
  const checked = validateImport(parsed, { currentSchemaVersion: CURRENT_SCHEMA_VERSION });
  assert.equal(checked.ok, true);
  assert.equal(checked.state.routines.length, 1);
  assert.equal('category' in checked.state.routines[0], false);
  assert.equal(checked.state.routines[0].name, routine.name);
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
