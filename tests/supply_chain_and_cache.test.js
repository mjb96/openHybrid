// =============================================================================
// SUPPLY CHAIN + OFFLINE CACHE RATCHETS
//
// A workflow action pinned to a moving major tag executes whatever the owner
// publishes next in the job that holds the Pages token / release signing keys.
// The service worker's runtime cache must also stay bounded: it used to grow
// forever, and every query-string URL was a new never-evicted key.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...parts) => readFileSync(path.join(ROOT, ...parts), 'utf8');

test('every external GitHub Action is pinned to a full commit SHA', () => {
  const dir = path.join(ROOT, '.github', 'workflows');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.yml'))) {
    const text = readFileSync(path.join(dir, file), 'utf8');
    for (const match of text.matchAll(/uses:\s*([^\s#]+)/g)) {
      const ref = match[1];
      if (ref.startsWith('./')) continue; // a local reusable workflow
      assert.match(ref, /^[^@\s]+@[0-9a-f]{40}$/, `${file}: ${ref} is not pinned to a commit SHA`);
    }
  }
});

test('the service worker bounds runtime caching and has a network deadline', () => {
  const sw = read('sw.js');
  assert.match(sw, /const MAX_RUNTIME_CACHE_ENTRIES = \d+;/);
  assert.match(sw, /const NETWORK_TIMEOUT_MS = \d+;/);
  assert.match(sw, /function fetchWithTimeout\(/);
  assert.match(sw, /function pruneRuntimeCache\(/);
  assert.match(sw, /new URL\(event\.request\.url\)\.search/, 'a query-string variant is never cached');
});

test('the browser runner has a per-check timeout ceiling for slow checks', () => {
  const runner = read('scripts', 'run-browser-checks.mjs');
  assert.match(runner, /const CHECK_TIMEOUT_SECONDS = \{/);
  assert.match(runner, /gym-performance-browser-check\.mjs': 300/);
  assert.match(runner, /runAttempt\(check, attemptTimeout\)/);
});
