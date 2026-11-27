// @ts-check
// ==========================================
// UTILITY HELPERS (util.js)
// ==========================================
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (c) => ESC[c]);

// A key that JavaScript treats specially on assignment. Imported plans and
// exercise names reach plain-object maps (`lifts[day][name]`), where assigning
// `__proto__` replaces the map's prototype instead of storing a lift.
const UNSAFE_RECORD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
/** @param {unknown} key */
export function isUnsafeRecordKey(key) {
  return UNSAFE_RECORD_KEYS.has(String(key));
}

// Imported custom programs may carry colour metadata that is rendered into an
// inline style. Keep the small colour vocabulary the app uses and reject
// quotes, URLs, declarations and other CSS capable of escaping that property.
export const safeCssColor = (value, fallback = '#3b82f6') => {
  const color = String(value || '').trim();
  return /^(?:#[0-9a-f]{3,8}|var\(--[a-z0-9-]+\)|(?:rgb|hsl)a?\([0-9.,% /-]+\))$/i.test(color)
    ? color
    : fallback;
};

export const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// A private reference link is the only free-text URL the athlete can store.
// Normalise and allow ONLY http(s): reject control characters, embedded
// credentials and every non-web scheme (javascript:, data:, blob:, file:,
// intent:, mailto: …) so a stored value can never become an execution or
// local-file primitive. Returns '' for anything unsafe. Never fetches it.
export const safeExternalHttpUrl = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return '';
  if (/[\u0000-\u001f\u007f]/.test(raw)) return '';
  // Protocol-relative input is not a URL the athlete typed; refuse it rather
  // than guess which host it was meant to inherit.
  if (raw.startsWith('//')) return '';
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  let url;
  try { url = new URL(candidate); } catch { return ''; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
  if (url.username || url.password) return '';
  if (!url.hostname) return '';
  const href = url.href;
  if (href.length > 2048) return '';
  return href;
};

// Program completion %, by *completed* weeks: in week N you've finished N-1 of
// `total`. Single source of truth so the library banner and active-plan hero
// can't drift apart. Clamped to 0–100.
export const programProgressPct = (currentWeek, totalWeeks) => {
  const n = parseInt(currentWeek, 10) || 1;
  const t = parseInt(totalWeeks, 10) || 12;
  return Math.min(100, Math.max(0, Math.round(((n - 1) / t) * 100)));
};
