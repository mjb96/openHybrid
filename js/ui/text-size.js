// @ts-check
// =============================================================================
// TEXT SIZE (ST8)
//
// An accessibility display preference, not a second theme. The CSS hook is
// `html[data-text-size="large|xlarge"]` scaling the ROOT font size, so every
// rem-based surface grows together; the stored value is the preference only.
// =============================================================================

export const TEXT_SIZES = Object.freeze(['default', 'large', 'xlarge']);

/** @param {unknown} value */
export function normalizeTextSize(value) {
  return value === 'large' || value === 'xlarge' ? value : 'default';
}

/** Root font-size percentage for each step (default is the browser's 100%). */
export function textSizePercent(value) {
  const size = normalizeTextSize(value);
  return size === 'large' ? 112.5 : size === 'xlarge' ? 125 : 100;
}

/**
 * Publish the preference on <html>. Never throws without a DOM.
 * @param {any} root
 * @param {unknown} value
 */
export function applyTextSize(root, value) {
  if (!root || typeof root !== 'object') return;
  root.dataset.textSize = normalizeTextSize(value);
}
