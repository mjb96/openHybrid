// @ts-check
// =============================================================================
// MOVE A DAY SHEET (HM2)
//
// Free dates only: the sheet lists this calendar week, disables the current
// date, the past, plan-owned dates and dates with logged work. Choosing a date
// changes the PLAN only; the caller persists and offers Undo.
// =============================================================================
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';
import { escapeHtml } from '../util.js';
import { localDayKey } from '../dates.js';
import { applyMove, moveOptions } from '../schedule/week.js';

const WEEKDAY = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };

/** @type {HTMLElement|null} */
let _root = null;
/** @type {HTMLElement|null} */
let _backdrop = null;

function dayLabel(dateISO) {
  const [y, m, d] = String(dateISO || '').split('-').map(Number);
  if (!y || !m || !d) return dateISO || '';
  return new Date(Date.UTC(y, m - 1, d, 12))
    .toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace(',', '');
}

export function closeMoveDaySheet() {
  if (!_root && !_backdrop) return;
  _root?.classList.remove('active');
  _backdrop?.classList.remove('active');
  if (_root) closeManagedModal(_root);
  _root?.remove();
  _backdrop?.remove();
  _root = null;
  _backdrop = null;
}

/**
 * @param {{
 *   state: any, program: any, day: string,
 *   isDateLogged?: (date: string) => boolean,
 *   onMoved?: (result: any, date: string) => void,
 * }} options
 */
export function openMoveDaySheet({ state, program, day, isDateLogged, onMoved }) {
  closeMoveDaySheet();
  const today = localDayKey(new Date());
  const choices = moveOptions(state, program, day, { today, isDateLogged });
  if (!choices.length) return false;
  const title = program?.days?.[day]?.title || 'Workout';

  _backdrop = document.createElement('div');
  _backdrop.className = 'move-sheet__backdrop';
  _backdrop.setAttribute('aria-hidden', 'true');

  _root = document.createElement('section');
  _root.className = 'move-sheet';
  _root.setAttribute('role', 'dialog');
  _root.setAttribute('aria-modal', 'true');
  _root.setAttribute('aria-labelledby', 'moveSheetTitle');
  _root.dataset.modalCompanion = '.move-sheet__backdrop';
  _root.innerHTML = `
    <div class="move-sheet__head">
      <div>
        <p class="move-sheet__eyebrow">Reschedule</p>
        <h2 class="move-sheet__title" id="moveSheetTitle">Move ${escapeHtml(title)}</h2>
      </div>
      <button type="button" class="move-sheet__close sheet-close-btn" data-action="close-move-day" aria-label="Close">✕</button>
    </div>
    <p class="move-sheet__intro">Choose a free day this week. Nothing is overwritten, and you can undo.</p>
    <div class="move-sheet__list" role="group" aria-label="Free dates this week">
      ${choices.map((choice) => `
        <button type="button" class="move-sheet__option" data-move-date="${escapeHtml(choice.date)}" ${choice.disabled ? 'disabled' : ''}>
          <span class="move-sheet__option-day">${escapeHtml(WEEKDAY[choice.weekday] || choice.weekday)}</span>
          <span class="move-sheet__option-date">${escapeHtml(dayLabel(choice.date))}</span>
          ${choice.disabled ? `<span class="move-sheet__option-reason">${escapeHtml(choice.disabled)}</span>` : ''}
        </button>`).join('')}
    </div>`;

  document.body.append(_backdrop, _root);
  _root.classList.add('active');
  _backdrop.classList.add('active');
  openManagedModal(_root, { initialFocus: '[data-action="close-move-day"]', onRequestClose: closeMoveDaySheet });

  _backdrop.addEventListener('click', closeMoveDaySheet);
  _root.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target.closest('[data-action="close-move-day"]')) { closeMoveDaySheet(); return; }
    const option = target.closest('[data-move-date]');
    if (!option || option.hasAttribute('disabled')) return;
    const date = option.getAttribute('data-move-date');
    if (!date) return;
    // The model validates again; the disabled state is a UI hint, not the gate.
    const result = applyMove(state, program, day, date, { today, isDateLogged });
    if (!result.ok) return;
    const movedDay = day;
    closeMoveDaySheet();
    onMoved?.({ ...result, day: movedDay }, date);
  });
  return true;
}
