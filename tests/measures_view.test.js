// =============================================================================
// MEASURES SCREEN
//
// The date-level record behind the Body band: entries newest first, a photo
// strip, a library mode, and units that come from the athlete's settings. Every
// field is optional, so the screen must also be honest about a photo-only row.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMeasuresModel } from '../js/metrics/measures.js';
import { measuresHTML } from '../js/analytics/views/view-measures.js';
import { buildMeasurementExplorer } from '../js/analytics/measurement-explorer.js';

function photo(date) {
  return {
    id: `photo:${date}`, date, note: '', width: 1200, height: 900,
    bytes: 120000, updatedAt: 1700000000000,
  };
}

function model(overrides = {}) {
  return buildMeasuresModel({
    settings: { weightUnit: 'kg', measurementUnit: 'cm' },
    bodyWeightLog: [
      { date: '2026-11-01', weight: 80.2 },
      { date: '2026-11-20', weight: 78.4 },
    ],
    bodyMeasurements: [
      { date: '2026-11-01', waist: 84, chest: 104, arm_l: 38 },
      { date: '2026-11-20', waist: 82, chest: 104, bodyFat: 18.5, thigh_l: 58, arm_l: 37 },
    ],
    progressPhotos: [photo('2026-11-18')],
    ...overrides,
  });
}

function explorer(overrides = {}, options = {}) {
  return buildMeasurementExplorer({
    settings: { weightUnit: 'kg', measurementUnit: 'cm' },
    bodyMeasurements: [
      { date: '2026-09-01', waist: 86, chest: 106 },
      { date: '2026-10-01', waist: 84, chest: 105, bodyFat: 20.1 },
      { date: '2026-11-20', waist: 82, chest: 104, bodyFat: 18.5 },
    ],
    ...overrides,
  }, { todayISO: '2026-11-24', ...options });
}

test('the list leads with the header actions and renders one row per entry', () => {
  const html = measuresHTML(model());

  // Header: a + for a new entry and See All because there are photos.
  assert.match(html, /data-action="open-ms-sheet"[^>]*aria-label="Add a new entry"/);
  assert.match(html, /data-measures-mode="library"[^>]*>See All</);

  // Entries newest first: 20 Nov, 18 Nov (photo only), 1 Nov.
  const dates = [...html.matchAll(/class="ms-entry__date">([^<]+)</g)].map((match) => match[1]);
  assert.deepEqual(dates, ['20 Nov 2026', '18 Nov 2026', '1 Nov 2026']);

  // Values and the tape summary, in centimetres for a metric profile. Sites
  // keep the canonical catalogue order (chest before waist), as everywhere else.
  assert.match(html, /78\.4 kg/);
  assert.match(html, /18\.5%<\/b><span> body fat/);
  assert.match(html, /Chest 104 cm · Waist 82 cm · Arm L 37 cm · \+1 more/);
  assert.match(html, /Photo only/);

  // A photo tile opens the shared viewer; the entry row opens the sheet.
  assert.match(html, /data-photo-view="2026-11-18"/);
  assert.match(html, /data-action="open-ms-sheet" data-date="2026-11-20"/);
  assert.match(html, /data-measure-delete="2026-11-20"/);
});

test('the photo strip appears at the top of Measures with a dated tile', () => {
  const html = measuresHTML(model());
  const stripAt = html.indexOf('class="pg-photos-block');
  const rowsAt = html.indexOf('class="ms-entries"');
  assert.ok(stripAt > 0 && stripAt < rowsAt, 'photos lead the entry list');
  assert.match(html, /aria-label="Progress photos"/);
  assert.match(html, /data-photo-thumb="photo:2026-11-18"/);
  assert.match(html, /18 Nov/);
});

test('See All opens the photo library, and Entries returns', () => {
  const library = measuresHTML(model(), { mode: 'library' });
  assert.match(library, /class="ms-library"/);
  assert.match(library, /data-photo-view="2026-11-18"/);
  assert.match(library, /class="ms-library__date">18 Nov 2026</);
  assert.match(library, /data-measures-mode="list"[^>]*>Entries</);
  assert.doesNotMatch(library, /class="ms-entries"/);
});

test('an empty profile offers one honest action and no dead See All', () => {
  const html = measuresHTML(buildMeasuresModel({ settings: {}, bodyWeightLog: [], bodyMeasurements: [], progressPhotos: [] }));
  assert.match(html, /pg-state--empty/);
  assert.match(html, /data-action="open-ms-sheet"/);
  assert.doesNotMatch(html, /See All/);
  assert.doesNotMatch(html, /data-measures-mode="library"/);
});

test('an empty photo library is stated, never rendered as an empty grid', () => {
  const html = measuresHTML(buildMeasuresModel({
    settings: {},
    bodyWeightLog: [{ date: '2026-11-20', weight: 78.4 }],
  }), { mode: 'library' });
  assert.match(html, /No progress photos yet/);
  assert.doesNotMatch(html, /class="ms-library"/);
  // Back to Entries is always available in library mode.
  assert.match(html, /data-measures-mode="list"[^>]*>Entries</);
});

test('units come from state, never from a literal in the view', () => {
  const imperial = buildMeasuresModel({
    settings: { weightUnit: 'lbs', measurementUnit: 'in' },
    // 172.8 lb in canonical kilograms (ST6).
    bodyWeightLog: [{ date: '2026-11-20', weight: 78.38 }],
    bodyMeasurements: [{ date: '2026-11-20', waist: 82, bodyFat: 18.5 }],
  });
  assert.equal(imperial.weightUnit, 'lb');
  assert.equal(imperial.measurementUnit, 'in');
  const html = measuresHTML(imperial);
  assert.match(html, /172\.8 lb/);
  assert.match(html, /Waist 32\.3 in/);
  // Precise: the imperial render must contain neither a metric suffix nor a
  // doubled one ("lbs"/"cm").
  assert.doesNotMatch(html, /172\.8 kg/);
  assert.doesNotMatch(html, /82 cm/);
  assert.doesNotMatch(html, /32\.3 cm/);
});

test('the explorer renders one site, its range and the shared chart', () => {
  const html = measuresHTML(model(), { explorer: explorer() });
  assert.match(html, /class="ms-trend"/);
  assert.match(html, /class="ms-trend__value">82\.0</);
  assert.match(html, /-2\.0 cm since 1 Oct 2026/);
  assert.match(html, /data-ms-site/);
  assert.match(html, /<option value="waist" selected>Waist<\/option>/);
  assert.match(html, /data-ms-range="all" aria-pressed="true"/);
  assert.match(html, /class="bw-ms-trend ms-trend__chart"><svg/);
  assert.match(html, /Show data/);
  assert.match(html, /1 Oct 2026/);
});

test('the explorer can chart body fat on its own percentage scale', () => {
  const html = measuresHTML(model(), { explorer: explorer({}, { siteKey: 'bodyFat' }) });
  assert.match(html, /class="ms-trend__value">18\.5%/);
  assert.match(html, /-1\.6 pp since 1 Oct 2026/);
  assert.match(html, /Body fat trend \(%\)/);
  assert.doesNotMatch(html, /Body fat \(cm\)/);
});

test('a range with no readings offers Show all instead of a chart', () => {
  const noRecent = explorer({
    bodyMeasurements: [{ date: '2026-08-01', waist: 88 }, { date: '2026-09-01', waist: 86 }],
  }, { rangeId: '30d' });
  const html = measuresHTML(model(), { explorer: noRecent });
  assert.match(html, /No Waist readings in this range\./);
  assert.match(html, /data-ms-range="all">Show all/);
  // The header's gear is an icon; the claim is that no CHART is drawn.
  assert.doesNotMatch(html, /class="ms-trend__chart"/);
  assert.doesNotMatch(html, /site-trend|wrev-spark|bw-ms-trend svg/);
});

test('the photo library keeps its own mode and does not grow a trend block', () => {
  const html = measuresHTML(model(), { mode: 'library', explorer: explorer() });
  assert.doesNotMatch(html, /class="ms-trend"/);
  assert.match(html, /class="ms-library"/);
});

test('loading and error are explicit states', () => {
  assert.match(measuresHTML(null), /aria-busy="true"/);
  assert.match(measuresHTML(null, { error: 'boom' }), /role="alert"/);
});

test('every interactive control is a button with an accessible name', () => {
  const html = measuresHTML(model());
  // No bare clickable divs/spans: the tile, row, delete, +, See All and Add
  // picture are all buttons, and each either names itself with aria-label or has
  // visible text.
  const buttons = [...html.matchAll(/<button\b([^>]*)>([^]*?)<\/button>/g)];
  assert.ok(buttons.length >= 6);
  for (const [, attrs, content] of buttons) {
    assert.match(attrs, /type="button"/);
    const visible = content.replace(/<[^>]+>/g, '').trim();
    assert.ok(/aria-label="[^"]+"/.test(attrs) || visible.length > 0, `button without a name: ${attrs}`);
  }
  // The previous version only walked <button> elements, so replacing one with a
  // clickable <a>/<span> would have passed. No handler may sit on a non-button.
  assert.doesNotMatch(html, /<(a|span|div|li|p)\b[^>]*\bdata-(action|photo-view|measure-delete|measures-mode)\b/);
});
