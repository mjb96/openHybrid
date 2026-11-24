// =============================================================================
// SETTINGS NAVIGATION BROWSER CHECK — Phase 1
//
// Home gear → Settings → Profile, one pushed level at a time, with the bottom
// tab bar hidden inside the route and restored on the way out. Also covers the
// legacy profile hash/action redirects and the Home scroll restore.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtime = await resolveChromium();
if (!runtime) process.exit(process.argv.includes('--required') ? 1 : 0);
const { chromium, executablePath } = runtime;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  try {
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const state = {
  schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'current',
  settings: { name: 'Route Athlete', theme: 'dark', weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon', onboardingComplete: true },
  weeks: {
    '1': {
      activationId: 'current',
      dates: { mon: '2026-11-16', tue: '2026-11-17', wed: '2026-11-18' },
      lifts: { mon: { 'Bench Press': [{ c: true, w: '100', r: '5' }] }, wed: { 'Back Squat': [{ c: true, w: '140', r: '5' }] } },
    },
  },
};

const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

async function routeState(page) {
  return page.evaluate(() => ({
    hash: location.hash,
    settingsActive: document.getElementById('settingsOverlay')?.classList.contains('active') || false,
    rootPanel: document.getElementById('settingsPanel')?.classList.contains('active') || false,
    profilePanel: document.getElementById('settingsProfilePanel')?.classList.contains('active') || false,
    navHidden: getComputedStyle(document.querySelector('.bottom-nav')).display === 'none',
    htmlClass: document.documentElement.classList.contains('settings-route'),
    profileText: document.querySelector('#settingsProfileContent')?.textContent?.trim().slice(0, 40) || '',
  }));
}

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[320, 'light'], [390, 'dark'], [412, 'dark']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: 'Australia/Sydney', colorScheme: theme });
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(state)]);
    await context.addInitScript(pinClock, Date.parse('2026-11-19T09:00:00+11:00'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForSelector('#homeWeekStrip');

    const gear = await page.$eval('#homeSettingsBtn', (el) => {
      const rect = el.getBoundingClientRect();
      return { width: Math.round(rect.width), height: Math.round(rect.height), label: el.getAttribute('aria-label') };
    });
    ok(gear.width >= 48 && gear.height >= 48, `${width}px: Home gear is 48px (${gear.width}×${gear.height})`);
    ok(/settings/i.test(gear.label || ''), `${width}px: Home gear names Settings`);
    ok(await page.locator('#homeAvatar').count() === 0, `${width}px: the old avatar entry is gone`);

    // Scroll Home so Back restoration is measurable.
    await page.evaluate(() => window.scrollTo(0, 640));
    await page.waitForTimeout(100);
    const homeScroll = await page.evaluate(() => window.scrollY);
    // Click without Playwright's scroll-into-view so the saved Home position is
    // the one under the surface, not the top the browser scrolls to.
    await page.evaluate(() => document.getElementById('homeSettingsBtn').click());
    await page.waitForSelector('#settingsOverlay.active');
    const settings = await routeState(page);
    ok(settings.hash === '#/settings', `${width}px: gear routes to #/settings (${settings.hash})`);
    ok(settings.rootPanel && !settings.profilePanel, `${width}px: Settings root is the active panel`);
    ok(settings.navHidden && settings.htmlClass, `${width}px: the bottom tab bar is hidden in Settings`);
    const panelWidth = await page.$eval('#settingsPanel', (el) => Math.round(el.getBoundingClientRect().width));
    ok(panelWidth >= width - 1, `${width}px: Settings is full-screen (${panelWidth}/${width})`);
    const back = await page.$eval('#settingsOverlay [data-action="close-settings"]', (el) => ({ text: el.textContent.trim(), h: Math.round(el.getBoundingClientRect().height) }));
    ok(/Home/.test(back.text) && back.h >= 48, `${width}px: back chevron is labelled Home and 48px`);

    // Profile card → Profile.
    ok(await page.locator('#settingsOverlay [data-action="open-settings-profile"]').count() === 1, `${width}px: Settings has a profile card`);
    await page.click('#settingsOverlay [data-action="open-settings-profile"]');
    await page.waitForSelector('#settingsProfilePanel.active');
    const profile = await routeState(page);
    ok(profile.hash === '#/settings/profile', `${width}px: profile card routes to #/settings/profile (${profile.hash})`);
    ok(profile.profilePanel && !profile.rootPanel, `${width}px: Profile is the active panel`);
    ok(profile.navHidden && profile.htmlClass, `${width}px: the tab bar stays hidden on Profile`);
    ok(profile.profileText.length > 0, `${width}px: Profile content rendered`);

    // Profile → Settings.
    await page.click('#settingsOverlay [data-action="back-to-settings"]');
    await page.waitForFunction(() => location.hash === '#/settings');
    const backToSettings = await routeState(page);
    ok(backToSettings.rootPanel && !backToSettings.profilePanel, `${width}px: Profile Back returns to Settings`);

    // Browser Back from Settings returns Home and restores scroll.
    await page.goBack();
    await page.waitForFunction(() => !document.getElementById('settingsOverlay')?.classList.contains('active'));
    const home = await routeState(page);
    ok(!/^#\/settings/.test(home.hash), `${width}px: browser Back leaves the Settings route`);
    ok(!home.navHidden && !home.htmlClass, `${width}px: the bottom tab bar is restored on Home`);
    const restored = await page.evaluate(() => window.scrollY);
    ok(Math.abs(restored - homeScroll) < 8, `${width}px: Home scroll restored (${Math.round(restored)} vs ${Math.round(homeScroll)})`);

    // Legacy hashes redirect to the canonical route.
    await page.evaluate(() => { location.hash = '#profile'; });
    await page.waitForFunction(() => location.hash === '#/settings/profile');
    const legacy = await routeState(page);
    ok(legacy.profilePanel && legacy.navHidden, `${width}px: #profile redirects to #/settings/profile`);

    // The old action deep-links to Profile, not a separate tab.
    await page.evaluate(() => {
      const cta = document.createElement('button');
      cta.setAttribute('data-action', 'open-profile');
      cta.style.display = 'none';
      document.body.appendChild(cta);
      cta.click();
      cta.remove();
    });
    await page.waitForFunction(() => location.hash === '#/settings/profile');
    ok(true, `${width}px: legacy open-profile action opens the Profile route`);

    if (errors.length) failures.push(`${width}px: browser errors: ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}
console.log('Settings navigation browser contract passed.');
