// =============================================================================
// PROGRESS DASHBOARD COMPOSER
//
// The composer is where the three "does this band exist?" questions meet, and
// they must stay distinct: hidden by the athlete, off by a module switch, or
// simply nothing to say yet. The customize sheet renders all three differently,
// so a confusion here becomes a confusing sheet.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressDashboard, normalizeFocus } from '../js/analytics/progress-dashboard.js';

const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const TODAY = '2026-11-24';

function trainedState(overrides = {}) {
  return {
    settings: {},
    weeks: {
      '1': {
        dates: { mon: '2026-11-23' },
        lifts: { mon: { 'Bench Press': [done(100), done(100)] } },
      },
    },
    ...overrides,
  };
}

const ctx = { todayISO: TODAY };

test('a trained athlete gets Pulse and Muscles, each with a real model', () => {
  const model = buildProgressDashboard(trainedState(), ctx);
  assert.deepEqual(model.bands.map((band) => band.id), ['pulse', 'muscles']);
  const pulse = model.bands.find((band) => band.id === 'pulse');
  assert.equal(pulse.model.sessions, 1);
  assert.equal(model.availability.pulse.hasData, true);
  assert.equal(model.range.id, '30d');
  assert.ok(model.previous, 'a comparable previous window exists');
});

test('bands that are declared but not built never reach the surface', () => {
  const model = buildProgressDashboard(trainedState(), ctx);
  const ids = model.bands.map((band) => band.id);
  assert.ok(!ids.includes('balance'), 'Balance has nothing to say yet');
  assert.ok(ids.includes('muscles'), 'Muscles is built now');
  // Every strength/running/body band is built now; only Fasting is pending.
  assert.equal(model.availability.fasting.pending, true);
  assert.equal(model.availability.body.pending, undefined, 'body is built now');
  assert.equal(model.availability.endurance.hasData, false, 'no runs in the fixture');
  // Balance IS built, but a strength-only fixture gives it nothing to say, so
  // it reports no data rather than pending and never reaches the surface.
  assert.equal(model.availability.balance.pending, undefined);
  assert.equal(model.availability.balance.hasData, false);
});

test('a hidden band is absent from the surface but still reported', () => {
  const state = trainedState({ settings: { ui: { progress: { hidden: ['pulse'] } } } });
  const model = buildProgressDashboard(state, ctx);
  assert.equal(model.bands.some((band) => band.id === 'pulse'), false);
  assert.equal(model.availability.pulse.hidden, true);
  assert.equal(model.availability.pulse.hasData, true, 'availability is not visibility');
  assert.equal(model.visibleCount, 7);
});

test('a module switch removes the band and says so', () => {
  const state = trainedState({ settings: { modules: { running: false, fasting: false } } });
  const model = buildProgressDashboard(state, ctx);
  assert.equal(model.availability.endurance.moduleOff, true);
  assert.equal(model.availability.fasting.moduleOff, true);
  assert.equal(model.availability.pulse.moduleOff, false);
  // A module-off band never renders, even with data.
  assert.equal(model.bands.some((band) => band.id === 'endurance'), false);
});

test('an empty athlete still gets Pulse, which reports no data', () => {
  const model = buildProgressDashboard({ settings: {}, weeks: {} }, ctx);
  assert.equal(model.bands.length, 1);
  assert.equal(model.availability.pulse.hasData, false);
  assert.equal(model.availability.pulse.hidden, false);
});

test('a failing band becomes an error entry instead of blanking the page', () => {
  const model = buildProgressDashboard(trainedState(), {
    ...ctx,
    builders: { pulse: () => { throw new Error('kaboom'); } },
  });
  const pulse = model.bands.find((band) => band.id === 'pulse');
  assert.equal(pulse.error, 'kaboom');
  assert.equal(model.availability.pulse.error, 'kaboom');
});

test('a failing hidden band is not rendered at all', () => {
  const state = trainedState({ settings: { ui: { progress: { hidden: ['pulse'] } } } });
  const model = buildProgressDashboard(state, {
    ...ctx,
    builders: { pulse: () => { throw new Error('kaboom'); } },
  });
  assert.equal(model.bands.some((band) => band.id === 'pulse'), false, 'hidden and failing: absent');
});

test('focus collapses the other modality and never Balance', () => {
  const withBoth = {
    ...trainedState(),
    weeks: {
      '1': {
        dates: { mon: '2026-11-23' },
        lifts: { mon: { 'Bench Press': [done(100)] } },
        runSessions: { mon: [{ dist: '5', time: '25:00', type: 'run' }] },
      },
    },
  };
  const builders = {
    pulse: () => ({ hasData: true }),
    balance: () => ({ hasData: true }),
    muscles: () => ({ hasData: true }),
    exercises: () => ({ hasData: true }),
    endurance: () => ({ hasData: true }),
  };

  const strength = buildProgressDashboard(withBoth, { ...ctx, focus: 'strength', builders });
  const byId = Object.fromEntries(strength.bands.map((band) => [band.id, band]));
  assert.equal(byId.endurance.collapsed, true);
  assert.equal(byId.muscles.collapsed, false);
  assert.equal(byId.balance.collapsed, false, 'Balance is never collapsed by the filter');

  const endurance = buildProgressDashboard(withBoth, { ...ctx, focus: 'endurance', builders });
  const byId2 = Object.fromEntries(endurance.bands.map((band) => [band.id, band]));
  assert.equal(byId2.muscles.collapsed, true);
  assert.equal(byId2.exercises.collapsed, true);
  assert.equal(byId2.endurance.collapsed, false);
  assert.equal(byId2.balance.collapsed, false);
});

test('the modality filter is unavailable when a modality has no data', () => {
  const model = buildProgressDashboard(trainedState(), {
    ...ctx,
    builders: {
      pulse: () => ({ hasData: true }),
      muscles: () => ({ hasData: true }),
      exercises: () => ({ hasData: true }),
      endurance: () => ({ hasData: false }),
    },
  });
  assert.equal(model.focusAvailable.strength, true);
  assert.equal(model.focusAvailable.endurance, false);
});

test('hiding every strength band removes the Strength chip even with data', () => {
  const state = trainedState({
    settings: { ui: { progress: { hidden: ['muscles', 'exercises'] } } },
  });
  const model = buildProgressDashboard(state, {
    ...ctx,
    builders: {
      pulse: () => ({ hasData: true }),
      muscles: () => ({ hasData: true }),
      exercises: () => ({ hasData: true }),
      endurance: () => ({ hasData: true }),
    },
  });
  assert.equal(model.focusAvailable.strength, false);
  assert.equal(model.focusAvailable.endurance, true);
});

test('the saved order is honoured, with unknown ids ignored', () => {
  const state = trainedState({
    settings: { ui: { progress: { order: ['reports', 'pulse', 'nope'] } } },
  });
  const model = buildProgressDashboard(state, ctx);
  // Only pulse has a builder today, so it is the only rendered band — the point
  // is that traversal followed the saved order instead of the catalogue.
  assert.equal(model.bands[0].id, 'pulse');
  assert.equal(model.totalCount, 8);
});

test('an unknown focus falls back to All rather than hiding anything', () => {
  assert.equal(normalizeFocus('nonsense'), 'all');
  assert.equal(normalizeFocus(null), 'all');
  assert.equal(normalizeFocus('strength'), 'strength');
  const model = buildProgressDashboard(trainedState(), { ...ctx, focus: 'bogus' });
  assert.equal(model.focus, 'all');
  assert.ok(model.bands.every((band) => band.collapsed === false));
});

test('an invalid reference day is refused, not guessed', () => {
  assert.throws(() => buildProgressDashboard(trainedState(), { todayISO: 'nope' }), /invalid todayISO/);
});
