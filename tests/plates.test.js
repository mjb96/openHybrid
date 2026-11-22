// ==========================================
// PLATE MATH TEST (tests/plates.test.js)
// C4b — per-side plate breakdown. Run with `node --test`.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LB_PLATES, computePlateBreakdown, formatPlates, nearestBuildableTotal, plateHint,
  platePairs, plateShortfallTotal,
} from '../js/workout/plates.js';
import { applyPlateHint } from '../js/workout/plate-hint-dom.js';
import { buildExerciseCard } from '../js/templates.js';

test('breaks a standard kg load into plates per side', () => {
  // 100kg on a 20kg bar → 40 per side → 25 + 15
  const bd = computePlateBreakdown(100, 20);
  assert.equal(bd.exact, true);
  assert.deepEqual(bd.perSide, [{ plate: 25, count: 1 }, { plate: 15, count: 1 }]);
  assert.equal(formatPlates(bd), '25 + 15');
});

test('handles a 2.5kg-increment load', () => {
  // 65kg → 22.5 per side → 20 + 2.5
  assert.equal(plateHint(65, 'kg'), '20 + 2.5 / side');
});

test('bar-only and below-bar are stated, not mis-plated', () => {
  assert.equal(computePlateBreakdown(20, 20).barOnly, true);
  assert.equal(formatPlates(computePlateBreakdown(20, 20)), 'bar only');
  assert.equal(plateHint(15, 'kg'), ''); // below the bar → no hint
});

test('flags a load the standard plates cannot hit exactly', () => {
  // 21kg → 0.5 per side, no plate that small → not exact, leftover reported
  const bd = computePlateBreakdown(21, 20);
  assert.equal(bd.exact, false);
  assert.ok(bd.leftover > 0);
});

test('lb bar and plates', () => {
  // 135lb on a 45lb bar → 45 per side → one 45
  assert.equal(plateHint(135, 'lb'), '45 / side');
  // Settings stores the unit as 'lbs'; it must not fall back to kg plates.
  assert.equal(plateHint(135, 'lbs'), '45 / side');
});

test('a profile can use its own bar and plate denominations', () => {
  // 100kg on a 15kg bar → 42.5 per side → 20 + 20 + 2.5
  assert.equal(
    plateHint(100, 'kg', { bar: 15, plates: [20, 10, 5, 2.5] }),
    '20 + 20 + 2.5 / side',
  );
  // A home set without 25s cannot pretend a 25 is available.
  assert.equal(
    plateHint(120, 'kg', { bar: 20, plates: [20, 10, 5] }),
    '20 + 20 + 10 / side',
  );
});

test('owned plate counts limit the breakdown instead of inventing plates', () => {
  // 110kg on a 20kg bar → 45 per side. One 25 and no 20s leaves 20 short.
  const bd = computePlateBreakdown(110, 20, [25, 20], { 25: 1, 20: 0 });
  assert.equal(bd.exact, false);
  assert.equal(bd.limited, true);
  assert.equal(bd.leftover, 20);
  assert.deepEqual(bd.perSide, [{ plate: 25, count: 1 }]);
  assert.match(plateHint(110, 'kg', { bar: 20, plates: [25, 20], counts: { 25: 1, 20: 0 } }), /20 short/);
});

test('reports a shortfall for BOTH sides, not just one end', () => {
  // 110 kg, one 25 and no 20s: per side 45 is capped at 25, so 20 is missing
  // per side and 40 kg in total. The nearest buildable total is 70 (one 25 a
  // side on the 20 kg bar), not 90 or 110.
  const bd = computePlateBreakdown(110, 20, [25, 20], { 25: 1, 20: 0 });
  assert.equal(bd.leftover, 20);
  assert.equal(plateShortfallTotal(bd), 40);
  assert.equal(nearestBuildableTotal(110, bd), 70);
});

test('nearest buildable snaps a non-exact target down and leaves exact ones alone', () => {
  const bd = computePlateBreakdown(101, 20); // 40.5 per side → 25 + 15, 0.5 short
  assert.equal(bd.exact, false);
  assert.equal(plateShortfallTotal(bd), 1);
  assert.equal(nearestBuildableTotal(101, bd), 100);

  const exact = computePlateBreakdown(100, 20);
  assert.equal(plateShortfallTotal(exact), 0);
  assert.equal(nearestBuildableTotal(100, exact), null);
  assert.equal(nearestBuildableTotal('nonsense', bd), null);
});

test('pairs count every plate on both ends of the bar', () => {
  assert.deepEqual(platePairs(computePlateBreakdown(62.5, 20)), [
    { plate: 20, count: 2 }, { plate: 1.25, count: 2 },
  ]);
  assert.deepEqual(platePairs(computePlateBreakdown(100, 20)), [
    { plate: 25, count: 2 }, { plate: 15, count: 2 },
  ]);
  assert.deepEqual(platePairs(computePlateBreakdown(20, 20)), []);
  assert.deepEqual(platePairs(null), []);
});

test('a below-bar load has no shortfall and no nearest total', () => {
  const bd = computePlateBreakdown(15, 20);
  assert.equal(bd.belowBar, true);
  assert.equal(plateShortfallTotal(bd), 0);
  assert.equal(nearestBuildableTotal(15, bd), null);
  assert.deepEqual(platePairs(bd), []);
});

test('lb targets use the lb bar and plates', () => {
  const exact = computePlateBreakdown(135, 45, LB_PLATES);
  assert.deepEqual(exact.perSide, [{ plate: 45, count: 1 }]);
  assert.deepEqual(platePairs(exact), [{ plate: 45, count: 2 }]);
  assert.equal(plateShortfallTotal(exact), 0);

  const short = computePlateBreakdown(137, 45, LB_PLATES); // 46 per side
  assert.equal(plateShortfallTotal(short), 2);
  assert.equal(nearestBuildableTotal(137, short), 135);
});

test('blank or absent counts keep the historical unlimited behaviour', () => {
  const unlimited = computePlateBreakdown(100, 20, [25, 15, 10, 5], {});
  assert.equal(unlimited.exact, true);
  assert.equal(unlimited.limited, false);
  assert.equal(computePlateBreakdown(100, 20, [25, 15, 10, 5], null).exact, true);
});

test('the coach target provides an empty, hidden plate-hint placeholder', () => {
  const html = buildExerciseCard({
    displaySafeName: 'Back Squat', safeLiftName: 'Back Squat', isCompleted: false,
    diagnostic: { progression: { weight: 100, reps: 5, rationale: 'Add load.' } },
    blueprintLabel: '3 × 5', historicalLineText: 'Last: 95 × 5', setsMarkup: '',
  });
  assert.match(html, /data-plate-hint/);
  assert.match(html, /hidden/);
  assert.doesNotMatch(html, /20 \+ 20 \/ side/);
});

test('plate hint text is applied as text, never parsed as HTML', () => {
  const node = { textContent: '', hidden: true };
  const root = { querySelector: (selector) => (selector === '[data-plate-hint]' ? node : null) };
  const malicious = '<img src=x onerror=alert(1)> / side';
  assert.equal(applyPlateHint(root, malicious), true);
  assert.equal(node.textContent, malicious);
  assert.equal(node.hidden, false);
  assert.equal(applyPlateHint({ querySelector: () => null }, '20 / side'), false);
  assert.equal(applyPlateHint(null, '20 / side'), false);
});

test('per-side plate breakdown is not rendered in the workout logger', () => {
  const html = buildExerciseCard({
    displaySafeName: 'Bench Press',
    safeLiftName: 'Bench Press',
    isCompleted: false,
    diagnostic: { progression: { weight: 72.5, reps: 5 }, isStalled: false },
    blueprintLabel: '3 × 5',
    historicalLineText: 'Last: 70 × 5',
    setsMarkup: '',
    plates: '25 + 1.25 / side',
  });
  assert.doesNotMatch(html, /per side|\/ side|cct-plates|🍩/i);
  assert.match(html, /Suggested next · this program run/);
  assert.match(html, /<b>72\.5kg × 5 reps<\/b>/);
});

test('logger uses a neutral progress check instead of branding a plateau', () => {
  const html = buildExerciseCard({
    displaySafeName: 'Bench Press', safeLiftName: 'Bench Press', isCompleted: false,
    diagnostic: { progression: { weight: 80, reps: 5 }, isStalled: true },
    blueprintLabel: 'Hold 80kg', historicalLineText: 'Previous session', setsMarkup: '',
  });
  assert.match(html, /PROGRESS CHECK/);
  assert.doesNotMatch(html, /PLATEAU|plateauing/i);
});
