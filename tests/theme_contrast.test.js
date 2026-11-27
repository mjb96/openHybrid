// =============================================================================
// THEME CONTRAST — the semantic layer must stay legible in every shipped mode.
//
// The original version checked 13 pairs, almost all against `--surface-1`, so a
// token could pass here and still be unreadable on `--surface-2`/`--surface-3`
// (where inputs, chips and nested rows actually live). Every text token is now
// checked against every surface, and the status TEXT tokens against all three:
// a status hue on its own 6-14% tint is exactly where light mode failed.
//
// This is also the guard that makes the dark surface-ladder lift safe: raising
// a surface eats muted-text headroom, and these pairs refuse that silently.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EMBER_TOKENS, FOREST_TOKENS, LIGHT_TOKENS, MIDNIGHT_TOKENS, SLATE_TOKENS } from '../js/theme/tokens.js';

const luminance = (hex) => {
  const raw = String(hex).replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(raw.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (a, b) => {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const SURFACES = ['bg', 'surface-1', 'surface-2', 'surface-3'];

/** Body text owes 4.5:1 everywhere it can land. */
const BODY_TEXT = ['text', 'text-2', 'text-3', 'accent-text'];
/** Status text is body text when it carries words ("Stalled", "2.08"). */
const STATUS_TEXT = ['warning-text', 'success-text', 'danger-text', 'info-text'];
/** Large text and non-text UI (icons, marks, rings) owe 3:1. */
const UI = [
  ['success', 3], ['warning', 3], ['danger', 3], ['info', 3],
  ['domain-strength', 3], ['domain-endurance', 3], ['domain-recovery', 3],
  ['data-1', 3], ['data-2', 3], ['data-3', 3], ['data-4', 3],
  ['data-5', 3], ['data-6', 3], ['data-7', 3], ['data-8', 3],
  ['focus-ring', 3],
];

const PALETTES = [
  ['Midnight', MIDNIGHT_TOKENS],
  ['Slate', SLATE_TOKENS],
  ['Forest', FOREST_TOKENS],
  ['Ember', EMBER_TOKENS],
  ['Light', LIGHT_TOKENS],
];

/** Resolve a token that may be `var(--x)` or a raw hex in a palette map. */
function resolve(tokens, key, depth = 0) {
  const value = tokens[key];
  if (value == null) return null;
  const alias = String(value).match(/^var\(--([a-z0-9-]+)\)$/i);
  if (alias && depth < 4) return resolve(tokens, alias[1], depth + 1) ?? value;
  return value;
}

for (const [name, tokens] of PALETTES) {
  test(`${name}: every text token clears AA on every surface`, () => {
    for (const fgKey of [...BODY_TEXT, ...STATUS_TEXT]) {
      const fg = resolve(tokens, fgKey);
      assert.ok(fg, `${name} has no --${fgKey}`);
      for (const bgKey of SURFACES) {
        const bg = resolve(tokens, bgKey);
        assert.ok(bg, `${name} has no --${bgKey}`);
        const ratio = contrast(fg, bg);
        assert.ok(ratio >= 4.5, `${name}: ${fgKey} on ${bgKey} is ${ratio.toFixed(2)}:1, expected 4.5:1`);
      }
    }
  });

  test(`${name}: UI and data colours clear 3:1`, () => {
    for (const [fgKey, min] of UI) {
      const fg = resolve(tokens, fgKey);
      assert.ok(fg, `${name} has no --${fgKey}`);
      for (const bgKey of SURFACES) {
        const bg = resolve(tokens, bgKey);
        const ratio = contrast(fg, bg);
        assert.ok(ratio >= min, `${name}: ${fgKey} on ${bgKey} is ${ratio.toFixed(2)}:1, expected ${min}:1`);
      }
    }
  });

  test(`${name}: ink on the accent clears AA`, () => {
    const ratio = contrast(resolve(tokens, 'on-accent'), resolve(tokens, 'accent'));
    assert.ok(ratio >= 4.5, `${name}: on-accent on accent is ${ratio.toFixed(2)}:1, expected 4.5:1`);
  });
}

test('status-text tokens are real tokens, not aliases of the failing hues', () => {
  // In light mode the status hues sit near 2:1 on their own tint, so the text
  // token must differ from the hue it names. If these ever collapse back to the
  // same value, every status label on a tinted chip becomes unreadable again.
  assert.notEqual(LIGHT_TOKENS['warning-text'], LIGHT_TOKENS.warning);
  assert.notEqual(LIGHT_TOKENS['success-text'], LIGHT_TOKENS.success);
  assert.notEqual(LIGHT_TOKENS['danger-text'], LIGHT_TOKENS.danger);
});
