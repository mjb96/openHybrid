// =============================================================================
// LIGHT-THEME NOTE / LINK CONTRAST
// Cyan on a light card is ~1.8:1; the dark-theme violet is ~4.2:1. Small text
// needs 4.5:1, so the light theme has explicit darker tokens. This guard keeps
// the values and their selectors from silently regressing.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const styles = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');
const programs = readFileSync(new URL('../css/programs.css', import.meta.url), 'utf8');

function channel(value) {
  const v = value / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('light-theme link and note colours clear 4.5:1', () => {
  assert.ok(contrast('#0e7490', '#ffffff') >= 4.5, 'link text on the light card');
  assert.ok(contrast('#0e7490', '#f7fbfc') >= 4.5, 'link text on the tinted light row');
  assert.ok(contrast('#5b21b6', '#ffffff') >= 4.5, 'routine note label on the light card');
  assert.ok(contrast('#5b21b6', '#f7f5ff') >= 4.5, 'routine note label on its tinted banner');
  assert.ok(contrast('#5b21b6', '#ffffff') >= 4.5, 'routine card Note flag');
});

test('the light overrides are present', () => {
  assert.match(styles, /html\[data-theme="light"\] \.cockpit-ex-link\s*\{[^}]*#0e7490/i);
  assert.match(styles, /html\[data-theme="light"\] \.cockpit-routine-note__label\s*\{[^}]*#5b21b6/i);
  assert.match(programs, /html\[data-theme="light"\] \.routine-card__note-flag\s*\{[^}]*#5b21b6/i);
  assert.match(programs, /html\[data-theme="light"\] \.program-editor__exercise-link\s*\{[^}]*#0e7490/i);
});
