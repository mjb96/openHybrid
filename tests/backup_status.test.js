// =============================================================================
// ST9 — the manual backup timestamp, stated honestly
// =============================================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_STALE_DAYS, describeLastBackup } from '../js/portability/backup-status.js';

const today = '2026-11-26';

test('no backup says so and is stale', () => {
  const status = describeLastBackup(null, { todayISO: today });
  assert.equal(status.hasBackup, false);
  assert.equal(status.stale, true);
  assert.equal(status.label, 'Never');
  assert.match(status.detail, /No manual backup yet/);
});

test('today, yesterday and N days ago read in words', () => {
  assert.equal(describeLastBackup('2026-11-26', { todayISO: today }).label, 'Today');
  assert.equal(describeLastBackup('2026-11-25', { todayISO: today }).label, 'Yesterday');
  assert.equal(describeLastBackup('2026-11-20', { todayISO: today }).label, '6 days ago');
});

test('an ISO timestamp is read by its calendar day', () => {
  const status = describeLastBackup('2026-11-24T12:00:00', { todayISO: today });
  assert.equal(status.hasBackup, true);
  assert.equal(status.days, 2);
});

test('seven days is the calm warning line', () => {
  const fresh = describeLastBackup('2026-11-20', { todayISO: today });
  assert.equal(fresh.stale, false);
  const stale = describeLastBackup('2026-11-19', { todayISO: today });
  assert.equal(stale.days, BACKUP_STALE_DAYS);
  assert.equal(stale.stale, true);
  assert.match(stale.detail, /worth refreshing/);
});

test('junk is never presented as a backup date', () => {
  for (const value of ['', 'not-a-date', 42, {}, undefined]) {
    const status = describeLastBackup(value, { todayISO: today });
    assert.equal(status.hasBackup, false);
    assert.equal(status.label, 'Never');
  }
});
