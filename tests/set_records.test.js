// =============================================================================
// SET RECORDS — the per-exercise heaviest-weight-per-rep-target table.
//
// These tests pin the product rules, not the implementation: a record is the
// heaviest WORKING set that reached the target (not an extrapolated e1RM), a
// target nothing reached is absent rather than zero, warm-ups and un-ticked
// rows never count, bodyweight work still reports its best set/session, and
// holds/carries report seconds/metres instead of being reframed as reps.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REP_TARGETS, buildSetRecords } from '../js/strength/set-records.js';

const set = (w, r, extra = {}) => ({ c: true, w: String(w), r: String(r), ...extra });
const hold = (w, sec, extra = {}) => ({ c: true, w: String(w), sec: String(sec), mode: 'time', ...extra });
const carry = (w, dist, extra = {}) => ({ c: true, w: String(w), dist: String(dist), mode: 'distance', ...extra });
const session = (date, workingSets) => ({ date, workingSets });

// Two sessions of a normal linear progression. Every column of the table is
// hand-computed from these numbers below.
const PROGRESSION = [
  session('2026-01-01', [set(100, 1), set(95, 3), set(90, 5), set(80, 8)]),
  session('2026-01-08', [set(105, 1), set(100, 3), set(95, 5), set(85, 8), set(75, 10), set(70, 12)]),
];

const targetsOf = (model) => model.repTargets.map((row) => row.target);

// ── Rep targets ──────────────────────────────────────────────────────────────

test('a normal progression reports the heaviest working set for every rep target', () => {
  const model = buildSetRecords(PROGRESSION, 'Back Squat');
  assert.equal(model.shape, 'reps');
  assert.equal(model.hasData, true);
  assert.deepEqual(model.repTargets, [
    { target: 1, weight: 105, reps: 1, date: '2026-01-08', sessionIndex: 1 },
    { target: 3, weight: 100, reps: 3, date: '2026-01-08', sessionIndex: 1 },
    { target: 5, weight: 95, reps: 5, date: '2026-01-08', sessionIndex: 1 },
    { target: 8, weight: 85, reps: 8, date: '2026-01-08', sessionIndex: 1 },
    { target: 10, weight: 75, reps: 10, date: '2026-01-08', sessionIndex: 1 },
    { target: 12, weight: 70, reps: 12, date: '2026-01-08', sessionIndex: 1 },
  ]);
});

test('the target list is the frozen canonical set', () => {
  assert.deepEqual([...REP_TARGETS], [1, 3, 5, 8, 10, 12]);
  assert.equal(Object.isFrozen(REP_TARGETS), true);
});

test('a target nothing reached is absent, never a zero row', () => {
  const model = buildSetRecords([session('2026-01-01', [set(100, 5)])], 'Back Squat');
  // 5 reps clears 1/3/5 but not 8/10/12 — an 8-rep row at 0 kg would be a lie.
  assert.deepEqual(targetsOf(model), [1, 3, 5]);
  assert.ok(model.repTargets.every((row) => row.weight > 0));
  assert.equal(buildSetRecords([session('2026-01-01', [set(100, 1)])], 'Back Squat').repTargets.length, 1);
});

test('a tie on weight resolves to the set with more reps', () => {
  const model = buildSetRecords([
    session('2026-01-01', [set(100, 5)]),
    session('2026-01-08', [set(100, 8)]),
  ], 'Back Squat');
  const five = model.repTargets.find((row) => row.target === 5);
  assert.deepEqual(five, { target: 5, weight: 100, reps: 8, date: '2026-01-08', sessionIndex: 1 });
});

test('a tie on weight and reps keeps the earlier date', () => {
  const model = buildSetRecords([
    session('2026-01-01', [set(100, 5)]),
    session('2026-01-08', [set(100, 5)]),
  ], 'Back Squat');
  const five = model.repTargets.find((row) => row.target === 5);
  assert.equal(five.date, '2026-01-01');
  assert.equal(five.sessionIndex, 0);
});

// ── Warm-ups and un-ticked rows ──────────────────────────────────────────────

test('warm-up and un-ticked sets never count, so output is identical without them', () => {
  const clean = buildSetRecords(PROGRESSION, 'Back Squat');
  const withNoise = buildSetRecords([
    session('2026-01-01', [
      { ...set(200, 5), type: 'W' },
      { ...set(180, 3), isWarmup: true },
      { w: '300', r: '5' }, // never ticked
      ...PROGRESSION[0].workingSets,
    ]),
    session('2026-01-08', [
      { ...set(220, 5), type: 'W' },
      ...PROGRESSION[1].workingSets,
    ]),
  ], 'Back Squat');
  assert.deepEqual(withNoise, clean);
});

test('a history of only warm-ups or un-ticked rows has no data', () => {
  const model = buildSetRecords([
    session('2026-01-01', [{ ...set(100, 5), type: 'W' }, { w: '100', r: '5' }]),
  ], 'Back Squat');
  assert.deepEqual(model, {
    shape: 'none',
    repTargets: [],
    bestRepsInSet: null,
    bestRepsInSession: null,
    bestTimeSec: null,
    bestDistanceM: null,
    hasData: false,
  });
});

// ── Bodyweight rep work ──────────────────────────────────────────────────────

test('bodyweight history fills best reps in set and session without inventing weight records', () => {
  const model = buildSetRecords([
    session('2026-02-01', [set(0, 12), set(0, 10)]),
    session('2026-02-03', [{ c: true, r: '15' }]), // no weight field at all
  ], 'Pull-Up');
  assert.equal(model.shape, 'reps');
  assert.equal(model.hasData, true);
  assert.deepEqual(model.repTargets, []);
  assert.deepEqual(model.bestRepsInSet, { reps: 15, weight: 0, date: '2026-02-03' });
  assert.deepEqual(model.bestRepsInSession, { reps: 22, date: '2026-02-01' });
  assert.equal(model.bestTimeSec, null);
  assert.equal(model.bestDistanceM, null);
});

test('weighted rep history also exposes the best rep set and session', () => {
  const model = buildSetRecords(PROGRESSION, 'Back Squat');
  // 17 reps in session 1, 39 in session 2; the single-set best is 12 × 70 kg.
  assert.deepEqual(model.bestRepsInSet, { reps: 12, weight: 70, date: '2026-01-08' });
  assert.deepEqual(model.bestRepsInSession, { reps: 39, date: '2026-01-08' });
});

// ── Holds and carries ────────────────────────────────────────────────────────

test('a hold-only history reports the longest hold as seconds', () => {
  const model = buildSetRecords([
    session('2026-03-01', [hold(0, 45), hold(10, 30)]),
    session('2026-03-08', [hold(0, 90)]),
  ], 'Plank');
  assert.equal(model.shape, 'time');
  assert.equal(model.hasData, true);
  assert.deepEqual(model.bestTimeSec, { seconds: 90, weight: 0, date: '2026-03-08' });
  assert.deepEqual(model.repTargets, []);
  assert.equal(model.bestRepsInSet, null);
  assert.equal(model.bestRepsInSession, null);
  assert.equal(model.bestDistanceM, null);
});

test('a carry-only history reports the longest carry as metres', () => {
  const model = buildSetRecords([
    session('2026-04-01', [carry(20, 40)]),
    session('2026-04-08', [carry(24, 60), carry(20, 30)]),
  ], 'Farmer Carry');
  assert.equal(model.shape, 'distance');
  assert.deepEqual(model.bestDistanceM, { metres: 60, weight: 24, date: '2026-04-08' });
  assert.deepEqual(model.repTargets, []);
  assert.equal(model.bestTimeSec, null);
  assert.equal(model.bestRepsInSet, null);
  assert.equal(model.bestRepsInSession, null);
});

// ── Mixed shapes ─────────────────────────────────────────────────────────────

test('the most recent session decides the shape: holds after reps report time only', () => {
  const model = buildSetRecords([
    session('2026-05-01', [set(100, 5)]),
    session('2026-05-08', [hold(0, 60)]),
  ], 'Loaded Plank');
  assert.equal(model.shape, 'time');
  assert.deepEqual(model.bestTimeSec, { seconds: 60, weight: 0, date: '2026-05-08' });
  assert.deepEqual(model.repTargets, []);
  assert.equal(model.bestRepsInSet, null);
});

test('the most recent session decides the shape: reps after holds report rep only', () => {
  const model = buildSetRecords([
    session('2026-05-01', [hold(0, 60)]),
    session('2026-05-08', [set(100, 5)]),
  ], 'Loaded Plank');
  assert.equal(model.shape, 'reps');
  assert.deepEqual(model.repTargets, [
    { target: 1, weight: 100, reps: 5, date: '2026-05-08', sessionIndex: 1 },
    { target: 3, weight: 100, reps: 5, date: '2026-05-08', sessionIndex: 1 },
    { target: 5, weight: 100, reps: 5, date: '2026-05-08', sessionIndex: 1 },
  ]);
  assert.equal(model.bestTimeSec, null);
});

test('a session mixing a hold with a rep set counts as a rep session', () => {
  // Same convention as the exercise drilldown: one rep set makes it reps.
  const model = buildSetRecords([
    session('2026-05-01', [set(100, 5)]),
    session('2026-05-08', [hold(0, 20), set(90, 8)]),
  ], 'Loaded Plank');
  assert.equal(model.shape, 'reps');
  assert.deepEqual(targetsOf(model), [1, 3, 5, 8]);
  assert.equal(model.bestTimeSec, null);
});

test('an empty trailing session does not override the shape of real training', () => {
  const model = buildSetRecords([
    session('2026-05-01', [set(100, 5)]),
    session('2026-05-08', []),
  ], 'Back Squat');
  assert.equal(model.shape, 'reps');
  assert.deepEqual(targetsOf(model), [1, 3, 5]);
});

// ── Empty history and input safety ───────────────────────────────────────────

test('an empty history returns the documented empty model without throwing', () => {
  assert.deepEqual(buildSetRecords([], 'Back Squat'), {
    shape: 'none',
    repTargets: [],
    bestRepsInSet: null,
    bestRepsInSession: null,
    bestTimeSec: null,
    bestDistanceM: null,
    hasData: false,
  });
  // Missing / malformed input is unusable history, not a crash.
  assert.equal(buildSetRecords(/** @type {any} */ (undefined), 'Back Squat').shape, 'none');
  assert.equal(buildSetRecords([{ date: '2026-01-01' }], 'Back Squat').hasData, false);
});

test('the input sessions array is never mutated or sorted', () => {
  const input = [
    session('2026-01-01', [set(100, 1), set(90, 5)]),
    session('2026-01-08', [set(105, 1)]),
  ];
  const before = JSON.parse(JSON.stringify(input));
  buildSetRecords(input, 'Back Squat');
  assert.deepEqual(input, before);
});

test('weights, reps, seconds and metres come back as plain numbers', () => {
  const reps = buildSetRecords(PROGRESSION, 'Back Squat');
  for (const row of reps.repTargets) {
    assert.equal(typeof row.target, 'number');
    assert.equal(typeof row.weight, 'number');
    assert.equal(typeof row.reps, 'number');
  }
  assert.equal(typeof reps.bestRepsInSet.weight, 'number');
  assert.equal(typeof reps.bestRepsInSet.reps, 'number');
  assert.equal(typeof reps.bestRepsInSession.reps, 'number');

  const timed = buildSetRecords([session('2026-03-01', [hold('10', '45')])], 'Plank');
  assert.equal(typeof timed.bestTimeSec.seconds, 'number');
  assert.equal(typeof timed.bestTimeSec.weight, 'number');

  const carried = buildSetRecords([session('2026-04-01', [carry('20', '40')])], 'Farmer Carry');
  assert.equal(typeof carried.bestDistanceM.metres, 'number');
  assert.equal(typeof carried.bestDistanceM.weight, 'number');
});
