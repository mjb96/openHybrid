// =============================================================================
// MEASUREMENT SITE TREND CHART
// One site, oldest → newest, no invented line under two readings, and a
// percentage scale for entered body fat.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderSiteTrend } from '../js/analytics/charts.js';

const dotsOf = (html) => [...html.matchAll(/<circle class="bw-site-dot" cx="([\d.]+)"[^>]*><title>([^<]+)<\/title>/g)]
  .map((match) => ({ x: Number(match[1]), title: match[2] }));

test('the site chart orders points oldest to newest', () => {
  const container = { innerHTML: '' };
  renderSiteTrend(container, [
    { date: '2026-11-19', value: 34 },
    { date: '2026-11-10', value: 33 },
    { date: '2026-11-05', value: 32.5 },
  ], { unit: 'cm', label: 'Arm L' });
  const html = container.innerHTML;
  assert.match(html, /<svg /);
  assert.match(html, /Arm L trend \(cm\): 32\.5 cm on 5\/11, 34\.0 cm on 19\/11, \+1\.5 cm/);
  assert.match(html, /<path class="bw-site-line"/);
  const dots = dotsOf(html);
  assert.deepEqual(dots.map((dot) => dot.title.split(' · ')[0]), [
    '2026-11-05', '2026-11-10', '2026-11-19',
  ]);
  assert.ok(dots[0].x < dots[1].x && dots[1].x < dots[2].x, 'x positions follow the dates');
  assert.match(dots[2].title, /34\.0 cm/);
  assert.match(html, /[0-9]{1,2}\/11/);   // date labels, not raw ISO strings only
});

test('under two readings the chart says what is missing instead of drawing a line', () => {
  const one = { innerHTML: '' };
  renderSiteTrend(one, [{ date: '2026-11-19', value: 34 }], { unit: 'cm', label: 'Arm L' });
  assert.doesNotMatch(one.innerHTML, /<svg/);
  assert.match(one.innerHTML, /One Arm L reading logged \(34\.0 cm\)\. Log another to see the trend\./);

  const none = { innerHTML: '' };
  renderSiteTrend(none, [], { unit: 'cm', label: 'Arm L' });
  assert.doesNotMatch(none.innerHTML, /<svg/);
  assert.match(none.innerHTML, /Log Arm L twice to see the trend\./);
});

test('body fat renders on a percentage scale, never the tape unit', () => {
  const container = { innerHTML: '' };
  renderSiteTrend(container, [
    { date: '2026-11-19', value: 18.4 },
    { date: '2026-11-10', value: 19 },
  ], { unit: '%', label: 'Body fat', percent: true });
  const html = container.innerHTML;
  assert.match(html, /Body fat trend \(%\): 19\.0% on 10\/11, 18\.4% on 19\/11, -0\.6%/);
  assert.match(html, /19\.0%/);
  assert.match(html, /18\.4%/);
  assert.doesNotMatch(html, / cm/);
});

test('the chart labels the supplied display values without converting them', () => {
  const container = { innerHTML: '' };
  renderSiteTrend(container, [
    { date: '2026-11-10', value: 13.0 },
    { date: '2026-11-19', value: 13.4 },
  ], { unit: 'in', label: 'Arm L' });
  const html = container.innerHTML;
  assert.match(html, /Arm L trend \(in\): 13\.0 in on 10\/11, 13\.4 in on 19\/11, \+0\.4 in/);
  assert.match(html, /13\.4 in/);
  assert.doesNotMatch(html, /cm/);
});
