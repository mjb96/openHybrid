// =============================================================================
// PROGRESS SHARE CARD — the rows come from the same models the bands render, so
// the image cannot disagree with the screen.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  drawProgressCard, monthlyReportShareRows, weeklyReviewShareRows, yearReviewShareRows,
} from '../js/analytics/share-card.js';
import { buildCalendarMonthReport } from '../js/brain/monthly-report.js';
import { buildYearInReview } from '../js/brain/year-review.js';

/** A recording 2d context: no canvas implementation in node. */
function fakeCanvas() {
  const calls = [];
  const ctx = {
    calls,
    set fillStyle(value) { calls.push(['fillStyle', value]); },
    set font(value) { calls.push(['font', value]); },
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    fillText: (text, x, y) => calls.push(['fillText', text, x, y]),
    measureText: (text) => ({ width: String(text).length * 10 }),
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx };
  globalThis.document = { createElement: () => canvas };
  return { canvas, ctx };
}

test('the card draws a headline and one row per band', () => {
  const { ctx } = fakeCanvas();
  const rows = [
    { bandId: 'pulse', value: '4 sessions', note: '3-week streak' },
    { bandId: 'muscles', value: '96 sets', note: '12 muscles' },
  ];
  drawProgressCard(rows, { title: 'Training progress', subtitle: '23–29 Nov' });
  const texts = ctx.calls.filter((call) => call[0] === 'fillText').map((call) => call[1]);
  assert.ok(texts.includes('Training progress'));
  assert.ok(texts.includes('23–29 Nov'));
  assert.ok(texts.includes('4 sessions'));
  assert.ok(texts.includes('96 sets'));
  assert.ok(texts.includes('THIS WEEK'), 'band labels are human words, not ids');
});

test('empty rows still produce a card rather than a blank canvas', () => {
  const { ctx, canvas } = fakeCanvas();
  drawProgressCard([], { title: 'Training progress' });
  assert.equal(canvas.width, 1080);
  assert.ok(ctx.calls.some((call) => call[0] === 'fillRect'));
});

test('a generic label can replace the band vocabulary for report cards', () => {
  const { ctx } = fakeCanvas();
  drawProgressCard([{ label: 'Sessions', value: '7' }], { title: 'Training Report' });
  const texts = ctx.calls.filter((call) => call[0] === 'fillText').map((call) => call[1]);
  assert.ok(texts.includes('SESSIONS'));
  assert.ok(texts.includes('7'));
});

test('monthly report rows are the figures the Training Report screen shows', () => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      '1': { dates: { mon: '2026-07-01' }, lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } }, runs: {} },
    },
  };
  const report = buildCalendarMonthReport(state, days, null, new Date('2026-07-02T12:00:00+10:00'));
  const rows = monthlyReportShareRows(report, state);
  assert.deepEqual(rows.map((row) => row.label), [
    'Sessions', 'Lifted', 'Run', 'Avg score', 'Fitness', 'Adherence',
  ]);
  assert.equal(rows[0].value, '1');
  assert.equal(rows[0].note, '1 active day');
  assert.equal(rows[1].value, '500 kg');
  assert.equal(rows[2].value, '0 km');
  assert.equal(rows[3].value, '—');
  assert.equal(rows[4].value, 'CTL 0');
  assert.equal(rows[5].value, '0%');
});

test('year review rows are the same annual totals the Year in Review prints', () => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      '1': { dates: { mon: '2026-07-01' }, lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } }, runs: {} },
    },
  };
  const review = buildYearInReview(state, days, { year: 2026, today: '2026-12-15' });
  const rows = yearReviewShareRows(review, state);
  assert.deepEqual(rows.map((row) => row.label), [
    'Sessions', 'Lifted', 'Run', 'Working sets', 'e1RM PRs', 'Most trained',
  ]);
  assert.equal(rows[0].value, String(review.totals.sessions));
  assert.equal(rows[1].value, '500 kg');
  assert.equal(rows[3].value, String(review.totals.workingSets));
  assert.equal(rows[4].value, String(review.totals.prCount));
  assert.equal(rows[5].value, review.bestMonth.label);
});

test('week review rows keep adherence and focus only on the live week', () => {
  const state = { settings: { weightUnit: 'kg', distanceUnit: 'km' } };
  const live = {
    label: '23–29 Nov',
    isCurrentWeek: true,
    weekStart: '2026-11-23',
    totals: { sessions: 4, volume: 12000, distanceKm: 10, sets: 20, prCount: 2 },
    consistency: { done: 4, total: 4, pct: 100 },
    focus: { area: 'Recovery' },
  };
  const rows = weeklyReviewShareRows(live, state);
  assert.deepEqual(rows.map((row) => row.label), [
    'Sessions', 'Lifted', 'Run', 'e1RM PR lifts', 'Plan adherence', 'Focus',
  ]);
  assert.equal(rows[0].value, '4');
  assert.equal(rows[1].value, '12.0t');
  assert.equal(rows[2].value, '10 km');
  assert.equal(rows[4].value, '100%');
  assert.equal(rows[4].note, '4 of 4 planned');

  const historical = weeklyReviewShareRows({
    ...live,
    isCurrentWeek: false,
    consistency: { done: 4, total: null, pct: null },
    focus: null,
  }, state);
  assert.equal(historical.some((row) => row.label === 'Plan adherence'), false);
  assert.equal(historical.some((row) => row.label === 'Focus'), false);
});

test('more than seven rows are capped, and empty values are dropped', () => {
  const { ctx } = fakeCanvas();
  const many = Array.from({ length: 10 }, (_, i) => ({ bandId: 'pulse', value: `${i} sessions` }));
  drawProgressCard([...many, { bandId: 'body', value: '' }]);
  const values = ctx.calls.filter((call) => call[0] === 'fillText').map((call) => String(call[1]));
  assert.equal(values.includes('9 sessions'), false, 'capped at seven');
  assert.equal(values.some((text) => text === ''), false, 'no empty row drawn');
});
