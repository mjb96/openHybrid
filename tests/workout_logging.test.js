// ==========================================
// WORKOUT LOGGING INTEGRATION TEST (tests/workout_logging.test.js)
// Exercises the real log-a-workout state path in the under-tested js/workout.js
// (CLAUDE.md flags it): adding sets, cycling set type/load, per-set RIR, and
// removal — asserting the actual appState mutations + that a save fires.
// Runs js/workout.js against a minimal DOM stub (as scripts/smoke.mjs does).
// Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { toCanonicalWeight } from '../js/metrics/weight-unit.js';
import { displayWeight } from '../js/workout/units.js';
import { test, before } from 'node:test';

// ── Minimal DOM/globals stub so workout.js runs headless ──────────────────────
const noop = () => {};
function makeEl(id = '') {
  const e = {
    id, setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    appendChild: (c) => c, insertBefore: (c) => c, removeChild: noop, remove: noop,
    after: noop, before: noop, prepend: noop, append: noop, replaceChildren: noop,
    replaceWith: noop, insertAdjacentHTML: noop, insertAdjacentElement: noop, scrollIntoView: noop,
    addEventListener: noop, removeEventListener: noop, dispatchEvent: noop,
    querySelector: () => null, querySelectorAll: () => [], closest: () => null,
    matches: () => false, hasAttribute: () => false,
    contains: () => false, click: noop, focus: noop,
    getBoundingClientRect: () => ({ top: 0, left: 0, width: 100, height: 50 }),
    style: { setProperty: noop, removeProperty: noop, getPropertyValue: () => '' },
    dataset: {}, classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    previousElementSibling: null, firstChild: null, parentElement: null,
    parentNode: { removeChild: noop }, children: [], offsetWidth: 100,
  };
  let h = '', t = '', v = '';
  Object.defineProperty(e, 'innerHTML', { get: () => h, set: (x) => { h = String(x); } });
  Object.defineProperty(e, 'textContent', { get: () => t, set: (x) => { t = String(x); } });
  Object.defineProperty(e, 'value', { get: () => v, set: (x) => { v = String(x); } });
  return e;
}

let workout;
let runLogging;
let state;
let saveCount;

before(async () => {
  const store = new Map();
  globalThis.document = {
    addEventListener: noop, removeEventListener: noop,
    getElementById: (id) => { if (!store.has(id)) store.set(id, makeEl(id)); return store.get(id); },
    querySelector: () => null, querySelectorAll: () => [], createElement: () => makeEl(),
    dispatchEvent: noop, readyState: 'complete', body: makeEl('body'), documentElement: makeEl('html'),
  };
  globalThis.window = { addEventListener: noop, removeEventListener: noop,
    location: { reload: noop, href: '' }, matchMedia: () => ({ matches: false, addEventListener: noop }),
    // Complete the browser-API surface the render path touches — a missing
    // scrollTo used to throw a swallowed "window.scrollTo is not a function"
    // while the test still passed (a false green).
    scrollTo: noop, scroll: noop, scrollBy: noop, scrollY: 0, scrollX: 0,
    requestAnimationFrame: (cb) => { cb && cb(0); return 0; }, cancelAnimationFrame: noop,
    getComputedStyle: () => ({ display: 'block', getPropertyValue: () => '' }) };
  globalThis.scrollTo = noop;
  globalThis.requestAnimationFrame = (cb) => { cb && cb(0); return 0; };
  globalThis.CSS = { escape: (s) => String(s) };
  globalThis.getComputedStyle = () => ({ display: 'block' });
  globalThis.localStorage = { s: {}, getItem(k) { return this.s[k] ?? null; }, setItem(k, v) { this.s[k] = String(v); }, removeItem(k) { delete this.s[k]; } };
  globalThis.L = { map: () => ({ remove: noop, fitBounds: noop, setView: noop, invalidateSize: noop }),
    tileLayer: () => ({ addTo: () => ({}) }), polyline: () => ({ addTo: () => ({ getBounds: noop }) }),
    circleMarker: () => ({ addTo: () => ({}) }) };

  workout = await import('../js/workout.js');
  runLogging = await import('../js/workout/run-logging.js');
});

function freshState() {
  return {
    currentWeek: '1',
    activeProgramId: 'hybrid_engine',
    activeActivationId: 'active_program_run',
    weeks: { '1': { activationId: 'active_program_run', programId: 'hybrid_engine', lifts: { mon: {} }, liftOrder: { mon: [] }, runs: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {}, liftMeta: {} } },
    settings: { bandWeights: { L: 10, M: 20, H: 30 } },
    bodyWeightLog: [{ weight: 80 }],
    exerciseStats: {},
  };
}

function initWith(s, selectedDay = 'mon') {
  state = s;
  saveCount = 0;
  workout.initWorkout(() => state, () => selectedDay, () => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'], () => { saveCount++; }, () => {});
}

const sets = (lift) => state.weeks['1'].lifts.mon[lift];

test('appendCustomSetRow adds a blank working set and saves', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Bench Press');
  assert.deepEqual(sets('Bench Press'), [{ w: '', r: '', c: false }]);
  assert.ok(saveCount >= 1);
});

test('appendWarmupSetRow inserts a warm-up before the first working set', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Squat');           // working set at idx 0
  workout.appendWarmupSetRow(null, 'Squat');           // warm-up should go to idx 0
  assert.equal(sets('Squat').length, 2);
  assert.equal(sets('Squat')[0].type, 'W');
  assert.equal(sets('Squat')[1].type, undefined);      // original working set
});

test('appendDropSetRow seeds a lighter drop row from the last working set', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Squat');
  sets('Squat')[0].w = '100';
  sets('Squat')[0].r = '5';
  sets('Squat')[0].c = true;

  workout.appendDropSetRow(null, 'Squat');
  assert.equal(sets('Squat').length, 2);
  assert.deepEqual(sets('Squat')[1], { w: '80', r: '5', c: false, type: 'D' });
});

test('appendDropSetRow skips warm-ups and rounds to the lb step', () => {
  const stateWithLb = freshState();
  stateWithLb.settings.weightUnit = 'lbs';
  initWith(stateWithLb);
  workout.appendCustomSetRow(null, 'Squat');
  // ST6: storage is kilograms, so 135 lb is stored as its kg equivalent.
  sets('Squat')[0].w = String(toCanonicalWeight(135, 'lbs'));
  sets('Squat')[0].r = '5';
  sets('Squat')[0].c = true;
  workout.appendWarmupSetRow(null, 'Squat');   // inserted at the front
  workout.appendDropSetRow(null, 'Squat');

  assert.deepEqual(sets('Squat').map((set) => set.type), ['W', undefined, 'D']);
  // 135 × 0.8 = 108 → 110 lb step, stored back as canonical kilograms.
  assert.equal(displayWeight(stateWithLb, sets('Squat')[2].w), '110');
  assert.equal(sets('Squat')[2].r, '5');
});

test('appendDropSetRow still adds a typed row with no source', () => {
  initWith(freshState());
  workout.appendDropSetRow(null, 'Squat');
  assert.deepEqual(sets('Squat'), [{ w: '', r: '', c: false, type: 'D' }]);
});

test('cycleSetType walks ""→W→D→F→"" ', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'OHP');
  const seq = [];
  for (let i = 0; i < 4; i++) { workout.cycleSetType('OHP', 0); seq.push(sets('OHP')[0].type); }
  assert.deepEqual(seq, ['W', 'D', 'F', '']);
});

// Async since a bodyweight/assisted state may have to ask for a body weight the
// app was never given — it used to substitute a hardcoded 75 kg. This fixture
// has one logged (80), so nothing is asked and the awaits just sequence.
test('cycleSetLoad stamps bodyweight, subtracts band assistance, then clears', async () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Pull-up');
  // '' -> BW (stamps latest logged bodyweight 80)
  await workout.cycleSetLoad('Pull-up', 0);
  assert.equal(sets('Pull-up')[0].bw, true);
  assert.equal(sets('Pull-up')[0].w, '80');
  // BW -> L (band light = 10) — a pull-up, so the band ASSISTS
  await workout.cycleSetLoad('Pull-up', 0);
  assert.equal(sets('Pull-up')[0].band, 'L');
  assert.equal(sets('Pull-up')[0].w, '70');
  // L -> M -> H -> '' (weighted, cleared)
  await workout.cycleSetLoad('Pull-up', 0); // M
  await workout.cycleSetLoad('Pull-up', 0); // H
  await workout.cycleSetLoad('Pull-up', 0); // ''
  assert.equal(sets('Pull-up')[0].w, '');
  assert.equal(sets('Pull-up')[0].bw, undefined);
  assert.equal(sets('Pull-up')[0].band, undefined);
});

test('cycleSetLoad on an accessory logs the band itself, never bodyweight', async () => {
  // The reported bug: a banded pushdown was logged at bodyweight-minus-band.
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Band Triceps Pushdown');
  await workout.cycleSetLoad('Band Triceps Pushdown', 0); // '' -> BW
  await workout.cycleSetLoad('Band Triceps Pushdown', 0); // BW -> L
  assert.equal(sets('Band Triceps Pushdown')[0].band, 'L');
  assert.equal(sets('Band Triceps Pushdown')[0].w, '10', 'the Light band is the load');
  assert.equal(sets('Band Triceps Pushdown')[0].loadMode, 'banded');
});

test('setSetLoadMode exposes direct Bodyweight, Weighted, and Assisted choices', async () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Dips');
  await workout.setSetLoadMode('Dips', 0, 'bodyweight');
  assert.equal(sets('Dips')[0].bw, true);
  assert.equal(sets('Dips')[0].w, '80');
  await workout.setSetLoadMode('Dips', 0, 'assisted');
  assert.equal(sets('Dips')[0].band, 'M');
  assert.equal(sets('Dips')[0].w, '60');
  await workout.setSetLoadMode('Dips', 0, 'weighted');
  assert.equal(sets('Dips')[0].loadMode, 'weighted');
  assert.equal(sets('Dips')[0].w, '');
});

test('setPerSetRir stores a half-step RIR + derived RPE, and taps to clear', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  workout.setPerSetRir('Row', 0, 1.5);
  assert.equal(sets('Row')[0].rir, 1.5);
  assert.equal(sets('Row')[0].rpe, 8.5);   // 10 - RIR
  // tapping the same value clears both
  workout.setPerSetRir('Row', 0, 1.5);
  assert.equal(sets('Row')[0].rir, null);
  assert.equal(sets('Row')[0].rpe, null);
});

test('setPerSetRir snaps an off-scale input and refuses an impossible one', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  workout.setPerSetRir('Row', 0, 1.3);
  assert.equal(sets('Row')[0].rir, 1.5);
  assert.equal(sets('Row')[0].rpe, 8.5);
  workout.setPerSetRir('Row', 0, 9);
  assert.equal(sets('Row')[0].rir, 1.5, 'an out-of-range tap never clears the real rating');
  assert.equal(sets('Row')[0].rpe, 8.5);
});

test('a legacy RPE-only set clears when its already-active RIR is tapped', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  sets('Row')[0].rpe = 8;                  // imported without an RIR
  workout.setPerSetRir('Row', 0, 2);       // the sheet shows "2" as active
  assert.equal(sets('Row')[0].rir, null);
  assert.equal(sets('Row')[0].rpe, null);
});

test('setPerSetRir replaces one half-step with another instead of clearing', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  workout.setPerSetRir('Row', 0, 1.5);
  workout.setPerSetRir('Row', 0, 3.5);
  assert.equal(sets('Row')[0].rir, 3.5);
  assert.equal(sets('Row')[0].rpe, 6.5);
});

test('a string-stored RIR clears when the same numeric rating is tapped', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  sets('Row')[0].rir = '2';                // CSV/backup import keeps it as text
  workout.setPerSetRir('Row', 0, 2);
  assert.equal(sets('Row')[0].rir, null);
  assert.equal(sets('Row')[0].rpe, null);
});

test('an invalid tap on an unrated set is a no-op', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  workout.setPerSetRir('Row', 0, 9);
  workout.setPerSetRir('Row', 0, null);
  assert.equal('rir' in sets('Row')[0], false);
  assert.equal('rpe' in sets('Row')[0], false);
});

test('toggleSetFailure is independent of the AMRAP set type and toggles off', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  workout.toggleSetFailure('Row', 0);
  assert.equal(sets('Row')[0].failure, true);
  assert.equal(sets('Row')[0].type, undefined, 'failure never reuses type F');
  workout.toggleSetFailure('Row', 0);
  assert.equal(sets('Row')[0].failure, undefined);
});

test('toggleLoadBasis cycles a dumbbell set between Each and Both', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Dumbbell Bench Press');
  // A blank dumbbell row DISPLAYS Each, so the first tap switches it to Both.
  workout.toggleLoadBasis('Dumbbell Bench Press', 0);
  assert.equal(sets('Dumbbell Bench Press')[0].basis, 'total');
  workout.toggleLoadBasis('Dumbbell Bench Press', 0);
  assert.equal(sets('Dumbbell Bench Press')[0].basis, 'each');
});

test('rest is remembered per EXERCISE, not pinned to one set', async () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Row');
  const mutations = await import('../js/workout/set-mutations.js');
  mutations.setSetRest('Row', 0, 90);
  // The preference lives on the exercise (and survives the session); the row
  // itself carries no restSec, so every set of the lift resolves the same rest.
  assert.equal(state.settings.restOverrides.Row, 90);
  assert.equal(sets('Row')[0].restSec, undefined);

  mutations.setSetRest('Row', 0, null);
  assert.equal(state.settings.restOverrides.Row, undefined);
  assert.equal(sets('Row')[0].restSec, undefined);

  mutations.setSetNote('Row', 0, '  belt on  ');
  assert.equal(sets('Row')[0].note, 'belt on');
  mutations.setSetNote('Row', 0, '');
  assert.equal(sets('Row')[0].note, undefined);
});

test('removeCustomSetRow deletes the set and prunes empty lift from liftOrder', () => {
  initWith(freshState());
  state.weeks['1'].liftOrder.mon = ['Deadlift'];
  workout.appendCustomSetRow(null, 'Deadlift');
  assert.ok(sets('Deadlift'));
  workout.removeCustomSetRow('Deadlift', 0);
  assert.equal(sets('Deadlift'), undefined);                    // lift removed when empty
  assert.deepEqual(state.weeks['1'].liftOrder.mon, []);         // and pruned from order
});

test('render guard: a stray lift_* key never surfaces as an exercise name', () => {
  initWith(freshState());
  // Simulate an un-migrated key arriving from an older device
  // directly in the day the cockpit is about to render.
  state.weeks['1'].lifts.mon['lift_abcd12'] = [
    { w: '120', r: '5', c: true }, { w: '120', r: '5', c: true },
  ];
  state.weeks['1'].liftOrder.mon = ['lift_abcd12'];

  // Spy on every card element the render path builds so we can read its HTML
  // (appendChild is a no-op in the stub, so cards aren't reachable otherwise).
  const created = [];
  const origCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => { const el = origCreate(tag); created.push(el); return el; };
  try {
    workout.renderWorkout();
  } finally {
    globalThis.document.createElement = origCreate;
  }

  const html = created.map(el => el.innerHTML || '').join('\n');
  // The visible exercise name is the cockpit-ex-name span. The raw id may still
  // appear in data-liftname (the internal handle used to key logging), but it
  // must never be the displayed NAME.
  const names = [...html.matchAll(/<span class="cockpit-ex-name">([^<]*)<\/span>/g)].map(m => m[1]);
  assert.ok(names.includes('Unknown exercise'), 'honest fallback label is the displayed name');
  assert.equal(names.some(n => /lift_/.test(n)), false, 'raw internal id is never the displayed name');
});

test('workout card carries prior sets across program archives and exercise aliases', () => {
  initWith(freshState());
  state.weeks['1'].lifts.mon['Bench Press'] = [{ w: '', r: '', c: false }];
  state.weeks['1'].liftOrder.mon = ['Bench Press'];
  state.weeks['arch:old:1'] = {
    activationId: 'old', programId: 'old_program',
    dates: { tue: '2026-07-18' },
    lifts: { tue: { 'Barbell Bench Press': [{ w: '80', r: '5', c: true }] } },
    runs: {}, notes: {}, gymRpe: {}, gymStats: {},
  };

  const created = [];
  const origCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => { const el = origCreate(tag); created.push(el); return el; };
  try {
    workout.renderWorkout();
  } finally {
    globalThis.document.createElement = origCreate;
  }

  const benchCard = created.find((el) => /cockpit-ex-name">Bench Press</.test(el.innerHTML || ''));
  assert.ok(benchCard, 'current program Bench Press card renders');
  assert.match(benchCard.innerHTML, /Last performed/);
  assert.match(benchCard.innerHTML, /top 80kg × 5 · 1 set/);
  assert.match(benchCard.innerHTML, /data-action="use-previous-values"/);
  assert.match(benchCard.innerHTML, /data-action="open-activity-detail"/);
  assert.doesNotMatch(benchCard.innerHTML, /placeholder="80"/);
  assert.doesNotMatch(benchCard.innerHTML, /Suggested next/);
  assert.doesNotMatch(benchCard.innerHTML, /First time logging/);
});

test('resuming a current workout renders its own entries separately from prior history', () => {
  initWith(freshState());
  state.weeks['1'].lifts.mon['Bench Press'] = [{ w: '85', r: '6', c: false }];
  state.weeks['1'].liftOrder.mon = ['Bench Press'];
  state.weeks['arch:old:1'] = {
    activationId: 'old', programId: 'old_program',
    dates: { tue: '2026-07-18' },
    lifts: { tue: { 'Barbell Bench Press': [{ w: '80', r: '5', c: true }] } },
    runs: {}, notes: {}, gymRpe: {}, gymStats: {},
  };

  const created = [];
  const origCreate = globalThis.document.createElement;
  globalThis.document.createElement = (tag) => { const el = origCreate(tag); created.push(el); return el; };
  try {
    workout.renderWorkout();
  } finally {
    globalThis.document.createElement = origCreate;
  }

  const benchCard = created.find((el) => /cockpit-ex-name">Bench Press</.test(el.innerHTML || ''));
  assert.ok(benchCard);
  assert.match(benchCard.innerHTML, /value="85"/);
  assert.match(benchCard.innerHTML, /value="6"/);
  assert.match(benchCard.innerHTML, /Last performed/);
  assert.match(benchCard.innerHTML, /top 80kg × 5/);
  assert.doesNotMatch(benchCard.innerHTML, /Suggested next/);
});

test('quick log never imports another activation without Use previous values', () => {
  initWith(freshState());
  state.weeks['1'].lifts.mon['Bench Press'] = [{ w: '', r: '', c: false }];
  state.weeks['arch:old:1'] = {
    activationId: 'old', programId: 'old_program',
    dates: { tue: '2026-07-18' },
    lifts: { tue: { 'Barbell Bench Press': [{ w: '80', r: '5', c: true }] } },
    runs: {}, notes: {}, gymRpe: {}, gymStats: {},
  };

  let weightFocused = false;
  const weight = makeEl();
  weight.getAttribute = (name) => name === 'placeholder' ? 'kg' : null;
  weight.focus = () => { weightFocused = true; };
  const reps = makeEl();
  reps.getAttribute = (name) => name === 'placeholder' ? '5' : null;
  reps.dataset.targetReps = '5';
  const checkbox = { checked: false };
  const card = { querySelectorAll: () => [row] };
  const row = {
    dataset: { loadMode: 'weighted' },
    classList: { contains: () => false },
    getAttribute: (name) => name === 'data-set-mode' ? 'reps' : null,
    querySelector(selector) {
      if (selector === '.input-weight-node') return weight;
      if (selector === '.input-reps-node') return reps;
      if (selector === '.input-set-value-node') return reps;
      if (selector === '.gym-check') return checkbox;
      return null;
    },
    closest(selector) {
      return selector === '.cockpit-exercise' ? card : null;
    },
  };
  const label = { closest: () => row };

  workout.executeOneTapQuickLog(label, 'Bench Press', 0);

  assert.deepEqual(state.weeks['1'].lifts.mon['Bench Press'], [{ w: '', r: '', c: false }]);
  assert.equal(checkbox.checked, false);
  assert.equal(weightFocused, true, 'the logger requests a current load instead of copying history');
});

test('checking a blank set never imports another activation without explicit use', () => {
  initWith(freshState());
  state.weeks['1'].lifts.mon['Bench Press'] = [{ w: '', r: '', c: false }];
  state.weeks['arch:old:1'] = {
    activationId: 'old', programId: 'old_program',
    dates: { tue: '2026-07-18' },
    lifts: { tue: { 'Barbell Bench Press': [{ w: '80', r: '5', c: true }] } },
    runs: {}, notes: {}, gymRpe: {}, gymStats: {},
  };

  let weightFocused = false;
  const weight = makeEl();
  weight.placeholder = 'kg';
  weight.focus = () => { weightFocused = true; };
  const reps = makeEl();
  reps.placeholder = '5';
  const rowClassList = { add: noop, remove: noop, contains: () => false };
  const card = {
    getAttribute: (name) => name === 'data-liftname' ? 'Bench Press' : null,
    querySelectorAll: () => [row],
  };
  const row = {
    // The real row carries data-load-mode; the logger reads it to decide
    // whether a blank weight is incomplete or simply a bodyweight set.
    dataset: { loadMode: 'weighted' },
    classList: rowClassList,
    getAttribute: (name) => name === 'data-set-mode' ? 'reps' : null,
    querySelector(selector) {
      if (selector === '.input-weight-node') return weight;
      if (selector === '.input-reps-node') return reps;
      if (selector === '.input-set-value-node') return reps;
      if (selector === '.gym-check') return checkbox;
      return null;
    },
  };
  const checkbox = {
    checked: true,
    closest(selector) {
      if (selector === '.cockpit-set-row') return row;
      if (selector === '.cockpit-exercise') return card;
      return null;
    },
  };

  workout.toggleGymCheckLoggingState(checkbox);

  assert.equal(checkbox.checked, false);
  assert.deepEqual(state.weeks['1'].lifts.mon['Bench Press'], [{ w: '', r: '', c: false }]);
  assert.equal(weightFocused, true);
});

test('Use previous values fills blank fields without overwriting or completing sets', () => {
  initWith(freshState());
  state.weeks['1'].lifts.mon['Bench Press'] = [
    { w: '85', r: '', c: false }, { w: '', r: '', c: false },
  ];
  state.weeks['arch:old:1'] = {
    dates: { tue: '2026-07-18' },
    lifts: { tue: { 'Barbell Bench Press': [
      { w: '80', r: '5', c: true }, { w: '75', r: '8', c: true },
    ] } },
    runs: {}, gymRpe: {}, gymStats: {},
  };
  const inputs = [
    { weight: makeEl(), reps: makeEl() }, { weight: makeEl(), reps: makeEl() },
  ];
  const card = {
    querySelector(selector) {
      const match = selector.match(/data-set-index="(\d+)"/);
      const entry = inputs[Number(match?.[1])];
      return entry ? {
        getAttribute: () => 'reps',
        querySelector: (inner) => inner.includes('weight') || inner.includes('reps-node') ? (inner.includes('weight') ? entry.weight : entry.reps) : entry.reps,
      } : null;
    },
  };
  const original = globalThis.document.querySelector;
  globalThis.document.querySelector = () => card;
  try { workout.usePreviousValues('Bench Press'); }
  finally { globalThis.document.querySelector = original; }

  assert.deepEqual(state.weeks['1'].lifts.mon['Bench Press'], [
    { w: '85', r: '5', c: false }, { w: '75', r: '8', c: false },
  ]);
  assert.equal(inputs[0].weight.value, '', 'existing weight remains untouched');
  assert.equal(inputs[0].reps.value, '5');
  assert.equal(inputs[1].weight.value, '75');
  assert.equal(inputs[1].reps.value, '8');
  assert.equal(state.weeks['1'].sessionStatus.mon, 'in_progress');
  assert.ok(saveCount >= 1);
});

test('finishing a completed-but-undated workout stamps its local date so it stays visible', async () => {
  // A workout whose completed sets arrived without a local date stamp (e.g. a
  // completion synced/imported from another device) must not finish undated:
  // an undated session is excluded from calendar analytics AND sinks to the
  // bottom of the activity history, effectively vanishing from "today". The
  // deliberate Finish is the last chance to guarantee a calendar date.
  const { dateKey } = await import('../js/dates.js');
  const { buildActivityHistory } = await import('../js/activities/model.js');
  const today = dateKey();
  initWith({
    currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'a1',
    weeks: { '1': {
      activationId: 'a1', programId: 'hybrid_engine',
      lifts: { wed: { Squat: [{ w: '100', r: '5', c: true }, { w: '100', r: '5', c: true }] } },
      liftOrder: { wed: ['Squat'] },
      runs: {}, runSessions: {}, notes: {}, gymRpe: {}, bodyWeight: {}, gymStats: {}, liftMeta: {}, dates: {},
    } },
    settings: { bandWeights: { L: 10, M: 20, H: 30 } }, bodyWeightLog: [{ weight: 80 }], exerciseStats: {},
  }, 'wed');

  assert.equal(state.weeks['1'].dates.wed, undefined, 'precondition: no date stamped yet');
  workout.closeFinishSessionModal();

  assert.equal(state.weeks['1'].dates.wed, today, 'finish stamps the local calendar date');
  assert.equal(state.weeks['1'].sessionStatus.wed, 'finished');
  const strengthToday = buildActivityHistory(state).filter((r) => r.kind === 'strength' && r.localDate === today);
  assert.equal(strengthToday.length, 1, 'the finished workout appears in history under today');
});

test('pairAsSuperset / unpairSuperset tag and clear a shared groupId', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Bench');
  workout.appendCustomSetRow(null, 'Row');
  workout.pairAsSuperset('Bench', 'Row');
  const meta = state.weeks['1'].liftMeta.mon;
  assert.equal(meta.Bench.groupId, 'A');
  assert.equal(meta.Row.groupId, 'A');
  workout.unpairSuperset('Bench');
  assert.equal(meta.Bench.groupId, undefined);
  assert.equal(meta.Row.groupId, undefined);
});

test('pairAsSuperset adds a third without re-lettering the original pair', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Bench');
  workout.appendCustomSetRow(null, 'Row');
  workout.appendCustomSetRow(null, 'Curl');
  workout.pairAsSuperset('Bench', 'Row');
  workout.pairAsSuperset('Row', 'Curl');
  const meta = state.weeks['1'].liftMeta.mon;
  assert.equal(meta.Bench.groupId, 'A', 'the first partner is not stranded under a dead letter');
  assert.equal(meta.Row.groupId, 'A');
  assert.equal(meta.Curl.groupId, 'A');

  workout.removeFromSuperset('Curl');
  assert.equal(meta.Curl.groupId, undefined);
  assert.equal(meta.Bench.groupId, 'A');
  workout.removeFromSuperset('Row');
  assert.equal(meta.Bench.groupId, undefined, 'a lone remaining member loses its badge');
});

test('pairAsSuperset refuses a cross-group merge instead of re-lettering', () => {
  initWith(freshState());
  workout.appendCustomSetRow(null, 'Bench');
  workout.appendCustomSetRow(null, 'Row');
  workout.appendCustomSetRow(null, 'Curl');
  workout.appendCustomSetRow(null, 'Fly');
  workout.pairAsSuperset('Bench', 'Row');
  workout.pairAsSuperset('Curl', 'Fly');
  const meta = state.weeks['1'].liftMeta.mon;
  assert.equal(meta.Curl.groupId, 'B');
  workout.pairAsSuperset('Row', 'Curl');
  assert.equal(meta.Bench.groupId, 'A');
  assert.equal(meta.Row.groupId, 'A');
  assert.equal(meta.Curl.groupId, 'B');
  assert.equal(meta.Fly.groupId, 'B');
});

test('manual run input derives pace and time in the visible distance unit', () => {
  initWith(freshState());
  const distance = document.getElementById('runInputDist');
  const time = document.getElementById('runInputTime');
  const pace = document.getElementById('runInputPace');
  distance.value = '3.1';
  time.value = '30:00';
  pace.value = '';

  runLogging.handleRunLoggingInput(
    { id: 'runInputDist', matches: () => true },
    { appState: state, weekKey: '1', selectedDay: 'mon' },
  );
  assert.equal(pace.value, '9:41');
  assert.equal(state.weeks['1'].sessionStatus.mon, 'in_progress');

  pace.value = '8:00';
  runLogging.handleRunLoggingInput(
    { id: 'runInputPace', matches: () => true },
    { appState: state, weekKey: '1', selectedDay: 'mon' },
  );
  assert.equal(time.value, '24:48');
});

test('manual miles persist as canonical km without dropping imported run evidence', () => {
  const next = freshState();
  next.settings.distanceUnit = 'mi';
  next.weeks['1'].dates = { mon: '2026-08-11' };
  next.weeks['1'].runs = {
    mon: { sessionId: 'fit-run-1', source: 'fit', avgCadence: 172, dist: '8', time: '50:00' },
  };
  initWith(next);

  document.getElementById('runInputDist').value = '6.21';
  document.getElementById('runInputTime').value = '1:00:00';
  document.getElementById('runInputRpeCockpit').value = '7';
  document.getElementById('runInputPace').value = '9:40';
  workout.commitWorkoutUIState();

  const stored = state.weeks['1'].runs.mon;
  assert.ok(Math.abs(Number(stored.dist) - 10) < 0.01, `expected ~10 km, got ${stored.dist}`);
  assert.equal(stored.time, '1:00:00');
  assert.equal(stored.rpe, '7');
  assert.equal(stored.avgCadence, 172, 'fields with no manual input survive the edit');
  assert.equal(stored.sessionId, 'fit-run-1');
  assert.equal(state.weeks['1'].runSessions.mon.length, 1, 'the existing session is updated, not duplicated');
});
