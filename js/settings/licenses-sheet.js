// @ts-check
// =============================================================================
// IN-APP LICENCES (js/settings/licenses-sheet.js)
//
// NOTICE.md and LICENSES/Apache-2.0.txt ship with the app (service-worker
// precache and the Android www assets), so the notices are readable offline
// instead of only behind a GitHub link. A failed fetch degrades to the source
// repository link rather than an empty sheet.
//
// The documents are rendered as escaped text in <pre>: this is a legal notice,
// not a page to design, and escaping keeps the no-injection property.
// =============================================================================
import { escapeHtml } from '../util.js';
import { closeManagedModal, openManagedModal } from '../ui/modal-stack.js';

const SOURCES = Object.freeze([
  { id: 'notice', title: 'Third-party notices', file: './NOTICE.md' },
  { id: 'apache', title: 'Apache License 2.0', file: './LICENSES/Apache-2.0.txt' },
]);

const REPO_URL = 'https://github.com/mjb96/openHybrid';

/** @type {Record<string, string>|null} */
let _cache = null;
let _loading = false;

function elements() {
  return {
    sheet: document.getElementById('licensesSheet'),
    backdrop: document.getElementById('licensesBackdrop'),
    body: document.getElementById('licensesBody'),
  };
}

/**
 * Pure renderer, exported for the unit test.
 * @param {Record<string, string|undefined>} [docs]
 * @returns {string}
 */
export function licensesSheetHTML(docs = {}) {
  const sections = SOURCES
    .filter(({ id }) => typeof docs[id] === 'string' && docs[id])
    .map(({ id, title }) => `<section class="licenses-sheet__section">
      <h4 id="licenses-${id}">${escapeHtml(title)}</h4>
      <pre tabindex="0" aria-label="${escapeHtml(title)}">${escapeHtml(docs[id])}</pre>
    </section>`)
    .join('');
  if (sections) return sections;
  return `<p class="licenses-sheet__fallback">The notices could not be loaded. They are kept in the
    <a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">source repository</a>.</p>`;
}

export async function openLicensesSheet() {
  const { sheet, backdrop, body } = elements();
  if (!sheet) return;
  sheet.classList.add('active');
  backdrop?.classList.add('active');
  openManagedModal(sheet, { initialFocus: '.sheet-close-btn' });

  if (body) {
    body.innerHTML = _cache
      ? licensesSheetHTML(_cache)
      : '<p class="licenses-sheet__loading">Loading…</p>';
  }
  if (_cache || _loading) return;

  _loading = true;
  try {
    /** @type {Array<[string, string]>} */
    const entries = await Promise.all(SOURCES.map(async ({ id, file }) => {
      const response = await fetch(file);
      if (!response.ok) throw new Error(`${file}: ${response.status}`);
      return [id, await response.text()];
    }));
    _cache = Object.fromEntries(entries);
    if (sheet.classList.contains('active') && body) body.innerHTML = licensesSheetHTML(_cache);
  } catch {
    if (sheet.classList.contains('active') && body) body.innerHTML = licensesSheetHTML({});
  } finally {
    _loading = false;
  }
}

export function closeLicensesSheet() {
  const { sheet, backdrop } = elements();
  if (!sheet) return;
  sheet.classList.remove('active');
  backdrop?.classList.remove('active');
  closeManagedModal(sheet);
}
