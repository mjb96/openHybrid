// =============================================================================
// BACKUP NUDGE
//
// A local-only app has one durable copy of this device's training: the JSON
// export. The reminder must be rare and honest — never on Android (automatic
// backups), never before real use, never for a recent backup, and quiet for a
// month once dismissed.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  backupNudgeFor, BACKUP_NUDGE_DAYS, BACKUP_NUDGE_FIRST_DAYS, BACKUP_NUDGE_REPEAT_DAYS,
} from '../js/portability/backup-status.js';

const TODAY = '2026-11-28';
const daysAgo = (n) => new Date(Date.parse(`${TODAY}T12:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

const base = {
  todayISO: TODAY,
  autoBackupSupported: false,
  firstTrainingDate: daysAgo(120),
  lastBackupAt: null,
  dismissedAt: null,
};

test('a never-backed-up athlete is asked once there is real history', () => {
  const result = backupNudgeFor(base);
  assert.equal(result.show, true);
  assert.equal(result.reason, 'never');
});

test('a brand-new athlete is not asked for a backup', () => {
  const result = backupNudgeFor({ ...base, firstTrainingDate: daysAgo(BACKUP_NUDGE_FIRST_DAYS - 1) });
  assert.equal(result.show, false);
  assert.equal(result.reason, 'new-athlete');
});

test('a stale backup is asked about after two weeks', () => {
  const stale = backupNudgeFor({ ...base, lastBackupAt: daysAgo(BACKUP_NUDGE_DAYS + 1) });
  assert.equal(stale.show, true);
  assert.equal(stale.reason, 'stale');
  assert.equal(stale.days, BACKUP_NUDGE_DAYS + 1);

  const recent = backupNudgeFor({ ...base, lastBackupAt: daysAgo(BACKUP_NUDGE_DAYS - 1) });
  assert.equal(recent.show, false);
  assert.equal(recent.reason, 'recent');
});

test('the Android app is never nagged about manual backups', () => {
  const result = backupNudgeFor({ ...base, autoBackupSupported: true });
  assert.equal(result.show, false);
  assert.equal(result.reason, 'automatic-backup');
});

test('an empty profile is never nagged', () => {
  assert.equal(backupNudgeFor({ ...base, firstTrainingDate: null }).show, false);
});

test('a dismissal silences it for a month, then it returns', () => {
  const quiet = backupNudgeFor({ ...base, dismissedAt: daysAgo(BACKUP_NUDGE_REPEAT_DAYS - 1) });
  assert.equal(quiet.show, false);
  assert.equal(quiet.reason, 'dismissed');

  const due = backupNudgeFor({ ...base, dismissedAt: daysAgo(BACKUP_NUDGE_REPEAT_DAYS + 1) });
  assert.equal(due.show, true);
});

test('a backup taken after the last dismissal is still current', () => {
  const result = backupNudgeFor({ ...base, lastBackupAt: daysAgo(1), dismissedAt: daysAgo(60) });
  assert.equal(result.show, false);
  assert.equal(result.reason, 'recent');
});
