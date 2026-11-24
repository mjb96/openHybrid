// ==========================================
// SETTINGS REGISTRY TEST (tests/settings_registry.test.js)
// ST2 foundation: every stored setting has one descriptor.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  NON_SETTINGS_STATE_KEYS,
  RETIRED_SETTINGS_KEYS,
  SETTINGS_REGISTRY,
  missingSettingsKeys,
  settingsEntry,
  settingsRegistryKeys,
} from '../js/settings/registry.js';

function defaultSettingsKeys() {
  const src = readFileSync(resolve('js/state.js'), 'utf8');
  const base = src.indexOf('const baseDefaults');
  const marker = src.indexOf('settings: {', base);
  assert.ok(marker > base, 'state.js settings literal not found');
  const open = src.indexOf('{', marker);
  let depth = 0;
  let quote = null;
  let end = -1;
  for (let i = open; i < src.length; i += 1) {
    const ch = src[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) { end = i; break; }
    }
  }
  assert.ok(end > open, 'settings literal has no closing brace');
  const body = src.slice(open + 1, end);
  const parts = [];
  let current = '';
  depth = 0;
  quote = null;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) {
      current += ch;
      if (ch === '\\') { current += body[++i] || ''; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; current += ch; continue; }
    if (ch === '{' || ch === '[' || ch === '(') depth += 1;
    else if (ch === '}' || ch === ']' || ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts.map((part) => part.trim().match(/^([A-Za-z_$][\w$]*)\s*:/)?.[1]).filter(Boolean);
}

test('every default settings key is in the registry', () => {
  const keys = defaultSettingsKeys();
  assert.ok(keys.length >= 40, `parsed only ${keys.length} settings keys`);
  assert.deepEqual(missingSettingsKeys(keys), []);
});

test('migration-only settings are registered', () => {
  for (const key of ['ui', 'measurementUnit']) {
    assert.ok(settingsEntry(key), `${key} is missing from the registry`);
  }
});

test('retired keys are not offered again', () => {
  assert.deepEqual(RETIRED_SETTINGS_KEYS, ['recoveryFeel']);
  assert.equal(settingsEntry('recoveryFeel'), null);
  assert.deepEqual(missingSettingsKeys(['name', 'recoveryFeel']), []);
});

test('registry keys are unique and every entry is renderable metadata', () => {
  const keys = settingsRegistryKeys();
  assert.equal(new Set(keys).size, keys.length, 'duplicate registry key');
  const groups = new Set(['profile', 'training', 'units', 'notifications', 'appearance', 'health', 'data', 'about', 'system']);
  for (const entry of SETTINGS_REGISTRY) {
    assert.ok(entry.label, `${entry.key} has no label`);
    assert.ok(groups.has(entry.group), `${entry.key} has an unknown group`);
    assert.ok(['text', 'number', 'select', 'toggle', 'time', 'object', 'system'].includes(entry.type),
      `${entry.key} has an unknown type`);
    assert.ok('default' in entry, `${entry.key} has no default`);
  }
});

test('settings-like root values are named so they cannot hide', () => {
  assert.deepEqual([...NON_SETTINGS_STATE_KEYS], ['thresholdPaceSeconds', 'healthConnect.stepGoal', 'prGoals']);
});
