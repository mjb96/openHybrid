// =============================================================================
// THEME CONTRAST — the semantic layer must stay legible in every shipped mode.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIGHT_TOKENS, MIDNIGHT_TOKENS } from '../js/theme/tokens.js';

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

const CHECKS = [
  ['text', 'bg', 4.5],
  ['text', 'surface-1', 4.5],
  ['text-2', 'surface-1', 4.5],
  ['text-3', 'surface-1', 3],
  ['on-accent', 'accent', 4.5],
  ['accent-text', 'bg', 4.5],
  ['success', 'surface-1', 3],
  ['warning', 'surface-1', 3],
  ['danger', 'surface-1', 3],
  ['domain-strength', 'surface-1', 3],
  ['domain-endurance', 'surface-1', 3],
  ['data-1', 'surface-1', 3],
  ['focus-ring', 'bg', 3],
];

for (const [name, tokens] of [['Midnight', MIDNIGHT_TOKENS], ['Light', LIGHT_TOKENS]]) {
  test(`${name} semantic pairs meet WCAG AA`, () => {
    for (const [fg, bg, min] of CHECKS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(ratio >= min, `${name}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, expected ${min}:1`);
    }
  });
}
