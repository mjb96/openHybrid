// @ts-check
// =============================================================================
// SETTINGS COMPONENTS (js/settings/components.js)
//
// Pure string builders for the one Settings visual language: page/group/row,
// icon tiles, toggle, segmented, stepper, slider, time, text, picker sheet and
// select list. Pages compose these; no page hand-rolls a row.
//
// The builders never own state. Controls carry `data-setting-key` and the
// action attributes the Settings page router will delegate; values/summaries
// are passed in from the registered store so a row cannot invent its own.
// =============================================================================
import { icon } from '../ui/icons.js';

/** @param {unknown} value */
export function escapeHTML(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TONES = new Set(['blue', 'green', 'orange', 'red', 'purple', 'pink', 'teal', 'slate']);

/** @param {string} name @param {string} [tone] */
function iconTile(name, tone = 'blue') {
  const safeTone = TONES.has(tone) ? tone : 'blue';
  return `<span class="s-icon s-icon--${safeTone}" aria-hidden="true">${icon(name, { size: 18 })}</span>`;
}

/**
 * @param {{
 *   label: string,
 *   icon?: string,
 *   tone?: string,
 *   value?: string,
 *   summary?: string,
 *   footnote?: string,
 *   control?: string,
 *   action?: string,
 *   context?: string,
 *   href?: string,
 *   nav?: boolean,
 *   disabled?: boolean,
 *   disabledReason?: string,
 *   ariaLabel?: string,
 *   id?: string,
 *   settingKey?: string,
 * }} row
 */
export function settingsRow(row) {
  const labelId = row.id ? `${row.id}-label` : '';
  const reasonId = row.disabledReason ? `${row.id || 's-row'}-reason` : '';
  const copy = `<span class="s-row__copy">
      <span class="s-row__label"${labelId ? ` id="${escapeHTML(labelId)}"` : ''}>${escapeHTML(row.label)}</span>
      ${row.footnote ? `<span class="s-row__footnote">${escapeHTML(row.footnote)}</span>` : ''}
      ${row.disabledReason ? `<span class="s-row__reason" id="${escapeHTML(reasonId)}">${escapeHTML(row.disabledReason)}</span>` : ''}
    </span>`;
  const value = row.summary || row.value
    ? `<span class="s-row__value" title="${escapeHTML(row.summary || row.value)}">${escapeHTML(row.summary || row.value)}</span>`
    : '';
  const control = row.control ? `<span class="s-row__control">${row.control}</span>` : '';
  const chevron = row.nav ? '<span class="s-row__chevron" aria-hidden="true">›</span>' : '';
  const classes = ['s-row'];
  if (row.nav) classes.push('s-row--nav');
  if (row.disabled) classes.push('is-disabled');
  const common = [
    `class="${classes.join(' ')}"`,
    row.id ? `id="${escapeHTML(row.id)}"` : '',
    row.settingKey ? `data-setting-key="${escapeHTML(row.settingKey)}"` : '',
    row.disabled ? 'aria-disabled="true"' : '',
    row.ariaLabel ? `aria-label="${escapeHTML(row.ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');
  const body = `${row.icon ? iconTile(row.icon, row.tone) : '<span class="s-icon s-icon--empty" aria-hidden="true"></span>'}
    ${copy}${value}${control}${chevron}`;

  if (row.href) {
    return `<a ${common} href="${escapeHTML(row.href)}" target="_blank" rel="noopener noreferrer">${body}</a>`;
  }
  if (row.action || row.nav) {
    return `<button type="button" ${common}${row.action ? ` data-action="${escapeHTML(row.action)}"` : ''}${row.context ? ` data-context="${escapeHTML(row.context)}"` : ''}>${body}</button>`;
  }
  return `<div ${common}>${body}</div>`;
}

/**
 * @param {{ label: string, rows: string[], footnote?: string, id?: string }} group
 */
export function settingsGroup({ label, rows, footnote, id }) {
  const labelId = id ? `${id}-title` : `s-group-${Math.random().toString(36).slice(2, 8)}`;
  return `<section class="s-group" aria-labelledby="${escapeHTML(labelId)}">
    <h2 class="s-group__label" id="${escapeHTML(labelId)}">${escapeHTML(label)}</h2>
    <div class="s-group__card">${rows.filter(Boolean).join('')}</div>
    ${footnote ? `<p class="s-group__footnote">${escapeHTML(footnote)}</p>` : ''}
  </section>`;
}

/**
 * @param {{
 *   title: string,
 *   backLabel?: string,
 *   backAction?: string,
 *   groups: string[],
 *   intro?: string,
 *   footer?: string,
 *   id?: string,
 * }} page
 */
export function settingsPage(page) {
  return `<section class="s-page"${page.id ? ` id="${escapeHTML(page.id)}"` : ''} aria-label="${escapeHTML(page.title)}">
    <header class="s-page__header">
      ${page.backLabel ? `<button type="button" class="s-back" data-action="${escapeHTML(page.backAction || 'close-settings')}" aria-label="${escapeHTML(`Back to ${page.backLabel}`)}"><span aria-hidden="true">←</span><span>${escapeHTML(page.backLabel)}</span></button>` : '<span></span>'}
      <h1 class="s-page__title" data-page-title>${escapeHTML(page.title)}</h1>
      <span class="s-page__spacer" aria-hidden="true"></span>
    </header>
    <div class="s-page__body">
      ${page.intro ? `<p class="s-page__intro">${escapeHTML(page.intro)}</p>` : ''}
      ${page.groups.filter(Boolean).join('')}
      ${page.footer ? `<p class="s-page__footer">${escapeHTML(page.footer)}</p>` : ''}
    </div>
  </section>`;
}

/**
 * @param {{ key: string, label: string, checked: boolean, disabled?: boolean, reason?: string }} input
 */
export function toggleControl(input) {
  const reasonId = input.reason ? `s-${input.key.replace(/[^a-z0-9_-]/gi, '-')}-reason` : '';
  return `<label class="s-switch${input.disabled ? ' is-disabled' : ''}">
    <input type="checkbox" data-setting-key="${escapeHTML(input.key)}" ${input.checked ? 'checked' : ''} ${input.disabled ? 'disabled' : ''} aria-label="${escapeHTML(input.label)}"${reasonId ? ` aria-describedby="${escapeHTML(reasonId)}"` : ''}>
    <span class="s-switch__track" aria-hidden="true"></span>
  </label>`;
}

/**
 * @param {{ key: string, label: string, options: Array<{value:string|number,label:string}>, value: string|number, disabled?: boolean }} input
 */
export function segmentedControl(input) {
  return `<div class="s-segmented" role="group" aria-label="${escapeHTML(input.label)}">
    ${input.options.map((option) => `<button type="button" class="s-segmented__chip${String(option.value) === String(input.value) ? ' is-selected' : ''}"
      data-setting-segment="${escapeHTML(input.key)}" data-value="${escapeHTML(option.value)}"
      aria-pressed="${String(option.value) === String(input.value) ? 'true' : 'false'}" ${input.disabled ? 'disabled' : ''}>${escapeHTML(option.label)}</button>`).join('')}
  </div>`;
}

/**
 * @param {{ key: string, label: string, value: number, min: number, max: number, step?: number, unit?: string, disabled?: boolean }} input
 */
export function stepperControl(input) {
  return `<div class="s-stepper" role="group" aria-label="${escapeHTML(input.label)}">
    <button type="button" class="s-stepper__btn" data-setting-step="${escapeHTML(input.key)}" data-direction="-1" aria-label="${escapeHTML(`Decrease ${input.label}`)}" ${input.disabled ? 'disabled' : ''}>−</button>
    <output class="s-stepper__value" data-setting-output="${escapeHTML(input.key)}">${escapeHTML(input.value)}${input.unit ? ` ${escapeHTML(input.unit)}` : ''}</output>
    <button type="button" class="s-stepper__btn" data-setting-step="${escapeHTML(input.key)}" data-direction="1" aria-label="${escapeHTML(`Increase ${input.label}`)}" ${input.disabled ? 'disabled' : ''}>+</button>
  </div>`;
}

/**
 * @param {{ key: string, label: string, value: number, min: number, max: number, step?: number, unit?: string, disabled?: boolean }} input
 */
export function sliderRow(input) {
  const id = `s-slider-${input.key.replace(/[^a-z0-9_-]/gi, '-')}`;
  return `<div class="s-slider">
    <input id="${escapeHTML(id)}" type="range" data-setting-slider="${escapeHTML(input.key)}" min="${input.min}" max="${input.max}" step="${input.step || 1}" value="${input.value}" aria-label="${escapeHTML(input.label)}" ${input.disabled ? 'disabled' : ''}>
    <output class="s-slider__value" for="${escapeHTML(id)}" data-setting-output="${escapeHTML(input.key)}">${escapeHTML(input.value)}${input.unit ? ` ${escapeHTML(input.unit)}` : ''}</output>
  </div>`;
}

/**
 * @param {{ key: string, label: string, value: string, disabled?: boolean, id?: string }} input
 */
export function timeControl(input) {
  return `<input${input.id ? ` id="${escapeHTML(input.id)}"` : ''} class="s-time" type="time"${input.id ? '' : ` data-setting-time="${escapeHTML(input.key)}"`} value="${escapeHTML(input.value)}" aria-label="${escapeHTML(input.label)}" ${input.disabled ? 'disabled' : ''}>`;
}

/**
 * @param {{ key: string, label: string, value: string|number, unit?: string, inputmode?: string, placeholder?: string, disabled?: boolean }} input
 */
export function textControl(input) {
  return `<span class="s-input-wrap">
    <input class="s-input" type="${input.inputmode === 'numeric' ? 'number' : 'text'}" data-setting-text="${escapeHTML(input.key)}" value="${escapeHTML(input.value ?? '')}" placeholder="${escapeHTML(input.placeholder || '')}" aria-label="${escapeHTML(input.label)}" ${input.disabled ? 'disabled' : ''}>
    ${input.unit ? `<span class="s-input__unit">${escapeHTML(input.unit)}</span>` : ''}
  </span>`;
}

/**
 * @param {{ key: string, label: string, options: Array<{value:string|number,label:string,description?:string}>, value: string|number, disabled?: boolean }} input
 */
export function selectList(input) {
  return `<div class="s-select-list" role="radiogroup" aria-label="${escapeHTML(input.label)}">
    ${input.options.map((option) => {
      const selected = String(option.value) === String(input.value);
      return `<label class="s-select-item${selected ? ' is-selected' : ''}">
        <input type="radio" name="s-${escapeHTML(input.key)}" value="${escapeHTML(option.value)}" data-setting-radio="${escapeHTML(input.key)}" ${selected ? 'checked' : ''} ${input.disabled ? 'disabled' : ''}>
        <span class="s-select-item__copy">
          <span class="s-select-item__label">${escapeHTML(option.label)}</span>
          ${option.description ? `<span class="s-select-item__desc">${escapeHTML(option.description)}</span>` : ''}
        </span>
        <span class="s-select-item__check" aria-hidden="true">✓</span>
      </label>`;
    }).join('')}
  </div>`;
}

/**
 * @param {{ title: string, options: Array<{value:string|number,label:string,description?:string}>, value?: string|number, cancelAction?: string, id?: string }} sheet
 */
export function pickerSheet(sheet) {
  const id = sheet.id || 's-picker';
  return `<div class="s-picker" id="${escapeHTML(id)}" role="dialog" aria-modal="true" aria-labelledby="${escapeHTML(id)}-title" hidden>
    <div class="s-picker__panel">
      <div class="s-picker__head">
        <h2 class="s-picker__title" id="${escapeHTML(id)}-title">${escapeHTML(sheet.title)}</h2>
        <button type="button" class="s-picker__close" data-action="${escapeHTML(sheet.cancelAction || 'close-picker')}" aria-label="Close">✕</button>
      </div>
      ${selectList({ key: id, label: sheet.title, options: sheet.options, value: sheet.value ?? '' })}
    </div>
  </div>`;
}

/**
 * @param {{ label: string, description?: string, action: string, confirmLabel?: string }} row
 */
export function dangerRow(row) {
  return `<button type="button" class="s-row s-row--danger" data-action="${escapeHTML(row.action)}">
    <span class="s-row__copy">
      <span class="s-row__label">${escapeHTML(row.confirmLabel || row.label)}</span>
      ${row.description ? `<span class="s-row__footnote">${escapeHTML(row.description)}</span>` : ''}
    </span>
    <span class="s-row__chevron" aria-hidden="true">›</span>
  </button>`;
}

/**
 * Collapse a large page title after its body scrolls. Pure DOM helper so pages
 * do not each write a scroll listener.
 *
 * The page body GROWS with its content, so it is not the scroller: the panel
 * host (.settings-body) is. Listening to the body meant `is-scrolled` never
 * became true and the title never collapsed.
 * @param {Element|null} page
 */
export function mountCollapsingTitle(page) {
  const body = page?.querySelector('.s-page__body');
  if (!page || !body) return () => {};
  /** @type {Element|null} */
  let scroller = body.parentElement;
  while (scroller && scroller !== document.body) {
    if (/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) break;
    scroller = scroller.parentElement;
  }
  if (!scroller || scroller === document.body) return () => {};
  const onScroll = () => page.classList.toggle('is-scrolled', scroller.scrollTop > 8);
  scroller.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => scroller.removeEventListener('scroll', onScroll);
}
