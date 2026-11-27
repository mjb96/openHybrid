// =============================================================================
// SYSTEM TYPOGRAPHY RATCHET
//
// The UI deliberately uses the platform system font. A webfont request used to
// sit in front of first paint: offline it could not resolve, and the
// non-blocking media="print" dance existed only to stop it delaying the app.
// Reintroducing a hosted font silently brings back a third-party request and a
// slow first paint, so this test pins the decision.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(path.join(ROOT, name), 'utf8');

test('index.html requests no webfont and no font host', () => {
  const html = read('index.html');
  assert.doesNotMatch(html, /fonts\.googleapis\.com/);
  assert.doesNotMatch(html, /fonts\.gstatic\.com/);
  assert.doesNotMatch(html, /data-async-font/);
  assert.doesNotMatch(html, /js\/font-css\.js/);
  assert.equal(existsSync(path.join(ROOT, 'js/font-css.js')), false,
    'the non-blocking font loader must not come back');
});

test('the font stack names the platform system font', () => {
  const tokens = read('css/tokens.css');
  for (const token of ['--font-heading', '--font-body']) {
    const match = tokens.match(new RegExp(`${token}:\\s*([^;]+);`));
    assert.ok(match, `${token} is declared`);
    assert.match(match[1], /system-ui/, `${token} starts from the system UI font`);
    assert.doesNotMatch(match[1], /Plus Jakarta Sans/, `${token} names no webfont`);
  }
  const styles = read('css/styles.css');
  assert.doesNotMatch(styles, /Plus Jakarta Sans/);
  assert.match(styles, /font-family:\s*var\(--font-body\)/);
});

test('canvas share cards name the same system stack', () => {
  const share = read('js/analytics/share-card.js');
  assert.doesNotMatch(share, /Plus Jakarta Sans/);
  assert.match(share, /const FONT_STACK = 'system-ui/);
});

test('the CSP allows no remote font or style origin', () => {
  const html = read('index.html');
  const csp = html.match(/http-equiv="Content-Security-Policy"\s+content="([\s\S]*?)"/);
  assert.ok(csp, 'CSP meta tag present');
  const directives = csp[1];
  assert.match(directives, /font-src 'self';/);
  assert.match(directives, /style-src 'self' 'unsafe-inline';/);
  assert.doesNotMatch(directives, /fonts\./);
});
