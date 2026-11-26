// @ts-check
// =============================================================================
// BODY BAND (js/analytics/views/view-body.js)
//
// Weight, its change across the window, the four sites the athlete measures most
// and any entered body fat. The chart is the SAME bodyWeightChartSVG Home and
// Progress already draw, so there is never a second sparkline implementation.
// =============================================================================
import { band, stateBlock } from './band-kit.js';
import { progressDetailFor } from '../progress-sections.js';
import { esc } from './screen-kit.js';
import { bodyWeightChartSVG } from '../charts.js';
import { formatDayMonthShort } from '../../dates.js';
import { photoObjectUrl } from '../../photos/library.js';
import { fromCanonicalWeight } from '../../metrics/weight-unit.js';

/**
 * One photo tile. Its ONLY job is to open the photo — Delete lives in the
 * viewer. Shared with the Measures screen so the two strips cannot drift.
 * @param {{ id: string, date: string }} photo
 */
export function photoTileHTML(photo) {
  return `<li class="pg-photo">
    <button type="button" class="pg-photo__open" data-photo-view="${esc(photo.date)}"
      aria-label="${esc(`View the progress photo from ${formatDayMonthShort(photo.date)}`)}">
      <img class="pg-photo__img" data-photo-thumb="${esc(photo.id)}" alt="" />
      <span class="pg-photo__date">${esc(formatDayMonthShort(photo.date))}</span>
    </button>
  </li>`;
}

/**
 * @param {ReturnType<import('../body-metrics.js').buildBodyMetricsModel>|null} model
 * @param {{ error?: string|null, hidden?: string[] }} [options]
 */
export function renderBody(model, options = {}) {
  if (options.error) {
    return band({
      id: 'body',
      detail: progressDetailFor('body'),
      eyebrow: 'Body',
      title: 'Body',
      body: stateBlock('error', {
        message: 'We could not calculate your body metrics.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({ id: 'body', detail: progressDetailFor('body'), eyebrow: 'Body', title: 'Body', body: stateBlock('loading', { height: 220 }) });
  }

  if (!model.hasData) {
    return band({
      id: 'body',
      detail: progressDetailFor('body'),
      eyebrow: 'Body',
      title: 'Body',
      value: 'No entries',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'No weigh-ins or measurements yet.',
        action: { label: 'Add a measurement', action: 'open-analytics', context: 'measures' },
      }),
    });
  }

  // The body model is canonical kilograms; the band reads the display unit.
  const showWeight = (stored) => fromCanonicalWeight(stored, model.unit);
  const weightText = model.weight.latest != null
    ? `${(showWeight(model.weight.latest) ?? 0).toFixed(1)} ${model.unit}`
    : '—';
  const changeLine = model.weight.change == null
    ? ''
    : model.weight.change === 0
      ? `<p class="pg-pulse__delta pg-pulse__delta--flat">Unchanged over ${esc(model.range?.spanLabel || 'this period')}</p>`
      : `<p class="pg-pulse__delta pg-pulse__delta--${model.weight.change > 0 ? 'down' : 'up'}">${esc(`${model.weight.change > 0 ? '+' : ''}${(showWeight(model.weight.change) ?? 0).toFixed(1)} ${model.unit} over ${model.range?.spanLabel || 'this period'}`)}</p>`;

  const chart = model.weight.points.length >= 2
    ? `<div class="pg-body__chart">${bodyWeightChartSVG(model.weight.points, {
      unit: model.unit,
      goal: model.weight.targetWeight || undefined,
      idPrefix: 'pgBody',
      ariaLabel: `Body weight from ${model.weight.points[0].date} to ${model.weight.points[model.weight.points.length - 1].date}`,
    })}</div>`
    : '';

  const bodyFatDelta = model.bodyFat?.deltaPp == null
    ? ''
    : ` · ${model.bodyFat.deltaPp > 0 ? '+' : ''}${model.bodyFat.deltaPp} pp`
      + (model.bodyFat.deltaDate ? ` since ${formatDayMonthShort(model.bodyFat.deltaDate)}` : ' since the previous reading');
  const bodyFat = model.bodyFat
    ? `<p class="pg-body__fat">Body fat <b>${esc(String(model.bodyFat.latestPct))}%</b>${bodyFatDelta ? esc(bodyFatDelta) : ''} <small>entered, never estimated</small></p>`
    : '';

  // Weight and tape are the latest RECORDED values; the chart, change and photos
  // are range-scoped. Saying "as of <date>" stops the newest reading being read
  // as part of the selected window.
  const latestOutOfRange = model.weight.date
    && model.range?.startISO
    && model.weight.date < model.range.startISO;

  const body = `
    ${changeLine}
    ${chart}
    ${bodyFat}
    <div class="pg-band__actions">
      ${Array.isArray(options.hidden) && options.hidden.includes('bodyMeasures') ? '' : `<button type="button" class="pg-band__action" data-action="open-analytics" data-context="measures">${model.siteCount ? `Measurements (${model.siteCount}) →` : 'Measures →'}</button>`}
      ${Array.isArray(options.hidden) && options.hidden.includes('bodyWeight') ? '' : '<button type="button" class="pg-band__action" data-action="open-analytics" data-context="bodyweight">Weight trend</button>'}
      <button type="button" class="pg-band__action" data-action="open-bw-sheet">Log weigh-in</button>
    </div>`;

  return band({
    id: 'body',
    detail: progressDetailFor('body'),
    eyebrow: 'Body',
    title: 'Body',
    value: weightText,
    sub: latestOutOfRange && model.weight.date
      ? `Latest · ${formatDayMonthShort(model.weight.date)}`
      : model.range?.spanLabel,
    ariaLabel: `${model.range?.spanLabel || 'Selected period'} body: ${weightText}${model.weight.change == null ? '' : `, ${model.weight.change > 0 ? 'up' : 'down'} ${Math.abs(model.weight.change)} ${model.unit}`}`,
    body,
  });
}


/**
 * Load thumbnails after the band is in the DOM. Kept separate from render because
 * reading a blob is async and a band must never wait on the disk.
 * @param {HTMLElement|null} container
 */
export function hydratePhotoThumbs(container) {
  if (!container?.querySelectorAll) return;
  container.querySelectorAll('[data-photo-thumb]').forEach(async (img) => {
    const id = img.getAttribute('data-photo-thumb');
    if (!id || img.getAttribute('src')) return;
    const url = await photoObjectUrl(id);
    if (url) {
      img.setAttribute('src', url);
      // The strip can be re-rendered at any time; revoke when it leaves.
      img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true });
    }
  });
}
