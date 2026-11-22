// =============================================================================
// THRESHOLD PACE PARSING
//
// The Settings/analytics field must never turn a typo into a four-second pace.
// `4.30` is a dot where a colon belongs; empty and out-of-range values are not
// running thresholds either. The parser returns null so callers can leave the
// stored value untouched, and the browser check proves the UI path end to end.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseThresholdPace } from '../js/analytics/utils.js';

test('mm:ss parses to seconds, including single-digit seconds and leading zeros', () => {
  assert.equal(parseThresholdPace('4:30'), 270);
  assert.equal(parseThresholdPace('04:30'), 270);
  assert.equal(parseThresholdPace('5:00'), 300);
  assert.equal(parseThresholdPace('4:5'), 245);
  assert.equal(parseThresholdPace(' 4:30 '), 270, 'surrounding whitespace is harmless');
});

test('a legacy bare integer is read as seconds', () => {
  assert.equal(parseThresholdPace('270'), 270);
  assert.equal(parseThresholdPace(270), 270);
  assert.equal(parseThresholdPace('60'), 60);
  assert.equal(parseThresholdPace('3600'), 3600);
});

test('the accepted range is a plausible running pace', () => {
  assert.equal(parseThresholdPace('1:00'), 60, 'one minute is the floor');
  assert.equal(parseThresholdPace('60:00'), 3600, 'one hour is the ceiling');
  assert.equal(parseThresholdPace('0:59'), null, 'below one minute is not a threshold');
  assert.equal(parseThresholdPace('60:01'), null, 'above one hour is not a threshold');
  assert.equal(parseThresholdPace('0'), null);
  assert.equal(parseThresholdPace('59'), null);
  assert.equal(parseThresholdPace('3601'), null);
});

test('empty and malformed input is rejected instead of becoming zero', () => {
  for (const value of ['', '   ', null, undefined, 'abc', '4.30', '4,30', '4:60', '3:4:5', '-1', '4:-5', '3:000', '0004:30']) {
    assert.equal(parseThresholdPace(value), null, `expected ${JSON.stringify(value)} to be rejected`);
  }
});
