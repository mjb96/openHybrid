// @ts-check
// =============================================================================
// EXERCISE MEDIA (prototype: 10 core lifts)
//
// Two demonstration stills per lift, crossfaded into a slow loop. The source is
// Free Exercise DB (yuhonas/free-exercise-db, Unlicense/public domain), so the
// files can ship inside the AGPL app and work offline. See NOTICE.md.
//
// This is deliberately NOT video: it is a small, licence-clean "movement demo"
// that fits the existing offline PWA. The map is keyed by canonical exercise id
// so aliases share one asset, and only reviewed core lifts with a real mapping
// appear.
// =============================================================================
import { resolveExercise } from './catalog.js';

/** @typedef {{ frames: [string, string], source: string }} ExerciseMedia */

/** @type {Record<string, ExerciseMedia>} */
export const EXERCISE_MEDIA = Object.freeze({
  back_squat: {
    frames: ['./assets/exercises/back_squat-0.webp', './assets/exercises/back_squat-1.webp'],
    source: 'free-exercise-db/Barbell_Squat',
  },
  barbell_bench_press: {
    frames: ['./assets/exercises/barbell_bench_press-0.webp', './assets/exercises/barbell_bench_press-1.webp'],
    source: 'free-exercise-db/Barbell_Bench_Press_-_Medium_Grip',
  },
  conventional_deadlift: {
    frames: ['./assets/exercises/conventional_deadlift-0.webp', './assets/exercises/conventional_deadlift-1.webp'],
    source: 'free-exercise-db/Barbell_Deadlift',
  },
  barbell_overhead_press: {
    frames: ['./assets/exercises/barbell_overhead_press-0.webp', './assets/exercises/barbell_overhead_press-1.webp'],
    source: 'free-exercise-db/Standing_Military_Press',
  },
  barbell_row: {
    frames: ['./assets/exercises/barbell_row-0.webp', './assets/exercises/barbell_row-1.webp'],
    source: 'free-exercise-db/Bent_Over_Barbell_Row',
  },
  pull_up: {
    frames: ['./assets/exercises/pull_up-0.webp', './assets/exercises/pull_up-1.webp'],
    source: 'free-exercise-db/Pullups',
  },
  romanian_deadlift: {
    frames: ['./assets/exercises/romanian_deadlift-0.webp', './assets/exercises/romanian_deadlift-1.webp'],
    source: 'free-exercise-db/Romanian_Deadlift',
  },
  dumbbell_bench_press: {
    frames: ['./assets/exercises/dumbbell_bench_press-0.webp', './assets/exercises/dumbbell_bench_press-1.webp'],
    source: 'free-exercise-db/Dumbbell_Bench_Press',
  },
  leg_press: {
    frames: ['./assets/exercises/leg_press-0.webp', './assets/exercises/leg_press-1.webp'],
    source: 'free-exercise-db/Leg_Press',
  },
  plank: {
    frames: ['./assets/exercises/plank-0.webp', './assets/exercises/plank-1.webp'],
    source: 'free-exercise-db/Plank',
  },
});

/**
 * @param {unknown} value exercise name or id
 * @returns {ExerciseMedia|null}
 */
export function mediaForExercise(value) {
  const id = resolveExercise(/** @type {any} */ (value))?.id;
  return id ? EXERCISE_MEDIA[id] || null : null;
}

/**
 * The demo block. Two stacked images crossfade; the second is lazy and the
 * figure has a fixed aspect ratio so the modal never shifts when it loads.
 * @param {unknown} value exercise name or id
 */
export function exerciseMediaHTML(value) {
  const item = resolveExercise(/** @type {any} */ (value));
  const media = mediaForExercise(value);
  if (!item || !media) return '';
  const [first, second] = media.frames;
  return `<figure class="exercise-media" data-exercise-media
      role="img" aria-label="${escapeAttr(item.name)} demonstration: two positions of the movement">
    <img class="exercise-media__frame is-active" src="${first}" alt="" width="520" height="347" decoding="async">
    <img class="exercise-media__frame" src="${second}" alt="" width="520" height="347" loading="lazy" decoding="async">
  </figure>`;
}

/** @param {string} value */
function escapeAttr(value) {
  return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

/** @type {WeakMap<Element, { timer: any }>} */
const mediaTimers = new WeakMap();

/**
 * Start the crossfade for every media block under `root`. Reduced motion shows
 * the first frame only; a detached block clears its own timer on the next tick.
 * @param {ParentNode|null} root
 * @param {{ intervalMs?: number }} [options]
 */
export function mountExerciseMedia(root, { intervalMs = 1400 } = {}) {
  if (!root || typeof window === 'undefined') return;
  const reduced = document.documentElement.dataset.reducedMotion === 'reduce'
    || (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  root.querySelectorAll('[data-exercise-media]').forEach((figure) => {
    if (mediaTimers.has(figure)) return;
    const frames = /** @type {HTMLElement[]} */ ([...figure.querySelectorAll('.exercise-media__frame')]);
    if (frames.length < 2) return;
    if (reduced) { frames.forEach((f, i) => f.classList.toggle('is-active', i === 0)); return; }
    let active = 0;
    const timer = window.setInterval(() => {
      if (!figure.isConnected) { window.clearInterval(timer); mediaTimers.delete(figure); return; }
      active = (active + 1) % frames.length;
      frames.forEach((frame, index) => frame.classList.toggle('is-active', index === active));
    }, Math.max(600, Number(intervalMs) || 1400));
    mediaTimers.set(figure, { timer });
  });
}
