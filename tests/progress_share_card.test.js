// =============================================================================
// PROGRESS SHARE CARD — the rows come from the same models the bands render, so
// the image cannot disagree with the screen.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawProgressCard } from '../js/analytics/share-card.js';

/** A recording 2d context: no canvas implementation in node. */
function fakeCanvas() {
  const calls = [];
  const ctx = {
    calls,
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set font(value) { calls.push(['font', value]); },
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    fillText: (text, x, y) => calls.push(['fillText', text, x, y]),
    measureText: (text) => ({ width: String(text).length * 10 }),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  globalThis.document = { createElement: () => canvas };
  return { canvas, ctx };
}

test('the card draws a headline and one row per band', () => {
  const { ctx } = fakeCanvas();
  const rows = [
    { bandId: 'pulse', value: '4 sessions', note: '3-week streak' },
    { bandId: 'muscles', value: '96 sets', note: '12 muscles' },
  ];
  drawProgressCard(rows, { title: 'Training progress', subtitle: '23–29 Nov' });
  const texts = ctx.calls.filter((call) => call[0] === 'fillText').map((call) => call[1]);
  assert.ok(texts.includes('Training progress'));
  assert.ok(texts.includes('23–29 Nov'));
  assert.ok(texts.includes('4 sessions'));
  assert.ok(texts.includes('96 sets'));
  assert.ok(texts.includes('THIS WEEK'), 'band labels are human words, not ids');
});

test('empty rows still produce a card rather than a blank canvas', () => {
  const { ctx, canvas } = fakeCanvas();
  drawProgressCard([], { title: 'Training progress' });
  assert.equal(canvas.width, 1080);
  assert.ok(ctx.calls.some((call) => call[0] === 'fillRect'));
});

test('more than seven rows are capped, and empty values are dropped', () => {
  const { ctx } = fakeCanvas();
  const many = Array.from({ length: 10 }, (_, i) => ({ bandId: 'pulse', value: `${i} sessions` }));
  drawProgressCard([...many, { bandId: 'body', value: '' }]);
  const values = ctx.calls.filter((call) => call[0] === 'fillText').map((call) => String(call[1]));
  assert.equal(values.includes('9 sessions'), false, 'capped at seven');
  assert.equal(values.some((text) => text === ''), false, 'no empty row drawn');
});
