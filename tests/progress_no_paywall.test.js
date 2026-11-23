// =============================================================================
// THE PROGRESS TAB HAS NO PAYWALL AND NEVER WILL.
//
// openHybrid is AGPL FOSS: every band, range and record is available to every
// user. This is a ratchet, not a promise — if a future change introduces a
// locked state, a capped range or an upsell string, the build fails here.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// `unlock` is deliberately NOT here: "connect Health Connect to unlock HRV"
// describes a device permission, not a payment. The test is about money.
const FORBIDDEN = /(?:\bpaywall\b|\bupgrade\b|\bpremium\b|\bpro plan\b|\bsubscri(?:be|ption)\b|\bentitlement\b|\bpurchase\b|\bbilling\b)/i;

const progressSources = [
  'js/analytics/ranges.js',
  'js/analytics/progress-dashboard.js',
  'js/analytics/pulse.js',
  'js/analytics/balance.js',
  'js/analytics/muscles.js',
  'js/analytics/exercises-summary.js',
  'js/analytics/endurance.js',
  'js/analytics/body-metrics.js',
  'js/analytics/fasting-band.js',
  ...readdirSync(path.join(ROOT, 'js/analytics/views'))
    .filter((file) => file.endsWith('.js'))
    .map((file) => `js/analytics/views/${file}`),
  'css/progress.css',
];

/** Strip comments: a doc comment may legitimately DISCUSS the absence of gating. */
function code(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

test('no Progress source contains a gating or monetisation term', () => {
  const offenders = [];
  for (const rel of progressSources) {
    const body = code(readFileSync(path.join(ROOT, rel), 'utf8'));
    for (const line of body.split('\n')) {
      if (FORBIDDEN.test(line)) offenders.push(`${rel}: ${line.trim()}`);
    }
  }
  assert.deepEqual(offenders, [], `Progress must never gate anything:\n${offenders.join('\n')}`);
});

test('the range resolver exposes no cap', async () => {
  const mod = await import('../js/analytics/ranges.js');
  for (const name of Object.keys(mod)) {
    assert.equal(/cap|limit|tier|entitle/i.test(name), false, `ranges.js exports a cap-like name: ${name}`);
  }
  // Every preset must be resolvable for any user — there is no state to check.
  for (const preset of mod.RANGE_PRESETS) {
    assert.ok(mod.resolveRange(preset.id, '2026-11-23'), `${preset.id} must always resolve`);
  }
});

test('the stylesheet defines no locked or blurred chart state', () => {
  const css = readFileSync(path.join(ROOT, 'css/progress.css'), 'utf8');
  assert.equal(/\.pg-[a-z-]*(locked|blurred|gated)/i.test(css), false);
  assert.equal(/filter:\s*blur/i.test(css), false, 'a blurred chart is a paywall pattern');
});
