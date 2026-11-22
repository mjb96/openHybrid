// @ts-check
// =============================================================================
// PROGRAM-BUILDER EXERCISE ROW (js/programs/exercise-row.js)
//
// Pure markup for one row of the custom-program editor. Extracted from
// program_builder.js so the pinned note / reference link the athlete set from
// the cockpit (or from this row) is unit-testable without the editor's DOM.
//
// The row is the ONLY place outside the cockpit that can open the exercise
// settings sheet. There is no routine exercise editor; a routine is built from a
// logged session. This is how a reference link gets attached while building a
// program.
// =============================================================================
import { escapeHtml } from '../util.js';
import { getExerciseLink, getExerciseNote } from '../workout/exercise-config.js';
import { referenceLinkLabel } from '../workout/reference-link.js';

/**
 * The pinned preferences that belong to this exercise, read through the same
 * canonical-id key the cockpit uses (aliases share one entry).
 * @param {any} state
 * @param {string} name
 * @returns {{ note: string, link: string }}
 */
export function exerciseReference(state, name) {
  return {
    note: getExerciseNote(state, name),
    link: getExerciseLink(state, name),
  };
}

/**
 * @param {string} day
 * @param {string} name
 * @param {number} index
 * @param {number} count
 * @param {any} state
 * @returns {string}
 */
export function buildExerciseRowHTML(day, name, index, count, state) {
  const { note, link } = exerciseReference(state, name);
  const safeName = escapeHtml(name);
  return `
    <div class="program-editor__exercise-row">
      <div class="program-editor__order-controls" aria-label="Reorder ${safeName}">
        <button type="button" data-action="b-move-up" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Move ${safeName} up" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-action="b-move-down" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Move ${safeName} down" ${index === count - 1 ? 'disabled' : ''}>↓</button>
      </div>
      <button type="button" class="program-editor__exercise-name" data-action="b-open-picker" data-day="${escapeHtml(day)}" data-i="${index}"><strong>${safeName}</strong><span>Tap to replace</span></button>
      <button type="button" class="program-editor__exercise-settings" data-action="b-exercise-settings" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Exercise settings for ${safeName}" title="Exercise settings">⚙</button>
      <button type="button" class="program-editor__remove" data-action="b-remove-lift" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Remove ${safeName}">×</button>
      ${note ? `<p class="program-editor__exercise-note">${escapeHtml(note)}</p>` : ''}
      ${link ? `<a class="program-editor__exercise-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeHtml(referenceLinkLabel(link))}</a>` : ''}
    </div>
  `;
}
