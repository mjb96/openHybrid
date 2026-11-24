// @ts-check
// =============================================================================
// REVIEWS BAND (js/analytics/views/view-reviews.js)
//
// ONE home for the three recaps. Week | Month | Year is a row of destinations,
// not three footer links and not a second report screen: each opens the existing
// Review screen on the tab that owns that period, so nothing is rewritten.
//
// Year is always reachable. The seasonal Year in Review section inside Review →
// Stats still decides whether it has content to show (December/January), but the
// row does not appear and disappear with the calendar.
// =============================================================================
import { band } from './band-kit.js';
import { esc } from './screen-kit.js';
import { progressChildren } from '../progress-sections.js';

const REVIEW_COPY = Object.freeze({
  reviewWeek: { title: 'Week', desc: 'Story, consistency log and share card', route: 'weekly-review' },
  reviewMonth: { title: 'Month', desc: 'This month vs the same part of the previous one', route: 'monthly-report' },
  reviewYear: { title: 'Year', desc: 'Best month, streaks and the PRs that made it', route: 'year-review' },
});

/**
 * @param {any} _model
 * @param {{ error?: string|null }} [_options]
 */
export function renderReviews(_model, _options = {}) {
  // The registry owns the child order and labels; this view only formats them.
  const children = progressChildren('reviews');
  const body = `<div class="pg-reviews" role="group" aria-label="Reviews">
    ${children.map((child) => {
      const copy = REVIEW_COPY[child.id] || { title: child.label, desc: child.subtitle, route: child.routeId };
      return `<button type="button" class="pg-reviews__seg" data-action="open-analytics" data-context="${esc(copy.route)}">
        <span class="pg-reviews__title">${esc(copy.title)}</span>
        <span class="pg-reviews__desc">${esc(copy.desc)}</span>
      </button>`;
    }).join('')}
  </div>`;

  return band({
    id: 'reviews',
    eyebrow: 'Reviews',
    title: 'Reviews',
    sub: 'Week · month · year',
    ariaLabel: 'Reviews: week, month and year recaps',
    body,
  });
}
