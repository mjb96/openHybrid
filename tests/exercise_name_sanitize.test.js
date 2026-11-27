// =============================================================================
// CUSTOM EXERCISE NAME SANITISER
//
// A custom exercise name is typed into an input, stored in `state` and then
// re-rendered on many surfaces. CodeQL traced it into twelve `innerHTML`
// builds; the durable fix is to guarantee the stored value cannot be markup,
// rather than trusting every present and future renderer to escape.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_EXERCISE_NAME_MAX, sanitizeExerciseName } from '../js/exercises/catalog.js';

test('HTML metacharacters cannot survive into state', () => {
  for (const hostile of [
    '<img src=x onerror=alert(1)>',
    '"><script>alert(1)</script>',
    "'; fetch('//evil'); //",
    '<svg/onload=alert(1)>',
    '<iframe src="javascript:alert(1)">',
  ]) {
    const safe = sanitizeExerciseName(hostile);
    assert.doesNotMatch(safe, /[<>&"']/, `"${hostile}" kept an HTML metacharacter: "${safe}"`);
  }
});

test('a normal name is unchanged apart from whitespace', () => {
  assert.equal(sanitizeExerciseName('  Landmine   Press '), 'Landmine Press');
  assert.equal(sanitizeExerciseName('Bulgarian Split Squat'), 'Bulgarian Split Squat');
  assert.equal(sanitizeExerciseName('Cable Fly (High-to-Low)'), 'Cable Fly (High-to-Low)');
});

test('an ampersand reads as a word, not an entity', () => {
  assert.equal(sanitizeExerciseName('Rope & Sled'), 'Rope and Sled');
  assert.equal(sanitizeExerciseName('R&B Carry'), 'R and B Carry');
});

test('apostrophes keep their look in the typographic form', () => {
  assert.equal(sanitizeExerciseName("Farmer's Walk"), 'Farmer’s Walk');
  assert.equal(sanitizeExerciseName('Landmine "Twist"'), 'Landmine ”Twist”');
});

test('control characters and runs of whitespace collapse', () => {
  assert.equal(sanitizeExerciseName('Sled\u0000Drag\u001fPush'), 'Sled Drag Push');
  assert.equal(sanitizeExerciseName('A\t\tB\n\nC'), 'A B C');
});

test('the name is bounded, and a non-string is handled', () => {
  const long = sanitizeExerciseName('x'.repeat(400));
  assert.equal(long.length, CUSTOM_EXERCISE_NAME_MAX);
  assert.equal(sanitizeExerciseName(null), '');
  assert.equal(sanitizeExerciseName(undefined), '');
  assert.equal(sanitizeExerciseName('   '), '');
});

test('tag text that remains is inert, not markup', () => {
  // Dropping the brackets leaves the tag's TEXT, which renders as text. The
  // contract is "cannot be markup", not "looks pretty".
  const safe = sanitizeExerciseName('<b>Row</b>');
  assert.equal(safe, 'bRow/b');
  assert.doesNotMatch(safe, /[<>]/);
});
