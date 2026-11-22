// =============================================================================
// WEEK IN REVIEW — RENDER GUARD (Stats tab block)
//
// The builder resolve alone does not stop the view from re-introducing the
// defect: the Stats "Week in Review" block used to print a plan-adherence bar
// and "Next week's focus" for ANY review, so a week from an old programme was
// scored against the active plan and given advice for a week that had already
// happened. These tests render the block through a minimal DOM and assert that a
// historical week contains neither claim, while the live week keeps both.
// =============================================================================
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyReview } from '../js/brain/weekly-review.js';
import { addDaysISO } from '../js/analytics/weekly-aggregate.js';

const noop = () => {};
const store = new Map();
function makeEl(id) {
  const el = {
    id: id || '', setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    appendChild: c => c, insertBefore: c => c, removeChild: noop, remove: noop,
    addEventListener: noop, removeEventListener: noop, querySelector: () => null,
    querySelectorAll: () => [], closest: () => null, contains: () => false, click: noop,
    focus: noop, style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, children: [],
  };
  let html = '';
  Object.defineProperty(el, 'innerHTML', { get: () => html, set: x => { html = String(x); } });
  Object.defineProperty(el, 'textContent', { get: () => '', set: noop });
  return el;
}
const getEl = (id) => { if (!store.has(id)) store.set(id, makeEl(id)); return store.get(id); };

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TODAY = '2026-11-20'; // Friday
const W2 = '2026-11-09';
const W3 = '2026-11-16';

const PROGRAM5 = {
  totalWeeks: 12,
  days: {
    mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] },
    tue: { title: 'Run', runs: '5k easy' },
    wed: { title: 'Press', runs: 'Rest', lifts: [{ name: 'Bench Press' }] },
    thu: { title: 'Lower', runs: 'Rest', lifts: [{ name: 'Deadlift' }] },
    fri: { title: 'Upper', runs: 'Rest', lifts: [{ name: 'Barbell Row' }] },
  },
};

function weekData(startMonday, weight, dist) {
  return {
    lifts: { mon: { 'Back Squat': [{ w: String(weight), r: 5, c: true }, { w: String(weight), r: 5, c: true }] } },
    runs: {},
    runSessions: {
      wed: [{
        sessionId: `run-${startMonday}`, dist: String(dist), time: '25:00', rpe: '6',
        localDate: addDaysISO(startMonday, 2), source: 'gps',
      }],
    },
    gymRpe: { mon: '7' },
    gymStats: { mon: { time: '45:00' } },
    dates: { mon: startMonday, wed: addDaysISO(startMonday, 2) },
    sessionStatus: { mon: 'finished' },
  };
}

function makeState() {
  return {
    currentWeek: '3',
    weekStartedAt: W3,
    settings: { fitnessLevel: 'intermediate', weightUnit: 'kg', distanceUnit: 'km' },
    weeks: { '2': weekData(W2, 105, 6), '3': weekData(W3, 110, 7) },
    loadMetrics: { atl: 9, ctl: 10 },
    hybridScore: {
      xp: 900, lastRecordedDate: TODAY,
      history: [{ date: '2026-11-18', score: 78, level: 2 }, { date: TODAY, score: 84, level: 2 }],
    },
  };
}

let view;
before(async () => {
  globalThis.document = {
    getElementById: getEl, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => makeEl(), addEventListener: noop, body: makeEl('body'),
  };
  view = await import('../js/analytics/views/view-weekly-review.js');
});

test('the live week keeps its adherence bar and next-week focus', () => {
  const state = makeState();
  const review = buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: W3 });
  view.renderWeeklyReview(review, state);
  const html = getEl('weeklyReviewContainer').innerHTML;
  assert.match(html, /Plan adherence/);
  assert.match(html, /2\/5/);
  assert.match(html, /Next week's focus/);
});

test('a historical week renders no plan adherence bar and no next-week advice', () => {
  const state = makeState();
  const review = buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: W2 });
  view.renderWeeklyReview(review, state);
  const html = getEl('weeklyReviewContainer').innerHTML;
  // What it DID do still shows …
  assert.match(html, /1\.1t/);
  assert.match(html, /6 km/);
  assert.match(html, /wrev-stat__v">2<\/div><div class="wrev-stat__k">Sessions/);
  assert.match(html, /wrev-stat__v">0<\/div><div class="wrev-stat__k">PRs/);
  // … but the active plan and the coming week are not claims about that week.
  assert.doesNotMatch(html, /Plan adherence/);
  assert.doesNotMatch(html, /wrev-bar/);
  assert.doesNotMatch(html, /Next week/i);
  assert.doesNotMatch(html, /\/5 planned/);
  // The block names the week it is actually describing.
  assert.match(html, /Week of 9–15 Nov/);
});

test('an empty historical week renders the empty state, not a zero-score story', () => {
  const state = makeState();
  const review = buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: '2026-06-01' });
  view.renderWeeklyReview(review, state);
  const html = getEl('weeklyReviewContainer').innerHTML;
  assert.match(html, /Nothing logged that week/);
  assert.doesNotMatch(html, /builds itself as you train/);
  assert.doesNotMatch(html, /wrev-stat/);
  assert.doesNotMatch(html, /Next week/i);
});

test('the Overview tab drops the plan and focus cards for a historical week', () => {
  const state = makeState();
  const body = getEl('review-tab-body');

  view.renderReviewOverview(body, buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: W2 }));
  const past = body.innerHTML;
  assert.match(past, /9–15 Nov/);
  assert.match(past, /logged that week/);
  assert.doesNotMatch(past, /Adherence/);
  assert.doesNotMatch(past, /planned/);
  assert.doesNotMatch(past, /next week/i);
  assert.doesNotMatch(past, /Hybrid Score/);

  view.renderReviewOverview(body, buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: W3 }));
  const live = body.innerHTML;
  assert.match(live, /Adherence/);
  assert.match(live, /2\/5 planned/);
  assert.match(live, /next week/i);
});

test('an empty historical Overview says so in the past tense', () => {
  const state = makeState();
  const body = getEl('review-tab-body');
  view.renderReviewOverview(body, buildWeeklyReview(state, DAYS, PROGRAM5, { today: TODAY, weekStart: '2026-06-01' }));
  assert.match(body.innerHTML, /No training was recorded that week/);
  assert.doesNotMatch(body.innerHTML, /builds itself as you train/);
  assert.doesNotMatch(body.innerHTML, /next week/i);
});
