# Progress tab — execution plan

**Status:** work order. Ready to execute — all four blocking decisions are settled (§8).
**Date:** 2026-11-23
**Design source of truth:** `docs/progress-tab-plan.md` (hierarchy, display spec, invariants).
**This document:** module contracts, task breakdown, verification per task, commit boundaries.

Nothing here is production code. It is the layer the design doc was missing: what to write, in what order, and how to prove each step.

---

## 0. Readiness

| Layer | State |
| --- | --- |
| Product decisions (FOSS/ungated, photos in scope, warm-ups excluded, walks separate, Pulse+Balance hideable) | ✅ decided |
| Design (8 bands, display language, states, customisation, gating matrix) | ✅ in the plan doc |
| Module contracts | ❌ missing → §2 |
| Task breakdown + order | ❌ missing → §4 |
| Per-task verification | ❌ missing → §4 |
| Commit boundaries | ❌ missing → §5 |

**Decisions:** all four blockers are settled (2026-11-23) — see §8. P1 is unblocked and nothing in this document is waiting on a product call except the desktop-layout scope in plan §14.

---

## 1. The verification loop

Per task:

```bash
node --test tests/<new-test>.test.js     # the unit you just wrote
npm run typecheck                        # tsc over jsconfig
npm run verify                           # typecheck + precache:check + workflow:check + all tests + smoke
```

After any new **JS** file: nothing extra — `scripts/gen-precache.mjs` walks the import graph from `js/app.js`.
After any new **CSS** file or `<link>`: **`scripts/gen-precache.mjs` has a hardcoded `CORE` array** (line ~30) that lists every stylesheet. Adding `css/progress.css` to the page without adding it to `CORE` leaves the sheet uncached, and `precache:check` will not catch it because the file is not in the expected set either. So: add the path to `CORE`, then `npm run precache:gen`, then commit both.

Per phase: `npm run browser:verify` (or `-- --serial` while debugging), and before a PR `npm run preflight`.

---

## 2. Module contracts

Write these before their views. All are pure, DOM-free, and take `state` explicitly — no `appState` capture, so they are unit-testable without a browser.

```ts
// js/analytics/ranges.js
export const RANGE_PRESETS = [
  { id: '30d', label: '30D' }, { id: '3m', label: '3M' },
  { id: '1y', label: '1Y' },  { id: 'all', label: 'All' },
];
export function resolveRange(id, todayISO): {
  id; label; startISO; endISO; days: number|null; isPartial: boolean; spanLabel: string;
};
export function previousRange(range): { startISO; endISO; days: number|null };
```

```ts
// js/analytics/pulse.js
export function buildPulseModel(state, { range, todayISO, program, days }): {
  range;
  week: { startISO; days: Array<{
    day; dateISO; isToday; isFuture; isRest;
    sessions; workingSets; volumeKg; runKm; runCount; walkKm; }> };
  sessions; sessionsPlanned: number|null; adherencePct: number|null;
  streakWeeks; delta: { text; tone: 'up'|'down'|'flat' }|null;
  hasData: boolean;
};
```

```ts
// js/analytics/balance.js
export function buildBalanceModel(state, { range, previous, todayISO }): {
  range; basis: 'srpe'|'minutes'|'none';
  strengthSharePct; enduranceSharePct;        // runs only — walks never count
  excluded: { walkMinutes: number }|null;     // shown as "Not counted: 2 h 10 m walking"
  trend: { values: number[]; label: string }|null;   // strength share, pace-matched
  hasData: boolean;   // false unless BOTH modalities have >=1 session
};
```

```ts
// js/analytics/muscles.js
export function buildMuscleModel(state, {
  range, previous, grouping: 'week'|'month'|'year', unit, priorities,
}): {
  range; grouping;
  buckets: Array<{ key; label; setsByMuscle: Record<string, number> }>;
  muscles: Array<{ key; label; group; sets; credits; volumeKg;
                   sharePct; deltaPct: number|null; status: 'low'|'typical'|'high';
                   lastTrainedISO: string|null }>;
  totalSets; regions: Record<string, number>; top: string[];
  hasData: boolean;
};
```

```ts
// js/analytics/exercises-summary.js
export function buildExerciseSummaryModel(state, { range, unit, days }): {
  range;
  rows: Array<{ lift; liftId; sessions; sets; bestE1rm; deltaPct: number|null;
                lastPerformedISO; prFlag; nextLoad: number|null;
                series: Array<{ weekISO; e1rm }> }>;
  hasData: boolean;   // >= 3 exercises with >= 2 sessions
};
```

```ts
// js/analytics/endurance.js
export function buildEnduranceModel(state, { range, previous, unit }): {
  range;
  buckets: Array<{ key; label; runKm; walkKm; runCount; walkCount }>;
  runs; runTimeSec; avgPaceSecPerKm: number|null; longestRunKm;
  walks; walkKm;                              // NEVER added into the run figures
  consistency: Array<{ weekISO; days: Array<'run'|'walk'|null> }>;
  deltaKm: number|null;
  hasData: boolean;
};
```

```ts
// js/analytics/body-metrics.js
export function buildBodyMetricsModel(state, { range }): {
  range;
  weight: { latest; unit; change; ratePerWeek; corridor; points };
  sites: Array<{ key; label; latestCm; deltaCm; isLegacy }>;
  bodyFat: { latest; deltaPp }|null;
  photos: Array<{ id; dateISO; thumbUrl? }>;   // metadata only; blobs resolved by the view
  hasData: boolean;
};
```

```ts
// js/analytics/fasting-band.js
export function buildFastingBandModel(state, { range, todayISO }): {
  range; goalHours; averageHours; adherencePct;
  streak; longestHours; totalHours;
  fasts: Array<{ dateISO; hours; metGoal: boolean }>;
  hasData: boolean;   // >= 1 completed fast
};
```

```ts
// js/analytics/progress-dashboard.js
export type BandId = 'pulse'|'balance'|'muscles'|'exercises'
                   | 'endurance'|'body'|'fasting'|'reports';
export function buildProgressDashboard(state, opts): {
  range;
  focus: 'all'|'strength'|'endurance';
  bands: Array<{ id: BandId; collapsed: boolean; model: unknown }>;
  availability: Record<BandId, { hasData: boolean; moduleOff: boolean }>;
  visibleCount; totalCount;
};
```

Shared render kit — one file, so the state/a11y rules are implemented once:

```ts
// js/analytics/views/band-kit.js
export function band({ id, eyebrow, title, value, sub, actions, body }): string
export function stateBlock(kind: 'loading'|'empty'|'error'|'offline'|'stale', opts): string
export function dataTableDisclosure(columns, rows, caption): string
export function legend(items): string
export function rankedRows(rows): string
export function collapsedBandRow({ id, eyebrow, value, delta, href }): string
```

---

## 3. Dependency graph

```
ranges.js ──┬─> pulse.js ─────────────┐
            ├─> balance.js ───────────┤
            ├─> muscles.js ───────────┼─> progress-dashboard.js ─> view-progress-hub.js
            ├─> exercises-summary.js ─┤                            └> analytics.js (hub case)
            ├─> endurance.js ─────────┤
            ├─> body-metrics.js ──────┤
            └─> fasting-band.js ──────┘
band-kit.js ──────────────────────────┘ (all views)
customize.js (catalogue/aliases/order) ─> customize-sheet.js
run-sessions.js (runDist/walkDist) ─> endurance.js + running-detail.js
```

Nothing in P1–P4 touches `appState` shape. The first storage change is P6.

---

## 4. Tasks

Each row is one commit. "Acceptance" is what the test asserts, not what the PR says.

### P1 — Range, Pulse, catalogue *(no storage change)*

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T1.1 | Range resolver | **new** `js/analytics/ranges.js`, `tests/ranges.test.js` | 30d/3m/1y/all resolve to real ISO spans; a Monday-started partial current week sets `isPartial`; label contains dates, never "3 months ago" |
| T1.2 | Equal-length previous window | same files | `previousRange` is date-matched: a 31-day month never compares to 28 |
| T1.3 | Band kit: header + five states + data table + ranked rows + legend + collapsed row | **new** `js/analytics/views/band-kit.js`, `tests/band_kit.test.js` | Each state renders its `role`; `loading` reserves exact chart height; `error` includes a retry; data table rows carry the same numbers as the chart |
| T1.4 | Pulse model | **new** `js/analytics/pulse.js`, `tests/pulse_model.test.js` | Archived `arch:` weeks, `session:` one-offs and two-sessions-on-one-date each count once; warm-up-only day is a rest day; runs/walks counted separately |
| T1.5 | Pulse band view | **new** `js/analytics/views/view-pulse.js`, `tests/pulse_view.test.js` | Renders 7 cells + body map + streak; empty state names what's missing; all five states render through the mini-DOM |
| T1.6 | Customize catalogue + legacy aliases + `order` | `js/ui/customize.js`, `tests/customize_catalogue.test.js` | 8 ids normalise; a saved `running`-hidden preference hides `endurance`; `strength`-hidden hides `muscles` **and** `exercises`; unknown ids dropped; `order` appends new ids |
| T1.7 | Dashboard composer | **new** `js/analytics/progress-dashboard.js`, `tests/progress_dashboard.test.js` | `availability` agrees with each model's `hasData`; module-off bands report `moduleOff` and never render; focus collapse returns `collapsed` ids |
| T1.8 | Hub renders bands from the composer | `js/analytics/views/view-progress-hub.js`, `js/analytics.js`, `index.html` | Existing `data-action`/`data-context` contracts preserved; hub still never calls `collectAnalyticsData` |
| T1.9 | Stylesheet + cache | **new** `css/progress.css`, `index.html` link, **`scripts/gen-precache.mjs` `CORE`**, `tests/precache_manifest.test.js` | `npm run precache:gen` lists `./css/progress.css`; offline start renders Progress; **the manifest test is extended to scan `<link rel="stylesheet">` the way it already scans `<script src>`** — today it does not, so a new CSS file can be linked and uncached with every check passing |
| T1.10 | Browser check extension | `scripts/progress-hub-browser-check.mjs` | Band order, range switching, 320/390/412, light/dark, 44 px, empty + offline |

**P1 gate:** Pulse renders real numbers at 320 px in both themes; every state reachable by fixture; customize hides/shows Pulse; offline start works.

### P2 — Balance *(one model, one band)*

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T2.1 | Balance model over `buildHybridBalance` | **new** `js/analytics/balance.js`, `js/metrics/training-load.js` (additive `walkMin`/`walkLoad`), `tests/balance_model.test.js` | `basis` is `srpe` when RPE exists, `minutes` otherwise, `none` with neither; **walk time is excluded from the split and reported as `excluded.walkMinutes`**; `hasData` false unless both modalities have a session; trend is pace-matched; the Home hybrid card reads the same fields |
| T2.2 | Balance band view + legend | **new** `js/analytics/views/view-balance.js`, `tests/balance_view.test.js` | Legend states the basis in words ("by session load" / "by training time"); single-modality → band absent, never a 100 % bar |
| T2.3 | Wire into composer + filter | `progress-dashboard.js`, `view-progress-hub.js` | `focus: 'endurance'` collapses Balance? **No** — Balance is never collapsed by the filter (plan §3.5) |

**P2 gate:** a strength-only fixture produces no Balance band; a hybrid fixture produces a labelled split whose percentages sum to 100.

### P3 — Muscles *(the Hevy-parity block)*

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T3.1 | Muscle credits reducer | **new** `js/analytics/muscles.js`, `tests/muscles_model.test.js` | Sets match `volume-guide.js` for the same week; **warm-ups contribute 0** (parity fixture with/without warm-ups); holds/carries count as sets, 0 volume |
| T3.2 | Period × grouping buckets | same | `week`/`month`/`year` bucket keys are ISO weeks / calendar months / years; no `currentWeek` read (calendar guard) |
| T3.3 | Distribution vs previous period | same | `sharePct` sums to 100 ± float; `deltaPct` uses the equal-length previous window; segments < 3 % merge to `Other` in the view only |
| T3.4 | Muscles band view | **new** `js/analytics/views/view-muscles.js`, `tests/muscles_view.test.js` | Chart → body map → distribution → ranked rows; max 8 bars, top 5 rows + disclosure; colour = group hue, lightness = muscle |
| T3.5 | Delete dead `renderWeeklyVolumeDetail` | `js/analytics/views/view-progress.js` | No export removed that anything imports; suite still green |
| T3.6 | Classify + inventory the new metrics | `js/analytics/metric-tiers.js`, `js/analytics/metric-inventory.js` | New ids classified (unclassified defaults to `advanced`, which fails the landing contract); inventory entries carry all required fields |

**P3 gate:** a warm-up-laden fixture totals identically to the same fixture without warm-ups; the 33-set two-slot day reports 33, not 17.

### P4 — Exercises + exercise detail

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T4.1 | Main-exercises model | **new** `js/analytics/exercises-summary.js`, `tests/exercises_summary.test.js` | Ranking by sessions; `< 3` qualifying exercises → band absent; `nextLoad` comes from `computeDiagnosticForLift`, not re-derived |
| T4.2 | Exercises band view | **new** `js/analytics/views/view-exercises.js`, `tests/exercises_view.test.js` | Row = name · sessions · delta · spark · next; PR badge from `exercise-detail.js` only |
| T4.3 | Metric switcher | `js/analytics/views/view-strength-entity.js`, `tests/exercise_metric_switch.test.js` | Switching metric changes the series source only; weight/e1RM/volume/reps/hold/carry all selectable; no new data computed |
| T4.4 | Set records by rep target | **new** `js/strength/set-records.js`, `tests/set_records.test.js` | Target 1/3/5/8/10/12 → heaviest working set with `reps >= target`; bodyweight → most reps in a set and session; holds → best time; carries → best distance; warm-ups excluded; definition string rendered |
| T4.5 | Records UI + tap-through | `view-strength-entity.js` | Tapping a record opens the workout via `activityId` |

**P4 gate:** dashboard e1RM and PR badge byte-match the drilldown on one fixture; the records table excludes warm-ups.

### P5 — Endurance + the run/walk split

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T5.1 | Additive per-shape totals | `js/state/run-sessions.js`, `tests/run_day_summary.test.js` | `runDist`/`walkDist`/`runCount`/`walkCount` added; `dist` unchanged; a run+walk day reports `runDist` excluding the walk |
| T5.2 | Re-point distance metrics | `js/analytics/running-detail.js`, `tests/running_metrics_split.test.js` | `weekly-distance`, `four-week-distance`, `total-distance`, `weekly-run-count`, `longest-run` read run fields; method disclosure text updated |
| T5.3 | FIT sport mapping | `js/portability/import-fit.js`, `tests/import_fit_walk.test.js` | Walking/hiking sport → `type:'walk'`; a walk import never lands in run distance |
| T5.4 | Endurance model | **new** `js/analytics/endurance.js`, `tests/endurance_model.test.js` | Run and walk totals never combined; pace null without an eligible run; consistency distinguishes run day / walk-only day |
| T5.5 | Endurance band view | **new** `js/analytics/views/view-endurance.js`, `tests/endurance_view.test.js` | Grouped bars (never stacked); walk row says "not in run totals"; links to the 30-metric screen |
| T5.6 | Method + release note | `view-running.js` disclosure, roadmap session log | Existing users are told their distance shrank and why |

**P5 gate:** mixed run/walk fixture — run distance excludes walks everywhere; the change is documented in-app.

### P6 — Body + progress photos *(the only storage change)*

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T6.1 | State field | `js/state.js`, `js/state/migrations.js`, `tests/migration_v16.test.js` | v15→v16 adds `progressPhotos: []`; **one record per date**, `id = photo:<YYYY-MM-DD>`; additive, independently validated, existing keys untouched |
| T6.2 | IDB v3 store | `js/db.js`, `tests/photo_db_migration.test.js` | v2→v3 creates `photos`; `runMaps`/`routes` preserved; blocked upgrade rejects rather than hangs |
| T6.3 | Capture + downscale | **new** `js/photos/capture.js`, `tests/photo_capture.test.js` | Longest edge ≤ 1200; JPEG q≈0.82; returns bytes + dimensions; refuses non-images |
| T6.4 | Blob store | **new** `js/photos/library.js`, `tests/photos_library.test.js` | put/get/delete by id; a second photo for the same date upserts (Replace is the explicit action in the viewer); delete removes blob **and** metadata; a failed blob delete throws instead of reporting success |
| T6.5 | ZIP writer | **new** `js/portability/zip.js`, `tests/zip.test.js` | Store-only archive round-trips through a reader; CRC32 correct; no dependency added |
| T6.6 | Export/import photos | `js/photos/library.js`, Measures → See All | `openhybrid-photos-<date>.zip` + manifest; re-import idempotent by photo id (which is the date); both buttons live beside the library, not on a band that can be absent (Settings → Data has no photo control) |
| T6.7 | Body band view | **new** `js/analytics/views/view-body.js` | Weight + rate + 4 sites + photo strip; reuses `bodyWeightChartSVG`; sheet focus lands on Close |
| T6.8 | Quota display + copy | `js/settings.js` | Usage shown; >80 % warns; states plainly that automatic backups exclude photos; the roadmap records automatic photo backup as a **parked follow-up** needing a binary bridge method and device verification |

**P6 gate:** a photo survives export → delete → import; deleting the record removes the blob; JSON export still contains metadata only.

### P7 — Fasting band

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T7.1 | Fasting band model | **new** `js/analytics/fasting-band.js`, `tests/fasting_band_model.test.js` | Average/longest/adherence from `fasting-calcs.js` only; `hasData` false with zero completed fasts |
| T7.2 | Band view | **new** `js/analytics/views/view-fasting-band.js`, `tests/fasting_band_view.test.js` | 14 duration bars + goal line; module off → nothing renders; no medical claim copy |
| T7.3 | Copy audit | `js/fasting/fasting-insights.js` | Every user-facing string is elapsed-time framing; a test greps for banned claim terms |

**P7 gate:** fasting module off leaves no shell and no dead link; flagged copy has no health claims.

### P8 — Share, customize order, hardening

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T8.1 | Share any band | each view + `js/brain/pr-share.js` | Uses `shareImageCanvas` only; no second canvas path |
| T8.2 | Reorder in the sheet | `js/ui/customize-sheet.js`, `js/ui/sortable.js` | Drag persists `settings.ui.progress.order`; **keyboard Move up/down works without a pointer** |
| T8.3 | Sub-toggles | `js/ui/customize.js`, `view-body.js`, `view-muscles.js` | `bodyPhotos` and `musclesBody` hide only their own block |
| T8.4 | One-card minimum + status announcements | `customize-sheet.js` | The last visible switch refuses and explains; count announced via `role="status"` |
| T8.5 | No-paywall ratchet | **new** `tests/progress_no_paywall.test.js` | Fails on `premium`/`upgrade`/`unlock`/`paywall`/`entitlement` strings, on any range cap, and on a locked/blurred chart style |
| T8.6 | Perf pass | `scripts/performance-baseline.mjs` | Hub paint ≤150 ms warm at the 5-year corpus; range switch ≤100 ms (≤300 ms All); hub DOM ≤1.20× light corpus; no long task >50 ms |

**P8 gate:** `npm run preflight` green; measured numbers recorded in the roadmap session log.

### P9 — Measures: the dated entry behind the Body band

The Body band answers "is my body responding?" over a selected range. A photo
without that day's weight, body fat and tape is just a picture, so the date-level
record lives on ONE screen — reached from Progress → Body, and from a quiet footer
link so a profile with no body data can still record a first entry — rather than
being split between a photo strip, a measurements card and a weigh-in sheet.

| ID | Deliverable | Files | Acceptance |
| --- | --- | --- | --- |
| T9.1 | Compose one dated entry from three stores | **new** `js/metrics/measures.js` | `{ date, weight, bodyFat, sites, photo, hasAnything }`, newest first, every field optional, nothing derived |
| T9.2 | Coherent upsert + whole-entry delete | `measures.js` | A cleared field removes that part of the date; an implausible value changes NOTHING; legacy Arm/Thigh survive an edit; an untouched site keeps its EXACT stored centimetres on a cm/in round trip (`unchangedSites`); the photo blob is deleted through an injected deleter (the model stays DOM/IDB-free) |
| T9.3 | Measures screen | **new** `js/analytics/views/view-measures.js` | `+`, See All ⇄ Entries, entry rows with a photo thumb, a photo library; units from the model |
| T9.4 | Sheet: Add picture at the TOP, weight, Save | `js/measurements-sheet.js`, `index.html` | The picture is STAGED until Save, so Cancel cannot orphan a blob; every field optional |
| T9.5 | Viewer: compare, replace, edit, delete | `js/ui/photo-viewer.js` | Two photos side by side from a picker that hides itself when there is nothing to compare with; Delete asks first |
| T9.6 | Band becomes a preview, not a second editor | `js/analytics/views/view-body.js` | The strip opens the viewer; the add tile opens the SAME dated entry (no camera shortcut that skips the numbers); the bodyweight graph stays reachable |
| T9.7 | Browser contract | **new** `scripts/measures-browser-check.mjs` | empty profile → add → save → entry → abandoned pick leaves nothing → second date → See All → compare → Edit entry (one history marker) → replace (blob HASH changes) → delete, asserting records AND blobs at 390/320 |
| T9.8 | Single-site explorer | **new** `js/analytics/measurement-explorer.js`, `view-measures.js` | One measured site or body fat; 30D / 3M / 1Y / All; latest + change since the previous reading; the shared `siteTrendHTML`; exact readings table; leaf-local range; a range with no readings offers Show all. The Body band's four site cells open it on that site |

**P9 gate:** the entry, not the model, is what must be proven. Unit tests cannot
see a covered tile or a history marker that blanks the page; `measures-browser-check`
drives the real file chooser and the real confirm.

---

## 5. Commit boundaries

One task = one commit, message prefixed with the phase:

```
feat(progress): resolve calendar ranges and equal-length comparison windows
feat(progress): band kit with the five required states
feat(progress): Pulse band from calendar-dated sessions
feat(progress): map the customize catalogue with legacy aliases
...
```

Rules already in `AGENTS.md` that apply here:

- Never commit a red tree; run `npm run verify` before each commit.
- Short-lived branch per phase (`progress/p1-pulse`), no pushes to the default branch without asking.
- Update `docs/IMPROVEMENT_ROADMAP.md` status + session log at the end of a session, not mid-task.
- If `AGENTS.md` gains a new architectural fact (the band contract, the run/walk rule), regenerate `CLAUDE.md` or `tests/agent_brief_sync.test.js` fails.

---

## 6. What each phase must prove (the gate)

A phase is done when, on one fixture that contains:

- an archived `arch:` week,
- a `session:` one-off,
- two programmed days completed on the same date,
- a warm-up-only day,
- a mixed run/walk day,
- kg **and** lbs profiles,

…the following hold: numbers match their owner module, warm-ups contribute nothing to volume or sets, walks never enter run totals, all five states render, and the browser check passes at 320/390/412 in both themes.

If a number disagrees with an existing screen, the existing screen is right and the new reducer is wrong.

---

## 7. Parallelism

| Can run concurrently | Because |
| --- | --- |
| T1.1–T1.3 ∥ T1.6 (customize) | different files, no shared dependency |
| P2 ∥ P3 ∥ P4 models (T2.1, T3.1, T4.1) | three independent reducers over the same slot index |
| T5.1–T5.3 (run/walk) ∥ P2–P4 | data-layer change, disjoint files |
| P6 photo work ∥ everything else | only phase touching `appState` shape and IDB |

Do **not** parallelise changes to `js/analytics.js`, `view-progress-hub.js` or `customize.js` — every band touches them, and merge conflicts there hide real bugs.

---

## 8. Decisions taken

Settled 2026-11-23. These were the four blockers; none is waiting on anything now.

| # | Decision | Consequence for the build |
| --- | --- | --- |
| **D1** | **Walks are excluded from the hybrid Balance split**, and shown beneath the legend as "Not counted: 2 h 10 m walking". | T2.1 gains an additive `walkMin`/`walkLoad` on `dailyLoadBreakdownTimeline`; `buildBalanceModel` returns `excluded.walkMinutes`. The **Home hybrid card changes too** — one definition of the mix, everywhere. Reason: on the minutes fallback an unrated 45-minute walk would count the same as a hard 45-minute session, so a daily walk could outvote real training. |
| **D2** | **One photo per date.** `id = photo:<YYYY-MM-DD>`; a second photo for the same day offers *Replace* or *Cancel*. | T6.1/T6.4 key on the date, so comparison, the strip, export and re-import stay unambiguous and idempotent. Multi-per-date is deferred, not forbidden — `id` stays the key, so it is a later additive change. |
| **D3** | **Manual ZIP export now; automatic Android photo backup is a parked follow-up.** | T6.8 ships the honest Settings line ("automatic backups include your training data; photos are exported separately") and records the follow-up in the roadmap. It needs `HybridAutoBackupBridge` binary write, rotation semantics and a real-device test — none verifiable from this environment, and faking that verification is worse than deferring it. |
| **D4** | **Keep muscle credit `1 / .5 / .25`.** | T3.1 matches `volume-guide.js` exactly and the method note states the weights. Adopting Hevy's `1 / .5` would move every muscle-load number in the app for cosmetic parity. |

Still open, and not a blocker for any task: **desktop layout scope** (plan §14). The plan assumes two columns at ≥600 px and a sticky rail at ≥900 px; a desktop navigation model would be an app-shell change.

---

## 9. First six commits

If work starts now, this is the shape of day one — small, verifiable, reversible:

1. `js/analytics/ranges.js` + `tests/ranges.test.js`
2. `js/analytics/views/band-kit.js` + `tests/band_kit.test.js`
3. `js/analytics/pulse.js` + `tests/pulse_model.test.js`
4. `js/analytics/views/view-pulse.js` + `tests/pulse_view.test.js`
5. `js/ui/customize.js` catalogue + aliases + `tests/customize_catalogue.test.js`
6. `css/progress.css` + `index.html` link + `CORE` entry + `npm run precache:gen`

After commit 6 the tree is still shippable with the old hub, because nothing has replaced a rendered surface yet. The first commit that changes what a user sees is the composer wiring (T1.8).
