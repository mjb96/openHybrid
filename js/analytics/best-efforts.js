// @ts-check
// =============================================================================
// BEST EFFORTS (H6a, R5)
//
// Fastest 1 km, 1 mi, 5 km and 10 km from the splits a run actually recorded.
// This is a READ-ONLY analytics model over data the app already stores — it
// adds no live running feature and no new stored field.
//
// Rules:
//   - runs only (walks never produce a best effort);
//   - a distance appears only when a run covered it;
//   - a run without splits produces nothing, and says so through the model;
//   - windows are contiguous and lap-aligned (a GPS 1 km lap is exact; a longer
//     target is the fastest contiguous set of laps covering it, interpolated on
//     the final lap). That is the honest claim for lap data.
//
// Units: a live GPS split stores `dist` in km (1.0 per km). A FIT import stores
// Garmin's `total_distance`, which is metres. `run.source` decides the scale.
// =============================================================================
import { collectRunningHistory } from './running-detail.js';

export const BEST_EFFORT_TARGETS = Object.freeze([
  { id: '1k', label: '1 km', km: 1 },
  { id: '1mi', label: '1 mi', km: 1.609344 },
  { id: '5k', label: '5 km', km: 5 },
  { id: '10k', label: '10 km', km: 10 },
]);

export const RACE_TARGETS = Object.freeze([
  { id: '5k', label: '5 km', km: 5 },
  { id: '10k', label: '10 km', km: 10 },
  { id: 'half', label: 'Half marathon', km: 21.0975 },
  { id: 'marathon', label: 'Marathon', km: 42.195 },
]);

/** Riegel's endurance exponent — the standard, and always labelled an estimate. */
export const RIEGEL_EXPONENT = 1.06;
const EPSILON = 1e-9;

/** @param {any} run */
function splitScale(run) {
  const source = String(run?.source || '').toLowerCase();
  // Garmin FIT laps arrive in metres; live GPS and manual splits are km.
  return source === 'fit' || source === 'fit-import' ? 1000 : 1;
}

/**
 * Cumulative (distance km, time sec) points for a run's splits.
 * @param {any} run
 * @returns {Array<{ d: number, t: number }>}
 */
export function splitPoints(run) {
  const splits = Array.isArray(run?.splits) ? run.splits : [];
  const scale = splitScale(run);
  /** @type {Array<{ d: number, t: number }>} */
  const points = [{ d: 0, t: 0 }];
  let distance = 0;
  let time = 0;
  for (const split of splits) {
    const distKm = (Number(split?.dist) || 0) / scale;
    const seconds = Number(split?.time) || 0;
    if (!(distKm > 0) || !(seconds > 0)) continue;
    distance += distKm;
    time += seconds;
    points.push({ d: distance, t: time });
  }
  return points;
}

/**
 * Fastest contiguous window of at least `targetKm` within a run's splits,
 * interpolating the final partial lap at constant pace.
 * @param {any} run
 * @param {number} targetKm
 * @returns {null | { seconds: number, startKm: number, endKm: number }}
 */
export function bestEffortForRun(run, targetKm) {
  const target = Number(targetKm) || 0;
  if (!(target > 0)) return null;
  const runKm = Number(run?.distanceKm ?? run?.dist) || 0;
  if (runKm + EPSILON < target) return null;
  const points = splitPoints(run);
  if (points.length < 2) return null;
  const totalKm = points[points.length - 1].d;
  if (totalKm + EPSILON < target) return null;

  let best = null;
  for (let start = 0; start < points.length - 1; start += 1) {
    const from = points[start];
    if (from.d + target > totalKm + EPSILON) break;
    // Walk forward until the target distance is covered.
    let cursor = start + 1;
    while (cursor < points.length && points[cursor].d - from.d + EPSILON < target) cursor += 1;
    if (cursor >= points.length) break;
    const segmentStart = points[cursor - 1];
    const segmentEnd = points[cursor];
    const segmentKm = segmentEnd.d - segmentStart.d;
    const segmentSec = segmentEnd.t - segmentStart.t;
    const needed = target - (segmentStart.d - from.d);
    const fraction = segmentKm > 0 ? Math.min(1, Math.max(0, needed / segmentKm)) : 0;
    const seconds = (segmentStart.t - from.t) + fraction * segmentSec;
    if (!(seconds > 0)) continue;
    if (!best || seconds < best.seconds) {
      best = { seconds, startKm: from.d, endKm: from.d + target };
    }
  }
  return best;
}

/** @param {number} seconds */
export function formatEffortTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = hours ? String(minutes).padStart(2, '0') : String(minutes);
  return hours
    ? `${hours}:${mm}:${String(secs).padStart(2, '0')}`
    : `${minutes}:${String(secs).padStart(2, '0')}`;
}

/** @param {number} seconds @param {number} km */
export function formatEffortPace(seconds, km) {
  if (!(seconds > 0) || !(km > 0)) return '';
  const perKm = seconds / km;
  const total = Math.round(perKm);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')} /km`;
}

/**
 * @param {any} state
 * @param {{ todayISO?: string }} [options]
 */
export function buildBestEfforts(state, { todayISO } = {}) {
  const history = collectRunningHistory(state, { today: todayISO });
  const runs = history.records.filter((record) => record.type === 'run');
  const withSplits = runs.filter((record) => Array.isArray(record.splits) && record.splits.length > 0);

  const targets = BEST_EFFORT_TARGETS.map((target) => {
    /** @type {null | { seconds:number, date:string, sessionId:string|null, activityId:string }} */
    let best = null;
    for (const run of withSplits) {
      const effort = bestEffortForRun(run, target.km);
      if (!effort) continue;
      if (!best || effort.seconds < best.seconds) {
        best = {
          seconds: effort.seconds,
          date: run.date,
          sessionId: run.sessionId || null,
          activityId: run.activityId,
        };
      }
    }
    return {
      ...target,
      best,
      timeLabel: best ? formatEffortTime(best.seconds) : '—',
      paceLabel: best ? formatEffortPace(best.seconds, target.km) : '',
    };
  });

  return {
    targets,
    runs: runs.length,
    runsWithSplits: withSplits.length,
    hasData: targets.some((target) => !!target.best),
    note: !runs.length
      ? 'Log a run with GPS splits to see best efforts.'
      : !withSplits.length
        ? 'No run has recorded splits yet — best efforts need a GPS or FIT run.'
        : '',
  };
}

/**
 * Race-time estimates from measured best efforts. Riegel is used only from the
 * SHORTEST measured effort of at least 3 km, always labelled an estimate; with
 * no such effort the block is hidden rather than guessed.
 * @param {ReturnType<typeof buildBestEfforts>} efforts
 */
export function buildRaceEstimates(efforts) {
  const measured = (efforts?.targets || []).filter((target) => target.best && target.km >= 3);
  if (!measured.length) return { hasData: false, basis: null, rows: [] };
  const basis = measured[0];
  const rows = RACE_TARGETS.map((race) => {
    const isMeasured = Math.abs(race.km - basis.km) < EPSILON;
    const seconds = isMeasured
      ? basis.best.seconds
      : basis.best.seconds * Math.pow(race.km / basis.km, RIEGEL_EXPONENT);
    return {
      ...race,
      seconds,
      measured: isMeasured,
      timeLabel: formatEffortTime(seconds),
      paceLabel: formatEffortPace(seconds, race.km),
    };
  });
  return {
    hasData: true,
    basis: {
      id: basis.id,
      label: basis.label,
      date: basis.best.date,
      timeLabel: basis.timeLabel,
    },
    rows,
  };
}
