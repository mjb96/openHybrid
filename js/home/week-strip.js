// @ts-check
// =============================================================================
// HOME WEEK STRIP — a pure, calendar-aware model for the seven-day training
// strip. The UI renders it; this module decides done / today / missed / rest.
// =============================================================================
import { addDaysISO, indexSlotsByDate, localDayKey, weekStartOf } from '../analytics/weekly-aggregate.js';
import { scheduledDayForDate } from '../schedule/week.js';

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

function orderedDays(weekStartDay) {
  const start = DAY_ORDER.indexOf(weekStartDay);
  if (start <= 0) return DAY_ORDER.slice();
  return [...DAY_ORDER.slice(start), ...DAY_ORDER.slice(0, start)];
}

function shortDate(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

/**
 * @param {{ state:any, program:any, days?:string[], today?:string }} opts
 * @returns {{ days: Array<{day:string,label:string,date:string|null,status:string,planned:boolean,done:boolean,isToday:boolean}>,
 *   doneCount:number, plannedCount:number, pct:number|null, weekStart:string, range:string }}
 */
export function buildHomeWeekStrip({ state, program = null, days = DAY_ORDER, today }) {
  // Home is a CALENDAR surface. `state.currentWeek` is a program counter and can
  // point at a frozen week whose stamped dates are last week; the strip must still
  // show the seven real dates around today. Actual work is read from the same
  // date-strict, deduplicated index as the Home recap and every Progress chart,
  // so an imported/archived session on today's date counts as done.
  const todayISO = localDayKey(today) || localDayKey(new Date());
  const monday = weekStartOf(todayISO);
  const slotsByDate = indexSlotsByDate(state).allByDate;
  const order = orderedDays(state?.settings?.weekStartDay || 'mon').filter((day) => days.includes(day));
  const cells = [];
  let doneCount = 0;
  let plannedCount = 0;

  order.forEach((day) => {
    const date = addDaysISO(monday, DAY_ORDER.indexOf(day));
    // The schedule owns which program day a DATE carries (HM2). Without a move
    // this is the weekday template, so every existing week is unchanged.
    const scheduled = scheduledDayForDate(state, program, date);
    const planned = !!scheduled;
    const done = (slotsByDate?.get(date) || []).length > 0;
    const isToday = date === todayISO;
    let status = 'rest';
    if (done) status = 'done';
    else if (isToday) status = planned ? 'today' : 'rest';
    else if (date > todayISO) status = planned ? 'planned' : 'rest';
    else if (date < todayISO) status = planned ? 'missed' : 'rest';
    else if (planned) status = 'planned';

    if (planned) plannedCount++;
    if (done) doneCount++;
    cells.push({
      day,
      label: DAY_LABELS[day] || day,
      date,
      status,
      planned,
      done,
      isToday,
      programDay: scheduled?.day || null,
      moved: !!scheduled?.moved,
    });
  });

  const weekEnd = addDaysISO(monday, 6);
  return {
    days: cells,
    doneCount,
    plannedCount,
    pct: plannedCount > 0 ? Math.round((doneCount / plannedCount) * 100) : null,
    weekStart: monday,
    range: `${shortDate(monday)} – ${shortDate(weekEnd)}`,
  };
}
