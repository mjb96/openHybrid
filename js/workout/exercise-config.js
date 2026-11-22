// @ts-check
// =============================================================================
// EXERCISE CONFIG — durable per-exercise preferences.
//
// Rest overrides keep their existing name-keyed `settings.restOverrides` shape
// because the timer engine already reads it. Warm-up mode, note and a private
// reference link are new, optional additions under `settings.exercisePrefs`,
// keyed by canonical ID when the catalogue knows the lift and by a normalised
// name otherwise. Nothing is rewritten; absence means the old behaviour.
// =============================================================================
import { resolveExercise } from '../exercises/catalog.js';
import { safeExternalHttpUrl } from '../util.js';
import { isBodyweightExercise, resolvedLoadMode } from './load-mode.js';
import { defaultBasisForExercise, normalizeBasis } from './load-basis.js';

export const WARMUP_MODE = Object.freeze({ INHERIT: 'inherit', AUTO: 'auto', OFF: 'off' });

/** Stable key that follows catalogue alias resolution. */
export function exerciseConfigKey(name) {
  const canonical = resolveExercise(name);
  if (canonical?.id) return `id:${canonical.id}`;
  return `name:${String(name || '').trim().toLowerCase()}`;
}

/** Durable preferences for one exercise; never returns a shared object. */
export function getExercisePrefs(state, name) {
  const prefs = state?.settings?.exercisePrefs;
  const value = prefs?.[exerciseConfigKey(name)];
  return value && typeof value === 'object' ? { ...value } : {};
}

/** Mutate one preference. `undefined`/'' removes the key. */
export function setExercisePref(state, name, patch = {}) {
  if (!state) return false;
  if (!state.settings) state.settings = {};
  if (!state.settings.exercisePrefs || typeof state.settings.exercisePrefs !== 'object') {
    state.settings.exercisePrefs = {};
  }
  const key = exerciseConfigKey(name);
  const current = state.settings.exercisePrefs[key] && typeof state.settings.exercisePrefs[key] === 'object'
    ? { ...state.settings.exercisePrefs[key] }
    : {};
  for (const [field, value] of Object.entries(patch)) {
    if (value == null || value === '') delete current[field];
    else current[field] = value;
  }
  if (Object.keys(current).length) state.settings.exercisePrefs[key] = current;
  else delete state.settings.exercisePrefs[key];
  return true;
}

export function getExerciseNote(state, name) {
  return String(getExercisePrefs(state, name).note || '').trim();
}

/**
 * The athlete's private reference URL. Sanitised on READ, so a value that
 * arrived from an old/imported state can never reach an href.
 */
export function getExerciseLink(state, name) {
  return safeExternalHttpUrl(getExercisePrefs(state, name).link);
}

/**
 * Store/clear a reference link. Blank clears it; an invalid non-blank value is
 * refused and leaves the existing link untouched.
 */
export function setExerciseLink(state, name, url) {
  const raw = String(url ?? '').trim();
  const safe = safeExternalHttpUrl(raw);
  if (raw && !safe) return false;
  setExercisePref(state, name, { link: safe || null });
  return true;
}

export function getExerciseWarmupMode(state, name) {
  const mode = getExercisePrefs(state, name).warmup;
  return mode === WARMUP_MODE.AUTO || mode === WARMUP_MODE.OFF ? mode : WARMUP_MODE.INHERIT;
}

/** Per-exercise mode overrides the global switch when set. */
export function shouldAutoWarmup(state, name) {
  const mode = getExerciseWarmupMode(state, name);
  if (mode === WARMUP_MODE.OFF) return false;
  if (mode === WARMUP_MODE.AUTO) return true;
  return state?.settings?.autoWarmupRamp === true;
}

/** Existing rest override for this lift, or null for the default. */
export function getExerciseRestOverride(state, name) {
  const value = state?.settings?.restOverrides?.[name];
  const seconds = Number(value);
  return Number.isFinite(seconds) ? seconds : null;
}

/** Set/clear the name-keyed rest override used by the timer engine. */
export function setExerciseRestOverride(state, name, seconds) {
  if (!state) return false;
  if (!state.settings) state.settings = {};
  if (!state.settings.restOverrides || typeof state.settings.restOverrides !== 'object') {
    state.settings.restOverrides = {};
  }
  if (seconds == null) delete state.settings.restOverrides[name];
  else state.settings.restOverrides[name] = Math.max(0, Math.min(600, Math.round(Number(seconds) || 0)));
  return true;
}

/** The load mode a NEW row of this exercise starts in. */
export function preferredLoadMode(state, name) {
  const pref = getExercisePrefs(state, name).loadMode;
  if (pref === 'assisted' && !isBodyweightExercise(name)) return resolvedLoadMode({}, name);
  if (pref === 'weighted' || pref === 'bodyweight' || pref === 'assisted' || pref === 'banded') {
    return pref;
  }
  return resolvedLoadMode({}, name);
}

/** The weight meaning a NEW set of this exercise starts in. */
export function preferredLoadBasis(state, name) {
  const pref = getExercisePrefs(state, name).basis;
  return normalizeBasis(pref || defaultBasisForExercise(name));
}
