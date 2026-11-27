// @ts-check
// =============================================================================
// BODY HEAT MAP — the visual half of the session muscle model
//
// The geometry lives in body-paths.js (static Apache-2.0 path data). This module
// decides the heat class for every region and renders the front/back pair. The
// text chips beside it are the accessible equivalent; the SVG also carries an
// aria-label naming the hardest-trained muscles.
//
// Attribution lives in NOTICE.md (shipped with the app) and Settings → About →
// Licences. The map deliberately carries no per-card credit line: it appeared
// under every heat map, was hidden on Pulse anyway, and opened GitHub from
// inside the app.
//
// No external image is loaded, so the map works offline and in the Android APK.
// =============================================================================
import { BODY_FRONT_PATHS, BODY_BACK_PATHS } from './body-paths.js';
import { escapeHtml } from '../util.js';

const HEAT_BUCKETS = Object.freeze([
  { min: 0.82, className: 'bm-h4' },
  { min: 0.58, className: 'bm-h3' },
  { min: 0.34, className: 'bm-h2' },
  { min: 0.01, className: 'bm-h1' },
]);

/**
 * @param {number} intensity 0..1
 * @returns {string}
 */
export function bodyHeatClass(intensity) {
  const value = Number(intensity) || 0;
  for (const bucket of HEAT_BUCKETS) {
    if (value >= bucket.min) return bucket.className;
  }
  return 'bm-base';
}

/**
 * @param {ReadonlyArray<{ id: string, path: string }>} defs
 * @param {Record<string, number>} regions
 * @returns {string}
 */
function pathMarkup(defs, regions) {
  return defs.map(({ id, path }) =>
    `<path class="${bodyHeatClass(regions[id] || 0)}" d="${path}"></path>`
  ).join('');
}

/**
 * @param {import('./session-muscles.js').SessionMuscles|null|undefined} muscles
 * @param {{ label?: string }} [options]
 * @returns {string} empty when the session has no mapped working sets
 */
export function muscleHeatmapHTML(muscles, options = {}) {
  if (!muscles?.hasData) return '';
  const top = muscles.top.map((muscle) => muscle.label);
  const label = options.label || 'Muscles worked';
  const spoken = top.length ? `${label}: ${top.join(', ')}` : label;
  return `<div class="session-map" role="group" aria-label="${escapeHtml(spoken)}">
    <div class="session-map__views">
      <div class="session-map__view">
        <span class="session-map__label">Front</span>
        <svg viewBox="0 0 34 95" role="img" aria-label="Front body map. ${escapeHtml(top.join(', '))}">
          ${pathMarkup(BODY_FRONT_PATHS, muscles.regions)}
        </svg>
      </div>
      <div class="session-map__view">
        <span class="session-map__label">Back</span>
        <svg viewBox="35 0 34 95" role="img" aria-label="Back body map. ${escapeHtml(top.join(', '))}">
          ${pathMarkup(BODY_BACK_PATHS, muscles.regions)}
        </svg>
      </div>
    </div>
    <div class="session-map__legend" aria-hidden="true">
      <span><i class="bm-swatch bm-h1"></i>Light</span>
      <span><i class="bm-swatch bm-h2"></i>Moderate</span>
      <span><i class="bm-swatch bm-h3"></i>Heavy</span>
      <span><i class="bm-swatch bm-h4"></i>Primary</span>
    </div>
  </div>`;
}
