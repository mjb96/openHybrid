// =============================================================================
// BALANCE MODEL — "is the mix right?"
//
// The two rules this file defends:
//   1. Walks never move the split (an unrated walk would outvote a hard
//      session on the minutes fallback), but the excluded time is reported.
//   2. One modality is NOT a 100 % bar — a strength-only block has no mix, so
//      the band simply does not appear.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBalanceModel } from '../js/analytics/balance.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';
import { renderBalance } from '../js/analytics/views/view-balance.js';

/** @param {any} model */
const renderBalanceFor = (model) => renderBalance(model);

const range30 = resolveRange('30d', '2026-11-24');
const prev30 = previousRange(range30);
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });

/** A strength day with a measured duration — minutes basis without RPE. */
function strengthDay(date, minutes = 60) {
  return { dates: { mon: date }, lifts: { mon: { Squat: [done(100)] } }, gymStats: { mon: { time: String(minutes) } } };
}
function runDay(date, { type = 'run', time = '30:00', rpe = '' } = {}) {
  return { dates: { mon: date }, runSessions: { mon: [{ dist: '5', time, type, rpe }] } };
}
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((week, i) => [String(i + 1), week])) });

test('a strength-only window has no mix and renders nothing', () => {
  const model = buildBalanceModel(stateWith([strengthDay('2026-11-20')]), { range: range30, previous: prev30 });
  assert.equal(model.hasStrength, true);
  assert.equal(model.hasEndurance, false);
  assert.equal(model.hasData, false);
  // No common currency for one modality, so no share is claimed — the band does
  // not render, and a percentage here would be a number with nothing behind it.
  assert.equal(model.strengthSharePct, null);
});

test('a run-only window has no mix either', () => {
  const model = buildBalanceModel(stateWith([runDay('2026-11-20')]), { range: range30, previous: prev30 });
  assert.equal(model.hasEndurance, true);
  assert.equal(model.hasStrength, false);
  assert.equal(model.hasData, false);
});

test('both modalities produce a split that sums to 100', () => {
  const model = buildBalanceModel(
    stateWith([strengthDay('2026-11-20', 60), runDay('2026-11-21', { time: '30:00' })]),
    { range: range30, previous: prev30 },
  );
  assert.equal(model.hasData, true);
  assert.equal(model.basis, 'minutes', 'no RPE anywhere, so minutes');
  // An explicit value, not just the sum: `enduranceSharePct` is DERIVED from
  // 100 - strength, so a sum check can never fail.
  assert.equal(model.strengthSharePct, 66.7);
  assert.equal(model.enduranceSharePct, 33.3);
  assert.equal(model.strengthSharePct, 66.7, '60 of 90 minutes');
});

test('sRPE is preferred once the athlete rates effort', () => {
  const model = buildBalanceModel(
    stateWith([
      { ...strengthDay('2026-11-20', 60), gymRpe: { mon: 8 } },
      runDay('2026-11-21', { time: '30:00', rpe: '4' }),
    ]),
    { range: range30, previous: prev30 },
  );
  assert.equal(model.basis, 'srpe');
  assert.equal(model.strengthSharePct, 80, '8x60 = 480 vs 4x30 = 120');
});

test('walks never move the split, and their time is reported as excluded', () => {
  const walked = stateWith([
    strengthDay('2026-11-20', 60),
    runDay('2026-11-21', { type: 'walk', time: '45:00' }),
  ]);
  const model = buildBalanceModel(walked, { range: range30, previous: prev30 });

  assert.equal(model.hasEndurance, false, 'a walk is not endurance training here');
  assert.equal(model.hasData, false, 'so there is no mix to show');
  assert.equal(model.excluded.walkMinutes, 45, 'but the time is not hidden');

  const mixed = stateWith([
    strengthDay('2026-11-20', 60),
    runDay('2026-11-21', { time: '30:00' }),
    runDay('2026-11-22', { type: 'walk', time: '45:00' }),
  ]);
  const withRun = buildBalanceModel(mixed, { range: range30, previous: prev30 });
  assert.equal(withRun.hasData, true);
  assert.equal(withRun.strengthSharePct, 66.7, '90 min split 60/30 — the walk is not 75');
  assert.equal(withRun.excluded.walkMinutes, 45);
});

test('the delta compares an equal-length previous window', () => {
  const state = stateWith([
    strengthDay('2026-11-20', 60),
    runDay('2026-11-21', { time: '30:00' }),
    strengthDay('2026-10-20', 30),
    runDay('2026-10-21', { time: '60:00' }),
  ]);
  const model = buildBalanceModel(state, { range: range30, previous: prev30 });
  assert.equal(model.previousStrengthSharePct, 33.3);
  assert.equal(model.deltaPct, 33.4, 'the mix shifted toward strength');
});

test('a window with nothing measured reports no basis and no shares', () => {
  const model = buildBalanceModel({ weeks: {} }, { range: range30, previous: prev30 });
  assert.equal(model.basis, 'none');
  assert.equal(model.strengthSharePct, null);
  assert.equal(model.deltaPct, null);
  assert.equal(model.excluded, null);
});

test('days outside the window are ignored', () => {
  const model = buildBalanceModel(
    stateWith([strengthDay('2026-11-20', 60), runDay('2026-09-01', { time: '30:00' })]),
    { range: range30, previous: prev30 },
  );
  assert.equal(model.hasEndurance, false, 'September must not leak into a 30-day window');
});

test('a missing range is refused rather than silently defaulted', () => {
  assert.throws(() => buildBalanceModel({ weeks: {} }, {}), /range is required/);
});

test('a rated run does not make an unrated lifter look like a non-lifter', () => {
  // Two measured lifts with no RPE + one run with RPE. The split cannot use
  // sRPE for both sides, so it uses minutes for both and says so.
  const state = stateWith([
    strengthDay('2026-11-20', 60),
    strengthDay('2026-11-21', 60),
    runDay('2026-11-22', { time: '50:00', rpe: '5' }),
  ]);
  const model = buildBalanceModel(state, { range: range30, previous: prev30 });

  assert.equal(model.basis, 'minutes', 'one common currency');
  assert.equal(model.hasStrength, true, 'the athlete lifted twice');
  assert.equal(model.hasEndurance, true);
  assert.equal(model.hasData, true, 'so the band renders');
  assert.match(renderBalanceFor(model), /by training time/);
  assert.doesNotMatch(renderBalanceFor(model), /No strength work/);
});
