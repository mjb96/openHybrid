// =============================================================================
// ENDURANCE MODEL — run distance, pace and consistency, with walks apart.
//
// Walks are never in a run total and never get a pace. They are still counted
// and reported, because "you walked 12 km" is information, just not running.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEnduranceModel } from '../js/analytics/endurance.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';

const range = resolveRange('30d', '2026-11-24');
const previous = previousRange(range);
const run = (date, { dist = '5', time = '25:00', type = 'run' } = {}) => ({
  dates: { mon: date }, runSessions: { mon: [{ dist, time, type }] },
});
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

test('run distance excludes walks, and walks are still reported', () => {
  const model = buildEnduranceModel(stateWith([
    run('2026-11-10', { dist: '10', time: '50:00' }),
    run('2026-11-12', { dist: '3', time: '30:00', type: 'walk' }),
  ]), { range, previous });

  assert.equal(model.hasData, true);
  assert.equal(model.runKm, 10);
  assert.equal(model.runs, 1);
  assert.equal(model.walkKm, 3);
  assert.equal(model.walks, 1);
});

test('pace is distance-weighted over eligible runs and null without one', () => {
  const model = buildEnduranceModel(stateWith([
    run('2026-11-10', { dist: '10', time: '50:00' }),
    run('2026-11-12', { dist: '5', time: '30:00' }),
  ]), { range, previous });
  // (50 + 30) minutes over 15 km = 5:20 /km
  assert.equal(Math.round(model.avgPaceSecPerKm), 320);

  const walkOnly = buildEnduranceModel(stateWith([
    run('2026-11-12', { dist: '3', time: '30:00', type: 'walk' }),
  ]), { range, previous });
  assert.equal(walkOnly.avgPaceSecPerKm, null, 'a walk never gets a pace');
  assert.equal(walkOnly.hasData, false, 'and walking alone is not running');
});

test('buckets group weekly for short ranges and monthly for long ones', () => {
  const state = stateWith([run('2026-11-10'), run('2026-11-17')]);
  const monthly = buildEnduranceModel(state, { range: resolveRange('1y', '2026-11-24'), previous: null });
  assert.equal(monthly.monthly, true);
  assert.match(monthly.buckets[0].key, /^\d{4}-\d{2}$/);

  const weekly = buildEnduranceModel(state, { range, previous });
  assert.equal(weekly.monthly, false);
  assert.match(weekly.buckets[0].key, /^\d{4}-\d{2}-\d{2}$/);
});

test('a bucket carries run and walk distance separately', () => {
  const model = buildEnduranceModel(stateWith([
    run('2026-11-23', { dist: '8', time: '40:00' }),
    run('2026-11-23', { dist: '2', time: '20:00', type: 'walk' }),
  ]), { range, previous });
  const bucket = model.buckets.find((entry) => entry.runCount || entry.walkCount);
  assert.equal(bucket.runKm, 8);
  assert.equal(bucket.walkKm, 2, 'never summed into the run bar');
  assert.equal(bucket.runCount, 1);
  assert.equal(bucket.walkCount, 1);
});

test('the delta is run distance against the equal-length previous window', () => {
  const model = buildEnduranceModel(stateWith([
    run('2026-11-10', { dist: '12', time: '60:00' }),
    run('2026-10-10', { dist: '10', time: '55:00' }),
  ]), { range, previous });
  assert.equal(model.deltaKm, 2);
});

test('consistency marks run days and walk-only days differently', () => {
  const model = buildEnduranceModel(stateWith([
    run('2026-11-23', { dist: '5', time: '25:00' }),
    run('2026-11-24', { dist: '3', time: '30:00', type: 'walk' }),
  ]), { range, previous });
  const flat = model.consistency.flatMap((week) => week.days);
  assert.ok(flat.includes('run'));
  assert.ok(flat.includes('walk'));
  assert.equal(model.consistency.length, 12);
});

test('no runs at all is no data', () => {
  const model = buildEnduranceModel({ weeks: {} }, { range, previous });
  assert.equal(model.hasData, false);
  assert.equal(model.runKm, 0);
  assert.equal(model.avgPaceSecPerKm, null);
});

test('a missing range is refused', () => {
  assert.throws(() => buildEnduranceModel({ weeks: {} }, {}), /range is required/);
});
