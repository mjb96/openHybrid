// =============================================================================
// SETTINGS NAVIGATION MODEL
//
// `js/settings/nav.js` is the one written-down mapping between the section cards
// rendered by index.html and the five settings destinations. These tests keep
// that contract honest: a card can never be filed under a tab that does not
// exist, and a new top-level card cannot be added to the panel without a group.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import {
  SETTINGS_TABS,
  SETTINGS_GROUP_BY_LABEL,
  settingsGroupForLabel,
  sectionMatchesQuery,
} from '../js/settings/nav.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/** Top-level settings card labels, in DOM order. */
function topLevelSectionLabels() {
  const dom = new JSDOM(HTML);
  const panel = dom.window.document.getElementById('settingsPanel');
  assert.ok(panel, '#settingsPanel is missing from index.html');
  return [...panel.querySelectorAll('.settings-section')].map((section) => (
    section.querySelector('.settings-section-label:not(.settings-section-label--sub)')?.textContent?.trim() || ''
  ));
}

test('the five settings destinations are fixed and unique', () => {
  assert.deepEqual(SETTINGS_TABS.map((tab) => tab.id), ['profile', 'training', 'health', 'appearance', 'data']);
  assert.equal(new Set(SETTINGS_TABS.map((tab) => tab.id)).size, SETTINGS_TABS.length, 'duplicate tab id');
  for (const tab of SETTINGS_TABS) {
    assert.ok(tab.label.trim(), `tab ${tab.id} needs a label`);
  }
});

test('an unknown card label falls back to Training instead of disappearing', () => {
  assert.equal(settingsGroupForLabel('Logging'), 'training');
  assert.equal(settingsGroupForLabel('A brand new card'), 'training');
  assert.equal(settingsGroupForLabel(''), 'training');
  assert.equal(settingsGroupForLabel(null), 'training');
  assert.equal(settingsGroupForLabel(undefined), 'training');
});

test('every top-level section in index.html maps to a real tab', () => {
  const tabIds = new Set(SETTINGS_TABS.map((tab) => tab.id));
  const labels = topLevelSectionLabels();
  assert.ok(labels.length >= 10, `expected the settings panel cards, got ${labels.length}`);
  for (const label of labels) {
    assert.ok(label, 'a top-level settings card has no label');
    assert.ok(Object.hasOwn(SETTINGS_GROUP_BY_LABEL, label),
      `top-level settings card "${label}" has no SETTINGS_GROUP_BY_LABEL entry`);
  }
  for (const [label, group] of Object.entries(SETTINGS_GROUP_BY_LABEL)) {
    assert.ok(tabIds.has(group), `card "${label}" maps to unknown tab "${group}"`);
  }
});

test('search matches visible text, accessible names, tooltips and option labels', () => {
  const dom = new JSDOM(`<div class="settings-section">
    <div class="settings-section-label">Equipment</div>
    <span>Bar weight</span>
    <button aria-label="Add a home profile">+</button>
    <span title="Standard Olympic bar">?</span>
    <select><option>Leg press</option></select>
  </div>`);
  const section = dom.window.document.querySelector('.settings-section');

  assert.equal(sectionMatchesQuery(section, ''), true, 'empty query matches everything');
  assert.equal(sectionMatchesQuery(section, 'equipment'), true, 'visible text');
  assert.equal(sectionMatchesQuery(section, 'home profile'), true, 'aria-label');
  assert.equal(sectionMatchesQuery(section, 'olympic'), true, 'title');
  assert.equal(sectionMatchesQuery(section, 'leg press'), true, 'option text');
  assert.equal(sectionMatchesQuery(section, 'barbell'), false, 'no false positive');
  assert.equal(sectionMatchesQuery(null, 'anything'), false, 'missing section');
});
