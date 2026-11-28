// @ts-check
// =============================================================================
// HOME REST PILL (js/home/rest-pill.js)
//
// The rest countdown survives a tab switch and a reload (js/timers.js keeps an
// absolute end time), but its only UI lived inside the cockpit. An athlete who
// checked History or Progress mid-rest had to guess when to go back.
//
// This is a presenter, not a second timer: it renders the persisted snapshot on
// Home entry, and the cockpit's own 250 ms tick updates the same clock element
// while Home is visible. It never starts, pauses or restores anything.
// =============================================================================
import { readRestSnapshot } from '../timers.js';

/**
 * @param {ReturnType<typeof readRestSnapshot>} snapshot
 * @returns {{ clock: string, label: string, paused: boolean }|null}
 */
export function restPillModel(snapshot) {
  if (!snapshot || !(Number(snapshot.remaining) > 0)) return null;
  const remaining = Math.round(Number(snapshot.remaining));
  const m = Math.floor(remaining / 60);
  const s = String(remaining % 60).padStart(2, '0');
  return {
    clock: `${m}:${s}`,
    label: snapshot.paused ? 'Rest paused' : 'Resting',
    paused: !!snapshot.paused,
  };
}

/**
 * Mount the pill. A missing container is a no-op, and no rest hides it.
 *
 * @param {HTMLElement|null} container
 * @param {ReturnType<typeof readRestSnapshot>} [snapshot]
 */
export function renderHomeRestPill(container, snapshot = readRestSnapshot()) {
  if (!container) return null;
  const model = restPillModel(snapshot);
  if (!model) {
    container.hidden = true;
    return null;
  }
  const label = container.querySelector('#homeRestPillLabel');
  const clock = container.querySelector('#homeRestPillClock');
  if (label) label.textContent = model.label;
  if (clock) clock.textContent = model.clock;
  const button = container.querySelector('.home-rest-pill__btn');
  button?.setAttribute('aria-label', `${model.label}, ${model.clock} remaining — back to workout`);
  container.hidden = false;
  return model;
}
