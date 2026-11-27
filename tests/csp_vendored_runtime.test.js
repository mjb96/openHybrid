// ==========================================
// VENDORED RUNTIME JS + CSP CONTRACT (tests/csp_vendored_runtime.test.js)
// R16: all production runtime JS is vendored into the signed bundle and served
// from 'self', so no mutable remote executable code can reach the privileged
// WebView origin and an offline launch makes zero remote-JS requests.
// Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const serviceWorker = readFileSync(join(ROOT, 'sw.js'), 'utf8');

function cspDirective(name) {
  const meta = html.match(/http-equiv="Content-Security-Policy"\s+content="([\s\S]*?)"/);
  assert.ok(meta, 'CSP meta tag present');
  const m = meta[1].match(new RegExp(name + '\\s+([^;]*)'));
  return m ? m[1].trim().replace(/\s+/g, ' ') : null;
}

test('no <script> loads from a remote origin (offline = no remote JS)', () => {
  const remote = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((m) => m[1]);
  const offenders = remote.filter((src) => /^(https?:)?\/\//i.test(src));
  assert.deepEqual(offenders, [], `remote <script src> found: ${offenders.join(', ')}`);
  // And every script src is a local vendored/app path.
  for (const src of remote) assert.ok(src.startsWith('./'), `non-local script src: ${src}`);
});

test('CSP script-src is exactly \'self\' (no CDN)', () => {
  assert.equal(cspDirective('script-src'), "'self'");
  // jsdelivr must be gone from connect-src too (no CDN dependency remains).
  assert.ok(!/cdn\.jsdelivr\.net/.test(html), 'jsdelivr must not appear anywhere in index.html');
});

test('the service worker does not fetch or cache remote JavaScript', () => {
  assert.ok(!/cdn\.jsdelivr\.net|https?:\/\/[^'"]+\.js/i.test(serviceWorker), 'remote JS must not appear in sw.js');
  assert.ok(!/CDN_ASSETS/.test(serviceWorker), 'obsolete CDN cache list must stay removed');
});

test('vendored Leaflet is present on disk', () => {
  for (const rel of ['js/vendor/leaflet/leaflet.js', 'js/vendor/leaflet/leaflet.css']) {
    const p = join(ROOT, rel);
    assert.ok(existsSync(p), `${rel} exists`);
    assert.ok(statSync(p).size > 1000, `${rel} is non-trivial`);
  }
});

test('no third-party crash reporter remains', () => {
  // Removing Sentry is a product decision, not a dormant feature: the SDK, its
  // config and its CSP hosts must all be gone so nothing can quietly revive.
  assert.ok(!/sentry/i.test(html), 'index.html must not mention Sentry');
  assert.ok(!existsSync(join(ROOT, 'js/vendor/sentry-browser-8.55.2.min.js')));
  assert.ok(!existsSync(join(ROOT, 'js/monitoring/sentry.js')));
});
