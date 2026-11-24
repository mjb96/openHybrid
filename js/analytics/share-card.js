// @ts-check
// =============================================================================
// PROGRESS SHARE CARD (js/analytics/share-card.js)
//
// One canvas summary of the visible bands, drawn from the SAME models the bands
// render, so a shared image can never disagree with the screen it came from.
//
// Deliberately a summary rather than eight chart renderers: `shareImageCanvas`
// takes a finished canvas, and re-drawing each chart for an image would be a
// second implementation of every band. The card states each band's headline.
// =============================================================================
import { shareImageCanvas } from '../brain/pr-share.js';
import { formatVolume, weightUnitOf } from './utils.js';

const W = 1080;
const H = 1350; // portrait 4:5, the shape social feeds crop least

const LABEL = {
  pulse: 'This week', balance: 'Training mix', muscles: 'Muscle volume',
  exercises: 'Main exercises', endurance: 'Endurance', body: 'Body', fasting: 'Fasting',
};

/**
 * @param {{ bandId?: string, label?: string, value: string, note?: string }[]} rows
 * @param {{ title?: string, subtitle?: string, now?: Date, unit?: string }} [options]
 * @returns {HTMLCanvasElement}
 */
export function drawProgressCard(rows, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.fillStyle = '#020408';
  ctx.fillRect(0, 0, W, H);

  const items = (rows || []).filter((row) => row && row.value).slice(0, 7);

  ctx.fillStyle = '#22d3ee';
  ctx.font = '800 26px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('OPENHYBRID · PROGRESS', 64, 110);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 76px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(options.title || 'Your training', 64, 200);

  if (options.subtitle) {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 30px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(options.subtitle, 64, 250);
  }

  let y = 350;
  for (const row of items) {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(64, y - 46, W - 128, 132);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '800 24px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(String(row.label || LABEL[row.bandId] || row.bandId || '').toUpperCase(), 96, y - 6);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '800 48px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(String(row.value), 96, y + 50);

    if (row.note) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 24px "Plus Jakarta Sans", system-ui, sans-serif';
      const width = ctx.measureText(String(row.note)).width;
      ctx.fillText(String(row.note), W - 96 - width, y + 50);
    }
    y += 148;
  }

  ctx.fillStyle = '#475569';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('Logged locally · no account, no sync', 64, H - 60);

  return canvas;
}

/**
 * @param {Array<{ bandId: string, value: string, note?: string }>} rows
 * @param {{ title?: string, subtitle?: string, toast?: (message: string) => void }} [options]
 */
export function shareProgressCard(rows, options = {}) {
  const canvas = drawProgressCard(rows, options);
  return shareImageCanvas(canvas, {
    filename: 'openhybrid-progress.png',
    title: options.title || 'My training progress',
    caption: options.subtitle || '',
    toast: options.toast || (() => {}),
    savedMessage: 'Progress card saved',
  });
}

const KM_TO_MI = 0.621371;
const round1 = (value) => Math.round(value * 10) / 10;

/** Distance in the athlete's unit, one decimal — the same reading as the views. */
function shareDistance(distanceKm, unit) {
  return unit === 'mi'
    ? `${round1((Number(distanceKm) || 0) * KM_TO_MI)} mi`
    : `${round1(Number(distanceKm) || 0)} km`;
}

/**
 * Rows for the Training Report card. Every value is a figure the report screen
 * already shows; the card is a summary, not a second calculation.
 * @param {any} report
 * @param {any} state
 */
export function monthlyReportShareRows(report, state) {
  const unit = weightUnitOf(state);
  const distUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
  const scoreNote = report.hybridScore.delta == null
    ? ''
    : `${report.hybridScore.delta > 0 ? '+' : ''}${report.hybridScore.delta} vs ${report.window.comparisonLabel || 'prior window'}`;
  return [
    { label: 'Sessions', value: String(report.totals.sessions), note: `${report.totals.activeDays} active day${report.totals.activeDays === 1 ? '' : 's'}` },
    { label: 'Lifted', value: formatVolume(report.totals.volume, unit), note: report.window.label },
    { label: 'Run', value: shareDistance(report.totals.distanceKm, distUnit), note: report.window.comparisonLabel ? `vs ${report.window.comparisonLabel}` : '' },
    { label: 'Avg score', value: report.hybridScore.avg == null ? '—' : String(report.hybridScore.avg), note: scoreNote },
    { label: 'Fitness', value: `CTL ${report.fitness.ctl}`, note: report.fitness.trend },
    { label: 'Adherence', value: `${report.consistency}%`, note: 'average plan adherence' },
  ];
}

/**
 * Rows for the Year in Review card. Sessions, volume, distance, sets and PRs are
 * the same annual totals the view prints; the best month is the same model row.
 * @param {any} review
 * @param {any} state
 */
export function yearReviewShareRows(review, state) {
  const unit = weightUnitOf(state);
  const distUnit = state?.settings?.distanceUnit === 'mi' ? 'mi' : 'km';
  const best = review.bestMonth;
  return [
    { label: 'Sessions', value: String(review.totals.sessions), note: review.rangeLabel },
    { label: 'Lifted', value: formatVolume(review.totals.volumeKg, unit), note: `${review.totals.activeDays} active day${review.totals.activeDays === 1 ? '' : 's'}` },
    { label: 'Run', value: shareDistance(review.totals.distanceKm, distUnit), note: `longest run ${review.totals.longestStreak} day${review.totals.longestStreak === 1 ? '' : 's'}` },
    { label: 'Working sets', value: String(review.totals.workingSets), note: `${review.totals.activeMonths} active month${review.totals.activeMonths === 1 ? '' : 's'}` },
    { label: 'e1RM PRs', value: String(review.totals.prCount), note: 'est. 1RM records' },
    { label: 'Most trained', value: best ? best.label : '—', note: best ? `${best.sessions} session${best.sessions === 1 ? '' : 's'} · ${formatVolume(best.volumeKg, unit)}` : '' },
  ];
}

/**
 * The one image-share entry point for report-style cards. It uses the same
 * canvas and `shareImageCanvas` path as Progress and PR cards.
 * @param {Array<{ label: string, value: string, note?: string }>} rows
 * @param {{ title?: string, subtitle?: string, filename?: string, caption?: string,
 *   toast?: (message: string) => void, savedMessage?: string }} [options]
 */
export function shareSummaryCard(rows, options = {}) {
  const canvas = drawProgressCard(rows, { title: options.title, subtitle: options.subtitle });
  return shareImageCanvas(canvas, {
    filename: options.filename || 'openhybrid-summary.png',
    title: options.title || 'Training summary',
    caption: options.caption || options.subtitle || '',
    toast: options.toast || (() => {}),
    savedMessage: options.savedMessage || 'Card saved',
  });
}
