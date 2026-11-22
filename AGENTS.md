# openHybrid — Codex Working Brief

openHybrid is a hybrid strength + running PWA (~55k lines vanilla JS ES modules, no
framework; ~15k CSS; service-worker PWA). This file is auto-loaded every session.

## License
- **AGPL-3.0-only** (`LICENSE`), copyright the openHybrid contributors. Third-party notices
  are in `NOTICE.md`; update them before adding vendored code, fonts or media.
- Contributions are accepted under the same licence. The hosted PWA and Android
  app keep a source link under Settings → Data → App → Source code.

## Commands (keep all green before every commit)
- `npm test` — node --test suite
- `npm run typecheck` — tsc over jsconfig
- `npm run smoke` — scripts/smoke.mjs (jsdom import + home render)
- `npm run icons:gen` — regenerate PWA/Android icons from `assets/brand/icon.svg`
- `npm run browser:verify` — 45 real-Chromium product checks through a parallel
  worker pool (3 workers by default; `-- --serial` for one-at-a-time debugging,
  `-- --concurrency=N` to pin workers, `-- --timeout=N` for the 180 s per-check
  kill, `-- --retries=N` for the default single retry after a timeout)
- `npm run preflight` — `verify` + the full browser suite. Run this before opening
  or updating a PR that touches shared UI; never merge on pending checks.

## Architecture facts (verify before relying on them)
- State: one big `appState` object → localStorage (source of truth) in the browser;
  the Android shell also writes an app-private atomic mirror via
  `StateMirrorBridge`/`StateMirrorSafe` + `js/state/mirror.js`. There is **no
  account system, backend or cloud sync**: local data, JSON/CSV export and Android
  automatic backups are the whole persistence story. Do not reintroduce a server
  client without a new product decision.
- History import: `js/portability/import-workout-csv.js` is a clean-room reader
  for OpenGym/Strong/Hevy one-row-per-set CSV (no OpenGym code copied). It writes
  archived `arch:import:<id>` weeks with a stable `sessionId`, leaves the active
  program alone, imports strength sets and turns cardio rows into archived runs.
  It accepts comma/semicolon/tab files and UTF-16 Excel exports. Timed holds
  (`mode:'time'`, `sec`) and loaded carries (`mode:'distance'`, `dist` in
  metres) are imported as real rep-less sets and are never guessed into runs;
  a carry name that contains “walk” stays a carry. `import-body-csv.js`
  reads the `date,weight_kg` body export into `bodyWeightLog`, skipping existing
  dates. `handleExternalCsvFile` auto-detects the file type, previews it and
  applies it; re-importing the same file is idempotent. Batch FIT imports live in
  `js/portability/import-fit.js`, parsed lazily by `parseFitBuffer` in
  `js/garmin.js`; runs keep date/distance/pace/HR/GPS, strength FIT files keep
  time/HR only because FIT has no exercise names.
- Program-run isolation: every program run has a stable `state.activeActivationId`
  (`js/state/activation-identity.js`) and each week is stamped `week.activationId`. A
  switch/restart calls `startProgramActivation` (state.js) → `beginActivation` +
  `archiveForeignWeeks`: the previous run's numeric weeks move to `arch:<oldId>:<n>` keys
  **inside `state.weeks`** (logged history kept — every date-/all-time analytics + PR
  reader iterates all entries and attributes by stamped date, so archived data still
  counts; numeric week-nav `1..totalWeeks` and program-week-indexed series only touch
  numeric keys, so a past run never appears in the active workout). This is what stops a
  previous program's completed lifts leaking into a new program's day — do NOT reintroduce
  same-slot reuse across programs. v3 migration adopts legacy weeks into one activation.
- Modules: `js/modules.js` owns the Running, Fasting, Health and Recovery
  switches in `settings.modules` (default on). `applyModuleVisibility` publishes
  `<html data-module-*="on|off">`; CSS hides `[data-module="…"]` entry points.
  Train quick starts/recent runs, Progress domains and Home insight/running cards
  filter through `moduleEnabled`; analytics sections carry `data-module` hooks so a
  deep link cannot reopen a hidden module. Settings must reflect the switches. Data is
  never deleted, and stored history remains readable. Fasting stage nudges are
  gated by `moduleEnabled(state,'fasting')` AND the athlete's
  `settings.notifFastingStage` (default on), so a hidden module can never notify;
  there is no separate `settings.fastingEnabled` flag.
- Settings navigation: `js/settings/nav.js` is the pure navigation model — five
  fixed destinations (Profile / Training / Health / Appearance / Data), the
  card-label → group map (`settingsGroupForLabel`; unknown and
  Object.prototype labels land in Training) and `sectionMatchesQuery` (visible
  text + `aria-label`/`title`/option text, skipping any subtree whose
  `[data-module]` is disabled). `js/settings.js` renders the filters as a
  `role="group"` of `aria-pressed` buttons (never a fake tablist), clears the
  query on open/close, resets scroll on search and announces no-results with
  `role="status"`; the visible count ignores cards hidden by a module switch.
  Training order is Training (units) → Logging (rest tiers/presets/sound,
  progression, previous values, warm-up, plate hints) → Program Week → Equipment
  → Modules. `.settings-switch` is a 44px hit area around the unchanged 42×24
  track, every switch has an accessible name, `.hc-data-toggle` is a 44px row,
  and `.settings-body` pads with `--safe-bottom` after the env() fallback.
  Threshold pace accepts strict `mm:ss` (60–3600 s) or legacy seconds and leaves
  the stored value untouched on invalid input. `tests/settings_wiring.test.js`
  ratchets the STATIC settings input/select/textarea ids to a handler (not
  buttons or JS-rendered controls); add a real handler rather than a sixth tab.
- Saved activity editing: `js/workout/edit-saved.js` edits a finished strength
  workout through a lossless DRAFT (weights, reps, holds, carries, notes) or a
  run's distance/time/HR/notes. Cancel never touches stored state. Strength can
  add an exercise (catalogue search or custom name), add/remove a set and remove
  an exercise; Save commits them together, preserves the session id/date/route,
  stamps filled new sets completed and refreshes the finished summary's set
  count. Programme scaffolding that landed on the same day later is preserved
  but is not presented as part of the historical session.
- Note scopes and private links: `week.notes[day]` is the WORKOUT note — shown
  by the cockpit, finish recap and History and exported as the CSV `Notes`
  column. It is strength-only: `buildSessionRecap` gates it on
  `activityKind !== 'run'` (plus real strength work), so a run detail on a
  mixed date never borrows it; run notes stay on the run session
  (`runs[].notes`). Exercise notes and reference links live in
  `settings.exercisePrefs`, keyed by `exerciseConfigKey` (canonical id; aliases
  share one entry): `note` (140 chars) and `link` (only via
  `safeExternalHttpUrl` — http(s), no credentials/control chars). They are
  shown in the cockpit, the program-builder row (which opens the exercise
  options sheet) and the Train/plan previews read-only; they never enter
  History, share cards or CSV. A routine note is `routine.note` (≤500, absent
  when empty). Starting a routine stores only `week.sourceRoutineId`; the
  cockpit banner calls `routineNoteForSession` → `findRoutine` on every render,
  so edits are live and deleting the routine removes it. Import clones
  `exercisePrefs` on a null prototype, repairs links, and truncates routine
  notes instead of dropping them.
- History (formerly Activities): `js/activities.js` + `js/activities/model.js` +
  `js/activities/calendar.js` own the record/action destination — Calendar | List,
  search, month headers, provenance, source filter (Logged in app / Imported),
  exact detail, edit/delete with Undo. The
  calendar is built from the same `buildActivityHistory` rows the list renders, so
  imported/archived and same-day sessions cannot disagree with the list. Tapping a
  calendar day opens a managed day sheet with that day's sessions; "View full day"
  switches to the filtered list. Programmed
  titles resolve through `getProgramById(activation.programId)`; imported titles
  keep `sessionTitle` and a source badge. Deleting strength clears and restores
  `sessionStatus`/`sessionSummary` with the set snapshot. A strength detail has
  **Repeat this workout**: it force-closes History and clones the source sets
  into a fresh one-off session (values kept, completion cleared) via
  `createOneOffStrengthSession`. Train and Progress link here; they do not keep
  a competing calendar. The old `js/home/activity-calendar.js` was removed.
- Routines: `js/routines/store.js` owns the root `state.routines` /
  `state.libraryFolders` arrays (v13→v14 seeds them) and mints `rtn_`/`fld_` ids;
  `js/routines/model.js` builds a routine from a finished History session
  (`buildRoutineFromSession`) and returns a copyable week for
  `createOneOffStrengthSession` (`routineSourceWeek`). A routine is a reusable
  SESSION TEMPLATE, never a program: it must never enter `customPrograms`, resolve
  through `getProgramById`/`resolveProgramForState`, render as a `.prog-card`, or
  call `startProgramActivation`/`reseedActiveProgramIntoWeek`; it writes no
  `state.weeks`, `currentWeek` or `activeProgramId`. `prescriptions` is
  authoritative for sets/reps/load/rest while `days[].lifts` stays bare strings.
  Only completed working sets are saved — never completion flags, PR badges,
  warm-ups, role stamps, effort, notes or gym stats. Load IDENTITY is preserved
  (`bw`/`band`/`loadMode`): a bodyweight or assisted set stores no derived
  weight, so the next session uses today's bodyweight, and a legacy dumbbell set
  records `basis:'total'` so the pair is not re-read as one bell. Records carry
  `kind:'routine'`; `js/state/import-validate.js` bounds and repairs the library
  on import. History's action menu owns "Save as routine"; Plans → My Plans leads
  with the routine list (`routine-card`, never `.prog-card`), where Start copies
  `routineSourceWeek` into a one-off `session:` week and Rename/Move/Delete
  (+Undo) live in the `•••` menu. Start is a real start: `startRoutine` marks the
  one-off `in_progress`, binds the session clock and opens the active cockpit
  through `beginActiveWorkoutSession`, the same sequence the cockpit Start button
  uses; while another workout is open it refuses and offers Resume instead of
  replacing or orphaning that session. `libraryFolders`
  (`{id,name,sortOrder,createdAt}`) group routines with ONE-WAY membership on
  `routine.folderId`; a folder never stores a member list, deleting one moves its
  routines to Unfiled and never deletes a routine (Undo restores the folder at its
  display index and the membership). Folder order is display-based (`sortOrder`,
  then name) and renormalised on every create/delete/restore/move; a routine has no
  ordering field of its own. `js/app.js` owns those actions; they never activate
  or reseed a program.
- Plans library: Discover is one searchable all-programs list (12 initial, Show
  all expands); saved, completed, custom and imported plans share My Plans.
  `js/programs/program-json.js` exports/imports `openhybrid-plan` JSON; imported
  plans become fresh custom programs and never overwrite a catalog plan.
  `js/programs/opengym-plan.js` imports openGym plan files: weekdays map to days,
  exercise ids resolve through `OPENGYM_ID_NAMES`, and per-exercise sets/reps/
  starting load/rest live in the program's `prescriptions` sidecar. `liftTarget`
  reads that sidecar, the cockpit ghosts the starting weight and the rest timer
  honours the prescribed rest; `day.lifts` stays bare strings.
- Surface customization: `js/ui/customize.js` normalizes `settings.ui.home` /
  `settings.ui.progress`; hidden ids never hide pinned safety/Today/navigation
  surfaces and never block a deep link. v11→v12 seeds the empty preference.
  Progress hides its domain/secondary cards; Home applies the class on
  `[data-home-card]` during `renderHome`.
- Bodyweight: `js/metrics/bodyweight.js` is the pure trend model behind the
  Progress graph (weekly means, 21-day least-squares rate, goal/corridor status).
  `settings.targetWeight` and `settings.rateGoal` are optional; v7→v8 seeds them.
  The view lives in `js/analytics/views/view-bodyweight.js`, the SVG chart in
  `js/analytics/charts.js`, and the prefilled weigh-in sheet (steppers, date,
  recent edit/delete) in `js/bodyweight-sheet.js`.
- Body measurements: `js/metrics/measurements.js` is the pure model behind the
  Measurements card beside the bodyweight trend — 14 canonical length sites
  (neck, shoulders, chest, waist, hips, glutes, arm_l/r, forearm_l/r,
  thigh_l/r, calf_l/r), stored canonically in CENTIMETRES with one record per
  date and any site optional (`bodyMeasurements: [{ date, neck?, … }]`). A unit
  toggle reads cm/in without rewriting stored values; `settings.measurementUnit`
  is seeded by v12→v13 from the existing weight unit. The sheet
  (`js/measurements-sheet.js`) shows six primary fields and puts the eight
  bilateral fields behind “Arms, thighs and calves”. It prefills an existing
  date exactly and leaves a new date blank (the last reading is only a
  placeholder; for body fat it is the latest reading ON OR BEFORE the date) —
  changing the date must reload the fields. The pre-14-site single `arm`/`thigh`
  readings are `LEGACY_MEASUREMENT_SITES` (“Arm (old)”/“Thigh (old)”): readable,
  shown on the card and exported, never an input, and `preserveLegacySites`
  carries them across an edit so adding a waist cannot drop them.
  `buildMeasurementsCsv` exports the raw centimetres (14 canonical columns, then
  Arm/Thigh, then body fat) from Settings → Data, and
  `js/portability/import-measurements-csv.js` reads that shape back
  (`date,waist_cm,…`, `_in` columns converted): all 14 canonical keys and the
  legacy arm/thigh import, old six-site files still work, rows for the same date
  merge site by site, implausible readings are skipped, and an existing date is
  never overwritten. Body fat is an ENTERED reading (scale,
  calipers, DEXA), never estimated — there is no height/sex/age in state, so a
  formula would fabricate data. It is an additive `bodyFat` percentage on the
  same records (2–70, one decimal, `bodyFatPercent`), deliberately NOT a
  `MEASUREMENT_SITES` entry (that set is cm-validated) and never changed by the
  cm/in toggle; `bodyFatTrend` reports percentage-point deltas and the card
  renders it only when measured (a body-fat-only record still counts as an
  entry). The sheet's full-width `msSheet_bodyFat` field replaces the record, so
  editing another site cannot drop the stored percentage. The measurements CSV
  has a `Body fat (%)` column, and imports accept `body_fat`, `bodyfat`,
  `body_fat_pct` or `body_fat_percent` as a percentage (never cm/in; semicolon
  files accept a decimal comma). Its dark cyan accent has a light-mode override
  (`#155e75`) measured in the bodyweight browser check. Known limitation: a
  combined weigh-in + body-fat CSV belongs to the bodyweight reader, so body fat
  from that file is not imported; the weigh-in confirm now names that omission.
- Warm-up ramp: `js/workout/warmup-ramp.js` builds editable warm-up rows above
  the working weight. Barbells ramp 40/60/80% above the bar, rounded to the
  active profile's plates and pair counts; dumbbells have no bar, so each rung
  snaps DOWN to the heaviest bell the profile's ladder owns (a `total`/Both
  entry ramps in pair space, `each`/`per-side` per bell) and an unconfigured
  ladder yields no ramp instead of inventing weights. `rampSetsFor` gives
  compound lifts the three-rung ladder and single-joint work two rungs (50/75%);
  bodyweight-only movements never ramp. `settings.autoWarmupRamp` is opt-in
  (v8→v9 seeds false); the first working weight triggers it once and
  `liftMeta[day][lift].autoRamp` prevents resurrection.
- Muscle load: `js/analytics/muscle-load.js` reuses the Volume Guide's per-muscle
  weekly credits and adds last-trained recovery labels; the view is
  `js/analytics/views/view-muscle-load.js`, reached from Progress.
- Progress overview: `buildProgressLanding` returns `weekSummary`, `units` and
  `recentWeeks`; `buildRecentWeekSeries` and `buildCalendarTrainingWeeks`
  (`js/analytics/training-calendar.js`) are date-strict, so imported/archived
  sessions appear in the real week. The hub leads with a hero for the SELECTED
  calendar week (eyebrow and aria-label are the Mon–Sun range, never a relative
  "N weeks ago") and a 12-week strip before the domain cards. An untrained
  selected week renders an honest `0 sessions · <range>` hero rather than
  vanishing, and a historical week is never scored against the active plan —
  "of N planned" and the adherence bar appear only for the live week. Review
  Stats leads with the seasonal **Year in Review** (`js/brain/year-review.js` +
  `views/view-year-review.js`): December recaps the current partial year, January
  the year just ended, and the section is absent in every other month. The
  heading lives inside `#yearReviewContainer` because `.section-header` is
  `display:flex !important`, so only hiding the container hides both. It counts
  distinct sessions by stamped date (one strength session + each run), and
  reports totals, best month, the in-year consecutive-day run, per-DATE annual
  e1RM PR events and top exercises. Volume goes through the shared
  `formatVolume` (`js/analytics/utils.js`), which LABELS the athlete's stored
  unit and never converts it — kg keeps its `t` compaction, lbs stays lbs.
  Bodyweight is deliberately omitted because weigh-ins are stored in the
  athlete's then-current unit. Review
  Stats' Training Calendar and Consistency Log use the same calendar weeks (no
  `W1..Wn` program grid).
  `loggedSessionsByDate` counts sessions inside a slot — strength plus every
  run — not slots, so a strength+run day is two sessions. The Training Report
  (`js/brain/monthly-report.js`) uses the same rule through
  `forEachLoggedDay().sessionCount`, with a 30-day or 12-month window compared
  against its own prior window. Projections use the
  same dated calendar series for strength and running, with a program-week
  fallback only for legacy undated states. Recovery/Strength current load
  (ATL/CTL/ACWR, monotony, strain, consistency) uses the same dated timeline;
  program-week series remain for the chart trends.
- Exercise drilldown: `js/analytics/exercise-detail.js` is the pure model behind
  `renderExerciseDetail` (`js/analytics/views/view-strength-entity.js`). It
  reads same-exercise history across programs and aliases, keeps each set's
  shape (rep / hold / carry), reports the all-time best set, and marks a PR only
  when a session beats EVERY earlier one — the visible range filters the chart
  and evidence list, never the PR baseline. The view leads with the latest set
  and its change, then summary cards, an SVG trend and exact session evidence.
- Progression styles: `js/programs/progression-style.js` defines `double`
  (default), `linear` and `rep-first`. Custom programs store `progressionStyle`;
  `computeDiagnosticForLift(..., { progressionStyle })` forwards it to
  `suggestProgression`, and the program editor's Progression tab exposes the
  choice. RPE/fatigue/cut/stall holds still take precedence in every style.
- Themes: `js/theme.js` owns the palette id; CSS owns the colours. Midnight is
  the icon-derived default for dark/system profiles (schema v10 seeds it), with
  Slate/Forest/Ember alternatives. Light keeps its own variable block. The
  Settings palette buttons persist `settings.palette`.
- Exercise catalogue: the original 157 are `CORE_EXERCISES`; `js/exercises/opengym-catalogue.js`
  adds ~5,555 openGym catalogue **metadata** entries (names/ids/muscles/equipment; no imported instructions, descriptions or media) imported by
  `scripts/import-opengym-catalogue.mjs`. `OPENGYM_ID_NAMES` resolves plan-file ids.
  Never include Gym-visual media; see NOTICE.md and docs/EXERCISE_LIBRARY.md.
- Equipment profiles: `js/equipment-profiles.js` owns
  `settings.equipmentProfiles` (array of
  `{ id, name, equipment, bandWeights, plateSetup }`) plus
  `activeEquipmentProfileId`. `settings.equipment` / `settings.bandWeights` are
  the active profile's projection and remain the fields every other caller
  reads; always update through the helpers rather than writing them directly.
  `plateSetup` stores `{ kg: { bar, plates[], counts{} }, lb: { … } }` per
  profile. `counts` is optional pairs per size; absent means unlimited.
  `getActivePlateSetup(state, unit)` feeds `plateHint(total, unit, setup)`, which
  reports a shortfall instead of inventing plates. `dumbbells` is a per-unit
  ladder and `machineStacks` a per-exercise ladder; `computeDiagnosticForLift`
  snaps suggested loads to them when configured. The logger only renders the
  per-side line when `settings.showPlateHints` is on (default off). Settings →
  Equipment switches, adds, renames and deletes profiles (the last cannot be
  deleted). v6→v7 seeds the optional inventory shape; v5→v6 seeded the first
  profile from the legacy kit.
- Home decision surface: `index.html` renders ONE week surface
  (`#homeWeekStrip`) containing the optional seven-day rail
  (`js/home/week-strip.js` → `#homeWeekDays`, `data-home-card="weekStrip"`) and
  the pinned Today decision (`#homeTodayCard`, rendered by
  `js/home/today-card.js`). A fresh `ready` day collapses Today to one compact
  row but KEEPS `#homePrimaryCta` visible; tapping today's date cell or the row
  expands the guidance, and `isTodayCardCollapsible` keeps in-progress/
  completed/rest/no-plan/unresolved states fully open. Hiding "This week" in
  Customize hides only the rail, never Today. Completed days add the session
  summary and anatomical heat map (`js/home/session-summary.js` /
  `js/home/body-heatmap.js`: the static path geometry is Apache-2.0 Body
  Muscles, vendored with its notice), and the rail pages back through four
  previous weeks as a recap (`js/home/week-view.js`), never a Start action.
  A date cell NEVER navigates: today shows the Today decision/summary; a
  completed date selects in place and renders `dayRecapHTML` (stats, heat map,
  muscles) with Back to week/today. Only the explicit "Open full activity"
  opens History. `buildDayRecap`/`summariseSlots` resolve the stored
  program-day title. The card deliberately omits the state pill, score row and
  evidence drawer. Below it sit the compact
  bodyweight card (`js/home/bodyweight-card.js` → `#homeBodyweightCard`) with
  one-tap prefilled logging, one coach insight from `model.topInsight`, and a
  2×2 quick-action grid. The In Focus cards and their graph module were removed;
  deep charts live in Progress. Optional cards (week strip, bodyweight, coach
  insight, muscle volume) can be hidden from the Home header's Customize sheet:
  `js/ui/customize.js` owns the card catalogue and `settings.ui`, and
  `js/ui/customize-sheet.js` persists/applies it. Today, safety flags, quick
  actions and navigation stay pinned. Keep `#homePrimaryCta`,
  `.btn-history-link` and the Run quick action in the Home DOM — browser checks
  measure them.
- Train landing: `js/train/train-landing.js` + `view-train-landing.js` render a
  SESSION PREVIEW, not a second Home: week rail, today's card with the day's
  `liftTarget` prescriptions, one Start/Resume, Quick start limited to
  Run/Walk/Fast, and one recent row. Do not add a "Workout" quick start — it
  duplicates Start; a different or empty workout belongs to "Choose another
  workout". Start opens the cockpit directly; an active session is Resume.
- Active cockpit: once a session is running, `view-workout.cockpit-session-active`
  keeps a sticky compact block (Back, volume/sets, Finish, session clock and a
  numbered exercise rail) and hides the full header, day selector, "Exercises"
  heading and vertical outline. The active card is scrolled into view with
  enough offset that its first set stays under the sticky block. The rail and
  stats refresh after a set is ticked without re-rendering the cockpit.
- Weekly analytics attribution: `state.currentWeek` is a PROGRAM-week counter that only
  advances on an explicit step / confirmed auto-advance — it is NOT the calendar week.
  So "this week" analytics must NOT read `weeks[currentWeek]` directly (that leaked a
  frozen program week's stale training into the current week). `js/analytics/weekly-aggregate.js`
  is the canonical source: it buckets every logged day by its real stamped `.dates[day]`
  into Monday-based CALENDAR weeks (`buildCalendarWeekStrength`, `collectCalendarWeek`,
  `weekStartOf`, `localDayKey`). The Progress strength/running charts (`buildWeekChart`) + detail +
  the At-a-Glance Weekly Volume tile (`model.calendarWeek`) all consume it, so an empty
  current calendar week is a true zero and the week label is the real Mon–Sun range, never
  derived from the activity records. The strength/running **detail week navigator**
  (`js/analytics/week-nav.js`) is also CALENDAR-based (`getCalendarWeekOffset()`, ephemeral
  offset, reset on view entry) — it never reads `state.currentWeek`. `explainWeeklyMetric`
  is a dev-only attribution trace (program week is metadata; the date decides the week).
  SEVERAL stored slots can own ONE calendar date (two programmed days completed
  the same day; a one-off later that day; a tracked run plus an imported one).
  `indexSlotsByDate`'s dedup identity is therefore the strength `sessionId` when
  present and otherwise the PROGRAM DAY — matching on "no sessionId" alone made
  every programmed slot on a date one duplicate family and silently discarded the
  smaller session (17 sets shown for a 33-set day). Same program day under two
  week keys IS a duplicate (copied week / re-activation reusing week numbers) and
  still collapses to one. Downstream,
  `collectCalendarWeek` must MERGE every field, never assign: it merges `lifts`,
  concatenates `runSessions` and re-summarises them through `runDaySummary`
  (adding two summaries would break duration-weighted RPE/HR), merges `gymStats`
  via `mergeGymStats` (durations/calories add, peak HR maxes, average HR is
  duration-weighted, `time` stays storable `M:SS`), and records `sessionCounts`
  so `activityCount` is real. Assigning is the bug that showed a 5km + 10km day
  as 10km. SESSIONS and TRAINING DAYS are different counts once two workouts
  share a date: anything comparing against planned sessions (Progress →
  Consistency) must use `loggedSessionsByDate`, not a set of dates — counting
  dates reported five completed workouts as "4 of 5 planned".
  `tests/analytics_calendar_guard.test.js` keeps the calendar-core modules
  program-week-free. Program adherence, "Week N" labels, deload detection and today's
  planned session stay PROGRAM-week based; CTL/ATL/readiness stay rolling-window. The
  Strength overview's per-lift **estimated-1RM "this week" change + PR indicators** use
  `js/analytics/strength-calendar.js` (`calendarStrengthSummary`, `bestE1rmByLiftForWeek`,
  canonical `estimatedE1rm`) — calendar-week, same-exercise only. Stored keys remain bare
  strings, while `js/exercises/catalog.js` resolves explicit historical aliases to a
  canonical ID/display name at read time; unknown custom names stay exact. The Hybrid Score strength
  pillar stays program-week progression on purpose. Hybrid Score is no longer a
  Progress destination, weekly-review card or onboarding reveal; the computation
  remains for the morning briefing/notifications and for the one-release
  compatibility window before cleanup.
- Crash reporting: Sentry in `js/monitoring/`, DSN-gated (off until `sentry-config.js`
  has a DSN), PII-scrubbed for health/location data.
- Mobile safe areas: `--safe-top` / `--safe-bottom` (`css/styles.css`, beside
  `--touch-target`) are the ONLY correct way to clear the system bars. They consult
  BOTH `env(safe-area-inset-*)` AND `var(--app-safe-*)`, because the Android WebView is
  edge-to-edge but only reports `env(safe-area-inset-top)` for a DISPLAY CUTOUT — on a
  notchless phone `env()` is 0px and env-only CSS silently does nothing. Every
  top-anchored surface pads from the token and keeps its pre-token declaration first as
  a fallback. `scripts/safe-area-browser-check.mjs` is the only check that publishes a
  non-zero inset; without it this defect class is invisible to a desktop-Chromium suite.
  Backdrops that render no content are deliberately NOT padded.
- Touch targets: 44px (`--touch-target`) is MEASURED in the running app by
  `scripts/touch-target-browser-check.mjs`, which walks 12 surfaces — the four nav
  destinations, the in-session cockpit and its modals, the LIVE run panel and
  onboarding (875 controls) — and sizes the EFFECTIVE hit area. Every opener is
  asserted, so a selector that stops matching fails instead of silently measuring
  nothing. A COVERED control (its own centre resolves to a different element) is
  skipped: views stay `.active` under a modal, so measuring them there reports true
  unreachability for a non-problem. Runtime-injected third-party controls count —
  Leaflet's 30×30 map zoom buttons were a real defect no static test could see. `tests/accessibility.test.js` greps `index.html` and so
  can only ever see the static shell — most controls are rendered from JS template
  literals, which is where every offender lived (a 5×5 carousel dot, a 19px metric tab).
  Two mechanisms: `min-height: var(--touch-target)` where the box can grow, and
  `.hit-target` (`css/styles.css`) where the visual size is deliberate — it grows a
  centred `::after` that takes the taps while the paint is unchanged. NEVER expand a hit
  area past half the gap to the next control: overlapping targets do not merge, the
  later element wins the overlap and the earlier one becomes UNREACHABLE (this is why
  the carousel dots stop at their 10px pitch instead of taking a nominal 44px). The
  check's `EXEMPT` list is for geometric impossibility only and is ratcheted by
  `tests/touch_target_exemptions.test.js`: at most three entries, each stating
  arithmetic rather than a preference. The check probes REACHABILITY with
  `elementFromPoint` rather than reading CSS, so it must `scrollIntoView` each
  control first — without that everything is below the fold, every probe returns
  null and the check quietly degrades to trusting the declaration. A point
  outside the viewport is UNKNOWN, not unreachable (for example a control inside
  a horizontal scroller).
- Performance: `scripts/performance-baseline.mjs` (`npm run perf:baseline`) is the
  baseline harness — three full boots, one with five years of history (260 weeks,
  ~20,800 sets). It asserts ONLY machine-independent facts: first paint is not
  render-blocked (<3s), the active-view DOM stays within 1.35× as history grows
  (measured 1.03×), and the app renders with every external host blocked.
  Wall-clock is REPORTED, never asserted — this container is ~3x slower than CI and
  neither is a phone. Webfont CSS is loaded NON-BLOCKING (`media="print"` +
  `js/font-css.js` flipping it to `all`); a plain `<link>` there blocks first paint
  until it loads OR FAILS, which measured 12.6s on every offline start.
  `display=swap` does NOT prevent this — it governs the font file, not the
  stylesheet.
  Every other browser product check creates contexts through
  `createBrowserContext` (`scripts/browser-runtime.mjs`), which permits the
  local fixture server and blocks external HTTP(S) hosts. A Google Fonts 404
  otherwise made identical CI runs fail in different random checks while every
  product assertion passed. Local missing assets still return real 404s and
  fail. The performance baseline deliberately uses direct contexts because it
  owns separate online and externally-blocked scenarios.
- Service-worker cache: `CACHE_NAME` carries a generated content hash
  (`scripts/gen-precache.mjs`), so editing any precached asset changes `sw.js` and the
  upgrade fires. Non-JS assets are cache-first and a browser only reinstalls a worker
  whose bytes changed, so before this a CSS-only commit never reached installed PWA
  clients. Classic `<script>` tags in `index.html` are precache ROOTS: nothing imports them, so a
  graph walk from `js/app.js` cannot see them and a miss only breaks offline.
  Never hand-edit `CACHE_NAME` or the `REQUIRED_ASSETS` block — run
  `npm run precache:gen`.
- Imported activities: FIT files are dated from the activity's own start
  (`sessionStartTs`, `js/garmin.js`) — a session `timestamp` is the END of the activity,
  so the duration is subtracted. That timestamp is persisted as `startTs` and is the
  identity `findImportedRunSession` (`js/state/run-sessions.js`) matches to refuse a
  re-import; it scans archived `arch:<id>:<n>` weeks too, and is scoped to
  `source: 'fit'` so a live-tracked GPS run never blocks a file import.
- Android: custom WebView shell (NOT Capacitor/TWA) in `android/`, minSdk 26, loads
  bundled assets. Native Health Connect bridge in `js/health/health-bridge.js`
  (Android-only). Android GPS uses a foreground location service plus an app-private,
  fsynced active-session journal; JS drains/replays native fixes and acknowledges the
  journal only after app-state persistence. Browser/PWA GPS still uses web geolocation
  and is foreground-only.
- Android state mirror: `js/state/mirror.js` + `StateMirrorBridge`/`StateMirrorSafe`
  keep an app-private, atomically replaced copy of the serialized app state beside
  localStorage. It is written after every local save, read on boot, and restored only
  when localStorage is missing/corrupt/older. A localStorage quota failure surfaces an
  honest toast and leaves the mirror as the durable copy; browser/PWA builds no-op.
- Live run surface: `js/gps-tracker.js` drives TWO surfaces from one state machine
  (cockpit + Quick Activity) via the `UI` scope map — a named ID there must exist in
  `index.html`. All live numbers go through `js/gps/active-run-display.js`: never write
  raw km to the DOM, the athlete's `settings.distanceUnit` decides, and the live figure
  must equal what `stopTracking` puts in the cockpit input. Live signal is graded from
  the LAST ACCEPTED fix (`gpsSignalPresentation`), NOT `summarizeGpsQuality` — that one
  grades a finished run; both share `GPS_ACCURACY_TIERS`. While a session is live the
  cockpit run card is in focus mode (`run-session-active`) and `renderWorkout` must not
  collapse or reparent it (`.run-collapsed` hides the whole body; moving the node
  detaches the live Leaflet map).
- Run states that are NOT the run (`js/gps/run-notices.js`): a toast is only for
  something that happened and is over — permission denial, no-fix, background-tracking
  limits, recovery and partial saves are CONDITIONS and render as persistent notices.
  `startTracking` returns `{ ok, reason }`, never a bare boolean: the Quick Activity
  scope has NO start panel, so a refused start that falls back to `showPanel('start')`
  leaves a blank full-screen view (this was a real bug). `showRunNotice` takes over the
  surface; `showInfoNotice` must NOT call `showPanel` — a recovered run is still live.
  A mid-run `onPositionError` must never tear down the session.
- No iOS project exists. iOS is OUT OF SCOPE for the current launch push.
- Exercise metadata: `instructions`/`difficulty`/`safetyNotes` are AUTHORED per
  exercise via `REVIEWED()` and land a batch at a time (66/157 core entries done, picked by
  real programme usage). `tests/exercise_catalog.test.js` guards the shape — an
  entry with instructions must have a valid difficulty and a safety note, and
  every line must read as a sentence. Safety notes are a claim shown to someone
  loading a barbell: keep batches small enough to review, never bulk-generate.
- Exercise browsing: `MUSCLES` has 19 anatomical keys and is for volume analytics,
  NOT for pickers. Browsing uses `MUSCLE_GROUPS` (six training words, every
  anatomical key in exactly one) and `primaryMuscleGroups`, which claims a group
  only on FULL credit — any-involvement returns 21 glute exercises against the 8
  that train them. The picker's other select filters MOVEMENT (push/pull/legs/
  core/conditioning); it spent a long time mislabelled "muscle group".
- Recommendations: `js/programs/recommendation-fit.js` is the fit model — score from what
  the ATHLETE told the app (`fitnessGoal`/`fitnessLevel`/`equipmentTier`/`equipment`/
  `weightGoal` + real recent training frequency), never from catalogue constants.
  Editorial signal (popularity/rating/featured/official) is a tiebreaker held OUT of the
  personal score and must NEVER surface as a reason — "Staff Pick" describes the
  programme, not the fit. No true personal reason ⇒ `eligible:false` ⇒ the row does not
  render; an empty row is honest, an invented one is not.
- Programs: catalog in `js/programs/catalog/*.js`; a program = a single-week `days{}`
  template + `weeklyVolModifiers` (per-week sets/reps/`intensityLabel`, incl. deloads)
  — the cockpit resolves each lift's target via `getWeekModifier`→`liftTarget`
  (`js/schema.js`/`engine.js`), so a custom program's lifts share the week modifier.
  Program detail (`js/programs/detail.js`) leads with **Who it's for**
  (`detail-fit.js` → the SAME `programFit` the recommendations use, so the two
  surfaces cannot disagree; it additionally shows the CAUTIONS, which the
  recommendations row must never show), then commitment, then equipment FIT, then
  the week-stepped preview, progression and the Overview | Structure | **Plan**
  tabs (week-by-week timeline, `timeline.js`). Level and equipment tier are stated
  ONCE each — re-adding a decorative difficulty/tier tag row is the duplication 4B
  removed. The Structure sample + day-preview modal resolve each lift's sets×reps
  via `liftTarget` (the SAME call the cockpit uses), NOT the catalog's decorative
  `workoutPreview.exercises` — keep it that way so detail can't promise a
  per-lift prescription the engine doesn't deliver. Pure helpers: `timeline.js`, `compare.js` (`programStats`/`equipmentFit`),
  `progression.js` (builder's per-week editor PLUS the Simple broad-progression
  shapes — `planProgressionShape` is pure and writes nothing; only
  `applyProgressionShape` writes, and it returns a snapshot for Undo. Shapes emit
  the SAME `weeklyVolModifiers` the grid does, so no per-lift prescription data is
  introduced and the 4C ADR gate stays shut), `onboarding/starter-programs.js`.
  Every plan-changing builder edit snapshots via `captureProgramDraft` and is
  undoable from one strip (`markUndoable` → `b-undo`); the snapshot is the PLAN
  only (`days` + `weeklyVolModifiers`), never `state.weeks`, so an undo can never
  rewrite logged training. Prefer that over adding confirmation dialogs.
  "Customize" forks ANY program via `duplicateCustomProgram` (a copy — never edits
  shared catalog data). `day.lifts` are bare strings across 150+ sites — do NOT
  migrate to objects casually.
- Per-lift progressions: a week modifier is per-WEEK and shared by every day, so a
  program running two main-lift progressions at once needs a resolver. Two exist,
  each gated on the program's own `progressionModel` field and consulted by
  `liftTarget` (`js/engine.js`): `jt-shed`/`jt-shed-simplified`
  (`js/programs/jt-shed-model.js`) and `shed-pplul` (`js/programs/shed-pplul-model.js`,
  stable performance-based ranges resolved per lift, with review checkpoints but no
  automatic deload). They are deliberately NOT shared — their progression rules
  differ. Both are read-time only: nothing per-set is
  persisted, so there is no migration/sync/export surface, and the Phase 4C ADR gate on
  normalised per-lift prescription DATA is untouched. Resolvers return null for
  unauthored lifts so an exercise added mid-session falls through. A CUSTOMIZATION IS
  A FROZEN DEEP COPY, so a fork made before its source gained `progressionModel` has
  no hook and every lift collapses to the shared week modifier (a real Shed PPLUL fork
  showed 4x8 for the whole programme, deadlift included, and no app update could reach
  it). `liftTarget` therefore inherits the model from `sourceProgramId` at READ time
  (`withInheritedProgressionModel`, `js/engine.js`) — nothing stored is rewritten, and
  an unauthored swapped-in lift still falls through.
- Workout modules: `js/workout.js` (1,837 lines) is imported ONLY by `js/app.js`,
  which uses 21 of its 44 exports. Exercise selection lives in
  `js/workout/exercise-picker.js`, the confirm-reset flow in
  `js/workout/clear-log.js`, and cockpit run rendering/manual persistence in
  `js/workout/run-logging.js`; row addition/removal, removal Undo, set type/RIR,
  and bodyweight/band load choices live in `js/workout/set-mutations.js`; the
  per-set sheet lives in `js/workout/set-sheet.js` and owns set type / value
  shape / load / weight meaning / rest / effort / note / remove, opened by
  tapping the set number or the PREVIOUS column. The row itself is five columns
  — SET | PREVIOUS | WEIGHT | VALUE | ✓ — the tick is the ONLY completion action
  (the old wide `Log S1` button overflowed its 28px track and squeezed the
  weight/reps fields), and a completed row reads as one compact line. The value
  column says Time/Distance on a card whose sets are all holds or carries.
  Comparison against last time is `compareWithPrevious`
  (`js/workout/set-entry.js`), shared by the template and the in-place refresh
  after a tick so the glyph appears without a re-render. The
  weight-unit label lives in `js/workout/units.js`, and run distance/pace
  conversion lives in `js/workout/run-units.js` (pure; distance is
  STORED in km and the display value is rounded, so a UI round trip is lossy by
  design — never round-trip a stored value to "normalise" it).
  The four event ROUTERS stay in workout.js and must move LAST: they are 81 lines
  dispatching to 27 local functions, so extracting them first would need 27
  back-imports (a cycle). Move handlers out while the router stays and imports
  them. Context wrappers forward `...args` — a one-parameter `switchTab` wrapper
  silently dropped `{ skipWorkoutCommit: true }` and made discard commit the
  workout it had just discarded.
  `tests/workout_split_guard.test.js` enforces the shape: NO `js/workout/*` module
  may import `../workout.js`, `context.js` stays dependency-free, and workout.js
  must keep re-exporting every name app.js imports. A module needing to redraw
  calls `rerenderWorkout()` (registered by workout.js via `setWorkoutRenderer`)
  rather than importing `renderWorkout` back. Its six app accessors live in `js/workout/context.js`
  (`setWorkoutContext` + `getState`/`getSelectedDay`/`getDays`/`saveState`/
  `switchTab`/`scheduleSave`), so a module split out of workout.js reads them
  without importing workout.js back and creating a cycle. They are FUNCTIONS, not
  live bindings — so `if (!getState)` is always true and a readiness check must
  use `workoutContextReady()`.
- Workout cockpit: in-session **exercise swap** (`js/workout/substitutions.js` +
  pure `applyExerciseSwap` in `workout-order.js`; re-keys the sets array to preserve
  target+logged data), per-side **plate math** (`js/workout/plates.js`), swipe
  between days (`neighborDay`). `+ Drop` (`appendDropSetRow`) appends a separate
  `type:'D'` row seeded from the last FILLED non-warm-up set at 80% load rounded
  to 2.5 kg / 5 lb, copying its shape/reps; it is hidden until a working set is
  logged and never discounts a bodyweight/band load. Coach: deterministic
  **ask-the-coach** Q&A (`js/brain/coach-qa.js`, chips on the briefing) + PR share
  card (`js/brain/pr-share.js`). Share workout (`js/share/workout-share.js`)
  draws the WHOLE session from the same `buildSessionRecap` model the recap and
  History detail render — never from re-derived numbers — and is reachable from
  both surfaces. `shareImageCanvas` (pr-share.js) is the single
  navigator.share → download path for every card; run distance/pace formatting
  lives in `js/workout/run-units.js` so the recap and card cannot drift.
- Circuits / supersets: `js/workout/superset.js` is the pure group model — any
  pair or circuit of three or more same-day lifts sharing a non-empty
  `liftMeta[day][lift].groupId`, rendered in `liftOrder`, with A…Z then AA…ZZ
  ids and stable A–F colours (the palette continues beyond F). Adding a lift to
  an existing circuit JOINS its letter instead of minting a new one; a
  cross-group merge is refused. The in-place panel adds, removes one member (a
  lone remaining tag is cleared) and unlinks all, with 44px controls. One
  **group rest** is resolved through `js/workout/rest-duration.js` (longest
  member wins; per-set rest still wins outright) and starts only after the last
  member catches up. Warm-up ticks keep the warm-up tier; drop rows never start
  a rest or advance a round. `prescriptions[day][lift].groupId` carries a
  circuit through routines and copies; a malformed imported routine tag is
  dropped rather than the routine, and copies carry only `{groupId}`. A lone tag
  is pruned on read, on last-set removal and in copied/restored sessions (Undo
  snapshots liftMeta). Values live in existing `liftMeta`/`prescriptions`
  fields — no schema migration.
- Bands do TWO opposite jobs (`js/workout/load-mode.js`): on a bodyweight movement a
  band ASSISTS (`w = bodyweight − band`, `loadMode: 'assisted'`); on anything else the
  band IS the load (`w = band`, `loadMode: 'banded'`). `bandRole()` decides from the
  exercise name — never assume assistance. Always go through `applyBandLoad` and pass
  the lift name; calling `applyBandAssistance` directly on an accessory is the bug that
  logged a 20kg-band pushdown as 60kg with triple the volume. Band kg stay canonical
  L=10/M=20/H=30 (v5 migration enforces it). Sets logged before the fix keep their
  stored `w` — history is re-READ by role, never rewritten. Body weight has NO
  default: `_currentBodyweight` returns null when unknown and the athlete is asked
  (`numberPromptModal`) rather than logging a fabricated 75kg as their load.
- Logger progression and history are deliberately separate: global dated exercise
  history (`exerciseLoggerHistory`) powers the read-only **Last performed** panel
  and analytics, while `computeDiagnosticForLift` only derives a next-load
  suggestion from the same activation + workout day. A new activation starts with
  blank editable load/rep values; history enters those fields only through the
  explicit **Use previous values** action. Settings → Training → Logging owns the
  rest tiers/presets, progression step and `settings.previousValuesScope`; the
  scope limits the Last performed panel and Use previous values, never PR
  detection. Tick, quick-log and log-all share the PR + per-set comparison
  (`↑`/`=`/`↓` vs the same set index last session). `set.failure` is an
  independent flag — `type:'F'` stays AMRAP — and the draft/prescription
  predicates recognise it. Per-set effort is RIR 0–4 in half steps
  (`js/workout/effort.js`; `setPerSetRir` stores `rir` + `rpe = 10 - rir`), the
  previous-workout panel and sRPE read through `effortForSet`, and the load-memo
  signature includes `failure` so toggling it refreshes ATL/CTL.
  `set.basis` (`each`, `per-side`, absent/`total`)
  affects VOLUME only: `each` doubles a dumbbell pair, `per-side` and legacy
  sets count once, and e1RM stays per-implement. Blank dumbbell rows default to
  Each (Per side when unilateral); legacy completed sets read as Both and are
  never rewritten. `js/workout/load-basis.js` owns the helpers. Per-set
  `restSec` (0 = no timer) outranks the plan/override/tier resolution; per-set
  `note` (140 chars) is shown in the logger and recap. Both are additive and
  recognised by the draft predicates. The per-set plate line
  (`js/workout/plate-hint-dom.js`) uses the entered/ghost weight and active
  profile and shows the load change since the previous row; it respects
  `settings.showPlateHints`. Rest settings also own `restPeriods.warmup`
  (0 disables the warm-up timer), `restAlertSound` and `restAlertVolume`;
  `js/timers.js` receives them through `setRestTiers`/`setRestAlertConfig`.
  The rest countdown is mirrored to `localStorage` (`hybrid_restTimer_v1`) as an
  absolute end time, so a reload or a killed/backgrounded WebView resumes the
  same rest; a paused rest keeps its held remaining, and expired or stale
  (>2 h) snapshots are discarded instead of resurrecting at 0:00.
  A set has one of three SHAPES (`js/set-utils.js`): legacy reps, `mode:'time'`
  (`sec`), or `mode:'distance'` (`dist`, metres). `setVolume` returns 0 for
  holds/carries — tonnage is weight × reps and inventing reps would inflate
  every total — but `isValidWorkingSet` counts them, so they appear in session
  frequency, muscle load and History. `js/workout/set-shape.js` resolves a
  blank row from catalogue metadata (carry → distance, plank/hold → time) and
  the per-exercise override; a stored set's own shape always wins. The row
  swaps its second input for `.input-time-node` / `.input-dist-node`, and its
  `⋯` sheet cycles Reps → Time → Distance. The per-exercise settings sheet
  (`js/workout/exercise-options.js`) owns **Set shape** (Reps/Time/Distance),
  **Load default** (Weighted/Bodyweight/Assisted/Band), **Weight meaning**
  (Each/Both/Per side, dumbbells only), rest (reusing name-keyed
  `settings.restOverrides`, 0 = no timer), warm-up mode and a durable note in
  additive `settings.exercisePrefs`, keyed by canonical exercise id so aliases
  share one preference (`js/workout/exercise-config.js`). A default shapes a
  BLANK row only; completion stamps the load mode/basis actually used, and
  logged sets are never rewritten. The session recap closes each lift with
  Last time and a Next-time progression suggestion (omitted when no rep target
  exists).
- Session lifecycle: additive `weeks[key].sessionStatus[day]` (`in_progress|finished`)
  and `sessionSummary[day]` sidecars are owned by `js/workout/session-status.js`.
  Deliberate Finish marks the workout finished even below 100% plan adherence; deletion/
  discard clears both fields and blank or warm-up-only work cannot be finished as training.

## Roadmap Working Agreements
Active goal: improve the product experience end to end before focusing on
release. See `docs/IMPROVEMENT_ROADMAP.md` for the current Home → Train →
Progress → Plans direction, interaction principles, prioritised phases,
implementation status, and session log. Android public-beta work is parked, not
cancelled. iOS/Capacitor and any billing/paywall remain explicitly deferred.

Product/UX source of truth: `docs/IMPROVEMENT_ROADMAP.md`. It owns the settled product
rules, rejected scope, execution status, quality gates, parked work, and session log.
Read it before product-facing work; do not create parallel progress, audit, or
checklist trackers.

### Session protocol
- START: read this file, `docs/IMPROVEMENT_ROADMAP.md`, and `git log --oneline -15`. State in one line
  where we are and what this session will do.
- WORK: smallest shippable slice. Run test + typecheck + smoke after each change; all
  must pass before commit.
- END: update implementation status and add a Session Log entry in
  `docs/IMPROVEMENT_ROADMAP.md` (date · what
  changed · what's next), commit. Never end on a broken tree or with unrecorded work.

### Operating rules
- Security and data-safety first. Never ship a change that could leak or lose user
  data. When touching sync, add backups/guards *before* changing behavior.
- Don't assume — read the actual code before changing it. If a fact here is wrong, fix
  this file.
- Verify by running things. Never report as working what you haven't run; if tests
  fail, say so with output.
- Tests are part of every feature — especially sync, security, and the currently
  under-tested large files (`js/workout.js`, `js/app.js`).
- Git: short-lived feature branch per phase (e.g. `phase1-security`). Commit in logical
  units. Do NOT push to the default branch or open PRs without asking. No force-push of
  shared branches.
- `[You]` tasks are the human's (device testing, accounts for external services,
  screenshots/art, legal review, store submission). For each, produce the exact
  artifact needed (checklist, copy, config) and STOP — never simulate it as done.
- Ask before anything irreversible or outward-facing (pushing, deleting data, external
  calls). One clear question at a time.
- No fabricated secrets, keys, or model identifiers in committed files.
