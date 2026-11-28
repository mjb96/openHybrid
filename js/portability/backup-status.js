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
/** Home asks only after this long without a manual backup (browser/PWA). */
export const BACKUP_NUDGE_DAYS = 14;
/** An athlete who has never exported gets this long of real use first. */
export const BACKUP_NUDGE_FIRST_DAYS = 21;
/** A dismissed nudge stays quiet for this long. */
export const BACKUP_NUDGE_REPEAT_DAYS = 30;

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

/**
 * Should Home ask for a manual backup?
 *
 * Only where a manual export is the ONLY path — the Android app has automatic
 * backups, so it is never nagged. It also waits for real data to exist, gives a
 * first-time exporter three weeks of use, requires a stale or missing backup,
 * and respects a dismissal for a month.
 *
 * @param {{
 *   lastBackupAt?: string|null,
 *   firstTrainingDate?: string|null,
 *   dismissedAt?: string|null,
 *   todayISO?: string,
 *   autoBackupSupported?: boolean,
 * }} input
 * @returns {{ show: boolean, reason: string, days: number|null }}
 */
export function backupNudgeFor(input = {}) {
  const todayISO = input.todayISO || localDayKey(new Date());
  if (input.autoBackupSupported) return { show: false, reason: 'automatic-backup', days: null };
  if (!input.firstTrainingDate) return { show: false, reason: 'no-training', days: null };
  const trainingDays = daysBetween(input.firstTrainingDate, todayISO);
  if (trainingDays == null || trainingDays < 0) return { show: false, reason: 'no-training', days: null };

  const backup = describeLastBackup(input.lastBackupAt, { todayISO });
  if (backup.hasBackup) {
    if (!backup.stale || backup.days == null || backup.days < BACKUP_NUDGE_DAYS) {
      return { show: false, reason: 'recent', days: backup.days };
    }
  } else if (trainingDays < BACKUP_NUDGE_FIRST_DAYS) {
    return { show: false, reason: 'new-athlete', days: null };
  }

  if (input.dismissedAt) {
    const dismissed = describeLastBackup(input.dismissedAt, { todayISO });
    if (dismissed.days != null && dismissed.days < BACKUP_NUDGE_REPEAT_DAYS) {
      return { show: false, reason: 'dismissed', days: backup.days };
    }
  }

  return { show: true, reason: backup.hasBackup ? 'stale' : 'never', days: backup.days };
}
