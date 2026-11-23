// @ts-check
// =============================================================================
// PROGRESS HUB VIEW (analytics/views/view-progress-hub.js) — roadmap Phase 3A
//
// Renders the Progress landing model as four domain cards, each answering the
// roadmap's ordered questions on the surface itself: what the headline is, how
// it compares, what it means, and where the evidence lives. Secondary
// destinations keep their entry points but lose equal visual weight.
//
// Presentation only — every number comes from buildProgressLanding.
// =============================================================================

import { esc, spark } from './screen-kit.js';
import { renderPulse } from './view-pulse.js';
import { renderBalance } from './view-balance.js';
import { renderMuscles } from './view-muscles.js';
import { renderExercises } from './view-exercises.js';
import { renderEndurance } from './view-endurance.js';
import { hydratePhotoThumbs, renderBody } from './view-body.js';
import { renderFastingBand } from './view-fasting-band.js';
import { renderReports } from './view-reports.js';
import { focusBar, rangeBar } from './band-kit.js';
import { RANGE_PRESETS } from '../ranges.js';

const BAND_VIEWS = Object.freeze({
  pulse: renderPulse, balance: renderBalance, muscles: renderMuscles, exercises: renderExercises,
  endurance: renderEndurance, body: renderBody, fasting: renderFastingBand, reports: renderReports,
});

/**
 * Render the bands the composer produced, in its order. A band with an error
 * renders that error through its own view, so one broken model cannot blank
 * the tab.
 */
function bandsHTML(extras) {
  const list = Array.isArray(extras.bands) ? extras.bands : null;
  if (list) {
    return list.map((entry) => {
      const view = BAND_VIEWS[entry.id];
      if (!view) return '';
      return view(entry.error ? null : entry.model, {
        weightUnit: extras.weightUnit,
        distanceUnit: extras.distanceUnit,
        error: entry.error || null,
        hidden: Array.isArray(extras.hidden) ? extras.hidden : [],
      });
    }).join('');
  }
  // Transitional: a caller that only supplies a Pulse model (or none) keeps the
  // legacy hero rather than losing the top of the page.
  if (extras.pulse) {
    return renderPulse(extras.pulse, {
      weightUnit: extras.weightUnit,
      distanceUnit: extras.distanceUnit,
      error: extras.pulseError || null,
    });
  }
  return '';
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
import { icon } from '../../ui/icons.js';
import { formatDist } from '../utils.js';
import { addDaysISO } from '../weekly-aggregate.js';
import { formatWeekRange } from '../../dates.js';

const DOMAIN_ICON = {
  consistency: 'calendar',
  strength: 'dumbbell',
  running: 'activity',
  recovery: 'heart',
};

// Semantic, and deliberately restrained: a down week is information, not danger.
// Red stays reserved for destructive actions and genuine warnings (roadmap §6).
const TONE_COLOR = {
  up: 'var(--color-green, #10b981)',
  down: 'var(--color-amber, #f59e0b)',
  flat: 'var(--text-muted)',
  none: 'var(--text-muted)',
};

const TONE_GLYPH = { up: '↑', down: '↓', flat: '→', none: '' };

function domainCard(domain) {
  const { headline, delta, support, interpretation } = domain;
  const tone = delta?.tone || 'none';
  const glyph = TONE_GLYPH[tone] || '';

  const deltaHTML = delta
    ? `<p class="ph-card__delta" style="color:${TONE_COLOR[tone]}">${glyph ? `<span aria-hidden="true">${glyph}</span> ` : ''}${esc(delta.text)}</p>`
    : '';

  const supportHTML = support ? `<p class="ph-card__support">${esc(support)}</p>` : '';

  // spark() returns '' with fewer than two real points, so a sparse domain
  // shows no line rather than a misleading flat one. The label is what makes
  // the shape readable — a line with no stated period explains nothing.
  const sparkSVG = domain.trend ? spark(domain.trend.values, TONE_COLOR[tone] === TONE_COLOR.none ? 'var(--color-blue, #3b82f6)' : TONE_COLOR[tone]) : '';
  const trendHTML = sparkSVG
    ? `<span class="ph-card__trend">${sparkSVG}<small>${esc(domain.trend.label)}</small></span>`
    : '';

  return `<button type="button" class="ph-card${domain.empty ? ' ph-card--empty' : ''}"
      data-action="open-analytics" data-context="${esc(domain.context)}" data-parent-context="hub"
      aria-label="${esc(domain.title)}: ${esc(headline.value)}${headline.unit ? ` ${esc(headline.unit)}` : ''}. ${esc(interpretation)}">
    <span class="ph-card__head">
      <span class="ph-card__icon">${icon(DOMAIN_ICON[domain.id] || 'gauge', { size: 18 })}</span>
      <span class="ph-card__title">${esc(domain.title)}</span>
      <span class="ph-card__arrow" aria-hidden="true">→</span>
    </span>
    <span class="ph-card__value">${esc(headline.value)}${headline.unit ? `<span class="ph-card__unit">${esc(headline.unit)}</span>` : ''}</span>
    ${deltaHTML}
    ${trendHTML}
    ${supportHTML}
    <p class="ph-card__say">${esc(interpretation)}</p>
  </button>`;
}

function secondaryRow(entry) {
  return `<button type="button" class="hub-link hub-link--quiet"
      data-action="open-analytics" data-context="${esc(entry.id)}" data-parent-context="hub">
    <span class="hub-link__label">
      <span class="hub-link__title">${esc(entry.title)}</span>
      <span class="hub-link__desc">${esc(entry.desc)}</span>
    </span>
    <span class="hub-link__arrow" aria-hidden="true">→</span>
  </button>`;
}

/**
 * @param {HTMLElement|null} container
 * @param {ReturnType<import('../progress-landing.js').buildProgressLanding>} model
 */
const SECONDARY_CARD_ID = {
  bodyweight: 'bodyweight',
  'muscle-load': 'muscleLoad',
  projections: 'projections',
};

function weekHero(model) {
  const week = model.weekSummary;
  if (!week) return '';
  const unit = model.units?.weight || 'kg';
  const distUnit = model.units?.distance || 'km';
  // The eyebrow and accessible name are the real Monday–Sunday range, the same
  // span the navigator above prints. The relative period ("2 weeks ago") stays
  // in the navigator: an aria-label reading "2 weeks ago overview" did not say
  // which two weeks, and the visible eyebrow already disagreed with it.
  const range = model.weekRangeLabel || model.periodLabel;
  const sessions = week.planned ? `${week.sessions} / ${week.planned}` : String(week.sessions);
  const head = `<div class="ph-week__head">
      <div>
        <span class="ph-week__eyebrow">${esc(range)}</span>
        <h2 class="ph-week__title">${week.hasData ? `${sessions} session${week.sessions === 1 ? '' : 's'}` : '0 sessions'}</h2>
      </div>
      <button type="button" class="ph-week__link" data-action="open-activities">History →</button>
    </div>`;

  // An untrained selection used to drop the whole section, so stepping back to a
  // rest week made the page silently lose its week surface. Say it plainly.
  if (!week.hasData) {
    return `<section class="ph-week ph-week--empty" aria-label="${esc(`${range} overview`)}">
      ${head}
      <p class="ph-week__empty text-muted text-sm">No training logged ${model.isCurrentWeek ? 'this week yet' : 'in that week'}. Use the week arrows above to find a trained week.</p>
    </section>`;
  }

  const adherence = week.adherencePct == null
    ? ''
    : `<div class="ph-week__adherence"><span style="width:${week.adherencePct}%"></span></div>
       <p class="ph-week__adherence-label">${week.adherencePct}% of planned sessions</p>`;
  return `<section class="ph-week" aria-label="${esc(`${range} overview`)}">
    ${head}
    <div class="ph-week__stats">
      <div><b>${week.volumeKg.toLocaleString('en-AU')} ${esc(unit)}</b><span>Volume</span></div>
      <div><b>${esc(formatDist(week.distanceKm, distUnit, 1))}</b><span>Distance</span></div>
      <div><b>${week.prCount}</b><span>e1RM PR${week.prCount === 1 ? '' : 's'}</span></div>
    </div>
    ${adherence}
  </section>`;
}

function recentWeeksStrip(model) {
  const weeks = Array.isArray(model.recentWeeks) ? model.recentWeeks : [];
  const total = weeks.reduce((sum, week) => sum + (week.sessions || 0), 0);
  if (total === 0) return '';
  // The label says "Sessions", so the bar height must encode sessions. It used
  // to encode volume, which painted a running-only week as an empty dash even
  // though it had training in it.
  const max = Math.max(1, ...weeks.map((week) => week.sessions || 0));
  const busiest = Math.max(0, ...weeks.map((week) => week.sessions || 0));
  const period = String(model.periodLabel || 'the selected week').toLowerCase();
  // The window ends on whatever week the navigator selected, so the heading has
  // to move with it — "last 12 weeks" was a claim about today, not this window.
  const windowLabel = `${weeks.length} weeks ending ${period}`;
  const summary = `${total} session${total === 1 ? '' : 's'} in the ${windowLabel}; busiest week ${busiest}.`;
  return `<section class="ph-weeks" aria-label="${esc(`Sessions per calendar week over the ${windowLabel}`)}">
    <div class="ph-weeks__head"><span>${esc(windowLabel)}</span><span>Sessions</span></div>
    <p class="sr-only">${esc(summary)}</p>
    <div class="ph-weeks__bars">
      ${weeks.map((week) => {
        const height = week.sessions > 0 ? Math.max(12, Math.round((week.sessions / max) * 100)) : 4;
        return `<span class="ph-weeks__bar${week.sessions > 0 ? ' is-trained' : ''}" style="height:${height}%" aria-hidden="true" title="${esc(formatWeekRange(week.weekStart, addDaysISO(week.weekStart, 6)))}: ${week.sessions} session${week.sessions === 1 ? '' : 's'}"></span>`;
      }).join('')}
    </div>
    <div class="ph-weeks__scale"><span>Oldest</span><span>${esc(model.weekRangeLabel || model.periodLabel)}</span></div>
  </section>`;
}

/**
 * @param {HTMLElement|null} container
 * @param {ReturnType<import('../progress-landing.js').buildProgressLanding>} model
 * @param {string[]} [hidden]
 * @param {{
 *   bands?: Array<{ id: string, model?: any, error?: string }>,
 *   pulse?: any,
 *   pulseError?: string|null,
 *   rangeId?: string,
 *   focus?: string,
 *   focusAvailable?: { strength: boolean, endurance: boolean },
 *   visibleCount?: number,
 *   renderableCount?: number,
 *   showRunning?: boolean,
 *   hidden?: string[],
 *   weightUnit?: string,
 *   distanceUnit?: string,
 * }} [extras]
 */
export function renderProgressHub(container, model, hidden = [], extras = {}) {
  if (!container || !model) return;
  const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
  // The four legacy domain cards are retired: the bands ARE Progress now, and
  // two dashboards on one tab was the duplication this redesign existed to
  // remove. `secondary` survives as the quieter footer destinations.
  const secondary = model.secondary.filter((entry) => !hiddenSet.has(SECONDARY_CARD_ID[entry.id]));
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
      <div class="hub-head__actions">
        ${(extras.bands || []).length ? '<button type="button" class="hub-customize-btn" data-action="share-progress" aria-label="Share a summary of this page">Share</button>' : ''}
        <button type="button" class="hub-customize-btn" data-action="open-customize" data-surface="progress" aria-label="Customize Progress cards">Customize</button>
      </div>
    </div>
    <div class="pg-controls">
      ${rangeBar(RANGE_PRESETS, extras.rangeId || '30d')}
      ${focusHTML(extras)}
    </div>
    ${intro}
    ${visibleCount === 0
      ? `<div class="ph-empty">
          <p>All Progress cards are hidden. Your data is still here — bring a card back to see it.</p>
          <button type="button" class="ph-empty__cta" data-action="open-customize" data-surface="progress">Show a card</button>
        </div>`
      : (Number(extras.renderableCount) === 0
        ? `<div class="ph-empty">
            <p>Nothing to show for this range yet. Widen the range, switch a module on, or log a session.</p>
            <button type="button" class="ph-empty__cta" data-action="open-customize" data-surface="progress">Customize</button>
          </div>`
        : bands)}
    ${secondary.length ? `<h3 class="section-header mt-4">More detail</h3>
    <div class="hub-group">${secondary.map(secondaryRow).join('')}</div>` : ''}
    ${extras.showRunning === false ? '' : `<button type="button" class="hub-link hub-link--quiet" data-action="open-analytics" data-context="running">
      <span class="hub-link__label">
        <span class="hub-link__title">Running</span>
        <span class="hub-link__desc">Pace, heart rate, zones, load and personal bests</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>`}
    <button type="button" class="hub-link hub-link--quiet" data-action="open-analytics" data-context="strength">
      <span class="hub-link__label">
        <span class="hub-link__title">Strength</span>
        <span class="hub-link__desc">Every lift, volume detail and per-exercise progression</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>
    <button type="button" class="hub-link hub-link--quiet" data-action="open-analytics" data-context="weekly-review" data-parent-context="hub" data-preserve-week="true">
      <span class="hub-link__label">
        <span class="hub-link__title">Week in Review</span>
        <span class="hub-link__desc">This week's story, consistency log and training report</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>
    <button type="button" class="hub-link hub-link--quiet" data-action="open-analytics" data-context="measures">
      <span class="hub-link__label">
        <span class="hub-link__title">Measures</span>
        <span class="hub-link__desc">Weight, body fat, tape and progress photos by date</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>
    <button type="button" class="hub-link hub-link--quiet" data-action="open-activities">
      <span class="hub-link__label">
        <span class="hub-link__title">History</span>
        <span class="hub-link__desc">Calendar, workout details, edit and delete</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>
    <details class="an-method mt-3">
      <summary>How this page is calculated</summary>
      <p>Every band covers the <strong>range you selected</strong> above, attributed by the real date each session was logged — not by your program week counter, so an archived program's sessions still count towards the period they happened in. <strong>Pulse</strong> is the one exception: it is always the current calendar week (Monday to Sunday), and it ignores the range on purpose.</p>
      <p>A part-finished period is compared only with the same elapsed days of the previous one, so a Tuesday is never measured against a full seven days. Strength comparisons are same-exercise only. Estimates are labelled as estimates.</p>
    </details>`;

  // Thumbnails read a blob, which is async; the band must not wait on the disk.
  hydratePhotoThumbs(container);
}
