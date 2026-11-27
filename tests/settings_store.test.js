test('a partial cross-tab payload never resets a setting it does not carry', () => {
  const { state, store } = setup();
  assert.equal(state.settings.name, 'Alex');
  assert.equal(state.settings.theme, 'dark');

  store.syncFromRaw(JSON.stringify({ settings: { theme: 'light' } }), 'storage');
  assert.equal(state.settings.theme, 'light', 'the carried key is applied');
  assert.equal(state.settings.name, 'Alex', 'an absent key is unchanged, never defaulted');
  assert.equal(state.settings.weightUnit, 'kg');
});

// =============================================================================
// SETTINGS STORE
//
// The store is the write path for the new Settings UI. These tests pin the
// contract: registry validation before mutation, selector subscriptions,
// atomic multi-writes, page reset/undo, root-path settings, and cross-tab sync
// that never touches training history.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSettingsStore, SettingsValidationError } from '../js/settings/store.js';
import { DEFAULT_REST_TIERS } from '../js/workout/rest-duration.js';
import { snapshotBeforeMigration } from '../js/state/migrations.js';

function fixture() {
  return {
    weeks: { '1': { dates: { mon: '2026-11-23' } } },
    prGoals: { 'Bench Press': 120 },
    thresholdPaceSeconds: 270,
    healthConnect: { connected: false, lastSync: null, stepGoal: 10000, syncFields: { steps: true, walking: false } },
    settings: {
      name: 'Alex', weightUnit: 'kg', distanceUnit: 'km', theme: 'dark', palette: 'midnight',
      notificationsEnabled: false, notifStreak: false, notifFastingStage: true,
      restPeriods: { ...DEFAULT_REST_TIERS }, restTimerEnabled: true, restAlertVolume: 0.4,
    },
  };
}

function setup() {
  const state = fixture();
  const saves = [];
  const store = createSettingsStore({
    getState: () => state,
    save: (suppress) => saves.push(suppress),
    storageKey: 'test_state',
    windowRef: null,
  });
  return { state, saves, store };
}

test('set validates, writes the registered path, saves and notifies that key only', () => {
  const { state, saves, store } = setup();
  const seen = [];
  store.subscribe('theme', (detail) => seen.push(detail));
  const unrelated = [];
  store.subscribe('page:once.units', (detail) => unrelated.push(detail));

  store.set('theme', 'light');
  assert.equal(state.settings.theme, 'light');
  assert.deepEqual(saves, [true]);
  assert.deepEqual(seen.at(-1).keys, ['theme']);
  assert.deepEqual(unrelated, []);
});

test('an invalid value is refused before mutation and before saving', () => {
  const { state, saves, store } = setup();
  assert.throws(() => store.set('weightUnit', 'stone'), SettingsValidationError);
  assert.equal(state.settings.weightUnit, 'kg');
  assert.deepEqual(saves, []);
  assert.throws(() => store.set('not-a-setting', 1), SettingsValidationError);
});

test('setMany validates the whole batch before applying any of it', () => {
  const { state, saves, store } = setup();
  assert.throws(() => store.setMany({ theme: 'light', weightUnit: 'stone' }), SettingsValidationError);
  assert.equal(state.settings.theme, 'dark');
  assert.equal(state.settings.weightUnit, 'kg');
  assert.deepEqual(saves, []);

  const result = store.setMany({ theme: 'light', weightUnit: 'lbs' });
  assert.deepEqual(result.changed.sort(), ['theme', 'weightUnit']);
  assert.equal(state.settings.theme, 'light');
  assert.equal(state.settings.weightUnit, 'lbs');
});

test('root-path settings are read and written through the same store', () => {
  const { state, store } = setup();
  assert.equal(store.get('thresholdPaceSeconds'), 270);
  store.set('thresholdPaceSeconds', 300);
  assert.equal(state.thresholdPaceSeconds, 300);
  store.set('healthConnect.stepGoal', 12000);
  assert.equal(state.healthConnect.stepGoal, 12000);
  assert.equal(store.get('prGoals')['Bench Press'], 120);
});

test('resetPage restores defaults for that page and returns an undo snapshot', () => {
  const { state, store } = setup();
  state.settings.theme = 'light';
  state.settings.palette = 'forest';
  const result = store.resetPage('once.look');
  assert.ok(result.changed.includes('theme'));
  assert.equal(state.settings.theme, 'dark');
  assert.equal(state.settings.palette, 'midnight');
  assert.equal(result.before.theme, 'light');

  store.restore(result.before);
  assert.equal(state.settings.theme, 'light');
  assert.equal(state.settings.palette, 'forest');
});

test('summary and describe use the live state and respect dependencies', () => {
  const { state, store } = setup();
  assert.equal(store.summary('theme'), 'Dark');
  assert.equal(store.summary('weightUnit'), 'kg');
  assert.equal(store.summary('healthConnect.stepGoal'), '10,000 steps');

  const reminder = store.describe('reminderTime');
  assert.equal(reminder.enabled, false);
  assert.match(reminder.disabledReason, /reminders/i);

  state.settings.notificationsEnabled = true;
  assert.equal(store.describe('reminderTime').enabled, true);
});

test('cross-tab sync copies registered settings only, never training history', () => {
  const { state, store } = setup();
  const seen = [];
  store.subscribe('*', (detail) => seen.push(detail));
  const incoming = fixture();
  incoming.settings.theme = 'light';
  incoming.settings.name = 'Sam';
  incoming.weeks = { '99': { dates: { mon: '2030-01-01' } } };
  incoming.prGoals = { Deadlift: 200 };

  store.syncFromRaw(JSON.stringify(incoming), 'storage');
  assert.equal(state.settings.theme, 'light');
  assert.equal(state.settings.name, 'Sam');
  assert.deepEqual(state.prGoals, { Deadlift: 200 });
  assert.deepEqual(state.weeks, { '1': { dates: { mon: '2026-11-23' } } }, 'training history is untouched');
  assert.equal(seen.at(-1).source, 'storage');
});

test('the pre-migration snapshot keeps the exact bytes', () => {
  const values = new Map();
  const storage = { setItem: (key, value) => values.set(key, value) };
  const raw = '{"schemaVersion":15,"settings":{"name":"Old"}}';
  assert.equal(snapshotBeforeMigration(storage, 'hybrid_engine_v2_state', raw), true);
  assert.equal(values.get('hybrid_engine_v2_state_pre_migration'), raw);
  assert.equal(snapshotBeforeMigration(null, 'x', raw), false);
});
