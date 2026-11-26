// =============================================================================
// PROGRAM-BUILDER EXERCISE ROW TESTS
// The builder is the only surface outside the cockpit that can open the
// exercise settings sheet, so its row must show the pinned note / reference link
// the athlete set there and offer that entry point. No note/link means no extra
// row. Everything is escaped text, never injected markup.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExerciseRowHTML, exerciseReference, exerciseRowMenuItems } from '../js/programs/exercise-row.js';
import { setExercisePref } from '../js/workout/exercise-config.js';

function state() {
  return { settings: { exercisePrefs: {} }, routines: [], weeks: {} };
}

test('the builder row shows the pinned note and one actions menu', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: 'Pause at the chest.' });
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 2, s);
  assert.match(html, /program-editor__exercise-note/);
  assert.match(html, /Pause at the chest\./);
  // PL5: the row is name · target · menu; settings lives in the menu.
  assert.match(html, /data-action="b-row-menu"/);
  assert.match(html, /data-action="b-lift-target"/);
  assert.doesNotMatch(html, /data-action="b-exercise-settings"/);
  assert.match(html, /aria-label="Actions for Bench Press"/);
});

test('the row menu carries the row it acts on, including settings and remove', () => {
  const items = exerciseRowMenuItems({ day: 'mon', index: 0, count: 2 });
  const actions = items.map((item) => item.action);
  assert.deepEqual(actions, ['Move down', 'Swap exercise', 'Exercise settings', 'Remove'].map((label, i) => actions[i]));
  assert.equal(items.some((item) => item.action === 'b-exercise-settings'), true);
  assert.equal(items.some((item) => item.action === 'b-remove-lift'), true);
  assert.equal(items.some((item) => item.action === 'b-move-up'), false, 'the first row cannot move up');
  for (const item of items) {
    assert.deepEqual(item.dataset, { day: 'mon', i: 0 });
  }
  const last = exerciseRowMenuItems({ day: 'mon', index: 1, count: 2 });
  assert.equal(last.some((item) => item.action === 'b-move-down'), false, 'the last row cannot move down');
});

test('the row shows its own target when one is set', () => {
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 1, state(), {
    target: { sets: 4, reps: '6-8', own: true },
  });
  assert.match(html, /4 × 6-8/);
  assert.match(html, /is-own/);
  assert.match(html, /This plan/);
});

test('the row says when the target is the week default', () => {
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 1, state(), {
    target: { sets: 3, reps: '10', own: false },
  });
  assert.match(html, /3 × 10/);
  assert.match(html, /Week default/);
});

test('the builder row shows a valid reference link as a real anchor', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { link: 'https://www.youtube.com/watch?v=abc123' });
  const html = buildExerciseRowHTML('mon', 'Bench Press', 1, 2, s);
  assert.match(html, /program-editor__exercise-link/);
  assert.match(html, /href="https:\/\/www\.youtube\.com\/watch\?v=abc123"/);
  assert.match(html, />Watch on YouTube</);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test('no note or link means no extra row', () => {
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 1, state());
  assert.doesNotMatch(html, /program-editor__exercise-note/);
  assert.doesNotMatch(html, /program-editor__exercise-link/);
  assert.match(html, /data-action="b-lift-target"/, 'the target entry point is always present');
});

test('the pinned note is escaped in the builder row', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: '<img src=x onerror=alert(1)>' });
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 1, s);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<img src=x onerror/);
});

test('exerciseReference reads the same alias-aware preferences as the cockpit', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: 'Cue', link: 'https://example.com/form' });
  assert.deepEqual(exerciseReference(s, 'Barbell Bench Press'), {
    note: 'Cue',
    link: 'https://example.com/form',
  });
});
