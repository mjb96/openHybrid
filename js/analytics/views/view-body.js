// @ts-check
// =============================================================================
// BODY BAND (js/analytics/views/view-body.js)
//
// Weight, its change across the window, the four sites the athlete measures most
// and any entered body fat. The chart is the SAME bodyWeightChartSVG Home and
// Progress already draw, so there is never a second sparkline implementation.
// =============================================================================
import { band, dataTableDisclosure, stateBlock } from './band-kit.js';
import { progressDetailFor } from '../progress-sections.js';
import { esc } from './screen-kit.js';
import { bodyWeightChartSVG } from '../charts.js';
import { cmToDisplay, roundDisplay } from '../../metrics/measurements.js';
import { formatDayMonthShort } from '../../dates.js';
import { photoObjectUrl } from '../../photos/library.js';

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
    const deltaValue = site.deltaCm == null
      ? null
      : roundDisplay(cmToDisplay(site.deltaCm, model.measurementUnit));
    const delta = deltaValue == null
      ? ''
      : `<span class="pg-site__delta">${esc(`${deltaValue > 0 ? '+' : ''}${deltaValue}`)}</span>`;
    const aria = `${site.label}: ${value == null ? 'no reading' : `${value} ${model.measurementUnit}`}`
      + (deltaValue == null
        ? ''
        : deltaValue === 0
          ? ', unchanged since the previous reading'
          : `, ${deltaValue > 0 ? 'up' : 'down'} ${Math.abs(deltaValue)} ${model.measurementUnit} since the previous reading`)
      + '. Open the trend.';
    return `<li class="pg-site"><button type="button" class="pg-site__btn"
      data-action="open-analytics" data-context="measures" data-entity="${esc(site.key)}" data-entity-name="${esc(site.label)}"
      aria-label="${esc(aria)}" title="Open the ${esc(site.label)} trend">
      <span class="pg-site__label">${esc(site.label)}</span>
      <b class="pg-site__value">${value == null ? '—' : esc(String(value))}</b>
      <small>${esc(model.measurementUnit)}</small>${delta}
    </button></li>`;
  }).join('');

  const hasTapeDelta = model.keySites.some((site) => site.deltaCm != null);
  const bodyFatDelta = model.bodyFat?.deltaPp == null
    ? ''
    : ` · ${model.bodyFat.deltaPp > 0 ? '+' : ''}${model.bodyFat.deltaPp} pp`
      + (model.bodyFat.deltaDate ? ` since ${formatDayMonthShort(model.bodyFat.deltaDate)}` : ' since the previous reading');
  const bodyFat = model.bodyFat
    ? `<p class="pg-body__fat">Body fat <b>${esc(String(model.bodyFat.latestPct))}%</b>${bodyFatDelta ? esc(bodyFatDelta) : ''} <small>entered, never estimated</small></p>`
    : '';

  // A privacy switch, not a layout one: some athletes do not want photos on
  // screen when handing the phone over.
  const photosHidden = Array.isArray(options.hidden) && options.hidden.includes('bodyPhotos');
  const photos = photosHidden ? [] : (model.photos || []).slice(0, 12);
  // A tile's ONLY job is to open the photo. Delete lives in the viewer: the old
  // 44px delete button covered a 64px tile, so a tap asked "delete?" and there
  // was no way to look at the photo at all.
  const photoStrip = `<div class="pg-photos-block">
      <p class="pg-photos__head"><span>Progress photos</span>${photos.length ? `<span>${photos.length}</span>` : ''}</p>
      <ul class="pg-photos" aria-label="Progress photos">
        ${photos.map(photoTileHTML).join('')}
        <li class="pg-photo pg-photo--add">
          <!-- The SAME tile does the SAME thing here and on Measures: it opens the
               dated entry, where Add picture is the first control. A camera
               shortcut that skipped the numbers produced a photo with no
               context — the exact split this screen exists to close. -->
          <button type="button" class="pg-photo__add" data-action="open-ms-sheet">
            <span class="pg-photo__plus" aria-hidden="true">+</span>
            <span class="pg-photo__addlabel">Add photo</span>
          </button>
        </li>
      </ul>
    </div>`;

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
    ${hasTapeDelta ? '<p class="pg-sites__note">Tape changes are since each site\'s previous reading.</p>' : ''}
    ${bodyFat}
    ${photosHidden ? '' : photoStrip}
    <div class="pg-band__actions">
      ${Array.isArray(options.hidden) && options.hidden.includes('bodyMeasures') ? '' : `<button type="button" class="pg-band__action" data-action="open-analytics" data-context="measures">${model.siteCount > model.keySites.length ? `All ${model.siteCount} sites →` : 'Measures →'}</button>`}
      ${Array.isArray(options.hidden) && options.hidden.includes('bodyWeight') ? '' : '<button type="button" class="pg-band__action" data-action="open-analytics" data-context="bodyweight">Weight trend</button>'}
      <button type="button" class="pg-band__action" data-action="open-bw-sheet">Log weigh-in</button>
    </div>
    ${dataTableDisclosure(
      ['Site', `Latest (${model.measurementUnit})`, 'Change since previous', 'Previous reading'],
      model.sites.map((site) => [
        site.label,
        site.latestCm == null ? '—' : String(roundDisplay(cmToDisplay(site.latestCm, model.measurementUnit))),
        site.deltaCm == null ? '—' : String(roundDisplay(cmToDisplay(site.deltaCm, model.measurementUnit))),
        site.previousDate ? formatDayMonthShort(site.previousDate) : '—',
      ]),
      'Body measurements — latest recorded per site',
    )}`;

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
