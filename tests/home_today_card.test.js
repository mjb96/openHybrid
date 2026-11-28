import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTodayCardModel, isTodayCardCollapsible, todayCardHTML, todayProgramDay,
} from '../js/home/today-card.js';

const MONDAY = new Date('2026-08-03T09:00:00+10:00');
const DISPLAY_TZ = 'Australia/Sydney';
const PROGRAM = {
  name: 'Test Plan',
  totalWeeks: 4,
  weeklyVolModifiers: { '1': { sets: 2, reps: 5 } },
  days: {
    mon: { title: 'Push Strength', lifts: ['Bench Press'], runs: 'Rest', desc: '' },
    tue: { title: 'Easy Run', lifts: [], runs: '5 km easy', desc: '' },
    wed: { title: 'Pull Strength', lifts: ['Barbell Row'], runs: 'Rest', desc: '' },
    sun: { title: 'Rest Day', lifts: [], runs: 'Rest', desc: '' },
  },
};

function state() {
  return {
    currentWeek: '1',
    activeProgramId: 'test',
    weeks: {
      '1': {
        dates: {}, sessionStatus: {},
        lifts: {
          mon: { 'Bench Press': [{ w: '', r: '5', c: false }, { w: '', r: '5', c: false }] },
          wed: { 'Barbell Row': [{ w: '', r: '5', c: false }, { w: '', r: '5', c: false }] },
        },
        runs: {}, runSessions: {}, gymStats: {},
      },
    },
  };
}

const model = {
  ready: { hasData: true, score: 78 },
  rec: { badge: 'Productive', headline: 'On track — stick to the plan', advice: 'Follow the plan.' },
};

test('ready state uses the real calendar day and exposes one primary action', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'ready');
  assert.equal(card.day, 'mon');
  assert.equal(card.title, 'Push Strength');
  assert.deepEqual(card.primary, { action: 'select-program-workout', day: 'mon', label: 'Start workout' });
  const html = todayCardHTML(card);
  assert.equal((html.match(/id="homePrimaryCta"/g) || []).length, 1);
  assert.match(html, /data-day="mon"/);
});

test('today is independent of a previously selected cockpit day', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
    // A selected-day input intentionally does not exist in this model.
  });
  assert.equal(card.day, 'mon');
  assert.equal(card.primary.day, 'mon');
});

test('calendar-day resolution follows the display timezone rather than the process timezone', () => {
  assert.equal(todayProgramDay(MONDAY, DISPLAY_TZ), 'mon');
  assert.equal(todayProgramDay(MONDAY, 'UTC'), 'sun');
});

test('an unfinished session from another day takes resume priority', () => {
  const s = state();
  s.weeks['1'].lifts.wed['Barbell Row'][0] = { w: '80', r: '5', c: true };
  s.weeks['1'].dates.wed = '2026-08-01';
  s.weeks['1'].sessionStatus.wed = 'in_progress';
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'unresolved');
  assert.equal(card.day, 'wed');
  assert.equal(card.eyebrow, 'Unfinished Wednesday');
  assert.match(card.meta, /Today is Monday/);
  assert.match(card.guidance, /Wednesday's workout/);
  assert.equal(card.primary.label, 'Resume workout');
  assert.equal(card.secondary, null);
});

test('today in progress resumes instead of offering a fresh start', () => {
  const s = state();
  s.weeks['1'].lifts.mon['Bench Press'][0] = { w: '60', r: '5', c: true };
  s.weeks['1'].dates.mon = '2026-08-03';
  s.weeks['1'].sessionStatus.mon = 'in_progress';
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'in_progress');
  assert.equal(card.primary.label, 'Resume workout');
});

test('a deliberately finished session becomes a review action', () => {
  const s = state();
  s.weeks['1'].lifts.mon['Bench Press'] = [
    { w: '60', r: '5', c: true },
    { w: '60', r: '5', c: true },
  ];
  s.weeks['1'].dates.mon = '2026-08-03';
  s.weeks['1'].sessionStatus.mon = 'finished';
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'completed');
  assert.deepEqual(card.primary, { action: 'open-today-summary', day: 'mon', label: 'Review workout' });
  const html = todayCardHTML(card);
  assert.match(html, /session-summary/);
  assert.match(html, /session-map/);
  assert.match(html, /600 kg/);
  assert.match(html, /Front body map/);
  assert.equal((html.match(/id="homePrimaryCta"/g) || []).length, 1);
});

test('rest day recommends recovery instead of a workout', () => {
  const sunday = new Date('2026-08-09T09:00:00+10:00');
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: sunday, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'rest');
  assert.equal(card.primary.action, 'open-wellness-checkin');
  assert.equal(card.primary.label, 'Log wellness check-in');
});

test('missing plan has a safe, useful recovery state', () => {
  const card = buildTodayCardModel({
    state: state(), program: null, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'no_plan');
  assert.deepEqual(card.primary, { action: 'switch-tab', target: 'program', label: 'Choose a plan' });
  assert.equal(card.secondary, null);
});

test('one-off workouts remain resumable across days', () => {
  const s = state();
  s.weeks['session:abc'] = {
    sessionId: 'abc', sessionKind: 'empty', sessionTitle: 'Upper body',
    sessionDay: 'sun', dates: { sun: '2026-08-02' },
    lifts: { sun: {} }, sessionStatus: {},
  };
  s.activeStrengthSessionKey = 'session:abc';
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'unresolved');
  assert.equal(card.title, 'Upper body');
  assert.equal(card.eyebrow, 'Unfinished Sunday');
  assert.match(card.meta, /Today is Monday/);
  assert.equal(card.primary.action, 'start-today-workout');
});

test('the card HTML is compact: no score row, state pill or evidence drawer', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
    briefing: { coach: { evidence: { bullets: ['One reason', 'Another reason'] } } },
  });
  const html = todayCardHTML(card);
  assert.doesNotMatch(html, /today-card__score/);
  assert.doesNotMatch(html, /today-card__state/);
  assert.doesNotMatch(html, /today-card__why/);
  assert.match(html, /today-card__primary/);
});

test('offline state reassures without changing the workout action', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, offline: true, tz: DISPLAY_TZ,
  });
  assert.equal(card.offline, true);
  assert.equal(card.primary.label, 'Start workout');
  assert.match(todayCardHTML(card), /logging still saves on this device/);
});

test('the Hybrid Score is not carried on the card model at all', () => {
  // The score is computed and recorded once per day for the briefing and
  // notifications, but Home stopped rendering it (HM7: the Today card owns
  // readiness, not a second score surface).
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY,
    tz: DISPLAY_TZ,
  });
  assert.equal('score' in card, false);
});

test('only a fresh ready day collapses; states with a warning or a result stay open', () => {
  assert.equal(isTodayCardCollapsible({ state: 'ready' }), true);
  for (const state of ['in_progress', 'completed', 'rest', 'no_plan', 'unresolved']) {
    assert.equal(isTodayCardCollapsible({ state }), false, `${state} must stay fully open`);
  }
});

test('the ready card collapses to one compact row without hiding its primary action', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  const html = todayCardHTML(card, { expanded: false });
  assert.match(html, /is-collapsible/);
  assert.match(html, /is-collapsed/);
  assert.match(html, /data-action="toggle-today-card"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="homeTodayCardDetail"/);
  assert.equal((html.match(/id="homePrimaryCta"/g) || []).length, 1);
  assert.match(html, /id="homeTodayCardDetail"/);
});

test('expanding the ready card removes the collapsed class and flips the toggle', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  const html = todayCardHTML(card, { expanded: true });
  assert.doesNotMatch(html, /is-collapsed/);
  assert.match(html, /aria-expanded="true"/);
  assert.equal((html.match(/id="homePrimaryCta"/g) || []).length, 1);
});

test('a completed card never becomes a collapsed row', () => {
  const s = state();
  s.weeks['1'].lifts.mon['Bench Press'] = [
    { w: '60', r: '5', c: true },
    { w: '60', r: '5', c: true },
  ];
  s.weeks['1'].dates.mon = '2026-08-03';
  s.weeks['1'].sessionStatus.mon = 'finished';
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  const html = todayCardHTML(card, { expanded: false });
  assert.equal(card.state, 'completed');
  assert.doesNotMatch(html, /is-collapsible|is-collapsed|toggle-today-card/);
});

test('an off-plan lift in the active slot does not fake an imported completion', () => {
  // A completed lift outside the program's lift list lives in the ACTIVE week
  // slot. completionFor() does not count it, so Home must keep Start/Resume
  // rather than routing to Review and stranding the cockpit.
  const s = state();
  s.weeks['1'].dates.mon = '2026-08-03';
  s.weeks['1'].lifts.mon['Off Plan Curl'] = [{ w: '20', r: '10', c: true }];
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'ready');
  assert.deepEqual(card.primary, { action: 'select-program-workout', day: 'mon', label: 'Start workout' });
});

test('an imported archived session today is the completed Today card', () => {
  const s = state();
  s.weeks['arch:import:x'] = {
    activationId: 'imported', programId: 'imported', sessionId: 'og_x',
    sessionTitle: 'Imported Push',
    dates: { mon: '2026-08-03' },
    lifts: { mon: { 'Bench Press': [{ w: '80', r: '5', c: true }, { w: '80', r: '5', c: true }] } },
    gymStats: { mon: { time: '45:00' } },
    sessionStatus: { mon: 'finished' },
    runSessions: {},
  };
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'completed');
  assert.equal(card.title, 'Imported Push');
  assert.deepEqual(card.primary, { action: 'home-open-day-activity', date: '2026-08-03', label: 'Review activity' });
  const html = todayCardHTML(card);
  assert.match(html, /800 kg/);
  assert.match(html, /data-action="home-open-day-activity" data-date="2026-08-03"/);
  assert.equal((html.match(/id="homePrimaryCta"/g) || []).length, 1);
});

test('a run today does not hide a planned gym session', () => {
  const s = state();
  s.weeks['arch:import:run'] = {
    activationId: 'imported', programId: 'imported', sessionId: 'og_run',
    sessionTitle: 'Treadmill',
    dates: { mon: '2026-08-03' },
    lifts: { mon: {} },
    runSessions: { mon: [{ sessionId: 'r1', dist: '5', time: '25:00', localDate: '2026-08-03', source: 'fit' }] },
    sessionStatus: { mon: 'finished' },
  };
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'ready');
  assert.equal(card.primary.label, 'Start workout');
  assert.match(card.meta, /run already logged today/);
});

test('a finished session from a frozen program week is not “completed today”', () => {
  const s = state();
  s.weeks['1'].lifts.mon['Bench Press'] = [{ w: '60', r: '5', c: true }];
  s.weeks['1'].dates.mon = '2026-07-27'; // last week's Monday
  s.weeks['1'].sessionStatus.mon = 'finished';
  s.weeks['1'].gymStats.mon = { time: '45:00' };
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'ready');
  assert.equal(card.primary.label, 'Start workout');
});

test('a ready card previews the planned lifts with target and last time', () => {
  const s = state();
  s.weeks['2'] = {
    dates: { mon: '2026-07-27' },
    sessionStatus: {}, runs: {}, runSessions: {}, gymStats: {},
    lifts: { mon: { 'Bench Press': [{ w: '100', r: '5', c: true }] } },
  };
  const card = buildTodayCardModel({
    state: s, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.preview.length, 1);
  assert.deepEqual(card.preview[0], {
    name: 'Bench Press', sets: 2, reps: '5', weight: null, note: '',
    last: { weight: 100, reps: 5, date: '2026-07-27' },
  });
  const html = todayCardHTML(card);
  assert.match(html, /today-card__preview/);
  assert.match(html, /Bench Press/);
  assert.match(html, /2×5/);
  assert.match(html, /last 100 kg × 5/);
  assert.match(html, /today-card__preview-compact/);
});

test('a day whose plan moved away is rest, not the old weekday plan', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
    todayDay: 'mon', noSession: true,
  });
  assert.equal(card.state, 'rest');
  assert.equal(card.tone, 'rest');
  assert.deepEqual(card.primary, { action: 'open-wellness-checkin', label: 'Log wellness check-in' });
});

test('a brand-new athlete gets an explicit first-session state', () => {
  const fresh = state();
  fresh.weeks['1'].lifts = {};
  const card = buildTodayCardModel({
    state: fresh, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.equal(card.state, 'ready');
  assert.equal(card.eyebrow, 'First session');
  assert.match(card.guidance, /sets your baseline/);
  assert.deepEqual(card.primary, { action: 'select-program-workout', day: 'mon', label: 'Start workout' });
});

test('one completed set removes the first-session label', () => {
  const started = state();
  started.weeks['1'].lifts.mon = {
    'Bench Press': [{ w: '80', r: '5', c: true, tr: 5 }],
  };
  const card = buildTodayCardModel({
    state: started, program: PROGRAM, model, now: MONDAY, tz: DISPLAY_TZ,
  });
  assert.notEqual(card.eyebrow, 'First session');
});

test('a one-signal readiness read says it is limited instead of settled', () => {
  const started = state();
  started.weeks['0'] = { lifts: { mon: { 'Bench Press': [{ w: '80', r: '5', c: true, tr: 5 }] } }, runs: {}, runSessions: {}, gymStats: {} };
  const card = buildTodayCardModel({
    state: started, program: PROGRAM, now: MONDAY, tz: DISPLAY_TZ,
    model: { ready: { hasData: true, score: 55, confidence: 'low' }, rec: { badge: 'Productive', headline: 'On track' } },
  });
  const html = todayCardHTML(card, { expanded: false });
  assert.equal(card.readiness.confidence, 'low');
  // The confidence caveat moved from prose (hidden while collapsed) into the
  // always-visible readiness row.
  assert.match(html, /limited signal/);
  assert.doesNotMatch(html, /is limiting/);
  assert.doesNotMatch(card.guidance, /readiness 55/i);
});

test('the readiness row names the limiting signal only when there is more than one', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, now: MONDAY, tz: DISPLAY_TZ,
    model: {
      ready: {
        hasData: true, score: 62, status: 'Moderate', confidence: 'high',
        evidence: [
          { key: 'hrv', label: 'HRV vs baseline', score: 88 },
          { key: 'sleep', label: 'Latest sleep', score: 30 },
          { key: 'load', label: 'Training load balance', score: 75 },
        ],
      },
      rec: { badge: 'Productive', headline: 'On track' },
    },
  });
  assert.equal(card.readiness.limiting, 'Latest sleep');
  assert.equal(card.readiness.tone, 'moderate');
  const html = todayCardHTML(card, { expanded: false });
  assert.match(html, /Latest sleep is limiting/);
  const expandedHtml = todayCardHTML(card, { expanded: true });
  assert.match(expandedHtml, /Read from HRV vs baseline · Latest sleep · Training load balance\./);
});

test('no readiness data renders no row at all', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, now: MONDAY, tz: DISPLAY_TZ,
    model: { ready: { hasData: false }, rec: { badge: 'Getting Started', headline: 'Easy does it' } },
  });
  assert.equal(card.readiness, null);
  assert.doesNotMatch(todayCardHTML(card, { expanded: false }), /today-card__readiness/);
});

test('the readiness row is a link only while the Recovery module is on', () => {
  const ready = { hasData: true, score: 80, status: 'Ready', confidence: 'high' };
  const on = buildTodayCardModel({
    state: state(), program: PROGRAM, now: MONDAY, tz: DISPLAY_TZ,
    model: { ready, rec: { badge: 'Productive', headline: 'On track' } },
  });
  assert.equal(on.readiness.linked, true);
  assert.match(todayCardHTML(on, { expanded: false }), /data-context="recovery-score"/);

  const offState = state();
  offState.settings = { modules: { recovery: false } };
  const off = buildTodayCardModel({
    state: offState, program: PROGRAM, now: MONDAY, tz: DISPLAY_TZ,
    model: { ready, rec: { badge: 'Productive', headline: 'On track' } },
  });
  assert.equal(off.readiness.linked, false);
  const html = todayCardHTML(off, { expanded: false });
  assert.match(html, /today-card__readiness/);
  assert.doesNotMatch(html, /recovery-score/);
});


test('the offline note is visible in the card head, not only the detail', () => {
  const card = buildTodayCardModel({
    state: state(), program: PROGRAM, model, now: MONDAY, offline: true, tz: DISPLAY_TZ,
  });
  const html = todayCardHTML(card);
  const head = html.slice(html.indexOf('today-card__head'), html.indexOf('today-card__detail'));
  assert.match(head, /logging still saves on this device/);
});
