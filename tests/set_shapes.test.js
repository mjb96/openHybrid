// ==========================================
// SET SHAPES — a set can be reps, a timed hold or a carry.
// These tests pin the honest arithmetic: holds/carries count as work, but they
// never invent reps or tonnage, and they survive import and recap intact.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SET_MODE, dayVolume, formatDistance, formatDuration, isDistanceSet, isRepSet,
  isTimeSet, isValidWorkingSet, parseDuration, setModeOf, setSummary, setVolume,
} from '../js/set-utils.js';
import {
  defaultSetModeForExercise, effectiveSetMode, preferredSetMode,
} from '../js/workout/set-shape.js';
import { previousSetLabel, validateSetEntry } from '../js/workout/set-entry.js';
import { buildSetRow } from '../js/templates.js';
import { pickInheritedSet } from '../js/workout-order.js';
import { buildSessionRecap, renderSessionRecapHTML } from '../js/session-recap.js';

test('legacy sets are rep sets; explicit shapes are honoured', () => {
  assert.equal(setModeOf({ w: '60', r: '5', c: true }), SET_MODE.REPS);
  assert.equal(setModeOf({ mode: 'time', sec: 60, c: true }), SET_MODE.TIME);
  assert.equal(setModeOf({ mode: 'distance', dist: 20, c: true }), SET_MODE.DISTANCE);
  assert.equal(isRepSet({ r: '5' }), true);
  assert.equal(isTimeSet({ mode: 'time', sec: 30 }), true);
  assert.equal(isDistanceSet({ mode: 'distance', dist: 20 }), true);
});

test('holds and carries are working sets but add no invented tonnage', () => {
  assert.equal(isValidWorkingSet({ mode: 'time', sec: 45, c: true }), true);
  assert.equal(isValidWorkingSet({ mode: 'distance', dist: 20, c: true }), true);
  assert.equal(isValidWorkingSet({ mode: 'time', sec: 0, c: true }), false);
  assert.equal(isValidWorkingSet({ mode: 'distance', dist: 0, c: true }), false);

  assert.equal(setVolume({ mode: 'time', w: '20', sec: 60, c: true }), 0);
  assert.equal(setVolume({ mode: 'distance', w: '40', dist: 20, c: true }), 0);
  assert.equal(setVolume({ w: '20', r: '5', basis: 'each', c: true }), 200);

  const day = {
    Plank: [{ mode: 'time', sec: 60, c: true }],
    'Farmer Carry': [{ mode: 'distance', dist: 20, w: '40', c: true }],
    Squat: [{ w: '100', r: '5', c: true }],
  };
  assert.equal(dayVolume(day), 500, 'only the rep set contributes tonnage');
});

test('duration parsing and formatting accept what people type', () => {
  assert.equal(parseDuration('90'), 90);
  assert.equal(parseDuration('1:30'), 90);
  assert.equal(parseDuration('01:02:05'), 3725);
  assert.equal(parseDuration('1:75'), null);
  assert.equal(parseDuration('abc'), null);
  assert.equal(parseDuration(''), null);
  assert.equal(formatDuration(45), '45');
  assert.equal(formatDuration(90), '1:30');
  assert.equal(formatDuration(3725), '1:02:05');
  assert.equal(formatDistance(20), '20');
  assert.equal(formatDistance(20.5), '20.5');
});

test('set shape defaults come from catalogue metadata, not a guess', () => {
  assert.equal(defaultSetModeForExercise('Plank'), SET_MODE.TIME);
  assert.equal(defaultSetModeForExercise('Farmer Carry'), SET_MODE.DISTANCE);
  assert.equal(defaultSetModeForExercise('Back Squat'), SET_MODE.REPS);
  assert.equal(defaultSetModeForExercise('Dead Hang'), SET_MODE.TIME);
});

test('a per-exercise choice overrides the default for new rows only', () => {
  const state = { settings: { exercisePrefs: { 'id:plank': { mode: 'reps' } } } };
  assert.equal(preferredSetMode(state, 'Plank'), SET_MODE.REPS);
  assert.equal(effectiveSetMode({}, 'Plank', state), SET_MODE.REPS);
  assert.equal(effectiveSetMode({ mode: 'time', sec: 60 }, 'Plank', state), SET_MODE.TIME,
    'a stored set keeps its own shape');
  assert.equal(effectiveSetMode({}, 'Farmer Carry', state), SET_MODE.DISTANCE);
});

test('entry validation is mode-aware and blocks impossible values', () => {
  assert.equal(validateSetEntry({ weight: '20', value: '1:30', mode: 'time' }).ok, true);
  assert.equal(validateSetEntry({ weight: '20', value: '', mode: 'time' }).firstErrorField, 'value');
  assert.equal(validateSetEntry({ weight: '20', value: 'nope', mode: 'time' }).ok, false);
  const short = validateSetEntry({ weight: '20', value: '0.5', mode: 'distance' });
  assert.equal(short.ok, false);
  assert.match(short.errors[0].text, /At least 1 m/);
  assert.equal(validateSetEntry({ weight: '20', value: '20', mode: 'distance' }).ok, true);
  assert.equal(validateSetEntry({ weight: '20', reps: '5' }).ok, true, 'legacy reps callers unchanged');
});

test('previous values show the shape that was actually logged', () => {
  assert.equal(previousSetLabel({ mode: 'time', w: '20', sec: 90 }, 'kg').text, 'Last 20kg × 1:30');
  assert.equal(previousSetLabel({ mode: 'distance', w: '40', dist: 20 }, 'kg').text, 'Last 40kg × 20m');
  assert.equal(previousSetLabel({ mode: 'time', sec: 90 }, 'kg').text, 'Last 1:30');
  assert.equal(previousSetLabel({ w: '100', r: '5' }, 'kg').text, 'Last 100kg × 5');
});

test('a timed row renders a time field and states its shape on the row', () => {
  const html = buildSetRow({ w: '20', sec: 90, mode: 'time', c: false }, 0, 'Plank', '', 'kg', 'Plank');
  assert.match(html, /data-set-mode="time"/);
  assert.match(html, /input-time-node/);
  assert.doesNotMatch(html, /input-reps-node/);
  assert.doesNotMatch(html, /cycle-set-mode/, 'the shape lives in the set sheet');
});

test('a carry row renders a distance field', () => {
  const html = buildSetRow({ w: '40', dist: 20, mode: 'distance', c: false }, 1, 'Farmer Carry', '', 'kg', 'Farmer Carry');
  assert.match(html, /data-set-mode="distance"/);
  assert.match(html, /input-dist-node/);
  assert.match(html, /aria-label="Distance for set 2 \(metres\)"/);
});

test('one-line summaries carry each shape', () => {
  assert.equal(setSummary({ w: '60', r: '8' }, 'kg'), '60kg × 8');
  assert.equal(setSummary({ w: '20', sec: 90, mode: 'time' }, 'kg'), '20kg × 1:30');
  assert.equal(setSummary({ w: '40', dist: 20, mode: 'distance' }, 'kg'), '40kg × 20m');
  assert.equal(setSummary({ r: '8' }, 'kg'), '8 reps');
});

test('straight-set inheritance carries a hold forward', () => {
  const sets = [
    { mode: 'time', w: '20', value: '1:30', done: true, type: '' },
    { mode: 'time', done: false, type: '' },
  ];
  assert.deepEqual(pickInheritedSet(sets, 1), { w: '20', mode: 'time', value: '1:30' });
});

test('recap shows a hold as time, not zero reps or zero volume', () => {
  const week = {
    dates: { mon: '2026-11-20' },
    lifts: { mon: { Plank: [{ mode: 'time', sec: 90, w: '20', c: true }, { mode: 'time', sec: 60, w: '20', c: true }] } },
    runs: {},
  };
  const recap = buildSessionRecap({ weeks: { '1': week } }, '1', 'mon');
  assert.equal(recap.workingSets, 2);
  assert.equal(recap.lifts[0].shape, SET_MODE.TIME);
  assert.equal(recap.lifts[0].topShape.value, 90);
  const html = renderSessionRecapHTML(recap, [], null, 'breakdown');
  assert.match(html, /1:30/);
  assert.doesNotMatch(html, /0 kg/);
});
