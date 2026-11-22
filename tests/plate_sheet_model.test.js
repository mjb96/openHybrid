// ==========================================
// PLATE SHEET MODEL TEST (tests/plate_sheet_model.test.js)
// The calculator's view model: exact, shortfall, below-bar, bar-only, a
// counts-limited rack, an lb profile and junk input. Pure — no DOM.
// ==========================================
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PLATE_SHEET_MAX_TOTAL, buildPlateSheetModel, plateBelowBarText, plateShortfallText,
} from '../js/workout/plate-sheet-model.js';
import { LB_PLATES } from '../js/workout/plates.js';

const KG = { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], counts: {} };
const LB = { bar: 45, plates: [...LB_PLATES], counts: {} };

test('an exact target leads with the per-side plates and needs no caveat', () => {
  const model = buildPlateSheetModel({ target: 100, unit: 'kg', setup: KG, profileName: 'Home rack' });
  assert.equal(model.valid, true);
  assert.equal(model.exact, true);
  assert.equal(model.barOnly, false);
  assert.equal(model.belowBar, false);
  assert.equal(model.limited, false);
  assert.equal(model.headline, '25 + 15');
  assert.equal(model.perSideText, '25 + 15');
  assert.deepEqual(model.perSide, [{ plate: 25, count: 1 }, { plate: 15, count: 1 }]);
  assert.deepEqual(model.pairs, [{ plate: 25, count: 2 }, { plate: 15, count: 2 }]);
  assert.equal(model.shortfallTotal, 0);
  assert.equal(model.nearest, null);
  assert.equal(model.profileName, 'Home rack');
  assert.equal(plateShortfallText(model), '');
});

test('a 2.5 kg step is stated exactly (62.5 → 20 + 1.25)', () => {
  const model = buildPlateSheetModel({ target: 62.5, unit: 'kg', setup: KG });
  assert.equal(model.exact, true);
  assert.equal(model.headline, '20 + 1.25');
  assert.deepEqual(model.pairs, [{ plate: 20, count: 2 }, { plate: 1.25, count: 2 }]);
});

test('an unreachable target states the total shortfall and the nearest total', () => {
  const model = buildPlateSheetModel({ target: 101, unit: 'kg', setup: KG });
  assert.equal(model.valid, true);
  assert.equal(model.exact, false);
  assert.equal(model.shortfallTotal, 1);
  assert.equal(model.nearest, 100);
  assert.match(model.headline, /1 kg short/);
  assert.match(plateShortfallText(model), /1 kg short in total/);
  assert.match(plateShortfallText(model), /Nearest buildable: 100 kg/);
});

test('a target below the bar reports the delta instead of plates', () => {
  const model = buildPlateSheetModel({ target: 15, unit: 'kg', setup: KG });
  assert.equal(model.valid, true);
  assert.equal(model.belowBar, true);
  assert.equal(model.belowBy, 5);
  assert.equal(model.exact, false);
  assert.equal(model.headline, '15 kg is under the bar');
  assert.equal(model.shortfallTotal, 0);
  assert.equal(model.nearest, null);
  assert.deepEqual(model.perSide, []);
  assert.deepEqual(model.pairs, []);
  assert.match(plateBelowBarText(model), /5 kg below the 20 kg bar/);
});

test('the empty bar is exact and says so', () => {
  const model = buildPlateSheetModel({ target: 20, unit: 'kg', setup: KG });
  assert.equal(model.barOnly, true);
  assert.equal(model.exact, true);
  assert.equal(model.headline, 'Bar only');
  assert.deepEqual(model.perSide, []);
  assert.deepEqual(model.pairs, []);
  assert.equal(plateShortfallText(model), '');
});

test('a counts-limited profile never invents the missing plates', () => {
  const model = buildPlateSheetModel({
    target: 110, unit: 'kg',
    setup: { bar: 20, plates: [25, 20], counts: { 25: 1, 20: 0 } },
  });
  assert.equal(model.limited, true);
  assert.equal(model.exact, false);
  assert.deepEqual(model.perSide, [{ plate: 25, count: 1 }]);
  assert.equal(model.shortfallTotal, 40);
  assert.equal(model.nearest, 70);
  assert.match(model.headline, /40 kg short/);
});

test('an lb profile stays in lb and uses the lb bar', () => {
  const model = buildPlateSheetModel({ target: 135, unit: 'lbs', setup: LB, profileName: 'Garage' });
  assert.equal(model.unit, 'lbs');
  assert.equal(model.bar, 45);
  assert.equal(model.exact, true);
  assert.equal(model.headline, '45');
  assert.deepEqual(model.pairs, [{ plate: 45, count: 2 }]);

  const short = buildPlateSheetModel({ target: 137, unit: 'lbs', setup: LB });
  assert.equal(short.unit, 'lbs');
  assert.equal(short.shortfallTotal, 2);
  assert.equal(short.nearest, 135);
  assert.match(plateShortfallText(short), /2 lbs short/);
});

test('junk, blank, zero, negative and absurd targets are rejected with a reason', () => {
  for (const [target, pattern] of [
    ['', /Enter a total weight/],
    [null, /Enter a total weight/],
    ['abc', /Enter a total weight/],
    [Number.NaN, /Enter a total weight/],
    [0, /above zero/],
    [-5, /above zero/],
    [PLATE_SHEET_MAX_TOTAL + 1, /1500/],
  ]) {
    const model = buildPlateSheetModel({ target, unit: 'kg', setup: KG });
    assert.equal(model.valid, false, `target ${String(target)} should be rejected`);
    assert.match(model.reason, pattern);
    assert.equal(model.headline, '');
    assert.equal(model.nearest, null);
    assert.deepEqual(model.perSide, []);
    assert.deepEqual(model.pairs, []);
  }
});

test('an omitted setup falls back to the standard bar for the unit', () => {
  assert.equal(buildPlateSheetModel({ target: 100, unit: 'kg' }).headline, '25 + 15');
  assert.equal(buildPlateSheetModel({ target: 135, unit: 'lb' }).headline, '45');
  assert.equal(buildPlateSheetModel().valid, false);
});
