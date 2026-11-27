// ==========================================
// IMPORT ATOMICITY + KEY SAFETY (tests/import_atomicity.test.js)
//
// An import is only "done" when the device accepted the write. These cases pin
// the ordering (storage before memory) and the reserved-key refusal that keeps
// an imported JSON object from replacing a prototype.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commitImportedState, STORAGE_KEY, SAVED_AT_KEY } from '../js/state.js';
import { migrateState } from '../js/state/migrations.js';
import { validateImport } from '../js/state/import-validate.js';

test('a failed storage write never adopts the imported state', () => {
  let adopted = null;
  const storage = {
    setItem() { throw new Error('QuotaExceededError'); },
  };
  assert.throws(
    () => commitImportedState({ currentWeek: '9' }, { storage, adopt: (state) => { adopted = state; } }),
    /QuotaExceededError/,
  );
  assert.equal(adopted, null, 'the live state is untouched when the write fails');
});

test('the state is written before it is adopted, and the saved-at marker follows', () => {
  const order = [];
  const storage = {
    setItem(key) { order.push(key); },
  };
  const json = commitImportedState(
    { currentWeek: '3' },
    { storage, adopt: () => order.push('adopt'), now: new Date('2026-11-27T10:00:00Z') },
  );
  assert.equal(JSON.parse(json).currentWeek, '3');
  assert.deepEqual(order, [STORAGE_KEY, 'adopt', SAVED_AT_KEY]);
});

test('validateImport refuses an own __proto__ / constructor / prototype key', () => {
  const hostile = JSON.parse('{"currentWeek":"1","weeks":{"1":{}},"__proto__":{"polluted":true}}');
  assert.equal(validateImport(hostile).reason, 'reserved-key');
  assert.equal(validateImport({ currentWeek: '1', weeks: { '1': {} }, constructor: {} }).reason, 'reserved-key');
  assert.equal(validateImport({ currentWeek: '1', weeks: { '1': {} }, prototype: {} }).reason, 'reserved-key');
});

test('migrating a payload with an own __proto__ does not pollute the state', () => {
  const state = JSON.parse(
    '{"schemaVersion":17,"currentWeek":"1","weeks":{},"settings":{},"__proto__":{"polluted":true}}',
  );
  migrateState(state);
  assert.equal(Object.getPrototypeOf(state), Object.prototype);
  assert.equal(state.polluted, undefined);
  assert.equal({}.polluted, undefined, 'Object.prototype was never touched');
});

test('a plan lift named __proto__ never reaches the day map', async () => {
  const { parsePlanFile, createImportedProgram } = await import('../js/programs/program-json.js');
  const file = {
    format: 'openhybrid-plan',
    version: 1,
    plan: {
      name: 'Hostile',
      totalWeeks: 4,
      days: { mon: { title: 'Push', lifts: ['__proto__', 'Bench Press'] } },
    },
  };
  const program = createImportedProgram(parsePlanFile(JSON.stringify(file)));
  assert.deepEqual(program.days.mon.lifts, ['Bench Press']);
  assert.equal(Object.getPrototypeOf(program.days.mon.lifts), Array.prototype);
});
