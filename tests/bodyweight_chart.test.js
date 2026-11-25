// =============================================================================
// BODYWEIGHT CHART CONTRACT
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBodyWeightWithMA } from '../js/analytics/charts.js';

const entry = (date, weight) => ({ date, weight });

test('the bodyweight graph draws daily points, a 7-day average and a goal line', () => {
  const container = { innerHTML: '' };
  renderBodyWeightWithMA(container, [
    entry('2026-11-01', 85),
    entry('2026-11-05', 84.2),
    entry('2026-11-09', 84.6),
    entry('2026-11-14', 83.8),
    entry('2026-11-19', 83.5),
  ], { unit: 'kg', goal: 80 });
  const html = container.innerHTML;
  assert.match(html, /<svg /);
  assert.match(html, /Body weight history/);
  assert.match(html, /7d avg/);
  assert.match(html, /Goal 80 kg/);
  assert.match(html, /2026-11-19 · 83\.5 kg/);
  assert.match(html, /stroke="var\(--warning\)"/);
});

test('one weigh-in or none gets a useful message, not an empty chart', () => {
  const one = { innerHTML: '' };
  renderBodyWeightWithMA(one, [entry('2026-11-19', 83.5)], { unit: 'kg' });
  assert.match(one.innerHTML, /One entry logged \(83\.5 kg\)/);

  const none = { innerHTML: '' };
  renderBodyWeightWithMA(none, [], { unit: 'kg' });
  assert.match(none.innerHTML, /Log body weight/);
});
