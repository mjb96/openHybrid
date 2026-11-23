// @ts-check
// =============================================================================
// BODY METRICS MODEL (js/analytics/body-metrics.js)
//
// "Is my body responding?" — weight and its change over the SELECTED window,
// the tape sites the athlete measures, and any entered body-fat reading.
//
// Pure composition: `buildBodyweightModel` and `buildMeasurementModel` already
// own every definition (weigh-in normalisation, site trends, body-fat deltas).
// Nothing is re-derived here, and body fat is never estimated — it is an entered
// reading or it is absent.
// =============================================================================
import { buildBodyweightModel } from '../metrics/bodyweight.js';
import { buildMeasurementModel } from '../metrics/measurements.js';
import { inRange } from './ranges.js';
import { listPhotos } from '../photos/library.js';

const KEY_SITES = ['waist', 'chest', 'arm_l', 'thigh_l'];

/**
 * @param {any} state
 * @param {{ range: any }} options
 */
export function buildBodyMetricsModel(state, options = /** @type {any} */ ({})) {
  const range = options.range;
  if (!range) throw new Error('buildBodyMetricsModel: range is required');

  const endMs = new Date(`${range.endISO}T12:00:00`).getTime();
  const rangeDays = range.days ?? 0;
  const weight = buildBodyweightModel(state, {
    now: Number.isFinite(endMs) ? endMs : Date.now(),
    rangeDays,
  });
  const measurements = buildMeasurementModel(state, { recentCount: 4 });

  const points = Array.isArray(weight.points) ? weight.points : [];
  const latestWeight = weight.latest?.weight ?? null;
  const firstWeight = points.length ? points[0].weight : null;
  const change = latestWeight != null && firstWeight != null && points.length >= 2
    ? Math.round((latestWeight - firstWeight) * 10) / 10
    : null;

  const sites = measurements.tracked
    .map((site) => ({
      key: site.key,
      label: site.label,
      legacy: !!site.legacy,
      latestCm: site.latest?.cm ?? null,
      latestDate: site.latest?.date ?? null,
      previousDate: site.previous?.date ?? null,
      deltaCm: site.delta ?? null,
    }))
    .sort((a, b) => {
      // The four the band shows first, then everything else alphabetically.
      const ai = KEY_SITES.indexOf(a.key);
      const bi = KEY_SITES.indexOf(b.key);
      if (ai !== -1 || bi !== -1) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.label.localeCompare(b.label);
    });

  const photosInWindow = listPhotos(state).filter((photo) => inRange(photo.date, range));

  const bodyFat = measurements.bodyFat?.latest
    ? {
      // Body-fat points carry `value` (a percentage), not `cm` — the tape
      // sites use `cm`. Reading the wrong field silently hid the reading.
      latestPct: measurements.bodyFat.latest.value,
      date: measurements.bodyFat.latest.date,
      deltaPp: measurements.bodyFat.delta ?? null,
      deltaDate: measurements.bodyFat.previous?.date ?? null,
    }
    : null;

  return {
    range,
    unit: weight.unit,
    measurementUnit: measurements.unit,
    weight: {
      latest: latestWeight,
      date: weight.latest?.date ?? null,
      change,
      points,
      targetWeight: weight.targetWeight,
    },
    keySites: sites.slice(0, 4),
    sites,
    siteCount: sites.length,
    bodyFat,
    // Scoped like every other number in this band: a photo from 2024 must not
    // appear under a heading that names the last 30 days.
    photos: photosInWindow,
    hasData: latestWeight != null || sites.length > 0 || bodyFat != null || photosInWindow.length > 0,
  };
}
