// @ts-check
// =============================================================================
// REPORTS BAND (js/analytics/views/view-reports.js)
//
// Two destinations, no arithmetic. Reports is a band rather than a footer link
// because both reports answer "is my training working?" over a longer window
// than the bands above, and the catalogue advertised it — a `reports` entry with
// no builder was permanently `pending`, so the `alwaysShow` flag on it was dead
// configuration.
// =============================================================================
import { band } from './band-kit.js';
import { yearReviewYear } from '../../brain/year-review.js';
import { localDayKey } from '../../dates.js';

const MONTHLY_REPORT = Object.freeze({
  title: 'Monthly Report',
  desc: '30 days and 12 months, compared with the period before',
  context: 'monthly-report',
});

const YEAR_IN_REVIEW = Object.freeze({
  title: 'Year in Review',
  desc: 'Your year so far, with the best month and the PRs that made it',
  context: 'weekly-review',
});

/**
 * @param {any} _model
 * @param {{ error?: string|null }} [_options]
 */
export function renderReports(_model, _options = {}) {
  // Year in Review exists in December (this year) and January (last year) only.
  // Advertising it in November opened a Review screen with no year section.
  const inSeason = yearReviewYear(localDayKey(new Date())) != null;
  const reports = inSeason ? [MONTHLY_REPORT, YEAR_IN_REVIEW] : [MONTHLY_REPORT];
  const body = `<ul class="pg-reports">${reports.map((report) => `
    <li>
      <button type="button" class="pg-reports__row" data-action="open-analytics" data-context="${report.context}">
        <span class="pg-reports__copy">
          <span class="pg-reports__title">${report.title}</span>
          <span class="pg-reports__desc">${report.desc}</span>
        </span>
        <span class="pg-reports__arrow" aria-hidden="true">→</span>
      </button>
    </li>`).join('')}</ul>`;

  return band({
    id: 'reports',
    eyebrow: 'Reports',
    title: 'Reports',
    sub: 'Longer than one window',
    body,
  });
}
