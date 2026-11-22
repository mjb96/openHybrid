// @ts-check
// =============================================================================
// PLATE SHEET MODEL (js/workout/plate-sheet-model.js)
//
// Pure view model for the plate calculator sheet. No DOM and no storage: it
// turns a target, the athlete's unit and their ACTIVE equipment profile into
// the sentences and chips the sheet renders, so the interesting cases — an
// unreachable target, a rack with only one 25, a load below the bar, junk in
// the input — are unit-tested instead of only seen by eye.
//
// The plate maths itself stays in `plates.js`; this module only decides how to
// state the result. In particular, the shortfall is reported for BOTH sides:
// per-side leftover is the loading instruction, but "how much am I missing?"
// means the pair.
// =============================================================================

import {
  KG_BAR, KG_PLATES, LB_BAR, LB_PLATES,
  computePlateBreakdown, nearestBuildableTotal, platePairs, plateShortfallTotal,
} from './plates.js';

/** The sheet refuses absurd totals rather than drawing a thousand plates. */
export const PLATE_SHEET_MAX_TOTAL = 1500;

/** @param {number} n */
function num(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

/** @param {string} unit */
function unitLabel(unit) {
  return unit === 'lb' || unit === 'lbs' ? 'lbs' : 'kg';
}

/**
 * @typedef {Object} PlateSheetModel
 * @property {boolean} valid            false for blank/NaN/≤0/>1500
 * @property {string} reason            why an invalid target cannot be used
 * @property {number|null} target
 * @property {'kg'|'lbs'} unit
 * @property {number} bar
 * @property {number[]} plates          the active profile's denominations
 * @property {Record<string, number>|null} counts
 * @property {string} profileName
 * @property {{plate:number,count:number}[]} perSide
 * @property {string} perSideText       "20 + 1.25" ('' when nothing fits)
 * @property {{plate:number,count:number}[]} pairs
 * @property {string} headline          the one line the sheet leads with
 * @property {number} shortfallTotal    both sides; 0 when exact/below bar
 * @property {number|null} nearest      nearest buildable total, or null
 * @property {boolean} belowBar
 * @property {number} belowBy           bar - target; 0 when not below
 * @property {boolean} barOnly
 * @property {boolean} limited          a plate count capped the breakdown
 * @property {boolean} exact
 */

/**
 * Build the sheet's view model.
 *
 * `setup` is `getActivePlateSetup(state, unit)`: `{ bar, plates, counts }`.
 * Omitted callers get the standard bar and plate set for the unit, exactly as
 * `plateHint` does, so the model cannot disagree with the inline hint.
 *
 * @param {{ target?: number|string|null, unit?: string, setup?: any, profileName?: string }} [input]
 * @returns {PlateSheetModel}
 */
export function buildPlateSheetModel({ target = null, unit = 'kg', setup = null, profileName = '' } = {}) {
  const label = unitLabel(unit);
  const isLb = label === 'lbs';
  const setupBar = Number(setup?.bar);
  const bar = Number.isFinite(setupBar) && setupBar > 0 ? setupBar : (isLb ? LB_BAR : KG_BAR);
  const setupPlates = Array.isArray(setup?.plates)
    ? setup.plates.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  const plates = setupPlates.length ? setupPlates : [...(isLb ? LB_PLATES : KG_PLATES)];
  const counts = setup && typeof setup.counts === 'object' && setup.counts ? setup.counts : null;
  const profile = String(profileName || '');

  /** @type {PlateSheetModel} */
  const base = {
    valid: false,
    reason: '',
    target: null,
    unit: /** @type {'kg'|'lbs'} */ (label),
    bar,
    plates,
    counts,
    profileName: profile,
    perSide: [],
    perSideText: '',
    pairs: [],
    headline: '',
    shortfallTotal: 0,
    nearest: null,
    belowBar: false,
    belowBy: 0,
    barOnly: false,
    limited: false,
    exact: false,
  };

  // A blank input is the normal first paint, not an error: state why there is
  // no result yet so the sheet never looks broken.
  const raw = target == null ? '' : String(target).trim();
  if (!raw) return { ...base, reason: 'Enter a total weight.' };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { ...base, reason: 'Enter a total weight.' };
  if (value <= 0) return { ...base, reason: 'Enter a weight above zero.' };
  if (value > PLATE_SHEET_MAX_TOTAL) {
    return { ...base, target: value, reason: `Keep the total at or below ${PLATE_SHEET_MAX_TOTAL}.` };
  }

  const bd = computePlateBreakdown(value, bar, plates, counts);
  const perSideText = bd.perSide.map(({ plate, count }) => `${num(plate)}${count > 1 ? ` ×${count}` : ''}`).join(' + ');
  const shortfallTotal = plateShortfallTotal(bd);
  const nearest = nearestBuildableTotal(value, bd);
  const belowBy = bd.belowBar ? Math.round((bar - value) * 100) / 100 : 0;

  let headline;
  if (bd.belowBar) headline = `${num(value)} ${label} is under the bar`;
  else if (bd.barOnly) headline = 'Bar only';
  else if (bd.exact) headline = perSideText || 'Bar only';
  else headline = `${perSideText || 'No plates fit'} · ${num(shortfallTotal)} ${label} short`;

  return {
    ...base,
    valid: true,
    target: value,
    perSide: bd.perSide.map(({ plate, count }) => ({ plate, count })),
    perSideText,
    pairs: platePairs(bd),
    headline,
    shortfallTotal,
    nearest,
    belowBar: bd.belowBar,
    belowBy,
    barOnly: bd.barOnly,
    limited: bd.limited,
    exact: bd.exact,
  };
}

/**
 * The one sentence a shortfall needs, or '' when the target is exact/buildable.
 * Kept here rather than in the DOM module so the wording is testable.
 * @param {PlateSheetModel} model
 * @returns {string}
 */
export function plateShortfallText(model) {
  if (!model?.valid || model.exact || model.belowBar || model.shortfallTotal <= 0) return '';
  const nearest = model.nearest == null ? '' : ` Nearest buildable: ${num(model.nearest)} ${model.unit}.`;
  return `${num(model.shortfallTotal)} ${model.unit} short in total.${nearest}`;
}

/**
 * The below-bar sentence, including the delta to the empty bar.
 * @param {PlateSheetModel} model
 * @returns {string}
 */
export function plateBelowBarText(model) {
  if (!model?.valid || !model.belowBar) return '';
  return `${num(model.belowBy)} ${model.unit} below the ${num(model.bar)} ${model.unit} bar.`;
}

/** @param {number} n */
export function formatPlateNumber(n) {
  return num(n);
}
