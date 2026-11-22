// =============================================================================
// PRIVATE REFERENCE LINK TESTS
// The link is a private shortcut stored beside the exercise note. It must only
// ever become an http(s) href — never a script/local-file primitive, never
// markup, and never content that travels in a recap, share card or CSV export.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { safeExternalHttpUrl } from '../js/util.js';
import {
  getExerciseLink, getExercisePrefs, setExerciseLink,
} from '../js/workout/exercise-config.js';
import { createReferenceLink, referenceLinkLabel } from '../js/workout/reference-link.js';
import { sanitizeImportedState } from '../js/state/import-validate.js';
import { buildSessionRecap, renderSessionRecapHTML } from '../js/session-recap.js';
import { buildWorkoutShareSummary, workoutShareCaption } from '../js/share/workout-share.js';
import { buildTrainingCsv } from '../js/portability/csv-export.js';

const PRIVATE_URL = 'https://private.example.com/watch?v=secret';

test('safeExternalHttpUrl accepts web URLs and adds https when the scheme is missing', () => {
  assert.equal(safeExternalHttpUrl('https://youtube.com/watch?v=abc'), 'https://youtube.com/watch?v=abc');
  assert.equal(safeExternalHttpUrl('  https://example.com/form  '), 'https://example.com/form');
  assert.equal(safeExternalHttpUrl('example.com/form'), 'https://example.com/form');
  assert.equal(safeExternalHttpUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeExternalHttpUrl('https://example.com:8443/path'), 'https://example.com:8443/path');
});

test('safeExternalHttpUrl refuses non-web schemes, credentials, control chars and overlong values', () => {
  const attempts = [
    '',
    '   ',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://example.com/id',
    'file:///etc/passwd',
    'intent://scan/#Intent;scheme=zxing;end',
    'mailto:a@b.com',
    'https://user:pass@example.com/x',
    'https://user@example.com/x',
    '//example.com/x',
    'https://exa\nmple.com',
    `https://example.com/${'a'.repeat(2048)}`,
    `example.com/${'a'.repeat(2033)}`, // 2045 raw chars, but https:// pushes it past the cap
  ];
  for (const attempt of attempts) {
    assert.equal(safeExternalHttpUrl(attempt), '', `accepted unsafe value: ${JSON.stringify(attempt)}`);
  }
});

test('a reference link follows catalogue aliases and prefs never leak the stored object', () => {
  const state = { settings: { exercisePrefs: {} } };
  assert.equal(setExerciseLink(state, 'Bench Press', 'https://youtube.com/watch?v=abc'), true);
  assert.equal(getExerciseLink(state, 'Barbell Bench Press'), 'https://youtube.com/watch?v=abc');
  const prefs = getExercisePrefs(state, 'Bench Press');
  prefs.link = 'https://mutated.example';
  assert.equal(getExerciseLink(state, 'Bench Press'), 'https://youtube.com/watch?v=abc');
  assert.equal(setExerciseLink(state, 'Bench Press', 'javascript:alert(1)'), false);
  assert.equal(getExerciseLink(state, 'Bench Press'), 'https://youtube.com/watch?v=abc', 'an unsafe value must not erase a good link');
  assert.equal(setExerciseLink(state, 'Bench Press', ''), true);
  assert.equal(getExerciseLink(state, 'Bench Press'), '');
});

function fakeDocument() {
  /** @type {any[]} */
  const created = [];
  return {
    created,
    createElement(tag) {
      const node = {
        tagName: String(tag).toUpperCase(),
        attrs: {},
        className: '',
        textContent: '',
        innerHTML: '',
        setAttribute(name, value) { node.attrs[name] = String(value); },
        getAttribute(name) { return node.attrs[name]; },
      };
      created.push(node);
      return node;
    },
  };
}

test('the card anchor is a real element built with attributes and textContent', () => {
  const doc = fakeDocument();
  const anchor = createReferenceLink(doc, 'https://www.youtube.com/watch?v=abc', 'Bench Press');
  assert.ok(anchor);
  assert.equal(doc.created.length, 1);
  assert.equal(anchor.tagName, 'A');
  assert.equal(anchor.className, 'cockpit-ex-link');
  assert.equal(anchor.attrs.href, 'https://www.youtube.com/watch?v=abc');
  assert.equal(anchor.attrs.target, '_blank');
  assert.equal(anchor.attrs.rel, 'noopener noreferrer');
  assert.equal(anchor.attrs.referrerpolicy, 'no-referrer');
  assert.equal(anchor.textContent, 'Watch on YouTube');
  assert.match(anchor.attrs['aria-label'], /Bench Press/);
  assert.equal(anchor.innerHTML, '', 'the URL must never be written as HTML');
});

test('a hostile URL is refused before any element is created, and hrefs cannot carry markup', () => {
  const rejected = fakeDocument();
  assert.equal(createReferenceLink(rejected, 'javascript:alert(1)', 'Squat'), null);
  assert.equal(rejected.created.length, 0);

  const doc = fakeDocument();
  const anchor = createReferenceLink(doc, 'https://example.com/"><img src=x>', 'Squat');
  assert.ok(anchor);
  assert.equal(anchor.textContent, 'Open reference');
  assert.doesNotMatch(anchor.attrs.href, /[<>"]/);
});

test('the label names the destination host, not the URL', () => {
  assert.equal(referenceLinkLabel('https://youtu.be/abc'), 'Watch on YouTube');
  assert.equal(referenceLinkLabel('https://www.youtube.com/watch?v=abc'), 'Watch on YouTube');
  assert.equal(referenceLinkLabel('https://example.com/form'), 'Open reference');
  assert.equal(referenceLinkLabel('javascript:alert(1)'), '');
});

test('import repair drops only an unsafe link and keeps the note and the input intact', () => {
  const pref = (note, link) => ({ note, link });
  const input = {
    settings: { exercisePrefs: {
      a: pref('keep-a', 'javascript:alert(1)'),
      b: pref('keep-b', 'https://youtube.com/watch?v=abc'),
      c: pref('keep-c', 'data:text/html,<script>alert(1)</script>'),
      d: pref('keep-d', '//example.com/x'),
      e: pref('keep-e', `https://example.com/${'a'.repeat(2048)}`),
    } },
  };
  const out = sanitizeImportedState(input);
  const prefs = out.settings.exercisePrefs;
  assert.notEqual(prefs, input.settings.exercisePrefs, 'settings.exercisePrefs must be cloned');
  for (const key of ['a', 'c', 'd', 'e']) {
    assert.equal(prefs[key].link, undefined, `${key} kept an unsafe link`);
    assert.equal(prefs[key].note, `keep-${key}`);
  }
  assert.equal(prefs.b.link, 'https://youtube.com/watch?v=abc');
  assert.equal(input.settings.exercisePrefs.a.link, 'javascript:alert(1)', 'the imported object must not be mutated');
});

test('a private reference link never reaches the recap, share card or CSV', () => {
  const state = {
    settings: {
      weightUnit: 'kg', distanceUnit: 'km',
      exercisePrefs: { 'id:barbell_bench_press': { note: 'cue', link: PRIVATE_URL } },
    },
    weeks: { '1': {
      dates: { mon: '2026-07-02' },
      lifts: { mon: { 'Barbell Bench Press': [{ w: 80, r: 5, c: true }] } },
      notes: {}, gymStats: {}, runs: {}, bodyWeight: {},
    } },
  };
  const recap = buildSessionRecap(state, '1', 'mon');
  assert.ok(!JSON.stringify(recap).includes(PRIVATE_URL));
  const html = renderSessionRecapHTML(recap);
  assert.ok(!html.includes(PRIVATE_URL));
  assert.ok(!html.includes('Watch on YouTube'));

  const summary = buildWorkoutShareSummary(recap, { title: 'Push' });
  assert.ok(!JSON.stringify(summary).includes(PRIVATE_URL));
  assert.ok(!workoutShareCaption(summary).includes(PRIVATE_URL));

  const csv = buildTrainingCsv(state, ['mon']);
  assert.ok(!csv.includes(PRIVATE_URL));
  assert.ok(!/exercisePrefs/.test(csv));
});

test('the reference-link module cannot inject HTML or fetch the URL', () => {
  const src = readFileSync(new URL('../js/workout/reference-link.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /\.innerHTML\s*=/);
  assert.doesNotMatch(src, /\bfetch\s*\(/);
  assert.doesNotMatch(src, /<iframe/i);
  assert.match(src, /setAttribute\(/);
  assert.match(src, /\.textContent\s*=/);
});
