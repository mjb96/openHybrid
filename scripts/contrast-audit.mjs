// =============================================================================
// CONTRAST AUDIT — measures rendered text against the backdrop actually painted
// behind it, in every shipped mode, and remembers the result so it can only
// get better.
//
// Why this exists next to `theme-visibility-browser-check.mjs`:
//   * that check enforces a 1.8:1 floor, so it catches INVISIBLE text and lets
//     every unreadable row through;
//   * it SKIPS any element under a gradient or image, which is most of the UI
//     (`.card-dark`, `.today-card`, `.an-chart`, the nav) — exactly where a
//     mid-tone on a card goes unreadable;
//   * it never opens the cockpit, History, a plan, a sheet or a modal.
//
// This one measures AA properly, composites alpha text, treats a gradient as a
// SET of candidate backdrops (worst wins), reads the real font size to choose
// 3:1 or 4.5:1, and can confirm a row against real pixels (`--pixels`).
//
// Usage
//   npm run contrast:audit                      # light + Midnight, 390px
//   npm run contrast:audit -- --pixels          # confirm against screenshots
//   npm run contrast:audit -- --core-modes   # light + Midnight only
//   npm run contrast:audit -- --width=320
//   npm run contrast:audit -- --md              # write docs/audit/contrast-findings.md
//   npm run contrast:audit -- --update          # re-record the ratchet baseline
//
// With a baseline present, only NEW or regressed rows fail. Rows that disappear
// are improvements; they stay in the baseline until `--update` prunes them.
// =============================================================================
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';
import { enterCockpit } from './cockpit-entry.mjs';
import {
  parseColor, composite, gradientStops, hasImageBackdrop, aaThreshold,
  worstContrast, worstContrastFromLuminances, severityFor, cssColor,
} from './lib/contrast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE_PATH = path.join(ROOT, 'docs/audit/contrast-baseline.json');
const FINDINGS_PATH = path.join(ROOT, 'docs/audit/contrast-findings.md');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const valueOf = (flag) => {
  const hit = args.find((a) => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : null;
};

const UPDATE = has('--update');
const WANT_MD = has('--md');
const PIXELS = has('--pixels');
// All five modes by default so the alternate palettes are covered on every
// run; `--core-modes` narrows to light + Midnight for a quick local loop.
const ALL_MODES = !has('--core-modes');
const WIDTH = Number(valueOf('--width')) || 390;
const ONLY_SCREENS = (valueOf('--screens') || '').split(',').map((s) => s.trim()).filter(Boolean);
const MAX_ROWS_REPORTED = Number(valueOf('--limit')) || 60;

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2',
};

// -----------------------------------------------------------------------------
// Fixture. Deliberately carries a finished session, an in-progress feel, a PR,
// archived imports and a bodyweight trend, because the unreadable rows are
// usually in the states an empty fixture never renders.
// -----------------------------------------------------------------------------
const STATE = {
  schemaVersion: 18, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  weekStartedAt: '2026-11-23', unitBasis: 'kg',
  settings: {
    name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    targetWeight: 76, rateGoal: -0.25, heightCm: 178, equipmentProfiles: [], showPlateHints: true,
    restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 },
  },
  weeks: {
    '1': {
      activationId: 'act', programId: 'hybrid_engine',
      dates: { mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25', thu: '2026-11-26' },
      lifts: {
        mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }, { c: true, w: '100', r: '5' }] },
        tue: { 'Back Squat': [{ c: true, w: '140', r: '5' }] },
        wed: { 'Back Squat': [{ c: true, w: '140', r: '5' }], 'Romanian Deadlift': [{ c: true, w: '100', r: '8', isPR: true }] },
        thu: {
          'Overhead Press': [{ c: true, w: '60', r: '5', isPR: true }, { c: true, w: '60', r: '5' }],
          'Pull Up': [{ c: true, w: '0', r: '8' }, { c: true, w: '0', r: '7' }],
        },
      },
      gymStats: { mon: { time: '55' }, tue: { time: '45' }, wed: { time: '62' } },
      runSessions: {},
      sessionStatus: { mon: 'finished', tue: 'finished', wed: 'finished', thu: 'finished' },
    },
  },
  bodyWeightLog: [
    { date: '2026-09-01', weight: 82 }, { date: '2026-10-01', weight: 80.4 },
    { date: '2026-11-02', weight: 79.1 }, { date: '2026-11-23', weight: 78.4 },
  ],
  bodyMeasurements: [{ date: '2026-11-23', waist: 82, chest: 101, bodyFat: 18.4 }],
  progressPhotos: [],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
  lastBackupAt: '2026-11-20T09:00:00.000Z',
};

// -----------------------------------------------------------------------------
// Screens. `core` runs in every audit; `extended` needs --full.
// -----------------------------------------------------------------------------
/** Filled once the fixture server is listening (screens are declared first). */
const baseUrlRef = { value: '' };

/**
 * Nav clicks go through `evaluate`, not `page.click`: once the cockpit is open
 * the bottom bar is hidden, and Playwright's actionability check turns that into
 * a 30s timeout for every later screen.
 */
async function openHome(page) {
  await page.goto(baseUrlRef.value, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#view-home.active', { timeout: 15000 });
  await page.waitForTimeout(220);
}

const navTo = async (page, target, ready) => {
  await page.evaluate((t) => document.querySelector(`.nav-item[data-target="${t}"]`)?.click(), target);
  await page.waitForSelector(ready, { timeout: 15000 });
};

const CORE_SCREENS = [
  ['home', async (page) => { await openHome(page); }],
  ['history', async (page) => {
    await openHome(page);
    await page.evaluate(() => document.querySelector('[data-action="open-activities"]')?.click());
    await page.waitForSelector('#activitiesScreen', { timeout: 15000 });
  }],
  ['progress', async (page) => {
    await openHome(page);
    await navTo(page, 'analytics', '#analytics-hub.active');
  }],
  ['plans', async (page) => {
    await openHome(page);
    await navTo(page, 'program', '#view-program.active');
  }],
  ['settings', async (page) => {
    await openHome(page);
    await page.evaluate(() => document.querySelector('#homeSettingsBtn')?.click());
    await page.waitForSelector('#settingsOverlay.active', { timeout: 15000 });
  }],
  ['profile', async (page) => {
    await openHome(page);
    await page.evaluate(() => document.querySelector('#homeSettingsBtn')?.click());
    await page.waitForSelector('#settingsOverlay.active', { timeout: 15000 });
    await page.evaluate(() => document.querySelector('#settingsPageHost [data-action="open-settings-profile"]')?.click());
    await page.waitForTimeout(300);
  }],
  ['train', async (page) => {
    await openHome(page);
    await navTo(page, 'workout', '#trainLanding');
  }],
  // Last: the cockpit hides the nav bar and owns the screen.
  ['cockpit', async (page) => {
    await openHome(page);
    await enterCockpit(page);
  }],
];

const EXTENDED_SCREENS = [
  ['customize', async (page) => {
    await openHome(page);
    await page.evaluate(() => document.querySelector('[data-action="open-customize"]')?.click());
    await page.waitForSelector('#customizeSheet.active', { timeout: 15000 });
  }],
  ['plans-browse', async (page) => {
    await openHome(page);
    await navTo(page, 'program', '#view-program.active');
    await page.evaluate(() => document.querySelector('[data-action="open-plans-browse"], [data-action="browse-plans"]')?.click());
    await page.waitForTimeout(350);
  }],
  ['plan-detail', async (page) => {
    await openHome(page);
    await navTo(page, 'program', '#view-program.active');
    await page.evaluate(() => document.querySelector('[data-action="open-plan"], .plan-row, .plans-row')?.click());
    await page.waitForTimeout(350);
  }],
  ['progress-review', async (page) => {
    await openHome(page);
    await navTo(page, 'analytics', '#analytics-hub.active');
    await page.evaluate(() => document.querySelector('[data-band="reviews"] [data-band-open], [data-band-origin="reviews"]')?.click());
    await page.waitForTimeout(350);
  }],
];

// -----------------------------------------------------------------------------
// In-page collection. Returns RAW data only: every colour decision is made in
// Node by `scripts/lib/contrast.mjs`, so there is exactly one implementation of
// the maths and the browser function stays cheap.
// -----------------------------------------------------------------------------
function collectInPage() {
  const SKIP = '[hidden],[aria-hidden="true"],script,style,template,noscript,[inert]';
  const rows = [];
  const chains = Object.create(null);
  const seen = new Set();
  const posCache = new WeakMap();

  const classNameOf = (node) => {
    if (typeof node.className === 'string') return node.className;
    return node.getAttribute ? (node.getAttribute('class') || '') : '';
  };

  function selectorFor(el) {
    const bits = [];
    for (let node = el; node && node.nodeType === 1 && bits.length < 5; node = node.parentElement) {
      if (node.id) { bits.unshift(`#${node.id}`); break; }
      const cls = classNameOf(node).trim().split(/\s+/).filter(Boolean)[0];
      bits.unshift(cls ? `.${cls}` : node.tagName.toLowerCase());
    }
    return bits.join(' ');
  }

  function chainFor(el) {
    const parts = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      const bg = style.backgroundColor;
      const img = style.backgroundImage;
      const solid = bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent';
      if (solid || (img && img !== 'none')) {
        parts.push({ bg: solid ? bg : null, img: img && img !== 'none' ? img : null });
      }
    }
    parts.reverse();
    const key = JSON.stringify(parts);
    if (!chains[key]) chains[key] = parts;
    return key;
  }

  function opacityFor(el) {
    let opacity = 1;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const value = Number(getComputedStyle(node).opacity);
      if (Number.isFinite(value)) opacity *= value;
      if (opacity < 0.05) break;
    }
    return Math.round(opacity * 1000) / 1000;
  }

  function isFixed(el) {
    let node = el;
    while (node && node.nodeType === 1) {
      if (posCache.has(node)) return posCache.get(node);
      const position = getComputedStyle(node).position;
      if (position === 'fixed') { posCache.set(el, true); return true; }
      node = node.parentElement;
    }
    posCache.set(el, false);
    return false;
  }

  function record(el, text, kind, fgOverride) {
    if (seen.has(el)) return;
    seen.add(el);
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    if (Number(style.opacity) < 0.05) return;
    const svg = el.namespaceURI === 'http://www.w3.org/2000/svg' || !!el.ownerSVGElement;
    let fg = fgOverride;
    if (!fg) fg = svg ? style.fill : style.color;
    if (svg && (!fg || fg === 'none')) fg = style.color;
    if (!fg) return;
    rows.push({
      selector: selectorFor(el),
      text: String(text).trim().replace(/\s+/g, ' ').slice(0, 48),
      fg,
      chain: chainFor(el),
      fontSizePx: parseFloat(style.fontSize) || 0,
      fontWeight: Number(style.fontWeight) || 400,
      opacity: opacityFor(el),
      svg,
      fixed: isFixed(el),
      disabled: el.disabled === true || !!el.closest('[disabled]'),
      kind,
      rect: {
        x: rect.left + window.scrollX, y: rect.top + window.scrollY,
        width: rect.width, height: rect.height,
      },
    });
  }

  // An emoji is a colour glyph, not themeable text: `color` does not paint it,
  // so measuring it produces a false result (and pixel sampling sees the glyph
  // itself). WCAG treats it as an image.
  const EMOJI_ONLY = /^[\p{Extended_Pictographic}\p{Emoji_Component}\uFE0F\u200D\s]+$/u;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const raw = node.nodeValue;
    if (!raw || raw.trim().length < 2) continue;
    const el = node.parentElement;
    if (!el || el.closest(SKIP)) continue;
    record(el, raw, EMOJI_ONLY.test(raw.trim()) ? 'emoji' : 'text');
  }

  // Placeholders are painted by a pseudo-element: no text node exists, so a
  // selector walk is the only way to see them.
  for (const el of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
    if (el.closest(SKIP) || !el.placeholder) continue;
    const placeholder = getComputedStyle(el, '::placeholder');
    record(el, el.placeholder, 'placeholder', placeholder?.color);
  }

  return {
    rows,
    chains,
    pageBg: getComputedStyle(document.body).backgroundColor,
    hash: location.hash,
  };
}

/**
 * Sample backdrop luminance for each rect from a full-page screenshot taken
 * with every glyph made transparent. Returns [p5, p95] luminance per rect.
 */
async function samplePixels(payload) {
  // Decode in-page rather than `fetch(data:…)`: the app CSP has no `data:` in
  // connect-src, so fetching the data URL fails before a pixel is read.
  const binary = atob(payload.base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return [];
  context.drawImage(bitmap, 0, 0);
  const scaleX = bitmap.width / document.documentElement.clientWidth;
  const scaleY = bitmap.height / Math.max(1, document.documentElement.scrollHeight);

  const luminance = (r, g, b) => {
    const channel = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };

  const results = [];
  for (const rect of payload.rects) {
    const x = Math.round(rect.x * scaleX);
    const y = Math.round(rect.y * scaleY);
    const w = Math.max(1, Math.round(rect.width * scaleX));
    const h = Math.max(1, Math.round(rect.height * scaleY));
    if (x < 0 || y < 0 || x + w > bitmap.width || y + h > bitmap.height) { results.push(null); continue; }
    let data;
    try { data = context.getImageData(x, y, w, h).data; }
    catch { results.push(null); continue; }
    const values = [];
    for (let i = 0; i < data.length; i += 4) values.push(luminance(data[i], data[i + 1], data[i + 2]));
    if (!values.length) { results.push(null); continue; }
    values.sort((a, b) => a - b);
    const at = (p) => values[Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * p)))];
    results.push([at(0.05), at(0.95)]);
  }
  return results;
}

// -----------------------------------------------------------------------------
// Node-side measurement.
// -----------------------------------------------------------------------------
function dedupeCap(colours, cap = 8) {
  const seen = new Set();
  const out = [];
  for (const colour of colours) {
    const key = `${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)},${colour.a.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(colour);
    if (out.length >= cap) break;
  }
  return out;
}

/** Resolve the candidate backdrops behind a text run. */
function backdropsFor(row, chains) {
  const chain = chains?.[row.chain] || [];
  const white = { r: 255, g: 255, b: 255, a: 1 };
  let candidates = [white];
  let gradient = false;
  for (const step of chain) {
    if (step.img) {
      if (hasImageBackdrop(step.img)) return { unknown: true };
      const stops = gradientStops(step.img);
      if (stops.length) {
        gradient = true;
        const next = [];
        for (const stop of stops) for (const candidate of candidates) next.push(composite(stop, candidate));
        candidates = dedupeCap(next);
      }
    }
    if (step.bg) {
      const colour = parseColor(step.bg);
      if (colour && colour.a > 0) candidates = dedupeCap(candidates.map((c) => composite(colour, c)));
    }
  }
  return { candidates, gradient };
}

function measureRow(row, chains, pixelSample) {
  let fg = parseColor(row.fg);
  if (!fg) return null;
  const resolved = backdropsFor(row, chains);
  if (resolved.unknown) return { unknown: true };

  // An element-level opacity fades the glyph toward the backdrop. Treating it as
  // text alpha is conservative and needs no group-compositing model.
  if (row.opacity < 0.99) fg = { ...fg, a: (fg.a ?? 1) * row.opacity };

  const threshold = aaThreshold({ fontSizePx: row.fontSizePx, fontWeight: row.fontWeight });
  const estimate = worstContrast(fg, resolved.candidates);
  let ratio = estimate.ratio;
  let backdrop = estimate.backdrop;
  let confirmed = false;
  let approximate = resolved.gradient;
  let pixelRatio = null;

  if (pixelSample) {
    const sampled = worstContrastFromLuminances(pixelSample, fg);
    // Pixels are ground truth for what is painted behind the run, so they can
    // CLEAR a worst-stop gradient estimate. They never invent a worse result:
    // an emoji glyph or a chart line inside the element's box is content, not
    // backdrop, and hiding `color` does not hide it.
    if (sampled.ratio > 0) {
      if (sampled.ratio > estimate.ratio) {
        ratio = sampled.ratio;
        backdrop = sampled.backdrop;
        approximate = false;
        confirmed = true;
      }
      pixelRatio = Number(sampled.ratio.toFixed(2));
    }
  }

  const severity = severityFor(ratio, threshold, { approximate: approximate && !confirmed });
  return {
    ratio, backdrop, threshold, severity, confirmed, approximate, pixelRatio,
    painted: composite(fg, backdrop || { r: 255, g: 255, b: 255, a: 1 }),
  };
}

// -----------------------------------------------------------------------------
// Browser driving.
// -----------------------------------------------------------------------------
const server = createServer(async (request, response) => {
  try {
    const rel = (request.url || '/') === '/' ? 'index.html'
      : decodeURIComponent((request.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    response.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404); response.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
baseUrlRef.value = baseUrl;

const runtime = await resolveChromium();
if (!runtime) { server.close(); process.exit(0); }
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

const MODES = [
  { id: 'light', theme: 'light', palette: 'midnight' },
  { id: 'midnight', theme: 'dark', palette: 'midnight' },
  { id: 'slate', theme: 'dark', palette: 'slate' },
  { id: 'forest', theme: 'dark', palette: 'forest' },
  { id: 'ember', theme: 'dark', palette: 'ember' },
];
const REDUCED_SCREEN_IDS = new Set(['home', 'cockpit', 'progress', 'settings']);

const findings = [];
const skipped = [];
const screens = [...CORE_SCREENS, ...(has('--full') ? EXTENDED_SCREENS : [])]
  .filter(([id]) => !ONLY_SCREENS.length || ONLY_SCREENS.includes(id));

try {
  for (const mode of MODES) {
    if (!ALL_MODES && mode.id !== 'light' && mode.id !== 'midnight') continue;
    const activeScreens = (mode.id === 'light' || mode.id === 'midnight')
      ? screens
      : screens.filter(([id]) => REDUCED_SCREEN_IDS.has(id) || ONLY_SCREENS.includes(id));

    const context = await createBrowserContext(browser, {
      viewport: { width: WIDTH, height: 900 },
      colorScheme: mode.theme,
      deviceScaleFactor: 1,
      // The pinned clock is an instant; the app derives the calendar day from
      // it in LOCAL time. Without this the audited state depended on the
      // runner's zone: CI (UTC) rendered "today" as the previous, completed day
      // and measured 45 more text runs than a Sydney machine.
      timezoneId: 'Australia/Sydney',
    });
    const seeded = { ...STATE, settings: { ...STATE.settings, theme: mode.theme, palette: mode.palette } };
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value),
      ['hybrid_engine_v2_state', JSON.stringify(seeded)]);
    await context.addInitScript(pinClock, Date.parse('2026-11-26T09:00:00+11:00'));
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'NOT YET' }).click({ timeout: 600 }).catch(() => {});
    await page.waitForTimeout(250);

    for (const [screenId, enter] of activeScreens) {
      try {
        await enter(page);
        await page.waitForTimeout(280);
      } catch (error) {
        skipped.push(`${mode.id}/${screenId}: could not open (${String(error.message || error).split('\n')[0]})`);
        continue;
      }

      const collected = await page.evaluate(collectInPage);
      let pixelSamples = null;
      if (PIXELS) {
        const rects = collected.rows.filter((row) => !row.fixed).map((row) => row.rect);
        if (rects.length) {
          const styleHandle = await page.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; fill: transparent !important; caret-color: transparent !important; }' });
          const shot = await page.screenshot({ fullPage: true, animations: 'disabled' });
          await styleHandle.evaluate((node) => node.remove());
          try {
            pixelSamples = await page.evaluate(samplePixels, { base64: shot.toString('base64'), rects });
          } catch (error) {
            skipped.push(`${mode.id}/${screenId}: pixel sampling failed (${String(error.message || error).split('\n')[0]})`);
            pixelSamples = null;
          }
        }
      }

      let pixelIndex = 0;
      for (const row of collected.rows) {
        if (row.kind === 'emoji') continue;
        let sampleForRow;
        if (pixelSamples) {
          if (row.fixed) sampleForRow = undefined;
          else sampleForRow = pixelSamples[pixelIndex++] || undefined;
        }
        const measured = measureRow(row, collected.chains, sampleForRow);
        if (!measured) continue;
        if (measured.unknown) {
          skipped.push(`${mode.id}/${screenId}/${row.selector}: backdrop is an image; not measurable`);
          continue;
        }
        findings.push({
          mode: mode.id,
          screen: screenId,
          selector: row.selector,
          text: row.text,
          kind: row.kind,
          fg: row.fg,
          fgCss: cssColor(measured.painted),
          bg: measured.backdrop ? cssColor(measured.backdrop) : 'unknown',
          ratio: Number(measured.ratio.toFixed(2)),
          threshold: measured.threshold,
          severity: measured.severity,
          fontSizePx: row.fontSizePx,
          fontWeight: row.fontWeight,
          opacity: row.opacity,
          disabled: row.disabled,
          approximate: measured.approximate,
          confirmed: measured.confirmed,
          pixelRatio: measured.pixelRatio,
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

// -----------------------------------------------------------------------------
// Collapse duplicates, then compare with the ratchet.
// -----------------------------------------------------------------------------
const keyOf = (row) => `${row.mode}|${row.selector}|${row.fg}`;
const worstByKey = new Map();
for (const row of findings) {
  const key = keyOf(row);
  const existing = worstByKey.get(key);
  if (!existing) { worstByKey.set(key, { ...row, screens: [row.screen] }); continue; }
  existing.screens = [...new Set([...existing.screens, row.screen])];
  if (row.ratio < existing.ratio) worstByKey.set(key, { ...row, screens: existing.screens });
}
const rows = [...worstByKey.values()];
const failures = rows.filter((row) => row.severity);

let baseline = null;
if (existsSync(BASELINE_PATH) && !UPDATE) {
  baseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
}

const regressions = [];
if (baseline) {
  for (const row of failures) {
    const known = baseline.rows?.[keyOf(row)];
    if (known == null) regressions.push({ ...row, reason: 'new' });
    else if (row.ratio < known - 0.3) regressions.push({ ...row, reason: `regressed from ${known.toFixed(2)}` });
  }
}

if (UPDATE) {
  const table = {};
  for (const row of failures) table[keyOf(row)] = row.ratio;
  await mkdir(path.dirname(BASELINE_PATH), { recursive: true });
  await writeFile(BASELINE_PATH, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    width: WIDTH,
    modes: [...new Set(rows.map((row) => row.mode))],
    note: 'Every row here is a KNOWN low-contrast text run. The check fails only on new or worse rows; fixes remove entries, --update prunes them.',
    rows: table,
  }, null, 2)}\n`);
}

// -----------------------------------------------------------------------------
// Reporting.
// -----------------------------------------------------------------------------
const order = { P0: 0, P1: 1, P2: 2 };
const sorted = failures.sort((a, b) => (order[a.severity] - order[b.severity]) || (a.ratio - b.ratio));
const counts = { P0: 0, P1: 0, P2: 0 };
for (const row of failures) counts[row.severity] += 1;

console.log(`contrast-audit: ${rows.length} text runs measured (${WIDTH}px, ${[...new Set(rows.map((r) => r.mode))].join(', ')})`);
console.log(`  P0 ${counts.P0} · P1 ${counts.P1} · P2 ${counts.P2} · measurable image backdrops skipped ${skipped.length}`);
if (skipped.length) for (const note of skipped.slice(0, 8)) console.log(`  skip: ${note}`);
if (sorted.length) {
  console.log('');
  for (const row of sorted.slice(0, MAX_ROWS_REPORTED)) {
    const tag = `${row.severity}`.padEnd(2);
    const where = `${row.mode}/${row.screen}`.padEnd(20);
    console.log(`${tag} ${row.ratio.toFixed(2)}:1 (needs ${row.threshold}) ${where} ${row.fg} on ${row.bg} — ${row.selector} “${row.text}”${row.approximate ? ' [gradient estimate]' : ''}`);
  }
  if (sorted.length > MAX_ROWS_REPORTED) console.log(`  … ${sorted.length - MAX_ROWS_REPORTED} more (see --md or the JSON baseline)`);
}

if (WANT_MD) {
  const lines = [];
  lines.push('# UI contrast findings', '');
  lines.push(`Measured ${new Date().toISOString().slice(0, 10)} at ${WIDTH}px in ${[...new Set(rows.map((r) => r.mode))].join(', ')}.`);
  lines.push('');
  lines.push(`**${counts.P0} P0 · ${counts.P1} P1 · ${counts.P2} P2**, out of ${rows.length} text runs measured.`);
  lines.push('');
  lines.push('Severity: P0 = unreadable (below 1.8:1, or body text below 3:1). P1 = body text below 4.5:1. P2 = large text or non-text below 3:1.');
  lines.push('A row marked `gradient estimate` is measured against every stop of the gradient that paints behind it; run `--pixels` to confirm it against real pixels.');
  lines.push('');
  lines.push('| Sev | Ratio | Mode/Screen | Foreground | Backdrop | Selector | Text |');
  lines.push('|---|---:|---|---|---|---|---|');
  for (const row of sorted) {
    lines.push(`| ${row.severity} | ${row.ratio.toFixed(2)}:1 | ${row.mode}/${row.screen} | \`${row.fg}\` | \`${row.bg}\` | \`${row.selector}\` | ${String(row.text).replace(/\|/g, '\\|')} |`);
  }
  lines.push('');
  lines.push('## Not measurable');
  lines.push('');
  if (!skipped.length) lines.push('None.');
  for (const note of skipped) lines.push(`- ${note}`);
  lines.push('');
  await writeFile(FINDINGS_PATH, `${lines.join('\n')}\n`);
  console.log(`contrast-audit: wrote ${path.relative(ROOT, FINDINGS_PATH)}`);
}

if (!baseline && !UPDATE) {
  console.error('\ncontrast-audit: no baseline at docs/audit/contrast-baseline.json — run `npm run contrast:audit -- --update` to record the current state.');
  process.exit(1);
}

if (regressions.length) {
  console.error(`\ncontrast-audit: FAIL — ${regressions.length} new or worse low-contrast run(s):`);
  for (const row of regressions.slice(0, MAX_ROWS_REPORTED)) {
    console.error(`- ${row.severity} ${row.ratio.toFixed(2)}:1 ${row.mode}/${row.screen} \`${row.selector}\` (${row.fg} on ${row.bg}) [${row.reason}]`);
  }
  process.exit(1);
}

console.log(`contrast-audit: PASS — no new low-contrast text${baseline ? ` (${Object.keys(baseline.rows || {}).length} known rows on the ratchet)` : ''}.`);
