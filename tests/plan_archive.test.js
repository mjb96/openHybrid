// ==========================================
// PLAN ARCHIVE
// A plan that has been trained must never be deleted: activations store only a
// programId, so removing the record makes History fall back to a generic title
// and "Previous program runs" lose the plan's name. Archive hides it and keeps
// the record resolvable; restore brings it back.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';

const mem = {};
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
  };
}

import {
  setAppState, appState, getProgramById, deleteCustomProgram, archiveCustomProgram,
  restoreCustomProgram, planHasRecordedRuns, isProgramArchived,
} from '../js/state.js';
import { planLibraryGroups } from '../js/programs/plans-home-model.js';
import { browsePlans, defaultBrowseFilters } from '../js/programs/browse-model.js';

const plan = (id, extra = {}) => ({
  id,
  name: id,
  totalWeeks: 4,
  days: { mon: { title: 'Upper', lifts: ['Bench Press'], runs: 'Rest' } },
  ...extra,
});

function seed(overrides = {}) {
  const state = {
    schemaVersion: 5,
    activeProgramId: 'prog_active',
    activeActivationId: 'act_active',
    currentWeek: '1',
    settings: { fitnessGoal: 'strength', fitnessLevel: 'beginner' },
    customPrograms: [plan('prog_active'), plan('prog_trained'), plan('prog_fresh')],
    activations: [
      { id: 'act_active', programId: 'prog_active', startWeek: 1 },
      { id: 'act_trained', programId: 'prog_trained', startWeek: 1 },
    ],
    programLibrary: { bookmarks: [], completions: [], recentlyViewed: [] },
    weeks: {},
    ...overrides,
  };
  setAppState(state);
  return state;
}

test('a plan with recorded runs cannot be deleted', () => {
  seed();
  assert.equal(planHasRecordedRuns('prog_trained'), true);
  const result = deleteCustomProgram('prog_trained');
  assert.equal(result.success, false);
  assert.equal(result.needsArchive, true);
  assert.match(result.message, /archive/i);
  assert.ok(appState.customPrograms.some((p) => p.id === 'prog_trained'), 'the record is still there');
});

test('a plan with no runs deletes normally', () => {
  seed();
  const result = deleteCustomProgram('prog_fresh');
  assert.equal(result.success, true);
  assert.equal(appState.customPrograms.some((p) => p.id === 'prog_fresh'), false);
});

test('the active plan cannot be archived', () => {
  seed();
  const result = archiveCustomProgram('prog_active');
  assert.equal(result.success, false);
});

test('archiving keeps the id resolvable for history and hides it from Plans', () => {
  seed();
  const result = archiveCustomProgram('prog_trained');
  assert.equal(result.success, true);
  assert.equal(isProgramArchived('prog_trained'), true);
  // History resolves the programme by id; that must keep working.
  assert.equal(getProgramById('prog_trained')?.name, 'prog_trained');

  const groups = planLibraryGroups(appState);
  assert.equal(groups.rows.some((row) => row.program.id === 'prog_trained'), false);
  assert.equal(groups.archived.some((program) => program.id === 'prog_trained'), true);
  assert.equal(groups.planCount, 2, 'active + fresh still listed');

  const browse = browsePlans(appState, defaultBrowseFilters(appState), { catalog: [] });
  assert.equal(browse.mine.some((program) => program.id === 'prog_trained'), false);
});

test('restore brings an archived plan back to the list', () => {
  seed();
  archiveCustomProgram('prog_trained');
  const result = restoreCustomProgram('prog_trained');
  assert.equal(result.success, true);
  assert.equal(isProgramArchived('prog_trained'), false);
  assert.equal(planLibraryGroups(appState).rows.some((row) => row.program.id === 'prog_trained'), true);
});

test('an archived plan stays hidden even if it is also saved and completed', () => {
  seed({
    programLibrary: {
      bookmarks: ['prog_trained'],
      completions: [{ programId: 'prog_trained', completedAt: '2026-01-01T00:00:00.000Z' }],
      recentlyViewed: [],
    },
  });
  archiveCustomProgram('prog_trained');
  const groups = planLibraryGroups(appState);
  assert.equal(groups.rows.some((row) => row.program.id === 'prog_trained'), false);
  assert.equal(groups.archived.length, 1);
});

test('a completion alone is enough to protect a plan from deletion', () => {
  seed({
    customPrograms: [plan('prog_active'), plan('prog_done')],
    activations: [{ id: 'act_active', programId: 'prog_active' }],
    programLibrary: {
      bookmarks: [], recentlyViewed: [],
      completions: [{ programId: 'prog_done', completedAt: '2026-01-01T00:00:00.000Z' }],
    },
  });
  assert.equal(planHasRecordedRuns('prog_done'), true);
  assert.equal(deleteCustomProgram('prog_done').success, false);
});
