// @ts-check
// =============================================================================
// HOME BODYWEIGHT CARD (js/home/bodyweight-card.js)
//
// Home keeps the daily weigh-in one tap away: latest value, a compact 30-day
// line with the goal, the weekly trend, and a Log button that opens the
// prefilled sheet. The full graph stays in Progress → Body Weight.
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
  const trend = model.rate.enough
    ? `Trend ${model.rate.perWeek > 0 ? '+' : ''}${model.rate.perWeek.toFixed(2)} ${unit}/week`
    : 'Log a few more mornings for a weekly trend';
  const delta = model.delta == null ? '' : `${model.delta > 0 ? '+' : ''}${model.delta.toFixed(1)} ${unit} · 30d`;
  const target = model.targetWeight ? `Goal ${model.targetWeight} ${unit}` : '';
  // The same chart Progress draws, at card geometry: daily points, the 7-day
  // mean and the goal line. Tapping still opens the full graph.
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
    <div class="home-bw__head">
      <div><span class="home-bw__eyebrow">Bodyweight</span><strong class="home-bw__title">${latest ? `${latest.weight.toFixed(1)} ${unit}` : 'No weigh-ins yet'}</strong></div>
      <button type="button" class="home-bw__log" data-action="open-bw-sheet">Log</button>
    </div>
    <button type="button" class="home-bw__chart" data-action="open-analytics" data-context="bodyweight" aria-label="Open bodyweight progress">
      ${chart || '<span class="home-bw__empty">Log a weigh-in to start the curve</span>'}
    </button>
    <div class="home-bw__meta">
      <span>${latest ? escapeHtml(formatDayMonth(latest.date)) : ''} ${delta}</span>
      <span>${escapeHtml(target)}</span>
    </div>
    <div class="home-bw__trend">${escapeHtml(trend)}</div>
  </article>`;
}
