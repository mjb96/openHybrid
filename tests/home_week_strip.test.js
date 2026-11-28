// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHomeWeekStrip } from '../js/home/week-strip.js';

const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const program = {
  days: {
    mon: { title: 'Push', lifts: ['Bench Press'], runs: 'Rest' },
    tue: { title: 'Pull', lifts: ['Row'], runs: 'Rest' },
    wed: { title: 'Legs', lifts: ['Squat'], runs: 'Rest' },
    thu: { title: 'Run', lifts: [], runs: 'Easy 5 km' },
    fri: { title: 'Push', lifts: ['Press'], runs: 'Rest' },
    sat: { title: 'Rest', lifts: [], runs: 'Rest' },
    sun: { title: 'Rest', lifts: [], runs: 'Rest' },
  },
};

const state = {
  currentWeek: '1',
  weekStartedAt: '2026-11-16',
  settings: { weekStartDay: 'mon' },
  weeks: {
    '1': {
      dates: {
        mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18', thu: '2026-11-19',
        fri: '2026-11-20', sat: '2026-11-21', sun: '2026-11-22',
      },
      lifts: {
        mon: { 'Bench Press': [{ w: '80', r: '5', c: true }] },
        tue: { Row: [{ w: '60', r: '8', c: false }] },
      },
      runSessions: {},
    },
  },
};

test('marks done, today, missed and rest days', () => {
  const strip = buildHomeWeekStrip({ state, program, days, today: '2026-11-19' });
  const byDay = Object.fromEntries(strip.days.map((d) => [d.day, d]));
  assert.equal(byDay.mon.status, 'done');
  assert.equal(byDay.tue.status, 'missed');
  assert.equal(byDay.wed.status, 'missed');
  assert.equal(byDay.thu.status, 'today');
  assert.equal(byDay.fri.status, 'planned');
  assert.equal(byDay.sat.status, 'rest');
  assert.equal(strip.doneCount, 1);
  assert.equal(strip.plannedCount, 5);
});

test('a moved day carries its plan on the target date and rests on its own', () => {
  const moved = {
    ...state,
    settings: { weekStartDay: 'mon' },
    weeks: { '1': { ...state.weeks['1'], runSessions: {} } },
    weekSchedule: { '2026-11-16': { thu: '2026-11-21' } }, // Thursday → Saturday
  };
  const strip = buildHomeWeekStrip({ state: moved, program, days, today: '2026-11-19' });
  const byDate = Object.fromEntries(strip.days.map((d) => [d.date, d]));
  assert.equal(byDate['2026-11-21'].programDay, 'thu');
  assert.equal(byDate['2026-11-21'].status, 'planned');
  assert.equal(byDate['2026-11-21'].moved, true);
  assert.equal(byDate['2026-11-19'].planned, false, 'the original weekday must not still show a plan');
  assert.equal(byDate['2026-11-19'].status, 'rest');
  assert.equal(strip.plannedCount, 5);
});

test('the strip names the next planned session after today', () => {
  const strip = buildHomeWeekStrip({ state, program, days, today: '2026-11-19' });
  assert.deepEqual(strip.nextPlanned, { date: '2026-11-20', day: 'fri', title: 'Push' });
});

test('today own session is not repeated as "next up", and nothing is left after Friday', () => {
  const todayStrip = buildHomeWeekStrip({ state, program, days, today: '2026-11-17' });
  // Tuesday is today, so the next planned day is Wednesday - never today.
  assert.equal(todayStrip.nextPlanned.date, '2026-11-18');
  const friday = buildHomeWeekStrip({ state, program, days, today: '2026-11-20' });
  // Only Saturday/Sunday remain and both are rest days.
  assert.equal(friday.nextPlanned, null);
});

test('a completed run counts as done and respects the week start', () => {
  state.weeks['1'].runSessions.thu = [{ sessionId: 'r1', dist: '5', time: '27:00' }];
  state.settings.weekStartDay = 'sun';
  const strip = buildHomeWeekStrip({ state, program, days, today: '2026-11-19' });
  assert.equal(strip.days[0].day, 'sun');
  assert.equal(strip.days.find((d) => d.day === 'thu').status, 'done');
  state.settings.weekStartDay = 'mon';
  delete state.weeks['1'].runSessions.thu;
});

test('a mid-week anchor does not relabel Friday as Monday', () => {
  const anchored = {
    currentWeek: '1',
    weekStartedAt: '2026-11-20', // Friday: the activation day, not the Monday anchor
    settings: { weekStartDay: 'mon' },
    weeks: { '1': { dates: {}, lifts: {}, runSessions: {} } },
  };
  const strip = buildHomeWeekStrip({ state: anchored, program, days, today: '2026-11-20' });
  const byDay = Object.fromEntries(strip.days.map((day) => [day.day, day]));
  assert.equal(byDay.mon.date, '2026-11-16');
  assert.equal(byDay.fri.date, '2026-11-20');
  assert.equal(byDay.fri.status, 'today');
  assert.equal(byDay.mon.status, 'missed');
});

test('a rest-only week reports no plan percentage', () => {
  const restProgram = { days: Object.fromEntries(days.map((d) => [d, { title: 'Rest', lifts: [], runs: 'Rest' }])) };
  const restState = { currentWeek: '1', settings: { weekStartDay: 'mon' }, weeks: { '1': { dates: Object.fromEntries(days.map((d, i) => [d, `2026-11-${16 + i}`])) } } };
  const strip = buildHomeWeekStrip({ state: restState, program: restProgram, days, today: '2026-11-19' });
  assert.equal(strip.plannedCount, 0);
  assert.equal(strip.pct, null);
});

test('an imported/archived session on today’s date counts as done', () => {
  const imported = {
    currentWeek: '1',
    settings: { weekStartDay: 'mon' },
    weeks: {
      '1': { dates: {}, lifts: {}, runSessions: {} },
      'arch:import:x': {
        activationId: 'imported', programId: 'imported', sessionId: 'og_x',
        dates: { mon: '2026-11-16' },
        lifts: { mon: { Bench: [{ w: '80', r: '5', c: true }] } },
        runSessions: {},
      },
    },
  };
  const strip = buildHomeWeekStrip({ state: imported, program, days, today: '2026-11-19' });
  const mon = strip.days.find((day) => day.day === 'mon');
  assert.equal(mon.status, 'done');
  assert.equal(mon.date, '2026-11-16');
  assert.equal(strip.weekStart, '2026-11-16');
  assert.equal(strip.range, '16 Nov – 22 Nov');
});

test('a frozen program week does not relabel last week as this week', () => {
  const frozen = {
    currentWeek: '1',
    settings: { weekStartDay: 'mon' },
    weeks: {
      '1': {
        dates: { mon: '2026-11-09', tue: '2026-11-10' },
        lifts: { mon: { Bench: [{ w: '80', r: '5', c: true }] } },
        runSessions: {},
      },
    },
  };
  const strip = buildHomeWeekStrip({ state: frozen, program, days, today: '2026-11-19' });
  const mon = strip.days.find((day) => day.day === 'mon');
  // The real Monday of today's calendar week is 2026-11-16 and has no work.
  assert.equal(mon.date, '2026-11-16');
  assert.equal(mon.status, 'missed');
  assert.equal(strip.doneCount, 0);
});
