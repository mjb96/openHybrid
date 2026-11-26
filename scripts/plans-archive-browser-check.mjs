// =============================================================================
// PLANS ARCHIVE BROWSER CHECK — roadmap §22 (PL3)
// -----------------------------------------------------------------------------
// A plan that has been trained must not be deletable: activations store a
// programId, not a name, so removing the record makes History fall back to a
// generic title. This check proves the real surface offers Archive instead of
// Delete for a trained plan, hides it without destroying the record, and lets
// it back through Restore.
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
    if ((req.url || '').split('?')[0] === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    const rel = (req.url || '/') === '/' ? 'index.html' : decodeURIComponent((req.url || '').split('?')[0]).replace(/^\//, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(`${ROOT}${path.sep}`) && file !== path.join(ROOT, 'index.html')) throw new Error('unsafe path');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(body);
  } catch { if (!res.headersSent) res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const BASE = `http://127.0.0.1:${/** @type {any} */ (server.address()).port}/index.html`;
const STORAGE_KEY = 'hybrid_engine_v2_state';
const CLOCK = new Date('2026-08-03T09:00:00+10:00').getTime();

const program = (id, name) => ({
  id, name, totalWeeks: 4,
  dossier: { focus: 'Strength' },
  days: { mon: { title: 'Upper', badge: 'UPPER', runs: 'Rest', lifts: ['Bench Press'] } },
  weeklyVolModifiers: { 1: { sets: 3, reps: '6-8', intensityLabel: 'Build' } },
});

const SEED = {
  schemaVersion: 5,
  currentWeek: '1',
  activeProgramId: 'prog_active',
  activeActivationId: 'act_active',
  settings: { name: 'Athlete', onboardingComplete: true, theme: 'dark', weightUnit: 'kg', fitnessGoal: 'strength', fitnessLevel: 'beginner' },
  customPrograms: [program('prog_active', 'Active Block'), program('prog_trained', 'Trained Block'), program('prog_fresh', 'Fresh Block')],
  activations: [
    { id: 'act_active', programId: 'prog_active', startWeek: 1 },
    { id: 'act_trained', programId: 'prog_trained', startWeek: 1 },
  ],
  programLibrary: { bookmarks: [], completions: [], recentlyViewed: [] },
  weeks: {},
};

const browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
const failures = [];
const check = (condition, message) => {
  if (condition) console.log(`  ok · ${message}`);
  else { failures.push(message); console.error(`FAIL: ${message}`); }
};
const openMenu = async (page, id) => {
  await page.click(`#progLibraryContent .plan-row[data-program-id="${id}"] [data-action="open-plan-menu"]`);
  await page.waitForSelector('.action-menu [role="menuitem"]', { timeout: 6000 });
  return page.locator('.action-menu').innerText();
};

try {
  const context = await createBrowserContext(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await context.addInitScript(([k, v]) => localStorage.setItem(k, v), [STORAGE_KEY, JSON.stringify(SEED)]);
  await context.addInitScript(pinClock, CLOCK);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.click('.bottom-nav .nav-item[data-target="program"]');
  await page.waitForSelector('#progLibraryContent .plan-row', { timeout: 8000 });

  // ── A trained plan offers Archive, never Delete ──────────────────────────
  const trainedMenu = await openMenu(page, 'prog_trained');
  console.log('trained menu:', JSON.stringify(trainedMenu));
  check(/Archive/i.test(trainedMenu), 'a trained plan offers Archive');
  check(!/^Delete$/m.test(trainedMenu), 'a trained plan does not offer Delete');
  await page.keyboard.press('Escape');

  // ── An untrained plan still deletes ──────────────────────────────────────
  const freshMenu = await openMenu(page, 'prog_fresh');
  check(/Delete/.test(freshMenu), 'an untrained plan still offers Delete');
  check(!/Archive/.test(freshMenu), 'an untrained plan has nothing to archive');
  await page.keyboard.press('Escape');

  // ── Archive hides it without destroying the record ───────────────────────
  await page.click('#progLibraryContent .plan-row[data-program-id="prog_trained"] [data-action="open-plan-menu"]');
  await page.waitForSelector('.action-menu [data-action="archive-program"]', { timeout: 6000 });
  await page.click('.action-menu [data-action="archive-program"]');
  await page.waitForTimeout(400);

  const afterArchive = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    const record = (state.customPrograms || []).find((p) => p.id === 'prog_trained');
    return {
      recordExists: !!record,
      archived: !!record?.archived,
      rowGone: !document.querySelector('#progLibraryContent .plan-row[data-program-id="prog_trained"]'),
      archivedDisclosure: (document.querySelector('.plans-archived__summary')?.textContent || '').trim(),
      activationStillNamesIt: (state.activations || []).some((a) => a.programId === 'prog_trained'),
    };
  }, STORAGE_KEY);
  console.log('after archive:', JSON.stringify(afterArchive));
  check(afterArchive.recordExists && afterArchive.archived, 'the plan record is kept and marked archived');
  check(afterArchive.rowGone, 'the archived plan leaves the plan list');
  check(/Archived \(1\)/.test(afterArchive.archivedDisclosure), `an Archived section appears (${afterArchive.archivedDisclosure})`);
  check(afterArchive.activationStillNamesIt, 'the activation still references the plan, so history keeps its name');

  // ── Restore puts it back ────────────────────────────────────────────────
  await page.click('.plans-archived__summary');
  await page.click('.plans-archived [data-action="restore-program"][data-program-id="prog_trained"]');
  await page.waitForTimeout(400);
  const restored = await page.evaluate((key) => {
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    const record = (state.customPrograms || []).find((p) => p.id === 'prog_trained');
    return {
      archived: !!record?.archived,
      rowBack: !!document.querySelector('#progLibraryContent .plan-row[data-program-id="prog_trained"]'),
    };
  }, STORAGE_KEY);
  check(!restored.archived && restored.rowBack, 'Restore brings the plan back to the list');

  check(errors.length === 0, `no page errors (${errors.join(' | ') || 'none'})`);
  await context.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  failures.forEach((f) => console.error(`FAIL: ${f}`));
  process.exit(1);
}
console.log('Plans archive contract passed.');
