// =============================================================================
// MAIN EXERCISES BAND — render contract: every row is a real link into the
// drilldown, the sparkline is decorative, and the numbers exist as text.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildExerciseSummaryModel } from '../js/analytics/exercises-summary.js';
import { resolveRange } from '../js/analytics/ranges.js';
import { renderExercises } from '../js/analytics/views/view-exercises.js';

const range = resolveRange('30d', '2026-11-24');
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const day = (date, lifts) => ({ dates: { mon: date }, lifts: { mon: lifts } });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

function model() {
  return buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [done(140)], 'Bench Press': [done(100)] }),
    day('2026-11-17', { 'Back Squat': [done(150)], 'Bench Press': [done(100)] }),
    day('2026-11-20', { 'Barbell Row': [done(80)] }),
    day('2026-11-21', { 'Barbell Row': [done(85)] }),
  ]), { range, unit: 'kg' });
}

test('rows link into the exercise drilldown with a real entity', () => {
  const html = renderExercises(model());
  assert.match(html, /data-context="exercise"/);
  assert.match(html, /data-entity="[a-z_]+"/);
  assert.match(html, /data-entity-name="Back Squat"/);
});

test('rows state their numbers in text and draw no self-scaled sparkline', () => {
  const html = renderExercises(model());
  // A line scaled to its own min/max makes +1% and +50% look identical, and the
  // row already states the change — so the row carries no sparkline at all.
  assert.doesNotMatch(html, /pg-ex__spark/);
  assert.match(html, /best/);
  assert.match(html, /Show data/);
});

test('a lift with no measurable load says nothing rather than "0 kg best"', () => {
  const bodyweight = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Push-Up': [done(0, 20)] }),
    day('2026-11-17', { 'Push-Up': [done(0, 22)] }),
    day('2026-11-20', { 'Back Squat': [done(140)] }),
    day('2026-11-21', { 'Barbell Row': [done(80)] }),
  ]), { range });
  const html = renderExercises(bodyweight);
  assert.doesNotMatch(html, /0 kg best/);
  assert.match(html, /sessions/);
});

test('a tied best is not a PR', () => {
  const tied = buildExerciseSummaryModel(stateWith([
    day('2026-11-10', { 'Back Squat': [done(140)] }),
    day('2026-11-17', { 'Back Squat': [done(140)] }),
    day('2026-11-20', { 'Bench Press': [done(100)], 'Barbell Row': [done(80)] }),
    day('2026-11-21', { 'Bench Press': [done(100)], 'Barbell Row': [done(85)] }),
  ]), { range });
  const squat = tied.rows.find((row) => row.lift === 'Back Squat');
  assert.equal(squat.prFlag, false, 'equalling the best is not beating it');
});

test('the limit caps rows and offers the rest', () => {
  const html = renderExercises(model(), { limit: 1 });
  assert.equal((html.match(/class="pg-ex"/g) || []).length, 1);
  assert.match(html, /Show all \d+ exercises/);
});

test('an empty model asks for data instead of listing nothing', () => {
  const empty = buildExerciseSummaryModel({ weeks: {} }, { range });
  const html = renderExercises(empty);
  assert.match(html, /pg-state--empty/);
  assert.doesNotMatch(html, /pg-ex-list/);
});

test('loading and error are explicit', () => {
  assert.match(renderExercises(null), /aria-busy="true"/);
  const error = renderExercises(null, { error: 'boom' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});
