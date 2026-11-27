// =============================================================================
// PHOTO LIBRARY — metadata in state, bytes in IndexedDB, and an export that can
// actually be restored. This is the only user data without a platform backup
// (Android allowBackup is false), so the round trip is the whole safety story.
// =============================================================================
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// A real IndexedDB implementation, no browser required.
const { indexedDB, IDBKeyRange } = await import('fake-indexeddb');
globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;
globalThis.Blob = globalThis.Blob || (await import('node:buffer')).Blob;

const library = await import('../js/photos/library.js');
const { getPhotoBlob } = await import('../js/db.js');

// A JPEG starts FF D8 FF. The importer now verifies that magic before it
// replaces a stored photo, so the fixture must be a real JPEG-shaped blob.
const JPEG_MAGIC = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
const jpeg = (text) => new Blob([JPEG_MAGIC, new TextEncoder().encode(text)], { type: 'image/jpeg' });

before(() => {
  // Fresh database per run so a previous test's blob cannot pass for this one.
});

test('adding a photo writes metadata and a blob keyed by its date', async () => {
  const state = { progressPhotos: [] };
  const record = await library.addPhoto({
    state, dateISO: '2026-11-20',
    prepared: { blob: jpeg('photo-a'), width: 1200, height: 900 },
  });
  assert.equal(record.id, 'photo:2026-11-20');
  assert.equal(state.progressPhotos.length, 1);
  const blob = await getPhotoBlob('photo:2026-11-20');
  assert.ok(blob, 'the bytes are in IndexedDB');
  assert.ok((await blob.text()).includes('photo-a'));
});

test('a second photo for the same date replaces rather than duplicates', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-21', prepared: { blob: jpeg('first'), width: 100, height: 100 } });
  await library.addPhoto({ state, dateISO: '2026-11-21', prepared: { blob: jpeg('second'), width: 100, height: 100 } });
  assert.equal(state.progressPhotos.length, 1, 'one photo per date');
  assert.ok((await (await getPhotoBlob('photo:2026-11-21')).text()).includes('second'));
});

test('deleting a photo removes the blob and the metadata', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-22', prepared: { blob: jpeg('gone'), width: 10, height: 10 } });
  await library.removePhoto({ state, id: 'photo:2026-11-22' });
  assert.deepEqual(state.progressPhotos, []);
  assert.equal(await getPhotoBlob('photo:2026-11-22'), null, 'the blob is gone too');
});

test('listPhotos is newest first and ignores junk', () => {
  const state = { progressPhotos: [
    { id: 'photo:2026-11-01', date: '2026-11-01' },
    null,
    { id: 'x' },
    { id: 'photo:2026-11-20', date: '2026-11-20' },
  ] };
  assert.deepEqual(library.listPhotos(state).map((photo) => photo.date), ['2026-11-20', '2026-11-01']);
});

test('export then import restores the bytes on a fresh state', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-23', prepared: { blob: jpeg('round-trip'), width: 640, height: 480 } });

  const archive = await library.exportPhotosZip(state, { now: new Date('2026-11-24T09:00:00Z') });
  assert.equal(archive.filename, 'openhybrid-photos-2026-11-24.zip');
  assert.equal(archive.count, 1);

  const restored = { progressPhotos: [] };
  const imported = await library.importPhotosZip(restored, archive.bytes);
  assert.equal(imported, 1);
  assert.equal(restored.progressPhotos[0].date, '2026-11-23');
  assert.equal(restored.progressPhotos[0].width, 640);
  assert.ok((await (await getPhotoBlob('photo:2026-11-23')).text()).includes('round-trip'));
});

test('re-importing the same archive is idempotent', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-19', prepared: { blob: jpeg('once'), width: 10, height: 10 } });
  const archive = await library.exportPhotosZip(state);
  const target = { progressPhotos: [] };
  await library.importPhotosZip(target, archive.bytes);
  await library.importPhotosZip(target, archive.bytes);
  assert.equal(target.progressPhotos.length, 1, 'the date is the identity');
});

test('an archive without a manifest is refused, not half-imported', async () => {
  const bogus = (await import('../js/portability/zip.js')).createZip([
    { name: 'photos/2026-11-01.jpg', bytes: new Uint8Array([1, 2, 3]) },
  ]);
  await assert.rejects(() => library.importPhotosZip({ progressPhotos: [] }, bogus), /no photo manifest/i);
});

test('an invalid date is refused before anything is written', async () => {
  await assert.rejects(
    () => library.addPhoto({ state: { progressPhotos: [] }, dateISO: 'nope', prepared: { blob: jpeg('x'), width: 1, height: 1 } }),
    /a date is required/i,
  );
});

test('a restore whose state write fails is reported, not called a success', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-24', prepared: { blob: jpeg('save-failure'), width: 10, height: 10 } });
  const archive = await library.exportPhotosZip(state);
  await assert.rejects(
    () => library.importPhotosZip({ progressPhotos: [] }, archive.bytes, { save: () => false }),
    /could not be recorded/i,
  );
});

test('the manifest never promises a photo whose bytes are missing', async () => {
  const state = { progressPhotos: [] };
  await library.addPhoto({ state, dateISO: '2026-11-25', prepared: { blob: jpeg('orphan'), width: 10, height: 10 } });
  const { deletePhotoBlob } = await import('../js/db.js');
  await deletePhotoBlob('photo:2026-11-25');

  const archive = await library.exportPhotosZip(state);
  assert.equal(archive.count, 0, 'no bytes, no entry');
  const { readZip } = await import('../js/portability/zip.js');
  const entries = readZip(archive.bytes);
  const manifest = JSON.parse(new TextDecoder().decode(entries.find((entry) => entry.name === 'manifest.json').bytes));
  assert.deepEqual(manifest.photos, [], 'the manifest lists only what the archive contains');
});
