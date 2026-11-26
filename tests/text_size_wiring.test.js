// =============================================================================
// ST8 — the preference is applied at boot and on change; haptics are gated
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('Settings applies text size on change and at boot', () => {
  const settings = read('js/settings.js');
  assert.match(settings, /case 'textSize':[\s\S]{0,220}settingsStore\(\)\?\.set\('textSize', value\)[\s\S]{0,120}applyTextSize\(document\.documentElement, value\)/);
  assert.match(settings, /applyTextSize\(document\.documentElement, s\.textSize\)/);
});

test('haptics are off-switchable without touching the timer or logging', () => {
  const workout = read('js/workout.js');
  assert.equal((workout.match(/settings\?\.haptics !== false/g) || []).length, 4);
  // The gated call is still present on both tick paths and both success paths.
  assert.equal((workout.match(/hapticTick\(\)/g) || []).length, 2);
  assert.equal((workout.match(/hapticSuccess\(\)/g) || []).length, 2);
});

test('the CSS hook scales the root for both larger steps', () => {
  const css = read('css/styles.css');
  assert.match(css, /html\[data-text-size="large"\] \{ font-size: 112\.5%; \}/);
  assert.match(css, /html\[data-text-size="xlarge"\] \{ font-size: 125%; \}/);
});
