// =============================================================================
// OPEN-SOURCE LICENCE RATCHET
//
// Changing the licence is a deliberate product decision, not an incidental
// edit. These checks keep the repository from drifting back to "all rights
// reserved" or shipping without the AGPL source offer that network users are
// entitled to.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => readFileSync(path.join(ROOT, name), 'utf8');

test('LICENSE is the verbatim GNU AGPL v3 text', () => {
  const license = read('LICENSE');
  assert.match(license, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(license, /Version 3, 19 November 2007/);
  assert.match(license, /https:\/\/www\.gnu\.org\/licenses\//);
  assert.doesNotMatch(license, /All rights reserved/i);
});

test('package metadata declares AGPL-3.0-only', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.license, 'AGPL-3.0-only');
});

test('README carries the AGPL grant and the corresponding-source link', () => {
  const readme = read('README.md');
  assert.match(readme, /GNU Affero General Public License/);
  assert.match(readme, /AGPL-3\.0-only/);
  assert.match(readme, /https:\/\/github\.com\/mjb96\/openHybrid/);
  assert.doesNotMatch(readme, /All rights reserved/i);
  assert.doesNotMatch(readme, /Matthew Boman/, 'the README must not publish a personal copyright name');
});

test('third-party notices cover every vendored runtime component', () => {
  const notice = read('NOTICE.md');
  for (const item of ['Leaflet', 'fit-file-parser', 'buffer']) {
    assert.ok(notice.includes(item), `NOTICE.md must mention ${item}`);
  }
});

test('NOTICE carries the Apache-2.0 body-map attribution and licence copy', () => {
  const notice = read('NOTICE.md');
  assert.match(notice, /Body Muscles/);
  assert.match(notice, /Ivan Vulović/);
  // Upstream ships a NOTICE file; Apache-2.0 §4(d) wants its attribution text,
  // not a paraphrase.
  assert.match(notice, /This product includes software developed by Ivan Vulović\./);
  assert.match(notice, /https:\/\/github\.com\/vulovix\/body-muscles/);
  assert.match(notice, /Apache License, Version 2\.0/);
  const license = read('LICENSES/Apache-2.0.txt');
  assert.match(license, /Apache License/);
  assert.match(license, /Version 2\.0/);
});

test('the notices ship with the PWA and the APK', () => {
  const sw = read('sw.js');
  for (const asset of ['./NOTICE.md', './LICENSES/Apache-2.0.txt']) {
    assert.ok(sw.includes(asset), `sw.js must precache ${asset}`);
  }
  const gradle = read('android/app/build.gradle.kts');
  assert.match(gradle, /include\("NOTICE\.md"\)/);
  assert.match(gradle, /include\("LICENSES\/\*\*"\)/);
});

test('Settings exposes the AGPL source link for network users', () => {
  const renderer = read('js/settings/render.js');
  assert.match(renderer, /https:\/\/github\.com\/mjb96\/openHybrid/);
  assert.match(renderer, /GitHub · AGPL-3\.0/);
  assert.match(renderer, /Licences/);
});



test('exercise stills are attributed to Free Exercise DB in NOTICE', () => {
  const notice = read('NOTICE.md');
  assert.match(notice, /Free Exercise DB/);
  assert.match(notice, /Unlicense/);
  assert.match(notice, /assets\/exercises/);
  // The old sentence claimed no exercise media shipped at all, contradicting
  // the 284 files the precache delivers.
  assert.doesNotMatch(notice, /No imported instructional text, descriptions or exercise media/);
});

test('outward-facing docs do not describe a crash reporter, backend or account system', () => {
  for (const name of ['README.md', 'SECURITY.md', 'docs/store-listing.md', 'docs/legal/terms-of-service.md', 'docs/legal/privacy-policy.md']) {
    const text = read(name);
    assert.doesNotMatch(text, /scrubbed crash report/i, `${name} must not claim crash reporting`);
    assert.doesNotMatch(text, /Sentry|SENTRY_/i, `${name} must not mention Sentry`);
  }
  assert.doesNotMatch(read('SECURITY.md'), /Supabase|supabase\//, 'SECURITY.md must not scope a backend that does not exist');
  const terms = read('docs/legal/terms-of-service.md');
  assert.doesNotMatch(terms, /You must provide a valid email to create an account|optionally sync across devices/i);
});

test('a local Android build stages every precached asset and keeps the boot receiver internal', () => {
  const gradle = read('android/app/build.gradle.kts');
  for (const item of ['assets/**', 'icon-192.png', 'icon-maskable-512.png', 'NOTICE.md', 'LICENSES/**']) {
    assert.ok(gradle.includes(item), `copyWebAssets must include ${item}`);
  }
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(manifest, /<receiver android:name="\.BootReceiver" android:exported="false">/);
});
