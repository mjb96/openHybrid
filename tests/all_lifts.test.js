// =============================================================================
// PG5 — all-lifts index: filter, row rendering and the flat flag
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildExerciseSummaryModel } from '../js/analytics/exercises-summary.js';
import { allLiftsListHTML, filterLifts } from '../js/analytics/all-lifts-sheet.js';

const ROWS = [
  { lift: 'Back Squat', liftId: 'back_squat', sessions: 4, bestE1rm: 140, deltaPct: 5, lastPerformedISO: '2026-11-18', prFlag: true, flat: false },
  { lift: 'Bench Press', liftId: 'barbell_bench_press', sessions: 3, bestE1rm: 100, deltaPct: 0, lastPerformedISO: '2026-11-17', prFlag: false, flat: true },
];

test('search is case-insensitive and keeps the model order', () => {
  assert.deepEqual(filterLifts(ROWS, 'squat').map((row) => row.lift), ['Back Squat']);
  assert.deepEqual(filterLifts(ROWS, 'PRESS').map((row) => row.lift), ['Bench Press']);
  assert.deepEqual(filterLifts(ROWS, 'deadlift'), []);
  const all = filterLifts(ROWS, '');
  assert.equal(all.length, 2);
  assert.notEqual(all, ROWS, 'a query never mutates the model rows');
});

test('rows carry the name, window change, PR and flat badges', () => {
  const html = allLiftsListHTML(ROWS, 'kg');
  assert.match(html, /Back Squat/);
  assert.match(html, /all-lifts__badge--pr/);
  assert.match(html, /Bench Press/);
  assert.match(html, /all-lifts__badge--flat/);
  assert.match(html, /140 kg best/);
  assert.match(html, /data-action="open-analytics" data-context="exercise"/);
  assert.match(html, /data-entity="back_squat"/);
});

test('an empty result says so instead of rendering a blank list', () => {
  assert.match(allLiftsListHTML([], 'kg'), /No lifts match/);
});

function stateWith(sessions) {
  const weeks = {};
  sessions.forEach(([date, weight, reps], index) => {
    weeks[String(index)] = {
      activationId: 'act',
      programId: 'hybrid_engine',
      dates: { wed: date },
      lifts: { wed: { 'Back Squat': [{ w: String(weight), r: String(reps), c: true, tr: reps }] } },
      runs: {}, runSessions: {}, gymStats: {},
    };
  });
  return { currentWeek: '1', activeActivationId: 'act', weeks };
}
const RANGE = { startISO: null, endISO: '2026-12-31', spanLabel: 'All time' };

test('the flat flag needs three sessions and no e1RM improvement in the window', () => {
  const flat = buildExerciseSummaryModel(stateWith([
    ['2026-11-04', 100, 5], ['2026-11-11', 100, 5], ['2026-11-18', 100, 5],
  ]), { range: RANGE, unit: 'kg' });
  const flatRow = flat.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(flatRow.flat, true);
  assert.equal(flatRow.deltaPct, 0);

  const improving = buildExerciseSummaryModel(stateWith([
    ['2026-11-04', 100, 5], ['2026-11-11', 100, 6], ['2026-11-18', 100, 8],
  ]), { range: RANGE, unit: 'kg' });
  assert.equal(improving.rows.find((row) => row.lift === 'Back Squat').flat, false);

  const two = buildExerciseSummaryModel(stateWith([
    ['2026-11-04', 100, 5], ['2026-11-11', 100, 5],
  ]), { range: RANGE, unit: 'kg' });
  const twoRow = two.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(twoRow.deltaPct, 0, 'two matching sessions is a comparison, not a trend');
  assert.equal(twoRow.flat, false, 'two sessions is not a flat trend');
});
