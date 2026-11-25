// @ts-check
// =============================================================================
// WEEK SCHEDULE (js/schedule/week.js)
//
// HM2 "move a day", the model only. The app's program days are templates
// (mon..sun) and a program week's `dates` are stamped when a set is logged — so
// there is no place that says "Thursday's session happens on Saturday". This
// module adds one, without touching the training data:
//
//   state.weekSchedule = {
//     '2026-11-23': { thu: '2026-11-28' }   // calendar week → moved day → date
//   }
//
// The calendar week is the unit because Home's week rail is a calendar week, not
// a program-week counter. A move only reassigns the PLAN:
//   - the moved day's plan appears on the target date;
//   - its original weekday reads "rest" (the plan is elsewhere);
//   - logged work keeps its stamped date, so analytics are untouched.
//
// Free dates only: a target must be in the same calendar week, not in the past,
// and not already owned by a plan or logged work. Nothing is overwritten.
// =============================================================================
import { addDaysISO, localDayKey, startOfProgramWeek } from '../dates.js';

/** Monday-indexed program slots, matching week.weeks/lifts keys. */
export const SCHEDULE_DAYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

/** @param {any} program @param {string} day */
export function hasPlan(program, day) {
  const plan = program?.days?.[day];
  if (!plan) return false;
  if (Array.isArray(plan.lifts) && plan.lifts.length > 0) return true;
  const runs = String(plan.runs || '').trim();
  return !!runs && !/^rest\b|^recovery\b/i.test(runs);
}

/** @param {any} state */
function ensureSchedule(state) {
  if (!state || typeof state !== 'object') return null;
  if (!state.weekSchedule || typeof state.weekSchedule !== 'object' || Array.isArray(state.weekSchedule)) {
    state.weekSchedule = {};
  }
  return state.weekSchedule;
}

/**
 * The override map for one calendar week (Monday key).
 * @param {any} state
 * @param {string} weekStartISO
 * @returns {Record<string, string>}
 */
export function weekMoves(state, weekStartISO) {
  const map = state?.weekSchedule?.[weekStartISO];
  return map && typeof map === 'object' && !Array.isArray(map) ? map : {};
}

/**
 * Default calendar date for a program slot in a week.
 * @param {string} weekStartISO
 * @param {string} day
 */
export function defaultDateFor(weekStartISO, day) {
  const index = SCHEDULE_DAYS.indexOf(day);
  return index < 0 ? null : addDaysISO(weekStartISO, index);
}

/**
 * The date a day is scheduled for: an explicit move wins, else its weekday.
 * @param {any} state
 * @param {string} weekStartISO
 * @param {string} day
 */
export function scheduledDateFor(state, weekStartISO, day) {
  const moved = weekMoves(state, weekStartISO)[day];
  return localDayKey(moved) || defaultDateFor(weekStartISO, day);
}

/** @param {string} dateISO */
function weekdayFor(dateISO) {
  const key = localDayKey(dateISO);
  if (!key) return null;
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=Sun
  return SCHEDULE_DAYS[(dow + 6) % 7];
}

/**
 * Which planned day owns a calendar date, after moves.
 * @param {any} state
 * @param {any} program
 * @param {string} dateISO
 * @returns {{ day: string, date: string, moved: boolean }|null}
 */
export function scheduledDayForDate(state, program, dateISO) {
  const date = localDayKey(dateISO);
  if (!date) return null;
  const weekStart = startOfProgramWeek(date);
  if (!weekStart) return null;
  const moves = weekMoves(state, weekStart);
  // An explicit move owns the target date, even if the target weekday also has
  // its own plan — the move sheet only offers free dates, so this is a guard.
  for (const day of SCHEDULE_DAYS) {
    if (moves[day] === date && hasPlan(program, day)) return { day, date, moved: true };
  }
  const weekday = weekdayFor(date);
  if (!weekday || !hasPlan(program, weekday)) return null;
  const movedAway = moves[weekday] && moves[weekday] !== defaultDateFor(weekStart, weekday);
  if (movedAway) return null;
  return { day: weekday, date, moved: false };
}

/**
 * A planned day is movable only before any work is recorded against it.
 * @param {any} state
 * @param {any} program
 * @param {string} day
 * @param {string} weekStartISO
 */
export function movableDay(state, program, day, weekStartISO) {
  if (!hasPlan(program, day)) return { ok: false, reason: 'No workout planned' };
  const week = state?.weeks?.[String(state?.currentWeek)];
  const status = week?.sessionStatus?.[day];
  if (status === 'in_progress' || status === 'finished') return { ok: false, reason: 'This workout has already started' };
  const sets = week?.lifts?.[day];
  if (sets && typeof sets === 'object') {
    const logged = Object.values(sets).some((arr) => Array.isArray(arr) && arr.some((set) => set?.c));
    if (logged) return { ok: false, reason: 'This workout has already been logged' };
  }
  const date = scheduledDateFor(state, weekStartISO, day);
  return { ok: true, date };
}

/**
 * Every date in the week, with why it can or cannot take the workout.
 * `isDateLogged` lets the caller use the real History reader instead of this
 * module re-deriving what counts as a session.
 * @param {any} state
 * @param {any} program
 * @param {string} day
 * @param {{ today?: string, isDateLogged?: (date: string) => boolean }} [options]
 */
export function moveOptions(state, program, day, { today = localDayKey(new Date()), isDateLogged = () => false } = {}) {
  const todayKey = localDayKey(today);
  const weekStart = todayKey ? startOfProgramWeek(todayKey) : null;
  if (!weekStart) return [];
  const current = scheduledDateFor(state, weekStart, day);
  return SCHEDULE_DAYS.map((slot) => {
    const date = defaultDateFor(weekStart, slot);
    if (!date) return null;
    let disabled = null;
    if (date === current) disabled = 'This workout';
    else if (todayKey && date < todayKey) disabled = 'In the past';
    else if (isDateLogged(date)) disabled = 'Already has a session';
    else if (scheduledDayForDate(state, program, date)) disabled = 'Already has a session';
    return {
      day: slot,
      date,
      weekday: slot,
      disabled,
    };
  }).filter(Boolean);
}

/**
 * Move a planned day onto a free date in the current calendar week.
 * Returns the previous override (null when there was none) so the caller can
 * undo without a second copy of the rule.
 * @param {any} state
 * @param {any} program
 * @param {string} day
 * @param {string} targetDate
 * @param {{ today?: string, isDateLogged?: (date: string) => boolean }} [options]
 */
export function applyMove(state, program, day, targetDate, options = {}) {
  const target = localDayKey(targetDate);
  const today = localDayKey(options.today || new Date());
  const weekStart = today ? startOfProgramWeek(today) : null;
  if (!target || !weekStart || !SCHEDULE_DAYS.includes(day)) return { ok: false, reason: 'Invalid move' };
  const targetWeek = startOfProgramWeek(target);
  if (targetWeek !== weekStart) return { ok: false, reason: 'Choose a date this week' };
  const movable = movableDay(state, program, day, weekStart);
  if (!movable.ok) return { ok: false, reason: movable.reason };
  if (target < today) return { ok: false, reason: 'Choose today or later' };
  if (target === movable.date) return { ok: false, reason: 'Already on that day' };
  const option = moveOptions(state, program, day, options).find((entry) => entry.date === target);
  if (!option || option.disabled) return { ok: false, reason: option?.disabled || 'That date is not free' };
  const schedule = ensureSchedule(state);
  if (!schedule) return { ok: false, reason: 'Could not save the move' };
  if (!schedule[weekStart] || typeof schedule[weekStart] !== 'object') schedule[weekStart] = {};
  const previous = schedule[weekStart][day] || null;
  schedule[weekStart][day] = target;
  return { ok: true, previous, weekStart, date: target };
}

/**
 * @param {any} state
 * @param {string} day
 * @param {string} weekStartISO
 * @param {string|null} previous
 */
export function undoMove(state, day, weekStartISO, previous) {
  const schedule = ensureSchedule(state);
  if (!schedule || !schedule[weekStartISO]) return false;
  if (previous) schedule[weekStartISO][day] = previous;
  else delete schedule[weekStartISO][day];
  if (!Object.keys(schedule[weekStartISO]).length) delete schedule[weekStartISO];
  return true;
}
