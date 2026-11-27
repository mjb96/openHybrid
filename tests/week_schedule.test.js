// =============================================================================
// WEEK SCHEDULE (HM2 model)
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMove, hasPlan, isMovedAway, moveOptions, movableDay, scheduledDateFor, scheduledDayForDate, undoMove,
} from '../js/schedule/week.js';

const TODAY = '2026-11-25'; // Wednesday
const WEEK = '2026-11-23';
const program = {
  days: {
    mon: { title: 'Push', lifts: ['Bench Press'] },
    tue: { title: 'Pull', lifts: ['Barbell Row'] },
    wed: { title: 'Legs', lifts: ['Back Squat'] },
    thu: { title: 'Press', lifts: ['Overhead Press'] },
    fri: { title: 'Rest', lifts: [] },
    sat: { title: 'Rest', lifts: [] },
    sun: { title: 'Rest', lifts: [] },
  },
};
const state = () => ({ currentWeek: '1', weeks: { '1': { lifts: {}, sessionStatus: {} } } });

test('a day resolves to its weekday date until it is moved', () => {
  const s = state();
  assert.equal(scheduledDateFor(s, WEEK, 'wed'), '2026-11-25');
  assert.equal(scheduledDateFor(s, WEEK, 'sun'), '2026-11-29');
  const owner = scheduledDayForDate(s, program, '2026-11-25');
  assert.deepEqual(owner, { day: 'wed', date: '2026-11-25', moved: false });
  assert.equal(scheduledDayForDate(s, program, '2026-11-27'), null);
});

test('a moved day owns the target date and its old weekday becomes rest', () => {
  const s = state();
  const result = applyMove(s, program, 'wed', '2026-11-27', { today: TODAY });
  assert.equal(result.ok, true, result.reason);
  assert.deepEqual(scheduledDayForDate(s, program, '2026-11-27'), { day: 'wed', date: '2026-11-27', moved: true });
  assert.equal(scheduledDayForDate(s, program, '2026-11-25'), null, 'the old weekday must not still claim the plan');
  assert.equal(scheduledDateFor(s, WEEK, 'wed'), '2026-11-27');
});

test('move options disable the current date, the past and plan-occupied dates', () => {
  const s = state();
  const options = moveOptions(s, program, 'wed', { today: TODAY });
  const byDate = Object.fromEntries(options.map((entry) => [entry.date, entry.disabled]));
  assert.equal(byDate['2026-11-25'], 'This workout');
  assert.equal(byDate['2026-11-23'], 'In the past');
  assert.equal(byDate['2026-11-26'], 'Already has a session');
  assert.equal(byDate['2026-11-27'], null);
  assert.equal(byDate['2026-11-28'], null);
});

test('a logged session on a date is not a free target', () => {
  const s = state();
  const options = moveOptions(s, program, 'wed', { today: TODAY, isDateLogged: (date) => date === '2026-11-28' });
  assert.equal(options.find((entry) => entry.date === '2026-11-28').disabled, 'Already has a session');
});

test('a started or logged workout cannot be moved', () => {
  const s = state();
  s.weeks['1'].sessionStatus.wed = 'in_progress';
  assert.equal(movableDay(s, program, 'wed', WEEK).ok, false);
  s.weeks['1'].sessionStatus.wed = 'finished';
  assert.equal(movableDay(s, program, 'wed', WEEK).ok, false);

  const logged = state();
  logged.weeks['1'].lifts.wed = { 'Back Squat': [{ w: '100', r: '5', c: true }] };
  assert.equal(movableDay(logged, program, 'wed', WEEK).ok, false);
  assert.equal(movableDay(state(), program, 'fri', WEEK).ok, false, 'a rest day has no workout to move');
});

test('a past week cannot be moved into this week', () => {
  const s = state();
  assert.deepEqual(moveOptions(s, program, 'wed', { today: TODAY, weekStart: '2026-11-16' }), []);
  const result = applyMove(s, program, 'wed', '2026-11-27', { today: TODAY, weekStart: '2026-11-16' });
  assert.equal(result.ok, false);
  assert.match(result.reason, /this week/i);
  assert.equal(s.weekSchedule, undefined, 'nothing was written');
});

test('movableDay reads the week that owns the planned date, not state.currentWeek', () => {
  const s = { currentWeek: '2', weeks: {
    '1': { dates: { wed: '2026-11-25' }, sessionStatus: { wed: 'finished' }, lifts: {} },
    '2': { dates: {}, sessionStatus: {}, lifts: {} },
  } };
  assert.equal(movableDay(s, program, 'wed', WEEK).ok, false);
});

test('a move is validated, then undo restores the previous schedule exactly', () => {
  const s = state();
  const first = applyMove(s, program, 'wed', '2026-11-27', { today: TODAY });
  assert.equal(first.ok, true);
  assert.equal(first.previous, null);
  const second = applyMove(s, program, 'wed', '2026-11-29', { today: TODAY });
  assert.equal(second.ok, true);
  assert.equal(second.previous, '2026-11-27');

  assert.equal(undoMove(s, 'wed', WEEK, second.previous), true);
  assert.equal(scheduledDateFor(s, WEEK, 'wed'), '2026-11-27');
  assert.equal(undoMove(s, 'wed', WEEK, first.previous), true);
  assert.equal(scheduledDateFor(s, WEEK, 'wed'), '2026-11-25');
  assert.equal(s.weekSchedule[WEEK], undefined, 'an empty week map is pruned');
});

test('invalid moves change nothing', () => {
  const s = state();
  const cases = [
    ['2026-11-25', 'Already on that day'],
    ['2026-11-23', 'Choose today or later'],
    ['2026-11-26', 'Already has a session'], // Thursday has its own plan
    ['2026-12-02', 'Choose a date this week'],
  ];
  for (const [target, reason] of cases) {
    const result = applyMove(s, program, 'wed', target, { today: TODAY });
    assert.equal(result.ok, false, target);
    assert.equal(result.reason, reason, target);
  }
  assert.equal(scheduledDateFor(s, WEEK, 'wed'), '2026-11-25');
});

test('logged work keeps its stamped date, so a move never rewrites history', () => {
  const s = state();
  s.weeks['1'].dates = { tue: '2026-11-24' };
  s.weeks['1'].lifts.tue = { 'Barbell Row': [{ w: '60', r: '8', c: true }] };
  applyMove(s, program, 'wed', '2026-11-27', { today: TODAY });
  assert.equal(s.weeks['1'].dates.tue, '2026-11-24');
  assert.equal(s.weeks['1'].lifts.tue['Barbell Row'][0].w, '60');
});

test('hasPlan treats a REST/recovery run label as no plan', () => {
  assert.equal(hasPlan({ days: { mon: { lifts: ['Squat'] } } }, 'mon'), true);
  assert.equal(hasPlan({ days: { mon: { lifts: [], runs: 'Rest' } } }, 'mon'), false);
  assert.equal(hasPlan({ days: { mon: { lifts: [], runs: 'Recovery walk' } } }, 'mon'), false);
  assert.equal(hasPlan({ days: { mon: { lifts: [], runs: 'Easy 5 km' } } }, 'mon'), true);
});

test('a moved-away day reports that its weekday is now rest', () => {
  const s = state();
  assert.equal(isMovedAway(s, 'wed', WEEK), false);
  applyMove(s, program, 'wed', '2026-11-27', { today: TODAY });
  assert.equal(isMovedAway(s, 'wed', WEEK), true);
  assert.equal(isMovedAway(s, 'thu', WEEK), false);
});
