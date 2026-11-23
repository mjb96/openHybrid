// @ts-check
// =============================================================================
// MEASURES SCREEN (js/analytics/views/view-measures.js)
//
// The Body band answers "is my body responding?" over a range. This screen is the
// DATE-LEVEL record behind it: one row per day, each optionally carrying a
// weigh-in, an entered body fat, tape sites and a progress photo. Two ways to
// read it — the entry list (newest first) and the photo library — because a
// progress photo is only useful if you can find it again. The list also leads
// with a single-site TREND, so "what is my waist doing?" is answerable here
// rather than only inside the Bodyweight card.
//
// Presentation only: measure values come from `buildMeasuresModel`; the trend
// comes from `buildMeasurementExplorer`, which reuses the same measurement model.
// Units come from the models, never from a literal in this file.
// =============================================================================
import { dataTableDisclosure, rangeBar, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';
import { hydratePhotoThumbs, photoTileHTML } from './view-body.js';
import { siteTrendHTML } from '../charts.js';
import { RANGE_PRESETS } from '../ranges.js';
import { cmToDisplay, roundDisplay } from '../../metrics/measurements.js';
import { formatDayMonthShort } from '../../dates.js';

/** How many site names fit on one scannable row before "+N more". */
const MAX_SITE_LABELS = 3;

/** @param {number|null} weight @param {any} model */
function weightLabel(weight, model) {
  return weight == null ? '' : `${Number(weight).toFixed(1)} ${model.weightUnit}`;
}

/**
 * One row's secondary line: weight and entered body fat, then the tape summary.
 * A photo-only entry says so instead of rendering a blank line.
 * @param {any} entry
 * @param {any} model
 */
function entryStats(entry, model) {
  const parts = [];
  const weight = weightLabel(entry.weight, model);
  if (weight) parts.push(`<b>${esc(weight)}</b>`);
  if (entry.bodyFat != null) {
    parts.push(`<b>${esc(String(roundDisplay(entry.bodyFat)))}%</b><span> body fat</span>`);
  }
  if (parts.length) return parts.join('<span aria-hidden="true"> · </span>');
  // A tape-only entry prints its sites on the NEXT line; a blank stats span
  // there was just an empty row. Only a photo with no numbers needs saying.
  if (entry.sites.length) return '';
  return entry.photo ? 'Photo only' : '';
}

/**
 * The tape sites in the athlete's display unit. Stored values stay centimetres;
 * `cmToDisplay` is the boundary where they become readable, exactly as the Body
 * band does it.
 * @param {any} entry
 * @param {any} model
 */
function entrySites(entry, model) {
  if (!entry.sites.length) return '';
  const values = entry.sites.map((site) => {
    const value = roundDisplay(cmToDisplay(site.cm, model.measurementUnit));
    return `${site.label} ${value} ${model.measurementUnit}`;
  });
  const shown = values.slice(0, MAX_SITE_LABELS);
  if (values.length > MAX_SITE_LABELS) shown.push(`+${values.length - MAX_SITE_LABELS} more`);
  return shown.join(' · ');
}

/**
 * A plain-text summary for the row's accessible name. The visible row is three
 * spans; an aria-label that only said "Edit entry" would hide every value from a
 * screen reader.
 * @param {any} entry
 * @param {any} model
 */
function entrySummaryText(entry, model) {
  const bits = [];
  if (entry.weight != null) bits.push(`${Number(entry.weight).toFixed(1)} ${model.weightUnit}`);
  if (entry.bodyFat != null) bits.push(`${roundDisplay(entry.bodyFat)}% body fat`);
  if (entry.sites.length) {
    bits.push(entry.sites.map((site) => `${site.label} ${roundDisplay(cmToDisplay(site.cm, model.measurementUnit))} ${model.measurementUnit}`).join(', '));
  }
  return bits.join(', ') || 'Photo only';
}

/** @param {any} entry @param {any} model */
function entryRow(entry, model) {
  const dateLabel = formatDayMonthShort(entry.date, { year: true });
  const thumb = entry.photo
    ? `<span class="ms-entry__thumb"><img data-photo-thumb="${esc(entry.photo.id)}" alt="" /></span>`
    : '<span class="ms-entry__thumb ms-entry__thumb--none" aria-hidden="true">+</span>';
  const sites = entrySites(entry, model);
  return `<li class="ms-entry">
    <button type="button" class="ms-entry__open" data-action="open-ms-sheet" data-date="${esc(entry.date)}"
      aria-label="${esc(`Edit the entry for ${dateLabel}: ${entrySummaryText(entry, model)}`)}">
      ${thumb}
      <span class="ms-entry__body">
        <span class="ms-entry__date">${esc(dateLabel)}</span>
        ${entryStats(entry, model) ? `<span class="ms-entry__stats">${entryStats(entry, model)}</span>` : ''}
        ${sites ? `<span class="ms-entry__sites">${esc(sites)}</span>` : ''}
      </span>
    </button>
    <button type="button" class="ms-entry__delete" data-measure-delete="${esc(entry.date)}"
      aria-label="${esc(`Delete the entry for ${dateLabel}`)}">Delete</button>
  </li>`;
}

/** The photo strip at the top of the entry list. @param {any} model */
function photoStrip(model) {
  const photos = Array.isArray(model.photos) ? model.photos : [];
  if (!photos.length) return '';
  return `<section class="pg-photos-block ms-screen__photos" aria-label="Progress photos">
    <p class="pg-photos__head"><span>Photos</span><span>${photos.length}</span></p>
    <ul class="pg-photos">
      ${photos.map(photoTileHTML).join('')}
      <li class="pg-photo pg-photo--add">
        <button type="button" class="pg-photo__add" data-action="open-ms-sheet"
          aria-label="Add a picture to a new entry">
          <span class="pg-photo__plus" aria-hidden="true">+</span>
          <span class="pg-photo__addlabel">Add picture</span>
        </button>
      </li>
    </ul>
  </section>`;
}

/**
 * One measured site over the selected range. This is the read path the dated
 * entry list cannot provide: "what is my waist doing?" in one card.
 * @param {ReturnType<import('../measurement-explorer.js').buildMeasurementExplorer>|null} explorer
 */
function trendsHTML(explorer) {
  if (!explorer?.hasData || !explorer.site) return '';
  const site = explorer.site;
  const unit = explorer.unit;
  const percent = explorer.percent;
  const latest = explorer.latest;
  const valueText = latest ? `${latest.value.toFixed(1)}${percent ? '%' : ''}` : '—';
  const deltaText = explorer.delta == null
    ? (latest ? 'First reading' : 'No readings yet')
    : `${explorer.delta > 0 ? '+' : ''}${explorer.delta.toFixed(1)}${percent ? ' pp' : ` ${unit}`}`
      + (explorer.deltaDate ? ` since ${formatDayMonthShort(explorer.deltaDate, { year: true })}` : ' since the previous reading');
  const outside = explorer.latestOutsideRange && latest
    ? `<p class="ms-trend__outside">Latest · ${esc(formatDayMonthShort(latest.date, { year: true }))}, outside this range</p>`
    : '';

  const options = explorer.sites.map((option) => `<option value="${esc(option.key)}"${option.key === site.key ? ' selected' : ''}>${esc(option.label)}</option>`).join('');
  const picker = `<label class="ms-trend__pick">
    <span>Measurement</span>
    <select class="ms-trend__select" data-ms-site aria-label="Measurement site">${options}</select>
  </label>`;

  const body = explorer.emptyRange
    ? `<div class="ms-trend__empty">
        <p>No ${esc(site.label)} readings in this range.</p>
        <button type="button" class="ms-screen__tool" data-ms-range="all">Show all</button>
      </div>`
    : `<div class="bw-ms-trend ms-trend__chart">${siteTrendHTML(explorer.points, {
      unit,
      label: site.label,
      percent,
    })}</div>
    ${dataTableDisclosure(
      ['Date', percent ? `${site.label} (%)` : `${site.label} (${unit})`],
      [...explorer.points].reverse().map((point) => [
        formatDayMonthShort(point.date, { year: true }),
        String(roundDisplay(point.value)),
      ]),
      `${site.label} readings in the selected range`,
    )}`;

  return `<section class="ms-trend" aria-label="Measurement trend">
    <div class="ms-trend__head">
      <div class="ms-trend__headline">
        <span class="ms-trend__label">${esc(site.label)}</span>
        <strong class="ms-trend__value">${esc(valueText)}</strong>
      </div>
      <p class="ms-trend__delta">${esc(deltaText)}</p>
    </div>
    ${outside}
    ${picker}
    <div class="ms-trend__range">${rangeBar(RANGE_PRESETS, explorer.range?.id || 'all', {
      attribute: 'data-ms-range',
      label: 'Measurement range',
    })}</div>
    ${body}
  </section>`;
}

/** @param {any} model */
function libraryHTML(model) {
  const photos = Array.isArray(model.photos) ? model.photos : [];
  if (!photos.length) {
    return stateBlock('empty', {
      message: 'No progress photos yet. Add a picture to an entry and it will appear here.',
      action: { label: 'Add a picture', action: 'open-ms-sheet' },
    });
  }
  return `<ul class="ms-library" aria-label="Progress photo library">
    ${photos.map((photo) => `<li class="ms-library__item">
      <button type="button" class="ms-library__open" data-photo-view="${esc(photo.date)}"
        aria-label="${esc(`View the progress photo from ${formatDayMonthShort(photo.date, { year: true })}`)}">
        <img class="ms-library__img" data-photo-thumb="${esc(photo.id)}" alt="" />
        <span class="ms-library__date">${esc(formatDayMonthShort(photo.date, { year: true }))}</span>
      </button>
    </li>`).join('')}
  </ul>`;
}

/**
 * @param {ReturnType<import('../../metrics/measures.js').buildMeasuresModel>|null} model
 * @param {{ mode?: 'list'|'library', error?: string|null, hidden?: string[],
 *   explorer?: ReturnType<import('../measurement-explorer.js').buildMeasurementExplorer>|null }} [options]
 */
export function measuresHTML(model, options = {}) {
  const mode = options.mode === 'library' ? 'library' : 'list';
  // Privacy, not layout: the switch says photos are hidden when the phone is
  // passed around, so neither the strip nor the library may render here.
  const photosHidden = Array.isArray(options.hidden) && options.hidden.includes('bodyPhotos');
  const photoCount = Number(model?.photoCount) || 0;
  // "See All" only exists when there is a library to browse; the way back to
  // Entries always exists. A control that leads to an empty library is noise.
  const toggle = mode === 'library' || photoCount
    ? `<button type="button" class="ms-screen__seeall" data-measures-mode="${mode === 'library' ? 'list' : 'library'}">${mode === 'library' ? 'Entries' : 'See All'}</button>`
    : '';

  const head = `<header class="ms-screen__head">
    <div class="ms-screen__intro">
      <h2 class="section-header ms-screen__title">Measures</h2>
      <p class="ms-screen__sub">Weight, body fat, tape and photos — one dated entry.</p>
    </div>
    <div class="ms-screen__actions">
      ${toggle}
      <button type="button" class="ms-screen__add" data-action="open-ms-sheet"
        aria-label="Add a new entry">+</button>
    </div>
  </header>`;

  if (options.error) {
    return `${head}${stateBlock('error', {
      message: 'We could not load your measures.',
      detail: options.error,
      retry: { label: 'Try again' },
    })}`;
  }
  if (!model) return `${head}${stateBlock('loading', { height: 220 })}`;

  if (mode === 'library' && photosHidden) {
    return `${head}<div class="ms-screen__body"><div class="ms-screen__notice">
      <p>Progress photos are hidden. The <b>Progress photos</b> switch under Customize shows them again.</p>
      <button type="button" class="ms-screen__tool" data-action="open-customize" data-surface="progress">Customize</button>
    </div></div>`;
  }

  if (mode === 'library') {
    // The archive is the ONLY backup path for photo bytes (Android sets
    // allowBackup=false), so both directions live where the photos live. The
    // old Export sat on the Body band, which is range-scoped and can be
    // absent — and the import had no control at all, so a backup could be
    // taken and never restored.
    const tools = `<div class="ms-screen__tools">
      ${photoCount ? '<button type="button" class="ms-screen__tool" data-action="export-photos">Export photos</button>' : ''}
      <button type="button" class="ms-screen__tool" data-action="import-photos">Import photos</button>
    </div>`;
    return `${head}${tools}<div class="ms-screen__body">${libraryHTML(model)}</div>`;
  }

  if (!model.count) {
    return `${head}${stateBlock('empty', {
      message: 'No entries yet. Weight, tape, body fat and a photo can all live on one dated entry — every field is optional.',
      action: { label: 'Add an entry', action: 'open-ms-sheet' },
    })}`;
  }

  return `${head}
    <div class="ms-screen__body">
      ${trendsHTML(options.explorer || null)}
      ${photosHidden ? '' : photoStrip(model)}
      <ul class="ms-entries" aria-label="Measure entries, newest first">
        ${model.entries.map((entry) => entryRow(entry, model)).join('')}
      </ul>
    </div>`;
}

/**
 * Paint the Measures screen. Blob thumbnails hydrate after the HTML is in the
 * DOM: reading a photo is async and the screen must never wait on the disk.
 * @param {ReturnType<import('../../metrics/measures.js').buildMeasuresModel>|null} model
 * @param {{ mode?: 'list'|'library', error?: string|null, hidden?: string[],
 *   explorer?: ReturnType<import('../measurement-explorer.js').buildMeasurementExplorer>|null }} [options]
 */
export function renderMeasures(model, options = {}) {
  const host = typeof document !== 'undefined' ? document.getElementById('measuresScreen') : null;
  if (!host) return '';
  const html = measuresHTML(model, options);
  host.innerHTML = html;
  hydratePhotoThumbs(host);
  return html;
}
