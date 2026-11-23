// =============================================================================
// MEASUREMENTS SHEET → MEASURES ENTRY
//
// The sheet used to write tape only. It now saves one dated ENTRY (weight,
// entered body fat, tape) through `saveMeasureEntry`, and it must not create an
// empty row just because Save was tapped. A minimal DOM stub is enough: the
// model owns the semantics, this test only proves the sheet routes inputs there.
// =============================================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appState } from '../js/state.js';
import { todayKey } from '../js/dates.js';
import { MEASUREMENT_SITES } from '../js/metrics/measurements.js';
import { saveMeasurementsSheet } from '../js/measurements-sheet.js';

const DATE = todayKey();

/** @param {string} value */
function field(value = '') {
  return {
    value,
    placeholder: '',
    setAttribute() {},
  };
}

function sheetElement() {
  return {
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    append() {},
  };
}

/**
 * Install the static sheet's ids as stubs and return the map so a test can fill
 * values before calling Save.
 * @param {Record<string, string>} values
 */
function installDom(values = {}) {
  /** @type {Map<string, any>} */
  const ids = new Map();
  ids.set('msSheetDate', field(values.date || DATE));
  ids.set('msSheet_weight', field(values.weight || ''));
  ids.set('msSheet_bodyFat', field(values.bodyFat || ''));
  for (const site of MEASUREMENT_SITES) ids.set(`msSheet_${site.key}`, field(values[site.key] || ''));
  const sheet = sheetElement();
  ids.set('measurementsSheet', sheet);
  ids.set('measurementsSheetBackdrop', sheetElement());
  globalThis.document = /** @type {any} */ ({
    getElementById: (id) => ids.get(id) || null,
    querySelector: () => null,
    querySelectorAll: () => [],
  });
  // saveStateToLocalStorage writes immediately; a missing localStorage would
  // log a real failure for a test that only cares about the mutation.
  globalThis.localStorage = /** @type {any} */ ({
    setItem() {}, getItem() { return null; }, removeItem() {},
  });
  return { ids, sheet };
}

function cleanupGlobals() {
  delete globalThis.document;
  delete globalThis.localStorage;
}

function resetState() {
  appState.settings = { weightUnit: 'kg', measurementUnit: 'cm' };
  appState.bodyWeightLog = [];
  appState.bodyMeasurements = [];
  appState.progressPhotos = [];
}

test('Save writes weight, body fat and tape as one dated entry', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  installDom({ weight: '80.4', bodyFat: '18.4', waist: '84.2', chest: '104' });
  await saveMeasurementsSheet();

  assert.deepEqual(appState.bodyWeightLog, [{ date: DATE, weight: 80.4 }]);
  assert.deepEqual(appState.bodyMeasurements, [{
    date: DATE, waist: 84.2, chest: 104, bodyFat: 18.4,
  }]);
});

test('Save with every field empty creates nothing', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  installDom();
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyWeightLog, []);
  assert.deepEqual(appState.bodyMeasurements, []);
});

test('a weigh-in can be saved without any tape, and tape without a weigh-in', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  installDom({ weight: '79.1' });
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyWeightLog, [{ date: DATE, weight: 79.1 }]);
  assert.deepEqual(appState.bodyMeasurements, []);

  // Clearing the weight but entering a waist keeps the entry and removes only
  // the weigh-in part.
  installDom({ waist: '83.5' });
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyWeightLog, []);
  assert.deepEqual(appState.bodyMeasurements, [{ date: DATE, waist: 83.5 }]);
});

test('clearing the last field removes the entry rather than leaving an empty row', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  appState.bodyMeasurements = [{ date: DATE, waist: 84 }];
  installDom();
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyMeasurements, []);
});

test('an implausible reading is refused and nothing is written', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  installDom({ weight: '80', waist: '999' });
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyWeightLog, [], 'the weight must not be half-saved');
  assert.deepEqual(appState.bodyMeasurements, []);
});

test('a future date is refused before anything is written', async (t) => {
  t.after(cleanupGlobals);
  resetState();
  const future = new Date(`${DATE}T12:00:00`);
  future.setDate(future.getDate() + 3);
  const futureKey = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`;
  installDom({ date: futureKey, weight: '80' });
  await saveMeasurementsSheet();
  assert.deepEqual(appState.bodyWeightLog, []);
});
