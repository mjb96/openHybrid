// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EQUIPMENT_KEYS,
  DEFAULT_PROFILE_ID,
  STANDARD_PLATE_SETUP,
  ensureEquipmentProfiles,
  getActiveEquipmentProfile,
  applyActiveEquipment,
  projectActiveEquipmentProfile,
  switchEquipmentProfile,
  setActiveEquipmentKey,
  updateActiveBandWeights,
  addEquipmentProfile,
  renameEquipmentProfile,
  deleteEquipmentProfile,
  normalizeEquipment,
  normalizeBandWeights,
  normalizePlateSetup,
  parsePlateList,
  getActivePlateSetup,
  setActivePlateSetup,
  resetActivePlateSetup,
  getActiveDumbbells,
  setActiveDumbbells,
  getActiveMachineStack,
  setActiveMachineStack,
  removeActiveMachineStack,
} from '../js/equipment-profiles.js';
import { migrateState, CURRENT_SCHEMA_VERSION } from '../js/state/migrations.js';
import { onboardingSettings } from '../js/onboarding/preferences.js';

const baseState = () => ({
  settings: {
    equipment: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true },
    bandWeights: { L: 10, M: 20, H: 30 },
  },
});

test('ensure seeds one profile from the legacy kit', () => {
  const state = baseState();
  const profiles = ensureEquipmentProfiles(state);
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].id, DEFAULT_PROFILE_ID);
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
  assert.equal(profiles[0].equipment.bands, false);
  assert.deepEqual(profiles[0].bandWeights, { L: 10, M: 20, H: 30 });
  assert.deepEqual(profiles[0].plateSetup, {
    kg: { bar: STANDARD_PLATE_SETUP.kg.bar, plates: [...STANDARD_PLATE_SETUP.kg.plates], counts: {} },
    lb: { bar: STANDARD_PLATE_SETUP.lb.bar, plates: [...STANDARD_PLATE_SETUP.lb.plates], counts: {} },
  });
});

test('an onboarding home answer becomes the active profile and survives the next boot', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  const prefs = onboardingSettings({ equipmentTier: 'home' });
  Object.assign(state.settings, prefs);
  applyActiveEquipment(state, prefs.equipment);

  // Simulate the next launch: boot re-ensures and reprojects the profile.
  ensureEquipmentProfiles(state);
  projectActiveEquipmentProfile(state);

  assert.equal(state.settings.equipmentTier, 'home');
  assert.equal(state.settings.equipment.barbell, false);
  assert.equal(state.settings.equipment.rack, false);
  assert.equal(state.settings.equipment.dumbbells, true);
  assert.equal(getActiveEquipmentProfile(state).equipment.barbell, false);
});

test('switching profiles projects its equipment and band weights', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  state.settings.equipmentProfiles.push({
    id: 'eqp_home',
    name: 'Home',
    equipment: { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true },
    bandWeights: { L: 5, M: 15, H: 25 },
  });

  assert.equal(switchEquipmentProfile(state, 'eqp_home'), true);
  assert.equal(state.settings.activeEquipmentProfileId, 'eqp_home');
  assert.equal(state.settings.equipment.bands, true);
  assert.equal(state.settings.equipment.cables, false);
  assert.deepEqual(state.settings.bandWeights, { L: 5, M: 15, H: 25 });
  assert.equal(switchEquipmentProfile(state, 'missing'), false);
});

test('toggling equipment and bands edits only the active profile', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  addEquipmentProfile(state, 'Home');
  const home = getActiveEquipmentProfile(state);

  setActiveEquipmentKey(state, 'bands', true);
  setActiveEquipmentKey(state, 'cables', false);
  updateActiveBandWeights(state, { M: 12 });

  assert.equal(getActiveEquipmentProfile(state).equipment.bands, true);
  assert.equal(getActiveEquipmentProfile(state).equipment.cables, false);
  assert.equal(state.settings.equipment.bands, true);
  assert.deepEqual(state.settings.bandWeights, { L: 10, M: 12, H: 30 });

  switchEquipmentProfile(state, DEFAULT_PROFILE_ID);
  assert.equal(getActiveEquipmentProfile(state).equipment.bands, false);
  assert.equal(state.settings.equipment.bands, false);
  assert.equal(home.id !== DEFAULT_PROFILE_ID, true);
});

test('adding a profile copies the active kit, becomes active and uses a unique id', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActiveEquipmentKey(state, 'bands', true);
  setActivePlateSetup(state, 'kg', { bar: 15, plates: [20, 10, 5, 2.5] });

  const first = addEquipmentProfile(state);
  const second = addEquipmentProfile(state);
  assert.equal(first.name, 'Gym 2');
  assert.equal(second.name, 'Gym 3');
  assert.notEqual(first.id, second.id);
  assert.equal(state.settings.activeEquipmentProfileId, second.id);
  assert.equal(second.equipment.bands, true);
  assert.equal(second.bandWeights.L, 10);
  assert.deepEqual(second.plateSetup.kg, { bar: 15, plates: [20, 10, 5, 2.5], counts: {} });
});

test('renaming rejects blank names and trims real ones', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  assert.equal(renameEquipmentProfile(state, DEFAULT_PROFILE_ID, '   '), false);
  assert.equal(getActiveEquipmentProfile(state).name, 'My gym');
  assert.equal(renameEquipmentProfile(state, DEFAULT_PROFILE_ID, '  Commercial gym  '), true);
  assert.equal(getActiveEquipmentProfile(state).name, 'Commercial gym');
});

test('deleting the last profile is refused; deleting the active one switches', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  assert.equal(deleteEquipmentProfile(state, DEFAULT_PROFILE_ID), false);

  addEquipmentProfile(state, 'Home');
  const homeId = getActiveEquipmentProfile(state).id;
  assert.equal(deleteEquipmentProfile(state, homeId), true);
  assert.equal(getActiveEquipmentProfile(state).id, DEFAULT_PROFILE_ID);
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
});

test('normalizers fill the core kit and clamp band weights', () => {
  const equipment = normalizeEquipment({ bands: true, cables: false });
  for (const key of EQUIPMENT_KEYS) assert.equal(typeof equipment[key], 'boolean');
  assert.equal(equipment.barbell, true);
  assert.equal(equipment.bands, true);
  assert.equal(equipment.cables, false);
  assert.deepEqual(normalizeBandWeights({ L: -2, M: '15', H: null }), { L: 10, M: 15, H: 30 });
});

test('plate setup is per profile and per unit', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActivePlateSetup(state, 'kg', { bar: 15, plates: '25, 20, 20, 10, 5' });
  assert.deepEqual(getActivePlateSetup(state, 'kg'), { bar: 15, plates: [25, 20, 10, 5], counts: {} });
  assert.deepEqual(getActivePlateSetup(state, 'lb'), {
    bar: STANDARD_PLATE_SETUP.lb.bar,
    plates: [...STANDARD_PLATE_SETUP.lb.plates],
    counts: {},
  });

  setActivePlateSetup(state, 'lb', { bar: 35, plates: [45, 25, 10] });
  assert.deepEqual(getActivePlateSetup(state, 'kg'), { bar: 15, plates: [25, 20, 10, 5], counts: {} });
  assert.deepEqual(getActivePlateSetup(state, 'lb'), { bar: 35, plates: [45, 25, 10], counts: {} });
  // Settings stores 'lbs'; both spellings resolve to the lb setup.
  assert.deepEqual(getActivePlateSetup(state, 'lbs'), { bar: 35, plates: [45, 25, 10], counts: {} });

  addEquipmentProfile(state, 'Home');
  setActivePlateSetup(state, 'kg', { bar: 10, plates: [10, 5, 2.5] });
  switchEquipmentProfile(state, DEFAULT_PROFILE_ID);
  assert.deepEqual(getActivePlateSetup(state, 'kg'), { bar: 15, plates: [25, 20, 10, 5], counts: {} });
});

test('plate setup validates and resets without inventing a plate', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  assert.deepEqual(parsePlateList('25, 20 15; 10,25'), [25, 20, 15, 10]);
  assert.deepEqual(parsePlateList(['5', '2.5', 'oops', '-1', '0']), [5, 2.5]);
  assert.deepEqual(normalizePlateSetup({ kg: { bar: -1, plates: [] } }).kg, {
    bar: STANDARD_PLATE_SETUP.kg.bar,
    plates: [...STANDARD_PLATE_SETUP.kg.plates],
    counts: {},
  });

  setActivePlateSetup(state, 'kg', { bar: 15, plates: [20, 10] });
  resetActivePlateSetup(state, 'kg');
  assert.deepEqual(getActivePlateSetup(state, 'kg'), {
    bar: STANDARD_PLATE_SETUP.kg.bar,
    plates: [...STANDARD_PLATE_SETUP.kg.plates],
    counts: {},
  });
});

test('plate counts persist per size and reset with the standard set', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActivePlateSetup(state, 'kg', { bar: 20, plates: [25, 20, 10, 5], counts: { 25: 2, 20: 0, 5: 3 } });
  assert.deepEqual(getActivePlateSetup(state, 'kg').counts, { 25: 2, 20: 0, 5: 3 });

  // Saving the bar/plates without counts keeps the inventory.
  setActivePlateSetup(state, 'kg', { bar: 15 });
  assert.deepEqual(getActivePlateSetup(state, 'kg'), {
    bar: 15, plates: [25, 20, 10, 5], counts: { 25: 2, 20: 0, 5: 3 },
  });

  resetActivePlateSetup(state, 'kg');
  assert.deepEqual(getActivePlateSetup(state, 'kg').counts, {});
});

test('dumbbell ladders are per profile and per unit', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActiveDumbbells(state, 'kg', '5, 7.5, 10, 10, 12.5');
  assert.deepEqual(getActiveDumbbells(state, 'kg'), [5, 7.5, 10, 12.5]);
  assert.deepEqual(getActiveDumbbells(state, 'lb'), []);
  setActiveDumbbells(state, 'lbs', [10, 15, 20]);
  assert.deepEqual(getActiveDumbbells(state, 'lb'), [10, 15, 20]);

  addEquipmentProfile(state, 'Home');
  assert.deepEqual(getActiveDumbbells(state, 'kg'), [5, 7.5, 10, 12.5]);
  setActiveDumbbells(state, 'kg', [2.5, 5]);
  switchEquipmentProfile(state, DEFAULT_PROFILE_ID);
  assert.deepEqual(getActiveDumbbells(state, 'kg'), [5, 7.5, 10, 12.5]);
});

test('machine stacks are keyed by exercise and unit', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  setActiveMachineStack(state, 'leg_press', 'kg', '10, 20, 30, 35');
  assert.deepEqual(getActiveMachineStack(state, 'leg_press', 'kg'), [10, 20, 30, 35]);
  assert.deepEqual(getActiveMachineStack(state, 'leg_press', 'lb'), []);
  setActiveMachineStack(state, 'leg_press', 'lb', [25, 50]);
  assert.deepEqual(getActiveMachineStack(state, 'leg_press', 'lbs'), [25, 50]);
  setActiveMachineStack(state, 'leg_press', 'kg', []);
  assert.deepEqual(getActiveMachineStack(state, 'leg_press', 'kg'), []);
  removeActiveMachineStack(state, 'leg_press');
  assert.deepEqual(getActiveMachineStack(state, 'leg_press', 'lb'), []);
});

test('an imported profile projection is repaired on demand', () => {
  const state = baseState();
  ensureEquipmentProfiles(state);
  state.settings.equipment.cables = false;
  projectActiveEquipmentProfile(state);
  assert.equal(state.settings.equipment.cables, true);
});

test('v5 state migrates to an equipment profile without changing the kit', () => {
  const state = {
    schemaVersion: 5,
    settings: {
      equipment: { barbell: true, rack: false, dumbbells: true, cables: false, pullupBar: true, bands: true },
      bandWeights: { L: 5, M: 15, H: 25 },
    },
  };
  migrateState(state);
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION);
  const profile = state.settings.equipmentProfiles[0];
  assert.equal(profile.id, DEFAULT_PROFILE_ID);
  assert.equal(profile.equipment.bands, true);
  assert.equal(profile.equipment.rack, false);
  assert.deepEqual(profile.bandWeights, { L: 5, M: 15, H: 25 });
  assert.equal(state.settings.activeEquipmentProfileId, DEFAULT_PROFILE_ID);
});
