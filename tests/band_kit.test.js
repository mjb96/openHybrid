// =============================================================================
// BAND KIT — the one place the Progress surface's states and text alternatives
// are implemented. These assertions are deliberately about CONTRACT (roles,
// escaping, reserved height), not about pixels or wording.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  band, collapsedBandRow, dataTableDisclosure, legend, rankedRows, stateBlock,
} from '../js/analytics/views/band-kit.js';

test('a band is a labelled section whose heading names it', () => {
  const html = band({ id: 'muscles', eyebrow: 'Muscles', value: '96', valueUnit: 'sets' });
  assert.match(html, /<section class="pg-band" data-band="muscles"/);
  assert.match(html, /aria-labelledby="pg-band-muscles-title"/);
  assert.match(html, /id="pg-band-muscles-title"/);
  assert.match(html, /96/);
  assert.match(html, /sets/);
});

test('an explicit accessible name overrides the visible heading', () => {
  const html = band({ id: 'pulse', eyebrow: 'Pulse', ariaLabel: '23–29 Nov overview' });
  assert.match(html, /aria-label="23–29 Nov overview"/);
  assert.doesNotMatch(html, /aria-labelledby/);
});

test('band copy is escaped, including action attributes', () => {
  const html = band({
    id: 'x',
    eyebrow: '<img src=x onerror=alert(1)>',
    value: '<b>1</b>',
    sub: '"quoted" & <script>',
    actions: [{ label: '<b>Go</b>', context: 'a"b' }],
  });
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /<b>Go<\/b>/);
  assert.match(html, /&lt;img/);
  assert.match(html, /data-context="a&quot;b"/);
});

test('loading reserves its geometry and announces as busy, not as content', () => {
  const html = stateBlock('loading', { height: 220 });
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /--pg-state-h:220px/);
  // A skeleton must not pretend to be data.
  assert.doesNotMatch(html, /pg-band__value/);
});

test('empty states name the problem and offer one action', () => {
  const html = stateBlock('empty', {
    message: 'No runs in this period',
    action: { label: 'Log a run', action: 'open-run-logger' },
  });
  assert.match(html, /role="status"/);
  assert.match(html, /No runs in this period/);
  assert.match(html, /data-action="open-run-logger"/);
  assert.equal((html.match(/<button/g) || []).length, 1, 'exactly one action');
});

test('an error is an alert with a retry, and never blank', () => {
  const html = stateBlock('error', { message: 'Could not calculate', detail: 'boom', retry: { label: 'Try again' } });
  assert.match(html, /role="alert"/);
  assert.match(html, /Could not calculate/);
  assert.match(html, /Try again/);
  assert.match(html, /<details/);
  assert.match(html, /boom/);
});

test('offline is informational, not an error', () => {
  const html = stateBlock('offline');
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /role="alert"/);
  assert.match(html, /on-device/);
});

test('stale states carry the date they are as of', () => {
  const html = stateBlock('stale', { asOf: '12 Nov' });
  assert.match(html, /As of 12 Nov/);
});

test('the data table is the accessible equivalent, not a hidden afterthought', () => {
  const html = dataTableDisclosure(['Week', 'Sets'], [['W1', 18], ['W2', 21]], 'Sets per week');
  assert.match(html, /<details class="pg-data">/);
  assert.match(html, /<caption class="sr-only">Sets per week<\/caption>/);
  assert.match(html, /<th scope="col">Week<\/th>/);
  assert.equal((html.match(/<tr>/g) || []).length, 3, 'header + two rows');
  assert.match(html, /18/);
  assert.match(html, /21/);
});

test('a data table with no columns renders nothing rather than an empty shell', () => {
  assert.equal(dataTableDisclosure([], [['a']], 'x'), '');
});

test('legend entries are a list with a label, and muted entries are marked', () => {
  const html = legend([
    { label: 'Chest', color: 'var(--color-cyan)' },
    { label: 'Other', muted: true },
  ]);
  assert.match(html, /<ul class="pg-legend"/);
  assert.match(html, /aria-label="Legend"/);
  assert.match(html, /is-muted/);
  assert.match(html, /Chest/);
});

test('ranked rows clamp percentages and escape the label', () => {
  const html = rankedRows([
    { label: 'Chest', value: 18, pct: 86, status: 'typical' },
    { label: '<b>Bad</b>', value: 0, pct: 999 },
    { label: 'Neg', value: 1, pct: -5 },
  ]);
  assert.match(html, /width:86%/);
  assert.match(html, /width:100%/, 'over-range is clamped');
  assert.match(html, /width:0%/, 'negative is clamped');
  assert.doesNotMatch(html, /<b>Bad<\/b>/);
  assert.match(html, /typical/);
});

test('a ranked row becomes a button only when it has an action', () => {
  const plain = rankedRows([{ label: 'Chest', value: 1, pct: 10 }]);
  assert.doesNotMatch(plain, /<button/);

  const actionable = rankedRows([{ label: 'Chest', value: 1, pct: 10, action: { context: 'muscle' } }]);
  assert.match(actionable, /<button type="button"/);
  assert.match(actionable, /data-context="muscle"/);
});

test('a collapsed band states its headline and how to expand it', () => {
  const html = collapsedBandRow({
    id: 'endurance', eyebrow: 'Endurance', value: '38.2 km', delta: '+4.8 km',
  });
  assert.match(html, /pg-band--collapsed/);
  assert.match(html, /data-action="expand-band"/);
  assert.match(html, /38\.2 km/);
  // The accessible name carries the number, so the collapsed state is not a
  // mystery to a screen reader.
  assert.match(html, /aria-label="Endurance: 38\.2 km, \+4\.8 km\. Show details\."/);
});
