// @ts-check
// =============================================================================
// SURFACE CUSTOMIZATION (js/ui/customize.js)
//
// Home and Progress have optional cards. Safety flags, the Today action, quick
// actions and navigation are pinned; these lists are the personal presentation
// layer on top of module visibility. Hiding a card never deletes data and never
// blocks a deep link.
//
// Progress cards are the eight bands of the analytics dashboard. Nothing on
// Progress is pinned any more: Pulse and Balance are the strongest cards, but a
// strength-only block makes the Balance split meaningless and a data-first user
// may not want the summary — both are legitimate preferences. The single rule
// that keeps the tab coherent is that at least one card stays visible.
//
// Ids are RENAMED from the pre-band catalogue. `PROGRESS_CARD_ALIASES` maps the
// old ids onto their successors so an existing user's saved choices survive the
// change instead of silently resetting.
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
  { id: 'pulse', label: 'Pulse', note: 'Last 7 days, streak and training days' },
  { id: 'balance', label: 'Balance', note: 'Strength vs endurance split' },
  { id: 'muscles', label: 'Muscles', note: 'Sets per muscle, distribution and body split' },
  { id: 'exercises', label: 'Main exercises', note: 'Most-trained lifts and next load' },
  { id: 'endurance', label: 'Endurance', note: 'Run and walk distance, pace, consistency' },
  { id: 'body', label: 'Body', note: 'Weight, measurements and photos' },
  { id: 'fasting', label: 'Fasting', note: 'Fast length against your goal' },
  { id: 'reports', label: 'Reports', note: 'Monthly report and year in review' },
]);

/**
 * Detail inside a band. These are switches too, but they are not bands: they do
 * not enter the render order and they cannot be the last visible card.
 *
 * @type {ReadonlyArray<{ id: string, label: string, note: string, parent: string }>}
 */
export const PROGRESS_SUB_CARDS = Object.freeze([
  { id: 'bodyPhotos', label: 'Progress photos', note: 'Hidden when the phone is passed around', parent: 'body' },
  { id: 'musclesBody', label: 'Body diagram', note: 'The ranked rows carry the same numbers', parent: 'muscles' },
]);

/**
 * Old card id → the band(s) that inherited their content. An empty array means
 * the card became a footer leaf: the preference is consumed and dropped, which
 * is correct because there is nothing left to hide.
 *
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const PROGRESS_CARD_ALIASES = Object.freeze({
  strength: ['muscles', 'exercises'],
  muscleLoad: ['muscles'],
  running: ['endurance'],
  bodyweight: ['body'],
  recovery: [],
  projections: [],
});

/** Progress must keep at least one BAND so the destination never renders bare. */
export const MIN_VISIBLE_PROGRESS_CARDS = 1;

const CARDS = Object.freeze({ home: HOME_CARDS, progress: PROGRESS_CARDS });
/** @type {Array<'home'|'progress'>} */
const SURFACES = ['home', 'progress'];

/** Every id a preference may name, including band detail. */
function idsFor(surface) {
  const ids = (CARDS[surface] || []).map((card) => card.id);
  return new Set(surface === 'progress' ? [...ids, ...PROGRESS_SUB_CARDS.map((card) => card.id)] : ids);
}

/** The band ids only, in catalogue order — what `order` and the minimum rule use. */
function bandIds() {
  return PROGRESS_CARDS.map((card) => card.id);
}

/** Detail cards belonging to one band. @param {string} bandId */
export function subCardsFor(bandId) {
  return PROGRESS_SUB_CARDS.filter((card) => card.parent === bandId);
}

/** @param {'home'|'progress'} surface */
export function cardsFor(surface) {
  return CARDS[surface] || [];
}

/** @param {any} values */
function dedupe(values) {
  return [...new Set(values)];
}

/** Coerce persisted UI settings into the current card catalogue. */
export function normalizeUi(value) {
  const input = value && typeof value === 'object' ? value : {};

  const out = { home: { hidden: [] }, progress: /** @type {any} */ ({ hidden: [], order: [] }) };

  const homeIds = idsFor('home');
  const rawHomeHidden = Array.isArray(input?.home?.hidden) ? input.home.hidden : [];
  out.home.hidden = dedupe(rawHomeHidden.filter((id) => homeIds.has(id)));

  const progressIds = idsFor('progress');
  const rawHidden = Array.isArray(input?.progress?.hidden) ? input.progress.hidden : [];
  /** @type {string[]} */
  const expanded = [];
  for (const id of rawHidden) {
    if (progressIds.has(id)) { expanded.push(id); continue; }
    const successors = PROGRESS_CARD_ALIASES[id];
    if (successors) expanded.push(...successors);
    // Anything else is unknown and dropped, so a stale id cannot hide a card
    // that later reuses the name.
  }
  out.progress.hidden = dedupe(expanded.filter((id) => progressIds.has(id)));

  const rawOrder = Array.isArray(input?.progress?.order) ? input.progress.order : [];
  const bands = new Set(bandIds());
  const order = dedupe(rawOrder.filter((id) => bands.has(id)));
  // A band added in a later release appears without editing anyone's array.
  for (const id of PROGRESS_CARDS.map((card) => card.id)) {
    if (!order.includes(id)) order.push(id);
  }
  out.progress.order = order;

  return out;
}

/** @param {any} settings @param {'home'|'progress'} surface @param {string} id */
export function isCardVisible(settings, surface, id) {
  const ui = normalizeUi(settings?.ui);
  const bucket = ui[surface] || { hidden: [] };
  return !bucket.hidden.includes(id);
}

/**
 * Would hiding this card leave the surface with nothing? The sheet asks before
 * toggling so it can explain instead of springing back without a word.
 *
 * @param {any} settings @param {'home'|'progress'} surface @param {string} id
 */
export function canHideCard(settings, surface, id) {
  if (surface !== 'progress') return true;
  const ui = normalizeUi(settings?.ui);
  // Detail switches never count toward the minimum: turning off the body diagram
  // leaves the band, so it cannot be "the last card".
  if (PROGRESS_SUB_CARDS.some((card) => card.id === id)) return true;
  const hidden = new Set(ui.progress.hidden);
  hidden.add(id);
  const remaining = PROGRESS_CARDS.filter((card) => !hidden.has(card.id)).length;
  return remaining >= MIN_VISIBLE_PROGRESS_CARDS;
}

/** @param {any} settings @param {'home'|'progress'} surface @param {string} id @param {boolean} visible */
export function setCardVisible(settings, surface, id, visible) {
  if (!CARDS[surface] || !idsFor(surface).has(id)) return normalizeUi(settings?.ui);
  const ui = normalizeUi(settings?.ui);
  const hidden = new Set(ui[surface].hidden);

  if (visible) {
    hidden.delete(id);
  } else {
    if (!canHideCard(settings, surface, id)) return ui;
    hidden.add(id);
  }

  ui[surface].hidden = [...hidden];
  if (settings) settings.ui = ui;
  return ui;
}

/** @param {'home'|'progress'} surface @param {any} settings */
export function orderedCards(surface, settings) {
  const cards = cardsFor(surface);
  if (surface !== 'progress') return cards;
  const ui = normalizeUi(settings?.ui);
  const byId = new Map(cards.map((card) => [card.id, card]));
  return ui.progress.order.map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Move a Progress card one slot within the user's order. Keyboard-accessible
 * alternative to dragging, used by the sheet's overflow menu.
 *
 * @param {any} settings @param {string} id @param {-1|1} direction
 */
export function moveCard(settings, id, direction) {
  const ui = normalizeUi(settings?.ui);
  const order = [...ui.progress.order];
  const from = order.indexOf(id);
  if (from < 0) return ui;
  const to = Math.max(0, Math.min(order.length - 1, from + direction));
  if (to === from) return ui;
  order.splice(to, 0, ...order.splice(from, 1));
  ui.progress.order = order;
  if (settings) settings.ui = ui;
  return ui;
}

/** @param {any} settings @param {'home'|'progress'} surface */
export function resetSurface(settings, surface) {
  const ui = normalizeUi(settings?.ui);
  if (ui[surface]) {
    ui[surface].hidden = [];
    if (surface === 'progress') ui.progress.order = PROGRESS_CARDS.map((card) => card.id);
  }
  if (settings) settings.ui = ui;
  return ui;
}
