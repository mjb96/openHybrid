// =============================================================================
// LICENCES SHEET (tests/licenses_sheet.test.js)
//
// The sheet renders the notices that ship with the app. These tests pin the two
// properties that matter: document text is escaped, and a failed load degrades
// to the repository link instead of an empty dialog.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { licensesSheetHTML } from '../js/settings/licenses-sheet.js';

test('renders both shipped documents as escaped text', () => {
  const html = licensesSheetHTML({
    notice: 'Body Muscles\nCopyright 2024 Ivan Vulović',
    apache: 'Apache License\nVersion 2.0',
  });
  assert.match(html, /Third-party notices/);
  assert.match(html, /Apache License 2\.0/);
  assert.match(html, /Body Muscles\nCopyright 2024 Ivan Vulović/);
  assert.match(html, /Apache License\nVersion 2\.0/);
  assert.match(html, /tabindex="0"/);
});

test('a document that contains markup is escaped, not executed', () => {
  const html = licensesSheetHTML({ notice: '<img src=x onerror="alert(1)"> & "quoted"' });
  assert.doesNotMatch(html, /<img/);
  assert.match(html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt; &amp; &quot;quoted&quot;/);
});

test('a failed load falls back to the source repository', () => {
  const html = licensesSheetHTML({});
  assert.match(html, /could not be loaded/);
  assert.match(html, /github\.com\/mjb96\/openHybrid/);
  assert.doesNotMatch(html, /<pre/);
});
