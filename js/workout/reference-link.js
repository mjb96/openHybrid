// @ts-check
// =============================================================================
// PRIVATE EXERCISE REFERENCE LINK (js/workout/reference-link.js)
//
// A stored reference URL is a private shortcut the athlete attached to an
// exercise, not session data. It is built as a REAL anchor through DOM APIs —
// never by string concatenation into innerHTML — so the URL can only ever be an
// href attribute, never markup. Only http(s) URLs survive `safeExternalHttpUrl`.
// =============================================================================
import { safeExternalHttpUrl } from '../util.js';

/** The visible label, decided by the destination host. */
export function referenceLinkLabel(url) {
  const safe = safeExternalHttpUrl(url);
  if (!safe) return '';
  let host = '';
  try { host = new URL(safe).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; }
  if (host === 'youtube.com' || host === 'youtu.be' || host.endsWith('.youtube.com')) {
    return 'Watch on YouTube';
  }
  return 'Open reference';
}

/**
 * Build the exercise-card anchor for a valid reference URL, or null when the
 * value is missing/unsafe. Pure DOM construction: no innerHTML, no fetch.
 * @param {Document} documentRef
 * @param {string} url
 * @param {string} [exerciseName]
 */
export function createReferenceLink(documentRef, url, exerciseName = '') {
  const safe = safeExternalHttpUrl(url);
  if (!safe || !documentRef?.createElement) return null;
  const label = referenceLinkLabel(safe);
  const anchor = documentRef.createElement('a');
  anchor.className = 'cockpit-ex-link';
  anchor.setAttribute('href', safe);
  anchor.setAttribute('target', '_blank');
  anchor.setAttribute('rel', 'noopener noreferrer');
  // This is a private link; do not leak the app URL to the destination either.
  anchor.setAttribute('referrerpolicy', 'no-referrer');
  anchor.setAttribute(
    'aria-label',
    exerciseName ? `${label} for ${exerciseName} (opens in a new tab)` : `${label} (opens in a new tab)`,
  );
  anchor.textContent = label;
  return anchor;
}
