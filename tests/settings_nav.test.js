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
  firstMatchingRow,
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
  // Inherited Object.prototype keys are not labels. A truthiness lookup used to
  // return the constructor function for these.
  for (const inherited of ['constructor', 'toString', '__proto__', 'hasOwnProperty']) {
    assert.equal(settingsGroupForLabel(inherited), 'training', `${inherited} must fall back to Training`);
  }
});

test('search opens the exact row, not merely the card', () => {
  const dom = new JSDOM(`<div class="settings-section">
    <div class="settings-row"><label>Theme</label><select><option>Dark</option></select></div>
    <div class="run-grid-inputs"><label><input aria-label="Light band weight"></label></div>
    <div class="settings-hint">Band weights are canonical kilograms.</div>
  </div>`);
  const section = dom.window.document.querySelector('.settings-section');
  assert.equal(firstMatchingRow(section, 'light band weight')?.className, 'run-grid-inputs');
  assert.equal(firstMatchingRow(section, 'canonical kilograms')?.className, 'settings-hint');
  assert.ok(firstMatchingRow(section, 'theme'));
  assert.equal(firstMatchingRow(section, ''), null);
  assert.equal(firstMatchingRow(section, 'missing'), null);
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

test('module-disabled subtrees match neither their text nor their accessible names', () => {
  const dom = new JSDOM(`<div class="settings-section">
    <div class="settings-row" data-module="running">
      <span>Threshold Pace</span>
      <input aria-label="Threshold pace help">
      <span title="Pace tooltip"></span>
    </div>
    <div class="settings-row"><span>Week Starts On</span></div>
  </div>`);
  const section = dom.window.document.querySelector('.settings-section');
  const runningOn = (id) => id !== 'running';

  assert.equal(sectionMatchesQuery(section, 'threshold pace', { isModuleEnabled: runningOn }), false,
    'hidden text cannot match');
  assert.equal(sectionMatchesQuery(section, 'threshold pace help', { isModuleEnabled: () => true }), true,
    'the same aria-label matches when the module is on');
  assert.equal(sectionMatchesQuery(section, 'pace tooltip', { isModuleEnabled: runningOn }), false,
    'a hidden title cannot match');
  assert.equal(sectionMatchesQuery(section, 'week starts', { isModuleEnabled: runningOn }), true,
    'enabled content still matches');
});

test('a card whose own module is off never matches', () => {
  const dom = new JSDOM(`<div class="settings-section" data-module="fasting">
    <span>Default Protocol</span>
  </div>`);
  const section = dom.window.document.querySelector('.settings-section');
  const fastingOn = (id) => id !== 'fasting';
  assert.equal(sectionMatchesQuery(section, 'default protocol', { isModuleEnabled: fastingOn }), false);
  assert.equal(sectionMatchesQuery(section, 'default protocol', { isModuleEnabled: () => true }), true);
});
