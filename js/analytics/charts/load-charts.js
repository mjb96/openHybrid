// @ts-check
// ==========================================
// LOAD CHARTS — analytics/charts/load-charts.js
// ==========================================
import { uid, bezierPath, linearGradientV, gridLines, xAxisLabels, areaFill, dotSeries, refLine, shadedBand, trendLinePath, rollingAvgPath } from './chart-primitives.js';

// TSB (Training Stress Balance) trend chart: ATL in amber, CTL in blue, TSB in white.
export function renderTSBTrendChart(container, weekLabels, atlSeries, ctlSeries, tsbSeries) {
  if (!container) return;
  const valid = atlSeries.some(v => v > 0) || ctlSeries.some(v => v > 0);
  if (!valid || weekLabels.length < 2) {
    container.innerHTML = '<p style="color:color-mix(in srgb, var(--text) 50%, transparent);font-size:0.85rem;padding:8px 0;">Log sessions with RPE and duration to unlock load balance.</p>';
    return;
  }

  const W = 400, H = 200, PL = 46, PR = 15, PT = 20, PB = 30;
  const chartW = W - PL - PR, chartH = H - PB - PT;
  const n = weekLabels.length;

  const allVals = [...atlSeries, ...ctlSeries, ...tsbSeries].filter(v => isFinite(v) && v !== null);
  const minV = Math.min(...allVals, 0) - 5;
  const maxV = Math.max(...allVals, 1) * 1.08;
  const range = Math.max(maxV - minV, 1);

  const toX = i => PL + (i / (n - 1)) * chartW;
  const toY = v => PT + chartH - ((v - minV) / range) * chartH;

  // Zero line
  const zeroY   = toY(0);
  const zeroLine = `<line x1="${PL}" y1="${zeroY.toFixed(1)}" x2="${W - PR}" y2="${zeroY.toFixed(1)}" stroke="color-mix(in srgb, var(--text) 20%, transparent)" stroke-width="1" stroke-dasharray="3,3"/>`;

  // Safe zone band (ACWR 0.8–1.3 of CTL)
  let bandSvg = '';
  const safePts1 = [], safePts2 = [];
  for (let i = 0; i < n; i++) {
    if (ctlSeries[i] > 0) {
      safePts1.push(`${toX(i).toFixed(1)},${toY(ctlSeries[i] * 0.8).toFixed(1)}`);
      safePts2.push(`${toX(i).toFixed(1)},${toY(ctlSeries[i] * 1.3).toFixed(1)}`);
    }
  }
  if (safePts1.length > 0) {
    const poly = safePts1.join(' ') + ' ' + [...safePts2].reverse().join(' ');
    bandSvg = `<polygon points="${poly}" fill="var(--success)" opacity="0.07"/>`;
  }

  // CTL line
  const ctlPts = ctlSeries.map((v, i) => v > 0 ? [toX(i), toY(v)] : null).filter(Boolean);
  const ctlLine = ctlPts.length >= 2
    ? `<path d="${bezierPath(ctlPts)}" fill="none" stroke="var(--data-1)" stroke-width="2" stroke-dasharray="6,3" stroke-linecap="round"/>`
    : '';

  // ATL line + fill
  const atlPts = atlSeries.map((v, i) => v > 0 ? [toX(i), toY(v)] : null).filter(Boolean);
  const atlGId  = uid();
  const defs    = `<defs>${linearGradientV(atlGId, 'var(--warning)', 0.18, 'var(--warning)', 0)}</defs>`;
  const atlSmooth = atlPts.length >= 2 ? bezierPath(atlPts) : '';
  const atlArea   = atlSmooth ? areaFill(atlSmooth, atlPts, PT + chartH, atlGId) : '';
  const atlLine   = atlSmooth ? `<path d="${atlSmooth}" fill="none" stroke="var(--warning)" stroke-width="2.5" stroke-linecap="round"/>` : '';

  // ATL dots coloured by ACWR zone
  let atlDots = '';
  atlPts.forEach(([cx, cy], idx) => {
    const i    = atlSeries.findIndex((v, ii) => v > 0 && atlPts.slice(0, idx + 1).length === idx + 1);
    const ctl  = ctlSeries[atlPts.length > 0 ? idx : 0] || 0;
    const acwr = ctl > 0 ? atlSeries[idx] / ctl : 0;
    const c    = acwr === 0 ? 'var(--text-2)' : acwr <= 0.8 ? 'var(--success)' : acwr <= 1.3 ? 'var(--warning)' : 'var(--danger)';
    atlDots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${c}" stroke="var(--surface-1)" stroke-width="1.5"/>`;
  });

  // TSB line (white, thin)
  const tsbPts  = tsbSeries.map((v, i) => (v !== null && isFinite(v)) ? [toX(i), toY(v)] : null).filter(Boolean);
  const tsbLine = tsbPts.length >= 2
    ? `<path d="${bezierPath(tsbPts)}" fill="none" stroke="color-mix(in srgb, var(--text) 55%, transparent)" stroke-width="1.5" stroke-linecap="round"/>`
    : '';

  const ticks = [0.25, 0.5, 0.75, 1].map(p => minV + p * range);
  const grid  = gridLines(ticks, toY, PL, W, PR, v => Math.round(v));
  const step  = n > 8 ? 2 : 1;
  const xLbl  = xAxisLabels(weekLabels, toX, H - 5, { step });

  const legend = `<text x="${PL}" y="12" font-size="9" fill="var(--warning)">▬ ATL (7d)</text>
    <text x="${PL + 62}" y="12" font-size="9" fill="var(--data-1)">- - CTL (28d)</text>
    <text x="${PL + 130}" y="12" font-size="9" fill="color-mix(in srgb, var(--text) 55%, transparent)">— TSB (Form)</text>
    <text x="${PL + 210}" y="12" font-size="9" fill="var(--success)">■ Safe zone</text>`;

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">${defs}${grid}${bandSvg}${zeroLine}${ctlLine}${atlArea}${atlLine}${tsbLine}${atlDots}${xLbl}${legend}</svg>`;
}

// Load Ratio (ACWR) trend chart with safe-zone shading and status dots.
export function renderLoadRatioChart(container, weekLabels, ratioSeries) {
  if (!container) return;
  const valid = ratioSeries.filter(v => v !== null && v > 0);
  if (valid.length < 2) {
    container.innerHTML = '<p style="color:color-mix(in srgb, var(--text) 50%, transparent);font-size:0.85rem;padding:8px 0;">Insufficient load data — log RPE on sessions.</p>';
    return;
  }

  const W = 400, H = 150, PL = 42, PR = 15, PT = 18, PB = 28;
  const chartW = W - PL - PR, chartH = H - PB - PT;
  const n = weekLabels.length;

  const minR = 0, maxR = Math.max(...valid, 1.6) * 1.05;
  const toX  = i => PL + (i / (n - 1)) * chartW;
  const toY  = v => PT + chartH - ((v - minR) / (maxR - minR)) * chartH;

  // Safe zone band 0.8–1.3
  const bandSvg = shadedBand(toY(1.3), toY(0.8), PL, W, PR, 'var(--success)', 0.12);
  const line08  = refLine(toY(0.8), PL, W, PR, '0.8', 'var(--success)', true);
  const line13  = refLine(toY(1.3), PL, W, PR, '1.3', 'var(--warning)', true);

  // Line + dots
  const pts     = ratioSeries.map((v, i) => (v !== null && v > 0) ? [toX(i), toY(v)] : null).filter(Boolean);
  const smooth  = pts.length >= 2 ? bezierPath(pts) : '';
  const line    = smooth ? `<path d="${smooth}" fill="none" stroke="var(--text-2)" stroke-width="2.5" stroke-linecap="round"/>` : '';

  let dots = '';
  pts.forEach(([cx, cy]) => {
    const v = ratioSeries[Math.round((cx - PL) / (chartW / (n - 1)))];
    const c = v === null ? 'var(--text-2)' : v < 0.8 ? 'var(--success)' : v < 1.3 ? 'var(--warning)' : 'var(--danger)';
    dots += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" fill="${c}" stroke="var(--surface-1)" stroke-width="1.5"/>`;
  });

  const ticks = [0.5, 1.0, 1.5].filter(v => v <= maxR);
  const grid  = gridLines(ticks, toY, PL, W, PR, v => v.toFixed(1));
  const step  = n > 8 ? 2 : 1;
  const xLbl  = xAxisLabels(weekLabels, toX, H - 5, { step });

  const legend = `<text x="${PL}" y="11" font-size="9" fill="color-mix(in srgb, var(--text) 60%, transparent)">ATL/CTL Ratio (ACWR) — optimal: 0.8–1.3</text>`;

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">${grid}${bandSvg}${line08}${line13}${line}${dots}${xLbl}${legend}</svg>`;
}

// Training Stress Trend: 4-week rolling sRPE load with coloured zones.
export function renderTrainingStressChart(container, weekLabels, stressTrend, rawTotal) {
  if (!container) return;
  const hasData = stressTrend.some(v => v > 0);
  if (!hasData) {
    container.innerHTML = '<p style="color:color-mix(in srgb, var(--text) 50%, transparent);font-size:0.85rem;padding:8px 0;">Log RPE on all sessions to see stress trend.</p>';
    return;
  }

  const W = 400, H = 160, PL = 46, PR = 15, PT = 18, PB = 28;
  const chartW = W - PL - PR, chartH = H - PB - PT;
  const n     = weekLabels.length;
  const maxV  = Math.max(...stressTrend, 1);
  const barW  = Math.max(6, Math.floor(chartW / n) - 5);

  const centreX = i => PL + (i / n) * chartW + chartW / n / 2;
  const toY     = v => PT + chartH - (v / maxV) * chartH;

  const gId = uid();
  const defs = `<defs>${linearGradientV(gId, 'var(--data-5)', 0.9, 'var(--accent)', 0.5)}</defs>`;

  let bars = '';
  rawTotal.forEach((v, i) => {
    if (v <= 0) return;
    const x  = centreX(i) - barW / 2;
    const bh = Math.max(3, (v / maxV) * chartH);
    const y  = PT + chartH - bh;
    bars += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW}" height="${bh.toFixed(1)}" fill="url(#${gId})" rx="3" opacity="0.6"/>`;
  });

  const trendPts = stressTrend.map((v, i) => v > 0 ? [centreX(i), toY(v)] : null).filter(Boolean);
  const smooth   = trendPts.length >= 2 ? bezierPath(trendPts) : '';
  const tLine    = smooth ? `<path d="${smooth}" fill="none" stroke="var(--data-5)" stroke-width="2.5" stroke-linecap="round"/>` : '';
  const tDots    = dotSeries(trendPts, 'var(--data-5)', 4);

  const ticks = [0.25, 0.5, 0.75, 1].map(p => maxV * p);
  const grid  = gridLines(ticks, toY, PL, W, PR, v => Math.round(v));
  const step  = n > 8 ? 2 : 1;
  const xLbl  = xAxisLabels(weekLabels, centreX, H - 5, { step });

  const legend = `<text x="${PL}" y="11" font-size="9" fill="var(--data-5)">4-week Rolling Training Stress (sRPE)</text>`;

  container.innerHTML = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">${defs}${grid}${bars}${tLine}${tDots}${xLbl}${legend}</svg>`;
}
