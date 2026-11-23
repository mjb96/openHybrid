// =============================================================================
// ANALYTICS RANGES — the time-window contract every Progress band depends on.
//
// The two properties worth defending are (a) a comparison window is ALWAYS the
// same length as the window it compares, and (b) a label states real dates,
// never a relative phrase like "3 months ago" — that phrase was wrong whenever
// the range was anchored somewhere other than today.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RANGE_ID, RANGE_PRESETS, inRange, isRangeId, previousRange, resolveRange,
} from '../js/analytics/ranges.js';
import { daysBetween } from '../js/dates.js';

// 2026-11-23 is a Monday; 2026-11-29 is the Sunday that closes that week.
const MONDAY = '2026-11-23';
const SUNDAY = '2026-11-29';

test('every preset resolves to an inclusive window of the stated length', () => {
  const expectations = { '30d': 30, '3m': 90, '1y': 365 };
  for (const [id, days] of Object.entries(expectations)) {
    const range = resolveRange(id, MONDAY);
    assert.ok(range, `${id} should resolve`);
    assert.equal(range.days, days);
    // Inclusive on both ends: the span is days - 1.
    assert.equal(daysBetween(range.startISO, range.endISO), days - 1, `${id} length`);
    assert.equal(range.endISO, MONDAY, `${id} ends today`);
  }
});

test('the unbounded preset has no days and no invented start date', () => {
  const unbounded = resolveRange('all', MONDAY);
  assert.equal(unbounded.days, null);
  assert.equal(unbounded.startISO, null);
  assert.equal(unbounded.spanLabel, 'All time');

  const bounded = resolveRange('all', MONDAY, { earliestISO: '2024-02-01' });
  assert.equal(bounded.startISO, '2024-02-01');
  assert.match(bounded.spanLabel, /2024/);
  assert.match(bounded.spanLabel, /2026/);
});

test('an unknown or missing id falls back to the default rather than throwing', () => {
  for (const bad of ['nonsense', '', null, undefined, 42]) {
    const range = resolveRange(bad, MONDAY);
    assert.equal(range.id, DEFAULT_RANGE_ID);
  }
  assert.equal(isRangeId('3m'), true);
  assert.equal(isRangeId('nope'), false);
});

test('an omitted reference day means today; an invalid one is refused', () => {
  // Falsy = "caller did not supply one" → resolve against today, which keeps
  // the call sites short. A supplied-but-invalid key is a bug, so it is not
  // silently reinterpreted as today.
  const omitted = resolveRange('30d');
  assert.ok(omitted && /^\d{4}-\d{2}-\d{2}$/.test(omitted.endISO));
  assert.equal(resolveRange('30d', 'not-a-date'), null);
  assert.equal(resolveRange('30d', '2026-02-30'), null);
});

test('the comparison window is the same length and ends the day before the range', () => {
  for (const preset of RANGE_PRESETS.filter((entry) => entry.days)) {
    const range = resolveRange(preset.id, MONDAY);
    const previous = previousRange(range);
    assert.ok(previous, `${preset.id} should have a previous window`);
    assert.equal(previous.days, range.days, `${preset.id} same length`);
    assert.equal(daysBetween(previous.startISO, previous.endISO), range.days - 1);
    // No overlap and no gap: yesterday is the boundary.
    assert.equal(daysBetween(previous.endISO, range.startISO), 1, `${preset.id} boundary`);
  }
});

test('an unbounded range has no previous window to compare against', () => {
  assert.equal(previousRange(resolveRange('all', MONDAY)), null);
  assert.equal(previousRange(null), null);
});

test('a window ending mid-week is marked partial; one ending on Sunday is not', () => {
  assert.equal(resolveRange('30d', MONDAY).isPartial, true, 'Monday closes nothing');
  assert.equal(resolveRange('30d', SUNDAY).isPartial, false, 'Sunday completes the week');
  assert.equal(resolveRange('30d', '2026-11-25').isPartial, true, 'Wednesday');
});

test('labels state real dates and never a relative phrase', () => {
  const range = resolveRange('30d', MONDAY);
  assert.match(range.spanLabel, /\d/);
  assert.doesNotMatch(range.spanLabel, /ago|last|previous|this/i);
  // A window crossing a year boundary must name both years.
  const crossing = resolveRange('30d', '2027-01-10');
  assert.match(crossing.spanLabel, /2026/);
  assert.match(crossing.spanLabel, /2027/);
});

test('inRange is inclusive and respects an unbounded start', () => {
  const range = resolveRange('30d', MONDAY);
  assert.equal(inRange(range.startISO, range), true, 'start is included');
  assert.equal(inRange(range.endISO, range), true, 'end is included');
  assert.equal(inRange('2026-01-01', range), false, 'before start');
  assert.equal(inRange('2026-12-01', range), false, 'after end');

  const unbounded = resolveRange('all', MONDAY);
  assert.equal(inRange('2001-01-01', unbounded), true);
  assert.equal(inRange('2026-12-01', unbounded), false);
  assert.equal(inRange('bad', unbounded), false);
});
