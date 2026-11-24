// @ts-check
// =============================================================================
// MOTION PREFERENCE (js/ui/motion.js)
//
// Accessibility preference for decorative motion. `system` follows the OS,
// `reduce` forces the reduced-motion stylesheet, `full` opts back in. The CSS
// hook is `html[data-reduced-motion="reduce"]`; this module never animates
// anything itself.
// =============================================================================

export const MOTION_PREFERENCES = Object.freeze(['system', 'reduce', 'full']);

/** @param {unknown} value */
export function normalizeMotionPreference(value) {
  return value === 'reduce' || value === 'full' ? value : 'system';
}

/**
 * @param {unknown} preference
 * @param {boolean} systemReduces
 * @returns {'reduce'|'full'}
 */
export function effectiveReducedMotion(preference, systemReduces) {
  const pref = normalizeMotionPreference(preference);
  if (pref === 'reduce') return 'reduce';
  if (pref === 'full') return 'full';
  return systemReduces ? 'reduce' : 'full';
}

/**
 * Publish the preference on the document so CSS can honour it. Returns the
 * effective value for tests and status copy.
 * @param {unknown} preference
 * @param {{ document?: Document, matchMedia?: (query: string) => MediaQueryList }} [env]
 */
export function applyMotionPreference(preference, env = {}) {
  const doc = env.document || (typeof document !== 'undefined' ? document : null);
  if (!doc) return 'full';
  const media = env.matchMedia || (typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia.bind(window)
    : null);
  let systemReduces = false;
  try { systemReduces = !!media?.('(prefers-reduced-motion: reduce)')?.matches; } catch { systemReduces = false; }
  const effective = effectiveReducedMotion(preference, systemReduces);
  doc.documentElement.dataset.reducedMotion = effective;
  doc.documentElement.dataset.reducedMotionPref = normalizeMotionPreference(preference);
  return effective;
}
