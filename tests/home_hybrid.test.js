// =============================================================================
// HOME HYBRID SECTION — the three cards must be calendar-correct, honest about
// missing data, and unit-aware. These are pure-model + HTML-string tests; the
// browser check covers placement and the Hybrid training toggle.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHomeHybrid, balanceCardHTML, strengthCardHTML, enduranceCardHTML,
} from '../js/home/hybrid-dashboard.js';
import { addDaysISO } from '../js/dates.js';

const MONDAY = '2026-07-13';       // current calendar week
const PRIOR_MONDAY = '2026-07-06';
const TUESDAY = addDaysISO(MONDAY, 1);
const PRIOR_TUESDAY = addDaysISO(PRIOR_MONDAY, 1);

const workSet = (w = 100, r = 10) => ({ c: true, w: String(w), r: String(r) });

function strengthSlot(monday, sets) {
  return {
    dates: { mon: monday },
    lifts: { mon: { Squat: sets } },
    gymRpe: { mon: '8' },
    gymStats: { mon: { time: '60' } },
    runs: {},
  };
}

function runSlot(date, sessions) {
  return {
    dates: { tue: date },
    lifts: {},
    runs: {},
    runSessions: { tue: sessions },
  };
}

test('a balanced week renders the split, the status and a Recovery link', () => {
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      '3': strengthSlot(MONDAY, [workSet()]),
      'session:run_1': runSlot(TUESDAY, [{ sessionId: 'r1', dist: 10, time: '60:00', rpe: '8' }]),
    },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(model.balance.status, 'balanced');
  assert.equal(model.balance.strengthPct, 50);
  assert.equal(model.balance.endurancePct, 50);

  const html = balanceCardHTML(model);
  assert.match(html, /50%/);
  assert.match(html, /Balanced/);
  assert.match(html, /data-context="recovery"/);
  assert.match(html, /aria-label="Training balance this week: 50 percent strength, 50 percent endurance"/);
});

test('the balance link falls back to the Progress hub when Recovery is hidden', () => {
  const state = {
    settings: { modules: { recovery: false } },
    weeks: { '3': strengthSlot(MONDAY, [workSet()]) },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.match(balanceCardHTML(model), /data-context="hub"/);
});

test('endurance is suppressed when the Running module is off', () => {
  const state = {
    settings: { modules: { running: false } },
    weeks: { '3': strengthSlot(MONDAY, [workSet()]) },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(model.showEndurance, false);
});

test('both cards speak the athlete’s units without converting stored values', () => {
  const state = {
    settings: { weightUnit: 'lbs', distanceUnit: 'mi' },
    weeks: {
      '3': strengthSlot(MONDAY, [workSet(225, 10)]),
      'session:run_1': runSlot(TUESDAY, [{ sessionId: 'r1', dist: 10, time: '60:00', rpe: '6' }]),
    },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.match(strengthCardHTML(model), /lbs/);
  assert.match(enduranceCardHTML(model), /mi/);
});

test('strength volume is compared with the same weekdays last week', () => {
  const state = {
    settings: {},
    weeks: {
      '2': strengthSlot(PRIOR_MONDAY, [workSet(100, 10)]),
      '3': strengthSlot(MONDAY, [workSet(100, 10)]),
    },
  };
  // Monday only: prior week's later training must not make this week look empty.
  const model = buildHomeHybrid(state, { today: MONDAY });
  assert.equal(model.strength.volumeKg, 1000);
  assert.equal(model.strength.deltaPct, 0);
  assert.equal(model.strength.sessions, 1);
  assert.equal(model.strength.sets, 1);
  assert.match(strengthCardHTML(model), /1 session · 1 working set/);

  // Add a huge Tuesday last week: a raw week-vs-week compare would read −90%.
  state.weeks['2'].dates.tue = PRIOR_TUESDAY;
  state.weeks['2'].lifts.tue = { Squat: Array.from({ length: 9 }, () => workSet(100, 10)) };
  const stillMonday = buildHomeHybrid(state, { today: MONDAY });
  assert.equal(stillMonday.strength.deltaPct, 0, 'later days last week are not in the comparison');
});

test('same-day runs merge instead of overwriting each other', () => {
  const state = {
    settings: { distanceUnit: 'km' },
    weeks: {
      'session:run_1': runSlot(TUESDAY, [
        { sessionId: 'a', dist: 5, time: '25:00', rpe: '6' },
        { sessionId: 'b', dist: 10, time: '50:00', rpe: '6' },
      ]),
    },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(Math.round(model.endurance.km * 100) / 100, 15);
  assert.equal(model.endurance.sessions, 2);
  assert.match(enduranceCardHTML(model), /15\.00 km/);
});

test('an empty week is an honest empty state, not a zero-filled ratio', () => {
  const model = buildHomeHybrid({ settings: {} }, { today: TUESDAY });
  assert.equal(model.balance.status, 'no-data');
  const html = balanceCardHTML(model);
  assert.match(html, /No sessions logged this calendar week/);
  assert.match(html, /No load logged/);
  assert.match(strengthCardHTML(model), /No working sets yet this week/);
  assert.match(enduranceCardHTML(model), /No runs logged this week/);
});

test('a split measured in training time says so on the card', () => {
  // No RPE anywhere: the balance falls back to minutes and must label the basis.
  const state = {
    settings: {},
    weeks: { '3': {
      dates: { mon: MONDAY, tue: TUESDAY },
      lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
      gymStats: { mon: { time: '50' } },
      runs: {},
      runSessions: { tue: [{ sessionId: 'r1', dist: 10, time: '50:00', type: 'run' }] },
    } },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(model.balance.basis, 'minutes');
  assert.equal(model.balance.strengthPct, 50);
  const html = balanceCardHTML(model);
  assert.match(html, /Split by training time/);
  assert.match(html, /by time/, 'the split is tagged as time, not a load verdict');
});

test('aerobic fitness is shown as an ESTIMATE, never a measured VO2 max', () => {
  const state = {
    settings: {},
    weeks: { '1': runSlot(TUESDAY, [{ sessionId: 'r1', dist: 10, time: '50:00', rpe: '6' }]) },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(model.endurance.aerobic?.source, 'estimated');
  const html = enduranceCardHTML(model);
  assert.match(html, /Aerobic \d+ \(est\.\)/);
  assert.match(html, /not a measured VO₂ max/);
});

test('a threshold pace the athlete entered is presented without the estimate label', () => {
  const state = {
    settings: {},
    thresholdPaceSeconds: 300,
    weeks: { '1': runSlot(TUESDAY, [{ sessionId: 'r1', dist: 10, time: '50:00', rpe: '6' }]) },
  };
  const model = buildHomeHybrid(state, { today: TUESDAY });
  assert.equal(model.endurance.aerobic?.source, 'threshold');
  const html = enduranceCardHTML(model);
  assert.match(html, /Aerobic \d+/);
  assert.doesNotMatch(html, /\(est\.\)/);
});

test('no aerobic estimate is invented when there is no qualifying run', () => {
  const model = buildHomeHybrid({ settings: {}, weeks: {} }, { today: TUESDAY });
  assert.equal(model.endurance.aerobic, null);
  assert.doesNotMatch(enduranceCardHTML(model), /Aerobic/);
});
