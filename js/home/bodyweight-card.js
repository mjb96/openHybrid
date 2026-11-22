// @ts-check
// =============================================================================
// HOME BODYWEIGHT CARD (js/home/bodyweight-card.js)
//
// Home keeps the daily weigh-in one tap away: latest value, a compact 30-day
// line with the goal, and one row that opens the prefilled sheet. The full
// graph stays in Progress → Body Weight.
// =============================================================================
import { buildBodyweightModel } from '../metrics/bodyweight.js';
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

/** @param {number[]} values @param {number|null} goal */
function sparkline(values, goal) {
  const W = 120, H = 28, PAD = 2;
  if (values.length < 2) return '';
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (goal != null && Number.isFinite(goal)) { min = Math.min(min, goal); max = Math.max(max, goal); }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const x = (index) => PAD + (index / (values.length - 1)) * (W - PAD * 2);
  const y = (value) => PAD + (1 - (value - min) / span) * (H - PAD * 2);
  const line = values.map((value, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1).toFixed(1)},${H - PAD} L${PAD},${H - PAD} Z`;
  const goalLine = goal != null && Number.isFinite(goal)
    ? `<line x1="${PAD}" y1="${y(goal).toFixed(1)}" x2="${W - PAD}" y2="${y(goal).toFixed(1)}" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3 2"/>`
    : '';
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" class="home-bw__spark">
    <defs><linearGradient id="homeBwFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#22d3ee" stop-opacity=".26"/><stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>
    <path d="${area}" fill="url(#homeBwFill)"/>
    ${goalLine}
    <path d="${line}" fill="none" stroke="#22d3ee" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${x(values.length - 1).toFixed(1)}" cy="${y(values[values.length - 1]).toFixed(1)}" r="2.6" fill="#a3e635"/>
  </svg>`;
}

/**
 * @param {HTMLElement|null} container
 * @param {any} state
 */
export function renderHomeBodyweight(container, state) {
  if (!container) return;
  const model = buildHomeBodyweight(state);
  const unit = model.unit;
  const values = model.points.map((point) => point.weight);
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

  container.innerHTML = `<article class="card-dark home-bw">
    <button type="button" class="home-bw__line" data-action="open-bw-sheet" aria-label="${escapeHtml(aria)}">
      <span class="home-bw__copy">
        <span class="home-bw__eyebrow">Bodyweight</span>
        <strong class="home-bw__title">${latest ? `${latest.weight.toFixed(1)} ${unit}` : 'No weigh-ins yet'}</strong>
        <span class="home-bw__meta">${escapeHtml(meta)}</span>
      </span>
      <span class="home-bw__chart">
        ${values.length >= 2 ? sparkline(values, model.targetWeight) : '<span class="home-bw__empty">Log a weigh-in</span>'}
      </span>
      <span class="home-bw__log" aria-hidden="true">Log</span>
    </button>
  </article>`;
}
