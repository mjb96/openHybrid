// =============================================================================
// MUSCLES MODEL — credited sets per muscle, by bucket, with a share comparison.
//
// The rules that must not drift: warm-ups contribute nothing, holds and carries
// count as sets with zero tonnage, and a compound set credits the prime mover 1
// and a synergist 0.5 so per-muscle shares add up to 100.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMuscleModel, weeksInRange } from '../js/analytics/muscles.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';

const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });
const range30 = resolveRange('30d', '2026-11-24');
const prev30 = previousRange(range30);

/** One day slot with lifts. */
const day = (date, lifts, extra = {}) => ({ dates: { mon: date }, lifts: { mon: lifts }, ...extra });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

test('a compound set credits the prime mover in full and a synergist at half', () => {
  const model = buildMuscleModel(
    stateWith([day('2026-11-20', { 'Barbell Bench Press': [done(100)] })]),
    { range: range30 },
  );
  const chest = model.muscles.find((m) => m.key === 'chest');
  const triceps = model.muscles.find((m) => m.key === 'triceps');
  assert.equal(chest.sets, 1);
  assert.equal(triceps.sets, 0.5);
  // The catalogue may credit a third muscle (front delts), so assert the
  // relationships rather than a hard-coded total.
  assert.equal(model.totalSets, model.muscles.reduce((sum, muscle) => sum + muscle.sets, 0),
    'credited sets, not a raw set count');
  assert.ok(chest.sharePct > triceps.sharePct, 'the prime mover outranks the synergist');
  assert.ok(Math.abs(model.muscles.reduce((sum, muscle) => sum + muscle.sharePct, 0) - 100) < 0.6);
});

test('per-muscle shares always sum to 100', () => {
  const model = buildMuscleModel(
    stateWith([day('2026-11-20', {
      'Barbell Bench Press': [done(100), done(100)],
      'Barbell Row': [done(80)],
      'Back Squat': [done(140)],
    })]),
    { range: range30 },
  );
  const sum = model.muscles.reduce((total, muscle) => total + muscle.sharePct, 0);
  // The rule is EXACTLY 100 (largest-remainder allocation), so a 0.5 error or a
  // dropped muscle must fail.
  assert.equal(Math.round(sum * 10) / 10, 100);
});

test('warm-up sets contribute nothing', () => {
  const withWarmups = buildMuscleModel(
    stateWith([day('2026-11-20', { 'Back Squat': [warm(60), warm(80), done(140)] })]),
    { range: range30 },
  );
  const without = buildMuscleModel(
    stateWith([day('2026-11-20', { 'Back Squat': [done(140)] })]),
    { range: range30 },
  );
  assert.deepEqual(
    withWarmups.muscles.map((m) => [m.key, m.sets]),
    without.muscles.map((m) => [m.key, m.sets]),
    'warm-ups must not change any credited total',
  );
});

test('holds count as sets with no tonnage', () => {
  const model = buildMuscleModel(
    stateWith([day('2026-11-20', { Plank: [{ c: true, mode: 'time', sec: '60' }] })]),
    { range: range30 },
  );
  assert.ok(model.muscles.some((muscle) => muscle.key === 'core'), 'core is credited');
  assert.equal(model.totalVolumeKg, 0, 'a hold is not tonnage');
});

test('buckets group by week, month or year', () => {
  const state = stateWith([
    day('2026-11-16', { 'Back Squat': [done(140)] }),
    day('2026-11-23', { 'Back Squat': [done(140)] }),
  ]);
  const weekly = buildMuscleModel(state, { range: range30, grouping: 'week' });
  assert.ok(weekly.buckets.length >= 2, 'two Mondays are two buckets');
  assert.ok(weekly.buckets.every((bucket) => /^\d{4}-\d{2}-\d{2}$/.test(bucket.key)));

  const monthly = buildMuscleModel(state, { range: range30, grouping: 'month' });
  assert.ok(monthly.buckets.every((bucket) => /^\d{4}-\d{2}$/.test(bucket.key)));
  assert.ok(monthly.buckets.some((bucket) => bucket.key === '2026-11'));

  const yearly = buildMuscleModel(state, { range: resolveRange('all', '2026-11-24', { earliestISO: '2024-01-01' }), grouping: 'year' });
  assert.ok(yearly.buckets.every((bucket) => /^\d{4}$/.test(bucket.key)));
});

test('every bucket in the window exists, so a missed week is a gap not a shift', () => {
  const model = buildMuscleModel(stateWith([day('2026-11-23', { 'Back Squat': [done(140)] })]), { range: range30 });
  // 30 days ≈ 5 weekly buckets, only the last of which has data.
  assert.ok(model.buckets.length >= 4);
  const trained = model.buckets.filter((bucket) => Object.keys(bucket.setsByMuscle).length);
  assert.equal(trained.length, 1);
});

test('distribution compares the equal-length previous window', () => {
  const state = stateWith([
    // This window: only chest work → chest share 100.
    day('2026-11-20', { 'Barbell Bench Press': [done(100)] }),
    // Previous window: only quads → chest share 0.
    day('2026-10-20', { 'Back Squat': [done(140)] }),
  ]);
  const model = buildMuscleModel(state, { range: range30, previous: prev30 });
  const chest = model.muscles.find((m) => m.key === 'chest');
  assert.notEqual(chest.previousSharePct, null);
  assert.ok(chest.deltaPct > 0, 'chest grew against the previous window');
  assert.equal(chest.status, 'up');

  const quads = model.muscles.find((m) => m.key === 'quads');
  assert.equal(quads, undefined, 'a muscle not trained in the window is not invented');
});

test('an untrained window has no data and no muscles', () => {
  const model = buildMuscleModel({ weeks: {} }, { range: range30 });
  assert.equal(model.hasData, false);
  assert.deepEqual(model.muscles, []);
  assert.equal(model.totalSets, 0);
  assert.equal(model.regions && Object.keys(model.regions).length, 0);
});

test('days outside the window are ignored', () => {
  const model = buildMuscleModel(
    stateWith([day('2026-11-20', { 'Back Squat': [done(140)] }), day('2026-08-01', { 'Barbell Row': [done(80)] })]),
    { range: range30 },
  );
  assert.equal(model.muscles.some((muscle) => muscle.key === 'lats'), false, 'August must not leak in');
});

test('an archived activation still counts in the week it happened', () => {
  const model = buildMuscleModel({
    weeks: {
      'arch:old:2': { dates: { mon: '2026-11-20' }, lifts: { mon: { 'Back Squat': [done(140)] } } },
    },
  }, { range: range30 });
  assert.equal(model.hasData, true);
  assert.ok(model.muscles.some((muscle) => muscle.key === 'quads'));
});

test('the body map is built from the same credited sets', () => {
  const model = buildMuscleModel(
    stateWith([day('2026-11-20', { 'Barbell Bench Press': [done(100)] })]),
    { range: range30 },
  );
  assert.ok(Object.keys(model.regions).length > 0, 'regions for the heat map');
  assert.ok(Array.isArray(model.top) && model.top.length > 0, 'top muscles for the text alternative');
});

test('a missing range is refused', () => {
  assert.throws(() => buildMuscleModel({ weeks: {} }, {}), /range is required/);
});

test('weeksInRange scales a window for reference comparisons', () => {
  assert.equal(weeksInRange({ days: 7 }), 1);
  assert.equal(weeksInRange({ days: 30 }), 30 / 7);
  assert.equal(weeksInRange({ startISO: '2026-11-01', endISO: '2026-11-14' }), 2);
});

test('the unbounded range charts its whole history, not one bucket', () => {
  const all = resolveRange('all', '2026-11-24'); // no earliestISO: startISO is null
  const model = buildMuscleModel(stateWith([
    day('2026-08-03', { 'Barbell Bench Press': [done(100)] }),
    day('2026-11-16', { 'Back Squat': [done(140)] }),
    day('2026-11-23', { 'Back Squat': [done(145)] }),
  ]), { range: all, grouping: 'week' });

  assert.ok(model.buckets.length > 1, `one bucket for a whole history: ${model.buckets.length}`);
  const charted = model.buckets.reduce((total, bucket) =>
    total + Object.values(bucket.setsByMuscle).reduce((sum, value) => sum + value, 0), 0);
  // The headline is rounded to one decimal and the buckets are raw credits, so
  // they agree to within a rounding step — the old bug differed by every session
  // outside the single bucket.
  assert.ok(Math.abs(charted - model.totalSets) < 0.1,
    `the chart (${charted}) must account for the headline (${model.totalSets})`);
});

test('frequency counts training dates per muscle, not sets or lifts (A7)', () => {
  const model = buildMuscleModel(
    stateWith([
      day('2026-11-18', { 'Barbell Bench Press': [done(100)], 'Barbell Row': [done(80)] }),
      day('2026-11-20', { 'Barbell Bench Press': [done(100), done(100)] }),
    ]),
    { range: range30 },
  );
  const chest = model.muscles.find((m) => m.key === 'chest');
  assert.equal(chest.sessions, 2, 'two training dates, not three sets');
  const week = model.buckets.reduce((sum, bucket) => sum + (Number(bucket.sessionsByMuscle?.chest) || 0), 0);
  assert.equal(week, 2, 'bucket sessions add up to the range count');
});

test('frequency compares with the previous window like sets do', () => {
  const model = buildMuscleModel(
    stateWith([
      day('2026-10-01', { 'Barbell Bench Press': [done(100)] }),
      day('2026-11-18', { 'Barbell Bench Press': [done(100)] }),
      day('2026-11-20', { 'Barbell Bench Press': [done(100)] }),
    ]),
    { range: range30, previous: prev30 },
  );
  const chest = model.muscles.find((m) => m.key === 'chest');
  assert.equal(chest.previousSessions, 1);
  assert.equal(chest.sessionsDelta, 1);
});
