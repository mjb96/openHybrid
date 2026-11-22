// =============================================================================
// STRENGTH — SELECTED-WEEK COPY (tests/strength_selected_week.test.js)
//
// The Strength screen follows the shared calendar-week navigator. Its sessions
// strip, e1RM card and PR list must therefore describe the SELECTED week:
// "this week" is only true for the live week, a past week is "that week" or its
// real Mon–Sun range. These tests pin the words, not just the numbers.
// =============================================================================
import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  strengthSessionsStripHTML, weeklyE1rmCard, render1RMList,
} from '../js/analytics/views/view-strength.js';
import { weekStartOf, localDayKey, addDaysISO } from '../js/analytics/weekly-aggregate.js';
import { formatWeekRange } from '../js/dates.js';
import {
  initWeekNav, updateWeekNavDisplay, resetWeekNav,
} from '../js/analytics/week-nav.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const completed = (w, r) => ({ c: true, w: String(w), r: String(r) });

const TODAY = localDayKey(new Date());
const THIS_WEEK = weekStartOf(TODAY);
const LAST_WEEK = addDaysISO(THIS_WEEK, -7);
const OLD_WEEK = addDaysISO(THIS_WEEK, -28);

function selectedWeekState() {
  return {
    activeProgramId: 'strength-week-test',
    currentWeek: '2',
    settings: { weightUnit: 'kg' },
    customPrograms: [{
      id: 'strength-week-test',
      name: 'Week Test',
      totalWeeks: 8,
      days: { mon: { title: 'Upper Strength' }, tue: { title: 'Lower Strength' } },
    }],
    weeks: {
      '1': {
        programId: 'strength-week-test', sessionTitle: 'Last Upper',
        dates: { mon: LAST_WEEK },
        lifts: { mon: { 'Bench Press': [completed(80, 5), completed(80, 5)] } },
      },
      '2': {
        programId: 'strength-week-test', sessionTitle: 'This Upper',
        dates: { mon: THIS_WEEK },
        lifts: { mon: { 'Back Squat': [completed(100, 5)] } },
      },
      '3': {
        programId: 'strength-week-test', sessionTitle: 'Old Upper',
        dates: { mon: OLD_WEEK },
        lifts: { mon: { 'Deadlift': [completed(120, 5)] } },
      },
    },
  };
}

beforeEach(() => { resetWeekNav(); });
afterEach(() => { resetWeekNav(); delete globalThis.document; });

test('the sessions strip names and shows the selected calendar week', () => {
  const state = selectedWeekState();

  const live = strengthSessionsStripHTML(state, DAYS, { weekStart: THIS_WEEK });
  assert.match(live, /This week's sessions/);
  assert.match(live, /This Upper/);
  assert.match(live, /500 kg vol/);
  assert.doesNotMatch(live, /Last Upper/);

  const previous = strengthSessionsStripHTML(state, DAYS, { weekStart: LAST_WEEK });
  assert.match(previous, /Previous week's sessions/);
  assert.match(previous, /Last Upper/);
  assert.match(previous, /800 kg vol/);
  assert.doesNotMatch(previous, /This week's sessions/);

  const older = strengthSessionsStripHTML(state, DAYS, { weekStart: OLD_WEEK });
  assert.match(older, new RegExp(`${formatWeekRange(OLD_WEEK, addDaysISO(OLD_WEEK, 6))} sessions`));
  assert.doesNotMatch(older, /this week/i);
});

test('the strip reads the shared week navigator by default', () => {
  // A minimal fake DOM so the navigator's delegated listener can be driven.
  const makeEl = () => ({
    textContent: '', disabled: false, hidden: false, _listener: null,
    addEventListener(_t, fn) { this._listener = fn; },
  });
  const els = {
    weekNavLabel: makeEl(), weekNavDates: makeEl(),
    weekNavPrev: makeEl(), weekNavNext: makeEl(), weekNavToday: makeEl(),
  };
  const view = makeEl();
  globalThis.document = { getElementById: (id) => (id === 'view-analytics' ? view : els[id] || null) };

  const state = selectedWeekState();
  initWeekNav(() => state, () => {});
  updateWeekNavDisplay(() => state);

  // Step back one calendar week, then render the strip with its default week.
  view._listener({ target: { closest: (sel) => (sel === '#weekNavPrev' ? els.weekNavPrev : null) } });
  const html = strengthSessionsStripHTML(state, DAYS);
  assert.match(html, /Previous week's sessions/);
  assert.match(html, /Last Upper/);
  assert.doesNotMatch(html, /This Upper/);
});

test('the e1RM card says "No sets" and names the right period', () => {
  const liveEmpty = weeklyE1rmCard({ weekKey: THIS_WEEK, hasCurrentWork: false }, 'kg');
  assert.equal(liveEmpty.value, 'No sets');
  assert.equal(liveEmpty.sub, 'No strength work logged this week');

  const pastEmpty = weeklyE1rmCard({ weekKey: LAST_WEEK, hasCurrentWork: false, topChange: null, bestThisWeek: null }, 'kg');
  assert.equal(pastEmpty.value, 'No sets');
  assert.equal(pastEmpty.sub, 'No strength work logged that week');
});

test('the PR list copy follows the selected week', () => {
  const container = { innerHTML: '' };
  const dynamicStats = { 'Back Squat': { allTimeMax: 120 } };
  const curByLift = { 'Back Squat': { bestEstimated1RM: 120 } };

  render1RMList(container, dynamicStats, {
    curByLift, prevByLift: {}, prSet: new Set(['Back Squat']), isCurrentWeek: false,
  }, 'kg');
  assert.match(container.innerHTML, /PRs set that week/);
  assert.match(container.innerHTML, /That week: ~120 kg/);
  assert.doesNotMatch(container.innerHTML, /This week/);

  render1RMList(container, dynamicStats, {
    curByLift, prevByLift: {}, prSet: new Set(), isCurrentWeek: true,
  }, 'kg');
  assert.match(container.innerHTML, /This week: ~120 kg/);
  assert.doesNotMatch(container.innerHTML, /PRs set that week/);
});
