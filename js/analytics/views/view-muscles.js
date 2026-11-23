// @ts-check
// =============================================================================
// MUSCLES BAND (js/analytics/views/view-muscles.js)
//
// "Is the volume where I need it?" — a stacked chart over the selected window,
// a legend, and ranked rows carrying the exact numbers so the chart is never the
// only place a value exists.
//
// Colour carries GROUP and lightness carries the muscle within it, because 19
// distinguishable hues do not exist on a 390px screen. Six groups are the
// vocabulary the app already browses with.
// =============================================================================
import { band, dataTableDisclosure, legend, rankedRows, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';
import { muscleHeatmapHTML } from '../../home/body-heatmap.js';

/**
 * Colour carries the GROUP; a SHADE within it carries the muscle.
 *
 * A single hue per group made Quads, Hamstrings and Glutes identical — in the
 * chart their segments were indistinguishable, and in the legend three rows
 * showed the same swatch and read like duplicated entries. The shades are
 * explicit hex rather than `color-mix`, so they render identically on every
 * Android WebView this app supports.
 */
const GROUP_SHADES = Object.freeze({
  chest: ['#22d3ee', '#67e8f9', '#0e7490'],
  back: ['#3b82f6', '#60a5fa', '#93c5fd', '#1d4ed8'],
  shoulders: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#6d28d9'],
  arms: ['#10b981', '#34d399', '#6ee7b7', '#047857'],
  legs: ['#f59e0b', '#fbbf24', '#fcd34d', '#d97706', '#b45309'],
  core: ['#ff6b00', '#fb923c'],
});
const OTHER_COLOR = 'rgba(148,163,184,0.45)';

/**
 * Stable colour per muscle: its group hue, shaded by its rank within that group
 * so two muscles are never drawn in the same colour.
 * @param {Array<{ key: string, group: string }>} muscles ordered by sets
 */
function colourMapFor(muscles) {
  /** @type {Map<string, string>} */
  const colours = new Map();
  /** @type {Record<string, number>} */
  const seen = {};
  for (const muscle of muscles) {
    const shades = GROUP_SHADES[muscle.group] || ['var(--text-secondary)'];
    const index = seen[muscle.group] || 0;
    colours.set(muscle.key, shades[index % shades.length]);
    seen[muscle.group] = index + 1;
  }
  return colours;
}

const MAX_SERIES = 6;

const GROUPING_OPTIONS = Object.freeze([
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
]);

function groupingBar(active) {
  return `<div class="pg-segment" role="group" aria-label="Group by">${GROUPING_OPTIONS.map((option) => `
    <button type="button" class="pg-segment__chip${option.id === active ? ' is-selected' : ''}"
      data-pg-grouping="${esc(option.id)}" aria-pressed="${option.id === active ? 'true' : 'false'}">${esc(option.label)}</button>`).join('')}</div>`;
}

/**
 * The charted series: the biggest muscles individually, everything else
 * aggregated into one muted "Other" so the legend can never exceed six entries.
 * @param {any[]} muscles
 */
function seriesFor(muscles, colours) {
  const top = muscles.slice(0, MAX_SERIES).map((muscle) => ({
    key: muscle.key,
    label: muscle.label,
    color: colours.get(muscle.key) || 'var(--text-secondary)',
    muted: false,
  }));
  const rest = muscles.slice(MAX_SERIES);
  if (rest.length) top.push({ key: '__other', label: 'Other', color: OTHER_COLOR, muted: true });
  return top;
}

/**
 * @param {any} model
 * @param {any[]} series
 */
function stackHTML(model, series) {
  const otherKeys = new Set(model.muscles.slice(MAX_SERIES).map((muscle) => muscle.key));
  const buckets = model.buckets;
  if (!buckets.length) return '';

  const totals = buckets.map((bucket) => Object.entries(bucket.setsByMuscle)
    .reduce((sum, [, value]) => sum + (Number(value) || 0), 0));
  const max = Math.max(...totals, 0);
  if (!(max > 0)) return '';

  const columns = buckets.map((bucket, index) => {
    const total = totals[index];
    const segments = series.map((entry) => {
      const value = entry.key === '__other'
        ? Object.entries(bucket.setsByMuscle)
          .filter(([key]) => otherKeys.has(key))
          .reduce((sum, [, raw]) => sum + (Number(raw) || 0), 0)
        : (bucket.setsByMuscle[entry.key] || 0);
      if (!(value > 0)) return '';
      const height = (value / max) * 100;
      return `<span class="pg-stack__seg" style="height:${height.toFixed(2)}%;background:${esc(entry.color)}"></span>`;
    }).join('');

    return `<div class="pg-stack__bucket">
      <div class="pg-stack__bar" aria-hidden="true">${segments}</div>
      <span class="pg-stack__label">${esc(bucket.label)}</span>
      <span class="sr-only">${esc(`${bucket.label}: ${Math.round(total * 10) / 10} credited sets`)}</span>
    </div>`;
  }).join('');

  return `<div class="pg-stack" role="img" aria-label="${esc(`Credited sets per muscle, ${buckets.length} ${model.grouping === 'week' ? 'weeks' : model.grouping === 'month' ? 'months' : 'years'}, peak ${Math.round(max * 10) / 10} sets`)}">${columns}</div>`;
}

/**
 * @param {ReturnType<import('../muscles.js').buildMuscleModel>|null} model
 * @param {{ error?: string|null, unit?: string, limit?: number, hidden?: string[] }} [options]
 */
export function renderMuscles(model, options = {}) {
  if (options.error) {
    return band({
      id: 'muscles',
      eyebrow: 'Muscles',
      title: 'Muscles',
      body: stateBlock('error', {
        message: 'We could not calculate your muscle volume.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({ id: 'muscles', eyebrow: 'Muscles', title: 'Muscles', body: stateBlock('loading', { height: 230 }) });
  }

  if (!model.hasData) {
    return band({
      id: 'muscles',
      eyebrow: 'Muscles',
      title: 'Muscles',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'No working sets in this period yet.',
        action: { label: 'Start a workout', action: 'switch-tab', target: 'workout' },
      }),
    });
  }

  const colours = colourMapFor(model.muscles);
  const series = seriesFor(model.muscles, colours);
  const limit = Number.isFinite(Number(options.limit)) ? Number(options.limit) : 5;
  const shown = model.muscles.slice(0, limit);
  const extra = model.muscles.length - shown.length;

  const rows = rankedRows(shown.map((muscle) => ({
    label: muscle.label,
    value: muscle.sets,
    // Bar length is relative to the biggest muscle, not to 100 % of the window.
    pct: model.muscles[0]?.sets > 0 ? (muscle.sets / model.muscles[0].sets) * 100 : 0,
    color: colours.get(muscle.key) || 'var(--text-secondary)',
    status: muscle.deltaPct == null ? '' : `${muscle.deltaPct > 0 ? '+' : ''}${muscle.deltaPct} pts`,
    action: { action: 'open-analytics', context: 'muscle-load' },
  })));

  const body = `
    ${groupingBar(model.grouping)}
    ${stackHTML(model, series)}
    ${legend(series.map((entry) => ({ label: entry.label, color: entry.color, muted: entry.muted })))}
    ${rows}
    ${extra > 0 ? `<button type="button" class="pg-band__action" data-action="open-analytics" data-context="muscle-load">Show all ${model.muscles.length} muscles →</button>` : ''}
    ${!(Array.isArray(options.hidden) && options.hidden.includes('musclesBody')) && model.bodyMap?.hasData
      ? muscleHeatmapHTML(model.bodyMap, { label: 'Muscles trained in this period' })
      : ''}
    ${dataTableDisclosure(
      ['Muscle', 'Sets', 'Share', 'vs previous'],
      model.muscles.map((muscle) => [
        muscle.label,
        String(muscle.sets),
        `${muscle.sharePct}%`,
        muscle.deltaPct == null ? '—' : `${muscle.deltaPct > 0 ? '+' : ''}${muscle.deltaPct}`,
      ]),
      `Credited sets per muscle for ${model.range?.spanLabel || 'the selected period'}`,
    )}`;

  return band({
    id: 'muscles',
    eyebrow: 'Muscles',
    title: 'Muscles',
    value: `${model.totalSets}`,
    valueUnit: 'credited sets',
    sub: model.range?.spanLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} muscle volume: ${model.totalSets} credited sets across ${model.muscles.length} muscles`,
    body,
  });
}
