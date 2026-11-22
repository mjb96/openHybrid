// @ts-check
// =============================================================================
// HOME BODYWEIGHT CARD (js/home/bodyweight-card.js)
//
// Home keeps the daily weigh-in one tap away: latest value, a compact 30-day
// line with the goal, and one row that opens the prefilled sheet. The full
// graph stays in Progress → Body Weight.
// =============================================================================
import { buildBodyweightModel } from '../metrics/bodyweight.js';
import { bodyWeightChartSVG } from '../analytics/charts.js';
import { formatDayMonth } from '../dates.js';
import { escapeHtml } from '../util.js';

/** @param {any} state @param {{ now?: number, days?: number }} [options] */
export function buildHomeBodyweight(state, { now = Date.now(), days = 30 } = {}) {
  const model = buildBodyweightModel(state, { now, rangeDays: days });
  const first = model.points[0];
  const latest = model.latest;
  const delta = first && latest ? latest.weight - first.weight : null;
  return { ...model, delta };
}

/**
 * @param {HTMLElement|null} container
 * @param {any} state
 */
export function renderHomeBodyweight(container, state) {
  if (!container) return;
  const model = buildHomeBodyweight(state);
  const unit = model.unit;
  const latest = model.latest;
  const delta = model.delta == null ? '' : `${model.delta > 0 ? '+' : ''}${model.delta.toFixed(1)} ${unit} / 30d`;
  const trend = model.rate.enough
    ? `${model.rate.perWeek > 0 ? '+' : ''}${model.rate.perWeek.toFixed(2)} ${unit}/wk`
    : delta;
  const meta = [
    latest ? formatDayMonth(latest.date) : '',
    trend,
    model.targetWeight ? `Goal ${model.targetWeight} ${unit}` : '',
  ].filter(Boolean).join(' · ');
  const aria = latest
    ? `Log bodyweight, latest ${latest.weight.toFixed(1)} ${unit}`
    : 'Log bodyweight';
  // The same chart Progress draws, at card geometry: daily points, the 7-day
  // mean and the goal line. Tapping the chart still opens the full graph, while
  // the summary row above it opens the prefilled weigh-in sheet.
  const chart = bodyWeightChartSVG(
    model.points.map((point) => ({ date: point.date, weight: point.weight })),
    {
      unit,
      goal: model.targetWeight,
      compact: true,
      idPrefix: 'homeBw',
      ariaLabel: `Bodyweight trend, last ${model.rangeDays} days`,
    },
  );

  container.innerHTML = `<article class="card-dark home-bw">
    <button type="button" class="home-bw__line" data-action="open-bw-sheet" aria-label="${escapeHtml(aria)}">
      <span class="home-bw__copy">
        <span class="home-bw__eyebrow">Bodyweight</span>
        <strong class="home-bw__title">${latest ? `${latest.weight.toFixed(1)} ${unit}` : 'No weigh-ins yet'}</strong>
        <span class="home-bw__meta">${escapeHtml(meta)}</span>
      </span>
      <span class="home-bw__log" aria-hidden="true">Log</span>
    </button>
    <button type="button" class="home-bw__chart" data-action="open-analytics" data-context="bodyweight" aria-label="Open bodyweight progress">
      ${chart || '<span class="home-bw__empty">Log a weigh-in to start the curve</span>'}
    </button>
  </article>`;
}
