// =============================================================================
// ENDURANCE BAND — render contract: runs and walks are visually and textually
// separate, pace is a stat not a second axis, and every number is in the table.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildEnduranceModel } from '../js/analytics/endurance.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';
import { renderEndurance } from '../js/analytics/views/view-endurance.js';

const range = resolveRange('30d', '2026-11-24');
const previous = previousRange(range);
const run = (date, { dist = '5', time = '25:00', type = 'run' } = {}) => ({
  dates: { mon: date }, runSessions: { mon: [{ dist, time, type }] },
});
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });
const model = () => buildEnduranceModel(stateWith([
  run('2026-11-10', { dist: '10', time: '50:00' }),
  run('2026-11-12', { dist: '3', time: '30:00', type: 'walk' }),
]), { range, previous });

test('run and walk are separate series and separate legend entries', () => {
  const html = renderEndurance(model());
  assert.match(html, /data-band="endurance"/);
  assert.match(html, /Run/);
  assert.match(html, /Walk/);
  assert.match(html, /pg-stack__col--walk/);
});

test('walk distance is stated as excluded from run totals', () => {
  const html = renderEndurance(model());
  assert.match(html, /Walks: 1 · 3\.00 km — not in run totals/);
});

test('pace is a stat with a unit, never a second axis', () => {
  const km = renderEndurance(model(), { distanceUnit: 'km' });
  assert.match(km, /Avg pace/);
  assert.match(km, /\/km/);
  const mi = renderEndurance(model(), { distanceUnit: 'mi' });
  assert.match(mi, /\/mi/, 'the athlete unit reaches the pace');
  assert.doesNotMatch(mi, /\/km/);
});

test('distance is converted, not relabelled', () => {
  const mi = renderEndurance(model(), { distanceUnit: 'mi' });
  assert.match(mi, /6\.21 mi/, '10 km shown as 6.21 mi');
});

test('PG9: the band leaves the per-bucket table to the running detail', () => {
  const html = renderEndurance(model());
  assert.doesNotMatch(html, /Show data/);
  assert.match(html, /data-context="running"/);
});

test('the band links to the full metric screen', () => {
  const html = renderEndurance(model());
  assert.match(html, /data-context="running"/);
  assert.match(html, /All running metrics/);
});

test('no runs offers one action rather than an empty chart', () => {
  const empty = buildEnduranceModel({ weeks: {} }, { range, previous });
  const html = renderEndurance(empty);
  assert.match(html, /pg-state--empty/);
  assert.doesNotMatch(html, /pg-stack/);
});

test('loading and error are explicit', () => {
  assert.match(renderEndurance(null), /aria-busy="true"/);
  assert.match(renderEndurance(null, { error: 'boom' }), /role="alert"/);
});
