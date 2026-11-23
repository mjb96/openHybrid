// @ts-check
// =============================================================================
// PROGRESS PHOTO VIEWER (js/ui/photo-viewer.js)
//
// A progress photo you cannot look at is not a feature. The first version put a
// 44px delete button over a 64px tile, so tapping a photo asked "delete?" and
// there was no way to see it at all.
//
// One managed modal: Escape/Back close it, focus is trapped, and the actions
// live HERE rather than on the tile so the tile's only job is "open". A second
// photo can be picked for a side-by-side comparison; Replace and Edit call back
// into the caller, which owns the stores.
// =============================================================================
import { getPhotoBlob } from '../db.js';
import { closeManagedModal, openManagedModal } from './modal-stack.js';
import { formatDayMonthShort } from '../dates.js';

let _root = null;
let _img = null;
let _compare = null;
let _imgA = null;
let _imgB = null;
let _capA = null;
let _capB = null;
let _dateEl = null;
let _pick = null;
let _replaceBtn = null;
let _editBtn = null;
/** @type {{ date: string, dates: string[], onDelete: (date: string) => void, onReplace?: (date: string) => void, onEditEntry?: (date: string, root: HTMLElement) => void }|null} */
let _context = null;
/** Every object URL handed to an <img>, revoked together on close/reload. */
/** @type {string[]} */
let _urls = [];
/** Guard against a slow blob landing after the viewer moved on. */
let _token = 0;

/**
 * The dates offered as the comparison partner: every other photo date, newest
 * first. Pure so the dedup/order is testable without a DOM.
 * @param {string[]} dates
 * @param {string} current
 */
export function compareDates(dates, current) {
  /** @type {Set<string>} */
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  for (const date of Array.isArray(dates) ? dates : []) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date === current || seen.has(date)) continue;
    seen.add(date);
    out.push(date);
  }
  return out.sort((a, b) => b.localeCompare(a));
}

function ensureRoot() {
  if (_root || typeof document === 'undefined') return _root;
  const root = document.createElement('div');
  root.id = 'photoViewer';
  root.className = 'pv';
  root.setAttribute('data-modal-root', '');
  root.setAttribute('data-modal-open-class', 'active');
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', 'Progress photo');
  root.innerHTML = `
    <div class="pv__panel">
      <div class="pv__head">
        <span class="pv__date" id="photoViewerDate"></span>
        <button type="button" class="pv__close" data-action="close-photo-viewer" aria-label="Close photo">Close</button>
      </div>
      <div class="pv__compare" id="photoViewerCompare" hidden>
        <figure class="pv__slot">
          <img class="pv__img" id="photoViewerImgA" alt="" />
          <figcaption class="pv__cap" id="photoViewerCapA"></figcaption>
        </figure>
        <figure class="pv__slot">
          <img class="pv__img" id="photoViewerImgB" alt="" />
          <figcaption class="pv__cap" id="photoViewerCapB"></figcaption>
        </figure>
      </div>
      <div class="pv__frame" id="photoViewerFrame">
        <img class="pv__img" id="photoViewerImg" alt="" />
        <p class="pv__missing" id="photoViewerMissing" hidden>This photo's file is no longer on this device. The entry's numbers are still saved.</p>
      </div>
      <div class="pv__picker" id="photoViewerPicker">
        <label class="pv__picklabel" for="photoViewerComparePick">Compare two photos</label>
        <select class="pv__select" id="photoViewerComparePick"></select>
      </div>
      <div class="pv__actions">
        <button type="button" class="pv__edit" id="photoViewerEdit">Edit entry</button>
        <button type="button" class="pv__edit" id="photoViewerReplace">Replace photo</button>
        <button type="button" class="pv__delete" id="photoViewerDelete">Delete photo</button>
      </div>
    </div>`;
  document.body.appendChild(root);

  root.querySelector('[data-action="close-photo-viewer"]')?.addEventListener('click', () => closePhotoViewer());
  root.querySelector('#photoViewerDelete')?.addEventListener('click', () => {
    const context = _context;
    if (!context) return;
    // Keep the viewer open: the confirm stacks over it, and the caller closes
    // the viewer after the delete. Closing here pops a history marker while the
    // confirm pushes another, and the later pops land past the app entry —
    // which navigated the whole app to about:blank.
    context.onDelete(context.date);
  });
  root.querySelector('#photoViewerEdit')?.addEventListener('click', () => {
    const context = _context;
    if (!context?.onEditEntry) return;
    // The caller hands THIS dialog over to the entry sheet with
    // `replaceManagedModal`. Closing here first would queue history.back()
    // against the sheet's pushState — the same race that blanked the page on
    // Delete before it was fixed.
    context.onEditEntry(context.date, root);
  });
  root.querySelector('#photoViewerReplace')?.addEventListener('click', () => {
    const context = _context;
    if (!context?.onReplace) return;
    closePhotoViewer();
    context.onReplace(context.date);
  });
  root.querySelector('#photoViewerComparePick')?.addEventListener('change', (event) => {
    const target = /** @type {HTMLSelectElement|null} */ (event.target);
    void renderCompare(target?.value || '');
  });

  _root = root;
  _img = root.querySelector('#photoViewerImg');
  _compare = root.querySelector('#photoViewerCompare');
  _imgA = root.querySelector('#photoViewerImgA');
  _imgB = root.querySelector('#photoViewerImgB');
  _capA = root.querySelector('#photoViewerCapA');
  _capB = root.querySelector('#photoViewerCapB');
  _dateEl = root.querySelector('#photoViewerDate');
  _pick = root.querySelector('#photoViewerComparePick');
  _replaceBtn = root.querySelector('#photoViewerReplace');
  _editBtn = root.querySelector('#photoViewerEdit');
  return root;
}

function releaseUrls() {
  for (const url of _urls) {
    try { URL.revokeObjectURL(url); } catch { /* gone */ }
  }
  _urls = [];
}

function clearImage(img) {
  if (!img) return;
  img.removeAttribute('src');
}

/** Load one date's blob into an image, guarded against a stale open. */
async function paintImage(img, date, token) {
  if (!img) return;
  const label = formatDayMonthShort(date);
  img.alt = `Progress photo, ${label}`;
  const blob = await getPhotoBlob(`photo:${date}`);
  if (token !== _token) return;
  if (!blob) {
    // Say it in the frame, not only in an alt attribute nothing renders.
    img.alt = `Progress photo from ${label} is no longer on this device`;
    const missing = document.getElementById('photoViewerMissing');
    if (missing) missing.hidden = false;
    return;
  }
  const missing = document.getElementById('photoViewerMissing');
  if (missing) missing.hidden = true;
  const url = URL.createObjectURL(blob);
  _urls.push(url);
  img.src = url;
}

/**
 * Show one photo, or two side by side when `secondDate` is given.
 * @param {string} secondDate
 */
async function renderCompare(secondDate) {
  const context = _context;
  const root = _root;
  if (!context || !root) return;
  const comparing = Boolean(secondDate) && secondDate !== context.date;
  _token += 1;
  const token = _token;
  releaseUrls();
  for (const img of [_img, _imgA, _imgB]) clearImage(img);
  if (_compare) _compare.hidden = !comparing;
  const frame = root.querySelector('#photoViewerFrame');
  if (frame) frame.hidden = comparing;
  if (root.querySelector('#photoViewerPicker')) {
    const picker = /** @type {HTMLElement} */ (root.querySelector('#photoViewerPicker'));
    // One photo in the library means there is nothing to compare with; saying
    // so is better than a select with one option.
    picker.hidden = compareDates(context.dates || [context.date], context.date).length === 0;
  }

  if (!comparing) {
    await paintImage(_img, context.date, token);
    return;
  }
  if (_capA) _capA.textContent = formatDayMonthShort(context.date, { year: true });
  if (_capB) _capB.textContent = formatDayMonthShort(secondDate, { year: true });
  await Promise.all([
    paintImage(_imgA, context.date, token),
    paintImage(_imgB, secondDate, token),
  ]);
}

/**
 * @param {{
 *   date: string,
 *   dates?: string[],
 *   onDelete?: (date: string) => void,
 *   onReplace?: (date: string) => void,
 *   onEditEntry?: (date: string, root: HTMLElement) => void,
 * }} options
 */
export async function openPhotoViewer({ date, dates, onDelete, onReplace, onEditEntry }) {
  const root = ensureRoot();
  if (!root || !_img) return;
  _context = {
    date,
    dates: Array.isArray(dates) ? dates : [date],
    onDelete: onDelete || (() => {}),
    onReplace,
    onEditEntry,
  };

  const label = formatDayMonthShort(date);
  if (_dateEl) _dateEl.textContent = label;

  // Hooks the caller did not supply must not render a dead control.
  if (_replaceBtn) _replaceBtn.hidden = typeof onReplace !== 'function';
  if (_editBtn) _editBtn.hidden = typeof onEditEntry !== 'function';

  if (_pick) {
    const options = compareDates(_context.dates, date);
    _pick.textContent = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = options.length ? 'Single photo' : 'No other photos';
    _pick.append(none);
    for (const other of options) {
      const option = document.createElement('option');
      option.value = other;
      option.textContent = formatDayMonthShort(other, { year: true });
      _pick.append(option);
    }
    _pick.value = '';
    _pick.disabled = options.length === 0;
  }

  await renderCompare('');
  root.classList.add('active');
  openManagedModal(root, { initialFocus: '[data-action="close-photo-viewer"]' });
}

export function closePhotoViewer() {
  const root = _root;
  if (!root) return;
  _token += 1;
  root.classList.remove('active');
  closeManagedModal(root);
  releaseUrls();
  clearImage(_img);
  clearImage(_imgA);
  clearImage(_imgB);
  if (_compare) _compare.hidden = true;
  const frame = root.querySelector('#photoViewerFrame');
  if (frame) frame.hidden = false;
  _context = null;
}
