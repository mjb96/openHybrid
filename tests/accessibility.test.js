// ==========================================
// ACCESSIBILITY STATIC CHECK (tests/accessibility.test.js)
// ------------------------------------------
// Automated a11y guards for the critical screens' markup in index.html:
//   • no icon-only button lacks an accessible name;
//   • key interactive inputs have an accessible name;
//   • closed dialogs are inert/hidden and do not make a modal claim;
//   • the viewport doesn't block zoom (low-vision).
// These lock the fixes from this audit so they can't silently regress.
// Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const HTML = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const CSS = readFileSync(resolve(ROOT, 'css/styles.css'), 'utf8');

test('no icon-only button lacks an accessible name', () => {
  const offenders = [];
  for (const m of HTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const attrs = m[1];
    const hasName = /aria-label|aria-labelledby|title=/.test(attrs);
    const text = m[2].replace(/<[^>]*>/g, '');
    const hasVisibleText = /[A-Za-z0-9]/.test(text);
    if (!hasName && !hasVisibleText) offenders.push(m[0].slice(0, 80));
  }
  assert.deepEqual(offenders, [], `icon-only buttons need aria-label:\n${offenders.join('\n')}`);
});

test('key interactive inputs have an accessible name', () => {
  const mustHaveName = [
    'runInputDist', 'runInputTime', 'rlDate',
  ];
  for (const id of mustHaveName) {
    const re = new RegExp(`<input\\b[^>]*\\bid="${id}"[^>]*>`);
    const tag = HTML.match(re)?.[0];
    assert.ok(tag, `input #${id} not found`);
    assert.match(tag, /aria-label|aria-labelledby/, `input #${id} needs an accessible name`);
  }
});

test('closed dialogs are inert/hidden, labelled, and make no aria-modal claim', () => {
  for (const m of HTML.matchAll(/<[a-z0-9]+\b([^>]*\brole="dialog"[^>]*)>/g)) {
    const attrs = m[1];
    assert.match(attrs, /aria-label|aria-labelledby/, `dialog missing a label: ${m[0].slice(0, 90)}`);
    assert.doesNotMatch(attrs, /aria-modal="true"/, `closed dialog falsely claims modal semantics: ${m[0].slice(0, 90)}`);
  }
  const roots = [...HTML.matchAll(/<[a-z0-9]+\b([^>]*\bdata-modal-root\b[^>]*)>/g)];
  assert.ok(roots.length >= 17, 'modal inventory unexpectedly shrank');
  for (const m of roots) {
    assert.match(m[1], /\binert\b/, `closed modal root is not inert: ${m[0].slice(0, 110)}`);
    assert.match(m[1], /aria-hidden="true"/, `closed modal root is not hidden: ${m[0].slice(0, 110)}`);
  }
});

test('viewport allows zoom (no user-scalable=no / maximum-scale=1)', () => {
  const vp = HTML.match(/<meta[^>]*name="viewport"[^>]*>/)?.[0] || '';
  assert.doesNotMatch(vp, /user-scalable\s*=\s*no/i, 'viewport must not disable zoom');
  assert.doesNotMatch(vp, /maximum-scale\s*=\s*1(\.0)?\b/i, 'viewport must not clamp zoom');
});

test('the native hidden contract wins over component display rules', () => {
  assert.match(CSS, /\[hidden\]\s*\{\s*display:\s*none\s*!important;/,
    'dynamic hidden controls must not be resurfaced by .btn display rules');
});

test('the settings switch component keeps an accessible name and a 42×24 track', () => {
  const components = readFileSync(new URL('../js/settings/components.js', import.meta.url), 'utf8');
  assert.match(components, /aria-label="\$\{escapeHTML\(input\.label\)\}"/, 'toggleControl must name the input');
  assert.match(components, /data-setting-key="\$\{escapeHTML\(input\.key\)\}"/, 'toggleControl must carry the registry key');
  const settingsCss = readFileSync(new URL('../css/settings.css', import.meta.url), 'utf8');
  assert.match(settingsCss, /\.s-switch__track\s*\{[^}]*width:\s*42px;[^}]*height:\s*24px;/s,
    'the switch paint must stay 42×24; only the label hit area grows');
  assert.match(settingsCss, /\.s-switch\s*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;/s,
    'the switch hit area is 48px');
});

test('.hc-data-toggle is a 44px target with centred content', () => {
  const body = CSS.match(/\.hc-data-toggle\s*\{([^}]*)\}/)?.[1];
  assert.ok(body, '.hc-data-toggle rule not found');
  assert.match(body, /min-height:\s*var\(--touch-target\)/, '.hc-data-toggle must be a 44px target');
  assert.match(body, /align-items:\s*center/, '.hc-data-toggle content must stay centred');
});
