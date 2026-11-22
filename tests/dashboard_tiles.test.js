// ==========================================
// DASHBOARD TILE DEFAULTS (tests/dashboard_tiles.test.js)
// R4: fresh installs get a focused six-tile dashboard; every default-hidden id
// must exist in the registry (a typo would silently un-hide a tile).
// ==========================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TILE_REGISTRY, DEFAULT_HIDDEN_TILES } from '../js/dashboard.js';

test('default-hidden ids all exist in the tile registry', () => {
  const ids = new Set(TILE_REGISTRY.map(t => t.id));
  for (const id of DEFAULT_HIDDEN_TILES) {
    assert.ok(ids.has(id), `default-hidden id "${id}" not in registry`);
  }
});

test('the default-visible dashboard is the focused, non-overlapping six', () => {
  const hidden = new Set(DEFAULT_HIDDEN_TILES);
  const visible = TILE_REGISTRY.filter(t => !hidden.has(t.id)).map(t => t.id).sort();
  // recovery · load · strength work · endurance · body · habit — one each, no
  // overlap. 'today' is hidden (it overlaps the Morning Briefing).
  assert.deepEqual(visible, ['avg-pace', 'bodyweight', 'readiness', 'recovery-score', 'streak', 'weekly-volume']);
  assert.ok(!visible.includes('today'));
});

test('Stress Balance keeps half-step session and run RPE', () => {
  const tile = TILE_REGISTRY.find((entry) => entry.id === 'stress-balance');
  const stateFor = (gymRpe, runRpe) => ({ weeks: {
    '1': {
      gymRpe: { mon: String(gymRpe) },
      gymStats: { mon: { time: '60' } },
      lifts: { mon: { Squat: [{ w: '100', r: '5', c: true }] } },
      runs: {},
      runSessions: { mon: [{ sessionId: 'run1', time: '60:00', rpe: String(runRpe), dist: '10' }] },
    },
  } });
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  // 8.5 × 60 = 510 lift; 6 × 60 = 360 run → 59%. parseInt('8.5') made it 57%.
  const gymHalf = tile.renderData(stateFor(8.5, 6), days, null, 'mon', { wkNum: 1 });
  assert.equal(gymHalf.liftPct, 59);

  // 8 × 60 = 480 lift; 6.5 × 60 = 390 run → 55%. parseInt('6.5') made it 57%.
  const runHalf = tile.renderData(stateFor(8, 6.5), days, null, 'mon', { wkNum: 1 });
  assert.equal(runHalf.liftPct, 55);
});
