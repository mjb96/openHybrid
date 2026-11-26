// @ts-check
// =============================================================================
// YEAR HEATMAP — presenter for G4 (js/analytics/year-heatmap.js)
//
// Twelve month grids over the last year, one button per past day. The pure
// builder owns every number and every shade; this file only renders and mounts.
// =============================================================================
import { esc } from './screen-kit.js';
import { buildYearHeatmap, formatMinutes } from '../year-heatmap.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A fixed English date label — never the device locale, so tests are stable. */
function longDayLabel(dateISO) {
  const [year, month, day] = String(dateISO).split('-').map(Number);
  if (!year || !month || !day) return dateISO;
  const weekday = WEEKDAY_LONG[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${day} ${MONTH_NAMES[month - 1]} ${year}`;
}

/** What a day's button says. Minutes are a measurement, never an estimate. */
function dayLabel(cell) {
  const day = longDayLabel(cell.date);
  if (!cell.sessions) return `${day}: no training recorded`;
  const sessions = `${cell.sessions} session${cell.sessions === 1 ? '' : 's'}`;
  if (cell.measured) return `${day}: ${Math.round(cell.minutes)} minutes trained, ${sessions}`;
  return `${day}: training logged, no time recorded, ${sessions}`;
}

/** @param {any} model */
export function yearHeatmapHTML(model) {
  if (!model || !Array.isArray(model.months) || !model.months.length) return '';
  const days = model.activeDays || 0;
  const total = model.totalMinutes
    ? `${formatMinutes(model.totalMinutes)} trained`
    : 'No measured training time';
  const summary = `${total} · ${days} day${days === 1 ? '' : 's'}`;
  const unmeasured = model.unmeasuredDays
    ? `<p class="pg-year__note">${model.unmeasuredDays} training day${model.unmeasuredDays === 1 ? '' : 's'} logged without a recorded time.</p>`
    : '';

  const months = model.months.map((month) => {
    const cells = month.cells.map((cell) => {
      if (!cell) return '<span class="pg-year__pad" aria-hidden="true"></span>';
      if (cell.future) return `<span class="pg-year__cell pg-year__cell--future" aria-hidden="true"><span class="pg-year__num">${cell.day}</span></span>`;
      const classes = [
        'pg-year__cell',
        `pg-year__cell--l${cell.level}`,
        cell.sessions ? 'pg-year__cell--logged' : '',
        cell.measured ? 'pg-year__cell--measured' : '',
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-action="open-activities-day" data-date="${esc(cell.date)}"
        aria-label="${esc(dayLabel(cell))}"><span class="pg-year__num">${cell.day}</span></button>`;
    }).join('');

    return `<section class="pg-year__month" aria-label="${esc(month.label)}">
      <h3 class="pg-year__month-name">${esc(month.label)}</h3>
      <div class="pg-year__dow" aria-hidden="true">${model.dayLabels.map((label) => `<span>${esc(label.slice(0, 1))}</span>`).join('')}</div>
      <div class="pg-year__grid">${cells}</div>
    </section>`;
  }).join('');

  return `<section class="pg-year" aria-label="Training calendar, last twelve months">
    <div class="pg-year__head">
      <p class="pg-year__range">${esc(model.rangeLabel)}</p>
      <p class="pg-year__total">${esc(summary)}</p>
    </div>
    <div class="pg-year__months">${months}</div>
    <div class="pg-year__legend">
      <span class="pg-year__less">Less</span>
      ${[1, 2, 3, 4].map((level) => `<span class="pg-year__swatch pg-year__cell--l${level}" aria-hidden="true"></span>`).join('')}
      <span class="pg-year__less">More</span>
      <span class="pg-year__legend-note">Shaded by time trained. Tap a day to open its History.</span>
    </div>
    ${unmeasured}
  </section>`;
}

/**
 * Mount into Review → Stats. A failure here must never blank the rest of the
 * tab, so the caller keeps its own try/catch around this call.
 * @param {any} state
 */
export function renderYearHeatmap(state) {
  const container = document.getElementById('yearHeatmapContainer');
  if (!container) return false;
  const model = buildYearHeatmap(state);
  container.innerHTML = model.hasData
    ? `<h2 class="section-header mt-2">Year at a glance</h2>${yearHeatmapHTML(model)}`
    : '';
  container.hidden = !model.hasData;
  return model.hasData;
}
