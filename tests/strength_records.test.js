// =============================================================================
// SHAPE-AWARE RECORDS — one record model for every set shape.
//
// The rules this pins are the ones the app spent years disagreeing about:
// a tie is not a PR, a 0.3 kg change is not a PR, a 45-second plank never
// compares as reps, a carry never becomes an e1RM, reps at 60 kg do not beat
// reps at 100 kg, and bodyweight/assisted/banded work is silent because its `w`
// is mass or assistance rather than a comparable external load.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECORD_KIND, bestRecordBefore, bestRecordForSession, isRecord, prKindLabel,
  recordKindForSet, restampSessionRecords,
} from '../js/strength/records.js';
import { E1RM_PR_EPSILON, estimatedE1rm } from '../js/strength/e1rm.js';

const work = (w, r, extra = {}) => ({ c: true, w: String(w), r: String(r), ...extra });
const hold = (w, sec, extra = {}) => ({ c: true, w: String(w), sec: String(sec), mode: 'time', ...extra });
const carry = (w, dist, extra = {}) => ({ c: true, w: String(w), dist: String(dist), mode: 'distance', ...extra });

function stateWith(weeks, extra = {}) {
  return { weeks, exerciseStats: {}, ...extra };
}

function history(lifts, { week = 'hist', day = 'mon', date = '2026-06-01' } = {}) {
  return { [week]: { dates: { [day]: date }, lifts: { [day]: lifts } } };
}

// ── Kind selection ───────────────────────────────────────────────────────────

test('shape decides the kind: loaded reps are e1RM, holds are holds, carries are carries', () => {
  assert.equal(recordKindForSet(work(100, 5), 'Back Squat'), RECORD_KIND.E1RM);
  assert.equal(recordKindForSet(hold(0, 45), 'Plank'), RECORD_KIND.HOLD);
  assert.equal(recordKindForSet(carry(20, 40), 'Farmer Carry'), RECORD_KIND.CARRY);
});

test('a hold never compares as reps and a carry never becomes an e1RM', () => {
  // The shapes are distinct kinds, so no caller can accidentally compare a
  // 45-second plank against 45 reps, or a 40 m carry against a 40 kg e1RM.
  assert.equal(recordKindForSet(hold(0, 45), 'Plank'), RECORD_KIND.HOLD);
  assert.notEqual(recordKindForSet(hold(0, 45), 'Plank'), RECORD_KIND.E1RM);
  assert.equal(recordKindForSet(carry(20, 40), 'Farmer Carry'), RECORD_KIND.CARRY);
  assert.notEqual(recordKindForSet(carry(20, 40), 'Farmer Carry'), RECORD_KIND.E1RM);
  // A distance set is never reinterpreted as reps even though `r` could exist.
  assert.equal(recordKindForSet({ ...carry(20, 40), r: '12' }, 'Farmer Carry'), RECORD_KIND.CARRY);
});

test('a loaded rep set beyond the e1RM window is a rep record at that load', () => {
  assert.equal(recordKindForSet(work(60, 20), 'Back Squat'), RECORD_KIND.REPS);
  assert.equal(recordKindForSet(work(100, 8), 'Back Squat'), RECORD_KIND.E1RM);
});

test('bodyweight, assisted and banded sets never claim a record', () => {
  assert.equal(recordKindForSet({ c: true, w: '80', r: '10', bw: true }, 'Pull-Up'), null);
  assert.equal(recordKindForSet({ c: true, w: '80', r: '10', loadMode: 'bodyweight' }, 'Pull-Up'), null);
  assert.equal(recordKindForSet({ c: true, w: '60', r: '10', loadMode: 'assisted', band: 'M' }, 'Pull-Up'), null);
  assert.equal(recordKindForSet({ c: true, w: '20', r: '12', loadMode: 'banded', band: 'M' }, 'Band Pushdown'), null);
  assert.equal(recordKindForSet({ c: true, w: '10', r: '10', band: 'L' }, 'Band Face Pull'), null);
});

test('warm-ups and incomplete shapes are never records', () => {
  assert.equal(recordKindForSet({ ...work(100, 5), type: 'W' }, 'Back Squat'), null);
  assert.equal(recordKindForSet({ ...hold(0, 45), type: 'W' }, 'Plank'), null);
  assert.equal(recordKindForSet({ c: true, w: '100', r: '0' }, 'Back Squat'), null);
  assert.equal(recordKindForSet({ c: true, w: '0', r: '5' }, 'Back Squat'), null);
});

test('the badge label names the kind', () => {
  assert.equal(prKindLabel('e1rm'), 'PR');
  assert.equal(prKindLabel('hold'), 'Hold PR');
  assert.equal(prKindLabel('carry'), 'Carry PR');
  assert.equal(prKindLabel('reps'), 'Rep PR');
});

// ── The comparison rule ──────────────────────────────────────────────────────

test('an exact e1RM tie is not a PR', () => {
  const prior = bestRecordForSession('Back Squat', [work(100, 5)]).e1rm;
  const current = bestRecordForSession('Back Squat', [work(100, 5)]).e1rm;
  assert.equal(isRecord(RECORD_KIND.E1RM, current, prior), false);
});

test('a +0.3 kg e1RM change is not a PR', () => {
  const prior = bestRecordForSession('Back Squat', [work(100, 5)]).e1rm;
  const current = bestRecordForSession('Back Squat', [work(100.3, 5)]).e1rm;
  assert.ok(current.value - prior.value < E1RM_PR_EPSILON);
  assert.equal(isRecord(RECORD_KIND.E1RM, current, prior), false);
  // 101 kg on the same reps clears the shared threshold.
  const clear = bestRecordForSession('Back Squat', [work(101, 5)]).e1rm;
  assert.equal(isRecord(RECORD_KIND.E1RM, clear, prior), true);
});

test('holds and carries compare strictly, with no epsilon', () => {
  const priorHold = bestRecordForSession('Plank', [hold(0, 45)]).hold;
  assert.equal(isRecord(RECORD_KIND.HOLD, bestRecordForSession('Plank', [hold(0, 45)]).hold, priorHold), false);
  assert.equal(isRecord(RECORD_KIND.HOLD, bestRecordForSession('Plank', [hold(0, 46)]).hold, priorHold), true);
  const priorCarry = bestRecordForSession('Farmer Carry', [carry(20, 40)]).carry;
  assert.equal(isRecord(RECORD_KIND.CARRY, bestRecordForSession('Farmer Carry', [carry(20, 40)]).carry, priorCarry), false);
  assert.equal(isRecord(RECORD_KIND.CARRY, bestRecordForSession('Farmer Carry', [carry(20, 41)]).carry, priorCarry), true);
});

test('reps at 100×8 beat 100×6, but 60×20 does not beat 100×5', () => {
  // Sled Push is a conditioning exercise, so the e1RM estimate refuses it and
  // both sets are rep records at their own load.
  const priorEight = bestRecordForSession('Sled Push', [work(100, 8)]).reps;
  assert.equal(priorEight.kind, RECORD_KIND.REPS);
  const priorSix = bestRecordForSession('Sled Push', [work(100, 6)]).reps;
  const state = stateWith(history({ 'Sled Push': [work(100, 6)] }));
  const prior = bestRecordBefore(state, 'Sled Push', { excludeWeekKey: 'cur', excludeDay: 'mon' });
  const candidate = bestRecordForSession('Sled Push', [work(100, 8)]).reps;
  assert.equal(isRecord(RECORD_KIND.REPS, candidate, prior.reps), true);

  // A lighter, longer set belongs to a different load bucket. It is a baseline
  // at 60 kg, never a victory over the 100 kg bucket.
  const lighter = bestRecordForSession('Sled Push', [work(60, 20)]).reps;
  assert.equal(isRecord(RECORD_KIND.REPS, lighter, prior.reps), false);
  assert.equal(priorSix.load, candidate.load);
});

test('a first-ever performance is a baseline in every kind', () => {
  assert.equal(isRecord(RECORD_KIND.E1RM, { value: 120 }, null), false);
  assert.equal(isRecord(RECORD_KIND.HOLD, { value: 120 }, null), false);
  assert.equal(isRecord(RECORD_KIND.CARRY, { value: 120 }, null), false);
  assert.equal(isRecord(RECORD_KIND.REPS, { value: 12, load: 100, loadMode: 'weighted' }, []), false);
});

test('a mixed session picks the best of each kind without comparing them', () => {
  const best = bestRecordForSession('Back Squat', [
    work(100, 5), work(110, 3), hold(0, 60), carry(40, 25),
  ]);
  assert.equal(best.e1rm.value, estimatedE1rm(110, 3));
  assert.equal(best.hold.value, 60);
  assert.equal(best.carry.value, 25);
  assert.equal(best.reps, null);
});

// ── Prior-history scanning ───────────────────────────────────────────────────

test('bestRecordBefore scans previous sessions, including archived program runs', () => {
  const archived = bestRecordForSession('Back Squat', [work(180, 3)]).e1rm;
  const state = stateWith({
    'arch:old:3': { activationId: 'old', dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(180, 3)] } } },
    cur: { activationId: 'new', dates: { mon: '2026-07-08' }, lifts: { mon: { 'Back Squat': [work(150, 3)] } } },
  });
  const prior = bestRecordBefore(state, 'Back Squat', { excludeWeekKey: 'cur', excludeDay: 'mon', beforeDate: '2026-07-08' });
  assert.equal(prior.e1rm.kind, RECORD_KIND.E1RM);
  assert.ok(Math.abs(prior.e1rm.value - archived.value) < 0.001);
  assert.equal(isRecord(RECORD_KIND.E1RM, bestRecordForSession('Back Squat', [work(150, 3)]).e1rm, prior.e1rm), false);
});

test('the current session is excluded, but an earlier same-day slot still counts', () => {
  const state = stateWith({
    earlier: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Back Squat': [work(120, 3)] } } },
    cur: { dates: { mon: '2026-07-08' }, lifts: { mon: { 'Back Squat': [work(130, 3)] } } },
  });
  const prior = bestRecordBefore(state, 'Back Squat', { excludeWeekKey: 'cur', excludeDay: 'mon', beforeDate: '2026-07-08' });
  assert.ok(Math.abs(prior.e1rm.value - estimatedE1rm(120, 3)) < 0.001);
});

test('rep buckets are kept per load, and prior hold/carry bests are all-time', () => {
  const state = stateWith({
    hist1: { dates: { mon: '2026-05-01' }, lifts: { mon: { 'Sled Push': [work(100, 5)], Plank: [hold(0, 45)], 'Farmer Carry': [carry(20, 30)] } } },
    hist2: { dates: { mon: '2026-05-08' }, lifts: { mon: { 'Sled Push': [work(60, 15)], Plank: [hold(0, 70)], 'Farmer Carry': [carry(20, 50)] } } },
  });
  const sled = bestRecordBefore(state, 'Sled Push', { beforeDate: '2026-06-01' });
  assert.equal(sled.reps.length, 2);
  assert.deepEqual(sled.reps.map((r) => r.load).sort((a, b) => a - b), [60, 100]);
  assert.equal(bestRecordBefore(state, 'Plank').hold.value, 70);
  assert.equal(bestRecordBefore(state, 'Farmer Carry').carry.value, 50);
});

test('a legacy e1RM aggregate is still a best to beat', () => {
  const state = stateWith({}, { exerciseStats: { back_squat: { allTimeMax: 200, derived: true, legacyMax: 200 } } });
  const prior = bestRecordBefore(state, 'Back Squat');
  assert.equal(prior.e1rm.legacy, true);
  assert.equal(prior.e1rm.value, 200);
  assert.equal(isRecord(RECORD_KIND.E1RM, bestRecordForSession('Back Squat', [work(150, 3)]).e1rm, prior.e1rm), false);
});

// ── Saved-day restamping ─────────────────────────────────────────────────────

test('restamping a saved day clears a corrected-down PR and keeps the rest silent', () => {
  const state = stateWith({
    hist: { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
    cur: {
      dates: { mon: '2026-07-08' },
      lifts: {
        mon: {
          'Back Squat': [{ ...work(110, 5), isPR: true, prKind: 'e1rm' }],
          'Pull-Up': [{ ...work(0, 10, { bw: true }), isPR: true, prKind: 'e1rm' }],
        },
      },
    },
  });
  const stamped = restampSessionRecords(state, 'cur', 'mon');
  assert.equal(stamped, 1, 'only the genuine squat record survives');
  const squat = state.weeks.cur.lifts.mon['Back Squat'][0];
  assert.equal(squat.isPR, true);
  assert.equal(squat.prKind, 'e1rm');
  assert.equal(state.weeks.cur.lifts.mon['Pull-Up'][0].isPR, undefined);

  // Correct it below the prior best: the badge it no longer earns goes away.
  squat.w = '90';
  const after = restampSessionRecords(state, 'cur', 'mon');
  assert.equal(after, 0);
  assert.equal(squat.isPR, undefined);
  assert.equal(squat.prKind, undefined);
});
