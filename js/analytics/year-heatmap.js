// @ts-check
// =============================================================================
// YEAR HEATMAP (G4)
//
// An always-available view of the last twelve months, shaded by TIME TRAINED —
// strength gym time plus run/walk time. Every past day is one button so a tap
// can open that date's History recap. It is a calendar, not a second Year in
// Review: no totals competition, rankings or PRs live here.
//
// A day with training but no recorded time is shown as "logged, unmeasured"
// rather than shaded as if it were a short session — the app never invents a
// duration.
// =============================================================================
import { parseDurationToMinutes } from '../engine.js';
import { gymTimeIsSession, indexSlotsByDate, localDayKey } from './weekly-aggregate.js';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTH_SHORT = MONTH_NAMES.map((name) => name.slice(0, 3));
const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SUNDAY_FIRST = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** @param {number} year @param {number} month 0-11 @param {number} day */
function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Minutes trained on one dated slot (strength gym time + every run). */
function slotMinutes(slot) {
  let minutes = parseDurationToMinutes(slot?.gymStats?.time) || 0;
  const runs = Array.isArray(slot?.runSessions) ? slot.runSessions : [];
  for (const run of runs) minutes += parseDurationToMinutes(run?.time) || 0;
  // Legacy summary without session records: count it once, never twice.
  if (!runs.length && slot?.run?.time) minutes += parseDurationToMinutes(slot.run.time) || 0;
  return minutes;
}

/** Whether one slot is a strength session on its own. */
/** An imported FIT gym file is a session on its own; a warm-up-only day is not. */
function slotHasStrength(slot) {
  return (slot?.stats?.workingSets || 0) > 0 || gymTimeIsSession(slot);
}

/** @param {number} minutes */
export function heatLevel(minutes) {
  if (!(minutes > 0)) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 90) return 3;
  return 4;
}

/** "1 h 24 m" / "48 m" — the total line's own wording. */
export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  if (total < 60) return `${total} m`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours} h ${rest} m` : `${hours} h`;
}

/**
 * @param {any} state
 * @param {{ endISO?: string, weekStartDay?: string }} [options]
 */
export function buildYearHeatmap(state, { endISO, weekStartDay } = {}) {
  const end = localDayKey(endISO || new Date());
  if (!end) throw new Error('buildYearHeatmap: could not resolve today');
  const [endYear, endMonth] = end.split('-').map(Number);
  // A rolling twelve months, ending with the month that contains "today".
  const firstMonth = new Date(Date.UTC(endYear, endMonth - 12, 1));
  const startISO = isoDate(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth(), 1);

  const sundayFirst = (weekStartDay || state?.settings?.weekStartDay) === 'sun';
  const dayLabels = sundayFirst ? SUNDAY_FIRST : WEEKDAY_SHORT;
  const index = indexSlotsByDate(state);

  /** @type {Map<string, { minutes: number, sessions: number, measured: boolean }>} */
  const byDate = new Map();
  for (const [date, slots] of index.allByDate) {
    if (date < startISO || date > end) continue;
    let minutes = 0;
    let sessions = 0;
    let attempts = 0;
    for (const slot of slots) {
      const slotMin = slotMinutes(slot);
      minutes += slotMin;
      const hasStrength = slotHasStrength(slot);
      const runs = Array.isArray(slot?.runSessions) ? slot.runSessions : [];
      const hasRun = runs.length > 0 || (parseFloat(slot?.run?.dist) || 0) > 0
        || String(slot?.run?.time || '').trim() !== '';
      sessions += (hasStrength ? 1 : 0) + (runs.length || (hasRun ? 1 : 0));
      if (slotMin > 0 || hasStrength || hasRun) attempts += 1;
    }
    if (!attempts) continue;
    byDate.set(date, { minutes: Math.round(minutes), sessions, measured: minutes > 0 });
  }

  /** @type {Array<any>} */
  const months = [];
  let totalMinutes = 0;
  let activeDays = 0;
  let unmeasuredDays = 0;

  for (let offset = 0; offset < 12; offset += 1) {
    const cursor = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + offset, 1));
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const firstWeekday = cursor.getUTCDay(); // 0 = Sunday
    const leading = sundayFirst ? firstWeekday : (firstWeekday + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

    /** @type {Array<any>} */
    const cells = [];
    for (let i = 0; i < leading; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = isoDate(year, month, day);
      const future = date > end;
      const entry = byDate.get(date);
      if (!future && entry) {
        activeDays += 1;
        totalMinutes += entry.minutes;
        if (!entry.measured) unmeasuredDays += 1;
      }
      cells.push({
        date,
        day,
        future,
        minutes: entry?.minutes || 0,
        sessions: entry?.sessions || 0,
        measured: !!entry?.measured,
        level: future ? 0 : heatLevel(entry?.minutes || 0),
      });
    }

    months.push({
      key: `${year}-${String(month + 1).padStart(2, '0')}`,
      year,
      month,
      label: `${MONTH_NAMES[month]} ${year}`,
      short: MONTH_SHORT[month],
      leading,
      cells,
    });
  }

  return {
    startISO,
    endISO: end,
    rangeLabel: `${MONTH_SHORT[firstMonth.getUTCMonth()]} ${firstMonth.getUTCFullYear()} – ${MONTH_SHORT[endMonth - 1]} ${endYear}`,
    weekStartDay: sundayFirst ? 'sun' : 'mon',
    dayLabels,
    months,
    totalMinutes,
    activeDays,
    unmeasuredDays,
    hasData: activeDays > 0,
  };
}
