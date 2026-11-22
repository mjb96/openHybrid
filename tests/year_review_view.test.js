// =============================================================================
// YEAR IN REVIEW — RENDER GUARD
//
// The heading now lives inside `#yearReviewContainer`, because `.section-header`
// is `display:flex !important` and a `hidden` attribute on the h2 alone is inert.
// These tests pin the season boundary, the January (prior-year) copy, the empty
// states, units, the capped PR label and the decorative aria-hidden glyphs.
// =============================================================================
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const store = new Map();
function makeEl() {
  return { hidden: false, innerHTML: '' };
}
const getEl = (id) => { if (!store.has(id)) store.set(id, makeEl()); return store.get(id); };

let view;
before(async () => {
  globalThis.document = { getElementById: getEl };
  view = await import('../js/analytics/views/view-year-review.js');
});

const work = (w, r) => ({ c: true, w: String(w), r: String(r) });
function stateWith(weeks, settings = {}) {
  return {
    settings: { weightUnit: 'kg', distanceUnit: 'km', theme: 'dark', ...settings },
    weeks,
  };
}
const oneLift = (date, weight = 100) => ({
  dates: { mon: date },
  lifts: { mon: { 'Back Squat': [work(weight, 5)] } },
});

test('off-season clears and hides the section, heading included', () => {
  const el = getEl('yearReviewContainer');
  el.hidden = false;
  el.innerHTML = '<h2 class="section-header">stale</h2>';
  view.renderYearInReview(stateWith({ '1': oneLift('2026-03-10') }), [], '2027-06-15');
  assert.equal(el.hidden, true);
  assert.equal(el.innerHTML, '', 'no heading or stale copy may survive outside the season');
});

test('December renders the current partial year with the heading inside the container', () => {
  view.renderYearInReview(stateWith({ '1': oneLift('2026-03-10') }), [], '2026-12-15');
  const el = getEl('yearReviewContainer');
  const html = el.innerHTML;
  assert.equal(el.hidden, false);
  assert.match(html, /^<h2 class="section-header mt-2">Year in Review<\/h2>/);
  assert.match(html, /Your year so far/);
  assert.match(html, /Jan 1 – Dec 15, 2026/);
  assert.match(html, /2026/);
});

test('January recaps the finished prior year, not the new empty one', () => {
  view.renderYearInReview(stateWith({ '1': oneLift('2026-03-10') }), [], '2027-01-15');
  const html = getEl('yearReviewContainer').innerHTML;
  assert.match(html, /Year in Review/);
  assert.match(html, /Jan 1 – Dec 31, 2026/);
  assert.match(html, /Your year/);
  assert.doesNotMatch(html, /so far/);
  assert.match(html, />2026</);
});

test('an untrained past year says sessions WERE logged; a partial year says yet', () => {
  view.renderYearInReview(stateWith({}), [], '2027-01-15');
  assert.match(getEl('yearReviewContainer').innerHTML, /No sessions were logged in 2026\./);
  assert.doesNotMatch(getEl('yearReviewContainer').innerHTML, /yet/);

  view.renderYearInReview(stateWith({}), [], '2026-12-15');
  assert.match(getEl('yearReviewContainer').innerHTML, /No sessions logged in 2026 yet\./);
});

test('a lbs profile labels stored volume as pounds, never converting it', () => {
  view.renderYearInReview(
    stateWith({ '1': { dates: { mon: '2026-03-10' }, lifts: { mon: { 'Back Squat': [work(2810, 5)] } } } }, { weightUnit: 'lbs' }),
    [],
    '2026-12-15',
  );
  const html = getEl('yearReviewContainer').innerHTML;
  assert.match(html, /14,050 lb/);
  assert.doesNotMatch(html, /kg/, 'no kilogram label may leak into an lbs profile');
});

test('a light-theme profile renders the same values as dark', () => {
  const weeks = { '1': oneLift('2026-03-10') };
  view.renderYearInReview(stateWith(weeks, { theme: 'dark' }), [], '2026-12-15');
  const dark = getEl('yearReviewContainer').innerHTML;
  view.renderYearInReview(stateWith(weeks, { theme: 'light' }), [], '2026-12-15');
  const light = getEl('yearReviewContainer').innerHTML;
  assert.equal(light, dark, 'theme is CSS, not a different recap');
});

test('decorative glyphs are aria-hidden in both states', () => {
  view.renderYearInReview(stateWith({}), [], '2026-12-15');
  assert.match(getEl('yearReviewContainer').innerHTML, /<div aria-hidden="true"[^>]*>📅<\/div>/);
  view.renderYearInReview(
    stateWith({ '1': oneLift('2026-01-10'), '2': oneLift('2026-03-10', 110) }),
    [],
    '2026-12-15',
  );
  assert.match(getEl('yearReviewContainer').innerHTML, /<span aria-hidden="true">🏆<\/span>/);
});

test('a capped PR list says it is the biggest, and renders only five', () => {
  const weeks = {};
  ['01', '02', '03', '04', '05', '06', '07'].forEach((month, i) => {
    weeks[String(i + 1)] = oneLift(`2026-${month}-10`, 100 + i * 5);
  });
  view.renderYearInReview(stateWith(weeks), [], '2026-12-15');
  const html = getEl('yearReviewContainer').innerHTML;
  assert.match(html, /Biggest e1RM PRs/);
  assert.equal((html.match(/<span aria-hidden="true">🏆<\/span>/g) || []).length, 5);
  assert.match(html, /e1RM PRs<\/div>/);
});
