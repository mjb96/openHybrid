// @ts-check
// =============================================================================
// BODY BAND (js/analytics/views/view-body.js)
//
// Weight, its change across the window, the four sites the athlete measures most
// and any entered body fat. The chart is the SAME bodyWeightChartSVG Home and
// Progress already draw, so there is never a second sparkline implementation.
// =============================================================================
import { band, dataTableDisclosure, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';
import { bodyWeightChartSVG } from '../charts.js';
import { cmToDisplay, roundDisplay } from '../../metrics/measurements.js';
import { formatDayMonthShort } from '../../dates.js';
import { photoObjectUrl } from '../../photos/library.js';

/**
 * @param {ReturnType<import('../body-metrics.js').buildBodyMetricsModel>|null} model
 * @param {{ error?: string|null, hidden?: string[] }} [options]
 */
export function renderBody(model, options = {}) {
  if (options.error) {
    return band({
      id: 'body',
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
    return band({ id: 'body', eyebrow: 'Body', title: 'Body', body: stateBlock('loading', { height: 220 }) });
  }

  if (!model.hasData) {
    return band({
      id: 'body',
      eyebrow: 'Body',
      title: 'Body',
      sub: model.range?.spanLabel,
      body: stateBlock('empty', {
        message: 'No weigh-ins or measurements yet.',
        action: { label: 'Log a weigh-in', action: 'open-bw-sheet' },
      }),
    });
  }

  const weightText = model.weight.latest != null ? `${model.weight.latest} ${model.unit}` : '—';
  const changeLine = model.weight.change == null
    ? ''
    : model.weight.change === 0
      ? `<p class="pg-pulse__delta pg-pulse__delta--flat">Unchanged over ${esc(model.range?.spanLabel || 'this period')}</p>`
      : `<p class="pg-pulse__delta pg-pulse__delta--${model.weight.change > 0 ? 'down' : 'up'}">${esc(`${model.weight.change > 0 ? '+' : ''}${model.weight.change} ${model.unit} over ${model.range?.spanLabel || 'this period'}`)}</p>`;

  const chart = model.weight.points.length >= 2
    ? `<div class="pg-body__chart">${bodyWeightChartSVG(model.weight.points, {
      unit: model.unit,
      goal: model.weight.targetWeight || undefined,
      idPrefix: 'pgBody',
      ariaLabel: `Body weight from ${model.weight.points[0].date} to ${model.weight.points[model.weight.points.length - 1].date}`,
    })}</div>`
    : '';

  const sites = model.keySites.map((site) => {
    const value = site.latestCm == null
      ? null
      : roundDisplay(cmToDisplay(site.latestCm, model.measurementUnit));
    const delta = site.deltaCm == null
      ? ''
      : `<span class="pg-site__delta">${esc(`${site.deltaCm > 0 ? '+' : ''}${roundDisplay(cmToDisplay(site.deltaCm, model.measurementUnit))}`)}</span>`;
    return `<li class="pg-site"><span class="pg-site__label">${esc(site.label)}</span><b class="pg-site__value">${value == null ? '—' : esc(String(value))}</b><small>${esc(model.measurementUnit)}</small>${delta}</li>`;
  }).join('');

  const bodyFat = model.bodyFat
    ? `<p class="pg-body__fat">Body fat <b>${esc(String(model.bodyFat.latestPct))}%</b>${model.bodyFat.deltaPp == null ? '' : ` · ${esc(`${model.bodyFat.deltaPp > 0 ? '+' : ''}${model.bodyFat.deltaPp} pp`)}`} <small>entered, never estimated</small></p>`
    : '';

  // A privacy switch, not a layout one: some athletes do not want photos on
  // screen when handing the phone over.
  const photosHidden = Array.isArray(options.hidden) && options.hidden.includes('bodyPhotos');
  const photos = photosHidden ? [] : (model.photos || []).slice(0, 12);
  const photoStrip = `<ul class="pg-photos" aria-label="Progress photos">
      ${photos.map((photo) => `<li class="pg-photo">
        <img class="pg-photo__img" data-photo-thumb="${esc(photo.id)}" alt="${esc(`Progress photo, ${formatDayMonthShort(photo.date)}`)}" />
        <button type="button" class="pg-photo__remove" data-photo-delete="${esc(photo.date)}"
          aria-label="${esc(`Delete the photo from ${formatDayMonthShort(photo.date)}`)}">×</button>
      </li>`).join('')}
      <li class="pg-photo pg-photo--add">
        <label class="pg-photo__add" aria-label="Add a progress photo">
          <span aria-hidden="true">+</span>
          <input type="file" accept="image/*" capture="environment" data-photo-input hidden />
        </label>
      </li>
    </ul>`;

  // Weight and tape are the latest RECORDED values; the chart, change and photos
  // are range-scoped. Saying "as of <date>" stops the newest reading being read
  // as part of the selected window.
  const latestOutOfRange = model.weight.date
    && model.range?.startISO
    && model.weight.date < model.range.startISO;

  const body = `
    ${changeLine}
    ${chart}
    ${model.keySites.length ? `<ul class="pg-sites">${sites}</ul>` : ''}
    ${bodyFat}
    ${photosHidden ? '' : photoStrip}
    <div class="pg-band__actions">
      <button type="button" class="pg-band__action" data-action="open-analytics" data-context="bodyweight">${model.siteCount > model.keySites.length ? `All ${model.siteCount} sites →` : 'Measurements →'}</button>
      <button type="button" class="pg-band__action" data-action="open-bw-sheet">Log weigh-in</button>
      ${!photosHidden && (model.photos || []).length ? '<button type="button" class="pg-band__action" data-action="export-photos">Export photos</button>' : ''}
    </div>
    ${dataTableDisclosure(
      ['Site', `Latest (${model.measurementUnit})`, 'Change'],
      model.sites.map((site) => [
        site.label,
        site.latestCm == null ? '—' : String(roundDisplay(cmToDisplay(site.latestCm, model.measurementUnit))),
        site.deltaCm == null ? '—' : String(roundDisplay(cmToDisplay(site.deltaCm, model.measurementUnit))),
      ]),
      'Body measurements — latest recorded per site',
    )}`;

  return band({
    id: 'body',
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
