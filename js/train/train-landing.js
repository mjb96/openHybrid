// @ts-check
// =============================================================================
// TRAIN LANDING MODEL (js/train/train-landing.js) — roadmap Phase 0/2
//
// Train is a SESSION PREVIEW, not a second Home. The card carries the actual
// exercises and targets so the athlete can see the work before starting; Start
// then goes straight into the cockpit (there is no separate preview route).
//
// Today comes from `buildTodayCardModel`, the SAME model Home renders, so Train
// and Home can never disagree about what today's session is or whether it is
// finished. The week rail uses `buildHomeWeekStrip`, so the two surfaces read
// the same week.
//
// Quick start is deliberately only the UNPLANNED activities: Run / Walk / Fast.
// Today's session is the primary action; a different or empty session is
// "Choose another workout". There is no second "Workout" entry.
//
// PURE. No DOM, no state mutation.
// =============================================================================

import { buildTodayCardModel } from '../home/today-card.js';
import { buildHomeWeekStrip } from '../home/week-strip.js';
import { buildActivityHistory } from '../activities/model.js';
import { moduleEnabled } from '../modules.js';
import { localDayKey } from '../dates.js';
import { scheduledDayForDate } from '../schedule/week.js';
import { sessionExercisePreview } from '../workout/session-preview.js';

export { sessionExercisePreview };

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * The unplanned activities a user can start from Train. Today's session is the
 * primary action; a different or empty workout is the secondary picker.
 */
export const QUICK_START_ACTIONS = Object.freeze([
  { id: 'run', action: 'qs-run', label: 'Run', icon: 'run', hint: 'Track a run with GPS' },
  { id: 'walk', action: 'qs-walk', label: 'Walk', icon: 'activity', hint: 'Track a walk' },
  { id: 'fast', action: 'qs-fast', label: 'Fast', icon: 'clock', hint: 'Start a fasting timer' },
]);

const KIND_LABEL = { strength: 'Strength', run: 'Run', walk: 'Walk', ride: 'Ride' };

/**
 * The most recent dated activities, newest first. Undated legacy records are
 * excluded rather than guessed onto a day — same rule as every calendar
 * surface, so Train's "recent" list cannot show a date the rest of the app
 * disagrees with.
 * @param {any} state
 * @param {number} limit
 */
export function recentActivities(state, limit = 3) {
  const rows = buildActivityHistory(state) || [];
  return rows
    .filter((row) => row && row.localDate)
    .sort((a, b) => String(b.localDate).localeCompare(String(a.localDate)))
    .slice(0, Math.max(0, limit))
    .map((row) => ({
      id: row.id,
      title: row.title || KIND_LABEL[row.kind] || 'Activity',
      kind: row.kind,
      kindLabel: KIND_LABEL[row.kind] || 'Activity',
      date: row.localDate,
      dateLabel: row.dateLabel || row.localDate,
      subtitle: row.subtitle || '',
    }));
}

/**
 * Build the Train landing model.
 *
 * @param {{
 *   state: any, program?: any, model?: any, briefing?: any, score?: any,
 *   now?: Date, tz?: string, offline?: boolean, recentLimit?: number,
 *   days?: string[],
 * }} options
 */
export function buildTrainLanding(options) {
  const { state, program = null, model = null, briefing = null, score = null,
    now = new Date(), tz = undefined, offline = false, recentLimit = 3,
    days = DAY_KEYS } = options || {};

  const todayISO = localDayKey(now, tz);
  // A moved workout owns today's date; otherwise this is the weekday template.
  const todayDay = scheduledDayForDate(state, program, todayISO)?.day || null;
  const today = buildTodayCardModel({ state, program, model, briefing, score, now, offline, tz, todayDay });
  const week = buildHomeWeekStrip({ state, program, days, today: todayISO });
  const recent = recentActivities(state, recentLimit)
    .filter((row) => !['run', 'walk', 'ride'].includes(row.kind) || moduleEnabled(state, 'running'));
  const quickStart = QUICK_START_ACTIONS.filter((item) =>
    item.id === 'run' || item.id === 'walk' ? moduleEnabled(state, 'running')
      : item.id === 'fast' ? moduleEnabled(state, 'fasting')
        : true);

  // A session already under way is the one thing that must not be buried
  // behind a landing — the user's unsaved intent outranks browsing.
  const resumable = today.state === 'in_progress' || today.state === 'unresolved';
  const exercises = sessionExercisePreview(state, program, today.day);

  return {
    today,
    week,
    exercises,
    resumable,
    quickStart,
    recent,
    hasHistory: recent.length > 0,
  };
}
