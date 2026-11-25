// ==========================================
// SETTINGS
// ==========================================
import {
  saveStateToLocalStorage, setAppState, cancelPendingLocalSave,
  setPersistenceSuspended, STORAGE_KEY, SAVED_AT_KEY, getProgramById,
} from './state.js';
import { writeMirror, clearMirror } from './state/mirror.js';
import { putRouteRecords, putRoutes, clearRouteDatabase, saveMapToDB } from './db.js';
import { parseImport } from './state/route-portability.js';
import { CURRENT_SCHEMA_VERSION, isStateMigrationError, migrateState } from './state/migrations.js';
import { APP_VERSION } from './constants.js';
import { buildTrainingContext, trainingContextFilename } from './portability/training-context.js';
import {
  setRestTiers, setRestTimerEnabled, setRestOverrides, initRestPersistence, setRestAlertConfig,
  clearRestTimerPersistence,
} from './timers.js';
import { todayKey, startOfProgramWeek } from './dates.js';
import { releaseWorkoutWakeLock } from './workout/keep-awake.js';
import { parseWorkoutCsv, applyWorkoutCsvImport, CSV_IMPORT_LIMITS, decodeCsvBytes } from './portability/import-workout-csv.js';
import { moduleEnabled, setModuleEnabled, applyModuleVisibility, hybridTrainingEnabled, setHybridTraining } from './modules.js';
import * as equipmentProfiles from './equipment-profiles.js';
import { convertStoredWeights, normalizeWeightUnit } from './metrics/weight-unit.js';
import { computeExercisePRs } from './engine.js';
import { latestWeighIn } from './metrics/bodyweight.js';
import { applyPalette, normalizePalette } from './theme.js';
import { applyThemeTokens } from './theme/tokens.js';
import { applyMotionPreference, normalizeMotionPreference } from './ui/motion.js';
import { looksLikeBodyCsv, parseBodyCsv, applyBodyweightCsvImport } from './portability/import-body-csv.js';
import {
  looksLikeMeasurementsCsv, parseMeasurementsCsv, applyMeasurementsCsvImport, hasBodyFatColumn,
} from './portability/import-measurements-csv.js';
import { buildFitCandidate, applyFitImports } from './portability/import-fit.js';
import { parseFitBuffer } from './garmin.js';
import { upsertRunSession, findImportedRunSession } from './state/run-sessions.js';
import { resolveExercise, EXERCISES } from './exercises/catalog.js';
import { exportResultMessage, saveTextExport } from './portability/export-service.js';
import {
  automaticBackupSupported,
  getAutomaticBackupStatus,
  chooseAutomaticBackupFolder,
  disableAutomaticBackup,
  buildCompleteBackup,
  runAutomaticBackup,
} from './portability/auto-backup.js';

const _esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Rest tier <-> "m:ss" helpers. Inputs accept "2:30", "150", or "2".
const _fmtRest = (sec) => {
  const n = parseInt(sec, 10) || 0;
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`;
};
const _parseRest = (str) => {
  if (str == null) return null;
  const s = String(str).trim();
  if (!s) return null;
  if (s.includes(':')) {
    const [m, sec] = s.split(':');
    return (parseInt(m, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  }
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};
import { showToast } from './state.js';
import { rearmReminder, notificationsGranted, cancelReminders } from './notifications.js';
import { confirmModal, textPromptModal } from './ui/confirm-modal.js';
import { renderAthleteProfile } from './athlete-profile.js';
import { isHealthBridgeAvailable, getHealthAvailability, connectAndSync, syncHealthConnect, describeFieldStatus } from './health/health-bridge.js';
import { HEALTH_FIELDS, normalizeSyncFields, selectedFieldIds, isSupportedField } from './health/health-fields.js';
import {
  importPreviewMessage,
  importCounts,
  isSafeImageDataUrl,
  validateImport,
  importReasonMessage,
} from './state/import-validate.js';
import { SETTINGS_TABS, settingsGroupForLabel, sectionMatchesQuery, firstMatchingRow } from './settings/nav.js';
import { SETTINGS_HASH, settingsHashForPage, settingsRouteFromHash } from './settings/route.js';
import { configureSettingsStore, settingsStore } from './settings/store.js';
import { profileSettingsHTML, renderSettingsHome, renderSettingsPage, workoutSettingsHTML } from './settings/render.js';
import { openManagedModal, closeManagedModal } from './ui/modal-stack.js';
import { settingAnchor, settingsEntry, settingsEntryByAnchor, settingsPageById, settingsPageForRoute } from './settings/registry.js';
import { REST_PRESETS, restPresetFor } from './settings/rest-presets.js';
import { DEFAULT_REST_TIERS } from './workout/rest-duration.js';

let _getState;
let _autoBackupUiRequest = 0;
let _settingsGroup = 'profile';
let _settingsRoutePushed = false;
let _settingsProfilePushed = false;
let _settingsHashBound = false;
let _settingsPreviousFocus = null;
let _settingsReturnScroll = 0;

function _applyResetEffects(page) {
  const state = _getState?.();
  if (!state) return;
  if (page === 'once.look') {
    _applyTheme(state.settings.theme || 'dark');
    applyPalette(document.documentElement, normalizePalette(state.settings.palette));
    applyMotionPreference(normalizeMotionPreference(state.settings.reducedMotion));
  } else if (page === 'once.modules') {
    applyModuleVisibility(state);
    document.dispatchEvent(new CustomEvent('app:modules-changed', { detail: { reset: true } }));
  } else if (page === 'training.reminders') {
    if (state.settings.notificationsEnabled) rearmReminder();
    else cancelReminders();
  } else if (page === 'training.timers') {
    setRestTiers(state.settings.restPeriods || DEFAULT_REST_TIERS);
    setRestAlertConfig({ sound: state.settings.restAlertSound !== false, volume: state.settings.restAlertVolume ?? 0.4 });
  }
}

function _showUndoToast(message, onUndo) {
  document.getElementById('settingsUndoToast')?.remove();
  const toast = document.createElement('div');
  toast.id = 'settingsUndoToast';
  toast.className = 's-undo';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span>${message}</span><button type="button" class="s-undo__btn">Undo</button>`;
  const close = () => toast.remove();
  toast.querySelector('.s-undo__btn')?.addEventListener('click', () => { close(); onUndo(); });
  document.body.appendChild(toast);
  setTimeout(close, 6000);
}

function _currentSettingsRoute() {
  if (typeof location === 'undefined') return '';
  return _settingsRouteFromHash(location.hash)?.page || '';
}

function _refreshSettingsSurface() {
  const route = _currentSettingsRoute();
  if (route) _showSettings(route);
  else {
    const host = document.getElementById('settingsPageHost');
    const state = _getState?.();
    const store = settingsStore();
    if (host && state && store) renderSettingsHome(host, state, store, document.getElementById('settingsSearch')?.value || '');
  }
}

function _openSettingResult(key) {
  const entry = settingsEntry(key);
  const page = entry ? settingsPageById(entry.page) : null;
  if (!entry || !page) return;
  openSettings(page.route, settingAnchor(entry));
}

/**
 * Apply one registered change. Existing setters remain the owners of side
 * effects (theme application, unit conversion, timers, notifications); the
 * fallback writes through the validated store.
 * @param {string} key
 * @param {any} value
 */
function _applySettingControl(key, value) {
  if (!settingsEntry(key)) return;
  const done = () => { _refreshSettingsSurface(); };
  switch (key) {
    case 'weightUnit': void setWeightUnit(value).then(done, done); return;
    case 'distanceUnit': setDistanceUnit(value); done(); return;
    case 'theme': setTheme(value); done(); return;
    case 'palette': setPalette(value); done(); return;
    case 'reducedMotion': setReducedMotion(value); done(); return;
    case 'fitnessGoal': setFitnessGoal(value); done(); return;
    case 'weightGoal': setWeightGoal(value); done(); return;
    case 'fitnessLevel': setFitnessLevel(value); done(); return;
    case 'weekStartDay': setWeekStartDay(value); done(); return;
    case 'fastingDefault': setFastingDefault(value); done(); return;
    case 'notificationsEnabled': setNotificationsEnabled(value); done(); return;
    case 'notifWeeklySummary': setNotifToggle('weeklySummary', value); done(); return;
    case 'notifStreak': setNotifToggle('streak', value); done(); return;
    case 'notifMissedWorkout': setNotifToggle('missed', value); done(); return;
    case 'notifFastingStage': setNotifToggle('fasting', value); done(); return;
    case 'restTimerEnabled': setRestTimerEnabledSetting(value); done(); return;
    case 'restAlertSound': setRestAlertSoundSetting(value); done(); return;
    case 'restAlertVolume': setRestAlertVolumeSetting(value); done(); return;
    case 'showPlateHints': setShowPlateHints(value); done(); return;
    case 'autoWarmupRamp': setAutoWarmupRamp(value); done(); return;
    case 'keepAwake': setKeepAwake(value); done(); return;
    case 'livePR': setLivePR(value); done(); return;
    case 'progressionIncrement': setProgressionIncrement(value); done(); return;
    case 'previousValuesScope': setPreviousValuesScope(value); done(); return;
    case 'autoAdvanceWeek': setAutoAdvanceWeek(value); done(); return;
    case 'hybridTraining': toggleHybridTraining(value); done(); return;
    case 'modules.running': toggleModule('running', value); done(); return;
    case 'modules.fasting': toggleModule('fasting', value); done(); return;
    case 'modules.health': toggleModule('health', value); done(); return;
    case 'modules.recovery': toggleModule('recovery', value); done(); return;
    default:
      try { settingsStore()?.set(key, value); done(); }
      catch (error) { showToast(error instanceof Error ? error.message : 'That setting could not be saved', true); }
  }
}

export function openWorkoutSettings() {
  const sheet = document.getElementById('workoutSettingsSheet');
  const host = document.getElementById('workoutSettingsContent');
  const state = _getState?.();
  const store = settingsStore();
  if (!sheet || !host || !state || !store) return;
  host.innerHTML = workoutSettingsHTML(state, store);
  sheet.classList.add('active');
  sheet.removeAttribute('inert');
  sheet.setAttribute('aria-hidden', 'false');
  openManagedModal(sheet, { initialFocus: '[data-action="close-workout-settings"]' });
}

export function closeWorkoutSettings() {
  const sheet = document.getElementById('workoutSettingsSheet');
  if (!sheet) return;
  sheet.classList.remove('active');
  sheet.setAttribute('aria-hidden', 'true');
  closeManagedModal(sheet);
}

export function initSettings(getStateFn) {
  _getState = getStateFn;
  configureSettingsStore({
    getState: () => _getState(),
    save: () => saveStateToLocalStorage(true),
    onChange: (detail) => {
      if (typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent('settings:changed', { detail }));
      }
    },
  });
  // Single source of truth for the displayed version (aligns with package.json
  // + Android versionName). No hardcoded string to drift out of date.
  const vEl = document.getElementById('settingsAppVersion');
  if (vEl) vEl.textContent = `openHybrid v${APP_VERSION}`;
  _setupSettingsNavigation();
  if (!_settingsHashBound && typeof window !== 'undefined') {
    _settingsHashBound = true;
    if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
      try { history.scrollRestoration = 'manual'; } catch { /* best effort */ }
    }
    window.addEventListener('hashchange', applySettingsRouteFromHash);
    document.addEventListener('click', (event) => {
      const target = event.target instanceof Element ? event.target.closest('[data-setting-segment], [data-setting-step], [data-action="open-settings-page"], [data-action="open-settings-result"], [data-action="open-workout-settings"], [data-action="close-workout-settings"], [data-action="reset-rest-override"], [data-action="reset-settings-page"], [data-action="open-customize"]') : null;
      if (!target) return;
      if (target.hasAttribute('data-setting-segment')) {
        const key = target.getAttribute('data-setting-segment') || '';
        const entry = settingsEntry(key);
        const raw = target.getAttribute('data-value') || '';
        const value = entry?.type === 'number' ? Number(raw) : raw;
        _applySettingControl(key, value);
        return;
      }
      if (target.hasAttribute('data-setting-step')) {
        const key = target.getAttribute('data-setting-step') || '';
        const entry = settingsEntry(key);
        const direction = Number(target.getAttribute('data-direction')) === 1 ? 1 : -1;
        const current = Number(settingsStore()?.get(key) ?? entry?.default ?? 0);
        let next = current + direction * (entry?.step || 1);
        if (entry?.key === 'restAlertVolume') next = Math.round((Number(settingsStore()?.get(key) ?? 0.4) * 100) + direction * 5);
        if (entry?.min != null) next = Math.max(entry.min, next);
        if (entry?.max != null) next = Math.min(entry.max, next);
        _applySettingControl(key, entry?.key === 'restAlertVolume' ? next / 100 : next);
        return;
      }
      if (target.getAttribute('data-action') === 'open-settings-page') {
        const page = target.getAttribute('data-context') || '';
        if (page) openSettings(page);
        return;
      }
      if (target.getAttribute('data-action') === 'reset-settings-page') {
        const page = target.getAttribute('data-page') || '';
        confirmModal({ title: 'Reset this page?', message: 'Every setting on this page returns to its default. Logged training is untouched.', confirmLabel: 'Reset page', danger: true })
          .then((confirmed) => {
            if (!confirmed) return;
            const result = settingsStore()?.resetPage(page);
            if (!result) return;
            _applyResetEffects(page);
            _refreshSettingsSurface();
            _showUndoToast(`${result.changed.length} setting${result.changed.length === 1 ? '' : 's'} reset`, () => {
              settingsStore()?.restore(result.before);
              _applyResetEffects(page);
              _refreshSettingsSurface();
            });
          });
        return;
      }
      if (target.getAttribute('data-action') === 'reset-rest-override') {
        const lift = target.getAttribute('data-lift') || '';
        const state = _getState?.();
        if (state && lift) {
          delete state.settings.restOverrides[lift];
          setRestOverrides(state.settings.restOverrides);
          saveStateToLocalStorage(true);
          _refreshSettingsSurface();
        }
        return;
      }
      if (target.getAttribute('data-action') === 'open-workout-settings') { openWorkoutSettings(); return; }
      if (target.getAttribute('data-action') === 'close-workout-settings') { closeWorkoutSettings(); return; }
      if (target.getAttribute('data-action') === 'open-settings-result') {
        _openSettingResult(target.getAttribute('data-context') || '');
      }
    });

    document.addEventListener('change', (event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.id === 'workoutEquipmentProfile') { selectEquipmentProfile(el.value); return; }
      const toggleKey = el.getAttribute('data-setting-key');
      if (toggleKey && el.type === 'checkbox') { _applySettingControl(toggleKey, el.checked); return; }
      const radioKey = el.getAttribute('data-setting-radio');
      if (radioKey && el.type === 'radio') { _applySettingControl(radioKey, el.value); return; }
      const textKey = el.getAttribute('data-setting-text');
      if (textKey) {
        const entry = settingsEntry(textKey);
        _applySettingControl(textKey, entry?.type === 'number' ? Number(el.value) : el.value);
      }
    });

    document.addEventListener('input', (event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      if (el.id === 'settingsSearch') {
        const host = document.getElementById('settingsPageHost');
        const state = _getState?.();
        const store = settingsStore();
        if (host && state && store) {
          renderSettingsHome(host, state, store, el.value);
          const next = document.getElementById('settingsSearch');
          if (next) { next.focus(); next.setSelectionRange(next.value.length, next.value.length); }
        }
        return;
      }
      const sliderKey = el.getAttribute('data-setting-slider');
      if (sliderKey) {
        const entry = settingsEntry(sliderKey);
        _applySettingControl(sliderKey, entry?.key === 'restAlertVolume' ? Number(el.value) / 100 : Number(el.value));
      }
    });

    document.addEventListener('keydown', (event) => {
      const overlay = document.getElementById('settingsOverlay');
      if (!overlay?.classList.contains('active')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeSettings(); return; }
      if (event.key !== 'Tab') return;
      const panel = document.querySelector('#settingsProfilePanel.active, #settingsPanel.active');
      if (!panel) return;
      const focusables = [...panel.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
        .filter((el) => el.getClientRects().length > 0);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
}

function _settingsSections() {
  return [...document.querySelectorAll('#settingsPanel .settings-section')];
}

/** Is this card hidden by a feature-module switch (not by the search filter)? */
function _sectionEnabledByModules(section) {
  const moduleId = section.getAttribute('data-module');
  return !moduleId || moduleEnabled(_getState?.(), moduleId);
}

function _setupSettingsNavigation() {
  const tabs = document.getElementById('settingsTabs');
  const search = document.getElementById('settingsSearch');
  if (!tabs) return;
  const sections = _settingsSections();
  sections.forEach((section) => {
    const label = section.querySelector('.settings-section-label:not(.settings-section-label--sub)')?.textContent?.trim() || '';
    section.dataset.settingsGroup = settingsGroupForLabel(label);
  });
  if (!tabs.childElementCount) {
    // These are FILTERS over one scrolling list, not a tablist with tabpanels.
    // Claiming role="tab" made assistive tech announce a nonexistent tabpanel
    // relationship (arrow keys, aria-controls, one-panel-per-tab). Buttons with
    // aria-pressed describe exactly what happens.
    tabs.setAttribute('role', 'group');
    tabs.innerHTML = SETTINGS_TABS.map((tab) => `<button type="button" class="settings-tab" data-settings-tab="${tab.id}" aria-pressed="false">${tab.label}</button>`).join('');
    tabs.addEventListener('click', (event) => {
      const button = /** @type {HTMLElement|null} */ (event.target instanceof Element ? event.target.closest('[data-settings-tab]') : null);
      if (!button) return;
      _settingsGroup = button.getAttribute('data-settings-tab') || 'profile';
      const input = document.getElementById('settingsSearch');
      if (input) input.value = '';
      const body = document.querySelector('#settingsPanel .settings-body');
      if (body) body.scrollTop = 0;
      _applySettingsFilter();
    });
    search?.addEventListener('input', () => {
      const body = document.querySelector('#settingsPanel .settings-body');
      if (body) body.scrollTop = 0;
      _applySettingsFilter();
    });
  }
  if (!document.getElementById('settingsNoResults')) {
    const empty = document.createElement('p');
    empty.id = 'settingsNoResults';
    empty.className = 'settings-empty';
    empty.setAttribute('role', 'status');
    empty.textContent = 'No settings match that search.';
    empty.hidden = true;
    document.querySelector('#settingsPanel .settings-body')?.appendChild(empty);
  }
  _applySettingsFilter();
}

function _applySettingsFilter() {
  const query = (document.getElementById('settingsSearch')?.value || '').trim().toLowerCase();
  let shown = 0;
  let firstHit = null;
  _settingsSections().forEach((section) => {
    const inGroup = !!query || section.dataset.settingsGroup === _settingsGroup;
    const matches = sectionMatchesQuery(section, query, {
      isModuleEnabled: (moduleId) => moduleEnabled(_getState?.(), moduleId),
    });
    section.hidden = !(inGroup && matches);
    section.querySelectorAll('.settings-search-hit').forEach((row) => row.classList.remove('settings-search-hit'));
    // The no-results state must agree with what the athlete can actually see:
    // a card hidden by a module switch does not count just because its words
    // match, or the panel would look empty with no explanation.
    if (!section.hidden && _sectionEnabledByModules(section)) {
      shown++;
      if (!firstHit && query) {
        firstHit = firstMatchingRow(section, query, {
          isModuleEnabled: (moduleId) => moduleEnabled(_getState?.(), moduleId),
        });
      }
    }
  });
  if (firstHit) {
    firstHit.classList.add('settings-search-hit');
    const body = document.querySelector('#settingsPanel .settings-body');
    if (body) {
      const rowRect = firstHit.getBoundingClientRect();
      const bodyRect = body.getBoundingClientRect();
      if (rowRect.top < bodyRect.top || rowRect.bottom > bodyRect.bottom) {
        body.scrollTop += rowRect.top - bodyRect.top - Math.max(0, (bodyRect.height - rowRect.height) / 2);
      }
    }
  }
  document.querySelectorAll('#settingsTabs [data-settings-tab]').forEach((button) => {
    const active = !query && button.getAttribute('data-settings-tab') === _settingsGroup;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  const empty = document.getElementById('settingsNoResults');
  if (empty) empty.hidden = shown > 0;
}

// ==========================================
// ROUTE — /settings and /settings/profile
//
// The app is a static PWA (GitHub Pages under a sub-path and an Android
// WebViewAssetLoader origin), so a History-API path cannot be refreshed without
// a server rewrite. The route token is therefore kept in the hash and still
// reads as `/settings`:
//   #/settings            Settings
//   #/settings/profile    Profile
//   #/settings/<page>     a future settings page
// Legacy `#profile` / `#settings` hashes redirect to the canonical route.
// ==========================================

const _settingsRouteFromHash = settingsRouteFromHash;

function _homeUrl() {
  return `${location.pathname}${location.search}`;
}

function _showSettings(page, anchor = '') {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  const profilePanel = document.getElementById('settingsProfilePanel');
  if (!overlay || !panel || !profilePanel) return;

  if (!overlay.classList.contains('active')) {
    _settingsPreviousFocus = document.activeElement;
    _settingsReturnScroll = window.scrollY || 0;
    overlay.classList.add('active');
    overlay.removeAttribute('inert');
    overlay.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('settings-route');
    document.getElementById('app-root')?.setAttribute('inert', '');
    document.querySelector('.bottom-nav')?.setAttribute('inert', '');
  }

  if (page === 'profile') {
    panel.classList.remove('active');
    profilePanel.classList.add('active');
    const rootHeader = document.getElementById('settingsRootHeader');
    if (rootHeader) rootHeader.hidden = true;
    renderAthleteProfile('settingsProfileContent');
    const profileHost = document.getElementById('settingsProfileContent');
    const profileState = _getState?.();
    if (profileHost && profileState) {
      profileHost.insertAdjacentHTML('afterbegin', profileSettingsHTML(profileState, settingsStore()));
    }
    requestAnimationFrame(() => {
      profilePanel.querySelector('[data-action="back-to-settings"]')?.focus?.();
    });
  } else {
    profilePanel.classList.remove('active');
    panel.classList.add('active');
    const rootHeader = document.getElementById('settingsRootHeader');
    if (rootHeader) rootHeader.hidden = !!(page && settingsPageForRoute(page));
    const host = document.getElementById('settingsPageHost');
    const state = _getState?.();
    const store = settingsStore();
    if (host && state && store) {
      if (page) renderSettingsPage(host, page, state, store);
      else renderSettingsHome(host, state, store, document.getElementById('settingsSearch')?.value || '');
    }
    if (host) host.scrollTop = 0;
    _syncSettingsUI();
    _setupSettingsNavigation();
    if (anchor) {
      setTimeout(() => {
        // Compare the dataset value instead of building a selector from it:
        // no interpolation means no escaping bug (CodeQL js/incomplete-sanitization).
        const key = String(anchor);
        const target = [...document.querySelectorAll('#settingsPageHost [data-setting-key]')]
          .find((el) => el.dataset.settingKey === key);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.classList.add('is-pulse');
        setTimeout(() => target.classList.remove('is-pulse'), 1200);
      }, 60);
    }
  }
}

function _hideSettings() {
  const overlay = document.getElementById('settingsOverlay');
  const panel = document.getElementById('settingsPanel');
  const profilePanel = document.getElementById('settingsProfilePanel');
  const search = document.getElementById('settingsSearch');
  if (search) search.value = '';
  panel?.classList.remove('active');
  profilePanel?.classList.remove('active');
  overlay?.classList.remove('active');
  overlay?.setAttribute('aria-hidden', 'true');
  overlay?.setAttribute('inert', '');
  document.documentElement.classList.remove('settings-route');
  document.getElementById('app-root')?.removeAttribute('inert');
  document.querySelector('.bottom-nav')?.removeAttribute('inert');
  const restoreY = _settingsReturnScroll || 0;
  requestAnimationFrame(() => { try { window.scrollTo(0, restoreY); } catch { /* best effort */ } });
  const previous = _settingsPreviousFocus;
  _settingsPreviousFocus = null;
  try { previous?.focus?.(); } catch { /* best effort */ }
}

/** Apply the current URL to the Settings surfaces. Safe to call repeatedly. */
export function applySettingsRouteFromHash() {
  if (typeof window === 'undefined' || typeof location === 'undefined') return;
  const route = _settingsRouteFromHash(location.hash);
  if (!route) {
    if (document.getElementById('settingsOverlay')?.classList.contains('active')) _hideSettings();
    return;
  }
  if (route.legacy) {
    const canonical = route.page === 'profile' ? `${SETTINGS_HASH}/profile` : SETTINGS_HASH;
    try { history.replaceState(null, '', canonical); } catch { /* best effort */ }
  }
  _showSettings(route.page, route.rest?.[0] || '');
}

/** Open Settings (or its Profile sub-page) and push a route. */
export function openSettings(page = '', anchor = '') {
  const isProfile = page === 'profile';
  const target = isProfile ? 'profile' : (settingsPageById(page)?.route || page);
  const baseRoute = settingsHashForPage(target);
  const route = anchor ? `${baseRoute}/${anchor}` : baseRoute;
  if (isProfile) _settingsProfilePushed = true;
  _settingsRoutePushed = true;
  if (location.hash !== route) {
    try { history.pushState(null, '', route); } catch { location.hash = route; }
  }
  _showSettings(isProfile ? 'profile' : target, anchor);
}

/**
 * Close Settings. The back control pops one route level; a direct deep link
 * replaces the hash with Home instead of leaving the app.
 */
export function closeSettings(options = {}) {
  const overlay = document.getElementById('settingsOverlay');
  if (!overlay) return;
  if (options.replaceHash || !_settingsRoutePushed) {
    try { history.replaceState(null, '', _homeUrl()); } catch { /* best effort */ }
    _hideSettings();
    return;
  }
  _hideSettings();
  try { history.back(); } catch { /* best effort */ }
}

export function backToSettings() {
  if (location.hash === SETTINGS_HASH) return;
  if (_settingsRoutePushed) {
    _settingsProfilePushed = false;
    try { history.back(); } catch { /* best effort */ }
    return;
  }
  try { history.replaceState(null, '', SETTINGS_HASH); } catch { /* best effort */ }
  _showSettings('');
}

// ==========================================
// SYNC UI → STATE
// ==========================================
function _plateUnit(appState) {
  return appState.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
}

function _renderPlateCounts(setup, unit) {
  const host = document.getElementById('settingsPlateCounts');
  if (!host) return;
  host.innerHTML = setup.plates.map((plate) => {
    const count = setup.counts?.[String(plate)];
    return `<label class="settings-plate-count"><span>${plate}</span><input type="number" min="0" step="1" inputmode="numeric" data-plate-count="${plate}" value="${count == null ? '' : count}" placeholder="∞" aria-label="${plate} ${unit} plates, pairs owned"></label>`;
  }).join('');
}

let _stackExercises = null;
function _machineExercises() {
  if (_stackExercises) return _stackExercises;
  _stackExercises = EXERCISES
    .filter((exercise) => (exercise.equipment || []).some((key) => key === 'machine' || key === 'cables'))
    .map((exercise) => ({ id: exercise.id, name: exercise.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return _stackExercises;
}

function _renderMachineStacks(appState, unit) {
  const select = document.getElementById('settingsStackExercise');
  if (select && select.options.length === 0) {
    select.innerHTML = _machineExercises()
      .map((exercise) => `<option value="${_esc(exercise.id)}">${_esc(exercise.name)}</option>`)
      .join('');
  }
  const host = document.getElementById('settingsStackList');
  if (!host) return;
  const profile = equipmentProfiles.getActiveEquipmentProfile(appState);
  const key = unit === 'lb' ? 'lb' : 'kg';
  const stacks = equipmentProfiles.normalizeMachineStacks(profile.machineStacks);
  const entries = Object.entries(stacks).filter(([, stack]) => stack.unit === key);
  host.innerHTML = entries.length
    ? entries.map(([id, stack]) => {
      const name = resolveExercise(id)?.name || id;
      return `<div class="settings-stack-row"><span><strong>${_esc(name)}</strong> · ${stack.weights.join(', ')} ${key}</span><button type="button" class="settings-text-btn" data-action="remove-machine-stack" data-exercise="${_esc(id)}">Remove</button></div>`;
    }).join('')
    : `<div class="settings-hint">No ${key} stacks saved yet.</div>`;
}

function _syncPlateSetupUI(appState) {
  const unit = _plateUnit(appState);
  const setup = equipmentProfiles.getActivePlateSetup(appState, unit);
  const barInput = document.getElementById('settingsPlateBar');
  if (barInput && document.activeElement !== barInput) barInput.value = setup.bar;
  const platesInput = document.getElementById('settingsPlates');
  if (platesInput && document.activeElement !== platesInput) platesInput.value = setup.plates.join(', ');
  const unitLabel = document.getElementById('settingsPlateSetupUnit');
  if (unitLabel) unitLabel.textContent = unit;
  const barUnit = document.getElementById('settingsPlateBarUnit');
  if (barUnit) barUnit.textContent = unit;
  _renderPlateCounts(setup, unit);

  const dumbbells = equipmentProfiles.getActiveDumbbells(appState, unit);
  const dumbbellInput = document.getElementById('settingsDumbbells');
  if (dumbbellInput && document.activeElement !== dumbbellInput) dumbbellInput.value = dumbbells.join(', ');
  const dumbbellUnit = document.getElementById('settingsDumbbellUnit');
  if (dumbbellUnit) dumbbellUnit.textContent = unit;
  _renderMachineStacks(appState, unit);
}

function _syncSettingsUI() {
  if (!_getState) return;
  const appState = _getState();
  const s = appState.settings || {};
  void _syncAutomaticBackupUI();

  const restoreBackupBtn = document.getElementById('settingsRestoreBackupBtn');
  if (restoreBackupBtn) restoreBackupBtn.style.display = hasImportBackup() ? '' : 'none';

  document.querySelectorAll('[data-module-toggle]').forEach((input) => {
    input.checked = moduleEnabled(appState, input.getAttribute('data-module-toggle'));
  });
  document.querySelectorAll('[data-hybrid-toggle]').forEach((input) => {
    input.checked = hybridTrainingEnabled(appState);
  });

  // Equipment profiles: the selector and active name reflect the stored
  // profiles; the checkboxes below edit the active profile's kit.
  const profiles = equipmentProfiles.ensureEquipmentProfiles(appState);
  const activeProfile = equipmentProfiles.getActiveEquipmentProfile(appState);
  const profileSelect = document.getElementById('settingsEquipmentProfile');
  if (profileSelect) {
    profileSelect.innerHTML = '';
    for (const profile of profiles) {
      const option = document.createElement('option');
      option.value = profile.id;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    }
    profileSelect.value = activeProfile.id;
  }
  const profileName = document.getElementById('settingsEquipmentProfileName');
  if (profileName && document.activeElement !== profileName) {
    profileName.value = activeProfile.name;
  }
  const deleteProfileBtn = document.querySelector('[data-action="equipment-profile-delete"]');
  if (deleteProfileBtn) deleteProfileBtn.disabled = profiles.length <= 1;

  const nameInput = document.getElementById('settingsNameInput');
  if (nameInput) nameInput.value = s.name || '';

  const bwInput = document.getElementById('settingsBodyWeight');
  if (bwInput) {
    const latest = latestWeighIn(appState.bodyWeightLog || []);
    bwInput.value = latest ? latest.weight : (s.defaultBodyWeight || '');
  }

  const bwUnit = document.getElementById('settingsBodyWeightUnit');
  if (bwUnit) bwUnit.textContent = s.weightUnit || 'kg';

  _setToggleActive('[data-action="set-unit"]',        `[data-unit="${s.weightUnit || 'kg'}"]`);
  _setToggleActive('[data-action="set-dist-unit"]',   `[data-unit="${s.distanceUnit || 'km'}"]`);
  _setToggleActive('[data-action="set-progression"]', `[data-kg="${s.progressionIncrement || 2.5}"]`);
  _setToggleActive('[data-action="set-previous-scope"]', `[data-scope="${s.previousValuesScope === 'program' ? 'program' : 'all'}"]`);
  _setToggleActive('[data-action="set-theme"]',       `[data-theme-val="${s.theme || 'dark'}"]`);
  _setToggleActive('[data-action="set-palette"]',     `[data-palette="${normalizePalette(s.palette)}"]`);
  _setToggleActive('[data-action="set-reduced-motion"]', `[data-motion="${normalizeMotionPreference(s.reducedMotion)}"]`);
  _setToggleActive('[data-action="set-fitness-goal"]',`[data-goal="${s.fitnessGoal || 'hybrid'}"]`);
  _setToggleActive('[data-action="set-weight-goal"]',`[data-weight-goal="${s.weightGoal || 'maintain'}"]`);
  _setToggleActive('[data-action="set-fitness-level"]',`[data-level="${s.fitnessLevel || 'intermediate'}"]`);
  _setToggleActive('[data-action="set-week-start"]',  `[data-day="${s.weekStartDay || 'mon'}"]`);
  _setToggleActive('[data-action="set-fasting-default"]',`[data-hours="${s.fastingDefault || 16}"]`);

  const weekEl = document.getElementById('settingsCurrentWeek');
  if (weekEl) weekEl.textContent = _getState().currentWeek || '1';

  const autoAdv = document.getElementById('settingsAutoAdvance');
  if (autoAdv) autoAdv.checked = s.autoAdvanceWeek !== false;

  const threshEl = document.getElementById('settingsThresholdPace');
  if (threshEl && appState.thresholdPaceSeconds) {
    const total = appState.thresholdPaceSeconds;
    threshEl.value = Math.floor(total / 60) + ':' + (total % 60).toString().padStart(2, '0');
  }

  // Equipment checkboxes — active profile.
  const eq = activeProfile.equipment;
  equipmentProfiles.EQUIPMENT_KEYS.forEach(key => {
    const el = document.querySelector(`[data-equipment="${key}"]`);
    // ezBar (like bands/kettlebells/treadmill) is opt-in: only checked when the
    // active profile explicitly has it.
    if (el) el.checked = !!eq[key];
  });

  // Resistance band weights (≈ kg used for volume) — active profile.
  const bw = activeProfile.bandWeights;
  const bl = document.getElementById('settingsBandLight');
  const bm = document.getElementById('settingsBandMed');
  const bh = document.getElementById('settingsBandHeavy');
  if (bl) bl.value = bw.L ?? '';
  if (bm) bm.value = bw.M ?? '';
  if (bh) bh.value = bw.H ?? '';

  // Plate setup for the active profile and current weight unit.
  _syncPlateSetupUI(appState);

  // The plate-hint preference is a logger default, not part of the profile's
  // plate data, so it is synced here even if the equipment card is rebuilt.
  const showHints = document.getElementById('settingsShowPlateHints');
  if (showHints) showHints.checked = s.showPlateHints === true;

  // Rest tiers + auto-timer toggle
  const rp = s.restPeriods || { ...DEFAULT_REST_TIERS };
  const rw = document.getElementById('settingsRestWarmup');
  const rc = document.getElementById('settingsRestCompound');
  const ra = document.getElementById('settingsRestAccessory');
  const ri = document.getElementById('settingsRestIsolation');
  if (rw) rw.value = _fmtRest(rp.warmup ?? DEFAULT_REST_TIERS.warmup);
  if (rc) rc.value = _fmtRest(rp.compound);
  if (ra) ra.value = _fmtRest(rp.accessory);
  if (ri) ri.value = _fmtRest(rp.isolation);
  _setRestPresetActive(restPresetFor(rp));
  const rEnabled = document.getElementById('settingsRestEnabled');
  if (rEnabled) rEnabled.checked = s.restTimerEnabled !== false;
  const rSound = document.getElementById('settingsRestAlertSound');
  if (rSound) rSound.checked = s.restAlertSound !== false;
  const rVolume = document.getElementById('settingsRestAlertVolume');
  const rVolumeValue = document.getElementById('settingsRestAlertVolumeValue');
  const volume = s.restAlertVolume == null ? 0.4 : s.restAlertVolume;
  if (rVolume) rVolume.value = String(Math.round(volume * 100));
  if (rVolumeValue) rVolumeValue.textContent = `${Math.round(volume * 100)}%`;
  const autoWarmup = document.getElementById('settingsAutoWarmup');
  if (autoWarmup) autoWarmup.checked = s.autoWarmupRamp === true;
  const keepAwake = document.getElementById('settingsKeepAwake');
  if (keepAwake) keepAwake.checked = s.keepAwake !== false;
  const livePR = document.getElementById('settingsLivePR');
  if (livePR) livePR.checked = s.livePR !== false;

  // Notification toggles. The master switch is a stored preference, not the OS
  // permission: a granted permission with the switch off must stay off.
  const notifCheckbox = document.getElementById('settingsNotifications');
  if (notifCheckbox) notifCheckbox.checked = !!s.notificationsEnabled;

  const notifWeekly   = document.getElementById('settingsNotifWeeklySummary');
  const notifStreak   = document.getElementById('settingsNotifStreak');
  const notifMissed   = document.getElementById('settingsNotifMissedWorkout');
  const notifFasting  = document.getElementById('settingsNotifFastingStage');
  if (notifWeekly) notifWeekly.checked = !!s.notifWeeklySummary;
  if (notifStreak)  notifStreak.checked  = !!s.notifStreak;
  if (notifMissed)  notifMissed.checked  = !!s.notifMissedWorkout;
  if (notifFasting) notifFasting.checked = s.notifFastingStage !== false;

  // Reminder time picker
  const rtEl = document.getElementById('settingsReminderTime');
  if (rtEl) {
    const rt = s.reminderTime || { hour: 7, minute: 30 };
    rtEl.value = `${String(rt.hour).padStart(2, '0')}:${String(rt.minute).padStart(2, '0')}`;
  }

  // Streak alert time picker
  const satEl = document.getElementById('settingsStreakAlertTime');
  if (satEl) {
    const sat = s.streakAlertTime || { hour: 20, minute: 0 };
    satEl.value = `${String(sat.hour).padStart(2, '0')}:${String(sat.minute).padStart(2, '0')}`;
  }


  // Notification status text
  const notifStatusEl = document.getElementById('settingsNotifStatus');
  if (notifStatusEl) {
    if (!s.notificationsEnabled) {
      notifStatusEl.textContent = 'Enable to receive daily training reminders.';
    } else if (!notificationsGranted()) {
      notifStatusEl.textContent = 'Reminders are on, but notification permission is off. Allow notifications in your device settings.';
    } else {
      const rt = s.reminderTime || { hour: 7, minute: 30 };
      const display = `${String(rt.hour).padStart(2, '0')}:${String(rt.minute).padStart(2, '0')}`;
      notifStatusEl.textContent = `Reminders active — you'll be notified at ${display}.`;
    }
  }

  _refreshAvatar();
  _syncHealthConnectUI();
}

function _friendlyBackupTime(value) {
  if (!value) return 'No backup written yet';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Last backup time unavailable' : `Last backup ${date.toLocaleString()}`;
}

async function _syncAutomaticBackupUI() {
  const request = ++_autoBackupUiRequest;
  const label = document.getElementById('settingsAutoBackupLabel');
  const detail = document.getElementById('settingsAutoBackupDetail');
  const indicator = document.getElementById('settingsAutoBackupIndicator');
  const folderBtn = document.getElementById('settingsAutoBackupFolderBtn');
  const nowBtn = document.getElementById('settingsAutoBackupNowBtn');
  const disableBtn = document.getElementById('settingsAutoBackupDisableBtn');
  if (!label || !detail) return;

  const profileStatus = document.getElementById('settingsProfileStatus');
  if (!automaticBackupSupported()) {
    if (profileStatus) profileStatus.textContent = 'All data stays on this phone';
    label.textContent = 'Available in the Android app';
    detail.textContent = 'Manual JSON export remains available in this browser.';
    indicator?.classList.remove('is-on');
    if (folderBtn) folderBtn.style.display = 'none';
    if (nowBtn) nowBtn.style.display = 'none';
    if (disableBtn) disableBtn.style.display = 'none';
    return;
  }

  label.textContent = 'Checking automatic backup…';
  detail.textContent = '';
  const status = await getAutomaticBackupStatus();
  if (request !== _autoBackupUiRequest) return;
  const configured = status?.configured === true;
  if (profileStatus) {
    profileStatus.textContent = configured
      ? (status.lastBackupAt ? `Backed up ${_friendlyBackupTime(status.lastBackupAt)}` : 'Automatic backup on')
      : 'All data stays on this phone';
  }
  indicator?.classList.toggle('is-on', configured);
  label.textContent = configured ? 'Automatic JSON backup on' : 'Automatic backup not configured';
  detail.textContent = configured
    ? `${status.folderName || 'Selected folder'} · ${status.lastError || _friendlyBackupTime(status.lastBackupAt)}`
    : 'Choose a folder once; openHybrid will keep latest, seven daily and four weekly files.';
  if (folderBtn) {
    folderBtn.style.display = '';
    folderBtn.textContent = configured ? 'Change Automatic Backup Folder' : 'Choose Automatic Backup Folder';
  }
  if (nowBtn) nowBtn.style.display = configured ? '' : 'none';
  if (disableBtn) disableBtn.style.display = configured ? '' : 'none';
}

function _setToggleActive(groupSelector, activeSelector) {
  document.querySelectorAll(groupSelector).forEach(b => b.classList.remove('active'));
  // Scope the value match to the group: several data-* values (data-day, data-goal,
  // data-level, data-unit) also exist in the cockpit/onboarding, which appear earlier
  // in the DOM, so an unscoped querySelector would highlight the wrong element (or
  // nothing in this group). Compound the selectors so we always hit this group's button.
  document.querySelector(groupSelector + activeSelector)?.classList.add('active');
}

/** Highlight the preset whose tiers exactly match the stored ones; none if custom. */
function _setRestPresetActive(name) {
  document.querySelectorAll('[data-action="rest-preset"]').forEach((button) => {
    button.classList.toggle('active', !!name && button.getAttribute('data-preset') === name);
  });
}

// ==========================================
// AVATAR
// ==========================================
// Render initials or a validated avatar image into `el` via DOM nodes — never by
// interpolating the (possibly imported/hostile) avatar URL into an innerHTML
// string, which was an attribute-breakout XSS sink. img.src is a property
// assignment, so its value can never inject markup, and the URL must still pass
// the image-data-URL allowlist before it is used at all.
function _paintAvatar(el, initials, avatarUrl, radius, withOverlay) {
  el.textContent = ''; // clear existing children
  if (avatarUrl && isSafeImageDataUrl(avatarUrl)) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = 'Avatar';
    img.style.cssText = `width:100%;height:100%;object-fit:cover;border-radius:${radius};`;
    el.appendChild(img);
  } else {
    el.textContent = initials; // plain text — never interpreted as markup
  }
  if (withOverlay) {
    const overlay = document.createElement('div');
    overlay.className = 'settings-avatar-camera-overlay';
    overlay.textContent = '📷';
    el.appendChild(overlay);
  }
}

function _refreshAvatar() {
  if (!_getState) return;
  const s    = _getState().settings || {};
  const name = s.name || '';
  const initials = name.trim()
    ? name.trim().split(/\s+/).map(w => w[0].toUpperCase()).slice(0, 2).join('')
    : '?';
  const avatarUrl = s.avatarDataUrl || null;

  const btnEl   = document.getElementById('profileAvatarInitials');
  const largeEl = document.getElementById('settingsAvatarLarge');
  const nameEl  = document.getElementById('settingsNameDisplay');

  if (btnEl)   _paintAvatar(btnEl, initials, avatarUrl, '50%', false);
  if (largeEl) _paintAvatar(largeEl, initials, avatarUrl, 'inherit', true);
  if (nameEl)  nameEl.textContent = name.trim() || 'Athlete';
}

export function openAvatarPicker() {
  document.getElementById('avatarFilePicker')?.click();
}

export function handleAvatarFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 320;
      const scale  = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const appState = _ensureSettings();
      appState.settings.avatarDataUrl = dataUrl;
      saveStateToLocalStorage(true);
      _refreshAvatar();
      showToast('Profile photo updated ✓');
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}

// ==========================================
// SAVE HANDLERS
// ==========================================
function _ensureSettings() {
  const appState = _getState();
  if (!appState.settings) appState.settings = {};
  return appState;
}

export function saveName() {
  const val = document.getElementById('settingsNameInput')?.value?.trim() || '';
  const appState = _ensureSettings();
  appState.settings.name = val;
  saveStateToLocalStorage(true);
  _refreshAvatar();
}

export function saveBodyWeight() {
  const val = parseFloat(document.getElementById('settingsBodyWeight')?.value);
  if (isNaN(val)) return;
  const appState = _ensureSettings();
  appState.settings.defaultBodyWeight = val;
  if (!appState.bodyWeightLog) appState.bodyWeightLog = [];
  const today = todayKey();
  const idx = appState.bodyWeightLog.findIndex(l => l.date === today);
  if (idx >= 0) appState.bodyWeightLog[idx].weight = val;
  else appState.bodyWeightLog.push({ date: today, weight: val });
  saveStateToLocalStorage(true);
  showToast(`Body weight saved: ${val} ${appState.settings.weightUnit || 'kg'}`);
}

function _syncWeightUnitSelection(unit) {
  _setToggleActive('[data-action="set-unit"]', `[data-unit="${unit}"]`);
  const bwUnit = document.getElementById('settingsBodyWeightUnit');
  if (bwUnit) bwUnit.textContent = unit;
  _syncPlateSetupUI(_ensureSettings());
}

export async function setWeightUnit(unit) {
  const appState = _ensureSettings();
  const from = normalizeWeightUnit(appState.settings.weightUnit);
  const to = normalizeWeightUnit(unit);
  if (from === to) { _syncWeightUnitSelection(from); return; }

  const ok = await confirmModal({
    title: 'Convert stored weights?',
    message: `Every logged set, bodyweight entry, goal and routine prescription will be converted from ${from} to ${to}. A recovery copy is saved on this device first.`,
    confirmLabel: `Convert to ${to}`,
  });
  if (!ok) { _syncWeightUnitSelection(from); return; }

  const backupKey = STORAGE_KEY + '_unit_backup';
  try {
    localStorage.setItem(backupKey, JSON.stringify({ savedAt: new Date().toISOString(), from, to, state: appState }));
  } catch {
    // The recovery copy is the guard for this rewrite. Without it, do nothing.
    showToast('Not enough storage to save a recovery copy. Export a backup first.', true);
    _syncWeightUnitSelection(from);
    return;
  }

  const report = convertStoredWeights(appState, from, to);
  appState.settings.weightUnit = to;
  // exerciseStats is derived from the sets and must not keep old-unit maxima.
  if (appState.exerciseStats && typeof appState.exerciseStats === 'object') {
    appState.exerciseStats = {};
    computeExercisePRs(appState, appState.exerciseStats);
  }
  saveStateToLocalStorage(true);
  _syncWeightUnitSelection(to);
  const changed = report.sets + report.bodyWeights + report.prescriptions + report.settings + report.goals;
  showToast(changed
    ? `Weight unit: ${to} — ${changed} stored value${changed === 1 ? '' : 's'} converted`
    : `Weight unit: ${to}`);
}

// Clear all remembered per-exercise rest adjustments.
export function resetRestOverrides() {
  const appState = _ensureSettings();
  appState.settings.restOverrides = {};
  setRestOverrides({});
  saveStateToLocalStorage(true);
  showToast('Remembered rests cleared');
}

export function setProgressionIncrement(kg) {
  const appState = _ensureSettings();
  appState.settings.progressionIncrement = kg;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-progression"]', `[data-kg="${kg}"]`);
  const unit = appState.settings.weightUnit === 'lbs' ? 'lbs' : 'kg';
  showToast(`Progression step: ${kg} ${unit}`);
}

export function setPreviousValuesScope(scope) {
  const appState = _ensureSettings();
  appState.settings.previousValuesScope = scope === 'program' ? 'program' : 'all';
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-previous-scope"]', `[data-scope="${appState.settings.previousValuesScope}"]`);
  showToast(appState.settings.previousValuesScope === 'program'
    ? 'Last performed: this program'
    : 'Last performed: any workout');
}

export function setTheme(mode) {
  const appState = _ensureSettings();
  appState.settings.theme = mode;
  saveStateToLocalStorage(true);
  _applyTheme(mode);
  _setToggleActive('[data-action="set-theme"]', `[data-theme-val="${mode}"]`);
  const label = mode === 'light' ? 'Light' : mode === 'system' ? 'System' : 'Dark';
  showToast(`${label} mode`);
}

function _applyTheme(mode) {
  if (mode === 'system') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = prefersDark ? 'dark' : 'light';
  } else {
    document.documentElement.dataset.theme = mode;
  }
  applyThemeTokens(document.documentElement);
}

export function setPalette(id) {
  const appState = _ensureSettings();
  const palette = normalizePalette(id);
  appState.settings.palette = palette;
  saveStateToLocalStorage(true);
  applyPalette(document.documentElement, palette);
  _setToggleActive('[data-action="set-palette"]', `[data-palette="${palette}"]`);
  showToast(`${palette.charAt(0).toUpperCase() + palette.slice(1)} palette`);
}

/**
 * Accessibility preference for decorative motion. `system` follows the OS;
 * `reduce`/`full` override it. Applies immediately and persists.
 * @param {'system'|'reduce'|'full'} value
 */
export function setReducedMotion(value) {
  const appState = _ensureSettings();
  const pref = normalizeMotionPreference(value);
  appState.settings.reducedMotion = pref;
  saveStateToLocalStorage(true);
  const effective = applyMotionPreference(pref);
  _setToggleActive('[data-action="set-reduced-motion"]', `[data-motion="${pref}"]`);
  showToast(pref === 'system'
    ? `Motion follows your device (${effective === 'reduce' ? 'reduced' : 'full'})`
    : (pref === 'reduce' ? 'Reduced motion on' : 'Full motion on'));
}

export function setDistanceUnit(unit) {
  const appState = _ensureSettings();
  appState.settings.distanceUnit = unit;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-dist-unit"]', `[data-unit="${unit}"]`);
  showToast(`Distance unit: ${unit}`);
  document.dispatchEvent(new Event('app:storage-loaded')); // refresh tiles
}

export function stepCurrentWeek(delta) {
  const appState = _getState();
  const activeProgram = window._hybridGetProgram?.();
  const maxWeek = activeProgram?.totalWeeks || 12;
  const current = parseInt(appState.currentWeek, 10);
  const next = Math.max(1, Math.min(maxWeek, current + delta));
  if (next === current) return;
  appState.currentWeek = next.toString();
  appState.weekStartedAt = startOfProgramWeek();
  appState.weekAdvanceSnoozedUntil = null;
  saveStateToLocalStorage(true);
  const el = document.getElementById('settingsCurrentWeek');
  if (el) el.textContent = next;
  showToast(`Week ${next}`);
  document.dispatchEvent(new Event('app:storage-loaded'));
}

export function setAutoAdvanceWeek(enabled) {
  const appState = _ensureSettings();
  appState.settings.autoAdvanceWeek = enabled;
  saveStateToLocalStorage(true);
}

export function setFitnessGoal(goal) {
  const appState = _ensureSettings();
  appState.settings.fitnessGoal = goal;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-fitness-goal"]', `[data-goal="${goal}"]`);
  const labels = { strength: 'Strength First', hybrid: 'True Hybrid', endurance: 'Run-Focused' };
  showToast(`Goal: ${labels[goal] || goal}`);
}

export function setWeightGoal(goal) {
  const appState = _ensureSettings();
  appState.settings.weightGoal = goal;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-weight-goal"]', `[data-weight-goal="${goal}"]`);
  const labels = { cut: 'Cutting', maintain: 'Maintaining', bulk: 'Bulking' };
  showToast(`Weight goal: ${labels[goal] || goal}`);
}

export function setFitnessLevel(level) {
  const appState = _ensureSettings();
  appState.settings.fitnessLevel = level;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-fitness-level"]', `[data-level="${level}"]`);
  const labels = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
  showToast(`Level: ${labels[level] || level}`);
}

export function setWeekStartDay(day) {
  const appState = _ensureSettings();
  appState.settings.weekStartDay = day;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-week-start"]', `[data-day="${day}"]`);
  showToast(`Week starts on ${day === 'mon' ? 'Monday' : 'Sunday'}`);
}

export function setFastingDefault(hours) {
  const appState = _ensureSettings();
  appState.settings.fastingDefault = hours;
  saveStateToLocalStorage(true);
  _setToggleActive('[data-action="set-fasting-default"]', `[data-hours="${hours}"]`);
  showToast(`Default fast: ${hours}h`);
  document.dispatchEvent(new Event('app:storage-loaded'));
}

export function saveReminderTime() {
  const val = document.getElementById('settingsReminderTime')?.value;
  if (!val) return;
  const [hourStr, minuteStr] = val.split(':');
  const hour   = parseInt(hourStr,   10);
  const minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return;
  const appState = _ensureSettings();
  appState.settings.reminderTime = { hour, minute };
  saveStateToLocalStorage(true);
  rearmReminder();
  const display = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  showToast(`Reminder set for ${display}`);
  const statusEl = document.getElementById('settingsNotifStatus');
  if (statusEl) statusEl.textContent = `Reminders active — you'll be notified at ${display}.`;
}

export function setNotifToggle(type, enabled) {
  const appState = _ensureSettings();
  if (type === 'weeklySummary')   appState.settings.notifWeeklySummary = enabled;
  else if (type === 'streak')     appState.settings.notifStreak = enabled;
  else if (type === 'missed')     appState.settings.notifMissedWorkout = enabled;
  else if (type === 'fasting')    appState.settings.notifFastingStage = enabled;
  saveStateToLocalStorage(true);
  rearmReminder();
}

/**
 * Persist the master reminder switch. Permission is requested by the caller;
 * this only records the athlete's choice and arms/cancels the timers.
 * @param {boolean} enabled
 */
export function setNotificationsEnabled(enabled) {
  const appState = _ensureSettings();
  appState.settings.notificationsEnabled = !!enabled;
  saveStateToLocalStorage(true);
  if (enabled) rearmReminder();
  else cancelReminders();
}

export function saveStreakAlertTime() {
  const val = document.getElementById('settingsStreakAlertTime')?.value;
  if (!val) return;
  const [hourStr, minuteStr] = val.split(':');
  const hour   = parseInt(hourStr,   10);
  const minute = parseInt(minuteStr, 10);
  if (isNaN(hour) || isNaN(minute)) return;
  const appState = _ensureSettings();
  appState.settings.streakAlertTime = { hour, minute };
  saveStateToLocalStorage(true);
  rearmReminder();
  showToast(`Streak alert set for ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`);
}

export function toggleEquipment(key, enabled) {
  const appState = _ensureSettings();
  equipmentProfiles.ensureEquipmentProfiles(appState);
  equipmentProfiles.setActiveEquipmentKey(appState, key, enabled);
  saveStateToLocalStorage(true);
}

// Switch the active gym/home profile. The legacy projection fields are updated
// by the model so program fit, swaps and plate hints see the new kit at once.
export function selectEquipmentProfile(id) {
  const appState = _ensureSettings();
  if (!equipmentProfiles.switchEquipmentProfile(appState, id)) return;
  saveStateToLocalStorage(true);
  _syncSettingsUI();
  const active = equipmentProfiles.getActiveEquipmentProfile(appState);
  showToast(`Equipment profile: ${active.name}`);
  document.dispatchEvent(new CustomEvent('app:equipment-changed', { detail: { id: active.id } }));
}

export function addEquipmentProfileFromUI() {
  const appState = _ensureSettings();
  const profile = equipmentProfiles.addEquipmentProfile(appState);
  saveStateToLocalStorage(true);
  _syncSettingsUI();
  showToast(`Added ${profile.name}`);
  document.dispatchEvent(new CustomEvent('app:equipment-changed', { detail: { id: profile.id } }));
}

export function saveEquipmentProfileName() {
  const appState = _ensureSettings();
  const input = document.getElementById('settingsEquipmentProfileName');
  if (!input) return;
  const active = equipmentProfiles.getActiveEquipmentProfile(appState);
  if (!equipmentProfiles.renameEquipmentProfile(appState, active.id, input.value)) {
    input.value = active.name;
    return;
  }
  saveStateToLocalStorage(true);
  _syncSettingsUI();
}

export async function deleteActiveEquipmentProfile() {
  const appState = _ensureSettings();
  const active = equipmentProfiles.getActiveEquipmentProfile(appState);
  const confirmed = await confirmModal({
    title: 'Delete equipment profile?',
    message: `"${active.name}" will be removed. Your workouts are not affected.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!confirmed) return;
  if (!equipmentProfiles.deleteEquipmentProfile(appState, active.id)) {
    showToast('Keep at least one equipment profile');
    return;
  }
  saveStateToLocalStorage(true);
  _syncSettingsUI();
  const next = equipmentProfiles.getActiveEquipmentProfile(appState);
  showToast(`Using ${next.name}`);
  document.dispatchEvent(new CustomEvent('app:equipment-changed', { detail: { id: next.id } }));
}

// Persist the nominal kg-equivalent for each resistance band. These feed the
// cockpit's per-set band selector so band work still contributes to volume.
// Persist the three rest tiers from the Settings inputs (clamped 30–600s).
export function saveRestPeriods() {
  const appState = _ensureSettings();
  const cur = appState.settings.restPeriods || { ...DEFAULT_REST_TIERS };
  const read = (id, fallback, min = 30) => {
    const sec = _parseRest(document.getElementById(id)?.value);
    return sec != null ? Math.min(600, Math.max(min, sec)) : fallback;
  };
  appState.settings.restPeriods = {
    warmup:   read('settingsRestWarmup',   cur.warmup ?? DEFAULT_REST_TIERS.warmup, 0),
    compound:  read('settingsRestCompound',  cur.compound),
    accessory: read('settingsRestAccessory', cur.accessory),
    isolation: read('settingsRestIsolation', cur.isolation),
  };
  setRestTiers(appState.settings.restPeriods);
  _setRestPresetActive(restPresetFor(appState.settings.restPeriods));
  saveStateToLocalStorage(true);
}

// Apply a preset to the three tiers and reflect it in the inputs.
export function applyRestPreset(name) {
  const preset = REST_PRESETS[name];
  if (!preset) return;
  const appState = _ensureSettings();
  appState.settings.restPeriods = { ...preset };
  setRestTiers(preset);
  const rw = document.getElementById('settingsRestWarmup');
  const rc = document.getElementById('settingsRestCompound');
  const ra = document.getElementById('settingsRestAccessory');
  const ri = document.getElementById('settingsRestIsolation');
  if (rw) rw.value = _fmtRest(preset.warmup ?? DEFAULT_REST_TIERS.warmup);
  if (rc) rc.value = _fmtRest(preset.compound);
  if (ra) ra.value = _fmtRest(preset.accessory);
  if (ri) ri.value = _fmtRest(preset.isolation);
  _setRestPresetActive(name);
  saveStateToLocalStorage(true);
}

// Toggle the auto rest timer on/off.
export function setRestTimerEnabledSetting(enabled) {
  const appState = _ensureSettings();
  appState.settings.restTimerEnabled = !!enabled;
  setRestTimerEnabled(!!enabled);
  saveStateToLocalStorage(true);
}

export function setRestAlertSoundSetting(enabled) {
  const appState = _ensureSettings();
  appState.settings.restAlertSound = !!enabled;
  setRestAlertConfig({ sound: !!enabled, volume: appState.settings.restAlertVolume });
  saveStateToLocalStorage(true);
}

export function setRestAlertVolumeSetting(value) {
  const appState = _ensureSettings();
  const volume = Math.max(0, Math.min(1, Number(value) || 0));
  appState.settings.restAlertVolume = volume;
  setRestAlertConfig({ sound: appState.settings.restAlertSound !== false, volume });
  const label = document.getElementById('settingsRestAlertVolumeValue');
  if (label) label.textContent = `${Math.round(volume * 100)}%`;
  saveStateToLocalStorage(true);
}

export function saveBandWeights() {
  const appState = _ensureSettings();
  const read = (id, fallback) => {
    const el = document.getElementById(id);
    const v = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(v) && v >= 0 ? v : fallback;
  };
  equipmentProfiles.ensureEquipmentProfiles(appState);
  equipmentProfiles.updateActiveBandWeights(appState, {
    L: read('settingsBandLight', 10),
    M: read('settingsBandMed', 20),
    H: read('settingsBandHeavy', 30),
  });
  saveStateToLocalStorage(true);
}

function _readPlateCounts() {
  /** @type {Record<string, number>} */
  const counts = {};
  document.querySelectorAll('[data-plate-count]').forEach((input) => {
    const size = input.getAttribute('data-plate-count');
    const raw = String(input.value ?? '').trim();
    if (!size || raw === '') return;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= 0) counts[size] = n;
  });
  return counts;
}

export function savePlateCounts() {
  const appState = _ensureSettings();
  const unit = _plateUnit(appState);
  equipmentProfiles.setActivePlateSetup(appState, unit, { counts: _readPlateCounts() });
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
}

export function saveDumbbells() {
  const appState = _ensureSettings();
  const unit = _plateUnit(appState);
  const input = document.getElementById('settingsDumbbells');
  equipmentProfiles.setActiveDumbbells(appState, unit, input?.value || '');
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
}

export function saveMachineStack() {
  const appState = _ensureSettings();
  const unit = _plateUnit(appState);
  const id = document.getElementById('settingsStackExercise')?.value || '';
  const raw = document.getElementById('settingsStackWeights')?.value || '';
  if (!id || !equipmentProfiles.normalizeWeightList(raw).length) {
    showToast('Pick an exercise and enter its weights');
    return;
  }
  equipmentProfiles.setActiveMachineStack(appState, id, unit, raw);
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
  const input = document.getElementById('settingsStackWeights');
  if (input) input.value = '';
  showToast('Machine stack saved');
}

export function removeMachineStack(id) {
  const appState = _ensureSettings();
  if (!equipmentProfiles.removeActiveMachineStack(appState, id)) return;
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
  showToast('Machine stack removed');
}

// Persist the active profile's bar/plates for the current weight unit. Invalid
// input is rejected and the stored setup is shown again rather than saved as a
// silently empty plate list.
export function savePlateSetup() {
  const appState = _ensureSettings();
  const unit = _plateUnit(appState);
  equipmentProfiles.ensureEquipmentProfiles(appState);
  const bar = parseFloat(document.getElementById('settingsPlateBar')?.value);
  const plates = equipmentProfiles.parsePlateList(document.getElementById('settingsPlates')?.value || '');
  if (!Number.isFinite(bar) || bar <= 0 || plates.length === 0) {
    showToast('Enter a bar weight and at least one plate');
    _syncPlateSetupUI(appState);
    return;
  }
  const counts = document.querySelector('[data-plate-count]')
    ? _readPlateCounts()
    : equipmentProfiles.getActivePlateSetup(appState, unit).counts;
  equipmentProfiles.setActivePlateSetup(appState, unit, { bar, plates, counts });
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
  showToast(`Plate setup saved (${unit})`);
}

export function setAutoWarmupRamp(enabled) {
  const appState = _ensureSettings();
  appState.settings.autoWarmupRamp = !!enabled;
  saveStateToLocalStorage(true);
  showToast(enabled ? 'Auto warm-up ramp on' : 'Auto warm-up ramp off');
}

export function setShowPlateHints(enabled) {
  const appState = _ensureSettings();
  appState.settings.showPlateHints = !!enabled;
  saveStateToLocalStorage(true);
  showToast(enabled ? 'Plate hints on' : 'Plate hints off');
}

export function setKeepAwake(enabled) {
  const appState = _ensureSettings();
  appState.settings.keepAwake = !!enabled;
  saveStateToLocalStorage(true);
  // The preference is immediate: turning it off must let a running workout's
  // screen sleep without waiting for the next cockpit render.
  if (!enabled) releaseWorkoutWakeLock();
  showToast(enabled ? 'Keep screen awake during workouts' : 'Keep-awake off');
}

export function setLivePR(enabled) {
  const appState = _ensureSettings();
  appState.settings.livePR = !!enabled;
  saveStateToLocalStorage(true);
  showToast(enabled ? 'Live PR banners on' : 'Live PR banners off');
}

export function resetPlateSetup() {
  const appState = _ensureSettings();
  const unit = _plateUnit(appState);
  equipmentProfiles.resetActivePlateSetup(appState, unit);
  saveStateToLocalStorage(true);
  _syncPlateSetupUI(appState);
  showToast(`Standard ${unit} plates restored`);
}

export function toggleModule(id, on) {
  const appState = _getState();
  if (!setModuleEnabled(appState, id, on)) return;
  applyModuleVisibility(appState);
  saveStateToLocalStorage(true);
  document.dispatchEvent(new CustomEvent('app:modules-changed', { detail: { id, on: !!on } }));
  // A card hidden by the module switch must stop counting as a search result
  // immediately, while the panel is open.
  _applySettingsFilter();
}

/**
 * Hybrid training: hides the hybrid-only Home surfaces. It deliberately does
 * NOT touch the four feature modules — an athlete who wants a strength-only
 * dashboard still chooses Running/Recovery/Health/Fasting one by one below.
 */
export function toggleHybridTraining(on) {
  const appState = _getState();
  if (!setHybridTraining(appState, on)) return;
  applyModuleVisibility(appState);
  saveStateToLocalStorage(true);
  document.dispatchEvent(new CustomEvent('app:modules-changed', { detail: { hybrid: !!on } }));
  _applySettingsFilter();
}

// ==========================================
// DATA EXPORT / IMPORT / RESET
// ==========================================
export async function exportData() {
  const appState = _getState();
  let backup;
  try { backup = await buildCompleteBackup(appState); }
  catch {
    showToast('Export stopped: GPS routes could not be read safely.', true);
    return;
  }
  const result = await saveTextExport({
    filename: `openhybrid-training-${todayKey()}.json`,
    content: backup.content,
    mime: 'application/json',
  });
  const n = backup.routeCount;
  const copy = exportResultMessage(result, n ? `Data (${n} route${n === 1 ? '' : 's'})` : 'Data');
  showToast(copy.message, copy.error);
}

/**
 * Export a compact context for an external coach/AI: goals, active plan and the
 * last eight weeks. Deliberately not a backup — no name, notes, routes, photos
 * or health records.
 */
export async function exportTrainingContext() {
  const appState = _getState();
  const context = buildTrainingContext(appState, {
    program: getProgramById(appState.activeProgramId),
    todayISO: todayKey(),
    recentWeeks: 8,
  });
  const result = await saveTextExport({
    filename: trainingContextFilename(todayKey()),
    content: JSON.stringify(context, null, 2),
    mime: 'application/json',
  });
  const copy = exportResultMessage(result, 'Training context');
  showToast(copy.message, copy.error);
}

export async function selectAutomaticBackupFolder() {
  const selected = await chooseAutomaticBackupFolder();
  if (selected?.status === 'cancelled') return;
  if (!selected?.configured) {
    showToast(selected?.message || 'Automatic backup folder was not selected.', true);
    void _syncAutomaticBackupUI();
    return;
  }
  showToast('Backup folder selected. Writing the first backup…');
  const written = await runAutomaticBackup('setup', { force: true });
  showToast(written?.status === 'saved'
    ? 'Automatic JSON backup saved ✓'
    : written?.message || 'The folder was saved, but the first backup could not be written.', written?.status !== 'saved');
  void _syncAutomaticBackupUI();
}

export async function backupNow() {
  showToast('Writing complete JSON backup…');
  const result = await runAutomaticBackup('manual', { force: true });
  showToast(result?.status === 'saved'
    ? 'Automatic JSON backup saved ✓'
    : result?.message || 'Automatic backup failed.', result?.status !== 'saved');
  void _syncAutomaticBackupUI();
}

export async function turnOffAutomaticBackup() {
  const ok = await confirmModal({
    title: 'Turn off automatic backups?',
    message: 'Existing JSON files remain in your chosen folder. openHybrid will stop writing new ones.',
    confirmLabel: 'Turn off',
  });
  if (!ok) return;
  const result = await disableAutomaticBackup();
  showToast(result?.status === 'disabled' ? 'Automatic backups turned off' : result?.message || 'Could not turn off automatic backups.', result?.status !== 'disabled');
  void _syncAutomaticBackupUI();
}

export function triggerImport() {
  document.getElementById('settingsImportFile')?.click();
}

export function triggerExternalCsvImport() {
  document.getElementById('settingsExternalCsvFile')?.click();
}

/** Close Settings, refresh the live views, and optionally show imported history. */
function _finishImport({ history = false } = {}) {
  closeSettings();
  document.dispatchEvent(new Event('app:storage-loaded'));
  if (history) document.dispatchEvent(new CustomEvent('app:open-activities'));
}

export function triggerFitImport() {
  document.getElementById('settingsFitFiles')?.click();
}

/**
 * Batch FIT import for Garmin/Wahoo/Coros/Zwift exports. Runs land as dated run
 * sessions; strength FIT files land as time/HR-only gym activities because FIT
 * carries no exercise names. Files without a usable timestamp are skipped
 * rather than dated to today.
 *
 * @param {FileList|File[]|null} fileList
 */
export async function handleFitFiles(fileList) {
  const files = [...(fileList || [])];
  if (!files.length) return;
  const candidates = [];
  let unreadable = 0;
  let undated = 0;

  for (const file of files) {
    if (!file || file.size > CSV_IMPORT_LIMITS.maxBytes) { unreadable++; continue; }
    try {
      const data = await parseFitBuffer(await file.arrayBuffer());
      const candidate = buildFitCandidate(data);
      if (candidate) candidates.push(candidate);
      else undated++;
    } catch {
      unreadable++;
    }
  }

  if (!candidates.length) {
    showToast(undated
      ? 'No dated run or gym activity was found in those FIT files.'
      : 'Those FIT files could not be read.', true);
    return;
  }

  const state = _getState();
  const runs = candidates.filter((item) => item.kind === 'run').length;
  const gym = candidates.length - runs;
  const dates = candidates.map((item) => item.localDate).sort();
  const duplicates = candidates.filter((item) => (
    item.kind === 'run'
      ? findImportedRunSession(state, item.startTs, 'fit')
      : !!state.weeks?.[item.weekKey]
  )).length;

  const ok = await confirmModal({
    title: 'Import FIT activities?',
    message: [
      `${runs} run${runs === 1 ? '' : 's'}${gym ? ` · ${gym} strength activit${gym === 1 ? 'y' : 'ies'} (time/HR only)` : ''}`,
      `${dates[0]} to ${dates[dates.length - 1]}`,
      duplicates ? `${duplicates} already in your history and will be skipped.` : '',
      unreadable ? `${unreadable} file${unreadable === 1 ? '' : 's'} could not be read.` : '',
      undated ? `${undated} file${undated === 1 ? '' : 's'} had no usable date and will be skipped.` : '',
      '',
      'They are added as archived activities. Your current program and active workout are left alone.',
    ].filter(Boolean).join('\n'),
    confirmLabel: 'Import activities',
  });
  if (!ok) return;

  const result = applyFitImports(state, candidates);
  if (!result.added.length) {
    showToast('Those activities are already in your history.');
    return;
  }

  // GPS routes go to IndexedDB, keyed by the same session id as the run.
  for (const item of result.added) {
    if (item.kind !== 'run' || !Array.isArray(item.coordinates) || !item.coordinates.length) continue;
    try {
      const routeId = await saveMapToDB(item.weekKey, item.day, item.coordinates, {
        activationId: 'imported',
        programId: 'imported',
        sessionId: item.sessionId,
        localDate: item.localDate,
        startTs: item.startTs,
      });
      if (!routeId) continue;
      const week = state.weeks?.[item.weekKey];
      const current = week?.runs?.[item.day];
      if (week && current?.sessionId === item.sessionId) {
        upsertRunSession(week, item.day, { ...current, routeId }, {
          sessionId: item.sessionId,
          source: 'fit',
          localDate: item.localDate,
          startTs: item.startTs,
        });
      }
    } catch (err) {
      console.warn('FIT route import failed:', err);
    }
  }

  await saveStateToLocalStorage(false);
  const importedRuns = result.added.filter((item) => item.kind === 'run').length;
  const importedGym = result.added.length - importedRuns;
  showToast(`Imported ${[
    importedRuns ? `${importedRuns} run${importedRuns === 1 ? '' : 's'}` : '',
    importedGym ? `${importedGym} strength activit${importedGym === 1 ? 'y' : 'ies'}` : '',
  ].filter(Boolean).join(' · ')}`);
  _finishImport({ history: true });
}

export async function handleExternalCsvFile(file) {
  if (!file) return;
  if (file.size > CSV_IMPORT_LIMITS.maxBytes) {
    showToast('That CSV is too large to import.', true);
    return;
  }
  let text;
  try {
    // Read bytes so Excel's UTF-16 export is decoded correctly instead of
    // arriving as mojibake headers that look like an empty file.
    text = decodeCsvBytes(await file.arrayBuffer());
  } catch {
    try { text = await file.text(); }
    catch {
      showToast('That file could not be read.', true);
      return;
    }
  }
  const unit = (_getState()?.settings?.weightUnit === 'lbs') ? 'lbs' : 'kg';

  if (looksLikeBodyCsv(text)) {
    let body;
    try {
      body = parseBodyCsv(text, { unit });
    } catch (error) {
      showToast(error?.message || 'That bodyweight CSV could not be read.', true);
      return;
    }
    const existing = new Set((_getState()?.bodyWeightLog || []).map((e) => e.date));
    const already = body.entries.filter((e) => existing.has(e.date)).length;
    const ok = await confirmModal({
      title: 'Import bodyweight history?',
      message: [
        `${body.entries.length} weigh-in${body.entries.length === 1 ? '' : 's'} from ${body.entries[0].date} to ${body.entries.at(-1).date}.`,
        already ? `${already} date${already === 1 ? '' : 's'} already have a measurement and will be left unchanged.` : '',
        hasBodyFatColumn(text) ? 'This file also contains body fat. Weigh-in import keeps weigh-ins only — import the Body fat (%) CSV separately.' : '',
        '',
        'Only missing dates are added. Your existing measurements are never overwritten.',
      ].filter(Boolean).join('\n'),
      confirmLabel: 'Import weigh-ins',
    });
    if (!ok) return;
    const result = applyBodyweightCsvImport(_getState(), body);
    if (!result.added) {
      showToast('Those weigh-ins are already in your log.');
      return;
    }
    await saveStateToLocalStorage(false);
    showToast(`Imported ${result.added} weigh-in${result.added === 1 ? '' : 's'}${result.skipped ? ` · ${result.skipped} existing skipped` : ''}`);
    _finishImport();
    return;
  }

  if (looksLikeMeasurementsCsv(text)) {
    let measured;
    try {
      measured = parseMeasurementsCsv(text, { unit });
    } catch (error) {
      showToast(error?.message || 'That measurements CSV could not be read.', true);
      return;
    }
    const existing = new Set((_getState()?.bodyMeasurements || []).map((e) => e.date));
    const already = measured.entries.filter((e) => existing.has(e.date)).length;
    const ok = await confirmModal({
      title: 'Import body measurements?',
      message: [
        `${measured.entries.length} measurement date${measured.entries.length === 1 ? '' : 's'} from ${measured.entries[0].date} to ${measured.entries.at(-1).date}.`,
        already ? `${already} date${already === 1 ? '' : 's'} already have measurements and will be left unchanged.` : '',
        '',
        'Only missing dates are added. Existing measurements are never overwritten.',
      ].filter(Boolean).join('\n'),
      confirmLabel: 'Import measurements',
    });
    if (!ok) return;
    const result = applyMeasurementsCsvImport(_getState(), measured);
    if (!result.added) {
      showToast('Those dates already have measurements — existing entries are never overwritten.');
      return;
    }
    await saveStateToLocalStorage(false);
    showToast(`Imported ${result.added} measurement date${result.added === 1 ? '' : 's'}${result.skipped ? ` · ${result.skipped} existing skipped` : ''}`);
    _finishImport();
    return;
  }

  let parsed;
  try {
    parsed = parseWorkoutCsv(text, { unit });
  } catch (error) {
    showToast(error?.message || 'That CSV could not be read.', true);
    return;
  }
  if (!parsed.sessions.length) {
    showToast('No importable workouts found in that CSV.', true);
    return;
  }

  const ok = await confirmModal({
    title: 'Import workout history?',
    message: [
      `${parsed.sessions.length} workout${parsed.sessions.length === 1 ? '' : 's'} · ${parsed.totalSets} strength set${parsed.totalSets === 1 ? '' : 's'}`,
      parsed.cardioRows ? `${parsed.cardioRows} cardio row${parsed.cardioRows === 1 ? '' : 's'} will be imported as run data.` : '',
      parsed.skippedInvalid ? `${parsed.skippedInvalid} row${parsed.skippedInvalid === 1 ? '' : 's'} had no usable date, exercise or set value and will be skipped.` : '',
      '',
      'They are added as archived history. Your current program and active workout are left alone. Re-importing the same file will not duplicate sessions.',
    ].filter(Boolean).join('\n'),
    confirmLabel: 'Import history',
  });
  if (!ok) return;

  const result = applyWorkoutCsvImport(_getState(), parsed, {
    resolveName: (name) => resolveExercise(name)?.name || null,
  });
  if (!result.added.length) {
    showToast('Those workouts are already in your history.');
    return;
  }
  await saveStateToLocalStorage(false);
  const parts = [
    `${result.added.length} workout${result.added.length === 1 ? '' : 's'}`,
    `${result.sets} set${result.sets === 1 ? '' : 's'}`,
    result.runs ? `${result.runs} run${result.runs === 1 ? '' : 's'}` : '',
  ].filter(Boolean);
  showToast(`Imported ${parts.join(' · ')}`);
  _finishImport({ history: true });
}

export function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { void _importRawText(String(e.target?.result || '')); };
  reader.readAsText(file);
}

/**
 * Validate, migrate and atomically replace the live state. `skipConfirm` is for
 * the explicit "restore previous import backup" action, which has its own
 * confirmation. The pending debounce is cancelled first and the in-memory state
 * is replaced before the reload, so a pagehide flush can only write the NEW data.
 */
async function _importRawText(rawText, { skipConfirm = false } = {}) {
  let parsed;
  try { parsed = JSON.parse(rawText); }
  catch { showToast('Import failed: not a valid file', true); return false; }

  // Accepts BOTH the versioned envelope (with routes) AND legacy raw-appState
  // exports, and validates the shape before touching stored data.
  const result = parseImport(parsed);
  if (!result) { showToast('Import failed: unrecognised file', true); return false; }

  try {
    const checked = validateImport(result.state, {
      currentSchemaVersion: CURRENT_SCHEMA_VERSION,
      rawText,
    });
    if (!checked.ok) {
      showToast(importReasonMessage(checked.reason), true);
      return false;
    }

    // Upgrade a detached in-memory copy before touching the live state key.
    // A migration failure therefore leaves the user's current bytes intact.
    const migratedState = migrateState(checked.state);
    const routeCount = result.routeRecords.length || Object.keys(result.routes).length;
    if (!skipConfirm) {
      const confirmed = await confirmModal({
        title: 'Import this backup?',
        message: importPreviewMessage(importCounts(migratedState), routeCount),
        confirmLabel: 'Import backup',
        cancelLabel: 'Cancel',
      });
      if (!confirmed) return false;
    }

    // Undo point before overwriting live data. NOTE: writes to STORAGE_KEY —
    // the previous code wrote to a dead 'hybridAppState' key, so import was a
    // silent no-op. A restore of that backup deliberately keeps the same copy
    // rather than replacing it with the state being discarded.
    if (!skipConfirm) {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) localStorage.setItem(STORAGE_KEY + '_backup', current);
    }
    cancelPendingLocalSave();
    setAppState(migratedState);
    const importedJson = JSON.stringify(migratedState);
    localStorage.setItem(STORAGE_KEY, importedJson);
    localStorage.setItem(SAVED_AT_KEY, new Date().toISOString());
    await writeMirror(importedJson);

    // Restore rich session-linked routes when present; v2 backups fall back to
    // their legacy week/day map. Stable ids make either path idempotent.
    let restoredRouteCount = 0;
    try {
      restoredRouteCount = result.routeRecords.length
        ? await putRouteRecords(result.routeRecords)
        : await putRoutes(result.routes);
    } catch { /* routes best-effort */ }

    showToast(restoredRouteCount ? `Import successful (${restoredRouteCount} routes) — reloading…` : 'Import successful — reloading…');
    setTimeout(() => location.reload(), 1200);
    return true;
  } catch (error) {
    showToast(isStateMigrationError(error)
      ? 'Import stopped safely: this file could not be upgraded.'
      : 'Import failed while saving', true);
    return false;
  }
}

/** True when an import/restore has left a previous copy behind. */
export function hasImportBackup() {
  try { return !!localStorage.getItem(STORAGE_KEY + '_backup'); } catch { return false; }
}

/** Restore the single rolling copy written before the last import. */
export async function restoreImportBackup() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY + '_backup'); } catch { /* storage unavailable */ }
  if (!raw) { showToast('No previous import backup was found', true); return; }
  const ok = await confirmModal({
    title: 'Restore the previous data?',
    message: 'This replaces the current training data with the copy saved before your last import. Export a JSON backup first if you are unsure.',
    confirmLabel: 'Restore previous data',
    cancelLabel: 'Cancel',
    danger: true,
  });
  if (!ok) return;
  await _importRawText(raw, { skipConfirm: true });
}

export async function confirmResetAllData() {
  const ok = await confirmModal({
    title: 'Reset all training data?',
    message: 'Every logged workout, run and setting in openHybrid on this device will be cleared. JSON files already saved in your chosen folder are not deleted and can be imported again.',
    confirmLabel: 'Reset everything', danger: true,
  });
  if (!ok) return;
  const typed = await textPromptModal({
    title: 'Type DELETE to confirm',
    message: 'Logged training, settings, GPS routes and progress photos will be deleted from this device. A JSON backup is the only way to restore them. Export one first if you have not already.',
    label: 'Confirmation word',
    placeholder: 'DELETE',
    confirmLabel: 'Delete all data',
    maxLength: 12,
  });
  if (String(typed || '').trim().toUpperCase() !== 'DELETE') return;
  // Stop any pending debounce and block pagehide/visibility flushes from writing
  // the old in-memory state back after the keys are removed. The reload below is
  // the only path out of this state.
  setPersistenceSuspended(true);
  // Clear the real state key (+ rolling backups) and the GPS-route IndexedDB.
  // The previous code removed a dead 'hybridAppState' key, so reset was a no-op.
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY + '_backup');
  localStorage.removeItem(STORAGE_KEY + '_active_gps_session');
  localStorage.removeItem(SAVED_AT_KEY);
  clearRestTimerPersistence();
  try { await clearRouteDatabase(); } catch { /* best-effort */ }
  await clearMirror();
  showToast('Data cleared — reloading…');
  setTimeout(() => location.reload(), 1200);
}

// ==========================================
// HEALTH CONNECT
// ==========================================
function _syncHealthConnectUI() {
  if (!_getState) return;
  const hc = _getState().healthConnect || {};

  const statusCard      = document.getElementById('hcStatusCard');
  const indicator       = document.getElementById('hcStatusIndicator');
  const statusLabel     = document.getElementById('hcStatusLabel');
  const lastSync        = document.getElementById('hcLastSync');
  const connectBtn      = document.getElementById('hcConnectBtn');
  const syncNowBtn      = document.getElementById('hcSyncNowBtn');
  const dataTypes       = document.getElementById('hcDataTypes');
  const stepGoalInput   = document.getElementById('settingsStepGoal');
  const noteEl          = document.getElementById('hcNote');

  const connected = !!hc.connected;

  if (indicator) {
    indicator.className = 'hc-status-indicator ' + (connected ? 'hc-connected' : 'hc-disconnected');
  }
  if (statusLabel) statusLabel.textContent = connected ? 'Connected' : 'Not connected';
  if (lastSync) {
    lastSync.textContent = hc.lastSync
      ? 'Last sync: ' + new Date(hc.lastSync).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';
  }
  if (connectBtn) connectBtn.textContent = connected ? 'Disconnect' : 'Connect';
  if (syncNowBtn) syncNowBtn.style.display = connected ? 'block' : 'none';
  if (dataTypes) dataTypes.style.opacity = connected ? '1' : '0.45';
  if (stepGoalInput) stepGoalInput.value = hc.stepGoal || 10000;
  if (noteEl) noteEl.style.display = connected ? 'none' : 'block';

  // Sync-field toggles + honest per-field status, driven by the supported-field
  // contract only (no fake toggles — every toggle here has a real read path).
  const norm = normalizeSyncFields(hc.syncFields);
  const fieldStatus = hc.fieldStatus || {};
  HEALTH_FIELDS.forEach(({ id }) => {
    const el = document.querySelector(`[data-hc-field="${id}"]`);
    if (el) el.checked = norm[id];
    const statusEl = document.querySelector(`[data-hc-status="${id}"]`);
    if (statusEl) {
      // Status only means something once connected AND a real per-field outcome
      // has been recorded; otherwise show nothing rather than a misleading label.
      if (connected && norm[id] && fieldStatus[id]) {
        const { text, tone } = describeFieldStatus(fieldStatus[id]);
        statusEl.textContent = text;
        statusEl.className = 'hc-field-status hc-field-status--' + tone;
        statusEl.style.display = '';
      } else {
        statusEl.textContent = '';
        statusEl.style.display = 'none';
      }
    }
  });
}

export async function hcToggleConnect() {
  if (!_getState) return;
  const appState = _getState();
  const hc = appState.healthConnect;

  if (hc.connected) {
    hc.connected = false;
    hc.lastSync  = null;
    saveStateToLocalStorage(true);
    _syncHealthConnectUI();
    showToast('Health Connect disconnected');
    return;
  }

  // Real native bridge only — no phantom "connected" state on the web/PWA.
  if (!isHealthBridgeAvailable()) {
    showToast('Health Connect is only available in the Android app.', true);
    return;
  }
  const status = getHealthAvailability();
  if (status === 'NOT_INSTALLED') {
    showToast('Install/update Health Connect to continue.', true);
    return;
  }
  if (status !== 'AVAILABLE') {
    showToast('Health Connect is not supported on this device.', true);
    return;
  }

  // Persist the normalized selection (drops any legacy unsupported keys) so the
  // request path asks for EXACTLY the fields the user has enabled.
  hc.syncFields = normalizeSyncFields(hc.syncFields);
  const selected = selectedFieldIds(hc.syncFields);
  if (!selected.length) {
    showToast('Select at least one data type to sync.', true);
    return;
  }
  showToast('Opening Health Connect…');
  try {
    const { dayCount, fieldsWithData } = await connectAndSync(appState, saveStateToLocalStorage, { days: 90, fields: selected });
    _syncHealthConnectUI();
    if (dayCount > 0 && fieldsWithData > 0) showToast(`Health Connect synced (${dayCount} days) ✓`);
    else showToast('Connected — no recent data found for the selected types.');
  } catch (err) {
    _syncHealthConnectUI();
    if (err?.message === 'permissions-denied' || err?.message === 'permissions-revoked') { showToast('No Health Connect permissions were granted.', true); return; }
    if (err?.message === 'no-fields-selected') { showToast('Select at least one data type to sync.', true); return; }
    if (err?.message !== 'bridge-timeout') console.warn('Health Connect connect failed:', err);
    showToast('Could not connect to Health Connect.', true);
  }
}

export async function hcSyncNow() {
  if (!_getState) return;
  if (!isHealthBridgeAvailable()) { showToast('Sync requires the Android app.', true); return; }
  const appState = _getState();
  const hc = appState.healthConnect || (appState.healthConnect = {});
  hc.syncFields = normalizeSyncFields(hc.syncFields);
  const selected = selectedFieldIds(hc.syncFields);
  if (!selected.length) { showToast('Select at least one data type to sync.', true); return; }
  showToast('Syncing…');
  try {
    const { dayCount, fieldsWithData } = await syncHealthConnect(appState, saveStateToLocalStorage, { days: 90, fields: selected });
    _syncHealthConnectUI();
    if (dayCount > 0 && fieldsWithData > 0) showToast(`Synced ${dayCount} days ✓`);
    else showToast('No new data for the selected types.');
  } catch (err) {
    _syncHealthConnectUI();
    if (err?.message === 'permissions-revoked') { showToast('Health Connect permissions were revoked — reconnect to sync.', true); return; }
    if (err?.message === 'no-fields-selected') { showToast('Select at least one data type to sync.', true); return; }
    if (err?.message !== 'bridge-timeout') console.warn('Health Connect sync failed:', err);
    showToast('Sync failed.', true);
  }
}

export function saveStepGoal() {
  const val = parseInt(document.getElementById('settingsStepGoal')?.value, 10);
  if (isNaN(val) || val < 1000) return;
  const appState = _getState();
  appState.healthConnect.stepGoal = val;
  saveStateToLocalStorage(true);
  showToast(`Step goal: ${val.toLocaleString()}`);
}

export function hcToggleSyncField(field, enabled) {
  if (!isSupportedField(field)) return; // never persist an unsupported (fake) toggle
  const appState = _getState();
  const hc = appState.healthConnect || (appState.healthConnect = {});
  hc.syncFields = normalizeSyncFields(hc.syncFields);
  hc.syncFields[field] = !!enabled;
  saveStateToLocalStorage(true);
  // Turning a field off means we stop reading it; reflect that immediately.
  _syncHealthConnectUI();
}

// Called from Android native layer via window.onHealthConnectData(payload)
window.onHealthConnectData = function(payload) {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const appState = window._hybridGetState?.();
    if (!appState) return;
    const hc = appState.healthConnect;
    // Legacy native push path — accept only supported contract fields.
    if (data.hrv)       hc.hrv       = data.hrv;
    if (data.restingHR) hc.restingHR = data.restingHR;
    if (data.sleep)     hc.sleep     = data.sleep;
    if (data.steps)     hc.steps     = data.steps;
    hc.connected = true;
    hc.lastSync  = Date.now();
    saveStateToLocalStorage(true);
    _syncHealthConnectUI();
    document.dispatchEvent(new Event('app:storage-loaded'));
  } catch(e) { console.warn('Health Connect data error', e); }
};

// ==========================================
// BOOT: apply saved settings on load
// ==========================================
export function applySettingsOnBoot(appState) {
  const s = appState.settings || {};
  // Push rest config into the (state-free) timers module, and give it a
  // callback so a live ± adjustment persists back into settings.restOverrides.
  setRestTiers(s.restPeriods);
  setRestTimerEnabled(s.restTimerEnabled);
  setRestAlertConfig({
    sound: s.restAlertSound !== false,
    volume: s.restAlertVolume == null ? 0.4 : s.restAlertVolume,
  });
  setRestOverrides(s.restOverrides || {});
  initRestPersistence((overrides) => {
    const st = _getState?.();
    if (!st) return;
    if (!st.settings) st.settings = {};
    st.settings.restOverrides = overrides;
    saveStateToLocalStorage(true);
  });
  _applyTheme(s.theme || 'dark');
  applyPalette(document.documentElement, s.palette);
  const motionPref = normalizeMotionPreference(s.reducedMotion);
  applyMotionPreference(motionPref);
  if (motionPref === 'system') {
    window.matchMedia?.('(prefers-reduced-motion: reduce)').addEventListener('change', () => {
      if (normalizeMotionPreference(_getState?.()?.settings?.reducedMotion) === 'system') {
        applyMotionPreference('system');
      }
    });
  }

  // Re-apply system theme if OS preference changes at runtime
  if (s.theme === 'system') {
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (_getState?.()?.settings?.theme === 'system') {
        document.documentElement.dataset.theme = e.matches ? 'dark' : 'light';
        applyThemeTokens(document.documentElement);
      }
    });
  }

  _refreshAvatar();
  window._hybridGetState = _getState;
}
