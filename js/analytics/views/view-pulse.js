// @ts-check
// =============================================================================
// PULSE BAND (js/analytics/views/view-pulse.js)
//
// "Am I showing up, in both?" — presentation only. Every number comes from
// buildPulseModel; this file formats and never computes.
//
// The body map is the existing session heat map (same paths, same buckets as
// Home's day recap), so the two can never disagree about what "trained" looks
// like.
// =============================================================================
import { band, dataTableDisclosure, stateBlock } from './band-kit.js';
import { esc } from './screen-kit.js';
import { muscleHeatmapHTML } from '../../home/body-heatmap.js';
import { formatDayMonthShort } from '../../dates.js';
import { formatVolume } from '../utils.js';
// The one distance formatter: storage stays km, display follows the athlete's
// unit. Hand-formatting here printed kilometres labelled as miles.
import { formatRunDistance } from '../../workout/run-units.js';

const DAY_INITIAL = { mon: 'M', tue: 'T', wed: 'W', thu: 'T', fri: 'F', sat: 'S', sun: 'S' };

/**
 * @param {import('../pulse.js').PulseDay[]} days
 */
function railHTML(days, distanceUnit) {
  const cells = days.map((day) => {
    const classes = ['pg-day'];
    if (day.sessions > 0) classes.push('is-trained');
    if (day.isRest) classes.push('is-rest');
    if (day.isFuture) classes.push('is-future');
    if (day.isToday) classes.push('is-today');

    const detail = day.isFuture
      ? 'upcoming'
      : day.sessions === 0
        ? 'no training'
        : `${day.sessions} session${day.sessions === 1 ? '' : 's'}`;
    const pieces = [detail];
    if (day.workingSets > 0) pieces.push(`${day.workingSets} sets`);
    if (day.runKm > 0) pieces.push(`${formatRunDistance(day.runKm, distanceUnit)} run`);
    if (day.walkKm > 0) pieces.push(`${formatRunDistance(day.walkKm, distanceUnit)} walk`);

    return `<li class="${classes.join(' ')}">
      <span class="pg-day__mark" aria-hidden="true"></span>
      <span class="pg-day__label" aria-hidden="true">${esc(DAY_INITIAL[day.day] || '')}</span>
      <span class="sr-only">${esc(`${formatDayMonthShort(day.dateISO)}: ${pieces.join(', ')}`)}</span>
    </li>`;
  }).join('');

  return `<ul class="pg-rail" aria-label="Training this week">${cells}</ul>`;
}

/**
 * @param {ReturnType<import('../pulse.js').buildPulseModel>} model
 */
function tableRows(model, unit) {
  return model.week.days.map((day) => [
    formatDayMonthShort(day.dateISO),
    day.isFuture ? '—' : String(day.sessions),
    String(day.workingSets),
    day.runKm ? formatRunDistance(day.runKm, unit) : '—',
    day.walkKm ? formatRunDistance(day.walkKm, unit) : '—',
  ]);
}

/**
 * @param {ReturnType<import('../pulse.js').buildPulseModel>|null} model
 * @param {{ unit?: string, weightUnit?: string, distanceUnit?: string, error?: string|null }} [options]
 */
export function renderPulse(model, options = {}) {
  const weightUnit = options.weightUnit || options.unit || 'kg';
  const distanceUnit = options.distanceUnit || 'km';

  if (options.error) {
    return band({
      id: 'pulse',
      eyebrow: 'Pulse',
      title: 'Pulse',
      body: stateBlock('error', {
        message: 'We could not calculate this week.',
        detail: options.error,
        retry: { label: 'Try again' },
      }),
    });
  }

  if (!model) {
    return band({
      id: 'pulse',
      eyebrow: 'Pulse',
      title: 'Pulse',
      body: stateBlock('loading', { height: 190 }),
    });
  }

  if (!model.hasData) {
    return band({
      id: 'pulse',
      eyebrow: 'Pulse',
      title: 'Pulse',
      sub: model.spanLabel,
      body: stateBlock('empty', {
        message: 'No training logged this week yet. One session starts the comparison.',
        action: { label: 'Start a workout', action: 'switch-tab', target: 'workout' },
      }),
    });
  }

  const value = String(model.sessions);
  const unit = model.sessionsPlanned ? `of ${model.sessionsPlanned}` : 'sessions';

  const streak = model.streakWeeks > 0
    ? `${model.streakWeeks}-week streak${model.streakAtRisk ? ' (not trained yet this week)' : ''}`
    : 'No streak yet';
  const adherence = model.adherencePct != null ? ` · ${model.adherencePct}% of planned` : '';

  const volume = model.week.days.reduce((total, day) => total + day.volumeKg, 0);
  const distance = model.week.days.reduce((total, day) => total + day.runKm, 0);
  const walk = model.week.days.reduce((total, day) => total + day.walkKm, 0);

  const summary = [
    `${streak}${adherence}`,
    volume > 0 ? `${formatVolume(volume, weightUnit)} lifted` : '',
    distance > 0 ? `${formatRunDistance(distance, distanceUnit)} run` : '',
    walk > 0 ? `${formatRunDistance(walk, distanceUnit)} walked` : '',
  ].filter(Boolean).join(' · ');

  const body = `
    ${railHTML(model.week.days, distanceUnit)}
    ${model.muscles?.hasData ? muscleHeatmapHTML(model.muscles, { label: 'Muscles trained this week' }) : ''}
    <p class="pg-pulse__summary">${esc(summary)}</p>
    <p class="pg-pulse__delta pg-pulse__delta--${esc(model.delta.tone)}">${esc(model.delta.text)}</p>
    ${dataTableDisclosure(
      ['Day', 'Sessions', 'Sets', `Run (${distanceUnit})`, `Walk (${distanceUnit})`],
      tableRows(model, distanceUnit),
      `Training in the week of ${model.spanLabel}`,
    )}`;

  return band({
    id: 'pulse',
    eyebrow: 'Pulse',
    title: 'Pulse',
    value,
    valueUnit: unit,
    sub: model.spanLabel,
    ariaLabel: `${model.spanLabel} overview`,
    chip: model.isPartial ? 'Week in progress' : '',
    actions: [{ label: 'History →', action: 'open-activities' }],
    body,
  });
}
