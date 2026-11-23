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
  // The add tile opens the dated entry through the app router
  // (`open-ms-sheet`), not this dispatcher: one action for one tile, on both
  // screens. A resurrected `pick-photo` branch would be a second photo path.
  assert.equal(progressControlTarget(el('[data-action="pick-progress-photo"]')), null);
});

test('the three controls keep their actions', () => {
  assert.equal(progressControlTarget(el('[data-pg-range]')), 'range');
  assert.equal(progressControlTarget(el('[data-pg-focus]')), 'focus');
  assert.equal(progressControlTarget(el('[data-pg-grouping]')), 'grouping');
});

/** An element that matches several selectors — used to lock the ORDER. */
function multi(selectors) {
  return {
    closest(wanted) {
      const parts = wanted.split(',').map((part) => part.trim());
      return selectors.some((selector) => parts.includes(selector)) ? { getAttribute: () => null } : null;
    },
  };
}

test('Measures actions resolve before the range/focus/grouping controls', () => {
  assert.equal(progressControlTarget(el('[data-measures-mode]')), 'measures-mode');
  assert.equal(progressControlTarget(el('[data-measure-delete]')), 'measures-delete');
  // The leaf's own range must not be mistaken for the hub control.
  assert.equal(progressControlTarget(el('[data-ms-range]')), 'measure-range');
  // The order lock: neither carries a data-pg-* marker, but if one ever did the
  // Measures action still wins — the same failure that disabled Share/Export.
  assert.equal(progressControlTarget(multi(['[data-measures-mode]', '[data-pg-range]'])), 'measures-mode');
  assert.equal(progressControlTarget(multi(['[data-measure-delete]', '[data-pg-focus]'])), 'measures-delete');
  assert.equal(progressControlTarget(multi(['[data-ms-range]', '[data-pg-range]'])), 'measure-range');
});

test('an unrelated element is not an action', () => {
  assert.equal(progressControlTarget(el('[data-action="open-customize"]')), null);
  assert.equal(progressControlTarget(null), null);
  assert.equal(progressControlTarget({}), null);
});
