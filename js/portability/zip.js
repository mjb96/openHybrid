// @ts-check
// =============================================================================
// STORE-ONLY ZIP (js/portability/zip.js)
//
// Progress photos must be exportable without adding a dependency: AGENTS.md
// keeps the runtime origin-restricted and bundled, and a zip library is ~40KB to
// do one thing. JPEGs are already compressed, so the STORE method (0) loses
// nothing — deflate would add code and size for no gain.
//
// Implements the three structures a reader needs: local file headers, the
// central directory, and the end-of-central-directory record.
// =============================================================================

/** CRC32 table, built once. */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

/** @param {Uint8Array} bytes */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** DOS date/time for a JS date, as zip expects. */
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

const encoder = new TextEncoder();

/**
 * @param {Array<{ name: string, bytes: Uint8Array }>} entries
 * @param {{ now?: Date }} [options]
 * @returns {Uint8Array}
 */
export function createZip(entries, options = {}) {
  const now = options.now || new Date();
  const { time, day } = dosDateTime(now);

  /** @type {Array<{ name: Uint8Array, bytes: Uint8Array, crc: number, offset: number }>} */
  const prepared = [];
  let offset = 0;

  for (const entry of entries || []) {
    const name = encoder.encode(String(entry?.name || 'file'));
    const bytes = entry?.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(0);
    prepared.push({ name, bytes, crc: crc32(bytes), offset });
    offset += 30 + name.length + bytes.length;
  }

  const centralSize = prepared.reduce((total, entry) => total + 46 + entry.name.length, 0);
  const out = new Uint8Array(offset + centralSize + 22);
  const view = new DataView(out.buffer);
  let at = 0;

  for (const entry of prepared) {
    view.setUint32(at, 0x04034b50, true); at += 4;
    view.setUint16(at, 20, true); at += 2;      // version needed
    view.setUint16(at, 0, true); at += 2;       // flags
    view.setUint16(at, 0, true); at += 2;       // method: store
    view.setUint16(at, time, true); at += 2;
    view.setUint16(at, day, true); at += 2;
    view.setUint32(at, entry.crc, true); at += 4;
    view.setUint32(at, entry.bytes.length, true); at += 4;
    view.setUint32(at, entry.bytes.length, true); at += 4;
    view.setUint16(at, entry.name.length, true); at += 2;
    view.setUint16(at, 0, true); at += 2;       // extra length
    out.set(entry.name, at); at += entry.name.length;
    out.set(entry.bytes, at); at += entry.bytes.length;
  }

  const centralStart = at;
  for (const entry of prepared) {
    view.setUint32(at, 0x02014b50, true); at += 4;
    view.setUint16(at, 20, true); at += 2;      // version made by
    view.setUint16(at, 20, true); at += 2;      // version needed
    view.setUint16(at, 0, true); at += 2;
    view.setUint16(at, 0, true); at += 2;
    view.setUint16(at, time, true); at += 2;
    view.setUint16(at, day, true); at += 2;
    view.setUint32(at, entry.crc, true); at += 4;
    view.setUint32(at, entry.bytes.length, true); at += 4;
    view.setUint32(at, entry.bytes.length, true); at += 4;
    view.setUint16(at, entry.name.length, true); at += 2;
    view.setUint16(at, 0, true); at += 2;       // extra
    view.setUint16(at, 0, true); at += 2;       // comment
    view.setUint16(at, 0, true); at += 2;       // disk
    view.setUint16(at, 0, true); at += 2;       // internal attrs
    view.setUint32(at, 0, true); at += 4;       // external attrs
    view.setUint32(at, entry.offset, true); at += 4;
    out.set(entry.name, at); at += entry.name.length;
  }

  view.setUint32(at, 0x06054b50, true); at += 4;
  view.setUint16(at, 0, true); at += 2;         // this disk
  view.setUint16(at, 0, true); at += 2;         // central disk
  view.setUint16(at, prepared.length, true); at += 2;
  view.setUint16(at, prepared.length, true); at += 2;
  view.setUint32(at, centralSize, true); at += 4;
  view.setUint32(at, centralStart, true); at += 4;
  view.setUint16(at, 0, true); at += 2;         // comment length

  return out;
}

const decoder = new TextDecoder();

// Bounds for an untrusted archive. A photo backup is one JPEG per day; these
// caps are far above any real library and stop a crafted file from exhausting
// memory or filling IndexedDB.
const MAX_ENTRIES = 5000;
const MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024 * 1024;
const MAX_NAME_LENGTH = 255;

/** A path that could escape the archive root is never a photo entry. */
function isSafeEntryName(name) {
  return typeof name === 'string'
    && name.length > 0
    && name.length <= MAX_NAME_LENGTH
    && !name.startsWith('/')
    && !name.includes('\\')
    && !/[\u0000-\u001f]/.test(name)
    && !name.split('/').includes('..');
}

/**
 * Read a store-only zip. Used by the import path and by the round-trip test —
 * the same code proves the writer and reads a real archive.
 *
 * An untrusted archive is validated before a single byte reaches storage:
 * every declared size must fit the buffer, every name must be a safe relative
 * path, and every CRC must match the bytes actually present. A truncated file
 * therefore fails instead of yielding a short entry that would overwrite a good
 * photo.
 *
 * @param {Uint8Array} bytes
 * @returns {Array<{ name: string, bytes: Uint8Array }>}
 */
export function readZip(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('The archive is not a readable file.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entries = [];
  const names = new Set();
  let total = 0;
  let at = 0;
  while (at + 4 <= bytes.length && view.getUint32(at, true) === 0x04034b50) {
    if (entries.length >= MAX_ENTRIES) throw new Error('That archive contains too many files.');
    if (at + 30 > bytes.length) throw new Error('That archive is truncated.');
    const flags = view.getUint16(at + 6, true);
    const method = view.getUint16(at + 8, true);
    const declaredCrc = view.getUint32(at + 14, true);
    const size = view.getUint32(at + 18, true);
    const nameLength = view.getUint16(at + 26, true);
    const extraLength = view.getUint16(at + 28, true);
    const nameStart = at + 30;
    const dataStart = nameStart + nameLength + extraLength;
    if (flags & 0x08) throw new Error('That archive uses an unsupported streaming header.');
    if (nameStart + nameLength > bytes.length || dataStart > bytes.length) {
      throw new Error('That archive is truncated.');
    }
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    if (!isSafeEntryName(name)) throw new Error('That archive contains an unsafe file name.');
    if (names.has(name)) throw new Error('That archive contains two files with the same name.');
    if (method !== 0) throw new Error(`Unsupported compression for ${name}; only store is supported`);
    if (size > MAX_ENTRY_BYTES) throw new Error(`${name} is too large to import.`);
    if (dataStart + size > bytes.length) throw new Error('That archive is truncated.');
    total += size;
    if (total > MAX_TOTAL_BYTES) throw new Error('That archive is too large to import.');
    const entryBytes = bytes.subarray(dataStart, dataStart + size);
    if (crc32(entryBytes) !== declaredCrc) {
      throw new Error(`${name} is damaged (checksum mismatch).`);
    }
    names.add(name);
    entries.push({ name, bytes: entryBytes });
    at = dataStart + size;
  }
  return entries;
}
