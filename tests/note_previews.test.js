// =============================================================================
// NOTE PREVIEW TESTS
// The pinned exercise note reaches the surfaces the athlete reads BEFORE
// starting: the Train session preview and the plan's sample-workout preview.
// Both are read-only; neither gains a control. No note means no extra row.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionExercisePreview } from '../js/train/train-landing.js';
import { renderSampleWorkout } from '../js/programs/detail.js';
import { setExercisePref } from '../js/workout/exercise-config.js';

function state() {
  return { currentWeek: '1', settings: { exercisePrefs: {} } };
}

function program() {
  return {
    id: 'test_program',
    name: 'Test program',
    totalWeeks: 1,
    days: {
      mon: {
        title: 'Push',
        desc: '',
        runs: 'Rest',
        lifts: ['Bench Press'],
        workoutPreview: { type: 'STRENGTH', exercises: [{ exercise: 'Bench Press' }] },
      },
    },
    weeklyVolModifiers: { 1: { sets: 3, reps: 8 } },
  };
}

test('Train preview carries the pinned exercise note', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: 'Pause at the chest.' });
  const items = sessionExercisePreview(s, program(), 'mon');
  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'Bench Press');
  assert.equal(items[0].note, 'Pause at the chest.');

  const noNote = sessionExercisePreview(state(), program(), 'mon');
  assert.equal(noNote[0].note, '');
});

test('the plan sample-workout preview shows the pinned note, read-only', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: 'Pause at the chest.' });
  const html = renderSampleWorkout(program(), null, false, s);
  assert.match(html, /sample-ex-note/);
  assert.match(html, /Pause at the chest\./);
  assert.doesNotMatch(html, /<button/, 'the preview must stay read-only');

  const noNote = renderSampleWorkout(program(), null, false, state());
  assert.doesNotMatch(noNote, /sample-ex-note/);
});

test('the previews escape the pinned note', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: '<img src=x onerror=alert(1)>' });
  const html = renderSampleWorkout(program(), null, false, s);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x onerror/);
});
