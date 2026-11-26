// =============================================================================
// ST4 — contextual Settings links go to the OWNING page, never a copy
//
// Progress, Plans and Measures each carry a Settings control. The action router
// must forward `data-page` to openSettings, and every link must name the page
// (units / equipment) rather than merely opening the Settings root.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('the router forwards data-page and data-anchor to openSettings', () => {
  const app = read('js/app.js');
  assert.match(app, /action === 'open-settings'\) openSettings\(target\.getAttribute\('data-page'\) \|\| undefined, target\.getAttribute\('data-anchor'\) \|\| ''\)/);
});

test('Progress opens the Units page', () => {
  const hub = read('js/analytics/views/view-progress-hub.js');
  assert.match(hub, /data-action="open-settings" data-page="once\.units"/);
});

test('Measures opens the same Units page as its cm/in toggle', () => {
  const measures = read('js/analytics/views/view-measures.js');
  assert.match(measures, /data-action="open-settings" data-page="once\.units"/);
});

test('Plans opens the Equipment page', () => {
  const library = read('js/programs/library.js');
  assert.match(library, /data-action="open-settings" data-page="once\.equipment"/);
});

test('the logger keeps its registry-driven workout settings sheet', () => {
  const html = read('index.html');
  assert.match(html, /data-action="open-workout-settings"/);
  const settings = read('js/settings.js');
  assert.match(settings, /open-workout-settings'\) \{ openWorkoutSettings\(\)/);
});
