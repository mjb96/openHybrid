// =============================================================================
// H5 — the block review presenter: one action, no deload order
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockReview } from '../js/analytics/block-review.js';
import { blockReviewHTML } from '../js/analytics/views/view-block-review.js';

const set = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const day = (date, lifts) => ({ dates: { mon: date }, lifts: { mon: lifts }, gymStats: { mon: { time: '45:00' } }, runs: {}, runSessions: {} });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });
const TODAY = '2026-11-25';

function modelWith(checks = []) {
  return buildBlockReview(stateWith([
    day('2026-10-05', { 'Back Squat': [set(95)] }),
    day('2026-11-02', { 'Back Squat': [set(100)] }),
    day('2026-11-04', { 'Back Squat': [set(100)] }),
    day('2026-11-09', { 'Back Squat': [set(102.5)] }),
    day('2026-11-11', { 'Back Squat': [set(102.5)] }),
    day('2026-11-16', { 'Back Squat': [set(105)] }),
    day('2026-11-18', { 'Back Squat': [set(105)] }),
    day('2026-11-22', { 'Back Squat': [set(105)] }),
  ]), { todayISO: TODAY, checks });
}

test('the review states the period, totals, status and top lift', () => {
  const html = blockReviewHTML(modelWith(), { unit: 'kg' });
  assert.match(html, /class="pg-block"/);
  assert.match(html, /Block review/);
  assert.match(html, /26 Oct – 22 Nov 2026/);
  assert.match(html, /On track/);
  assert.match(html, /sessions/);
  assert.match(html, /lifted/);
  assert.match(html, /Back Squat/);
  assert.match(html, /122\.5 kg/);
  assert.match(html, /PR/);
});

test('engine progress checks are quoted and change the status', () => {
  const html = blockReviewHTML(modelWith([
    { lift: 'Back Squat', message: 'Back Squat has not meaningfully improved.', target: '4 × 5' },
    { lift: 'Bench Press', message: 'Bench Press has not meaningfully improved.', target: '4 × 5' },
  ]), { unit: 'kg' });
  assert.match(html, /Needs a look/);
  assert.match(html, /Back Squat has not meaningfully improved\./);
  assert.match(html, /2 lifts are on progress checks/);
});

test('the unit comes from the caller, never a literal', () => {
  const html = blockReviewHTML(modelWith(), { unit: 'lbs' });
  assert.match(html, /270\.1 lbs/);
  assert.doesNotMatch(html, /122\.5 kg/);
});

test('one action opens the plan; no deload command exists yet', () => {
  const html = blockReviewHTML(modelWith(), { unit: 'kg' });
  assert.match(html, /data-action="switch-tab" data-target="program"/);
  assert.match(html, /Review the plan/);
  assert.doesNotMatch(html, /Deload next week/i);
});

test('a missing model renders nothing', () => {
  assert.equal(blockReviewHTML(null), '');
});

test('a stalled review offers the deload only on an editable plan', () => {
  const checks = [
    { lift: 'Back Squat', message: 'Back Squat has not improved.', target: '4 × 5' },
    { lift: 'Bench Press', message: 'Bench Press has not improved.', target: '4 × 5' },
  ];
  const stalled = { ...modelWith(checks), deloadEligible: true, nextWeek: 5, nextWeekIsDeload: false };
  const editable = blockReviewHTML(stalled, { unit: 'kg', deload: { editable: true } });
  assert.match(editable, /data-action="apply-block-deload" data-week="5"/);
  assert.match(editable, /Deload week 5/);

  const shared = blockReviewHTML(stalled, { unit: 'kg', deload: { editable: false } });
  assert.match(shared, /Customize to deload/);
  assert.doesNotMatch(shared, /apply-block-deload/);

  const already = blockReviewHTML({ ...stalled, nextWeekIsDeload: true }, { unit: 'kg', deload: { editable: true } });
  assert.match(already, /Week 5 is already a deload/);
  assert.doesNotMatch(already, /apply-block-deload/);

  const notEligible = blockReviewHTML({ ...stalled, deloadEligible: false }, { unit: 'kg', deload: { editable: true } });
  assert.match(notEligible, /Review the plan/);
  assert.doesNotMatch(notEligible, /apply-block-deload/);
});
