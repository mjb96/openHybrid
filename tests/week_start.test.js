// =============================================================================
// WEEK START (ST7 / G6)
//
// `settings.weekStartDay` is Monday by default and Sunday when the athlete
// chooses it. Calendar surfaces — Home's rail, History, bodyweight, and every
// Progress analytic — must follow it. Program weeks do NOT: a program week is a
// plan index over Monday-indexed day slots, so `startOfProgramWeek` stays Monday
// or "Week 2 of 8" would mean something different depending on a display
// preference.
//
// The pure analytics helpers resolve the preference through one projection that
// the app applies at boot and whenever it changes.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { calendarWeekStart, startOfProgramWeek } from '../js/dates.js';
import {
  buildCalendarWeekStrength,
  calendarWeekStartDay,
  collectCalendarWeek,
  setCalendarWeekStart,
  weekStartOf,
  weekdayKeyOf,
} from '../js/analytics/weekly-aggregate.js';
import { buildPulseModel } from '../js/analytics/pulse.js';
import { buildHomeWeekStrip } from '../js/home/week-strip.js';
import { buildWeeklyReview } from '../js/brain/weekly-review.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });

/** Run `fn` with a resolved week start, always restoring Monday afterwards. */
function withWeekStart(day, fn) {
  setCalendarWeekStart(day);
  try {
    return fn();
  } finally {
    setCalendarWeekStart('mon');
  }
}

// ---------------------------------------------------------------------------
// the one date rule
// ---------------------------------------------------------------------------
test('calendarWeekStart resolves Monday- and Sunday-start weeks', () => {
  // 2026-11-23 is a Monday; 2026-11-22 the Sunday before it.
  assert.equal(calendarWeekStart('2026-11-23'), '2026-11-23');
  assert.equal(calendarWeekStart('2026-11-29'), '2026-11-23', 'Sunday belongs to the Monday week that ends on it');
  assert.equal(calendarWeekStart('2026-11-23', 'sun'), '2026-11-22');
  assert.equal(calendarWeekStart('2026-11-22', 'sun'), '2026-11-22', 'the start day is its own week start');
  assert.equal(calendarWeekStart('2026-11-28', 'sun'), '2026-11-22');
  assert.equal(calendarWeekStart('2026-11-29', 'sun'), '2026-11-29');
  assert.equal(calendarWeekStart('not-a-date'), null);
  assert.equal(calendarWeekStart('2026-11-23', 'sunday'), '2026-11-23', 'only the exact "sun" value moves the week');
});

test('weekdayKeyOf names the real weekday, not the position in the week', () => {
  assert.equal(weekdayKeyOf('2026-11-22'), 'sun');
  assert.equal(weekdayKeyOf('2026-11-23'), 'mon');
  assert.equal(weekdayKeyOf('2026-11-28'), 'sat');
  assert.equal(weekdayKeyOf('nope'), null);
});

test('program weeks stay Monday-indexed regardless of the preference', () => {
  // A Sunday, under a Sunday-start calendar, is the FIRST day of the week —
  // but the program week that owns it still began on Monday the 16th.
  assert.equal(startOfProgramWeek('2026-11-22'), '2026-11-16');
  assert.equal(startOfProgramWeek('2026-11-23'), '2026-11-23');
});

// ---------------------------------------------------------------------------
// the resolved projection
// ---------------------------------------------------------------------------
test('the applied week start is the default for calendar maths, and an explicit argument wins', () => {
  assert.equal(calendarWeekStartDay(), 'mon', 'unresolved starts Monday');
  withWeekStart('sun', () => {
    assert.equal(calendarWeekStartDay(), 'sun');
    assert.equal(weekStartOf('2026-11-23'), '2026-11-22');
    assert.equal(weekStartOf('2026-11-23', 'mon'), '2026-11-23', 'an explicit day overrides the projection');
  });
  assert.equal(weekStartOf('2026-11-23'), '2026-11-23', 'unknown values fall back to Monday');
  setCalendarWeekStart('tuesday');
  assert.equal(calendarWeekStartDay(), 'mon');
});

// ---------------------------------------------------------------------------
// analytics attribution follows the week start
// ---------------------------------------------------------------------------
function fixture() {
  return {
    currentWeek: '1',
    activeProgramId: 'prog',
    settings: { weekStartDay: 'sun' },
    weeks: {
      '1': {
        // Sunday 22 Nov + Monday 23 Nov: one Sunday-start week, two Monday-start weeks.
        dates: { sun: '2026-11-22', mon: '2026-11-23' },
        lifts: {
          sun: { 'Bench Press': [done(100), done(100)] },
          mon: { 'Back Squat': [done(80)] },
        },
      },
    },
  };
}

test('Pulse buckets a Sunday session into the current week for a Sunday-start athlete', () => {
  const week = withWeekStart('sun', () => buildPulseModel(fixture(), { todayISO: '2026-11-23' }));
  assert.equal(week.week.startISO, '2026-11-22');
  assert.equal(week.week.endISO, '2026-11-28');
  assert.equal(week.week.days.length, 7);
  assert.equal(week.week.days[0].dateISO, '2026-11-22');
  assert.equal(week.week.days[0].day, 'sun', 'the weekday NAME follows the real date');
  assert.equal(week.week.days[1].day, 'mon');
  assert.equal(week.week.days[0].sessions, 1, 'the Sunday session is in this week');
  assert.equal(week.week.days[1].sessions, 1);
  assert.equal(week.sessions, 2);

  // Monday start: the Sunday session belongs to the PREVIOUS calendar week.
  const monday = withWeekStart('mon', () => buildPulseModel(fixture(), { todayISO: '2026-11-23' }));
  assert.equal(monday.week.startISO, '2026-11-23');
  assert.equal(monday.sessions, 1);
});

test('calendar-week strength keeps every date and shifts the week boundary', () => {
  const state = fixture();
  const sunday = withWeekStart('sun', () => buildCalendarWeekStrength(state, {
    today: '2026-11-23', weekStart: '2026-11-22',
  }));
  assert.equal(sunday.startDate, '2026-11-22');
  assert.equal(sunday.endDate, '2026-11-28');
  assert.deepEqual(sunday.days.map((d) => d.date), [
    '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25',
    '2026-11-26', '2026-11-27', '2026-11-28',
  ]);
  assert.equal(sunday.days[0].workingSets, 2, 'Sunday 22 Nov');
  assert.equal(sunday.days[1].workingSets, 1, 'Monday 23 Nov');
  assert.equal(sunday.totalWorkingSets, 3);

  const monday = withWeekStart('mon', () => buildCalendarWeekStrength(state, {
    today: '2026-11-23', weekStart: '2026-11-23',
  }));
  assert.equal(monday.totalWorkingSets, 1, 'the Sunday session is not in the Monday-start week');
  assert.equal(monday.days[0].date, '2026-11-23');
});

test('collectCalendarWeek marks the week position, never claiming it is Monday', () => {
  const week = withWeekStart('sun', () => collectCalendarWeek(fixture(), '2026-11-22'));
  // The stored slots come back under their POSITION keys; `dates` is the truth.
  assert.deepEqual(week.dates.mon, '2026-11-22');
  assert.deepEqual(week.dates.tue, '2026-11-23');
  assert.equal(week.sourceSlots[0].date, '2026-11-22');
  assert.equal(week.sourceSlots[0].sourceDay, 'sun');
});

test('Weekly Review totals use the same week boundary as the hub', () => {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const program = {
    totalWeeks: 12,
    days: {
      sun: { title: 'Bench', runs: 'Rest', lifts: [{ name: 'Bench Press' }] },
      mon: { title: 'Squat', runs: 'Rest', lifts: [{ name: 'Back Squat' }] },
    },
  };
  const state = {
    ...fixture(),
    weekStartedAt: '2026-11-23',
    loadMetrics: { atl: 0, ctl: 0 },
    hybridScore: { xp: 0, lastRecordedDate: '2026-11-23', history: [] },
  };
  const sunday = withWeekStart('sun', () => buildWeeklyReview(state, days, program, { today: '2026-11-23' }));
  assert.equal(sunday.totals.sessions, 2, 'Sunday + Monday are one week for a Sunday-start athlete');
  const monday = withWeekStart('mon', () => buildWeeklyReview(state, days, program, { today: '2026-11-23' }));
  assert.equal(monday.totals.sessions, 1, 'the Sunday session is last week for a Monday-start athlete');
});

test('Home week strip anchors on the athlete week and labels the real weekdays', () => {
  const state = { settings: { weekStartDay: 'sun' }, weeks: {} };
  const strip = buildHomeWeekStrip({ state, today: '2026-11-23' });
  assert.equal(strip.weekStart, '2026-11-22');
  assert.deepEqual(strip.days.map((d) => d.day), ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);
  assert.deepEqual(strip.days.map((d) => d.date), [
    '2026-11-22', '2026-11-23', '2026-11-24', '2026-11-25',
    '2026-11-26', '2026-11-27', '2026-11-28',
  ]);
  assert.equal(strip.days[1].isToday, true);
});

// ---------------------------------------------------------------------------
// wiring: the setting must reach the resolver and repaint (S-F3)
// ---------------------------------------------------------------------------
test('the app applies the setting at boot/change and the setter repaints', () => {
  const app = readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  assert.match(app, /setCalendarWeekStart\(appState\.settings\?\.weekStartDay\)/,
    'app:storage-loaded must project settings.weekStartDay onto calendar maths');
  assert.match(app, /addEventListener\('settings:changed'[\s\S]{0,400}weekStartDay/,
    'a cross-tab settings sync must also re-apply the projection');
  const settings = readFileSync(path.join(ROOT, 'js/settings.js'), 'utf8');
  const setter = settings.slice(settings.indexOf('export function setWeekStartDay'));
  assert.match(setter.slice(0, 600), /document\.dispatchEvent\(new Event\('app:storage-loaded'\)\)/,
    'changing the week start must repaint the calendar surfaces, not wait for navigation');
});
