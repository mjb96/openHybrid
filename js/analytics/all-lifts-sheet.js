// @ts-check
// =============================================================================
// ALL LIFTS SHEET (PG5)
//
// The Main exercises band answers "what am I training most" with five rows.
// This is the index behind it: every lift in the selected range, searchable,
// with last performed, best e1RM, the window change, a PR badge and the
// window's flat flag. Tapping a row opens the SAME exercise drilldown the band
// rows use (`data-action="open-analytics" data-context="exercise"`).
//
// The model is owned by `exercises-summary.js`; this module never re-derives a
// metric, it renders and filters the rows it is given.
// =============================================================================
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';
import { escapeHtml } from '../util.js';
import { formatDayMonthShort } from '../dates.js';

/** @type {any} */
let _model = null;
/** @type {HTMLElement|null} */
let _root = null;
/** @type {HTMLElement|null} */
let _backdrop = null;

/** @param {any} model */
export function setAllLiftsModel(model) {
  _model = model;
}

/** @param {any[]} rows @param {string} query */
export function filterLifts(rows, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return Array.isArray(rows) ? rows.slice() : [];
  return (Array.isArray(rows) ? rows : []).filter((row) =>
    String(row?.lift || '').toLowerCase().includes(q));
}

/** @param {any[]} rows @param {string} unit */
export function allLiftsListHTML(rows, unit) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '<p class="all-lifts__empty">No lifts match.</p>';
  }
  return rows.map((row) => {
    const delta = row.deltaPct == null
      ? 'No earlier comparison'
      : row.deltaPct === 0
        ? 'Matched earlier'
        : `${row.deltaPct > 0 ? '+' : ''}${row.deltaPct}% e1RM`;
    const badges = [
      row.prFlag ? '<span class="all-lifts__badge all-lifts__badge--pr">PR</span>' : '',
      row.flat ? '<span class="all-lifts__badge all-lifts__badge--flat">Flat</span>' : '',
    ].join('');
    const meta = [
      `${row.sessions} session${row.sessions === 1 ? '' : 's'}`,
      row.bestE1rm > 0 ? `${row.bestE1rm} ${unit} best` : '',
      row.lastPerformedISO ? `last ${formatDayMonthShort(row.lastPerformedISO)}` : '',
    ].filter(Boolean).join(' · ');
    return `<li class="all-lifts__row">
      <button type="button" class="all-lifts__hit" data-action="open-analytics" data-context="exercise"
        data-entity="${escapeHtml(row.liftId)}" data-entity-name="${escapeHtml(row.lift)}" data-lift-row
        aria-label="${escapeHtml(`${row.lift}: ${meta}. ${row.flat ? 'Flat trend. ' : ''}Open exercise detail.`)}">
        <span class="all-lifts__head">
          <span class="all-lifts__name">${escapeHtml(row.lift)}${badges}</span>
          <span class="all-lifts__delta">${escapeHtml(delta)}</span>
        </span>
        <span class="all-lifts__meta">${escapeHtml(meta)}</span>
      </button>
    </li>`;
  }).join('');
}

export function closeAllLiftsSheet() {
  if (!_root && !_backdrop) return;
  _root?.classList.remove('active');
  _backdrop?.classList.remove('active');
  if (_root) closeManagedModal(_root);
  _root?.remove();
  _backdrop?.remove();
  _root = null;
  _backdrop = null;
}

export function openAllLiftsSheet() {
  closeAllLiftsSheet();
  const model = _model;
  if (!model?.rows?.length) return false;
  const unit = model.unit === 'lbs' ? 'lbs' : 'kg';

  _backdrop = document.createElement('div');
  _backdrop.className = 'all-lifts__backdrop';
  _backdrop.setAttribute('aria-hidden', 'true');
  _root = document.createElement('section');
  _root.className = 'bottom-sheet all-lifts-sheet';
  _root.setAttribute('role', 'dialog');
  _root.setAttribute('aria-modal', 'true');
  _root.setAttribute('aria-labelledby', 'allLiftsTitle');
  _root.dataset.modalCompanion = '.all-lifts__backdrop';
  _root.innerHTML = `
    <div class="all-lifts__head">
      <div>
        <p class="all-lifts__eyebrow">Main exercises</p>
        <h2 class="all-lifts__title" id="allLiftsTitle">All lifts</h2>
      </div>
      <button type="button" class="sheet-close-btn all-lifts__close" data-action="close-all-lifts" aria-label="Close">✕</button>
    </div>
    <label class="all-lifts__search">
      <span class="sr-only">Search lifts</span>
      <input type="search" inputmode="search" enterkeyhint="done" id="allLiftsSearch" placeholder="Search lifts" autocomplete="off">
    </label>
    <p class="all-lifts__count" id="allLiftsCount"></p>
    <ul class="all-lifts__list" id="allLiftsList"></ul>`;

  document.body.append(_backdrop, _root);
  _root.classList.add('active');
  _backdrop.classList.add('active');
  openManagedModal(_root, { initialFocus: '#allLiftsSearch', onRequestClose: closeAllLiftsSheet });

  const list = _root.querySelector('#allLiftsList');
  const count = _root.querySelector('#allLiftsCount');
  const search = /** @type {HTMLInputElement|null} */ (_root.querySelector('#allLiftsSearch'));
  const paint = () => {
    const rows = filterLifts(model.rows, search?.value || '');
    if (list) list.innerHTML = allLiftsListHTML(rows, unit);
    if (count) {
      count.textContent = search?.value
        ? `${rows.length} of ${model.rows.length} lifts`
        : `${model.rows.length} lifts · ${model.range?.spanLabel || 'selected period'}`;
    }
  };
  paint();
  search?.addEventListener('input', paint);
  _backdrop.addEventListener('click', closeAllLiftsSheet);
  _root.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest('[data-action="close-all-lifts"]')) { closeAllLiftsSheet(); return; }
    // The drilldown is routed globally; closing first keeps the sheet from
    // covering the screen it opens.
    if (target.closest('[data-lift-row]')) setTimeout(closeAllLiftsSheet, 0);
  });
  return true;
}
