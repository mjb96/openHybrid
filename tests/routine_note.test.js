// =============================================================================
// ROUTINE NOTE TESTS
// A routine note is preparation context: it lives on the routine, is read by
// reference when a session starts, and is never copied into logged history,
// recap, share cards or CSV. A finished/deleted routine must leave no banner.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_ROUTINE_NOTE, removeRoutine, updateRoutineNote,
} from '../js/routines/store.js';
import {
  createOneOffStrengthSession, routineNoteForSession,
} from '../js/workout/one-off-session.js';
import { markSessionInProgress, SESSION_STATUS } from '../js/workout/session-status.js';
import { buildRoutineFromSession } from '../js/routines/model.js';
import { buildSessionRecap, renderSessionRecapHTML } from '../js/session-recap.js';
import { buildWorkoutShareSummary, workoutShareCaption } from '../js/share/workout-share.js';
import { buildTrainingCsv } from '../js/portability/csv-export.js';

const NOTE = 'Pause every rep at the chest.';

function routine(overrides = {}) {
  return { id: 'rtn_note', name: 'Push day', note: NOTE, ...overrides };
}

function stateWith(routineObject = routine()) {
  return { routines: [routineObject], settings: {}, weeks: {} };
}

function startFromRoutine(state, sourceRoutineId = 'rtn_note') {
  return createOneOffStrengthSession(state, {
    kind: 'copy',
    title: 'Push day',
    sourceWeek: {
      lifts: { mon: { 'Bench Press': [{ w: '100', r: '5' }] } },
      liftOrder: { mon: ['Bench Press'] },
    },
    sourceDay: 'mon',
    sourceRoutineId,
    now: new Date('2026-11-19T09:00:00Z'),
  });
}

test('a routine note persists, trims, caps at 500 and is absent when cleared', () => {
  const s = stateWith(routine({ note: undefined }));
  assert.equal(updateRoutineNote(s, 'rtn_note', `  ${NOTE}  `), true);
  assert.equal(s.routines[0].note, NOTE);
  assert.equal(typeof s.routines[0].updatedAt, 'string');

  updateRoutineNote(s, 'rtn_note', 'x'.repeat(MAX_ROUTINE_NOTE + 40));
  assert.equal(s.routines[0].note.length, MAX_ROUTINE_NOTE, 'the cap matches what import accepts');

  updateRoutineNote(s, 'rtn_note', '   ');
  assert.equal('note' in s.routines[0], false, 'a blank note is removed, not stored as empty text');
  assert.equal(updateRoutineNote(s, 'rtn_missing', 'x'), false);
});

test('the cockpit note reads the CURRENT routine by reference', () => {
  const s = stateWith();
  const session = startFromRoutine(s);
  const week = session.week;
  assert.equal(week.sourceRoutineId, 'rtn_note');
  assert.equal(week.notes[session.day], '', 'the note is never copied into the workout note');
  assert.equal(routineNoteForSession(s, week, session.day).note, NOTE);

  updateRoutineNote(s, 'rtn_note', 'Updated cue for the next set.');
  assert.equal(routineNoteForSession(s, week, session.day).note, 'Updated cue for the next set.',
    'editing the routine changes the live banner');

  markSessionInProgress(week, session.day);
  assert.equal(routineNoteForSession(s, week, session.day).note, 'Updated cue for the next set.');

  week.sessionStatus[session.day] = SESSION_STATUS.FINISHED;
  assert.equal(routineNoteForSession(s, week, session.day), null, 'a finished session hides the banner');
  week.sessionStatus[session.day] = SESSION_STATUS.IN_PROGRESS;

  removeRoutine(s, 'rtn_note');
  assert.equal(routineNoteForSession(s, week, session.day), null, 'deleting the routine removes the banner');
});

test('a one-off not started from a routine has no routine note', () => {
  const s = stateWith();
  const session = startFromRoutine(s, null);
  assert.equal(session.week.sourceRoutineId, null);
  assert.equal(routineNoteForSession(s, session.week, session.day), null);
});

test('the routine note never reaches History, recap, share or CSV', () => {
  const s = stateWith();
  s.settings.exercisePrefs = {
    'id:barbell_bench_press': {
      note: 'Pinned exercise cue',
      link: 'https://private.example.com/form',
    },
  };
  const session = startFromRoutine(s);
  const day = session.day;
  session.week.dates[day] = '2026-11-19';
  session.week.lifts[day] = { 'Bench Press': [{ w: '100', r: '5', c: true }] };
  session.week.gymStats[day] = { time: '20:00' };
  session.week.notes[day] = 'Workout note is part of the session record';

  const recap = buildSessionRecap(s, session.key, day);
  assert.ok(!JSON.stringify(recap).includes(NOTE), 'the recap model carries no routine note');
  assert.ok(!JSON.stringify(recap).includes('https://private.example.com/form'));
  const html = renderSessionRecapHTML(recap);
  assert.ok(!html.includes(NOTE));
  assert.ok(!/Routine note/i.test(html), 'History has no routine-note label');
  assert.ok(html.includes('Workout note is part of the session record'));

  const summary = buildWorkoutShareSummary(recap, { title: 'Push day' });
  assert.ok(!JSON.stringify(summary).includes(NOTE));
  assert.ok(!workoutShareCaption(summary).includes(NOTE));
  assert.ok(!JSON.stringify(summary).includes('https://private.example.com/form'));

  const csv = buildTrainingCsv(s, [day]);
  // The workout note IS the session record and is deliberately exported; the
  // routine note and every exercise-pinned scope are not.
  assert.ok(csv.includes('Workout note is part of the session record'));
  assert.ok(!csv.includes(NOTE));
  assert.ok(!csv.includes('Pinned exercise cue'));
  assert.ok(!csv.includes('https://private.example.com/form'));
  assert.ok(!csv.includes('sourceRoutineId'));
  assert.equal(session.week.notes[day], 'Workout note is part of the session record',
    'the routine note never enters week.notes');
});

test('saving a routine never copies the session note, and a repeat starts blank', () => {
  const s = { settings: { restOverrides: {} }, routines: [], weeks: {} };
  const week = {
    dates: { mon: '2026-11-16' },
    lifts: { mon: { 'Bench Press': [{ w: '100', r: '8', c: true }] } },
    liftOrder: { mon: ['Bench Press'] },
    notes: { mon: 'Session note stays with the session' },
  };
  const saved = buildRoutineFromSession(s, week, 'mon', { name: 'Push' });
  assert.ok(saved);
  assert.equal('note' in saved, false, 'the builder does not invent a routine note');
  assert.equal(week.notes.mon, 'Session note stays with the session');

  const repeat = createOneOffStrengthSession(s, {
    kind: 'copy', title: 'Repeat', sourceWeek: week, sourceDay: 'mon',
    now: new Date('2026-11-19T09:00:00Z'),
  });
  assert.equal(repeat.week.notes[repeat.day], '', 'a repeat starts with a blank workout note');
  assert.equal(repeat.week.sourceRoutineId, null, 'a plain repeat is not tied to a routine');
});
