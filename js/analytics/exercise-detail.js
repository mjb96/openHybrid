// @ts-check
// =============================================================================
// EXERCISE DETAIL — pure model behind the exercise drilldown.
//
// One same-exercise history, resolved by the catalogue's explicit aliases, with
// the session's own shape preserved: a rep set reports its best e1RM, a hold its
// longest time, a carry its longest distance. PRs compare against every earlier
// session (not only the visible range), while the visible series is range-bound.
// =============================================================================
import { exercisePerformanceHistory } from '../workout/exercise-history.js';
import { estimatedE1rmForSet } from '../strength/e1rm.js';
import {
  bestRecordForSession, isRecord, mergeRecordBests, recordCandidates,
} from '../strength/records.js';
import { addDaysISO, localDayKey } from './weekly-aggregate.js';
import { daysBetween } from '../dates.js';
import { buildSetRecords } from '../strength/set-records.js';
import { normalizeWeighIns } from '../metrics/bodyweight.js';
import { resolveExercise } from '../exercises/catalog.js';
import {
  SET_MODE, formatDistance, formatDuration, isRepSet, setModeOf, setVolume,
} from '../set-utils.js';
import { fromCanonicalWeight } from '../metrics/weight-unit.js';

const RANGE_DAYS = { '4w': 28, '12w': 84, '6m': 183, '1y': 365, all: null };
const fmtd = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

function shapeOfSets(sets) {
  return (sets || []).every((set) => !isRepSet(set)) ? setModeOf((sets || [])[0]) : SET_MODE.REPS;
}

function topForShape(shape, sets, exerciseName, unit) {
  let top = null;
  let e1rm = 0;
  for (const set of sets || []) {
    // ST6: this is a VIEW model, so the top set is assembled in display units.
    // The PR baseline and record detection stay canonical (separate path).
    const weight = fromCanonicalWeight(parseFloat(set?.w) || 0, unit) || 0;
    const reps = parseInt(set?.r, 10) || 0;
    const sec = Number(set?.sec) || 0;
    const dist = Number(set?.dist) || 0;
    const estimate = fromCanonicalWeight(estimatedE1rmForSet(exerciseName, set), unit) || 0;
    if (estimate > e1rm) e1rm = estimate;
    const candidate = shape === SET_MODE.TIME
      ? { value: sec, weight, reps, sec, dist, set }
      : shape === SET_MODE.DISTANCE
        ? { value: dist, weight, reps, sec, dist, set }
        : { value: estimate || weight || reps, weight, reps, sec, dist, set };
    if (!candidate.value) continue;
    if (!top || candidate.value > top.value
      || (candidate.value === top.value && candidate.weight > top.weight)) {
      top = candidate;
    }
  }
  if (!top) return null;
  const text = shape === SET_MODE.TIME
    ? `${top.weight > 0 ? `${top.weight}${unit} × ` : ''}${formatDuration(top.sec)}`
    : shape === SET_MODE.DISTANCE
      ? `${top.weight > 0 ? `${top.weight}${unit} × ` : ''}${formatDistance(top.dist)}m`
      : top.weight > 0 ? `${top.weight}${unit} × ${top.reps}` : `${top.reps} reps`;
  return { ...top, e1rm, text };
}

/**
 * Build the exercise-detail model.
 *
 * @param {any} state
 * @param {string} exerciseName
 * @param {{ range?: '4w'|'12w'|'6m'|'1y'|'all', now?: Date }} [opts]
 */
export function buildExerciseDetailModel(state, exerciseName, opts = {}) {
  const range = ['4w', '12w', '6m', '1y', 'all'].includes(String(opts.range)) ? opts.range : '12w';
  const today = localDayKey(opts.now || new Date());
  const span = RANGE_DAYS[range];
  const cutoff = span ? addDaysISO(today, -span) : null;
  const unit = state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  const history = exercisePerformanceHistory(state, exerciseName)
    .slice()
    .reverse(); // oldest → newest for PR baselines

  // "Heaviest set at N reps" is a different question from a PR, so it has its
  // own module (§7) rather than a second rule living here.
  const setRecords = buildSetRecords(
    history.map((row) => ({ date: row.date, workingSets: row.workingSets || [] })),
    exerciseName,
  );

  // The PR baseline walks the SAME history oldest → newest through the shared
  // records model, so hold/carry/rep sessions are compared by their own shape
  // and an e1RM uses the shared epsilon. Assigning the old per-shape maxima here
  // was a second rule that disagreed with the cockpit.
  const priorRecords = { e1rm: null, hold: null, carry: null, reps: [] };
  const all = [];
  for (const row of history) {
    const sets = Array.isArray(row.workingSets) ? row.workingSets : [];
    if (!sets.length) continue;
    const shape = shapeOfSets(sets);
    const top = topForShape(shape, sets, exerciseName, unit);
    if (!top) continue;
    const volume = sets.reduce((sum, set) => sum + setVolume(set), 0);
    const reps = sets.reduce((sum, set) => sum + (parseInt(set?.r, 10) || 0), 0);
    const seconds = sets.reduce((sum, set) => sum + (Number(set?.sec) || 0), 0);
    const metres = sets.reduce((sum, set) => sum + (Number(set?.dist) || 0), 0);
    const sessionRecords = bestRecordForSession(exerciseName, sets);
    const isPr = recordCandidates(sessionRecords)
      .some((candidate) => isRecord(candidate.kind, candidate, priorRecords[candidate.kind]));
    mergeRecordBests(priorRecords, sessionRecords);
    all.push({
      date: row.date,
      dateLabel: fmtd(row.date),
      activityId: row.activityId,
      shape,
      sets: sets.length,
      reps,
      volume: Math.round(fromCanonicalWeight(volume, unit) || 0),
      holdSeconds: Math.round(seconds),
      distanceM: Math.round(metres),
      top,
      e1rm: Math.round(top.e1rm),
      isPr,
    });
  }

  const latestShape = all.length ? all[all.length - 1].shape : SET_MODE.REPS;
  const visible = all
    .filter((row) => !cutoff || row.date >= cutoff)
    .slice()
    .reverse(); // newest first for the evidence list

  const best = all
    .filter((row) => row.shape === latestShape)
    .reduce((winner, row) => (!winner || row.top.value > winner.top.value ? row : winner), null);
  const latest = visible[0] || null;
  const previous = visible[1] || null;

  const totals = visible.reduce((sum, row) => ({
    sessions: sum.sessions + 1,
    sets: sum.sets + row.sets,
    reps: sum.reps + row.reps,
    volume: sum.volume + row.volume,
    holdSeconds: sum.holdSeconds + row.holdSeconds,
    distanceM: sum.distanceM + row.distanceM,
  }), { sessions: 0, sets: 0, reps: 0, volume: 0, holdSeconds: 0, distanceM: 0 });

  let change = null;
  if (latest && previous) {
    const useE1rm = latestShape === SET_MODE.REPS && (latest.e1rm > 0 || previous.e1rm > 0);
    const delta = latestShape === SET_MODE.TIME
      ? latest.top.sec - previous.top.sec
      : latestShape === SET_MODE.DISTANCE
        ? latest.top.dist - previous.top.dist
        : useE1rm ? latest.e1rm - previous.e1rm : latest.top.reps - previous.top.reps;
    if (delta !== 0) {
      const direction = delta > 0 ? 'up' : 'down';
      const text = latestShape === SET_MODE.TIME
        ? `${delta > 0 ? '+' : ''}${Math.round(delta)}s hold`
        : latestShape === SET_MODE.DISTANCE
          ? `${delta > 0 ? '+' : ''}${Math.round(delta)}m carry`
          : useE1rm ? `${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10} ${unit} e1RM`
            : `${delta > 0 ? '+' : ''}${Math.round(delta)} reps`;
      change = { direction, delta, text };
    } else {
      change = { direction: 'same', delta: 0, text: 'matched last session' };
    }
  }

  const chartKind = latestShape === SET_MODE.TIME ? 'time'
    : latestShape === SET_MODE.DISTANCE ? 'distance'
      : visible.some((row) => row.e1rm > 0) ? 'e1rm'
        : visible.some((row) => row.top.weight > 0) ? 'weight' : 'reps';
  const series = visible
    .slice()
    .reverse()
    .map((row) => ({
      date: row.date,
      dateLabel: row.dateLabel,
      value: latestShape === SET_MODE.TIME ? row.top.sec
        : latestShape === SET_MODE.DISTANCE ? row.top.dist
        : (row.e1rm || row.top.weight || row.top.reps),
      isPr: row.isPr,
    }));

  // A3: rate of change for the e1RM trend. First→latest over the selected span,
  // reported per week; never fabricated for a single point or for holds/carries.
  let rate = null;
  if (chartKind === 'e1rm' && series.length >= 2) {
    const firstPoint = series[0];
    const lastPoint = series[series.length - 1];
    const days = daysBetween(firstPoint.date, lastPoint.date);
    const weeks = days != null ? days / 7 : null;
    if (weeks != null && weeks >= 0.5 && lastPoint.value > 0 && firstPoint.value > 0) {
      const perWeek = (lastPoint.value - firstPoint.value) / weeks;
      const rounded = Math.round(perWeek * 10) / 10;
      rate = {
        perWeek: rounded,
        weeks: Math.max(1, Math.round(weeks)),
        direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'same',
        text: rounded === 0 ? 'steady' : `${rounded > 0 ? '+' : ''}${rounded} ${unit}/week`,
      };
    }
  }

  // A8: relative strength for the big three, only from a RECENT dated weigh-in.
  // The e1RM is an estimate, and the ratio inherits that; an old or undated
  // bodyweight would make the number a false claim.
  const BIG3 = new Set(['back_squat', 'barbell_bench_press', 'conventional_deadlift']);
  let relative = null;
  if (BIG3.has(resolveExercise(exerciseName)?.id) && latest?.e1rm > 0) {
    const weighIns = normalizeWeighIns(state?.bodyWeightLog);
    const weighIn = weighIns[weighIns.length - 1];
    const age = weighIn ? daysBetween(weighIn.date, today) : null;
    if (weighIn && age != null && age >= 0 && age <= 30) {
      // The ratio is unitless: both sides are display values.
      const bodyDisplay = fromCanonicalWeight(weighIn.weight, unit) || 0;
      relative = {
        ratio: bodyDisplay > 0 ? Math.round((latest.e1rm / bodyDisplay) * 100) / 100 : null,
        weight: bodyDisplay,
        date: weighIn.date,
      };
    }
  }

  const bestText = best
    ? latestShape === SET_MODE.TIME ? `${best.top.weight > 0 ? `${best.top.weight}${unit} · ` : ''}${formatDuration(best.top.sec)}`
      : latestShape === SET_MODE.DISTANCE ? `${best.top.weight > 0 ? `${best.top.weight}${unit} · ` : ''}${formatDistance(best.top.dist)}m`
      : best.top.text
    : '—';

  return {
    name: exerciseName,
    shape: latestShape,
    unit,
    hasData: visible.length > 0,
    sessions: visible,
    series,
    best,
    bestText,
    latest,
    previous,
    change,
    rate,
    relative,
    totals,
    // Set records come from the canonical records model; the drilldown prints
    // their loads in the athlete's unit.
    setRecords: Array.isArray(setRecords)
      ? setRecords.map((record) => ({ ...record, weight: fromCanonicalWeight(record.weight, unit) }))
      : setRecords,
    chart: {
      kind: chartKind,
      unit: latestShape === SET_MODE.TIME ? 'seconds'
        : latestShape === SET_MODE.DISTANCE ? 'metres'
          : visible.some((row) => row.e1rm > 0 || row.top.weight > 0) ? unit : 'reps',
    },
  };
}
