// @ts-check
// =============================================================================
// WORKOUT KEEP-AWAKE (js/workout/keep-awake.js)
//
// A workout is a hands-busy activity: the athlete enters a weight, looks away
// to lift, and comes back. The browser's Screen Wake Lock API keeps the display
// on while the session is open, but only while the workout tab is the visible
// surface. The lock is released the moment the athlete leaves the tab, the
// session finishes, or the preference is turned off.
//
// No wake lock is fabricated when the platform does not support one: this is a
// progressive enhancement, and a denied request is a silent no-op. GPS has its
// own lock because it must survive a different lifecycle (tracking, not a
// workout tab).
// =============================================================================

/** @type {any} */
let _lock = null;
let _wanted = false;
let _initialised = false;

function supported() {
  return typeof navigator !== 'undefined'
    && /** @type {any} */ (navigator).wakeLock
    && typeof (/** @type {any} */ (navigator).wakeLock.request) === 'function';
}

function visible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

async function acquire() {
  if (_lock || !_wanted || !supported() || !visible()) return;
  try {
    const lock = await /** @type {any} */ (navigator).wakeLock.request('screen');
    // The preference or the tab may have changed while the request was in
    // flight. Release the late lock rather than leaving the screen on.
    if (!_wanted) {
      try { await lock.release(); } catch (_) { /* already released */ }
      return;
    }
    _lock = lock;
    lock.addEventListener?.('release', () => {
      if (_lock === lock) _lock = null;
    });
  } catch (_) {
    // Unsupported, denied, or a low-power state. The workout still works.
  }
}

async function release() {
  const lock = _lock;
  _lock = null;
  if (!lock) return;
  try { await lock.release(); } catch (_) { /* already released */ }
}

/**
 * Match the lock to the current screen and preference. Safe to call on every
 * cockpit render: a held lock is left alone.
 * @param {{ enabled?: boolean, active?: boolean }} [options]
 */
export function syncWorkoutWakeLock({ enabled = true, active = false } = {}) {
  _wanted = Boolean(enabled) && Boolean(active);
  if (!_wanted) {
    void release();
    return;
  }
  void acquire();
}

/** Release immediately (leaving the workout tab, finishing or discarding). */
export function releaseWorkoutWakeLock() {
  _wanted = false;
  void release();
}

/**
 * Re-acquire after the system released the lock while the app was hidden
 * (battery saver, a phone call, the lock screen). Registered once.
 */
export function initWorkoutWakeLock() {
  if (_initialised || typeof document === 'undefined') return;
  _initialised = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && _wanted && !_lock) void acquire();
  });
}

/** Test seam: the module has process-wide state, like the timer. */
export function workoutWakeLockState() {
  return { wanted: _wanted, held: Boolean(_lock) };
}
