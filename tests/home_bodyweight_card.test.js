// =============================================================================
// HOME BODYWEIGHT CARD TEXT
//
// The card's words are a pure model so the display contract is testable: the
// latest value, how old it is when that matters, the weekly rate and the
// athlete's own corridor verdict (phrased by metrics/bodyweight.js, the same
// owner Progress uses).
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHomeBodyweight, bodyweightCardText } from '../js/home/bodyweight-card.js';

const NOW = Date.parse('2026-11-20T09:00:00+11:00');

/** A weigh-in N days before NOW, canonical kilograms. */
function daysAgo(n) {
  return new Date(Date.parse('2026-11-20T12:00:00Z') - n * 86400000).toISOString().slice(0, 10);
}

function stateWith(entries, settings = {}) {
  return {
    bodyWeightLog: entries,
    settings: { weightUnit: 'kg', weekStartDay: 'mon', ...settings },
  };
}

/** Seven readings over 14 days, losing ~0.35 kg/week. */
function losingLog() {
  return [13, 11, 9, 7, 5, 3, 1].map((n, i) => ({ date: daysAgo(n), weight: 81 - i * 0.1 }));
}

test('the card states the athlete-owned rate verdict', () => {
  const state = stateWith(losingLog(), { rateGoal: { dir: 'lose', by: 'w', lo: 0.3, hi: 0.5 } });
  const text = bodyweightCardText(buildHomeBodyweight(state, { now: NOW }), { now: NOW });
  assert.match(text.meta, /On pace/);
  assert.match(text.meta, /kg\/wk/);
  assert.equal(text.title, '80.4 kg');
});

test('a rate outside the corridor says so instead of inventing progress', () => {
  const state = stateWith(losingLog(), { rateGoal: { dir: 'lose', by: 'w', lo: 0.6, hi: 0.9 } });
  const text = bodyweightCardText(buildHomeBodyweight(state, { now: NOW }), { now: NOW });
  assert.match(text.meta, /Slower than planned/);
});

test('no corridor means no verdict, never a guess', () => {
  const state = stateWith(losingLog());
  const text = bodyweightCardText(buildHomeBodyweight(state, { now: NOW }), { now: NOW });
  assert.doesNotMatch(text.meta, /On pace|Slower|Faster|Outside/);
});

test('a stale weigh-in leads with its age, not a bare date', () => {
  const state = stateWith([{ date: daysAgo(10), weight: 80 }]);
  const text = bodyweightCardText(buildHomeBodyweight(state, { now: NOW }), { now: NOW });
  assert.match(text.meta, /^Last weigh-in 10 days ago/);
  assert.match(text.aria, /last weigh-in 10 days ago/);
});

test('a recent weigh-in keeps its date and the goal', () => {
  const state = stateWith([{ date: daysAgo(1), weight: 80 }], { targetWeight: 75 });
  const text = bodyweightCardText(buildHomeBodyweight(state, { now: NOW }), { now: NOW });
  assert.match(text.meta, /^19\/11|^19 Nov/);
  assert.match(text.meta, /Goal 75(\.0)? kg/);
  assert.doesNotMatch(text.meta, /Last weigh-in/);
});

test('no weigh-ins is an honest empty state, not a zero', () => {
  const text = bodyweightCardText(buildHomeBodyweight(stateWith([]), { now: NOW }), { now: NOW });
  assert.equal(text.title, 'No weigh-ins yet');
  assert.equal(text.meta, '');
});
