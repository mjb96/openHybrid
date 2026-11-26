// @ts-check
// =============================================================================
// BACKUP STATUS (ST9)
//
// One honest reading of "when did I last take a manual backup?". The date is
// metadata, not a setting: it lives at the root of state (`lastBackupAt`), is
// written only after a successful export, and is displayed on Settings → Data.
//
// A stale warning is advisory, never a modal or a nag: seven days is the point
// where a JSON copy is worth making again.
// =============================================================================
import { daysBetween, localDayKey } from '../dates.js';

export const BACKUP_STALE_DAYS = 7;

/**
 * @param {unknown} value ISO timestamp or date key
 * @param {{ todayISO?: string }} [options]
 * @returns {{ hasBackup: boolean, stale: boolean, days: number|null, label: string, detail: string }}
 */
export function describeLastBackup(value, { todayISO } = {}) {
  const today = localDayKey(todayISO || new Date());
  const date = typeof value === 'string' ? localDayKey(value) : null;
  if (!today || !date) {
    return {
      hasBackup: false,
      stale: true,
      days: null,
      label: 'Never',
      detail: 'No manual backup yet — export a JSON copy when you are ready.',
    };
  }
  const days = Math.max(0, daysBetween(date, today) ?? 0);
  const when = days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
  const stale = days >= BACKUP_STALE_DAYS;
  return {
    hasBackup: true,
    stale,
    days,
    label: when,
    detail: stale
      ? `Last manual backup ${when.toLowerCase()} — worth refreshing.`
      : `Last manual backup ${when.toLowerCase()}.`,
  };
}
