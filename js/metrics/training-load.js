// @ts-check
// =============================================================================
// TRAINING LOAD — canonical sRPE calculation and explicit time scopes.
//
// Program-week series power plan/block charts. Calendar-dated history powers
// rolling ATL/CTL. Both scopes share the same day formula so they cannot drift:
// strength RPE × minutes + the sum of every run session's RPE × minutes.
// =============================================================================
import { addDaysISO, localDayKey, todayKey } from '../dates.js';
import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';
import { runLoadForDay } from '../state/run-sessions.js';
import { parseStrengthDurationMinutes } from '../strength/duration.js';
import { isValidWorkingSet } from '../set-utils.js';
import { effortForSet } from '../workout/effort.js';

export const TRAINING_DAYS = Object.freeze(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

// Session RPE with a set-level fallback. Importers preserve per-set RPE/RIR but
// have no session-level number, so requiring `gymRpe` made years of imported
// training contribute ZERO load and left ATL/CTL/ACWR flat. A mean of the set
// RPEs (RIR 2 → RPE 8, the same mapping the recap uses) is measured data, not a
// fabricated default. With no RPE anywhere the day stays 0 on purpose.
function sessionRpe(week, day) {
  const explicit = parseFloat(week?.gymRpe?.[day]) || 0;
  if (explicit > 0) return explicit;
  const lifts = week?.lifts?.[day] || {};
  let total = 0;
  let count = 0;
  for (const sets of Object.values(lifts)) {
    if (!Array.isArray(sets)) continue;
    for (const set of sets) {
      if (!isValidWorkingSet(set)) continue;
      // effortForSet reads `rir` first, falls back to `rpe`, and treats an
      // unrated failed set as RPE 10 — the athlete did go to failure, so a
      // zero here would make the hardest sets contribute no load at all.
      const { rpe } = effortForSet(set);
      if (rpe != null && rpe > 0 && rpe <= 10) { total += rpe; count++; }
    }
  }
  return count ? Math.round((total / count) * 10) / 10 : 0;
}

export function dayTrainingLoad(week, day) {
  const gymRpe = sessionRpe(week, day);
  const gymMins = parseStrengthDurationMinutes(week?.gymStats?.[day]?.time);
  const strength = gymRpe > 0 && gymMins > 0 ? gymRpe * gymMins : 0;
  const endurance = runLoadForDay(week, day);
  return { strength, endurance, total: strength + endurance };
}

/** sRPE split for numeric program-week slots only. */
export function programWeekLoadBreakdown(state, days, maxWeek) {
  const strength = [], endurance = [], total = [];
  for (let weekNum = 1; weekNum <= maxWeek; weekNum++) {
    const week = state?.weeks?.[String(weekNum)];
    let strengthLoad = 0, enduranceLoad = 0;
    if (week) {
      for (const day of days) {
        const load = dayTrainingLoad(week, day);
        strengthLoad += load.strength;
        enduranceLoad += load.endurance;
      }
    }
    strength.push(strengthLoad);
    endurance.push(enduranceLoad);
    total.push(strengthLoad + enduranceLoad);
  }
  return { strength, endurance, total };
}

/** Seven daily sRPE values for one numeric program week. */
export function programWeekDailyLoads(state, days, weekNum) {
  const week = state?.weeks?.[String(weekNum)];
  return days.map((day) => week ? dayTrainingLoad(week, day).total : 0);
}

/** Rolling prior-program-week baseline over up to `window` loaded weeks. */
export function programWeekLoadBalance(state, days, currentWeek, maxWeek, window = 4) {
  const weekNum = parseInt(currentWeek, 10) || 1;
  if (maxWeek < 2 || weekNum < 2) return { hasData: false, acwr: 0, acute: 0, chronic: 0 };
  const costs = programWeekLoadBreakdown(state, days, maxWeek).total;
  const index = weekNum - 1;
  if (index >= costs.length) return { hasData: false, acwr: 0, acute: 0, chronic: 0 };
  const acute = costs[index];
  const prior = costs.slice(Math.max(0, index - window), index).filter((load) => load > 0);
  const chronic = prior.length ? prior.reduce((sum, load) => sum + load, 0) / prior.length : 0;
  if (acute === 0 && chronic === 0) return { hasData: false, acwr: 0, acute, chronic };
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0;
  return { hasData: true, acwr, acute, chronic };
}

/**
 * Calendar-contiguous daily sRPE split across every dated stored session,
 * including archived activations and independent one-off workouts. Duplicate
 * legacy slots use the same canonical identity/dedup rules as calendar
 * analytics. Undated slots are preserved in state but intentionally excluded.
 *
 * This is the ONE dated load reader. `dailyTrainingLoadTimeline` (rolling
 * ATL/CTL) and the hybrid balance split both derive from it, so a strength or
 * endurance minute can never be counted differently by two surfaces.
 *
 * @param {any} state
 * @param {{throughDate?:string|Date, tz?:string, index?:any}} [options]
 * @returns {Array<{date:string, strength:number, endurance:number, total:number}>}
 */
export function dailyLoadBreakdownTimeline(state, options = {}) {
  const throughDate = localDayKey(options.throughDate || todayKey(options.tz), options.tz);
  if (!throughDate) return [];
  const index = options.index || indexSlotsByDate(state, { tz: options.tz });
  const byDate = new Map();

  for (const [date, slots] of index.allByDate.entries()) {
    if (date > throughDate) continue;
    const entry = byDate.get(date) || { strength: 0, endurance: 0 };
    for (const slot of slots) {
      const week = state?.weeks?.[slot.weekKey];
      const load = dayTrainingLoad(week, slot.day);
      entry.strength += load.strength;
      entry.endurance += load.endurance;
    }
    byDate.set(date, entry);
  }

  const dates = [...byDate.keys()].sort();
  if (!dates.length) return [];
  const rows = [];
  for (let date = dates[0]; date && date <= throughDate; date = addDaysISO(date, 1)) {
    const entry = byDate.get(date) || { strength: 0, endurance: 0 };
    rows.push({
      date,
      strength: entry.strength,
      endurance: entry.endurance,
      total: entry.strength + entry.endurance,
    });
  }
  return rows;
}

/**
 * Calendar-contiguous daily total sRPE (rolling ATL/CTL input).
 *
 * @param {any} state
 * @param {{throughDate?:string|Date, tz?:string, index?:any}} [options]
 * @returns {Array<{date:string, load:number}>}
 */
export function dailyTrainingLoadTimeline(state, options = {}) {
  return dailyLoadBreakdownTimeline(state, options)
    .map((row) => ({ date: row.date, load: row.total }));
}
