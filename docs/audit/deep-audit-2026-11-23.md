# openHybrid — Deep Audit

**Commit:** `34514dd0642d079d39d003b04d86208adb0fee8b` (detached HEAD, clean tree)
**Date:** 2026-11-23
**Auditor:** Deep-Audit Orchestrator (single accountable owner; seven read-only specialist streams supplied evidence, all verdicts re-checked here)
**Scope:** the whole repository — `js/`, `css/`, `index.html`, `sw.js`, `android/`, `scripts/`, `tests/`, `docs/`, plus a live runtime campaign against the real app at 320/390 in Chromium.
**Posture:** audit only. No application, test, Android or doc file was modified. This file is the only working-tree change (proved in §11).

---

## 1. Verdict and release readiness

**Verdict: not ready for a public release. The engine is sound and the gaps are concentrated and fixable — but ten P1s sit on exactly the surfaces a local-first health app is judged by: backup, numbers, readability, and the coaching signal a new athlete sees first.**

The engineering baseline is genuinely strong. 2,619 unit tests and 48 real-Chromium product checks pass on this commit with no retries; corrupt/future-schema state fails closed instead of silently resetting; migrations run stepwise and idempotently; the app makes **zero** backend calls (`grep` finds no `fetch(`/`XMLHttpRequest`/Supabase client anywhere in shipped JS); the calendar-week engine is the real source for volume, runs and PRs (the program-week counter no longer leaks into them — though the hub's own denominator and five walk readers still get it wrong, §5 D); and the touch-target/accessibility checks measure 2,834 real controls rather than reading CSS.

What is *not* ready is the promise around **backup, export and reporting**, which is where a local-first app's credibility lives (`AGENTS.md`: "local data, JSON/CSV export and Android automatic backups are the whole persistence story"). The defects converge on four fronts:

1. **Backups and exports quietly lie or lose detail.** The photo backup writes nothing on Android while reporting "Photos exported ✓" (AUD-A-1); the spreadsheet export drops every hold, carry, set type and effort value (AUD-A-4); a plan exported as `openhybrid-plan` comes back with all per-lift prescriptions collapsed to a uniform 4×10 while still advertising its progression model (AUD-C-3); and untrusted imported text becomes a live spreadsheet formula in the athlete's own CSV (AUD-A-3).
2. **The Progress hub and Home misreport training.** The hub divides *sessions* by planned *days*, so a compliant hybrid week reads "8 / 4 sessions" and a week of runs-only reads "100 % of planned sessions" beside "No sets" (AUD-D-1); walks are counted and paced as runs on Home, the day recap, Year in Review and the Hybrid Score (AUD-D-2).
3. **Accessibility breaks on surfaces no check opens.** The universal confirm dialog renders 1.15:1 text in light mode (AUD-E-1); a ticked set renders its own logged number at 1.18:1 in light mode (AUD-CSS-A-1); History, Quick Activity and Session Recap sit under the status bar on a notchless Android phone because they pad from `env()` instead of `--safe-top` (AUD-E-2). All three are defect classes `AGENTS.md` documents, on states and surfaces the 48-check suite never visits.
4. **Three privacy/health surfaces fall short of the project's own written rules.** Crash reporting is live with a scrubber that leaves `message`/`extra`/`tags` intact (AUD-F-1); every mapped run streams live coordinates to a tile CDN (AUD-F-2); and fasting *notifications* ship the autophagy/hormone/metabolic claims the codebase explicitly bans (AUD-F-3).

None of these corrupts the on-device state. All of them are dishonest, unreadable or lossy at a boundary the athlete is told to trust: their backup, their history, their dashboard, their screen, their privacy.

**Top five risks**

| # | Risk | Severity |
|---|---|---|
| 1 | Android photo-zip export writes no file but reports success — the only backup path for photo bytes | P1 |
| 2 | Progress hub reports "8 / 4 sessions" and 100 % adherence for a runs-only week; walks counted as runs on Home/recap/Year-in-Review/Hybrid Score | P1 ×2 |
| 3 | Light mode is unreadable in two places — the confirm dialog (1.15:1) and a **ticked set** (1.18:1); History/recap/quick-activity sit under the status bar on notchless Android | P1 ×3 |
| 4 | Rest chosen in the set sheet is ignored by the very next set; **every new user is told they are "Substantially above baseline"**; Health Connect drops "today" and turns one error into a revoked permission | P1 ×3 |
| 5 | Export & privacy clusters: CSV loses holds/carries/effort and carries live formulas; plan JSON loses per-lift prescriptions; live Sentry with partial scrubbing; live GPS to tile servers; banned fasting claims; "Reset All Data" leaves a full copy behind | P2 (§5, §13) |

**Release blockers that are not code:** the legal documents still contain `{{PLACEHOLDER}}` tokens (`docs/legal/privacy-policy.md` 10 occurrences, `terms-of-service.md` 7) and Sentry retention/controller/contact are unfilled. Store submission is explicitly parked, so this is a human task, listed here so it is not discovered at submission time. Android runtime behaviour is **unverified** — see §10.

---

## 2. Baseline (recorded before any finding)

### Repository state
```
$ git rev-parse HEAD
34514dd0642d079d39d003b04d86208adb0fee8b
$ git status --short
(empty — clean tree)
$ git rev-parse --abbrev-ref HEAD
HEAD            # detached; no branch checked out
$ git log --oneline -5
34514dd Merge pull request #305 from mjb96/progress/measures
b7cdb02 fix(photos): a picked picture is decoded once, and previewed as the canvas
c6564cc feat(progress): Measures — one dated entry for weight, tape, body fat and photos
a5cd282 Merge pull request #304 from mjb96/progress/p1-pulse
e245dfd Merge remote-tracking branch 'origin/main' into progress/p1-pulse
```

### `npm run verify` — **exit 0**
| Step | Result |
|---|---|
| `tsc -p jsconfig.json` | pass (no output) |
| `gen-precache.mjs --check` | pass — "sw.js precache manifest is up to date." |
| `verify-workflow-gates.mjs` | pass — "Workflow gates verified: Pages and signed releases require web + Android checks." |
| `node --test` | **tests 2619 · pass 2619 · fail 0 · cancelled 0 · skipped 0 · todo 0** · 12.76 s |
| `scripts/smoke.mjs` | pass — "app graph imported and home rendered without throwing" |

Run twice (once via `verify`, once via `node --test --experimental-test-coverage`): **identical results, 2,619/2,619**. No pre-existing failures, no skipped tests, no todo tests.

### `npm run browser:verify` — **exit 0, 48/48 checks**
```
All 48 required browser checks passed in 253.5s (concurrency 3).
```
- **Retries: none.** No check reported a retry or a timeout; no `SKIP`.
- Slowest: `progress-hub-browser-check` 121.2 s, `rest-timer-browser-check` 42.0 s, `set-row-browser-check` 41.7 s, `plans-json-browser-check` 33.2 s, `active-run-browser-check` 31.5 s.
- `touch-target-browser-check`: **2,834 visible controls measured across 15 surfaces**, 1 control on a documented geometric floor (the carousel dots).

### `npm run perf:baseline` (last check of the suite)
| Assertion | Measured | Budget |
|---|---|---|
| first paint not render-blocked (online) | **140 ms** | < 3000 ms |
| first paint not render-blocked (offline) | **140 ms** | < 3000 ms |
| DOM bounded as history grows | **150 → 150 nodes = 1.00×** | < 1.35× |
| renders fully offline | 150 nodes in the active view | must render |

Wall-clock is reported, never asserted (per the harness's own design).

### Coverage (`node --test --experimental-test-coverage`, Node 24.16.0)
```
all files   78.75 % lines   79.30 % branches   74.74 % functions     (334 files in report)
```
Notable: `js/engine.js` 91.5/89.5, `js/programs/catalog/*` 100, `js/analytics/running-detail.js` 98.0/89.1 — but `js/workout.js` **55.7 / 34.0**, `js/state.js` **59.0 / 25.7**, `js/analytics/charts.js` 34.0, `js/gps-tracker.js` 26.6, `js/analytics.js` 19.7. `js/app.js`, `js/settings.js`, `js/home.js`, `js/program_builder.js` **do not appear in the report at all** — the unit suite never imports them.

### Inventory
| Area | Files | Lines |
|---|---|---|
| `js/**` | 325 | 88,850 (incl. `js/vendor/fit-parser.js` 11,406) |
| `css/**` | 6 | 18,808 |
| `tests/**` | 284 | — |
| `scripts/**` | 63 | — |
| `android/**` | 53 | — |
| `supabase/**` | **0 tracked files (empty directory)** | — |
| `docs/**` | 41 | — |

Largest own-source modules: `js/workout.js` 2,604 · `js/app.js` 2,506 · `js/settings.js` 1,689 · `js/programs/detail.js` 1,309 · `js/programs/library.js` 1,235 · `js/analytics.js` 1,009 · `js/state.js` 991.

### Environment
| Item | Value |
|---|---|
| OS | macOS 15.6.1 (24G90), darwin |
| Node | **v24.16.0** — repo `engines` declares `>=20 <23` (mismatch; CI pins Node 20) |
| npm | 11.13.0 |
| Playwright / Chromium | 1.65.1 / chromium-1255 + headless shell |
| Java | OpenJDK 26.0.1 (CI uses 17) |
| Android SDK | platform-tools + platforms + build-tools present |
| Android emulator | **absent** — no `emulator`, no `system-images`, no `adb`, no `gradle`/`gradlew` |

**Android is STATIC ONLY for this audit.** Every Android finding below is a code-reading claim; none was observed on a device or emulator. Device checklists are in `docs/android-*-device-checklist.md` and remain the human's task.

---

## 3. Top findings (P0/P1)

**No P0 was found.** Nothing on this commit permits silent loss of on-device state, exposes a secret, bypasses the origin check, or crashes a core path. The **ten** P1s below are the whole P1 set. Each is either reproduced here (with the command or measurement) or explicitly marked **static only** — none is asserted from a function name or a document.

### P1 — AUD-A-1 · The Android photo backup writes no file and says "Photos exported ✓"
**Area:** `js/portability/export-service.js` + `android/.../MainActivity.kt` · **Type:** data-loss · **Confidence:** high (static; Android runtime untested)

`saveBinaryExport` builds a `blob:` URL, clicks an anchor, and returns `{ status: 'saved' }`:
```js
// js/portability/export-service.js:156-173
const url = Url.createObjectURL(blob);
...
anchor.click();
return { status: 'saved', filename: file.filename };
```
The Android shell's only download handler has no `blob:` branch and no binary bridge method:
```kotlin
// MainActivity.kt:261-290
when {
    url.startsWith("data:") -> { ... }
    url.startsWith("http://") || url.startsWith("https://") -> { ... }
}
```
```kotlin
// FileExportBridge.kt:28-29 — the ONLY @JavascriptInterface method
@JavascriptInterface
fun saveTextFile(filename: String, content: String, mime: String, callbackId: String)
```
`js/analytics.js:298-304` then shows `exportResultMessage(result, 'Photos')` → **"Photos exported ✓"**.

**Expected vs actual:** a zip on disk, or an honest failure. Actual: nothing is written, and the athlete is told it was. `exportPhotosZip` has exactly one caller (`js/analytics.js:295`), so this is the only export path for photo bytes on the platform where `allowBackup="false"` and photos live in IndexedDB.

**Impact:** an Android athlete's "backup" is empty. The loss only materialises when they later need it — at which point the photos are gone. This also contradicts the module's own contract ("reports honestly when it cannot", `export-service.js:4-6`) and `AGENTS.md`'s "an export nobody can restore is not a backup".

**Reproduction:** static trace of all three files; the browser path is genuinely tested (`scripts/measures-browser-check.mjs:315-324` awaits a real `download` event), which is exactly why the Android gap is invisible to CI.

**Fix sketch:** in `saveBinaryExport`, when a `HybridFileExportBridge` exists but exposes no binary method, return `{status:'error'}` instead of `saved`; then add `saveBinaryFile(filename, base64, mime, cb)` to `FileExportBridge` and prefer it. Also refuse to claim success when `archive.count === 0` while `listPhotos().length > 0` (`photos/library.js:130` silently skips a photo whose blob is missing).

---

### P1 — AUD-B-2 · Rest you just chose in the set sheet is ignored for the rest of the session
**Area:** `js/workout/set-mutations.js` → `js/timers.js` · **Type:** correctness (silent) · **Confidence:** high

`setSetRest` writes the preference to state and clears the row override:
```js
// js/workout/set-mutations.js:548-550
setExerciseRestOverride(_getState(), liftName, seconds == null ? null : seconds);
if ('restSec' in sets[setIndex]) delete sets[setIndex].restSec;
_saveState(true);
```
but the timer engine resolves from its own module-level copy:
```js
// js/timers.js:42, 70, 226
let _restOverrides = {};
export function setRestOverrides(o) { _restOverrides = (o && typeof o === 'object') ? { ...o } : {}; }
... restOverrides: _restOverrides,
```
and the ungrouped tick path never passes the fresh map:
```js
// js/workout.js:1194-1196
if (groupDuration == null) {
  triggerRestTimerEngine(liftName, setRpe, setType, planRest, set?.restSec);
```
`setRestOverrides` is only called at boot (`js/settings.js:1667`), on the exercise-options Save (`js/workout/exercise-options.js:203`) and on reset (`js/settings.js:609`). Note the circuit path at `js/workout.js:1189` *does* pass `appState.settings.restOverrides` — so the same session behaves differently depending on whether the lift is in a superset.

**Expected vs actual:** "so every set of that lift — and the next session — resolves the same rest" (`set-mutations.js:543-547`, the code's own comment). Actual: the immediately following set uses the movement tier (measured: `Bicep Curl` → 90 s from the tier, versus 200 s with the override), while the row label updates to 4:00. The UI says one thing and the timer does another.

**Reproduction:** `node` against `js/workout/rest-duration.js` with `restOverrides: {}` vs `{ 'Bicep Curl': 200 }`; confirmed by reading the only three `setRestOverrides` call sites (`grep -rn setRestOverrides js/`).

**Fix sketch:** in `setSetRest`, push the new map to the engine (`setRestOverrides(_getState().settings.restOverrides)`) — the same call `exercise-options.js:203` already makes, so no new dependency direction.

---

### P1 — AUD-D-1 · Progress hub compares **sessions** against planned **days**: "8 / 4 sessions", 100 % adherence for half the work
**Area:** `js/analytics/progress-landing.js`, `views/view-progress-hub.js` · **Type:** correctness · **Confidence:** high (probe re-run by me)

```js
// js/analytics/progress-landing.js:168-170, 206
const trained = trainedSessionsIn(...);
const planned = plannedTrainingDays(plan);      // a DAY count
...
unit: planned ? `of ${planned} planned` : '',
// :494-495
adherencePct = Math.min(100, Math.round((currentWeek.sessions / plannedSessions) * 100));
```
`js/analytics/pulse.js:171-174` states the rule and why it exists: *"Comparing total sessions (strength + every run) against planned DAYS produced '10 of 4' and labelled 100 % adherence for a week where the planned lifts were skipped but runs were logged."*

**Measured (`node /tmp/aud-d/probe3b.mjs`, `probe4.mjs`; 4-day hybrid plan = 4 planned days, 8 sessions):**
- full compliance → hero **`8 / 4 sessions`**, `adherence 100`, Consistency headline `{"value":"8","unit":"of 4 planned"}`
- all lifting skipped, 4 runs only → hero **`4 / 4 sessions`**, `100 % of planned sessions`, copy *"You have hit all 4 planned sessions this week."* while the Strength domain on the same screen reads **`No sets`**

**Impact:** the main Progress surface states an arithmetically impossible headline and certifies a week in which none of the prescribed lifting happened. Reachable by anyone whose day can hold two sessions — the exact hybrid case the app is built for — and by anyone who logs a run on a lifting day. `Math.min(100, …)` additionally hides over-achievement.

**Fix sketch:** use `classifyPlannedSession` (which already returns `hasGym`/`hasRun`) to count planned **sessions**, or adopt Pulse's `completedPlannedDays/plannedDaysElapsed` for adherence and label the days honestly. Remove or label the `Math.min(100, …)` cap.

---

### P1 — AUD-D-2 · Walk distance and walk count are reported as **running** on Home, the day recap, Year in Review and Hybrid Score
**Area:** `js/home/hybrid-dashboard.js`, `js/home/week-view.js`, `js/brain/year-review.js`, `js/analytics/week-chart-model.js`, `js/brain/hybrid-score/pillars.js` · **Type:** correctness · **Confidence:** high (probe re-run by me)

`runWeekTotals` sums every session with no walk filter:
```js
// js/home/hybrid-dashboard.js:55-64
for (const daySessions ...) { const dist = Number(summary.dist) || 0; km += dist; sessions += daySessions.length; }
// :239-241
`${e.sessions} run${...}`
```
`AGENTS.md` states the rule twice — "Runs and walks never merge: `runKm` excludes walks, `walkKm` excludes runs" and "**every `running.*` metric is run-only**". `running-detail.js:319` and `endurance.js:70-87` obey it; these five readers do not.

**Measured (`node /tmp/aud-d/probe2.mjs`, one 5 km/60 min walk + one 10 km/50 min run in one week):**
- Home Endurance card: `km 15` (should be 10), `sessions 2`, sub-line **`2 runs · 7:20 /km`** (should be `1 run · 5:00 /km`)
- day recap: `{"title":"Run","distanceKm":15,"runCount":2}`
- Year in Review: `totals.distanceKm 15` under the label `Run`
- a walk-only week renders `5.0 km · 1 run · 12:00 /km` and marks the week as worked

**Impact:** walkers are a first-class population (`run.type === 'walk'`, walk quick-start, wal km reported separately in Progress). On the landing surface their walking pace is presented as running pace, and the annual summary overstates run distance. It also feeds the endurance pillar of the Hybrid Score.

The coverage-completion pass found a sixth surface: **Run Performance** (`js/analytics/views/view-run-performance.js:122` `${model.recordCount} … 'runs'`, with `run-performance.js:50` counting every `collectRunningHistory` entry). A walker's 12 walks read as "12 runs", and the evidence rows print a walk's pace (`:89`) even though the model marks it `paceEligible: false` precisely to keep walk pace out of running pace. The only disclosure is buried in a method `<details>`.

**Fix sketch:** one shared splitter (the shape of `endurance.js:70-87`) used by all six readers; label the merged metric "Distance" or keep a separate walk line rather than calling a walk a run.

---

### P1 — AUD-E-1 · The confirm dialog is unreadable in light mode
**Area:** `js/ui/confirm-modal.js` + light theme · **Type:** a11y · **Confidence:** high (measured)

The component injects its own `<style>` with a hard-coded dark panel and then colours the title with a token that flips dark in light mode:
```js
// js/ui/confirm-modal.js:32-38
background: linear-gradient(180deg, rgba(30,34,48,0.98), rgba(20,24,36,0.98));
.cmodal__title { color: var(--text-inverse,#f8fafc); }
```
```css
/* css/styles.css:122 → 3847 */
--text-inverse: var(--text-primary);   /* light: #0f172a */
```
**Measured (light):** title `rgb(15,23,42)` on `rgb(30,34,48)` = **1.15:1** (message 2.1:1, cancel 2.4:1). Dark: 12.9:1.

**Impact:** every destructive confirmation in the app goes through this component — delete activity, delete photo, delete measure entry, discard run, reset settings. A light-mode athlete cannot read the question they are answering. No browser check opens `confirmModal` at all, which is why it survived.

**Fix sketch:** theme the panel from `--bg-card`/`--bg-deep` + a border token, or add a `html[data-theme="light"] .cmodal` override; stop aliasing `--text-inverse` to `--text-primary` for text that sits on a dark panel.

---

### P1 — AUD-E-2 · History, Quick Activity and Session Recap sit under the status bar on a notchless Android phone
**Area:** `css/styles.css` safe-area tokens · **Type:** a11y / correctness · **Confidence:** high (code + measured)

Three full-screen surfaces pad from `env()` only:
```css
/* css/styles.css:9223, 9234, 9579 */
#sessionRecapScreen { padding: calc(16px + env(safe-area-inset-top, 0px)) … }
#activitiesScreen   { padding: calc(12px + env(safe-area-inset-top, 0px)) … }
#activityScreen     { padding: calc(16px + env(safe-area-inset-top, 0px)) … }
```
`var(--safe-top)` appears **zero** times in those ranges, while the correct form exists elsewhere (`:262`, `:4471`, `:9602`).

The CSS reading pass found the same defect one level down, on the sticky topbar itself:
```css
/* css/styles.css:9241, 9248 */
top: calc(-12px - env(safe-area-inset-top, 0px));
padding: calc(12px + env(safe-area-inset-top, 0px)) 18px 8px;
```
`var(--safe-top)` exists at `:9653` and is used by `.migration-recovery` at `:9602` — the pattern is known in the codebase, just not applied here.

**Measured (48 px published inset, as `MainActivity.kt` does):** History `padding-top: 12px`; the back button top is 24, so 24 of its 44 px are occluded; `<h1>History</h1>` (top 37–55) is entirely behind the status bar.

**Impact:** `AGENTS.md` names this exact defect class — *"the Android WebView is edge-to-edge but only reports `env(safe-area-inset-top)` for a DISPLAY CUTOUT — on a notchless phone `env()` is 0px and env-only CSS silently does nothing."* History is reachable from Home, Train and every recap; Quick Activity and Session Recap are the live-run and session-end surfaces. It survives because `scripts/safe-area-browser-check.mjs` never opens these three screens and `tests/safe_area_guard.test.js:83-97` lists only three other surfaces.

**Fix sketch:** use `var(--safe-top)`/`var(--safe-bottom)` on the three rules plus `.activity-action-menu` and `.activity-undo-bar`, keeping the env() line first; add the three selectors to the guard test and open History in the safe-area check.

---

### P1 — AUD-F-3 · The fasting copy rule is enforced in one renderer; four shipping surfaces violate it
**Area:** `js/fasting/fasting-nudge.js`, `js/analytics/views/view-fasting.js`, `js/fasting/fasting-insights.js` · **Type:** health claims · **Confidence:** high (verified)

`AGENTS.md` P7 sets a hard copy rule — *"elapsed time against the athlete's own goal; no autophagy, fat-loss, hormone, metabolic or stage claim, and a test greps the rendered output for those words"* — and `tests/fasting_band.test.js:63` greps **only** `renderFastingBand()`.

```js
// js/fasting/fasting-nudge.js:19-25 — pushed to the OS notification shade
ketosis: 'Ketones are up and autophagy — cellular clean-up — has begun.',
deep_fast: 'Deep fasting: growth hormone up, cellular renewal in earnest.',
// js/analytics/views/view-fasting.js:281
`Your longest fast of ${…}h reached the Ketosis Progression phase. Autophagy — the cellular recycling process — begins around 24 hours.`
// js/analytics/views/view-fasting.js:677 — the EMPTY STATE every new user sees
'openHybrid shows your metabolic stages'
```
plus `:318`, `:424`, the verbatim `FASTING_ZONES[].description` at `:153/:172` ("Autophagy begins in earnest", "Growth hormone markedly elevated") and `fasting-insights.js:160,211`.

**Impact:** unproven medical claims about the athlete's body, on the home screen's insight line, a phone notification and the Fasting analytics screen, in an app aiming at Play. The ratchet that exists to prevent exactly this reports success.

**Fix sketch:** rewrite the copy to elapsed-time wording in all six places and widen the grep to the notification copy, the analytics view, the empty state and the insights.
**Test gap:** the band-only grep.

---

### P1 — AUD-CSS-A-1 · A ticked set is unreadable in light mode (1.18:1)
**Area:** `css/styles.css:1311-1317` vs `:3934` · **Type:** a11y · **Confidence:** high (measured)

```css
.cockpit-set-row.is-complete .input-weight-node { color: #d7f3e6; }   /* (0,3,0) */
html[data-theme="light"] .cockpit-set-row input { color: #0f172a; }   /* (0,2,2) — loses */
```
**Measured:** adding `is-complete` to a real row in light mode turns the field from `rgb(15,23,42)` to `rgb(215,243,230)` on a white card = **1.18:1**.

**Impact:** the instant the athlete ticks a set — the moment the number becomes the record — they can no longer read it. Every working set of every session in light mode. (The value is stored correctly; this is presentation only, which is why no test caught it.)

**Fix sketch:** a light-mode override at equal specificity for `.is-complete` fields.

---

### P1 — AUD-F-02 · Every new user is told they are "Substantially above baseline"
**Area:** `js/brain/load_models.js` + `js/analytics/calculations/load-calcs.js` · **Type:** correctness (coaching signal) · **Confidence:** high (arithmetic reproduced; found by the independent audit at `a5cd282`, verified here)

The EWMA is zero-seeded with no warm-up guard, and the status function takes no history length:
```js
// js/brain/load_models.js:25-26,128-133
const λ_ATL = 2 / (7 + 1);   const λ_CTL = 2 / (28 + 1);
let atl = 0, ctl = 0;
atl = dayLoad * λ_ATL + atl * (1 - λ_ATL);
ctl = dayLoad * λ_CTL + ctl * (1 - λ_CTL);
// js/analytics/calculations/load-calcs.js:67-68
if (!ctl || ctl === 0) return { status: 'Insufficient baseline', … };
const ratio = atl / ctl;                      // no days-of-history input
```
**Verified:** constant load 100/day → `atl 86.7`, `ctl 39.4`, **ratio 2.20** at day 7 (1.55 at 14, 1.28 at 21, 1.16 at 28) → "Well above" / "Substantially above baseline", warning tone.

**Impact:** the first months of *steady* training are labelled an overtraining risk on the surface that shapes a new athlete's trust — and the same happens after any reset (AUD-A-9).

**Fix sketch:** pass `daysOfHistory` and return "Building your baseline" until ≥28 dated days, or seed CTL from the first week's mean.

---

### P1 — AUD-F-01 · Health Connect: no paging, no "today", and an error reads as "permissions revoked"
**Area:** `HybridHealthBridge.kt`, `js/health/health-bridge.js` · **Type:** correctness (Android) · **Confidence:** static only (no device); found by the independent audit, confirmed by code here

```kotlin
// HybridHealthBridge.kt:210-219 — one read per type, no pageToken loop
client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
// :223
val endDate = end.atZone(zone).toLocalDate().minusDays(1) // end is exclusive
// :140-141 — any throw becomes an empty grant
val json = runCatching { fetchByDay(...) }.getOrElse { "{\"granted\":[],\"days\":[],\"errors\":[]}" }
```
and `js/health/health-bridge.js` treats an empty `granted` as revoked → `connected = false` + "Permission needed".

**Impact:** a 90-day pull can return only the oldest page, **today is never bucketed**, steps double-count across phone and watch, and one transient exception disconnects the integration until the athlete re-grants. Recovery and readiness then show absent or stale data with no age indicator.

**Fix sketch:** loop on `pageToken`; aggregate steps; make `end` inclusive; return a structured error status distinct from an empty grant; sync on foreground and show "as of <time>".

**Caveat:** Android is unexecuted here (§10); the JS half I did run is AUD-F-5.

---

### P2 highlights — selected from 40+ (the full set is §5)

| ID | Area | Title |
|---|---|---|
| AUD-A-2 | state/boot | Mirror restore overwrites an unreadable local blob before it is preserved — newest copy lost silently, no recovery screen |
| AUD-A-3 | export | CSV formula injection: quoted only, so `=HYPERLINK(...)` from an imported file executes in the athlete's own export |
| AUD-A-4 | export | "Export Spreadsheet (CSV)" silently drops hold seconds, carry distance, set type, RIR/RPE and per-set notes |
| AUD-B-1 | logger | One-tap quick-log converts a banded set to Weighted and deletes the band |
| AUD-B-3 | logger | With no numeric prescription, `data-prescribed` falls back to the athlete's own previous set, so adherence measures them against themselves |
| AUD-B-4 | logger | The set sheet's **Band** button is inert (`data-mode="band"` vs a `bodyweight\|weighted\|assisted` whitelist) |
| AUD-B-5 | logger | Discarding a workout leaves `week.dates[day]` stamped, so the replacement session keeps the abandoned date |
| AUD-C-1 | plans | Choosing another workout orphans a live one-off/routine session; its sets double-count that date with no way back |
| AUD-C-2 | plans | Every preview calls `liftTarget` without context: the same screen says 5 working sets and "3 × 10" for an imported plan |
| AUD-C-3 | plans | `openhybrid-plan` export drops `prescriptions`/`dayExercises`: a J&T plan round-trips every lift to 4×10 while still claiming its model |
| AUD-D-3 | analytics | e1RM/PR engine reads `byDate` (one slot per date), so a second session on the same date is invisible to best-e1RM and PRs |
| AUD-D-5 | analytics | Home's coach line hardcodes `kg` for a body-weight change, for lbs athletes |
| AUD-F-1 | privacy | Crash reporting is live in every build and the scrubber leaves `message`/`extra`/`tags` intact |
| AUD-F-2 | privacy | Every live run streams real-time coordinates to a third-party tile CDN |
| AUD-F-3 | health copy | *upgraded to P1 — see §3* |
| AUD-R6-1 | data | Editing tape at `measurementUnit:'in'` rewrites **stored cm** (76.0 → 75.9) for every untouched site |
| AUD-R6-4 | data | A fresh **lbs** athlete gets the weigh-in sheet prefilled `70 lb` — a fabricated body weight, one Save from the log |
| AUD-R6-2 | data | A weigh-in correction writes the **first** duplicate row while the reader keeps the **last** |
| AUD-R5-2 | logger | Saving an unrelated edit strips `mode:'reps'`, flipping a logged set to a timed hold (tonnage → 0) |
| AUD-R5-3 | logger | Five per-set controls resolve the wrong day on a resumed one-off session and silently write nothing |
| AUD-R5-4 | logger | Discarding a **one-off** workout has no snapshot and no Undo (the programmed branch does) |
| AUD-B-8 | logger | Tapping the already-active load cell on a completed set clears its stored weight |
| AUD-R7-1 | notify | The streak nudge reads `streakData.current`, which nothing writes — a 40-day athlete is told "no activity yet" |
| AUD-R7-2 | notify | Reminders un-cancel themselves after an explicit "off" — no persisted flag exists |
| AUD-R8-3 | coach | "What will my next PR be?" always answers "I need more data" — the projection is never passed |
| AUD-R9-3 | import | Deleting an imported FIT activity makes that file permanently un-importable ("already in your history") |
| AUD-R9-2 | import | `readZip` ignores size bounds and CRC; a truncated archive **overwrites** the good photo |
| AUD-R9-1 | backup | Photo export silently drops a record whose blob is missing while its manifest lists it |
| AUD-R2-2 | plans | "Keep Week 12" is offered for an 8-week plan → phantom week, default 3×10 everywhere |
| AUD-CSS-A-2 | a11y | Toasts paint **behind** the Settings panel — feedback from Settings is invisible |
| AUD-CSS-A-3 | css | `--border-light` is used ~40 times and declared nowhere; Home cards and builder rows lose their borders |
| AUD-CSS-B-3 | a11y | "Remove this set" / Failed are ~1.9:1 in light mode |
| AUD-CSS-B-4 | a11y | "Browse Programs" (the only exit from empty Profile) is ~1.7:1 in light mode |

---

## 4. Coverage ledger

> **Read this with §12.** This section records the *first* pass (seven streams, read fractions). §12 replaces the fractions with a **measured execution number** (70.7 % of instrumented JS lines) and a closed reading ledger for every file below 60 % execution, the six never-loaded files and all six stylesheets.

"Entire codebase" is a ledger, not a claim. Seven streams with disjoint ownership; each reports what it read in full, what it reached by targeted search, and what it skipped. Read-only throughout — children returned findings, never edits.

| Stream | Owned surface | Read fully | Targeted / skimmed | Not read | Runtime |
|---|---|---|---|---|---|
| **A. State & data safety** | `js/state.js` (991), `js/state/**` (1,839), `js/db.js` (471), `js/portability/**` (1,724), `js/photos/**` (314), `js/metrics/bodyweight.js` (209) — **6,004 lines** | ~98 % | Android `StateMirrorSafe.kt`/`MainActivity.handleDownload`, callers in `settings.js`/`analytics.js`/`app.js` | unrelated `MainActivity.kt` body | 4 `/tmp` node probes (mirror-over-corrupt, CSV injection, CSV hold/carry, `__proto__` import) |
| **B. Logger & session engine** | `js/workout.js` (2,604), `js/workout/**`, `js/timers.js`, `js/set-utils.js`, `js/engine.js`, `js/schema.js`, `js/session-recap.js` — **~10,870 lines** | ~87 % | `js/templates.js`, `strength/records.js`, `strength/e1rm.js`, `routines/model.js`; callers in `app.js`/`analytics.js` | `workout/plates.js`, `plate-sheet*.js` (480), `exercise-picker.js`, `substitutions.js`, `effort.js` 60-100 | module probes (band mode, rest resolver, `data-prescribed` render) + 5 targeted test files |
| **C. Plans, programs, routines, equipment** | `js/programs/**`, `js/routines/**`, `js/equipment-profiles.js` (547), `js/program_builder.js` (749), `js/athlete-profile.js` — **~13,990 lines** | ~30 % (4,200) + ~2,000 lines of decision paths | `js/programs/catalog/**` (~4,500 lines of data) shape-checked by grep, not read line by line; `library.js`/`detail.js` markup skimmed | `library.js` ~985 lines of bookmark/save/filter flows | **4 probes** — plan round-trip, J&T round-trip, row-vs-detail fit, preview-vs-cockpit target |
| **D. Analytics, Progress, Home, History** | `js/analytics/**`, `js/metrics/**`, `js/home/**`, `js/activities/**`, `js/brain/**`, `js/dashboard.js`, `js/profile-stats.js` — **~25,700 lines** | ~25 % | ~65 % reached by targeted grep/read of callers and guards | `analytics/charts/**` (1,356), most `analytics/views/**` DOM, `home/body-heatmap.js`/`body-paths.js`, `activities/mutations.js` | **12 numeric probes** — every number quoted in §5 is a real module output |
| **E. Shell, UI, accessibility, performance** | `index.html` (2,563), `css/**` (18,808), `js/app.js` (2,506), `js/settings.js` (1,689), `js/ui/**`, `js/modules.js`, `js/theme.js`, `js/home.js` (708), `js/templates.js`, `js/train/**` — **~30,000 lines** | ~15 % (4,600) | exhaustive grep of every `innerHTML =` sink, `data-module`, `data-modal-root`, `role="button"`, `type="file"`, `.hit-target` | `js/ui/celebration.js`, `clipboard.js`, `leaflet-loader.js`, `sortable.js`, `visible-viewport.js`; most `styles.css` beyond the token/safe-area/hit-target blocks | **11 Playwright probes** at 320/390, dark/light, 48 px inset, modules off + **my own independent 4-destination × 2-width probe** |
| **F. Platform, security, integrations** | `android/**` 18 Kotlin files (2,663), `sw.js` (447), `gen-precache.mjs`, `verify-workflow-gates.mjs`, `.github/workflows/**`, `js/monitoring/**`, `js/gps/**`, `js/gps-tracker.js` (869), `js/garmin.js`, `js/health/**`, `js/notifications.js`, `NOTICE.md`, `LICENSES/`, `index.html` head | ~95 % of the non-vendor in-scope source | `index.html` body, `pages.yml`, 7 of 8 Kotlin test classes | `js/vendor/**` beyond provenance | `scrubEvent` executed, `applyHealthDays` executed, `precache --check` drift proof, `gen-precache` hash flip |
| **G. Tests, scripts, docs** | `tests/**` (284), `scripts/**` (63), `AGENTS.md`, `CLAUDE.md`, `README.md`, `docs/**` | coverage report, guard tests, generated-asset generators, claims grep | | individual review of all 2,619 test bodies | 2 full suite runs, 1 coverage run, 3 mutation experiments, 1 generator reproduction |

**Runtime campaign run by me (not delegated):** corrupted / truncated / future-schema boot; fresh-install boot; `npm run verify` ×2; `npm run browser:verify` (48 checks); `perf:baseline`; coverage; four state-safety probes; three analytics probes re-run from Stream D; the band-role, calendar-guard and reachability mutation experiments; `sw.js` hash sensitivity; icon regeneration.

**Not covered at all** — see §10: Android execution of any kind, screen readers, real devices, dependency CVEs, and part of `charts/**`.

---

---

## 5. Full findings by area

Sections are grouped by audit stream and appear in the order the streams reported (A, B, D, C, E, F, then G for the stylesheets); each is ordered P1 → P3 internally. **The six P1 findings are written up in full in §3** and cross-referenced here; P2 and P3 are written up here in full. Every finding carries `file:line`, a quoted excerpt, expected vs actual, impact, reproduction and confidence. Reproduction values are real outputs from probes run in a throwaway copy under `/tmp` (the repo was never written to).

### A. State, data safety, portability

---

**ID: AUD-A-1** — see §3 (P1, photo export on Android).

---

**ID: AUD-A-2**
**Severity:** P2 · **Type:** data-loss · **Area:** boot / `js/state.js` + `js/state/mirror.js` · **Confidence:** high (reproduced)

**Title:** Mirror restore overwrites an unreadable local blob *before* it is preserved, so the corrupt copy is destroyed and the recovery screen never appears.

**Evidence:** the mirror is restored first, and only afterwards is the local blob read and preserved:
```js
// js/state.js:801-818
mirrorRestore = await restoreStateMirror({ storage: _defaultStorage(), stateKey: STORAGE_KEY, ... });
...
rawLocal = localStorage.getItem(STORAGE_KEY);
if (rawLocal) { localData = JSON.parse(rawLocal); }
} catch (e) { corruptRaw = rawLocal; preserveCorruptState(localStorage, STORAGE_KEY, rawLocal); }
```
and the restore writes back unconditionally:
```js
// js/state/mirror.js:186-190
storage.setItem(stateKey, mirror.json);
storage.setItem(savedAtKey, mirror.savedAt || now());
```
`corrupt-state.js:6` states the contract: *"A JSON parse failure must never be treated as 'no data'."*

**Expected vs actual:** the unreadable bytes are copied to `_corrupt` and the athlete is told their newest copy was unreadable. Actual: `restoreStateMirror` has already replaced the corrupt value with the mirror JSON, `JSON.parse` succeeds, `corruptRaw` stays `null`, `preserveCorruptState` never runs, and the gate at `js/state.js:829` never opens.

**Impact:** every Android boot where localStorage is truncated/evicted and a valid mirror exists — the exact failure the mirror was built for. The app boots on older data and the damaged document is silently gone: no `_corrupt` copy, no export, no signal.

**Reproduction:** `node /tmp/aud_a2.mjs` (stubbed bridge + memory storage) →
`restore: true local-missing-or-invalid` · `localAfter = {"weeks":{"1":{"lifts":{"mon":{"Back Squ…` · `corruptRaw preserved? false`. Re-run by me with the same result.

**Fix sketch:** parse + `preserveCorruptState` **before** awaiting the mirror restore, or have `restoreStateMirror` return the `localRaw` it saw so `state.js` can preserve it. Keep booting on the mirror, keep the bytes, keep the "your newest copy was unreadable" signal.
**Test gap:** `corrupt_state.test.js` tests the pure helpers only; no test runs the two together.

---

**ID: AUD-A-3**
**Severity:** P2 · **Type:** security · **Area:** `js/portability/csv-export.js` · **Confidence:** high (reproduced)

**Title:** CSV formula injection — quoting is the only escaping, so `=`, `+`, `-`, `@` cells execute when the export is opened in a spreadsheet.

**Evidence:**
```js
// js/portability/csv-export.js:9-12
export function csvCell(value) {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}
```
Every export (`buildTrainingCsv`, `buildBodyweightCsv`, `buildMeasurementsCsv`) goes through `row()`/`csvCell`, and the text can originate from an untrusted import (`import-workout-csv.js:464` stores a CSV's note verbatim; exercise names likewise).

**Expected vs actual:** spreadsheet formula prefixes are neutralised (OWASP CSV injection). Actual, from `node`:
```
"1","act","hybrid_engine","mon","2026-08-03","Plank",…,"=HYPERLINK(""http://evil.example"",""click"")"
```
RFC 4180 parsing strips the quotes; Excel/Sheets evaluate the cell.

**Impact:** a crafted history file (the app's own import surface) becomes a payload that fires on the athlete's machine when they open their own export. The codebase otherwise treats imports as hostile (size caps, sanitised links, null prototypes), so this is an inconsistency in its own posture.

**Fix sketch:** in `csvCell`, prefix any cell whose first character is `=` `+` `-` `@` `\t` `\r` with `'`, keeping the quoting. One function fixes all three exports.
**Test gap:** `csv_export.test.js` covers quotes/commas/newlines but not leading formula characters.

---

**ID: AUD-A-4**
**Severity:** P2 · **Type:** data-loss (export fidelity) · **Area:** `js/portability/csv-export.js` · **Confidence:** high (reproduced)

**Title:** The spreadsheet export drops hold seconds, carry distance, set type, RIR/RPE and per-set notes — a 60 s plank exports as an empty row.

**Evidence:**
```js
// js/portability/csv-export.js:88-90
sets.forEach((set, index) => { liftRows.push([lift, index + 1, set?.w, set?.r, set?.c]); });
```
The header (`:29-33`) has no duration, distance, type, effort or set-note column, and the module's own first line calls it a *"Complete, deterministic training-history CSV"* (`:2`).

**Expected vs actual:** a hold keeps its seconds and a carry its metres. Actual, from `node`:
```
"…","Plank","1","","","true",…
"…","Farmer Carry","1","24","","true",…
```
The 60 s and the 40 m are gone, and a warm-up, a drop set and a working set are indistinguishable.

**Impact:** every hold and carry in history is absent from the spreadsheet a coach or the athlete analyses. Scope note: the **JSON export is complete**, so on-device data is not at risk and the UI does call this "Export Spreadsheet (CSV)" — hence P2, not P1.
**Fix sketch:** append `ValueSec`, `ValueDistM`, `SetType`, `Rir`, `SetNote` columns at the END so existing column indexes asserted by `csv_export.test.js` (`row[18]`, `row[20]`) stay stable; map `set.sec`/`set.dist`/`set.type`/`set.rir`/`set.note`.
**Test gap:** no round-trip test `buildTrainingCsv` → a reader.

---

**ID: AUD-A-5**
**Severity:** P3 · **Type:** correctness · **Area:** `js/portability/import-workout-csv.js` · **Confidence:** high (reproduced)

**Title:** A per-set `Notes` column (Strong/Hevy) becomes the *session* note (first row wins); every other set note is dropped and `columns.setNote` is dead code.
**Evidence:** `ALIASES.note` ends with `'notes'` (`:96`) and `columnIndex` returns the first match, so a `Notes` header resolves to the session note; `setNote` is computed (`:141`) and never read.
**Expected vs actual:** per-set notes map to sets (or are ignored); a workout note comes from a workout-note column. Actual: set 1's remark is promoted to `week.notes[day]` — shown by the cockpit, the recap and History, and exported as the CSV `Notes` column — and the remaining set notes vanish.
**Reproduction:** `node /tmp/aud_a3.mjs` with header `Date,Workout Name,Exercise Name,Set Order,Weight,Reps,Notes` → session note `"felt heavy, shoulder ok"`; `"second set easier"` and `"seat 3"` absent.
**Fix sketch:** prefer `workout_note`/`description` for the session note and route a bare `notes`/`note` to the set note using the already-declared alias.
**Test gap:** no import fixture with a per-set Notes column.

---

**ID: AUD-A-6**
**Severity:** P3 · **Type:** data-loss (narrow) · **Area:** mirror precedence · **Confidence:** medium

**Title:** The "older copy" test is a wall-clock timestamp on one side and a file mtime on the other — a backwards clock step plus a failed mirror write lets an older mirror win.
**Evidence:** `js/state/mirror.js:146-155` compares `Date.parse(localSavedAt)` against the mirror's `savedAt`; `js/state.js:734-743` stamps local from `new Date().toISOString()`; `StateMirrorSafe.kt:76` stamps the mirror from `target.lastModified()`.
**Expected vs actual:** `AGENTS.md` says "restored only when localStorage is missing/corrupt/**older**". Actual: "older" is decided by two unrelated, non-monotonic clocks. Path: mirror written 12:00:05 → NTP steps the clock back to 11:55 → a save writes `saved_at=11:55:10` but its mirror write fails → next boot restores the 12:00 mirror over newer local data.
**Fix sketch:** carry a monotonic `_persistSeq` inside the JSON the JS controls and compare that, keeping the timestamp only as a tie-breaker.
**Test gap:** `state_mirror.test.js` only uses monotone-increasing timestamps.

---

**ID: AUD-A-7**
**Severity:** P3 · **Type:** correctness · **Area:** `import-workout-csv.js` → `js/settings.js` · **Confidence:** high (reproduced)

**Title:** An exercise named `__proto__` throws mid-import, uncaught, leaving a partially applied import with no message.
**Evidence:** `:440-441` `if (!lifts[name]) { lifts[name] = []; liftOrder.push(name); } lifts[name].push(...rawSets);` on a plain object keyed by untrusted text; `js/settings.js:1337` calls `applyWorkoutCsvImport` with no `try/catch`.
**Reproduction:** `/tmp/aud_a4.mjs` with a row `__proto__,80,5` → `TypeError: lifts[name].push is not a function`.
**Fix sketch:** `Object.create(null)` for `lifts` (the import validator already null-prototypes `exercisePrefs` for this exact reason), and wrap the call in the toast the other CSV branches already use.

---

**ID: AUD-A-8**
**Severity:** P2 · **Type:** security (stored markup injection) · **Confidence:** high (PoC run)

**Title:** `fastingSession` is the one imported top-level key the validator never inspects, so `goal` reaches `innerHTML` unescaped — injected markup is parsed (script execution is blocked only by the CSP).

**Evidence:**
```js
// js/fasting/fasting-calcs.js:509
active, currentHours, currentZone: …, goal: fs?.goal ?? 16,     // no coercion
// js/analytics/views/view-fasting.js:173
`${progressPct.toFixed(0)}% of ${goal}h goal`                     // into innerHTML
// js/analytics/views/view-fasting.js:604,610 — same value into stroke-dasharray
```
`js/state/import-validate.js` contains **no** reference to `fastingSession`, and the JSON import installs the validated blob wholesale.

**Expected vs actual:** every imported field that can reach HTML is sanitised (`import-validate.js:47-52` says so explicitly). Actual, from a booted app with `fastingSession.goal = '<img src=x onerror="window.__xss=1">'`: the Fasting analytics screen renders `img[src="x"]` and the markup contains a raw `onerror`. `window.__xss` stayed **0** — `script-src 'self'` in `index.html:26` blocks the inline handler.

**Impact:** stored HTML injection from a hand-crafted backup, persisted in localStorage, on a screen the athlete opens from the fasting band. Today the CSP stops it executing; the injection is one `'unsafe-inline'` (or one nonce mistake) away from script execution, and it can already break layout and render attacker-chosen content in a trusted surface. The same unvalidated key also lets a non-numeric goal produce `NaN%`.
**Reproduction:** `node /tmp/audit/poc-fasting-xss.mjs` → `opened: true`, `injected: 1`, `viewHtmlSample: "raw onerror present in markup"`, `xss: 0`.
**Fix sketch:** coerce `fastingSession` on import (`active` boolean, `startTime` ISO-or-null, `goal` integer 1–72, `history` bounded array of `{start,end,goal,completed}`) and `esc()` the value at the interpolation.
**Test gap:** no import fixture contains a malformed `fastingSession`; no test renders the fasting view with a hostile goal.

---

**ID: AUD-R6-1** — *found by the coverage-completion reading pass*
**Severity:** P2 · **Type:** data-loss (silent mutation) · **Confidence:** high (arithmetic reproduced)

**Title:** The measurements sheet rewrites **stored centimetres** from a one-decimal **inch** display value, so editing one site silently shifts every untouched site by 0.1 cm.
**Evidence:**
```js
// js/measurements-sheet.js:235
input.value = typeof own === 'number' ? String(roundDisplay(cmToDisplay(own, unit), unit)) : '';
```
then `saveMeasurementsSheet` sends all 14 inputs back through `displayToCm`.
**Reproduction (`node`):** 76.0 cm → 29.9 in → **75.9 cm**; 55.0 → **55.1**; 71.3 → **71.4**; 100.4 → **100.3**.
**Impact:** `measurementUnit()` falls back to `in` whenever `weightUnit === 'lbs'`, so **every lb athlete** drifts their whole tape history on every edit of an existing date — including a field they never touched.
**Fix sketch:** keep the exact stored centimetres for prefilled fields and use the conversion only for painting; on save, treat "value equals the rendered prefill" as unchanged and send the stored cm.
**Test gap:** no test asserts stored cm survive an edit at `measurementUnit:'in'`.

---

**ID: AUD-R6-2**
**Severity:** P2 · **Type:** data-loss · **Confidence:** medium (needs a duplicated row)

**Title:** The weigh-in sheet edits only the **first** row for a date while the reader keeps the **last**, so a correction can be invisible.
**Evidence:**
```js
// js/bodyweight-sheet.js:141
const index = appState.bodyWeightLog.findIndex((entry) => entry?.date === date);
```
`normalizeWeighIns` resolves duplicates with `byDate.set` (last wins). `saveMeasureEntry` was explicitly fixed for this defect class by filtering every row for the date (`js/metrics/measures.js:164-171`); this path was not.
**Impact:** after a JSON restore that produced a duplicate, the correction is written to a row the reader ignores — "I fixed my weight" and the trend still shows the old value.
**Fix sketch:** filter all rows for the date and push one replacement, as `saveMeasureEntry` does.
**Test gap:** no duplicate-date fixture for the sheet.

---

**ID: AUD-R6-3**
**Severity:** P2 · **Type:** correctness · **Confidence:** high

**Title:** The weigh-in sheet has no upper bound, so a typed `9999` saves and rescales the trend; the other weigh-in writer caps at 500.
**Evidence:** `js/bodyweight-sheet.js:135` `if (!Number.isFinite(weight) || weight <= 0) return;` versus `js/metrics/measures.js:33,158` `MAX_MEASURE_WEIGHT = 500`. Invalid input also returns with **no toast**.
**Impact:** one mistyped weigh-in becomes the baseline for every bodyweight chart, weekly mean, 21-day rate and goal corridor (nothing validates on read either).
**Fix sketch:** reject `> MAX_MEASURE_WEIGHT` and toast on rejection.

---

**ID: AUD-R6-4**
**Severity:** P2 · **Type:** correctness · **Confidence:** high (unit arithmetic)

**Title:** A fresh athlete on **lbs** opens the weigh-in sheet prefilled `70.0 lb` — a fabricated body weight, in the wrong unit, one Save from the canonical log.
**Evidence:**
```js
// js/bodyweight-sheet.js:49
const weight = existing?.weight ?? latest?.weight ?? appState.settings?.targetWeight ?? 70;
```
**Expected vs actual:** `AGENTS.md`: *"Body weight has NO default … rather than logging a fabricated 75kg as their load."* Actual: no entry and no target ⇒ `70`, rendered with the athlete's unit label (`:24,56`), so a lbs user saves 70 lb ≈ 31.8 kg.
**Impact:** an implausible first weigh-in seeds the Home/Progress bodyweight trend, the rate and the goal corridors for a new lbs athlete who taps Save.
**Fix sketch:** leave the field blank with a placeholder when there is no history and no target, or seed 70 only in kg.

---

**ID: AUD-R9-1**
**Severity:** P2 · **Type:** data-loss (backup honesty) · **Confidence:** high

**Title:** `exportPhotosZip` silently drops a photo whose blob is missing while its manifest still lists it — the "complete backup" is short and nothing says so.
**Evidence:**
```js
// js/photos/library.js:130
if (!blob) continue;
// :136 — the manifest still contains every metadata record
bytes: new TextEncoder().encode(JSON.stringify({ version: 1, photos: metadata }))
```
**Impact:** a device whose IndexedDB was evicted produces a zip missing photos the app still displays; `count` quietly shrinks and the toast reports success. Restoring it restores fewer photos than the manifest claims, and the gap is discoverable only by losing the data. This is the same honesty failure as AUD-A-1, one layer lower.
**Fix sketch:** collect the missing ids and surface them in the return value plus a warning toast.
**Test gap:** no fixture with a metadata record whose blob is absent.

---

**ID: AUD-R9-2**
**Severity:** P2 · **Type:** data-loss · **Confidence:** high

**Title:** `readZip` never bounds the declared entry size against the buffer and never checks the CRC, so a truncated archive silently yields a short entry — and importing it **overwrites** the good photo for that date with a half-JPEG.
**Evidence:**
```js
// js/portability/zip.js:134-141
const size = view.getUint32(at + 18, true);
…
entries.push({ name, bytes: bytes.subarray(dataStart, dataStart + size) });
```
`subarray` clamps silently, and `putPhotoBlob` (`photos/library.js:176`) replaces the existing blob for the same id.
**Impact:** one corrupt or partially-downloaded backup destroys a photo it was meant to restore, and reports it as restored. (`size === 0` cannot loop forever — `at` always advances by at least 30.)
**Fix sketch:** reject when `dataStart + size > bytes.length` or `nameStart + nameLength > bytes.length`, and verify the stored CRC before accepting an entry.
**Test gap:** no truncated-archive fixture.

---

**ID: AUD-R9-3**
**Severity:** P2 · **Type:** correctness (false duplicate) · **Confidence:** high

**Title:** FIT de-duplication keys on the presence of the archived **week object**, so deleting an imported activity makes that file permanently un-importable and Settings calls it a duplicate.
**Evidence:**
```js
// js/portability/import-fit.js:164
if (state.weeks[candidate.weekKey]) { skipped.push(candidate); continue; }
```
The documented identity is the activity's start timestamp, and `findImportedRunSession` already does it that way. A History delete clears the day's runs but never removes `state.weeks[key]`, and `js/settings.js` repeats the same `state.weeks[item.weekKey]` test.
**Impact:** a misdated or wrongly-classified FIT import that the athlete deletes is refused forever as "already in your history and will be skipped" — a false statement with no way to clear it.
**Fix sketch:** decide duplicates from live content (a start-time scan for runs, and for `gymStats`-only weeks), not from the archived key.
**Test gap:** no delete-then-re-import fixture.

---

**ID: AUD-R9-4**
**Severity:** P3 · **Type:** correctness (evidence mismatch) · **Confidence:** high

**Title:** The strength drilldown's evidence column always prints **tonnage**, even when the metric being inspected is muscle-set credits.
**Evidence:** `js/analytics/views/view-strength-metric.js:66` `${Math.round(record.volumeKg).toLocaleString()} ${esc(unit)}` — reached from `view-strength.js:296` with `data-metric-id="strength.muscle-set-credits"`.
**Impact:** a headline of "12 credits" is evidenced by rows reading "14,320 kg", and a bodyweight hold or carry that earns credits shows "0 kg" — the "exact evidence" list contradicts its own model (`record.muscleSetCredits` is already on every record).
**Fix sketch:** pick the measure from `model.definition.unit` and format it through `formatStrengthMetricValue`.

---

**Also in this area (one line each, P3):**
- `js/portability/zip.js:128-145` `readZip` ignores the central directory and CRCs, so a truncated archive imports short/empty JPEGs; `importPhotosZip` reports "Restored N" without comparing to the manifest count.
- `import-workout-csv.js:146-149`, `import-body-csv.js:17-20`, `import-measurements-csv.js:34-37`: `String(v).replace(',', '.')` replaces only the FIRST comma, so `"1,234"` parses as `1.234`.
- `js/state/import-validate.js:359-380`: a 25 MB cap but no per-field bounds; a hostile-but-valid 24 MB blob imports and then makes every later save exceed the localStorage quota.
- `js/state/migrations.js:455-458`: `replaceState` uses `Object.assign`, so an imported own `__proto__` key re-prototypes the live object in memory.
- `import-workout-csv.js:392-397`: session identity is a 32-bit FNV-1a hash (~0.05 % collision at 2,000 sessions ⇒ a new session silently skipped as "already imported").
- The migration screen offers "Export a copy" but the migration-FAILURE screen passes no `getRawState`, so the only exit is an app update.

---

### B. Logger and session engine

---

**ID: AUD-B-1**
**Severity:** P2 · **Type:** correctness · **Area:** band load / quick-log · **Confidence:** high

**Title:** One-tap quick-log silently converts a Banded set to Weighted and discards the band.

**Evidence:**
```js
// js/workout.js:1291-1296
if (loadMode && loadMode !== 'weighted' && !_prev.loadMode && !_prev.bw && !_prev.band) {
  _prev = applyLoadMode(_prev, loadMode, { bodyweight: …, bandWeights: … });
}
```
```js
// js/workout/load-mode.js:81-84 — the else catches 'banded'
} else { next.loadMode = 'weighted'; next.w = ''; }
```
The manual tick path keeps the band (`js/workout.js:1628-1634` sets `loadMode`/`band`), so the same row is stored differently depending on how it was logged.

**Expected vs actual:** `applyBandLoad(set,'M',{exercise})` → `{loadMode:'banded', band:'M', w:'20'}`. Actual: `applyLoadMode(set,'banded')` → `{loadMode:'weighted', w:''}`, and the set is then stored as a plain weighted load at the band's kg value.
**Reproduction:** `node /tmp/bandcheck.mjs` → `applyLoadMode banded -> {"loadMode":"weighted","w":""}` vs `applyBandLoad pushdown -> {"loadMode":"banded","band":"M","w":"20"}`.
**Impact:** the exercise-level "Load default = Band" works visually and on the tick but not on one-tap/"Log all", so recap and History print a free-weight load; a band session can later mint a Rep/e1RM PR because `isE1rmExercise` refuses `set.band` but accepts the rewritten weighted set.
**Fix sketch:** branch on mode in `executeOneTapQuickLog` and call `applyBandLoad` for `'banded'`; or make `applyLoadMode` refuse `'banded'` instead of degrading it.

---

**ID: AUD-B-3**
**Severity:** P2 · **Type:** correctness (analytics) · **Area:** `js/templates.js` → `js/metrics/metrics-strength.js` · **Confidence:** high

**Title:** With no numeric prescription, `data-prescribed` falls back to the athlete's own previous set, so adherence measures them against themselves.

**Evidence:**
```js
// js/templates.js:69-76
const ghostDefault = String(prescribed?.w ?? ghostWeight);
...
const prescribedPlaceholder = (hasRole && roleTag.backoffSuggest != null)
  ? String(roleTag.backoffSuggest)
  : ghostDefault;
```
`AGENTS.md` claims: *"The coach's target stays on the row as `data-prescribed` … so the ghost can never be recorded as the prescription."* Rendered output proves otherwise: `ghost={w:'100'}`, `prescribed=null` → `data-prescribed="100"`.
**Impact:** catalog programmes prescribe sets×reps but no load (`js/engine.js:527`), so in the **first** session of any programme (`diagnostic.progression === null`) every set after the first is stamped `tw` = the athlete's own previous set. `workoutQuality` (`metrics-strength.js:145-151`) then scores those sets ≈100 % by construction and the Hybrid Score's consistency signals become self-referential. It self-corrects from session 2.
**Fix sketch:** `prescribed?.w != null ? String(prescribed.w) : ''` — no prescription ⇒ empty attribute ⇒ `_numericPlaceholder` returns null ⇒ the set is skipped, which is the documented behaviour for sets with no target.
**Test gap:** no test asserts `data-prescribed` differs from the ghost when no prescription exists.

---

**ID: AUD-B-4**
**Severity:** P2 · **Type:** dead code (silent control) · **Area:** set sheet · **Confidence:** high

**Title:** The set sheet's **Band** button is inert — nothing in the UI can put a band on a single set.

**Evidence:**
```html
<!-- index.html:2386 -->
<button type="button" data-action="set-sheet-load" data-mode="band">Band</button>
```
```js
// js/workout/set-mutations.js:368
if (!['bodyweight', 'weighted', 'assisted'].includes(mode)) return;
```
`set-sheet.js:103` also compares `markActive('banded')` against the button's `'band'`, so it can never appear selected.
**Expected vs actual:** a per-set band choice. Actual: a 44 px control that does nothing, with no toast. The only remaining route to a band is the exercise-wide default (which AUD-B-1 then drops on quick-log).
**Fix sketch:** use `data-mode="banded"` and handle it in `setSetLoadMode` through `applyBandLoad`, with one shared vocabulary for `markActive`.
**Test gap:** nothing loads the set-sheet HTML and asserts each `data-*` value is in its handler's accepted set.

---

**ID: AUD-B-5** — **RETRACTED during the fix wave** (was reported P2)
**Title (as reported):** Discarding a workout leaves `weeks[n].dates[day]` stamped, so a re-trained slot keeps the abandoned attempt's date.

**Why it is not a defect:** the project tests this behaviour deliberately and by name — `tests/delete_day_workout.test.js:40` *"workout deletion preserves the day date and body-weight measurement"* asserts `week.dates.mon === '2026-07-13'` after `deleteDayWorkoutData`, and `js/workout/delete-day.js:71` documents the function as *"Delete one exact day's workout content while preserving date attribution"*. A same-day weigh-in keeps its date through a delete by design.

I implemented the reported fix, watched that test fail, and reverted it. The residual risk — a slot re-trained on a *different* calendar day keeps the old stamp because `_ensureWorkoutDateStamp` is write-once — is real but narrow, and changing it would contradict a tested product decision. It is recorded here as a design note for the maintainer, not a bug.

---

**ID: AUD-B-8** — *merged AUD-B-7 + the coverage-completion pass*
**Severity:** P2 · **Type:** data-loss (completed-set mutation) · **Confidence:** high

**Title:** Tapping the **already-active** load cell in the set sheet is not a no-op: on a completed set it clears the stored weight (or rewrites it to today's bodyweight), leaving the set ticked with no load.
**Evidence:**
```js
// js/workout/set-mutations.js:368-383 — no early return, unlike every sibling setter
export async function setSetLoadMode(liftName, setIndex, mode) {
  if (!['bodyweight', 'weighted', 'assisted'].includes(mode)) return;
  …
  const next = applyLoadMode(sets[setIndex], mode, { … });
// js/workout/load-mode.js:81-84 — 'weighted' blanks the load
} else { next.loadMode = 'weighted'; next.w = ''; }
```
`setSetMode:174`, `setSetType:287` and `setLoadBasis:478` all return early when the value is unchanged; this one does not.
**Expected vs actual:** tapping the already-selected cell changes nothing. Actual: a completed pull-up/dip/push-up keeps `c: true` with `w: ''` → `setVolume` 0, e1RM 0, and the entered number is unrecoverable (no Undo on this path); tapping "Bodyweight" instead rewrites a logged load to *today's* bodyweight.
**Impact:** volume, e1RM and PR history change from a tap that should be inert, on a 44 px cell adjacent to the one the athlete meant.
**Fix sketch:** `if (resolvedLoadMode(sets[setIndex], liftName) === mode) return;` before `applyLoadMode`.
**Test gap:** `workout_logging.test.js` only exercises blank rows.

---

**ID: AUD-R5-2**
**Severity:** P2 · **Type:** data-loss · **Confidence:** medium (logic certain)

**Title:** Editing a saved workout strips an explicit `mode:'reps'` from **existing** sets, so a leftover `sec` re-reads the set as a timed hold and its tonnage drops to zero.
**Evidence:**
```js
// js/workout/edit-saved.js:167
if (next.mode === SET_MODE.REPS) delete next.mode;
```
The contract on `:141` says existing sets are preserved exactly; the `delete` runs for every set. `setModeOf` (`js/set-utils.js:52-53`) then falls back to the leftover `sec`/`dist`, and `setSetMode` deliberately never deletes the old shape's value.
**Reproduction (module-level):** `{w:'50',r:'10',c:true,mode:'reps',sec:90}` in → `{w:'50',r:'10',c:true,sec:90}` out, now read as a 1:30 hold.
**Impact:** an unrelated History edit + Save silently changes a logged set's shape — detail, analytics, muscle load and the CSV all report a hold instead of 10 reps.
**Fix sketch:** strip `mode` only for newly added sets (`set.editNew`); clone existing sets untouched.

---

**ID: AUD-R5-3**
**Severity:** P2 · **Type:** correctness (silent no-op) · **Confidence:** medium

**Title:** Five per-set setters resolve the raw selected day instead of the active session's day, so on a resumed one-off session the failure flag, load basis, rest, note and RIR controls silently do nothing.
**Evidence:**
```js
// js/workout/set-mutations.js:443 (also 473, 491, 502, 604)
const sets = appState.weeks?.[weekKey]?.lifts?.[day]?.[liftName];
```
`day` is `_getSelectedDay()`, while the cockpit and every other setter in this file use `activeWorkoutDay(appState, _getSelectedDay())` — the exact contract `one-off-session.js` spells out ("a tick and its untick can touch different stored slots").
**Impact:** resume a routine/copied session on a later weekday and five controls appear to work but write nowhere; shape and load edits still work, which makes the failure look random.
**Fix sketch:** resolve `day` through `activeWorkoutDay` in `toggleSetFailure`, `setLoadBasis`, `setPerSetRir` and `_setAt`.

---

**ID: AUD-R5-4**
**Severity:** P2 · **Type:** data-loss (no undo) · **Confidence:** medium

**Title:** Discarding a **one-off** workout deletes the whole session with no snapshot and no Undo, while the identical-looking action on a programmed day is reversible.
**Evidence:**
```js
// js/workout/clear-log.js:102
const discarded = discardActiveOneOffSession(appState);
// js/workout/one-off-session.js:69 — deletes the week outright
delete state.weeks[active.key];
```
The programmed branch snapshots the day first (`snapshotDayWorkoutData`, `:133`) and offers `showUndo`. The same "Discard workout" confirmation gives no hint that there is nothing to undo.
**Impact:** an interrupted routine or copied session with completed sets is destroyed irreversibly — every set, `gymStats`, notes and any run in that week.
**Fix sketch:** snapshot `state.weeks[key]` + `activeStrengthSessionKey` before deleting and restore both from an undo half.

---

**Also in this area (P3):**
- `js/workout.js:1379-1387`: "Log all" increments `logged` and starts rest even when `executeOneTapQuickLog` bails at `:1259` (`Enter weight & … first`), so the toast over-reports.
- *(superseded by the merged finding below)*
- `js/workout.js:613-615` counts warm-up rows in the cockpit's `totalSets`, while `session-outline.js:53-55` excludes them: the same session shows two denominators.
- `js/workout/run-units.js:50` and `:90` compute `Math.round(secPerKm % 60)` and can render `4:60` — the exact defect `formatRunPace` documents fixing at `:76-77`.
- `js/workout/exercise-history.js:44-47`: a hold's `bestSet` reports `reps: 0`, so the previous-session panel says "0 total reps" beside a valid hold.
- `js/workout-order.js:138` `isWarmup` ignores the legacy `isWarmup` flag that `set-utils.isWarmupSet` honours.
- `js/timers.js:358-414` `restoreRestTimer()` runs unconditionally at boot and never consults `_restTimerEnabled`.
- `js/workout/set-entry.js:88` accepts weight `0` (`weight < 0` only), so a completed weighted set at 0 kg passes the tick guard.
- `js/workout/set-mutations.js:385-433`: `cycleSetLoad` still looks for a `.btn-load` chip that `templates.js` no longer renders; `cycle-load`/`cycle-set-type`/`cycle-set-mode` remain routed with no controls.

---

### D. Analytics, Progress, Home, History

---

**ID: AUD-D-1** — see §3 (P1, sessions vs planned days).
**ID: AUD-D-2** — see §3 (P1, walks reported as runs).

---

**ID: AUD-D-3**
**Severity:** P2 · **Type:** correctness · **Area:** `js/analytics/strength-calendar.js` · **Confidence:** high (probe re-run by me)

**Title:** The e1RM/PR engine reads `byDate` (ONE slot per date) instead of `allByDate`, so a second session on the same date contributes no sets, no best e1RM and no PR.

**Evidence:**
```js
// js/analytics/strength-calendar.js:36-39
const { byDate } = indexSlotsByDate(state, …);
for (const [date, slot] of byDate) {
```
while `weekly-aggregate.js:200-201` documents `byDate` as *"ONE canonical slot wins"* and every other strength reader (`collectCalendarWeek:275`, `buildCalendarWeekStrength:385`, `muscles.js:237`, `year-review.js:98`) iterates `allByDate`.

**Measured (`node /tmp/aud-d/probe5.mjs`; one date: programmed Bench 3×5 @100 kg **plus** a one-off Bench single @125 kg):**
- `buildCalendarWeekStrength` → `4` working sets (correct)
- `liftE1rmByCalendarWeek` → `best 116.67`, `validSetCount 3`; `calendarStrengthSummary.bestThisWeek` `116.67`; `bestE1rmByLiftForWeek` `116.67`
- expected: `125` and `4`

**Impact:** the Progress Strength headline, its PR count/top change, the per-lift "this week" change, Home's `calendarStrengthSummary` (`hybrid-dashboard.js:96`), and any PR set sitting in the dropped slot. Triggered by exactly the same-date case `allByDate` was introduced to fix.
**Fix sketch:** iterate `allByDate` in `liftE1rmByCalendarWeek` and fold each slot into the week record (`validSetCount++`, `max(e)`).
**Test gap:** no two-slot-one-date fixture for `liftE1rmByCalendarWeek` or `calendarStrengthSummary.prCount`.

---

**ID: AUD-D-5**
**Severity:** P2 · **Type:** correctness · **Area:** `js/home/dashboard-model.js` + guard scope · **Confidence:** high (static)

**Title:** Home's coach line hardcodes `kg` for a body-weight change, and the "no analytics view hardcodes kg" guard never scans `js/home`.
**Evidence:**
```js
// js/home/dashboard-model.js:385
return { text: `Body weight ${dir} ${Math.abs(m.bodyweight.delta7)}kg over the last week.` … };
```
`delta7` comes from `bodyWeightLog`, which stores weigh-ins in the athlete's **then-current unit** (`metrics/bodyweight.js:32-41`), and the sub-model carries no unit. The guard's roots (`tests/analytics_correctness.test.js:141-148`) are `js/analytics/views`, `analytics/charts`, `analytics/insights`, `js/brain`, `js/workout`, `js/strength` — `js/home` and `js/metrics` are absent.
**Expected vs actual:** an lbs athlete reads "Body weight down **0.4kg**" for a stored −0.4 lb reading.
**Fix sketch:** add a `unit` to the bodyweight sub-model and interpolate it; add `js/home`, `js/metrics`, `js/activities` to the guard's roots.

---

**ID: AUD-R4-2** — *found by the coverage-completion reading pass*
**Severity:** P2 · **Type:** correctness · **Confidence:** high

**Title:** The bodyweight chart's "7d avg" line is a mean of the last **7 readings**, while the summary row on the same card computes a mean of the last **7 calendar days** — two different numbers both labelled the same thing.
**Evidence:**
```js
// js/analytics/charts.js:436 — a 7-READING moving average
const window = weights.slice(Math.max(0, index - 6), index + 1);
// :470 — labelled
`<text …>7d avg</text>`
// js/analytics/views/view-bodyweight.js:44-49 — a true trailing 7-DAY mean
const cutoff = new Date(Date.now() - 7 * 86400000);
const recent = log.filter((entry) => entry.date >= cutoffKey)…
```
**Impact:** for an athlete who weighs 3×/week, the green line averages ~2.3 weeks of data while the row above averages 7 days — on the same card, and the chart is shared with Home (`js/home/bodyweight-card.js`). The line therefore lags real change and contradicts the number printed beside it.
**Fix sketch:** average over entries whose `date >= lastDate − 6 days`, or rename the series to "7-log avg".
**Test gap:** no test compares the series to the summary row for a non-daily log.

---

**ID: AUD-D-9**
**Severity:** P2 · **Type:** correctness · **Confidence:** high (code)

**Title:** "Avg Duration / per fast" includes the in-progress fast's elapsed hours but divides by the count of *completed* fasts, so the figure inflates as the current fast ticks.
**Evidence:**
```js
// js/fasting/fasting-calcs.js:458-460
const totalHours = history.reduce((s, h) => s + h.durationHours, 0) + (active ? currentHours : 0);
const avgDuration = n > 0 ? totalHours / n : 0;     // n = completed fasts only
```
**Expected vs actual:** the average of completed fasts, or a denominator that includes the running one. Actual: 10 completed 16 h fasts plus an 18 h fast in progress report **17.6 h per fast** on the lifetime card and `view-fasting.js:195` ("Avg Duration", sub "per fast") — and it keeps climbing while the athlete watches.
**Fix sketch:** compute the average from `history` alone, or divide by `n + (active ? 1 : 0)`.
**Test gap:** no test covers an active session with history.

---

**ID: AUD-D-10**
**Severity:** P2 · **Type:** correctness (honesty) · **Confidence:** high (code)

**Title:** The fasting calendar marks every untracked past day of the month as **missed**, so a new faster is told they failed days before they ever used the app.
**Evidence:**
```js
// js/fasting/fasting-calcs.js:198-200
} else if (!isToday) {
  status = 'missed';
}
```
**Expected vs actual:** `AGENTS.md`: "a range with no completed fasts renders nothing" / no invented figure. Actual: `buildCalendarData` grades every past day of the rendered month, so browsing an earlier month shows a wall of MISSED and "0 % adherence" (`view-fasting.js:379,381,393`) for a period that was never tracked.
**Fix sketch:** emit `none` (not `missed`) outside `[firstFastEnd, now]` and exclude `none` from the adherence denominator.
**Test gap:** no fixture with a month that predates the first fast.

---

**Also in this area (P3):**
- `js/analytics/logged-days.js:76-101` walks raw `state.weeks` with **no dedup**, so a duplicated slot doubles the Monthly Report's totals (probe: 2,000 kg / 2 sessions instead of 1,000 / 1).
- `weekly-aggregate.js:298` counts a warm-up-only day with a saved gym duration as a strength session, contradicting `gymTimeIsSession` (`:67-74`) and `loggedSessionsByDate`.
- `tests/analytics_calendar_guard.test.js:32-45` guards a hand-listed **9-file** allowlist; Pulse, Balance, Muscles, Endurance, Hybrid balance, Exercises, Training calendar, Ranges and `running-calcs` are unguarded (proved by mutation — see §8).
- `hybrid-dashboard.js:112-113` + `running-calcs.js:72-77` scan numeric program weeks only, so the aerobic estimate vanishes right after a program switch while the runs remain visible everywhere else.
- `indexSlotsByDate:187-189` keys same-date identity on the week-level `sessionId`, so two active days inside one `sessionId` week would collapse (not reachable today).
- `metrics/metrics-running.js:46` `weeklyDistanceSeries` includes walk km **by design** and `tests/metrics_running.test.js:161-171` ratifies it, contradicting `AGENTS.md`'s "every running.* metric is run-only". Test and doc must agree.
- `muscles.js:276-279` computes previous-window shares by plain rounding, so the comparison column can sum to 99.9/100.1.
- `body-metrics.js:34` builds measurements with `recentCount: 4` rather than the band's range, so a "30D" tape delta can date from months ago.
- `js/dashboard.js` `TILE_REGISTRY` hardcodes `kg` in six places but is dormant (`metric-inventory.js:327`) — delete candidate, not a live bug.
- `js/analytics/views/view-gym-performance.js:51` and `view-run-performance.js:74`: a **future** bin (`bin.isFuture`) is announced to screen readers as a real zero — "Sep: 0 workouts", "0.0 km" — where it means "not started yet". Sighted users get `.is-future` dimming; AT users are told the future was untrained.
- `js/analytics/charts.js:351`: the 1RM Progress chart has no `unit` parameter, so its axis, dots and SQ/BP/DL legend print bare numbers with no unit anywhere — an lbs athlete sees "225" and cannot tell it is lb. `charts.js` is also outside the "no hardcoded kg" guard's swept roots (see AUD-D-5), which is why an *absent* label survives.
- `js/analytics/charts.js:173` `renderBodyWeightChart` hardcodes `kg` but has no caller (dead export), as do `renderHrZonesChart`, `renderCadenceChart`, `renderPaceLineChart`, `renderACWRChart`.

---

### C. Plans, programs, routines, equipment

**Read coverage:** ~4,200 lines in full (30 % of the 13,990 in scope) plus ~2,000 lines of decision paths in `detail.js`, `library.js`, `program_builder.js`, `athlete-profile.js`. `js/programs/catalog/**` (~4,500 lines of data) was shape-checked by grep, not read line by line.

---

**ID: AUD-C-1**
**Severity:** P2 · **Type:** data-loss / attribution · **Confidence:** high (static, mechanism certain)

**Title:** Choosing another workout silently orphans a live one-off (routine-started or copied) session — its sets survive with no way back and double-count that date.
**Evidence:**
```js
// js/app.js:352-357
export function selectProgramWorkout(day) {
  if (!day) return;
  clearActiveOneOffSession(appState);   // ← pointer only
  saveStateToLocalStorage(true);
```
```js
// js/workout/one-off-session.js:59-61
export function clearActiveOneOffSession(state) {
  if (state && state.activeStrengthSessionKey) delete state.activeStrengthSessionKey;   // week NOT removed
}
// :64-71 — the function that DOES remove it, never called from the three paths above
export function discardActiveOneOffSession(state) { ... delete state.weeks[active.key]; ... }
```
`startEmptyWorkout` (`js/app.js:362`) and `copyPastWorkout` (`js/app.js:391`) create a new one-off and overwrite `state.activeStrengthSessionKey` (`one-off-session.js:146`) without saving or discarding the previous one. Contrast the correct pattern in `js/workout.js:260-269`, which commits or deletes before a program switch.
**Expected vs actual:** `js/app.js:474-478` states the rule — *"One live workout owns the session clock and its one-off week"*. Actual: the pointer is dropped, the `session:<id>` week stays in `state.weeks`. A blank orphan is invisible storage rot; a partly-logged orphan has `workingSets > 0`, so `buildActivityHistory` emits a second dated strength row for the same date and every date-bucketed reader (volume, PRs, muscle load, hybrid balance, `sessionCounts`) counts both. There is no Undo.
**Fix sketch:** route those three paths through `discardActiveOneOffSession` or the existing save/discard confirm, as `resolveWorkoutBeforeProgramSwitch` already does.
**Test gap:** no test asserts that `startRoutine` → tick → `selectProgramWorkout` leaves exactly one session for that date.

---

**ID: AUD-C-2**
**Severity:** P2 · **Type:** correctness · **Confidence:** high (probe re-run by me)

**Title:** Every preview surface calls `liftTarget` **without** the program/day context, so an imported plan's per-lift prescription renders as the shared week modifier — contradicting the same screen's own week summary.
**Evidence:**
```js
// js/programs/detail.js:1096  (and :1155, :411)
const t = liftTarget(day.desc, name, mod || {});
```
while the correct siblings pass the context: `js/programs/schedule.js:77`, `js/programs/program-export.js:191`, `js/train/train-landing.js:86`, `js/workout.js:366` all pass `{ program, week, dayKey }`. `liftTarget` finds prescriptions only via `program?.prescriptions?.[ctx?.dayKey]?.[liftName]` (`js/engine.js:504`).
**Measured (`node /tmp/probe4.mjs`, openGym import prescribing Mon bench 5×5 @ 80 kg, rest 180 s):**
```
cockpit (ctx):           {"sets":5,"reps":"5","weight":80,"restSec":180}
detail preview (no ctx): {"sets":3,"reps":10}
week-at-a-glance:        1 exercise · 5 working sets
```
**Impact:** one detail screen promises five working sets and then shows "3 × 10" for the same day; the builder's Preview tab repeats it after an edit. The cockpit is unaffected, so nothing is logged wrongly — but the only way to inspect a plan before training is wrong. Contradicts `AGENTS.md`: *"The Structure sample + day-preview modal resolve each lift's sets×reps via `liftTarget` (the SAME call the cockpit uses)."*
**Fix sketch:** pass the fourth argument at all four sites.
**Test gap:** no test resolves an imported-prescription program's preview and compares it with `prescribeSetsForLift`.

---

**ID: AUD-C-3**
**Severity:** P2 · **Type:** data-loss · **Confidence:** high (probe re-run by me)

**Title:** `openhybrid-plan` export drops the `prescriptions` sidecar and a J&T program's tier metadata, so the documented round trip permanently degrades per-lift prescriptions while still advertising the progression model.
**Evidence:**
```js
// js/programs/program-json.js:60-78 — the exported object
{ name, totalWeeks, tagline, description, category, difficulty, equipment, goals, days,
  weeklyVolModifiers, progressionStyle, progressionModel, dossier }   // no prescriptions, no dayExercises
// :103-115
createImportedProgram → { ...plan, sourceProgramId: null }
```
**Measured (`node /tmp/probe2.mjs`, a `jt-shed` catalog program):**
```
export keeps dayExercises? false   trainingMaxLifts? false
rt model: jt-shed   dayExercises? false
Dumbbell Bulgarian Split Squat | catalog: 3×15 | imported: 4×10
Chest-Supported Dumbbell Row   | catalog: 3×15 | imported: 4×10
Band Leg Curl                  | catalog: 3×20 | imported: 4×10
```
and for an openGym import: `liftTarget` 5×5 @80 kg rest 180 → after export+import `3×10`.
**Impact:** moving a plan to a new device collapses every per-lift target to the uniform week modifier — the exact *"everything is 4 × 10"* failure the fork-inheritance helper exists to prevent, reintroduced through the export path. The J&T case is worse: the exported plan **keeps** `progressionModel: 'jt-shed'`, so the detail page still renders the tier brief while every exercise lists 4×10. Export is reachable from any program card menu (`js/app.js:1685`), so catalog programs are affected too.
**Fix sketch:** export `prescriptions` (clamped as the openGym importer does) and the sidecars the resolver reads; if a model's sidecar cannot be exported, **omit** `progressionModel` so the fork falls back honestly instead of half-resolving.
**Test gap:** `tests/program_json.test.js` asserts ids/days/modifiers only.

---

**ID: AUD-C-4**
**Severity:** P3 · **Type:** correctness (consistency) · **Confidence:** high

**Title:** The recommendation row scores real training frequency; the detail page calls the same model without it, so a program can be "eligible" in the row and "Probably not your programme" on its own page.
**Evidence:** `js/programs/recommendations.js:33-44` passes `weeklySessions: recentWeeklySessions(...)`; `js/programs/detail.js:499` calls `buildWhoItsFor(program, appState)` with no derived frequency, so the `schedule` factor (±18, `recommendation-fit.js:187-199`) never runs.
**Measured (`node /tmp/probe3b.mjs`, strength/intermediate/full-gym, ≥3 logged dates):** `beginner_full_body` → row `eligible true`, reasons `["Uses only equipment you have","3 days/week, like your recent training"]`; detail verdict **"Probably not your programme"**. Same for `hyrox_wod_doubles`.
**Impact:** contradicts `AGENTS.md` ("the SAME `programFit` … so the two surfaces cannot disagree"). Trust only. (Also visible: "1 days/week" is emitted verbatim by the reason copy at `recommendation-fit.js:192`.)
**Fix sketch:** pass the same derived frequency at `detail.js:499`, or accept one shared profile object.

---

**ID: AUD-C-5**
**Severity:** P3 · **Type:** docs / dead-code (safety net) · **Confidence:** high

**Title:** "Every plan-changing builder edit snapshots via `captureProgramDraft`" is false — four plan mutations have no snapshot and no Undo.
**Evidence:** `js/program_builder.js:615-622` `copyPreviousWeek` writes `weeklyVolModifiers` with no `markUndoable`; `:666-669` `b-week-deload` → `markWeekDeload` (halves every week's sets, `progression.js:92-99`); `:735-740` `b-program-weeks` rewrites `totalWeeks`; `:674-681` `b-prog-style` writes `progressionStyle`.
**Expected vs actual:** the snapshot *content* claim holds (`editor-model.js:37-56` captures only `days` + `weeklyVolModifiers` and never `state.weeks`); the *coverage* claim does not. A mistaken "Deload week" tap rewrites the whole plan irrecoverably.
**Fix sketch:** wrap the four handlers in `markUndoable` before mutating.

---

**ID: AUD-C-6**
**Severity:** P3 · **Type:** correctness · **Confidence:** high

**Title:** `progressionModel` inheritance is applied only inside `liftTarget`, so a fork made before the field existed prescribes per-lift tiers in the cockpit but renders none of the J&T / PPLUL detail sections.
**Evidence:** `js/engine.js:464-475` `withInheritedProgressionModel` patches the object at read time; `js/programs/detail.js:680,692,758,763` branch on the **raw stored** `program?.progressionModel`. Probe: a `legacyFork` with the field deleted but `sourceProgramId='shed_pplul'` still returns `{"sets":4,"reps":"6–8"}` from `liftTarget`, while the detail checks are false.
**Impact:** missing coaching detail on legacy forks (the population `AGENTS.md` itself cites as real). No wrong numbers.
**Fix sketch:** export a `resolvedProgramProgressionModel(program)` and have `detail.js` branch on it.

---

**ID: AUD-R2-2** — *found by the coverage-completion reading pass*
**Severity:** P2 · **Type:** correctness · **Confidence:** high

**Title:** "Keep Week N" is never clamped to the **target** program's length, so switching from a 12-week run at Week 12 to an 8-week plan writes `currentWeek = '12'` — a phantom week the plan never had.
**Evidence:**
```js
// js/programs/activation.js:84
startWeekChoices.push({ week: currentWeek, label: `Keep Week ${currentWeek}`, primary: false });
```
`weeks` (the target's `totalWeeks`) is computed at `:47` and not used to bound the choice.
**Impact:** the week selector is built `1..totalWeeks`, so the current week renders unselected; `getWeekModifier` falls back to `DEFAULT_MODIFIER` (3×10), so every day prescribes sets/reps the plan never contained; `js/home/dashboard-model.js:291` reports >100 % week progress and `checkForAutomaticWeekAdvance` short-circuits so the advance prompt never appears again.
**Fix sketch:** `Math.min(currentWeek, weeks)` when building the choice, and label the clamped week honestly.
**Test gap:** no fixture switches from a longer run into a shorter plan.

---

**Also in this area (P3):**
- `js/programs/opengym-plan.js:88`: the same exercise twice in one day is de-duped from `lifts` but `dayPrescriptions[name]` is overwritten, so the LAST routine's sets silently win.
- `js/programs/editor-model.js:139` `copyProgramDay` copies the day but not the program-level `prescriptions` sidecar.
- `js/state/activation-identity.js:85-106` `weekHasLoggedData` ignores `sessionStatus`/`notes`/`gymRpe`, so a week whose only content is a session note is dropped rather than archived on a program switch — while `state.js:497` `dayHasRecordedActivity` does count notes.
- `js/programs/detail.js:432-443`: for a program with no `workoutPreview` and no J&T model (any openGym import) the Structure sample lists exercise names with **no sets×reps at all**.
- `js/programs/library.js:655` `recommendationBasis(athleteProfile(_appState))` omits the derived frequency too.
- `js/programs/compare.js:52-60` `programStats` reads only catalog-shaped fields, so a builder-made custom program compares as "—".
- `js/programs/program-json.js:72` writes `progressionModel: ''` instead of omitting the key.

---

### E. Shell, UI, accessibility, performance

**Read coverage:** ~4,600 of ~30,000 in-scope lines read fully (~15 %), with exhaustive *grep* coverage of every `innerHTML =` sink, `data-module`, `data-modal-root`, `role="button"`, `type="file"` and `.hit-target`. Runtime: 11 probes in real Chromium at 320/390, dark and light, with a published 48 px `--app-safe-top` and a modules-off run. **I independently re-ran a shell/a11y probe** (4 destinations × 2 widths, modules off) and reproduced the unnamed-Settings-input and sub-44 px findings.

---

**ID: AUD-E-1**
**Severity:** P1 · **Type:** a11y · **Confidence:** high (measured)

**Title:** The app's universal confirm dialog is unreadable in light mode — near-black text on a hard-coded near-black panel.
**Evidence:**
```js
// js/ui/confirm-modal.js:32-38  (inline <style>, NOT theme-scoped)
.cmodal { background: linear-gradient(180deg, rgba(30,34,48,0.98), rgba(20,24,36,0.98)); }
.cmodal__title { color: var(--text-inverse,#f8fafc); }
.cmodal__msg   { color: var(--text-muted,#94a3b8); }
```
```css
/* css/styles.css:122 */
--text-inverse: var(--text-primary);
/* css/styles.css:3847 — light theme */
--text-primary: #0f172a;   --text-muted: #526176;
```
**Measured (light theme):** title `rgb(15,23,42)` on `rgb(30,34,48)` = **1.15:1**; message 2.1:1; cancel 2.4:1. Dark theme: 12.9:1.
**Impact:** every destructive confirmation routes through this one component — delete activity (`activities.js:421`), delete photo/measure (`analytics.js:186,225`), six `app.js` sites, settings reset, discard run (`gps-tracker.js:537`). In light mode the athlete cannot read what they are confirming. (`.cmodal__btn` is also 41 px high — see AUD-E-3.)
**Fix sketch:** theme the panel with `var(--bg-card)`/`var(--bg-deep)` + a border token, or add a `html[data-theme="light"] .cmodal` override in `ensureStyles()`; stop aliasing `--text-inverse` to `--text-primary` for text on a dark panel.
**Test gap:** no browser check opens `confirmModal` at all.

---

**ID: AUD-E-2**
**Severity:** P1 · **Type:** a11y / correctness · **Confidence:** high (measured + code)

**Title:** History, Quick Activity and Session Recap pad the top from `env()` only — on a notchless Android phone the History back button and title sit under the status bar.
**Evidence:**
```css
/* css/styles.css:9223, 9234, 9579 */
#sessionRecapScreen { padding: calc(16px + env(safe-area-inset-top, 0px)) 18px calc(32px + env(safe-area-inset-bottom, 0px)); }
#activitiesScreen   { padding: calc(12px + env(safe-area-inset-top, 0px)) 18px calc(40px + env(safe-area-inset-bottom, 0px)); }
#activityScreen     { padding: calc(16px + env(safe-area-inset-top, 0px)) 18px calc(24px + env(safe-area-inset-bottom, 0px)); }
/* :9399, :9415 — the action menu and the undo bar do the same */
```
`var(--safe-top)`/`var(--safe-bottom)` appear **zero** times in those rule ranges, while the correct form exists elsewhere (`:262`, `:4471`, `:9602`).
**Measured (48 px published inset, the way `MainActivity.kt` does):** `#activitiesScreen` `paddingTop: 12px`; back button top 24 (so 24 of its 44 px are under the bar); `<h1>History</h1>` top 37–55 — **entirely behind the status bar**. `#sessionRecapScreen` and `#activityScreen` both compute 16 px.
**Impact:** History is reachable from Home, Train and every recap; Quick Activity and Session Recap are the live-run and session-end surfaces. `AGENTS.md` says these tokens are *"the ONLY correct way to clear the system bars … on a notchless phone `env()` is 0px and env-only CSS silently does nothing"* — this is that exact defect, surviving because `scripts/safe-area-browser-check.mjs` never opens these three screens and `tests/safe_area_guard.test.js:83-97` lists only `.modal-overlay`, `.ob-step`, `.migration-recovery`.
**Fix sketch:** `padding-top: calc(12px + var(--safe-top))` etc. (keeping the env() line first as the documented fallback) on the three rules, plus `--safe-bottom` on `.activity-undo-bar` and `--safe-top` on `.activity-action-menu`; add the three selectors to the guard test and open History in the safe-area check.
**Test gap:** the guard's surface table is the gap.

---

**ID: AUD-E-3**
**Severity:** P2 · **Type:** test-gap / a11y · **Confidence:** high (measured by both the stream and me)

**Title:** The 44 px check never opens Settings or the confirm dialog, and both contain sub-44 px controls.
**Evidence:** `scripts/touch-target-browser-check.mjs:261-266` walks only `home|train|progress|plans`; `grep -c settingsOverlay` → **0**; and its `MEASURE` is scoped to `el.closest('.view-container')`, which `#settingsPanel` is not inside — so Settings is invisible twice over. Measured:
```
Settings → Health  button#hcConnectBtn.hc-connect-btn   71×24   (only way to enable Health Connect)
confirm dialog     button.cmodal__btn--ok/--cancel      142×41
Settings → Training input#settingsRestAlertVolume       129×16
```
**Impact:** the one control that enables a whole data source is 24 px tall; every destructive confirm's buttons miss by 3 px. My own probe reproduced the 15 px range input and the unnamed inputs independently.
**Fix sketch:** `min-height: var(--touch-target)` on `.hc-connect-btn` and `.cmodal__btn`; add a Settings surface (per tab) and a confirm surface to the check's `surfaces` list.
**Test gap:** the check itself is the missing test.

---

**ID: AUD-E-4**
**Severity:** P2 · **Type:** a11y · **Confidence:** high (measured by both)

**Title:** Six Settings inputs have no accessible name — the visible label is a sibling `<label>` with no `for`.
**Evidence:** `index.html:1489-1491` `<label class="settings-row-label">Name</label><input … id="settingsNameInput" …>` and the same shape at `:1493` (`settingsBodyWeight`), `:1544` (`settingsThresholdPace`), `:1774` (`settingsReminderTime`), `:1803` (`settingsStreakAlertTime`), `:1880` (`settingsStepGoal`). `grep 'for="settingsNameInput'` → none.
**Measured:** six inputs reported UNNAMED at 390 px, while the four nav destinations report **0** unnamed — so this is Settings-specific. `tests/accessibility.test.js:35-37` hard-codes a four-id allowlist, so the static test cannot see them.
**Fix sketch:** add `for="…"` to the six existing labels (cheapest) or `aria-label` on the inputs.

---

**ID: AUD-E-5**
**Severity:** P2 · **Type:** a11y · **Confidence:** high (measured)

**Title:** Accent colours used as small text are never redefined for light mode — today's Train day cell is 1.64:1, the Home "Coach" eyebrow 1.81:1.
**Evidence:** `css/styles.css:40` declares `--color-cyan: #22d3ee` in `:root` and the four dark palettes; the light block (`:3832-3870`) redefines 31 tokens and **none** is a `--color-*`. Consumers: `.home-insight__eyebrow` (`:2170`), `.tl-week__day--today` name/date (`:10071-10072`), `.plans-utility-btn--accent` (`programs.css:4200`).
**Measured (light):** Train today cell `#22d3ee` on `rgb(240,244,248)` = **1.64:1**; Home "Coach" 1.81:1; Plans category 1.40:1; Profile readiness 2.30:1; Health "Connect" 2.42:1. Dark theme: no failures below 4.5.
**Impact:** every light-theme user; worst on the Train rail's *today* cell, the one cell the surface exists to point at. `AGENTS.md` already documents the per-surface fix pattern (`#155e75` for measurements) — it was never applied to the accent tokens.
**Fix sketch:** a light override block for the accent tokens used as text (`--color-cyan: #155e75`, `--color-green: #047857`, `--color-amber: #b45309`, `--color-orange: #c2410c`), then re-check chart strokes that reuse the same variables.

---

**ID: AUD-E-6**
**Severity:** P2 · **Type:** bug (layout) · **Confidence:** high (measured)

**Title:** A legal 30-character display name overflows Profile to 667 px at a 320 px viewport and blows the Settings header to 448 px inside a 319 px clipped panel.
**Evidence:** `index.html:1490` allows `maxlength="30"`; `.profile-hero-name` (`css/styles.css:6391-6402`) and `.settings-name-display` (`:3352-3357`) have no `overflow-wrap`; `.settings-panel` is `overflow: hidden` (`:3305`).
**Measured:** `settings.name = 'W'×30` at 320 px → `document.scrollWidth 667 / clientWidth 320`; `#settingsNameDisplay` width 448 in a 319 px panel. A 30-character name *with spaces* is clean — so only unbroken tokens fail, which an imported blob or a long handle produces. `js/state/import-validate.js` validates routine/folder/program names but never `settings.name`.
**Fix sketch:** `overflow-wrap: anywhere` on both selectors and clamp the imported name length.

---

**ID: AUD-R1-1** — *found by the coverage-completion reading pass*
**Severity:** P2 · **Type:** broken flow · **Confidence:** high

**Title:** Focusing the Plans search box hides the entire library and nothing restores it — the athlete is left on an empty search landing for the rest of the visit.
**Evidence:**
```js
// js/programs/library.js:1052-1058
document.getElementById('progLibraryContent').style.display = 'none';
```
There is no `blur`, clear-on-empty or back handler; re-tapping the already-active tab is a no-op because `lib-tab` at `:1166` requires `tab !== _activeTab`.
**Measured (my own probe, 390 px):** `before focus: block` → `after focus (empty): none` → `after focus→blur, no typing: none` → `after leaving and returning to Plans: block`. So the library stays hidden exactly until the athlete either types-then-clears or leaves the tab.

**Impact:** tap search, change your mind, tap away → Discover/My Plans is blank. Recoverable, but the surface gives no hint that anything is wrong, and the Clear button is not rendered for an empty input.
**Fix sketch:** on empty query, `blur`/Escape or active-tab tap must call `renderLibraryContent()`.

---

**ID: AUD-R1-2**
**Severity:** P3 · **Type:** correctness (dishonest count) · **Confidence:** high

**Title:** The "My Plans" badge counts raw `bookmarks`/`completions` arrays while the list drops ids that no longer resolve, so deleting a bookmarked custom plan leaves a badge that can never match the list.
**Evidence:** `js/programs/library.js:221-226` `const myCount = savedCount + completedCount + customCount + routinesCount;` versus `renderMyPlans` (`:390-393`), which filters through `resolveProgramMeta`. Nothing prunes those arrays on delete.
**Fix sketch:** derive the badge from the same resolved lists, and prune dead ids on delete.

---

**ID: AUD-R1-3**
**Severity:** P3 · **Type:** correctness · **Confidence:** high

**Title:** Un-saving a plan from inside "Saved" decrements the badge but never re-renders the list, so the removed plan stays on screen.
**Evidence:** `js/programs/library.js:1186` `renderLibraryTabs();` — `toggle-bookmark` repaints the button and the badge only.
**Fix sketch:** when `_activeTab === 'my'`, call `renderLibraryContent()` after the toggle.

---

**ID: AUD-R2-4**
**Severity:** P3 · **Type:** a11y · **Confidence:** high

**Title:** The program-switch sheet's start-week rows are 34 px tall — below the 44 px token — and the sheet is not in the touch-target check's surface list.
**Evidence:** `js/programs/activation.js:171` `.actm__choice { … min-height:34px; … }` on the `<label>` wrapping the radio, with no `.hit-target` expansion. `scripts/touch-target-browser-check.mjs` never opens this sheet, which is why the range was never executed.
**Impact:** the one control that decides "Week 1 or keep my current week" is under the tap minimum on a phone, and the check cannot see it.
**Fix sketch:** `min-height: var(--touch-target)` and add the activation sheet to the check's surface walk.

---

**Also in this area (P3):**
- `js/ui/customize-sheet.js:93-100`: unchecking the **last** visible Progress band leaves the switch OFF while the band stays on screen — `setCardVisible` silently refuses (`customize.js:150-173`) and the sheet never re-renders or announces. Measured: `{"checked":false,"bands":["reports"]}`.
- `css/styles.css:3405-3409`: at 320 px the Settings filter strip is 381 px wide in a 291 px box with the scrollbar hidden, so the **Data** filter (backups/export) starts at x=341 — entirely off-screen with no affordance. Keyboard `scrollIntoView` reaches it; a thumb has no hint.
- Palette token drift: `--glass-border` is defined in Midnight, Forest and Ember but **missing from Slate** (`css/styles.css:10772-10833`), so Slate card borders are ~40 % weaker. Contradicts "the four palettes define the same tokens".
- `js/home.js:130,463,467,479` use `scrollIntoView({behavior:'smooth'})` with no `prefers-reduced-motion` check, while the CSS half of reduced motion is thorough (`css/styles.css:8397-8408`, measured `animationName: none`).
- `js/ui/action-menu.js:47,22`: `role="menu"`/`role="menuitem"` with no arrow-key navigation or roving tabindex — Escape works, arrows do nothing.
- Progress band **detail** screens are unmeasured for target size; `.an-tab` (`css/analytics.css:9-15`) is ~39 px and no check opens a band detail.

---

**ID: AUD-R7-1** — *found by the coverage-completion reading pass*
**Severity:** P2 · **Type:** correctness (dead branch, wrong copy) · **Confidence:** high (verified by grep)

**Title:** The streak and weekly-summary notifications read `state.streakData.current`, a field **nothing ever writes**, so the "you're on a streak" branch is unreachable and a 40-day athlete is told "No activity yet today".
**Evidence:**
```js
// js/notifications.js:347
const streak = _getState?.()?.streakData?.current || 0;
```
`grep -rn "streakData\.current\s*=" js/` → **no writes**; the live streak comes from `computeStreak(state.weeks, days, state)` (`js/home/dashboard-model.js:471`, used by `js/athlete-profile.js:50`). `js/athlete-profile.js:49` even states *"the legacy state.streakData was never written"*.
**Impact:** `streak > 0` at `:348-349` never holds, so the streak nudge always sends its "start a session" copy. The same dead read feeds `js/brain/coach-memory.js:86` and `js/brain/hybrid-score/share-card.js:46`, where it means **the shared Hybrid Score card can never print a streak** — it always shows "⚡ openHybrid" where the app shows "🔥 N-day streak", dropping the athlete's most shareable achievement from the most public surface.
**Fix sketch:** read `computeStreak(weeks, WEEK_DAYS, state).current`.
**Test gap:** no test asserts notification copy against a real streak.

---

**ID: AUD-R7-2**
**Severity:** P2 · **Type:** privacy / preference ignored · **Confidence:** high (verified by grep)

**Title:** Turning reminders **off** is not persisted anywhere, so they re-arm on the next launch or the next settings change.
**Evidence:**
```js
// js/notifications.js:119-121
export function rearmReminder() { if (notificationsGranted()) _armAll(); }
```
`grep -rn "notificationsEnabled\|notifEnabled\|remindersEnabled" js/ index.html` → **no matches**. "Off" is only `cancelReminders()` clearing the current timers (`js/app.js:1977`); `initNotifications` (`js/notifications.js:73-78`) and every `rearmReminder()` from `js/settings.js:748/762/775` re-arm the daily reminder and the missed-workout push while the OS permission stands.
**Impact:** reminders resume after an explicit "Reminders are off." choice — a consent-sensitive surface in a health app. `js/settings.js:394` also re-ticks the master box from `notificationsGranted()`, so the off state is not even visible to the athlete.
**Fix sketch:** persist an explicit setting, gate `_armAll`/`initNotifications`/`rearmReminder` on it, and clear it from the toggle.

---

**ID: AUD-R8-2**
**Severity:** P2 · **Type:** correctness (shared-path bypass) · **Confidence:** high

**Title:** The Hybrid Score share card re-implements the share/download flow inline and leaves its canvas draw unguarded, breaking the "one path for every card" invariant.
**Evidence:**
```js
// js/brain/hybrid-score/share-card.js:150
drawScoreCard(ctx, W, H, result, state, { variant, weekLabel });
```
lines 150-167 then do `toBlob → File → navigator.share → <a download>` themselves, while `pr-share.js`, `share/workout-share.js` and `analytics/share-card.js` all go through `shareImageCanvas`.
**Impact:** a throw in `drawScoreCard` (e.g. `result` undefined — `:44` reads `result.band` without optional chaining while `shareCaption` explicitly tolerates a null result) escapes the click handler with no toast and no file. Any future fix to the shared path (e.g. a `canShare` throw) silently misses this card.
**Fix sketch:** wrap the draw in `try/catch` with a toast, then delegate to `shareImageCanvas`.

---

**ID: AUD-R8-3**
**Severity:** P2 · **Type:** correctness (invented claim) · **Confidence:** high

**Title:** The coach's projection answer always says "I need more data" because the projection is never passed to it.
**Evidence:**
```js
// js/brain/coach-qa.js:76
return `Keep logging sessions — once I have a bit more data I'll project your next PR and race times.`;
```
The only caller passes `{ model, score, risk, session }` (`js/home.js:100`); `ctx.projection` is never supplied, so the fallback answers 100 % of the time.
**Impact:** the intent also captures `\bpr\b|personal record|race|faster|predict|1rm|estimate`, so an athlete with years of logs asking "what will my next PR be?" is told they need more data — an invented data-insufficiency claim on the one surface whose premise is "every answer is literally true of the data".
**Fix sketch:** build the projection in `answerCoachOnHome` and pass it, or answer "a projection isn't available yet" without asserting what the athlete lacks.

---

**ID: AUD-R8-4**
**Severity:** P2 · **Type:** correctness (invented reassurance) · **Confidence:** medium

**Title:** With zero logged load and zero wellness data, the coach answers "your fatigue signals look clean — train as planned".
**Evidence:**
```js
// js/brain/coach-qa.js:70
return `No — your fatigue signals look clean right now. Train as planned and keep your sleep steady.`;
```
`assessOvertrainingRisk` returns `level:'none'` for a brand-new athlete with no data (`js/brain/risk.js:107`), and `js/home.js:95` leaves `risk` `null` when that call throws — both land here.
**Impact:** a first-day athlete (or a swallowed risk-assessment failure) is reassured from no evidence, while the readiness answers in the same file correctly say "not enough evidence".
**Fix sketch:** gate the reassurance on the risk model having inputs; otherwise answer "I don't have enough logged data to judge fatigue yet".

---

**Also in this area (P3):**
- `js/notifications.js:294`: `const daysUntilSunday = ((7 - now.getDay()) % 7) || 7;` — opening the app on a Sunday 10:00 schedules the weekly summary for the **following** Sunday, so the one day it is due is skipped (and `:297`'s past-18:00 guard is dead code).
- `js/brain/year-review.js:64-65`: session counting re-derives the gym-time rule instead of using `gymTimeIsSession`, so a day whose only sets are warm-ups but which has a saved gym duration counts as a session in Year in Review while Progress counts it as nothing (and the empty state becomes a fabricated 1-session recap).

### F. Platform, security, integrations

**Android: static only** — no emulator, no `adb`, no Gradle wrapper. Every Kotlin claim below is source-reading; the eight JVM test classes could not be executed.

---

**ID: AUD-F-1**
**Severity:** P2 · **Type:** privacy · **Confidence:** high (scrubber executed)

**Title:** Crash reporting is live in every build, and the scrubber leaves `message`, `extra` and `tags` intact — so the advertised PII guarantee is not implemented for the fields that carry payloads.
**Evidence:**
```js
// js/monitoring/sentry-config.js:7  (a real DSN, not '')
export const SENTRY_DSN = 'https://ebeda354…@o4511663726329856.ingest.de.sentry.io/4511663733080144';
// js/monitoring/sentry.js:29-31
delete event.request;   delete event.user;   if (event.contexts) delete event.contexts.device;
// js/monitoring/report-error.js:33
S.captureException(err, { tags: { handled: 'true', context } });
```
**Expected vs actual:** `AGENTS.md` says "DSN-gated (off until `sentry-config.js` has a DSN)" and the file's own comment says "we never ship emails, IPs, or the app's state blob". Actual: a DSN is configured, `initSentry` runs unconditionally at `js/app.js:2449`, and running the scrubber on `{message:'waist 84.5cm, lat 51.5', extra:{…}, tags:{…}}` returns all three keys unchanged.
**Impact:** every install uploads on every handled error. Today's payloads are counts and versions, so nothing health-specific leaks *yet* — but one future `reportHandledError(ctx, stateFragment)` leaks measurements or a route silently. The Android threat model and the privacy policy both assert the stronger guarantee.
**Fix sketch:** delete `event.extra` and `event.tags` in `scrubEvent` (re-add only a whitelisted `handled`/`context`), cap `event.message` and `exception.values[].value`; fix the `AGENTS.md` sentence.
**Test gap:** `tests/sentry.test.js:37` asserts `out.message === 'boom'` and never constructs `extra`/`tags` — the gap is pinned as intended behaviour.

---

**ID: AUD-F-2**
**Severity:** P2 · **Type:** privacy · **Confidence:** high (static)

**Title:** Every live run streams the athlete's real-time coordinates to a third-party tile CDN.
**Evidence:**
```js
// js/gps-tracker.js:189, 200
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(_liveMap);
_liveMap.panTo([lat, lng]);      // on every accepted fix
```
```html
<!-- index.html:30 -->
img-src 'self' data: blob: https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com;
```
**Expected vs actual:** a local-first app enumerates every network destination in its threat model, which mentions tiles only as "approved". Actual: a `z=15` tile request encodes position to roughly street precision, in near real time, with the athlete's IP — during a live GPS session, with no consent step. `docs/legal/privacy-policy.md:135` discloses that "map/font requests may be processed on servers outside your [country]", so this is *thinly* disclosed rather than hidden.
**Impact:** every run with the map open, PWA and APK, plus every stored-route view (`js/workout-map.js:67`). A local-first runner cannot avoid it once a map draws.
**Fix sketch:** name the tile provider and the fact that a map view sends location in the privacy copy and the threat model; the real fix is a bundled basemap or a map-off default.
**Test gap:** no test asserts which external hosts a map view contacts; the CSP test only asserts what is allowed.

---

**ID: AUD-F-3**
**Severity:** P1 · **Type:** correctness / privacy (health claims) · **Confidence:** high (verified)

**Title:** The fasting copy rule is enforced in exactly **one** renderer; four shipping surfaces violate it — notifications, the analytics view, its empty state, and the zone descriptions.
**Evidence:**
```js
// js/fasting/fasting-nudge.js:19-25
const STAGE_BLURB = {
  blood_sugar: 'Insulin is falling and glycogen is starting to burn.',
  glycogen:    'Glycogen stores are draining — fat oxidation is climbing.',
  fat_adapt:   'Fat is now your main fuel — the metabolic sweet spot.',
  ketosis:     'Ketones are up and autophagy — cellular clean-up — has begun.',
  deep_fast:   'Deep fasting: growth hormone up, cellular renewal in earnest.',
};
```
delivered to the OS notification shade by `js/notifications.js:254-258`, with `notifFastingStage` defaulting to **true** (`js/state.js` base defaults).
**Expected vs actual:** `AGENTS.md` P7 states the copy rule — "elapsed time against the athlete's own goal; **no autophagy, fat-loss, hormone, metabolic or stage claim**, and a test greps the rendered output for those words." The band obeys it; the notification path fires every banned term at the athlete.
**Impact:** unproven medical claims about the athlete's body, on a phone notification and on the Fasting analytics screen, in a health app — contradicting a rule the team set deliberately. `tests/fasting_band.test.js:63` greps **only** `renderFastingBand()`, so the ratchet reports success while the claims ship elsewhere.

The reading pass then found three more surfaces in `js/analytics/views/view-fasting.js`:
```js
// :281 — the *Stats* tip
`Your longest fast of ${_fmt(longestFast)}h reached the Ketosis Progression phase. Autophagy — the cellular recycling process — begins around 24 hours.`
// :677 — the EMPTY STATE every new user sees
'openHybrid shows your metabolic stages'
// :318 / :424 — insights
'regular shorter fasts produce better long-term metabolic outcomes'
'The Fat Adaptation phase (16–24h) … may improve insulin sensitivity'
```
plus `:153/:172`, which render `FASTING_ZONES[].description` verbatim ("Autophagy begins in earnest", "Growth hormone markedly elevated"), and `js/fasting/fasting-insights.js:160,211` ("metabolic signalling", "metabolic health").

**Fix sketch:** rewrite `STAGE_BLURB`, the four view strings and the zone descriptions to elapsed-time wording ("12 hours in", "You've passed your goal"); export them so one banned-word assertion covers notifications, the analytics view, the empty state and the insights, not just the band.
**Test gap:** the band-only grep.

---

**ID: AUD-F-5**
**Severity:** P3 · **Type:** bug · **Confidence:** high (reproduced)

**Title:** One imported health record without a `date` permanently breaks Health Connect sync.
**Evidence:**
```js
// js/health/health-bridge.js:168-171
hc[sk].sort((a, b) => a.date.localeCompare(b.date));
```
`js/state/import-validate.js` never mentions `healthConnect` (0 hits), so an imported blob reaches this sort untouched.
**Reproduction:** `node --input-type=module -e "…applyHealthDays(s,[{date:'2026-11-20',steps:8000}],['steps'])…"` with `healthConnect.steps = [{value:1},{value:2}]` → `THREW Cannot read properties of undefined (reading 'localeCompare')`. A one-element array does **not** throw, which is why it went unnoticed.
**Impact:** every subsequent sync rejects until the user re-imports; the feature is dead with no actionable error.
**Fix sketch:** drop records whose `date` is not `YYYY-MM-DD` before sorting.

---

**ID: AUD-F-6**
**Severity:** P3 · **Type:** bug (build divergence) · **Confidence:** high (static)

**Title:** A locally built APK ships a partial asset tree, so the service worker's atomic install always fails.
**Evidence:** `android/app/build.gradle.kts:72` `include("index.html", "sw.js", "manifest.json", "icon-512.png")` — only one icon — while `scripts/gen-precache.mjs:35-37` precaches `icon-192`, `icon-512`, `icon-maskable-512` and `sw.js:365` uses `await cache.addAll(REQUIRED_ASSETS)` (one 404 rejects the whole install). CI hides it because `verify.yml:73` and `release-aab.yml:62` run `stage-web-root.mjs` (all three icons) before Gradle's copy merges on top.
**Impact:** `gradlew assembleDebug` on a clean clone produces an APK with no service worker and two 404 icons. It still boots from local assets, which is why nobody notices.
**Fix sketch:** delete `copyWebAssets` and make `preBuild` depend on `stage-web-root` — one allowlist.
**Test gap:** `tests/web_root_allowlist.test.js` checks the JS allowlist only; nothing compares it with the Gradle includes.

---

**Also in this area (P3):**
- `index.html:36`: `frame-ancestors 'none'` inside a `<meta>` CSP is **ignored by spec** (only an HTTP header honours it), yet `docs/security/webview-threat-model.md:32` lists it as the clickjacking control. The hosted PWA remains framable. `tests/csp_vendored_runtime.test.js` re-asserts the inert directive.
- `android/app/src/main/AndroidManifest.xml:45` (shipped comment): *"Users move data via in-app export + optional Supabase sync."* There is no Supabase client and `supabase/` is empty — exactly the comment a future contributor would trust when re-adding a backend.
- `docs/security/webview-threat-model.md:75` cites `docs/android-device-checklist.md`, which does not exist (the real files are `android-*-device-checklist.md`).
- `HybridHealthBridge.kt:194-227`: `readHealthDataByDay` has no span bound or `start <= end` guard; `Instant.parse("0001-…")` is valid input and would drive ~2.7 M iterations. JS always sends 90 days.
- `tests/precache_manifest.test.js:40` matches only double-quoted `src`, so a single-quoted classic `<script src='./js/x.js'>` would be neither precached nor caught. `tests/gps_durable_journal_contract.test.js:15-18` uses `[^]*` (whole-file), so its assertion passes if two tokens appear anywhere in any order.
- `sw.js:440-443`: an offline miss on a non-precached asset resolves `respondWith(undefined)` → TypeError instead of a clean 504.
- `js/garmin.js:283-288`: semicircle→degree conversion has no post-conversion range check, so an out-of-range `position_lat` is stored and Leaflet renders garbage for that route.
- Five modules are unreachable from any entry point and absent from the precache: `js/analytics/charts/load-charts.js`, `charts/running-charts.js`, `analytics/metric-inventory.js`, `home/morning-briefing-card.js`, `home/tile-renderers.js` (`metric-inventory.js` is referenced only by a test).
- `.github/workflows/codeql.yml` analyses JavaScript only; the privileged Kotlin half has no SAST.

---

### G. Stylesheets — read in full in the coverage-completion pass

All six sheets (18,808 lines) were read line by line. Only user-breaking classes are reported: undefined tokens, light-theme gaps, safe-area misuse, sub-44 px controls, layout/z-order breakage, dead selectors.

**ID: AUD-CSS-A-1**
**Severity:** P1 · **Type:** a11y (contrast) · **Confidence:** high (measured by me in the browser)

**Title:** In light mode, the moment a set is ticked its logged weight/reps turn near-white on white — the number becomes unreadable exactly when it becomes the record.
**Evidence:**
```css
/* css/styles.css:1311-1317 — specificity (0,3,0) */
.cockpit-set-row.is-complete .input-weight-node,
.cockpit-set-row.is-complete .input-set-value-node {
  color: #d7f3e6;
}
/* css/styles.css:3934 — specificity (0,2,2), so it LOSES */
html[data-theme="light"] .cockpit-set-row input { color: #0f172a; }
```
**Measured (my probe, 390 px, light theme, adding `is-complete` to a real row — exactly what a tick does):** colour goes `rgb(15,23,42)` → `rgb(215,243,230)` on a `rgb(255,255,255)` card = **1.18:1**.
**Impact:** every working set of every session in light mode, from the first tick. The athlete can no longer read what they just lifted while checking their session, and the value is still stored correctly (this is presentation only).
**Fix sketch:** add a light-mode rule at equal-or-higher specificity: `html[data-theme="light"] .cockpit-set-row.is-complete .input-weight-node, … .input-set-value-node { color: #0f172a; }`.
**Test gap:** no check computes contrast in the cockpit's completed state.

---

**ID: AUD-CSS-A-2**
**Severity:** P2 · **Type:** correctness (invisible feedback) · **Confidence:** high

**Title:** Toasts paint **behind** the Settings panel and every bottom sheet, so confirmations raised from Settings are invisible.
**Evidence:** `css/styles.css:113` `--z-toast: 300;` versus `.settings-overlay { z-index: 900 }` (`:3284`) and `.bottom-sheet { z-index: 999 }` (`:1892`).
**Measured (my probe):** with Settings open and a toast fired from inside it, the toast sits at `z-index: 300` and `document.elementFromPoint()` at the toast's centre returns **`settings-body`** — the panel is painted over it. `toastRenderedAbovePanel: false`.
**Impact:** "Weight unit: kg", "Remembered rests cleared", and every save/export error raised from Settings renders behind an opaque full-height panel — the only feedback for those actions is invisible on a phone.
**Fix sketch:** raise `--z-toast` above 999 (or emit toasts into the top layer).

---

**ID: AUD-CSS-A-3**
**Severity:** P2 · **Type:** correctness (undefined token) · **Confidence:** high

**Title:** `--border-light` is used **30 times** in three sheets and declared **nowhere**, so every affected `border` shorthand is invalid and collapses to no border.
**Evidence:** `grep -rn -- "--border-light:" css/ index.html js/` → **0**; `grep -rn "var(--border-light)" css/` → **30** in the first count and **40+** including `programs.css:2447-2792` (24 declarations in the Program Builder alone: tab strip, mode buttons, shape cards, day cells, every field and select, week cards, the exercise picker) plus `analytics.css:2098`. No use supplies a fallback.
**Impact:** the program builder's editor rows, pickers, week cards and copy rows lose their boundaries; the workout-picker tiles lose their card surface; and on **Home** `.home-bw` / `.home-hy` set no background, so the bodyweight card and the training-balance, strength and endurance cards lose their only outline and dissolve into the page. The CSS reading pass counted ~40 usages across three sheets.
**Fix sketch:** declare `--border-light` in both themes (beside `--border-default`), or substitute `var(--border-default)` in the 30 uses.

---

**ID: AUD-CSS-A-4**
**Severity:** P2 · **Type:** layout (overflow at 320) · **Confidence:** high

**Title:** A long exercise name has no shrink or wrap path in the cockpit header, so it pushes the settings and superset buttons out of the card at 320 px.
**Evidence:** `css/styles.css:1104` `.cockpit-ex-name { font-size: var(--text-xl); font-weight: 800; … }` — no `min-width:0`, no `overflow-wrap`; its flex ancestor `.cockpit-header-clickzone` (`:1083`) has no `min-width:0`, and `.cockpit-exercise { overflow: hidden }` (`:1051`) clips the result.
**Impact:** the app explicitly supports custom and imported exercise names; a long unbroken one makes the trailing ⚙ and superset controls unreachable at 320 px.
**Fix sketch:** `min-width:0` on the click zone and `overflow-wrap: anywhere` on the name.

---

**ID: AUD-CSS-A-5**
**Severity:** P3 · **Type:** correctness (undefined token) · **Confidence:** high

**Title:** `--surface-card` is used once and declared nowhere, so the workout-picker tiles render with no background.
**Evidence:** `css/styles.css:2616` `background: var(--surface-card);` — the token's only occurrence in the repo.
**Fix sketch:** use `var(--bg-card)`.

---

**ID: AUD-CSS-B-3**
**Severity:** P2 · **Type:** a11y (contrast) · **Confidence:** high

**Title:** In light mode the per-set sheet's destructive controls ("Remove this set", the Failed segment) are ~1.9:1 on white.
**Evidence:** `css/styles.css:10665` `color: #fca5a5` — and `:10651` for the failed segment — with no light override (the only light rule at `:10667` repaints the background). The sibling `.ss-member-remove` already does this correctly at `:5852` (`#b91c1c`).
**Impact:** the two controls that delete or flag a set are the least legible text in the sheet the athlete uses mid-set — a mis-tap surface in the logging loop.
**Fix sketch:** a `html[data-theme="light"]` override to `#b91c1c` for both.

---

**ID: AUD-CSS-B-4**
**Severity:** P2 · **Type:** a11y (contrast) · **Confidence:** high

**Title:** The empty Profile's "Browse Programs" CTA is ~1.7:1 in light mode — it reads as disabled, on the only route out of the empty state.
**Evidence:** `css/styles.css:6816` `color: #c4b5fd` on `rgba(139,92,246,0.15)` over the white `.profile-empty-card`; neighbouring profile rules do have light overrides (`:6988-7015`), this one does not.
**Fix sketch:** darken to `#5b21b6` in the light block.

---

**ID: AUD-CSS-B-5**
**Severity:** P3 · **Type:** layout (z-order) · **Confidence:** high

**Title:** The History list's sticky month header never appears — it pins behind the sticky topbar.
**Evidence:** `css/styles.css:9296` `.activity-month-header { position: sticky; top: 0; z-index: 2; }` while `.activities-topbar` in the same scroller is `z-index: 4` and ~84 px tall with an opaque background.
**Impact:** month grouping in History reads as one undated stream while scrolling — exactly what the sticky label was added to prevent.
**Fix sketch:** `top: calc(76px + var(--safe-top))`.

---

**ID: AUD-CSS-C-1**
**Severity:** P2 · **Type:** correctness (undefined tokens, state invisible) · **Confidence:** high

**Title:** Two more undeclared tokens, `--bg-elevated` and `--bg-dark`, leave the Program Builder's **selected** tab/mode with no fill and its sticky undo bar transparent.
**Evidence:** `css/programs.css:2508,2519,2557,2569` `background: color-mix(in srgb, var(--accent-blue) 18%, var(--bg-elevated));` and `:2501` `var(--bg-dark)`; both tokens are declared nowhere and have no fallback, so each `background` is invalid at computed-value time.
**Impact:** the builder cannot show which tab or progression mode is active (only a 34 %-alpha inset ring survives), and `.program-editor__undobar` becomes a transparent sticky strip whose "Undo" label floats over the text scrolling beneath it. Distinct from AUD-CSS-A-3 (same class, different tokens, different fix).
**Fix sketch:** declare `--bg-elevated: var(--bg-input)` and `--bg-dark: var(--bg-deep)` in `:root`, with light-theme values.

---

**ID: AUD-CSS-C-2**
**Severity:** P2 · **Type:** a11y (missing theme) · **Confidence:** high

**Title:** `hybrid-score.css` contains **zero** light-theme rules, so the Week/Month/Year-in-Review tiles and the "Under the hood" disclosure are white-on-white in light mode.
**Evidence:** `css/hybrid-score.css:258` `background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);` — and `grep -c 'data-theme="light"' css/hybrid-score.css` → 0. `brand-consistency.css:233` resets only `.mbrief`'s background.
**Impact:** the review tiles read as loose text with no edge, and the interactive `<summary>` loses every affordance that says it opens.
**Fix sketch:** add a light block for `.wrev-stat`, `.hs-underhood__summary`, `.hs-action`, `.hs-levelbar`.

---

**ID: AUD-CSS-C-3**
**Severity:** P2 · **Type:** a11y (contrast) · **Confidence:** high

**Title:** The program-detail "Active" chip and three siblings keep a dark-theme pale blue in light mode (~2.5:1).
**Evidence:** `css/programs.css:1089` `color: #60a5fa;` with no light override, while the sibling `.active-prog-badge` **does** get `#1d4ed8` at `:2364` — the pattern exists and was missed. Same gap at `.wag-week-reset` (`:4101`), `.wag-status--today` (`:4121`) and `.wpm-type-label--hyrox` (`:2136`).
**Fix sketch:** add the four selectors to the existing light override block.

---

**Also in this area (P2/P3):**
- **Safe-area tokens ignored on six more surfaces** — `.bottom-nav { bottom: calc(24px + env(safe-area-inset-bottom, 0px)) }` (`:583`), `.toast-system` (`:684`), `.exercise-config-overlay` (`:2948`), `.exercise-detail-card` (`:5066`), and `.rl-sheet`/`.el-custom-row` (`:4269`, `:4999`) whose overlays zero the modal padding and then supply no inset at all. **Measured:** with `--app-safe-bottom: 24px` published, `.bottom-nav` computes `bottom: 24px` — the token is ignored and the nav rides on its own 24 px margin. The component sheets add `.program-editor__picker` (`programs.css:2730`, a **full-screen dialog** whose close button therefore sits under the status bar), `.program-editor__tabs` (`:2499`), `.program-editor__picker-results` (`:2742`) and `#wpmSheet .wpm-body` (`:1862`). Same defect class as AUD-E-2, which the guard test does not cover either.
- **`#hcConnectBtn` is 71×24 and `.rl-input` ~31 px tall** (`:3658`, `:4333`) with no `.hit-target` — the Health Connect switch and every live-run input, on surfaces the 44 px walk never opens (same gap as AUD-E-3). The component sheets add four more: `#progSearchClear` 22×22 (`programs.css:53`, hidden until text is typed so the walk can never see it), `.program-text-modal__head > button` 40×40 (`:2790`), `.an-entity-link` 38 px (`analytics.css:539`) and `.mbrief__why-summary` ~19 px (`hybrid-score.css:214`).
- **Dead CSS:** `.type-pill` family, `.rpe-pad-row`/`.btn-rpe`, `.load-pad-row`/`.btn-load`, `.btn-failure`/`.btn-basis`, `.btn-set-meta`/`.btn-set-mode`, `.btn-set-delete`, `.rl-day-btn`, `.btn-indigo`, `.tile-customise-btn`, and `html[data-theme="light"] .toast-container .toast` (the live element is `.toast-system`, so that override never applies). The component sheets add **68 class selectors** with no reference in `index.html` or any template — including `.pg-band--wide` (a ≥600 px two-column layout that can never fire), the whole `.detail-author-card*`/`.social-proof*` block the detail page removed, `.an-pr-badge` + four `.an-muscle-badge--*`, `.an-kpi` chrome, `.hs-levelbar*`, and `.an-chart` sitting inside a `!important` group that never matches. Counting both passes: **roughly 250 dead selectors**. A purge is safe but should be its own commit with a visual regression pass.

---

## 6. Investigated and cleared (false alarms and genuinely safe areas)

These are the claims I expected to fail and which held. Each names the guard so the next auditor does not re-litigate it.

| Area | Claim tested | Why it is safe |
|---|---|---|
| **Boot safety** | A corrupt or truncated blob is not silently replaced by defaults | `js/state.js:811-848`: `preserveCorruptState` + a non-dismissible `role="alertdialog"`, then `throw` before onboarding can save. **I reproduced**: feeding `this is not json {{{` and `{"weeks":{"1":{"lifts":` left the exact bytes in place, wrote a `_corrupt` copy, and opened the sheet titled "Your saved data needs attention". |
| **Future schema** | A blob from a newer app version is never downgraded | `js/state/migrations.js:567-575` throws `StateMigrationError(from, from, …)`; the UI renders "This data was saved by a newer version of openHybrid". **I reproduced** with `schemaVersion: 99`: gated, bytes untouched. |
| **Migrations** | Stepwise, idempotent, atomic | `migrations.js:576-601` loops `for (let v = from; v < CURRENT; v++)`, clones/stamps/validates each step before commit (`:582-587`), and a throw leaves the input byte-identical (`:233-256`). |
| **Quota exceeded** | A failed write is surfaced and does not corrupt state | `js/state.js:737-754` keeps in-memory state authoritative and notifies once per failure streak, naming whether the mirror holds the change. |
| **No backend / no sync** | `AGENTS.md`'s "no account system, backend or cloud sync" | `grep -rn "fetch(\|XMLHttpRequest\|sendBeacon\|createClient\|supabase" js/` (excluding vendor) returns **nothing**. `supabase/` is an empty directory with zero tracked files. The only egress is Sentry, map tiles and Google Fonts, all named in the CSP. |
| **Photo deletion** | Bytes are deleted first; a failure mutates nothing | `js/photos/library.js:96-111` deletes the blob then throws if `deletePhotoBlob` resolves false; `js/metrics/measures.js:212-246` does the same through an injected remover and only touches rows afterwards. |
| **Photo zip integrity** | A manifest-less archive is refused, and the id is not trusted | `library.js:157-158` refuses without `manifest.json`; the id is re-derived from the date (`:179-181`), so a foreign id cannot create an undeletable tile. |
| **Import idempotency** | Re-importing the same file is a no-op | CSV keys on `arch:import:<sessionId>` and skips an existing key (`import-workout-csv.js:429-431`); FIT keys on `arch:fit:<ts>` **and** `findImportedRunSession(state, startTs, 'fit')` scans archived weeks (`import-fit.js:164-167`); bodyweight/measurement readers skip existing dates; the photo zip is idempotent by date. |
| **FIT timestamp** | `timestamp` is the END of an activity | `js/garmin.js:200-211` prefers `start_time`, else `timestamp − duration`, and that start is the import identity. Verified. |
| **Encoding** | UTF-16 Excel exports, `;`/`\t` delimiters, decimal comma | `import-workout-csv.js:22-47` decodes UTF-16LE/BE + BOM and sniffs delimiters outside quotes. |
| **Holds and carries** | Valid working sets with zero volume, and never re-read as reps | `js/set-utils.js:79-85` accepts `sec`/`dist`; `:102-106` `setVolume` returns 0 for non-rep shapes. Verified numerically: hold valid=true, volume=0, day volume 0. Readers branch on shape rather than assuming reps. |
| **Warm-ups** | Excluded from volume, PRs, working-set counts, muscle credits and progression | Volume/validity `set-utils.js:80`; PRs `records.js:114`; counts `completion-policy.js:64`, `session-outline.js:53`, `set-plan.js:47`; muscle `muscle-load.js:29`, `home/session-muscles.js:118`; progression `exercise-history.js:119`. No current writer sets the legacy `isWarmup`-only flag. |
| **Bodyweight** | Never fabricated | `set-mutations.js:314-323` returns `null` when unknown; `load-mode.js` writes `''`; `_ensureBodyweight` prompts. `tests/workout_load_mode.test.js` asserts the 75 kg default is gone. |
| **Load basis** | `each` affects volume only, never e1RM | `set-utils.js:104-105` applies ×2; `strength/e1rm.js:92-96` has no basis term. Verified: each 400 / per-side 200 / legacy 200 for 20 kg × 10. |
| **Band role** | Decided by exercise name at every call site | `grep` shows no direct `applyBandAssistance` call on an accessory; every path passes `{ exercise: liftName }`. Mutation test: breaking the role fails 11 tests. |
| **Defaults** | Shape only a BLANK row; logged sets are never rewritten | `js/workout.js:470-489` applies defaults to a display copy; `:1596-1634` gates every stamp on `isTicked || hasValue || hasStoredWeight`. |
| **Rest persistence** | A rest survives reload; stale/paused/backwards-clock snapshots are rejected | `js/timers.js:126-136` stores an absolute `endsAt`; `:372-394` rejects `v !== 1`, `age < 0`, `age > 2 h`, non-positive remaining. |
| **Finish / discard** | Finish works below 100 % adherence; discard clears both sidecars | `session-status.js:30-54` sets FINISHED whenever anything is logged; `delete-day.js:153` calls `clearSessionStatus` (both fields). |
| **Circuits** | Stable A…Z/AA…ZZ ids, stable colours, group rest = longest member | `superset.js:62-68, 105-110, 267-275, 352-367`. |
| **PR baseline** | All-time, not range-scoped | `exercise-detail.js:87-123` accumulates baselines over the full history before the range filter. |
| **Hidden modules** | Cannot notify or be reopened by a deep link | `fasting/fasting-nudge.js:65` `moduleEnabled(state,'fasting')` **and** `:68` `notifFastingStage === false`; analytics sections carry `data-module` hooks. |
| **Empty/past weeks** | Rendered honestly, never scored against the active plan | `view-progress-hub.js:171-176` renders `0 sessions` + "No training logged"; `progress-landing.js:480` passes `plan = null` for a past week. |
| **Chart caps** | Keep the newest buckets | `muscles.js:64,76` and `endurance.js:45,52` use `keys.slice(-MAX)`. |
| **`mergeGymStats`** | Adds durations/calories, maxes peaks, duration-weights average HR, keeps `M:SS` | `weekly-aggregate.js:333-356`; verified numerically (40:00/120 + 20:00/140 → 60:00, avg 127, max 175). |
| **Escaping** | No XSS sink from imported/user text in History | `js/activities.js:41` + `esc()` on every interpolation; the detail header uses `textContent`. `grep` for `='${esc` finds **no** single-quoted attribute context, so the escaper's omission of `'` is not exploitable there. |
| **Precache** | Editing any precached asset busts the cache | Proven by editing a CSS file and a JS file in a copy: `--check` fails both times, hash changes. All six stylesheets and three classic script roots are included. |
| **Origin trust (static)** | Exact-match origin checks, no bypass | `TrustedOrigin.kt:51-66` compares scheme/host/port exactly, rejects `userInfo`, rejects opaque URIs (`javascript:`, `mailto:`), and rejects ports other than `-1`/443. `TrustedOriginTest.kt` covers `.evil.com`, userinfo, `http`, `file:`, `javascript:`, `data:`, ports 8080/80, protocol-relative and percent-encoded hosts. `MainActivity.kt:391-421` keeps only trusted-origin URLs in the WebView and opens everything else externally, dropping non-`http(s)`. **Static only.** |
| **Bridge surface (static)** | No path traversal, no callback injection | `ExportSafe.kt:6` `^[A-Za-z0-9][A-Za-z0-9._ -]{0,127}$`; `AutoBackupSafe.kt` derives names from a parsed `LocalDate`; no bridge takes a path. `BridgeSafe.kt` validates callback ids (`^[A-Za-z0-9_-]{1,64}$`) and escapes U+2028/2029. **Static only.** |
| **Backup posture (static)** | `allowBackup="false"` | `AndroidManifest.xml:52-54` sets `allowBackup="false"` + `fullBackupContent="false"` + `dataExtractionRules`, and `res/xml/data_extraction_rules.xml` excludes all five domains from cloud backup *and* device transfer. `network_security_config.xml` is cleartext-forbidden with a localhost carve-out. **Static only.** |
| **CSP** | `script-src 'self'` with no escape hatch | The `<meta>` (index.html:25) precedes the first `<script>` (:69). `grep` finds **zero** inline `<script>`, zero `on*=` handlers, zero `eval(`/`new Function(` in shipped JS; Sentry and Leaflet are vendored under `./js/vendor/`, satisfying `'self'`. (The inert `frame-ancestors` is AUD-F-4.) |
| **GPS input validation** | A malformed fix cannot inflate distance | `GpsSessionJournal.kt` requires finite in-range lat/lng, `acc >= 0`, `t > 0`, caps points; `parseDrainPayload` re-checks; `route-quality.js:87-125` rejects accuracy > 50 m, jitter < 5 m, non-monotonic timestamps and > 12.5 m/s teleports; `gpsDistanceM` is a great-circle, always ≥ 0. |
| **Live unit conversion** | The live figure equals the saved figure | `js/gps/active-run-display.js:62-86` converts once; `js/gps-tracker.js:820-822` uses the identical `0.621371` factor when filling the cockpit input. |
| **Vendored code provenance** | Every vendored file carries its licence, and no Gym media shipped | `NOTICE.md` covers Leaflet (BSD-2), Sentry (MIT), fit-file-parser + buffer (MIT), Plus Jakarta Sans (OFL, not bundled), openGym metadata (AGPL, names/ids/muscles only) and Body Muscles geometry (Apache-2.0, `LICENSES/Apache-2.0.txt` present). `find` for `gif/jpg/jpeg/webp/mp4` returns **zero** files; the catalogue has no media fields. |
| **Routine never becomes a program** | The most-abused invariant in this codebase | `state.routines` never reaches `customPrograms`; `resolveProgramForState` reads only `customPrograms`/`PROGRAMS`/catalog (`state.js:115-135`); routine cards are `.routine-card` (`library.js:453`); `startRoutine` marks a `session:` week in progress and refuses while a session is live (`app.js:478-507`). The related defect is orphaning (AUD-C-1), not promotion. |
| **Activation isolation** | A program switch cannot leak or destroy history | `startProgramActivation` → `beginActivation` (new id, pauses the old) → `archiveForeignWeeks` (numeric keys only, logged weeks preserved under `arch:<oldId>:<n>`, empty scaffolding dropped, `#n` on collision); `currentWeek` re-pointed; restart mints a new id rather than reusing slots (`activation-identity.js:116-129, 254-277`). |
| **Frozen fork + read-time model inheritance** | A fork cannot drift from its source, and keeps its progression model | `engine.js:464-475` patches the model at read time without writing; deleting a custom source rewrites `sourceProgramId` to the catalog origin (`state.js:283`); retired catalog entries stay resolvable (`catalog.js:56-63`); an unauthored lift returns null and falls through. Confirmed by probe. (The *export* path is AUD-C-3.) |
| **Editorial never enters the personal score** | No "Staff Pick" as a reason | Editorial is summed into `score` only, never `personalScore`/`reasons` (`recommendation-fit.js:204-216`); `getRecommendations` filters `eligible` before sorting; the detail verdict uses `personalScore`. `grep "Staff Pick"` → none. |
| **Equipment projection** | `settings.equipment` is never written directly | All eight mutators write the profile and re-project (`equipment-profiles.js:290-339`); boot re-projects after a mirror restore (`state.js:959-960`); the last profile cannot be deleted (`:536`). |
| **Plan import safety** | Imported plans are fresh, bounded, never overwrite a catalog plan | `parsePlanFile` validates name/days, clamps weeks 1-104, 2 MB guard (`app.js:2245`), fresh `prog_import_` id and `sourceProgramId: null`; unknown openGym ids are reported, not guessed. |
| **Builder undo content** | An undo cannot rewrite logged training | `editor-model.js:37-56` captures only `days` + `weeklyVolModifiers`, deep-cloned both ways; `restoreProgramDraft` never touches `state.weeks`. (The *coverage* claim is AUD-C-5.) |
| **Settings switches** | 44 px hit area around an unchanged 42×24 track, every one named | Measured: `<label>` 44×44, track 42×24, the input is 0×0/opacity 0 inside it; every `label.settings-switch input` carries an `aria-label` (static and dynamic). `.hc-data-toggle` measured 321×44. |
| **Hit-area overlap** | Never wider than half the gap to the next control | Only two `.hit-target` users: the carousel dot (`--hit-w: 10px` on a 5 px dot with a 5 px gap) and `week-nav-today` (its `::after` is `max(100%, 44px)`, which cannot reach the arrows). Arithmetically sound. |
| **File inputs** | The visible control is a BUTTON; the input is `hidden` | All 10 `type="file"` inputs are `class="hidden-input"`, `hidden`, or `display:none`. |
| **Modal back-stack / focus trap** | No blank page, focus returns | Measured on Customize, set sheet, photo viewer: focus enters the modal, Shift+Tab wraps, Escape closes and returns focus to the opener, a second Escape does not blank the page (`history.length` unchanged). `replaceManagedModal` is used where a confirm opens from inside a modal (`clear-log.js:83`, `measurements-sheet.js:293`). |
| **Modules off** | No reachable entry point, attributes published | With all four modules false: `<html data-module-running="off" …>` for each, `data-hybrid="off"`, **0** visible actionable `[data-module]` elements on Home/Train/Progress/Plans, quick-start Run/Walk/Fast present but 0×0, and the fasting entry point hidden. My own probe independently confirmed the attributes and that the fasting node is hidden. |
| **XSS** | No injection from user-entered or imported names | Payloads (`"><img src=x onerror=…>`) in routine name, folder name, workout note, set note and exercise note produced `img[src="x"]` count 0 and `window.__xss === 0` on Plans, History and the folder sheet; routine/folder rendering uses `textContent`. |
| **Reduced motion (CSS)** | Every animation of consequence is cancelled | Global `@media (prefers-reduced-motion: reduce)` at `css/styles.css:8397-8408`; measured `animationName: "none"`. (JS `scrollIntoView` is the exception — AUD-E-10.) |
| **Settings navigation** | Five fixed destinations, honest control semantics | `SETTINGS_TABS` frozen with 5 entries (`nav.js:19-25`); filters are `role="group"` + `aria-pressed`, never a fake tablist; unknown and `Object.prototype` labels land in Training (`nav.js:54-60`); module-hidden cards are excluded from the visible count; "no settings match" is `role="status"`. |
| **Home date cells** | A date cell never navigates | `home.js:450-479`: today toggles/scrolls, a completed date selects in place and re-renders the recap; only the explicit `home-open-day-activity` opens History. |
| **Customize** | Hiding "This week" hides only the rail | Measured with `weekStrip` hidden: strip box 0, Today visible, primary CTA visible. |
| **320 px layout** | No horizontal overflow | Measured 320/390 across Home, Train, Progress, Plans and nine sheets: `scrollWidth === clientWidth` everywhere, mine and the stream's independently. (The 30-character-name case is AUD-E-6.) |

---

---

## 7. Claims vs reality

`AGENTS.md` and `CLAUDE.md` are read as the working contract. These statements are contradicted by the code at this commit. The first five change what a maintainer would believe about safety; the rest are drift.

| # | Claim (`AGENTS.md`) | Reality at `34514dd` | Kind |
|---|---|---|---|
| 1 | "Sentry in `js/monitoring/`, **DSN-gated (off until `sentry-config.js` has a DSN)**, PII-scrubbed" | The DSN is **live** (`sentry-config.js:8`: `https://ebeda3549…@o4511663726329856.ingest.de.sentry.io/4511663733080144`), so crash egress to a third party is **ON** in every build. `initSentry` is called unconditionally at `js/app.js:2449`. The privacy policy and Play data-safety doc do disclose Sentry (and note there is no opt-out), so this is a **documentation** defect, not an undisclosed-egress defect — but a maintainer reading `AGENTS.md` believes egress is off. | docs (P2) |
| 2 | "**every `running.*` metric is run-only**" / "Runs and walks never merge: `runKm` excludes walks, `walkKm` excludes runs" | True in `running-detail.js`, `endurance.js`, `pulse.js`, `balance.js`, `training-load.js`. **False** on Home's Endurance card, the day recap, Week in Review and the Hybrid Score's endurance pillar (AUD-D-2). Measured: a 5 km walk + 10 km run renders `15 km · 2 runs · 7:20 /km`. | live bug (P1) |
| 3 | "The coach's target stays on the row as `data-prescribed` … so **the ghost can never be recorded as the prescription**" | With no numeric prescription the attribute is populated from the ghost, i.e. the athlete's own previous set (AUD-B-3). Rendered: `data-prescribed="100"` where 100 is last set's load. | live bug (P2) |
| 4 | "`setSetRest` … so **every set of that lift — and the next session — resolves the same rest**" (`js/workout/set-mutations.js:543-547`) | Only after a reload or an exercise-options Save; the timer engine reads a boot-time copy (AUD-B-2). | live bug (P1) |
| 5 | "an export nobody can restore is not a backup" (their own principle) + "`allowBackup="false"`" | The only photo-bytes export reports success on Android while writing nothing (AUD-A-1). | live bug (P1) |
| 6 | "`js/workout.js` (**1,837 lines**)" | 2,604 lines. | drift (P3) |
| 7 | "~**55k lines** vanilla JS ES modules" | **76,733** lines excluding `js/vendor/` (88,850 including vendor). Understated by ~28k lines. | drift (P3) |
| 8 | "`scripts/touch-target-browser-check.mjs`, which walks **12 surfaces** … onboarding (**875 controls**)" | 15 surfaces, **2,834** visible controls measured on this run. | drift (P3) |
| 9 | "`js/analytics/weekly-aggregate.js` is the canonical source … `tests/analytics_calendar_guard.test.js` keeps the calendar-core modules program-week-free" | The guard is a regex over a **9-file allowlist**; eight comparable modules are unguarded, and a violation added to `pulse.js` passes it (proved by mutation, §8). | test-gap (P2) |
| 10 | "**SESSIONS and TRAINING DAYS are different counts** … anything comparing against planned sessions (Progress → Consistency) must use `loggedSessionsByDate`" | The Progress hub compares sessions to planned **days** (AUD-D-1). | live bug (P1) |
| 11 | "`js/state/mirror.js` … restored only when localStorage is missing/corrupt/**older**" | "Older" is a wall-clock comparison against a file mtime, and the corrupt copy is destroyed before it can be preserved (AUD-A-2, AUD-A-6). | live bug (P2) |
| 12 | "`--safe-top` / `--safe-bottom` … are **the ONLY correct way** to clear the system bars … Every top-anchored surface pads from the token and keeps its pre-token declaration first as a fallback." | True for `.view-container`, the modal overlay and the onboarding step; **false** for History, Quick Activity and Session Recap, which use `env()` only and put the back button and title under the status bar (AUD-E-2). | live bug (P1) |
| 13 | "Every runtime-injected control is a 44px effective target or carries `.hit-target`." | The check that enforces it never opens Settings, a confirm dialog, the run logger or the fasting sheets, where `#hcConnectBtn` is 71×24, `.cmodal__btn` 142×41, `.rl-input` ~31 px, `.fasting-btn-start` ~35 px and `.fa-tab` ~38 px (AUD-E-3, AUD-CSS-A/B). | live bug + test-gap (P2) |
| 14 | "Body weight has NO default … rather than logging a fabricated 75kg" | True of the *logger* (`_currentBodyweight`), false of the **weigh-in sheet**, which prefills `70` for a fresh athlete — rendered in their own unit, so an lbs user saves 70 lb (AUD-R6-4). | live bug (P2) |
| 15 | "every top-anchored surface pads from `--safe-top`" | Five further surfaces use `env()` only, including `.bottom-nav` (the primary navigation) and `.activities-topbar` (AUD-E-2, AUD-CSS-A/B). | live bug (P1/P2) |

**Verified accurate** (worth recording so they are not re-checked): "no account system, backend or cloud sync" (zero `fetch`/XHR/Supabase in shipped JS); "48 checks" (48); "284 test files" (284); "6 stylesheets" (6); "`js/vendor/fit-parser.js` ~11.4k lines" (11,406); "`js/workout.js` is imported only by `js/app.js`" ; "the last profile cannot be deleted"; "`settings.fastingEnabled` has no writer" (only a comment names it); "there is no iOS project"; "`supabase/` is empty".

---

---

## 8. Test-suite health and missing coverage

### What the suite genuinely proves
- **No padding.** Zero test files without an assertion; strict comparisons dominate truthiness in the risk-heavy files (`workout_logging.test.js` 96 strict vs 7 `assert.ok`; `state_migrations.test.js` 54 vs 2; `analytics_correctness.test.js` 26 vs 3). Nothing was skipped or marked todo on this commit.
- **Two consecutive full runs agreed exactly** (2,619 / 2,619). The single retry the runner supports was never used.
- **Guards fail for the right reason, not by accident.** I broke `bandRole()` so every band assists; the suite went from 2,619 pass to **2,608 pass / 11 fail**. The band-assistance defect class is genuinely defended.
- **Generated assets match their generators.** `gen-precache.mjs --check` fails on a one-line CSS append *and* on a JS-module append, with the exact message ("a precached asset changed without busting the offline cache"), and the regenerated hash moves (`…hbdf953afeef7` → `…he08abbee0683`). `generate-icons.mjs` regenerates `icon-192/512/maskable`, the Android `mipmap-*` launchers and the adaptive foreground **byte-identically** to what is committed. All six stylesheets, the three classic `<script src>` roots (`js/font-css.js`, the vendored Sentry bundle, `js/sw-reload.js`) and the Leaflet assets are in `REQUIRED_ASSETS`.
- **Network isolation is systematic.** Every `scripts/*-browser-check.mjs` imports `createBrowserContext`, which aborts any non-local HTTP(S) route; local misses still surface as real 404s.
- **The clock guard is honest about its own debt.** `tests/browser_check_clock_guard.test.js` pins wall-clock weekday dependence and carries an explicit `UNPINNED_BACKLOG` of five checks that "may only ever shrink", plus a test that a check must not silently skip its assertion on some days.

### Where the suite is blind

**(a) The largest modules are the least tested.**
```
js/workout.js            55.72 % line   33.96 % branch   (2,604 lines)
js/state.js              59.03 % line   25.74 % branch   (  991 lines)
js/analytics/charts.js   33.98 % line                   (  821 lines)
js/gps-tracker.js        26.58 % line                   (  869 lines)
js/analytics.js          19.72 % line    4.17 % func     (1,009 lines)
```
`js/app.js` (2,506), `js/settings.js` (1,689), `js/home.js` (708) and `js/program_builder.js` (749) **do not appear in the coverage report at all** — the unit suite never imports them. They are exercised only by the browser suite, which is in CI (`verify.yml` runs `browser:verify`) but is not part of `npm run verify` and is therefore not what a contributor runs before a commit.

**(b) The calendar guard protects 9 files out of ~20 that do the same job.** This is the most consequential test gap because it is a *ratchet that reads as broader than it is*. `CALENDAR_CORE` (`tests/analytics_calendar_guard.test.js:32-45`) lists only `weekly-aggregate`, `week-chart-model`, `week-nav`, `strength-calendar`, `progress-landing`, `recovery-detail`, `strength-volume-detail`, `running-detail`, `strength-detail`.

I proved the gap by mutation in a throwaway copy:
- appending `s.weeks[s.currentWeek]` to **`weekly-aggregate.js`** → the guard fails with `AssertionError: … reads the program-week counter (.currentWeek) as calendar time`
- appending the **same** line to **`pulse.js`** → the guard still reports `tests 10 · pass 10 · fail 0`

**(c) Behaviours found by this audit that no test covers** (each is the test gap named in §5):
photo/binary export honesty on a bridge-less platform; `blob:` download handling; a spreadsheet export that round-trips; `data-prescribed` vs ghost with no prescription; the set-sheet `data-mode` vocabulary; walk/run separation on Home/recap/Year-in-Review/hybrid-score; sessions-vs-planned-days in the hub; `dates[day]` after discard; a two-slot-one-date fixture for `liftE1rmByCalendarWeek`; `setSetRest` → the timer engine's resolved duration; mirror-restore over a corrupt local blob; `handleDownload` with a `blob:` URL.

**(d) The 44 px walk and the safe-area walk each have a structural blind spot.**
`scripts/touch-target-browser-check.mjs` walks only the four nav destinations, and its `MEASURE` is scoped to `.view-container` — so **Settings is invisible twice over** and the confirm dialog is never opened. That is how a 24 px `#hcConnectBtn`, a 41 px `.cmodal__btn` and a 129×16 range input survive a check that reads as exhaustive (AUD-E-3). `tests/safe_area_guard.test.js` lists three surfaces, and `scripts/safe-area-browser-check.mjs` never opens History, Quick Activity or Session Recap — the three that use `env()` only (AUD-E-2). Both checks are good; both need the missing surfaces added.

**(e) The suite was green while every finding in §5 existed.** That is the single most useful fact in this section. The coverage-completion pass alone added 29 findings to a tree with 2,619 passing tests and 48 passing browser checks — because the tests assert *what the code does* in the cases the authors thought of. Concretely: the fasting copy ratchet greps one renderer while four others ship the banned words; the 44 px walk skips Settings, the confirm dialog, the run logger and the fasting sheets; the safe-area check visits eight surfaces and the five broken ones are not among them; `settings_wiring` ratchets static ids but nothing validates a `data-mode` value against its handler; and no test compares a stored centimetre value after an inch edit.

**(f) Numbers the independent audit measured that this one did not.** Their harness found **246 fixed `waitForTimeout` sleeps** across the browser scripts (flake surface), only 3 uses of offline/route mocking, and 2 files that mock a native bridge — so Health Connect and GPS *failure* states are barely exercised. Their `npm audit` (production and dev) reported **0 vulnerabilities**, and the vendored FIT bundle reproduced **byte-identically** from `npm run vendor:fit`; both are worth keeping in the gate. Kotlin tests cover only pure helpers (8 files, 598 lines), which is why AUD-F-01's bucketing is untested — the fix is to *extract* it into a pure function, not to mock Android.

**(g) Small residuals, not findings:** `running-analytics-check` and four others remain on the documented unpinned-clock backlog, so they are latent red `main`s on the weekday their fixture programme rests rather than regressions. Several checks build a fixture from `new Intl.DateTimeFormat(...).format(new Date())` in a fixed timezone — consistent with the app's own clock, but a run crossing local midnight can still disagree.

---

---

## 9. Fix plan

**None of these fixes requires a schema migration.** Every P1/P2 is a read-path, render, export or native-bridge change; `week.dates` (AUD-B-5) and the CSV/plan export columns are additive. That matters: it means the fix wave can ship without a backup/rollback plan for stored state.

**Test-first rule for every row:** write the failing test named in the "first test" column, watch it fail for the right reason, then fix.

### P0 — none

### P1 — in this order

| # | Finding | Effort | First test to write |
|---|---|---|---|
| 1 | **AUD-A-1** Android photo export | M | A JS test that injects a `HybridFileExportBridge` stub with only `saveTextFile` and asserts `saveBinaryExport` returns `{status:'error'}`; then a device check from `docs/android-export-device-checklist.md` that a real zip lands in Downloads. |
| 2 | **AUD-D-1** sessions vs planned days | S | A `buildProgressLanding` fixture with a programme that has lifts *and* runs on the same days, asserting `headline.unit` and `adherencePct` against planned **sessions**; a second fixture with runs only asserting adherence < 100. |
| 3 | **AUD-D-2** walks counted as runs | M | One fixture (5 km walk + 10 km run, one week) asserted on **each** of the five readers: `runKm`, `runCount`, pace. |
| 4 | **AUD-B-2** stale rest override | XS | `setSetRest(lift, i, 240)` then assert the duration the timer engine would resolve for the next set is 240 (not the tier). |
| 5 | **AUD-E-1** confirm dialog in light mode | S | A browser assertion that `.cmodal__title`/`__msg` contrast ≥ 4.5:1 in both themes (open the dialog from a real delete flow). |
| 6 | **AUD-E-2** safe-area on three full screens | S | Add `#activitiesScreen`/`#activityScreen`/`#sessionRecapScreen` to `tests/safe_area_guard.test.js` **and** open History in `safe-area-browser-check.mjs` at a 48 px inset; the existing occlusion probe then fails on the old CSS. |
| 7 | **AUD-F-3** fasting health claims | XS (copy) | Export `STAGE_BLURB`, the four `view-fasting.js` strings and `FASTING_ZONES[].description`, and assert the banned-word list against **all** of them, not just `renderFastingBand()`. |
| 8 | **AUD-CSS-A-1** ticked-set contrast | XS | Browser assertion: `.cockpit-set-row.is-complete input` contrast ≥ 4.5:1 in **both** themes (the light one currently fails at 1.18:1). |
| 9 | **AUD-F-02** EWMA warm-up | S | Property test: constant daily load from day 1 never yields "above baseline" at any day. |
| 10 | **AUD-F-01** Health Connect read path | M (Kotlin) | Kotlin unit tests over an extracted pure bucketing function: 3,000 records / 90 days all appear; today is present; two sources do not double-count; a thrown read returns an error status, not `granted:[]`. JS test: an error status leaves `connected` unchanged. |

Rationale for the order: #1 is the only one where the user loses something irreplaceable; #2/#3 are the most visible wrong numbers and are cheap; #4 is a one-line fix with a one-line test; #5/#6/#8 are the places a user literally cannot read or tap the screen; #7 is pure copy; #9 is a signal every new athlete sees; #10 is the only P1 that needs Kotlin and a device.

### Suggested merge order (10 PRs)

| # | PR | Findings |
|---|---|---|
| 1 | Load-model honesty | AUD-F-02, AUD-F-03, AUD-B-3 |
| 2 | Progress + Home numbers | AUD-D-1, AUD-D-2, AUD-D-3, AUD-R4-2 |
| 3 | Logger mutations | AUD-B-8, AUD-R5-2/3/4, AUD-B-2, AUD-B-4, AUD-B-1 |
| 4 | Backup + export fidelity | AUD-A-1, AUD-A-2, AUD-A-3, AUD-A-4, AUD-R9-1/2/3, AUD-A-9 |
| 5 | Light mode + safe areas | AUD-E-1, AUD-E-2, AUD-CSS-A-1, AUD-CSS-A-3, AUD-CSS-C-1/2/3 |
| 6 | Copy honesty | AUD-F-3, AUD-R7-1, AUD-R7-2, AUD-R8-3, AUD-R8-4 |
| 7 | Data integrity | AUD-R6-1/2/3/4, AUD-A-8 |
| 8 | Import hardening | AUD-A-5, AUD-A-7, AUD-F-04, AUD-F-06 |
| 9 | Health Connect | AUD-F-01, AUD-F-04 |
| 10 | Hygiene | dead CSS/JS, doc drift, the test ratchets in §8 |

Each PR: failing test first, `npm run verify` + the relevant browser check, and for Kotlin `./gradlew testDebugUnitTest lintDebug`.

### P2 — batch, roughly by cost

| Finding | Effort | First test |
|---|---|---|
| A-3 CSV formula neutralisation | XS | `csvCell('=1+1')` starts with `'`; every export path inherits it. |
| B-4 Band button vocabulary | XS | A test that loads `index.html`'s set-sheet buttons and asserts every `data-mode` is in the handler's accepted set. |
| B-3 `data-prescribed` ≠ ghost | XS | Template render with `prescribed=null` + non-empty ghost asserts no numeric `data-prescribed`. |
| D-5 Home `kg` for lbs | XS | Home insight text contains no `kg` when `weightUnit==='lbs'`; extend the kg-label guard to `js/home`/`js/metrics`. |
| F-3 fasting notification copy | XS | Export `STAGE_BLURB` and assert no banned term, alongside the existing band grep. |
| F-1 Sentry scrubber | S | `scrubEvent({message,extra,tags})` drops `extra`/`tags`; plus correct the `AGENTS.md` sentence. |
| A-2 preserve-before-restore | S | Boot with a corrupt local blob **and** a valid mirror; assert `_corrupt` exists and the gate opened. |
| B-5 discard clears the date | S | `deleteDayWorkoutData` then assert `week.dates[day]` is gone and Undo restores it. |
| C-1 orphaned one-off | S | `startRoutine` → tick → `selectProgramWorkout('mon')` → exactly one dated strength session. |
| C-2 preview context | XS | Imported-prescription programme: `renderStrengthPreview` sets === `prescribeSetsForLift` sets. |
| D-3 `allByDate` in e1RM | S | Two slots on one date: `liftE1rmByCalendarWeek` returns 4 sets and the 125 kg best. |
| A-4 CSV columns | S | `buildTrainingCsv` → reader round-trip preserves `sec`, `dist`, `type`, `rir`, `note`; existing `row[18]`/`row[20]` indexes unchanged. |
| B-1 band quick-log | S | One-tap on a `data-load-mode="banded"` row stores `loadMode:'banded'` + `band`. |
| C-3 plan export sidecars | M | An `openGym`/`jt-shed` plan exported and re-imported resolves the same per-lift targets; if the sidecar cannot be exported, `progressionModel` is omitted. |
| F-2 tile disclosure | S (copy) / L (bundled basemap) | Document the provider in the threat model + privacy copy now; the real fix is a separate project. |
| B-8 re-tap load mode no-op | S | Tap the active load cell on a completed set; assert `w` and `c` are unchanged. |
| R5-2 edit-saved keeps `mode:'reps'` | S | Save an unrelated edit; assert an existing set's `mode` and shape are byte-identical. |
| R5-3 per-set setters resolve the active day | S | Resume a one-off on a later weekday; assert failure/basis/rest/note/RIR all write. |
| R5-4 one-off discard has Undo | S | Discard a one-off with sets; assert undo restores the week and the pointer. |
| R6-1 measurements keep stored cm | S | Edit one site at `measurementUnit:'in'`; assert every untouched site is unchanged. |
| R6-2 bodyweight duplicate-date write | S | Two rows for one date; assert the edit targets the row the reader uses. |
| R6-3 weigh-in upper bound | XS | Enter 9999; assert rejection + toast. |
| R6-4 no fabricated 70 lb | XS | Fresh lbs profile; assert the field is blank, not 70. |
| R7-1 notification copy uses the live streak | S | Compute a 40-day streak; assert the nudge says so. |
| R7-2 persist "notifications off" | S | Toggle off, reload, assert nothing re-arms. |
| R8-2 hybrid-score card uses `shareImageCanvas` | XS | Assert every share card routes through the one helper. |
| R8-3/R8-4 coach answers need data before asserting | S | Empty state: assert no "looks clean" / "need more data" claim without inputs. |
| R9-1 export reports skipped photos | S | Metadata with no blob; assert the result names it. |
| R9-2 zip bounds + CRC | S | Truncated entry; assert refusal, and that the good blob is untouched. |
| R9-3 FIT dedup by start time | S | Delete an imported FIT activity; assert the same file re-imports. |
| R4-2 bodyweight "7d avg" = 7 days | S | 3×/week log; assert the line and the summary row agree. |
| R2-2 clamp "Keep Week N" | XS | Switch 12-week → 8-week; assert `currentWeek <= 8`. |
| R1-1 Plans search restores the library | S | Focus an empty search then blur; assert the list is visible. |
| **Test-gap ratchets** | S each | Calendar guard derived from `indexSlotsByDate` imports (so `pulse.js` is covered); set-sheet wiring ratchet like `settings_wiring.test.js`; `precache_manifest` regex accepts single-quoted `src`; `gps_durable_journal_contract` stops using `[^]*`. |

### P3 — schedule as hygiene, not a release gate
Mirror sequence number (A-6); per-set note aliasing (A-5); `__proto__` import hardening (A-7); zip CRC/central-directory validation; `log all` honesty (B-6); completed-set load switch (B-7); run-units `:60` (both call sites); `healthConnect` bad-date guard (F-5); Gradle/stage allowlist unification (F-6); dead modules (F-10); `frame-ancestors` correction (F-4); the Supabase manifest comment (F-9); builder undo coverage (C-5); detail `progressionModel` resolution (C-6); `data-prescribed`-adjacent duplicate counters; docs drift (`workout.js` line count, `~55k` lines, touch-surface count).

### Sequencing note for the maintainer
`npm run verify` after every change; the matching `scripts/*-browser-check.mjs` for anything touching the cockpit, Home, Progress, Settings or Plans. The three analytics fixes (#2, #3, `D-3`) should land with their browser checks in the same commit — the hub check already asserts band order and range switching, and is the natural place to assert the corrected headline.

---


## 10. What this audit did not cover

Stated plainly, because the difference between "verified" and "read" matters more than the length of the findings list.

**Why this audit stopped here (and why it is not "converged").** The stop rule I set was: stop when a full wave produces no new P0/P1. That did **not** happen — the second wave (C, E, F) produced two fresh P1s (AUD-E-1, AUD-E-2) that the first wave could not have seen. I stopped on budget, not on evidence of convergence. Treat this as a high-yield first pass with an accurate map of where the remaining risk sits, not as a certificate that the codebase is exhausted. The unread areas below are where a third wave would go first.

**Android: static only.** No emulator, no `system-images`, no `adb`, no `gradlew` on this machine, so nothing Android was executed. Everything about the WebView shell — `TrustedOrigin` exact matching, bridge input validation, the `blob:` download path behind AUD-A-1, the foreground GPS journal and its replay, Health Connect responses, `allowBackup` behaviour, the safe-area bridge on a real inset, notification delivery — is a **code-reading claim**. AUD-A-1 in particular should be confirmed on a device before it is quoted publicly: I proved there is no `blob:` branch and no binary bridge method, which means no file is written whether or not Chromium invokes the listener, but I did not observe the click. The device checklists in `docs/android-*-device-checklist.md` remain the human's task.

**Screen readers.** Accessibility was verified structurally — 2,834 controls measured for effective size, accessible names asserted, focus order and modal back-stack read in code — but **no VoiceOver or TalkBack session was run**, and no 200 % zoom / large-text pass. A control can have a name and still be announced badly.

**Real devices and real performance.** The performance baseline asserts only machine-independent facts (first paint not render-blocked, DOM bounded as history grows, renders with every external host blocked). Its wall-clock numbers are reported, never asserted, and this container is not a phone.

**Some seams are still read-only, not measured.** `js/analytics/charts/**` and the analytics views were read line by line in §12 after the instrumented pass, but `js/workout/plates.js` (338), `plate-sheet.js`/`plate-sheet-model.js` (480), `exercise-picker.js` (252) and the upper half of `effort.js` were **not** read — plate math and exercise search are the largest unexamined seams left in the logger.

**Dependency and supply-chain risk.** No `npm audit`, no CVE scan, no integrity review of `js/vendor/**` beyond provenance. `js/vendor/fit-parser.js` (11,406 lines) and the vendored Sentry bundle were treated as trusted build inputs.

**Sentry's actual payloads.** Scrubbing was read (`scrubEvent` deletes `request`/`user`/`device`; breadcrumb URLs are reduced to paths), but nothing was sent to Sentry and inspected. Fields such as `event.extra`, `event.tags` and exception messages are **not** scrubbed by that function, and could carry exercise names or notes from a thrown error.

**Legal review.** `privacy-policy.md` still contains 10 `{{PLACEHOLDER}}` tokens (retention period, controller, contact, minimum age, jurisdiction) and `terms-of-service.md` 7. They are marked as templates and store submission is parked, so this is a release-gate item for the human, not a code defect.

**Sync, accounts, multi-device.** Not applicable: there is no backend, and I verified there is no client.

**Real historical data.** Every probe used synthetic state. Migrations were exercised through fixtures, not through real multi-year blobs of the kind a long-term athlete would have.

---

---

## 11. Proof of no edits

> **Scope note.** This section describes the **audit phase**, which ended before any fix. A fix wave followed with explicit approval (§14); from that point the tree changed by design. This file is the only artefact the audit phase produced.

The audit was read-only. At the end of the audit phase:

```
$ git status --short
?? docs/audit/deep-audit-2026-11-23.md
$ git diff --stat
(empty)
```

That single untracked file is this report. No file under `js/`, `css/`, `index.html`, `sw.js`, `android/`, `supabase/`, `tests/`, `scripts/` or `docs/` (other than this new report) was created, modified or deleted, and no git command mutated the repository.

Everything destructive was done in copies:

- **Mutation experiments** (§8) ran in `/tmp/audit/repo`, a `cp -R` of the working tree with `.git` removed and `node_modules` symlinked. Appending a byte to `css/hybrid-score.css`, `js/metrics/measures.js`, `js/analytics/weekly-aggregate.js`, `js/analytics/pulse.js` and `js/workout/load-mode.js` all happened there.
- **Generated-asset verification** (`precache --check` drift, hash flip, icon regeneration) also ran in that copy; the committed icons were compared byte-for-byte against the regenerated ones.
- **Runtime probes** (`/tmp/audit/*.mjs`, `/tmp/aud_*.mjs`, `/tmp/aud-d/probe*.mjs`, `/tmp/probe*.mjs`) served the repo read-only over `127.0.0.1` and used fresh, network-blocked Chromium contexts from `scripts/browser-runtime.mjs` with a pinned clock. No real browser profile, no real health data, no external network call.
- **Seven specialist streams** were instructed to be read-only and returned findings as text; none reported a write, and the final `git status` confirms it.

*Audit ends here. Phase 6 (fixes) requires explicit approval and would begin with a failing test per finding, P0 first — here, P1 first.*

---

## 12. Coverage completion — measured execution plus a closed reading ledger

The first pass stated read fractions; this section replaces them with a **measurement**. Two independent axes, both reported per file:

1. **Execution** — V8 precise coverage gathered from a real Chromium session, not a claim.
2. **Reading** — a line-by-line review of every file the campaign could not execute, so no line is left both unexecuted *and* unread.

### 12.1 How the execution number was produced

Six instrumented passes (`/tmp/audit/cov-*.mjs`, all read-only, synthetic state, `createBrowserContext` with external hosts blocked, clock pinned to 2026-08-03):

| Pass | What it drove |
|---|---|
| 1 | Boot; Home (customize, week rail, day recap, cards); Train (landing → cockpit → set sheet → tick → options → plate sheet → finish → recap → quick starts → run modal); Progress (4 ranges, focus, grouping, band rows → details, measures); Plans (discover, detail tabs, builder, routines, JSON import); History; Profile; Settings; light-theme repaint |
| 2 | **24 detail entries** element-wise; fasting surfaces (start/end a fast); run logger + manual save; builder deep; History detail → edit → share → repeat; **onboarding** (fresh profile, 40 steps); **corrupt-state recovery**; **imports** (workout CSV, body CSV, measurements CSV, state JSON, FIT, photo zip → photo viewer) |
| 3 | Element-wise `open-*`/`show-*`/`toggle-*`/`switch-*` sweep on all four destinations; Progress tab set; History delete → undo |
| 4 | `edit-saved` editor; create-program + `open-builder`; **all 10 analytics `data-context` drills** (muscle-load, exercise, strength, running, measures, bodyweight, monthly-report, fasting, projections, weekly-review) |
| 5 | Measured CSS rule usage (discarded — Chrome reports only matched rules, so 100 % was not credible) |
| 6 | The fasting-injection PoC (see AUD-A-8) |

**Headline:** 312 of 318 `js/**` files loaded and instrumented; **57,098 of 80,706 instrumented lines executed = 70.7 %** across all passes (union of covered lines, per file).

| Execution band | Files |
|---|---|
| ≥ 90 % | 108 |
| 80–89 % | 46 |
| 60–79 % | 69 |
| 40–59 % | 46 |
| < 40 % | 43 |
| never loaded | 6 |

70.7 % is the honest number and it is **not** presented as "coverage complete": the remaining 29 % is dominated by defensive branches, error paths, Android-only code, and screens reachable only through several nested taps. That is exactly why axis 2 exists.

### 12.2 The six files that never loaded — five are provably dead

| File | Lines | Evidence |
|---|---|---|
| `js/analytics/metric-inventory.js` | 340 | imported by `tests/metric_inventory.test.js` **only** |
| `js/analytics/charts/running-charts.js` | 222 | **no importer** anywhere in `js/`, `index.html` |
| `js/analytics/charts/load-charts.js` | 177 | **no importer** |
| `js/home/tile-renderers.js` | 180 | **no importer** |
| `js/home/morning-briefing-card.js` | 128 | **no importer** |
| `js/vendor/fit-parser.js` | 11,407 | vendor; loaded only when a FIT file is imported (exercised with a synthetic archive) |

The first five are dead code **proven twice**: the import graph has no edge to them, and the instrumented browser never loaded them. A risk scan found no `fetch`, `eval`, `new Function` or `localStorage` access in any of them. They are shipped in the precache anyway (F-10).

### 12.3 The reading ledger

Every file below 60 % execution was assigned to a line-by-line reader, with its exact unexecuted line ranges supplied, plus the 6 never-loaded files and all 6 stylesheets. Verdicts are per file; "CLEAN" means read in full and no defect found.

| Batch | Files | Read | Findings |
|---|---|---|---|
| R1 | `programs/library.js` | full | 3 (1 × P2, 2 × P3) |
| R2 | `activation.js`, `program-export.js`, `program-json.js`, `opengym-plan.js`, `compare-ui.js`, `copy-program.js` | full | 4 |
| R3 | `view-fasting.js`, `view-fasting-band.js`, `charts/fasting-charts.js` | full | 4 (1 × P1, 2 × P2, 1 sec) |
| R4 | `charts.js`, `view-weekly-volume.js`, `view-run-performance.js`, `run-performance.js`, `gym-performance.js`, `view-gym-performance.js` | full | 4 |
| R5 | `set-mutations.js`, `edit-saved.js`, `clear-log.js`, `substitutions.js` | full | 4 |
| R6 | `dashboard.js`, `measurements-sheet.js`, `bodyweight-sheet.js` | full | 4 |
| R7 | `routines/model.js`, `notifications.js`, `year-review.js`, `hybrid-score/ui.js` | full | 4 |
| R8 | `share/workout-share.js`, `hybrid-score/share-card.js`, `pr-share.js`, `coach-qa.js`, `ui/sortable.js`, `ui/clipboard.js` | full | 4 (all P2); 2 files CLEAN |
| R9 | `photos/library.js`, `portability/zip.js`, `import-fit.js`, `activities/mutations.js`, `activities/calendar.js`, `exercises/detail.js`, `session-compare.js`, `view-strength-metric.js`, `view-recovery-metric.js` | full | 4 (3 × P2, 1 × P3); 5 files CLEAN |
| CSS-A | `css/styles.css` 1–5500 | full | **1 × P1** (ticked-set contrast, measured), 3 × P2, 1 × P3 |
| CSS-B | `css/styles.css` 5501–11006 | full | 1 × P1 (History topbar safe-area — merged into AUD-E-2), 3 × P2, 1 × P3 |
| CSS-C | `analytics.css`, `programs.css`, `progress.css`, `hybrid-score.css`, `brand-consistency.css` | full | 2 × P2 new (undefined `--bg-elevated`/`--bg-dark`; `hybrid-score.css` has no light theme), 1 × P2 contrast, 68 dead selectors |

**What the reading pass found that the executing pass could not:** 29 new findings, including one P1 (the fasting copy rule violated on four more surfaces), an HTML-injection path through an unvalidated import field, unit round-trip corruption of stored tape measurements, a weigh-in default that fabricates 70 lb, a dead streak field that changes notification copy, reminders that un-cancel themselves, and four mutation bugs in the set editor. Every one is in §5 with a line trace.

### 12.4 Remaining unexecuted lines — categorised, not hidden

The 29 % of instrumented lines that never ran are, by inspection of the reading pass, almost entirely:

- **Defensive/error paths** — quota failure, bridge timeout, malformed import, `catch` blocks. They cannot be driven without fault injection; the streams read them and the guards hold (§6).
- **Android-only branches** — every `Hybrid*Bridge` code path no-ops in a browser. Static only (§10).
- **Dead code** — the five modules above, plus the unreachable exports the readers named (`renderHrZonesChart`, `renderCadenceChart`, `renderPaceLineChart`, `renderACWRChart`, `renderBodyWeightChart`, `updateStrengthSet`, `TILE_REGISTRY` renderers).
- **Nested surfaces a bounded tour cannot reach** — a sheet opened from a detail opened from a band, on a date that must be selected first. The readers covered these statically.

No line is both unexecuted and unread.

---

## 13. Reconciliation with the independent audit at `a5cd282`

A second audit of the same repository was supplied mid-session. Its commit is **`a5cd282`** — one merge *behind* this tree (`34514dd` = `a5cd282` + PR #305, Measures + the photo-decode fix), which explains its baseline of **2,578** unit tests against our **2,619**. Its own brief instructs that every finding be treated as a hypothesis, so each `F-nn` was re-checked against the current code rather than pasted in.

**Result: 19 confirmed, 4 confirmed with a correction, 1 refuted, 3 unverifiable here.**

### 13.1 Genuinely new findings it contributed (verified by me here)

These are areas my streams did not reach. They are first-class findings, not annotations.

**AUD-F-02** *(their F-02)* — **P1** · correctness · **confirmed, reproduced by arithmetic**
**Title:** The EWMA load model is zero-seeded with no warm-up guard, so **every new user is told they are "Substantially above baseline" for their first weeks of steady training.**
**Evidence:**
```js
// js/brain/load_models.js:25-26, 128-133
const λ_ATL = 2 / (7 + 1);   const λ_CTL = 2 / (28 + 1);
let atl = 0, ctl = 0;        // zero-seeded, no history guard
atl = dayLoad * λ_ATL + atl * (1 - λ_ATL);
ctl = dayLoad * λ_CTL + ctl * (1 - λ_CTL);
```
```js
// js/analytics/calculations/load-calcs.js:67-76
if (!ctl || ctl === 0) return { status: 'Insufficient baseline', … };
const ratio = atl / ctl;   // no days-of-history input at all
… if (ratio >= 1.3 && ratio < 1.5) return { status: 'Well above baseline', … };
return { status: 'Substantially above baseline', tone: 'warning', zone: 'danger' };
```
**Verified:** constant load 100/day gives `atl = 100(1−0.75⁷) = 86.7`, `ctl = 100(1−0.931⁷) = 39.4` → **ratio 2.20** at day 7 (their figure), 1.55 at 14, 1.28 at 21, 1.16 at 28. `trainingLoadStatus` takes no history length, so it cannot know.
**Impact:** a warning-tone overtraining signal on the surface that forms a new athlete's first impression, for ~4 weeks, for *steady* training.
**Fix sketch:** pass `daysOfHistory` and return "Building your baseline" until ≥28 dated days; or seed CTL from the first week's mean.
**Test gap:** no property test that constant load never reads "above baseline".

---

**AUD-F-03** *(their F-03)* — **P2** · correctness · **confirmed by code**
**Title:** Imported sessions contribute **zero** training load, so the chronic baseline is understated after an import and the first real sessions spike the ratio (compounding F-02).
**Evidence:** `js/portability/import-workout-csv.js:271` `duration: end != null && start != null ? end - start : 0` — a `Duration` column ("1h 5m") is never parsed into session duration, so `gymStats.time` is empty (`:471`); `js/state/run-sessions.js:251-256` requires `rpe > 0` **and** `minutes > 0`, and FIT runs are imported with `rpe: ''`.
**Impact:** ATL/CTL/ACWR, the hybrid balance currency and every load-derived card ignore imported history while calendars and PRs count it — the two halves of the app disagree about the same sessions.
**Fix sketch:** parse `Duration`; for sources without RPE, derive an `estimated: true` load (default sRPE or HR-based) and say so in the UI.

---

**AUD-F-01** *(their F-01)* — **P1** · correctness (Android) · **partially confirmed, static only**
**Title:** The Health Connect read path never pages, never returns **today**, double-counts steps across sources, and turns any exception into "permissions revoked".
**Evidence:**
```kotlin
// HybridHealthBridge.kt:210-219 — one readRecords per type, no pageToken loop
client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
// :223
val endDate = end.atZone(zone).toLocalDate().minusDays(1) // end is exclusive
// :140-141 — any throw becomes an empty grant
val json = runCatching { fetchByDay(...) }.getOrElse { "{\"granted\":[],\"days\":[],\"errors\":[]}" }
```
and `js/health/health-bridge.js` reads an empty `granted` as revoked → `connected=false` + "Permission needed".
**Impact:** missing recent days, inflated step counts (phone + watch), and a transient error disconnecting the integration until the athlete re-grants. Recovery and readiness then show stale or absent data with no age indicator.
**Caveat:** Android is static-only here (§10). The only part I executed is the JS side's `applyHealthDays` crash (AUD-F-5).
**Fix sketch:** loop on `pageToken`; use `aggregate`/`aggregateGroupByPeriod` for steps; make `end` inclusive; return a structured `{status:"error"}` distinct from `{status:"ok", granted:[]}`; sync on foreground.

---

**AUD-A-9** *(their F-08)* — **P2** · privacy / data-safety · **confirmed by me**
**Title:** "Reset All Data" leaves a full copy of the old state in the `_corrupt` quarantine key.
**Evidence:**
```js
// js/settings.js:1470-1476 — the whole reset
localStorage.removeItem(STORAGE_KEY);
localStorage.removeItem(STORAGE_KEY + '_backup');
localStorage.removeItem(STORAGE_KEY + '_active_gps_session');
localStorage.removeItem(SAVED_AT_KEY);
clearRestTimerPersistence();
await clearRouteDatabase();
await clearMirror();
// STORAGE_KEY + '_corrupt' is NEVER removed — and corrupt-state.js writes a full copy there
```
**Impact:** an athlete who uses the app's own "delete my data" control still has their health, location and profile data on the device, and nothing in the UI says so. The same key is what AUD-A-2 says can be silently *lost* — so the quarantine copy is both over-retained here and under-protected there.
**Fix sketch:** remove `_corrupt` in the reset and state the quarantine's purpose in the confirm copy.

---

**AUD-F-04** *(their F-04)* — **P2** · correctness · **mechanism confirmed, format unverified**
**Title:** A CSV whose dates are not year-first imports **zero sessions**, silently.
**Evidence:** `js/portability/import-workout-csv.js:167-173` —
```js
const m = String(value || '').match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
if (!m) return null;
```
so `"5 Oct 2026, 18:30"` yields `null` and the row is skipped. Whether Hevy's real export uses that form is the one thing I cannot verify here (their **V**): the test fixture uses ISO dates, so the suite stays green either way.
**Fix sketch:** accept `D Mon YYYY[, HH:mm]` and `DD/MM/YYYY` (with a locale hint), and report "N rows skipped: unrecognised date" in the import summary.

---

**AUD-F-05** *(their F-07)* — **P2** · privacy · **confirmed with a correction**
**Title:** A periodic health worker writes a second, unexported store of health data on every launch, regardless of the athlete's field selection.
**Evidence:** `MainActivity.kt:366-370` schedules `HealthSyncWorker` unconditionally; `HealthSyncWorker.kt:66` writes `health_background_cache` in SharedPreferences; nothing reads that snapshot, `READ_HEALTH_DATA_IN_BACKGROUND` is not declared, and the reset/export paths do not include it.
**Correction to their wording:** the worker is **not** unused — `MainActivity` schedules it. It is its *output* that is unused, which is worse: battery is spent, a duplicate copy of health data exists, and the policy's "only the fields you select" is not enforced.
**Fix sketch:** delete it (solve freshness with AUD-F-01's foreground sync), or wire it end-to-end — permission, field selection, consumer, export, reset.

---

**AUD-F-06** *(their F-10)* — **P2** · correctness (availability) · **confirmed by code**
**Title:** A corrupt FIT header can freeze the UI thread for seconds because the parser is told to `force` and the header is never validated.
**Evidence:** `js/garmin.js:35-38` `parseFitBuffer` → `{ force: true }`, no header check (`headerSize`, `.FIT` signature, `dataSize <= buffer.length`), and there are **no Web Workers anywhere** in the app.
**Impact:** a single hostile or truncated `.fit` blocks the main thread — an ANR in the WebView. Local only (the athlete must open the file), which is why it is P2 and not higher.
**Fix sketch:** validate the header before parsing, drop `force`, clamp to the declared size, and parse in a Worker with a timeout.

---

**AUD-F-07** *(their F-05 + F-13)* — **P2** · data-loss / PWA · **confirmed by code**
**Title:** State is one `localStorage` blob with import caps 4–6× larger than the storage limit, and the service worker is network-first for JS but cache-first for HTML/CSS.
**Evidence:** `js/state.js` serialises the whole blob per save; CSV import cap 20 MB, `ExportSafe.kt` 100 MB, `StateMirrorSafe.kt` 32 MB; `sw.js:409-432` `isJSModule` → network-first, everything else cache-first, plus `skipWaiting`/`clients.claim` and an unconditional reload in `js/sw-reload.js`.
**Impact:** a valid import can pass validation and fail to save on the PWA; and a flaky connection can load a mixed-version module graph, or reload the page **during a workout**.
**Fix sketch:** measure the payload and block imports that would exceed quota; serve precached assets cache-first from the versioned cache; defer the reload while a session is live.
**Note:** this partly overlaps AUD-A-1/A-2 (storage honesty) and my `sw.js` items in §5-F; treat this entry as the consolidated version.

### 13.2 Full verdict table

| Their ID | Their sev | My verdict | My severity | Note |
|---|---|---|---|---|
| F-01 | High | **Confirmed** (static) | P1 | → AUD-F-01 above; no pagination, `minusDays(1)`, `runCatching`→revoked |
| F-02 | High | **Confirmed** (reproduced) | P1 | → AUD-F-02 above; ratio 2.20 at 7 days |
| F-03 | High | **Confirmed** | P2 | → AUD-F-03 above |
| F-04 | High | **Mechanism confirmed**, format unverified | P2 | → AUD-F-04 above |
| F-05 | Med | **Confirmed** | P2 | → AUD-F-07 above (merged with F-13) |
| F-06 | Med | **Confirmed by code** | P2 | `GpsTrackingService` fsync per fix on the service looper — my own note: the journal is the durability guarantee, so a buffered `fsync` every N s preserves the contract |
| F-07 | Med | **Confirmed, with correction** | P2 | → AUD-F-05 above; worker *is* scheduled, its output is unused |
| F-08 | Med | **Confirmed** | P2 | → AUD-A-9 above (`_corrupt` survives reset) + no pristine guard in `auto-backup.js` |
| F-09 | Med | **Confirmed** | P1 | Agrees with my §1 release blockers and §7; the ToS describes accounts/sync that do not exist, placeholders remain, and there is no in-app privacy link |
| F-10 | Med | **Confirmed by code** | P2 | → AUD-F-06 above |
| F-11 | Med | **Partly confirmed** | P2 | Single-night HRV vs fixed bands and entry-count "consecutive days" are real; sleep-source split is real; it overlaps my `load`/recovery coverage gap |
| F-12 | Med | **Confirmed** | P2 | Duplicates my AUD-A-3 (formula injection) and AUD-A-4 (lossy export); their extra points — 32-bit import ids, unbounded custom-exercise names — are already in my §5-A P3 list |
| F-13 | Med | **Confirmed** | P2 | Merged into AUD-F-07 |
| F-14 | Med | **Confirmed** | P2 | Duplicates my escaping analysis (§6) — one difference: they note `data-action` delegation means injected markup can be *clickable* without script execution; I verified no current sink, so this is a hardening item |
| F-15 | Med | **Confirmed by code** | P2 | `configChanges` lacks `uiMode`/`fontScale`/`smallestScreenSize`, so a dark-mode toggle or font-scale change recreates the activity mid-workout. New to me |
| F-16 | Low | **Refuted in part** | P3 | See §13.3 — the copy concern is real, the unresolved-name count is not |
| F-17 | Low | **Confirmed** | P2 | `--text-ghost` at 3.75:1 on `--bg-input` is below AA; overlaps my AUD-E-5 and the light-mode findings |
| F-18 | Low | **Confirmed** | P3 | Duplicates my AUD-F-4 (`frame-ancestors` in a meta CSP is inert); their per-bridge origin check is a fair defence-in-depth note |
| F-19 | Low | **Confirmed** | P2 | Duplicates my AUD-F-1 (scrubber leaves `message`/`extra`/`tags`); mine adds that the DSN is live |
| F-20 | Low | **Confirmed by code** | P3 | Mirror `.bak` semantics and shallow `validJson` — adds to my AUD-A-2/A-6 |
| F-21 | Low | **Confirmed** | P3 | `dependabot.yml` has **no `gradle` ecosystem** (only `npm` + `github-actions`) and 3 `groups:` keys; `Copy` vs `Sync`; actions by tag |
| F-22 | Low | **Confirmed** | P3 | `strictNullChecks` off, 88 empty catches — consistent with my coverage numbers (`workout.js` 34 % branch) |
| F-23 | Low | **Confirmed** | P3 | Model/threshold documentation; agrees with F-02's root cause |
| F-24 | Low | **Unverified** | P3 | Route-quality edge cases are plausible; I did not replay real tracks |
| F-25 | Low | **Confirmed** | P3 | Duplicates my AUD-F-9 (Supabase comment) and my §7 drift rows |
| F-26 | Low | **Confirmed** | P2 | Duplicates my §8; their "246 fixed sleeps" is a useful number I did not measure |
| F-27 | Low | **Partly confirmed** | P3 | `System.currentTimeMillis()` in `GpsTrackingService` is real; I did not verify the notification-bridge crash path |

### 13.3 What I refute

**Their F-16 "26 exercise references do not resolve" — refuted at this commit.** I ran the app's own resolver over every `lifts:` entry in `js/programs/catalog/*.js`:
```
refs 607   unresolved unique 0   total 0
```
and confirmed the resolver is not permissive (`resolveExercise('AMRAP Finisher') → null`, `('Definitely Not An Exercise Xyzzy') → null`, `('Bench Press') → barbell_bench_press`). Both programs it named exist (`fitness.js:509 athletic_mobility_foundation`, `:626 functional_gpp_12wk`). Their matcher most likely compared literal names instead of going through the alias resolver.

**What survives from F-16** is the honesty point, which I verify: 8 catalog files carry `enrolledCount`/`completionRate`/`ratingCount`, and collection copy says "Curated by our coaching team" (`collections.js:12`), "Trending Programs" (`:164`) and `author.type: 'community', verified: true` (`hypertrophy.js:14`) in an app with no backend and no community. That is a P3 consumer-honesty risk worth fixing before a store listing.

**Their F-07 wording "worker is unused"** is also inaccurate (it is scheduled on every launch); the substance — an unread, unexported second copy of health data — is correct and is why it stays a finding.

### 13.4 What that audit did that this one could not

- It ran **`npm audit`** (production and dev): **0 vulnerabilities**. My audit could not (no network).
- It proved the vendored FIT bundle is **byte-identical** to a fresh `npm run vendor:fit` rebuild. I verified the *precache hash* and icon reproducibility, not this.
- It wrote standalone repro scripts for the EWMA warm-up and the FIT stall, which made both findings cheap to re-check — an approach this audit borrowed for its CSS and injection PoCs.

### 13.5 What this audit has that that one does not

Execution instrumentation (70.7 % of instrumented JS lines, 312/318 files, per-file numbers), the full browser campaign (48/48 checks), the reading ledger for every low-execution file (§12), the 8 P1s in §3, the import/CSV/plan fidelity findings, the notification and fasting-copy findings, the weighing/measurement data-integrity findings, and the measured light-mode contrast failures.

---

## 14. Fix status (what landed, what did not)

Branch `audit/fixes-p1`. Every change below is test-first, `npm run verify` green (2,624 tests), and the browser suite re-run after the CSS work.

| Finding | Status | Change |
|---|---|---|
| AUD-CSS-A-1 (P1) | **fixed** | Light-mode rule for `.cockpit-set-row.is-complete` inputs; 1.18:1 → readable |
| AUD-E-1 (P1) | **fixed** | `confirm-modal.js` now carries its own light theme (panel, title, message, buttons) |
| AUD-E-2 (P1) | **fixed** | History/recap/quick-activity, the History topbar and month header, `.bottom-nav`, toasts and five more surfaces use `--safe-top`/`--safe-bottom` (env() kept first as the documented fallback) |
| AUD-B-2 (P1) | **fixed** | `setSetRest` pushes the new override map to the timer engine |
| AUD-F-02 (P1) | **fixed** | `trainingLoadStatus(…, daysOfHistory)` returns "Building your baseline" for the first 28 days |
| AUD-F-3 (P1) | **fixed** | Notification, analytics-view, empty-state, zone and insight copy rewritten to elapsed-time language; the banned-word ratchet now covers every surface |
| AUD-A-1 (P1) | **fixed (JS + native)** | `saveBinaryFile` added to `FileExportBridge` + `ExportSafe.requestBytes` (+ Kotlin test); JS prefers it and refuses honestly when the shell has no binary method. **Device confirmation still required** |
| AUD-B-3 (P2) | **fixed** | `data-prescribed` no longer falls back to the ghost |
| AUD-B-4 (P2) | **fixed** | Band button uses `banded`, applies `applyBandLoad`, and shows its state |
| AUD-B-8 (P2) | **fixed** | Re-tapping a stored load mode is a no-op |
| AUD-A-2 (P2) | **fixed** | Local blob parsed and quarantined **before** the mirror restore |
| AUD-A-3 (P2) | **fixed** | CSV formula neutralisation (numeric cells untouched) + test |
| AUD-F-5 (P3) | **fixed** | Malformed imported health records are dropped instead of throwing on every sync |
| AUD-R6-3 (P2) | **fixed** | Weigh-in rejects > 500 with an honest toast |
| AUD-R7-1 (P2) | **fixed** | Reminder copy reads the live `computeStreak` |
| AUD-CSS-A-2/A-3/5, C-1/2/3, B-3/B-4 | **fixed** | Toast z-index above sheets; `--border-light`, `--bg-elevated`, `--bg-dark`, `--surface-card` declared for both themes; `hybrid-score.css` light block; four light-mode contrast fixes; four sub-44 px controls raised |
| AUD-B-5 | **retracted** | See §5 — the behaviour is deliberately tested |

**Deferred (needs design, a device, or a product decision):** AUD-D-1 (hub denominator), AUD-D-2 (walk/run split across six readers), AUD-F-01 (Health Connect paging/today/error semantics — Kotlin + device), AUD-C-3 (plan export sidecars), AUD-R5-2/3/4 (editor/day-resolution/undo), AUD-R6-1/2/4 (measurement round-trip, duplicate-date write, 70 lb default), AUD-A-8 (fasting import validation), AUD-R9-1/2/3, AUD-R1-1, AUD-R2-2, §13's F-04/F-06/F-07.
