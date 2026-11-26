// =============================================================================
// PG9 — the rep-range and effort mix lives on the Strength detail
//
// It moved off the Main exercises band so the hub stays scannable; the band
// still owns the per-lift rows, and this screen owns the distribution evidence.
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { intensityMixHTML } from '../js/analytics/views/view-strength.js';

const mix = {
  hasRepMix: true,
  hasEffortMix: false,
  unratedSets: 0,
  repBands: [
    { key: 'max', label: '1–3', count: 1, sharePct: 20 },
    { key: 'strength', label: '4–6', count: 2, sharePct: 30 },
    { key: 'hypertrophy', label: '7–12', count: 2, sharePct: 50 },
    { key: 'endurance', label: '13+', count: 0, sharePct: 0 },
  ],
  effortBands: [],
  goalFit: { tone: 'ok', text: 'Most working sets (50%) sit in the 1–6 strength range.' },
};

test('the mix renders exact shares, the legend and the goal line', () => {
  const html = intensityMixHTML(mix);
  assert.match(html, /class="pg-mix"/);
  assert.match(html, /Rep range/);
  assert.match(html, /7–12/);
  assert.match(html, /50%/);
  assert.match(html, /strength range/);
});

test('an empty mix renders nothing instead of an empty chart', () => {
  assert.equal(intensityMixHTML({ hasRepMix: false, hasEffortMix: false }), '');
  assert.equal(intensityMixHTML(null), '');
});

test('effort shares are labelled when they exist', () => {
  const html = intensityMixHTML({
    hasRepMix: false,
    hasEffortMix: true,
    unratedSets: 2,
    repBands: [],
    effortBands: [
      { key: 'max', label: 'RIR 0–1', count: 1, sharePct: 50 },
      { key: 'hard', label: 'RIR 2–3', count: 1, sharePct: 50 },
      { key: 'moderate', label: 'RIR 4+', count: 0, sharePct: 0 },
    ],
    goalFit: null,
  });
  assert.match(html, /Effort/);
  assert.match(html, /2 sets unrated/);
  assert.match(html, /RIR 0–1/);
});
