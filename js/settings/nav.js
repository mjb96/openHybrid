// @ts-check
// =============================================================================
// SETTINGS NAVIGATION MODEL (pure)
//
// Settings renders ONE scroll panel split into `.settings-section` cards. The
// five tab buttons are filters over those cards, not a tablist with panels, so
// this module owns the whole mapping: which cards exist as destinations, which
// group a card belongs to, and whether a card matches a search term.
//
// Pure on purpose — tests can verify the HTML contract without booting the app
// or a browser. `js/settings.js` owns rendering and visibility.
// =============================================================================

/**
 * The five visible settings destinations. This is deliberately fixed: adding a
 * sixth tab fragments scanability, so new settings join an existing group.
 * @type {ReadonlyArray<{id: string, label: string}>}
 */
export const SETTINGS_TABS = Object.freeze([
  { id: 'profile', label: 'Profile' },
  { id: 'training', label: 'Training' },
  { id: 'health', label: 'Health' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'data', label: 'Data' },
]);

/**
 * Top-level card label -> tab. `js/settings.js` reads the label from the DOM,
 * so this is the only place the association is written down. An unknown label
 * falls back to Training: hiding a card entirely is worse than filing it in the
 * largest group, and the fallback is exercised by `tests/settings_nav.test.js`.
 * @type {Readonly<Record<string, string>>}
 */
export const SETTINGS_GROUP_BY_LABEL = Object.freeze({
  Profile: 'profile',
  Training: 'training',
  Logging: 'training',
  Modules: 'training',
  'Program Week': 'training',
  Equipment: 'training',
  Fasting: 'health',
  Notifications: 'health',
  Appearance: 'appearance',
  'Data & Backups': 'data',
  'Health Connect': 'health',
  App: 'data',
});

/**
 * Resolve a section label to its tab id.
 * @param {string|null|undefined} label
 * @returns {string}
 */
export function settingsGroupForLabel(label) {
  const key = String(label || '').trim();
  return SETTINGS_GROUP_BY_LABEL[key] || 'training';
}

/**
 * Does a settings card match a search term? Matches the card's visible text
 * plus words that are only exposed to assistive tech or on hover: `aria-label`,
 * `title`, and `<option>` labels. A control whose visible label is short (for
 * example an equipment profile selector listing "Home") must still be findable
 * by its accessible name.
 * @param {Element|null|undefined} section
 * @param {string|null|undefined} query
 * @returns {boolean}
 */
export function sectionMatchesQuery(section, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!section) return false;
  if (!needle) return true;

  const parts = [section.textContent || ''];
  const ownLabel = section.getAttribute?.('aria-label');
  if (ownLabel) parts.push(ownLabel);
  const ownTitle = section.getAttribute?.('title');
  if (ownTitle) parts.push(ownTitle);

  section.querySelectorAll('[aria-label], [title], option').forEach((node) => {
    const ariaLabel = node.getAttribute('aria-label');
    if (ariaLabel) parts.push(ariaLabel);
    const title = node.getAttribute('title');
    if (title) parts.push(title);
    if (node.tagName === 'OPTION') parts.push(node.textContent || '');
  });

  return parts.join(' ').toLowerCase().includes(needle);
}
