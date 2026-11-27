// @ts-check
// =============================================================================
// CUSTOMIZE SHEET (js/ui/customize-sheet.js)
//
// One bottom sheet for Home and Progress section visibility. Changes apply to
// the live state immediately; the caller re-renders the surface behind the
// sheet.
//
// Progress rows come from `analytics/progress-sections.js`: every top-level
// section has a toggle, a fixed right-hand reorder column and an Open chevron;
// its detail switches are indented underneath. Hiding a section only removes it
// from the Overview — the row stays here and Open still reaches it.
// =============================================================================
import { cardsFor, isCardVisible, moveCard, orderedCards, resetSurface, setCardVisible, subCardsFor } from './customize.js';
import {
  progressSection, progressSectionModuleOff, progressSectionSubtitle,
} from '../analytics/progress-sections.js';
import { openManagedModal, closeManagedModal } from './modal-stack.js';

let _getState = null;
let _save = null;
let _onChange = null;
/** @type {'home'|'progress'} */
let _surface = 'home';
let _initialized = false;

const TITLES = { home: 'Customize Home', progress: 'Customize Progress' };
const SUBTITLES = {
  home: 'Hide cards you do not use. Safety flags, Today and navigation stay visible.',
  progress: 'Show, hide and reorder what\'s on Progress.',
};

function elements() {
  return {
    sheet: document.getElementById('customizeSheet'),
    list: document.getElementById('customizeList'),
    title: document.getElementById('customizeTitle'),
    sub: document.getElementById('customizeSub'),
  };
}

/**
 * One Progress row. The reorder column, the Open chevron and the switch occupy
 * fixed grid tracks, so the arrows land on the same x on every row.
 */
function progressRow(card, { sub = false, order = null } = {}) {
  const state = _getState?.();
  const section = sub ? null : progressSection(card.id);
  const moduleOff = !sub && progressSectionModuleOff(state, card.id);
  const visible = !moduleOff && isCardVisible(state?.settings, _surface, card.id);
  const note = sub
    ? card.note
    : (section ? progressSectionSubtitle(section) : card.note);
  const status = moduleOff ? '<span class="customize-row__status">module off</span>' : '';

  const orderCell = order
    ? `<div class="customize-order">
        <button type="button" class="customize-order__btn" data-customize-move="${card.id}" data-dir="-1"
          aria-label="Move ${card.label} up" ${order.first ? 'disabled' : ''}>↑</button>
        <button type="button" class="customize-order__btn" data-customize-move="${card.id}" data-dir="1"
          aria-label="Move ${card.label} down" ${order.last ? 'disabled' : ''}>↓</button>
      </div>`
    : '<span class="customize-order customize-order--empty" aria-hidden="true"></span>';

  const routeId = section?.routeId;
  const openCell = sub
    ? '<span class="customize-row__open customize-row__open--empty" aria-hidden="true"></span>'
    : routeId
      ? `<button type="button" class="customize-row__open" data-action="open-analytics"
          data-context="${routeId}" data-parent-context="hub" data-customize-open
          aria-label="Open ${card.label}" ${moduleOff ? 'disabled' : ''}>›</button>`
      : `<button type="button" class="customize-row__open" data-action="customize-reveal-section"
          data-section="${card.id}" aria-label="Open ${card.label}" ${moduleOff ? 'disabled' : ''}>›</button>`;

  return `<div class="customize-row customize-row--progress${sub ? ' customize-row--sub' : ''}">
    <div class="customize-row__copy">
      <span class="customize-row__label">${card.label}</span>
      <span class="customize-row__note">${note}${status ? ` · ${status}` : ''}</span>
    </div>
    ${orderCell}
    ${openCell}
    <label class="settings-switch"${moduleOff ? ' aria-disabled="true"' : ''}>
      <input type="checkbox" data-customize-card="${card.id}" ${visible ? 'checked' : ''} ${moduleOff ? 'disabled' : ''} aria-label="Show ${card.label}">
      <span class="settings-switch-track"></span>
    </label>
  </div>`;
}

function homeRow(card) {
  const state = _getState?.();
  const visible = isCardVisible(state?.settings, _surface, card.id);
  return `<div class="customize-row">
    <div class="customize-row__copy">
      <span class="customize-row__label">${card.label}</span>
      <span class="customize-row__note">${card.note}</span>
    </div>
    <label class="settings-switch">
      <input type="checkbox" data-customize-card="${card.id}" ${visible ? 'checked' : ''} aria-label="Show ${card.label}">
      <span class="settings-switch-track"></span>
    </label>
  </div>`;
}

function render() {
  const { sheet, list, title, sub } = elements();
  if (!sheet || !list) return;
  const state = _getState?.();
  const cards = cardsFor(_surface);
  if (title) title.textContent = TITLES[_surface] || 'Customize';
  if (sub) sub.textContent = SUBTITLES[_surface] || SUBTITLES.home;

  if (_surface === 'progress') {
    // Bands in the athlete's order, each followed by its own detail switches.
    const ordered = orderedCards('progress', state?.settings);
    list.innerHTML = ordered.map((card, index) => progressRow(card, {
      order: { first: index === 0, last: index === ordered.length - 1 },
    }) + subCardsFor(card.id).map((detail) => progressRow(detail, { sub: true })).join('')).join('');
  } else {
    list.innerHTML = cards.map(homeRow).join('');
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
  openManagedModal(sheet, { initialFocus: '#customizeSheet .sheet-close-btn' });
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

/**
 * Open a section that has no detail screen (Pulse, Balance): reveal it on the
 * Overview and scroll to it. A hidden section is still reachable from here,
 * which is what makes "hidden" different from "deleted".
 * @param {string} id
 */
function revealSection(id) {
  const state = _getState?.();
  if (!state) return;
  setCardVisible(state.settings, 'progress', id, true);
  _save?.(true);
  closeCustomizeSheet();
  _onChange?.('progress');
  setTimeout(() => {
    try {
      document.querySelector(`#analytics-hub [data-band="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (_) { /* no-op in a non-browser test shell */ }
  }, 60);
}

/** Wire once at boot. */
export function initCustomizeSheet(getStateFn, saveFn, onChangeFn) {
  _getState = getStateFn;
  _save = saveFn;
  _onChange = onChangeFn;
  if (_initialized) return;
  _initialized = true;

  document.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement|null} */ (event.target instanceof Element ? event.target.closest('[data-action], [data-customize-move]') : null);
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
    } else if (action === 'customize-reveal-section') {
      revealSection(target.getAttribute('data-section') || '');
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
    // An Open chevron with a real route lets the app router navigate. Close the
    // sheet first; the event continues to bubble to app.js's delegated handler.
    if (target.hasAttribute('data-customize-open')) closeCustomizeSheet();
  });

  document.addEventListener('change', (event) => {
    const target = /** @type {HTMLElement|null} */ (event.target instanceof Element ? event.target.closest('[data-customize-card]') : null);
    if (target) handleChange(target);
  });
}
