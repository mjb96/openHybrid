// @ts-check
// =============================================================================
// CUSTOMIZE SHEET (js/ui/customize-sheet.js)
//
// One bottom sheet for Home and Progress card visibility. Changes apply to the
// live state immediately; the caller re-renders the surface behind the sheet.
// =============================================================================
import { cardsFor, isCardVisible, moveCard, orderedCards, resetSurface, setCardVisible, subCardsFor } from './customize.js';
import { openManagedModal, closeManagedModal } from './modal-stack.js';

let _getState = null;
let _save = null;
let _onChange = null;
/** @type {'home'|'progress'} */
let _surface = 'home';
let _initialized = false;

const TITLES = { home: 'Customize Home', progress: 'Customize Progress' };

function elements() {
  return {
    sheet: document.getElementById('customizeSheet'),
    list: document.getElementById('customizeList'),
    title: document.getElementById('customizeTitle'),
    sub: document.getElementById('customizeSub'),
  };
}

function render() {
  const { sheet, list, title, sub } = elements();
  if (!sheet || !list) return;
  const state = _getState?.();
  const cards = cardsFor(_surface);
  if (title) title.textContent = TITLES[_surface] || 'Customize';
  if (sub) {
    sub.textContent = _surface === 'home'
      ? 'Hide cards you do not use. Safety flags, Today and navigation stay visible.'
      : 'Hide Progress cards you do not use. Deep links and data stay available.';
  }
  const row = (card, { sub = false, order = null } = {}) => {
    const visible = isCardVisible(state?.settings, _surface, card.id);
    const controls = order
      ? `<div class="customize-order">
          <button type="button" class="customize-order__btn" data-customize-move="${card.id}" data-dir="-1"
            aria-label="Move ${card.label} up" ${order.first ? 'disabled' : ''}>↑</button>
          <button type="button" class="customize-order__btn" data-customize-move="${card.id}" data-dir="1"
            aria-label="Move ${card.label} down" ${order.last ? 'disabled' : ''}>↓</button>
        </div>`
      : '';
    return `<div class="customize-row${sub ? ' customize-row--sub' : ''}">
      <div class="customize-row__copy">
        <span class="customize-row__label">${card.label}</span>
        <span class="customize-row__note">${card.note}</span>
      </div>
      ${controls}
      <label class="settings-switch">
        <input type="checkbox" data-customize-card="${card.id}" ${visible ? 'checked' : ''} aria-label="Show ${card.label}">
        <span class="settings-switch-track"></span>
      </label>
    </div>`;
  };

  if (_surface === 'progress') {
    // Bands in the athlete's order, each followed by its own detail switches.
    const ordered = orderedCards('progress', state?.settings);
    list.innerHTML = ordered.map((card, index) => row(card, {
      order: { first: index === 0, last: index === ordered.length - 1 },
    }) + subCardsFor(card.id).map((sub) => row(sub, { sub: true })).join('')).join('');
  } else {
    list.innerHTML = cards.map((card) => row(card)).join('');
  }
}

/** @param {'home'|'progress'} surface */
export function openCustomizeSheet(surface = 'home') {
  const { sheet } = elements();
  if (!sheet || !_getState) return;
  _surface = surface === 'progress' ? 'progress' : 'home';
  render();
  sheet.classList.add('active');
  document.getElementById('customizeBackdrop')?.classList.add('active');
  openManagedModal(sheet, { initialFocus: '[data-customize-card]' });
}

export function closeCustomizeSheet() {
  const { sheet } = elements();
  if (!sheet) return;
  sheet.classList.remove('active');
  document.getElementById('customizeBackdrop')?.classList.remove('active');
  closeManagedModal(sheet);
}

function handleChange(target) {
  const id = target?.getAttribute?.('data-customize-card');
  if (!id || !_getState) return;
  const state = _getState();
  setCardVisible(state.settings, _surface, id, !!target.checked);
  _save?.(true);
  _onChange?.(_surface);
}

function handleReset() {
  const state = _getState?.();
  if (!state) return;
  resetSurface(state.settings, _surface);
  _save?.(true);
  render();
  _onChange?.(_surface);
}

/** Wire once at boot. */
export function initCustomizeSheet(getStateFn, saveFn, onChangeFn) {
  _getState = getStateFn;
  _save = saveFn;
  _onChange = onChangeFn;
  if (_initialized) return;
  _initialized = true;

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement|null} */ (event.target instanceof Element ? event.target.closest('[data-action]') : null);
    if (!target) return;
    const action = target.getAttribute('data-action') || (target.hasAttribute('data-customize-move') ? 'move-customize' : null);
    if (action === 'move-customize') {
      target.setAttribute('data-customize-id', target.getAttribute('data-customize-move') || '');
      target.setAttribute('data-customize-dir', target.getAttribute('data-dir') || '-1');
    }
    if (action === 'open-customize') {
      openCustomizeSheet(target.getAttribute('data-surface') === 'progress' ? 'progress' : 'home');
    } else if (action === 'close-customize') {
      closeCustomizeSheet();
    } else if (action === 'reset-customize') {
      handleReset();
    } else if (action === 'move-customize') {
      const id = target.getAttribute('data-customize-id') || '';
      const direction = Number(target.getAttribute('data-customize-dir')) === 1 ? 1 : -1;
      const state = _getState?.();
      if (state && id) {
        moveCard(state.settings, id, direction);
        _save?.(true);
        render();
        _onChange?.(_surface);
      }
    }
  });

  document.addEventListener('change', (event) => {
    const target = /** @type {HTMLElement|null} */ (event.target instanceof Element ? event.target.closest('[data-customize-card]') : null);
    if (target) handleChange(target);
  });
}
