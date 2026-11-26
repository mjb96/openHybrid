// =============================================================================
// H5 — the block review: four completed weeks, compared honestly
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBlockReview } from '../js/analytics/block-review.js';

const set = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });
const day = (date, lifts, time = '45:00') => ({
  dates: { mon: date },
  lifts: { mon: lifts },
  gymStats: time ? { mon: { time } } : {},
  runs: {},
  runSessions: {},
});
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

// Today is Wed 25 Nov 2026 → the block is Mon 26 Oct – Sun 22 Nov, and the
// previous block is 28 Sep – 25 Oct.
const TODAY = '2026-11-25';

function blockState() {
  return stateWith([
    day('2026-09-30', { 'Back Squat': [set(95)], 'Bench Press': [set(75)] }),
    day('2026-10-07', { 'Back Squat': [set(95)], 'Bench Press': [set(75)] }),
    day('2026-10-14', { 'Back Squat': [set(95)], 'Bench Press': [set(75)] }),
    day('2026-10-21', { 'Back Squat': [set(95)], 'Bench Press': [set(75)] }),
    day('2026-11-02', { 'Back Squat': [set(100)], 'Bench Press': [set(80)] }),
    day('2026-11-04', { 'Back Squat': [set(100)], 'Bench Press': [set(80)] }),
    day('2026-11-09', { 'Back Squat': [set(102.5)], 'Bench Press': [set(82.5)] }),
    day('2026-11-11', { 'Back Squat': [set(102.5)], 'Bench Press': [set(82.5)] }),
    day('2026-11-16', { 'Back Squat': [set(105)], 'Bench Press': [set(85)] }),
    day('2026-11-18', { 'Back Squat': [set(105)], 'Bench Press': [set(85)] }),
    day('2026-11-22', { 'Back Squat': [set(105)], 'Bench Press': [set(85)] }),
    day('2026-11-24', { 'Back Squat': [set(500)] }),
  ]);
}

test('the block is the four completed calendar weeks, not the current one', () => {
  const model = buildBlockReview(blockState(), { todayISO: TODAY, checks: [] });
  assert.equal(model.startISO, '2026-10-26');
  assert.equal(model.endISO, '2026-11-22');
  assert.equal(model.previousStartISO, '2026-09-28');
  assert.equal(model.previousEndISO, '2026-10-25');
  assert.equal(model.sessions, 7, 'the 24 Nov session belongs to the current week');
  assert.equal(model.weeksWithData, 3, 'the first block week has no session in this fixture');
  assert.match(model.label, /26 Oct – 22 Nov 2026/);
});

test('tonnage and e1RM are compared against the previous block', () => {
  const model = buildBlockReview(blockState(), { todayISO: TODAY, checks: [] });
  assert.ok(model.volumeKg > model.previousVolumeKg);
  assert.ok(model.volumeDeltaPct > 0);
  const squat = model.lifts.find((lift) => lift.name === 'Back Squat');
  assert.equal(squat.sets, 7);
  assert.equal(squat.bestE1rm, 122.5, '105 × 5 estimated 1RM, rounded to 0.1');
  assert.equal(squat.previousBest, 110.8, '95 × 5 previous block');
  assert.ok(squat.deltaPct > 0);
  assert.equal(squat.isPr, true, 'the block beat every earlier session');
  assert.equal(squat.priorBest, 110.8);
});

test('warm-ups are not strength sessions or PR evidence', () => {
  const withWarmups = stateWith([
    day('2026-11-02', { 'Back Squat': [warm(60), set(100)] }),
    day('2026-11-09', { 'Back Squat': [warm(60), set(100)] }),
    day('2026-11-16', { 'Back Squat': [warm(60), set(100)] }),
    day('2026-11-20', { 'Back Squat': [warm(60), set(105)] }),
  ]);
  const model = buildBlockReview(withWarmups, { todayISO: TODAY, checks: [] });
  assert.equal(model.workingSets, 4, 'only the working sets count');
  const squat = model.lifts.find((lift) => lift.name === 'Back Squat');
  assert.equal(squat.sets, 4);
  assert.equal(squat.bestE1rm, 122.5);
});

test('status is descriptive and engine-owned', () => {
  const onTrack = buildBlockReview(blockState(), { todayISO: TODAY, checks: [] });
  assert.equal(onTrack.status, 'on_track');
  assert.match(onTrack.recommendation, /held or improved/);

  const stalled = buildBlockReview(blockState(), {
    todayISO: TODAY,
    checks: [
      { lift: 'Back Squat', message: 'Back Squat has not improved.', target: '4 × 5' },
      { lift: 'Bench Press', message: 'Bench Press has not improved.', target: '4 × 5' },
    ],
  });
  assert.equal(stalled.status, 'stalled');
  assert.match(stalled.recommendation, /2 lifts are on progress checks/);
  assert.equal(stalled.progressChecks.length, 2);
});

test('a small block says it is not enough instead of guessing', () => {
  const sparse = stateWith([
    day('2026-11-17', { 'Back Squat': [set(100)] }),
    day('2026-11-20', { 'Back Squat': [set(100)] }),
  ]);
  const model = buildBlockReview(sparse, { todayISO: TODAY, checks: [] });
  assert.equal(model.status, 'insufficient');
  assert.match(model.headline, /not enough for a block review/i);
  assert.match(model.recommendation, /at least six strength sessions/);
});

test('an empty history is a true zero, not an error', () => {
  const model = buildBlockReview({ weeks: {} }, { todayISO: TODAY, checks: [] });
  assert.equal(model.hasData, false);
  assert.equal(model.sessions, 0);
  assert.equal(model.volumeKg, 0);
  assert.equal(model.status, 'insufficient');
  assert.deepEqual(model.lifts, []);
});
