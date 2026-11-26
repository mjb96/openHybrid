// @ts-check
// =============================================================================
// PLAN BROWSE (js/programs/browse-model.js)
//
// The pure model behind Plans → Browse. It replaced a chip wall that could not
// be reached: the old Discover surface rendered 16 category chips + 5 level
// chips only while a filter was ALREADY active, and the only elements that set
// one lived in dead code — so 58 programmes were reachable by A–Z scroll or a
// free-text query, and a saved plan could not be found by name at all.
//
// Rules:
//   • ONE facet vocabulary, in training language (no schema keys).
//   • Filtering is honest: a facet that cannot be judged (no kit on file, a
//     personal plan with no level) does not silently exclude an entry.
//   • Search covers the catalogue AND the athlete's own plans and routines.
//
// No DOM, no state writes.
// =============================================================================
import { PROGRAM_CATALOG, CATEGORIES } from './catalog.js';
import { equipmentFit } from './compare.js';
import { athleteProfile, programFit } from './recommendation-fit.js';
import { searchPrograms } from './search.js';

/** Programmes tagged as a single workout rather than a block. */
const isWod = (program) => (program?.tags || []).includes('hyrox-wod');

/** The facet vocabulary. `categories` are catalogue category keys. */
export const BROWSE_GOALS = Object.freeze([
  { id: 'strength', label: 'Strength', categories: ['strength', 'powerlifting'] },
  { id: 'muscle', label: 'Muscle', categories: ['hypertrophy', 'bodybuilding'] },
  { id: 'hybrid', label: 'Hybrid', categories: ['hybrid', 'functional', 'general_fitness', 'tactical'] },
  { id: 'running', label: 'Running', categories: ['running', 'endurance', 'triathlon'] },
  { id: 'fat_loss', label: 'Fat loss', categories: ['body_composition'] },
  { id: 'hyrox', label: 'Hyrox', categories: ['hyrox'] },
  { id: 'mobility', label: 'Mobility', categories: ['mobility'] },
]);

export const BROWSE_LEVELS = Object.freeze([
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'elite', label: 'Elite' },
]);

export const BROWSE_DAYS = Object.freeze([
  { id: '2', label: '2 days', matches: (n) => n === 2 },
  { id: '3', label: '3 days', matches: (n) => n === 3 },
  { id: '4', label: '4 days', matches: (n) => n === 4 },
  { id: '5', label: '5 days', matches: (n) => n === 5 },
  { id: '6', label: '6+ days', matches: (n) => n >= 6 },
]);

export const BROWSE_LENGTHS = Object.freeze([
  { id: 'short', label: 'Up to 6 weeks', matches: (n) => n > 0 && n <= 6 },
  { id: 'medium', label: '7–12 weeks', matches: (n) => n >= 7 && n <= 12 },
  { id: 'long', label: '13+ weeks', matches: (n) => n >= 13 },
]);

export const BROWSE_SORTS = Object.freeze([
  { id: 'recommended', label: 'Recommended' },
  { id: 'shortest', label: 'Shortest first' },
  { id: 'longest', label: 'Longest first' },
  { id: 'az', label: 'A–Z' },
]);

const GOAL_BY_ID = new Map(BROWSE_GOALS.map((goal) => [goal.id, goal]));
const LEVEL_LABEL = new Map(BROWSE_LEVELS.map((level) => [level.id, level.label]));

/** Does the athlete have enough kit on file to judge "only what I have"? */
export function hasEquipmentProfile(settings) {
  const equipment = settings?.equipment;
  return !!equipment && typeof equipment === 'object'
    && Object.values(equipment).some((owned) => owned === true);
}

/**
 * Default filters for a fresh Browse screen.
 *
 * Equipment defaults to ALL, not "only what I have": silently hiding a dozen
 * plans on first entry is the same class of bug as a filter that cannot be
 * cleared — the athlete cannot tell what they are not being shown. The facet is
 * one tap away in the sheet, and the result summary states it when applied.
 * @param {any} state
 */
export function defaultBrowseFilters(state) {
  return {
    goal: 'all',
    level: 'all',
    days: 'all',
    equipment: 'all',
    length: 'all',
    kind: 'all',
    query: '',
  };
}

/**
 * The facts a browse row renders and the facets filter on. Personal plans have
 * no catalogue metadata, so their day count comes from the template itself.
 * @param {any} program
 */
export function programFacts(program) {
  const days = program?.days && typeof program.days === 'object' ? program.days : {};
  const trained = Object.values(days).filter((day) => {
    const lifts = Array.isArray(day?.lifts) ? day.lifts.filter((n) => typeof n === 'string' && n.trim()) : [];
    const run = typeof day?.runs === 'string' && day.runs.trim() && !/^rest$/i.test(day.runs.trim());
    return lifts.length > 0 || run;
  }).length;
  return {
    id: String(program?.id || ''),
    name: String(program?.name || 'Plan'),
    weeks: Number(program?.durationWeeks || program?.totalWeeks) || 0,
    daysPerWeek: Number(program?.sessionsPerWeek) || trained,
    level: typeof program?.difficulty === 'string' ? program.difficulty : null,
    category: String(program?.category || 'custom'),
    categoryLabel: CATEGORIES[program?.category]?.label || (program?.category ? String(program.category) : 'Your plan'),
    wod: isWod(program),
    equipment: Array.isArray(program?.equipment) ? program.equipment : [],
  };
}

/** How many facets are narrowing the list (query is shown separately). */
export function activeFilterCount(filters, state) {
  const defaults = defaultBrowseFilters(state);
  let count = 0;
  for (const key of ['goal', 'level', 'days', 'equipment', 'length', 'kind']) {
    if (filters?.[key] && filters[key] !== defaults[key]) count++;
  }
  return count;
}

/** Labels of the active facets, for the summary line above the results. */
export function filterSummary(filters, state) {
  const labels = [];
  const goal = GOAL_BY_ID.get(filters?.goal);
  if (goal) labels.push(goal.label);
  if (filters?.level && filters.level !== 'all') labels.push(LEVEL_LABEL.get(filters.level) || filters.level);
  if (filters?.days && filters.days !== 'all') labels.push(BROWSE_DAYS.find((d) => d.id === filters.days)?.label || `${filters.days} days`);
  if (filters?.length && filters.length !== 'all') labels.push(BROWSE_LENGTHS.find((l) => l.id === filters.length)?.label || filters.length);
  if (filters?.equipment === 'mine') labels.push('My equipment');
  if (filters?.kind === 'program') labels.push('Plans only');
  if (filters?.kind === 'wod') labels.push('Single workouts');
  return [...new Set(labels)];
}

/**
 * Does one programme pass every active facet?
 * @param {any} state
 * @param {any} program
 * @param {ReturnType<typeof defaultBrowseFilters>} filters
 */
export function matchesFilters(state, program, filters) {
  const facts = programFacts(program);
  const f = filters || defaultBrowseFilters(state);

  if (f.kind === 'program' && facts.wod) return false;
  if (f.kind === 'wod' && !facts.wod) return false;

  if (f.goal && f.goal !== 'all') {
    const goal = GOAL_BY_ID.get(f.goal);
    if (!goal) return false;
    if (!goal.categories.includes(facts.category)) return false;
  }

  // A personal plan carries no difficulty; it cannot be judged against a level,
  // so it is excluded only when a level is explicitly requested.
  if (f.level && f.level !== 'all' && facts.level !== f.level) return false;

  // A WOD has no weekly cadence; a "4 days" request is about programmes.
  if (f.days && f.days !== 'all') {
    if (facts.wod) return false;
    const dayFacet = BROWSE_DAYS.find((d) => d.id === f.days);
    if (!dayFacet || !dayFacet.matches(facts.daysPerWeek)) return false;
  }

  if (f.length && f.length !== 'all') {
    // A single workout has no block length; "up to 6 weeks" is about plans.
    if (facts.wod) return false;
    const lengthFacet = BROWSE_LENGTHS.find((l) => l.id === f.length);
    if (!lengthFacet || !lengthFacet.matches(facts.weeks)) return false;
  }

  if (f.equipment === 'mine') {
    // Judge only against kit the athlete actually recorded. With no checklist on
    // file, `equipmentFit` returns everything as unknown — do not exclude.
    const owned = state?.settings?.equipment || {};
    const fit = equipmentFit(facts.equipment, owned);
    if (fit.missing.length > 0) return false;
  }

  return true;
}

function sortPrograms(programs, sort, state) {
  const list = programs.slice();
  if (sort === 'shortest') {
    return list.sort((a, b) => programFacts(a).weeks - programFacts(b).weeks
      || programFacts(a).name.localeCompare(programFacts(b).name));
  }
  if (sort === 'longest') {
    return list.sort((a, b) => programFacts(b).weeks - programFacts(a).weeks
      || programFacts(a).name.localeCompare(programFacts(b).name));
  }
  if (sort === 'az') {
    return list.sort((a, b) => programFacts(a).name.localeCompare(programFacts(b).name));
  }
  // Recommended: the same fit model the recommendation row uses, with
  // popularity only as a tie-breaker. Eligibility is not required to appear in
  // Browse (everything must be reachable), it only orders.
  const profile = athleteProfile(state);
  const scored = list.map((program) => {
    const fit = programFit(program, profile);
    return { program, eligible: fit.eligible, score: fit.score, popularity: Number(program?.popularity) || 0 };
  });
  scored.sort((a, b) => Number(b.eligible) - Number(a.eligible)
    || b.score - a.score
    || b.popularity - a.popularity
    || programFacts(a.program).name.localeCompare(programFacts(b.program).name));
  return scored.map((entry) => entry.program);
}

/**
 * The Browse result set: the athlete's own plans and the catalogue, each
 * filtered and sorted. `total` is what the result heading states.
 *
 * @param {any} state
 * @param {ReturnType<typeof defaultBrowseFilters>} [filters]
 * @param {{ sort?: string, catalog?: any[] }} [options]
 */
export function browsePlans(state, filters, options = {}) {
  const f = filters || defaultBrowseFilters(state);
  const sort = BROWSE_SORTS.some((s) => s.id === options.sort) ? options.sort : 'recommended';
  const catalog = Array.isArray(options.catalog) ? options.catalog : PROGRAM_CATALOG;
  // Archived plans are hidden from Browse too; they remain resolvable for history.
  const mine = (state?.customPrograms || []).filter((p) => p?.id && !p.archived);
  const query = String(f.query || '').trim();

  // Search narrows both groups through the one search engine, so a query behaves
  // the same wherever it is typed. It scores; the facets then filter.
  const matchingIds = query.length >= 2
    ? new Set(searchPrograms(query, [...catalog, ...mine]).map((p) => p.id))
    : null;

  const keep = (program) => (!matchingIds || matchingIds.has(program.id)) && matchesFilters(state, program, f);

  const myPlans = sortPrograms(mine.filter(keep), sort, state);
  const library = sortPrograms(catalog.filter(keep), sort, state);

  return {
    mine: myPlans,
    library,
    total: myPlans.length + library.length,
    libraryTotal: catalog.length,
    sort,
    query,
  };
}

/**
 * Search across everything the athlete could open: their plans, routines and the
 * catalogue. Used by Browse's search field; the catalogue-only engine could not
 * find a saved or personal plan at all.
 *
 * @param {any} state
 * @param {string} query
 */
export function searchPlans(state, query) {
  const q = String(query || '').trim().toLowerCase();
  if (q.length < 2) return { mine: [], library: [], routines: [] };
  const custom = (state?.customPrograms || []).filter((p) => p?.id && !p.archived);
  const routines = Array.isArray(state?.routines) ? state.routines : [];
  const libraryMatches = searchPrograms(q, PROGRAM_CATALOG);
  const mineMatches = custom.filter((program) => {
    const haystack = [
      program.name, program.dossier?.focus, program.dossier?.philosophy, program.description, program.tagline,
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q) || libraryMatches.some((p) => p.id === program.id);
  });
  const routineMatches = routines.filter((routine) => {
    const haystack = [routine?.name, routine?.category, routine?.note].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  });
  return { mine: mineMatches, library: libraryMatches, routines: routineMatches };
}

/**
 * What the empty state should say. Naming the facet that emptied the list is the
 * difference between "no plans" and "clear the 4-day filter".
 */
export function emptyStateFor(filters, state) {
  const labels = filterSummary(filters, state);
  return {
    title: 'No plans match',
    message: labels.length
      ? `Nothing matches ${labels.join(' · ')}. Relax one of these.`
      : 'Nothing matches that search.',
    clearable: activeFilterCount(filters, state) > 0,
  };
}
