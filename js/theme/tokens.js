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
  bg: '#060606', 'surface-1': '#1B1B1B', 'surface-2': '#252525', 'surface-3': '#2D2D2D',
  divider: 'rgba(255,255,255,.08)', 'border-strong': 'rgba(255,255,255,.14)',
  text: '#F2F2F2', 'text-2': '#B0B0B0', 'text-3': '#969696', 'text-inverse': '#04202A',
  accent: '#22D3EE', 'accent-pressed': '#06B6D4', 'accent-subtle': 'rgba(34,211,238,.14)',
  'on-accent': '#04202A', 'accent-text': '#22D3EE',
  success: '#34D399', 'success-subtle': 'rgba(52,211,153,.14)',
  warning: '#FBBF24', 'warning-subtle': 'rgba(251,191,36,.14)',
  danger: '#F87171', 'danger-subtle': 'rgba(248,113,113,.14)',
  info: '#60A5FA', 'info-subtle': 'rgba(96,165,250,.14)',
  'warning-text': '#FBBF24', 'success-text': '#34D399', 'danger-text': '#F87171', 'info-text': '#60A5FA',
  'domain-strength': '#7C8CFF', 'domain-endurance': '#FF9F5A', 'domain-recovery': '#34D399',
  'data-1': '#4C8DF6', 'data-2': '#34C77B', 'data-3': '#F59A3D', 'data-4': '#EF5A6F',
  'data-5': '#9B7BF2', 'data-6': '#E873B9', 'data-7': '#2BB8B0', 'data-8': '#8A8A8A',
  'overlay-scrim': 'rgba(6,6,6,.76)', 'focus-ring': '#22D3EE',
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
  'warning-text': '#92400E', 'success-text': '#065F46', 'danger-text': '#991B1B', 'info-text': '#1E40AF',
  'domain-strength': '#4338CA', 'domain-endurance': '#C2410C', 'domain-recovery': '#047857',
  'data-1': '#1D4ED8', 'data-2': '#047857', 'data-3': '#B45309', 'data-4': '#B91C1C',
  'data-5': '#6D28D9', 'data-6': '#BE185D', 'data-7': '#0F766E', 'data-8': '#475569',
  'overlay-scrim': 'rgba(15,23,42,.38)', 'focus-ring': '#0E7490',
});

/** @param {TokenMap} base @param {TokenMap} overrides */
function palette(base, overrides) {
  return Object.freeze({ ...base, ...overrides });
}

// Alternate dark palettes. Status/data colours are shared; only the surfaces,
// text and accent change. Mirrors the CSS blocks in css/tokens.css.
/** @type {TokenMap} */
export const SLATE_TOKENS = palette(MIDNIGHT_TOKENS, {
  bg: '#0A0F1A', 'surface-1': '#162033', 'surface-2': '#1C2941', 'surface-3': '#21314D',
  text: '#F1F5F9', 'text-2': '#B7C3D5', 'text-3': '#8D9BB1',
  accent: '#38BDF8', 'accent-pressed': '#0EA5E9', 'accent-subtle': 'rgba(56,189,248,.14)',
  'accent-text': '#7DD3FC', 'overlay-scrim': 'rgba(10,15,26,.78)', 'focus-ring': '#38BDF8',
});

/** @type {TokenMap} */
export const FOREST_TOKENS = palette(MIDNIGHT_TOKENS, {
  bg: '#05100B', 'surface-1': '#0F2319', 'surface-2': '#132D20', 'surface-3': '#173626',
  text: '#EDF7F1', 'text-2': '#B0C7BA', 'text-3': '#88A895', 'text-inverse': '#04231A',
  accent: '#34D399', 'accent-pressed': '#10B981', 'accent-subtle': 'rgba(52,211,153,.14)',
  'on-accent': '#04231A', 'accent-text': '#6EE7B7',
  'overlay-scrim': 'rgba(5,16,11,.78)', 'focus-ring': '#34D399',
});

/** @type {TokenMap} */
export const EMBER_TOKENS = palette(MIDNIGHT_TOKENS, {
  bg: '#120B08', 'surface-1': '#291B15', 'surface-2': '#34231B', 'surface-3': '#3E2A20',
  text: '#F7F0EA', 'text-2': '#CDB9AB', 'text-3': '#AB9282', 'text-inverse': '#2A1204',
  accent: '#FB923C', 'accent-pressed': '#F97316', 'accent-subtle': 'rgba(251,146,60,.14)',
  'on-accent': '#2A1204', 'accent-text': '#FDBA74',
  'overlay-scrim': 'rgba(18,11,8,.78)', 'focus-ring': '#FB923C',
});

/** Dark palettes by id. Midnight is the fallback for an unknown value. */
export const PALETTE_TOKENS = Object.freeze({
  midnight: MIDNIGHT_TOKENS,
  slate: SLATE_TOKENS,
  forest: FOREST_TOKENS,
  ember: EMBER_TOKENS,
});

export const TOKEN_KEYS = Object.freeze(Object.keys(MIDNIGHT_TOKENS));

/** @param {HTMLElement|null|undefined} root */
export function activeMode(root) {
  return root?.getAttribute?.('data-theme') === 'light' ? 'light' : 'dark';
}

/** @param {HTMLElement|null|undefined} root */
export function activePalette(root) {
  const id = root?.getAttribute?.('data-palette');
  return id && PALETTE_TOKENS[id] ? id : 'midnight';
}

/** @param {HTMLElement|null|undefined} root */
export function resolveThemeTokens(root) {
  if (activeMode(root) === 'light') return LIGHT_TOKENS;
  return PALETTE_TOKENS[activePalette(root)];
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
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { mode: activeMode(root), palette: activePalette(root), tokens: map } }));
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
