// @ts-check
// =============================================================================
// PLAN LINK ROW (js/programs/plan-link-row.js)
// -----------------------------------------------------------------------------
// The one text-first way to point at another plan: a name, an optional why, the
// decision facts (weeks · days/week · level) and a chevron. No cover art.
//
// Roadmap §22 visual pass: plan "thumbnails" (gradient + glyph) were doing no
// work — a custom plan got a generic bolt, a catalogue plan got a coloured box
// with the same name beside it, and the 114px recommendation tiles squeezed
// names and reasons into three lines. Rows carry the same facts without the
// decoration, and match the rest of Plans.
// =============================================================================
import { DIFFICULTY_LABELS } from './catalog.js';
import { programFacts } from './browse-model.js';
import { escapeHtml, safeCssColor } from '../util.js';

/**
 * @param {any} program
 * @param {{ reason?: string }} [options]
 * @returns {string}
 */
export function planLinkRowHTML(program, options = {}) {
  const facts = programFacts(program);
  // No colour literal: the fallback is the theme token the guard expects.
  const accent = safeCssColor(program?.accentColor, 'var(--accent-purple)');
  const reason = String(options.reason || '').trim();
  const meta = facts.wod
    ? ['Single workout', facts.level ? DIFFICULTY_LABELS[facts.level]?.label : ''].filter(Boolean).join(' · ')
    : [
      facts.weeks ? `${facts.weeks} week${facts.weeks === 1 ? '' : 's'}` : '',
      facts.daysPerWeek ? `${facts.daysPerWeek}×/week` : '',
      facts.level ? DIFFICULTY_LABELS[facts.level]?.label : '',
    ].filter(Boolean).join(' · ');
  return `
    <button type="button" class="rec-row" data-action="open-program-detail"
            data-program-id="${escapeHtml(String(program?.id || ''))}"
            style="--rec-accent: ${accent}">
      <span class="rec-row__body">
        <span class="rec-row__name">${escapeHtml(String(program?.name || 'Plan'))}</span>
        ${reason ? `<span class="rec-row__why">${escapeHtml(reason)}</span>` : ''}
        ${meta ? `<span class="rec-row__meta">${escapeHtml(meta)}</span>` : ''}
      </span>
      <span class="rec-row__chevron" aria-hidden="true">›</span>
    </button>`;
}
