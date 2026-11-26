// =============================================================================
// ST8 — text size preference (root scaling, one owner)
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TEXT_SIZES,
  applyTextSize,
  normalizeTextSize,
  textSizePercent,
} from '../js/ui/text-size.js';

test('only the three real steps are accepted', () => {
  assert.deepEqual(TEXT_SIZES, ['default', 'large', 'xlarge']);
  assert.equal(normalizeTextSize('large'), 'large');
  assert.equal(normalizeTextSize('xlarge'), 'xlarge');
  assert.equal(normalizeTextSize('huge'), 'default');
  assert.equal(normalizeTextSize(undefined), 'default');
});

test('the scale grows the root, never a single component', () => {
  assert.equal(textSizePercent('default'), 100);
  assert.equal(textSizePercent('large'), 112.5);
  assert.equal(textSizePercent('xlarge'), 125);
  assert.equal(textSizePercent('nonsense'), 100);
});

test('applying publishes the CSS hook and survives a missing DOM', () => {
  const root = { dataset: {} };
  applyTextSize(root, 'xlarge');
  assert.equal(root.dataset.textSize, 'xlarge');
  applyTextSize(root, 'nonsense');
  assert.equal(root.dataset.textSize, 'default');
  assert.doesNotThrow(() => applyTextSize(null, 'large'));
});
