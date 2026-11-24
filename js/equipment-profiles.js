// @ts-check
// =============================================================================
// EQUIPMENT PROFILES (js/equipment-profiles.js)
//
// A lifter's kit is not constant: the commercial gym has cables and a rack, the
// home setup has bands and dumbbells. Profiles let one account carry both
// without re-ticking every box before a session.
//
// `settings.equipmentProfiles` is the source of truth. `settings.equipment` and
// `settings.bandWeights` remain the ACTIVE profile's projection because the
// program-fit, swap and plate paths already read those fields. Switching a
// profile projects it back onto them, so no caller needs to know about profiles.
//
// Pure module — no DOM, no storage. Unit-tested in tests/equipment_profiles.test.js.
// =============================================================================

import { KG_BAR, LB_BAR, KG_PLATES, LB_PLATES } from './workout/plates.js';

export const EQUIPMENT_KEYS = Object.freeze([
  'barbell', 'rack', 'dumbbells', 'cables', 'pullupBar',
  'bands', 'kettlebells', 'ezBar', 'treadmill',
]);

/** Equipment every gym is assumed to have unless a profile says otherwise. */
export const CORE_EQUIPMENT_KEYS = Object.freeze([
  'barbell', 'rack', 'dumbbells', 'cables', 'pullupBar',
]);

export const DEFAULT_BAND_WEIGHTS = Object.freeze({ L: 10, M: 20, H: 30 });
export const DEFAULT_PROFILE_ID = 'eqp_default';
export const MAX_PROFILE_NAME = 32;
export const PLATE_UNITS = Object.freeze(['kg', 'lb']);

/** Standard bar/plate sets, used when a profile has no override. */
export const STANDARD_PLATE_SETUP = Object.freeze({
  kg: Object.freeze({ bar: KG_BAR, plates: Object.freeze([...KG_PLATES]), counts: Object.freeze({}) }),
  lb: Object.freeze({ bar: LB_BAR, plates: Object.freeze([...LB_PLATES]), counts: Object.freeze({}) }),
});

const CORE = new Set(CORE_EQUIPMENT_KEYS);

/**
 * @param {unknown} value
 * @returns {string}
 */
function cleanName(value) {
  return String(value == null ? '' : value).trim().slice(0, MAX_PROFILE_NAME);
}

/**
 * Normalise an equipment map, filling unspecified keys with the same defaults
 * the Settings screen has always used (core kit on, optional kit off).
 * @param {any} raw
 * @returns {Record<string, boolean>}
 */
export function normalizeEquipment(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  /** @type {Record<string, boolean>} */
  const out = {};
  for (const key of EQUIPMENT_KEYS) {
    out[key] = source[key] == null ? CORE.has(key) : !!source[key];
  }
  return out;
}

/**
 * @param {any} raw
 * @returns {{ L: number, M: number, H: number }}
 */
export function normalizeBandWeights(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  /** @param {'L'|'M'|'H'} key */
  const read = (key) => {
    const value = parseFloat(source[key]);
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_BAND_WEIGHTS[key];
  };
  return { L: read('L'), M: read('M'), H: read('H') };
}

/**
 * Parse a weight ladder ("5, 7.5, 10") or an array into positive finite values,
 * deduped and sorted lightest first. Empty means "no ladder configured".
 * @param {unknown} value
 * @returns {number[]}
 */
export function normalizeWeightList(value) {
  const parts = Array.isArray(value)
    ? value
    : String(value == null ? '' : value).split(/[,;\s]+/);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const n = parseFloat(part);
    if (!Number.isFinite(n) || n <= 0) continue;
    const key = String(n);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out.sort((a, b) => a - b);
}

/**
 * @param {any} raw
 * @returns {{ kg: number[], lb: number[] }}
 */
export function normalizeDumbbells(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return { kg: normalizeWeightList(source.kg), lb: normalizeWeightList(source.lb) };
}

/**
 * Per-profile machine weight ladders, keyed by exercise id. A stack belongs to
 * one unit; the other unit simply has no ladder.
 * @param {any} raw
 * @returns {Record<string, { unit: 'kg'|'lb', weights: number[] }>}
 */
export function normalizeMachineStacks(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  /** @type {Record<string, { unit: 'kg'|'lb', weights: number[] }>} */
  const out = {};
  for (const [rawKey, rawStack] of Object.entries(source)) {
    const key = String(rawKey || '').trim();
    if (!key || !rawStack || typeof rawStack !== 'object') continue;
    const weights = normalizeWeightList(/** @type {any} */ (rawStack).weights);
    if (!weights.length) continue;
    out[key] = { unit: /** @type {any} */ (rawStack).unit === 'lb' ? 'lb' : 'kg', weights };
  }
  return out;
}

/**
 * Parse a plate list from UI text ("25, 20, 10") or an array. Positive finite
 * values only, deduped and sorted heaviest first.
 * @param {unknown} value
 * @returns {number[]}
 */
export function parsePlateList(value) {
  const parts = Array.isArray(value)
    ? value
    : String(value == null ? '' : value).split(/[,;\s]+/);
  const seen = new Set();
  const out = [];
  for (const part of parts) {
    const n = parseFloat(part);
    if (!Number.isFinite(n) || n <= 0) continue;
    const key = String(n);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out.sort((a, b) => b - a);
}

/**
 * Parse optional plate counts (pairs per size) from an object keyed by size or
 * from an array aligned with `plates`. Missing/blank sizes mean "unlimited";
 * zero means the size is owned but none are available. Only sizes in the
 * current plate list survive.
 * @param {unknown} value
 * @param {number[]} plates
 * @returns {Record<string, number>}
 */
export function normalizePlateCounts(value, plates) {
  /** @type {Record<string, number>} */
  const out = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const plate of plates) {
    const raw = value[String(plate)];
    if (raw == null || raw === '') continue;
    const count = Number(raw);
    if (Number.isInteger(count) && count >= 0) out[String(plate)] = count;
  }
  return out;
}

/**
 * @param {any} raw
 * @param {'kg'|'lb'} unit
 */
function normalizePlateUnit(raw, unit) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const standard = STANDARD_PLATE_SETUP[unit];
  const bar = parseFloat(source.bar);
  const plates = parsePlateList(source.plates);
  const resolvedPlates = plates.length ? plates : [...standard.plates];
  return {
    bar: Number.isFinite(bar) && bar > 0 ? bar : standard.bar,
    plates: resolvedPlates,
    counts: normalizePlateCounts(source.counts, resolvedPlates),
  };
}

/**
 * @param {any} raw
 * @returns {{ kg: { bar: number, plates: number[], counts: Record<string, number> }, lb: { bar: number, plates: number[], counts: Record<string, number> } }}
 */
export function normalizePlateSetup(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    kg: normalizePlateUnit(source.kg, 'kg'),
    lb: normalizePlateUnit(source.lb, 'lb'),
  };
}

/**
 * @param {any} profile
 * @param {string} fallbackId
 */
function normalizeProfile(profile, fallbackId) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    id: typeof source.id === 'string' && source.id.trim() ? source.id.trim() : fallbackId,
    name: cleanName(source.name) || 'My gym',
    equipment: normalizeEquipment(source.equipment),
    bandWeights: normalizeBandWeights(source.bandWeights),
    plateSetup: normalizePlateSetup(source.plateSetup),
    dumbbells: normalizeDumbbells(source.dumbbells),
    machineStacks: normalizeMachineStacks(source.machineStacks),
  };
}

/** @param {any} state */
function ensureSettings(state) {
  if (!state.settings || typeof state.settings !== 'object' || Array.isArray(state.settings)) {
    state.settings = {};
  }
  return state.settings;
}

/**
 * Ensure at least one profile exists and that ids are unique and the active id
 * resolves. Seeds the first profile from legacy `settings.equipment` /
 * `settings.bandWeights` so existing accounts keep their kit.
 * Mutates `state.settings`; returns the normalized profile list.
 * @param {any} state
 * @returns {Array<{ id: string, name: string, equipment: Record<string, boolean>, bandWeights: { L: number, M: number, H: number }, plateSetup: { kg: { bar: number, plates: number[], counts: Record<string, number> }, lb: { bar: number, plates: number[], counts: Record<string, number> } }, dumbbells: { kg: number[], lb: number[] }, machineStacks: Record<string, { unit: 'kg'|'lb', weights: number[] }> }>}
 */
export function ensureEquipmentProfiles(state) {
  const settings = ensureSettings(state);
  const raw = Array.isArray(settings.equipmentProfiles) ? settings.equipmentProfiles : [];

  /** @type {any[]} */
  const profiles = [];
  const seen = new Set();
  for (let i = 0; i < raw.length; i++) {
    const profile = normalizeProfile(raw[i], `eqp_${i + 1}`);
    if (seen.has(profile.id)) {
      let n = profiles.length + 1;
      while (seen.has(`eqp_${n}`)) n++;
      profile.id = `eqp_${n}`;
    }
    seen.add(profile.id);
    profiles.push(profile);
  }

  if (profiles.length === 0) {
    profiles.push({
      id: DEFAULT_PROFILE_ID,
      name: 'My gym',
      equipment: normalizeEquipment(settings.equipment),
      bandWeights: normalizeBandWeights(settings.bandWeights),
      plateSetup: normalizePlateSetup(null),
      dumbbells: { kg: [], lb: [] },
      machineStacks: {},
    });
  }

  settings.equipmentProfiles = profiles;
  if (!profiles.some((profile) => profile.id === settings.activeEquipmentProfileId)) {
    settings.activeEquipmentProfileId = profiles[0].id;
  }
  return profiles;
}

/**
 * @param {any} state
 * @returns {{ id: string, name: string, equipment: Record<string, boolean>, bandWeights: { L: number, M: number, H: number }, plateSetup: { kg: { bar: number, plates: number[], counts: Record<string, number> }, lb: { bar: number, plates: number[], counts: Record<string, number> } }, dumbbells: { kg: number[], lb: number[] }, machineStacks: Record<string, { unit: 'kg'|'lb', weights: number[] }> }}
 */
export function getActiveEquipmentProfile(state) {
  const profiles = ensureEquipmentProfiles(state);
  const settings = ensureSettings(state);
  return profiles.find((profile) => profile.id === settings.activeEquipmentProfileId) || profiles[0];
}

/**
 * Copy the active profile onto the legacy projection fields.
 * @param {any} state
 */
export function projectActiveEquipmentProfile(state) {
  const settings = ensureSettings(state);
  const profile = getActiveEquipmentProfile(state);
  settings.equipment = { ...profile.equipment };
  settings.bandWeights = { ...profile.bandWeights };
  return profile;
}

/**
 * Apply an onboarding equipment answer to the ACTIVE profile and keep the
 * legacy projection in sync. Onboarding must never write `settings.equipment`
 * alone: boot reprojects the profile over it, which silently reverted a home
 * athlete to a full gym on the next launch.
 * @param {any} state
 * @param {Record<string, boolean>} equipment
 */
export function applyActiveEquipment(state, equipment) {
  const profile = getActiveEquipmentProfile(state);
  const next = { ...profile.equipment };
  for (const key of EQUIPMENT_KEYS) {
    if (Object.hasOwn(equipment || {}, key)) next[key] = !!equipment[key];
  }
  profile.equipment = next;
  const settings = ensureSettings(state);
  settings.equipment = { ...next };
  return profile;
}

/**
 * @param {any} state
 * @param {string} id
 * @returns {boolean} true when the id exists and became active
 */
export function switchEquipmentProfile(state, id) {
  const profiles = ensureEquipmentProfiles(state);
  const settings = ensureSettings(state);
  const profile = profiles.find((entry) => entry.id === id);
  if (!profile) return false;
  settings.activeEquipmentProfileId = profile.id;
  projectActiveEquipmentProfile(state);
  return true;
}

/**
 * Toggle one equipment key on the active profile and keep the projection in
 * sync. Unknown keys are rejected.
 * @param {any} state
 * @param {string} key
 * @param {boolean} enabled
 */
export function setActiveEquipmentKey(state, key, enabled) {
  if (!(EQUIPMENT_KEYS.includes(key))) return false;
  const profile = getActiveEquipmentProfile(state);
  profile.equipment = { ...profile.equipment, [key]: !!enabled };
  const settings = ensureSettings(state);
  settings.equipment = { ...profile.equipment };
  return true;
}

/**
 * @param {any} state
 * @param {{ L?: number, M?: number, H?: number }} weights
 */
export function updateActiveBandWeights(state, weights) {
  const profile = getActiveEquipmentProfile(state);
  profile.bandWeights = normalizeBandWeights({ ...profile.bandWeights, ...weights });
  const settings = ensureSettings(state);
  settings.bandWeights = { ...profile.bandWeights };
  return profile.bandWeights;
}

/** Settings stores 'kg'|'lbs'; plate setup keys are 'kg'|'lb'. */
function plateUnitKey(unit) {
  return unit === 'lb' || unit === 'lbs' ? 'lb' : 'kg';
}

/**
 * The active profile's bar/plates for one unit. Always returns a copy so callers
 * cannot mutate stored state.
 * @param {any} state
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @returns {{ bar: number, plates: number[], counts: Record<string, number> }}
 */
export function getActivePlateSetup(state, unit = 'kg') {
  const key = plateUnitKey(unit);
  const profile = getActiveEquipmentProfile(state);
  const setup = normalizePlateUnit(profile.plateSetup?.[key], key);
  return { bar: setup.bar, plates: [...setup.plates], counts: { ...setup.counts } };
}

/**
 * Replace the active profile's bar/plates for one unit. Omitted fields keep
 * their current values, so saving counts cannot wipe the bar or denominations.
 * @param {any} state
 * @param {'kg'|'lb'|'lbs'|string} unit
 * @param {{ bar?: number|string, plates?: unknown, counts?: unknown }} setup
 */
export function setActivePlateSetup(state, unit, setup) {
  const key = plateUnitKey(unit);
  const profile = getActiveEquipmentProfile(state);
  const current = normalizePlateUnit(profile.plateSetup?.[key], key);
  const next = normalizePlateUnit({ ...current, ...setup }, key);
  profile.plateSetup = {
    ...normalizePlateSetup(profile.plateSetup),
    [key]: next,
  };
  return { bar: next.bar, plates: [...next.plates], counts: { ...next.counts } };
}

/**
 * Restore the standard bar/plates for one unit on the active profile.
 * @param {any} state
 * @param {'kg'|'lb'|'lbs'|string} unit
 */
export function resetActivePlateSetup(state, unit) {
  const key = plateUnitKey(unit);
  const standard = STANDARD_PLATE_SETUP[key];
  return setActivePlateSetup(state, key, { bar: standard.bar, plates: [...standard.plates], counts: {} });
}

/**
 * The active profile's dumbbell ladder for one unit (lightest first).
 * @param {any} state
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @returns {number[]}
 */
export function getActiveDumbbells(state, unit = 'kg') {
  const key = plateUnitKey(unit);
  const profile = getActiveEquipmentProfile(state);
  return [...normalizeDumbbells(profile.dumbbells)[key]];
}

/**
 * @param {any} state
 * @param {'kg'|'lb'|'lbs'|string} unit
 * @param {unknown} weights
 * @returns {number[]}
 */
export function setActiveDumbbells(state, unit, weights) {
  const key = plateUnitKey(unit);
  const profile = getActiveEquipmentProfile(state);
  const list = normalizeWeightList(weights);
  profile.dumbbells = { ...normalizeDumbbells(profile.dumbbells), [key]: list };
  return [...list];
}

/**
 * The active profile's machine ladder for one exercise, or [] when this gym
 * has not recorded one for the current unit.
 * @param {any} state
 * @param {string} exerciseId
 * @param {'kg'|'lb'|'lbs'|string} [unit]
 * @returns {number[]}
 */
export function getActiveMachineStack(state, exerciseId, unit = 'kg') {
  const key = plateUnitKey(unit);
  const profile = getActiveEquipmentProfile(state);
  const stack = normalizeMachineStacks(profile.machineStacks)[String(exerciseId || '')];
  return stack && stack.unit === key ? [...stack.weights] : [];
}

/**
 * Save one machine's ladder. An empty list removes the entry.
 * @param {any} state
 * @param {string} exerciseId
 * @param {'kg'|'lb'|'lbs'|string} unit
 * @param {unknown} weights
 * @returns {number[]}
 */
export function setActiveMachineStack(state, exerciseId, unit, weights) {
  const key = plateUnitKey(unit);
  const id = String(exerciseId || '').trim();
  if (!id) return [];
  const profile = getActiveEquipmentProfile(state);
  const stacks = normalizeMachineStacks(profile.machineStacks);
  const list = normalizeWeightList(weights);
  if (list.length) stacks[id] = { unit: key, weights: list };
  else delete stacks[id];
  profile.machineStacks = stacks;
  return [...list];
}

/**
 * @param {any} state
 * @param {string} exerciseId
 * @returns {boolean}
 */
export function removeActiveMachineStack(state, exerciseId) {
  const id = String(exerciseId || '').trim();
  if (!id) return false;
  const profile = getActiveEquipmentProfile(state);
  const stacks = normalizeMachineStacks(profile.machineStacks);
  if (!(id in stacks)) return false;
  delete stacks[id];
  profile.machineStacks = stacks;
  return true;
}

/** @param {Array<{ id: string }>} profiles */
function nextProfileId(profiles) {
  const ids = new Set(profiles.map((profile) => profile.id));
  let n = 1;
  while (ids.has(`eqp_${n}`)) n++;
  return `eqp_${n}`;
}

/** @param {Array<{ name: string }>} profiles */
function nextProfileName(profiles) {
  const names = new Set(profiles.map((profile) => profile.name.toLowerCase()));
  let n = profiles.length + 1;
  while (names.has(`gym ${n}`.toLowerCase())) n++;
  return `Gym ${n}`;
}

/**
 * Add a profile seeded from the active kit, so the user only unticks what the
 * new location lacks. The new profile becomes active.
 * @param {any} state
 * @param {string} [name]
 */
export function addEquipmentProfile(state, name) {
  // getActiveEquipmentProfile() normalizes the stored list into a fresh array,
  // so take the list to push into AFTER reading the current profile.
  const current = getActiveEquipmentProfile(state);
  const profiles = ensureEquipmentProfiles(state);
  const profile = {
    id: nextProfileId(profiles),
    name: cleanName(name) || nextProfileName(profiles),
    equipment: { ...current.equipment },
    bandWeights: { ...current.bandWeights },
    plateSetup: normalizePlateSetup(current.plateSetup),
    dumbbells: normalizeDumbbells(current.dumbbells),
    machineStacks: normalizeMachineStacks(current.machineStacks),
  };
  profiles.push(profile);
  const settings = ensureSettings(state);
  settings.activeEquipmentProfileId = profile.id;
  projectActiveEquipmentProfile(state);
  return profile;
}

/**
 * Rename a profile. Empty names are rejected so the selector never shows a
 * blank option.
 * @param {any} state
 * @param {string} id
 * @param {string} name
 */
export function renameEquipmentProfile(state, id, name) {
  const profiles = ensureEquipmentProfiles(state);
  const next = cleanName(name);
  if (!next) return false;
  const profile = profiles.find((entry) => entry.id === id);
  if (!profile) return false;
  profile.name = next;
  return true;
}

/**
 * Delete a profile. The last profile cannot be deleted. When the active
 * profile goes, the first remaining profile becomes active and is projected.
 * @param {any} state
 * @param {string} id
 */
export function deleteEquipmentProfile(state, id) {
  const profiles = ensureEquipmentProfiles(state);
  if (profiles.length <= 1) return false;
  const index = profiles.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  const settings = ensureSettings(state);
  const wasActive = settings.activeEquipmentProfileId === id;
  profiles.splice(index, 1);
  if (wasActive) {
    settings.activeEquipmentProfileId = profiles[0].id;
    projectActiveEquipmentProfile(state);
  }
  return true;
}
