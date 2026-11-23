// =============================================================================
// MEASUREMENT EXPLORER
//
// One site over a selected range, built from the same measurement model the
// Body band and Bodyweight card use. The chart is filtered; the headline stays
// the latest reading and says how old it is. Storage stays centimetres; the
// explorer hands the view display values.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMeasurementExplorer, BODY_FAT_KEY } from '../js/analytics/measurement-explorer.js';

const TODAY = '2026-11-24';

function state(overrides = {}) {
  return {
    settings: { weightUnit: 'kg', measurementUnit: 'cm' },
    bodyMeasurements: [
      { date: '2026-09-01', waist: 86, chest: 106 },
      { date: '2026-10-01', waist: 84, chest: 105, bodyFat: 20.1 },
      { date: '2026-11-20', waist: 82, chest: 104, bodyFat: 18.4 },
    ],
    ...overrides,
  };
}

test('measured sites are the options, and Waist is the default', () => {
  const explorer = buildMeasurementExplorer(state(), { todayISO: TODAY });
  assert.equal(explorer.hasData, true);
  assert.deepEqual(explorer.sites.map((site) => site.key), ['chest', 'waist', BODY_FAT_KEY]);
  assert.equal(explorer.site.key, 'waist');
  assert.deepEqual(explorer.latest, { date: '2026-11-20', value: 82 });
  assert.deepEqual(explorer.previous, { date: '2026-10-01', value: 84 });
  assert.equal(explorer.delta, -2);
  assert.equal(explorer.deltaDate, '2026-10-01');
  assert.equal(explorer.unit, 'cm');
  assert.equal(explorer.percent, false);
  // The default range is the athlete's whole history, not a 30D window that
  // can be empty for a sparse tape.
  assert.equal(explorer.range.id, 'all');
  assert.deepEqual(explorer.points.map((point) => point.date), [
    '2026-09-01', '2026-10-01', '2026-11-20',
  ]);
});

test('the chart follows the range while the headline stays the latest reading', () => {
  const explorer = buildMeasurementExplorer(state(), { todayISO: TODAY, rangeId: '30d' });
  assert.equal(explorer.range.id, '30d');
  assert.deepEqual(explorer.points.map((point) => point.date), ['2026-11-20']);
  assert.equal(explorer.latest.value, 82, 'the latest reading is still reported');
  assert.equal(explorer.delta, -2, 'and its previous reading is still the baseline');
  assert.equal(explorer.emptyRange, false);
});

test('a site whose latest reading predates the range is honest about it', () => {
  const app = state({ bodyMeasurements: [{ date: '2026-08-01', waist: 88 }] });
  const explorer = buildMeasurementExplorer(app, { todayISO: TODAY, rangeId: '30d' });
  assert.equal(explorer.site.key, 'waist');
  assert.deepEqual(explorer.points, []);
  assert.equal(explorer.emptyRange, true);
  assert.equal(explorer.latestOutsideRange, true);
  assert.equal(explorer.latest.value, 88);
});

test('inches are the display unit, and the delta is computed after conversion', () => {
  const explorer = buildMeasurementExplorer(state({
    settings: { weightUnit: 'lbs', measurementUnit: 'in' },
    bodyMeasurements: [
      { date: '2026-10-01', waist: 78 },
      { date: '2026-11-20', waist: 76 },
    ],
  }), { todayISO: TODAY });
  assert.equal(explorer.unit, 'in');
  assert.deepEqual(explorer.latest, { date: '2026-11-20', value: 29.9 });
  assert.deepEqual(explorer.previous, { date: '2026-10-01', value: 30.7 });
  assert.equal(explorer.delta, -0.8);
  assert.deepEqual(explorer.points.map((point) => point.value), [30.7, 29.9]);
});

test('body fat keeps its percentage scale and percentage-point delta', () => {
  const explorer = buildMeasurementExplorer(state(), {
    todayISO: TODAY,
    siteKey: BODY_FAT_KEY,
  });
  assert.equal(explorer.site.key, BODY_FAT_KEY);
  assert.equal(explorer.site.label, 'Body fat');
  assert.equal(explorer.unit, '%');
  assert.equal(explorer.percent, true);
  assert.deepEqual(explorer.latest, { date: '2026-11-20', value: 18.4 });
  assert.equal(explorer.delta, -1.7);
  assert.deepEqual(explorer.points.map((point) => point.value), [20.1, 18.4]);
});

test('an unmeasured site falls back instead of drawing a dead chart', () => {
  const explorer = buildMeasurementExplorer(state(), { todayISO: TODAY, siteKey: 'calf_l' });
  assert.equal(explorer.site.key, 'waist');
  assert.equal(explorer.sites.some((site) => site.key === 'calf_l'), false);
});

test('a legacy Arm reading is available when it is the only tape history', () => {
  const explorer = buildMeasurementExplorer({
    settings: { weightUnit: 'kg', measurementUnit: 'cm' },
    bodyMeasurements: [{ date: '2026-11-01', arm: 36 }, { date: '2026-11-20', arm: 35 }],
  }, { todayISO: TODAY });
  assert.equal(explorer.site.key, 'arm');
  assert.equal(explorer.site.label, 'Arm (old)');
  assert.equal(explorer.delta, -1);
});

test('an empty profile has no sites and no invented range', () => {
  const explorer = buildMeasurementExplorer({ settings: {} }, { todayISO: TODAY });
  assert.equal(explorer.hasData, false);
  assert.equal(explorer.site, null);
  assert.deepEqual(explorer.sites, []);
  assert.deepEqual(explorer.points, []);
});
