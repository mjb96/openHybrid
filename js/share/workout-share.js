// @ts-check
// =============================================================================
// WORKOUT SHARE CARD (js/share/workout-share.js)
//
// Hevy lets an athlete share the session, not only a PR. The card is built from
// the SAME `buildSessionRecap` model the recap screen and History detail render,
// so the image cannot claim a volume, set count or PR the app does not show.
//
// `buildWorkoutShareSummary` and `workoutShareCaption` are pure; the canvas and
// share/download path are best-effort and reuse `shareImageCanvas`.
// =============================================================================
import { shareImageCanvas } from '../brain/pr-share.js';
import { formatRunDistance, formatRunPace } from '../workout/run-units.js';
import { fromCanonicalWeight } from '../metrics/weight-unit.js';

/** @param {number} seconds */
function clock(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** One line for a lift's best set, respecting its shape. */
function liftDetail(lift, unit) {
  if (lift?.shape === 'time' && lift.topShape) return clock(lift.topShape.value);
  if (lift?.shape === 'distance' && lift.topShape) return `${Math.round(lift.topShape.value)} m`;
  const top = lift?.topSet;
  if (top && top.r > 0) {
    // The recap carries canonical kilograms; the card shows the athlete's unit.
    const weight = fromCanonicalWeight(Number(top.w) || 0, unit) || 0;
    const load = weight > 0 ? `${Math.round(weight * 10) / 10} ${unit} × ` : '';
    return `${load}${top.r}`;
  }
  return `${lift?.sets || 0} sets`;
}

/**
 * Everything the share card draws, derived from a session recap. Returns null
 * for an empty session — there is nothing honest to share.
 * @param {any} recap
 * @param {{ title?: string }} [options]
 */
export function buildWorkoutShareSummary(recap, { title } = {}) {
  if (!recap || recap.empty) return null;
  const unit = recap.weightUnit === 'lbs' ? 'lb' : 'kg';
  const kinds = [];
  if ((recap.types || []).includes('gym')) kinds.push('Strength');
  if ((recap.types || []).includes('run')) kinds.push('Run');
  if ((recap.types || []).includes('walk')) kinds.push('Walk');
  const kindLabel = kinds.join(' + ') || 'Session';

  /** @type {Array<{ label: string, value: string }>} */
  const stats = [];
  if (recap.tonnage > 0) {
    const tonnage = Math.round(fromCanonicalWeight(Number(recap.tonnage) || 0, unit) || 0);
    stats.push({ label: 'Volume', value: `${tonnage.toLocaleString('en-US')} ${unit}` });
  }
  if (recap.workingSets > 0) stats.push({ label: 'Sets', value: String(recap.workingSets) });
  if (recap.duration) stats.push({ label: 'Time', value: String(recap.duration) });
  if (recap.run) {
    if (recap.run.distKm > 0) stats.push({ label: 'Distance', value: formatRunDistance(recap.run.distKm, recap.distanceUnit) });
    if (recap.run.pace) stats.push({ label: 'Pace', value: formatRunPace(recap.run.pace, recap.distanceUnit) });
  }

  const highlights = (recap.lifts || []).slice(0, 3).map((lift) => ({
    name: lift.name,
    detail: liftDetail(lift, unit),
  }));
  const prNames = (recap.lifts || []).filter((lift) => lift.pr).map((lift) => lift.name);

  const summary = {
    title: String(title || 'Workout'),
    dateISO: recap.dateISO || null,
    kindLabel,
    stats,
    highlights,
    prNames,
    caption: '',
  };
  summary.caption = workoutShareCaption(summary);
  return summary;
}

/** Pure: the caption that travels with the image. */
export function workoutShareCaption(summary) {
  if (!summary) return '';
  const parts = summary.stats.slice(0, 3).map((stat) => `${stat.value} ${stat.label.toLowerCase()}`);
  const prs = summary.prNames.length
    ? ` ${summary.prNames.length} PR${summary.prNames.length === 1 ? '' : 's'} (${summary.prNames.slice(0, 2).join(', ')}).`
    : '';
  return `${summary.title} — ${parts.join(' · ')}.${prs} #openHybrid`;
}

/** @param {CanvasRenderingContext2D} ctx @param {string} text @param {number} maxWidth */
function wrapLines(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

/** @param {string|null} iso */
function dateLabel(iso) {
  if (!iso) return '';
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function drawWorkoutCard(ctx, W, H, summary) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0b1220');
  g.addColorStop(1, '#101a2b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#22d3ee';
  ctx.font = '700 38px system-ui, sans-serif';
  ctx.fillText('SESSION COMPLETE', 96, 150);

  ctx.fillStyle = '#e7ecf3';
  ctx.font = '800 72px system-ui, sans-serif';
  const titleLines = wrapLines(ctx, summary.title, W - 192);
  titleLines.forEach((line, index) => ctx.fillText(line, 96, 260 + index * 84));

  const metaY = 260 + titleLines.length * 84 + 18;
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 38px system-ui, sans-serif';
  ctx.fillText([summary.kindLabel, dateLabel(summary.dateISO)].filter(Boolean).join(' · '), 96, metaY);

  // Stats — up to four, two per row.
  let y = metaY + 110;
  summary.stats.slice(0, 4).forEach((stat, index) => {
    const x = index % 2 === 0 ? 96 : 576;
    if (index === 2) y += 150;
    ctx.fillStyle = '#e7ecf3';
    ctx.font = '800 62px system-ui, sans-serif';
    ctx.fillText(String(stat.value), x, y);
    ctx.fillStyle = '#7c8ba1';
    ctx.font = '600 30px system-ui, sans-serif';
    ctx.fillText(stat.label.toUpperCase(), x, y + 40);
  });

  let listY = Math.max(y + 170, 760);
  if (summary.highlights.length) {
    ctx.fillStyle = '#22d3ee';
    ctx.font = '700 30px system-ui, sans-serif';
    ctx.fillText('TOP LIFTS', 96, listY);
    listY += 52;
    for (const lift of summary.highlights) {
      ctx.fillStyle = '#e7ecf3';
      ctx.font = '700 42px system-ui, sans-serif';
      ctx.fillText(String(lift.name).slice(0, 34), 96, listY);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 38px system-ui, sans-serif';
      ctx.fillText(lift.detail, W - 96, listY);
      ctx.textAlign = 'left';
      listY += 72;
    }
  }

  if (summary.prNames.length) {
    ctx.fillStyle = '#fbbf24';
    ctx.font = '700 38px system-ui, sans-serif';
    const names = summary.prNames.slice(0, 2).join(', ');
    const suffix = summary.prNames.length > 2 ? ` +${summary.prNames.length - 2}` : '';
    ctx.fillText(`🏆 ${summary.prNames.length} PR${summary.prNames.length === 1 ? '' : 's'} · ${names}${suffix}`, 96, H - 220);
  }

  ctx.fillStyle = '#6b7688';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.fillText('OPENHYBRID', 96, H - 110);
}

/**
 * Draw and share a finished session. `recap` is the same model the recap screen
 * renders, so the card cannot disagree with the app.
 * @param {any} recap
 * @param {{ title?: string, showToast?: Function }} [options]
 */
export function shareWorkoutCard(recap, { title, showToast } = {}) {
  const toast = showToast || (() => {});
  const summary = buildWorkoutShareSummary(recap, { title });
  if (!summary) { toast('Nothing to share from this session'); return; }
  if (typeof document === 'undefined') return;

  const canvas = document.createElement('canvas');
  const W = 1080, H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) { toast('Sharing not supported on this device'); return; }

  try { drawWorkoutCard(ctx, W, H, summary); }
  catch (_) { toast('Could not create the card'); return; }

  shareImageCanvas(canvas, {
    filename: 'openhybrid-workout.png',
    caption: summary.caption,
    title: summary.title,
    toast,
    savedMessage: 'Workout card saved',
  });
}
