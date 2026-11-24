// @ts-check
// =============================================================================
// PROGRESS SECTION REGISTRY (js/analytics/progress-sections.js)
//
// ONE declaration of everything the Progress hub may show. The composer, the
// Customize sheet, the band-detail headers and `tests/progress_registry_guard`
// all read this list, so a destination cannot appear on the surface without a
// toggle and a route.
//
// A SECTION is a top-level band. A CHILD is an indented detail switch inside
// one band. Both carry a route id when the thing they name is a real screen.
// `toggle:false` children (the Reviews Week | Month | Year row) are destinations
// that are not independently hideable — the whole Reviews section is.
//
// Order is strength-first on purpose (roadmap §16.4). Module-gated sections
// keep their place but are disabled, and labelled "module off" in the sheet.
// =============================================================================
import { addDaysISO, formatWeekRange, localDayKey } from '../dates.js';
import { moduleEnabled, hybridTrainingEnabled } from '../modules.js';
import { weekStartOf } from './weekly-aggregate.js';

/**
 * @typedef {Object} ProgressChild
 * @property {string} id
 * @property {string} label
 * @property {string} subtitle
 * @property {string|null} routeId
 * @property {boolean} [toggle] false = a destination inside the band, not a switch
 * @property {boolean} [defaultVisible]
 */

/**
 * @typedef {Object} ProgressSection
 * @property {string} id
 * @property {string} label
 * @property {string} subtitle
 * @property {string|null} parent
 * @property {'running'|'fasting'|'hybridTraining'|null} module
 * @property {number} defaultOrder
 * @property {boolean} defaultVisible
 * @property {string|null} routeId  the band header's detail route
 * @property {string} [detailLabel]
 * @property {boolean} [alwaysShow]
 * @property {ReadonlyArray<ProgressChild>} children
 */

/** @type {ReadonlyArray<ProgressSection>} */
export const PROGRESS_SECTIONS = Object.freeze([
  {
    id: 'pulse', label: 'Pulse', subtitle: 'Current calendar week · streak and training days',
    parent: null, module: null, defaultOrder: 0, defaultVisible: true, routeId: null, alwaysShow: true,
    children: [],
  },
  {
    id: 'exercises', label: 'Main exercises', subtitle: 'The lifts you train most and how they moved',
    parent: null, module: null, defaultOrder: 1, defaultVisible: true,
    routeId: 'strength', detailLabel: 'All lifts',
    children: [
      { id: 'allLifts', label: 'All lifts', subtitle: 'Every lift, volume detail and lifetime PR', routeId: 'strength', toggle: true },
      { id: 'liftRecords', label: 'Records', subtitle: 'Lifetime PR table and progression', routeId: 'strength_pr', toggle: true },
    ],
  },
  {
    id: 'muscles', label: 'Muscles', subtitle: 'Sets per muscle, distribution and body split',
    parent: null, module: null, defaultOrder: 2, defaultVisible: true,
    routeId: 'muscle-load', detailLabel: 'Muscle load',
    children: [
      { id: 'musclesBody', label: 'Body diagram', subtitle: 'The ranked rows carry the same numbers', routeId: null, toggle: true },
      { id: 'muscleLoadDetail', label: 'Muscle load', subtitle: 'Recovery and last-trained detail for every muscle', routeId: 'muscle-load', toggle: true },
    ],
  },
  {
    id: 'body', label: 'Body', subtitle: 'Weight, measurements and photos',
    parent: null, module: null, defaultOrder: 3, defaultVisible: true,
    routeId: 'measures', detailLabel: 'Measures',
    children: [
      { id: 'bodyWeight', label: 'Weight trend', subtitle: 'The full bodyweight graph and trend rate', routeId: 'bodyweight', toggle: true },
      { id: 'bodyMeasures', label: 'Measures', subtitle: 'Weight, body fat, tape and photos by date', routeId: 'measures', toggle: true },
      { id: 'bodyPhotos', label: 'Progress photos', subtitle: 'Hidden when the phone is passed around', routeId: 'measures', toggle: true },
    ],
  },
  {
    id: 'reviews', label: 'Reviews', subtitle: 'Week, month and year recaps',
    parent: null, module: null, defaultOrder: 4, defaultVisible: true,
    routeId: 'weekly-review',
    alwaysShow: true,
    children: [
      { id: 'reviewWeek', label: 'Week', subtitle: 'The week’s story, consistency log and share card', routeId: 'weekly-review', toggle: false },
      { id: 'reviewMonth', label: 'Month', subtitle: '30 days and 12 months, compared with the period before', routeId: 'monthly-report', toggle: false },
      { id: 'reviewYear', label: 'Year', subtitle: 'Your year so far, with the best month and the PRs', routeId: 'year-review', toggle: false },
    ],
  },
  {
    id: 'balance', label: 'Balance', subtitle: 'Strength vs endurance split',
    parent: null, module: 'hybridTraining', defaultOrder: 5, defaultVisible: true, routeId: null,
    children: [],
  },
  {
    id: 'endurance', label: 'Endurance', subtitle: 'Run and walk distance, pace, consistency',
    parent: null, module: 'running', defaultOrder: 6, defaultVisible: true,
    routeId: 'running', detailLabel: 'Running',
    children: [
      { id: 'enduranceRunning', label: 'Running', subtitle: 'Pace, heart rate, zones, load and personal bests', routeId: 'running', toggle: true },
      { id: 'enduranceProjections', label: 'Projections', subtitle: 'Race times and milestone estimates', routeId: 'projections', toggle: true },
    ],
  },
  {
    id: 'fasting', label: 'Fasting', subtitle: 'Fast length against your goal',
    parent: null, module: 'fasting', defaultOrder: 7, defaultVisible: true, routeId: 'fasting', detailLabel: 'Fasting analytics',
    children: [],
  },
]);

export const PROGRESS_SECTION_IDS = Object.freeze(PROGRESS_SECTIONS.map((section) => section.id));

/** @type {ReadonlyMap<string, ProgressSection>} */
const SECTION_BY_ID = new Map(PROGRESS_SECTIONS.map((section) => [section.id, section]));

/** Every child toggle (excludes read-only review destinations). */
export const PROGRESS_SECTION_CHILDREN = Object.freeze(
  PROGRESS_SECTIONS.flatMap((section) => section.children
    .filter((child) => child.toggle !== false)
    .map((child) => ({ ...child, parent: section.id, defaultVisible: child.defaultVisible !== false }))),
);

/** Destinations that live in the Progress header, outside the band list. */
export const PROGRESS_HEADER_DESTINATIONS = Object.freeze([
  { id: 'history', label: 'History', routeAction: 'open-activities' },
  { id: 'method', label: 'How this page is calculated', routeAction: 'method' },
]);

/** @param {string} id */
export function progressSection(id) {
  return SECTION_BY_ID.get(id) || null;
}

/** @param {string} id */
export function progressChildren(id) {
  return SECTION_BY_ID.get(id)?.children || [];
}

/**
 * Every route the hub (or a band) may name. The guard test compares rendered
 * destinations against this set; `exercise`/`muscle` rows are entity leaves
 * declared separately because they carry `data-entity`.
 */
export const PROGRESS_ROUTE_IDS = Object.freeze(new Set([
  ...PROGRESS_SECTIONS.map((section) => section.routeId),
  ...PROGRESS_SECTIONS.flatMap((section) => section.children.map((child) => child.routeId)),
  // Entity drilldowns rendered by a band row, always with data-entity.
  'exercise',
  'muscle',
].filter(Boolean)));

/** Entity leaves that are valid only when the tag also carries data-entity. */
export const PROGRESS_ENTITY_ROUTE_IDS = Object.freeze(new Set(['exercise', 'muscle']));

/** @param {string} id */
export function progressSectionModuleOff(state, id) {
  const section = SECTION_BY_ID.get(id);
  if (!section?.module) return false;
  if (section.module === 'hybridTraining') return !hybridTrainingEnabled(state);
  return !moduleEnabled(state, section.module);
}

/** A section the athlete can hide. Module-off sections are not toggled at all. */
export function progressSectionVisible(state, id) {
  return !progressSectionModuleOff(state, id);
}

/**
 * The band header's "Details ›" destination.
 * @param {string} id
 * @returns {{ context: string, label: string }|null}
 */
export function progressDetailFor(id) {
  const section = SECTION_BY_ID.get(id);
  if (!section?.routeId) return null;
  return { context: section.routeId, label: section.detailLabel || section.label };
}

/**
 * The Customize subtitle. Pulse names its REAL range — it is always the current
 * calendar week, and the old "Last 7 days" copy was not the same thing.
 * @param {ProgressSection} section
 * @param {{ today?: string }} [options]
 */
export function progressSectionSubtitle(section, options = {}) {
  if (section.id !== 'pulse') return section.subtitle;
  const today = localDayKey(options.today || new Date());
  const start = weekStartOf(today);
  const end = addDaysISO(start, 6);
  return `Current calendar week · ${formatWeekRange(start, end)}`;
}
