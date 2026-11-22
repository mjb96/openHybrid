// @ts-check
// =============================================================================
// EXERCISE OPTIONS — the per-exercise sheet opened from the cockpit card.
//
// Rest is the existing name-keyed override the timer engine already reads.
// Warm-up mode, a durable note and a private reference link are additive
// `settings.exercisePrefs`.
// =============================================================================
import { openManagedModal, closeManagedModal } from '../ui/modal-stack.js';
import { setRestOverrides } from '../timers.js';
import { safeExternalHttpUrl } from '../util.js';
import {
  WARMUP_MODE, getExerciseLink, getExercisePrefs, getExerciseRestOverride, getExerciseWarmupMode,
  setExerciseLink, setExercisePref, setExerciseRestOverride,
} from './exercise-config.js';
import { defaultSetModeForExercise } from './set-shape.js';
import { isBodyweightExercise, resolvedLoadMode } from './load-mode.js';
import { defaultBasisForExercise, normalizeBasis, supportsLoadBasis } from './load-basis.js';
import { SET_MODE } from '../set-utils.js';
import {
  getState, saveState, rerenderWorkout,
} from './context.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));

function restLabel(seconds) {
  if (seconds == null) return 'Default';
  if (Number(seconds) <= 0) return 'No timer';
  const value = Math.round(Number(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

/**
 * Open the per-exercise settings sheet.
 * @param {string} name
 */
export function openExerciseOptions(name) {
  const state = getState?.();
  if (!state || !name) return;
  const rest = getExerciseRestOverride(state, name);
  const warmup = getExerciseWarmupMode(state, name);
  const note = String(getExercisePrefs(state, name).note || '');
  const link = getExerciseLink(state, name);
  const defaultMode = defaultSetModeForExercise(name);
  const storedMode = getExercisePrefs(state, name).mode;
  const initialMode = storedMode === SET_MODE.REPS || storedMode === SET_MODE.TIME || storedMode === SET_MODE.DISTANCE
    ? storedMode : defaultMode;
  const prefs = getExercisePrefs(state, name);
  const defaultLoad = resolvedLoadMode({}, name);
  const initialLoad = ['weighted', 'bodyweight', 'assisted', 'banded'].includes(prefs.loadMode)
    ? prefs.loadMode : defaultLoad;
  const bodyweightCapable = isBodyweightExercise(name);
  const basisCapable = supportsLoadBasis(name);
  const defaultBasis = defaultBasisForExercise(name);
  const initialBasis = normalizeBasis(prefs.basis || defaultBasis);
  const overlay = document.createElement('div');
  overlay.className = 'cmodal-overlay exercise-config-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', `${name} settings`);
  overlay.innerHTML = `
    <div class="cmodal exercise-config">
      <div class="cmodal__title">${esc(name)}</div>
      <p class="cmodal__msg">These preferences stick to this exercise across sessions and programs. Nothing here changes logged history.</p>
      <section class="exercise-config__section">
        <h3>Set shape</h3>
        <div class="exercise-config__choices" role="group" aria-label="Set shape">
          <button type="button" class="exercise-config__choice ${initialMode === SET_MODE.REPS ? 'is-active' : ''}" data-mode="reps">Reps</button>
          <button type="button" class="exercise-config__choice ${initialMode === SET_MODE.TIME ? 'is-active' : ''}" data-mode="time">Time</button>
          <button type="button" class="exercise-config__choice ${initialMode === SET_MODE.DISTANCE ? 'is-active' : ''}" data-mode="distance">Distance</button>
        </div>
        <p class="exercise-config__hint">New rows start in this shape. Any set can still be switched from its ⋯ options.</p>
      </section>
      <section class="exercise-config__section">
        <h3>Load default</h3>
        <div class="exercise-config__choices" role="group" aria-label="Load default">
          <button type="button" class="exercise-config__choice ${initialLoad === 'weighted' ? 'is-active' : ''}" data-load-mode="weighted">Weighted</button>
          <button type="button" class="exercise-config__choice ${initialLoad === 'bodyweight' ? 'is-active' : ''}" data-load-mode="bodyweight">Bodyweight</button>
          ${bodyweightCapable ? `<button type="button" class="exercise-config__choice ${initialLoad === 'assisted' ? 'is-active' : ''}" data-load-mode="assisted">Assisted</button>` : ''}
          <button type="button" class="exercise-config__choice ${initialLoad === 'banded' ? 'is-active' : ''}" data-load-mode="banded">Band</button>
        </div>
        <p class="exercise-config__hint">Weighted rows take an external load. Bodyweight and assisted rows use your logged body mass; Band uses the band weight.</p>
      </section>
      ${basisCapable ? `<section class="exercise-config__section">
        <h3>Weight meaning</h3>
        <div class="exercise-config__choices" role="group" aria-label="Weight meaning">
          <button type="button" class="exercise-config__choice ${initialBasis === 'each' ? 'is-active' : ''}" data-basis="each">Each</button>
          <button type="button" class="exercise-config__choice ${initialBasis === 'total' ? 'is-active' : ''}" data-basis="total">Both</button>
          <button type="button" class="exercise-config__choice ${initialBasis === 'per-side' ? 'is-active' : ''}" data-basis="per-side">Per side</button>
        </div>
        <p class="exercise-config__hint">Each counts a dumbbell pair twice; Both counts the entered number once; Per side is for one-arm work.</p>
      </section>` : ''}
      <section class="exercise-config__section">
        <h3>Rest after a set</h3>
        <div class="exercise-config__choices" role="group" aria-label="Rest after a set">
          <button type="button" class="exercise-config__choice ${rest == null ? 'is-active' : ''}" data-rest="default">Default</button>
          <button type="button" class="exercise-config__choice ${rest != null && rest <= 0 ? 'is-active' : ''}" data-rest="off">No timer</button>
          <button type="button" class="exercise-config__choice ${rest != null && rest > 0 ? 'is-active' : ''}" data-rest="custom">Custom</button>
        </div>
        <label class="exercise-config__custom">
          <span>Seconds</span>
          <input type="number" min="0" max="600" step="5" inputmode="numeric" id="exerciseConfigRest" value="${rest != null && rest > 0 ? rest : ''}" placeholder="${esc(restLabel(rest))}">
        </label>
      </section>
      <section class="exercise-config__section">
        <h3>Warm-up ramp</h3>
        <div class="exercise-config__choices" role="group" aria-label="Warm-up ramp">
          <button type="button" class="exercise-config__choice ${warmup === WARMUP_MODE.INHERIT ? 'is-active' : ''}" data-warmup="inherit">Use global</button>
          <button type="button" class="exercise-config__choice ${warmup === WARMUP_MODE.AUTO ? 'is-active' : ''}" data-warmup="auto">Always</button>
          <button type="button" class="exercise-config__choice ${warmup === WARMUP_MODE.OFF ? 'is-active' : ''}" data-warmup="off">Never</button>
        </div>
      </section>
      <section class="exercise-config__section">
        <h3>Exercise note</h3>
        <textarea class="cmodal__input exercise-config__note" id="exerciseConfigNote" maxlength="140" rows="3" placeholder="Loading cue, setup, reminder…">${esc(note)}</textarea>
      </section>
      <section class="exercise-config__section">
        <h3><label for="exerciseConfigLink">Reference link</label></h3>
        <input class="cmodal__input exercise-config__link" type="url" inputmode="url" maxlength="2048" id="exerciseConfigLink" value="${esc(link)}" placeholder="https://…" autocomplete="off" spellcheck="false" aria-describedby="exerciseConfigLinkHint exerciseConfigLinkError" aria-invalid="false">
        <p class="exercise-config__hint" id="exerciseConfigLinkHint">A private shortcut to a video or article. It opens from the exercise card and stays out of recaps and share cards.</p>
        <p class="exercise-config__error" id="exerciseConfigLinkError" role="status" aria-live="polite" hidden></p>
      </section>
      <div class="cmodal__row">
        <button type="button" class="cmodal__btn cmodal__btn--cancel" data-cm="cancel">Cancel</button>
        <button type="button" class="cmodal__btn cmodal__btn--ok" data-cm="ok">Save</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let restChoice = rest == null ? 'default' : rest <= 0 ? 'off' : 'custom';
  let warmupChoice = warmup;
  let modeChoice = initialMode;
  let loadChoice = initialLoad;
  let basisChoice = initialBasis;
  const syncChoices = () => {
    overlay.querySelectorAll('[data-rest]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-rest') === restChoice);
    });
    overlay.querySelectorAll('[data-warmup]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-warmup') === warmupChoice);
    });
    overlay.querySelectorAll('[data-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-mode') === modeChoice);
    });
    overlay.querySelectorAll('[data-load-mode]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-load-mode') === loadChoice);
    });
    overlay.querySelectorAll('[data-basis]').forEach((button) => {
      button.classList.toggle('is-active', button.getAttribute('data-basis') === basisChoice);
    });
    const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#exerciseConfigRest'));
    if (input) input.disabled = restChoice !== 'custom';
  };
  syncChoices();

  const linkInput = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#exerciseConfigLink'));
  const linkError = /** @type {HTMLElement|null} */ (overlay.querySelector('#exerciseConfigLinkError'));
  const validateLink = () => {
    const raw = String(linkInput?.value || '').trim();
    const ok = !raw || !!safeExternalHttpUrl(raw);
    if (linkError) {
      linkError.hidden = ok;
      linkError.textContent = ok ? '' : 'Enter a valid http:// or https:// link.';
    }
    linkInput?.classList.toggle('is-invalid', !ok);
    linkInput?.setAttribute('aria-invalid', ok ? 'false' : 'true');
    return ok;
  };
  linkInput?.addEventListener('input', validateLink);

  const close = () => {
    closeManagedModal(overlay);
    overlay.classList.remove('cmodal--in');
    setTimeout(() => overlay.remove(), 180);
  };
  const save = () => {
    const input = /** @type {HTMLInputElement|null} */ (overlay.querySelector('#exerciseConfigRest'));
    // A blank link is a deliberate clear — it never blocks Save. An unsafe
    // value keeps the sheet open so the inline aria-live message is visible.
    if (!validateLink()) { linkInput?.focus(); return; }
    if (restChoice === 'default') setExerciseRestOverride(state, name, null);
    else if (restChoice === 'off') setExerciseRestOverride(state, name, 0);
    else {
      const seconds = Number(input?.value);
      setExerciseRestOverride(state, name, Number.isFinite(seconds) ? seconds : null);
    }
    setExercisePref(state, name, {
      mode: modeChoice === defaultMode ? null : modeChoice,
      loadMode: loadChoice === defaultLoad ? null : loadChoice,
      basis: basisCapable && basisChoice !== defaultBasis ? basisChoice : null,
      warmup: warmupChoice === WARMUP_MODE.INHERIT ? null : warmupChoice,
      note: String(/** @type {HTMLTextAreaElement|null} */ (overlay.querySelector('#exerciseConfigNote'))?.value || '').trim(),
    });
    setExerciseLink(state, name, String(linkInput?.value || '').trim());
    setRestOverrides(state.settings?.restOverrides || {});
    Promise.resolve(saveState?.(true)).catch(() => {});
    rerenderWorkout?.();
    close();
  };

  overlay.addEventListener('click', (event) => {
    const target = /** @type {HTMLElement} */ (event.target);
    if (target === overlay) { close(); return; }
    const restButton = target.closest('[data-rest]');
    if (restButton) { restChoice = restButton.getAttribute('data-rest') || 'default'; syncChoices(); return; }
    const warmButton = target.closest('[data-warmup]');
    if (warmButton) { warmupChoice = warmButton.getAttribute('data-warmup') || WARMUP_MODE.INHERIT; syncChoices(); return; }
    const modeButton = target.closest('[data-mode]');
    if (modeButton) { modeChoice = /** @type {any} */ (modeButton.getAttribute('data-mode')); syncChoices(); return; }
    const loadButton = target.closest('[data-load-mode]');
    if (loadButton) { loadChoice = /** @type {any} */ (loadButton.getAttribute('data-load-mode')); syncChoices(); return; }
    const basisButton = target.closest('[data-basis]');
    if (basisButton) { basisChoice = /** @type {any} */ (basisButton.getAttribute('data-basis')); syncChoices(); return; }
    if (target.closest('[data-cm="cancel"]')) { close(); return; }
    if (target.closest('[data-cm="ok"]')) save();
  });
  overlay.addEventListener('keydown', (event) => {
    if (/** @type {KeyboardEvent} */ (event).key === 'Escape') close();
  });

  openManagedModal(overlay, {
    initialFocus: '[data-cm="ok"]',
    onRequestClose: close,
  });
  requestAnimationFrame(() => overlay.classList.add('cmodal--in'));
}
