// =============================================================================
// ST9 — backup trust is wired to the real export outcome (static guard)
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (rel) => readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

test('a manual backup is recorded only when the platform confirmed it', () => {
  const settings = read('js/settings.js');
  assert.match(settings, /result\?\.status === 'saved' \|\| result\?\.status === 'started'/);
  assert.match(settings, /appState\.lastBackupAt = new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(settings, /lastBackupAt[\s\S]{0,80}cancelled/);
});

test('Data shows the last manual backup and the stale wording', () => {
  const render = read('js/settings/render.js');
  assert.match(render, /describeLastBackup\(state\?\.lastBackupAt\)/);
  assert.match(render, /label: 'Last manual backup'/);
  assert.match(render, /backup\.detail/);
});

test('the timestamp is metadata at the root, not a new setting', () => {
  const state = read('js/state.js');
  assert.match(state, /lastBackupAt: null/);
  assert.match(state, /typeof appState\.lastBackupAt !== 'string'/);
  const registry = read('js/settings/registry.js');
  // Backup metadata is not a settings-like root value, so it must NOT be in the
  // settings-like allowlist (which only names user-facing root settings).
  assert.doesNotMatch(registry, /NON_SETTINGS_STATE_KEYS[\s\S]{0,80}lastBackupAt/);
});
