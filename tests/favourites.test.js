// =============================================================================
// G7 — one favourite-exercise preference, aliases included
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_FAVOURITES,
  favouriteIds,
  favouriteKey,
  favouriteStarHTML,
  isFavourite,
  setFavourite,
  sortFavouritesFirst,
} from '../js/exercises/favourites.js';
import { sanitizeImportedState } from '../js/state/import-validate.js';

const state = () => ({ settings: {} });

test('a catalogue alias resolves to the same favourite key', () => {
  const app = state();
  setFavourite(app, 'Barbell Bench Press', true);
  // Catalogue aliases share one canonical id, so starring either name is one
  // preference, not two.
  assert.equal(favouriteKey('Barbell Bench Press'), favouriteKey('Bench Press'));
  assert.equal(isFavourite(app, 'Bench Press'), true);
  assert.deepEqual(favouriteIds(app), [favouriteKey('Bench Press')]);
});

test('a custom exercise keeps its trimmed name as the key', () => {
  const app = state();
  setFavourite(app, '  My Zercher Thing  ', true);
  assert.equal(favouriteKey('My Zercher Thing'), 'My Zercher Thing');
  assert.equal(isFavourite(app, 'My Zercher Thing'), true);
  setFavourite(app, 'My Zercher Thing', false);
  assert.equal(isFavourite(app, 'My Zercher Thing'), false);
  assert.deepEqual(favouriteIds(app), []);
});

test('toggling is idempotent and bounded', () => {
  const app = state();
  assert.equal(setFavourite(app, 'Back Squat'), true);
  assert.equal(setFavourite(app, 'Back Squat', true), true);
  assert.equal(setFavourite(app, 'Back Squat', false), false);
  assert.equal(setFavourite(app, 'Back Squat'), true);
  for (let i = 0; i < MAX_FAVOURITES + 5; i += 1) setFavourite(app, `Custom ${i}`, true);
  assert.ok(favouriteIds(app).length <= MAX_FAVOURITES, 'the map is bounded');
});

test('favourites sort first and everything else keeps its order', () => {
  const app = state();
  setFavourite(app, 'Bench Press', true);
  setFavourite(app, 'Barbell Row', true);
  const items = [{ name: 'Back Squat' }, { name: 'Bench Press' }, { name: 'Deadlift' }, { name: 'Barbell Row' }];
  assert.deepEqual(sortFavouritesFirst(items, app).map((item) => item.name), ['Bench Press', 'Barbell Row', 'Back Squat', 'Deadlift']);
});

test('the star is a named, state-bearing control', () => {
  const app = state();
  const off = favouriteStarHTML(app, 'Back Squat');
  assert.match(off, /aria-pressed="false"/);
  assert.match(off, /Add Back Squat to favourites/);
  assert.match(off, /data-action="el-favourite"/);
  setFavourite(app, 'Back Squat', true);
  const on = favouriteStarHTML(app, 'Back Squat');
  assert.match(on, /aria-pressed="true"/);
  assert.match(on, /Remove Back Squat from favourites/);
  assert.match(on, /is-favourite/);
});

test('an imported favourites map is bounded and prototype-safe', () => {
  const hostile = { settings: { favouriteExercises: JSON.parse('{"good":true,"bad":"yes","__proto__":true}') } };
  const clean = sanitizeImportedState(hostile);
  assert.equal(clean.settings.favouriteExercises.good, true);
  assert.equal(clean.settings.favouriteExercises.bad, undefined);
  assert.equal(Object.getPrototypeOf(clean.settings.favouriteExercises), null);
  // A prototype key is stored as DATA on the null-prototype copy, never applied.
  assert.equal({}.polluted, undefined);
});
