// @ts-check
// =============================================================================
// RECORDS SHEET (PG6 / A6)
//
// One destination for the Main exercises band's "Records →": the all-time best
// e1RM per lift (with its date and PR count) and the dated PR feed. Both come
// from `buildRecordIndex`, which shares the e1RM PR rule with Year in Review, so
// the table and the feed can never disagree.
// =============================================================================
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';
import { escapeHtml } from '../util.js';
import { formatDayMonthShort } from '../dates.js';
import { resolveExercise } from '../exercises/catalog.js';
import { buildRecordIndex } from '../strength/pr-index.js';

/** @type {HTMLElement|null} */
let _root = null;
/** @type {HTMLElement|null} */
let _backdrop = null;

/** @param {any[]} rows @param {string} query */
export function filterRecordRows(rows, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return Array.isArray(rows) ? rows.slice() : [];
  return (Array.isArray(rows) ? rows : []).filter((row) => String(row?.lift || '').toLowerCase().includes(q));
}

/** @param {any} model @param {string} unit @param {string} [query] */
export function recordsHTML(model, unit, query = '') {
  const rows = filterRecordRows(model?.rows || [], query);
  const feed = filterRecordRows(model?.feed || [], query);
  const table = rows.length
    ? `<div class="records-table" role="table" aria-label="All-time best estimated 1RM per lift">
        <div class="records-table__head" role="row">
          <span role="columnheader">Lift</span><span role="columnheader">Best</span><span role="columnheader">Date</span><span role="columnheader">PRs</span>
        </div>
        ${rows.map((row) => {
          const id = resolveExercise(row.lift)?.id || row.lift;
          return `<button type="button" class="records-table__row" role="row" data-action="open-analytics" data-context="exercise" data-entity="${escapeHtml(id)}" data-entity-name="${escapeHtml(row.lift)}" data-record-row>
            <span role="cell" class="records-table__name">${escapeHtml(row.lift)}</span>
            <span role="cell" class="records-table__best">${row.bestE1rm} ${escapeHtml(unit)}</span>
            <span role="cell">${row.bestDate ? escapeHtml(formatDayMonthShort(row.bestDate)) : '—'}</span>
            <span role="cell">${row.prCount}</span>
          </button>`;
        }).join('')}
      </div>`
    : '<p class="all-lifts__empty">No records match.</p>';

  const feedRows = feed.length
    ? feed.map((event) => {
      const id = resolveExercise(event.lift)?.id || event.lift;
      return `<li class="records-feed__row">
        <button type="button" class="records-feed__hit" data-action="open-analytics" data-context="exercise"
          data-entity="${escapeHtml(id)}" data-entity-name="${escapeHtml(event.lift)}" data-record-row>
          <span class="records-feed__date">${escapeHtml(formatDayMonthShort(event.date))}</span>
          <span class="records-feed__lift">${escapeHtml(event.lift)}</span>
          <span class="records-feed__value">${event.e1rm} ${escapeHtml(unit)}</span>
          <span class="records-feed__prev">${event.previousBest > 0 ? `from ${event.previousBest}` : 'baseline'}</span>
        </button>
      </li>`;
    }).join('')
    : '<li class="all-lifts__empty">No PR events match.</li>';

  return `
    <p class="records__section-label">All-time bests</p>
    ${table}
    <p class="records__section-label">PR feed${model?.feedTotal > model?.feed?.length ? ` · latest ${model.feed.length} of ${model.feedTotal}` : ''}</p>
    <ul class="records-feed">${feedRows}</ul>`;
}

export function closeRecordsSheet() {
  if (!_root && !_backdrop) return;
  _root?.classList.remove('active');
  _backdrop?.classList.remove('active');
  if (_root) closeManagedModal(_root);
  _root?.remove();
  _backdrop?.remove();
  _root = null;
  _backdrop = null;
}

/** @param {any} state */
export function openRecordsSheet(state) {
  closeRecordsSheet();
  const model = buildRecordIndex(state);
  if (!model?.hasData) return false;
  const unit = state?.settings?.weightUnit === 'lbs' ? 'lbs' : 'kg';

  _backdrop = document.createElement('div');
  _backdrop.className = 'all-lifts__backdrop';
  _backdrop.setAttribute('aria-hidden', 'true');
  _root = document.createElement('section');
  _root.className = 'bottom-sheet all-lifts-sheet records-sheet';
  _root.setAttribute('role', 'dialog');
  _root.setAttribute('aria-modal', 'true');
  _root.setAttribute('aria-labelledby', 'recordsTitle');
  _root.dataset.modalCompanion = '.all-lifts__backdrop';
  _root.innerHTML = `
    <div class="all-lifts__head">
      <div>
        <p class="all-lifts__eyebrow">Main exercises</p>
        <h2 class="all-lifts__title" id="recordsTitle">Records</h2>
      </div>
      <button type="button" class="sheet-close-btn" data-action="close-records" aria-label="Close">✕</button>
    </div>
    <label class="all-lifts__search">
      <span class="sr-only">Search records</span>
      <input type="search" inputmode="search" enterkeyhint="done" id="recordsSearch" placeholder="Search lifts" autocomplete="off">
    </label>
    <div class="records__scroll" id="recordsBody"></div>`;

  document.body.append(_backdrop, _root);
  _root.classList.add('active');
  _backdrop.classList.add('active');
  openManagedModal(_root, { initialFocus: '#recordsSearch', onRequestClose: closeRecordsSheet });

  const body = _root.querySelector('#recordsBody');
  const search = /** @type {HTMLInputElement|null} */ (_root.querySelector('#recordsSearch'));
  const paint = () => { if (body) body.innerHTML = recordsHTML(model, unit, search?.value || ''); };
  paint();
  search?.addEventListener('input', paint);
  _backdrop.addEventListener('click', closeRecordsSheet);
  _root.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest('[data-action="close-records"]')) { closeRecordsSheet(); return; }
    if (target.closest('[data-record-row]')) setTimeout(closeRecordsSheet, 0);
  });
  return true;
}
