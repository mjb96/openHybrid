// =============================================================================
// FASTING BAND — elapsed time against the athlete's own goal.
//
// Two rules: no health claim ever appears in the copy, and a range with no
// completed fasts renders nothing rather than a zero-filled chart.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFastingBandModel } from '../js/analytics/fasting-band.js';
import { renderFastingBand } from '../js/analytics/views/view-fasting-band.js';
import { FASTING_ZONES } from '../js/fasting.js';
import { STAGE_BLURB } from '../js/fasting/fasting-nudge.js';
import { readFileSync } from 'node:fs';
import { resolveRange } from '../js/analytics/ranges.js';

const range = resolveRange('30d', '2026-11-24');

function state(history, goal = 16) {
  return { fastingSession: { active: false, startTime: null, goal, history } };
}
// durationHours + goalHours: the shape js/fasting.js actually writes.
const fast = (endTime, hours) => ({ startTime: 'x', endTime, durationHours: hours, goalHours: 16 });

test('average, adherence and longest come from completed fasts in the window', () => {
  const model = buildFastingBandModel(state([
    fast('2026-11-20T12:00:00Z', 16),
    fast('2026-11-21T12:00:00Z', 18),
    fast('2026-11-22T12:00:00Z', 14),
  ]), { range });

  assert.equal(model.hasData, true);
  assert.equal(model.averageHours, 16);
  assert.equal(model.adherencePct, 67);
  assert.equal(model.longestHours, 18);
  assert.equal(model.fasts.length, 3);
  assert.equal(model.fasts[2].metGoal, false, '14 h missed a 16 h goal');
});

test('fasts outside the window are ignored', () => {
  const model = buildFastingBandModel(state([
    fast('2026-11-20T12:00:00Z', 16),
    fast('2026-08-01T12:00:00Z', 20),
  ]), { range });
  assert.equal(model.windowCount, 1);
  assert.equal(model.longestHours, 16);
});

test('a window with no fasts is empty, not a row of zeros', () => {
  const model = buildFastingBandModel(state([]), { range });
  assert.equal(model.hasData, false);
  assert.deepEqual(model.fasts, []);
  const html = renderFastingBand(model);
  assert.match(html, /pg-state--empty/);
  assert.doesNotMatch(html, /pg-fast-chart/);
});

test('the goal line is positioned from the athlete goal', () => {
  const html = renderFastingBand(buildFastingBandModel(state([fast('2026-11-20T12:00:00Z', 20)]), { range }));
  assert.match(html, /--pg-goal:80\.0%/, '16 of 20 hours');
  assert.match(html, /Goal 16 h/);
});

test('the copy makes no health claim', () => {
  const html = renderFastingBand(buildFastingBandModel(state([fast('2026-11-20T12:00:00Z', 16)]), { range }));
  assert.match(html, /Elapsed time against your own goal/);
  for (const banned of ['autophagy', 'fat burn', 'fat loss', 'hormone', 'metabolis', 'detox', 'insulin']) {
    assert.equal(html.toLowerCase().includes(banned), false, `banned claim: ${banned}`);
  }
});

test('loading and error are explicit', () => {
  assert.match(renderFastingBand(null), /aria-busy="true"/);
  assert.match(renderFastingBand(null, { error: 'boom' }), /role="alert"/);
});

test('a missing range is refused', () => {
  assert.throws(() => buildFastingBandModel(state([]), {}), /range is required/);
});

test('the banned health claims are absent from EVERY fasting surface, not just the band', () => {
  // The band was the only renderer this ratchet used to guard, while notifications,
  // the analytics view, the empty state and the zone copy all shipped the claims.
  const banned = ['autophagy', 'fat burn', 'fat loss', 'hormone', 'metabolis', 'detox', 'insulin', 'ketosis', 'fat oxidation'];
  const assertClean = (label, text) => {
    const lower = String(text).toLowerCase();
    for (const word of banned) {
      assert.equal(lower.includes(word), false, `${label} ships a banned claim: ${word}`);
    }
  };

  // 1. the zone descriptions shown by the fasting surface
  for (const zone of FASTING_ZONES) assertClean(`zone ${zone.id || zone.name}`, zone.description || '');

  // 2. the OS notification copy
  for (const [stage, blurb] of Object.entries(STAGE_BLURB)) assertClean(`nudge ${stage}`, blurb);

  // 3. the source of every other fasting renderer (comments stripped: describing
  //    the rule is not breaking it).
  for (const file of ['js/analytics/views/view-fasting.js', 'js/fasting/fasting-insights.js', 'js/fasting/fasting-achievements.js']) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    assertClean(file, source);
  }
});
