// =============================================================================
// PROGRESS ACTION DISPATCH
//
// The regression this locks: the handler used to resolve a range/focus control
// FIRST and bail when it found none, which silently disabled Share, Export
// photos and Delete photo — none of which carries a data-pg-* attribute. Tapping
// them did nothing, and the photo export is the only backup path for photo
// bytes (Android allowBackup=false).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressControlTarget } from '../js/analytics.js';

/** Minimal element stub: matches the first selector it was built with. */
function el(selector) {
  return {
    closest(wanted) {
      return wanted.split(',').map((part) => part.trim()).includes(selector) ? { getAttribute: () => null } : null;
    },
  };
}

test('every Progress action is reachable, including the non-control ones', () => {
  assert.equal(progressControlTarget(el('[data-action="share-progress"]')), 'share-progress');
  assert.equal(progressControlTarget(el('[data-action="export-photos"]')), 'export-photos');
  assert.equal(progressControlTarget(el('[data-photo-delete]')), 'delete-photo');
});

test('the three controls keep their actions', () => {
  assert.equal(progressControlTarget(el('[data-pg-range]')), 'range');
  assert.equal(progressControlTarget(el('[data-pg-focus]')), 'focus');
  assert.equal(progressControlTarget(el('[data-pg-grouping]')), 'grouping');
});

test('an unrelated element is not an action', () => {
  assert.equal(progressControlTarget(el('[data-action="open-customize"]')), null);
  assert.equal(progressControlTarget(null), null);
  assert.equal(progressControlTarget({}), null);
});
