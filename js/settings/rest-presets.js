// @ts-check
// =============================================================================
// REST PRESETS (pure)
//
// The presets and the "which preset am I on?" question used to live in two
// places: the numbers in `js/settings.js` and the active-button highlight
// nowhere at all. The highlight is derived from the stored tiers, never stored
// separately, so a custom tier set honestly shows no preset as active.
// =============================================================================
import { DEFAULT_REST_TIERS } from '../workout/rest-duration.js';

/** @typedef {{warmup:number, compound:number, accessory:number, isolation:number}} RestTiers */

/**
 * Named tier bundles. `hypertrophy` is exactly the product default, so the
 * default state reports "Standard" without a second copy of the numbers.
 * @type {Readonly<Record<string, Readonly<RestTiers>>>}
 */
export const REST_PRESETS = Object.freeze({
  strength: Object.freeze({ warmup: 60, compound: 240, accessory: 180, isolation: 120 }),
  hypertrophy: Object.freeze({ ...DEFAULT_REST_TIERS }),
  efficient: Object.freeze({ warmup: 30, compound: 120, accessory: 90, isolation: 60 }),
});

/**
 * The preset whose tiers exactly match `tiers`, or null for custom values.
 * A missing warm-up reads as the product default (the field has been optional
 * since the setting shipped).
 * @param {Partial<RestTiers>|null|undefined} tiers
 * @param {Readonly<Record<string, Readonly<RestTiers>>>} [presets]
 * @returns {string|null}
 */
export function restPresetFor(tiers, presets = REST_PRESETS) {
  if (!tiers || typeof tiers !== 'object') return null;
  const read = (key) => {
    const raw = tiers[key];
    if (raw == null && key === 'warmup') return DEFAULT_REST_TIERS.warmup;
    return Number(raw);
  };
  for (const [name, preset] of Object.entries(presets)) {
    if (read('warmup') === preset.warmup
      && read('compound') === preset.compound
      && read('accessory') === preset.accessory
      && read('isolation') === preset.isolation) {
      return name;
    }
  }
  return null;
}
