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
import { icon } from '../../ui/icons.js';
import { formatDist } from '../utils.js';
import { addDaysISO } from '../weekly-aggregate.js';
import { formatWeekRange } from '../progress-landing.js';

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
  if (!week || !week.hasData) return '';
  const unit = model.units?.weight || 'kg';
  const distUnit = model.units?.distance || 'km';
  const sessions = week.planned ? `${week.sessions} / ${week.planned}` : String(week.sessions);
  const adherence = week.adherencePct == null
    ? ''
    : `<div class="ph-week__adherence"><span style="width:${week.adherencePct}%"></span></div>
       <p class="ph-week__adherence-label">${week.adherencePct}% of planned sessions</p>`;
  return `<section class="ph-week" aria-label="This week">
    <div class="ph-week__head">
      <div>
        <span class="ph-week__eyebrow">${esc(model.periodLabel)}</span>
        <h2 class="ph-week__title">${esc(sessions)} session${week.sessions === 1 ? '' : 's'}</h2>
      </div>
      <button type="button" class="ph-week__link" data-action="open-activities" data-view="calendar">History →</button>
    </div>
    <div class="ph-week__stats">
      <div><b>${week.volumeKg.toLocaleString('en-AU')} ${esc(unit)}</b><span>Volume</span></div>
      <div><b>${esc(formatDist(week.distanceKm, distUnit, 1))}</b><span>Distance</span></div>
      <div><b>${week.prCount}</b><span>PR${week.prCount === 1 ? '' : 's'}</span></div>
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
  return `<section class="ph-weeks" aria-label="Sessions in the last 12 calendar weeks">
    <div class="ph-weeks__head"><span>Last 12 weeks</span><span>Sessions</span></div>
    <div class="ph-weeks__bars">
      ${weeks.map((week) => {
        const height = week.sessions > 0 ? Math.max(12, Math.round((week.sessions / max) * 100)) : 4;
        return `<span class="ph-weeks__bar${week.sessions > 0 ? ' is-trained' : ''}" style="height:${height}%" title="${esc(formatWeekRange(week.weekStart, addDaysISO(week.weekStart, 6)))}: ${week.sessions} session${week.sessions === 1 ? '' : 's'}"></span>`;
      }).join('')}
    </div>
    <div class="ph-weeks__scale"><span>Oldest</span><span>${esc(model.periodLabel)}</span></div>
  </section>`;
}

export function renderProgressHub(container, model, hidden = []) {
  if (!container || !model) return;
  const hiddenSet = new Set(Array.isArray(hidden) ? hidden : []);
  const domains = model.domains.filter((domain) => !hiddenSet.has(domain.id));
  const secondary = model.secondary.filter((entry) => !hiddenSet.has(SECONDARY_CARD_ID[entry.id]));

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
      <button type="button" class="hub-customize-btn" data-action="open-customize" data-surface="progress" aria-label="Customize Progress cards">Customize</button>
    </div>
    ${intro}
    ${model.allEmpty ? '' : weekHero(model)}
    ${recentWeeksStrip(model)}
    ${!domains.length && !secondary.length ? '<p class="ph-empty">All Progress cards are hidden. Use Customize to bring them back.</p>' : ''}
    <div class="ph-grid">${domains.map(domainCard).join('')}</div>
    ${secondary.length ? `<h3 class="section-header mt-4">More detail</h3>
    <div class="hub-group">${secondary.map(secondaryRow).join('')}</div>` : ''}
    <button type="button" class="hub-link hub-link--quiet" data-action="open-activities">
      <span class="hub-link__label">
        <span class="hub-link__title">History</span>
        <span class="hub-link__desc">Calendar, workout details, edit and delete</span>
      </span>
      <span class="hub-link__arrow" aria-hidden="true">→</span>
    </button>
    <details class="an-method mt-3">
      <summary>How this page is calculated</summary>
      <p>Every figure here covers one <strong>calendar</strong> week (Monday to Sunday), attributed by the real date each session was logged — not by your program week counter, so an archived program's sessions still count towards the week they happened in.</p>
      <p>A part-finished week is only ever compared with the same elapsed days of the previous week, so a Tuesday is never measured against a full seven days. Strength comparisons are same-exercise only. Estimates are labelled as estimates.</p>
    </details>`;
}
