// =============================================================================
// PHOTO VIEWER — COMPARE PICKER
//
// Two photos side by side is a comparison of DIFFERENT days. The picker must
// exclude the photo already open, dedup a repeated record and stay newest-first;
// that ordering is pure, so it is tested without a DOM.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareDates } from '../js/ui/photo-viewer.js';

test('the comparison list excludes the open photo and is newest first', () => {
  assert.deepEqual(
    compareDates(['2026-11-01', '2026-11-20', '2026-11-10'], '2026-11-10'),
    ['2026-11-20', '2026-11-01'],
  );
});

test('a duplicated or malformed photo record cannot offer an unusable choice', () => {
  assert.deepEqual(
    compareDates(['2026-11-20', '2026-11-20', '', null, 'not-a-date', 42], '2026-11-10'),
    ['2026-11-20'],
  );
});

test('one photo means nothing to compare with', () => {
  assert.deepEqual(compareDates(['2026-11-10'], '2026-11-10'), []);
  assert.deepEqual(compareDates([], '2026-11-10'), []);
  assert.deepEqual(compareDates(undefined, '2026-11-10'), []);
});
