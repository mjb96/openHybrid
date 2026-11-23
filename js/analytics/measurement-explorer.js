// @ts-check
// =============================================================================
// MEASUREMENT EXPLORER (js/analytics/measurement-explorer.js)
//
// "What is my waist doing?" — one measured site, one date range, one chart.
// Progress → Body is the range-scoped summary; Measures is the dated record.
// This model is the READ path between them: it takes the same
// `buildMeasurementModel` the Bodyweight card and the Body band already use and
// filters ONE site's points to the selected range.
//
// Nothing is re-derived. Tape changes stay "since the previous reading" (the
// sparse-history rule the Body band now states), and body fat keeps its
// percentage scale and percentage-point delta. Values leave this module in the
// athlete's DISPLAY unit, because the chart and the table must agree; storage
// stays canonical centimetres.
// =============================================================================
import { buildMeasurementModel, cmToDisplay, roundDisplay } from '../metrics/measurements.js';
import { inRange, isRangeId, resolveRange } from './ranges.js';
import { todayKey } from '../dates.js';

export const BODY_FAT_KEY = 'bodyFat';

/**
 * The explorer opens on all of the athlete's history, then lets them zoom.
 * A leaf is not the hub: tape is sparse, and a 30D default can be empty even
 * when the athlete has a year of readings.
 */
export const DEFAULT_EXPLORER_RANGE_ID = 'all';

/** @param {number} cm @param {'cm'|'in'|string} unit */
function displayValue(cm, unit) {
  return roundDisplay(cmToDisplay(cm, unit));
}

/**
 * @param {any} site
 * @param {'cm'|'in'} unit
 */
function tapeOption(site, unit) {
  const points = (site.points || []).map((/** @type {any} */ point) => ({
    date: point.date,
    value: displayValue(point.cm, unit),
  }));
  const latest = site.latest
    ? { date: site.latest.date, value: displayValue(site.latest.cm, unit) }
    : null;
  const previous = site.previous
    ? { date: site.previous.date, value: displayValue(site.previous.cm, unit) }
    : null;
  return {
    key: site.key,
    label: site.label,
    legacy: Boolean(site.legacy),
    unit,
    percent: false,
    points,
    latest,
    previous,
    // Compute from the DISPLAY values so the headline, the chart and the table
    // cannot disagree after rounding (especially at inches).
    delta: latest && previous ? roundDisplay(latest.value - previous.value) : null,
    deltaDate: previous?.date ?? null,
  };
}

/**
 * @param {ReturnType<typeof buildMeasurementModel>} model
 */
function bodyFatOption(model) {
  const trend = model.bodyFat;
  if (!trend?.latest) return null;
  const points = trend.points.map((/** @type {any} */ point) => ({
    date: point.date,
    value: roundDisplay(point.value),
  }));
  const latest = { date: trend.latest.date, value: roundDisplay(trend.latest.value) };
  const previous = trend.previous
    ? { date: trend.previous.date, value: roundDisplay(trend.previous.value) }
    : null;
  return {
    key: BODY_FAT_KEY,
    label: 'Body fat',
    legacy: false,
    unit: '%',
    percent: true,
    points,
    latest,
    previous,
    delta: latest && previous ? roundDisplay(latest.value - previous.value) : null,
    deltaDate: previous?.date ?? null,
  };
}

/**
 * @param {any} state
 * @param {{ siteKey?: string|null, rangeId?: string|null, todayISO?: string|null }} [options]
 */
export function buildMeasurementExplorer(state, options = {}) {
  const model = buildMeasurementModel(state);
  /** @type {Array<any>} */
  const sites = model.tracked.map((site) => tapeOption(site, model.unit));
  const bodyFat = bodyFatOption(model);
  if (bodyFat) sites.push(bodyFat);

  const requestedRange = isRangeId(options.rangeId) ? options.rangeId : DEFAULT_EXPLORER_RANGE_ID;
  const today = options.todayISO || todayKey();
  const range = resolveRange(requestedRange, today, {
    earliestISO: model.entries[0]?.date || null,
  }) || resolveRange(DEFAULT_EXPLORER_RANGE_ID, todayKey(), {
    earliestISO: model.entries[0]?.date || null,
  });

  const requestedSite = options.siteKey
    ? sites.find((site) => site.key === options.siteKey)
    : null;
  const selected = requestedSite
    || sites.find((site) => site.key === 'waist')
    || sites[0]
    || null;

  const points = selected && range
    ? selected.points.filter((point) => inRange(point.date, range))
    : [];
  const latestOutsideRange = Boolean(
    selected?.latest && range && (
      (range.startISO && selected.latest.date < range.startISO)
      || selected.latest.date > range.endISO
    ),
  );

  return {
    range,
    sites,
    site: selected,
    points,
    unit: selected?.unit || model.unit,
    percent: Boolean(selected?.percent),
    latest: selected?.latest || null,
    previous: selected?.previous || null,
    delta: selected?.delta ?? null,
    deltaDate: selected?.deltaDate || null,
    latestOutsideRange,
    emptyRange: Boolean(selected?.latest && points.length === 0),
    hasData: Boolean(selected),
  };
}
