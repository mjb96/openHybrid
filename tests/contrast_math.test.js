// =============================================================================
// CONTRAST MATH — Phase 0: prove the auditor before its output is believed.
//
// Every "KNOWN BAD" row below is a colour pair that ships in css/ today and is
// genuinely hard to read in light mode. If the harness cannot see these, its
// silence about the rest of the app means nothing. "KNOWN GOOD" rows are the
// semantic token pairs the theme test already pins, so the maths is not simply
// pessimistic.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseColor, composite, contrastRatio, gradientStops, isLargeText, aaThreshold,
  worstContrast, severityFor, contrastFromPixels, cssColor, hasImageBackdrop,
} from '../scripts/lib/contrast.mjs';

const pair = (fg, bg) => {
  const background = parseColor(bg);
  assert.ok(background, `unparsable background ${bg}`);
  const foreground = parseColor(fg);
  assert.ok(foreground, `unparsable foreground ${fg}`);
  return contrastRatio(composite(foreground, background), background);
};

test('parseColor reads every serialisation Chromium produces', () => {
  assert.deepEqual(parseColor('#fff'), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(parseColor('#0f172a'), { r: 15, g: 23, b: 42, a: 1 });
  assert.deepEqual(parseColor('rgba(0, 0, 0, 0.42)'), { r: 0, g: 0, b: 0, a: 0.42 });
  assert.deepEqual(parseColor('rgb(14 116 144)'), { r: 14, g: 116, b: 144, a: 1 });
  // color-mix() resolves to this form in current Chromium; without it every
  // tinted surface would be reported as unreadable (null backdrop).
  const srgb = parseColor('color(srgb 0.06 0.43 0.5 / 0.12)');
  assert.equal(Math.round(srgb.r * 100), 1530);
  assert.equal(Math.round(srgb.g * 100), 10965);
  assert.equal(Math.round(srgb.b * 100), 12750);
  assert.equal(srgb.a, 0.12);
  assert.deepEqual(parseColor('transparent'), { r: 0, g: 0, b: 0, a: 0 });
  assert.equal(parseColor('not-a-colour'), null);
});

test('composite paints translucent text before it is measured', () => {
  const grey = composite(parseColor('rgba(0,0,0,.42)'), parseColor('#ffffff'));
  assert.equal(Math.round(grey.r), 148);
  // Alpha over a light surface is the whole reason `rgba(0,0,0,.42)` is not black.
  assert.ok(contrastRatio(grey, parseColor('#ffffff')) < 4.5);
});

test('a gradient contributes every stop and the worst one decides', () => {
  const stops = gradientStops('linear-gradient(160deg, rgba(16,27,42,.98), rgba(7,17,31,.98))');
  assert.equal(stops.length, 2);
  const white = parseColor('#ffffff');
  const measured = worstContrast(white, stops);
  assert.equal(measured.ratio, contrastRatio(white, stops[0]));
  assert.ok(measured.ratio < 20);

  const tinted = gradientStops('linear-gradient(in srgb, #ffffff 0%, color-mix(in srgb, var(--accent) 12%, #ffffff) 100%)');
  assert.ok(tinted.length >= 2, 'color-mix stops must survive parsing');
});

test('a bitmap backdrop is refused, not guessed', () => {
  assert.equal(hasImageBackdrop('url("hero.jpg")'), true);
  assert.equal(hasImageBackdrop('linear-gradient(#000, #111)'), false);
  assert.equal(gradientStops('url("x.png")').length, 0);
});

test('large text gets the 3:1 floor, body text 4.5:1', () => {
  assert.equal(isLargeText(24, 400), true);
  assert.equal(isLargeText(18.66, 700), true);
  assert.equal(isLargeText(18, 700), false);
  assert.equal(aaThreshold({ fontSizePx: 13, fontWeight: 600 }), 4.5);
  assert.equal(aaThreshold({ fontSizePx: 28, fontWeight: 400 }), 3);
});

// -----------------------------------------------------------------------------
// The gate. Every row below fails AA **on pure white**, which is the lightest
// possible light-mode surface — if it fails there it fails on every card, chip
// and tint in the theme. That means the claim needs no guess about which
// surface the rule lands on. (Two rows I first listed, `.filter-chip` at
// rgba(0,0,0,.55) and `.profile-pr-trend--down` on a white card, measure
// 4.68–4.70:1 and are NOT defects; measuring the painted backdrop is exactly
// what stops that kind of false report.)
// -----------------------------------------------------------------------------
const KNOWN_BAD = [
  ['css/analytics.css:1401 .metric-mini-box .lbl', 'rgba(0,0,0,.42)', '#ffffff', 4.5],
  ['css/analytics.css:1409 .metric-mini-box .sub', 'rgba(0,0,0,.48)', '#ffffff', 4.5],
  ['css/programs.css:1557 light .search-icon-svg', 'rgba(0,0,0,.30)', '#ffffff', 4.5],
  ['css/programs.css:2053 light .focus-bar-pct', 'rgba(0,0,0,.35)', '#ffffff', 4.5],
  ['css/styles.css:4077 light disabled row text', 'rgba(0,0,0,.28)', '#ffffff', 4.5],
  ['css/styles.css:8622 light muted row text', 'rgba(0,0,0,.28)', '#ffffff', 4.5],
  // `color: #d97706` on the warning-8% tint its own block paints.
  ['css/styles.css:8094 light .fhr-edit-btn', '#d97706', '#f9f1eb', 4.5],
  // `color: #dc2626` on the danger-6% tint its own block paints.
  ['css/programs.css:1595 light .wpm-hyrox-run-text', '#dc2626', '#fbf1f1', 4.5],
  ['css/styles.css:7330 light .profile-pr-trend--up', '#059669', '#ffffff', 4.5],
];

test('the auditor sees all eight known-bad shipped pairs', () => {
  const missed = [];
  for (const [where, fg, bg, min] of KNOWN_BAD) {
    const ratio = pair(fg, bg);
    const severity = severityFor(ratio, min);
    if (!severity) missed.push(`${where}: measured ${ratio.toFixed(2)}:1, not flagged`);
  }
  assert.deepEqual(missed, [], 'the auditor must flag every known-bad row');
});

test('known-good token pairs stay clear, so the auditor is not simply pessimistic', () => {
  const good = [
    ['light text on surface-1', '#0f172a', '#ffffff'],
    ['light text-2 on surface-2', '#475569', '#f4f7fb'],
    ['light accent-text on surface-1', '#155e75', '#ffffff'],
    ['midnight text on surface-1', '#f2f2f2', '#111111'],
    ['midnight text-2 on surface-1', '#b0b0b0', '#111111'],
  ];
  for (const [label, fg, bg] of good) {
    const ratio = pair(fg, bg);
    assert.equal(severityFor(ratio, 4.5), null, `${label} measured ${ratio.toFixed(2)}:1`);
  }
});

test('severity never promotes a gradient estimate to P0 on an estimate alone', () => {
  assert.equal(severityFor(2.6, 4.5, { approximate: true }), 'P1');
  assert.equal(severityFor(2.6, 4.5, { approximate: false }), 'P0');
  assert.equal(severityFor(1.2, 4.5, { approximate: true }), 'P0');
  assert.equal(severityFor(4.9, 4.5), null);
  assert.equal(severityFor(2.8, 3), 'P2');
});

test('pixel sampling measures the real painted backdrop', () => {
  // 10x10 pure-white image: white text on white is 1:1.
  const white = { data: new Uint8ClampedArray(10 * 10 * 4).fill(255), width: 10, height: 10 };
  for (let i = 3; i < white.data.length; i += 4) white.data[i] = 255;
  const measured = contrastFromPixels(white, { x: 0, y: 0, width: 10, height: 10 }, parseColor('#ffffff'));
  assert.ok(measured);
  assert.ok(measured.ratio < 1.1, `white on white measured ${measured.ratio}`);

  // Half black / half white: the darker half must drive the result.
  const mixed = { data: new Uint8ClampedArray(10 * 10 * 4), width: 10, height: 10 };
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) {
      const i = (y * 10 + x) * 4;
      const v = x < 5 ? 0 : 255;
      mixed.data[i] = v; mixed.data[i + 1] = v; mixed.data[i + 2] = v; mixed.data[i + 3] = 255;
    }
  }
  const half = contrastFromPixels(mixed, { x: 0, y: 0, width: 10, height: 10 }, parseColor('#ffffff'));
  assert.ok(half && half.ratio < 1.1, 'white text over the white half must fail');
});

test('cssColor round-trips through parseColor', () => {
  const parsed = parseColor('rgba(14, 116, 144, 0.12)');
  const serialised = cssColor(parsed);
  const reparsed = parseColor(serialised);
  assert.equal(Math.round(reparsed.a * 100), 12);
  assert.equal(Math.round(reparsed.r), 14);
});
