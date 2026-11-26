// @ts-check
// =============================================================================
// NEW PLAN SHEET (js/programs/create-sheet.js)
// -----------------------------------------------------------------------------
// Roadmap §22 / PL6. "New plan" used to open a modal that asked for a NAME,
// a FOCUS and a NUMBER OF WEEKS before the athlete could see or build anything.
// That is the wrong first question. This sheet asks where the plan starts:
//
//   • Start blank            — an empty week, named inline in the editor
//   • Start from a template  — a recommended plan, forked into their own copy
//   • Copy one of mine       — duplicate an existing personal plan
//   • Import a plan (.json)  — the portable file
//
// It writes through the existing state helpers (create/duplicate), so the
// library, the plan page and the editor see exactly the records they already
// understand.
// =============================================================================
import { appState, createCustomProgram, duplicateCustomProgram } from '../state.js';
import { getRecommendations } from './recommendations.js';
import { escapeHtml } from '../util.js';
import { closeManagedModal, openManagedModal } from '../ui/modal-stack.js';
import { showToast } from '../toast.js';

let _open = null;

function ensureSheet() {
  let root = document.getElementById('plansStartSheet');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'plansStartSheet';
  root.className = 'modal-overlay plans-start-sheet';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'plansStartTitle');
  root.setAttribute('data-modal-root', '');
  root.setAttribute('data-modal-close-action', 'close-plan-start');
  root.setAttribute('inert', '');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="modal-content plans-start-panel">
      <div class="plans-start-head">
        <h2 id="plansStartTitle">New plan</h2>
        <button type="button" data-action="close-plan-start" aria-label="Close">×</button>
      </div>
      <p class="plans-start-hint">Where should this plan start? You can rename it and set its length in the editor.</p>

      <button type="button" class="plans-start-option" data-start="blank">
        <strong>Start blank</strong><span>An empty week you build day by day.</span>
      </button>

      <button type="button" class="plans-start-option" data-start="template">
        <strong>Start from a template</strong><span>Fork a plan that fits your goal and kit.</span>
      </button>
      <div id="plansStartTemplates" class="plans-start-list" hidden></div>

      <button type="button" class="plans-start-option" data-start="copy">
        <strong>Copy one of mine</strong><span>Duplicate a plan you already own.</span>
      </button>
      <div id="plansStartCopies" class="plans-start-list" hidden></div>

      <button type="button" class="plans-start-option" data-start="import">
        <strong>Import a plan (.json)</strong><span>A file exported from openHybrid.</span>
      </button>
    </div>`;
  document.body.appendChild(root);
  return root;
}

function fillLists(root) {
  const templates = root.querySelector('#plansStartTemplates');
  const copies = root.querySelector('#plansStartCopies');
  if (templates) {
    const recs = getRecommendations(appState, 3);
    templates.innerHTML = recs.map((item) => `
      <button type="button" class="plans-start-choice" data-fork="${escapeHtml(item.program.id)}">
        <strong>${escapeHtml(item.program.name)}</strong>
        <span>${escapeHtml(item.reason || 'Fits your profile')}</span>
      </button>`).join('') || '<p class="plans-start-empty">No recommendation has a true reason yet — browse the library instead.</p>';
  }
  if (copies) {
    const mine = (appState?.customPrograms || []).filter((p) => p?.id && !p.archived);
    copies.innerHTML = mine.map((program) => `
      <button type="button" class="plans-start-choice" data-copy="${escapeHtml(program.id)}">
        <strong>${escapeHtml(program.name || 'Plan')}</strong>
        <span>${Number(program.totalWeeks) || 12} weeks</span>
      </button>`).join('') || '<p class="plans-start-empty">You have no personal plan to copy yet.</p>';
  }
}

function close() {
  const root = document.getElementById('plansStartSheet');
  if (!root) return;
  root.classList.remove('active');
  closeManagedModal(root);
  _open = null;
}

function createAndOpen(id) {
  if (!id) { showToast('Could not create the plan', true); return; }
  const open = _open;
  close();
  if (open) open(id);
}

function handleClick(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-action], [data-start], [data-fork], [data-copy]') : null;
  if (!target) return;
  const action = target.getAttribute('data-action');
  if (action === 'close-plan-start') { close(); return; }
  const start = target.getAttribute('data-start');
  if (start === 'blank') {
    createAndOpen(createCustomProgram('New plan', 12, '', ''));
    return;
  }
  if (start === 'template' || start === 'copy') {
    const list = document.getElementById(start === 'template' ? 'plansStartTemplates' : 'plansStartCopies');
    if (list) list.hidden = !list.hidden;
    return;
  }
  if (start === 'import') {
    close();
    document.getElementById('planImportFile')?.click();
    return;
  }
  const fork = target.getAttribute('data-fork');
  if (fork) { createAndOpen(duplicateCustomProgram(fork, { keepName: true })); return; }
  const copy = target.getAttribute('data-copy');
  if (copy) { createAndOpen(duplicateCustomProgram(copy)); }
}

/**
 * Open the sheet. `open` receives the new program id and takes the athlete into
 * the editor (the caller owns that navigation, so this module has no dependency
 * on the builder).
 * @param {{ open?: (programId:string) => void }} [options]
 */
export function openPlanStartingSheet(options = {}) {
  _open = typeof options.open === 'function' ? options.open : null;
  const root = ensureSheet();
  fillLists(root);
  if (!root.dataset.wired) {
    root.dataset.wired = '1';
    root.addEventListener('click', handleClick);
  }
  root.classList.add('active');
  openManagedModal(root, { initialFocus: '[data-start="blank"]' });
}
