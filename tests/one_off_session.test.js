import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeWorkoutDay, activeWorkoutDayForWeek, activeWorkoutWeekKey, clearActiveOneOffSession,
  createOneOffStrengthSession, oneOffBlueprint,
} from '../js/workout/one-off-session.js';

test('empty workout gets an independent non-program storage slot', () => {
  const state = { currentWeek: '2', weeks: { 2: { lifts: { tue: { Squat: [{ c: true }] } } } } };
  const session = createOneOffStrengthSession(state, {
    now: new Date('2026-07-16T08:00:00+10:00'),
    tz: 'Australia/Sydney',
  });
  assert.match(session.key, /^session:str_/);
  assert.equal(activeWorkoutWeekKey(state), session.key);
  assert.equal(activeWorkoutDay(state, 'mon'), 'thu');
  assert.deepEqual(state.weeks['2'].lifts.tue.Squat, [{ c: true }]);
  assert.deepEqual(oneOffBlueprint(state).lifts, []);
});

test('copy workout preserves editable values but clears completion and PR flags', () => {
  const sourceWeek = {
    lifts: { mon: { Bench: [{ w: '80', r: '8', c: true, isPR: true, type: '' }] } },
    liftOrder: { mon: ['Bench'] },
  };
  const state = { currentWeek: '1', weeks: {} };
  const session = createOneOffStrengthSession(state, {
    kind: 'copy', title: 'Copy of Upper', sourceWeek, sourceDay: 'mon',
    sourceActivityId: 'strength:1:mon', now: new Date('2026-07-16T08:00:00+10:00'),
    tz: 'Australia/Sydney',
  });
  assert.deepEqual(session.week.lifts.thu.Bench, [{ w: '80', r: '8', c: false, type: '' }]);
  assert.deepEqual(session.week.liftOrder.thu, ['Bench']);
  assert.equal(oneOffBlueprint(state).title, 'Copy of Upper');
  clearActiveOneOffSession(state);
  assert.equal(activeWorkoutWeekKey(state), '1');
});

test('one-off weekday and stored date stay aligned across a timezone boundary', () => {
  const state = { currentWeek: '1', weeks: {} };
  const session = createOneOffStrengthSession(state, {
    now: new Date('2026-07-16T08:00:00+10:00'),
    tz: 'UTC',
  });

  assert.equal(session.day, 'wed');
  assert.equal(session.week.dates.wed, '2026-07-15');
  assert.ok(session.week.lifts.wed);
});

test('a day resolved for a week is the tick/untick pair, never the one-off day alone', () => {
  const state = { currentWeek: '2', weeks: {} };
  createOneOffStrengthSession(state, {
    now: new Date('2026-07-16T08:00:00+10:00'),
    tz: 'Australia/Sydney',
  });
  assert.equal(activeWorkoutDayForWeek(state, activeWorkoutWeekKey(state), 'mon'), 'thu');
  // A programme week keeps the selected programme day; the one-off's weekday
  // must not be borrowed for a different storage slot.
  assert.equal(activeWorkoutDayForWeek(state, '2', 'mon'), 'mon');
});
