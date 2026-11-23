// @ts-check
// =============================================================================
// PROGRESS PHOTO LIBRARY (js/photos/library.js)
//
// One dated photo per day. METADATA lives in appState (so it exports with every
// JSON backup and cannot be lost with a cleared cache); the JPEG BYTES live in
// IndexedDB, because a base64 photo in localStorage would blow the quota and
// slow every save (AGENTS.md).
//
// Deleting a record deletes its blob. Export produces a store-only zip (JPEGs
// are already compressed) so photos have a backup path at all: Android sets
// `allowBackup="false"`, so IndexedDB is device-local and could otherwise be the
// only unrecoverable data in the app.
// =============================================================================
import { getPhotoBlob, getAllPhotoBlobs, putPhotoBlob, deletePhotoBlob } from '../db.js';
import { createZip, readZip } from '../portability/zip.js';
// One canonical calendar key: raw UTC slicing lands on the wrong day near midnight.
import { localDayKey } from '../dates.js';
import { downscaleToJpeg } from './capture.js';

export const MANIFEST_NAME = 'manifest.json';
export const PHOTO_DIR = 'photos';

/** @param {string} dateISO */
export function photoIdFor(dateISO) {
  return `photo:${dateISO}`;
}

/**
 * @param {any} state
 * @returns {Array<{ id: string, date: string, note: string, width: number, height: number, bytes: number, updatedAt: number }>}
 */
export function listPhotos(state) {
  const list = Array.isArray(state?.progressPhotos) ? state.progressPhotos : [];
  return list
    // The id IS the date. A record whose id disagrees with its date (a foreign
    // or hand-edited JSON) can be neither viewed (the blob is keyed by id) nor
    // deleted (the UI filters by date), so it would render a row that does
    // nothing. Drop it here rather than offer an unusable tile.
    .filter((photo) => photo && typeof photo.id === 'string' && typeof photo.date === 'string'
      && /^\d{4}-\d{2}-\d{2}$/.test(photo.date) && photo.id === photoIdFor(photo.date))
    .map((photo) => ({
      id: photo.id,
      date: photo.date,
      note: typeof photo.note === 'string' ? photo.note : '',
      width: Number(photo.width) || 0,
      height: Number(photo.height) || 0,
      bytes: Number(photo.bytes) || 0,
      updatedAt: Number(photo.updatedAt) || 0,
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)); // newest first
}

/**
 * Add or replace the photo for a date.
 *
 * @param {{
 *   state: any,
 *   dateISO: string,
 *   file?: File|Blob,
 *   prepared?: { blob: Blob, width: number, height: number },
 *   note?: string,
 *   save?: () => void,
 *   now?: number,
 * }} input
 */
export async function addPhoto(input) {
  const { state, dateISO } = input;
  if (!state) throw new Error('addPhoto: state is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateISO || ''))) throw new Error('addPhoto: a date is required');

  const prepared = input.prepared || await downscaleToJpeg(/** @type {any} */ (input.file));
  const id = photoIdFor(dateISO);
  const stored = await putPhotoBlob(id, prepared.blob);
  if (!stored) throw new Error('The photo could not be saved on this device.');

  const record = {
    id,
    date: dateISO,
    note: String(input.note || '').slice(0, 140),
    width: prepared.width,
    height: prepared.height,
    bytes: Number(prepared.blob.size) || 0,
    updatedAt: input.now || Date.now(),
  };
  if (!Array.isArray(state.progressPhotos)) state.progressPhotos = [];
  // One photo per date: the id IS the date, so adding twice replaces.
  state.progressPhotos = state.progressPhotos.filter((photo) => photo?.id !== id).concat(record);
  input.save?.();
  return record;
}

/**
 * @param {{ state: any, id: string, save?: () => void }} input
 */
export async function removePhoto({ state, id, save }) {
  if (!state || !id) return false;
  // The BYTES are the part that cannot be recovered, so a failed blob delete
  // must not report success: `deletePhotoBlob` resolves false on any error and
  // never rejects, which is how an orphan could sit in quota forever while the
  // record said it was gone. Keeping BOTH (record + bytes) is retryable and
  // visible; half-deleting is neither.
  const removedBlob = await deletePhotoBlob(id);
  if (typeof indexedDB !== 'undefined' && !removedBlob) {
    throw new Error('The photo file could not be removed from this device.');
  }
  state.progressPhotos = (Array.isArray(state.progressPhotos) ? state.progressPhotos : [])
    .filter((photo) => photo?.id !== id);
  save?.();
  return true;
}

/**
 * A store-only zip of every blob plus the metadata manifest.
 *
 * @param {any} state
 * @param {{ now?: Date }} [options]
 * @returns {Promise<{ filename: string, bytes: Uint8Array, count: number }>}
 */
export async function exportPhotosZip(state, options = {}) {
  const now = options.now || new Date();
  const dateKey = localDayKey(now) || 'export';
  const metadata = listPhotos(state);
  const blobs = await getAllPhotoBlobs();

  /** @type {Array<{ name: string, bytes: Uint8Array }>} */
  const entries = [];
  for (const photo of metadata) {
    const blob = blobs.find((entry) => entry.id === photo.id);
    if (!blob) continue;
    const bytes = new Uint8Array(await blob.blob.arrayBuffer());
    entries.push({ name: `${PHOTO_DIR}/${photo.date}.jpg`, bytes });
  }
  entries.push({
    name: MANIFEST_NAME,
    bytes: new TextEncoder().encode(JSON.stringify({ version: 1, photos: metadata }, null, 2)),
  });

  return {
    filename: `openhybrid-photos-${dateKey}.zip`,
    bytes: createZip(entries, { now }),
    count: entries.length - 1,
  };
}

/**
 * Restore photos from an exported zip. Idempotent by date: re-importing the same
 * archive replaces each day rather than duplicating it.
 *
 * @param {any} state
 * @param {Uint8Array} bytes
 * @param {{ save?: () => void, now?: number }} [options]
 */
export async function importPhotosZip(state, bytes, options = {}) {
  if (!state) throw new Error('importPhotosZip: state is required');
  const entries = readZip(bytes);
  const manifestEntry = entries.find((entry) => entry.name === MANIFEST_NAME);
  if (!manifestEntry) throw new Error('That archive has no photo manifest.');

  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestEntry.bytes));
  } catch {
    throw new Error('That archive has an unreadable manifest.');
  }
  const photos = Array.isArray(manifest?.photos) ? manifest.photos : [];

  let imported = 0;
  for (const photo of photos) {
    if (!photo?.date || !/^\d{4}-\d{2}-\d{2}$/.test(photo.date)) continue;
    const entry = entries.find((candidate) => candidate.name === `${PHOTO_DIR}/${photo.date}.jpg`);
    if (!entry) continue;
    // Copy into a fresh buffer: a subarray view can carry a SharedArrayBuffer
    // type that BlobPart rejects.
    const blob = new Blob([new Uint8Array(entry.bytes)], { type: 'image/jpeg' });
    const ok = await putPhotoBlob(photoIdFor(photo.date), blob);
    if (!ok) continue;

    // The id is derived from the date, never trusted from the file: a foreign id
    // produced a tile the UI could not delete (delete filters by id).
    const id = photoIdFor(photo.date);
    const record = {
      id,
      date: photo.date,
      note: String(photo.note || '').slice(0, 140),
      width: Number(photo.width) || 0,
      height: Number(photo.height) || 0,
      bytes: Number(photo.bytes) || blob.size || 0,
      updatedAt: Number(photo.updatedAt) || options.now || Date.now(),
    };
    if (!Array.isArray(state.progressPhotos)) state.progressPhotos = [];
    state.progressPhotos = state.progressPhotos.filter((existing) => existing?.id !== id).concat(record);
    imported++;
  }
  if (imported) options.save?.();
  return imported;
}

/** A temporary object URL for a stored blob, or null. Caller revokes it. */
export async function photoObjectUrl(id) {
  const blob = await getPhotoBlob(id);
  if (!blob) return null;
  try { return URL.createObjectURL(blob); } catch { return null; }
}
