// @ts-check
// =============================================================================
// YEAR IN REVIEW — analytics leaf (js/analytics/views/view-year-review.js)
//
// The seasonal (December/January) calendar-year recap. The data comes from the
// pure builder (js/brain/year-review.js); this file only renders it with the
// athlete's weight/distance units. No chart library; the share button is a
// data-action routed to the shared image-card pipeline.
//
// The heading lives INSIDE `#yearReviewContainer`. `.analytics-section
// h2.section-header` is `display:flex !important`, so a `hidden` attribute on the
// heading itself would be inert; hiding the container hides both together.
// Outside December/January the whole section is absent. Inside it, an untrained
// year gets one honest empty state instead of a fabricated recap.
// =============================================================================
import { formatVolume, weightUnitOf } from '../utils.js';
import { buildYearInReview, yearReviewYear } from '../../brain/year-review.js';
import { formatDayMonthShort, todayKey } from '../../dates.js';
import { fromCanonicalWeight } from '../../metrics/weight-unit.js';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KM_TO_MI = 0.621371;
const round1 = (n) => Math.round(n * 10) / 10;

/** Strip a trailing ".0" so "15 km" never renders as "15.0 km". */
const number = (n) => String(round1(n));

// A long custom exercise name is athlete data, not a layout choice: let it wrap
// anywhere rather than force the card wider than the screen.
const CLIP = 'min-width:0;overflow-wrap:anywhere;word-break:break-word;';

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
  if (!el) return;

  const today = todayISO || todayKey();
  const year = yearReviewYear(today);
  if (year == null) {
    // Outside December/January the surface does not exist at all.
    el.hidden = true;
    el.innerHTML = '';
    return;
  }

  const review = buildYearInReview(state, days, { year, today });
  el.hidden = false;
  const heading = '<h2 class="section-header mt-2">Year in Review</h2>';

  if (!review.hasData) {
    el.innerHTML = `${heading}
    <article class="card-dark p-4 text-center">
      <div aria-hidden="true" style="font-size:2rem;margin-bottom:8px;">📅</div>
      <p style="color:var(--text-muted);font-size:0.85rem;line-height:1.5;margin:0 0 6px;">
        ${review.isPartial
          ? `No sessions logged in ${review.year} yet.<br>Your year builds itself as you train.`
          : `No sessions were logged in ${review.year}.`}
      </p>
      <p class="an-detail-period" style="margin:0;">${esc(review.rangeLabel)}</p>
    </article>`;
    return;
  }

  const unit = weightUnitOf(state);
  const distUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
  const soFar = review.isPartial ? ' so far' : '';

  const stats = [
    { v: formatVolume(review.totals.volumeKg, unit), k: 'Lifted' },
    { v: formatDistance(review.totals.distanceKm, distUnit), k: 'Run' },
    { v: String(review.totals.workingSets), k: 'Working sets' },
    { v: String(review.totals.prCount), k: 'e1RM PRs' },
  ].map((stat) => `<div class="wrev-stat"><div class="wrev-stat__v">${stat.v}</div><div class="wrev-stat__k">${stat.k}</div></div>`).join('');

  const bestMonth = review.bestMonth;
  const monthCard = bestMonth ? `
    <article class="card-dark p-3">
      <div class="wrev-label">Most trained</div>
      <div class="wrev-stat__v" style="margin-top:4px;">${esc(bestMonth.label)}</div>
      <div class="wrev-stat__k" style="text-transform:none;letter-spacing:0;">${bestMonth.sessions} session${bestMonth.sessions === 1 ? '' : 's'} · ${formatVolume(bestMonth.volumeKg, unit)}</div>
    </article>` : '';

  const streakCard = `
    <article class="card-dark p-3">
      <div class="wrev-label">Longest consecutive run</div>
      <div class="wrev-stat__v" style="margin-top:4px;">${review.totals.longestStreak} day${review.totals.longestStreak === 1 ? '' : 's'}</div>
      <div class="wrev-stat__k" style="text-transform:none;letter-spacing:0;">${review.totals.activeDays} active day${review.totals.activeDays === 1 ? '' : 's'}${soFar}</div>
    </article>`;

  const topHTML = review.topExercises.length ? `
    <h3 class="section-header mt-4">Top exercises</h3>
    ${review.topExercises.map((exercise) => `<article class="card-dark p-3 mb-2 flex-between">
      <span style="font-weight:700;color:var(--text-inverse);${CLIP}">${esc(exercise.name)}</span>
      <span style="color:var(--text-muted);font-size:0.78rem;text-align:right;white-space:nowrap;margin-left:10px;">${exercise.sets} set${exercise.sets === 1 ? '' : 's'} · ${formatVolume(exercise.volumeKg, unit)}</span>
    </article>`).join('')}` : '';

  // The view caps the LIST at five; the builder returns every event so the count
  // and the list can never disagree. When capped, the label says so.
  const shownPrs = review.prs.slice(0, 5);
  const prHeading = review.prs.length > shownPrs.length ? 'Biggest e1RM PRs' : 'e1RM PRs';
  const prHTML = shownPrs.length ? `
    <h3 class="section-header mt-4">${prHeading}</h3>
    ${shownPrs.map((pr) => `<article class="card-dark p-3 mb-2 flex-between">
      <span style="font-weight:700;color:var(--text-inverse);${CLIP}"><span aria-hidden="true">🏆</span> ${esc(pr.lift)}</span>
      <span style="color:var(--text-muted);font-size:0.78rem;text-align:right;white-space:nowrap;margin-left:10px;">
        <b style="color:var(--color-amber);">${Math.round(fromCanonicalWeight(pr.e1rm, unit) ?? 0)} ${unit}</b> · ${esc(formatDayMonthShort(pr.date))}
      </span>
    </article>`).join('')}` : '';

  el.innerHTML = `${heading}
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
    <button type="button" class="btn-action-block btn-ghost mt-3" data-action="share-year-review" aria-label="Share this year in review">📤 Share year</button>
  `;
}
