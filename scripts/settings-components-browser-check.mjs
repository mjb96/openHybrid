// =============================================================================
// SETTINGS COMPONENTS BROWSER CHECK — Phase 3
//
// Renders the shared components from their real module (not a copy) and
// measures the contract: 64px rows, 36px icon tiles, 44/48px controls, one
// fixed row structure, no horizontal overflow, a collapsing title and a visible
// disabled reason. 320/390/412, light/dark.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium } from './browser-runtime.mjs';

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

const failures = [];
const ok = (condition, label) => {
  if (condition) console.log(`  ok · ${label}`);
  else { failures.push(label); console.error(`FAIL: ${label}`); }
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[320, 'light'], [390, 'dark'], [412, 'dark']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, colorScheme: theme });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error)));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      const c = await import('/js/settings/components.js');
      const rows = [
        c.settingsRow({ id: 'probe-workout', label: 'Workout', icon: 'dumbbell', tone: 'blue', summary: 'Default · 2:00', nav: true, action: 'noop', context: 'workout' }),
        c.settingsRow({ id: 'probe-toggle', label: 'Keep screen awake', icon: 'clock', tone: 'green', footnote: 'Only while the workout is open', control: c.toggleControl({ key: 'keepAwake', label: 'Keep screen awake', checked: true }) }),
        c.settingsRow({ id: 'probe-segment', label: 'Theme', icon: 'sparkle', tone: 'purple', control: c.segmentedControl({ key: 'theme', label: 'Theme', value: 'dark', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] }) }),
        c.settingsRow({ id: 'probe-stepper', label: 'Session length', icon: 'clock', tone: 'orange', control: c.stepperControl({ key: 'sessionMinutes', label: 'Session length', value: 45, min: 15, max: 90, step: 5, unit: 'min' }) }),
        c.settingsRow({ id: 'probe-slider', label: 'Alert volume', icon: 'activity', tone: 'pink', control: c.sliderRow({ key: 'restAlertVolume', label: 'Alert volume', value: 40, min: 0, max: 100, unit: '%' }) }),
        c.settingsRow({ id: 'probe-time', label: 'Reminder time', icon: 'calendar', tone: 'teal', control: c.timeControl({ key: 'reminderTime', label: 'Reminder time', value: '07:30' }) }),
        c.settingsRow({ id: 'probe-text', label: 'Name', icon: 'user', tone: 'slate', control: c.textControl({ key: 'name', label: 'Name', value: 'Alex' }) }),
        c.settingsRow({ id: 'probe-disabled', label: 'Streak alert time', icon: 'clock', tone: 'red', disabled: true, disabledReason: 'Turn streak alerts on first.', control: c.timeControl({ key: 'streakAlertTime', label: 'Streak alert time', value: '20:00', disabled: true }) }),
        c.dangerRow({ label: 'Delete all data', description: 'Cannot be undone', action: 'noop-danger' }),
      ];
      const pageHtml = c.settingsPage({
        title: 'Workout',
        backLabel: 'Settings',
        backAction: 'noop-back',
        intro: 'How sets are logged and what the logger remembers.',
        groups: [
          c.settingsGroup({ label: 'Logging', rows, footnote: 'Changes save instantly.' }),
          c.settingsGroup({ label: 'Theme', rows: [c.selectList({ key: 'theme', label: 'Theme', value: 'dark', options: [{ value: 'dark', label: 'Dark', description: 'Navy' }, { value: 'light', label: 'Light', description: 'Daylight' }] })] }),
        ],
        footer: 'Reset to defaults lives at the bottom of the page.',
      });
      const host = document.createElement('div');
      host.id = 'settingsComponentProbe';
      host.style.cssText = 'position:fixed;inset:0;z-index:2000;background:var(--bg-deep);';
      host.innerHTML = pageHtml;
      document.body.appendChild(host);
      c.mountCollapsingTitle(host.querySelector('.s-page'));
    });

    const probe = await page.$eval('#settingsComponentProbe', (host) => {
      const size = (sel) => [...host.querySelectorAll(sel)].map((el) => {
        const r = el.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
      const rows = size('.s-row');
      const icons = size('.s-icon:not(.s-icon--empty)');
      const toggles = size('.s-switch');
      const segments = size('.s-segmented__chip');
      const steppers = size('.s-stepper__btn');
      const inputs = size('.s-time, .s-input');
      const back = size('.s-back');
      return {
        rows,
        icons,
        toggles,
        segments,
        steppers,
        inputs,
        back,
        disabledReason: host.querySelector('#probe-disabled .s-row__reason')?.textContent?.trim() || '',
        disabledToggle: host.querySelector('#probe-disabled input')?.disabled ?? null,
        selectedChecks: host.querySelectorAll('.s-select-item.is-selected .s-select-item__check').length,
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        overflowBy: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        rowCopyColumns: new Set(rows.map((r) => r.w)).size,
      };
    });
    console.log(`settings components ${width}px/${theme}:`, JSON.stringify(probe));

    ok(probe.rows.every((r) => r.h >= 64), `${width}px: every row is at least 64px`);
    ok(probe.icons.every((r) => r.w === 36 && r.h === 36), `${width}px: icon tiles are 36px`);
    ok(probe.toggles.every((r) => r.w >= 48 && r.h >= 48), `${width}px: toggles have a 48px hit area`);
    ok(probe.segments.every((r) => r.h >= 44), `${width}px: segmented options are 44px`);
    ok(probe.steppers.every((r) => r.w >= 48 && r.h >= 48), `${width}px: stepper buttons are 48px`);
    ok(probe.inputs.every((r) => r.h >= 48), `${width}px: text/time inputs are 48px`);
    ok(probe.back.every((r) => r.w >= 48 && r.h >= 48), `${width}px: the back control is 48px`);
    ok(probe.disabledReason === 'Turn streak alerts on first.', `${width}px: the disabled row states its reason`);
    ok(probe.disabledToggle === true, `${width}px: the disabled control is really disabled`);
    ok(probe.selectedChecks === 1, `${width}px: exactly one select-list check is visible`);
    ok(!probe.overflow, `${width}px: no horizontal overflow (${probe.overflowBy}px)`);

    const collapse = await page.evaluate(() => {
      const pageEl = document.querySelector('#settingsComponentProbe .s-page');
      const body = pageEl.querySelector('.s-page__body');
      const before = getComputedStyle(pageEl.querySelector('.s-page__title')).fontSize;
      body.style.maxHeight = '220px';
      body.style.overflowY = 'auto';
      body.scrollTop = 40;
      body.dispatchEvent(new Event('scroll'));
      return new Promise((resolve) => setTimeout(() => resolve({
        before,
        after: getComputedStyle(pageEl.querySelector('.s-page__title')).fontSize,
        scrolled: pageEl.classList.contains('is-scrolled'),
      }), 320));
    });
    ok(collapse.scrolled && collapse.before !== collapse.after, `${width}px: the large title collapses on scroll (${collapse.before} → ${collapse.after})`);
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
console.log('Settings components browser contract passed.');
