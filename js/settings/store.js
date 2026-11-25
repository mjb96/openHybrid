// @ts-check
// =============================================================================
// SETTINGS STORE (js/settings/store.js)
//
// One reactive accessor over the registered settings. It does not create a
// second copy of state: values stay in `appState` at their descriptor path, and
// every write validates against the registry before mutating and persisting.
//
// Subscriptions are selector-based (key, page, section or '*'), so a row can
// redraw without re-rendering the whole tree. Cross-tab/window sync copies only
// registered setting values from a `storage` event — never training history —
// into the live state.
// =============================================================================
import {
  SETTINGS_REGISTRY,
  readSetting,
  settingEnabled,
  settingSummary,
  settingVisible,
  settingsEntry,
  validateSettingValue,
  writeSetting,
} from './registry.js';

export class SettingsValidationError extends Error {
  /** @param {string} key @param {string} reason */
  constructor(key, reason) {
    super(`${key}: ${reason}`);
    this.name = 'SettingsValidationError';
    this.key = key;
    this.reason = reason;
  }
}

const clone = (value) => {
  if (value === undefined) return undefined;
  try { return structuredClone(value); } catch { return JSON.parse(JSON.stringify(value)); }
};
const same = (a, b) => {
  if (a === b) return true;
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

/**
 * @param {{
 *   getState: () => any,
 *   save?: (suppressToast?: boolean) => unknown,
 *   storageKey?: string,
 *   windowRef?: Window|null,
 *   onChange?: ((detail: any) => void)|null,
 * }} options
 */
export function createSettingsStore(options) {
  const getState = options.getState;
  const save = options.save || (() => {});
  const storageKey = options.storageKey || 'hybrid_engine_v2_state';
  const windowRef = options.windowRef || (typeof window !== 'undefined' ? window : null);
  const listeners = new Set();
  /** @type {Set<(detail: any) => void>} */
  const onChanges = new Set();
  if (typeof options.onChange === 'function') onChanges.add(options.onChange);

  function matches(selector, key) {
    if (!selector || selector === '*') return true;
    if (selector === key) return true;
    const entry = settingsEntry(key);
    if (!entry) return false;
    if (selector.startsWith('page:')) return entry.page === selector.slice(5);
    if (selector.startsWith('section:')) return entry.section === selector.slice(8);
    if (selector.startsWith('key:')) return entry.key === selector.slice(4);
    return false;
  }

  /** @param {string} selector @param {(detail: any) => void} fn */
  function subscribe(selector, fn) {
    const entry = { selector: selector || '*', fn };
    listeners.add(entry);
    return () => listeners.delete(entry);
  }

  function notify(keys, detail = {}) {
    const unique = [...new Set(keys)].filter(Boolean);
    if (!unique.length) return;
    const payload = { keys: unique, ...detail };
    for (const entry of [...listeners]) {
      if (unique.some((key) => matches(entry.selector, key))) entry.fn(payload);
    }
    for (const fn of [...onChanges]) {
      try { fn(payload); } catch (error) { console.warn('Settings change handler failed:', error); }
    }
  }

  function get(key) {
    const entry = settingsEntry(key);
    if (!entry) return undefined;
    return readSetting(getState(), entry);
  }

  function describe(key) {
    const entry = settingsEntry(key);
    if (!entry) return null;
    const state = getState();
    const enabled = settingEnabled(state, entry);
    return {
      entry,
      value: readSetting(state, entry),
      visible: settingVisible(state, entry),
      enabled: enabled.ok,
      disabledReason: enabled.ok ? '' : (enabled.reason || 'Not available.'),
      summary: settingSummary(entry, state),
    };
  }

  function set(key, value, setOptions = {}) {
    const entry = settingsEntry(key);
    if (!entry) throw new SettingsValidationError(String(key), 'not registered');
    const check = validateSettingValue(entry, value);
    if (!check.ok) throw new SettingsValidationError(entry.key, check.reason || 'invalid value');
    const state = getState();
    const before = clone(readSetting(state, entry));
    if (same(before, value)) return value;
    writeSetting(state, entry, value);
    if (setOptions.save !== false) save(true);
    notify([entry.key], { source: setOptions.source || 'ui', before, after: clone(value) });
    return value;
  }

  /**
   * Validate every change before mutating, then apply them together.
   * @param {Record<string, any>} changes
   * @param {{save?: boolean, source?: string}} [setOptions]
   */
  function setMany(changes, setOptions = {}) {
    const entries = [];
    for (const [key, value] of Object.entries(changes || {})) {
      const entry = settingsEntry(key);
      if (!entry) throw new SettingsValidationError(key, 'not registered');
      const check = validateSettingValue(entry, value);
      if (!check.ok) throw new SettingsValidationError(entry.key, check.reason || 'invalid value');
      entries.push([entry, value]);
    }
    const state = getState();
    const before = entries.map(([entry]) => [entry.key, clone(readSetting(state, entry))]);
    const changed = [];
    for (const [entry, value] of entries) {
      if (same(readSetting(state, entry), value)) continue;
      writeSetting(state, entry, value);
      changed.push(entry.key);
    }
    if (changed.length && setOptions.save !== false) save(true);
    if (changed.length) notify(changed, { source: setOptions.source || 'bulk', before: Object.fromEntries(before), after: clone(changes) });
    return { before: Object.fromEntries(before), after: clone(changes), changed };
  }

  function snapshot(keys = null) {
    const state = getState();
    const list = keys ? keys.map((key) => settingsEntry(key)).filter(Boolean) : SETTINGS_REGISTRY;
    return Object.fromEntries(list.map((entry) => [entry.key, clone(readSetting(state, entry))]));
  }

  function restore(values, setOptions = {}) {
    return setMany(values || {}, { ...setOptions, source: setOptions.source || 'undo' });
  }

  function resetPage(page) {
    const state = getState();
    const entries = SETTINGS_REGISTRY.filter((entry) => entry.page === page && !entry.deprecated && entry.type !== 'system');
    const before = Object.fromEntries(entries.map((entry) => [entry.key, clone(readSetting(state, entry))]));
    const defaults = Object.fromEntries(entries.map((entry) => [entry.key, clone(entry.default)]));
    const result = setMany(defaults, { save: true, source: 'reset' });
    return { page, before, after: defaults, changed: result.changed };
  }

  function summary(key) {
    const entry = settingsEntry(key);
    return entry ? settingSummary(entry, getState()) : '';
  }

  function syncFromRaw(raw, source = 'storage') {
    let parsed;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return []; }
    if (!parsed || typeof parsed !== 'object') return [];
    const state = getState();
    const changed = [];
    for (const entry of SETTINGS_REGISTRY) {
      const incoming = readSetting(parsed, entry);
      const current = readSetting(state, entry);
      if (same(current, incoming)) continue;
      writeSetting(state, entry, clone(incoming));
      changed.push(entry.key);
    }
    if (changed.length) notify(changed, { source });
    return changed;
  }

  if (windowRef?.addEventListener) {
    windowRef.addEventListener('storage', (event) => {
      if (event.key !== storageKey || !event.newValue) return;
      syncFromRaw(event.newValue, 'storage');
    });
  }

  return { get, set, setMany, subscribe, describe, snapshot, restore, resetPage, summary, syncFromRaw, notify };
}

let _store = null;

/** @param {{getState:()=>any, save?:(suppressToast?:boolean)=>unknown, onChange?:(detail:any)=>void}} options */
export function configureSettingsStore(options) {
  _store = createSettingsStore(options);
  return _store;
}

export function settingsStore() {
  return _store;
}
