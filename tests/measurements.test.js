// =============================================================================
// BODY MEASUREMENTS TESTS
// Canonical centimetres, optional sites, one record per date. A unit change must
// never rewrite stored data — only how it is read.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEASUREMENT_SITES, LEGACY_MEASUREMENT_SITES, measurementUnit, cmToDisplay, displayToCm,
  measurementCm, normalizeMeasurements, measurementSiteTrends, buildMeasurementRecord,
  preserveLegacySites, buildMeasurementModel, MIN_MEASUREMENT_CM, MAX_MEASUREMENT_CM,
  BODY_FAT_MIN, BODY_FAT_MAX, bodyFatPercent, bodyFatTrend,
} from '../js/metrics/measurements.js';
import { buildMeasurementsCsv } from '../js/portability/csv-export.js';

test('the tracked sites are a stable, labelled set of fourteen', () => {
  assert.deepEqual(MEASUREMENT_SITES.map((site) => site.key), [
    'neck', 'shoulders', 'chest', 'waist', 'hips', 'glutes',
    'arm_l', 'arm_r', 'forearm_l', 'forearm_r',
    'thigh_l', 'thigh_r', 'calf_l', 'calf_r',
  ]);
  assert.deepEqual(MEASUREMENT_SITES.map((site) => site.label), [
    'Neck', 'Shoulders', 'Chest', 'Waist', 'Hips', 'Glutes',
    'Arm L', 'Arm R', 'Forearm L', 'Forearm R',
    'Thigh L', 'Thigh R', 'Calf L', 'Calf R',
  ]);
  assert.ok(MEASUREMENT_SITES.every((site) => site.label.length > 0));
  assert.deepEqual(LEGACY_MEASUREMENT_SITES.map((site) => [site.key, site.label, site.csvLabel]), [
    ['arm', 'Arm (old)', 'Arm'],
    ['thigh', 'Thigh (old)', 'Thigh'],
  ]);
});

test('the display unit follows the weight unit until it is chosen explicitly', () => {
  assert.equal(measurementUnit({ settings: { weightUnit: 'kg' } }), 'cm');
  assert.equal(measurementUnit({ settings: { weightUnit: 'lbs' } }), 'in');
  assert.equal(measurementUnit({ settings: { weightUnit: 'lbs', measurementUnit: 'cm' } }), 'cm');
  assert.equal(measurementUnit({ settings: {} }), 'cm');
  assert.equal(measurementUnit(null), 'cm');
});

test('centimetres and inches convert without losing the stored value', () => {
  assert.equal(cmToDisplay(86.4, 'cm'), 86.4);
  assert.equal(cmToDisplay(86.4, 'in'), 86.4 / 2.54);
  assert.equal(Math.round(displayToCm(34, 'in') * 100) / 100, 86.36);
  assert.equal(displayToCm(86.4, 'cm'), 86.4);
});

test('a blank or implausible reading is not a measurement', () => {
  assert.equal(measurementCm('', 'cm'), null);
  assert.equal(measurementCm('   ', 'cm'), null);
  assert.equal(measurementCm('abc', 'cm'), null);
  assert.equal(measurementCm(MIN_MEASUREMENT_CM - 0.1, 'cm'), null);
  assert.equal(measurementCm(MAX_MEASUREMENT_CM + 0.1, 'cm'), null);
  assert.equal(measurementCm(84.04, 'cm'), 84);
  assert.equal(measurementCm(84.06, 'cm'), 84.1);
});

test('normalize keeps valid, optional sites and one reading per date', () => {
  const rows = normalizeMeasurements([
    { date: '2026-11-10', waist: 84, chest: 102, neck: 0 },
    { date: '2026-11-10', waist: 83.5 },                 // same date wins
    { date: 'not-a-date', waist: 80 },
    { date: '2026-11-03', waist: 85.2, unmeasured: 1 },
    { date: '2026-11-17', arm: '' },                     // nothing measured
  ]);
  assert.deepEqual(rows, [
    { date: '2026-11-03', waist: 85.2 },
    { date: '2026-11-10', waist: 83.5 },
  ]);
});

test('site trends report the change since that site was last measured', () => {
  const trends = measurementSiteTrends([
    { date: '2026-10-01', waist: 90, chest: 100 },
    { date: '2026-10-15', waist: 88 },
    { date: '2026-11-01', waist: 86.5, chest: 102 },
  ]);
  const waist = trends.find((site) => site.key === 'waist');
  const chest = trends.find((site) => site.key === 'chest');
  const neck = trends.find((site) => site.key === 'neck');
  assert.equal(waist.latest.cm, 86.5);
  assert.equal(waist.latest.date, '2026-11-01');
  assert.equal(Math.round(waist.delta * 10) / 10, -1.5);   // vs 88, not vs 90
  assert.equal(Math.round(waist.total * 10) / 10, -3.5);   // vs the first reading
  assert.equal(chest.delta, 2);
  assert.equal(chest.points.length, 2);
  assert.equal(neck.latest, null);
  assert.equal(neck.delta, null);
});

test('left and right sites are independent readings', () => {
  const model = buildMeasurementModel({ bodyMeasurements: [
    { date: '2026-11-19', arm_l: 34, arm_r: 35 },
  ] });
  const left = model.sites.find((site) => site.key === 'arm_l');
  const right = model.sites.find((site) => site.key === 'arm_r');
  assert.equal(left.latest.cm, 34);
  assert.equal(right.latest.cm, 35);
  assert.equal(left.delta, null);
  assert.equal(right.delta, null);
  assert.deepEqual(model.tracked.map((site) => site.key), ['arm_l', 'arm_r']);
});

test('a legacy-only single Arm/Thigh record stays real but is opt-in for trends', () => {
  const log = [{ date: '2026-11-05', arm: 36, thigh: 58 }];
  assert.deepEqual(normalizeMeasurements(log), [{ date: '2026-11-05', arm: 36, thigh: 58 }]);

  const canonical = measurementSiteTrends(log);
  assert.equal(canonical.some((site) => site.key === 'arm'), false);
  assert.equal(canonical.some((site) => site.key === 'thigh'), false);

  const withLegacy = measurementSiteTrends(log, { includeLegacy: true });
  const arm = withLegacy.find((site) => site.key === 'arm');
  const thigh = withLegacy.find((site) => site.key === 'thigh');
  assert.equal(arm.legacy, true);
  assert.equal(arm.latest.cm, 36);
  assert.equal(thigh.legacy, true);
  assert.equal(thigh.latest.cm, 58);
  assert.equal(withLegacy.find((site) => site.key === 'arm_l').latest, null);
});

test('preserveLegacySites carries old readings across an edit without overwriting', () => {
  const record = { date: '2026-11-05', waist: 84 };
  const result = preserveLegacySites(record, { date: '2026-11-05', arm: 36, thigh: 58, waist: 80 });
  assert.equal(result, record);
  assert.deepEqual(result, { date: '2026-11-05', waist: 84, arm: 36, thigh: 58 });

  const own = preserveLegacySites({ date: '2026-11-05', arm: 37 }, { arm: 36, thigh: 999 });
  assert.equal(own.arm, 37);
  assert.equal(own.thigh, undefined);
  assert.deepEqual(preserveLegacySites({ date: '2026-11-06' }, null), { date: '2026-11-06' });
});

test('a record converts inches to canonical centimetres and flags bad fields', () => {
  const { record, invalid } = buildMeasurementRecord('2026-11-21', {
    waist: '34', chest: '', arm_l: '999',
  }, 'in');
  assert.equal(record.date, '2026-11-21');
  assert.equal(record.waist, 86.4);
  assert.equal(record.chest, undefined);
  assert.equal(record.arm_l, undefined);
  assert.deepEqual(invalid, ['Arm L']);
  // The sheet has no single Arm input, so a stray key is never fabricated.
  const legacy = buildMeasurementRecord('2026-11-21', { arm: '14' }, 'in');
  assert.deepEqual(legacy.record, { date: '2026-11-21' });
  assert.deepEqual(legacy.invalid, []);
});

test('body fat is an entered percentage, rounded to one decimal and bounded', () => {
  assert.equal(BODY_FAT_MIN, 2);
  assert.equal(BODY_FAT_MAX, 70);
  assert.equal(bodyFatPercent(''), null);
  assert.equal(bodyFatPercent('   '), null);
  assert.equal(bodyFatPercent('junk'), null);
  assert.equal(bodyFatPercent(BODY_FAT_MIN - 0.1), null);
  assert.equal(bodyFatPercent(BODY_FAT_MAX + 0.1), null);
  assert.equal(bodyFatPercent(18.44), 18.4);
  assert.equal(bodyFatPercent(18.46), 18.5);

  const rows = normalizeMeasurements([
    { date: '2026-11-10', waist: 84, bodyFat: 18.44 },
    { date: '2026-11-17', bodyFat: 17.2 },          // body-fat-only is a real record
    { date: '2026-11-18', bodyFat: 90 },            // implausible, nothing else left
    { date: '2026-11-19', waist: 83, bodyFat: '' },
  ]);
  assert.deepEqual(rows, [
    { date: '2026-11-10', waist: 84, bodyFat: 18.4 },
    { date: '2026-11-17', bodyFat: 17.2 },
    { date: '2026-11-19', waist: 83 },
  ]);
});

test('a legacy string body-fat value normalizes to a number', () => {
  assert.deepEqual(normalizeMeasurements([{ date: '2026-11-20', bodyFat: '18.4' }]), [
    { date: '2026-11-20', bodyFat: 18.4 },
  ]);
  assert.deepEqual(normalizeMeasurements([{ date: '2026-11-20', bodyFat: ' 19.0 ' }]), [
    { date: '2026-11-20', bodyFat: 19 },
  ]);
});

test('the body-fat trend reports percentage-point changes', () => {
  const trend = bodyFatTrend([
    { date: '2026-10-01', bodyFat: 21 },
    { date: '2026-11-01', bodyFat: 19.6 },
    { date: '2026-11-15', bodyFat: 18.4 },
  ]);
  assert.deepEqual(trend.points, [
    { date: '2026-10-01', value: 21 },
    { date: '2026-11-01', value: 19.6 },
    { date: '2026-11-15', value: 18.4 },
  ]);
  assert.equal(trend.latest.date, '2026-11-15');
  assert.equal(trend.previous.value, 19.6);
  assert.equal(trend.delta, -1.2);   // vs the previous reading
  assert.equal(trend.total, -2.6);   // vs the first reading

  const single = bodyFatTrend([{ date: '2026-11-01', bodyFat: 18.4 }]);
  assert.equal(single.delta, null);
  assert.equal(single.total, null);
  assert.deepEqual(bodyFatTrend([]), { points: [], latest: null, previous: null, delta: null, total: null });
});

test('a body-fat reading is validated separately from the tape sites', () => {
  const { record, invalid } = buildMeasurementRecord('2026-11-21', { bodyFat: '18.46' }, 'in');
  assert.deepEqual(record, { date: '2026-11-21', bodyFat: 18.5 });
  assert.deepEqual(invalid, []);

  const bad = buildMeasurementRecord('2026-11-21', { waist: '84', bodyFat: '80' }, 'cm');
  assert.deepEqual(bad.record, { date: '2026-11-21', waist: 84 });
  assert.deepEqual(bad.invalid, ['Body fat']);
});

test('the model reports the latest date, recency order and only measured sites', () => {
  const model = buildMeasurementModel({
    settings: { weightUnit: 'kg' },
    bodyMeasurements: [
      { date: '2026-11-01', waist: 86.5 },
      { date: '2026-11-15', waist: 85.9, hips: 98 },
      { date: '2026-11-20', chest: 104 },
    ],
  }, { recentCount: 2 });
  assert.equal(model.unit, 'cm');
  assert.equal(model.count, 3);
  assert.equal(model.latestDate, '2026-11-20');
  assert.deepEqual(model.recent.map((entry) => entry.date), ['2026-11-20', '2026-11-15']);
  assert.deepEqual(model.tracked.map((site) => site.key), ['chest', 'waist', 'hips']);
  assert.equal(model.sites.find((site) => site.key === 'thigh_l').latest, null);
});

test('the card model includes a preserved legacy Arm and Thigh', () => {
  const model = buildMeasurementModel({ bodyMeasurements: [
    { date: '2026-11-05', arm: 36, thigh: 58 },
    { date: '2026-11-19', waist: 84.5 },
  ] });
  assert.deepEqual(model.tracked.map((site) => site.key), ['waist', 'arm', 'thigh']);
  const arm = model.tracked.find((site) => site.key === 'arm');
  assert.equal(arm.label, 'Arm (old)');
  assert.equal(arm.legacy, true);
  assert.equal(arm.latest.cm, 36);
});

test('a body-fat-only log builds a model and renders no tape sites', () => {
  const model = buildMeasurementModel({ bodyMeasurements: [
    { date: '2026-11-10', bodyFat: 18.4 },
    { date: '2026-11-17', bodyFat: 18 },
  ] });
  assert.equal(model.count, 2);
  assert.deepEqual(model.tracked, []);
  assert.equal(model.bodyFat.latest.value, 18);
  assert.equal(model.bodyFat.delta, -0.4);
  assert.deepEqual(model.recent.map((entry) => entry.date), ['2026-11-17', '2026-11-10']);
});

test('the model exposes the body-fat trend beside the tape sites', () => {
  const model = buildMeasurementModel({ bodyMeasurements: [
    { date: '2026-11-10', waist: 84, bodyFat: 19.1 },
    { date: '2026-11-17', waist: 83.6, bodyFat: 18.4 },
  ] });
  assert.equal(model.bodyFat.latest.value, 18.4);
  assert.equal(model.bodyFat.total, -0.7);
  assert.deepEqual(model.tracked.map((site) => site.key), ['waist']);
});

test('an empty log yields an empty model rather than placeholders', () => {
  const model = buildMeasurementModel({});
  assert.equal(model.unit, 'cm');
  assert.equal(model.count, 0);
  assert.equal(model.latestDate, null);
  assert.deepEqual(model.tracked, []);
  assert.deepEqual(model.recent, []);
  assert.deepEqual(model.bodyFat.points, []);
  assert.equal(model.bodyFat.latest, null);
});

test('the measurements CSV keeps canonical centimetres, legacy sites, body fat and blanks', () => {
  const csv = buildMeasurementsCsv({ bodyMeasurements: [
    { date: '2026-11-01', neck: 38, waist: 86.5, chest: 104, arm_l: 34, arm_r: 35, bodyFat: 18.4 },
    { date: '2026-11-05', arm: 36, thigh: 58 },
    { date: '2026-11-15', waist: 85.9 },
  ] });
  const lines = csv.trim().split(/\r\n/);
  assert.equal(lines[0], [
    '"Date"', '"Neck (cm)"', '"Shoulders (cm)"', '"Chest (cm)"', '"Waist (cm)"',
    '"Hips (cm)"', '"Glutes (cm)"', '"Arm L (cm)"', '"Arm R (cm)"',
    '"Forearm L (cm)"', '"Forearm R (cm)"', '"Thigh L (cm)"', '"Thigh R (cm)"',
    '"Calf L (cm)"', '"Calf R (cm)"', '"Arm (cm)"', '"Thigh (cm)"', '"Body fat (%)"',
  ].join(','));
  assert.equal(lines[1], '"2026-11-01","38","","104","86.5","","","34","35","","","","","","","","","18.4"');
  assert.equal(lines[2], '"2026-11-05","","","","","","","","","","","","","","","36","58",""');
  assert.equal(lines[3], '"2026-11-15","","","","85.9","","","","","","","","","","","","",""');
});

test('the measurements CSV exports a body-fat-only record as a real row', () => {
  const csv = buildMeasurementsCsv({ bodyMeasurements: [{ date: '2026-11-20', bodyFat: 18.4 }] });
  const lines = csv.trim().split(/\r\n/);
  assert.equal(lines[1], '"2026-11-20","","","","","","","","","","","","","","","","","18.4"');
});
