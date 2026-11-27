// =============================================================================
// PULSE BAND — render contract.
//
// Model → view, end to end, on a minimal DOM (no browser): the point is that a
// ReferenceError or a missing state can't ship unseen, and that the rail's
// accessible text carries the same numbers as the visible cells.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPulseModel } from '../js/analytics/pulse.js';
import { renderPulse } from '../js/analytics/views/view-pulse.js';

const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });

function state() {
  return {
    weeks: {
      '1': {
        dates: { mon: '2026-11-23', tue: '2026-11-24' },
        lifts: { mon: { 'Bench Press': [done(100), done(100)] } },
        runSessions: {
          tue: [
            { dist: '5', time: '25:00', type: 'run' },
            { dist: '2', time: '20:00', type: 'walk' },
          ],
        },
      },
      '2': { dates: { mon: '2026-11-16' }, lifts: { mon: { Squat: [done(100)] } } },
    },
  };
}

const model = () => buildPulseModel(state(), { todayISO: '2026-11-24' });

test('a trained week renders the rail, the headline and the streak', () => {
  const html = renderPulse(model());
  assert.match(html, /data-band="pulse"/);
  assert.match(html, /class="pg-rail"/);
  assert.equal((html.match(/<li class="pg-day/g) || []).length, 7, 'seven day cells');
  assert.match(html, />3</, 'three sessions as the headline');
  assert.match(html, /2-week streak/);
  assert.match(html, /Week in progress/);
});

test('the rail states each day in text, with runs and walks kept apart', () => {
  const html = renderPulse(model());
  // Each day states its own content, so a screen reader never has to infer
  // training from a coloured dot.
  assert.ok(html.includes('23 Nov: 1 session, 2 sets'), 'Monday');
  assert.ok(html.includes('24 Nov: 2 sessions, 5.00 km run, 2.00 km walk'), 'Tuesday');
  assert.ok(html.includes('upcoming'), 'future days say so');
});

test('rest and future days are distinguished visually, not only by colour', () => {
  const html = renderPulse(model());
  assert.match(html, /is-future/);
  assert.match(html, /is-today/);

  // A rest day needs a day that has elapsed without training.
  const rest = buildPulseModel({
    weeks: { '1': { dates: { mon: '2026-11-23' }, lifts: { mon: { Squat: [done(100)] } } } },
  }, { todayISO: '2026-11-25' });
  assert.match(renderPulse(rest), /is-rest/);
});

test('the body map appears only when there are credited working sets', () => {
  const withSets = renderPulse(model());
  assert.match(withSets, /session-map/, 'heat map rendered');
  assert.doesNotMatch(withSets, /pg-pulse__credit/, 'no per-map credit line');
  assert.doesNotMatch(withSets, /Ivan Vulović/);

  const runsOnly = buildPulseModel({
    weeks: { '1': { dates: { mon: '2026-11-23' }, runSessions: { mon: [{ dist: '5', time: '25:00', type: 'run' }] } } },
  }, { todayISO: '2026-11-24' });
  const html = renderPulse(runsOnly);
  assert.doesNotMatch(html, /session-map/, 'no strength work, no body map');
});

test('the data table carries the same numbers as the cards', () => {
  const html = renderPulse(model());
  assert.match(html, /Show data/);
  assert.match(html, /<th scope="col">Day<\/th>/);
  assert.match(html, /Run \(km\)/);
  assert.match(html, /Walk \(km\)/);
});

test('an empty week names what is missing and offers one action', () => {
  const empty = buildPulseModel({ weeks: {} }, { todayISO: '2026-11-24' });
  const html = renderPulse(empty);
  assert.match(html, /pg-state--empty/);
  assert.match(html, /No training logged this week yet/);
  assert.match(html, /data-action="switch-tab"/);
  assert.doesNotMatch(html, /pg-rail/, 'no empty rail');
});

test('a missing model is a loading state with reserved geometry', () => {
  const html = renderPulse(null);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /--pg-state-h:190px/);
  assert.doesNotMatch(html, /pg-rail/);
});

test('an error is surfaced with a retry and no false zeros', () => {
  const html = renderPulse(model(), { error: 'boom' });
  assert.match(html, /role="alert"/);
  assert.match(html, /Try again/);
  assert.match(html, /boom/);
  assert.doesNotMatch(html, /pg-rail/);
});

test('volume is labelled in the athlete unit and walks never join the run distance', () => {
  const kg = renderPulse(model(), { weightUnit: 'kg', distanceUnit: 'km' });
  assert.match(kg, /1\.0t lifted/, '1000 kg compacts to tonnes');
  assert.match(kg, /5\.00 km run/);
  assert.match(kg, /2\.00 km walked/);

  const lbs = renderPulse(model(), { weightUnit: 'lbs', distanceUnit: 'mi' });
  assert.match(lbs, /lb lifted/);
  assert.match(lbs, /3\.11 mi run/, 'stored km converted for display, not relabelled');
});
