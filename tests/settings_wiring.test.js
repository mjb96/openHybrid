// =============================================================================
// SETTINGS WIRING RATCHET
//
// A settings control that renders but has no handler is a dead toggle: the
// athlete changes it, nothing is stored, and the next open silently reverts it.
// Static checks cannot prove a handler WORKS, but they can prove one exists.
//
// Every input/select/textarea inside #settingsOverlay must be referenced by an
// app/settings handler module. The exception list is for controls wired by
// ATTRIBUTE rather than id, and it may only shrink: an entry that gains an id
// reference fails the test until it is removed, and the hard cap of six stops
// new exemptions being added.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/**
 * Health Connect toggles are dispatched by `data-hc-field` through
 * `hcToggleSyncField`, not by id. They are deliberately id-referenced only when
 * `_syncHealthConnectUI` checks the box, which is a read, not a handler.
 */
const ATTRIBUTE_WIRED_EXCEPTIONS = [
  'hcSyncSteps',
  'hcSyncRhr',
  'hcSyncHrv',
  'hcSyncSleep',
];

/** Full-line comments must not count as a reference. */
function handlerSources() {
  const files = ['js/app.js', 'js/settings.js'];
  const settingsDir = path.join(ROOT, 'js/settings');
  if (existsSync(settingsDir)) {
    for (const name of readdirSync(settingsDir)) {
      if (name.endsWith('.js')) files.push(`js/settings/${name}`);
    }
  }
  return files
    .map((file) => readFileSync(path.join(ROOT, file), 'utf8'))
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => (line.trim().startsWith('//') ? '' : line))
    .join('\n');
}

function settingsControlIds() {
  const start = HTML.indexOf('id="settingsOverlay"');
  assert.ok(start > 0, '#settingsOverlay is missing from index.html');
  const end = HTML.indexOf('<!-- Session Recap', start);
  assert.ok(end > start, 'settings panel region has no end marker');
  const block = HTML.slice(start, end);
  return [...block.matchAll(/<(input|select|textarea)\b[^>]*\bid="([^"]+)"/g)].map((match) => match[2]);
}

test('every settings control is referenced by an app/settings handler', () => {
  const ids = settingsControlIds();
  assert.ok(ids.length >= 30, `expected the settings controls, found ${ids.length}`);
  const sources = handlerSources();
  const unwired = ids.filter((id) => !sources.includes(id) && !ATTRIBUTE_WIRED_EXCEPTIONS.includes(id));
  assert.deepEqual(unwired, [],
    `settings controls with no handler:\n${unwired.map((id) => `  - #${id}`).join('\n')}`);
});

test('the attribute-wired exception list can only shrink', () => {
  assert.ok(ATTRIBUTE_WIRED_EXCEPTIONS.length <= 6,
    `the exception list has ${ATTRIBUTE_WIRED_EXCEPTIONS.length} entries; the cap is six`);

  const sources = handlerSources();
  for (const id of ATTRIBUTE_WIRED_EXCEPTIONS) {
    assert.ok(settingsControlIds().includes(id), `stale exception: #${id} is no longer a settings control`);
    assert.ok(!sources.includes(id),
      `#${id} now has an id handler — remove it from ATTRIBUTE_WIRED_EXCEPTIONS so the list shrinks`);
  }
});
