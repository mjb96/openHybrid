// =============================================================================
// PR SURFACES — cockpit badges and the session recap agree, for every shape.
//
// The cockpit used to detect an estimated 1RM only, and only for rep sets, so a
// 60-second plank or a 40 m carry could never show a record. The recap compared
// the session against `history[0]` (the last session) rather than the all-time
// best, so a strong old lift could be beaten by a weaker new one and still fire
// a trophy. These tests pin the shared model at both surfaces.
// =============================================================================
import { test, before } from 'node:test';
import assert from 'node:assert/strict';

// Minimal DOM so js/workout.js can be imported headless (same shape as
// tests/workout_logging.test.js).
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
let recap;
let templates;
let share;

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
  recap = await import('../js/session-recap.js');
  templates = await import('../js/templates.js');
  share = await import('../js/brain/pr-share.js');
});

const work = (w, r, extra = {}) => ({ c: true, w: String(w), r: String(r), ...extra });
const hold = (sec, extra = {}) => ({ c: true, w: '', sec: String(sec), mode: 'time', ...extra });
const carry = (dist, extra = {}) => ({ c: true, w: '20', dist: String(dist), mode: 'distance', ...extra });

function fakeRow() {
  const classes = new Set();
  let badge = null;
  return {
    dataset: {},
    classList: {
      add: (name) => classes.add(name),
      remove: (name) => classes.delete(name),
      contains: (name) => classes.has(name),
    },
    querySelector: (selector) => (selector === '.pr-badge' ? badge : null),
    appendChild: (node) => {
      node.remove = () => { badge = null; };
      badge = node;
    },
    get badge() { return badge; },
  };
}

function stateWith(history, current = {}) {
  return {
    activeActivationId: 'a1',
    weeks: {
      hist: { activationId: 'a1', dates: { mon: '2026-06-01' }, lifts: { mon: history } },
      cur: { activationId: 'a1', dates: { mon: '2026-07-08' }, lifts: { mon: current } },
    },
  };
}

// ── Cockpit ─────────────────────────────────────────────────────────────────

test('a hold that beats the all-time hold wears a Hold PR badge, not a generic PR', () => {
  const state = stateWith({ Plank: [hold(45)] }, { Plank: [hold(45)] });
  const row = fakeRow();
  const decision = workout.detectSetPR(row, 'Plank', 0, hold(60), state, 'cur', 'mon');
  assert.equal(decision?.kind, 'hold');
  assert.equal(row.classList.contains('is-pr'), true);
  assert.equal(row.badge.textContent, 'Hold PR');
  assert.equal(state.weeks.cur.lifts.mon.Plank[0].isPR, true);
  assert.equal(state.weeks.cur.lifts.mon.Plank[0].prKind, 'hold');
});

test('a carry that beats the all-time carry wears a Carry PR badge', () => {
  const state = stateWith({ 'Farmer Carry': [carry(40)] }, { 'Farmer Carry': [carry(40)] });
  const row = fakeRow();
  const decision = workout.detectSetPR(row, 'Farmer Carry', 0, carry(55), state, 'cur', 'mon');
  assert.equal(decision?.kind, 'carry');
  assert.equal(row.badge.textContent, 'Carry PR');
  assert.equal(state.weeks.cur.lifts.mon['Farmer Carry'][0].prKind, 'carry');
});

test('correcting a PR set down removes the class, badge and stored stamp', () => {
  const state = stateWith({ 'Back Squat': [work(100, 5)] }, { 'Back Squat': [work(100, 5)] });
  const row = fakeRow();
  const stored = state.weeks.cur.lifts.mon['Back Squat'][0];
  assert.equal(workout.detectSetPR(row, 'Back Squat', 0, work(110, 5), state, 'cur', 'mon')?.kind, 'e1rm');
  assert.equal(row.classList.contains('is-pr'), true);
  assert.equal(stored.isPR, true);

  // The athlete fixes the typo: 95 kg is below the old 100 kg best.
  const cleared = workout.detectSetPR(row, 'Back Squat', 0, work(95, 5), state, 'cur', 'mon');
  assert.equal(cleared, null);
  assert.equal(row.classList.contains('is-pr'), false);
  assert.equal(row.badge, null);
  assert.equal(stored.isPR, undefined);
  assert.equal(stored.prKind, undefined);
});

test('a bodyweight set never claims a PR in the cockpit', () => {
  const state = stateWith({ 'Pull-Up': [work(0, 10, { bw: true })] }, { 'Pull-Up': [work(0, 12, { bw: true })] });
  const row = fakeRow();
  assert.equal(workout.detectSetPR(row, 'Pull-Up', 0, work(0, 12, { bw: true }), state, 'cur', 'mon'), null);
  assert.equal(row.classList.contains('is-pr'), false);
  assert.equal(state.weeks.cur.lifts.mon['Pull-Up'][0].isPR, undefined);
});

test('the row template labels a stored hold/carry record', () => {
  const holdHtml = templates.buildSetRow(
    { w: '', sec: '60', mode: 'time', c: true, isPR: true, prKind: 'hold' },
    0, 'Plank', null, 'kg', 'Plank',
  );
  assert.match(holdHtml, /class="pr-badge">Hold PR</);
  const carryHtml = templates.buildSetRow(
    { w: '20', dist: '55', mode: 'distance', c: true, isPR: true, prKind: 'carry' },
    0, 'Farmer Carry', null, 'kg', 'Farmer Carry',
  );
  assert.match(carryHtml, /class="pr-badge">Carry PR</);
});

// ── Recap ───────────────────────────────────────────────────────────────────

function threeSessionState() {
  // Middle session is strongest; the newest session repeats a weaker weight.
  return {
    weeks: {
      '1': { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
      '2': { dates: { mon: '2026-06-08' }, lifts: { mon: { 'Back Squat': [work(130, 5)] } } },
      '3': { dates: { mon: '2026-06-15' }, lifts: { mon: { 'Back Squat': [work(120, 5)] } } },
    },
  };
}

test('a three-session recap only awards the session that beat every earlier one', () => {
  const state = threeSessionState();
  assert.equal(recap.buildSessionRecap(state, '1', 'mon').lifts[0].pr, false, 'a baseline is not a record');
  assert.equal(recap.buildSessionRecap(state, '2', 'mon').lifts[0].pr, true, 'the strongest middle session is a PR');
  assert.equal(recap.buildSessionRecap(state, '3', 'mon').lifts[0].pr, false, 'the weaker newest session is not');
});

test('the recap compares against the all-time best, not only the latest session', () => {
  // Old 120, recent 100, new 110: the latest session is weaker than the old
  // best, so 110 must not be celebrated just because it beat the last one.
  const state = {
    weeks: {
      '1': { dates: { mon: '2026-06-01' }, lifts: { mon: { 'Back Squat': [work(120, 5)] } } },
      '2': { dates: { mon: '2026-06-08' }, lifts: { mon: { 'Back Squat': [work(100, 5)] } } },
      '3': { dates: { mon: '2026-06-15' }, lifts: { mon: { 'Back Squat': [work(110, 5)] } } },
    },
  };
  const r = recap.buildSessionRecap(state, '3', 'mon');
  assert.equal(r.lifts[0].pr, false);
  assert.deepEqual(r.lifts[0].prKinds, []);
});

test('a mixed session earns one badge per shape and renders the kind names', () => {
  const state = stateWith(
    {
      'Back Squat': [work(100, 5), hold(20)],
      Plank: [hold(45)],
      'Farmer Carry': [carry(40)],
    },
    {
      'Back Squat': [work(110, 5), hold(30)],
      Plank: [hold(60)],
      'Farmer Carry': [carry(55)],
    },
  );
  const r = recap.buildSessionRecap(state, 'cur', 'mon');
  const byName = Object.fromEntries(r.lifts.map((lift) => [lift.name, lift]));
  assert.deepEqual(byName['Back Squat'].prKinds.map((p) => p.kind).sort(), ['e1rm', 'hold']);
  assert.deepEqual(byName.Plank.prKinds.map((p) => p.kind), ['hold']);
  assert.deepEqual(byName['Farmer Carry'].prKinds.map((p) => p.kind), ['carry']);
  assert.equal(byName.Plank.topSet, null, 'a hold is not a 0 kg × 0 rep set');
  assert.equal(byName.Plank.topShape.value, 60);

  const html = recap.renderSessionRecapHTML(r);
  assert.match(html, /🏆 PR/);
  assert.match(html, /🏆 Hold PR/);
  assert.match(html, /🏆 Carry PR/);
  assert.match(html, /best 1:00/);
  assert.match(html, /best 55m/);
  assert.doesNotMatch(html, /0 kg × 0/);
});

test('the share card stays e1RM-only', () => {
  const holdOnly = [{ name: 'Plank', pr: true, e1rm: 0, prKinds: [{ kind: 'hold', label: 'Hold PR' }], e1rmPr: false }];
  assert.equal(share.topPR(holdOnly), null);
  const mixed = [
    { name: 'Plank', pr: true, e1rm: 0, prKinds: [{ kind: 'hold' }], e1rmPr: false },
    { name: 'Back Squat', pr: true, e1rm: 130, prKinds: [{ kind: 'e1rm' }], e1rmPr: true },
  ];
  assert.equal(share.topPR(mixed).name, 'Back Squat');
});
