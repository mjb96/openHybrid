// =============================================================================
// PROGRESS CATALOGUE — renaming eight cards without resetting anyone's choices.
//
// The failure this file exists to prevent: `normalizeUi` drops ids it does not
// recognise, so shipping new ids without an alias map would silently un-hide
// every card an existing user had hidden. That is data loss from the user's
// point of view even though no record was deleted.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_VISIBLE_PROGRESS_CARDS,
  PROGRESS_CARDS,
  canHideCard,
  isCardVisible,
  moveCard,
  normalizeUi,
  orderedCards,
  resetSurface,
  setCardVisible,
} from '../js/ui/customize.js';

const IDS = PROGRESS_CARDS.map((card) => card.id);

test('the catalogue is the eight bands, in default order, with no duplicates', () => {
  assert.deepEqual(IDS, ['pulse', 'exercises', 'muscles', 'body', 'reviews', 'balance', 'endurance', 'fasting']);
  assert.equal(new Set(IDS).size, IDS.length);
  for (const card of PROGRESS_CARDS) {
    assert.ok(card.label, `${card.id} has a label`);
    assert.ok(card.note, `${card.id} has a note`);
  }
});

test('legacy ids map onto the bands that inherited their content', () => {
  const ui = normalizeUi({ progress: { hidden: ['strength', 'running', 'bodyweight', 'muscleLoad'] } });
  // strength → muscles + exercises; muscleLoad also → muscles (no duplicate).
  assert.deepEqual([...ui.progress.hidden].sort(), ['body', 'endurance', 'exercises', 'muscles']);
  assert.equal(isCardVisible({ ui }, 'progress', 'pulse'), true, 'untouched cards stay visible');
});

test('the old Reports band is Reviews, in both hidden and order preferences', () => {
  const hidden = normalizeUi({ progress: { hidden: ['reports'] } });
  assert.deepEqual(hidden.progress.hidden, ['reviews']);

  // An existing order keeps the athlete's exact position for the renamed band.
  const order = normalizeUi({ progress: { order: ['pulse', 'reports', 'exercises'] } });
  assert.deepEqual(order.progress.order.slice(0, 3), ['pulse', 'reviews', 'exercises']);
});

test('a footer-leaf card consumes its preference rather than hiding something else', () => {
  const ui = normalizeUi({ progress: { hidden: ['recovery', 'projections'] } });
  assert.deepEqual(ui.progress.hidden, [], 'nothing left to hide, and no error');
});

test('an unknown id is still dropped, so a stale name cannot hide a future card', () => {
  const ui = normalizeUi({ progress: { hidden: ['hybrid-score', 'nope'] } });
  assert.deepEqual(ui.progress.hidden, []);
});

test('order keeps the athlete sequence, drops junk, and appends new bands', () => {
  const ui = normalizeUi({ progress: { order: ['reports', 'pulse', 'nope'] } });
  // The old `reports` id is a renamed band, so its saved POSITION survives.
  assert.deepEqual(ui.progress.order.slice(0, 2), ['reviews', 'pulse']);
  assert.equal(ui.progress.order.length, IDS.length, 'every band appears exactly once');
  assert.deepEqual([...ui.progress.order].sort(), [...IDS].sort());
});

test('orderedCards follows the saved order and survives a shorter array', () => {
  const settings = { ui: { progress: { order: ['body', 'pulse'] } } };
  const cards = orderedCards('progress', settings).map((card) => card.id);
  assert.deepEqual(cards.slice(0, 2), ['body', 'pulse']);
  assert.equal(cards.length, IDS.length);
});

test('moveCard swaps neighbours and refuses to run off either end', () => {
  const settings = {};
  // Start from the default order: pulse, exercises, muscles, ...
  moveCard(settings, 'muscles', -1);
  assert.deepEqual(settings.ui.progress.order.slice(0, 3), ['pulse', 'muscles', 'exercises']);

  moveCard(settings, 'pulse', -1); // already first
  assert.deepEqual(settings.ui.progress.order.slice(0, 3), ['pulse', 'muscles', 'exercises']);

  moveCard(settings, 'fasting', 1); // already last
  assert.equal(settings.ui.progress.order.at(-1), 'fasting');

  moveCard(settings, 'nope', 1); // unknown id is a no-op
  assert.equal(settings.ui.progress.order.length, IDS.length);
});

test('the last visible card cannot be hidden, and says how many must stay', () => {
  const settings = {};
  for (const id of IDS.slice(0, -1)) setCardVisible(settings, 'progress', id, false);
  assert.equal(settings.ui.progress.hidden.length, IDS.length - 1, 'all but one hidden');

  const last = IDS.at(-1);
  assert.equal(canHideCard(settings, 'progress', last), false);
  setCardVisible(settings, 'progress', last, false);
  assert.equal(isCardVisible(settings, 'progress', last), true, 'refused, unchanged');
  assert.equal(MIN_VISIBLE_PROGRESS_CARDS, 1);
});

test('Hiding Pulse and Balance is allowed — they are not pinned', () => {
  const settings = {};
  setCardVisible(settings, 'progress', 'pulse', false);
  setCardVisible(settings, 'progress', 'balance', false);
  assert.equal(isCardVisible(settings, 'progress', 'pulse'), false);
  assert.equal(isCardVisible(settings, 'progress', 'balance'), false);
});

test('reset restores visibility and the default order without touching Home', () => {
  const settings = {};
  setCardVisible(settings, 'progress', 'pulse', false);
  moveCard(settings, 'reviews', -1);
  setCardVisible(settings, 'home', 'insight', false);

  resetSurface(settings, 'progress');
  assert.deepEqual(settings.ui.progress.hidden, []);
  assert.deepEqual(settings.ui.progress.order, IDS);
  assert.deepEqual(settings.ui.home.hidden, ['insight'], 'Home is a different surface');
});
