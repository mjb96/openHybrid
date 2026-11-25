// @ts-check
// =============================================================================
// THEME PALETTES (js/theme.js)
//
// The icon is the visual anchor: Midnight uses its near-black navy, steel text
// and cyan/lime accents. Slate keeps the pre-icon dark theme, Forest and Ember
// are alternate dark moods. Light remains its own palette.
//
// The palette lives on <html data-palette="…">; CSS owns the actual colours.
// =============================================================================
import { applyThemeTokens } from './theme/tokens.js';

export const PALETTES = Object.freeze([
  { id: 'midnight', label: 'Midnight', note: 'Icon palette — navy, steel, cyan' },
  { id: 'slate', label: 'Slate', note: 'The original dark blue' },
  { id: 'forest', label: 'Forest', note: 'Deep green with teal' },
  { id: 'ember', label: 'Ember', note: 'Warm charcoal with amber' },
]);

export const DEFAULT_PALETTE = 'midnight';
const IDS = new Set(PALETTES.map((palette) => palette.id));

/** @param {unknown} value */
export function normalizePalette(value) {
  return IDS.has(String(value)) ? /** @type {any} */ (String(value)) : DEFAULT_PALETTE;
}

/**
 * @param {HTMLElement|null} root
 * @param {unknown} value
 */
export function applyPalette(root, value) {
  const id = normalizePalette(value);
  if (root?.dataset) root.dataset.palette = id;
  // Keep the semantic layer in sync; the default Midnight/light tokens are the
  // only ones shipped in Part A.
  applyThemeTokens(root);
  return id;
}
