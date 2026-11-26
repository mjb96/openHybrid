// @ts-check
// =============================================================================
// PROGRESS HUB VIEW (analytics/views/view-progress-hub.js) — roadmap §16
//
// The landing is the band list plus three permanent header destinations:
// History, "How this page is calculated" and Customize. There is no trailing
// "More detail" section and no footer list: every destination has exactly one
// home inside the band whose question it answers, in the Reviews row, or in the
// header.
//
// Presentation only — every number comes from the composer and the band models.
// =============================================================================

import { esc } from './screen-kit.js';
import { icon } from '../../ui/icons.js';
import { renderPulse } from './view-pulse.js';
import { renderBalance } from './view-balance.js';
import { renderMuscles } from './view-muscles.js';
import { renderExercises } from './view-exercises.js';
import { renderEndurance } from './view-endurance.js';
import { hydratePhotoThumbs, renderBody } from './view-body.js';
import { renderFastingBand } from './view-fasting-band.js';
import { renderReviews } from './view-reviews.js';
import { focusBar, rangeBar } from './band-kit.js';
import { RANGE_PRESETS } from '../ranges.js';

const BAND_VIEWS = Object.freeze({
  pulse: renderPulse, balance: renderBalance, muscles: renderMuscles, exercises: renderExercises,
  endurance: renderEndurance, body: renderBody, fasting: renderFastingBand, reviews: renderReviews,
});

/**
 * Render the bands the composer produced, in its order. A band with an error
 * renders that error through its own view, so one broken model cannot blank
 * the tab.
 *
 * @param {{ bands?: Array<{ id: string, model?: any, error?: string }>, hidden?: string[], selectedMuscle?: string, weightUnit?: string, distanceUnit?: string }} extras
 */
function bandsHTML(extras) {
  const list = Array.isArray(extras.bands) ? extras.bands : [];
  return list.map((entry) => {
    const view = BAND_VIEWS[entry.id];
    if (!view) return '';
    return view(entry.error ? null : entry.model, {
      weightUnit: extras.weightUnit,
      distanceUnit: extras.distanceUnit,
      error: entry.error || null,
      hidden: Array.isArray(extras.hidden) ? extras.hidden : [],
      selected: extras.selectedMuscle,
    });
  }).join('');
}

/** The modality filter, derived from what is actually visible and measured. */
function focusHTML(extras) {
  const available = extras.focusAvailable;
  if (!available?.strength || !available?.endurance) return '';
  return focusBar([
    { id: 'all', label: 'All' },
    { id: 'strength', label: 'Strength' },
    { id: 'endurance', label: 'Endurance' },
  ], extras.focus || 'all');
}

/** The two header icons are destinations, not decoration. */
function headerActions(extras) {
  return `<div class="hub-head__actions">
    <button type="button" class="hub-icon-btn" data-action="open-activities"
      aria-label="History" title="History">${icon('history', { size: 20 })}</button>
    <button type="button" class="hub-icon-btn" data-action="open-settings" data-page="once.units"
      aria-label="Units settings" title="Units settings">${icon('gear', { size: 20 })}</button>
    <details class="pg-method">
      <summary class="hub-icon-btn" aria-label="How this page is calculated"
        title="How this page is calculated">${icon('info', { size: 20 })}</summary>
      <div class="pg-method__panel">
        <p>Every band covers the <strong>range you selected</strong> above, attributed by the real date each session was logged — not by your program week counter, so an archived program's sessions still count towards the period they happened in. <strong>Pulse</strong> is the one exception: it is always the current calendar week (as set by your week start), and it ignores the range on purpose.</p>
        <p>A part-finished period is compared only with the same elapsed days of the previous one, so a Tuesday is never measured against a full seven days. Strength comparisons are same-exercise only. Estimates are labelled as estimates.</p>
      </div>
    </details>
    ${(extras.bands || []).some((entry) => entry && entry.id !== 'reviews' && entry.model?.hasData) ? '<button type="button" class="hub-customize-btn" data-action="share-progress" aria-label="Share a summary of this page">Share</button>' : ''}
    <button type="button" class="hub-customize-btn" data-action="open-customize" data-surface="progress" aria-label="Customize Progress cards">Customize</button>
  </div>`;
}

/**
 * @param {HTMLElement|null} container
 * @param {ReturnType<import('../progress-landing.js').buildProgressLanding>} model
 * @param {string[]} [hidden]
 * @param {{
 *   bands?: Array<{ id: string, model?: any, error?: string }>,
 *   rangeId?: string,
 *   focus?: string,
 *   focusAvailable?: { strength: boolean, endurance: boolean },
 *   visibleCount?: number,
 *   renderableCount?: number,
 *   hidden?: string[],
 *   weightUnit?: string,
 *   distanceUnit?: string,
 *   selectedMuscle?: string,
 * }} [extras]
 */
export function renderProgressHub(container, model, hidden = [], extras = {}) {
  if (!container || !model) return;
  const bands = bandsHTML(extras);
  const visibleCount = Number.isFinite(Number(extras.visibleCount))
    ? Number(extras.visibleCount)
    : Number(extras.bands?.length || 0);

  const intro = model.allEmpty
    ? `<div class="ph-empty">
        <p>Nothing is logged yet. Finish a workout or a run and this page starts explaining what changed, and why.</p>
        <button type="button" class="ph-empty__cta" data-action="switch-tab" data-target="workout">Start a workout</button>
      </div>`
    : '';

  container.innerHTML = `
    <div class="hub-head">
      <div>
        <h2 class="hub-title">Progress</h2>
        <p class="hub-sub">What changed, and why.</p>
      </div>
      ${headerActions(extras)}
    </div>
    <div class="pg-controls">
      ${rangeBar(RANGE_PRESETS, extras.rangeId || '30d')}
      ${focusHTML(extras)}
    </div>
    ${intro}
    ${visibleCount === 0
      ? `<div class="ph-empty">
          <p>All Progress sections are hidden. Your data is still here — open Customize to bring one back.</p>
          <button type="button" class="ph-empty__cta" data-action="open-customize" data-surface="progress">Customize</button>
        </div>`
      : (Number(extras.renderableCount) === 0
        ? `<div class="ph-empty">
            <p>Nothing to show for this range yet. Widen the range, switch a module on, or log a session.</p>
            <button type="button" class="ph-empty__cta" data-action="open-customize" data-surface="progress">Customize</button>
          </div>`
        : bands)}`;

  // Thumbnails read a blob, which is async; the band must not wait on the disk.
  hydratePhotoThumbs(container);
}
