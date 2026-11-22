// @ts-check
// =============================================================================
// TRAIN LANDING VIEW (js/train/view-train-landing.js) — roadmap Phase 0/2
//
// Train is a session preview: the week rail, one session card with the actual
// exercises and targets, then the unplanned quick starts and one recent line.
// Presentation only — every value comes from buildTrainLanding.
// =============================================================================

import { esc } from '../analytics/views/screen-kit.js';
import { icon } from '../ui/icons.js';

const STATUS_LABEL = {
  done: 'completed',
  missed: 'missed',
  today: 'today',
  planned: 'planned',
  rest: 'rest',
};

function weekRailHTML(week) {
  if (!week?.days?.length) return '';
  return `<div class="tl-week" role="group" aria-label="This week">
    ${week.days.map((cell) => {
      const classes = ['tl-week__day', `tl-week__day--${esc(cell.status)}`];
      if (cell.isToday) classes.push('is-today');
      const disabled = !cell.date || (!cell.planned && !cell.done && !cell.isToday);
      const dateLabel = cell.date ? cell.date.slice(8) : '';
      return `<button type="button" class="${classes.join(' ')}" data-action="select-program-workout" data-day="${esc(cell.day)}" ${disabled ? 'disabled' : ''} aria-label="${esc(`${cell.label} ${cell.date || ''}, ${STATUS_LABEL[cell.status] || cell.status}`)}">
        <span class="tl-week__name">${esc(cell.label)}</span>
        <span class="tl-week__dot" aria-hidden="true"></span>
        <span class="tl-week__date">${esc(dateLabel)}</span>
      </button>`;
    }).join('')}
  </div>`;
}

function exerciseListHTML(exercises) {
  if (!exercises?.length) return '';
  return `<div class="tl-exercises">
    ${exercises.map((exercise, index) => `<div class="tl-exercise">
      <span class="tl-exercise__num" aria-hidden="true">${index + 1}</span>
      <span class="tl-exercise__name">${esc(exercise.name)}</span>
      <span class="tl-exercise__target">${esc(exercise.sets)} × ${esc(exercise.reps)}</span>
      ${exercise.note ? `<span class="tl-exercise__note">${esc(exercise.note)}</span>` : ''}
    </div>`).join('')}
  </div>`;
}

function todayCardHTML(today, exercises, resumable) {
  const primary = today.primary;
  const secondary = today.secondary;
  const primaryAttrs = primary
    ? `data-action="${esc(primary.action)}"${primary.target ? ` data-target="${esc(primary.target)}"` : ''}${primary.day ? ` data-day="${esc(primary.day)}"` : ''}`
    : '';
  const showGuidance = today.state !== 'ready' || !exercises.length;

  return `<article class="tl-today tl-today--${esc(today.tone || 'quiet')}" data-train-state="${esc(today.state)}">
    <div class="tl-today__eyebrow">${esc(today.eyebrow || 'Today')}${resumable ? '<span class="tl-today__pip" aria-hidden="true"></span>' : ''}</div>
    <h2 class="tl-today__title">${esc(today.title || 'Today')}</h2>
    ${today.meta ? `<p class="tl-today__meta">${esc(today.meta)}</p>` : ''}
    ${exerciseListHTML(exercises)}
    ${showGuidance && today.guidance ? `<p class="tl-today__guidance">${esc(today.guidance)}</p>` : ''}
    ${primary ? `<button type="button" class="tl-today__primary" ${primaryAttrs}>${esc(primary.label)}</button>` : ''}
    ${secondary ? `<button type="button" class="tl-today__secondary" data-action="${esc(secondary.action)}"${secondary.target ? ` data-target="${esc(secondary.target)}"` : ''}${secondary.day ? ` data-day="${esc(secondary.day)}"` : ''}>${esc(secondary.label)}</button>` : ''}
  </article>`;
}

function quickStartHTML(actions) {
  if (!actions?.length) return '';
  return `<section class="tl-section" aria-labelledby="trainQuickStartTitle">
    <h3 id="trainQuickStartTitle" class="tl-section__title">Quick start</h3>
    <div class="tl-quick">
      ${actions.map((item) => `<button type="button" class="tl-quick__item" data-action="${esc(item.action)}" aria-label="${esc(item.hint)}">
        <span class="tl-quick__icon">${icon(item.icon, { size: 20 })}</span>
        <span class="tl-quick__label">${esc(item.label)}</span>
      </button>`).join('')}
    </div>
  </section>`;
}

function recentHTML(recent) {
  if (!recent?.length) return '';
  const row = recent[0];
  return `<section class="tl-section tl-recent-section" aria-labelledby="trainRecentTitle">
    <div class="tl-section__head">
      <h3 id="trainRecentTitle" class="tl-section__title">Recent</h3>
      <button type="button" class="tl-section__more" data-action="open-activities">History →</button>
    </div>
    <button type="button" class="tl-recent__row" data-action="open-activity-detail" data-activity-id="${esc(row.id)}">
      <span class="tl-recent__body">
        <span class="tl-recent__title">${esc(row.title)}</span>
        <span class="tl-recent__meta">${esc(row.dateLabel)}${row.subtitle ? ` · ${esc(row.subtitle)}` : ''}</span>
      </span>
      <span class="tl-recent__arrow" aria-hidden="true">›</span>
    </button>
  </section>`;
}

/**
 * @param {HTMLElement|null} container
 * @param {ReturnType<import('./train-landing.js').buildTrainLanding>} model
 */
export function renderTrainLanding(container, model) {
  if (!container || !model) return;
  container.innerHTML = `
    <div class="tl-head">
      <h1 class="tl-title">Train</h1>
    </div>
    ${weekRailHTML(model.week)}
    ${todayCardHTML(model.today, model.exercises, model.resumable)}
    ${quickStartHTML(model.quickStart)}
    ${recentHTML(model.recent)}`;
}
