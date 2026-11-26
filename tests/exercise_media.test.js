// =============================================================================
// Exercise demonstration stills (10-lift prototype)
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { CORE_EXERCISES } from '../js/exercises/catalog.js';
import { EXERCISE_MEDIA, exerciseMediaHTML, mediaForExercise } from '../js/exercises/media.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ids = new Set(CORE_EXERCISES.map((exercise) => exercise.id));

test('the stills cover most reviewed core lifts and only real ids', () => {
  const count = Object.keys(EXERCISE_MEDIA).length;
  assert.ok(count >= 140, `expected the full rollout, got ${count}`);
  for (const id of Object.keys(EXERCISE_MEDIA)) {
    assert.ok(ids.has(id), `${id} is not a core exercise`);
  }
});

test('every frame exists, is local and stays inside the size budget', () => {
  let total = 0;
  for (const [id, media] of Object.entries(EXERCISE_MEDIA)) {
    assert.equal(media.frames.length, 2, `${id} needs two frames`);
    assert.match(media.source, /^free-exercise-db\//);
    for (const frame of media.frames) {
      assert.doesNotMatch(frame, /^https?:/i, `${id} must not hotlink`);
      const file = path.join(ROOT, frame.replace(/^\.\//, ''));
      assert.ok(existsSync(file), `${frame} is missing`);
      const size = statSync(file).size;
      assert.ok(size > 1000 && size < 60_000, `${frame} is ${size} bytes`);
      total += size;
    }
  }
  assert.ok(total < 5_000_000, `media total is ${total} bytes`);
});

test('aliases resolve to the same media; unknown lifts have none', () => {
  assert.ok(mediaForExercise('Bench Press'));
  assert.equal(mediaForExercise('Bench Press'), mediaForExercise('Barbell Bench Press'));
  assert.equal(mediaForExercise('Not An Exercise'), null);
});

test('the block is two local images with a fixed ratio and a source caption', () => {
  const html = exerciseMediaHTML('Back Squat');
  assert.match(html, /class="exercise-media"/);
  assert.match(html, /role="img"/);
  assert.match(html, /Back Squat demonstration/);
  assert.equal((html.match(/<img /g) || []).length, 2);
  assert.match(html, /is-active/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, /width="480"/);
  // The source demo is a Barbell Squat, so the block says so.
  assert.match(html, /Demo: Barbell Squat/);
  assert.doesNotMatch(html, /https?:/);
  // An exact-name demo needs no caption.
  assert.doesNotMatch(exerciseMediaHTML('Plank'), /exercise-media__caption/);
  assert.equal(exerciseMediaHTML('Nordic Curl'), '', 'unmapped lifts have no demo');
});
