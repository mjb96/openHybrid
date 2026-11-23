// =============================================================================
// FASTING BAND AGAINST THE REAL WRITER
//
// The first version of this test built history as `{ hours }`. Nothing in the app
// writes that field — `stopFastAtTime` writes `durationHours` — so the band was
// dead in production while the suite was green. Fixtures must come from the code
// that persists the data.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFastingBandModel } from '../js/analytics/fasting-band.js';
import { resolveRange } from '../js/analytics/ranges.js';
import { stopFastAtTime } from '../js/fasting.js';

const range = resolveRange('30d', '2026-11-24');

/** A state with one fast, persisted the way the app persists it. */
function stateWithRealFast({ startISO, endISO, goal = 16 }) {
  const state = { fastingSession: { active: true, startTime: startISO, goal, history: [] } };
  stopFastAtTime(state, endISO, () => {});
  return state;
}

test('a fast written by the app is read by the band', () => {
  const state = stateWithRealFast({
    startISO: new Date('2026-11-20T00:00:00Z').toISOString(),
    endISO: new Date('2026-11-20T16:00:00Z').toISOString(),
  });
  assert.equal(state.fastingSession.history.length, 1, 'the writer stored a fast');
  assert.equal(state.fastingSession.history[0].durationHours, 16, 'and used durationHours');

  const model = buildFastingBandModel(state, { range });
  assert.equal(model.hasData, true, 'the band must render for a real fast');
  assert.equal(model.averageHours, 16);
  assert.equal(model.adherencePct, 100);
});

test('a fast is judged against the goal that applied to it', () => {
  // 17 h fast under a 16 h goal.
  const state = stateWithRealFast({
    startISO: new Date('2026-11-18T00:00:00Z').toISOString(),
    endISO: new Date('2026-11-18T17:00:00Z').toISOString(),
  });
  // The athlete later raises the goal to 18 h.
  state.fastingSession.goal = 18;

  const model = buildFastingBandModel(state, { range });
  assert.equal(model.goalHours, 18, 'the band reports the current goal');
  assert.equal(model.adherencePct, 100, 'but the 17 h fast met the 16 h goal it was done under');
});
