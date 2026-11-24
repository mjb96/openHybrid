// @ts-check
// =============================================================================
// SETTINGS ROUTE (pure)
//
// The app is a static PWA: the hosted build lives under a GitHub Pages
// sub-path and Android serves it from WebViewAssetLoader, so a History-API
// path cannot be refreshed without a server rewrite. The route token is kept
// in the hash and still reads as `/settings`:
//
//   #/settings            Settings
//   #/settings/profile    Profile
//   #/settings/<page>     a future settings page
//
// Legacy `#profile` and `#settings` hashes redirect to the canonical route.
// =============================================================================

export const SETTINGS_HASH = '#/settings';

/**
 * @param {string} hash
 * @returns {{ page: string, rest: string[], legacy: boolean }|null}
 */
export function settingsRouteFromHash(hash) {
  const raw = String(hash || '');
  if (/^#\/?(profile)\/?$/i.test(raw)) return { page: 'profile', rest: [], legacy: true };
  const match = raw.match(/^#\/?settings(?:\/([^?]*))?\/?$/i);
  if (!match) return null;
  const parts = (match[1] || '').split('/').filter(Boolean);
  return { page: parts[0] || '', rest: parts.slice(1), legacy: false };
}

/** @param {string} [page] */
export function settingsHashForPage(page = '') {
  return page === 'profile' ? `${SETTINGS_HASH}/profile` : SETTINGS_HASH;
}
