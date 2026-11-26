import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BROWSE_SORTS, activeFilterCount, browsePlans, defaultBrowseFilters,
  emptyStateFor, filterSummary, hasEquipmentProfile, matchesFilters,
  programFacts, searchPlans,
} from '../js/programs/browse-model.js';

// A small, explicit catalogue so every facet assertion is exact.
const CATALOG = [
  { id: 's1', name: 'Strength Base', category: 'strength', difficulty: 'beginner', durationWeeks: 8, sessionsPerWeek: 4, equipment: ['barbell', 'rack'], tags: [], goals: [] },
  { id: 's2', name: 'Advanced Strength', category: 'strength', difficulty: 'advanced', durationWeeks: 16, sessionsPerWeek: 5, equipment: ['barbell'], tags: [], goals: [] },
  { id: 'h1', name: 'Hybrid Builder', category: 'hybrid', difficulty: 'intermediate', durationWeeks: 12, sessionsPerWeek: 4, equipment: ['barbell'], tags: [], goals: [] },
  { id: 'r1', name: '5K Starter', category: 'running', difficulty: 'beginner', durationWeeks: 6, sessionsPerWeek: 3, equipment: [], tags: [], goals: [] },
  { id: 'c1', name: 'Cable Pump', category: 'hypertrophy', difficulty: 'intermediate', durationWeeks: 8, sessionsPerWeek: 4, equipment: ['cables'], tags: [], goals: [] },
  { id: 'w1', name: 'WOD Sprint', category: 'hyrox', difficulty: 'intermediate', durationWeeks: 1, tags: ['hyrox-wod'], equipment: [] },
];

const CUSTOM = {
  id: 'prog_mine', name: 'Bench Focus Block', totalWeeks: 4,
  dossier: { focus: 'Strength' },
  days: {
    mon: { lifts: ['Bench Press'], runs: 'Rest' },
    wed: { lifts: ['Barbell Row'], runs: 'Rest' },
  },
};

const state = (overrides = {}) => ({
  settings: {
    fitnessGoal: 'strength', fitnessLevel: 'beginner', equipmentTier: 'home',
    equipment: { barbell: true, rack: true },
  },
  customPrograms: [CUSTOM],
  routines: [{ id: 'rtn_push', name: 'Push day', category: 'push' }],
  ...overrides,
});

const ids = (programs) => programs.map((program) => program.id);

test('equipment is not filtered by default, even when kit is on file', () => {
  assert.equal(hasEquipmentProfile({ equipment: { barbell: true } }), true);
  assert.equal(hasEquipmentProfile({ equipment: { barbell: false } }), false);
  assert.equal(hasEquipmentProfile({}), false);
  // Hiding plans by default is the same failure as an unclearable filter: the
  // athlete cannot tell what is not being shown. The facet is opt-in.
  assert.equal(defaultBrowseFilters(state()).equipment, 'all');
  assert.equal(defaultBrowseFilters(state({ settings: {} })).equipment, 'all');
});

test('a goal facet narrows to its categories', () => {
  const result = browsePlans(state(), { ...defaultBrowseFilters(state()), goal: 'strength', equipment: 'all' }, { catalog: CATALOG, sort: 'az' });
  assert.deepEqual(ids(result.library), ['s2', 's1'], 'Advanced Strength then Strength Base');
  assert.equal(result.library.every((program) => program.category === 'strength'), true);
});

test('a level facet excludes plans that cannot be judged, including personal plans', () => {
  const filters = { ...defaultBrowseFilters(state()), level: 'beginner', equipment: 'all' };
  const result = browsePlans(state(), filters, { catalog: CATALOG, sort: 'az' });
  assert.deepEqual(ids(result.library).sort(), ['r1', 's1']);
  assert.equal(result.mine.length, 0, 'a plan with no level is not claimed to match one');
});

test('days per week filters programmes and excludes single workouts', () => {
  const filters = { ...defaultBrowseFilters(state()), days: '4', equipment: 'all' };
  const result = browsePlans(state(), filters, { catalog: CATALOG, sort: 'az' });
  assert.deepEqual(ids(result.library).sort(), ['c1', 'h1', 's1']);
  assert.equal(result.library.some((program) => program.tags?.includes('hyrox-wod')), false);
});

test('length buckets are inclusive and use the real block length', () => {
  const short = browsePlans(state(), { ...defaultBrowseFilters(state()), length: 'short', equipment: 'all' }, { catalog: CATALOG, sort: 'az' });
  assert.deepEqual(ids(short.library).sort(), ['r1'], 'a single workout has no block length');
  assert.deepEqual(ids(short.mine), ['prog_mine'], 'the 4-week personal plan is short too');
  const long = browsePlans(state(), { ...defaultBrowseFilters(state()), length: 'long', equipment: 'all' }, { catalog: CATALOG, sort: 'az' });
  assert.deepEqual(ids(long.library), ['s2']);
});

test('"only my equipment" excludes a plan that needs kit the athlete does not have', () => {
  const filters = { ...defaultBrowseFilters(state()), equipment: 'mine' };
  const result = browsePlans(state(), filters, { catalog: CATALOG, sort: 'az' });
  assert.equal(ids(result.library).includes('c1'), false, 'cables are not owned');
  assert.equal(ids(result.library).includes('s1'), true, 'barbell + rack are owned');
  assert.equal(ids(result.mine).includes('prog_mine'), true, 'a personal plan with no kit list is never excluded');
});

test('the kind switch separates programmes from single workouts', () => {
  const programs = browsePlans(state(), { ...defaultBrowseFilters(state()), kind: 'program', equipment: 'all' }, { catalog: CATALOG });
  assert.equal(ids(programs.library).includes('w1'), false);
  const wods = browsePlans(state(), { ...defaultBrowseFilters(state()), kind: 'wod', equipment: 'all' }, { catalog: CATALOG });
  assert.deepEqual(ids(wods.library), ['w1']);
});

test('sorts are deterministic: A–Z, shortest, longest', () => {
  const base = { ...defaultBrowseFilters(state()), equipment: 'all' };
  assert.deepEqual(ids(browsePlans(state(), base, { catalog: CATALOG, sort: 'az' }).library),
    ['r1', 's2', 'c1', 'h1', 's1', 'w1'], '5K, Advanced, Cable, Hybrid, Strength, WOD');
  assert.deepEqual(ids(browsePlans(state(), base, { catalog: CATALOG, sort: 'shortest' }).library).slice(0, 2), ['w1', 'r1']);
  assert.equal(ids(browsePlans(state(), base, { catalog: CATALOG, sort: 'longest' }).library)[0], 's2');
  assert.equal(BROWSE_SORTS.some((sort) => sort.id === 'recommended'), true);
});

test('search finds the athlete’s own plan and routine, not only the catalogue', () => {
  const found = searchPlans(state(), 'bench focus');
  assert.deepEqual(ids(found.mine), ['prog_mine']);
  const routines = searchPlans(state(), 'push');
  assert.deepEqual(ids(routines.routines), ['rtn_push']);
  const nothing = searchPlans(state(), 'z');
  assert.deepEqual([nothing.mine.length, nothing.library.length, nothing.routines.length], [0, 0, 0]);
});

test('a query narrows both groups through the one search engine', () => {
  const filters = { ...defaultBrowseFilters(state()), equipment: 'all', query: 'strength' };
  const result = browsePlans(state(), filters, { catalog: CATALOG, sort: 'az' });
  assert.equal(result.library.every((program) => /strength/i.test(program.name)), true);
  assert.equal(result.total, result.library.length + result.mine.length);
});

test('the empty state names the facet that emptied the list', () => {
  const filters = { ...defaultBrowseFilters(state()), days: '6', equipment: 'all' };
  const empty = emptyStateFor(filters, state());
  assert.equal(empty.clearable, true);
  assert.match(empty.message, /6\+ days/);
  assert.deepEqual(filterSummary(filters, state()), ['6+ days']);
  assert.equal(activeFilterCount(filters, state()) >= 1, true);
});

test('program facts fall back to the template for a personal plan', () => {
  const facts = programFacts(CUSTOM);
  assert.equal(facts.weeks, 4);
  assert.equal(facts.daysPerWeek, 2);
  assert.equal(facts.level, null);
  assert.equal(facts.categoryLabel, 'Your plan');
});

test('an unjudgeable equipment requirement never excludes a plan', () => {
  const noKit = state({ settings: { fitnessGoal: 'strength', fitnessLevel: 'beginner' } });
  const filters = { ...defaultBrowseFilters(noKit), equipment: 'mine' };
  assert.equal(defaultBrowseFilters(noKit).equipment, 'all', 'with no kit on file the facet is not applied');
  assert.equal(matchesFilters(noKit, CATALOG[0], filters), true);
});
