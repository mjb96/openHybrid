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

const W = 1080;
const H = 1350; // portrait 4:5, the shape social feeds crop least

const LABEL = {
  pulse: 'This week', balance: 'Training mix', muscles: 'Muscle volume',
  exercises: 'Main exercises', endurance: 'Endurance', body: 'Body', fasting: 'Fasting',
};

/**
 * @param {{ bandId: string, value: string, note?: string }[]} rows
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
    ctx.fillText(String(LABEL[row.bandId] || row.bandId).toUpperCase(), 96, y - 6);

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
