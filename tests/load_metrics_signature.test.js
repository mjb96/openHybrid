// =============================================================================
// LOAD-METRIC MEMO SIGNATURE — a failure toggle must refresh ATL/CTL.
//
// sRPE falls back to per-set effort, and an unrated failed set counts as RPE 10.
// The memo skips recomputeLoadMetrics() when its cheap signature is unchanged,
// so if `failure` is absent from that signature, toggling Failure on a completed
// set leaves cached load metrics stale for the rest of the session.
// =============================================================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadMetricsSignature } from '../js/state.js';
import { recomputeLoadMetrics } from '../js/brain/load_models.js';

const THROUGH = '2026-11-18';

function stateWithUnratedSet() {
  return {
    currentWeek: '1',
    weekStartedAt: '2026-11-16T00:00:00.000Z',
    activeActivationId: 'act_sig',
    weeks: {
      '1': {
        activationId: 'act_sig',
        programId: 'hybrid_engine',
        dates: { mon: '2026-11-16' },
        lifts: { mon: { Squat: [{ w: '100', r: '5', c: true }] } },
        gymStats: { mon: { time: '60' } },
        runs: {},
        runSessions: {},
      },
    },
  };
}

test('toggling Failure on a completed unrated set changes the load signature', () => {
  const state = stateWithUnratedSet();
  const beforeSig = loadMetricsSignature(state);
  const beforeLoad = recomputeLoadMetrics(state, { throughDate: THROUGH });
  assert.equal(beforeLoad.atl, 0, 'no effort recorded means no strength load');

  const set = state.weeks['1'].lifts.mon.Squat[0];
  set.failure = true;

  const afterSig = loadMetricsSignature(state);
  const afterLoad = recomputeLoadMetrics(state, { throughDate: THROUGH });
  assert.notEqual(afterSig, beforeSig, 'the memo must see the failure flag');
  assert.match(afterSig, /:1/, 'the signature records failure as 1');
  assert.ok(afterLoad.atl > 0, 'an unrated failed set contributes RPE 10 to ATL');
  assert.ok(afterLoad.ctl > 0, 'an unrated failed set contributes RPE 10 to CTL');
});

test('a string failure flag from an import also invalidates the signature', () => {
  const state = stateWithUnratedSet();
  const beforeSig = loadMetricsSignature(state);
  state.weeks['1'].lifts.mon.Squat[0].failure = 'true';
  const afterSig = loadMetricsSignature(state);
  assert.notEqual(afterSig, beforeSig);
  assert.ok(recomputeLoadMetrics(state, { throughDate: THROUGH }).atl > 0);
});
