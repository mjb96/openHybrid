// =============================================================================
// BAND DETAIL SWITCHES
//
// A sub-card turns off something INSIDE a band. It must not remove the band, and
// it must never be able to be "the last visible card" — that rule is about the
// dashboard, not about a detail.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROGRESS_CARDS, PROGRESS_SUB_CARDS, isCardVisible, normalizeUi,
  setCardVisible, subCardsFor,
} from '../js/ui/customize.js';

test('the two detail switches belong to their bands', () => {
  assert.deepEqual(subCardsFor('body').map((card) => card.id), ['bodyPhotos']);
  assert.deepEqual(subCardsFor('muscles').map((card) => card.id), ['musclesBody']);
  // ...and they are not bands, so they never enter the render order.
  const ui = normalizeUi(null);
  assert.equal(ui.progress.order.includes('bodyPhotos'), false);
  assert.equal(ui.progress.order.length, PROGRESS_CARDS.length);
});

test('turning a detail off leaves its band visible', () => {
  const settings = {};
  setCardVisible(settings, 'progress', 'bodyPhotos', false);
  assert.equal(isCardVisible(settings, 'progress', 'bodyPhotos'), false);
  assert.equal(isCardVisible(settings, 'progress', 'body'), true, 'the band survives');
});

test('a detail switch is never blocked by the one-card minimum', () => {
  const settings = {};
  for (const card of PROGRESS_CARDS.slice(0, -1)) setCardVisible(settings, 'progress', card.id, false);
  // Only one band left; hiding a detail inside it is still allowed.
  setCardVisible(settings, 'progress', PROGRESS_SUB_CARDS[0].id, false);
  assert.equal(isCardVisible(settings, 'progress', PROGRESS_SUB_CARDS[0].id), false);
});

test('unknown sub ids are still dropped on read', () => {
  const ui = normalizeUi({ progress: { hidden: ['bodyPhotos', 'nope'] } });
  assert.deepEqual(ui.progress.hidden, ['bodyPhotos']);
});
