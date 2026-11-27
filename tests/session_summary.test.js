import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionMuscles } from '../js/home/session-muscles.js';
import { buildSessionSummary, formatGymDuration, sessionSummaryHTML } from '../js/home/session-summary.js';
import { bodyHeatClass, muscleHeatmapHTML } from '../js/home/body-heatmap.js';

function stateWith(lifts = {}, weekExtra = {}, stateExtra = {}) {
  return {
    currentWeek: '1',
    settings: { weightUnit: 'kg' },
    ...stateExtra,
    weeks: {
      '1': {
        dates: { mon: '2026-08-03' },
        lifts: { mon: lifts },
        gymStats: { mon: { time: '42:00' } },
        sessionSummary: { mon: { finishedAt: '2026-08-03T09:48:00+10:00' } },
        ...weekExtra,
      },
    },
  };
}

const LIFTS = {
  'Barbell Bench Press': [
    { w: '80', r: '5', c: true },
    { w: '80', r: '5', c: true, isPR: true },
  ],
  'Barbell Row': [
    { w: '70', r: '8', c: true },
    { w: '70', r: '8', c: false },
  ],
};

test('session muscles count completed working sets only, never warm-ups or unticked rows', () => {
  const muscles = buildSessionMuscles({
    'Barbell Bench Press': [
      { w: '40', r: '8', c: true, type: 'W' },
      { w: '80', r: '5', c: true },
      { w: '80', r: '5', c: false },
    ],
  });
  assert.equal(muscles.hasData, true);
  assert.ok(muscles.muscles.length > 0);
  const ids = muscles.muscles.map((m) => m.id);
  assert.ok(ids.includes('chest'));
  assert.ok(ids.includes('triceps'));
  assert.equal(muscles.top[0].intensity, 1);
});

test('a run-only or unknown-exercise day has no muscle map', () => {
  assert.equal(buildSessionMuscles({}).hasData, false);
  assert.equal(buildSessionMuscles({ 'Totally Custom Lift': [{ w: '50', r: '5', c: true }] }).hasData, false);
});

test('region intensity is the max of the muscles mapped to it, never a sum', () => {
  const muscles = buildSessionMuscles({
    'Barbell Bench Press': [{ w: '80', r: '5', c: true }],
  });
  const upper = muscles.regions['chest-upper-left'] || 0;
  assert.ok(upper > 0);
  assert.ok(upper <= 1);
});

test('session summary reads duration, volume, sets, PRs and today body weight', () => {
  const summary = buildSessionSummary(stateWith(LIFTS), '1', 'mon');
  assert.equal(summary.sets, 3);
  assert.equal(summary.volume, 80 * 5 + 80 * 5 + 70 * 8);
  assert.equal(summary.volume, 1360);
  assert.equal(summary.prs, 1);
  assert.equal(summary.duration, '42 min');
  assert.equal(summary.muscles.hasData, true);
  const withWeight = stateWith(LIFTS, {}, { bodyWeightLog: [{ date: '2026-08-03', weight: 85.9 }] });
  assert.equal(buildSessionSummary(withWeight, '1', 'mon').bodyWeight, 85.9);
});

test('duration formatting is honest about missing and sub-minute values', () => {
  assert.equal(formatGymDuration(''), '');
  assert.equal(formatGymDuration('0:45'), '45 s');
  assert.equal(formatGymDuration('42:00'), '42 min');
  assert.equal(formatGymDuration('1:02:30'), '1 hr 3 min');
  assert.equal(formatGymDuration('nonsense'), '');
});

test('the summary view carries stats, an accessible map and no per-map credit', () => {
  const summary = buildSessionSummary(stateWith(LIFTS), '1', 'mon');
  const html = sessionSummaryHTML(summary);
  assert.match(html, /session-summary/);
  assert.match(html, /42 min/);
  assert.match(html, /Duration/);
  assert.match(html, /1,?360 kg/);
  assert.match(html, /Sets/);
  assert.match(html, /1 e1RM PR/);
  assert.match(html, /Front body map/);
  assert.match(html, /Back body map/);
  // Attribution lives in NOTICE.md + Settings → About → Licences, not under
  // every heat map. A re-added credit line is a regression, not a nicety.
  assert.doesNotMatch(html, /session-map__credit/);
  assert.doesNotMatch(html, /Ivan Vulović/);
  assert.doesNotMatch(html, /<img/i);
});

test('heat classes step from base through primary', () => {
  assert.equal(bodyHeatClass(0), 'bm-base');
  assert.equal(bodyHeatClass(0.2), 'bm-h1');
  assert.equal(bodyHeatClass(0.5), 'bm-h2');
  assert.equal(bodyHeatClass(0.7), 'bm-h3');
  assert.equal(bodyHeatClass(0.95), 'bm-h4');
  assert.doesNotMatch(muscleHeatmapHTML(buildSessionMuscles({})), /session-map/);
});
