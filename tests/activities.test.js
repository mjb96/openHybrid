import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activityDestinationForDate, buildActivityHistory, filterActivityHistory, searchActivityHistory,
} from '../js/activities/model.js';
import {
  deleteRunActivity, deleteStrengthActivity,
  restoreRunActivity, restoreStrengthActivity,
} from '../js/activities/mutations.js';
import { buildSessionRecap } from '../js/session-recap.js';

function fixture() {
  return {
    settings: { weightUnit: 'kg' },
    activeActivationId: 'act_1',
    weeks: {
      '1': {
        activationId: 'act_1',
        dates: { mon: '2026-07-13' },
        lifts: { mon: { Squat: [{ c: true, w: '100', r: '5' }] } },
        liftOrder: { mon: ['Squat'] },
        liftMeta: { mon: { Squat: { groupId: null } } },
        notes: { mon: 'Strong day' },
        gymRpe: { mon: '8' },
        gymStats: { mon: { time: '45:00', avgHR: '120' } },
        runs: { mon: { sessionId: 'run_b', dist: '3', time: '15:00' } },
        runSessions: { mon: [
          { sessionId: 'run_a', source: 'gps', localDate: '2026-07-13', startTs: 100, dist: '5', time: '25:00', splits: [] },
          { sessionId: 'run_b', source: 'manual', localDate: '2026-07-13', startTs: 200, dist: '3', time: '15:00', splits: [] },
        ] },
      },
    },
  };
}

test('history creates one strength row and one row for every same-day run', () => {
  const rows = buildActivityHistory(fixture());
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.kind).sort(), ['run', 'run', 'strength']);
  assert.deepEqual(rows.filter((row) => row.kind === 'run').map((row) => row.sessionId), ['run_b', 'run_a']);
  assert.equal(rows.find((row) => row.kind === 'strength').workingSets, 1);
  assert.ok(rows.every((row) => row.activationId === 'act_1'));
  assert.equal(filterActivityHistory(rows, 'run', '2026-07-13').length, 2);
});

test('history can be scoped to one exact program activation', () => {
  const state = fixture();
  state.weeks['arch:act_old:1'] = {
    activationId: 'act_old', dates: { tue: '2026-06-01' },
    lifts: { tue: { Bench: [{ c: true, w: '80', r: '8' }] } },
  };
  const rows = buildActivityHistory(state);
  const old = filterActivityHistory(rows, 'all', null, 'act_old');
  assert.equal(old.length, 1);
  assert.equal(old[0].activationId, 'act_old');
  assert.equal(old[0].exercises[0], 'Bench');
});

test('one-off strength sessions keep their identity and title in history', () => {
  const state = fixture();
  state.weeks['session:str_1'] = {
    sessionId: 'str_1', sessionKind: 'copy', sessionTitle: 'Copy of Upper',
    dates: { mon: '2026-07-13' },
    lifts: { mon: { Bench: [{ c: true, w: '80', r: '8' }] } },
  };
  const rows = buildActivityHistory(state).filter((row) => row.kind === 'strength');
  assert.equal(rows.length, 2);
  const copied = rows.find((row) => row.sessionId === 'str_1');
  assert.equal(copied.id, 'strength:str_1');
  assert.equal(copied.title, 'Copy of Upper');
});

test('a date with one activity opens it directly', () => {
  const rows = buildActivityHistory(fixture());
  const destination = activityDestinationForDate(rows, '2026-07-13');
  assert.equal(destination.mode, 'list');

  const onlyStrength = rows.filter((row) => row.kind === 'strength');
  const single = activityDestinationForDate(onlyStrength, '2026-07-13');
  assert.equal(single.mode, 'detail');
  assert.equal(single.activity.kind, 'strength');
});

test('multiple same-day activities stay as a chooser instead of picking arbitrarily', () => {
  const destination = activityDestinationForDate(buildActivityHistory(fixture()), '2026-07-13');
  assert.equal(destination.mode, 'list');
  assert.equal(destination.activity, null);
  assert.equal(destination.rows.length, 3);
});

test('deleting an exact run preserves its sibling and all strength data', () => {
  const state = fixture();
  const week = state.weeks['1'];
  const snapshot = deleteRunActivity(week, 'mon', 'run_a');
  assert.equal(snapshot.sessionId, 'run_a');
  assert.deepEqual(week.runSessions.mon.map((run) => run.sessionId), ['run_b']);
  assert.equal(week.runs.mon.sessionId, 'run_b');
  assert.equal(week.lifts.mon.Squat[0].w, '100');
  assert.equal(restoreRunActivity(week, 'mon', snapshot), true);
  assert.deepEqual(week.runSessions.mon.map((run) => run.sessionId).sort(), ['run_a', 'run_b']);
});

test('deleting strength preserves every run and can be fully undone', () => {
  const state = fixture();
  const week = state.weeks['1'];
  const snapshot = deleteStrengthActivity(week, 'mon', {
    lifts: { Squat: [{ c: false, w: '', r: '5' }] },
    liftOrder: ['Squat'],
  });
  assert.equal(week.lifts.mon.Squat[0].c, false);
  assert.equal(week.notes.mon, '');
  assert.deepEqual(week.runSessions.mon.map((run) => run.sessionId), ['run_a', 'run_b']);
  assert.equal(restoreStrengthActivity(week, 'mon', snapshot), true);
  assert.equal(week.lifts.mon.Squat[0].w, '100');
  assert.equal(week.notes.mon, 'Strong day');
  assert.equal(week.gymStats.mon.avgHR, '120');
});

test('activity detail isolates strength from runs and an exact run from strength', () => {
  const state = fixture();
  const strength = buildSessionRecap(state, '1', 'mon', null, 'strength');
  const run = buildSessionRecap(state, '1', 'mon', 'run_a', 'run');
  assert.equal(strength.lifts.length, 1);
  assert.equal(strength.run, null);
  assert.equal(run.lifts.length, 0);
  assert.equal(run.run.sessionId, 'run_a');
  assert.equal(run.run.distKm, 5);
});

test('a cardio-only imported session does not create a phantom strength row', () => {
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      'arch:import:cardio': {
        activationId: 'imported', programId: 'imported', sessionId: 'og_cardio',
        sessionTitle: 'Treadmill', source: 'csv-import',
        dates: { mon: '2026-07-13' },
        lifts: { mon: {} },
        notes: { mon: 'Easy treadmill session' },
        gymRpe: { mon: '' },
        gymStats: { mon: {} },
        runSessions: { mon: [{ sessionId: 'run_csv', source: 'csv-import', localDate: '2026-07-13', dist: '2.5', time: '25:00' }] },
      },
    },
  };
  const rows = buildActivityHistory(state);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'run');
  assert.equal(rows[0].title, 'Treadmill');
});

test('FIT strength keeps duration/HR detail even with no exercise names', () => {
  const state = {
    settings: { weightUnit: 'kg', distanceUnit: 'km' },
    weeks: {
      'arch:fitgym:123': {
        activationId: 'imported', programId: 'imported', sessionId: 'fit_123',
        sessionTitle: 'Imported Strength Activity', source: 'fit',
        dates: { mon: '2026-07-13' },
        lifts: { mon: {} },
        gymStats: { mon: { time: '45:00', avgHR: '120', maxHR: '150', cals: '300' } },
        runSessions: {},
      },
    },
  };
  const rows = buildActivityHistory(state);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].kind, 'strength');
  const recap = buildSessionRecap(state, 'arch:fitgym:123', 'mon');
  assert.equal(recap.empty, false);
  assert.deepEqual(recap.types, ['gym']);
  assert.equal(recap.duration, '45:00');
  assert.equal(recap.gymHR, '120');
});

test('activity rows honour the athlete’s weight/distance units and import provenance', () => {
  const state = fixture();
  state.settings = { weightUnit: 'lbs', distanceUnit: 'mi' };
  state.weeks['1'].runSessions.mon[0].source = 'csv-import';
  state.weeks['1'].runSessions.mon[0].pace = '5:00';
  const rows = buildActivityHistory(state);
  const strength = rows.find((row) => row.kind === 'strength');
  const run = rows.find((row) => row.kind === 'run' && row.sessionId === 'run_a');
  // ST6: 100 kg x 5 sets-tonnage reads as 1,102 lb for a lb athlete.
  assert.match(strength.metrics.join(' '), /1,102 lb/);
  assert.match(run.metrics.join(' '), /3\.11 mi/);
  assert.match(run.metrics.join(' '), /8:03 \/mi/);
  assert.equal(run.subtitle, 'Imported from CSV');
  assert.equal(run.provenance, 'Imported from CSV');
});

test('a programmed week resolves the same day title Home shows', () => {
  const state = fixture();
  state.weeks['1'].programId = 'act_1';
  const rows = buildActivityHistory(state, {
    programLookup: (id) => (id === 'act_1' ? { days: { mon: { title: 'Push Strength' } } } : null),
  });
  assert.equal(rows.find((row) => row.kind === 'strength').title, 'Push Strength');
});

test('history search matches title, exercise, run name and metrics', () => {
  const rows = buildActivityHistory(fixture());
  assert.equal(searchActivityHistory(rows, 'squat').length, 1);
  assert.equal(searchActivityHistory(rows, 'gps').length, 1, 'run provenance is searchable');
  assert.equal(searchActivityHistory(rows, 'not-a-thing').length, 0);
});

test('deleting strength clears and restores session lifecycle', () => {
  const state = fixture();
  const week = state.weeks['1'];
  week.sessionStatus = { mon: 'finished' };
  week.sessionSummary = { mon: { finishedAt: '2026-07-13T10:00:00Z' } };
  const snapshot = deleteStrengthActivity(week, 'mon', { lifts: {}, liftOrder: [] });
  assert.equal(week.sessionStatus.mon, undefined);
  assert.equal(week.sessionSummary.mon, undefined);
  restoreStrengthActivity(week, 'mon', snapshot);
  assert.equal(week.sessionStatus.mon, 'finished');
  assert.deepEqual(week.sessionSummary.mon, { finishedAt: '2026-07-13T10:00:00Z' });
});

test('source filter separates logged-in-app work from imports', () => {
  const state = fixture();
  state.weeks['arch:import:upper'] = {
    activationId: 'imported', programId: 'imported', sessionId: 'og_upper', source: 'csv-import',
    dates: { tue: '2026-07-14' },
    lifts: { tue: { 'Bench Press': [{ c: true, w: '80', r: '8' }] } },
    runs: {}, runSessions: {},
  };
  state.weeks['arch:fit:run'] = {
    activationId: 'imported', programId: 'imported', sessionId: 'fit_run',
    dates: { wed: '2026-07-15' }, lifts: {},
    runs: {}, runSessions: { wed: [{ sessionId: 'fit_run_1', source: 'fit', dist: '10', time: '50:00', localDate: '2026-07-15' }] },
  };
  const rows = buildActivityHistory(state);
  assert.equal(rows.find((row) => row.sessionId === 'og_upper').origin, 'imported');
  assert.equal(rows.find((row) => row.sessionId === 'fit_run_1').origin, 'imported');
  assert.equal(rows.find((row) => row.sessionId === 'run_a').origin, 'app');
  assert.equal(filterActivityHistory(rows, 'all', null, null, 'imported').length, 2);
  assert.equal(filterActivityHistory(rows, 'all', null, null, 'app').length, 3);
  assert.equal(filterActivityHistory(rows, 'all', null, null, 'all').length, 5);
});
