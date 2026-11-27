// @ts-check
// =============================================================================
// The athlete's weight unit, for DISPLAY and for the one conversion boundary.
//
// Two lines would be enough for a label, but ST6 made storage canonical: every
// weight in `appState` is kilograms, and the DOM/display layer works in the
// athlete's unit. This file is the single place the workout modules cross that
// boundary, so a new writer cannot quietly store a display number.
//
// It is its own module (not in workout.js) because the modules split out of
// workout.js need it, and importing workout.js back would be a cycle.
// =============================================================================

import {
  canonicalWeightString,
  displayWeightString,
  normalizeWeightUnit,
} from '../metrics/weight-unit.js';

/**
 * The unit to show beside a load. Anything other than an explicit 'lbs' is kg,
 * so an absent or malformed setting labels kg rather than nothing.
 * @param {any} appState
 * @returns {'kg'|'lbs'}
 */
export function weightUnitLabel(appState) {
  return appState?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';
}

/**
 * Stored kilograms → the string a weight input/placeholder should show.
 * @param {any} appState
 * @param {unknown} stored
 * @param {{ decimals?: number }} [options]
 */
export function displayWeight(appState, stored, options) {
  return displayWeightString(stored, weightUnitLabel(appState), options);
}

/**
 * A typed display value → the string to persist (canonical kilograms).
 * A blank input stays blank: a blank row is not a 0 kg set.
 * @param {any} appState
 * @param {unknown} value
 */
export function storedWeightFromInput(appState, value) {
  return canonicalWeightString(value, weightUnitLabel(appState));
}

/**
 * Should a weight input's text be written back into storage?
 *
 * A persisted kilogram value is rendered in the display unit with ONE decimal,
 * so re-parsing that same text is lossy (100 kg → "220.5" → 100.02 kg). When the
 * field still shows the value it was rendered from, the stored number is already
 * correct and must be left alone — even on a tick, and even on a notes-only save.
 *
 * @param {{ entered: unknown, displayed: unknown, hasStoredWeight: boolean }} input
 */
export function shouldCommitEnteredWeight({ entered, displayed, hasStoredWeight }) {
  if (!hasStoredWeight) return true;
  if (displayed == null) return true;
  return String(entered ?? '').trim() !== String(displayed).trim();
}

/** The athlete's unit, normalised for maths helpers. */
export function weightUnitOf(appState) {
  return normalizeWeightUnit(weightUnitLabel(appState));
}
