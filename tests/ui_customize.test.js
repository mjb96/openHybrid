// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HOME_CARDS,
  PROGRESS_CARDS,
  cardsFor,
  normalizeUi,
  isCardVisible,
  setCardVisible,
  resetSurface,
} from '../js/ui/customize.js';

test('defaults show every optional Home and Progress card', () => {
  const settings = {};
  for (const card of [...HOME_CARDS, ...PROGRESS_CARDS]) {
    assert.equal(isCardVisible(settings, HOME_CARDS.includes(card) ? 'home' : 'progress', card.id), true);
  }
  assert.deepEqual(normalizeUi(null), {
    home: { hidden: [] },
    progress: { hidden: [], order: PROGRESS_CARDS.map((card) => card.id) },
  });
});

test('hiding and showing a card persists the id without duplicates', () => {
  const settings = {};
  setCardVisible(settings, 'home', 'bodyweight', false);
  setCardVisible(settings, 'home', 'bodyweight', false);
  assert.deepEqual(settings.ui.home.hidden, ['bodyweight']);
  assert.equal(isCardVisible(settings, 'home', 'bodyweight'), false);

  setCardVisible(settings, 'home', 'bodyweight', true);
  assert.deepEqual(settings.ui.home.hidden, []);
  assert.equal(isCardVisible(settings, 'home', 'bodyweight'), true);
});

test('unknown and pinned-only ids are ignored', () => {
  const settings = { ui: { home: { hidden: ['today', 'navigation', 'nope', 'insight'] }, progress: { hidden: ['hybrid-score'] } } };
  assert.deepEqual(normalizeUi(settings.ui), {
    home: { hidden: ['insight'] },
    progress: { hidden: [], order: PROGRESS_CARDS.map((card) => card.id) },
  });
  setCardVisible(settings, 'home', 'today', false);
  assert.equal(isCardVisible(settings, 'home', 'today'), true);
});

test('reset restores one surface and leaves the other alone', () => {
  const settings = {};
  setCardVisible(settings, 'home', 'weekStrip', false);
  setCardVisible(settings, 'progress', 'endurance', false);
  resetSurface(settings, 'home');
  assert.deepEqual(settings.ui.home.hidden, []);
  assert.deepEqual(settings.ui.progress.hidden, ['endurance']);
  assert.equal(cardsFor('home').length, HOME_CARDS.length);
});
