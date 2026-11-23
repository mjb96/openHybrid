// =============================================================================
// STORE-ONLY ZIP — the writer and the reader are the same code path, so a round
// trip proves both. No dependency, because JPEGs are already compressed.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createZip, crc32, readZip } from '../js/portability/zip.js';

const enc = (text) => new TextEncoder().encode(text);
const dec = (bytes) => new TextDecoder().decode(bytes);

test('CRC32 matches the reference value for "123456789"', () => {
  // The canonical check value for CRC-32/ISO-HDLC.
  assert.equal(crc32(enc('123456789')), 0xcbf43926);
});

test('an archive round-trips names and bytes', () => {
  const zip = createZip([
    { name: 'photos/2026-11-20.jpg', bytes: enc('jpeg-bytes-one') },
    { name: 'manifest.json', bytes: enc('{"a":1}') },
  ]);
  const entries = readZip(zip);
  assert.deepEqual(entries.map((entry) => entry.name), ['photos/2026-11-20.jpg', 'manifest.json']);
  assert.equal(dec(entries[0].bytes), 'jpeg-bytes-one');
  assert.equal(dec(entries[1].bytes), '{"a":1}');
});

test('binary bytes survive unchanged', () => {
  const payload = new Uint8Array(512);
  for (let i = 0; i < payload.length; i++) payload[i] = (i * 37) % 256;
  const [entry] = readZip(createZip([{ name: 'bin', bytes: payload }]));
  assert.deepEqual(Array.from(entry.bytes), Array.from(payload));
});

test('an empty archive is still a valid one', () => {
  const zip = createZip([]);
  assert.equal(readZip(zip).length, 0);
  assert.ok(zip.length >= 22, 'end-of-central-directory record present');
});

test('an empty file is an entry, not a gap', () => {
  const [entry] = readZip(createZip([{ name: 'empty.txt', bytes: new Uint8Array(0) }]));
  assert.equal(entry.name, 'empty.txt');
  assert.equal(entry.bytes.length, 0);
});
