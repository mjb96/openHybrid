// =============================================================================
// RUNNING — SELECTED-WEEK FOLLOW-THROUGH (tests/running_selected_week.test.js)
//
// Reported from real use: after stepping the Progress hub back a week and
// opening Running, the navigator said "Previous week" while the weekly-distance
// card still showed THIS week's distance. The screen built its metric history
// from today, so the metric's through-date never moved with the navigator.
// =============================================================================
import { test, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { renderRunningAnalytics, setRunningTab } from '../js/analytics/views/view-running.js';
import { buildRunningMetricDetail, collectRunningHistory } from '../js/analytics/running-detail.js';
import { weekStartOf, localDayKey, addDaysISO } from '../js/analytics/weekly-aggregate.js';
import {
  initWeekNav, getSelectedWeekStart, resetWeekNav,
} from '../js/analytics/week-nav.js';

const TODAY = localDayKey(new Date());
const THIS_WEEK = weekStartOf(TODAY);
const LAST_WEEK = addDaysISO(THIS_WEEK, -7);
const TWO_WEEKS_AGO = addDaysISO(THIS_WEEK, -14);

const run = (sessionId, dist, time) => ({ sessionId, dist: String(dist), time, type: 'run', source: 'gps' });

/** 5 km this week, 12 km last week, 8 km the week before it. */
function selectedWeekState() {
  return {
    settings: { distanceUnit: 'km' },
    weeks: {
      '1': { dates: { mon: TWO_WEEKS_AGO }, runSessions: { mon: [run('two_weeks_ago', 8, '40:00')] } },
      '2': { dates: { mon: LAST_WEEK }, runSessions: { mon: [run('last_week', 12, '60:00')] } },
      '3': { dates: { mon: THIS_WEEK }, runSessions: { mon: [run('this_week', 5, '25:00')] } },
    },
  };
}

/** Minimal DOM: the analytics section, its rendered body, the nav elements. */
function installDom() {
  const makeEl = () => ({
    id: '', innerHTML: '', textContent: '', disabled: false, hidden: false, _listener: null,
    addEventListener(_type, fn) { this._listener = fn; },
    querySelectorAll: () => [],
  });
  const els = {
    'analytics-running': makeEl(),
    'running-tab-body': makeEl(),
    weekNavLabel: makeEl(), weekNavDates: makeEl(),
    weekNavPrev: makeEl(), weekNavNext: makeEl(), weekNavToday: makeEl(),
  };
  const view = makeEl();
  globalThis.document = {
    getElementById: (id) => (id === 'view-analytics' ? view : (els[id] || null)),
    querySelectorAll: () => [],
  };
  return { els, view };
}

function stepBack({ els, view }) {
  view._listener({ target: { closest: (selector) => (selector === '#weekNavPrev' ? els.weekNavPrev : null) } });
}

beforeEach(() => { resetWeekNav(); });
afterEach(() => { resetWeekNav(); delete globalThis.document; });

test('the Running screen shows the selected past week, not the live one', () => {
  const dom = installDom();
  const state = selectedWeekState();
  initWeekNav(() => state, () => {});

  setRunningTab('overview');
  renderRunningAnalytics({}, () => state, () => []);
  const live = dom.els['running-tab-body'].innerHTML;
  assert.match(live, /5\.0 km/);
  assert.doesNotMatch(live, /12\.0 km/);
  assert.match(live, /live calendar week/);

  stepBack(dom);
  assert.equal(getSelectedWeekStart(TODAY), LAST_WEEK, 'the navigator is on the previous week');

  setRunningTab('overview');
  renderRunningAnalytics({}, () => state, () => []);
  const past = dom.els['running-tab-body'].innerHTML;
  assert.match(past, /12\.0 km/, 'the card shows the selected week\u2019s distance');
  assert.doesNotMatch(past, /5\.0 km/, 'the live week must not leak into the selected week');
  assert.match(past, /completed calendar week/);
  assert.doesNotMatch(past, /live calendar week/);
});

test('the same selection carries a completed-week comparison, never live wording', () => {
  // The screen rebuilds its history with the selected week's Sunday as the
  // through-date. The metric model that consumes it must therefore compare the
  // completed week with the week before it.
  const dom = installDom();
  const state = selectedWeekState();
  initWeekNav(() => state, () => {});
  stepBack(dom);
  const weekStart = getSelectedWeekStart(TODAY);
  assert.equal(weekStart, LAST_WEEK);

  const through = addDaysISO(weekStart, 6);
  const history = collectRunningHistory(state, { today: through });
  const detail = buildRunningMetricDetail(state, 'running.weekly-distance', {
    history, today: through, includeSeries: false,
  });
  assert.equal(detail.value, 12);
  assert.equal(detail.comparison.type, 'completed');
  assert.equal(detail.comparison.comparisonLabel, 'vs previous week');
  assert.equal(detail.comparison.percentageChange, 50); // 12 vs 8
  assert.doesNotMatch(detail.comparison.comparisonLabel, /same point last week/);
});
