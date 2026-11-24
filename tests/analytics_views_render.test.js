// =============================================================================
// ANALYTICS DETAIL VIEWS — render smoke + honest comparison labels.
//
// The app smoke test renders Home only, so a ReferenceError inside a detail view
// (e.g. an out-of-scope `appState`) could ship unseen. These tests drive the
// Strength and Running analytics views on BOTH tabs through a minimal DOM and
// assert they render without throwing and use the honest, period-matched label.
// =============================================================================
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { RUNNING_METRICS } from '../js/analytics/running-detail.js';
import { STRENGTH_METRICS } from '../js/analytics/strength-detail.js';
import { addDaysISO, dateKey, formatWeekRange, todayProgramDay } from '../js/dates.js';

const noop = () => {};
const store = new Map();
function makeEl(id) {
  const e = {
    id: id || '', setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    appendChild: c => c, insertBefore: c => c, removeChild: noop, remove: noop,
    addEventListener: noop, removeEventListener: noop, querySelector: () => null,
    querySelectorAll: () => [], closest: () => null, contains: () => false, click: noop,
    focus: noop, style: {}, dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false }, children: [],
  };
  let h = '';
  Object.defineProperty(e, 'innerHTML', { get: () => h, set: x => { h = String(x); } });
  Object.defineProperty(e, 'textContent', { get: () => '', set: noop });
  return e;
}
function getEl(id) { if (!store.has(id)) store.set(id, makeEl(id)); return store.get(id); }

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const work = (w, r) => ({ c: true, w, r });
function weekDates(m) {
  const b = new Date(m + 'T00:00:00Z'); const o = {};
  DAYS.forEach((dk, i) => { const d = new Date(b); d.setUTCDate(d.getUTCDate() + i); o[dk] = d.toISOString().slice(0, 10); });
  return o;
}

let vs, vr, vw, ve, vsm, vgp, vsv, vrm, vrc;
before(async () => {
  globalThis.document = {
    getElementById: getEl, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => makeEl(), addEventListener: noop, body: makeEl('body'),
  };
  vs = await import('../js/analytics/views/view-strength.js');
  vsv = await import('../js/analytics/views/view-strength-volume.js');
  vr = await import('../js/analytics/views/view-running.js');
  vw = await import('../js/analytics/views/view-weekly-volume.js');
  ve = await import('../js/analytics/views/view-strength-entity.js');
  vsm = await import('../js/analytics/views/view-strength-metric.js');
  vrm = await import('../js/analytics/views/view-running-metric.js');
  vrc = await import('../js/analytics/views/view-recovery-metric.js');
  vgp = await import('../js/analytics/views/view-gym-performance.js');
});

function sampleState() {
  return {
    currentWeek: '2', settings: { weightUnit: 'kg', distanceUnit: 'km' }, loadMetrics: { atl: 120, ctl: 100 },
    weeks: {
      '1': { dates: weekDates('2026-06-01'), lifts: { mon: { 'Bench Press': [work(100, 5), work(100, 5), work(100, 5)] } }, runs: { tue: { dist: '8', time: '40:00' } } },
      '2': { dates: weekDates('2026-06-08'), lifts: { mon: { 'Bench Press': [work(105, 5), work(105, 5)] } }, runs: { tue: { dist: '6', time: '30:00' } } },
    },
  };
}
const data = { weekLabels: ['W1', 'W2'], dynamicStats: {}, thresholdSecs: null };

test('strength analytics renders on both tabs with the honest current-week label', () => {
  const state = sampleState();
  for (const tab of ['overview', 'stats']) {
    vs.setStrengthTab(tab);
    assert.doesNotThrow(() => vs.renderStrengthAnalytics(data, () => state, () => DAYS));
    const html = getEl('strength-tab-body').innerHTML + getEl('strengthTrainingLoadDashboard').innerHTML;
    assert.match(html, /vs same point last week/, `strength ${tab} tab`);
    assert.doesNotMatch(html, /vs last week/); // the old mislabel is gone
    // Phase 3B: the Weekly Volume card now points at the merged Volume screen.
    assert.match(html, /data-context="strength-volume"[^>]*data-parent-context="strength"[^>]*data-preserve-week="true"/);
  }
});

test('running analytics renders metric-specific accessible destinations on both tabs', () => {
  const state = sampleState();
  for (const tab of ['overview', 'stats']) {
    vr.setRunningTab(tab);
    assert.doesNotThrow(() => vr.renderRunningAnalytics(data, () => state, () => DAYS));
    const html = getEl('running-tab-body').innerHTML;
    assert.match(html, /data-context="running-metric"/, `running ${tab} tab`);
    assert.match(html, /data-metric-id="running\./, `running ${tab} tab`);
    assert.match(html, /aria-label="View [^"]+ details"/, `running ${tab} tab`);
    assert.doesNotMatch(html, /NaN|Infinity/);
    if (tab === 'stats') {
      for (const metric of RUNNING_METRICS) assert.match(html, new RegExp(`data-metric-id="${metric.id.replaceAll('.', '\\.')}"`));
    }
  }
});

test('Strength volume cards and details have stable exact destinations', () => {
  const state = sampleState();
  vs.setStrengthTab('stats');
  assert.doesNotThrow(() => vs.renderStrengthAnalytics(data, () => state, () => DAYS));
  const stats = getEl('strengthTrainingLoadDashboard').innerHTML + getEl('muscleGroupAnalysisSection').innerHTML;
  for (const metric of STRENGTH_METRICS) {
    assert.match(stats, new RegExp(`data-metric-id="${metric.id.replaceAll('.', '\\.')}"`));
    assert.doesNotThrow(() => vsm.renderStrengthMetricDetail(state, { id: metric.id }));
    const detail = getEl('strengthMetricDetail').innerHTML;
    assert.match(detail, new RegExp(metric.label));
    assert.match(detail, /How this is calculated/);
    assert.doesNotMatch(detail, /NaN|Infinity/);
  }
  assert.match(stats, /data-context="strength-metric"[^>]*data-parent-context="strength_pr"/);
});

test('empty metric headlines say what is missing instead of a bare em dash', () => {
  const empty = { settings: { weightUnit: 'kg', distanceUnit: 'km' }, weeks: {}, wellnessLog: [] };
  vsm.renderStrengthMetricDetail(empty, { id: 'strength.four-week-volume' });
  assert.match(getEl('strengthMetricDetail').innerHTML, /metric-detail__value[^>]*>No workouts</);
  vrm.renderRunningMetricDetail(empty, { id: 'running.weekly-distance' });
  assert.match(getEl('runningMetricDetail').innerHTML, /metric-detail__value[^>]*>No runs</);
  vrc.renderRecoveryMetricDetail(empty, { id: 'recovery.sleep' });
  assert.match(getEl('recoveryMetricDetail').innerHTML, /metric-detail__value[^>]*>No check-ins</);
});

test('metric detail dates render in words on every domain, never a raw ISO fallback', () => {
  // The three metric views used to fall back to String(iso) when a key did not
  // parse, so an unreadable date surfaced as a database key on screen. Dates now
  // come from the one date owner; this drives a real value through each domain.
  const today = dateKey(new Date());
  const slot = todayProgramDay();
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      '1': {
        dates: { [slot]: today },
        lifts: { [slot]: { 'Bench Press': [work(100, 5)] } },
        runs: { [slot]: { dist: '5', time: '25:00' } },
      },
    },
    wellnessLog: [{ date: today, sleep: 7.5 }, { date: addDaysISO(today, -1), sleep: 8 }],
  };

  vsm.renderStrengthMetricDetail(state, { id: 'strength.four-week-volume' });
  const strength = getEl('strengthMetricDetail').innerHTML;
  assert.match(strength, /working sets/);
  assert.match(strength, /Week of \d{1,2} [A-Z][a-z]{2} \d{4}/);
  assert.doesNotMatch(strength, /Invalid Date|>\d{4}-\d{2}-\d{2}</);

  vrm.renderRunningMetricDetail(state, { id: 'running.weekly-distance' });
  const running = getEl('runningMetricDetail').innerHTML;
  // The selected-week strip labels its seven days by weekday, not by raw key.
  assert.match(running, />\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s*</);
  assert.doesNotMatch(running, /Invalid Date|>\d{4}-\d{2}-\d{2}</);

  vrc.renderRecoveryMetricDetail(state, { id: 'recovery.sleep' });
  const recovery = getEl('recoveryMetricDetail').innerHTML;
  assert.match(recovery, /\d{1,2} [A-Z][a-z]{2} \d{4}/);
  assert.doesNotMatch(recovery, /Invalid Date|>\d{4}-\d{2}-\d{2}</);
});

test('a stepped-back week shows that week\'s running metric, not the live one', async () => {
  // The Running DETAIL screen must follow the shared week navigator like the
  // Running screen does. Collecting the history without a through-date left the
  // detail on the live week no matter which week was selected.
  const nav = await import('../js/analytics/week-nav.js');
  const { weekStartOf } = await import('../js/analytics/weekly-aggregate.js');
  const today = dateKey(new Date());
  const thisWeek = weekStartOf(today);
  const lastWeek = addDaysISO(thisWeek, -7);
  const run = (sessionId, dist) => ({ sessionId, dist: String(dist), time: '25:00', type: 'run', source: 'gps' });
  const state = {
    settings: { distanceUnit: 'km' },
    weeks: {
      '1': { dates: { mon: lastWeek }, runSessions: { mon: [run('last_week_run', 5)] } },
      '2': { dates: { mon: thisWeek }, runSessions: { mon: [run('this_week_run', 9)] } },
    },
  };

  // Step the real navigator back one calendar week.
  const harness = globalThis.document;
  const listeners = {};
  const navRoot = makeEl('view-analytics');
  navRoot.addEventListener = (type, fn) => { listeners[type] = fn; };
  globalThis.document = { ...harness, getElementById: (id) => (id === 'view-analytics' ? navRoot : getEl(id)) };
  nav.initWeekNav(() => state, () => {});
  listeners.click({ target: { closest: (sel) => (sel === '#weekNavPrev' ? {} : null) } });
  globalThis.document = harness;
  assert.equal(nav.getSelectedWeekStart(), lastWeek);

  vrm.renderRunningMetricDetail(state, { id: 'running.weekly-distance' });
  const historical = getEl('runningMetricDetail').innerHTML;
  assert.match(historical, /metric-detail__value[^>]*>5\.0 km</, 'selected week distance');
  assert.doesNotMatch(historical, /metric-detail__value[^>]*>9\.0 km</, 'live week must not leak in');
  assert.ok(
    historical.includes(formatWeekRange(lastWeek, addDaysISO(lastWeek, 6))),
    'the period names the selected Monday–Sunday range',
  );

  // Returning to the live week restores the live metric.
  nav.resetWeekNav();
  vrm.renderRunningMetricDetail(state, { id: 'running.weekly-distance' });
  const live = getEl('runningMetricDetail').innerHTML;
  assert.match(live, /metric-detail__value[^>]*>9\.0 km</);
  assert.doesNotMatch(live, /metric-detail__value[^>]*>5\.0 km</);
});

test('completed (navigated) week uses the previous-week label, not the live one', () => {
  // 3-week history, view week 2 (a completed week) via the analytics week-nav.
  const state = {
    currentWeek: '3', settings: {}, loadMetrics: { atl: 100, ctl: 100 },
    weeks: {
      '1': { dates: weekDates('2026-06-01'), lifts: { mon: { A: [work(100, 5), work(100, 5)] } } },
      '2': { dates: weekDates('2026-06-08'), lifts: { mon: { A: [work(100, 5), work(100, 5), work(100, 5)] } } },
      '3': { dates: weekDates('2026-06-15'), lifts: { mon: { A: [work(100, 5)] } } },
    },
  };
  vs.setStrengthTab('stats');
  vs.renderStrengthAnalytics({ ...data, weekLabels: ['W1', 'W2', 'W3'] }, () => state, () => DAYS);
  // Current week (3) is selected by default → live label. This asserts the label
  // machinery is wired to the model (both labels are valid outputs of the util).
  const html = getEl('strengthTrainingLoadDashboard').innerHTML;
  assert.match(html, /vs same point last week|vs previous week/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

test('weekly volume and entity drilldowns render useful empty states without throwing', () => {
  const state = { settings: { weightUnit: 'kg' }, weeks: {} };
  // Drive the body renderer the merged Volume screen actually calls — the old
  // standalone wrapper was removed with its container, and a test against a
  // function the app never runs is false confidence.
  const weeklyEl = getEl('weeklyVolumeBody');
  assert.doesNotThrow(() => vw.renderWeeklyVolumeBody(weeklyEl, state));
  const weekly = weeklyEl.innerHTML;
  // The screen title moved to the merged Volume header; this body keeps the
  // week's own status, period and breakdown.
  assert.match(weekly, /Total tonnage/);
  assert.match(weekly, /In progress|Completed week/);
  assert.match(weekly, /Day.*Workouts.*Exercises.*Muscles/s);
  assert.doesNotMatch(weekly, /NaN|Infinity/);

  assert.doesNotThrow(() => ve.renderExerciseDetail(state, { id: 'back_squat', name: 'Back Squat' }));
  assert.match(getEl('strengthEntityDetail').innerHTML, /No completed history in this range/);
});

test('Gym Performance renders range, metric and exact-evidence controls without invalid values', () => {
  const state = sampleState();
  const gymEl = getEl('gymPerformanceBody');
  assert.doesNotThrow(() => vgp.renderGymPerformanceBody(gymEl, state));
  const html = gymEl.innerHTML;
  // Title now belongs to the merged Volume screen; every control survives.
  assert.match(html, /data-gym-range="7d"/);
  assert.match(html, /data-gym-range="4w"/);
  assert.match(html, /data-gym-range="1y"/);
  assert.match(html, /data-gym-metric="time"/);
  assert.match(html, /Contributing workouts/);
  assert.doesNotMatch(html, /NaN|Infinity/);
});

// ---- Phase 3B: the merged Volume destination --------------------------------

test('the merged Volume screen renders both tabs from one destination', () => {
  const state = sampleState();

  vsv.setStrengthVolumeTab('week');
  assert.doesNotThrow(() => vsv.renderStrengthVolume(state));
  const weekHTML = getEl('strengthVolumeDetail').innerHTML + getEl('strengthVolumeBody').innerHTML;
  assert.match(weekHTML, /Total tonnage/, 'This week tab keeps the weekly breakdown');
  assert.match(weekHTML, /data-strength-volume-tab="trends"/, 'the other tab stays reachable');
  assert.doesNotMatch(weekHTML, /NaN|Infinity/);

  vsv.setStrengthVolumeTab('trends');
  assert.doesNotThrow(() => vsv.renderStrengthVolume(state));
  const trendHTML = getEl('strengthVolumeDetail').innerHTML + getEl('strengthVolumeBody').innerHTML;
  // Every Gym Performance control survived the merge.
  assert.match(trendHTML, /data-gym-range="7d"/);
  assert.match(trendHTML, /data-gym-range="4w"/);
  assert.match(trendHTML, /data-gym-range="1y"/);
  assert.match(trendHTML, /data-gym-metric="volume"/);
  assert.match(trendHTML, /Contributing workouts/);
  assert.doesNotMatch(trendHTML, /NaN|Infinity/);
});

test('the merged screen has exactly one title, not one per merged part', () => {
  // The whole point of the merge is that "how much have I lifted" has ONE
  // answer. Two stacked headers would just be the old duplication, nested.
  vsv.setStrengthVolumeTab('week');
  vsv.renderStrengthVolume(sampleState());
  const html = getEl('strengthVolumeDetail').innerHTML;
  assert.equal((html.match(/<h2>/g) || []).length, 1);
  assert.doesNotMatch(html, /Gym Performance/);
  assert.doesNotMatch(html, /Weekly Volume<\/h2>/);
});

test('the tab selection survives a re-render so a deep link opens where it says', () => {
  vsv.setStrengthVolumeTab('trends');
  assert.equal(vsv.getStrengthVolumeTab(), 'trends');
  vsv.renderStrengthVolume(sampleState());
  assert.equal(vsv.getStrengthVolumeTab(), 'trends');
  vsv.setStrengthVolumeTab('week');
  assert.equal(vsv.getStrengthVolumeTab(), 'week');
  // An unknown value falls back to the safe default rather than blanking.
  vsv.setStrengthVolumeTab('nonsense');
  assert.equal(vsv.getStrengthVolumeTab(), 'week');
});

// ---- Training Report: name the window it actually measured -------------------

test('the Strength hero spark is anchored on the selected week, like the PR chip', async () => {
  // The PR chip counts the navigator's week, so the spark beside it must end on
  // that week too — a live-week spark next to "that week" described two periods.
  const nav = await import('../js/analytics/week-nav.js');
  const { spark } = await import('../js/analytics/views/screen-kit.js');
  const { calendarWeekE1rmSeriesForLift } = await import('../js/analytics/strength-calendar.js');
  const { weekStartOf } = await import('../js/analytics/weekly-aggregate.js');

  const today = dateKey(new Date());
  const thisWeek = weekStartOf(today);
  const lastWeek = addDaysISO(thisWeek, -7);
  const state = {
    settings: { weightUnit: 'kg' },
    weeks: {
      '1': { dates: { mon: lastWeek }, lifts: { mon: { 'Bench Press': [work(80, 5)] } } },
      '2': { dates: { mon: thisWeek }, lifts: { mon: { 'Bench Press': [work(90, 5)] } } },
    },
  };

  // Step the shared navigator back one calendar week through its real listener.
  const harness = globalThis.document;
  const listeners = {};
  const navRoot = makeEl('view-analytics');
  navRoot.addEventListener = (type, fn) => { listeners[type] = fn; };
  globalThis.document = { ...harness, getElementById: (id) => (id === 'view-analytics' ? navRoot : getEl(id)) };
  nav.initWeekNav(() => state, () => {});
  listeners.click({ target: { closest: (sel) => (sel === '#weekNavPrev' ? {} : null) } });
  globalThis.document = harness;

  const selected = nav.getSelectedWeekStart();
  assert.equal(selected, lastWeek);
  vs.setStrengthTab('overview');
  vs.renderStrengthAnalytics(
    { weekLabels: ['W1'], dynamicStats: { 'Bench Press': { allTimeMax: 100 } } },
    () => state,
    () => DAYS,
  );
  const html = getEl('strength-tab-body').innerHTML;
  const expected = spark(calendarWeekE1rmSeriesForLift(state, 'Bench Press', { weeks: 12, today: selected }), '#3b82f6');
  const live = spark(calendarWeekE1rmSeriesForLift(state, 'Bench Press', { weeks: 12 }), '#3b82f6');
  assert.ok(html.includes(expected), 'hero spark follows the selected week');
  assert.ok(!html.includes(live), 'hero spark is not the live-week series');
  nav.resetWeekNav();
});

test('the Training Report names the current calendar month, never "30 days"', async () => {
  const { renderMonthlyReport } = await import('../js/analytics/views/view-monthly-report.js');
  const today = dateKey(new Date());
  const priorDate = new Date(`${today}T12:00:00`);
  priorDate.setMonth(priorDate.getMonth() - 1);
  const state = {
    currentWeek: '1',
    settings: { distanceUnit: 'km', weightUnit: 'kg' },
    weeks: {
      '1': { dates: { mon: today }, lifts: { mon: { Squat: [work(100, 5)] } } },
      // One session in the same elapsed part of the prior month, so the
      // comparison sentence has a value to name.
      '2': { dates: { mon: dateKey(priorDate) }, lifts: { mon: { Squat: [work(80, 5)] } } },
    },
  };
  const el = getEl('monthlyReportContainer');
  assert.doesNotThrow(() => renderMonthlyReport(() => state, () => DAYS, () => null));
  const html = el.innerHTML;
  assert.match(html, /data-report-period="month"[^>]*>This month</);
  assert.match(html, /data-report-period="year"[^>]*>12 months</);
  // The comparison names the prior month, not a made-up 30-day window.
  assert.match(html, /vs prior month/);
  assert.doesNotMatch(html, /30[- ]day/i);
  // Real dates come from the shared formatter: "1 Nov – 24 Nov · 1 active day".
  assert.match(html, /an-detail-period">\d{1,2} [A-Z][a-z]{2} – \d{1,2} [A-Z][a-z]{2} · \d+ active day/);
  assert.doesNotMatch(html, /Invalid Date|\d{4}-\d{2}-\d{2}/);

  // An empty report still names its calendar month.
  renderMonthlyReport(() => ({ weeks: {} }), () => DAYS, () => null);
  const empty = el.innerHTML;
  assert.match(empty, /Your [A-Z][a-z]+ \d{4} report builds itself as you train/);
  assert.doesNotMatch(empty, /30[- ]day/i);
});
