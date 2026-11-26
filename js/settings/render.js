// @ts-check
// =============================================================================
// SETTINGS RENDERER (js/settings/render.js)
//
// Composes the registry + store + components into the top-level Settings page
// and every sub-page. Pages do not hand-roll rows: they select registered keys
// and add only the custom controls whose side effects already have an owner in
// settings.js (equipment, data/backup, Health Connect, rest tiers).
// =============================================================================
import { icon } from '../ui/icons.js';
import { APP_VERSION } from '../constants.js';
import { moduleEnabled, hybridTrainingEnabled } from '../modules.js';
import { getActiveEquipmentProfile, ensureEquipmentProfiles, EQUIPMENT_KEYS } from '../equipment-profiles.js';
import { latestWeighIn } from '../metrics/bodyweight.js';
import { DEFAULT_REST_TIERS } from '../workout/rest-duration.js';
import { describeLastBackup } from '../portability/backup-status.js';
import {
  SETTINGS_PAGES, settingsEntry, settingsForPage, settingsPageForRoute, settingsPagesForSection,
  settingEnabled, settingSummary, settingVisible, settingsRegistryKeys, settingsPageById,
} from './registry.js';
import {
  dangerRow, escapeHTML, mountCollapsingTitle, segmentedControl, selectList, settingsGroup,
  settingsPage, settingsRow, stepperControl, textControl, timeControl, toggleControl,
} from './components.js';

const PAGE_META = {
  'training.workout': { icon: 'dumbbell', tone: 'blue' },
  'training.timers': { icon: 'clock', tone: 'orange' },
  'training.schedule': { icon: 'calendar', tone: 'purple' },
  'training.reminders': { icon: 'gauge', tone: 'pink' },
  'once.units': { icon: 'scale', tone: 'teal' },
  'once.equipment': { icon: 'dumbbell', tone: 'green' },
  'once.look': { icon: 'sparkle', tone: 'blue' },
  'once.modules': { icon: 'sliders', tone: 'orange' },
  'connections.watches': { icon: 'activity', tone: 'teal' },
  'connections.integrations': { icon: 'heart', tone: 'red' },
  'connections.coach': { icon: 'sparkle', tone: 'purple' },
  'data.backup': { icon: 'download', tone: 'slate' },
  about: { icon: 'book', tone: 'slate' },
};

const PAGE_ICON = {
  restTimerEnabled: 'clock', previousValuesScope: 'clipboard', progressionIncrement: 'chart',
  showPlateHints: 'scale', autoWarmupRamp: 'activity', keepAwake: 'clock', livePR: 'trophy',
  restAlertSound: 'activity', restAlertVolume: 'activity', autoAdvanceWeek: 'calendar',
  weekStartDay: 'calendar', weeklyFrequency: 'calendar', sessionMinutes: 'clock',
  notificationsEnabled: 'gauge', reminderTime: 'clock', notifWeeklySummary: 'chart',
  notifStreak: 'flame', notifMissedWorkout: 'calendar', streakAlertTime: 'clock',
  notifFastingStage: 'flame', weightUnit: 'scale', distanceUnit: 'run', measurementUnit: 'scale',
  thresholdPaceSeconds: 'run', theme: 'sparkle', palette: 'sparkle', reducedMotion: 'activity',
  hybridTraining: 'activity', fastingDefault: 'flame',
};
const PAGE_TONE = {
  restTimerEnabled: 'blue', previousValuesScope: 'purple', progressionIncrement: 'green',
  showPlateHints: 'teal', autoWarmupRamp: 'orange', keepAwake: 'blue', livePR: 'pink',
  restAlertSound: 'orange', restAlertVolume: 'orange', autoAdvanceWeek: 'purple',
  weekStartDay: 'purple', weeklyFrequency: 'purple', sessionMinutes: 'purple',
  notificationsEnabled: 'pink', reminderTime: 'pink', notifWeeklySummary: 'pink',
  notifStreak: 'orange', notifMissedWorkout: 'red', streakAlertTime: 'orange',
  notifFastingStage: 'orange', weightUnit: 'teal', distanceUnit: 'blue', measurementUnit: 'teal',
  thresholdPaceSeconds: 'blue', theme: 'blue', palette: 'purple', reducedMotion: 'green',
  hybridTraining: 'green', fastingDefault: 'orange',
};

const SECTION_LABELS = { training: 'Training', once: 'Set once', connections: 'Connections', data: 'Data', about: 'About', profile: 'Profile', system: 'System' };

/** Lightweight fuzzy match: substring first, then an in-order subsequence. */
function fuzzyMatch(text, needle) {
  const haystack = String(text || '').toLowerCase();
  const wanted = String(needle || '').toLowerCase().trim();
  if (!wanted) return true;
  if (haystack.includes(wanted)) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === wanted[index]) index += 1;
    if (index === wanted.length) return true;
  }
  return false;
}

const titleCase = (value) => {
  const text = String(value || '');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

/** @param {any} state @param {any} store */
export function workoutSettingsHTML(state, store) {
  const profiles = ensureEquipmentProfiles(state);
  const active = getActiveEquipmentProfile(state);
  const options = profiles.map((profile) => `<option value="${escapeHTML(profile.id)}"${profile.id === active.id ? ' selected' : ''}>${escapeHTML(profile.name)}</option>`).join('');
  return `
    ${settingsGroup({
      label: 'During this workout',
      rows: [
        controlRow('restTimerEnabled', state, store, { icon: 'clock', tone: 'blue' }),
        controlRow('showPlateHints', state, store, { icon: 'scale', tone: 'teal' }),
        controlRow('autoWarmupRamp', state, store, { icon: 'activity', tone: 'orange' }),
        controlRow('keepAwake', state, store, { icon: 'clock', tone: 'green' }),
        controlRow('livePR', state, store, { icon: 'trophy', tone: 'pink' }),
      ],
    })}
    ${settingsGroup({
      label: 'Equipment',
      rows: [
        settingsRow({ label: 'Active gym', icon: 'dumbbell', tone: 'green', control: `<select id="workoutEquipmentProfile" class="s-input s-input--select" aria-label="Active gym">${options}</select>` }),
        settingsRow({ label: 'Rest defaults', icon: 'clock', tone: 'orange', summary: `${Math.round((state?.settings?.restPeriods?.compound || 0) / 60)}:${String((state?.settings?.restPeriods?.compound || 0) % 60).padStart(2, '0')} compound`, nav: true, action: 'open-settings-page', context: 'training.timers' }),
      ],
      footnote: 'Changes save immediately and stay in effect when you close this sheet.',
    })}`;
}

/** @param {any} state @param {any} store */
export function profileSettingsHTML(state, store) {
  const unit = state?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
  const latest = latestWeighIn(state?.bodyWeightLog || []);
  return `
    ${settingsGroup({
      label: 'Identity',
      rows: [
        settingsRow({ label: 'Name', icon: 'user', tone: 'blue', control: `<input id="settingsNameInput" class="s-input s-input--wide" type="text" maxlength="30" value="${escapeHTML(state?.settings?.name || '')}" aria-label="Name">` }),
        settingsRow({ label: 'Profile photo', icon: 'user', tone: 'purple', summary: state?.settings?.avatarDataUrl ? 'Photo set' : 'Initials', nav: true, action: 'pick-avatar' }),
      ],
    })}
    ${settingsGroup({
      label: 'Body metrics',
      rows: [
        settingsRow({ label: 'Latest weight', icon: 'scale', tone: 'teal', control: `<span class="s-input-wrap"><input id="settingsBodyWeight" class="s-input" type="number" min="30" max="300" step="0.1" value="${latest ? latest.weight : (state?.settings?.defaultBodyWeight || '')}" aria-label="Body weight"><span class="s-input-unit" id="settingsBodyWeightUnit">${unit}</span></span>`, footnote: 'Saves today\'s weigh-in.' }),
        controlRow('heightCm', state, store, { icon: 'scale', tone: 'teal' }),
        controlRow('birthDate', state, store, { icon: 'calendar', tone: 'purple' }),
        controlRow('sex', state, store, { icon: 'user', tone: 'slate' }),
        controlRow('targetWeight', state, store, { icon: 'scale', tone: 'green' }),
        controlRow('rateGoal', state, store, { icon: 'chart', tone: 'green' }),
        settingsRow({ label: 'Weight history', icon: 'chart', tone: 'blue', summary: 'Open the bodyweight log', nav: true, action: 'open-analytics', context: 'bodyweight' }),
        settingsRow({ label: 'Measures', icon: 'scale', tone: 'teal', summary: 'Tape, body fat and photos', nav: true, action: 'open-analytics', context: 'measures' }),
      ],
    })}
    ${settingsGroup({
      label: 'Training goal',
      rows: [
        controlRow('fitnessGoal', state, store, { icon: 'dumbbell', tone: 'blue' }),
        controlRow('fitnessLevel', state, store, { icon: 'chart', tone: 'purple' }),
        controlRow('weightGoal', state, store, { icon: 'scale', tone: 'green' }),
        controlRow('trainingStartDate', state, store, { icon: 'calendar', tone: 'slate' }),
        settingsRow({ label: 'Lift targets', icon: 'trophy', tone: 'orange', summary: `${Object.keys(state?.prGoals || {}).length} set`, footnote: 'Edit individual lift targets in Profile → Stats.' }),
      ],
    })}`;
}

/** @param {any} state @param {any} store */
function profileCard(state, store) {
  const name = state?.settings?.name?.trim() || 'Athlete';
  const avatar = state?.settings?.avatarDataUrl;
  const status = document.getElementById('settingsProfileStatus')?.textContent?.trim() || 'All data stays on this phone';
  const initials = name === 'Athlete' ? '?' : name.split(/\s+/).map((word) => word[0]?.toUpperCase()).slice(0, 2).join('');
  return `<div class="settings-profile-card s-profile-card">
    <div class="settings-avatar-large settings-avatar-clickable" id="settingsAvatarLarge" data-action="pick-avatar" role="button" aria-label="Change profile photo" tabindex="0"${avatar ? ` style="background-image:url('${escapeHTML(avatar)}');background-size:cover;background-position:center;color:transparent;"` : ''}>${avatar ? '' : escapeHTML(initials)}<div class="settings-avatar-camera-overlay">📷</div></div>
    <button type="button" class="settings-profile-card__open" data-action="open-settings-profile" aria-label="Open Profile">
      <span class="settings-name-display" id="settingsNameDisplay">${escapeHTML(name)}</span>
      <span class="settings-profile-status" id="settingsProfileStatus">${escapeHTML(status)}</span>
    </button>
    <span class="settings-profile-card__chevron" aria-hidden="true">›</span>
  </div>`;
}

/** @param {string} pageId @param {any} state @param {any} store */
function pageSummary(pageId, state, store) {
  const values = (...keys) => keys.map((key) => store.summary(key)).filter(Boolean);
  switch (pageId) {
    case 'training.workout': return values('restTimerEnabled', 'progressionIncrement').join(' · ') || 'Logging';
    case 'training.timers': return values('restAlertSound', 'restAlertVolume').join(' · ') || 'Rest alerts';
    case 'training.schedule': return values('weekStartDay', 'autoAdvanceWeek').join(' · ') || 'Week and plan';
    case 'training.reminders': return values('notificationsEnabled', 'reminderTime').join(' · ') || 'Off';
    case 'once.units': return values('weightUnit', 'distanceUnit').join(' · ') || 'kg · km';
    case 'once.equipment': return state?.settings?.equipmentProfiles?.find((p) => p.id === state?.settings?.activeEquipmentProfileId)?.name || 'Home';
    case 'once.look': return values('theme', 'palette').join(' · ') || 'Midnight';
    case 'once.modules': return `${['running', 'fasting', 'health', 'recovery'].filter((id) => moduleEnabled(state, id)).length} of 4 on`;
    case 'connections.watches': return 'Not available yet';
    case 'connections.integrations': return state?.healthConnect?.connected ? 'Health Connect on' : 'Health Connect off';
    case 'connections.coach': return 'Not set up';
    case 'data.backup': return 'Stays on this phone';
    case 'about': return `openHybrid v${APP_VERSION}`;
    default: return '';
  }
}

/** @param {string} pageId @param {any} state @param {any} store */
function navRow(pageId, state, store) {
  const page = settingsPageById(pageId);
  if (!page) return '';
  const meta = PAGE_META[pageId] || { icon: 'sliders', tone: 'slate' };
  return settingsRow({
    label: page.label,
    icon: meta.icon,
    tone: meta.tone,
    summary: pageSummary(pageId, state, store),
    nav: true,
    action: 'open-settings-page',
    context: pageId,
    ariaLabel: `${page.label}: ${pageSummary(pageId, state, store)}`,
  });
}

/** @param {any} state @param {any} store @param {string} query */
export function renderSettingsHome(host, state, store, query = '') {
  const needle = String(query || '').trim().toLowerCase();
  const matches = (pageId) => {
    if (!needle) return true;
    const page = settingsPageById(pageId);
    if (page && fuzzyMatch(page.label, needle)) return true;
    return settingsForPage(pageId).some((entry) =>
      fuzzyMatch(`${entry.label} ${(entry.keywords || []).join(' ')}`, needle));
  };
  const group = (label, section) => {
    const rows = settingsPagesForSection(section).filter((page) => matches(page.id)).map((page) => navRow(page.id, state, store));
    return rows.length ? settingsGroup({ label, rows }) : '';
  };
  const results = needle ? searchRows(state, store, needle) : '';
  host.innerHTML = `<div class="s-home">
    ${profileCard(state, store)}
    <label class="s-search">
      <span class="s-search__icon" aria-hidden="true">${icon('search', { size: 18 })}</span>
      <input id="settingsSearch" type="search" value="${escapeHTML(query)}" placeholder="Search settings" aria-label="Search settings" autocomplete="off">
    </label>
    ${needle
      ? (results || '<p class="s-empty" role="status">No settings match that search.</p>')
      : `${group('Training', 'training')}
        ${group('Set once', 'once')}
        ${group('Connections', 'connections')}
        ${group('Data', 'data')}
        ${group('About', 'about')}`}
  </div>`;
  return null;
}

/** @param {any} state @param {any} store @param {string} needle */
function searchRows(state, store, needle) {
  const hits = settingsRegistryKeys()
    .map((key) => settingsEntry(key))
    .filter((entry) => entry && !entry.deprecated && entry.type !== 'system')
    .filter((entry) => fuzzyMatch(`${entry.label} ${(entry.keywords || []).join(' ')}`, needle))
    .slice(0, 12);
  if (!hits.length) return '';
  const rows = hits.map((entry) => {
    const page = settingsPageById(entry.page);
    return settingsRow({
      label: entry.label,
      icon: PAGE_ICON[entry.key] || 'sliders',
      tone: PAGE_TONE[entry.key] || 'slate',
      summary: page ? `${SECTION_LABELS[page.section] || ''} › ${page.label}` : '',
      nav: true,
      action: 'open-settings-result',
      context: entry.key,
      ariaLabel: `${entry.label}. ${page ? page.label : ''}`,
    });
  });
  return settingsGroup({ label: 'Results', rows });
}

/** @param {string} key @param {any} state @param {any} store @param {{icon?:string,tone?:string}} [meta] */
function controlRow(key, state, store, meta = {}) {
  const entry = settingsEntry(key);
  if (!entry || entry.deprecated || entry.type === 'system' || entry.type === 'object') return '';
  if (!settingVisible(state, entry)) return '';
  const enabled = settingEnabled(state, entry);
  const value = store.get(key);
  const label = entry.label;
  const reason = enabled.ok ? '' : (enabled.reason || 'Not available.');
  const base = { key, label, disabled: !enabled.ok, reason };
  let control = '';
  if (entry.type === 'toggle') {
    control = toggleControl({ ...base, checked: value !== false });
  } else if (entry.type === 'select') {
    control = segmentedControl({ key, label, value, disabled: !enabled.ok, options: (entry.choices || []).map((choice) => ({ value: choice, label: titleCase(String(choice).replace(/_/g, ' ')) })) });
  } else if (entry.type === 'number') {
    if (entry.key === 'restAlertVolume') {
      control = stepperControl({ key, label, value: Math.round(Number(value ?? 0.4) * 100), min: 0, max: 100, step: 5, unit: '%', disabled: !enabled.ok });
    } else if (Array.isArray(entry.choices)) {
      control = segmentedControl({ key, label, value, disabled: !enabled.ok, options: entry.choices.map((choice) => ({ value: choice, label: String(choice) })) });
    } else if (entry.key === 'thresholdPaceSeconds') {
      const text = value ? `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}` : '';
      control = `<input id="settingsThresholdPace" class="s-input s-input--time" type="text" value="${escapeHTML(text)}" placeholder="4:30" aria-label="${escapeHTML(label)}" ${enabled.ok ? '' : 'disabled'}>`;
    } else {
      const unit = entry.key === 'heightCm'
        ? (state?.settings?.measurementUnit === 'in' ? 'in' : 'cm')
        : /Weight|weight|progression/i.test(label)
          ? (state?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg')
          : entry.key === 'sessionMinutes' ? 'min'
            : entry.key === 'fastingDefault' ? 'h' : '';
      control = stepperControl({ key, label, value: Number(value ?? entry.default ?? 0), min: entry.min ?? 0, max: entry.max ?? 999, step: entry.step ?? 1, unit, disabled: !enabled.ok });
    }
  } else if (entry.type === 'time') {
    const v = value || {};
    const text = `${String(v.hour ?? 0).padStart(2, '0')}:${String(v.minute ?? 0).padStart(2, '0')}`;
    const id = entry.key === 'reminderTime' ? 'settingsReminderTime' : entry.key === 'streakAlertTime' ? 'settingsStreakAlertTime' : '';
    control = timeControl({ key, label, value: text, disabled: !enabled.ok, id });
  } else if (entry.type === 'text') {
    const placeholder = entry.key === 'birthDate' ? 'YYYY-MM-DD' : entry.key === 'trainingStartDate' ? 'YYYY-MM-DD' : '';
    control = textControl({ key, label, value: String(value ?? ''), placeholder, disabled: !enabled.ok });
  }
  return settingsRow({
    label,
    settingKey: key,
    icon: meta.icon || PAGE_ICON[key] || 'sliders',
    tone: meta.tone || PAGE_TONE[key] || 'slate',
    footnote: entry.footer,
    control,
    disabled: !enabled.ok,
    disabledReason: reason,
  });
}

/** @param {string} pageId @param {any} state @param {any} store */
function genericGroups(pageId, state, store) {
  const entries = settingsForPage(pageId);
  const groups = [];
  const seen = new Set();
  const add = (label, keys) => {
    const rows = keys.filter((key) => !seen.has(key)).map((key) => {
      seen.add(key);
      return controlRow(key, state, store);
    }).filter(Boolean);
    if (rows.length) groups.push(settingsGroup({ label, rows }));
  };
  if (pageId === 'training.workout') {
    add('Logging', ['previousValuesScope', 'progressionIncrement', 'showPlateHints', 'keepAwake', 'livePR']);
    add('Warm-up', ['autoWarmupRamp']);
    add('Rest timer', ['restTimerEnabled']);
    const rest = state?.settings?.restPeriods || DEFAULT_REST_TIERS;
    groups.push(settingsGroup({
      label: 'Rest defaults',
      rows: [settingsRow({
        label: 'Rest by exercise type',
        icon: 'clock', tone: 'orange',
        summary: `${Math.round((rest.compound || 0) / 60)}:${String((rest.compound || 0) % 60).padStart(2, '0')} compound`,
        nav: true, action: 'open-settings-page', context: 'training.timers',
      })],
    }));
    const overrideEntries = Object.entries(state?.settings?.restOverrides || {});
    const overrideRows = overrideEntries.length
      ? overrideEntries.map(([lift, seconds]) => settingsRow({
        label: lift,
        icon: 'clock',
        tone: 'slate',
        summary: `${Math.floor(Number(seconds) / 60)}:${String(Number(seconds) % 60).padStart(2, '0')} · Custom`,
        control: `<button type="button" class="s-action" data-action="reset-rest-override" data-lift="${escapeHTML(lift)}">Default</button>`,
      }))
      : [settingsRow({ label: 'No overrides', icon: 'clock', tone: 'slate', footnote: 'The ± buttons in the rest timer remember a per-exercise rest.' })];
    groups.push(settingsGroup({
      label: 'Rest overrides',
      rows: overrideRows,
      footnote: 'Default uses the tier above; Custom is this lift only. Reset reverts one lift.',
    }));
    groups.push(settingsGroup({
      label: 'Exercise options',
      rows: [
        settingsRow({ label: 'Exercise options', icon: 'dumbbell', tone: 'blue', summary: `${Object.keys(state?.settings?.exercisePrefs || {}).length} custom`, footnote: 'Shape, load default and notes are edited from the exercise card.' }),
      ],
    }));
  } else if (pageId === 'training.schedule') {
    add('Week', ['autoAdvanceWeek', 'weekStartDay']);
    add('Plan shape', ['weeklyFrequency', 'sessionMinutes']);
    const priorities = Object.keys(state?.settings?.musclePriorities || {}).length;
    groups.push(settingsGroup({
      label: 'Focus',
      rows: [settingsRow({ label: 'Muscle priorities', icon: 'chart', tone: 'green', summary: `${priorities} muscle${priorities === 1 ? '' : 's'}`, footnote: 'Set from Strength → Volume Guide.' })],
    }));
  } else if (pageId === 'training.reminders') {
    add('Workout reminders', ['notificationsEnabled', 'reminderTime']);
    add('Other alerts', ['notifWeeklySummary', 'notifStreak', 'streakAlertTime', 'notifMissedWorkout']);
    if (moduleEnabled(state, 'fasting')) add('Fasting', ['notifFastingStage']);
    const status = document.getElementById('settingsNotifStatus')?.textContent?.trim() || '';
    if (status) groups.push(`<p class="s-group__footnote" id="settingsNotifStatus">${escapeHTML(status)}</p>`);
    else groups.push('<p class="s-group__footnote" id="settingsNotifStatus">Enable to receive daily training reminders.</p>');
  } else if (pageId === 'once.units') {
    add('Units', ['weightUnit', 'distanceUnit', 'measurementUnit']);
    if (moduleEnabled(state, 'running')) add('Running', ['thresholdPaceSeconds']);
  } else if (pageId === 'once.look') {
    add('Theme', ['theme', 'palette', 'reducedMotion']);
    groups.push('<p class="s-group__footnote">Palettes shape dark mode; Light keeps its own palette.</p>');
    add('Text & feedback', ['textSize', 'haptics']);
    groups.push(settingsGroup({
      label: 'Layout',
      rows: [
        settingsRow({ label: 'Home layout', icon: 'home', tone: 'blue', summary: 'Cards and order', nav: true, action: 'open-customize', context: 'home' }),
        settingsRow({ label: 'Progress layout', icon: 'chart', tone: 'green', summary: 'Sections and order', nav: true, action: 'open-customize', context: 'progress' }),
      ],
      footnote: 'The Home header sliders button opens the same Home layout sheet.',
    }));
  } else if (pageId === 'once.modules') {
    add('Presentation', ['hybridTraining']);
    add('Feature modules', ['modules.running', 'modules.fasting', 'modules.health', 'modules.recovery']);
    if (moduleEnabled(state, 'fasting')) add('Fasting', ['fastingDefault']);
  } else {
    add('Settings', entries.map((entry) => entry.key));
  }
  return groups.join('');
}

/** @param {any} state @param {any} store */
function equipmentPage(state, store) {
  const profiles = ensureEquipmentProfiles(state);
  const active = getActiveEquipmentProfile(state);
  const unit = state?.settings?.weightUnit === 'lbs' ? 'lb' : 'kg';
  const profileOptions = profiles.map((profile) => `<option value="${escapeHTML(profile.id)}"${profile.id === active.id ? ' selected' : ''}>${escapeHTML(profile.name)}</option>`).join('');
  const equipmentRows = EQUIPMENT_KEYS.map((key) => {
    const label = {
      barbell: 'Barbell & plates', rack: 'Power rack', dumbbells: 'Dumbbells', cables: 'Cables',
      pullupBar: 'Pull-up bar', bands: 'Resistance bands', kettlebells: 'Kettlebells', ezBar: 'EZ bar', treadmill: 'Treadmill',
    }[key] || titleCase(key);
    return settingsRow({
      label, icon: 'dumbbell', tone: 'green',
      control: `<label class="s-switch"><input type="checkbox" data-equipment="${key}" ${active.equipment?.[key] ? 'checked' : ''} aria-label="${escapeHTML(label)}"><span class="s-switch__track" aria-hidden="true"></span></label>`,
    });
  }).join('');
  return `
    ${settingsGroup({
      label: 'Gym profiles',
      rows: [
        settingsRow({ label: 'Active profile', icon: 'dumbbell', tone: 'green', control: `<select id="settingsEquipmentProfile" class="s-input s-input--select" aria-label="Equipment profile">${profileOptions}</select>` }),
        settingsRow({ label: 'Name', icon: 'book', tone: 'slate', control: `<input id="settingsEquipmentProfileName" class="s-input" type="text" value="${escapeHTML(active.name)}" maxlength="32" aria-label="Equipment profile name">` }),
        settingsRow({ label: 'Manage profiles', icon: 'plus', tone: 'blue', footnote: 'Add another gym, rename this one, or delete it.', control: `<span class="s-inline-actions"><button type="button" class="s-action" data-action="equipment-profile-add">Add</button><button type="button" class="s-action s-action--danger" data-action="equipment-profile-delete">Delete</button></span>` }),
      ],
    })}
    ${settingsGroup({ label: 'Available equipment', rows: [equipmentRows], footnote: 'Select everything available in this profile.' })}
    ${settingsGroup({
      label: 'Barbell plates',
      rows: [
        settingsRow({ label: 'Bar weight', icon: 'scale', tone: 'teal', control: `<span class="s-input-wrap"><input id="settingsPlateBar" class="s-input" type="number" min="1" step="0.5" value="${active.plateSetup?.[unit === 'lb' ? 'lb' : 'kg']?.bar ?? ''}" aria-label="Bar weight"><span class="s-input__unit" id="settingsPlateBarUnit">${unit}</span></span>` }),
        settingsRow({ label: 'Plates', icon: 'scale', tone: 'teal', control: `<input id="settingsPlates" class="s-input s-input--wide" type="text" value="${escapeHTML((active.plateSetup?.[unit === 'lb' ? 'lb' : 'kg']?.plates || []).join(', '))}" aria-label="Plates">` }),
        settingsRow({ label: 'Pairs you own', icon: 'slate', tone: 'slate', footnote: 'Leave blank for unlimited; 0 means none.', control: `<span class="s-plate-counts" id="settingsPlateCounts"></span>` }),
        settingsRow({ label: 'Reset plates', icon: 'activity', tone: 'slate', control: '<button type="button" class="s-action" data-action="equipment-plates-reset">Reset</button>' }),
      ],
    })}
    ${settingsGroup({
      label: 'Dumbbells & bands',
      rows: [
        settingsRow({ label: `Dumbbells (${unit})`, icon: 'dumbbell', tone: 'orange', control: `<input id="settingsDumbbells" class="s-input s-input--wide" type="text" value="${escapeHTML((active.dumbbells?.[unit === 'lb' ? 'lb' : 'kg'] || []).join(', '))}" aria-label="Dumbbell weights">` }),
        settingsRow({ label: 'Light band', icon: 'activity', tone: 'green', control: `<input id="settingsBandLight" class="s-input" type="number" min="0" step="0.5" value="${active.bandWeights?.L ?? 10}" aria-label="Light band weight">` }),
        settingsRow({ label: 'Medium band', icon: 'activity', tone: 'orange', control: `<input id="settingsBandMed" class="s-input" type="number" min="0" step="0.5" value="${active.bandWeights?.M ?? 20}" aria-label="Medium band weight">` }),
        settingsRow({ label: 'Heavy band', icon: 'activity', tone: 'red', control: `<input id="settingsBandHeavy" class="s-input" type="number" min="0" step="0.5" value="${active.bandWeights?.H ?? 30}" aria-label="Heavy band weight">` }),
      ],
    })}
    ${settingsGroup({
      label: 'Machine stacks',
      rows: [
        settingsRow({ label: 'Exercise', icon: 'dumbbell', tone: 'purple', control: '<select id="settingsStackExercise" class="s-input s-input--select" aria-label="Machine exercise"></select>' }),
        settingsRow({ label: 'Weights', icon: 'scale', tone: 'purple', control: '<input id="settingsStackWeights" class="s-input s-input--wide" type="text" placeholder="5, 10, 15, 20" aria-label="Machine stack weights">' }),
        settingsRow({ label: 'Save stack', icon: 'plus', tone: 'purple', control: '<button type="button" class="s-action" data-action="save-machine-stack">Save</button>' }),
        `<div id="settingsStackList" class="s-stack-list"></div>`,
      ],
    })}`;
}

/** @param {any} state */
function dataPage(state) {
  const backup = describeLastBackup(state?.lastBackupAt);
  const raw = (() => { try { return localStorage.getItem('hybrid_engine_v2_state') || ''; } catch { return ''; } })();
  const kb = raw ? Math.max(1, Math.round(new Blob([raw]).size / 1024)) : 0;
  return `
    ${settingsGroup({
      label: 'Automatic backup',
      rows: [
        `<div class="s-status" id="settingsAutoBackupStatus"><span class="auto-backup-status__indicator" id="settingsAutoBackupIndicator" aria-hidden="true"></span><span><strong id="settingsAutoBackupLabel">Checking automatic backup…</strong><small id="settingsAutoBackupDetail"></small></span></div>`,
        settingsRow({ label: 'Choose folder', icon: 'download', tone: 'blue', control: '<button type="button" class="s-action" id="settingsAutoBackupFolderBtn" data-action="auto-backup-folder">Choose</button>' }),
        settingsRow({ label: 'Back up now', icon: 'download', tone: 'green', control: '<button type="button" class="s-action" id="settingsAutoBackupNowBtn" data-action="auto-backup-now" style="display:none;">Back up</button>' }),
        settingsRow({ label: 'Turn off automatic backup', icon: 'activity', tone: 'slate', control: '<button type="button" class="s-action" id="settingsAutoBackupDisableBtn" data-action="auto-backup-disable" style="display:none;">Turn off</button>' }),
      ],
      footnote: 'Complete portable JSON including GPS routes, stored unencrypted in the folder you choose.',
    })}
    ${settingsGroup({
      label: 'Export',
      rows: [
        settingsRow({ label: 'Last manual backup', icon: 'clock', tone: backup.stale ? 'orange' : 'green', summary: backup.detail }),
        settingsRow({ label: 'Training data (JSON)', icon: 'download', tone: 'blue', summary: 'Everything, including routes', nav: true, action: 'export-data' }),
        settingsRow({ label: 'Training context (JSON)', icon: 'book', tone: 'purple', summary: 'Compact, no personal data', nav: true, action: 'export-training-context' }),
        settingsRow({ label: 'Spreadsheet (CSV)', icon: 'download', tone: 'green', summary: 'Workout history', nav: true, action: 'export-csv' }),
        settingsRow({ label: 'Bodyweight (CSV)', icon: 'scale', tone: 'teal', summary: 'Date and weight', nav: true, action: 'export-bodyweight-csv' }),
        settingsRow({ label: 'Measurements (CSV)', icon: 'scale', tone: 'teal', summary: 'Tape and body fat', nav: true, action: 'export-measurements-csv' }),
      ],
      footnote: 'Progress photos are not inside the JSON. Back them up in Progress → Measures → Export photos.',
    })}
    ${settingsGroup({
      label: 'Import',
      rows: [
        settingsRow({ label: 'Import backup', icon: 'download', tone: 'blue', summary: 'openHybrid JSON', nav: true, action: 'import-data' }),
        settingsRow({ label: 'Restore previous import backup', icon: 'activity', tone: 'orange', nav: true, action: 'restore-import-backup', id: 'settingsRestoreBackupBtn' }),
        settingsRow({ label: 'Import from another app', icon: 'download', tone: 'green', summary: 'OpenGym · Strong · Hevy CSV', nav: true, action: 'import-external-csv' }),
        settingsRow({ label: 'Import FIT files', icon: 'activity', tone: 'orange', summary: 'Garmin · Wahoo · Coros · Zwift', nav: true, action: 'import-fit-files' }),
      ],
      footnote: 'Strength sets, cardio runs and weigh-ins import. Re-importing the same file is safe.',
    })}
    ${settingsGroup({
      label: 'Storage',
      rows: [settingsRow({ label: 'On this device', icon: 'download', tone: 'slate', summary: kb ? `${kb.toLocaleString('en-AU')} KB` : 'Empty' })],
    })}
    ${settingsGroup({
      label: 'Danger zone',
      rows: [dangerRow({ label: 'Reset all data', description: 'Delete every workout, measurement and setting. Export first.', action: 'reset-all-data' })],
    })}
    <input type="file" id="settingsImportFile" aria-label="Choose backup file to import" accept=".json" class="hidden-input">
    <input type="file" id="settingsExternalCsvFile" aria-label="Choose a workout CSV" accept=".csv,text/csv" class="hidden-input">
    <input type="file" id="settingsFitFiles" aria-label="Choose FIT activity files" accept=".fit" multiple class="hidden-input">`;
}

/** @param {any} state */
function integrationsPage(state) {
  if (!moduleEnabled(state, 'health')) {
    return settingsGroup({ label: 'Health Connect', rows: [settingsRow({ label: 'Health module is off', icon: 'heart', tone: 'red', footnote: 'Turn Health Connect on in Modules to sync steps, sleep, HRV and resting heart rate.' })] });
  }
  return `
    ${settingsGroup({
      label: 'Health Connect',
      rows: [
        `<div class="s-status hc-status-card" id="hcStatusCard"><span class="hc-status-indicator" id="hcStatusIndicator"></span><span class="hc-status-text"><span class="hc-status-label" id="hcStatusLabel">Not connected</span><span class="hc-last-sync text-xs text-muted" id="hcLastSync"></span></span><button type="button" class="s-action" id="hcConnectBtn" data-action="hc-toggle-connect">Connect</button></div>`,
        settingsRow({ label: 'Daily step goal', icon: 'activity', tone: 'green', control: `<span class="s-input-wrap"><input id="settingsStepGoal" class="s-input" type="number" min="1000" max="50000" step="500" value="${Number(state?.healthConnect?.stepGoal || 10000)}" aria-label="Daily step goal"><span class="s-input__unit">steps</span></span>` }),
        settingsRow({ label: 'Sync now', icon: 'activity', tone: 'blue', control: '<button type="button" class="s-action" id="hcSyncNowBtn" data-action="hc-sync-now" style="display:none;">Sync</button>' }),
      ],
    })}
    ${settingsGroup({
      label: 'Data types',
      rows: [
        settingsRow({ label: 'Daily steps', icon: 'activity', tone: 'green', control: '<label class="s-switch"><input type="checkbox" id="hcSyncSteps" data-hc-field="steps" checked aria-label="Sync daily steps"><span class="s-switch__track"></span></label>' }),
        settingsRow({ label: 'Resting heart rate', icon: 'heart', tone: 'red', control: '<label class="s-switch"><input type="checkbox" id="hcSyncRhr" data-hc-field="restingHR" checked aria-label="Sync resting heart rate"><span class="s-switch__track"></span></label>' }),
        settingsRow({ label: 'Heart rate variability', icon: 'heart', tone: 'purple', control: '<label class="s-switch"><input type="checkbox" id="hcSyncHrv" data-hc-field="hrv" checked aria-label="Sync HRV"><span class="s-switch__track"></span></label>' }),
        settingsRow({ label: 'Sleep duration', icon: 'clock', tone: 'blue', control: '<label class="s-switch"><input type="checkbox" id="hcSyncSleep" data-hc-field="sleep" checked aria-label="Sync sleep"><span class="s-switch__track"></span></label>' }),
      ],
      footnote: 'Requires the openHybrid Android app with Health Connect permission granted. Data stays on this phone.',
    })}
    ${settingsGroup({
      label: 'Other integrations',
      rows: [
        settingsRow({ label: 'Strava', icon: 'run', tone: 'orange', summary: 'Not available yet', disabled: true }),
        settingsRow({ label: 'Watches', icon: 'activity', tone: 'slate', summary: 'Import FIT files in Data & backup', nav: true, action: 'import-fit-files' }),
      ],
    })}`;
}

/** @param {any} state */
function aboutPage(state) {
  return `
    ${settingsGroup({
      label: 'App',
      rows: [
        settingsRow({ label: 'Version', icon: 'book', tone: 'slate', summary: `openHybrid v${APP_VERSION}` }),
        settingsRow({ label: 'Source code', icon: 'book', tone: 'blue', summary: 'GitHub · AGPL-3.0', nav: true, href: 'https://github.com/mjb96/openHybrid' }),
        settingsRow({ label: 'Licences', icon: 'book', tone: 'slate', summary: 'AGPL-3.0 · third-party notices', nav: true, href: 'https://github.com/mjb96/openHybrid/blob/main/NOTICE.md' }),
      ],
    })}
    ${settingsGroup({
      label: 'Support',
      rows: [
        settingsRow({ label: 'Diagnostics', icon: 'activity', tone: 'green', summary: 'Local only · no account' }),
        settingsRow({ label: 'Changelog', icon: 'book', tone: 'purple', summary: 'Not available yet', disabled: true }),
        settingsRow({ label: 'Feedback', icon: 'book', tone: 'orange', summary: 'Not available yet', disabled: true }),
      ],
      footnote: 'Your data never leaves this phone unless you export it.',
    })}`;
}

/**
 * Render a pushed page. Returns a cleanup function or null.
 * @param {HTMLElement} host
 * @param {string} route
 * @param {any} state
 * @param {any} store
 */
export function renderSettingsPage(host, route, state, store) {
  const page = settingsPageForRoute(route);
  if (!page) {
    renderSettingsHome(host, state, store, '');
    return null;
  }
  let body = '';
  let intro = '';
  let footer = '';
  if (page.id === 'once.equipment') body = equipmentPage(state, store);
  else if (page.id === 'data.backup') body = dataPage(state);
  else if (page.id === 'connections.integrations') body = integrationsPage(state);
  else if (page.id === 'connections.watches') body = settingsGroup({ label: 'Watches', rows: [settingsRow({ label: 'No watch pairing yet', icon: 'activity', tone: 'slate', footnote: 'Garmin, Wahoo, Coros and Zwift activities import as FIT files from Data & backup.' })] });
  else if (page.id === 'connections.coach') body = settingsGroup({ label: 'AI Coach', rows: [settingsRow({ label: 'Not set up', icon: 'sparkle', tone: 'purple', footnote: 'openHybrid has no AI provider or API key. Use Data & backup → Training context to take a compact summary to any external tool.' })] });
  else if (page.id === 'about') body = aboutPage(state);
  else {
    body = genericGroups(page.id, state, store);
    if (page.id === 'training.timers') body += timersPage(state, store);
  }
  if (['training.workout', 'training.timers', 'training.schedule', 'training.reminders', 'once.look', 'once.modules'].includes(page.id)) {
    body += `<button type="button" class="s-reset-page" data-action="reset-settings-page" data-page="${escapeHTML(page.id)}">Reset ${escapeHTML(page.label)} to defaults</button>`;
  }
  host.innerHTML = settingsPage({
    title: page.label,
    backLabel: 'Settings',
    backAction: 'back-to-settings',
    groups: [body],
    intro,
    footer,
  });
  const pageEl = host.querySelector('.s-page');
  if (pageEl) mountCollapsingTitle(pageEl);
  return pageEl;
}

/** @param {any} state @param {any} store */
function timersPage(state, store) {
  const rest = state?.settings?.restPeriods || DEFAULT_REST_TIERS;
  const fmt = (seconds) => `${Math.floor((Number(seconds) || 0) / 60)}:${String((Number(seconds) || 0) % 60).padStart(2, '0')}`;
  const input = (id, label, value) => `<input id="${id}" class="s-input" type="text" inputmode="numeric" value="${escapeHTML(fmt(value))}" aria-label="${label}">`;
  return `
    ${settingsGroup({
      label: 'Rest tiers',
      rows: [
        `<div class="s-preset-row" role="group" aria-label="Rest presets">
          <button type="button" class="s-segmented__chip" data-action="rest-preset" data-preset="efficient">Efficient</button>
          <button type="button" class="s-segmented__chip" data-action="rest-preset" data-preset="hypertrophy">Standard</button>
          <button type="button" class="s-segmented__chip" data-action="rest-preset" data-preset="strength">Strength</button>
        </div>`,
        settingsRow({ label: 'Warm-up', icon: 'activity', tone: 'green', control: input('settingsRestWarmup', 'Warm-up rest', rest.warmup) }),
        settingsRow({ label: 'Compound', icon: 'dumbbell', tone: 'red', control: input('settingsRestCompound', 'Compound rest', rest.compound) }),
        settingsRow({ label: 'Accessory', icon: 'dumbbell', tone: 'orange', control: input('settingsRestAccessory', 'Accessory rest', rest.accessory) }),
        settingsRow({ label: 'Isolation', icon: 'dumbbell', tone: 'green', control: input('settingsRestIsolation', 'Isolation rest', rest.isolation) }),
      ],
      footnote: 'The timer ± buttons remember a per-exercise override. These are the defaults.',
    })}
`;
}

