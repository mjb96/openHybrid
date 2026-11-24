// =============================================================================
// WORKOUT KEEP-AWAKE
//
// A progressive enhancement: request the Screen Wake Lock only while the
// workout tab is the visible surface and the preference is on, never duplicate
// the request on repeated renders, and release the moment it stops applying.
// Unsupported or denied platforms must remain silent.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  syncWorkoutWakeLock, releaseWorkoutWakeLock, workoutWakeLockState,
} from '../js/workout/keep-awake.js';

const tick = () => new Promise((resolve) => setImmediate(resolve));

function installGlobals(request) {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { visibilityState: 'visible', addEventListener() {} },
  });
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: request ? { wakeLock: { request } } : {},
  });
}

test('an unsupported platform is a silent no-op', async () => {
  installGlobals(null);
  syncWorkoutWakeLock({ enabled: true, active: true });
  await tick();
  assert.deepEqual(workoutWakeLockState(), { wanted: true, held: false });
  releaseWorkoutWakeLock();
  await tick();
  assert.deepEqual(workoutWakeLockState(), { wanted: false, held: false });
});

test('the preference off never requests a lock', async () => {
  let requests = 0;
  installGlobals(async () => { requests += 1; return { addEventListener() {}, release: async () => {} }; });
  syncWorkoutWakeLock({ enabled: false, active: true });
  await tick();
  assert.equal(requests, 0);
  assert.deepEqual(workoutWakeLockState(), { wanted: false, held: false });
});

test('an active workout acquires once and releases when it stops applying', async () => {
  let requests = 0;
  const lock = { released: false, addEventListener() {}, release: async () => { lock.released = true; } };
  installGlobals(async () => { requests += 1; return lock; });

  syncWorkoutWakeLock({ enabled: true, active: true });
  await tick();
  assert.equal(requests, 1);
  assert.deepEqual(workoutWakeLockState(), { wanted: true, held: true });

  // Every cockpit render calls sync; a held lock must not be re-requested.
  syncWorkoutWakeLock({ enabled: true, active: true });
  await tick();
  assert.equal(requests, 1);

  syncWorkoutWakeLock({ enabled: true, active: false });
  await tick();
  assert.equal(lock.released, true);
  assert.deepEqual(workoutWakeLockState(), { wanted: false, held: false });
});

test('release is idempotent', async () => {
  let requests = 0;
  installGlobals(async () => { requests += 1; return { addEventListener() {}, release: async () => {} }; });
  syncWorkoutWakeLock({ enabled: true, active: true });
  await tick();
  releaseWorkoutWakeLock();
  releaseWorkoutWakeLock();
  await tick();
  assert.equal(requests, 1);
  assert.deepEqual(workoutWakeLockState(), { wanted: false, held: false });
});
