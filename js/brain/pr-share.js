// @ts-check
// =============================================================================
// PR SHARE CARD (js/brain/pr-share.js)
//
// A shareable image for a new estimated-1RM personal record — Strava-grade
// shareability is free acquisition. Mirrors the Hybrid Score share flow
// (canvas → navigator.share → download fallback).
//
// prShareCaption is pure + tested; the draw/share touch canvas + navigator and
// are best-effort (device-verified).
// =============================================================================

/** Pure: the share caption for a PR. */
export function prShareCaption(pr, state) {
  const unit = state?.settings?.weightUnit || 'kg';
  const name = pr?.name || 'a lift';
  const e1 = pr?.e1rm != null ? `${pr.e1rm}${unit}` : 'a new best';
  return `New PR 🏆 ${name} — estimated 1RM ${e1}. Onto the next one. #openHybrid`;
}

/** Pick the biggest PR (highest e1RM) from a recap's lifts, or null. */
export function topPR(lifts) {
  // The share card draws an estimated 1RM, so only an e1RM record is shareable.
  // Hold/carry/rep records are real achievements but have no weight to draw; the
  // recap keeps their badges without offering a card that would invent a load.
  const prs = (lifts || []).filter(l => l && l.pr && l.e1rm > 0 && l.e1rmPr !== false);
  if (!prs.length) return null;
  return prs.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
}

export function drawPRCard(ctx, W, H, pr, state) {
  const unit = state?.settings?.weightUnit || 'kg';
  // Ground
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#160b24');
  g.addColorStop(1, '#0b0e13');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';

  // Eyebrow
  ctx.fillStyle = '#a78bfa';
  ctx.font = '700 44px system-ui, sans-serif';
  ctx.fillText('NEW PERSONAL RECORD', W / 2, 260);

  // Trophy
  ctx.font = '200px system-ui, sans-serif';
  ctx.fillText('🏆', W / 2, 520);

  // Exercise name
  ctx.fillStyle = '#e7ecf3';
  ctx.font = '800 76px system-ui, sans-serif';
  ctx.fillText(String(pr?.name || 'Lift'), W / 2, 700);

  // Value
  ctx.fillStyle = '#8b5cf6';
  ctx.font = '900 220px system-ui, sans-serif';
  ctx.fillText(String(pr?.e1rm ?? '—'), W / 2, 960);
  ctx.fillStyle = '#9aa7b8';
  ctx.font = '600 56px system-ui, sans-serif';
  ctx.fillText(`estimated 1RM · ${unit}`, W / 2, 1040);

  // Wordmark
  ctx.fillStyle = '#6b7688';
  ctx.font = '700 40px system-ui, sans-serif';
  ctx.fillText('OPENHYBRID', W / 2, 1280);
}

/**
 * Share (or download) an already-drawn canvas. The ONE place the
 * navigator.share → download fallback lives, so every card behaves the same.
 * @param {HTMLCanvasElement} canvas
 * @param {{ filename: string, caption?: string, title?: string, toast?: Function, savedMessage?: string }} opts
 */
export function shareImageCanvas(canvas, { filename, caption = '', title = '', toast = () => {}, savedMessage = 'Card saved' } = /** @type {any} */ ({})) {
  const fname = filename || 'openhybrid-card.png';
  const finish = (blob) => {
    const file = blob && typeof File !== 'undefined' ? new File([blob], fname, { type: 'image/png' }) : null;
    if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title, text: caption }).catch(() => {});
    } else {
      try {
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = fname;
        a.click();
        toast(savedMessage);
      } catch (_) { toast('Could not create the card'); }
    }
  };
  if (canvas.toBlob) canvas.toBlob(finish, 'image/png'); else finish(null);
}

/** @param {any} pr @param {any} state @param {{showToast?:Function}} [opts] */
export function sharePRCard(pr, state, { showToast } = {}) {
  const toast = showToast || (() => {});
  if (typeof document === 'undefined' || !pr) return;
  const canvas = document.createElement('canvas');
  const W = 1080, H = 1350;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) { toast('Sharing not supported on this device'); return; }

  try { drawPRCard(ctx, W, H, pr, state); }
  catch (_) { toast('Could not create the card'); return; }

  shareImageCanvas(canvas, {
    filename: 'openhybrid-pr.png',
    caption: prShareCaption(pr, state),
    title: 'New PR',
    toast,
    savedMessage: 'PR card saved',
  });
}
