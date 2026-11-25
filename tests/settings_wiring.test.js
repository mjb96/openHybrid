// =============================================================================
// SETTINGS WIRING RATCHET (new registry renderer)
//
// The old ratchet walked static inputs in index.html. Settings pages are now
// rendered from the registry, so this keeps the equivalent guarantees:
//   • the one static control (avatar picker) has a handler;
//   • rendered setting controls carry a registry key and the delegated handler
//     exists;
//   • Health Connect rows carry data-hc-field and are dispatched by id;
//   • the new search and page actions have handlers.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const RENDER = readFileSync(path.join(ROOT, 'js/settings/render.js'), 'utf8');
const COMPONENTS = readFileSync(path.join(ROOT, 'js/settings/components.js'), 'utf8');

function sources() {
  const files = ['js/app.js', 'js/settings.js'];
  const settingsDir = path.join(ROOT, 'js/settings');
  if (existsSync(settingsDir)) {
    for (const name of readdirSync(settingsDir)) if (name.endsWith('.js')) files.push(`js/settings/${name}`);
  }
  return files.map((file) => readFileSync(path.join(ROOT, file), 'utf8')).join('\n');
}

function referencesId(source, id) {
  return [`'${id}'`, `"${id}"`, `\`${id}\``].some((quoted) => source.includes(quoted));
}

test('the one static settings control is wired', () => {
  const start = HTML.indexOf('id="settingsOverlay"');
  const end = HTML.indexOf('<!-- Session Recap', start);
  const block = HTML.slice(start, end);
  const ids = [...block.matchAll(/<(input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((match) => match[2]);
  assert.deepEqual(ids, ['avatarFilePicker'], `unexpected static settings controls: ${ids.join(', ')}`);
  assert.ok(referencesId(sources(), 'avatarFilePicker'), 'avatar picker has no handler');
});

test('rendered controls use the registry key contract', () => {
  assert.match(COMPONENTS, /data-setting-key="\$\{escapeHTML\(input\.key\)\}"/);
  assert.match(COMPONENTS, /data-setting-segment="\$\{escapeHTML\(input\.key\)\}"/);
  assert.match(COMPONENTS, /data-setting-step="\$\{escapeHTML\(input\.key\)\}"/);
  assert.match(RENDER, /settingsEntry\(key\)/);
  assert.match(sources(), /_applySettingControl\(/);
  assert.match(sources(), /data-setting-segment/);
});

test('Health Connect rows are attribute-wired and dispatched', () => {
  for (const field of ['steps', 'restingHR', 'hrv', 'sleep']) {
    assert.match(RENDER, new RegExp(`data-hc-field="${field}"`), `${field} row is missing`);
  }
  assert.ok(referencesId(sources(), 'hcToggleSyncField') || sources().includes('hcToggleSyncField'));
  assert.match(RENDER, /id="settingsStepGoal"/);
  assert.ok(referencesId(sources(), 'settingsStepGoal'));
});

test('search and pushed-page actions are handled', () => {
  assert.match(RENDER, /id="settingsSearch"/);
  assert.match(sources(), /renderSettingsHome\(/);
  assert.match(sources(), /open-settings-page/);
  assert.match(sources(), /open-settings-result/);
});

test('the Settings panel has no legacy cards left', () => {
  assert.doesNotMatch(HTML, /<div class="settings-section-label">Training<\/div>/);
  assert.match(HTML, /id="settingsPageHost"/);
});
