import test from 'node:test';
import assert from 'node:assert/strict';
import { planLibraryGroups, planRowFacts, planKindLabel } from '../js/programs/plans-home-model.js';
import { PROGRAM_CATALOG } from '../js/programs/catalog.js';

const plan = (id, extra = {}) => ({
  id,
  name: id,
  totalWeeks: 8,
  days: { mon: { title: 'Upper', lifts: ['Bench Press'], runs: 'Rest' } },
  ...extra,
});

const stateWith = (overrides = {}) => ({
  activeProgramId: null,
  customPrograms: [],
  routines: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [] },
  ...overrides,
});

test('a plan that is both saved and completed is listed and counted once', () => {
  const catalogPlan = PROGRAM_CATALOG[0];
  const state = stateWith({
    programLibrary: {
      bookmarks: [catalogPlan.id],
      completions: [{ programId: catalogPlan.id, completedAt: '2026-01-01T00:00:00.000Z' }],
      recentlyViewed: [],
    },
  });
  const model = planLibraryGroups(state);
  const matches = model.rows.filter((row) => row.program.id === catalogPlan.id);
  assert.equal(matches.length, 1, 'one row per plan');
  assert.equal(model.planCount, 1, 'the count is distinct plans, not list entries');
  assert.equal(matches[0].saved, true);
  assert.equal(matches[0].completed, true);
});

test('a bookmark for a deleted plan drops out instead of becoming the default plan', () => {
  const state = stateWith({
    programLibrary: { bookmarks: ['deleted_plan_id'], completions: [], recentlyViewed: [] },
  });
  const model = planLibraryGroups(state);
  assert.equal(model.rows.length, 0);
  assert.equal(model.count, 0);
  assert.equal(model.hasAnything, false);
});

test('the active personal plan is flagged and still listed', () => {
  const custom = plan('prog_mine');
  const state = stateWith({ customPrograms: [custom], activeProgramId: custom.id });
  const model = planLibraryGroups(state);
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].active, true);
  assert.equal(model.rows[0].kind, 'custom');
  assert.equal(planKindLabel(model.rows[0]), 'Active');
});

test('a plan in a custom copy and a completion keeps the personal provenance', () => {
  const custom = plan('prog_copy');
  const state = stateWith({
    customPrograms: [custom],
    programLibrary: {
      bookmarks: ['prog_copy'],
      completions: [{ programId: 'prog_copy' }],
      recentlyViewed: [],
    },
  });
  const model = planLibraryGroups(state);
  assert.equal(model.rows.length, 1);
  assert.equal(model.rows[0].kind, 'custom');
  assert.equal(planKindLabel(model.rows[0]), 'Your plan');
});

test('routines are counted but never merged into plans', () => {
  const state = stateWith({
    customPrograms: [plan('prog_one')],
    routines: [{ id: 'rtn_1', name: 'Push day' }, { id: 'rtn_2', name: 'Pull day' }],
  });
  const model = planLibraryGroups(state);
  assert.equal(model.planCount, 1);
  assert.equal(model.routines.length, 2);
  assert.equal(model.count, 3);
  assert.equal(model.rows.some((row) => row.program.id.startsWith('rtn_')), false);
});

test('row facts derive the training-day count from the template', () => {
  const custom = plan('prog_days', {
    totalWeeks: 6,
    dossier: { focus: 'Upper / lower' },
    days: {
      mon: { lifts: ['Bench Press'], runs: 'Rest' },
      tue: { lifts: [], runs: 'Rest' },
      wed: { lifts: ['Back Squat'], runs: 'Rest' },
      thu: { lifts: [], runs: '5 km easy' },
    },
  });
  const facts = planRowFacts(custom);
  assert.equal(facts.weeks, 6);
  assert.equal(facts.daysPerWeek, 3, 'two strength days + one run day');
  assert.equal(facts.focus, 'Upper / lower');
  assert.equal(facts.level, null);
});

test('an empty library is honestly empty', () => {
  const model = planLibraryGroups(stateWith());
  assert.deepEqual(model.rows, []);
  assert.equal(model.planCount, 0);
  assert.equal(model.count, 0);
  assert.equal(model.hasAnything, false);
});
