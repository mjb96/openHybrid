// @ts-check
// =============================================================================
// SETTINGS REGISTRY (js/settings/registry.js)
//
// ST2 foundation: every stored setting has exactly one descriptor. Screens and
// search will render from this list; nothing may exist outside it. This slice
// is data + a coverage ratchet — the Settings markup is still hand-written, so
// the registry is not yet the renderer.
//
// Groups follow the H1 information architecture (§14.2): profile, training,
// units, notifications, appearance, health, data, about, system. `default`
// documents the factory value; the runtime default remains js/state.js until the
// registry drives rendering.
// =============================================================================

/**
 * @typedef {{
 *   key: string,
 *   label: string,
 *   type: 'text'|'number'|'select'|'toggle'|'time'|'object'|'system',
 *   group: 'profile'|'training'|'units'|'notifications'|'appearance'|'health'|'data'|'about'|'system',
 *   default: unknown,
 *   keywords?: string[],
 *   footer?: string,
 * }} SettingsEntry
 */

/** @type {ReadonlyArray<SettingsEntry>} */
export const SETTINGS_REGISTRY = Object.freeze([
  { key: 'name', label: 'Name', type: 'text', group: 'profile', default: '' },
  { key: 'avatarDataUrl', label: 'Avatar', type: 'object', group: 'profile', default: null, keywords: ['photo', 'picture'] },
  { key: 'fitnessGoal', label: 'Goal', type: 'select', group: 'profile', default: 'hybrid', keywords: ['strength', 'endurance'], footer: 'Used for plan recommendations.' },
  { key: 'fitnessLevel', label: 'Experience', type: 'select', group: 'profile', default: 'intermediate', keywords: ['beginner', 'advanced'], footer: 'Used for plan recommendations and load suggestions.' },
  { key: 'weightGoal', label: 'Weight goal', type: 'select', group: 'profile', default: 'maintain', keywords: ['cut', 'bulk', 'lose', 'gain'] },
  { key: 'equipmentTier', label: 'Equipment access', type: 'select', group: 'profile', default: 'gym', keywords: ['home', 'gym'], footer: 'Derived from the active equipment profile.' },
  { key: 'weeklyFrequency', label: 'Training days per week', type: 'select', group: 'profile', default: 'some', keywords: ['frequency', 'schedule'] },
  { key: 'sessionMinutes', label: 'Typical session length', type: 'select', group: 'profile', default: 45, keywords: ['time', 'minutes'] },
  { key: 'defaultBodyWeight', label: 'Body weight', type: 'number', group: 'profile', default: null, keywords: ['bodyweight', 'mass'] },
  { key: 'onboardingComplete', label: 'Setup complete', type: 'system', group: 'system', default: false },

  { key: 'progressionIncrement', label: 'Progression step', type: 'number', group: 'training', default: 2.5, keywords: ['increment', 'load'] },
  { key: 'autoAdvanceWeek', label: 'Auto-advance week', type: 'toggle', group: 'training', default: true, keywords: ['program week', 'advance'] },

  { key: 'previousValuesScope', label: 'Previous values', type: 'select', group: 'training', default: 'all', keywords: ['history', 'last time'] },
  { key: 'showPlateHints', label: 'Plate hints', type: 'toggle', group: 'training', default: false, keywords: ['plates', 'bar'] },
  { key: 'autoWarmupRamp', label: 'Warm-up ramp', type: 'toggle', group: 'training', default: false, keywords: ['warmup', 'ramp'] },
  { key: 'restPeriods', label: 'Rest tiers', type: 'object', group: 'training', default: 'DEFAULT_REST_TIERS', keywords: ['rest', 'timer'] },
  { key: 'restOverrides', label: 'Remembered rests', type: 'object', group: 'training', default: {}, keywords: ['rest', 'exercise'] },
  { key: 'restTimerEnabled', label: 'Rest timer', type: 'toggle', group: 'training', default: true, keywords: ['rest', 'timer'] },
  { key: 'restAlertSound', label: 'Rest alert sound', type: 'toggle', group: 'appearance', default: true, keywords: ['sound', 'rest'] },
  { key: 'restAlertVolume', label: 'Rest alert volume', type: 'number', group: 'appearance', default: 0.4, keywords: ['sound', 'volume'] },
  { key: 'exercisePrefs', label: 'Exercise preferences', type: 'object', group: 'training', default: {}, keywords: ['notes', 'rest', 'shape', 'load'] },
  { key: 'musclePriorities', label: 'Muscle priorities', type: 'object', group: 'training', default: {}, keywords: ['volume', 'focus'] },
  { key: 'keepAwake', label: 'Keep screen awake', type: 'toggle', group: 'appearance', default: true, keywords: ['screen', 'display'] },
  { key: 'livePR', label: 'Live PR banners', type: 'toggle', group: 'appearance', default: true, keywords: ['pr', 'record', 'banner'] },

  { key: 'weightUnit', label: 'Weight unit', type: 'select', group: 'units', default: 'kg', keywords: ['kg', 'lbs', 'pounds'] },
  { key: 'distanceUnit', label: 'Distance unit', type: 'select', group: 'units', default: 'km', keywords: ['km', 'miles'] },
  { key: 'measurementUnit', label: 'Measurement unit', type: 'select', group: 'units', default: 'cm', keywords: ['cm', 'inches', 'tape'] },
  { key: 'weekStartDay', label: 'Week starts on', type: 'select', group: 'units', default: 'mon', keywords: ['monday', 'sunday', 'week'] },

  { key: 'equipment', label: 'Equipment', type: 'object', group: 'training', default: {}, keywords: ['barbell', 'dumbbell', 'cable', 'rack'] },
  { key: 'bandWeights', label: 'Band weights', type: 'object', group: 'training', default: { L: 10, M: 20, H: 30 }, keywords: ['band', 'resistance'] },
  { key: 'equipmentProfiles', label: 'Equipment profiles', type: 'object', group: 'training', default: [], keywords: ['gym', 'home', 'plates'] },
  { key: 'activeEquipmentProfileId', label: 'Active equipment profile', type: 'object', group: 'training', default: null },

  { key: 'reminderTime', label: 'Reminder time', type: 'time', group: 'notifications', default: { hour: 7, minute: 30 }, keywords: ['notification', 'reminder'] },
  { key: 'notificationsEnabled', label: 'Workout reminder', type: 'toggle', group: 'notifications', default: false, keywords: ['notification', 'reminder', 'alarm'] },
  { key: 'notifWeeklySummary', label: 'Weekly summary', type: 'toggle', group: 'notifications', default: false, keywords: ['notification', 'week'] },
  { key: 'notifStreak', label: 'Streak alert', type: 'toggle', group: 'notifications', default: false, keywords: ['notification', 'streak'] },
  { key: 'streakAlertTime', label: 'Streak alert time', type: 'time', group: 'notifications', default: { hour: 20, minute: 0 }, keywords: ['notification', 'time'] },
  { key: 'notifMissedWorkout', label: 'Missed session alert', type: 'toggle', group: 'notifications', default: false, keywords: ['notification', 'missed'] },
  { key: 'notifFastingStage', label: 'Fasting stage nudges', type: 'toggle', group: 'notifications', default: true, keywords: ['fasting', 'notification'] },

  { key: 'fastingDefault', label: 'Default fast length', type: 'number', group: 'health', default: 16, keywords: ['fasting', 'hours'] },
  { key: 'targetWeight', label: 'Target weight', type: 'number', group: 'health', default: null, keywords: ['goal', 'bodyweight'] },
  { key: 'rateGoal', label: 'Weight rate goal', type: 'number', group: 'health', default: null, keywords: ['goal', 'rate', 'bodyweight'] },

  { key: 'theme', label: 'Theme', type: 'select', group: 'appearance', default: 'dark', keywords: ['light', 'dark', 'system'] },
  { key: 'palette', label: 'Palette', type: 'select', group: 'appearance', default: 'midnight', keywords: ['colour', 'color'] },
  { key: 'hybridTraining', label: 'Hybrid training', type: 'toggle', group: 'training', default: true, keywords: ['running', 'strength', 'balance'] },
  { key: 'modules', label: 'Modules', type: 'object', group: 'training', default: {}, keywords: ['running', 'fasting', 'health', 'recovery'] },
  { key: 'ui', label: 'Home and Progress cards', type: 'object', group: 'appearance', default: {}, keywords: ['customize', 'hidden', 'order'] },
]);

/** Keys that exist in older backups but must never be offered again. */
export const RETIRED_SETTINGS_KEYS = Object.freeze(['recoveryFeel']);

/** Settings-like values that live at the state root, not under `settings`. */
export const NON_SETTINGS_STATE_KEYS = Object.freeze([
  'thresholdPaceSeconds',
  'healthConnect.stepGoal',
  'prGoals',
]);

const BY_KEY = new Map(SETTINGS_REGISTRY.map((entry) => [entry.key, entry]));

/** @param {string} key */
export function settingsEntry(key) {
  return BY_KEY.get(String(key || '')) || null;
}

export function settingsRegistryKeys() {
  return SETTINGS_REGISTRY.map((entry) => entry.key);
}

/**
 * Keys present in storage but absent from the registry. H0/ST2 requires this to
 * be empty; a new setting must add its descriptor in the same change.
 * @param {Iterable<string>} keys
 */
export function missingSettingsKeys(keys) {
  return [...keys].filter((key) => !BY_KEY.has(key) && !RETIRED_SETTINGS_KEYS.includes(key));
}
