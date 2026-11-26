// =============================================================================
// G4 — the year heatmap presenter: one button per past day, exact numbers
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildYearHeatmap } from '../js/analytics/year-heatmap.js';
import { yearHeatmapHTML } from '../js/analytics/views/view-year-heatmap.js';

const set = { c: true, w: '100', r: '5' };
const week = (date, time) => ({
  dates: { mon: date },
  lifts: { mon: { 'Back Squat': [set] } },
  gymStats: time ? { mon: { time } } : {},
  runs: {},
  runSessions: {},
});
const state = (weeks) => ({ weeks: Object.fromEntries(weeks.map((w, i) => [String(i + 1), w])) });

function model() {
  return buildYearHeatmap(state([
    week('2026-11-04', '45:00'),
    week('2026-11-10', null),
  ]), { endISO: '2026-11-15' });
}

test('the range and the measured total lead the section', () => {
  const html = yearHeatmapHTML(model());
  assert.match(html, /class="pg-year"/);
  assert.match(html, /Dec 2025 – Nov 2026/);
  assert.match(html, /45 m trained · 2 days/);
  assert.match(html, /Shaded by time trained/);
});

test('every past day is a button that opens that date; future days are not', () => {
  const html = yearHeatmapHTML(model());
  assert.match(html, /data-action="open-activities-day"/);
  assert.match(html, /data-date="2026-11-04"/);
  assert.match(html, /data-date="2026-11-15"/);
  assert.doesNotMatch(html, /data-date="2026-11-16"/);
  assert.match(html, /pg-year__cell--future/);
});

test('a shaded day says its measured minutes, a bare day says it was logged', () => {
  const html = yearHeatmapHTML(model());
  assert.match(html, /aria-label="Wednesday 4 November 2026: 45 minutes trained, 1 session"/);
  assert.match(html, /aria-label="Tuesday 10 November 2026: training logged, no time recorded, 1 session"/);
  assert.match(html, /aria-label="Monday 2 November 2026: no training recorded"/);
  assert.match(html, /1 training day logged without a recorded time/);
});

test('the month grid carries real month labels and the athlete\'s week start', () => {
  const html = yearHeatmapHTML(model());
  assert.match(html, /November 2026/);
  assert.match(html, /December 2025/);
  assert.equal((html.match(/class="pg-year__month"/g) || []).length, 12);
  assert.match(html, /<div class="pg-year__dow" aria-hidden="true"><span>M<\/span>/);
});

test('an impossible model renders nothing instead of a half calendar', () => {
  assert.equal(yearHeatmapHTML(null), '');
  assert.equal(yearHeatmapHTML({ months: [] }), '');
});
