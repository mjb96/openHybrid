// =============================================================================
// THEME TOKENS
//
// The semantic layer is the only colour contract components may consume.
// These tests pin the Midnight/light values, the CSS definitions, and the
// subscribe/apply path used by canvas/SVG charts.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import {
  LIGHT_TOKENS, MIDNIGHT_TOKENS, TOKEN_KEYS, applyThemeTokens, resolveThemeTokens, useThemeTokens,
} from '../js/theme/tokens.js';

const CSS = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');

test('Midnight matches the approved semantic baseline', () => {
  assert.equal(MIDNIGHT_TOKENS.bg, '#060606');
  assert.equal(MIDNIGHT_TOKENS['surface-1'], '#111111');
  assert.equal(MIDNIGHT_TOKENS.text, '#F2F2F2');
  assert.equal(MIDNIGHT_TOKENS.accent, '#22D3EE');
  assert.equal(MIDNIGHT_TOKENS['on-accent'], '#04202A');
  assert.equal(MIDNIGHT_TOKENS['domain-strength'], '#7C8CFF');
  assert.equal(MIDNIGHT_TOKENS['data-8'], '#8A8A8A');
});

test('every JS token has a CSS custom property in both themes', () => {
  for (const key of TOKEN_KEYS) {
    const prop = `--${key}:`;
    assert.ok(CSS.split(prop).length >= 3, `${prop} is not defined in both :root and light`);
  }
});

test('light and dark expose the same token vocabulary', () => {
  assert.deepEqual(Object.keys(LIGHT_TOKENS).sort(), Object.keys(MIDNIGHT_TOKENS).sort());
});

test('applyThemeTokens writes the layer and useThemeTokens reacts', () => {
  const dom = new JSDOM('<!doctype html><html data-theme="dark"><body></body></html>');
  globalThis.window = dom.window;
  globalThis.CustomEvent = dom.window.CustomEvent;
  const root = dom.window.document.documentElement;
  const seen = [];
  const unsubscribe = useThemeTokens((tokens, mode) => seen.push({ tokens, mode }), root);
  assert.equal(seen.at(-1).mode, 'dark');
  applyThemeTokens(root);
  assert.equal(root.style.getPropertyValue('--accent'), '#22D3EE');

  root.setAttribute('data-theme', 'light');
  applyThemeTokens(root);
  assert.equal(root.style.getPropertyValue('--accent'), '#0E7490');
  assert.equal(seen.at(-1).mode, 'light');
  unsubscribe();
  applyThemeTokens(root);
  assert.equal(seen.length, 3, 'unsubscribe stops further callbacks');
  delete globalThis.window;
  delete globalThis.CustomEvent;
});

test('resolveThemeTokens follows data-theme, not the OS', () => {
  const dom = new JSDOM('<!doctype html><html data-theme="light"></html>');
  assert.equal(resolveThemeTokens(dom.window.document.documentElement)['surface-1'], '#FFFFFF');
});
