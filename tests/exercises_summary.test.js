// =============================================================================
// MAIN EXERCISES MODEL — ranking, e1RM change and an all-time PR flag.
//
// The PR flag is the subtle one: it must compare the window's best against the
// ALL-TIME best for the same exercise, including sessions outside the window,
// or a lift that peaked two months ago would look like a new record.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExerciseSummaryModel } from '../js/analytics/exercises-summary.js';
import { resolveRange } from '../js/analytics/ranges.js';

const range = resolveRange('30d', '2026-11-24');
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });
const day = (date, lifts) => ({ dates: { mon: date }, lifts: { mon: lifts } });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

test('exercises are ranked by sessions and carry an e1RM change', () => {
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [done(140)], 'Bench Press': [done(100)] }),
    day('2026-11-17', { 'Back Squat': [done(145)], 'Bench Press': [done(100)] }),
    day('2026-11-20', { 'Back Squat': [done(150)], 'Barbell Row': [done(80)] }),
    day('2026-11-22', { 'Barbell Row': [done(82.5)] }),
  ]), { range, unit: 'kg' });

  assert.equal(model.hasData, true);
  const squat = model.rows[0];
  assert.equal(squat.lift, 'Back Squat');
  assert.equal(squat.sessions, 3);
  assert.ok(squat.deltaPct > 0, 'a heavier top set is a positive change');
  assert.ok(squat.series.length >= 2, 'a series for the sparkline');
});

test('one session is not a comparison', () => {
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-11-20', { 'Back Squat': [done(140)], 'Bench Press': [done(100)], 'Barbell Row': [done(80)] }),
  ]), { range });
  for (const row of model.rows) {
    assert.equal(row.deltaPct, null, `${row.lift} cannot compare with itself`);
  }
});

test('an exercise trained once in the window is listed but does not qualify as data', () => {
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-11-20', { 'Back Squat': [done(140)], 'Bench Press': [done(100)], 'Barbell Row': [done(80)] }),
  ]), { range });
  assert.equal(model.rows.length, 3);
  assert.equal(model.hasData, false, 'one session each is a list of one-offs');
});

test('warm-up sets do not create sessions or change the best', () => {
  const withWarmups = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [warm(60), done(140)] }),
    day('2026-11-17', { 'Back Squat': [warm(60), done(145)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const without = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(145)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  assert.deepEqual(
    withWarmups.rows.map((row) => [row.lift, row.sessions, row.bestE1rm]),
    without.rows.map((row) => [row.lift, row.sessions, row.bestE1rm]),
  );
});

test('the PR flag compares against the all-time best, not just this window', () => {
  const peakedLongAgo = buildExerciseSummaryModel(stateWith([
    // Outside the 30-day window: a much heavier set.
    day('2026-08-01', { 'Back Squat': [done(170)] }),
    // Inside the window: modest.
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(145)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const squat = peakedLongAgo.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(squat.prFlag, false, 'a past peak is not this window\'s record');

  const recordNow = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(150)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const top = recordNow.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(top.prFlag, true, 'the best ever is a PR');
});

test('a record set OUTSIDE the window does not badge the window', () => {
  // June 150 -> August 170 is a record, but August is outside the 30-day window.
  // The window's own sessions (140, 145) beat nothing, so no badge.
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-06-01', { 'Back Squat': [done(150)] }),
    day('2026-08-01', { 'Back Squat': [done(170)] }),
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(145)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const squat = model.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(squat.prFlag, false, 'the record was set in August, not this window');
});

test('a record set INSIDE the window badges it', () => {
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-06-01', { 'Back Squat': [done(150)] }),
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(165)] }),
    day('2026-11-20', { 'Bench Press': [done(100)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const squat = model.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(squat.prFlag, true, '165 beat the 150 set in June');
});

test('stored aliases collapse to one canonical exercise row', () => {
  const model = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Bench Press': [done(100)] }),
    day('2026-11-17', { 'Barbell Bench Press': [done(105)] }),
    day('2026-11-20', { 'Back Squat': [done(140)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const bench = model.rows.filter((row) => /bench/i.test(row.lift));
  assert.equal(bench.length, 1, 'two stored names, one exercise');
  assert.equal(bench[0].sessions, 2);
});

test('an empty window has no rows and asks for data', () => {
  const model = buildExerciseSummaryModel({ weeks: {} }, { range });
  assert.equal(model.hasData, false);
  assert.deepEqual(model.rows, []);
});

test('a missing range is refused', () => {
  assert.throws(() => buildExerciseSummaryModel({ weeks: {} }, {}), /range is required/);
});
