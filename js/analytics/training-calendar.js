// @ts-check
// =============================================================================
// TRAINING CALENDAR — trailing CALENDAR weeks for the consistency heatmap.
//
// The old heatmap columns were program weeks (`W1..Wn`), so archived/imported
// activations had no column at all. This model walks the canonical date index
// and returns the last N calendar weeks, each with seven day cells.
// =============================================================================
import { addDaysISO, indexSlotsByDate, localDayKey, weekStartOf, DAY_KEYS } from './weekly-aggregate.js';

function shortDate(dateISO) {
  const [, m, d] = dateISO.split('-').map(Number);
  return `${d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1] || ''}`;
}

function slotHasGym(slot) {
  return (slot?.stats?.workingSets || 0) > 0 || String(slot?.gymStats?.time || '').trim() !== '';
}

function slotHasRun(slot) {
  if (Array.isArray(slot?.runSessions) && slot.runSessions.length) {
    return slot.runSessions.some((run) => (parseFloat(run?.dist) || 0) > 0 || String(run?.time || '').trim());
  }
  return (parseFloat(slot?.run?.dist) || 0) > 0 || String(slot?.run?.time || '').trim() !== '';
}

/**
 * @param {any} state
 * @param {{ today?: string, weeks?: number, tz?: string }} [opts]
 */
export function buildCalendarTrainingWeeks(state, opts = {}) {
  const today = opts.today || localDayKey(new Date(), opts.tz);
  const weeks = Math.max(1, Math.min(26, Number(opts.weeks) || 12));
  const currentWeekStart = weekStartOf(today);
  const start = /** @type {string} */ (addDaysISO(currentWeekStart, -(weeks - 1) * 7));
  const index = indexSlotsByDate(state, { tz: opts.tz });
  const labels = [];
  const trainingDays = [];

  for (let week = 0; week < weeks; week++) {
    const weekStart = /** @type {string} */ (addDaysISO(start, week * 7));
    // One label every three weeks: twelve date labels at 15px spacing overlap.
    labels.push(week % 3 === 0 ? shortDate(weekStart) : '');
    DAY_KEYS.forEach((dayKey, dayIdx) => {
      const date = /** @type {string} */ (addDaysISO(weekStart, dayIdx));
      if (date > today) return;
      const slots = index.allByDate.get(date) || [];
      if (!slots.length) return;
      const gym = slots.some(slotHasGym);
      const run = slots.some(slotHasRun);
      if (gym || run) trainingDays.push({ week: week + 1, dayIdx, gym, run, date });
    });
  }

  return {
    weekStart: start,
    weekEnd: /** @type {string} */ (addDaysISO(currentWeekStart, 6)),
    labels,
    trainingDays,
  };
}
