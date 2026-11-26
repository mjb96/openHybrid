// @ts-check
// =============================================================================
// PROGRAM-BUILDER EXERCISE ROW (js/programs/exercise-row.js)
//
// Pure markup for one row of the custom-program editor.
//
// Roadmap §22 / PL5: the row used to spend five controls per exercise
// (up, down, replace, settings, remove) and still could not say what the
// exercise was prescribed. It is now three: the name (opens the exercise
// picker), the **target** (opens the target sheet), and one `•••` menu that
// holds reorder, swap, settings and remove. That is the Hevy/Strong pattern and
// the fix for an eight-control row.
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
 * The row's `•••` menu. Pure so the destructive/secondary actions are testable
 * without the editor's DOM; `program_builder.js` hands this straight to
 * `openActionMenu`.
 * @param {{day:string, index:number, count:number, name:string}} row
 */
export function exerciseRowMenuItems({ day, index, count }) {
  const at = { day, i: index };
  return [
    ...(index > 0 ? [{ label: 'Move up', action: 'b-move-up', dataset: at }] : []),
    ...(index < count - 1 ? [{ label: 'Move down', action: 'b-move-down', dataset: at }] : []),
    { label: 'Swap exercise', action: 'b-open-picker', dataset: at },
    { label: 'Exercise settings', action: 'b-exercise-settings', dataset: at },
    { label: 'Remove', action: 'b-remove-lift', dataset: at, danger: true },
  ];
}

/**
 * @param {string} day
 * @param {string} name
 * @param {number} index
 * @param {number} count
 * @param {any} state
 * @param {{ target?: {sets:number|string, reps:string, own:boolean}|null }} [opts]
 *   `own` = the athlete set this lift's own target; otherwise it is the week's
 *   default, which the target sheet can replace.
 * @returns {string}
 */
export function buildExerciseRowHTML(day, name, index, count, state, opts = {}) {
  const { note, link } = exerciseReference(state, name);
  const safeName = escapeHtml(name);
  const target = opts.target || null;
  const targetText = target ? `${target.sets} × ${target.reps}` : 'Set target';
  const targetHint = target ? (target.own ? 'This plan' : 'Week default') : 'No target';
  return `
    <div class="program-editor__exercise-row" data-editor-row>
      <button type="button" class="program-editor__exercise-name" data-action="b-open-picker" data-day="${escapeHtml(day)}" data-i="${index}"><strong>${safeName}</strong><span>Tap to replace</span></button>
      <button type="button" class="program-editor__target${target?.own ? ' is-own' : ''}" data-action="b-lift-target" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Target for ${safeName}: ${escapeHtml(targetText)}">
        <strong>${escapeHtml(targetText)}</strong><span>${escapeHtml(targetHint)}</span>
      </button>
      <button type="button" class="program-editor__row-menu" data-action="b-row-menu" data-day="${escapeHtml(day)}" data-i="${index}" aria-label="Actions for ${safeName}" aria-haspopup="menu" aria-expanded="false">•••</button>
      ${note ? `<p class="program-editor__exercise-note">${escapeHtml(note)}</p>` : ''}
      ${link ? `<a class="program-editor__exercise-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">${escapeHtml(referenceLinkLabel(link))}</a>` : ''}
    </div>
  `;
}
