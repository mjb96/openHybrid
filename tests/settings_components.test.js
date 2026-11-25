// =============================================================================
// SETTINGS COMPONENTS
//
// One row/page/group language. These tests pin structure, accessible names,
// disable reasons and the no-literal-colour rule.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  dangerRow, pickerSheet, segmentedControl, selectList, settingsGroup, settingsPage,
  settingsRow, sliderRow, stepperControl, textControl, timeControl, toggleControl,
} from '../js/settings/components.js';

test('a group is one card with a labelled heading and optional footnote', () => {
  const html = settingsGroup({
    label: 'Training',
    rows: [settingsRow({ label: 'Workout', icon: 'dumbbell', nav: true, summary: '2:00 rest' })],
    footnote: 'Used by the logger.',
  });
  assert.match(html, /<section class="s-group" aria-labelledby=/);
  assert.match(html, /class="s-group__label"/);
  assert.match(html, /class="s-group__card"/);
  assert.match(html, /Used by the logger\./);
});

test('a nav row is a button with icon, live summary, chevron and accessible name', () => {
  const html = settingsRow({
    id: 'row-workout', label: 'Workout', icon: 'dumbbell', tone: 'blue',
    summary: 'Default · 2:00', nav: true, action: 'open-settings-page', context: 'workout',
    ariaLabel: 'Workout: Default · 2:00',
  });
  assert.match(html, /^<button type="button" class="s-row s-row--nav"/);
  assert.match(html, /data-action="open-settings-page"/);
  assert.match(html, /data-context="workout"/);
  assert.match(html, /aria-label="Workout: Default · 2:00"/);
  assert.match(html, /s-icon--blue/);
  assert.match(html, /s-row__chevron/);
});

test('a disabled row states a reason and a toggle cannot be checked', () => {
  const html = settingsRow({
    label: 'Reminder time', control: toggleControl({ key: 'reminders', label: 'Reminder time', checked: false, disabled: true, reason: 'Turn reminders on first.' }),
    disabled: true, disabledReason: 'Turn reminders on first.',
  });
  assert.match(html, /aria-disabled="true"/);
  assert.match(html, /s-row__reason/);
  assert.match(html, /disabled/);
  assert.match(html, /aria-describedby=/);
});

test('every control carries the registry key and the label/value contract', () => {
  const toggled = toggleControl({ key: 'keepAwake', label: 'Keep screen awake', checked: true });
  assert.match(toggled, /data-setting-key="keepAwake"/);
  assert.match(toggled, /aria-label="Keep screen awake"/);
  assert.match(toggled, /checked/);

  const segmented = segmentedControl({ key: 'theme', label: 'Theme', value: 'dark', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] });
  assert.match(segmented, /data-setting-segment="theme"/);
  assert.match(segmented, /aria-pressed="true"/);
  assert.match(segmented, /aria-pressed="false"/);

  const stepper = stepperControl({ key: 'sessionMinutes', label: 'Session length', value: 45, min: 15, max: 90, step: 5, unit: 'min' });
  assert.match(stepper, /data-setting-step="sessionMinutes"/);
  assert.match(stepper, /data-setting-output="sessionMinutes"/);

  assert.match(sliderRow({ key: 'restAlertVolume', label: 'Volume', value: 40, min: 0, max: 100, unit: '%' }), /data-setting-slider="restAlertVolume"/);
  assert.match(timeControl({ key: 'reminderTime', label: 'Reminder time', value: '07:30' }), /data-setting-time="reminderTime"/);
  assert.match(textControl({ key: 'name', label: 'Name', value: 'Alex' }), /data-setting-text="name"/);
});

test('the select list is a real radio group with one visible checkmark', () => {
  const html = selectList({
    key: 'theme', label: 'Theme', value: 'dark',
    options: [{ value: 'dark', label: 'Dark', description: 'Navy' }, { value: 'light', label: 'Light' }],
  });
  assert.match(html, /role="radiogroup"/);
  assert.equal((html.match(/data-setting-radio="theme"/g) || []).length, 2);
  assert.equal((html.match(/checked/g) || []).length, 1);
  assert.match(html, /is-selected/);
  assert.match(html, /✓/);
});

test('a page includes a back label, collapsing title and safe body', () => {
  const html = settingsPage({
    title: 'Workout', backLabel: 'Settings', backAction: 'back-to-settings',
    groups: [settingsGroup({ label: 'Logging', rows: [] })],
    footer: 'Changes save instantly.',
  });
  assert.match(html, /class="s-page"/);
  assert.match(html, /data-page-title/);
  assert.match(html, /data-action="back-to-settings"/);
  assert.match(html, /Back to Settings/);
  assert.match(html, /Changes save instantly\./);
});

test('picker and danger components are explicit', () => {
  const picker = pickerSheet({ id: 'themePicker', title: 'Theme', options: [{ value: 'dark', label: 'Dark' }], value: 'dark' });
  assert.match(picker, /role="dialog"/);
  assert.match(picker, /aria-modal="true"/);
  assert.match(picker, /hidden/);
  assert.match(dangerRow({ label: 'Delete all data', description: 'Cannot be undone', action: 'delete-all' }), /s-row--danger/);
});

test('user-provided labels are escaped', () => {
  const html = settingsRow({ label: '<img src=x onerror=alert(1)>', icon: 'user' });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img/);
});

test('components carry no literal colour values', () => {
  const source = readFileSync(new URL('../js/settings/components.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /#[0-9a-f]{3,8}\b/i, 'no hex colours');
  assert.doesNotMatch(source, /\brgba?\s*\(/i, 'no rgb/rgba');
  assert.doesNotMatch(source, /\bhsla?\s*\(/i, 'no hsl/hsla');
});
