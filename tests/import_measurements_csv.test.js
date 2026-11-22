// =============================================================================
// MEASUREMENTS CSV IMPORT TESTS
// Round-trips our own export, converts inch columns, merges same-date rows and
// never overwrites an existing date.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  looksLikeMeasurementsCsv, parseMeasurementsCsv, applyMeasurementsCsvImport, hasBodyFatColumn,
} from '../js/portability/import-measurements-csv.js';
import { buildMeasurementsCsv } from '../js/portability/csv-export.js';

test('detects a measurements CSV and leaves other exports alone', () => {
  assert.equal(looksLikeMeasurementsCsv('date,waist_cm,chest_cm\n2026-11-01,86,104'), true);
  assert.equal(looksLikeMeasurementsCsv('date,waist,neck\n2026-11-01,86,38'), true);
  assert.equal(looksLikeMeasurementsCsv('date,body_fat\n2026-11-01,18.4'), true);
  assert.equal(looksLikeMeasurementsCsv('date,bodyfat\n2026-11-01,18.4'), true);
  assert.equal(looksLikeMeasurementsCsv('Date,Weight\n2026-11-01,85'), false);
  assert.equal(looksLikeMeasurementsCsv('date,weight_kg,waist_cm\n2026-11-01,85,86'), false);
  // Combined weigh-in + body fat is the bodyweight reader's file; body fat is
  // not imported from it (documented limitation, see the module header).
  assert.equal(looksLikeMeasurementsCsv('date,weight_kg,body_fat\n2026-11-01,85,18.4'), false);
  assert.equal(looksLikeMeasurementsCsv('date,exercise,set,weight\n2026-11-01,Squat,1,100'), false);
  assert.equal(looksLikeMeasurementsCsv('date,notes\n2026-11-01,hello'), false);
});

test('round-trips the CSV that Settings → Data writes', () => {
  const state = { bodyMeasurements: [
    { date: '2026-11-01', waist: 86.5, chest: 104, bodyFat: 18.4 },
    { date: '2026-11-15', waist: 85.9, bodyFat: 17.8 },
    { date: '2026-11-20' },
  ] };
  const parsed = parseMeasurementsCsv(buildMeasurementsCsv(state));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-01', waist: 86.5, chest: 104, bodyFat: 18.4 },
    { date: '2026-11-15', waist: 85.9, bodyFat: 17.8 },
  ]);
  assert.equal(parsed.skipped, 0);
});

test('inch columns and bare headers convert to canonical centimetres', () => {
  const inches = parseMeasurementsCsv('date,waist_in,arm_in,arm_l_in,calf_r_in\n2026-11-01,34,14,13,15');
  assert.equal(inches.entries[0].waist, 86.4);   // 34 × 2.54
  assert.equal(inches.entries[0].arm, 35.6);
  assert.equal(inches.entries[0].arm_l, 33);
  assert.equal(inches.entries[0].calf_r, 38.1);

  const bare = parseMeasurementsCsv('date,waist\n2026-11-01,34', { unit: 'lbs' });
  assert.equal(bare.entries[0].waist, 86.4);

  const bareCm = parseMeasurementsCsv('date,waist\n2026-11-01,84', { unit: 'kg' });
  assert.equal(bareCm.entries[0].waist, 84);
});

test('the 14-site export round-trips with legacy readings and body fat', () => {
  const state = { bodyMeasurements: [
    {
      date: '2026-11-01', neck: 38, shoulders: 120, chest: 104, waist: 86.5, hips: 98, glutes: 100,
      arm_l: 34, arm_r: 35, forearm_l: 27, forearm_r: 27.5, thigh_l: 55, thigh_r: 56, calf_l: 37, calf_r: 38,
      arm: 36, thigh: 58, bodyFat: 18.4,
    },
    { date: '2026-11-15', waist: 85.9, bodyFat: 17.8 },
  ] };
  const parsed = parseMeasurementsCsv(buildMeasurementsCsv(state));
  assert.deepEqual(parsed.entries, state.bodyMeasurements);
  assert.equal(parsed.skipped, 0);
});

test('rows for the same date merge site by site', () => {
  const parsed = parseMeasurementsCsv([
    'date,waist_cm,body_fat',
    '2026-11-01,86,',
    '2026-11-01,,18.4',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [{ date: '2026-11-01', waist: 86, bodyFat: 18.4 }]);
});

test('body-fat columns are accepted under every documented header and stay a percentage', () => {
  for (const header of ['body_fat', 'bodyfat', 'body_fat_pct', 'body_fat_percent']) {
    const parsed = parseMeasurementsCsv(`date,${header}\n2026-11-01,18.4`);
    assert.deepEqual(parsed.entries, [{ date: '2026-11-01', bodyFat: 18.4 }], header);
  }
  // Never cm/in: a 34 in the body-fat column is not converted to 86.4.
  const parsed = parseMeasurementsCsv('date,body_fat\n2026-11-01,34', { unit: 'lbs' });
  assert.equal(parsed.entries[0].bodyFat, 34);
});

test('semicolon files with a decimal comma parse body fat', () => {
  const parsed = parseMeasurementsCsv([
    'date;waist_cm;body_fat',
    '2026-11-01;84;18,4',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [{ date: '2026-11-01', waist: 84, bodyFat: 18.4 }]);
});

test('hasBodyFatColumn lets the weigh-in reader disclose a combined file', () => {
  assert.equal(hasBodyFatColumn('date,weight_kg,body_fat\n2026-11-01,85,18.4'), true);
  assert.equal(hasBodyFatColumn('date,weight_kg,bodyfat\n2026-11-01,85,18.4'), true);
  assert.equal(hasBodyFatColumn('Date,Body fat (%)\n2026-11-01,18.4'), true);
  assert.equal(hasBodyFatColumn('date,weight_kg\n2026-11-01,85'), false);
  assert.equal(hasBodyFatColumn('date,waist_cm\n2026-11-01,84'), false);
});

test('a body-fat-only file imports and merges same-date rows', () => {
  const parsed = parseMeasurementsCsv([
    'Date,Body fat (%)',
    '2026-11-01,18.5',
    '2026-11-01,18.4',
    '2026-11-02,',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [{ date: '2026-11-01', bodyFat: 18.4 }]);   // last row wins
  assert.equal(parsed.skipped, 1);   // the second date had no reading
});

test('body-fat readings outside 2–70 are skipped rather than imported', () => {
  const parsed = parseMeasurementsCsv([
    'date,body_fat_pct',
    '2026-11-01,1.9',
    '2026-11-02,70.1',
    '2026-11-03,18.44',
    '2026-11-04,70',
    '2026-11-05,junk',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-03', bodyFat: 18.4 },
    { date: '2026-11-04', bodyFat: 70 },
  ]);
  assert.equal(parsed.skipped, 3);
});

test('old six-site files still import without a body-fat column', () => {
  const parsed = parseMeasurementsCsv([
    'date,waist_cm,chest_cm,hips_cm,arm_cm,thigh_cm,neck_cm',
    '2026-11-01,84,102,98,36,58,38',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-01', neck: 38, chest: 102, waist: 84, hips: 98, arm: 36, thigh: 58 },
  ]);
  assert.equal('bodyFat' in parsed.entries[0], false);
});

test('all fourteen canonical keys and both legacy keys import', () => {
  const parsed = parseMeasurementsCsv([
    'Date,Neck (cm),Shoulders (cm),Chest (cm),Waist (cm),Hips (cm),Glutes (cm),Arm L (cm),Arm R (cm),Forearm L (cm),Forearm R (cm),Thigh L (cm),Thigh R (cm),Calf L (cm),Calf R (cm),Arm (cm),Thigh (cm),Body fat (%)',
    '2026-11-01,38,120,104,86.5,98,100,34,35,27,27.5,55,56,37,38,36,58,18.4',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [{
    date: '2026-11-01', neck: 38, shoulders: 120, chest: 104, waist: 86.5, hips: 98, glutes: 100,
    arm_l: 34, arm_r: 35, forearm_l: 27, forearm_r: 27.5, thigh_l: 55, thigh_r: 56, calf_l: 37, calf_r: 38,
    arm: 36, thigh: 58, bodyFat: 18.4,
  }]);
});

test('implausible readings are skipped rather than imported', () => {
  const parsed = parseMeasurementsCsv([
    'date,waist_cm,chest_cm,arm_cm',
    '2026-11-01,0,104,999',
    '2026-11-02,84,,',
    'not-a-date,80,,',
  ].join('\n'));
  assert.deepEqual(parsed.entries, [
    { date: '2026-11-01', chest: 104 },
    { date: '2026-11-02', waist: 84 },
  ]);
  assert.equal(parsed.skipped, 1);   // the row with no usable date
});

test('a file with no valid measurements is rejected', () => {
  assert.throws(() => parseMeasurementsCsv('date,waist_cm\n2026-11-01,999'), /no valid measurements/);
  assert.throws(() => parseMeasurementsCsv('date,notes\n2026-11-01,hello'), /no measurement columns/);
});

test('applying an import adds only missing dates and keeps the log sorted', () => {
  const state = { bodyMeasurements: [{ date: '2026-11-01', waist: 86.5, bodyFat: 19 }] };
  const parsed = parseMeasurementsCsv('date,waist_cm,body_fat\n2026-11-03,85,18.2\n2026-11-01,80,25');
  const result = applyMeasurementsCsvImport(state, parsed);
  assert.deepEqual(result, { added: 1, skipped: 1 });
  assert.deepEqual(state.bodyMeasurements, [
    { date: '2026-11-01', waist: 86.5, bodyFat: 19 },   // existing values untouched
    { date: '2026-11-03', waist: 85, bodyFat: 18.2 },
  ]);
});

test('applying to a state without a log creates it', () => {
  const state = {};
  const result = applyMeasurementsCsvImport(state, parseMeasurementsCsv('date,waist_cm\n2026-11-01,85'));
  assert.deepEqual(result, { added: 1, skipped: 0 });
  assert.deepEqual(state.bodyMeasurements, [{ date: '2026-11-01', waist: 85 }]);
});
