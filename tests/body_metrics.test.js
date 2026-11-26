// =============================================================================
// BODY METRICS MODEL + BAND
//
// Weight, tape and body fat are ENTered readings — nothing here estimates them.
// The band must also never imply a change from a single weigh-in.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBodyMetricsModel } from '../js/analytics/body-metrics.js';
import { renderBody } from '../js/analytics/views/view-body.js';
import { resolveRange } from '../js/analytics/ranges.js';

const range = resolveRange('30d', '2026-11-24');

function state(overrides = {}) {
  return {
    settings: { weightUnit: 'kg', measurementUnit: 'cm', targetWeight: 75 },
    bodyWeightLog: [
      { date: '2026-11-01', weight: 80 },
      { date: '2026-11-20', weight: 78.4 },
    ],
    bodyMeasurements: [
      { date: '2026-11-01', waist: 84, chest: 104, arm_l: 38, bodyFat: 19.4 },
      { date: '2026-11-20', waist: 82, chest: 104, bodyFat: 18.5 },
    ],
    ...overrides,
  };
}

test('weight, change and the key sites come through', () => {
  const model = buildBodyMetricsModel(state(), { range });
  assert.equal(model.unit, 'kg');
  assert.equal(model.weight.latest, 78.4);
  assert.equal(model.weight.change, -1.6);
  assert.ok(model.keySites.some((site) => site.key === 'waist'));
  assert.equal(model.siteCount >= 3, true);
});

test('a single weigh-in produces no change claim', () => {
  const model = buildBodyMetricsModel(state({ bodyWeightLog: [{ date: '2026-11-20', weight: 78.4 }] }), { range });
  assert.equal(model.weight.change, null);
  assert.doesNotMatch(renderBody(model), /Unchanged over|over 25 Oct/);
});

test('body fat is an entered reading and is shown with its own unit', () => {
  const model = buildBodyMetricsModel(state(), { range });
  assert.equal(model.bodyFat.latestPct, 18.5);
  assert.equal(model.bodyFat.deltaDate, '2026-11-01');
  const html = renderBody(model);
  assert.match(html, /18\.5%/);
  assert.match(html, /since 1 Nov/);
  assert.match(html, /entered, never estimated/);
});

test('PG9: the band links to Measures instead of duplicating every site', () => {
  const model = buildBodyMetricsModel(state(), { range });
  const waist = model.keySites.find((site) => site.key === 'waist');
  assert.equal(waist.previousDate, '2026-11-01');
  assert.equal(waist.deltaCm, -2, 'the model still owns the delta');

  const html = renderBody(model);
  // The measurement strip and its table moved to Measures; the band's action
  // still names how many sites are there, so the destination is not a guess.
  assert.doesNotMatch(html, /pg-site__btn/);
  assert.doesNotMatch(html, /Change since previous/);
  assert.match(html, /data-action="open-analytics"[^>]*data-context="measures"/);
  assert.match(html, /Measurements \(\d+\) →/);
});

test('no body fat reads as nothing, not as zero', () => {
  const model = buildBodyMetricsModel(state({ bodyMeasurements: [{ date: '2026-11-20', waist: 82 }] }), { range });
  assert.equal(model.bodyFat, null);
  assert.doesNotMatch(renderBody(model), /Body fat/);
});

test('an empty body offers one action and no chart', () => {
  const empty = buildBodyMetricsModel({ settings: {}, bodyWeightLog: [], bodyMeasurements: [] }, { range });
  assert.equal(empty.hasData, false);
  const html = renderBody(empty);
  assert.match(html, /pg-state--empty/);
  assert.doesNotMatch(html, /pg-body__chart/);
});

test('the band takes its units from state, never a hardcoded kg', () => {
  const imperial = buildBodyMetricsModel(state({ settings: { weightUnit: 'lbs', measurementUnit: 'in' } }), { range });
  const html = renderBody(imperial);
  // The tape strip moved to Measures, so the band's only unit is weight.
  assert.doesNotMatch(html, /<small>cm<\/small>/);
  assert.match(html, /78\.4 lb|78\.4 lbs/, 'weight uses pounds');
  assert.doesNotMatch(html, /78\.4 kg/);
});

test('the chart is the shared bodyweight chart, and only from two points', () => {
  const html = renderBody(buildBodyMetricsModel(state(), { range }));
  assert.match(html, /<svg/);
  const one = buildBodyMetricsModel(state({ bodyWeightLog: [{ date: '2026-11-20', weight: 78.4 }] }), { range });
  assert.doesNotMatch(renderBody(one), /pg-body__chart/);
});

test('loading and error are explicit', () => {
  assert.match(renderBody(null), /aria-busy="true"/);
  assert.match(renderBody(null, { error: 'boom' }), /role="alert"/);
});
