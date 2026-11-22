// =============================================================================
// PROGRAM-BUILDER EXERCISE ROW TESTS
// The builder is the only surface outside the cockpit that can open the
// exercise settings sheet, so its row must show the pinned note / reference link
// the athlete set there and offer that entry point. No note/link means no extra
// row. Everything is escaped text, never injected markup.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExerciseRowHTML, exerciseReference } from '../js/programs/exercise-row.js';
import { setExercisePref } from '../js/workout/exercise-config.js';

function state() {
  return { settings: { exercisePrefs: {} }, routines: [], weeks: {} };
}

test('the builder row shows the pinned note and an Exercise settings action', () => {
  const s = state();
  setExercisePref(s, 'Bench Press', { note: 'Pause at the chest.' });
  const html = buildExerciseRowHTML('mon', 'Bench Press', 0, 2, s);
  assert.match(html, /program-editor__exercise-note/);
  assert.match(html, /Pause at the chest\./);
  assert.match(html, /data-action="b-exercise-settings"/);
  assert.match(html, /data-day="mon" data-i="0"/);
  assert.match(html, /aria-label="Exercise settings for Bench Press"/);
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
  assert.match(html, /data-action="b-exercise-settings"/, 'the settings entry point is always present');
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
