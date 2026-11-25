// ==========================================
// SAFE IMPORT CONTRACT TESTS (tests/import_validate.test.js)
// R17: a malformed / oversized / future-schema / hostile import is refused in
// memory and NEVER replaces live state; a hostile avatar is stripped; imported
// text is not interpreted as markup; and success counts are accurate.
// Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateImport,
  isSafeImageDataUrl,
  isValidRoutine,
  sanitizeImportedState,
  importCounts,
  importPreviewMessage,
  importReasonMessage,
} from '../js/state/import-validate.js';
import { MAX_ROUTINE_NOTE } from '../js/routines/store.js';

const okState = () => ({
  currentWeek: '1',
  weeks: {
    '1': { lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } }, runSessions: { tue: [{ dist: '5' }] } },
    '2': { lifts: { wed: {} }, notes: { wed: 'Mobility work' } },
  },
  customPrograms: [
    { id: 'p1', name: 'First', totalWeeks: 4, days: {} },
    { id: 'p2', name: 'Second', totalWeeks: 8, days: {} },
  ],
  bodyWeightLog: [{ weight: 80 }],
});

// ── deep validation: invalid inputs are refused, never accepted ─────────────

test('rejects non-object / array / primitive', () => {
  assert.equal(validateImport(null).ok, false);
  assert.equal(validateImport([]).ok, false);
  assert.equal(validateImport('nope').ok, false);
  assert.equal(validateImport(42).ok, false);
});

test('rejects a shaped-but-malformed file (bad weeks / missing currentWeek)', () => {
  assert.equal(validateImport({ weeks: { '1': {} } }).reason, 'no-current-week');
  assert.equal(validateImport({ currentWeek: '1' }).reason, 'no-weeks');
  assert.equal(validateImport({ currentWeek: '1', weeks: {} }).reason, 'empty-weeks');
  assert.equal(validateImport({ currentWeek: '1', weeks: { '1': 'garbage' } }).reason, 'bad-week');
  assert.equal(validateImport({ currentWeek: '1', weeks: { '1': [] } }).reason, 'bad-week');
});

test('rejects wrong-typed top-level collections', () => {
  assert.equal(validateImport({ ...okState(), customPrograms: 'x' }).reason, 'bad-programs');
  assert.equal(validateImport({ ...okState(), bodyWeightLog: {} }).reason, 'bad-bodyweight');
  assert.equal(validateImport({ ...okState(), settings: [] }).reason, 'bad-settings');
});

test('rejects malformed nested weeks and custom programs', () => {
  assert.equal(validateImport({ ...okState(), weeks: { '1': { lifts: { mon: [] } } } }).reason, 'bad-week');
  assert.equal(validateImport({ ...okState(), weeks: { '1': { runSessions: { mon: [{}] } } } }).ok, true);
  assert.equal(validateImport({ ...okState(), customPrograms: [{ id: 'broken', name: 'No days' }] }).reason, 'bad-program');
  assert.equal(validateImport({ ...okState(), customPrograms: [{ id: 'broken', name: 'Bad lifts', days: { mon: { lifts: [3] } } }] }).reason, 'bad-program');
});

test('rejects a future schema version', () => {
  const r = validateImport({ ...okState(), schemaVersion: 99 }, { currentSchemaVersion: 5 });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'future-schema');
});

test('rejects an oversized payload', () => {
  const r = validateImport(okState(), { rawText: 'x'.repeat(26 * 1024 * 1024) });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'too-large');
});

test('accepts a well-formed snapshot and reports accurate counts', () => {
  const r = validateImport(okState(), { currentSchemaVersion: 5 });
  assert.equal(r.ok, true);
  assert.deepEqual(r.counts, { weeks: 2, programs: 2, routines: 0, folders: 0, bodyWeights: 1, runs: 1, loggedDays: 3 });
});

test('import counts ignore empty seeded days and include legacy runs without double-counting projections', () => {
  assert.deepEqual(importCounts({
    weeks: {
      '1': {
        lifts: { mon: { Squat: [{ w: '', r: '', c: false }] }, tue: {} },
        runs: { wed: { dist: '5', time: '25:00' } },
        runSessions: { wed: [{ sessionId: 'run_1', dist: '5', time: '25:00' }] },
      },
    },
  }), { weeks: 1, programs: 0, routines: 0, folders: 0, bodyWeights: 0, runs: 1, loggedDays: 1 });
});

// ── routine validation: a malformed routine is repaired, a valid one survives ─

function validRoutine(id = 'rtn_valid') {
  return {
    kind: 'routine',
    id,
    name: 'Push day',
    folderId: null,
    sortOrder: 0,
    createdAt: '2026-11-16T10:00:00.000Z',
    updatedAt: '2026-11-16T10:00:00.000Z',
    source: { activityId: 'strength:str_1', programId: 'hybrid_engine', day: 'mon', date: '2026-11-16' },
    days: { mon: { title: 'Push day', badge: 'Routine', color: 'var(--accent-blue)', desc: '', runs: 'Rest', lifts: ['Bench Press'] } },
    prescriptions: { mon: { 'Bench Press': { sets: 3, reps: 8, weight: 100, restSec: 180 } } },
    totalWeeks: 1,
    weeklyVolModifiers: { 1: { sets: 3, reps: 10, intensityLabel: '' } },
  };
}

test('rejects a non-array routine collection', () => {
  assert.equal(validateImport({ ...okState(), routines: 'x' }).reason, 'bad-routines');
  assert.equal(validateImport({ ...okState(), libraryFolders: {} }).reason, 'bad-routine-folders');
});

test('malformed routines and folders are dropped; valid ones survive', () => {
  const valid = validRoutine();
  const malformed = [
    { ...validRoutine('rtn_huge'), prescriptions: { mon: { 'Bench Press': { sets: 1e9 } } } },
    { ...validRoutine('rtn_lifts'), days: { mon: { lifts: 'Bench Press' } } },
    { ...validRoutine('rtn_name'), name: 42 },
    { ...validRoutine('rtn_band'), prescriptions: { mon: { 'Bench Press': { sets: 3, band: 'XXL' } } } },
    // A routine must be startable: every listed lift needs a real prescription.
    { ...validRoutine('rtn_no_rx'), prescriptions: {} },
    { ...validRoutine('rtn_no_lifts'), days: { mon: { lifts: [] } }, prescriptions: {} },
    {
      ...validRoutine('rtn_missing_rx'),
      days: { mon: { lifts: ['Bench Press', 'Back Squat'] } },
      prescriptions: { mon: { 'Bench Press': { sets: 3, reps: 8 } } },
    },
  ];
  const folder = { id: 'fld_travel', name: 'Travel', sortOrder: 0, createdAt: '2026-11-16T10:00:00.000Z', updatedAt: '2026-11-16T10:00:00.000Z' };
  const r = validateImport({
    ...okState(),
    routines: [...malformed, valid],
    libraryFolders: [folder, { id: 'fld_bad', name: 2 }],
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.state.routines, [valid]);
  assert.deepEqual(r.state.libraryFolders, [folder]);
  assert.equal(r.counts.routines, 1);
  assert.equal(r.counts.folders, 1);

  const message = importPreviewMessage(r.counts);
  assert.match(message, /1 routine · 1 routine folder/);
});

test('a routine note is optional text; an overlong or non-string note is repaired without dropping the routine', () => {
  // isValidRoutine accepts absent/string (and must not decide the note's fate:
  // sanitizeImportedState repairs it afterward).
  assert.equal(isValidRoutine(validRoutine()), true);
  assert.equal(isValidRoutine({ ...validRoutine(), note: 'Cue' }), true);
  assert.equal(isValidRoutine({ ...validRoutine(), note: 42 }), true);

  const withNote = { ...validRoutine('rtn_note'), note: '  Cue  ' };
  const overlong = { ...validRoutine('rtn_long'), note: 'a'.repeat(MAX_ROUTINE_NOTE + 150) };
  const nonString = { ...validRoutine('rtn_bad'), note: 42 };
  const blank = { ...validRoutine('rtn_blank'), note: '   ' };
  const r = validateImport({ ...okState(), routines: [withNote, overlong, nonString, blank] });
  assert.equal(r.ok, true);
  assert.equal(r.state.routines.length, 4, 'a malformed note must never drop the routine');
  const byId = Object.fromEntries(r.state.routines.map((routine) => [routine.id, routine]));
  assert.equal(byId.rtn_note.note, 'Cue');
  assert.equal(byId.rtn_long.note.length, MAX_ROUTINE_NOTE);
  assert.equal('note' in byId.rtn_bad, false, 'a non-string note is removed');
  assert.equal('note' in byId.rtn_blank, false, 'a blank note is removed');
  assert.equal(overlong.note.length, MAX_ROUTINE_NOTE + 150, 'the imported object is not mutated');
});

// ── avatar sanitization: hostile markup never survives an import ─────────────

test('isSafeImageDataUrl allows only base64 image data URLs', () => {
  assert.equal(isSafeImageDataUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isSafeImageDataUrl('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), true);
  assert.equal(isSafeImageDataUrl('x" onerror="alert(1)'), false);              // attribute breakout
  assert.equal(isSafeImageDataUrl('data:text/html;base64,PHNjcmlwdD4='), false); // not an image
  assert.equal(isSafeImageDataUrl('javascript:alert(1)'), false);
  assert.equal(isSafeImageDataUrl('https://evil.example/x.png'), false);         // remote
  assert.equal(isSafeImageDataUrl('data:image/png;base64,<img src=x onerror=1>'), false);
});

test('sanitizeImportedState strips a hostile avatar but keeps the rest', () => {
  const dirty = { ...okState(), settings: { name: 'Alex', avatarDataUrl: '"><img src=x onerror=alert(1)>' } };
  const clean = sanitizeImportedState(dirty);
  assert.equal('avatarDataUrl' in clean.settings, false);   // dropped
  assert.equal(clean.settings.name, 'Alex');                // preserved
  assert.deepEqual(dirty.settings.avatarDataUrl, '"><img src=x onerror=alert(1)>'); // input not mutated
});

test('validateImport returns state with the hostile avatar already removed', () => {
  const r = validateImport({ ...okState(), settings: { name: 'A', avatarDataUrl: 'x" onerror="x' } }, { currentSchemaVersion: 5 });
  assert.equal(r.ok, true);
  assert.equal('avatarDataUrl' in r.state.settings, false);
});

test('a legitimate base64 avatar survives import', () => {
  const url = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=';
  const r = validateImport({ ...okState(), settings: { avatarDataUrl: url } }, { currentSchemaVersion: 5 });
  assert.equal(r.state.settings.avatarDataUrl, url);
});

test('importReasonMessage never blames the user data', () => {
  assert.match(importReasonMessage('future-schema'), /newer app version/);
  assert.match(importReasonMessage('too-large'), /too large/);
  assert.match(importReasonMessage('bad-week'), /not replaced/);
});

test('import preview reports replacement counts and backup warning honestly', () => {
  const message = importPreviewMessage(importCounts(okState()), 3);
  assert.match(message, /3 logged days · 1 run/);
  assert.match(message, /2 custom programs · 1 body-weight entry/);
  assert.match(message, /0 routines · 0 routine folders/);
  assert.match(message, /3 GPS routes/);
  assert.match(message, /replaces the data currently on this device/);
  assert.match(message, /local backup is created first/);
});

test('a week schedule is reduced to known days and ISO dates', () => {
  const clean = sanitizeImportedState({
    ...okState(),
    weekSchedule: {
      '2026-11-23': { thu: '2026-11-29', x: '2026-11-29', fri: 'tomorrow' },
      'not-a-week': { thu: '2026-11-29' },
      bad: 42,
    },
  });
  assert.deepEqual(clean.weekSchedule, { '2026-11-23': { thu: '2026-11-29' } });
});
