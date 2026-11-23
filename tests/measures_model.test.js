// =============================================================================
// MEASURES MODEL
//
// One dated entry composed from three stores that already own their piece:
// weigh-ins, measurements (tape + entered body fat) and progress-photo metadata.
// Every field is optional; a photo-only row and a weigh-in-only row are both
// real. Saving is coherent: a blank field removes that part, a typo changes
// nothing, and deleting the entry deletes the photo blob through the injected
// library deleter.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMeasuresModel, measureEntryFor, measureSitesFor, saveMeasureEntry,
  deleteMeasureEntry, MAX_MEASURE_WEIGHT,
} from '../js/metrics/measures.js';

function state(overrides = {}) {
  return {
    settings: { weightUnit: 'kg', measurementUnit: 'cm' },
    bodyWeightLog: [],
    bodyMeasurements: [],
    progressPhotos: [],
    ...overrides,
  };
}

function photo(date) {
  return {
    id: `photo:${date}`, date, note: '', width: 1200, height: 900,
    bytes: 120000, updatedAt: 1700000000000,
  };
}

test('one entry per date, newest first, from the union of all three stores', () => {
  const model = buildMeasuresModel(state({
    bodyWeightLog: [
      { date: '2026-11-01', weight: 80.2 },
      { date: '2026-11-15', weight: 79.4 },
    ],
    bodyMeasurements: [
      { date: '2026-11-01', waist: 84, bodyFat: 19.2 },
      { date: '2026-11-10', chest: 104, arm: 36 },
    ],
    progressPhotos: [photo('2026-11-18')],
  }));

  assert.deepEqual(model.entries.map((entry) => entry.date), [
    '2026-11-18', '2026-11-15', '2026-11-10', '2026-11-01',
  ]);
  assert.equal(model.count, 4);
  assert.equal(model.photoCount, 1);
  assert.equal(model.weightUnit, 'kg');
  assert.equal(model.measurementUnit, 'cm');

  const full = model.entries.find((entry) => entry.date === '2026-11-01');
  assert.equal(full.weight, 80.2);
  assert.equal(full.bodyFat, 19.2);
  assert.deepEqual(full.sites.map((site) => [site.key, site.cm]), [['waist', 84]]);
  assert.equal(full.photo, null);
  // The union must PRESERVE each store's contribution rather than collapse it:
  // a record that carried every field would pass even if two of the three
  // reads were dropped.
  assert.equal(full.sites.length, 1);
  assert.equal(full.sites[0].key, 'waist');
});

test('a photo-only entry and a weigh-in-only entry are both real', () => {
  const model = buildMeasuresModel(state({
    bodyWeightLog: [{ date: '2026-11-15', weight: 79.4 }],
    progressPhotos: [photo('2026-11-18')],
  }));
  const photoOnly = model.entries.find((entry) => entry.date === '2026-11-18');
  assert.equal(photoOnly.weight, null);
  assert.equal(photoOnly.bodyFat, null);
  assert.deepEqual(photoOnly.sites, []);
  assert.equal(photoOnly.photo.id, 'photo:2026-11-18');
  assert.equal(model.count, 2, 'a date with only a photo still counts as an entry');

  const weightOnly = model.entries.find((entry) => entry.date === '2026-11-15');
  assert.equal(weightOnly.weight, 79.4);
  assert.equal(weightOnly.photo, null);
  assert.deepEqual(weightOnly.sites, [], 'a weigh-in alone must not invent a tape record');
});

test('the model labels units from state and never converts stored values', () => {
  const model = buildMeasuresModel(state({
    settings: { weightUnit: 'lbs', measurementUnit: 'in' },
    bodyWeightLog: [{ date: '2026-11-15', weight: 175.2 }],
    bodyMeasurements: [{ date: '2026-11-15', waist: 86.4 }],
  }));
  assert.equal(model.weightUnit, 'lb');
  assert.equal(model.measurementUnit, 'in');
  const entry = model.entries[0];
  // Storage stays canonical: pounds are the athlete's weigh-in unit and the
  // tape stays centimetres until a view converts it.
  assert.equal(entry.weight, 175.2);
  assert.equal(entry.sites[0].cm, 86.4);
});

test('legacy single Arm/Thigh readings are readable on an entry', () => {
  const sites = measureSitesFor({ date: '2026-11-05', arm: 36, thigh: 58, waist: 84 });
  assert.deepEqual(sites.map((site) => [site.key, site.label, site.cm]), [
    ['waist', 'Waist', 84],
    ['arm', 'Arm (old)', 36],
    ['thigh', 'Thigh (old)', 58],
  ]);
});

test('save upserts a weigh-in and tape independently and removes a blank part', () => {
  const app = state();
  const first = saveMeasureEntry(app, '2026-11-20', {
    weight: '80.4',
    bodyFat: '18.4',
    sites: { waist: '84.2', chest: '104' },
  });
  assert.deepEqual(first, { ok: true, invalid: [], hasValues: true });
  assert.deepEqual(app.bodyWeightLog, [{ date: '2026-11-20', weight: 80.4 }]);
  assert.deepEqual(app.bodyMeasurements, [{ date: '2026-11-20', waist: 84.2, chest: 104, bodyFat: 18.4 }]);

  // Remove the weigh-in only: the tape and body fat stay.
  const second = saveMeasureEntry(app, '2026-11-20', {
    weight: '',
    bodyFat: '18.4',
    sites: { waist: '84.2', chest: '104' },
  });
  assert.equal(second.ok, true);
  assert.deepEqual(app.bodyWeightLog, []);
  assert.equal(app.bodyMeasurements.length, 1);
  assert.equal(measureEntryFor(app, '2026-11-20').weight, null);
  assert.equal(measureEntryFor(app, '2026-11-20').bodyFat, 18.4);
});

test('replacing a date rewrites it rather than appending a second row', () => {
  const app = state({ bodyMeasurements: [{ date: '2026-11-20', waist: 84 }] });
  saveMeasureEntry(app, '2026-11-20', { sites: { waist: '83' } });
  assert.deepEqual(app.bodyMeasurements, [{ date: '2026-11-20', waist: 83 }]);
});

test('unchanged tape keeps its exact stored centimetres across an edit', () => {
  const app = state({ bodyMeasurements: [{ date: '2026-11-20', waist: 76.0, chest: 101.6 }] });
  const result = saveMeasureEntry(app, '2026-11-20', {
    bodyFat: '18.4',
    sites: {},
    // What the sheet passes for fields it prefilled but the athlete did not
    // edit: the original canonical values, not the rounded inch display.
    unchangedSites: { waist: 76.0, chest: 101.6 },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(app.bodyMeasurements, [{ date: '2026-11-20', waist: 76, chest: 101.6, bodyFat: 18.4 }]);
});

test('a typo rejects the WHOLE save and mutates nothing', () => {
  const app = state({ bodyWeightLog: [{ date: '2026-11-19', weight: 79 }] });
  const before = JSON.stringify(app);
  const result = saveMeasureEntry(app, '2026-11-20', {
    weight: '80',
    sites: { waist: '999' },
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.invalid, ['Waist']);
  assert.equal(JSON.stringify(app), before, 'a rejected save must not half-write');

  const badWeight = saveMeasureEntry(app, '2026-11-20', { weight: String(MAX_MEASURE_WEIGHT + 1) });
  assert.equal(badWeight.ok, false);
  assert.deepEqual(badWeight.invalid, ['Weight']);
});

test('clearing every field removes the date from both stores', () => {
  const app = state({
    bodyWeightLog: [{ date: '2026-11-20', weight: 80 }],
    bodyMeasurements: [{ date: '2026-11-20', waist: 84 }],
  });
  const result = saveMeasureEntry(app, '2026-11-20', { weight: '', sites: { waist: '' } });
  assert.equal(result.ok, true);
  assert.equal(result.hasValues, false);
  assert.deepEqual(app.bodyWeightLog, []);
  assert.deepEqual(app.bodyMeasurements, []);
});

test('an invisible legacy reading survives a cleared edit', () => {
  const app = state({ bodyMeasurements: [{ date: '2026-11-05', arm: 36, thigh: 58 }] });
  const result = saveMeasureEntry(app, '2026-11-05', { weight: '', sites: {} });
  assert.equal(result.ok, true);
  // The sheet has no Arm/Thigh input, so only a whole-entry delete may drop it.
  assert.equal(result.hasValues, true);
  assert.deepEqual(app.bodyMeasurements, [{ date: '2026-11-05', arm: 36, thigh: 58 }]);
});

test('an implausible date is refused', () => {
  const app = state();
  assert.deepEqual(saveMeasureEntry(app, 'today', { weight: '80' }), {
    ok: false, invalid: ['Date'], hasValues: false,
  });
});

test('a solve keeps only the canonical sites plus the legacy carry-over', () => {
  const app = state({ bodyMeasurements: [{ date: '2026-11-05', arm: 36, waist: 90 }] });
  saveMeasureEntry(app, '2026-11-05', { sites: { waist: '85' } });
  assert.deepEqual(app.bodyMeasurements, [{ date: '2026-11-05', waist: 85, arm: 36 }]);
});

test('deleting an entry removes weight, tape and the photo, and asks the library for the blob', async () => {
  const app = state({
    bodyWeightLog: [{ date: '2026-11-20', weight: 80 }, { date: '2026-11-21', weight: 80.5 }],
    bodyMeasurements: [{ date: '2026-11-20', waist: 84 }],
    progressPhotos: [photo('2026-11-20'), photo('2026-11-21')],
  });
  const deleted = [];
  let saved = 0;
  const result = await deleteMeasureEntry(app, '2026-11-20', {
    removePhoto: async (id) => { deleted.push(id); },
    save: () => { saved += 1; },
  });

  assert.deepEqual(result, { removed: true, photoId: 'photo:2026-11-20' });
  assert.deepEqual(deleted, ['photo:2026-11-20']);
  assert.equal(saved, 1);
  assert.deepEqual(app.bodyWeightLog, [{ date: '2026-11-21', weight: 80.5 }]);
  assert.deepEqual(app.bodyMeasurements, []);
  // The other date is untouched, including its photo.
  assert.deepEqual(app.progressPhotos.map((entry) => entry.date), ['2026-11-21']);
});

test('deleting an entry with no photo reports no photo id and removes metadata itself', async () => {
  const app = state({ bodyWeightLog: [{ date: '2026-11-20', weight: 80 }] });
  const result = await deleteMeasureEntry(app, '2026-11-20');
  assert.deepEqual(result, { removed: true, photoId: null });
  assert.deepEqual(app.bodyWeightLog, []);
});

test('deleting a photo-only entry clears its metadata when no library deleter is supplied', async () => {
  const app = state({ progressPhotos: [photo('2026-11-20')] });
  const result = await deleteMeasureEntry(app, '2026-11-20');
  assert.deepEqual(result, { removed: true, photoId: 'photo:2026-11-20' });
  assert.deepEqual(app.progressPhotos, []);
});

test('an invalid date deletes nothing', async () => {
  const app = state({ bodyWeightLog: [{ date: '2026-11-20', weight: 80 }] });
  assert.deepEqual(await deleteMeasureEntry(app, 'nope'), { removed: false, photoId: null });
  assert.equal(app.bodyWeightLog.length, 1);
});

// ---- duplicate dates -------------------------------------------------------
// The READERS keep the LAST row when a date appears twice (`normalizeWeighIns`,
// `normalizeMeasurements`), and a JSON restore can introduce that duplicate. The
// writer used to touch only the FIRST row, so a correction was written where
// nothing read it and the athlete's new number never appeared.

test('a duplicate date is corrected, not shadowed by the row the reader keeps', () => {
  const app = state({
    bodyWeightLog: [
      { date: '2026-11-20', weight: 79.5 },
      { date: '2026-11-20', weight: 81 },
    ],
  });
  const result = saveMeasureEntry(app, '2026-11-20', { weight: '78' }, { unit: 'cm' });
  assert.equal(result.ok, true);
  assert.equal(buildMeasuresModel(app).entries[0].weight, 78, 'the saved value is what the screen reads back');
  assert.deepEqual(app.bodyWeightLog, [{ date: '2026-11-20', weight: 78 }], 'one row per date, not two');
});

test('clearing a duplicated date removes every row for it', () => {
  const app = state({
    bodyWeightLog: [
      { date: '2026-11-20', weight: 79.5 },
      { date: '2026-11-20', weight: 81 },
    ],
  });
  const result = saveMeasureEntry(app, '2026-11-20', { weight: '' }, { unit: 'cm' });
  assert.equal(result.ok, true);
  assert.equal(result.hasValues, false);
  assert.deepEqual(app.bodyWeightLog, []);
  assert.equal(buildMeasuresModel(app).count, 0, 'a cleared entry cannot linger through a duplicate');
});

test('a duplicated measurement date is corrected from the row the readers actually see', () => {
  // The readers keep the LAST duplicate, so the carry-over must read that one:
  // a legacy Arm reading that only exists on the shadowed row was already
  // invisible before the edit, and must not resurrect as a surprise.
  const app = state({
    bodyMeasurements: [
      { date: '2026-11-20', waist: 84, arm: 36 },
      { date: '2026-11-20', waist: 86 },
    ],
  });
  saveMeasureEntry(app, '2026-11-20', { sites: { waist: '82' } }, { unit: 'cm' });
  const rows = app.bodyMeasurements.filter((row) => row.date === '2026-11-20');
  assert.equal(rows.length, 1, 'one measurement row per date');
  assert.equal(rows[0].waist, 82);
  assert.equal(buildMeasuresModel(app).entries[0].sites[0].cm, 82);

  // With ONE row, the legacy reading is carried across the edit as documented.
  const single = state({ bodyMeasurements: [{ date: '2026-11-20', waist: 84, arm: 36 }] });
  saveMeasureEntry(single, '2026-11-20', { sites: { waist: '82' } }, { unit: 'cm' });
  assert.equal(single.bodyMeasurements[0].arm, 36);
});

test('a failed blob delete leaves the whole entry intact, not half-deleted', async () => {
  const app = state({
    bodyWeightLog: [{ date: '2026-11-20', weight: 80 }],
    bodyMeasurements: [{ date: '2026-11-20', waist: 82 }],
    progressPhotos: [photo('2026-11-20')],
  });
  let saved = 0;
  await assert.rejects(
    () => deleteMeasureEntry(app, '2026-11-20', {
      removePhoto: async () => { throw new Error('could not remove'); },
      save: () => { saved++; },
    }),
    /could not remove/,
  );
  // Bytes first, rows second: a throw means NOTHING was mutated and nothing was
  // saved, so the athlete can retry instead of losing one third of the entry.
  assert.equal(app.bodyWeightLog.length, 1);
  assert.equal(app.bodyMeasurements.length, 1);
  assert.deepEqual(app.progressPhotos.map((row) => row.date), ['2026-11-20']);
  assert.equal(saved, 0);
});

test('a foreign photo id is not offered as an entry', () => {
  const app = state({
    progressPhotos: [
      { id: 'x', date: '2026-11-20', updatedAt: 1 },
      { id: 'photo:2026-11-21', date: '2026-11-20', updatedAt: 1 },
      { id: 'photo:2026-11-22', date: '2026-11-22', updatedAt: 1 },
    ],
  });
  // The id IS the date; a record that disagrees with its own date can be neither
  // viewed (the blob is keyed by id) nor deleted (the UI filters by date).
  assert.deepEqual(buildMeasuresModel(app).entries.map((entry) => entry.date), ['2026-11-22']);
});
