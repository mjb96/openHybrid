// =============================================================================
// A5 — session vs last time
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionComparison, strengthTotals } from '../js/workout/session-comparison.js';

const sets = (...pairs) => pairs.map(([w, r]) => ({ w: String(w), r: String(r), c: true }));
const week = (date, liftSets, extra = {}) => ({
  programId: 'prog', dates: { wed: date }, lifts: { wed: { 'Back Squat': liftSets } },
  gymStats: {}, runSessions: {}, ...extra,
});

test('totals count only completed working sets', () => {
  const totals = strengthTotals({ 'Back Squat': [...sets([100, 5], [100, 5]), { w: '80', r: '5', c: false }] });
  assert.equal(totals.sets, 2);
  assert.equal(totals.volume, 1000);
  assert.ok(totals.bestE1rm > 100);
});

test('a programmed day compares with the previous session of the same day', () => {
  const state = {
    weeks: {
      old: week('2026-11-04', sets([100, 5], [100, 5])),
      recent: week('2026-11-11', sets([105, 5])),
      current: week('2026-11-18', sets([110, 5], [110, 5])),
    },
  };
  const current = { dateISO: '2026-11-18', ...strengthTotals(state.weeks.current.lifts.wed), prs: 1 };
  const comparison = buildSessionComparison(state, 'current', 'wed', current);
  assert.equal(comparison.previousDate, '2026-11-11');
  assert.equal(comparison.previousSets, 1);
  assert.ok(comparison.volumeDelta > 0);
  assert.ok(comparison.bestDelta > 0);
  assert.equal(comparison.prs, 1);
});

test('a routine compares only with the same routine', () => {
  const state = {
    weeks: {
      routineA: week('2026-11-04', sets([100, 5]), { sourceRoutineId: 'rtn_a' }),
      routineB: week('2026-11-11', sets([200, 5]), { sourceRoutineId: 'rtn_b' }),
      current: week('2026-11-18', sets([105, 5]), { sourceRoutineId: 'rtn_a' }),
    },
  };
  const current = { dateISO: '2026-11-18', ...strengthTotals(state.weeks.current.lifts.wed) };
  const comparison = buildSessionComparison(state, 'current', 'wed', current);
  assert.equal(comparison.previousDate, '2026-11-04', 'the other routine is not this workout');
  assert.equal(comparison.sameWorkout, 'routine');
});

test('future, equal and empty sessions are never the comparison', () => {
  const state = {
    weeks: {
      future: week('2026-11-25', sets([120, 5])),
      empty: week('2026-11-01', []),
      current: week('2026-11-18', sets([110, 5])),
    },
  };
  const current = { dateISO: '2026-11-18', ...strengthTotals(state.weeks.current.lifts.wed) };
  assert.equal(buildSessionComparison(state, 'current', 'wed', current), null);
});

test('no strength work returns no comparison', () => {
  const state = { weeks: { current: week('2026-11-18', []) } };
  assert.equal(buildSessionComparison(state, 'current', 'wed', { dateISO: '2026-11-18', volume: 0, sets: 0, bestE1rm: 0 }), null);
});
