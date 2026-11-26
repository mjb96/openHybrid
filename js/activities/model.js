// @ts-check
// =============================================================================
// ACTIVITY HISTORY MODEL
// One row per real activity. Strength and every run session remain independent,
// even when they share a calendar day.
// =============================================================================
import { isValidWorkingSet, setVolume } from '../set-utils.js';
import { runSessionsForDay } from '../state/run-sessions.js';
import { parseStrengthDurationSeconds } from '../strength/duration.js';
import { fromCanonicalWeight } from '../metrics/weight-unit.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KM_TO_MI = 0.621371;

function distanceLabel(km, unit) {
  const value = unit === 'mi' ? km * KM_TO_MI : km;
  return `${value.toFixed(2)} ${unit}`;
}

function paceLabel(pacePerKm, unit) {
  if (!pacePerKm) return '';
  const match = String(pacePerKm).match(/^(\d+):(\d{2})$/);
  if (!match) return `${pacePerKm} /${unit}`;
  const secsPerKm = Number(match[1]) * 60 + Number(match[2]);
  const secs = unit === 'mi' ? secsPerKm / KM_TO_MI : secsPerKm;
  return `${Math.floor(secs / 60)}:${String(Math.round(secs % 60)).padStart(2, '0')} /${unit}`;
}

function sourceLabel(source) {
  if (source === 'garmin' || source === 'fit') return 'Imported from Garmin/FIT';
  if (source === 'csv-import') return 'Imported from CSV';
  if (source === 'gps') return 'GPS activity';
  return 'Logged activity';
}

/** Coarse provenance used by the History source filter. */
function activityOrigin(source) {
  return source === 'csv-import' || source === 'fit' || source === 'garmin'
    ? 'imported' : 'app';
}

function dateStamp(localDate, startTs, fallbackIndex) {
  const explicit = Number(startTs);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  if (localDate) {
    const parsed = Date.parse(`${localDate}T12:00:00`);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallbackIndex;
}

function strengthSummary(week, day) {
  const lifts = week?.lifts?.[day] || {};
  let workingSets = 0;
  let totalReps = 0;
  let volume = 0;
  const exercises = [];
  for (const [name, sets] of Object.entries(lifts)) {
    if (!Array.isArray(sets)) continue;
    const done = sets.filter(isValidWorkingSet);
    if (!done.length) continue;
    exercises.push(name);
    workingSets += done.length;
    for (const set of done) {
      totalReps += parseInt(set.r, 10) || 0;
      volume += setVolume(set);
    }
  }
  return { exercises, workingSets, totalReps, volume: Math.round(volume) };
}

export function hasStrengthActivity(week, day) {
  const summary = strengthSummary(week, day);
  if (summary.workingSets > 0) return true;
  // Notes and a session RPE are metadata, not a strength session. The CSV
  // importer writes a workout note for cardio-only sessions too, which used to
  // create a phantom strength row with no metrics and no detail. Only real gym
  // evidence (duration/HR/calories/TE or FIT lap sets) counts.
  const stats = week?.gymStats?.[day] || {};
  return ['time', 'avgHR', 'maxHR', 'cals', 'trainingEffect', 'te', 'gymSets']
    .some((key) => stats[key] != null && String(stats[key]).trim() !== '');
}

function activityDateLabel(localDate) {
  if (!localDate) return 'Date unavailable';
  const parsed = new Date(`${localDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return localDate;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function runName(run) {
  if (String(run?.name || '').trim()) return String(run.name).trim();
  return run?.type === 'walk' ? 'Walk' : 'Run';
}

/**
 * Flatten persisted training into activity rows.
 * @param {any} state
 * @param {{ programLookup?: (id: string|null) => any }} [options]
 * @returns {Array<any>}
 */
export function buildActivityHistory(state, options = {}) {
  const programLookup = typeof options.programLookup === 'function' ? options.programLookup : null;
  const rows = [];
  let fallbackIndex = 0;
  for (const [weekKey, week] of Object.entries(state?.weeks || {})) {
    if (!week || typeof week !== 'object') continue;
    const days = new Set([
      ...DAY_ORDER,
      ...Object.keys(week.lifts || {}),
      ...Object.keys(week.runSessions || {}),
      ...Object.keys(week.runs || {}),
    ]);
    for (const day of days) {
      const localDate = week.dates?.[day] || null;
      const strengthActivity = hasStrengthActivity(week, day);
      if (strengthActivity) {
        const summary = strengthSummary(week, day);
        const duration = week.gymStats?.[day]?.time || '';
        // A programmed week has no stored sessionTitle. Resolve the same
        // program-day title Home shows instead of the useless generic fallback.
        const program = programLookup?.(week.programId || state?.activeProgramId || null);
        const programTitle = program?.days?.[day]?.title || null;
        rows.push({
          id: week.sessionId ? `strength:${week.sessionId}` : `strength:${encodeURIComponent(weekKey)}:${day}`,
          kind: 'strength', week: weekKey, day, sessionId: week.sessionId || null,
          activationId: week.activationId || null,
          localDate, dateLabel: activityDateLabel(localDate),
          timestamp: dateStamp(localDate, null, ++fallbackIndex),
          title: week.sessionTitle || programTitle || 'Strength Workout',
          source: week.source || null,
          origin: activityOrigin(week.source || null),
          provenance: week.source ? sourceLabel(week.source) : null,
          status: week.sessionStatus?.[day] || null,
          adherence: week.sessionSummary?.[day] || null,
          subtitle: summary.exercises.slice(0, 2).join(', ') + (summary.exercises.length > 2 ? ` +${summary.exercises.length - 2}` : ''),
          metrics: [
            summary.workingSets ? `${summary.workingSets} sets` : '',
            summary.volume
              ? `${Math.round(fromCanonicalWeight(summary.volume, state?.settings?.weightUnit) || 0).toLocaleString()} ${state?.settings?.weightUnit || 'kg'}`
              : '',
            duration,
          ].filter(Boolean),
          durationSeconds: parseStrengthDurationSeconds(duration),
          ...summary,
        });
      }

      const sessions = runSessionsForDay(week, day);
      const distanceUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
      // A cardio-only imported session names the activity (e.g. "Treadmill") on
      // the week, not on the generated run record. Use it only when there is no
      // strength row to own that title, so a hybrid day keeps "Run".
      const runTitle = !strengthActivity && sessions.length === 1 && String(week.sessionTitle || '').trim()
        ? week.sessionTitle
        : null;
      sessions.forEach((run, index) => {
        const dist = parseFloat(run.dist) || 0;
        const localRunDate = run.localDate || localDate;
        rows.push({
          id: `run:${run.sessionId || `${encodeURIComponent(weekKey)}:${day}:${index}`}`,
          kind: 'run', week: weekKey, day,
          sessionId: run.sessionId || null,
          activationId: run.activationId || week.activationId || null,
          localDate: localRunDate,
          dateLabel: activityDateLabel(localRunDate),
          timestamp: dateStamp(localRunDate, run.startTs || run.updatedTs, ++fallbackIndex),
          title: runTitle || runName(run),
          source: run.source || null,
          origin: activityOrigin(run.source || null),
          provenance: sourceLabel(run.source),
          subtitle: sourceLabel(run.source),
          metrics: [dist > 0 ? distanceLabel(dist, distanceUnit) : '', run.time || '', run.pace ? paceLabel(run.pace, distanceUnit) : ''].filter(Boolean),
          run: { ...run },
        });
      });
    }
  }
  return rows.sort((a, b) => b.timestamp - a.timestamp || b.id.localeCompare(a.id));
}

export function filterActivityHistory(rows, kind = 'all', localDate = null, activationId = null, origin = 'all') {
  return (rows || []).filter((row) =>
    (kind === 'all' || row.kind === kind)
    && (!localDate || row.localDate === localDate)
    && (!activationId || row.activationId === activationId)
    && (origin === 'all' || row.origin === origin)
  );
}

/** Case-insensitive search over the visible row fields. */
export function searchActivityHistory(rows, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return rows || [];
  return (rows || []).filter((row) => {
    const haystack = [
      row.title, row.subtitle, row.provenance, row.dateLabel,
      ...(row.metrics || []),
      ...(row.exercises || []),
      ...(row.run ? [row.run.name, row.run.type] : []),
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}

/** Resolve a date tap without choosing arbitrarily between same-day sessions. */
export function activityDestinationForDate(rows, localDate) {
  const matches = filterActivityHistory(rows, 'all', localDate);
  return {
    mode: matches.length === 1 ? 'detail' : 'list',
    activity: matches.length === 1 ? matches[0] : null,
    rows: matches,
  };
}
