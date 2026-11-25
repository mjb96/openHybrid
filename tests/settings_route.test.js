// =============================================================================
// SETTINGS ROUTE (pure)
//
// The route token is what browser Back and a deep link both act on. These
// tests pin the canonical hashes, the Profile sub-page and the legacy redirects
// that must keep working.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS_HASH, settingsHashForPage, settingsRouteFromHash } from '../js/settings/route.js';

test('the canonical Settings and Profile routes parse one level at a time', () => {
  assert.equal(SETTINGS_HASH, '#/settings');
  assert.deepEqual(settingsRouteFromHash('#/settings'), { page: '', rest: [], legacy: false });
  assert.deepEqual(settingsRouteFromHash('#/settings/profile'), { page: 'profile', rest: [], legacy: false });
});

test('a setting page keeps its remaining path segments', () => {
  assert.deepEqual(settingsRouteFromHash('#/settings/workout/rest-timer'), {
    page: 'workout', rest: ['rest-timer'], legacy: false,
  });
});

test('legacy profile and settings hashes redirect to the canonical model', () => {
  assert.deepEqual(settingsRouteFromHash('#profile'), { page: 'profile', rest: [], legacy: true });
  assert.deepEqual(settingsRouteFromHash('#/profile'), { page: 'profile', rest: [], legacy: true });
  assert.deepEqual(settingsRouteFromHash('#settings'), { page: '', rest: [], legacy: false });
  assert.deepEqual(settingsRouteFromHash('#/settings/'), { page: '', rest: [], legacy: false });
});

test('anything else is not a Settings route', () => {
  for (const hash of ['', '#', '#/', '#/home', '#/settingsish', '#/settings?x=1', '#other']) {
    assert.equal(settingsRouteFromHash(hash), null, hash || '(empty)');
  }
});

test('canonical hashes round-trip, including pushed pages', () => {
  assert.equal(settingsHashForPage(), '#/settings');
  assert.equal(settingsHashForPage('profile'), '#/settings/profile');
  assert.equal(settingsHashForPage('workout'), '#/settings/workout');
  assert.equal(settingsHashForPage('look-home'), '#/settings/look-home');
});
