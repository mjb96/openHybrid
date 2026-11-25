// @ts-check
// =============================================================================
// THEME TOKENS (js/theme/tokens.js)
//
// The semantic layer components consume. CSS owns the same names as custom
// properties; this module is the resolved read path for canvas/SVG charts and
// for the future theme engine. `useThemeTokens` subscribes to `theme:changed`
// so a chart can redraw when the active theme changes.
// =============================================================================

/** @typedef {Record<string, string>} TokenMap */

/** @type {TokenMap} */
export const MIDNIGHT_TOKENS = Object.freeze({
  bg: '#070B14', 'surface-1': '#0F1624', 'surface-2': '#161F31', 'surface-3': '#1D2840',
  divider: 'rgba(255,255,255,.08)', 'border-strong': 'rgba(255,255,255,.14)',
  text: '#EEF2F8', 'text-2': '#A3AEC2', 'text-3': '#7584A0', 'text-inverse': '#04202A',
  accent: '#22D3EE', 'accent-pressed': '#06B6D4', 'accent-subtle': 'rgba(34,211,238,.14)',
  'on-accent': '#04202A', 'accent-text': '#22D3EE',
  success: '#34D399', 'success-subtle': 'rgba(52,211,153,.14)',
  warning: '#FBBF24', 'warning-subtle': 'rgba(251,191,36,.14)',
  danger: '#F87171', 'danger-subtle': 'rgba(248,113,113,.14)',
  info: '#60A5FA', 'info-subtle': 'rgba(96,165,250,.14)',
  'domain-strength': '#7C8CFF', 'domain-endurance': '#FF9F5A', 'domain-recovery': '#34D399',
  'data-1': '#4C8DF6', 'data-2': '#34C77B', 'data-3': '#F59A3D', 'data-4': '#EF5A6F',
  'data-5': '#9B7BF2', 'data-6': '#E873B9', 'data-7': '#2BB8B0', 'data-8': '#7D8799',
  'tile-1': '#4C8DF6', 'tile-2': '#34C77B', 'tile-3': '#F59A3D', 'tile-4': '#EF5A6F',
  'tile-5': '#9B7BF2', 'tile-6': '#E873B9', 'tile-7': '#2BB8B0', 'tile-8': '#7D8799',
  'overlay-scrim': 'rgba(7,11,20,.72)', 'focus-ring': '#22D3EE',
});

/** @type {TokenMap} */
export const LIGHT_TOKENS = Object.freeze({
  bg: '#F0F4F8', 'surface-1': '#FFFFFF', 'surface-2': '#F4F7FB', 'surface-3': '#E4EAF2',
  divider: 'rgba(15,23,42,.08)', 'border-strong': 'rgba(15,23,42,.16)',
  text: '#0F172A', 'text-2': '#475569', 'text-3': '#526176', 'text-inverse': '#FFFFFF',
  accent: '#0E7490', 'accent-pressed': '#155E75', 'accent-subtle': 'rgba(14,116,144,.12)',
  'on-accent': '#FFFFFF', 'accent-text': '#155E75',
  success: '#047857', 'success-subtle': 'rgba(4,120,87,.10)',
  warning: '#B45309', 'warning-subtle': 'rgba(180,83,9,.10)',
  danger: '#B91C1C', 'danger-subtle': 'rgba(185,28,28,.10)',
  info: '#1D4ED8', 'info-subtle': 'rgba(29,78,216,.10)',
  'domain-strength': '#4338CA', 'domain-endurance': '#C2410C', 'domain-recovery': '#047857',
  'data-1': '#1D4ED8', 'data-2': '#047857', 'data-3': '#B45309', 'data-4': '#B91C1C',
  'data-5': '#6D28D9', 'data-6': '#BE185D', 'data-7': '#0F766E', 'data-8': '#475569',
  'tile-1': '#1D4ED8', 'tile-2': '#047857', 'tile-3': '#B45309', 'tile-4': '#B91C1C',
  'tile-5': '#6D28D9', 'tile-6': '#BE185D', 'tile-7': '#0F766E', 'tile-8': '#475569',
  'overlay-scrim': 'rgba(15,23,42,.38)', 'focus-ring': '#0E7490',
});

export const TOKEN_KEYS = Object.freeze(Object.keys(MIDNIGHT_TOKENS));

/** @param {HTMLElement|null|undefined} root */
export function activeMode(root) {
  return root?.getAttribute?.('data-theme') === 'light' ? 'light' : 'dark';
}

/** @param {HTMLElement|null|undefined} root */
export function resolveThemeTokens(root) {
  return activeMode(root) === 'light' ? LIGHT_TOKENS : MIDNIGHT_TOKENS;
}

/** @param {string} key */
function customPropertyName(key) {
  return key.startsWith('--') ? key : `--${key}`;
}

/**
 * The browser/Android chrome colour cannot read a CSS variable, so it is the
 * one place that needs the resolved value pushed at runtime. Keeps the status
 * bar in step with light mode instead of pinning the boot navy.
 * @param {TokenMap} [tokens]
 * @param {Document|null} [doc]
 */
export function syncThemeColorMeta(tokens, doc = typeof document !== 'undefined' ? document : null) {
  const meta = doc?.querySelector?.('meta[name="theme-color"]');
  if (!meta) return;
  meta.setAttribute('content', (tokens || MIDNIGHT_TOKENS).bg);
}

/**
 * Publish the semantic layer as CSS custom properties. CSS already defines the
 * default values; this is the runtime path for the theme engine and for tests.
 * @param {HTMLElement|null|undefined} root
 * @param {TokenMap} [tokens]
 */
export function applyThemeTokens(root, tokens) {
  if (!root?.style?.setProperty) return;
  const map = tokens || resolveThemeTokens(root);
  for (const [key, value] of Object.entries(map)) {
    root.style.setProperty(customPropertyName(key), value);
  }
  syncThemeColorMeta(map);
  if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { mode: activeMode(root), tokens: map } }));
  }
}

/**
 * Resolve tokens now and again whenever the theme changes.
 * @param {(tokens: TokenMap, mode: string) => void} callback
 * @param {HTMLElement|null|undefined} [root]
 * @returns {() => void} unsubscribe
 */
export function useThemeTokens(callback, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (typeof callback !== 'function') return () => {};
  const fire = () => callback(resolveThemeTokens(root), activeMode(root));
  fire();
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('theme:changed', fire);
  return () => window.removeEventListener('theme:changed', fire);
}
