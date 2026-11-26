// @ts-check
// =============================================================================
// SETTINGS REGISTRY (js/settings/registry.js)
//
// ONE descriptor per stored setting. The store, search index, summary text,
// reset and migrations all read this list; no setting may exist outside it.
//
// A descriptor is deliberately declarative: key/path, section/page, type,
// default, choices or bounds, validator, copy, search keywords, visibility /
// enablement rules and an optional summary formatter. The runtime values still
// live in `appState` (settings.* or a documented root path); the registry is
// metadata and validation, not a second store.
//
// `group` is kept for the pre-Phase-4 settings cards. `section`/`page` are the
// new 13-row IA (profile, training, once, connections, data, about, system).
// =============================================================================
import { hybridTrainingEnabled, moduleEnabled } from '../modules.js';
import { DEFAULT_REST_TIERS } from '../workout/rest-duration.js';

/**
 * @typedef {'text'|'number'|'select'|'toggle'|'time'|'object'|'system'} SettingType
 * @typedef {'profile'|'training'|'once'|'connections'|'data'|'about'|'system'} SettingsSection
 * @typedef {{ ok: boolean, reason?: string }} EnabledState
 */

/**
 * @typedef {{
 *   key: string,
 *   path?: string,
 *   storage?: 'settings'|'root',
 *   label: string,
 *   type: SettingType,
 *   group: 'profile'|'training'|'units'|'notifications'|'appearance'|'health'|'data'|'about'|'system',
 *   section: SettingsSection,
 *   page: string,
 *   default: unknown,
 *   keywords: string[],
 *   anchor?: string,
 *   footer?: string,
 *   choices?: ReadonlyArray<string|number>,
 *   min?: number,
 *   max?: number,
 *   step?: number,
 *   summary?: (state: any) => string,
 *   visibleWhen?: (state: any) => boolean,
 *   enabledWhen?: (state: any) => EnabledState,
 *   deprecated?: boolean,
 * }} SettingsEntry
 */

const on = (state, key) => state?.settings?.[key] !== false;
const moduleOn = (state, id) => moduleEnabled(state, id);
const timeText = (value) => {
  const hour = Number(value?.hour);
  const minute = Number(value?.minute);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/** @param {ReadonlyArray<SettingsEntry>} entries */
const freeze = (entries) => Object.freeze(entries.map((entry) => Object.freeze(entry)));

/** @type {ReadonlyArray<SettingsEntry>} */
export const SETTINGS_REGISTRY = freeze([
  // ── Profile ────────────────────────────────────────────────────────────────
  { key: 'name', label: 'Name', type: 'text', group: 'profile', section: 'profile', page: 'profile.identity', default: '', keywords: ['name', 'athlete'], summary: (s) => s?.settings?.name || 'Athlete' },
  { key: 'avatarDataUrl', label: 'Avatar', type: 'object', group: 'profile', section: 'profile', page: 'profile.identity', default: null, keywords: ['photo', 'picture', 'avatar'], summary: () => 'Local photo' },
  { key: 'fitnessGoal', label: 'Training goal', type: 'select', group: 'profile', section: 'profile', page: 'profile.training-goal', default: 'hybrid', choices: ['strength', 'hybrid', 'endurance'], keywords: ['strength', 'endurance', 'hybrid'], footer: 'Used for plan recommendations and the Hybrid Score.', summary: (s) => titleCase(s?.settings?.fitnessGoal || 'hybrid') },
  { key: 'fitnessLevel', label: 'Experience', type: 'select', group: 'profile', section: 'profile', page: 'profile.training-goal', default: 'intermediate', choices: ['beginner', 'intermediate', 'advanced'], keywords: ['beginner', 'advanced'], footer: 'Used for plan recommendations and load suggestions.', summary: (s) => titleCase(s?.settings?.fitnessLevel || 'intermediate') },
  { key: 'weightGoal', label: 'Body goal', type: 'select', group: 'profile', section: 'profile', page: 'profile.training-goal', default: 'maintain', choices: ['cut', 'maintain', 'bulk'], keywords: ['cut', 'bulk', 'lose', 'gain'], summary: (s) => titleCase(s?.settings?.weightGoal || 'maintain') },
  { key: 'defaultBodyWeight', label: 'Body weight', type: 'number', group: 'profile', section: 'profile', page: 'profile.body', default: null, min: 20, max: 500, step: 0.1, keywords: ['bodyweight', 'mass', 'weight'], summary: (s) => numberUnit(s?.settings?.defaultBodyWeight, s?.settings?.weightUnit || 'kg') },
  { key: 'targetWeight', label: 'Target weight', type: 'number', group: 'health', section: 'profile', page: 'profile.body', default: null, min: 20, max: 500, step: 0.1, keywords: ['goal', 'bodyweight', 'target'], summary: (s) => numberUnit(s?.settings?.targetWeight, s?.settings?.weightUnit || 'kg') },
  { key: 'rateGoal', label: 'Weight rate goal', type: 'number', group: 'health', section: 'profile', page: 'profile.body', default: null, min: -2, max: 2, step: 0.05, keywords: ['goal', 'rate', 'bodyweight'], summary: (s) => s?.settings?.rateGoal == null ? '' : `${s.settings.rateGoal} ${s?.settings?.weightUnit || 'kg'}/wk` },
  { key: 'heightCm', label: 'Height', type: 'number', group: 'profile', section: 'profile', page: 'profile.body', default: null, min: 50, max: 300, step: 0.1, keywords: ['height', 'body'], summary: (s) => s?.settings?.heightCm ? `${s.settings.heightCm} cm` : '' },
  { key: 'birthDate', label: 'Date of birth', type: 'text', group: 'profile', section: 'profile', page: 'profile.body', default: null, keywords: ['birth', 'dob', 'age'], footer: 'Optional. Stored only for future calculations; nothing currently derives from it.', summary: (s) => s?.settings?.birthDate || '' },
  { key: 'sex', label: 'Sex', type: 'select', group: 'profile', section: 'profile', page: 'profile.body', default: null, choices: ['female', 'male', 'other', 'prefer_not_to_say'], keywords: ['sex', 'gender'], footer: 'Optional. Used for calculations only, never displayed publicly.', summary: (s) => s?.settings?.sex ? titleCase(String(s.settings.sex).replace(/_/g, ' ')) : '' },
  { key: 'trainingStartDate', label: 'Training start', type: 'text', group: 'profile', section: 'profile', page: 'profile.training-goal', default: null, keywords: ['start', 'member', 'training'], summary: (s) => s?.settings?.trainingStartDate || '' },
  { key: 'prGoals', path: 'prGoals', storage: 'root', label: 'Lift targets', type: 'object', group: 'profile', section: 'profile', page: 'profile.training-goal', default: {}, keywords: ['pr', 'goal', 'target', 'lift'], summary: (s) => `${Object.keys(s?.prGoals || {}).length} targets` },
  { key: 'weeklyFrequency', label: 'Training days per week', type: 'select', group: 'profile', section: 'training', page: 'training.schedule', default: 'some', choices: ['low', 'some', 'high', 'daily'], keywords: ['frequency', 'schedule', 'days'], summary: (s) => titleCase(s?.settings?.weeklyFrequency || 'some') },
  { key: 'sessionMinutes', label: 'Typical session length', type: 'number', group: 'profile', section: 'training', page: 'training.schedule', default: 45, choices: [30, 45, 60, 90], min: 15, max: 240, step: 5, keywords: ['time', 'minutes', 'length'], summary: (s) => `${s?.settings?.sessionMinutes || 45} min` },
  { key: 'equipmentTier', label: 'Equipment access', type: 'select', group: 'profile', section: 'once', page: 'once.equipment', default: 'gym', choices: ['home', 'gym'], keywords: ['home', 'gym'], footer: 'Derived from the active equipment profile.', summary: (s) => titleCase(s?.settings?.equipmentTier || 'gym') },
  { key: 'onboardingComplete', label: 'Setup complete', type: 'system', group: 'system', section: 'system', page: 'system', default: false, keywords: ['setup', 'onboarding'], summary: (s) => s?.settings?.onboardingComplete ? 'Yes' : 'No' },

  // ── Training ──────────────────────────────────────────────────────────────
  { key: 'progressionIncrement', label: 'Progression step', type: 'number', group: 'training', section: 'training', page: 'training.workout', default: 2.5, min: 0.25, max: 20, step: 0.25, keywords: ['increment', 'load', 'progression'], summary: (s) => numberUnit(s?.settings?.progressionIncrement, s?.settings?.weightUnit || 'kg') },
  { key: 'autoAdvanceWeek', label: 'Auto-advance week', type: 'toggle', group: 'training', section: 'training', page: 'training.schedule', default: true, keywords: ['program week', 'advance', 'schedule'], summary: (s) => on(s, 'autoAdvanceWeek') ? 'On' : 'Off' },
  { key: 'previousValuesScope', label: 'Previous values', type: 'select', group: 'training', section: 'training', page: 'training.workout', default: 'all', choices: ['all', 'program'], keywords: ['history', 'last time', 'previous'], summary: (s) => s?.settings?.previousValuesScope === 'program' ? 'This program' : 'Any workout' },
  { key: 'showPlateHints', label: 'Plate hints', type: 'toggle', group: 'training', section: 'training', page: 'training.workout', default: false, keywords: ['plates', 'bar', 'hints', 'input'], summary: (s) => on(s, 'showPlateHints') ? 'On' : 'Off' },
  { key: 'autoWarmupRamp', label: 'Warm-up ramp', type: 'toggle', group: 'training', section: 'training', page: 'training.workout', default: false, keywords: ['warmup', 'ramp'], summary: (s) => on(s, 'autoWarmupRamp') ? 'On' : 'Off' },
  { key: 'restPeriods', label: 'Rest tiers', type: 'object', group: 'training', section: 'training', page: 'training.timers', default: DEFAULT_REST_TIERS, keywords: ['rest', 'timer', 'tiers'], summary: () => 'Default tiers' },
  { key: 'restOverrides', label: 'Remembered rests', type: 'object', group: 'training', section: 'training', page: 'training.workout', default: {}, keywords: ['rest', 'exercise', 'override'], summary: (s) => `${Object.keys(s?.settings?.restOverrides || {}).length} lifts` },
  { key: 'restTimerEnabled', anchor: 'rest-timer', label: 'Rest timer', type: 'toggle', group: 'training', section: 'training', page: 'training.workout', default: true, keywords: ['rest', 'timer'], summary: (s) => on(s, 'restTimerEnabled') ? 'On' : 'Off' },
  { key: 'restAlertSound', label: 'Rest alert sound', type: 'toggle', group: 'appearance', section: 'training', page: 'training.timers', default: true, keywords: ['sound', 'rest', 'alert'], enabledWhen: (s) => ({ ok: on(s, 'restTimerEnabled'), reason: 'Turn the rest timer on first.' }), summary: (s) => on(s, 'restAlertSound') ? 'On' : 'Off' },
  { key: 'restAlertVolume', label: 'Rest alert volume', type: 'number', group: 'appearance', section: 'training', page: 'training.timers', default: 0.4, min: 0, max: 1, step: 0.05, keywords: ['sound', 'volume', 'rest'], enabledWhen: (s) => ({ ok: on(s, 'restTimerEnabled') && on(s, 'restAlertSound'), reason: 'Turn the rest timer and sound on first.' }), summary: (s) => `${Math.round((Number(s?.settings?.restAlertVolume) || 0) * 100)}%` },
  { key: 'exercisePrefs', label: 'Exercise preferences', type: 'object', group: 'training', section: 'training', page: 'training.workout', default: {}, keywords: ['notes', 'rest', 'shape', 'load', 'exercise'], summary: (s) => `${Object.keys(s?.settings?.exercisePrefs || {}).length} lifts` },
  { key: 'favouriteExercises', label: 'Favourite exercises', type: 'object', group: 'training', section: 'training', page: 'training.workout', default: {}, keywords: ['favourites', 'star', 'quick pick', 'exercise'], summary: (s) => `${Object.keys(s?.settings?.favouriteExercises || {}).length} lifts` },
  { key: 'musclePriorities', label: 'Muscle priorities', type: 'object', group: 'training', section: 'training', page: 'training.schedule', default: {}, keywords: ['volume', 'focus', 'muscle'], summary: (s) => `${Object.keys(s?.settings?.musclePriorities || {}).length} muscles` },
  { key: 'keepAwake', label: 'Keep screen awake', type: 'toggle', group: 'appearance', section: 'training', page: 'training.workout', default: true, keywords: ['screen', 'display', 'awake'], summary: (s) => on(s, 'keepAwake') ? 'On' : 'Off' },
  { key: 'livePR', label: 'Live PR banners', type: 'toggle', group: 'appearance', section: 'training', page: 'training.workout', default: true, keywords: ['pr', 'record', 'banner', 'haptics'], summary: (s) => on(s, 'livePR') ? 'On' : 'Off' },

  // ── Units and formats ─────────────────────────────────────────────────────
  { key: 'weightUnit', label: 'Weight unit', type: 'select', group: 'units', section: 'once', page: 'once.units', default: 'kg', choices: ['kg', 'lbs'], keywords: ['kg', 'lbs', 'pounds', 'unit'], summary: (s) => s?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg' },
  { key: 'distanceUnit', label: 'Distance unit', type: 'select', group: 'units', section: 'once', page: 'once.units', default: 'km', choices: ['km', 'mi'], keywords: ['km', 'miles', 'unit'], summary: (s) => s?.settings?.distanceUnit === 'mi' ? 'mi' : 'km' },
  { key: 'measurementUnit', label: 'Measurement unit', type: 'select', group: 'units', section: 'once', page: 'once.units', default: 'cm', choices: ['cm', 'in'], keywords: ['cm', 'inches', 'tape', 'unit'], summary: (s) => s?.settings?.measurementUnit === 'in' ? 'in' : 'cm' },
  { key: 'weekStartDay', label: 'Week starts on', type: 'select', group: 'units', section: 'training', page: 'training.schedule', default: 'mon', choices: ['mon', 'sun'], keywords: ['monday', 'sunday', 'week'], summary: (s) => s?.settings?.weekStartDay === 'sun' ? 'Sunday' : 'Monday' },
  { key: 'thresholdPaceSeconds', path: 'thresholdPaceSeconds', storage: 'root', label: 'Threshold pace', type: 'number', group: 'units', section: 'once', page: 'once.units', default: null, min: 60, max: 3600, keywords: ['pace', 'threshold', 'running'], visibleWhen: (s) => moduleOn(s, 'running'), summary: (s) => paceText(s?.thresholdPaceSeconds, s?.settings?.distanceUnit || 'km') },

  // ── Equipment ─────────────────────────────────────────────────────────────
  { key: 'equipment', label: 'Equipment', type: 'object', group: 'training', section: 'once', page: 'once.equipment', default: { barbell: true, rack: true, dumbbells: true, cables: true, pullupBar: true, bands: false, kettlebells: false, ezBar: false, treadmill: false }, keywords: ['barbell', 'dumbbell', 'cable', 'rack', 'equipment'], summary: (s) => `${Object.values(s?.settings?.equipment || {}).filter(Boolean).length} available` },
  { key: 'bandWeights', label: 'Band weights', type: 'object', group: 'training', section: 'once', page: 'once.equipment', default: { L: 10, M: 20, H: 30 }, keywords: ['band', 'resistance', 'weight'], summary: (s) => bandSummary(s?.settings?.bandWeights, s?.settings?.weightUnit || 'kg') },
  { key: 'equipmentProfiles', label: 'Equipment profiles', type: 'object', group: 'training', section: 'once', page: 'once.equipment', default: [], keywords: ['gym', 'home', 'plates', 'profiles'], summary: (s) => `${(s?.settings?.equipmentProfiles || []).length} profiles` },
  { key: 'activeEquipmentProfileId', label: 'Active equipment profile', type: 'object', group: 'training', section: 'once', page: 'once.equipment', default: null, keywords: ['active', 'gym', 'profile'], summary: (s) => activeProfileName(s) },

  // ── Reminders ─────────────────────────────────────────────────────────────
  { key: 'reminderTime', label: 'Reminder time', type: 'time', group: 'notifications', section: 'training', page: 'training.reminders', default: { hour: 7, minute: 30 }, keywords: ['notification', 'reminder', 'time'], enabledWhen: (s) => ({ ok: on(s, 'notificationsEnabled'), reason: 'Turn workout reminders on first.' }), summary: (s) => timeText(s?.settings?.reminderTime) },
  { key: 'notificationsEnabled', label: 'Workout reminders', type: 'toggle', group: 'notifications', section: 'training', page: 'training.reminders', default: false, keywords: ['notification', 'reminder', 'alarm'], summary: (s) => on(s, 'notificationsEnabled') ? 'On' : 'Off' },
  { key: 'notifWeeklySummary', label: 'Weekly summary', type: 'toggle', group: 'notifications', section: 'training', page: 'training.reminders', default: false, keywords: ['notification', 'week', 'summary'], enabledWhen: (s) => ({ ok: on(s, 'notificationsEnabled'), reason: 'Turn workout reminders on first.' }), summary: (s) => on(s, 'notifWeeklySummary') ? 'On' : 'Off' },
  { key: 'notifStreak', label: 'Streak alert', type: 'toggle', group: 'notifications', section: 'training', page: 'training.reminders', default: false, keywords: ['notification', 'streak'], enabledWhen: (s) => ({ ok: on(s, 'notificationsEnabled'), reason: 'Turn workout reminders on first.' }), summary: (s) => on(s, 'notifStreak') ? 'On' : 'Off' },
  { key: 'streakAlertTime', label: 'Streak alert time', type: 'time', group: 'notifications', section: 'training', page: 'training.reminders', default: { hour: 20, minute: 0 }, keywords: ['notification', 'time', 'streak'], enabledWhen: (s) => ({ ok: on(s, 'notificationsEnabled') && on(s, 'notifStreak'), reason: 'Turn streak alerts on first.' }), summary: (s) => timeText(s?.settings?.streakAlertTime) },
  { key: 'notifMissedWorkout', label: 'Missed session alert', type: 'toggle', group: 'notifications', section: 'training', page: 'training.reminders', default: false, keywords: ['notification', 'missed', 'session'], enabledWhen: (s) => ({ ok: on(s, 'notificationsEnabled'), reason: 'Turn workout reminders on first.' }), summary: (s) => on(s, 'notifMissedWorkout') ? 'On' : 'Off' },
  { key: 'notifFastingStage', label: 'Fasting stage nudges', type: 'toggle', group: 'notifications', section: 'training', page: 'training.reminders', default: true, keywords: ['fasting', 'notification', 'stage'], visibleWhen: (s) => moduleOn(s, 'fasting'), summary: (s) => on(s, 'notifFastingStage') ? 'On' : 'Off' },

  // ── Modules / fasting / appearance / data model ───────────────────────────
  { key: 'fastingDefault', label: 'Default fast length', type: 'number', group: 'health', section: 'once', page: 'once.modules', default: 16, choices: [12, 16, 18, 20], min: 1, max: 72, step: 1, keywords: ['fasting', 'hours', 'protocol'], visibleWhen: (s) => moduleOn(s, 'fasting'), summary: (s) => `${s?.settings?.fastingDefault || 16} h` },
  { key: 'theme', label: 'Theme', type: 'select', group: 'appearance', section: 'once', page: 'once.look', default: 'dark', choices: ['dark', 'light', 'system'], keywords: ['light', 'dark', 'system', 'theme'], summary: (s) => titleCase(s?.settings?.theme || 'dark') },
  { key: 'palette', label: 'Palette', type: 'select', group: 'appearance', section: 'once', page: 'once.look', default: 'midnight', choices: ['midnight', 'slate', 'forest', 'ember'], keywords: ['colour', 'color', 'palette', 'accent'], summary: (s) => titleCase(s?.settings?.palette || 'midnight') },
  { key: 'reducedMotion', label: 'Motion', type: 'select', group: 'appearance', section: 'once', page: 'once.look', default: 'system', choices: ['system', 'reduce', 'full'], keywords: ['reduced motion', 'animation', 'accessibility'], summary: (s) => titleCase(s?.settings?.reducedMotion || 'system') },
  { key: 'ui', label: 'Home and Progress layout', type: 'object', group: 'appearance', section: 'once', page: 'once.look', default: {}, keywords: ['customize', 'hidden', 'order', 'home layout'], summary: () => 'Customized' },
  { key: 'hybridTraining', label: 'Hybrid presentation', type: 'toggle', group: 'training', section: 'once', page: 'once.modules', default: true, keywords: ['running', 'strength', 'balance', 'hybrid'], summary: (s) => hybridTrainingEnabled(s) ? 'On' : 'Off' },
  { key: 'modules', label: 'Feature modules', type: 'object', group: 'training', section: 'once', page: 'once.modules', default: {}, keywords: ['running', 'fasting', 'health', 'recovery', 'modules'], summary: (s) => `${['running', 'fasting', 'health', 'recovery'].filter((id) => moduleOn(s, id)).length} of 4 on` },
  { key: 'modules.running', path: 'settings.modules.running', label: 'Running & GPS', type: 'toggle', group: 'training', section: 'once', page: 'once.modules', default: true, keywords: ['running', 'gps', 'module'], summary: (s) => moduleOn(s, 'running') ? 'On' : 'Off' },
  { key: 'modules.fasting', path: 'settings.modules.fasting', label: 'Fasting', type: 'toggle', group: 'training', section: 'once', page: 'once.modules', default: true, keywords: ['fasting', 'module'], summary: (s) => moduleOn(s, 'fasting') ? 'On' : 'Off' },
  { key: 'modules.health', path: 'settings.modules.health', label: 'Health Connect', type: 'toggle', group: 'training', section: 'once', page: 'once.modules', default: true, keywords: ['health', 'connect', 'module'], summary: (s) => moduleOn(s, 'health') ? 'On' : 'Off' },
  { key: 'modules.recovery', path: 'settings.modules.recovery', label: 'Recovery & Load', type: 'toggle', group: 'training', section: 'once', page: 'once.modules', default: true, keywords: ['recovery', 'load', 'module'], summary: (s) => moduleOn(s, 'recovery') ? 'On' : 'Off' },

  // ── Root settings-like values ─────────────────────────────────────────────
  { key: 'healthConnect.connected', path: 'healthConnect.connected', storage: 'root', label: 'Health Connect', type: 'toggle', group: 'health', section: 'connections', page: 'connections.integrations', default: false, keywords: ['health connect', 'android', 'integration'], summary: (s) => s?.healthConnect?.connected ? 'Connected' : 'Not connected' },
  { key: 'healthConnect.lastSync', path: 'healthConnect.lastSync', storage: 'root', label: 'Health Connect last sync', type: 'system', group: 'health', section: 'connections', page: 'connections.integrations', default: null, keywords: ['health connect', 'sync'], summary: (s) => s?.healthConnect?.lastSync ? 'Synced' : 'Never' },
  { key: 'healthConnect.stepGoal', path: 'healthConnect.stepGoal', storage: 'root', label: 'Daily step goal', type: 'number', group: 'health', section: 'connections', page: 'connections.integrations', default: 10000, min: 1000, max: 50000, step: 500, keywords: ['steps', 'goal', 'health'], visibleWhen: (s) => moduleOn(s, 'health'), summary: (s) => `${Number(s?.healthConnect?.stepGoal || 10000).toLocaleString('en-AU')} steps` },
  { key: 'healthConnect.syncFields', path: 'healthConnect.syncFields', storage: 'root', label: 'Health Connect data types', type: 'object', group: 'health', section: 'connections', page: 'connections.integrations', default: { steps: true, restingHR: true, hrv: true, sleep: true }, keywords: ['health connect', 'steps', 'hrv', 'sleep'], visibleWhen: (s) => moduleOn(s, 'health'), summary: (s) => `${Object.values(s?.healthConnect?.syncFields || {}).filter(Boolean).length} types` },

  // ── Retired / legacy stores (registered so nothing hides) ────────────────
  { key: 'recoveryFeel', label: 'Recovery feel (retired)', type: 'select', group: 'system', section: 'system', page: 'system', default: null, keywords: ['recovery', 'retired'], deprecated: true, summary: () => 'Retired' },
  { key: 'profileSections', path: 'profileSections', storage: 'root', label: 'Profile sections (legacy)', type: 'object', group: 'system', section: 'system', page: 'system', default: { order: null, hidden: [] }, keywords: ['profile', 'layout', 'legacy'], deprecated: true, summary: () => 'Legacy' },
  { key: 'dashboardTiles', path: 'dashboardTiles', storage: 'root', label: 'Dashboard tiles (legacy)', type: 'object', group: 'system', section: 'system', page: 'system', default: { order: null, hidden: null }, keywords: ['dashboard', 'layout', 'legacy'], deprecated: true, summary: () => 'Legacy' },
]);

const BY_KEY = new Map(SETTINGS_REGISTRY.map((entry) => [entry.key, entry]));

/** Old card ids that map to a new key/section. @type {Readonly<Record<string, string>>} */
export const SETTINGS_KEY_ALIASES = Object.freeze({
  goal: 'fitnessGoal',
  level: 'fitnessLevel',
  unit: 'weightUnit',
  distance: 'distanceUnit',
  measurement: 'measurementUnit',
});

/** Keys that exist in older backups but must never be offered again. */
export const RETIRED_SETTINGS_KEYS = Object.freeze(['recoveryFeel']);

/** Settings-like values that live at the state root, not under `settings`. */
export const NON_SETTINGS_STATE_KEYS = Object.freeze([
  'thresholdPaceSeconds',
  'healthConnect.stepGoal',
  'prGoals',
]);

/**
 * Top-level Settings rows and their pushed pages. `route` is the hash segment
 * after #/settings/; `page` is the registry page id.
 * @type {ReadonlyArray<{id:string, label:string, route:string, section:string}>}
 */
export const SETTINGS_PAGES = Object.freeze([
  { id: 'training.workout', label: 'Workout', route: 'workout', section: 'training' },
  { id: 'training.timers', label: 'Timer alerts', route: 'timer-alerts', section: 'training' },
  { id: 'training.schedule', label: 'Plan & schedule', route: 'plan-schedule', section: 'training' },
  { id: 'training.reminders', label: 'Reminders', route: 'reminders', section: 'training' },
  { id: 'once.units', label: 'Units & language', route: 'units', section: 'once' },
  { id: 'once.equipment', label: 'Equipment', route: 'equipment', section: 'once' },
  { id: 'once.look', label: 'Look & Home', route: 'look-home', section: 'once' },
  { id: 'once.modules', label: 'Modules', route: 'modules', section: 'once' },
  { id: 'connections.watches', label: 'Watches', route: 'watches', section: 'connections' },
  { id: 'connections.integrations', label: 'Integrations', route: 'integrations', section: 'connections' },
  { id: 'connections.coach', label: 'AI Coach', route: 'ai-coach', section: 'connections' },
  { id: 'data.backup', label: 'Data & backup', route: 'data', section: 'data' },
  { id: 'about', label: 'About', route: 'about', section: 'about' },
]);

const PAGE_BY_ROUTE = new Map(SETTINGS_PAGES.map((page) => [page.route, page]));
const PAGE_BY_ID = new Map(SETTINGS_PAGES.map((page) => [page.id, page]));

/** @param {string} route */
export function settingsPageForRoute(route) {
  return PAGE_BY_ROUTE.get(String(route || '')) || null;
}

/** @param {string} id */
export function settingsPageById(id) {
  return PAGE_BY_ID.get(String(id || '')) || null;
}

/** @param {string} section */
export function settingsPagesForSection(section) {
  return SETTINGS_PAGES.filter((page) => page.section === section);
}

/** @param {string} key */
export function settingsEntry(key) {
  const resolved = SETTINGS_KEY_ALIASES[String(key || '')] || String(key || '');
  return BY_KEY.get(resolved) || null;
}

export function settingsRegistryKeys() {
  return SETTINGS_REGISTRY.map((entry) => entry.key);
}

/** Entries the UI may render (deprecated stores are migration-only). */
export function renderableSettings() {
  return SETTINGS_REGISTRY.filter((entry) => !entry.deprecated && entry.type !== 'system');
}

/** @param {SettingsSection|string} section */
export function settingsForSection(section) {
  return renderableSettings().filter((entry) => entry.section === section);
}

/** @param {string} page */
export function settingsForPage(page) {
  return renderableSettings().filter((entry) => entry.page === page);
}

/** @param {Iterable<string>} keys */
export function missingSettingsKeys(keys) {
  return [...keys].filter((key) => !BY_KEY.has(key) && !RETIRED_SETTINGS_KEYS.includes(key));
}

/** Stable deep-link anchor for one setting. */
export function settingAnchor(entry) {
  return entry.anchor || String(entry.key).replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/\./g, '-').toLowerCase();
}

/** @param {string} anchor */
export function settingsEntryByAnchor(anchor) {
  const needle = String(anchor || '').toLowerCase();
  return SETTINGS_REGISTRY.find((entry) => settingAnchor(entry) === needle) || null;
}

/** @param {SettingsEntry} entry */
export function settingPath(entry) {
  return entry.path || `settings.${entry.key}`;
}

/** @param {any} state @param {SettingsEntry} entry */
export function readSetting(state, entry) {
  let cursor = state;
  for (const part of settingPath(entry).split('.')) {
    if (cursor == null) return entry.default;
    cursor = cursor[part];
  }
  return cursor === undefined ? entry.default : cursor;
}

/** @param {any} state @param {SettingsEntry} entry @param {unknown} value */
export function writeSetting(state, entry, value) {
  if (!state) return;
  const parts = settingPath(entry).split('.');
  let cursor = state;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts[parts.length - 1]] = value;
}

/** @param {SettingsEntry} entry @param {any} value @returns {{ ok: boolean, reason?: string }} */
export function validateSettingValue(entry, value) {
  if (entry.deprecated) return { ok: true };
  const isNullish = value === null || value === undefined;
  switch (entry.type) {
    case 'text':
      if (isNullish && entry.default === null) return { ok: true };
      if (typeof value !== 'string') return { ok: false, reason: 'Must be text.' };
      if (entry.key === 'name' && value.length > 40) return { ok: false, reason: 'Keep the name under 40 characters.' };
      return { ok: true };
    case 'number': {
      if (isNullish && entry.default === null) return { ok: true };
      const number = Number(value);
      if (!Number.isFinite(number)) return { ok: false, reason: 'Must be a number.' };
      if (entry.min != null && number < entry.min) return { ok: false, reason: `Must be at least ${entry.min}.` };
      if (entry.max != null && number > entry.max) return { ok: false, reason: `Must be at most ${entry.max}.` };
      return { ok: true };
    }
    case 'select':
      if (isNullish && entry.default === null) return { ok: true };
      if (Array.isArray(entry.choices) && entry.choices.length && !entry.choices.includes(value)) {
        return { ok: false, reason: 'Not one of the allowed values.' };
      }
      return { ok: true };
    case 'toggle':
      return typeof value === 'boolean' ? { ok: true } : { ok: false, reason: 'Must be on or off.' };
    case 'time': {
      if (!value || typeof value !== 'object') return { ok: false, reason: 'Invalid time.' };
      const hour = Number(value.hour);
      const minute = Number(value.minute);
      if (!Number.isInteger(hour) || hour < 0 || hour > 23) return { ok: false, reason: 'Hour must be 0–23.' };
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return { ok: false, reason: 'Minute must be 0–59.' };
      return { ok: true };
    }
    case 'object':
      return value !== undefined && typeof value === 'object' ? { ok: true } : { ok: false, reason: 'Invalid object.' };
    default:
      return { ok: true };
  }
}

/** @param {any} state @param {SettingsEntry} entry */
export function settingVisible(state, entry) {
  return typeof entry.visibleWhen === 'function' ? !!entry.visibleWhen(state) : true;
}

/** @param {any} state @param {SettingsEntry} entry */
export function settingEnabled(state, entry) {
  if (!settingVisible(state, entry)) return { ok: false, reason: 'Hidden.' };
  if (typeof entry.enabledWhen !== 'function') return { ok: true };
  return entry.enabledWhen(state) || { ok: true };
}

/** @param {SettingsEntry} entry @param {any} state */
export function settingSummary(entry, state) {
  try {
    if (typeof entry.summary === 'function') return String(entry.summary(state) || '');
  } catch { /* a broken formatter must never break a page */ }
  return '';
}

function titleCase(value) {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function numberUnit(value, unit) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${number} ${unit}` : '';
}

function paceText(seconds, unit) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return '';
  const per = Math.round(unit === 'mi' ? total / 0.621371 : total);
  return `${Math.floor(per / 60)}:${String(per % 60).padStart(2, '0')} /${unit}`;
}

function bandSummary(weights, unit) {
  const values = weights || {};
  if (!values.L && !values.M && !values.H) return '';
  return `L ${values.L || 0} · M ${values.M || 0} · H ${values.H || 0} ${unit}`;
}

function activeProfileName(state) {
  const profiles = state?.settings?.equipmentProfiles || [];
  const active = profiles.find((profile) => profile.id === state?.settings?.activeEquipmentProfileId);
  return active?.name || profiles[0]?.name || '';
}
