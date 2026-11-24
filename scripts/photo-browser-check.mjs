// =============================================================================
// PROGRESS PHOTO BROWSER CHECK
//
// The photo path had no end-to-end coverage at all, and two real defects hid in
// that gap: a 44px delete button covered the 64px tile (so a photo could be
// added and never viewed), and the file input used `hidden`, which removes it
// from the tab order (so the picker was unreachable by keyboard).
//
// This drives the real UI: add a photo through the real input, wait for the
// thumbnail to hydrate from IndexedDB, open it, close it with Escape, reopen it
// and delete it, then confirm the blob is gone.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
const runtime = await resolveChromium();
if (!runtime) process.exit(required ? 1 : 0);
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
const BASE = `http://127.0.0.1:${server.address().port}`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const TZ = 'Australia/Sydney';

// PINNED, not read from the wall clock: a weekday derived from the real clock
// makes this check pass or fail depending on the day CI runs.
const today = '2026-11-19'; // Thursday
const CLOCK = Date.parse(`${today}T09:00:00+11:00`);
const addDays = (key, n) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (key) => addDays(key, -(((new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7)));
const MON = mondayOf(today);
const set = (w, r) => ({ c: true, w: String(w), r: String(r) });

function fixture(theme) {
  return {
    schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'photo_check',
    settings: {
      name: 'Photo Athlete', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
      onboardingComplete: true, modules: { running: true, fasting: false, health: true, recovery: true },
    },
    bodyWeightLog: [{ date: addDays(MON, -9), weight: 80.2 }, { date: addDays(MON, -2), weight: 78.4 }],
    bodyMeasurements: [{ date: addDays(MON, -4), waist: 82, chest: 104, bodyFat: 18.5 }],
    weeks: {
      '1': {
        activationId: 'photo_check', dates: { mon: MON },
        lifts: { mon: { 'Barbell Bench Press': [set(100, 5), set(100, 5)] } },
        gymStats: { mon: { time: '50' } },
      },
    },
  };
}

const failures = [];
const ok = (condition, message) => { if (!condition) failures.push(message); };

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[390, 'dark'], [320, 'light']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(pinClock, CLOCK);
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bottom-nav [data-target="analytics"]', { timeout: 15000 });
    await page.click('.bottom-nav [data-target="analytics"]');
    await page.waitForSelector('[data-band="body"]', { timeout: 15000 });
    await page.locator('[data-band="body"]').scrollIntoViewIfNeeded();

    // The add control must say what it does, be keyboard reachable, and be a
    // real 44px target. It opens the DATED ENTRY — the same action the same tile
    // has on Measures — rather than jumping straight to a camera, so a photo
    // always gets the chance to carry that day's numbers.
    const add = await page.$eval('[data-band="body"]', (band) => {
      const button = band.querySelector('.pg-photo--add button');
      const rect = button?.getBoundingClientRect();
      return {
        text: (button?.textContent || '').trim(),
        buttonTag: button?.tagName || '',
        action: button?.getAttribute('data-action') || '',
        height: Math.round(rect?.height || 0),
        tabbable: button ? button.tabIndex >= 0 : false,
        strayInputs: band.querySelectorAll('[data-photo-input]').length,
      };
    });
    ok(/add photo/i.test(add.text), `${width}px: the add control does not say "Add photo" (${add.text})`);
    ok(add.buttonTag === 'BUTTON' && add.tabbable, `${width}px: the add control is not a focusable button`);
    ok(add.height >= 44, `${width}px: the add control is ${add.height}px tall, under 44px`);
    ok(add.action === 'open-ms-sheet', `${width}px: the add tile does not open the dated entry (${add.action})`);
    ok(add.strayInputs === 0, `${width}px: the band still carries a bare file input`);

    // A tile must open the photo; it must not carry its own delete control.
    const tileState = await page.$eval('[data-band="body"]', (band) => ({
      viewButtons: band.querySelectorAll('[data-photo-view]').length,
      deleteOnTile: band.querySelectorAll('.pg-photo [data-photo-delete]').length,
    }));
    ok(tileState.deleteOnTile === 0, `${width}px: a photo tile still carries a delete control`);

    // Add one photo exactly as the UI does: through the BUTTON's real file
    // chooser, not by writing `input.files` behind its back. That proves the
    // button actually clicks the hidden input.
    const dataUrl = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 400; canvas.height = 300;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 400, 300);
      grad.addColorStop(0, '#22d3ee'); grad.addColorStop(1, '#8b5cf6');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 400, 300);
      return canvas.toDataURL('image/png');
    });
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    await page.click('[data-band="body"] .pg-photo--add button');
    await page.waitForSelector('#measurementsSheet.active', { timeout: 5000 });
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 5000 }),
      page.click('#msSheetPhoto [data-ms-photo-pick="library"]'),
    ]);
    await chooser.setFiles({ name: 'progress.png', mimeType: 'image/png', buffer });
    // A picture on its own is a valid entry: Save with no numbers typed.
    await page.click('[data-action="save-measurements-sheet"]');
    await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'), null, { timeout: 8000 });

    // The thumbnail must hydrate from IndexedDB, not just exist.
    const hydrated = await page.waitForFunction(() => {
      const img = document.querySelector('[data-band="body"] .pg-photo__img');
      return img && img.getAttribute('src') && img.naturalWidth > 0;
    }, null, { timeout: 8000 }).then(() => true).catch(() => false);
    ok(hydrated, `${width}px: the photo was saved but its thumbnail never loaded`);
    // The tile must be a VIEW control. This was collected and never asserted,
    // so removing `data-photo-view` entirely would have passed.
    const viewButtons = await page.$$eval('[data-band="body"] [data-photo-view]', (nodes) => nodes.length);
    ok(viewButtons === 1, `${width}px: expected one photo tile that opens the viewer, got ${viewButtons}`);

    const stored = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      return Array.isArray(state.progressPhotos) ? state.progressPhotos.length : -1;
    }, STORAGE_KEY);
    ok(stored === 1, `${width}px: expected one photo record, got ${stored}`);

    // Open it. This is the path that did not exist.
    await page.click('[data-band="body"] [data-photo-view]');
    const opened = await page.waitForSelector('#photoViewer.active', { timeout: 4000 }).then(() => true).catch(() => false);
    ok(opened, `${width}px: tapping a photo did not open the viewer`);
    if (opened) {
      const viewer = await page.evaluate(() => {
        const root = document.getElementById('photoViewer');
        const img = root?.querySelector('#photoViewerImg');
        return {
          imgWidth: img?.naturalWidth || 0,
          focus: document.activeElement?.getAttribute('data-action') || document.activeElement?.id || '',
          closeSize: (() => { const b = root.querySelector('[data-action="close-photo-viewer"]'); const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
          deleteSize: (() => { const b = root.querySelector('#photoViewerDelete'); const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
        };
      });
      ok(viewer.imgWidth > 0, `${width}px: the viewer opened with no image`);
      ok(viewer.focus === 'close-photo-viewer', `${width}px: focus did not land on Close (${viewer.focus})`);
      ok(viewer.closeSize[1] >= 44 && viewer.deleteSize[1] >= 44, `${width}px: viewer buttons are under 44px`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(250);
      const closed = await page.evaluate(() => !document.getElementById('photoViewer')?.classList.contains('active'));
      ok(closed, `${width}px: Escape did not close the viewer`);
    }

    // Delete from the viewer: confirm, then the record and its blob are gone.
    await page.click('[data-band="body"] [data-photo-view]');
    await page.waitForSelector('#photoViewer.active', { timeout: 3000 }).catch(() => {});
    await page.click('#photoViewerDelete');
    await page.waitForSelector('.cmodal', { timeout: 3000 }).catch(() => {});
    await page.click('.cmodal__btn--danger');
    await page.waitForTimeout(900);

    // Deleting a photo must not navigate anywhere: a history marker that pops
    // past the app entry leaves the athlete on a blank page.
    ok(page.url().startsWith(BASE), `${width}px: deleting a photo navigated away (${page.url()})`);
    if (!page.url().startsWith(BASE)) {
      failures.push(`${width}px: the app was left at ${page.url()} after a photo delete`);
      await context.close();
      continue;
    }

    const afterDelete = await page.evaluate(async (key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      const records = Array.isArray(state.progressPhotos) ? state.progressPhotos.length : -1;
      const blob = await new Promise((resolve) => {
        const open = indexedDB.open('HybridTrainingDB');
        open.onerror = () => resolve('db-error');
        open.onsuccess = () => {
          const db = open.result;
          try {
            const tx = db.transaction('photos', 'readonly');
            const req = tx.objectStore('photos').count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve('req-error');
          } catch { resolve('no-store'); }
        };
      });
      return { records, blob };
    }, STORAGE_KEY);
    ok(afterDelete.records === 0, `${width}px: the photo record survived a delete (${afterDelete.records})`);
    ok(afterDelete.blob === 0, `${width}px: the blob survived a delete (${afterDelete.blob})`);

    if (errors.length) failures.push(`${width}px: browser errors — ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`\nPhoto browser check failed (${failures.length}).`);
  process.exit(1);
}
console.log('Progress photo browser contract passed.');
