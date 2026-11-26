// =============================================================================
// MUSCLES BAND — render contract. The chart may never be the only place a
// number exists, and the legend may never exceed six entries however many
// muscles were trained.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMuscleModel } from '../js/analytics/muscles.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';
import { renderMuscles } from '../js/analytics/views/view-muscles.js';

const range = resolveRange('30d', '2026-11-24');
const previous = previousRange(range);
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const warm = (w) => ({ c: true, w: String(w), r: '10', type: 'W' });
const day = (date, lifts) => ({ dates: { mon: date }, lifts: { mon: lifts } });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

function fullModel() {
  return buildMuscleModel(stateWith([
    day('2026-11-16', {
      'Barbell Bench Press': [done(100), done(100)],
      'Barbell Row': [done(80)],
      'Back Squat': [done(140)],
      'Romanian Deadlift': [done(120)],
      'Lateral Raise': [done(12)],
      'Barbell Curl': [done(30)],
      'Standing Calf Raise': [done(60)],
      Plank: [{ c: true, mode: 'time', sec: '60' }],
    }),
  ]), { range, previous, grouping: 'week' });
}

test('a trained window renders chart, legend, rows and the text table', () => {
  const html = renderMuscles(fullModel());
  assert.match(html, /data-band="muscles"/);
  assert.match(html, /class="pg-stack"/);
  assert.match(html, /class="pg-legend"/);
  assert.match(html, /class="pg-rows"/);
  assert.match(html, /Show data/);
  assert.match(html, /credited sets/);
});

test('the legend never exceeds six series plus Other', () => {
  const html = renderMuscles(fullModel());
  const items = (html.match(/pg-legend__item/g) || []).length;
  assert.ok(items <= 7, `legend rendered ${items} entries`);
  if (items === 7) assert.match(html, /Other/);
});

test('no two muscles are drawn in the same colour', () => {
  // Colour carries the group and a SHADE carries the muscle. Giving a whole
  // group one hue made Quads/Hamstrings/Glutes identical in the chart and made
  // the legend look like duplicated rows.
  const html = renderMuscles(fullModel());
  const colours = [...html.matchAll(/pg-legend__swatch" style="background:([^"]+)"/g)].map((match) => match[1]);
  assert.ok(colours.length >= 5, 'the legend lists several muscles');
  assert.equal(new Set(colours).size, colours.length, `duplicate colours: ${colours.join(', ')}`);
});

test('every charted bucket states its total in text', () => {
  const html = renderMuscles(fullModel());
  assert.match(html, /credited sets<\/span>/, 'sr-only bucket totals');
});

test('the grouping chips carry the active state', () => {
  const html = renderMuscles(fullModel());
  assert.match(html, /data-pg-grouping="week" aria-pressed="true"/);
  assert.match(html, /data-pg-grouping="month" aria-pressed="false"/);
  assert.match(html, /data-pg-grouping="year" aria-pressed="false"/);
});

test('ranked rows show sets and the change against the previous window', () => {
  const mutated = buildMuscleModel(stateWith([
    day('2026-11-16', { 'Back Squat': [done(140)] }),
    day('2026-10-20', { 'Barbell Bench Press': [done(100)] }),
  ]), { range, previous, grouping: 'week' });
  const html = renderMuscles(mutated);
  assert.match(html, /Quads/);
  assert.match(html, /\+\d+(\.\d+)? pts/, 'a delta in points, not a percentage of a percentage');
});

test('warm-ups never reach the chart', () => {
  const withWarmups = renderMuscles(buildMuscleModel(stateWith([
    day('2026-11-16', { 'Back Squat': [warm(60), warm(80), done(140)] }),
  ]), { range, previous, grouping: 'week' }));
  const without = renderMuscles(buildMuscleModel(stateWith([
    day('2026-11-16', { 'Back Squat': [done(140)] }),
  ]), { range, previous, grouping: 'week' }));
  const setsOf = (html) => html.match(/([\d.]+)<span class="pg-band__unit">credited sets/)?.[1];
  assert.equal(setsOf(withWarmups), setsOf(without));
});

test('one muscle can be focused without hiding the rest of the band', () => {
  const html = renderMuscles(fullModel(), { selected: 'chest' });
  assert.match(html, /class="pg-muscle-pick"/);
  assert.match(html, /<option value="chest" selected>Chest<\/option>/);
  assert.match(html, /class="pg-muscle-meta">Rank \d+ of \d+ · [\d.]+% of credited sets · \d+ session/);
  assert.match(html, /aria-label="Chest credited sets/);
  assert.match(html, /Chest \(credited sets\)/);
  assert.match(html, /sets\/week averaged over this range/);
  assert.match(html, /typical <b>/);
  assert.match(html, /Review volume guide/);
  // The focused chart is one series, not the six-group stack.
  assert.equal((html.match(/pg-legend__item/g) || []).length, 1);
  assert.match(html, /class="pg-band__value">([\d.]+)<span class="pg-band__unit">credited sets/);
});

test('an unknown muscle focus falls back to All muscles', () => {
  const html = renderMuscles(fullModel(), { selected: 'not-a-muscle' });
  assert.match(html, /<option value="all" selected>All muscles<\/option>/);
  assert.doesNotMatch(html, /class="pg-muscle-meta"/);
  assert.match(html, /Credited sets per muscle/);
});

test('an empty window offers one action and no axes', () => {
  const empty = buildMuscleModel({ weeks: {} }, { range });
  const html = renderMuscles(empty);
  assert.match(html, /pg-state--empty/);
  assert.doesNotMatch(html, /pg-stack/);
  assert.match(html, /data-action="switch-tab"/);
});

test('loading and error are explicit', () => {
  assert.match(renderMuscles(null), /aria-busy="true"/);
  const error = renderMuscles(null, { error: 'boom' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});
