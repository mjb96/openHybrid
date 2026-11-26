// @ts-check
// ==========================================
// MUSCLE LOAD VIEW (analytics/views/view-muscle-load.js)
// ==========================================
import { buildMuscleLoadModel } from '../muscle-load.js';
import { buildMuscleModel } from '../muscles.js';
import { muscleHeatmapHTML } from '../../home/body-heatmap.js';
import { resolveRange } from '../ranges.js';
import { localDayKey } from '../../dates.js';
import { esc } from './screen-kit.js';

const RECOVERY_LABEL = {
  recovering: 'Recovering',
  ready: 'Ready',
  fresh: 'Fresh',
  untrained: 'No recent work',
};

/** @param {number|null} days */
function trainedText(days) {
  if (days == null) return 'No recent work';
  if (days === 0) return 'Trained today';
  if (days === 1) return 'Trained yesterday';
  return `${days} days ago`;
}

/** @param {any} state @param {{rangeId?:string}} [options] */
export function renderMuscleLoad(state, options = {}) {
  const model = buildMuscleLoadModel(state);

  // PG9: the period's body map lives here now, labelled with its own range so
  // it cannot be mistaken for the weekly recovery list below.
  const mapHost = document.getElementById('muscleLoadMap');
  if (mapHost) {
    const hidden = Array.isArray(state?.settings?.ui?.progress?.hidden) ? state.settings.ui.progress.hidden : [];
    const range = resolveRange(options.rangeId || '30d', localDayKey(new Date()));
    let volume = null;
    try { volume = range ? buildMuscleModel(state, { range }) : null; } catch { volume = null; }
    mapHost.innerHTML = (!hidden.includes('musclesBody') && volume?.bodyMap?.hasData)
      ? `<p class="pg-band__sub">${esc(range.spanLabel)} · shaded by credited sets</p>${muscleHeatmapHTML(volume.bodyMap, { label: 'Muscles trained in this period' })}`
      : '';
  }
  const summary = document.getElementById('muscleLoadSummary');
  const host = document.getElementById('muscleLoadList');
  if (!summary || !host) return;

  summary.textContent = '';
  const summaryCard = document.createElement('div');
  summaryCard.className = 'muscle-load-summary';
  // With no focus muscles chosen, "0 of 0 focus muscles in range" is not a
  // useful headline. Show the recovery picture instead; the range column still
  // explains that focus muscles can be set in Settings.
  const stats = model.summary.focusCount > 0
    ? [
      [`${model.summary.inRangeCount} of ${model.summary.focusCount}`, 'focus muscles in range'],
      [`${model.summary.recovering}`, 'recovering'],
      [`${model.summary.untrained}`, 'not trained yet'],
    ]
    : [
      [`${model.summary.recovering}`, 'recovering'],
      [`${model.summary.ready + model.summary.fresh}`, 'ready or fresh'],
      [`${model.summary.untrained}`, 'not trained yet'],
    ];
  for (const [value, label] of stats) {
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    item.append(strong, span);
    summaryCard.append(item);
  }
  summary.append(summaryCard);

  host.textContent = '';
  if (!model.muscles.length) {
    const empty = document.createElement('p');
    empty.className = 'bw-summary__note';
    empty.textContent = 'Log a strength session to see where this week’s work landed.';
    host.append(empty);
    return;
  }

  const order = { recovering: 0, ready: 1, fresh: 2, untrained: 3 };
  const toneOrder = { low: 0, high: 1, neutral: 2, ok: 3 };
  const byAction = (a, b) =>
    (order[a.recovery] - order[b.recovery])
    || (toneOrder[a.status.tone] - toneOrder[b.status.tone])
    || a.name.localeCompare(b.name);

  const focus = model.muscles.filter((row) => row.priority !== 'track').sort(byAction);
  const tracked = model.muscles.filter((row) => row.priority === 'track').sort(byAction);

  const addSection = (title, rows) => {
    if (!rows.length) return;
    const heading = document.createElement('div');
    heading.className = 'muscle-load-section-title';
    heading.textContent = title;
    host.append(heading);
    for (const row of rows) {
      const card = document.createElement('div');
      card.className = `muscle-load-row tone-${row.status.tone}`;

      const head = document.createElement('div');
      head.className = 'muscle-load-head';
      const name = document.createElement('strong');
      name.textContent = row.name;
      const recovery = document.createElement('span');
      recovery.className = `muscle-load-recovery recovery-${row.recovery}`;
      recovery.textContent = RECOVERY_LABEL[row.recovery];
      head.append(name, recovery);

      const detail = document.createElement('div');
      detail.className = 'muscle-load-detail';
      const volume = document.createElement('span');
      const reference = row.reference ? `${row.reference.min}–${row.reference.max}` : null;
      volume.textContent = reference
        ? `${row.logged.total.toFixed(1)} credits · ${reference} typical`
        : `${row.logged.total.toFixed(1)} credits`;
      const status = document.createElement('span');
      status.className = 'muscle-load-status';
      status.textContent = row.status.label;
      detail.append(volume, status);

      const meta = document.createElement('div');
      meta.className = 'muscle-load-meta';
      meta.textContent = trainedText(row.daysSince);

      card.append(head, detail, meta);
      host.append(card);
    }
  };

  addSection('Focus muscles', focus);
  addSection('Tracked only', tracked);
}
