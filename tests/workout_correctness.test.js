// ==========================================
// WORKOUT CORRECTNESS (tests/workout_correctness.test.js)
//
// Three logger rules that must not regress:
//   • an untouched displayed weight is never re-parsed into storage;
//   • a plan's rest is clamped to the timer's supported maximum;
//   • retyping a PR row as a warm-up/drop clears the trophy it no longer earns.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { shouldCommitEnteredWeight } from '../js/workout/units.js';
import { resolveRestDuration } from '../js/workout/rest-duration.js';
import { setWorkoutContext } from '../js/workout/context.js';
import { setSetType } from '../js/workout/set-mutations.js';

test('a displayed weight is only written back when the athlete changed it', () => {
  // 100 kg renders as "220.5" lb. Re-parsing it stored 100.02 kg on every tick.
  assert.equal(shouldCommitEnteredWeight({ entered: '220.5', displayed: '220.5', hasStoredWeight: true }), false);
  assert.equal(shouldCommitEnteredWeight({ entered: ' 220.5 ', displayed: '220.5', hasStoredWeight: true }), false);
  assert.equal(shouldCommitEnteredWeight({ entered: '225', displayed: '220.5', hasStoredWeight: true }), true);
  // A blank row has no stored value to preserve.
  assert.equal(shouldCommitEnteredWeight({ entered: '220.5', displayed: '220.5', hasStoredWeight: false }), true);
  assert.equal(shouldCommitEnteredWeight({ entered: '100', displayed: undefined, hasStoredWeight: true }), true);
});

test('a plan rest over the timer maximum is clamped, not lost on reload', () => {
  const base = { restTiers: { warmup: 45, compound: 120, accessory: 90, isolation: 60 } };
  assert.equal(resolveRestDuration({ ...base, planRestSec: 900 }), 600);
  assert.equal(resolveRestDuration({ ...base, planRestSec: 420 }), 420);
  assert.equal(resolveRestDuration({ ...base, liftName: 'Squat', restOverrides: { Squat: 900 } }), 600);
});

test('retyping a PR set as a warm-up clears the PR flag', () => {
  const state = {
    currentWeek: '1',
    weeks: {
      '1': {
        lifts: { mon: { Squat: [{ c: true, w: '100', r: '5', isPR: true, prKind: 'e1rm' }] } },
      },
    },
  };
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  globalThis.document = { querySelector: () => null };
  globalThis.CSS = { escape: (value) => String(value) };
  const saves = [];
  setWorkoutContext(() => state, () => 'mon', () => ['mon'], () => saves.push(true), () => {}, () => {});
  try {
    setSetType('Squat', 0, 'W');
    const set = state.weeks['1'].lifts.mon.Squat[0];
    assert.equal(set.type, 'W');
    assert.equal(set.isPR, undefined);
    assert.equal(set.prKind, undefined);
    assert.equal(saves.length, 1, 'the change is persisted');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousCSS === undefined) delete globalThis.CSS;
    else globalThis.CSS = previousCSS;
  }
});
