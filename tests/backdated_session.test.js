// =============================================================================
// G3 — backdated strength: date validation, day occupancy, the noon stamp
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  backdatedNoon, dayOccupancy, isValidBackdatedDate,
} from '../js/workout/backdated-session.js';
import { localDayKey } from '../js/dates.js';

const TODAY = '2026-11-26';

test('a past or today date is usable; a future or junk date is not', () => {
  assert.equal(isValidBackdatedDate('2026-11-20', TODAY).ok, true);
  assert.equal(isValidBackdatedDate(TODAY, TODAY).ok, true);
  assert.equal(isValidBackdatedDate('2026-11-27', TODAY).ok, false);
  assert.match(isValidBackdatedDate('2026-11-27', TODAY).reason, /future/);
  assert.equal(isValidBackdatedDate('2026-02-30', TODAY).ok, false);
  assert.equal(isValidBackdatedDate('not-a-date', TODAY).ok, false);
  assert.equal(isValidBackdatedDate('1999-12-31', TODAY).ok, false);
});

test('a day counts its strength sessions and runs separately', () => {
  const state = { weeks: {
    '1': {
      activationId: 'act', programId: 'p', dates: { mon: '2026-11-20' },
      lifts: { mon: { 'Back Squat': [{ c: true, w: '100', r: '5' }] } },
      gymStats: { mon: { time: '45:00' } }, runSessions: {},
    },
    '2': {
      // A different session identity on the same date: two real records, not a
      // duplicate of the same programmed day.
      sessionId: 'sess_run', activationId: 'act', programId: 'p', dates: { mon: '2026-11-20' },
      lifts: {}, gymStats: {}, runSessions: { mon: [{ sessionId: 'r1', localDate: '2026-11-20', dist: '5', time: '25:00' }] },
    },
  } };
  const occupied = dayOccupancy(state, '2026-11-20');
  assert.equal(occupied.strength, 1);
  assert.equal(occupied.runs, 1);
  assert.equal(occupied.total, 2);
  assert.equal(dayOccupancy(state, '2026-11-19').total, 0);
});

test('the stamp is the chosen local date at noon, never a UTC boundary', () => {
  const noon = backdatedNoon('2026-11-20');
  assert.ok(noon instanceof Date);
  assert.equal(localDayKey(noon), '2026-11-20');
  assert.equal(noon.getHours(), 12);
  assert.equal(backdatedNoon('nope'), null);
});
