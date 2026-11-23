// @ts-check
// =============================================================================
// BATCH FIT IMPORT (js/portability/import-fit.js)
//
// Garmin, Wahoo, Coros and Zwift all export .FIT activity files. The cockpit
// already imports one file into the current slot; this module turns a batch of
// parsed files into dated archived activities so a new phone can be populated
// without opening each slot first.
//
// Pure identity and mapping live here. The Settings handler owns file reading,
// the lazy parser and IndexedDB route writes.
// =============================================================================
import { dateKey } from '../dates.js';
import { extractSessionStats } from '../garmin.js';
import { findImportedRunSession, upsertRunSession } from '../state/run-sessions.js';

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function dayFor(localDate) {
  const [y, m, d] = String(localDate).split('-').map(Number);
  return DAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
}

function finiteTs(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function runStats(stats) {
  return {
    avgHR: stats?.avgHR != null ? Math.round(stats.avgHR) : '',
    maxHR: stats?.maxHR != null ? Math.round(stats.maxHR) : '',
    elev: stats?.elevation != null ? Math.round(stats.elevation) : '',
    descent: stats?.descent != null ? Math.round(stats.descent) : '',
    cals: stats?.calories != null ? Math.round(stats.calories) : '',
    avgCadence: stats?.avgCadence != null ? Math.round(stats.avgCadence) : '',
    trainingEffect: stats?.trainingEffect != null ? stats.trainingEffect : '',
    anaerobicTE: stats?.anaerobicTE != null ? stats.anaerobicTE : '',
    hrZones: stats?.hrZones || null,
    splits: stats?.splits || null,
    notes: '',
  };
}

/**
 * A parsed FIT document → one import candidate, or null when it has no usable
 * dated activity. Runs are tried first (distance + time); strength files fall
 * back to a time/HR-only gym activity because FIT usually carries no exercise
 * names. Guessing names from a category would corrupt the strength history.
 *
 * @param {any} garminData
 * @returns {null | {
 *   kind:'run'|'gym', localDate:string, day:string, startTs:number,
 *   sessionId:string, weekKey:string, run?:any, gym?:any,
 *   coordinates?:number[][], distanceKm?:number
 * }}
 */
/**
 * A FIT session carries the sport it was recorded as. Walking and hiking files
 * are real activity, but they are not RUNS: importing one as a run would put
 * walked kilometres into run distance and hand a walk a running pace.
 *
 * Defensive on purpose — an unknown shape returns false, which preserves the
 * previous behaviour rather than guessing.
 * @param {any} garminData
 */
export function isWalkingSport(garminData) {
  if (!garminData || typeof garminData !== 'object') return false;
  const sessions = Array.isArray(garminData.sessions) ? garminData.sessions : [];
  const sport = String(
    sessions[0]?.sport
    || garminData.sport
    || garminData.activity?.sport
    || '',
  ).toLowerCase();
  return /walk|hik/.test(sport);
}

export function buildFitCandidate(garminData) {
  if (!garminData || typeof garminData !== 'object') return null;

  const run = extractSessionStats(garminData, true);
  const runStart = run.ok ? finiteTs(run.stats.startTs) : null;
  if (run.ok && run.distanceKm > 0 && runStart) {
    const localDate = dateKey(new Date(runStart));
    const sessionId = `run_fit_${runStart.toString(36)}`;
    return {
      kind: 'run',
      localDate,
      day: dayFor(localDate),
      startTs: runStart,
      sessionId,
      weekKey: `arch:fit:${runStart}`,
      distanceKm: run.distanceKm,
      coordinates: run.coordinates,
      run: {
        dist: run.distanceKm.toFixed(2),
        time: run.time,
        // Preserved so the import lands as the activity it actually was.
        type: isWalkingSport(garminData) ? 'walk' : 'run',
        rpe: '',
        ...runStats(run.stats),
      },
    };
  }

  const gym = extractSessionStats(garminData, false);
  const gymStart = gym.ok ? finiteTs(gym.stats.startTs) : null;
  if (!gym.ok || !gymStart) return null;
  if (gym.time === '0:00' && !(gym.stats.calories > 0)) return null;
  const localDate = dateKey(new Date(gymStart));
  const sessionId = `gym_fit_${gymStart.toString(36)}`;
  return {
    kind: 'gym',
    localDate,
    day: dayFor(localDate),
    startTs: gymStart,
    sessionId,
    weekKey: `arch:fitgym:${gymStart}`,
    gym: {
      time: gym.time,
      ...runStats(gym.stats),
      gymSets: gym.stats.gymSets || null,
    },
  };
}

function baseWeek(candidate) {
  return {
    activationId: 'imported',
    programId: 'imported',
    sessionId: candidate.sessionId,
    sessionTitle: candidate.kind === 'run' ? 'Imported Run' : 'Imported Strength Activity',
    source: 'fit-import',
    sourceActivityId: `fit:${candidate.startTs}`,
    dates: { [candidate.day]: candidate.localDate },
    lifts: { [candidate.day]: {} },
    liftOrder: { [candidate.day]: [] },
    liftMeta: { [candidate.day]: {} },
    notes: { [candidate.day]: '' },
    gymRpe: { [candidate.day]: '' },
    bodyWeight: {},
    gymStats: { [candidate.day]: {} },
    sessionStatus: { [candidate.day]: 'finished' },
    runs: {},
    runSessions: {},
  };
}

/**
 * Map dated candidates into archived weeks. Re-importing the same activity is
 * refused by its start timestamp, the same natural key the cockpit uses.
 *
 * @param {any} state
 * @param {Array<ReturnType<typeof buildFitCandidate>>} candidates
 */
export function applyFitImports(state, candidates) {
  if (!state || typeof state !== 'object') return { added: [], skipped: [] };
  if (!state.weeks || typeof state.weeks !== 'object') state.weeks = {};
  const added = [];
  const skipped = [];

  for (const candidate of candidates || []) {
    if (!candidate) continue;
    if (state.weeks[candidate.weekKey]) { skipped.push(candidate); continue; }

    if (candidate.kind === 'run') {
      if (findImportedRunSession(state, candidate.startTs, 'fit')) {
        skipped.push(candidate);
        continue;
      }
      const week = baseWeek(candidate);
      upsertRunSession(week, candidate.day, candidate.run, {
        sessionId: candidate.sessionId,
        source: 'fit',
        localDate: candidate.localDate,
        startTs: candidate.startTs,
      });
      state.weeks[candidate.weekKey] = week;
      added.push({ ...candidate, week });
      continue;
    }

    if (candidate.kind === 'gym') {
      const week = baseWeek(candidate);
      week.gymStats[candidate.day] = candidate.gym;
      state.weeks[candidate.weekKey] = week;
      added.push({ ...candidate, week });
    }
  }

  return { added, skipped };
}
