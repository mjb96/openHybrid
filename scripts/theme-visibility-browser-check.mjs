// =============================================================================
// THEME VISIBILITY (real browser)
//
// A semantic token that resolves to the surface behind it makes text disappear
// (the A3 `--text-inverse` collision put white titles on white sheets). Static
// greps cannot see that: the value is only wrong after the cascade and the
// active theme resolve. This check boots the real app in BOTH modes, walks the
// primary screens and computes the rendered contrast of every text element
// against the background actually painted behind it.
//
// It is deliberately a low bar (1.8:1) — it catches INVISIBLE text, not AA
// misses (tests/theme_contrast.test.js owns the token pairs). Elements painted
// over a gradient or image are skipped: the checker cannot know that backdrop,
// and guessing would create false alarms.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html'
      : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const body = await readFile(path.resolve(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const state = {
  schemaVersion: 17, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'act',
  weekStartedAt: '2026-11-23',
  settings: {
    name: 'Alex', theme: 'dark', palette: 'midnight', weightUnit: 'kg', distanceUnit: 'km',
    weekStartDay: 'mon', onboardingComplete: true, fitnessGoal: 'hybrid', fitnessLevel: 'intermediate',
    targetWeight: 76, heightCm: 178, equipmentProfiles: [],
    restPeriods: { warmup: 45, compound: 180, accessory: 120, isolation: 90 },
  },
  weeks: {
    '1': {
      activationId: 'act', programId: 'hybrid_engine',
      dates: { mon: '2026-11-23', tue: '2026-11-24', wed: '2026-11-25' },
      lifts: {
        mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }] },
        tue: { 'Back Squat': [{ c: true, w: '140', r: '5' }] },
        wed: { 'Back Squat': [{ w: '140', r: '5' }], 'Romanian Deadlift': [{ w: '100', r: '8' }] },
      },
      gymStats: { mon: { time: '55' }, tue: { time: '45' } }, runSessions: {},
    },
  },
  bodyWeightLog: [{ date: '2026-11-02', weight: 80 }, { date: '2026-11-23', weight: 78.4 }],
  bodyMeasurements: [{ date: '2026-11-23', waist: 82 }],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [], personalRatings: {}, activeFilters: {} },
  healthConnect: { connected: false, hrv: [], restingHR: [], sleep: [], steps: [], vo2max: [] },
  hybridScore: { history: [], xp: 0, lastRecordedDate: null }, loadMetrics: { atl: 0, ctl: 0 },
};

const failures = [];
const runtime = await resolveChromium();
if (!runtime) process.exit(0);
const { chromium, executablePath } = runtime;
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });

/** Runs inside the page: returns near-invisible text elements. */
function auditVisibleText() {
  const parse = (value) => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(/[,/ ]+/).filter(Boolean).map(Number);
    if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = [c.r, c.g, c.b].map((v) => {
      const x = v / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  };
  const ratio = (a, b) => {
    const x = lum(a); const y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const backdropOf = (el) => {
    let acc = null;
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (Number(style.opacity) < 0.5) return null;
      if (style.backgroundImage && style.backgroundImage !== 'none') return null;
      const bg = parse(style.backgroundColor);
      if (!bg || bg.a === 0) continue;
      acc = acc ? over(acc, bg) : bg;
      if (acc.a >= 1) return acc;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor);
    if (root && root.a > 0) acc = acc ? over(acc, root) : root;
    if (acc && acc.a < 1) acc = over(acc, { r: 255, g: 255, b: 255, a: 1 });
    return acc;
  };
  const selector = (el) => {
    const bits = [];
    for (let node = el; node && node.nodeType === 1 && bits.length < 4; node = node.parentElement) {
      bits.unshift(node.id ? `#${node.id}` : `.${String(node.className || node.tagName).split(/\s+/)[0]}`);
    }
    return bits.join(' ');
  };
  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('[hidden], [aria-hidden="true"], script, style, template') ) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || Number(style.opacity) < 0.2) continue;
    const fg = parse(style.color);
    const bg = backdropOf(el);
    if (!fg || !bg) continue;
    const fgSolid = fg.a < 1 ? over(fg, bg) : fg;
    const value = ratio(fgSolid, bg);
    if (value < 1.8) {
      bad.push({
        selector: selector(el),
        text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 48),
        fg: style.color,
        bg: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        ratio: Number(value.toFixed(2)),
      });
    }
  }
  return bad;
}

const screens = [
  ['Home', async (page) => { await page.waitForSelector('#view-home.active'); }],
  ['Train', async (page) => {
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="workout"]')?.click());
    await page.waitForSelector('#view-workout.active');
  }],
  ['Progress', async (page) => {
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="analytics"]')?.click());
    await page.waitForSelector('#analytics-hub.active');
  }],
  ['Plans', async (page) => {
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="program"]')?.click());
    await page.waitForSelector('#view-program.active');
  }],
  ['Settings', async (page) => {
    await page.evaluate(() => document.querySelector('.bottom-nav [data-target="home"]')?.click());
    await page.click('#homeSettingsBtn');
    await page.waitForSelector('#settingsOverlay.active');
  }],
  ['Profile', async (page) => {
    await page.click('#settingsPageHost [data-action="open-settings-profile"]');
    await page.waitForTimeout(250);
  }],
];

try {
  for (const theme of ['light', 'dark']) {
    const context = await createBrowserContext(browser, { viewport: { width: 390, height: 900 }, colorScheme: theme });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value),
      ['hybrid_engine_v2_state', JSON.stringify({ ...state, settings: { ...state.settings, theme } })]);
    await context.addInitScript(pinClock, Date.parse('2026-11-25T09:00:00+11:00'));
    const page = await context.newPage();
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.locator('button', { hasText: 'NOT YET' }).click().catch(() => {});
    await page.waitForTimeout(250);
    for (const [name, enter] of screens) {
      await enter(page);
      await page.waitForTimeout(450);
      const bad = await page.evaluate(auditVisibleText);
      for (const row of bad) {
        failures.push(`${theme}/${name}: ${row.ratio}:1 ${row.fg} on ${row.bg} — ${row.selector} “${row.text}”`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  console.error('theme-visibility-check: FAIL');
  for (const failure of [...new Set(failures)]) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('theme-visibility-check: PASS — no invisible text on Home, Train, Progress, Plans, Settings or Profile in light or dark.');
