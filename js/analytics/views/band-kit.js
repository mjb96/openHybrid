// @ts-check
// =============================================================================
// BAND KIT (js/analytics/views/band-kit.js)
//
// Every Progress band renders through these builders, so the five required
// states, the accessible name and the text-alternative table are implemented
// ONCE. The old analytics screens each hand-rolled their empty case, which is
// how six views ended up with six different behaviours.
//
// Pure string builders: no DOM, no state, no imports of app modules. `esc`
// comes from screen-kit so there is a single escaping rule on this surface.
// =============================================================================
import { esc } from './screen-kit.js';

/**
 * @typedef {Object} BandAction
 * @property {string} label
 * @property {string} [action]   data-action
 * @property {string} [target]   data-target
 * @property {string} [context]  data-context
 */

/**
 * One band card. The eyebrow asks the question, the value answers it, the body
 * is the evidence. `aria-labelledby` points at the visible title so a screen
 * reader announces "Muscles" rather than the whole card.
 *
 * @param {{
 *   id: string,
 *   eyebrow: string,
 *   value?: string,
 *   valueUnit?: string,
 *   title?: string,
 *   sub?: string,
 *   chip?: string,
 *   actions?: BandAction[],
 *   body?: string,
 *   ariaLabel?: string,
 * }} input
 */
export function band({ id, eyebrow, value, valueUnit, title, sub, chip, actions, body, ariaLabel }) {
  const headingId = `pg-band-${id}-title`;
  const heading = title || eyebrow;
  const valueHTML = value
    ? `<span class="pg-band__value">${esc(value)}${valueUnit ? `<span class="pg-band__unit">${esc(valueUnit)}</span>` : ''}</span>`
    : '';
  const chipHTML = chip ? `<span class="pg-band__chip">${esc(chip)}</span>` : '';
  const subHTML = sub ? `<p class="pg-band__sub">${esc(sub)}</p>` : '';
  const actionsHTML = Array.isArray(actions) && actions.length
    ? `<div class="pg-band__actions">${actions.map(actionButton).join('')}</div>`
    : '';

  // An explicit name (e.g. "23–29 Nov overview") beats a bare title when the
  // band's meaning depends on its period.
  const named = ariaLabel
    ? `aria-label="${esc(ariaLabel)}"`
    : `aria-labelledby="${esc(headingId)}"`;
  return `<section class="pg-band" data-band="${esc(id)}" ${named}>
    <div class="pg-band__head">
      <div class="pg-band__headline">
        <span class="pg-band__eyebrow" id="${esc(headingId)}">${esc(eyebrow)}</span>
        ${valueHTML}
      </div>
      ${chipHTML}
    </div>
    ${subHTML}
    ${actionsHTML}
    ${body || ''}
  </section>`;
}

/** @param {BandAction} action */
function actionButton(action) {
  const attrs = [
    `data-action="${esc(action.action || 'open-analytics')}"`,
    action.target ? `data-target="${esc(action.target)}"` : '',
    action.context ? `data-context="${esc(action.context)}"` : '',
  ].filter(Boolean).join(' ');
  return `<button type="button" class="pg-band__action" ${attrs}>${esc(action.label)}</button>`;
}

/**
 * The five non-ready states. Structure is fixed so a caller can never invent a
 * sixth; copy is the caller's.
 *
 * `loading` reserves the geometry it will be replaced by (`height`), because a
 * layout jump on every visit is what makes a dashboard feel worse than the one
 * it replaced.
 *
 * @param {'loading'|'empty'|'error'|'offline'|'stale'} kind
 * @param {{
 *   message?: string,
 *   detail?: string,
 *   height?: number,
 *   action?: BandAction,
 *   retry?: BandAction,
 *   asOf?: string,
 * }} [opts]
 */
export function stateBlock(kind, opts = {}) {
  const height = Number.isFinite(Number(opts.height)) ? Number(opts.height) : null;
  const style = height ? ` style="--pg-state-h:${height}px"` : '';

  if (kind === 'loading') {
    return `<div class="pg-state pg-state--loading" role="status" aria-busy="true" aria-label="Loading"${style}>
      <span class="pg-skeleton pg-skeleton--title"></span>
      <span class="pg-skeleton pg-skeleton--chart"></span>
      <span class="pg-skeleton pg-skeleton--row"></span>
    </div>`;
  }

  if (kind === 'error') {
    const retry = opts.retry ? actionButton({ ...opts.retry, action: opts.retry.action || 'retry-band' }) : '';
    return `<div class="pg-state pg-state--error" role="alert"${style}>
      <p class="pg-state__message">${esc(opts.message || 'We could not calculate this right now.')}</p>
      ${opts.detail ? `<details class="pg-state__detail"><summary>Details</summary><p>${esc(opts.detail)}</p></details>` : ''}
      ${retry}
    </div>`;
  }

  if (kind === 'empty') {
    return `<div class="pg-state pg-state--empty" role="status"${style}>
      <p class="pg-state__message">${esc(opts.message || 'Nothing logged in this period yet.')}</p>
      ${opts.action ? actionButton(opts.action) : ''}
    </div>`;
  }

  if (kind === 'offline') {
    // Analytics are local, so offline is never an error — at most a quiet note.
    return `<div class="pg-state pg-state--offline" role="status">
      <p class="pg-state__message">${esc(opts.message || 'Showing your on-device data.')}</p>
    </div>`;
  }

  // stale
  return `<p class="pg-state pg-state--stale">${esc(opts.asOf ? `As of ${opts.asOf}` : (opts.message || 'Not up to date'))}</p>`;
}

/**
 * The text alternative. Not `sr-only`-only: sighted keyboard users and anyone
 * wanting exact numbers get the same affordance.
 *
 * @param {string[]} columns
 * @param {Array<Array<string|number>>} rows
 * @param {string} caption
 */
export function dataTableDisclosure(columns, rows, caption) {
  if (!Array.isArray(columns) || !columns.length) return '';
  const head = columns.map((column) => `<th scope="col">${esc(column)}</th>`).join('');
  const body = (rows || []).map((row) => `<tr>${row
    .map((cell) => `<td>${esc(cell)}</td>`)
    .join('')}</tr>`).join('');
  return `<details class="pg-data">
    <summary>Show data</summary>
    <div class="pg-data__wrap">
      <table class="pg-data__table">
        <caption class="sr-only">${esc(caption)}</caption>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </details>`;
}

/**
 * @param {Array<{ label: string, color?: string, muted?: boolean }>} items
 */
export function legend(items) {
  if (!Array.isArray(items) || !items.length) return '';
  return `<ul class="pg-legend" aria-label="Legend">${items.map((item) => `<li class="pg-legend__item${item.muted ? ' is-muted' : ''}">
      <span class="pg-legend__swatch"${item.color ? ` style="background:${esc(item.color)}"` : ''} aria-hidden="true"></span>
      <span class="pg-legend__label">${esc(item.label)}</span>
    </li>`).join('')}</ul>`;
}

/**
 * Name · track · value · status rows. The chart is the fast read; these rows
 * are the truth, which is why they carry the numbers rather than tooltips.
 *
 * @param {Array<{ label: string, value: string|number, pct?: number, status?: string, color?: string, action?: BandAction }>} rows
 */
export function rankedRows(rows) {
  if (!Array.isArray(rows) || !rows.length) return '';
  return `<ul class="pg-rows">${rows.map((row) => {
    const pct = Math.max(0, Math.min(100, Number(row.pct) || 0));
    const attrs = row.action
      ? ` data-action="${esc(row.action.action || 'open-analytics')}"${row.action.context ? ` data-context="${esc(row.action.context)}"` : ''}`
      : '';
    const tag = row.action ? 'button type="button"' : 'div';
    const close = row.action ? 'button' : 'div';
    return `<li class="pg-row">
      <${tag} class="pg-row__hit"${attrs}>
        <span class="pg-row__name">${esc(row.label)}</span>
        <span class="pg-row__track" aria-hidden="true"><span class="pg-row__bar" style="width:${pct}%${row.color ? `;background:${esc(row.color)}` : ''}"></span></span>
        <span class="pg-row__value">${esc(row.value)}</span>
        <span class="pg-row__status">${esc(row.status || '')}</span>
      </${close}>
    </li>`;
  }).join('')}</ul>`;
}

/**
 * A collapsed band in a focused view (§3.5): one row that still states the
 * headline, so filtering never hides the number.
 *
 * @param {{ id: string, eyebrow: string, value: string, delta?: string, action?: BandAction }} input
 */
export function collapsedBandRow({ id, eyebrow, value, delta, action }) {
  const attrs = `data-action="${esc(action?.action || 'expand-band')}" data-band="${esc(id)}" data-target="${esc(id)}"`;
  return `<section class="pg-band pg-band--collapsed" data-band="${esc(id)}">
    <button type="button" class="pg-collapsed" ${attrs} aria-label="${esc(`${eyebrow}: ${value}${delta ? `, ${delta}` : ''}. Show details.`)}">
      <span class="pg-band__eyebrow">${esc(eyebrow)}</span>
      <span class="pg-collapsed__value">${esc(value)}</span>
      ${delta ? `<span class="pg-collapsed__delta">${esc(delta)}</span>` : ''}
      <span class="pg-collapsed__cue" aria-hidden="true">View ›</span>
    </button>
  </section>`;
}
