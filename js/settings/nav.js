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
  // `Object.hasOwn`, not a truthiness lookup: "constructor" and "toString" are
  // inherited from Object.prototype and would otherwise resolve to a function
  // instead of falling back to Training.
  return Object.hasOwn(SETTINGS_GROUP_BY_LABEL, key) ? SETTINGS_GROUP_BY_LABEL[key] : 'training';
}

/**
 * @param {Element|null|undefined} root
 * @param {string} needle
 * @param {{ isModuleEnabled?: (moduleId: string) => boolean, boundary?: Element|null }} [options]
 * @returns {boolean}
 */
function matchesQuery(root, needle, { isModuleEnabled, boundary } = {}) {
  if (!root) return false;
  if (!needle) return true;
  const enabled = typeof isModuleEnabled === 'function' ? isModuleEnabled : () => true;
  const inDisabledSubtree = (element) => {
    let current = element;
    while (current && current.nodeType === 1) {
      if (current.hasAttribute('data-module') && !enabled(current.getAttribute('data-module'))) return true;
      if (current === (boundary || root)) break;
      current = current.parentElement;
    }
    return false;
  };
  if (inDisabledSubtree(root)) return false;

  const parts = [];
  const doc = root.ownerDocument;
  if (doc?.createTreeWalker) {
    const walker = doc.createTreeWalker(root, 4); // NodeFilter.SHOW_TEXT
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!inDisabledSubtree(node.parentElement)) parts.push(node.nodeValue || '');
    }
  } else {
    parts.push(root.textContent || '');
  }

  const ownLabel = root.getAttribute?.('aria-label');
  if (ownLabel) parts.push(ownLabel);
  const ownTitle = root.getAttribute?.('title');
  if (ownTitle) parts.push(ownTitle);

  root.querySelectorAll('[aria-label], [title], option').forEach((node) => {
    if (inDisabledSubtree(node)) return;
    const ariaLabel = node.getAttribute('aria-label');
    if (ariaLabel) parts.push(ariaLabel);
    const title = node.getAttribute('title');
    if (title) parts.push(title);
    if (node.tagName === 'OPTION') parts.push(node.textContent || '');
  });

  return parts.join(' ').toLowerCase().includes(needle);
}

/**
 * Does a settings card match a search term? Matches the card's visible text
 * plus words that are only exposed to assistive tech or on hover: `aria-label`,
 * `title`, and `<option>` labels. A control whose visible label is short (for
 * example an equipment profile selector listing "Home") must still be findable
 * by its accessible name.
 *
 * Module-disabled subtrees are invisible, so their words must not match: a
 * Running switch that is off cannot make "threshold pace" return a blank card.
 * `isModuleEnabled` receives the module id; the walk skips every element whose
 * nearest disabled `[data-module]` ancestor (including the card itself) owns it.
 *
 * @param {Element|null|undefined} section
 * @param {string|null|undefined} query
 * @param {{ isModuleEnabled?: (moduleId: string) => boolean }} [options]
 * @returns {boolean}
 */
export function sectionMatchesQuery(section, query, { isModuleEnabled } = {}) {
  return matchesQuery(section, String(query || '').trim().toLowerCase(), { isModuleEnabled });
}

/**
 * The first actual row a search should open, not merely the card that contains
 * it. Returns null for an empty/non-matching query.
 * @param {Element|null|undefined} section
 * @param {string|null|undefined} query
 * @param {{ isModuleEnabled?: (moduleId: string) => boolean }} [options]
 * @returns {Element|null}
 */
export function firstMatchingRow(section, query, { isModuleEnabled } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  if (!section || !needle) return null;
  const rows = [...section.querySelectorAll('.settings-row, .run-grid-inputs, .settings-hint')];
  return rows.find((row) => matchesQuery(row, needle, { isModuleEnabled, boundary: section })) || null;
}
