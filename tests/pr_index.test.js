// =============================================================================
// PG6 / A6 — the shared all-time e1RM PR index
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecordIndex, collectE1rmPrEvents } from '../js/strength/pr-index.js';
import { indexSlotsByDate } from '../js/analytics/weekly-aggregate.js';

function stateWith(sessions) {
  const weeks = {};
  sessions.forEach(({ date, lift, w, r }, i) => {
    weeks[String(i + 1)] = {
      activationId: 'act', programId: 'hybrid_engine',
      dates: { wed: date },
      lifts: { wed: { [lift]: [{ w: String(w), r: String(r), c: true }] } },
      gymStats: {}, runSessions: {},
    };
  });
  return { currentWeek: '1', activeActivationId: 'act', weeks };
}
const events = (state, options) => collectE1rmPrEvents(indexSlotsByDate(state).allByDate, options);

test('a first performance is a baseline, a tie is not a record, a beat is', () => {
  const baseline = stateWith([{ date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 }]);
  assert.deepEqual(events(baseline), []);

  const tie = stateWith([
    { date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 },
    { date: '2026-11-11', lift: 'Back Squat', w: 100, r: 5 },
  ]);
  assert.deepEqual(events(tie), []);

  const beat = stateWith([
    { date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 },
    { date: '2026-11-11', lift: 'Back Squat', w: 105, r: 5 },
  ]);
  const list = events(beat);
  assert.equal(list.length, 1);
  assert.equal(list[0].lift, 'Back Squat');
  assert.equal(list[0].date, '2026-11-11');
  assert.ok(list[0].e1rm > 100);
});

test('two sessions on one date produce one event from the better session', () => {
  const slot = (w, r) => ({ lifts: { 'Back Squat': [{ w: String(w), r: String(r), c: true }] } });
  const allByDate = new Map([
    ['2026-11-04', [slot(100, 5)]],
    ['2026-11-11', [slot(100, 5), slot(110, 3)]],
  ]);
  const list = collectE1rmPrEvents(allByDate);
  assert.equal(list.length, 1);
  assert.equal(list[0].date, '2026-11-11');
  assert.ok(list[0].e1rm > 110, 'the better same-date session owns the date');
});

test('aliases collapse to one lift, and a year filter keeps the earlier baseline', () => {
  const state = stateWith([
    { date: '2025-12-20', lift: 'Bench Press', w: 90, r: 5 },
    { date: '2026-01-10', lift: 'Barbell Bench Press', w: 95, r: 5 },
  ]);
  const all = events(state);
  assert.equal(all.length, 1, 'the alias joins the same record line');
  const y2026 = events(state, { year: 2026 });
  assert.equal(y2026.length, 1);
  assert.equal(y2026[0].date, '2026-01-10');
  assert.ok(y2026[0].previousBest > 0, '2025 sets the bar even when filtered out');
});

test('the record index returns a best-per-lift table and a newest-first feed', () => {
  const state = stateWith([
    { date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 },
    { date: '2026-11-06', lift: 'Bench Press', w: 80, r: 5 },
    { date: '2026-11-11', lift: 'Back Squat', w: 105, r: 5 },
    { date: '2026-11-13', lift: 'Bench Press', w: 85, r: 5 },
  ]);
  const model = buildRecordIndex(state);
  const squat = model.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(squat.bestDate, '2026-11-11');
  assert.equal(squat.prCount, 1);
  assert.equal(model.feed[0].date, '2026-11-13', 'newest event first');
  assert.equal(model.feedTotal, 2);
  assert.equal(model.hasData, true);
});

test('an empty history has no table and no feed', () => {
  const model = buildRecordIndex({ currentWeek: '1', weeks: {} });
  assert.equal(model.hasData, false);
  assert.deepEqual(model.rows, []);
  assert.deepEqual(model.feed, []);
});

// ---- Records sheet rendering ------------------------------------------------
import { filterRecordRows, recordsHTML } from '../js/analytics/records-sheet.js';

test('the records sheet renders the table, the feed and the search filter', () => {
  const state = stateWith([
    { date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 },
    { date: '2026-11-11', lift: 'Back Squat', w: 105, r: 5 },
    { date: '2026-11-12', lift: 'Bench Press', w: 80, r: 5 },
  ]);
  const model = buildRecordIndex(state);
  const html = recordsHTML(model, 'kg');
  assert.match(html, /All-time bests/);
  assert.match(html, /PR feed/);
  assert.match(html, /Back Squat/);
  assert.match(html, /data-action="open-analytics" data-context="exercise"/);
  assert.match(html, /records-feed__row/);
  assert.ok(filterRecordRows(model.rows, 'squat').every((row) => /Squat/.test(row.lift)));
  assert.equal(filterRecordRows(model.rows, 'deadlift').length, 0);
});

test('searching a lift also narrows the PR feed', () => {
  const state = stateWith([
    { date: '2026-11-04', lift: 'Back Squat', w: 100, r: 5 },
    { date: '2026-11-11', lift: 'Back Squat', w: 105, r: 5 },
    { date: '2026-11-12', lift: 'Bench Press', w: 80, r: 5 },
    { date: '2026-11-13', lift: 'Bench Press', w: 85, r: 5 },
  ]);
  const model = buildRecordIndex(state);
  const html = recordsHTML(model, 'kg', 'bench');
  assert.match(html, /Bench Press/);
  assert.doesNotMatch(html, /Back Squat/);
});

test('an empty model renders an honest empty message', () => {
  const html = recordsHTML({ rows: [], feed: [], feedTotal: 0 }, 'kg');
  assert.match(html, /No records match/);
  assert.match(html, /No PR events match/);
});
