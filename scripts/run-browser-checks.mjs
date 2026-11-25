import { spawn } from 'node:child_process';
import os from 'node:os';
import { resolveConcurrency, resolveTimeoutSeconds, resolveRetries } from './lib/browser-runner-options.mjs';

const checks = [
  // First: it is the only check that publishes a non-zero safe-area inset, so a
  // regression that hides controls under the status bar surfaces before the
  // slower feature checks run.
  'scripts/safe-area-browser-check.mjs',
  // Theme-wide: proves no rendered text is the same colour as its surface in
  // either mode before the slower feature checks run.
  'scripts/theme-visibility-browser-check.mjs',
  'scripts/home-today-browser-check.mjs',
  'scripts/move-day-browser-check.mjs',
  'scripts/customize-browser-check.mjs',
  'scripts/settings-nav-browser-check.mjs',
  'scripts/settings-navigation-browser-check.mjs',
  'scripts/settings-components-browser-check.mjs',
  'scripts/settings-contextual-browser-check.mjs',
  'scripts/progress-hub-browser-check.mjs',
  'scripts/photo-browser-check.mjs',
  'scripts/measures-browser-check.mjs',
  'scripts/module-toggles-browser-check.mjs',
  'scripts/equipment-profiles-browser-check.mjs',
  'scripts/volume-guide-browser-check.mjs',
  'scripts/strength-volume-browser-check.mjs',
  'scripts/train-landing-browser-check.mjs',
  'scripts/session-outline-browser-check.mjs',
  'scripts/set-row-browser-check.mjs',
  'scripts/warmup-ramp-browser-check.mjs',
  'scripts/rest-timer-browser-check.mjs',
  'scripts/superset-browser-check.mjs',
  'scripts/finish-review-browser-check.mjs',
  'scripts/active-run-browser-check.mjs',
  'scripts/recovery-metric-browser-check.mjs',
  'scripts/bodyweight-browser-check.mjs',
  'scripts/import-browser-check.mjs',
  'scripts/muscle-load-browser-check.mjs',
  'scripts/running-analytics-check.mjs',
  'scripts/gym-performance-browser-check.mjs',
  'scripts/run-performance-browser-check.mjs',
  'scripts/recovery-performance-browser-check.mjs',
  'scripts/preview-viewport-check.mjs',
  'scripts/program-detail-viewport-check.mjs',
  'scripts/program-editor-browser-check.mjs',
  'scripts/active-program-edit-browser-check.mjs',
  'scripts/plan-recommendations-browser-check.mjs',
  'scripts/plans-json-browser-check.mjs',
  'scripts/opengym-plan-browser-check.mjs',
  'scripts/plans-active-banner-browser-check.mjs',
  'scripts/program-preview-consistency-browser-check.mjs',
  'scripts/jt-shed-simplified-browser-check.mjs',
  'scripts/workout-history-browser-check.mjs',
  'scripts/history-browser-check.mjs',
  'scripts/edit-saved-browser-check.mjs',
  'scripts/routines-browser-check.mjs',
  'scripts/exercise-picker-browser-check.mjs',
  'scripts/copy-program-browser-check.mjs',
  'scripts/modal-accessibility-check.mjs',
  'scripts/hybrid-dashboard-browser-check.mjs',
  'scripts/core-ergonomics-check.mjs',
  // Last: walks all four destinations, so it is the slowest of the a11y checks
  // and the most useful to read after the feature checks have had their say.
  'scripts/touch-target-browser-check.mjs',
  // Slowest in the suite (~90s: three full app boots, one with five years of
  // history). Last so it never delays a faster check's failure.
  'scripts/performance-baseline.mjs',
];

// Run EVERY check, then fail at the end.
//
// This used to exit on the first non-zero status. One environment-sensitive
// check — running-analytics-check, whose performance threshold takes ~15s on a
// slow machine against ~2s in CI — therefore hid the ~14 checks queued behind
// it, so a developer could not see the rest of the suite locally at all and had
// to rediscover each check by hand. A failure still fails the run; it just no
// longer suppresses the remaining evidence.
//
// `--bail` restores the old stop-on-first-failure behaviour for a fast local
// loop when you already know what you are looking for.
//
// Checks are independent (each binds port 0 and launches its own Playwright
// context), so they run through a small worker pool instead of one blocking
// spawnSync at a time. Output is buffered per check and printed as one block
// when it finishes: the suite is 42 checks and ~7 minutes serially, mostly
// browser startup, so overlapping them is the difference between a coffee and
// a glance. `--serial` restores the sequential loop when debugging.
const args = process.argv.slice(2);
const bail = args.includes('--bail');

let concurrency;
let timeoutSeconds;
let retries;
try {
  concurrency = resolveConcurrency(args, os.availableParallelism?.() ?? os.cpus().length);
  timeoutSeconds = resolveTimeoutSeconds(args);
  retries = resolveRetries(args);
} catch (err) {
  console.error(`browser:verify — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
}

const failed = [];
let ran = 0;
let retried = 0;
let nextIndex = 0;
let bailing = false;
const startedAt = Date.now();
/** @type {Set<import('node:child_process').ChildProcess>} */
const activeChildren = new Set();

/** Kill the check and everything it spawned (Chromium lives in that group). */
function killTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') child.kill('SIGKILL');
    else process.kill(-child.pid, 'SIGKILL');
  } catch {
    try { child.kill('SIGKILL'); } catch { /* already gone */ }
  }
}

// Ctrl-C must not leave 3 Chromium trees running in the background.
for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM'])) {
  process.on(signal, () => {
    for (const child of activeChildren) killTree(child);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}

/**
 * Run one attempt of a check. Resolves with its buffered output rather than
 * printing, so a timed-out attempt can be retried before the final block.
 *
 * @param {string} check
 * @returns {Promise<{status:number, output:string, seconds:string, timedOut:boolean}>}
 */
function runAttempt(check) {
  const started = Date.now();

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [check, '--required'], {
      cwd: process.cwd(),
      env: { ...process.env, OPENHYBRID_BROWSER_REQUIRED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
      // A dedicated process group lets one kill take the check's Chromium with it.
      detached: process.platform !== 'win32',
    });
    activeChildren.add(child);

    let output = '';
    let timedOut = false;
    let settled = false;
    /** @type {NodeJS.Timeout|undefined} */
    let timer;

    const finish = (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeChildren.delete(child);
      resolve({
        status: timedOut ? 124 : (typeof code === 'number' ? code : 1),
        output,
        seconds: ((Date.now() - started) / 1000).toFixed(1),
        timedOut,
      });
    };

    timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutSeconds * 1000);

    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { output += chunk.toString(); });
    child.on('error', (err) => {
      output += `${err.stack || err.message}\n`;
      if (!child.pid) finish(1);
    });
    child.on('close', finish);
  });
}

/** @param {number} index */
async function runCheck(index) {
  const check = checks[index];
  const started = Date.now();
  console.log(`▶ ${check}`);

  let result;
  let attemptsUsed = 0;
  for (let attempt = 0; attempt <= retries; attempt++) {
    result = await runAttempt(check);
    attemptsUsed = attempt;
    if (!result.timedOut || attempt === retries) break;
    retried++;
    console.log(`↻ ${check} timed out after ${timeoutSeconds}s — retrying (${attempt + 1}/${retries})`);
    // Keep a hung attempt's evidence, but do not let it masquerade as the
    // successful attempt's output in the final block.
    if (result.output) {
      process.stdout.write(result.output.endsWith('\n') ? result.output : `${result.output}\n`);
    }
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const verdict = result.status === 0
    ? (attemptsUsed > 0 ? 'PASS (retry)' : 'PASS')
    : (result.timedOut ? 'FAIL (timeout)' : 'FAIL');
  if (result.timedOut) {
    result.output += `\n[runner] ${check} exceeded ${timeoutSeconds}s and was killed.\n`;
  }
  // One write per check keeps concurrent blocks from interleaving mid-line.
  process.stdout.write(`\n=== ${check} — ${verdict} (${seconds}s) ===\n${result.output}${result.output.endsWith('\n') || !result.output ? '' : '\n'}`);
  if (result.status !== 0) {
    failed.push({ check, status: result.status, index });
    if (bail) bailing = true;
  }
  ran++;
}

async function worker() {
  while (!bailing) {
    const index = nextIndex++;
    if (index >= checks.length) return;
    await runCheck(index);
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, checks.length) }, () => worker()));

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
const retryNote = retried ? `, ${retried} timeout retr${retried === 1 ? 'y' : 'ies'}` : '';
if (failed.length) {
  // Counts describe what actually RAN. Reporting "N passed" for checks that were
  // never executed (the --bail case) would be the same kind of false reassurance
  // the stop-on-first-failure behaviour was hiding.
  failed.sort((a, b) => a.index - b.index);
  const skipped = checks.length - ran;
  console.error(`\n${failed.length} of ${ran} browser checks run FAILED (${elapsed}s at concurrency ${concurrency}${retryNote}):`);
  for (const { check, status } of failed) console.error(`  ✗ ${check} (exit ${status})`);
  console.error(`${ran - failed.length} passed${skipped ? `, ${skipped} not run (--bail)` : ''}.`);
  process.exitCode = failed[0].status;
} else {
  console.log(`\nAll ${checks.length} required browser checks passed in ${elapsed}s (concurrency ${concurrency}${retryNote}).`);
}
