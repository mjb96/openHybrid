// @ts-check
// =============================================================================
// SURFACE CUSTOMIZATION (js/ui/customize.js)
//
// Home and Progress have optional cards. Safety flags, the Today action, quick
// actions and navigation are pinned; these lists are the second, personal
// presentation layer on top of module visibility. Hiding a card never deletes
// data and never blocks a deep link.
// =============================================================================

export const HOME_CARDS = Object.freeze([
  { id: 'weekStrip', label: 'This week', note: 'Seven-day rail with four weeks of recaps' },
  { id: 'hybridBalance', label: 'Training balance', note: 'This week’s strength vs endurance split' },
  { id: 'strengthWeek', label: 'Strength this week', note: 'Tonnage, top-lift change and PRs' },
  { id: 'enduranceWeek', label: 'Endurance this week', note: 'Distance and pace (Running module)' },
  { id: 'bodyweight', label: 'Bodyweight', note: 'Latest weigh-in and 30-day trend' },
  { id: 'insight', label: 'Coach insight', note: 'One evidence-backed line' },
  { id: 'volumeGuide', label: 'Muscle volume', note: 'Focus-muscle coverage for the week' },
]);

export const PROGRESS_CARDS = Object.freeze([
  { id: 'strength', label: 'Strength', note: 'Estimated 1RM and same-exercise change' },
  { id: 'running', label: 'Running', note: 'Weekly distance, pace and trends' },
  { id: 'recovery', label: 'Recovery', note: 'Sleep, HRV, resting HR and readiness' },
  { id: 'bodyweight', label: 'Body weight', note: 'Weight trend and log' },
  { id: 'muscleLoad', label: 'Muscle load', note: 'Weekly volume and recovery by muscle' },
  { id: 'projections', label: 'Projections', note: 'Race times and milestone ETAs' },
]);

const CARDS = Object.freeze({ home: HOME_CARDS, progress: PROGRESS_CARDS });
/** @type {Array<'home'|'progress'>} */
const SURFACES = ['home', 'progress'];

/** @param {'home'|'progress'} surface */
function idsFor(surface) {
  return new Set((CARDS[surface] || []).map((card) => card.id));
}

/** @param {'home'|'progress'} surface */
export function cardsFor(surface) {
  return CARDS[surface] || [];
}

/** Coerce persisted UI settings into the current card catalogue. */
export function normalizeUi(value) {
  const input = value && typeof value === 'object' ? value : {};
  const out = { home: { hidden: [] }, progress: { hidden: [] } };
  for (const surface of SURFACES) {
    const allowed = idsFor(surface);
    const raw = Array.isArray(input?.[surface]?.hidden) ? input[surface].hidden : [];
    out[surface].hidden = [...new Set(raw.filter((id) => allowed.has(id)))];
  }
  return out;
}

/** @param {any} settings @param {'home'|'progress'} surface @param {string} id */
export function isCardVisible(settings, surface, id) {
  const ui = normalizeUi(settings?.ui);
  return !ui[surface].hidden.includes(id);
}

/** @param {any} settings @param {'home'|'progress'} surface @param {string} id @param {boolean} visible */
export function setCardVisible(settings, surface, id, visible) {
  if (!CARDS[surface] || !idsFor(surface).has(id)) return normalizeUi(settings?.ui);
  const ui = normalizeUi(settings?.ui);
  const hidden = new Set(ui[surface].hidden);
  if (visible) hidden.delete(id);
  else hidden.add(id);
  ui[surface].hidden = [...hidden];
  if (settings) settings.ui = ui;
  return ui;
}

/** @param {any} settings @param {'home'|'progress'} surface */
export function resetSurface(settings, surface) {
  const ui = normalizeUi(settings?.ui);
  if (ui[surface]) ui[surface].hidden = [];
  if (settings) settings.ui = ui;
  return ui;
}

export function isCustomizable(surface, id) {
  return !!CARDS[surface] && idsFor(surface).has(id);
}
