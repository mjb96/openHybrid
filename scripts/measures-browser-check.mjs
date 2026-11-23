// =============================================================================
// MEASURES BROWSER CHECK
//
// The Measures screen is the date-level record behind the Progress → Body band:
// one entry per day holding a weigh-in, an entered body fat, tape sites and an
// optional photo. Unit tests model that correctly; they cannot prove the flow.
// The photo work in this same area had THREE defects (a covered tile, a `hidden`
// input, and a delete that blanked the page) that only a real browser found, so
// this drives the whole thing:
//
//   1. empty state → + → Add picture (real file chooser) → weight/waist/fat
//   2. Save, and the entry appears with its numbers AND its photo
//   3. a second entry on another date, so the library has something to compare
//   4. See All → library → open a photo → compare two side by side
//   5. Replace the picture: the record and the blob are both still there
//   6. Delete from the viewer: the record and the BLOB are gone, and the app
//      did not navigate away through a racing history marker.
//
// Runs at 390/dark and 320/light with the clock pinned.
// =============================================================================
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBrowserContext, resolveChromium, pinClock } from './browser-runtime.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = process.argv.includes('--required');
// Off by default: a check that rewrites tracked PNGs dirtied the tree on every
// `browser:verify` run. Pass `--screenshots` to refresh the evidence.
const wantScreenshots = process.argv.includes('--screenshots');
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

// PINNED: a weekday derived from the wall clock makes a check pass or fail by
// the day CI happens to run.
const today = '2026-11-19'; // Thursday
const CLOCK = Date.parse(`${today}T09:00:00+11:00`);
const addDays = (key, n) => { const d = new Date(`${key}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (key) => addDays(key, -(((new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7)));
const MON = mondayOf(today);
const EARLIER = addDays(today, -7);
const set = (w, r) => ({ c: true, w: String(w), r: String(r) });

function fixture(theme) {
  return {
    schemaVersion: 16, currentWeek: '1', activeProgramId: 'hybrid_engine', activeActivationId: 'measures_check',
    settings: {
      name: 'Measure Athlete', theme, weightUnit: 'kg', distanceUnit: 'km', weekStartDay: 'mon',
      onboardingComplete: true, modules: { running: true, fasting: false, health: true, recovery: true },
    },
    bodyWeightLog: [],
    bodyMeasurements: [],
    progressPhotos: [],
    weeks: {
      '1': {
        activationId: 'measures_check', dates: { mon: MON },
        lifts: { mon: { 'Barbell Bench Press': [set(100, 5), set(100, 5)] } },
        gymStats: { mon: { time: '50' } },
      },
    },
  };
}

const failures = [];
const ok = (condition, message) => { if (!condition) failures.push(message); };

/** A real, decodable PNG the capture path can downscale. */
async function pngBuffer(page, fromColor, toColor) {
  const dataUrl = await page.evaluate(([a, b]) => {
    const canvas = document.createElement('canvas');
    canvas.width = 480; canvas.height = 640;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 480, 640);
    grad.addColorStop(0, a); grad.addColorStop(1, b);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 480, 640);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(60, 120, 360, 40);
    ctx.fillRect(60, 480, 360, 40);
    return canvas.toDataURL('image/png');
  }, [fromColor, toColor]);
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

async function pickInto(page, selector, name, buffer) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 5000 }),
    page.click(selector),
  ]);
  await chooser.setFiles({ name, mimeType: 'image/png', buffer });
}

const countPhotos = (page) => page.evaluate((key) => {
  const state = JSON.parse(localStorage.getItem(key) || '{}');
  return Array.isArray(state.progressPhotos) ? state.progressPhotos.length : -1;
}, STORAGE_KEY);

/** Size + SHA-256 of a stored blob: the only way to prove REPLACE changed bytes. */
const blobSignature = (page, id) => page.evaluate(async (photoId) => {
  const db = await new Promise((resolve, reject) => {
    const open = indexedDB.open('HybridTrainingDB');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  const blob = await new Promise((resolve, reject) => {
    const req = db.transaction('photos', 'readonly').objectStore('photos').get(photoId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (!blob) return { size: 0, hash: '' };
  const buf = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return { size: blob.size, hash: [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('') };
}, id);

const countBlobs = (page) => page.evaluate(() => new Promise((resolve) => {
  const open = indexedDB.open('HybridTrainingDB');
  open.onerror = () => resolve(-1);
  open.onsuccess = () => {
    const db = open.result;
    try {
      const req = db.transaction('photos', 'readonly').objectStore('photos').count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(-2);
    } catch { resolve(-3); }
  };
}));

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
try {
  for (const [width, theme] of [[390, 'dark'], [320, 'light']]) {
    const context = await createBrowserContext(browser, { viewport: { width, height: 844 }, timezoneId: TZ, colorScheme: theme });
    await context.addInitScript(pinClock, CLOCK);
    await context.addInitScript(([key, value]) => localStorage.setItem(key, value), [STORAGE_KEY, JSON.stringify(fixture(theme))]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const photoA = await pngBuffer(page, '#22d3ee', '#8b5cf6');
    const photoB = await pngBuffer(page, '#f59e0b', '#ef4444');
    // A DISTINCT third image: replacing with an identical buffer would prove
    // nothing about whether the write happened.
    const photoC = await pngBuffer(page, '#10b981', '#facc15');

    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.bottom-nav [data-target="analytics"]', { timeout: 15000 });
    await page.click('.bottom-nav [data-target="analytics"]');
    await page.waitForSelector('#analytics-hub.active', { timeout: 15000 });

    // A brand-new athlete has no body data, so the Body BAND does not render —
    // which is why Measures needs a data-independent route. The quiet footer
    // destination is it; without this there was no way to record a first entry
    // from Progress at all.
    const footerLink = await page.$('#analytics-hub [data-action="open-analytics"][data-context="measures"]');
    ok(Boolean(footerLink), `${width}px: no route to Measures on an empty profile`);
    if (!footerLink) { failures.push(`${width}px: Measures is unreachable with no body data`); await context.close(); continue; }
    await footerLink.click();
    await page.waitForSelector('#analytics-measures.active', { timeout: 10000 });
    const empty = (await page.textContent('#analytics-measures')) || '';
    ok(/no entries yet/i.test(empty), `${width}px: Measures did not show an empty state`);

    // ---- first entry: photo + weight + waist + body fat -------------------
    await page.click('#analytics-measures .ms-screen__add');
    await page.waitForSelector('#measurementsSheet.active', { timeout: 5000 });

    const pickButton = await page.$eval('#msSheetPhoto [data-ms-photo-pick="library"]', (button) => {
      const rect = button.getBoundingClientRect();
      return { tag: button.tagName, height: Math.round(rect.height), text: (button.textContent || '').trim() };
    });
    ok(pickButton.tag === 'BUTTON' && pickButton.height >= 44, `${width}px: Add picture is not a 44px button (${JSON.stringify(pickButton)})`);

    await pickInto(page, '#msSheetPhoto [data-ms-photo-pick="library"]', 'a.png', photoA);
    const staged = await page.waitForFunction(() => {
      const img = document.querySelector('#msSheetPhotoPreview img');
      return img && img.getAttribute('src') ? true : false;
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    ok(staged, `${width}px: picking a picture did not stage a preview`);

    await page.fill('#msSheet_weight', '78.4');
    await page.fill('#msSheet_waist', '82');
    await page.fill('#msSheet_bodyFat', '18.5');
    await page.click('[data-action="save-measurements-sheet"]');
    await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'), { timeout: 8000 });

    const first = await page.evaluate((key) => {
      const state = JSON.parse(localStorage.getItem(key) || '{}');
      const photos = Array.isArray(state.progressPhotos) ? state.progressPhotos : [];
      const weight = (state.bodyWeightLog || []).find((row) => row.date === '2026-11-19');
      const tape = (state.bodyMeasurements || []).find((row) => row.date === '2026-11-19');
      return {
        photos: photos.length,
        photoDate: photos[0]?.date || '',
        weight: weight?.weight ?? null,
        waist: tape?.waist ?? null,
        bodyFat: tape?.bodyFat ?? null,
      };
    }, STORAGE_KEY);
    ok(first.photos === 1 && first.photoDate === today, `${width}px: the picture was not saved to its date (${JSON.stringify(first)})`);
    ok(first.weight === 78.4, `${width}px: the weigh-in did not save (${first.weight})`);
    ok(first.waist === 82, `${width}px: the waist did not save (${first.waist})`);
    ok(first.bodyFat === 18.5, `${width}px: body fat did not save (${first.bodyFat})`);

    // The entry row AND the strip thumbnail must hydrate from IndexedDB.
    const hydrated = await page.waitForFunction(() => {
      const row = document.querySelector('#analytics-measures .ms-entry img[data-photo-thumb]');
      const strip = document.querySelector('#analytics-measures .ms-screen__photos .pg-photo__img');
      return [row, strip].every((img) => img && img.getAttribute('src') && img.naturalWidth > 0);
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    ok(hydrated, `${width}px: the saved photo never hydrated on the Measures screen`);
    const rowText = (await page.textContent('#analytics-measures .ms-entry')) || '';
    ok(/78\.4/.test(rowText), `${width}px: the entry row does not show the weight (${rowText.trim()})`);
    ok(/82/.test(rowText), `${width}px: the entry row does not show the waist (${rowText.trim()})`);

    // Every control on this screen is a real target: +, See All, the entry and
    // its Delete. A 28px row action is the exact defect class this suite exists
    // to catch, and this screen is not walked by the touch-target check.
    const sizes = await page.evaluate(() => {
      const size = (el) => { const r = el.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
      const root = document.getElementById('analytics-measures');
      const out = {};
      for (const sel of ['.ms-screen__add', '.ms-screen__seeall', '.ms-entry__open', '.ms-entry__delete', '.pg-photo__open']) {
        const el = root.querySelector(sel);
        if (el) out[sel] = size(el);
      }
      return out;
    });
    // The KEY SET matters as much as the sizes: deleting a control must fail
    // this, and a loop that only checks the keys it happens to find cannot.
    const expectedControls = ['.ms-screen__add', '.ms-screen__seeall', '.ms-entry__open', '.ms-entry__delete', '.pg-photo__open'];
    const missing = expectedControls.filter((selector) => !(selector in sizes));
    ok(missing.length === 0, `${width}px: missing controls on Measures — ${missing.join(', ')}`);
    for (const [selector, [w, h]] of Object.entries(sizes)) {
      ok(h >= 44, `${width}px: ${selector} is ${w}x${h}, under the 44px target`);
    }

    // A picture picked then abandoned must leave no record behind: the sheet
    // stages it and only writes on Save, so Cancel/Escape cannot orphan a blob.
    await page.click('#analytics-measures .ms-screen__add');
    await page.waitForSelector('#measurementsSheet.active', { timeout: 5000 });
    await pickInto(page, '#msSheetPhoto [data-ms-photo-pick="library"]', 'abandoned.png', photoB);
    await page.waitForTimeout(400);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'), { timeout: 5000 });
    const abandoned = { records: await countPhotos(page), blobs: await countBlobs(page) };
    ok(abandoned.records === 1 && abandoned.blobs === 1, `${width}px: an abandoned picture was written (${JSON.stringify(abandoned)})`);

    // ---- second entry on an earlier date, for the compare picker ----------
    await page.click('#analytics-measures .ms-screen__add');
    await page.waitForSelector('#measurementsSheet.active', { timeout: 5000 });
    await page.fill('#msSheetDate', EARLIER);
    await page.dispatchEvent('#msSheetDate', 'change');
    await pickInto(page, '#msSheetPhoto [data-ms-photo-pick="library"]', 'b.png', photoB);
    await page.waitForFunction(() => {
      const img = document.querySelector('#msSheetPhotoPreview img');
      return img && img.getAttribute('src') ? true : false;
    }, { timeout: 8000 }).catch(() => {});
    await page.fill('#msSheet_weight', '79.1');
    await page.click('[data-action="save-measurements-sheet"]');
    await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'), { timeout: 8000 });
    const twoEntries = await page.waitForFunction(
      () => document.querySelectorAll('#analytics-measures .ms-entry').length === 2,
      { timeout: 8000 },
    ).then(() => true).catch(() => false);
    ok(twoEntries, `${width}px: the second entry did not appear`);
    ok(await countPhotos(page) === 2, `${width}px: expected two photo records`);

    // ---- library + side-by-side compare ----------------------------------
    const seeAll = await page.$('#analytics-measures .ms-screen__seeall');
    ok(Boolean(seeAll), `${width}px: See All is missing with two photos`);
    if (seeAll) {
      await seeAll.click();
      await page.waitForSelector('#analytics-measures .ms-library', { timeout: 5000 });
      const items = await page.$$eval('#analytics-measures .ms-library__item', (nodes) => nodes.length);
      ok(items === 2, `${width}px: the library shows ${items} photos, expected 2`);

      // Backup lives where the photos live: the ONLY path for photo bytes
      // (Android allowBackup=false) must not sit on a band that can be absent,
      // and an export nobody can restore is not a backup.
      const tools = await page.evaluate(() => {
        const root = document.getElementById('analytics-measures');
        const byAction = (action) => root.querySelector(`[data-action="${action}"]`);
        const size = (el) => { const r = el?.getBoundingClientRect(); return Math.round(r?.height || 0); };
        return {
          exportHeight: size(byAction('export-photos')),
          importHeight: size(byAction('import-photos')),
          bandExport: !!document.querySelector('[data-band="body"] [data-action="export-photos"]'),
        };
      });
      ok(tools.exportHeight >= 44, `${width}px: Export photos is missing or under 44px in the library`);
      ok(tools.importHeight >= 44, `${width}px: Import photos is missing or under 44px in the library`);
      ok(tools.bandExport === false, `${width}px: Export photos has two owners (library and Body band)`);

      // Export the REAL archive through the REAL button, so the restore below
      // is a backup round trip rather than a module-level smoke test.
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 8000 }),
        page.click('#analytics-measures [data-action="export-photos"]'),
      ]);
      const archivePath = await download.path();
      const archiveBytes = archivePath ? await readFile(archivePath) : Buffer.alloc(0);
      ok(archiveBytes.length > 100 && archiveBytes[0] === 0x50 && archiveBytes[1] === 0x4b,
        `${width}px: Export photos did not produce a zip archive`);

      // Thumbnails must hydrate in the library too.
      const libHydrated = await page.waitForFunction(() => {
        const imgs = [...document.querySelectorAll('#analytics-measures .ms-library__img')];
        return imgs.length === 2 && imgs.every((img) => img.naturalWidth > 0);
      }, { timeout: 8000 }).then(() => true).catch(() => false);
      ok(libHydrated, `${width}px: library thumbnails never hydrated`);

      const targetDate = await page.$eval('#analytics-measures .ms-library__open', (el) => el.getAttribute('data-photo-view'));
      ok(Boolean(targetDate), `${width}px: a library item has no date`);
      await page.click('#analytics-measures .ms-library__open');
      await page.waitForSelector('#photoViewer.active', { timeout: 5000 });
      const viewerTargets = await page.evaluate(() => {
        const root = document.getElementById('photoViewer');
        const out = {};
        for (const sel of ['[data-action="close-photo-viewer"]', '#photoViewerEdit', '#photoViewerReplace', '#photoViewerDelete', '#photoViewerComparePick']) {
          const el = root.querySelector(sel);
          if (el && !el.hidden) { const r = el.getBoundingClientRect(); out[sel] = Math.round(r.height); }
        }
        return out;
      });
      for (const [selector, height] of Object.entries(viewerTargets)) {
        ok(height >= 44, `${width}px: ${selector} is ${height}px tall in the viewer`);
      }
      ok(Object.keys(viewerTargets).length === 5, `${width}px: the viewer is missing a control (${Object.keys(viewerTargets).join(', ')})`);
      const pickerVisible = await page.$eval('#photoViewerPicker', (el) => !el.hidden);
      ok(pickerVisible, `${width}px: the compare picker is hidden with two photos`);

      const options = await page.$$eval('#photoViewerComparePick option', (nodes) => nodes.map((node) => node.value).filter(Boolean));
      ok(options.length >= 1, `${width}px: the compare picker has no second photo to choose`);
      if (options.length) {
        await page.selectOption('#photoViewerComparePick', options[0]);
        const compared = await page.waitForFunction(() => {
          const compare = document.getElementById('photoViewerCompare');
          const a = document.getElementById('photoViewerImgA');
          const b = document.getElementById('photoViewerImgB');
          return compare && !compare.hidden && a?.naturalWidth > 0 && b?.naturalWidth > 0;
        }, { timeout: 8000 }).then(() => true).catch(() => false);
        ok(compared, `${width}px: comparing two photos did not load both images`);
        if (wantScreenshots) {
          await page.screenshot({ path: path.join(ROOT, 'docs/mockups', `measures-compare-${width}.png`) });
        }
      }

      // ---- edit the entry the photo belongs to -------------------------
      // The hand-off must keep ONE history marker: closing the viewer and then
      // opening the sheet queued history.back() against the sheet's pushState,
      // the same race that blanked the page on Delete.
      const viewerDate = await page.$eval('#photoViewerDate', (el) => el.textContent.trim());
      await page.click('#photoViewerEdit');
      const sheetForEntry = await page.waitForSelector('#measurementsSheet.active', { timeout: 5000 }).then(() => true).catch(() => false);
      ok(sheetForEntry, `${width}px: Edit entry did not open the entry sheet`);
      ok(page.url().startsWith(BASE), `${width}px: Edit entry navigated away (${page.url()})`);
      if (sheetForEntry) {
        const sheetDate = await page.$eval('#msSheetDate', (el) => el.value);
        ok(sheetDate === targetDate, `${width}px: Edit entry opened the wrong date (${sheetDate} vs ${targetDate}, viewer said ${viewerDate})`);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.getElementById('measurementsSheet')?.classList.contains('active'), { timeout: 5000 });
      }

      // ---- replace: the SAME record with DIFFERENT bytes -----------------
      // Asserting `rows.every(updatedAt > 0)` was true before the action, so it
      // could never fail; the clock is pinned, so compare the blob itself.
      const beforeSig = await blobSignature(page, `photo:${targetDate}`);
      await page.click('#analytics-measures .ms-library__open');
      await page.waitForSelector('#photoViewer.active', { timeout: 5000 });
      const [replaceChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.click('#photoViewerReplace'),
      ]);
      await replaceChooser.setFiles({ name: 'replacement.png', mimeType: 'image/png', buffer: photoC });
      const replaced = await page.waitForFunction((key) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}');
        return (state.progressPhotos || []).length === 2;
      }, STORAGE_KEY, { timeout: 8000 }).then(() => true).catch(() => false);
      ok(replaced, `${width}px: replacing a photo changed the record count`);
      ok(beforeSig.size > 0, `${width}px: no stored bytes before the replace`);
      // Writing is async (downscale → IndexedDB), so POLL for the bytes to
      // change rather than reading once and racing the save.
      const bytesChanged = await page.waitForFunction(async ([photoId, beforeHash]) => {
        const db = await new Promise((resolve, reject) => {
          const open = indexedDB.open('HybridTrainingDB');
          open.onsuccess = () => resolve(open.result);
          open.onerror = () => reject(open.error);
        });
        const blob = await new Promise((resolve, reject) => {
          const req = db.transaction('photos', 'readonly').objectStore('photos').get(photoId);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => reject(req.error);
        });
        if (!blob) return false;
        const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
        const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
        return hash !== beforeHash;
      }, [`photo:${targetDate}`, beforeSig.hash], { timeout: 8000 }).then(() => true).catch(() => false);
      ok(bytesChanged, `${width}px: replacing a photo did not change the stored bytes (stayed ${beforeSig.size}B)`);
      ok(await countBlobs(page) === 2, `${width}px: the replace left the wrong number of blobs`);

      // ---- delete from the viewer ----------------------------------------
      await page.click('#analytics-measures .ms-library__open');
      await page.waitForSelector('#photoViewer.active', { timeout: 5000 });
      await page.click('#photoViewerDelete');
      await page.waitForSelector('.cmodal', { timeout: 5000 });
      await page.click('.cmodal__btn--danger');
      await page.waitForTimeout(900);

      ok(page.url().startsWith(BASE), `${width}px: deleting a photo navigated away (${page.url()})`);
      const afterDelete = { records: await countPhotos(page), blobs: await countBlobs(page) };
      ok(afterDelete.records === 1, `${width}px: the record survived a delete (${afterDelete.records})`);
      ok(afterDelete.blobs === 1, `${width}px: the blob survived a delete (${afterDelete.blobs})`);
      ok(page.url().startsWith(BASE), `${width}px: the app was left at ${page.url()}`);

      // ---- restore it from the archive --------------------------------
      // The delete above removed one photo AND its bytes; the export is the only
      // backup path, so the restore is what makes that deletion survivable.
      const importHeightNow = await page.evaluate(() => {
        const el = document.querySelector('#analytics-measures [data-action="import-photos"]');
        const r = el?.getBoundingClientRect();
        return Math.round(r?.height || 0);
      });
      ok(importHeightNow >= 44, `${width}px: Import photos disappeared after a delete`);
      const [importChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 5000 }),
        page.click('#analytics-measures [data-action="import-photos"]'),
      ]);
      await importChooser.setFiles({ name: 'photos.zip', mimeType: 'application/zip', buffer: archiveBytes });
      const restored = await page.waitForFunction(async ([key, want]) => {
        const state = JSON.parse(localStorage.getItem(key) || '{}');
        if ((state.progressPhotos || []).length !== want) return false;
        const count = await new Promise((resolve) => {
          const open = indexedDB.open('HybridTrainingDB');
          open.onerror = () => resolve(-1);
          open.onsuccess = () => {
            const req = open.result.transaction('photos', 'readonly').objectStore('photos').count();
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(-2);
          };
        });
        return count === want;
      }, [STORAGE_KEY, 2], { timeout: 8000 }).then(() => true).catch(() => false);
      ok(restored, `${width}px: importing the exported archive did not restore the deleted photo`);
    }

    if (errors.length) failures.push(`${width}px: browser errors — ${errors.join(' | ')}`);
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL: ${failure}`);
  console.error(`\nMeasures browser check failed (${failures.length}).`);
  process.exit(1);
}
console.log('Measures browser contract passed.');
