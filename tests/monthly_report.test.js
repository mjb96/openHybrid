import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMonthlyReport, buildYearReport, reportToText } from '../js/brain/monthly-report.js';
import { addDaysISO, dateKey } from '../js/dates.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const NOW = new Date('2026-07-02T12:00:00+10:00');
const TODAY = dateKey(NOW);

// Build a state with dated sessions spread across the last ~50 days.
function makeState(todayISO = TODAY) {
  const weeks = {};
  // Put logged days at known offsets using stored dates.
  const mk = (offset, vol, dist) => ({ offset, vol, dist });
  const entries = [
    mk(2, 4000, 5), mk(5, 4200, 0), mk(9, 0, 8), mk(14, 4400, 6), mk(20, 4600, 0), // current 28d
    mk(32, 3000, 4), mk(40, 3200, 5), mk(48, 0, 6),                                  // prior 28d
  ];
  entries.forEach((e, i) => {
    const wk = String(i + 1);
    const slot = DAYS[i % 7];
    const lifts = e.vol > 0 ? { [slot]: { ['L' + i]: [{ w: String(e.vol / 10), r: 10, c: true }] } } : {};
    const runs = e.dist > 0 ? { [slot]: { dist: String(e.dist), time: '30:00', rpe: '6' } } : {};
    weeks[wk] = { lifts, runs, dates: { [slot]: addDaysISO(todayISO, -e.offset) } };
  });
  const hist = [];
  for (let i = 0; i < 40; i++) hist.push({ date: addDaysISO(todayISO, -i), score: i < 28 ? 82 : 74, level: 3 });
  return {
    currentWeek: '1', weekStartedAt: todayISO,
    weeks, loadMetrics: { atl: 8, ctl: 12 },
    hybridScore: { history: hist, xp: 1500, lastRecordedDate: todayISO },
    settings: { distanceUnit: 'km' },
  };
}

test('buildMonthlyReport: 28-day totals, deltas, score avg + trend', () => {
  const r = buildMonthlyReport(makeState(), DAYS, null, NOW);
  assert.equal(r.hasData, true);
  // The window names what it measures: four weeks (28 days), never "30 days".
  assert.equal(r.window.days, 28);
  assert.equal(r.window.label, 'Last 4 weeks');
  // Current window: 5 training days, but offsets 2 and 14 hold strength AND
  // a run, so there are 7 real sessions.
  assert.equal(r.totals.sessions, 7);
  assert.equal(r.totals.activeDays, 5);
  assert.ok(r.totals.volume > 0);
  assert.ok(r.totals.distanceKm > 0);
  // Score avg current (82) vs prior (74) → +8.
  assert.equal(r.hybridScore.avg, 82);
  assert.equal(r.hybridScore.delta, 8);
  // Volume up vs prior month → positive delta.
  assert.ok(r.deltas.volumePct > 0);
  assert.ok(['rising', 'easing', 'steady', 'building'].includes(r.fitness.trend));
});

test('reportToText: numbers-first monthly copy', () => {
  const r = buildMonthlyReport(makeState(), DAYS, null, NOW);
  const txt = reportToText(r, 'km');
  assert.match(txt, /Last 4 weeks on openHybrid: 7 sessions/);
  assert.doesNotMatch(txt, /30[- ]day|Last 30 days/i);
  assert.match(txt, /Avg Hybrid Score 82 \(\+8 vs prior month\)/);
  // A report with no window at all falls back to a span-free sentence.
  assert.match(reportToText({ hasData: false }), /Your training report will build as you train/);
  // A real empty 28-day report names its own window.
  const empty = buildMonthlyReport({ weeks: {} }, DAYS, null, NOW);
  assert.match(reportToText(empty, 'km'), /Your 28-day report will build as you train/);
});

test('sessions count strength plus every run, not unique days', () => {
  const todayISO = TODAY;
  const state = {
    currentWeek: '1', weekStartedAt: todayISO,
    weeks: {
      '1': {
        dates: { mon: todayISO },
        lifts: { mon: { Squat: [{ w: '100', r: '5', c: true }] } },
        runs: {},
        runSessions: {
          mon: [
            { sessionId: 'r1', dist: '5', time: '25:00', localDate: todayISO },
            { sessionId: 'r2', dist: '3', time: '18:00', localDate: todayISO },
          ],
        },
      },
    },
    settings: { distanceUnit: 'km' },
  };
  const r = buildMonthlyReport(state, DAYS, null, NOW);
  assert.equal(r.totals.sessions, 3, 'one strength + two runs');
  assert.equal(r.totals.activeDays, 1, 'but one calendar day');
});

test('buildYearReport covers 12 months and compares the prior year', () => {
  const state = makeState();
  // Add an old session that only the year window can see.
  state.weeks['old-year'] = {
    dates: { mon: addDaysISO(TODAY, -200) },
    lifts: { mon: { Old: [{ w: '50', r: '10', c: true }] } },
    runs: {},
  };
  const month = buildMonthlyReport(state, DAYS, null, NOW);
  const year = buildYearReport(state, DAYS, null, NOW);
  assert.equal(month.totals.sessions, 7);
  assert.equal(year.totals.sessions, 13);
  assert.equal(year.window.days, 365);
  assert.equal(year.window.label, 'Last 12 months');
  assert.equal(year.window.comparisonWord, 'year');
  assert.match(reportToText(year, 'km'), /Last 12 months on openHybrid: 13 sessions/);
});
