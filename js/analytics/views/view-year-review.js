// @ts-check
// =============================================================================
// YEAR IN REVIEW — analytics leaf (js/analytics/views/view-year-review.js)
//
// The seasonal (December/January) calendar-year recap. The data comes from the
// pure builder (js/brain/year-review.js); this file only renders it with the
// athlete's weight/distance units. No chart library, no share action, no route.
// Outside the season the whole section is hidden; inside it, an untrained year
// gets one honest empty state instead of a fabricated recap.
// =============================================================================
import { weightUnitOf } from '../utils.js';
import { buildYearInReview, yearReviewYear } from '../../brain/year-review.js';
import { formatDayMonthShort, todayKey } from '../../dates.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KM_TO_MI = 0.621371;
const KG_TO_LB = 2.2046226218;
const round1 = (n) => Math.round(n * 10) / 10;

/** Strip a trailing ".0" so "15 km" never renders as "15.0 km". */
const number = (n) => String(round1(n));

function formatLifted(volumeKg, unit) {
  if (unit === 'lbs') {
    const lb = volumeKg * KG_TO_LB;
    return `${Math.round(lb).toLocaleString('en-AU')} lb`;
  }
  if (volumeKg >= 1000) return `${(volumeKg / 1000).toFixed(1)} t`;
  return `${Math.round(volumeKg).toLocaleString('en-AU')} ${unit}`;
}

function formatDistance(distanceKm, unit) {
  return unit === 'mi'
    ? `${number(distanceKm * KM_TO_MI)} mi`
    : `${number(distanceKm)} km`;
}

/**
 * Render the Year in Review into `#yearReviewContainer`.
 *
 * @param {any} state
 * @param {string[]} days
 * @param {string} [todayISO] today's local calendar key; defaults to the device
 */
export function renderYearInReview(state, days, todayISO) {
  const el = document.getElementById('yearReviewContainer');
  const heading = document.getElementById('yearReviewHeading');
  if (!el) return;

  const today = todayISO || todayKey();
  const year = yearReviewYear(today);
  if (year == null) {
    // Outside December/January the surface does not exist at all.
    el.hidden = true;
    el.innerHTML = '';
    if (heading) heading.hidden = true;
    return;
  }

  el.hidden = false;
  if (heading) heading.hidden = false;
  const review = buildYearInReview(state, days, { year, today });

  if (!review.hasData) {
    el.innerHTML = `<article class="card-dark p-4 text-center">
      <div style="font-size:2rem;margin-bottom:8px;">📅</div>
      <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.5;margin:0 0 6px;">
        No sessions logged in ${review.year} yet.<br>Your year builds itself as you train.
      </p>
      <p class="an-detail-period" style="margin:0;">${esc(review.rangeLabel)}</p>
    </article>`;
    return;
  }

  const unit = weightUnitOf(state);
  const distUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
  const soFar = review.isPartial ? ' so far' : '';

  const stats = [
    { v: formatLifted(review.totals.volumeKg, unit), k: 'Lifted' },
    { v: formatDistance(review.totals.distanceKm, distUnit), k: 'Run' },
    { v: String(review.totals.workingSets), k: 'Working sets' },
    { v: String(review.totals.prCount), k: 'e1RM PRs' },
  ].map((stat) => `<div class="wrev-stat"><div class="wrev-stat__v">${stat.v}</div><div class="wrev-stat__k">${stat.k}</div></div>`).join('');

  const bestMonth = review.bestMonth;
  const monthCard = bestMonth ? `
    <article class="card-dark p-3">
      <div class="wrev-label">Most trained</div>
      <div class="wrev-stat__v" style="margin-top:4px;">${esc(bestMonth.label)}</div>
      <div class="wrev-stat__k" style="text-transform:none;letter-spacing:0;">${bestMonth.sessions} session${bestMonth.sessions === 1 ? '' : 's'} · ${formatLifted(bestMonth.volumeKg, unit)}</div>
    </article>` : '';

  const streakCard = `
    <article class="card-dark p-3">
      <div class="wrev-label">Longest streak</div>
      <div class="wrev-stat__v" style="margin-top:4px;">${review.totals.longestStreak} day${review.totals.longestStreak === 1 ? '' : 's'}</div>
      <div class="wrev-stat__k" style="text-transform:none;letter-spacing:0;">${review.totals.activeDays} active day${review.totals.activeDays === 1 ? '' : 's'}${soFar}</div>
    </article>`;

  const topHTML = review.topExercises.length ? `
    <h3 class="section-header mt-4">Top exercises</h3>
    ${review.topExercises.map((exercise) => `<article class="card-dark p-3 mb-2 flex-between">
      <span style="font-weight:700;color:var(--text-inverse);min-width:0;">${esc(exercise.name)}</span>
      <span style="color:var(--text-muted);font-size:0.78rem;text-align:right;white-space:nowrap;margin-left:10px;">${exercise.sets} set${exercise.sets === 1 ? '' : 's'} · ${formatLifted(exercise.volumeKg, unit)}</span>
    </article>`).join('')}` : '';

  // The view caps the LIST at five; the builder returns every event so the count
  // and the list can never disagree.
  const shownPrs = review.prs.slice(0, 5);
  const prHTML = shownPrs.length ? `
    <h3 class="section-header mt-4">e1RM PRs</h3>
    ${shownPrs.map((pr) => `<article class="card-dark p-3 mb-2 flex-between">
      <span style="font-weight:700;color:var(--text-inverse);min-width:0;">🏆 ${esc(pr.lift)}</span>
      <span style="color:var(--text-muted);font-size:0.78rem;text-align:right;white-space:nowrap;margin-left:10px;">
        <b style="color:var(--color-amber);">${pr.e1rm} ${unit}</b> · ${esc(formatDayMonthShort(pr.date))}
      </span>
    </article>`).join('')}` : '';

  el.innerHTML = `
    <article class="card-dark an-hero">
      <div class="an-hero__k">Your year${soFar}</div>
      <div class="an-hero__val">${review.year}</div>
      <div class="an-hero__empty">${review.totals.sessions} session${review.totals.sessions === 1 ? '' : 's'} · ${esc(review.rangeLabel)}</div>
    </article>
    <div class="wrev-stats mb-3">${stats}</div>
    <div class="grid-2-col gap-2 mb-3">
      ${monthCard}
      ${streakCard}
    </div>
    ${topHTML}
    ${prHTML}
  `;
}
