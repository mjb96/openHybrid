// @ts-check
// =============================================================================
// MODULES — user-level feature switches.
//
// Strength logging is the core and cannot be disabled. Running, fasting,
// Health Connect and Recovery & Load can be hidden without deleting any data.
// The UI uses `data-module` hooks plus <html data-module-*="on|off"> so a toggle
// takes effect immediately; Home/Train/Progress filters keep newly generated
// markup consistent too.
// =============================================================================
export const MODULES = Object.freeze([
  { id: 'running', label: 'Running & GPS', note: 'Run tracking, run history and running analytics' },
  { id: 'fasting', label: 'Fasting', note: 'Fasting timer, protocols and insights' },
  { id: 'health', label: 'Health Connect', note: 'Steps, sleep, resting HR and HRV' },
  { id: 'recovery', label: 'Recovery & Load', note: 'Readiness, load and recovery views' },
]);

const IDS = new Set(MODULES.map((m) => m.id));

/**
 * Hybrid training is a PRESENTATION preference, not a fifth module. It decides
 * whether the hybrid-only surfaces exist (the balance card and the endurance
 * summary on Home); the four feature modules stay independently controlled, so
 * an athlete can hide Running without losing their recovery switches. Absent
 * means on, because every existing install predates the preference.
 */
export function hybridTrainingEnabled(state) {
  return state?.settings?.hybridTraining !== false;
}

export function setHybridTraining(state, on) {
  if (!state) return false;
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  state.settings.hybridTraining = !!on;
  return true;
}

export function moduleEnabled(state, id) {
  if (!IDS.has(id)) return true;
  return state?.settings?.modules?.[id] !== false;
}

export function setModuleEnabled(state, id, on) {
  if (!IDS.has(id) || !state) return false;
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  if (!state.settings.modules || typeof state.settings.modules !== 'object') state.settings.modules = {};
  state.settings.modules[id] = !!on;
  return true;
}

/** Publish module state for CSS `[data-module]` hooks. */
export function applyModuleVisibility(state, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root?.dataset) return;
  root.dataset.moduleRunning = moduleEnabled(state, 'running') ? 'on' : 'off';
  root.dataset.moduleFasting = moduleEnabled(state, 'fasting') ? 'on' : 'off';
  root.dataset.moduleHealth = moduleEnabled(state, 'health') ? 'on' : 'off';
  root.dataset.moduleRecovery = moduleEnabled(state, 'recovery') ? 'on' : 'off';
  root.dataset.hybrid = hybridTrainingEnabled(state) ? 'on' : 'off';
}
