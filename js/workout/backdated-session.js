// @ts-check
// =============================================================================
// BACKDATED STRENGTH (G3)
//
// A past session is a ONE-OFF `session:` week stamped with the chosen date — it
// never writes the active program's week, current day or activation. These are
// the pure decisions the flow needs: is the date usable, and is that day already
// occupied?
// =============================================================================
import { localDayKey } from '../dates.js';
import { indexSlotsByDate } from '../analytics/weekly-aggregate.js';

/**
 * @param {string} value
 * @returns {null | { year:number, month:number, day:number }}
 */
function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
  return { year, month, day };
}

/**
 * @param {string} dateISO
 * @param {string} todayISO
 * @returns {{ ok: boolean, reason?: string }}
 */
export function isValidBackdatedDate(dateISO, todayISO) {
  const parsed = parseDateOnly(dateISO);
  if (!parsed) return { ok: false, reason: 'Choose a real date.' };
  const today = parseDateOnly(todayISO);
  if (!today) return { ok: false, reason: 'Today could not be resolved.' };
  const value = `${dateISO}`;
  const todayKey = `${todayISO}`;
  if (value > todayKey) return { ok: false, reason: 'A session cannot be logged in the future.' };
  if (value < '2000-01-01') return { ok: false, reason: 'That date is too far back.' };
  return { ok: true };
}

/**
 * What already lives on a calendar day. Strength slots and runs are counted
 * separately because one day can legitimately hold both.
 * @param {any} state
 * @param {string} dateISO
 */
export function dayOccupancy(state, dateISO) {
  const index = indexSlotsByDate(state);
  const slots = index.allByDate.get(dateISO) || [];
  let strength = 0;
  let runs = 0;
  const titles = [];
  for (const slot of slots) {
    const hasStrength = (slot?.stats?.workingSets || 0) > 0 || String(slot?.gymStats?.time || '').trim() !== '';
    if (hasStrength) {
      strength += 1;
      if (slot?.sessionTitle) titles.push(String(slot.sessionTitle));
    }
    const runCount = Array.isArray(slot?.runSessions) ? slot.runSessions.length : (slot?.run ? 1 : 0);
    runs += runCount;
  }
  return { strength, runs, total: strength + runs, titles };
}

/**
 * The chosen local calendar date at noon. Noon avoids a DST/timezone edge
 * turning the stamp into the previous or next day.
 * @param {string} dateISO
 * @returns {Date|null}
 */
export function backdatedNoon(dateISO) {
  const parsed = parseDateOnly(dateISO);
  if (!parsed) return null;
  return new Date(`${dateISO}T12:00:00`);
}

/** Today's local date key, for callers that do not already hold one. */
export function localToday() {
  return localDayKey(new Date());
}
