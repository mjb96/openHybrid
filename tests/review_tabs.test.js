// =============================================================================
// PG4 — ONE Review surface: Week | Month | Year
//
// The hub row and the screen now speak the same three periods. The tab is also
// the screen's time scope, so only Week follows the shared week navigator.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getReviewTab,
  reviewTabBar,
  setReviewTab,
} from '../js/analytics/views/view-weekly-review.js';

test('the period bar is Week | Month | Year, never a fake tablist', () => {
  const html = reviewTabBar('month');
  assert.match(html, /role="group"/);
  assert.doesNotMatch(html, /role="tablist"/);
  assert.equal((html.match(/data-an-tab="/g) || []).length, 3);
  assert.match(html, /data-an-tab="week"/);
  assert.match(html, /data-an-tab="month"[^>]*aria-pressed="true"/);
  assert.match(html, /data-an-tab="year"/);
});

test('only the active period is marked pressed', () => {
  const html = reviewTabBar('year');
  assert.match(html, /data-an-tab="year"[^>]*aria-pressed="true"/);
  assert.match(html, /data-an-tab="week"[^>]*aria-pressed="false"/);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
});

test('setReviewTab accepts only real periods; legacy names land on Week', () => {
  setReviewTab('month');
  assert.equal(getReviewTab(), 'month');
  setReviewTab('year');
  assert.equal(getReviewTab(), 'year');
  setReviewTab('week');
  assert.equal(getReviewTab(), 'week');
  setReviewTab('stats');
  assert.equal(getReviewTab(), 'week', 'the retired Stats tab lands on Week');
  setReviewTab('overview');
  assert.equal(getReviewTab(), 'week', 'the retired Overview tab lands on Week');
  setReviewTab('nonsense');
  assert.equal(getReviewTab(), 'week');
});
