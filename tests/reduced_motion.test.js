// ==========================================
// REDUCED MOTION TEST (tests/reduced_motion.test.js)
// H1/ST8: an explicit preference on top of the OS media query.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  applyMotionPreference,
  effectiveReducedMotion,
  normalizeMotionPreference,
} from '../js/ui/motion.js';

test('normalizeMotionPreference keeps the three choices and defaults to system', () => {
  assert.equal(normalizeMotionPreference('system'), 'system');
  assert.equal(normalizeMotionPreference('reduce'), 'reduce');
  assert.equal(normalizeMotionPreference('full'), 'full');
  assert.equal(normalizeMotionPreference(''), 'system');
  assert.equal(normalizeMotionPreference(undefined), 'system');
});

test('system follows the OS; explicit choices win', () => {
  assert.equal(effectiveReducedMotion('system', true), 'reduce');
  assert.equal(effectiveReducedMotion('system', false), 'full');
  assert.equal(effectiveReducedMotion('reduce', false), 'reduce');
  assert.equal(effectiveReducedMotion('full', true), 'full');
});

test('applyMotionPreference publishes both the effective and chosen value', () => {
  const documentElement = { dataset: {} };
  const doc = { documentElement };
  const media = () => ({ matches: true });
  assert.equal(applyMotionPreference('system', { document: doc, matchMedia: media }), 'reduce');
  assert.equal(documentElement.dataset.reducedMotion, 'reduce');
  assert.equal(documentElement.dataset.reducedMotionPref, 'system');
  applyMotionPreference('full', { document: doc, matchMedia: media });
  assert.equal(documentElement.dataset.reducedMotion, 'full');
  assert.equal(documentElement.dataset.reducedMotionPref, 'full');
});
