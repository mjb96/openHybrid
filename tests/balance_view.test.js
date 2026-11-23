// =============================================================================
// BALANCE BAND — render contract. The split must never imply a 100 % mix when
// only one modality has data, and the excluded walking time must stay visible.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildBalanceModel } from '../js/analytics/balance.js';
import { previousRange, resolveRange } from '../js/analytics/ranges.js';
import { renderBalance } from '../js/analytics/views/view-balance.js';

const range = resolveRange('30d', '2026-11-24');
const previous = previousRange(range);
const done = (w, r = 5) => ({ c: true, w: String(w), r: String(r) });
const strength = (date, minutes = 60) => ({ dates: { mon: date }, lifts: { mon: { Squat: [done(100)] } }, gymStats: { mon: { time: String(minutes) } } });
const run = (date, extra = {}) => ({ dates: { mon: date }, runSessions: { mon: [{ dist: '5', time: '30:00', type: 'run', ...extra }] } });
const stateWith = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

test('a real mix renders the split, the legend and the basis', () => {
  const model = buildBalanceModel(stateWith([strength('2026-11-20', 60), run('2026-11-21')]), { range, previous });
  const html = renderBalance(model);
  assert.match(html, /data-band="balance"/);
  assert.match(html, /class="pg-split"/);
  assert.match(html, /width:66\.7%/);
  assert.match(html, /width:33\.3%/);
  assert.match(html, /Strength 66\.7%/);
  assert.match(html, /by training time/);
  assert.match(html, /Show data/);
});

test('the split is described in text for a screen reader', () => {
  const model = buildBalanceModel(stateWith([strength('2026-11-20', 60), run('2026-11-21')]), { range, previous });
  const html = renderBalance(model);
  assert.match(html, /aria-label="Strength 66\.7 percent, endurance 33\.3 percent"/);
  assert.match(html, /aria-label="[^"]*training mix: 66\.7 percent strength, 33\.3 percent endurance"/);
});

test('excluded walking is stated, not silently dropped', () => {
  const model = buildBalanceModel(
    stateWith([strength('2026-11-20', 60), run('2026-11-21'), { ...run('2026-11-22', { type: 'walk' }) }]),
    { range, previous },
  );
  const html = renderBalance(model);
  assert.match(html, /Not counted: 30 min walking/);
  // ...and it did not move the split.
  assert.match(html, /Strength 66\.7%/);
});

test('one modality is an explanation, never a 100 % bar', () => {
  const onlyStrength = buildBalanceModel(stateWith([strength('2026-11-20')]), { range, previous });
  const html = renderBalance(onlyStrength);
  assert.match(html, /No runs in this period/);
  assert.doesNotMatch(html, /pg-split/);

  const onlyRuns = buildBalanceModel(stateWith([run('2026-11-20')]), { range, previous });
  assert.match(renderBalance(onlyRuns), /No strength work in this period/);
});

test('an unchanged mix is stated in words rather than "+0"', () => {
  const same = stateWith([
    strength('2026-11-20', 60), run('2026-11-21'),
    strength('2026-10-20', 60), run('2026-10-21'),
  ]);
  const html = renderBalance(buildBalanceModel(same, { range, previous }));
  assert.match(html, /unchanged/);
  assert.doesNotMatch(html, /down 0|up 0/);
});

test('loading and error states are explicit', () => {
  assert.match(renderBalance(null), /aria-busy="true"/);
  const error = renderBalance(null, { error: 'boom' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});
