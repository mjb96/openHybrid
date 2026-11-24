# openHybrid Product Improvement Roadmap

> Product and engineering source of truth.
>
> **Roadmap v2 adopted 24 November 2026.** The active programme is §13:
> **H0 verify → H1 Settings and Profile → H2 Home → H3 workout logging →
> H4 Progress and strength analytics.** Strength first; running is deferred.
> Sections before §13 are the delivered capability/experience programme and
> remain the evidence base.
>
> Restructured on **22 November 2026** into a **gated capability backlog**: the
> experience programme keeps its rules and its bar, and capability work is
> sequenced underneath them. Each phase must pass the experience gates before
> the next starts.
>
> History lives in `docs/ROADMAP_ARCHIVE.md`. It is evidence, not a tracker.

## 1. Product objective

Make openHybrid feel like the most natural way to combine strength and running:

- obvious without being simplistic;
- fast during training;
- calm and useful outside training;
- trustworthy when interpreting progress;
- adaptable without exposing unnecessary complexity.

The active goal is still **not Play Store release**. The next milestone is an app
whose setup and settings feel designed, whose Home answers "what should I do
today?" without a scroll, whose logging is fast in the gym, and whose Progress
explains whether strength training is working. Strength first; running is
deferred and must not regress. Release work remains parked while the product is
improved.

openHybrid should answer three questions exceptionally well:

1. **What should I do today?**
2. **How do I log it with minimal friction?**
3. **Is my training working, and what should I do next?**

Everything on a primary screen must help answer one of those questions.

### How the two goals relate

Coherence and capability are not rivals; they are ordered. Coherence is the
**gate** and capability is the **work**. A phase is not "done" because the
feature exists — it is done when the feature is as easy to use as the surfaces
that already exist. This ordering is what stops a parity push from turning the
app back into a list of features.

## 2. Current state — 22 November 2026

### What is strong

- The core training model is unusually capable: planned and one-off strength
  sessions, running, program activations, real calendar attribution, exercise
  history, bodyweight loading, swaps, supersets, timers, GPS, Health Connect,
  backups, and sync protection.
- The app has meaningful analytics rather than decorative charts: strength,
  running, recovery, load, readiness, exact workout evidence, and honest
  partial-week comparisons.
- The visual identity is established and distinctive.
- Data safety and automated verification are strong foundations.
- The program and exercise catalogues are deep enough for product work to focus
  on discovery and clarity rather than more content.

### Shipped shape

The Home → Train → History → Progress → Plans surface overhaul and the Logger
upgrade have landed:

- **Home** is one week surface: an optional seven-day rail plus the pinned Today
  decision, a collapsible fresh-day row, inline completed-day recaps with the
  muscle heat map, bodyweight, one coach insight and quick actions.
- **Train** is a session preview (week rail, today's prescriptions, one
  Start/Resume), not a second Home.
- **History** is a full destination: Calendar | List, search, provenance, a
  source filter, a calendar day sheet, exact detail, lossless editing
  (add/remove exercise and set), delete/undo, Repeat workout and Share workout.
- **Progress** leads with the Pulse band (the selected week, streak and run/walk
  split), then the eight bands — Balance, Muscles, Main exercises, Endurance,
  Body, Fasting, Reports — with body measurements (14 tape sites, entered body
  fat and per-site trends) and Measures (dated weight/tape/body-fat/photo
  entries) behind Body. Calendar-week attribution is used throughout; the
  Training Report covers 30 days or 12 months; the exercise drilldown has a real
  shape-aware trend, all-time bests and PR baseline.
- **Logger** supports reps, timed holds and loaded carries; failure, per-set
  rest/note, plate lines, load basis, effort, per-exercise shape/load/basis
  defaults, warm-up rest, a rest timer that survives reload/backgrounding, a
  `+ Drop` shortcut that seeds a lighter typed row, and a Last time / Next time
  recap.
- **Plans** keeps the active plan first — its Start/Resume is the only primary,
  with quiet create/import/manage utilities, one "Search plans" field shared
  by Discover and My Plans, and a three-up fit-tagged recommendation row — it
  recommends from athlete fit, and has an Overview | Structure | Plan detail
  with week-stepped targets.

### Baseline before the capability programme (22 Nov)

The pre-programme baseline was recorded on 22 November. Several items in it
have since shipped — plate maths, per-set RPE, routine categories and filters,
the year recap, and the body-composition record — so they are history, not
current gaps.

### Current gaps (revised 24 November)

The gaps that now drive the H phases:

- **Settings and Profile.** Settings works, but it is a list of controls rather
  than a designed information architecture: no profile card, no declarative
  registry, no search, and athlete-fit inputs are not owned in one place.
- **Home.** The Today card does not preview the planned lifts with target and
  last-time numbers, and a planned day cannot be moved without editing the plan.
- **Progress.** A trailing "More detail" footer holds destinations cut off from
  the question they answer, and the week/month/year recaps are reachable under
  several names. Band details do not yet own their extra charts.
- **Strength analytics.** No stall detection, volume-vs-target per muscle,
  long-range e1RM trend, rep-range/intensity mix, PR timeline, muscle frequency
  or relative strength; "is this working?" is easier for a week than a year.
- **Workout logging.** No reps-per-side model, no log-a-past-session flow, no
  closed-app rest alert, no favourite exercises, and progression targets do not
  explain themselves.
- **Foundation.** Large modules, CSS specificity and incomplete technique
  metadata still make changes riskier than they should be.
- **Native surfaces.** L14 (live activity) and S10 (widgets) are parked in H8.
- **Running.** Deferred while the owner is not running; existing behaviour must
  not regress.

### Product diagnosis

openHybrid does not need a broad redesign or a new visual identity. It needs
**progressive disclosure, clearer hierarchy, fewer competing actions, and
stronger continuity between planning, training, and review** — and then it needs
to finish the non-social jobs it currently stops short of.

## 3. Product direction

These are the working decisions for the improvement programme. They can change
when usability evidence contradicts them.

### Four primary destinations

1. **Home** — today, immediate coaching, and this-week orientation.
2. **Train** — planned session, quick start, active session, and recent
   activities.
3. **Progress** — strength, running, consistency, and recovery.
4. **Plans** — current plan, recommendations, programme discovery, and builder.

History is a first-class record destination reached from Home, Train and
Progress. Profile and Settings stay behind the avatar.

### Home is a decision surface

One dominant Today card, planned/rest status, a single Start/Resume/Review
action, one short coaching sentence, and a compact weekly strip. Hybrid Score,
readiness, streaks and charts remain available, but below the decision or inside
Progress. Home never repeats the same metric in two forms. One optional hybrid
section sits below the week surface (balance, strength this week, endurance this
week) because nothing else on Home answers "is my training balanced?"; it adds no
metric Home already shows and is hidden entirely when Hybrid training is off.

**Named exception — aerobic-fitness estimate.** The Home endurance card shows an
`(est.)` aerobic-fitness figure derived from `effectiveVdot`. It is a labelled
status, not a new metric family: its action is to open the Running detail, and it
disappears when Running is off. It stays because it answers "how is endurance
trending?" without a second analytics surface; it never claims to be measured.

### Train feels physical and immediate

Planned and quick-start modes live in one place. During a workout the current
exercise and next action dominate; advanced controls appear when relevant.
Inputs favour one-handed use, large targets and immediate feedback. Finishing
creates a short review, not another form. Running has an equally clear active
session mode.

### Progress explains, not merely reports

Every analytics surface answers, in order:

1. What changed?
2. Is the change meaningful and comparable?
3. What contributed to it?
4. What, if anything, should I do?
5. How was it calculated?

The landing page prioritises consistency, strength, running, and training
balance. Advanced metrics stay behind drilldowns. Do not add a metric until the
existing ones have an audience, a hierarchy, and an action.

### Plans recommend before asking users to browse

Lead with the active plan and its next week. Offer a small set of explained
recommendations from goal, experience, schedule and equipment. Keep Browse all
secondary. Explain fit, commitment, progression and equipment before catalogue
detail. Offer Simple and Advanced editing rather than every field at once.

### Coaching is brief, specific and inspectable

One recommendation at a time, naming its evidence, stating confidence when data
is sparse, preferring "because" over an unexplained score, offering one relevant
action, and never contradicting the planned session, completion status or a
recovery warning.

## 4. Interaction principles

Every new or revised surface must follow these rules:

1. **One obvious primary action.** Secondary actions are visually quieter.
2. **Progressive disclosure.** Show the common path first; advanced options
   remain reachable without dominating it.
3. **Direct manipulation.** Tapping the thing should edit or open the thing.
4. **Immediate feedback.** Logging, reordering, filtering, saving, and deleting
   visibly respond without requiring a refresh.
5. **Safe reversibility.** Prefer Undo and recoverable edits over repeated
   confirmation dialogs.
6. **Spatial continuity.** Closing a sheet returns focus and scroll to the
   initiating context.
7. **No gesture-only behaviour.** Swipes may accelerate an action but never be
   the only way to perform it.
8. **Natural language.** Use training language rather than storage, schema, or
   analytics jargon.
9. **Honest states.** Loading, empty, unavailable, partial, failed, and offline
   states are visually and verbally distinct.
10. **One-handed mobile use.** Frequent controls stay reachable, at least
    44px, and clear of keyboards and safe areas.
11. **Respect user attention.** Avoid decorative alerts, duplicate summaries,
    and low-value badges.
12. **Preserve identity.** Keep the current technical visual character,
    restrained orange accent, and dark/light themes.

## 5. How this roadmap works

- **One tracker.** This file. Do not create a parallel progress, audit or
  checklist document. `docs/ROADMAP_ARCHIVE.md` is historical and closed.
- **Statuses.** `DONE`, `DONE (unevidenced)`, `ACTIVE`, `NEXT`, `LATER`,
  `PARKED`, `CONTINUOUS`, `UNVERIFIED`. `UNVERIFIED` is a temporary H0 status:
  the row comes from the v2 plan and has not yet been checked against code.
  `CONTINUOUS` means the work is a standing quality bar that runs alongside an
  active phase, not a gate that must finish first. `◑ reframed` in §7 means the
  capability shipped deliberately narrower than the original row; the Decision
  column records what replaced it.
- **Phase families.** The historical capability programme uses **CP0–CP7**;
  the delivered experience programme uses **EP0–EP6**. The active programme is
  **H0–H8** (§13): H0 verifies, H1–H4 are the owner's sequence, H5–H8 are
  queued. References to "Phase N" in pre-v2 history are the old names.
- **Gating.** A phase starts only when the previous phase's acceptance section
  is green. A phase that is functionally complete but UX-below-bar stays open
  with its exact gaps named (see §10).
- **Evidence.** Every DONE phase carries a gate-evidence line: the checks that
  ran, the tap-count result, viewport/theme coverage and the commit. A phase
  with no recorded evidence is marked `DONE (unevidenced)`, never silently
  promoted. The H phases record the Part H flows before and after.
- **Scope.** The capability backlog covers the **36 non-social features** in §7,
  adapted to openHybrid. Social and Coach scope is deferred in §8.

## 6. Capability roadmap

Sequenced so analytics is built on trustworthy logging, organisation is built on
stable data contracts, and platform work is built on stable surfaces.

### CP0 — Baseline and truth

**Status: DONE (2026-11-24).** **Goal:** no new UI; make the matrix and the
metric definitions true.

**Gate evidence (24 Nov 2026):** every §7 row was checked against its owner and
tests; the matrix is the record. The full node suite and 48/48 browser checks
are green at this revision. Tap-count and viewport evidence was not recorded for
this phase — Part H supplies the baseline going forward.

Work:

1. Verify every row of §7 against code, a test, or a manual check. Correct this
   document where it is wrong — that is a valid CP0 deliverable.
2. Freeze the shared vocabulary in one place (§9): session, training day,
   working set, volume, active day, streak week, PR, body-composition reading,
   archived-week inclusion.
3. Name the owning module for every metric. Two owners is a bug.
4. Add the smallest regression test for any metric that has none.
5. Record the gap map (status, owner, missing behaviour, risk) in the PR body.

**Acceptance:** every row has a verified status, an owner and a named gap; every
metric definition has exactly one owning module; no product code changes.

**Verified 2026-11-24:** every row was checked against its owning module and its
tests. Owners were corrected where the shipped surface moved (P1 to the band
composer, PR to `strength/records.js`, active day to `analytics/logged-days.js`,
streak week to `analytics/pulse.js`). `✅` rows have no known gap; every `◐`/`○`
row names its gap in the matrix's Gap column.

### CP1 — Logging fidelity

**Status: DONE (2026-11-24).** **Goal:** a logged set carries everything later
analytics needs, so no later surface has to re-derive or invent it.

**Gate evidence (24 Nov 2026):** note/RIR/session-sidecar tests, cockpit and
set-sheet browser checks, and the full 48-check browser suite. Tap counts were
not recorded; Part H covers the logging flows from H0.

Features: L3, L4, L7, L8, L9, L10, L11, L12, L13 (see §7).

1. **Notes with real scopes.** Routine note, session note, and a pinned
   exercise note, each shown where it applies, with a clickable link rendered as
   a link. Existing per-set notes and `liftMeta` notes migrate losslessly; no
   note is duplicated into two scopes.
2. **RPE constrained.** 6–10 in 0.5 steps, per set and per session, entered
   live, reviewed later, never invented for a set the athlete did not rate.
   Out-of-range legacy values stay readable and are never rewritten.
3. **Plate calculator (landed).** A sheet from the set row: target total, bar
   weight, available plate sizes and pair counts, per-side output, and an
   explicit shortfall when the target is unreachable. It reads the active
   equipment profile and never invents a plate. The existing inline plate line
   stays.
4. **Warm-up editor.** Editable percentage/reps rows with insert and delete,
   plate and dumbbell rounding through the existing ramp, and per-lift opt-in.
   `liftMeta[...].autoRamp` still prevents resurrection after a dismissal.
5. **Rest timer polish (landed).** Per-exercise default, ±15 s adjustments,
   drop-set suppression, inline timer, alert sound/volume, and the existing
   reload persistence. Drop suppression is GLOBAL: a `type:'D'` row never
   starts a rest and never advances a circuit round; a warm-up tick keeps its
   own tier. Circuit rest uses ONE duration resolved across the group’s
   members (longest wins) instead of the ticked member’s alone.
6. **Circuit polish (landed).** Same-day lifts share a `groupId`; the group can
   be a pair or a circuit of three or more. Rest starts after the last member
   catches up, never after each member, using one governing duration resolved
   across the group (the longest member wins). A–F keep their colours and later ids
   continue through a wider palette; ids run A…Z then AA/AB. The panel adds,
   removes and unlinks members explicitly, and routines/copied sessions keep
   the membership.
7. **Previous values scope.** Verify the `last anywhere` / `last in this
   routine` toggle and tap-to-fill, and make the scope visible where it matters.
   Scope limits the panel and the fill action; it never limits PR detection.
8. **Live PR.** Detection for estimated 1RM, weight, reps and duration; show
   one non-blocking banner; persist the evidence on the set. Landed for e1RM,
   hold (duration), carry and reps; the settings switch `livePR` silences the
   banner without changing the badge or stored evidence. **Volume is
   deliberately not a separate badge:** set volume is weight × reps and is
   already represented by the load/rep records, while a volume trophy would
   reward adding sets rather than better performance.
9. **Finish sheet.** Name, duration, date/time, notes, summary. No visibility or
   social field exists to add.

**Data rules:** additive only. A set logged before this phase must read
identically after it. Never write derived effort. PR baselines use every earlier
session; a visible range filters the chart and the evidence list, never the
baseline.

**Reuse:** `js/workout/plates.js`, `plate-hint-dom.js`, `warmup-ramp.js`,
`set-shape.js`, `exercise-config.js`, `set-mutations.js`, `js/timers.js`,
`js/session-recap.js`.

**Acceptance:** a set logged in CP1 can answer every CP2 and CP5
question without a new field; an export taken before the phase re-imports
unchanged; all gates green.

### User-directed slice — Hybrid dashboard and training focus (2026-11-23)

**Status: DONE.** **Goal:** answer "is my training balanced?" on Home, and let an
athlete who trains strength only switch the hybrid surfaces off. Requested by
the owner; it does not reorder the gated sequence above.

**Gate evidence (24 Nov 2026):** hybrid-balance/dashboard tests, module
visibility tests, and the Home browser coverage in the 48-check suite.

Work:

1. **Calendar-week load split.** `dailyLoadBreakdownTimeline` is the one dated
   sRPE reader (`metrics/training-load.js`); `analytics/hybrid-balance.js`
   buckets it into Monday-based weeks and classifies the strength/endurance
   share, with a pace-matched trend and an honest `unmeasured-strength` state.
2. **Home hybrid section.** Training balance, Strength this week and Endurance
   this week below the week surface, each hideable and each linking to the
   owning Progress surface. Endurance carries an aerobic-fitness estimate that
   is always labelled as an estimate — there is no measured VO₂ max source.
3. **Hybrid training preference.** `settings.hybridTraining` (v14→v15) hides
   hybrid-only cards and never rewrites the four feature modules.
4. **Repairs found while wiring it.** Quick-start Run/Walk/Fast now carry
   `data-module` hooks; the duplicated `#dashboardQuickActions` block is gone;
   the Home insight uses `moduleEnabled`; Home draws the shared bodyweight chart.

**Data rules:** calendar weeks only; archived activations count; same-day runs
merge; an in-progress week is compared with the SAME weekdays; missing session
durations never produce a fabricated ratio.

**Reuse:** `metrics/training-load.js`, `analytics/weekly-aggregate.js`,
`analytics/strength-calendar.js`, `state/run-sessions.js`, `analytics/charts.js`.

**Acceptance:** `tests/hybrid_balance.test.js`, `tests/home_hybrid.test.js`,
`tests/modules.test.js`, `tests/state_migrations.test.js` and
`scripts/hybrid-dashboard-browser-check.mjs` green; Hybrid off keeps the
strength card, Today and the week surface.

### CP2 — Progress analytics

**Status: DONE (2026-11-24).** **Goal:** answer consistency, strength and volume
questions with calendar-correct numbers, at week, month, year and all-time range.

**Gate evidence (24 Nov 2026):** analytics calendar guard, pulse/muscles/
exercises/running/body/fasting tests, and `progress-hub-browser-check` at
320/390/412 px light/dark. Tap counts not recorded.

All P2–P12 rows are now resolved. Three deliberate decisions close the last
gaps: the gym-performance question is answered across Pulse/Muscles/Main
exercises rather than a duplicate screen; muscle distribution stays in credited
sets because sessions/duration double-count a session across muscles; and the
training calendar stays at 12 weeks because 52 columns cannot fit a phone (Year
in Review owns the year).

Features: P2, P3 (model), P4, P5, P6, P9 (close gaps), P10.

1. **7-day activity strip + muscle diagram** on the performance view, reusing
   the Home heat map and `session-muscles.js`.
2. **Sets per muscle group** with weekly, monthly and yearly buckets, a muscle
   selection, and 30-day / 3-month / year / all-time ranges.
3. **Muscle distribution.** Landed as credited sets and share, with the
   per-muscle focus. Sessions/duration are deliberately not a currency: a
   compound set belongs to several muscles, so a per-muscle session or duration
   simply double-counts and is not an honest share. Period comparison is the
   equal-length previous window.
4. **Main exercises** — the top five in range, each opening the exercise detail.
5. **Consecutive-week streak** — current and best, defined as weeks with at
   least one session. This is deliberately **not** the existing day streak with
   freezes; both exist but are never presented as the same number. The calendar
   stays at 12 weeks because 52 columns do not fit a phone; Year in Review owns
   the year view.
6. **Exercise detail completeness** — set records by rep target, bodyweight
   reps, hold duration bests, carry distance bests, and cardio bests.
7. **Monthly report model** — the current calendar month (elapsed-matched prior
   month), sessions, volume, distance, active days, average score, consistency
   and projection, with text share. The toolbar keeps a trailing 12-month view.

**Data rules:** Monday-based calendar weeks only, never `state.currentWeek`.
Iterate numeric **and** `arch:<id>:<n>` weeks and attribute by stamped date.
Sessions are not training days: use `loggedSessionsByDate` for adherence.
Multiple slots may share a date — use the existing dedup/merge path
(`indexSlotsByDate`, `collectCalendarWeek`) and merge every field rather than
assigning it. Holds and carries have volume 0 but count as working sets. Resolve
aliases through the catalogue at read time; unknown custom names stay exact. An
empty range is a true zero with an empty state, never a fabricated comparison.

**Reuse:** `js/analytics/weekly-aggregate.js`, `training-calendar.js`,
`strength-calendar.js`, `exercise-detail.js`, `muscle-load.js`, `volume-guide.js`,
`period-comparison.js`, `js/home/body-heatmap.js`, `js/brain/monthly-report.js`.

**Acceptance:** archived weeks count; no analytics module reads
`state.currentWeek`; a strength + run day reports two sessions and merged
distance; a 5 km + 10 km day reports 15 km; empty weeks are honest.

### CP3 — Body composition

**Status: DONE.** **Goal:** close the body-composition gaps without risking
localStorage. All three items shipped; the tape/fat read path now has a
single-site explorer in Measures.

**Gate evidence (24 Nov 2026):** bodyweight/measurements/photos library and
import tests, plus bodyweight, measures and photo browser checks driving the
real file chooser and confirm at 390/320 px.

Features: P7, P8.

1. **Body fat and the full site set.** Landed: body fat percentage and 14
   circumference sites (neck, shoulders, chest, waist, hips, glutes, bilateral
   arm, forearm, thigh, calf). Centimetres stay canonical, one record per date,
   every site optional, and an existing date is never overwritten. A unit toggle
   changes the reading only; an edit preserves untouched stored centimetres.
2. **Bodyweight from a set.** Landed: a bodyweight-dependent load mode asks for
   the athlete's weight and writes today's weigh-in through the existing log,
   never silently guessing.
3. **Progress photos.** Landed: blobs in IndexedDB; `appState` holds metadata
   only. One photo per date, downscaled before storage, compare, edit/replace,
   delete with confirmation, and a hand-written zip export/import — the only
   backup path for bytes on Android (`allowBackup="false"`). A quota failure is
   visible; deleting a record deletes its blob.

**Data rules:** no base64 in `appState` or `localStorage`. A stored-schema change
needs a migration, a backup path and an `AGENTS.md` note. Export documents that
photos are device-local and carries metadata only.

**Reuse:** `js/metrics/bodyweight.js`, `js/metrics/measurements.js`,
`js/metrics/measures.js`, `js/analytics/measurement-explorer.js`,
`js/bodyweight-sheet.js`, `js/measurements-sheet.js`,
`js/portability/import-measurements-csv.js`, `js/portability/zip.js`.

**Acceptance:** deleting a record deletes its blob; a restore without photos
leaves readable metadata rather than broken images; the export is honest about
what it does not carry; an untouched site never drifts by 0.1 cm on a unit
round-trip.

### CP4 — Organisation

**Status: DONE (2026-11-24).** **Goal:** routines become a first-class library,
and a good session becomes reusable in one action.

**Gate evidence (24 Nov 2026):** routine store/model, program editor/copy/
import tests, and plans/program-editor/copy browser checks. Undo and snapshot
behaviour are covered by tests.

Features: P11, S5, S6.

Implemented in the routines slice: save a finished History session as a routine
(`state.routines`, schema v14), list it in Plans → My Plans and Start it as a
one-off session, and organise routines into ordered folders
(`state.libraryFolders`) with Undo. The routine library now has an optional
single-category vocabulary, a category sheet in the `•••` menu, a 44px filter
select, and folder sections that respect the filter. Programme browsing remains
in Plans → Discover.

1. **Save as routine** from a History detail, building a routine from the
   session's actual exercises, sets and rest. *Landed: History "Save as routine"
   (root `state.routines`/`state.libraryFolders`, schema v14, Undo) and the
   Plans → My Plans routine list — Start, Rename, Delete with Undo, a badge that
   counts routines, and an honest summary line. Categories and filters landed in
   the routine-library slice.*
2. **Copy, edit and delete** with Undo — verify the existing actions and close
   the gaps rather than adding a second action row.
3. **Routine folders** — create, rename, delete, reorder, assign, undo.
   *Landed: sortOrder-ordered folder sections plus an Unfiled bucket, a `•••`
   folder menu with Move up/down, and a Move-to-folder sheet. Deleting a folder
   files its routines under Unfiled and Undo restores the folder and membership.*
4. **Routine library** — one optional category per routine (at home, travel,
   dumbbells, band, cardio/HIIT, gym, bodyweight, suspension, other), a category
   sheet in the `•••` menu, a 44px filter select, and saving either a whole
   programme or a single routine. *Landed: saving a single routine from History,
   categories, filters and folder-aware filtering.*

**Data rules:** a plan-changing edit snapshots the PLAN only (`days` +
`weeklyVolModifiers`), never `state.weeks`, so an Undo can never rewrite logged
training. A customization is a frozen deep copy; it must not silently inherit a
new progression model at write time.

**Reuse:** `captureProgramDraft`, `markUndoable`, `duplicateCustomProgram`,
`js/programs/library.js`, `js/programs/copy-program.js`,
`js/activities/model.js`.

**Acceptance:** no organisation action can alter a logged set; every destructive
action has Undo; the routine list survives export/import.

### CP5 — Reports and recap

**Status: DONE (2026-11-24).** **Goal:** make the month and the year worth
reviewing.

**Gate evidence (24 Nov 2026):** monthly-report/year-review/share-card tests,
and the progress-hub check asserting real PNG downloads for the report and
review surfaces.

Features: P3 (share), P12.

1. **Monthly report share card** built from the CP2 model, using the one
   share pipeline. Landed: the Training Report's Share action now exports the
   same sessions/volume/distance/score/fitness/adherence figures the screen
   shows, as a PNG card, with the report text as its caption.
2. **Year in Review** — *Landed (P12):* a December/January section at the top of
   Review → Stats with annual totals, best month, the in-year consecutive run,
   per-date annual e1RM PR events and top exercises. It is seasonal by design:
   December recaps the current partial year, January the year just ended, and
   every other month renders nothing. Sessions are counted by identity on their
   stamped date (a strength + run day is two; a copied slot is one); volume is
   labelled in the athlete's stored unit and bodyweight is omitted because
   weigh-ins are stored in the unit the athlete was using then. A trained year
   now also offers **Share year**, built from the SAME annual totals.

**Data rules:** date-strict, using the same calendar series as CP2. No
fabricated comparison when the prior period has no data. No "supporters" or
social block exists to add.

**Reuse:** `js/brain/monthly-report.js`, `js/analytics/views/view-monthly-report.js`,
`js/analytics/share-card.js` (`shareSummaryCard`, `drawProgressCard`),
`js/brain/pr-share.js` (`shareImageCanvas`), `js/portability/export-service.js`.

**Acceptance:** every figure traces to a CP2 model value; the card cannot
claim a number the screen does not show; a first-year user sees an honest
partial year; the card downloads as a real PNG when Web Share is unavailable.

### CP6 — Platform and intelligence

**Status: DONE for the web/JS surfaces; native work moved to H8.** **Goal:**
native-feeling surfaces and assistance without a backend. S2 (adaptive trainer),
S3/S4 (training context and plan import) are DONE; L14 (live activity) and S10
(widgets) are queued as H8, not open CP6 items.

**Gate evidence (24 Nov 2026):** training-context/onboarding/starter tests, and
the full 48-check suite. Tap counts not recorded.

Features: L14, S10, S2, S3/S4 (reframed).

1. **Android live activity** — an ongoing notification with the current exercise
   and set, a set-complete action, and rest ±15 s / skip. Android only; the PWA
   degrades with no promise.
2. **Android widgets** — calendar, seven-day data, routine of the day, streak,
   quick log. No iOS widget promise exists.
3. **Adaptive trainer.** Landed: onboarding goal, level, equipment, weekly
   frequency and typical session length rank a fitting starter plan; working
   loads adapt through the cockpit's per-lift diagnostics, never by silently
   rewriting the plan. Deloads, progression shapes and Undo stay explicit.
   "Short tips" remain the existing Home insight/coach line.
4. **AI, reframed.** Landed: Settings → Data exports a compact
   `openhybrid-training-context` JSON (goals/settings, active plan, last eight
   weeks of sets/runs and weekly totals) with no name, notes, routes, photos or
   health records. Plans → Import plan (.json) is the return path. No OAuth,
   connector or hosted service exists.

**Data rules:** no backend, no account, no new network surface. Native code
changes require the Android device checklist and must not fork state ownership.

**Reuse:** `js/health/health-bridge.js` for the Android bridge pattern,
`js/programs/progression.js`, `js/programs/editor-model.js`,
`js/onboarding/starter-programs.js`.

**Acceptance:** browser and PWA builds degrade cleanly; a killed WebView loses
nothing; no data leaves the device except by an explicit user action (export,
share or backup).

### CP7 — Polish and scale (CONTINUOUS)

**Status: CONTINUOUS.** **Goal:** keep the finished surface fast and reachable.
CP7 runs alongside the active H phase; it is a quality bar, not a gate.

**Landed 2026-11-24:** Week in Review shares the one-canvas PNG from both its
Overview and Stats tabs (`weeklyReviewShareRows`); the calendar share card
remains.

**Gate evidence (continuous):** the current tree runs the full node suite,
typecheck, smoke, precache/workflow gates and 48 real-browser checks. Each
polish slice adds its own evidence line in the session log.

Share cards for progress charts and the calendar; performance with five years of
history and a large photo library; accessibility and text scaling; empty states;
reduced motion; export/import for measurements, photo metadata and routines;
documentation.

**Order rationale:** logging → analytics → body → organisation → reports →
platform. CP6 may run in parallel once CP2's metric contracts are frozen. CP0
and CP1 are strictly sequential.

### F — Foundation (CONTINUOUS)

Scheduled, behaviour-preserving work that runs alongside a phase and never
blocks it. Touch only modules the active phase already touches.

1. Split large modules (`js/workout.js`, `js/app.js`) along the existing
   context/renderer boundaries; no new import cycles.
2. Reduce CSS specificity and duplicate rules where a phase edits the surface.
3. Finish reviewed technique metadata for the G9 core set in small batches.
4. Keep the suite green before and after; no behaviour change rides along.

## 7. Feature matrix

**Legend:** ✅ shipped · ◑ reframed · ◐ partial · ○ missing. `◑ reframed` means
the row shipped in a deliberately narrower form; the Decision column records
what replaced it. CP0 verified each row; do not rebuild a ✅.

### Progress tracking (12)

| ID | Feature | Owner | Target behaviour | Status | Gap | Decision | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Progress hub | `analytics/progress-dashboard.js` | Eight bands over calendar weeks; each answers one question and links to exact evidence | ✅ | — | — | — |
| P2 | Gym performance | `analytics/progress-dashboard.js` | Pulse, Muscles and Main exercises together answer the gym-performance question | ◑ | — | Merged into Pulse/Muscles/Main exercises; no duplicate gym-performance screen. | 2 |
| P3 | Monthly report | `brain/monthly-report.js`, `analytics/views/view-monthly-report.js` | Current calendar month with elapsed-matched prior month; trailing 12-month view; PNG share card | ✅ | — | — | 2, 5 |
| P4 | Muscle group chart | `home/body-heatmap.js` | Sets per muscle on the shared body diagram, respecting the selected period | ✅ | — | — | 2 |
| P5 | Sets per muscle per week | `analytics/muscles.js`, `analytics/views/view-muscles.js` | Weekly/monthly/yearly credited sets, long ranges, one-muscle focus | ✅ | — | — | 2 |
| P6 | Muscle distribution | `analytics/muscle-load.js`, `analytics/views/view-muscles.js` | Per-muscle credits and recovery; credited-set share with equal-length period comparison | ◑ | — | Credited sets + share with equal-length comparison; no percentage body-map. | 2 |
| P7 | Body measurements | `metrics/measurements.js`, `analytics/measurement-explorer.js` | Weight, body fat, 14 sites, per-site trend, Measures explorer | ✅ | — | — | 3 |
| P8 | Progress photos | `photos/library.js`, `portability/zip.js` | Dated photos, timeline, compare, edit/replace/delete, zip export/import | ✅ | — | — | 3 |
| P9 | Exercise performance | `analytics/exercise-detail.js`, `strength/set-records.js` | Graph, PR summary, set records by rep target, exact history | ✅ | — | — | 2 |
| P10 | Consistency and streak | `analytics/training-calendar.js`, `analytics/pulse.js` | Calendar weeks, current and best weekly streak, rest days | ◑ | — | Calendar-week streak; program-week grid retired. | 2 |
| P11 | Saved-workout actions | `activities/` | Summary, save as routine, repeat, edit, delete with Undo | ✅ | — | — | 4 |
| P12 | Year in Review | `brain/year-review.js`, `analytics/views/view-year-review.js` | Seasonal Dec/Jan calendar-year recap: totals, best month, per-date annual e1RM PRs, in-year consecutive run, top exercises; PNG share card | ✅ | — | — | 5 |

P7 is complete: the measurements record carries an entered body fat, 14
canonical bilateral tape sites (pre-14-site single Arm/Thigh readings preserved
and exported), and each measured cell toggles its own per-site trend below the
card — body fat on a percentage scale. **Measures** now also leads with the same
chart as a single-site explorer: choose any measured site or body fat, pick
30D / 3M / 1Y / All, and see the latest value, its change since the previous
reading and the exact readings table. The Body band's four site cells deep-link
to that site.

Year in Review renders only in December/January by design: it is a seasonal
recap, not the only year view. G4 (§17.2) adds an always-available year heatmap
inside Progress, so "show me my year" does not depend on the calendar month.

### Workout logging (14)

| ID | Feature | Owner | Target behaviour | Status | Gap | Decision | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | Log and track | `workout.js` | Routines or empty sessions, all variables, save | ✅ | — | — | — |
| L2 | Start empty workout | `workout.js` | Timer, add exercises, finish | ✅ | — | — | — |
| L3 | Exercise notes | `workout/exercise-config.js` | Routine, session and pinned exercise scopes, clickable link | ✅ | — | — | 1 |
| L4 | Rest timer | `timers.js` | Per exercise, 5 s–5 min, ±15 s, drop suppression, sound | ✅ | — | — | 1 |
| L5 | Add/remove sets | `workout/set-mutations.js` | Add, remove, reorder, load/reps/rep-range/time | ✅ | — | — | — |
| L6 | Set types | `workout/set-sheet.js` | Normal, warm-up, failure, drop with volume and PR rules | ✅ | — | — | — |
| L7 | Previous values | `workout.js` | Last anywhere vs last in routine, tap-to-fill | ✅ | — | — | 1 |
| L8 | Warm-up calculator | `workout/warmup-ramp.js` | Percentage rows, plate/dumbbell rounding, insert/delete | ✅ | — | — | 1 |
| L9 | Plate calculator | `workout/plates.js`, `workout/plate-sheet-model.js` | Target, bar, plates, counts, per-side, shortfall | ✅ | — | — | 1 |
| L10 | RPE | `workout/effort.js`, `workout/set-sheet.js` | 0–4 RIR (6–10 RPE) in half steps, per-set sheet, live entry, review later | ✅ | — | — | 1 |
| L11 | Supersets | `workout/superset.js` | Pairs and circuits, stable colours, rest after the group | ✅ | — | — | 1 |
| L12 | Saving a workout | `workout/session-status.js` | Name, duration, date, notes, summary | ✅ | — | — | 1 |
| L13 | Live PR | `workout.js`, `strength/records.js` | e1RM/hold/carry/rep detection, one non-blocking banner, persisted evidence; volume stays represented by load × reps, not a separate trophy | ◑ | — | e1RM/hold/carry PRs; no separate volume trophy. | 1 |
| L14 | Live activity | — | Lock-screen/ongoing notification with set and rest controls | ○ | No native notification surface | — | H8 |

### Settings and extra (10)

| ID | Feature | Owner | Target behaviour | Status | Gap | Decision | Phase |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Workout settings | `settings.js` + `settings/nav.js` | One Logging card: rest tiers/presets/sound, previous values, progression, warm-up, plate hints, keep-awake and live-PR switches | ✅ | — | — | 1 |
| S2 | Adaptive trainer | `onboarding/starter-programs.js`, `engine.js`, `programs/progression.js` | Onboarding goal/level/equipment/frequency/session length produce a fitting plan; loads adapt via cockpit diagnostics; deloads and Undo stay explicit | ✅ | — | — | 6 |
| S3 | AI plan generation | `portability/training-context.js`, `programs/program-json.js` | Export compact training context; import a returned plan JSON; no account linking | ◑ | — | Export context + import plan JSON; no model call. | 6 |
| S4 | AI analysis | `portability/training-context.js` | Same external context; deterministic in-app coach Q&A remains the offline path | ◑ | — | Deterministic coach Q&A; no model call. | 6 |
| S5 | Folders and routines | `programs/library.js`, `routines/` | Create, folder, reorder, start | ✅ | — | — | 4 |
| S6 | Routine library | `programs/library.js` | Optional category, category filter, folders, save a programme or a single routine | ✅ | — | — | 4 |
| S7 | Exercise library | `exercises/` | 5,700+ entries, filters, instructions | ✅ | — | — | — |
| S8 | Custom exercises | `exercises/` | Name, equipment, muscles, type, duplicate/edit/delete | ✅ | — | — | — |
| S9 | Programming options | `workout/exercise-config.js` | Notes, rest, sets, types, load, reps/time, reorder, replace | ✅ | — | — | — |
| S10 | Home widgets | — | Calendar, 7-day data, routine of the day, streak, quick log | ○ | No Android home-screen widgets; live notification is L14 | — | H8 |

## 8. Deferred scope

Deliberately **not** in the backlog. None of these is rejected forever; each
needs a new product decision first.

| Scope | Why deferred |
| --- | --- |
| Social graph — feed, discovery, profiles, athlete workouts, compare, gyms, leaderboards, media upload, share folders, Strava | Explicitly excluded. openHybrid has no accounts and no backend. |
| Coach (B2B) | A separate product with its own onboarding and billing. |
| Strength Level percentiles | Requires a licensed population dataset. Without one, a percentile is fabricated. |
| Pro gating | No paywall exists and none is planned. Every feature ships ungated. |
| Cloud sync, accounts, connectors | Contradicts the local-first decision. Reopening it is a product decision, not a task. |
| Bring-your-own AI coach (live calls) | Breaks the no-new-network-surface rule if the app calls out; export/import of the training context is the current path. |
| iOS | Out of scope for the current launch push. No iOS project exists. |
| Public release work | Parked, not cancelled. See §11. |

## 9. Cross-cutting data and reliability rules

Product improvement must not weaken these foundations:

- Local data and successful training logs are never silently overwritten.
- Programme activations never leak old workout slots into a new run.
- Calendar analytics use real dates; programme progression uses programme week.
- Warm-ups and incomplete work do not become completed training evidence.
- Exercise aliases preserve historical identity without rewriting stored keys.
- One owning module per metric and per setting. A second copy is a defect; a
  shortcut must edit the same value, never a parallel store.
- Settings and profile changes are additive migrations with a backup path; a
  restored pre-change backup loads defaults for new keys and never silently
  resets a value the athlete chose.
- Sync, import, restore, deletion, and programme edits require recovery paths.
- An imported activity is attributed to the day it HAPPENED, from the source
  file's own timestamp — never to whichever day a screen happened to be showing.
  Imports carry an identity so re-importing the same file is refused rather than
  silently double-counted.
- Estimates remain labelled as estimates.
- Runtime JavaScript remains bundled and origin-restricted.
- Every bug fix adds the smallest useful regression test.
- Progress photos never enter `appState` or `localStorage` as base64. State holds
  metadata; blobs live in IndexedDB; deleting a record deletes its blob.
- No new network surface, account, or third-party data flow without a new
  product decision.

### Shared vocabulary

One definition per term, owned by one module. CP0 confirms each against code.

| Term | Meaning | Owner |
| --- | --- | --- |
| Session | One completed or in-progress training record — strength, run, or both | `activities/model.js` |
| Training day | A calendar date carrying at least one session | `analytics/logged-days.js` |
| Working set | A non-warm-up set with a valid shape; holds and carries count | `set-utils.js` |
| Volume | Weight × reps. Holds and carries are 0 | `set-utils.js` |
| Active day | A day with at least one session, used by reports | `analytics/logged-days.js` |
| Streak week | A Monday-based week with at least one session | `analytics/pulse.js` |
| PR | A set that beats every earlier comparable set, all-time | `strength/records.js` |
| Body reading | One dated record per site in canonical centimetres, plus an optional entered body-fat percentage | `metrics/measurements.js` |

## 10. Definition of done

A slice is complete only when:

- the primary user job is easier or clearer;
- the common path has fewer or better decisions;
- loading, empty, offline, error, and recovery states are covered;
- mobile, text scaling, keyboard, and accessibility behaviour are verified;
- existing user work and historical data remain intact;
- unit, typecheck, smoke, precache, and relevant browser checks pass;
- the roadmap status and session log are updated;
- the change is committed as one understandable unit.

### Quality gate

The programme is measured against a product bar, not a feature checklist. The
bar is the **nine Part H flows** (§19), run on a real phone and recorded as taps
and seconds: flow, openHybrid before, openHybrid after, Hevy, openGym, date. The
owner supplies the Hevy and openGym numbers. **A PR may not make any flow
slower.** The flows replace the old unfalsifiable "on par with Hevy" claim.

Every product PR states the matrix rows it closes, the Part H flow it improves,
and the evidence: before/after tap counts, browser checks for the interaction,
empty/error/loading/offline states, 320/390/412 px and light/dark checks, 44 px
targets, settings-driven units, correct calendar/program attribution, and no
history rewrite or new network surface. Tests and browser checks are added or
strengthened, never weakened to pass. Work is clean-room: no copied Hevy/openGym
code, assets, media or visual identity.

**Hard reject:** a slower logging path, unexplained extra taps, hidden settings,
duplicated surfaces, wrong attribution, unreachable controls, missing empty
states, hard-coded units, or no offline/data-safety coverage. If a phase is
functionally complete but UX-below-bar, leave the PR open and report the exact
gaps instead of merging. `.github/PULL_REQUEST_TEMPLATE.md` carries the
checklist.

## 11. Explicitly parked

Valid future concerns, not active priorities:

- Play Store submission, listing assets, legal publication, and signed release
  evidence;
- iOS, Capacitor, TWA, and other shell migrations;
- subscriptions, billing, advertising, and paywalls;
- normalised Supabase session persistence;
- major framework rewrites;
- social feeds, public leaderboards, or community marketplace features;
- additional analytics families without a clear user decision;
- further catalogue expansion before discovery and metadata quality are strong.

Data-loss, security, sync-isolation, and destructive-action defects remain P0
even while release work is parked.

## 12. Delivered programme

The experience overhaul that produced the current shell. Task lists,
inventories and incident post-mortems are in `docs/ROADMAP_ARCHIVE.md`.

| Experience phase | Date | Outcome |
| --- | --- | --- |
| EP0 — Experience map and product contract | 2026-08-03 | Shared model of jobs, destinations and interface rules; screen/sheet/route inventory; journey map; vocabulary |
| EP1 — Navigation and Home hierarchy | 2026-08-03 | Four intent-led destinations; Home became a decision surface; legacy routes kept working |
| EP2 — Natural workout and run logging | 2026-08-07 | Strength cockpit, review-not-form completion, focused live-run surface with persistent condition notices |
| EP2D — Logger upgrade | 2026-11-21 | Truth fixes, load basis, set shapes, rest overrides, plate line, timer persistence, `+ Drop`, adaptive warm-up ramp |
| EP3 — Progress and analytics redesign | 2026-08-09 | Decision-surface hub, metric tiers, one detail-screen contract, calendar-correct weekly attribution |
| EP4 — Plans, exercise discovery, editing | 2026-08-07 | Fit-based recommendations, active-plan lead, "Who it's for", Simple/Advanced progression, one editor undo |
| EP6 — Visual system, accessibility, performance | Continuous | Safe-area tokens, touch targets, non-blocking webfonts, content-hashed cache, performance baseline |

### Delivered foundations

| Area | Current capability |
| --- | --- |
| Navigation | Four intent-led destinations — Home, Train, Progress, Plans — with stable legacy route IDs and origin-aware drilldown Back behaviour |
| Home | One week surface: optional rail, pinned Today decision, inline day recaps with heat map, bodyweight, one insight, quick actions |
| Training | Planned/one-off strength, running, set logging, timers, swaps, supersets, bodyweight modes, session completion, focused live-run surface |
| History | Calendar \| List, search, provenance, source filter, day sheet, exact detail, lossless edit, delete/undo, repeat, share, save as routine |
| Plans | 58-program catalogue, active plan first with one primary action and one search, fit-based recommendations with reasons, compare, details, timeline, editable copies, builder, routine list with Start and folders |
| Exercises | 157 canonical exercises plus ~5,555 catalogue entries, 66 reviewed instruction sets, aliases, filters and details |
| Progress | One range-driven dashboard of eight bands — Pulse, Balance, Muscles, Main exercises, Endurance, Body, Fasting, Reports — over calendar-week attribution, with Measures (dated weight/body fat/tape/photo entries, a single-site measurement explorer, compare and export) behind Body; exact evidence and the week-scoped detail screens it links into remain |
| Data | Activity history, activation isolation, export/restore, CSV/FIT import, automatic backups, Android state mirror |
| Quality | 2,664 node tests, typecheck, smoke, precache/workflow gates, 48 real-browser checks |

## 13. Roadmap v2 — active programme (H0–H4)

**Adopted 24 November 2026. One active phase at a time.** The CP/EP sections
above are the delivered evidence base; this programme supersedes their open
items. CP6's native leftovers (L14 live activity, S10 widgets) move to H8.
S2 (adaptive trainer) and S3/S4 (training context and plan import) are closed.

### 13.1 Owner priorities

1. **Settings and Profile first and foremost** — redeveloped to feel Apple-like
   and intuitive.
2. Then **Home**, **workout logging**, and the **Progress tab with strength
   analytics**. The Progress tab's trailing "More detail" section is dissolved
   into the surfaces that own each item (§16).
3. **Strength first.** Running is deferred while the owner is not running. Do
   not build running features now and do not regress what exists.

"Apple-like" means **interaction patterns and information architecture**, not
Apple's visuals. §4.12 (preserve identity: technical character, restrained
orange accent, dark/light) still holds. Do not copy Apple assets, SF Symbols or
wording; use the app's own icons and tokens.

### 13.2 Tracks

| Track | Purpose | Done when |
| --- | --- | --- |
| **Experience** | Settings, Profile and Home: obvious, calm, intuitive | Part H flows no worse than Hevy and openGym; §4 principles hold |
| **Strength** | Logging and analytics a serious lifter expects | Flows hold; analytics answer "is it working, what next" |
| **Foundation** | Module size, CSS specificity, metadata, tests | Scheduled, not a standing complaint |
| **Hybrid (later)** | Running and combined-load features | Queued after Strength; see §18 |

### 13.3 Phase queue

Status for every row is `NEXT` until started. H0 must finish before H1; H1–H4
run in order. H5–H8 are queued, not active.

| Phase | Scope | Gate |
| --- | --- | --- |
| **H0 — Verify and audit** (DONE 24 Nov; device baseline `[You]`) | Verify Parts C, D, D.2 and E rows against code and tests; ST1 inventory; baseline Part H flows; add the smallest regression test for any untested metric. Tests only. | Zero `UNVERIFIED` in C/D/E; one owner per metric; baseline recorded |
| **H1 — Settings and Profile** | ST1–ST11, G6 (ST7), G8 (ST8). Start with the P0 findings S-F1, S-F2, S-F4 decision and S-F5. | §14.6 |
| **H2 — Home** | HM1–HM7, G1 (HM2) | §15 acceptance |
| **H3 — Workout logging** | G2, G3, G5, G7, G9 (rolling), G10, LG1, LG2 | §17.1 acceptance |
| **H4 — Progress and strength analytics** | PG1–PG9 (§16) first, then A1–A9 and G4 inside the new structure | §16.6 and §17.2 acceptance |
| H5 — Strength coaching | §18.1 | queued |
| H6 — Running | §18.2 | deferred |
| H7 — Hybrid intelligence | §18.3 | deferred |
| H8 — Platform | §18.4 | queued |
| **F — Foundation** | Continuous. Split large modules and reduce CSS specificity **only in modules a phase touches**; finish technique metadata for the G9 core set. Behaviour-preserving; tests green before and after | Never blocks a phase |

**H0 evidence (24 Nov 2026):** all 47 C/D/D.2/E rows were checked against their
modules and tests; ST1 is recorded in §14.7 and PG1 in §16.7. Findings are
S-F1–S-F5 (§14.8), H-F1–H-F5, P-F1–P-F5 (§16.8) and L-F1–L-F6 (§17.3). The
Part H baseline table is recorded in §19.1; openHybrid/Hevy/openGym device
numbers remain `[You]`. No untested metric calculation was found — the gaps are
missing features, dead surfaces and navigation, not unverified arithmetic. H1
starts with the P0 data-safety findings.

## 14. Settings and Profile (H1)

### 14.1 Design stance

Patterns to adopt: a profile card at the top; grouped inset lists; one row =
one setting; label left, current value right, chevron to push a detail screen;
toggles only for on/off; pickers and segmented controls for short choices;
explanatory **footers under a group** instead of inline clutter; a large title
that collapses on scroll; consistent push/back navigation; **settings search**;
changes apply immediately with no Save button; destructive actions grouped at
the bottom and clearly marked.

Each screen answers one question. No screen has more than about seven rows
without a group break. Use training language, not storage or schema jargon
(§4.8).

### 14.2 Proposed information architecture

Verify this against the real settings first; ST1 is the inventory that proves
or corrects it.

| Group | Rows |
| --- | --- |
| **Profile card** (top) | Avatar, name, one-line training summary → Profile screen |
| **Training** | Workout logging · Programs and progression · Equipment · Training focus (Hybrid on/off) |
| **Units and formats** | Weight, distance, body measurements, week starts on (ST7), time and date format |
| **Notifications** | Rest-timer alerts, planned-day reminders (screens first; native delivery lands in H3) |
| **Appearance and feel** | Theme (system/light/dark), text size, reduced motion, haptics, sounds, exercise demo size (ST8) |
| **Health and devices** | Health Connect, imports (CSV/FIT) |
| **Data** | Backups and restore, export, training-context export, progress-photo backup, sync |
| **About** | Version, licences, help, reset, delete all data (destructive, last) |

### 14.3 Profile screen

- **Profile is the single owner of athlete-fit inputs:** level, goal, equipment
  access, training days per week, session length, focus. Plan recommendations
  and the adaptive trainer read from it. Verify what exists and remove any
  duplicate store of the same input.
- Also: name, avatar (local only), height (optional), and a link to bodyweight
  in Measures. Do not duplicate the bodyweight log here. Ask only for data a
  feature actually uses.
- Show what each input affects in a footer ("Used for plan recommendations").

### 14.4 Work items

| ID | Item | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| ST1 | **Settings inventory** | `state.js`, `index.html`, `settings.js`, `settings/nav.js` | Table of every setting: key, owner module, where shown, default, who reads it. Find duplicates, hidden, dead and misplaced settings; classify keep / merge / move / remove | DONE | Inventory in §14.7: 47 keys + 5 settings-like values; 2 migration-only, 1 write-only, 1 orphan. |
| ST2 | **Declarative settings registry** | new `js/settings/registry.js` | One registry (id, label, type, group, footer, search keywords, default, migration). Screens and search render from it; no setting exists outside it. Test: every stored key is in the registry | MISSING | No per-setting metadata exists; `settings/nav.js` maps card labels to five tabs only. Screens are hand-written HTML and handlers. |
| ST3 | **Settings search** | `settings/nav.js`, `settings.js` | Matches labels, footers and keywords; result opens the exact row with the group in view | PARTIAL | Card-level filter, no-results status and module-hidden exclusion exist; no row jump/highlight or keywords. Settings is 2 taps deep, search is tap 3. |
| ST4 | **Contextual shortcuts** | `settings.js` + owning surfaces | Gear or "Settings" links from the logger, Plans and Progress open the relevant detail screen and edit the same value (never a second copy) | MISSING | Only Settings entry is the Home avatar; no gear from logger/Progress/Plans/Measures. Muscle priorities wrongly say "set in Settings". |
| ST5 | **Profile redevelopment** | `settings.js`, `onboarding.js`, `equipment-profiles.js` | Per §14.3; migrates existing profile data losslessly | PARTIAL | Name/goal/level/weight goal editable; equipmentTier, frequency, session length and focus are not. Equipment answer is reverted on boot (S-F1); bodyweight is duplicated (S-F2). |
| ST6 | **Units and formats** | `settings.js`, `measurements-sheet.js` | One Units screen; every surface follows it (§10 rejects hard-coded units); unit toggles change display only, never stored values | PARTIAL | Weight/distance live in the Training card; measurement unit only in Measures; no time/date format. Unit switch relabels stored history (S-F4). |
| ST7 | **Week start (G6)** | `settings.js`, `analytics/weekly-aggregate.js`, `dates.js` | Monday or Sunday; rail, calendar and every "this week" total follow it. Touches the Monday-only data rule: needs a migration note, a backup path and tests across Pulse, Muscles, reports and Year in Review | PARTIAL | Home/History/bodyweight honour it; every Progress analytic and `startOfProgramWeek` hardcodes Monday; no refresh (S-F3). |
| ST8 | **Appearance and feel** | `settings.js`, `theme.js`, `haptics.js` | Theme, text size, reduced motion, haptics, sounds, demo size (G8) on one screen | MISSING | Theme + palette only; no text size, reduced motion, haptics, demo size or sounds group. |
| ST9 | **Data safety screens** | `settings.js`, `portability/auto-backup.js`, `photos/library.js` | Backup status, last backup, restore, export; honest about what each does and does not carry (photos are device-local) | PARTIAL | Backup status, one restore point and all exports exist; the card does not say photo bytes are outside the JSON backup and has no manual last-backup timestamp. |
| ST10 | **Destructive actions** | `settings.js`, `ui/confirm-modal.js` | Reset and delete-all behind an explicit two-step confirm with a plain description of what is lost; recoverable actions use Undo instead (§4.5) | PARTIAL | One confirm names the losses; no second gate or typed confirmation, reset and delete-all are one action, no per-domain choice. |
| ST11 | **Notifications screens** | `settings.js`, `notifications.js` | UI and preferences only; delivery work is G5 in H3 | PARTIAL | Four toggles + two time pickers exist; the master switch reads OS permission and stores nothing (S-F5); no planned-day preference. Delivery is G5. |

### 14.5 Data rules

- Additive migrations only. A settings or profile schema change needs a
  migration, a backup path and an `AGENTS.md` note. A restore of a pre-change
  backup must load with defaults for any new key.
- Never silently reset a setting the user changed. New defaults apply only to
  new keys.
- Preferences the app reads at runtime keep one owning module each (§9).

### 14.6 Acceptance

- Change units in **3 taps or fewer** from the app's first screen; find any
  setting via search in **2 taps or fewer**.
- Every setting appears once in the registry; any other place that shows it is a
  labelled shortcut editing the same value.
- Every toggle and picker takes effect immediately, with no refresh.
- 320/390/412 px, light/dark, 200% text scaling, keyboard and screen-reader
  labels pass; rows are at least 44 px.
- Old backups restore cleanly; no setting lost in migration (tested).

### 14.7 ST1 settings inventory (H0)

Every key under `appState.settings` plus the settings-like values stored
elsewhere. **Class:** keep · merge · move · remove. Current location is the
settings card; "not shown" means the value has no Settings row.

| Key | Current location | Default | Owner / writers | Readers | Class |
| --- | --- | --- | --- | --- | --- |
| `name` | Profile card + hero | `''` | `settings.js`, `onboarding.js` | athlete profile, Home, briefing, share card | keep |
| `avatarDataUrl` | Hero avatar | `null` | `settings.js` (320px JPEG in state) | athlete profile, Home, import validation | keep; move bytes to IndexedDB later |
| `fitnessGoal` | Profile card | `hybrid` | `settings.js`, onboarding, plan library | recommendation fit, Hybrid Score, training context | keep; Profile owns it |
| `fitnessLevel` | Profile card | `intermediate` | `settings.js`, onboarding, plan library | recommendation fit, Hybrid Score | keep |
| `weightGoal` | Profile card | `maintain` | `settings.js` | recommendation fit, training context | keep |
| `equipmentTier` | Not shown | `gym` | `onboarding.js`, plan library | recommendation fit, training context | merge: derive from the active equipment profile |
| `weeklyFrequency` | Not shown | `some` | `onboarding.js` only | none | remove or revive; recommendations use real frequency |
| `sessionMinutes` | Not shown | `45` | `onboarding.js` only | onboarding only | remove or revive |
| `recoveryFeel` | Not shown | undeclared | `onboarding.js` only | none | remove (write-only orphan) |
| `onboardingComplete` | Not shown | `false` | `onboarding.js` | recovery gate, onboarding | keep (system flag) |
| `defaultBodyWeight` | Profile card "Body Weight" | `null` | `settings.js`, set mutations, CSV import | set mutations | merge into `bodyWeightLog` |
| `weightUnit` | Training card | `kg` | `settings.js`, onboarding | most surfaces | move to Units |
| `distanceUnit` | Training card | `km` | `settings.js`, onboarding | GPS, Home, dashboard | move to Units |
| `measurementUnit` | Not shown (Measures sheet only) | seeded from weight unit | `measurements-sheet.js` | measurements, Measures | move to Units |
| `weekStartDay` | Training card | `mon` | `settings.js` | Home rail, dashboard model, History calendar, bodyweight | move to Units; see S-F3 |
| `progressionIncrement` | Logging | `2.5` | `settings.js` | engine, session recap | keep |
| `previousValuesScope` | Logging | `all` | `settings.js` | workout | keep |
| `showPlateHints` | Logging | `false` | `settings.js` | workout | keep |
| `autoWarmupRamp` | Logging | `false` | `settings.js` | warm-up ramp | keep |
| `keepAwake` | Logging | `true` | `settings.js` | workout wake lock | move to Appearance and feel |
| `livePR` | Logging | `true` | `settings.js` | workout PR banner | move to Appearance and feel |
| `restPeriods` | Logging | `DEFAULT_REST_TIERS` | `settings.js`, rest presets | timers, rest duration | keep |
| `restOverrides` | Logging ("Reset remembered rests") | `{}` | `settings.js`, timers | timers, set sheet | keep |
| `restTimerEnabled` | Logging | `true` | `settings.js` | timers | keep |
| `restAlertSound` | Logging | `true` | `settings.js` | timers | move to Appearance and feel |
| `restAlertVolume` | Logging | `0.4` | `settings.js` | timers | move to Appearance and feel |
| `exercisePrefs` | Not shown (cockpit exercise options) | `{}` | `exercise-config.js`, `exercise-options.js` | set shape, exercise config, workout | keep (single owner) |
| `musclePriorities` | Not shown (Progress → Volume Guide → Priorities) | `{}` | `view-strength.js` | volume guide, muscle load | keep; fix the false "set in Settings" pointer |
| `targetWeight` | Not shown (Bodyweight view) | `null` | `analytics.js` | bodyweight, body metrics, Home card | keep; link from Profile |
| `rateGoal` | Not shown (Bodyweight view) | `null` | `analytics.js` | bodyweight, view | keep |
| `fastingDefault` | Fasting card | `16` | `settings.js` | fasting actions as fallback | merge into one fasting-goal owner |
| `theme` | Appearance | `dark` | `settings.js`, onboarding | boot, onboarding | keep |
| `palette` | Appearance | `midnight` | `settings.js` | theme, boot | keep |
| `hybridTraining` | Modules card | `true` | `settings.js` | modules, CSS | keep; move out of Modules (presentation, not a module) |
| `modules` | Modules card | not in defaults (`{}` = all on) | `modules.js` via `settings.js` | modules, CSS, filters | keep; declare in defaults |
| `equipment` | Equipment card | 5 core true | `equipment-profiles.js` projection; onboarding writes directly | recommendation fit, compare, engine | keep as derived; onboarding write is a defect |
| `bandWeights` | Equipment sub-card | `10/20/30` | `equipment-profiles.js` projection | engine, volume, load mode | keep as derived |
| `equipmentProfiles` | Equipment card | `[]` (v6 seeds one) | `equipment-profiles.js` | plate sheet, suggestions, fit | keep (source of truth) |
| `activeEquipmentProfileId` | Equipment selector | `null` (v6 seeds one) | `equipment-profiles.js` | plate sheet, suggestions, fit | keep |
| `reminderTime` | Notifications | `07:30` | `settings.js` | notifications | keep |
| `streakAlertTime` | Notifications | `20:00` | `settings.js` | notifications | keep |
| `notifWeeklySummary` | Notifications | `false` | `settings.js` | notifications | keep |
| `notifStreak` | Notifications | `false` | `settings.js` | notifications | keep |
| `notifMissedWorkout` | Notifications | `false` | `settings.js` | notifications | keep |
| `notifFastingStage` | Notifications (Fasting sub-block) | `true` | `settings.js` | fasting nudge | keep |
| `ui` | Not shown (Home/Progress Customize) | normalized empty (v12) | `ui/customize.js` | customize, progress dashboard, analytics | keep |

**Settings-like values outside `appState.settings`:**

| Value | Current location | Class |
| --- | --- | --- |
| `state.thresholdPaceSeconds` | Settings → Training; written by analytics | move into Units (or a typed descriptor) |
| `state.healthConnect.stepGoal` | Settings → Health Connect | move into Health settings |
| `state.prGoals` | No Settings row | keep for now; no owner review |
| `state.profileSections` | Defaulted, never read | remove (dead) |
| `state.dashboardTiles` | Home drag-drop registry | keep only if the registry stays; otherwise remove |

### 14.8 H0 findings (Settings/Profile)

These are verified defects, not design preferences. Data-safety findings are
P0 and must be closed before H1's acceptance is claimed.

| ID | Finding | Evidence | Severity | Target |
| --- | --- | --- | --- | --- |
| S-F1 | The onboarding equipment answer is destroyed on the next launch: onboarding writes the legacy projection but never the equipment profile, and boot reprojects the profile over it. A home athlete is then recommended barbell plans as "equipment you have". | `js/onboarding.js` equipment write; `js/state.js` boot `ensureEquipmentProfiles` + `projectActiveEquipmentProfile`; reproduced headlessly | **P0** | H1 / ST5; add a boot-path test |
| S-F2 | `defaultBodyWeight` and `bodyWeightLog` are two stores of one fact. A back-dated weigh-in after today's entry makes `currentBodyweight()` return the older weight, so bodyweight/assisted sets load against a stale value. | `js/workout/set-mutations.js` reverse scan; `js/settings.js` last-entry read; `normalizeWeighIns` already sorts | **P0** | H1 / ST5; route both readers through `normalizeWeighIns` |
| S-F3 | "Week starts on" already splits the app: Home/History/bodyweight honour Sunday, every Progress analytic and `startOfProgramWeek` hardcodes Monday, and changing it refreshes nothing. | `js/analytics/weekly-aggregate.js`, `pulse.js`, `muscles.js`, `hybrid-balance.js`, `dates.js`; no refresh dispatch | **P1** | H1 / ST7; one calendar-week owner + tests |
| S-F4 | The weight unit is not display-only. Switching kg→lbs keeps every stored number and relabels it, so a 100 kg squat reads as 100 lb. | `js/settings.js` `setWeightUnit`; `tests/volume_format.test.js` pins "labels, never converts" | **P0 decision** | H1 / ST6; choose convert-on-switch or lock-the-unit, with a backup path |
| S-F5 | The notification master switch is a dead toggle: it reads OS permission, stores no preference, and reads ON again after reload. | `index.html` Workout Reminder; `js/settings.js` permission read; `js/app.js` cancel handler | **P1** | H1 / ST11; persist a real preference and test reload |

## 15. Home (H2)

Source of truth for intent: §3 "Home is a decision surface". Verify what exists
first.

| ID | Item | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| HM1 | One-tap start with preview | `home/today-card.js`, `home.js`, `app.js` | Today card shows the planned lifts with target and last-time numbers; one Start/Resume/Review action; start from cold open in 2 taps or fewer | PARTIAL | One primary action and a 2-tap cold start; the card shows the session title only, with no lift targets or last-time numbers. |
| HM2 | Move a day (G1) | none | Reschedule a planned workout from the day cell without editing the plan; attribution uses the real date; Undo | MISSING | No reschedule control, no attribution change and no Undo; date cells only select and recap. |
| HM3 | Strength this week | `home/hybrid-dashboard.js` | Sessions, sets and volume vs the same weekdays last week, plus this week's PRs; one line each; links to the owning Progress surface | PARTIAL | Volume + same-weekday delta + one sub-line; no session count, sets/PRs are mutually exclusive, and the link opens the legacy Strength screen. |
| HM4 | One strength insight | `home/dashboard-model.js` | A single "because" recommendation from strength data (stalled lift, under-trained muscle, deload cue), never contradicting the plan or a recovery warning | PARTIAL | Exactly one insight, but it is fasting/load/readiness/streak/bodyweight-driven, not strength-derived, and it is not deload-aware; it can contradict the safety card. |
| HM5 | Quick actions | `index.html`, `home.js` | At most three: empty workout, log a past session (G3), and one contextual action | PARTIAL | Exactly three: Weight, Run, History. No empty workout, no log-past-session and no contextual action. |
| HM6 | Honest states | `home/today-card.js`, `home/week-view.js` | Rest day, no plan, first run, offline, partial data: each distinct and useful | PARTIAL | Ready/rest/in-progress/completed/unresolved/no-plan/offline-note/past-week empty exist; no explicit first-run state and offline is only a note. |
| HM7 | No duplicate metrics | `home/dashboard-model.js`, `week-strip.js`, `hybrid-dashboard.js`, `bodyweight-card.js` | Audit Home for the same figure shown twice or by two owners; also confirm there is one readiness surface and one owner (HY6) | PARTIAL | Proven 20% rail vs 100% coach-line plan-done contradiction; readiness and weekly volume are also duplicated; no duplicate-metric guard. |

**Acceptance:** Home answers "what should I do today?" without scrolling; no
metric appears twice; hybrid cards stay hidden when Hybrid training is off;
Part H flows do not regress.

## 16. Progress restructure (H4, first half)

### 16.1 What exists

- One range-driven dashboard: **Pulse** (always the current calendar week), then
  bands: Balance, Muscles, Main exercises, Endurance, Body, Fasting, Reports.
  One range control, four chips. `Customize Progress` has per-band switches and
  keyboard reorder.
- The four legacy domain cards were retired because they were a second
  dashboard. The **footer** was left holding quiet destinations: History and
  Week in Review (Review has a footer link that preserves the selected week).
- Other destinations reached from the tab: Measures and Photos (behind Body),
  Training Report (30 days or 12 months), Review → Stats with the seasonal Year
  in Review, the exercise drilldown, the Muscles detail screen.

The roadmap text has no literal "More detail" section. Treat that bottom
section on the live tab as the footer plus any other trailing destinations.
**PG1 finds out exactly what is there.**

### 16.2 Problem

A trailing "More detail" list is a dumping ground: destinations are cut off from
the question they answer, the same recap is reachable under several names
(Reports band, Training Report, Week in Review, Review → Stats, Year in Review),
and the list is easy to miss under the fixed bottom nav.

### 16.3 Principle

**Every destination has exactly one home, and that home is the band whose
question it answers.** Nothing is listed in a generic bottom section. A path
from Progress to any piece of evidence is at most two taps. A drilldown extends
a band; it never restates the Overview headline as a second dashboard (the
reason the legacy domain cards were retired).

### 16.4 Proposed structure

| Layer | Content | Rule |
| --- | --- | --- |
| **Overview** | Range control · Pulse · bands | Each band: one headline, one chart, one "because"/action. Nothing else |
| **Band detail** | Opened from the band header (whole header tappable, 44 px, "Details" affordance on every band) | Holds every extra chart, table and list the band currently pushes to the bottom. Inherits the range and shows its label |
| **Reviews** (one surface) | Week · Month · Year recap with Share | Merges the Reports band, Training Report, Week in Review, Review → Stats and Year in Review. Year is always reachable; the Dec/Jan banner promotes it. Legacy route IDs keep working |
| **Records** | PR table and timeline (A6) | One row, not a footer list |
| **History** | Header icon on Progress | Already a first-class destination; it leaves the footer |

Destination map (verify, then adjust):

| Today | New home |
| --- | --- |
| History | Header icon (also from Home and Train) |
| Week in Review, Training Report, Year in Review, Review → Stats | Reviews surface (Week \| Month \| Year) |
| Measures, Photos | Body band detail |
| Exercise drilldown, "all exercises" | Main exercises band detail (searchable All lifts list, favourites first (G7), sort by recent / PR / stalled) |
| Muscles detail, body map | Muscles band detail |
| Hybrid balance detail | Balance band detail (hidden when Hybrid training is off) |
| Any other trailing item | Assigned in PG2; if no band owns it, it is removed or moved to Settings |

Strength-first default order (Hybrid training off): Pulse → Main exercises →
Muscles → Body → Reviews. Balance, Endurance and Fasting stay out of the way
when their module is off and return in their usual place when on. Existing saved
band choices keep working (`PROGRESS_CARD_ALIASES` pattern).

### 16.5 Work items

| ID | Item | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| PG1 | Inventory | `analytics/views/view-progress-hub.js` | List everything under the bottom "More detail" section and every Progress destination: label, target screen, route ID, owning module, how many taps from landing, duplicates | DONE | Inventory in §16.7: 22 entries; the five fixed footer links sit outside the existing guard arrays. |
| PG2 | One home per destination | `analytics/views/view-progress-hub.js`, `progress-landing.js` | Classify each PG1 entry: attach to a band, merge into Reviews, promote to Records, move to Settings, or retire. No entry left unassigned | MISSING | All six footer leaves duplicate a band entry and Review is reachable three ways; the test only checks `domains` + `secondary`. |
| PG3 | Band-header drilldown | `analytics/views/band-kit.js` | Same pattern on every band; extra content moves from the Overview and the footer into the band detail | MISSING | Zero of eight band headers are controls; no Details affordance or band-detail layer exists. |
| PG4 | Reviews surface | `views/view-weekly-review.js`, `views/view-reports.js` | One Week \| Month \| Year recap surface replacing the duplicated recap entries; the share card still draws from the same models as the screen | PARTIAL | One Review screen with Overview \| Stats and a shared share model; not Week \| Month \| Year. The Year row opens Overview (wrong tab) and Reports duplicates it. |
| PG5 | All lifts index | `views/view-exercises.js`, `analytics/exercises-summary.js` | Searchable list of every lift with last performed, e1RM trend and stall flag; opens the exercise detail | PARTIAL | Top 5 with last performed, best e1RM, change and PR flag; no search, all-lifts list or stall flag. "Show all" opens legacy Strength. |
| PG6 | Records row | `strength/records.js`, `set-records.js` | PR table and dated feed (A6) | MISSING | All-time PR machinery exists only inside the per-exercise drilldown; no hub row, PR table or dated feed. |
| PG7 | Strength-first defaults | `ui/customize.js`, `customize-sheet.js`, `progress-dashboard.js` | Order per §16.4; Customize lists each band's detail switches; hidden modules are labelled "module off", not "no data" | PARTIAL | Per-band detail switches and keyboard reorder exist; default order is not strength-first, Reports is not Reviews, and module-off is not labelled. |
| PG8 | Navigation contract | `analytics/navigation.js`, `analytics.js` | At most 2 levels to any evidence; origin-aware Back; scroll position and range preserved; range label on every drilldown; last row clear of the fixed bottom nav | PARTIAL | Origin-aware Back, preserved week/range and footer padding exist; scroll resets to top on every navigation and band-origin Back loses position. |
| PG9 | Overview concision | `views/view-progress-hub.js`, `analytics.js` | Move secondary charts and tables out of the Overview into band detail; keep the Overview scannable in one screen of scrolling per three bands | MISSING | Each band carries its full chart + rows + table; 8 bands + 9 trailing links; no scannability test; the retired four-domain model is still computed. |

### 16.6 Rules and acceptance

- Legacy route IDs and saved Customize choices survive (migration test).
- Calendar-week attribution, the single range vocabulary (`analytics/ranges.js`)
  and the no-paywall guard test stay unchanged.
- No metric appears in two places except as a labelled shortcut to the same
  value. No new metric without an action (§3).
- Part H flows 6 and 7 and the new flows 8–9 take no more taps than before.
- The bottom section is gone: at most one quiet footer row remains if PG2 leaves
  an orphan with a real reason, and it is named in the roadmap.
- Empty, loading, partial and module-off states are distinct on every layer;
  320/390/412 px, light/dark, 200% text; the Progress hub browser check is
  rewritten for the new structure, not patched around.

### 16.7 PG1 destination inventory (H0)

Everything reachable from the Progress hub today. "Landing" is one tap on the
Progress bottom-nav item. Every row below is one tap from the hub; the duplicate
column names the other route to the same screen.

| # | Entry | Target | Route | Owning module | Duplicate entry |
| --- | --- | --- | --- | --- | --- |
| 1 | Pulse → History | `#activitiesScreen` | `open-activities` | `activities.js` | Footer History; Home quick action; Train History |
| 2 | Muscles row / Show all muscles | `#analytics-muscle-load` | `muscle-load` | `views/view-muscle-load.js` | Footer Muscle Load |
| 3 | Main exercises row | `#analytics-strength-entity` | `exercise` + entity | `views/view-strength-entity.js` | — |
| 4 | Main exercises → Show all | `#analytics-strength` | `strength` | `views/view-strength.js` | Footer Strength |
| 5 | Body site / All sites | `#analytics-measures` | `measures` + entity | `views/view-measures.js` | Footer Measures |
| 6 | Body photo tile | photo viewer | `data-photo-view` | `ui/photo-viewer.js` | Measures → Library |
| 7 | Body → Weight trend | `#analytics-bodyweight` | `bodyweight` | `views/view-bodyweight.js` | Footer Body Weight |
| 8 | Body → Log weigh-in | bodyweight sheet | `open-bw-sheet` | `bodyweight-sheet.js` | Home bodyweight card |
| 9 | Endurance → All running metrics | `#analytics-running` | `running` | `views/view-running.js` | Footer Running |
| 10 | Fasting → analytics | `#analytics-fasting` | `fasting` | `views/view-fasting.js` | Footer Fasting |
| 11 | Reports → Monthly Report | `#analytics-weekly-review` (Stats) | `monthly-report` | `view-weekly-review.js`, `view-monthly-report.js` | Footer Week in Review (Overview) |
| 12 | Reports → Year in Review (Dec/Jan) | `#analytics-weekly-review` (**Overview — wrong tab**) | `weekly-review` | `view-year-review.js` | Footer Week in Review |
| 13 | More detail → Fasting | `#analytics-fasting` | `fasting` | `views/view-fasting.js` | Fasting band |
| 14 | More detail → Body Weight | `#analytics-bodyweight` | `bodyweight` | `views/view-bodyweight.js` | Body band |
| 15 | More detail → Muscle Load | `#analytics-muscle-load` | `muscle-load` | `views/view-muscle-load.js` | Muscles band |
| 16 | More detail → Projections (running on) | `#analytics-projections` | `projections` | `views/view-projections.js` | — |
| 17 | Footer → Running (module on) | `#analytics-running` | `running` | `views/view-running.js` | Endurance band |
| 18 | Footer → Strength | `#analytics-strength` | `strength` | `views/view-strength.js` | Exercises Show all |
| 19 | Footer → Week in Review | `#analytics-weekly-review` (Overview) | `weekly-review` | `views/view-weekly-review.js` | Reports ×2 |
| 20 | Footer → Measures | `#analytics-measures` | `measures` | `views/view-measures.js` | Body band |
| 21 | Footer → History | `#activitiesScreen` | `open-activities` | `activities.js` | Pulse band |
| 22 | How this page is calculated | inline `<details>` | — | `view-progress-hub.js` | — |

Rows 13–16 sit under the "More detail" heading; rows 17–21 are footer links
appended after it with no heading. The router also holds `hybrid-score`, but no
hub entry links to it (legacy deep link only).

### 16.8 H0 findings (Home and Progress)

| ID | Finding | Evidence | Severity | Target |
| --- | --- | --- | --- | --- |
| H-F1 | Home states two contradictory "week plan done" figures: the rail counts planned days (20%), the coach line counts completed stored set rows (100%). The same consistency value feeds the Hybrid Score pillar. | `week-strip.js`, `dashboard-model.js` `consistencyPct`; one fixture proves 20% vs 100% | **P0** | H2 / HM7 |
| H-F2 | Home answers "what should I do today?" with a workout title, not the work: no lift targets, no last-time numbers, and no way to move a planned day. | `today-card.js` title-only markup; no reschedule action in `js/` | **P1** | H2 / HM1–HM2 |
| H-F3 | The single insight is not strength-derived and is not deload/overtraining-aware; it can cheer "primed for a hard session" beside the overtraining card. | `dashboard-model.js` `pickTopInsight` priority list | **P1** | H2 / HM4 |
| H-F4 | Quick actions are Weight / Run / History, not empty workout / log a past session / one contextual action. | `index.html`, `home.js` quick-action block | P2 | H2 / HM5 |
| H-F5 | No explicit first-run Home state; offline is a note inside Today, not a page-level stale signal. | `today-card.js`, `home.js` | P2 | H2 / HM6 |
| P-F1 | The "one home per destination" guard cannot see the real hub: it checks `domains` + `secondary`, while the five fixed footer links are rendered outside both arrays. Six footer leaves duplicate a band and Review is reachable three ways. | `progress_landing.test.js`, `view-progress-hub.js` | **P1** | H4 / PG2 |
| P-F2 | "Year in Review" opens Review's Overview tab, which contains no year section; it should open Stats or the new Reviews/Year surface. | `view-reports.js` route, `analytics.js` tab force, `renderReviewOverview` | **P1** | H4 / PG4 |
| P-F3 | Zero of eight band headers drill down; no band-detail layer, no all-lifts index/search/stall flag and no Records row. | `band-kit.js`, `view-exercises.js`, `strength/records.js` | **P1** | H4 / PG3, PG5, PG6 |
| P-F4 | The hub still computes the retired four-domain dashboard and 12-week series on every render, while reading only `secondary`/`allEmpty`. | `analytics.js` hub render | P2 | H4 / PG9 |
| P-F5 | Scroll resets to top on every navigation, so Back from a band detail returns to the hub top rather than the band. | `app.js` `scrollTo(0,0)`, `navigation.js` | P2 | H4 / PG8 |

## 17. Workout logging (H3) and strength analytics (H4)

### 17.1 Logging gaps

Verify first; sources: openGym, Hevy.

| ID | Gap | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| G2 | Reps per side | `workout/load-basis.js`, `set-utils.js` | Log the total, show the per-side split, step targets so a side never gets a fractional rep; history and 1RM keep meaning the total | MISSING | Only load basis each/per-side/total exists; a set stores one `r`; no per-side rep model or stepper. |
| G3 | Log a past session | `run-logger.js`, `workout/one-off-session.js`, `activities.js` | From History: date, start time, duration, routine or freestyle, then the normal logger; if that day has a session, offer replace, keep both or cancel | PARTIAL | Backdated runs exist; strength sessions stamp today; no replace/keep-both/cancel when the day already has a session. |
| G5 | Closed-app rest alerts | `notifications.js`, `timers.js`, Android `ReminderScheduler` | Rest-timer alert while backgrounded or closed (Android), plus an optional reminder on planned-but-unlogged days, scheduled per calendar date and cancelled when the day is trained or moved. Native checklist applies; no network surface | PARTIAL | A fixed-time daily OS alarm exists; it is not planned-day, not cancelled by training, and the rest alert cannot fire while WebView timers are paused. |
| G7 | Favourite exercises | new `exercises/favourites.js`; picker/library read it | Star an exercise; favourites sort first in the picker and library | MISSING | No favourite field, star control, persistence or favourites-first sort anywhere. |
| G9 | Curated exercise core | `exercises/catalog.js` | Choose about 300–500 core exercises and give each reviewed instructions (66 reviewed today against ~5,700 entries). Ship in batches of 25. Do not expand the catalogue | PARTIAL | 66 reviewed core entries of 157; catalogue is 5,712; target is 300–500; the guard ratchets at >=32. |
| G10 | Explained targets | `engine.js`, `templates.js` | Every progression target states in one line why today's number is today's number | PARTIAL | Suggested-next and the recap explain themselves; today's `Target 4 × 8` has no why; deload explanation exists only on Home. |
| LG1 | Set-entry tap audit | `templates.js`, `workout.js`, `set-sheet.js`, `exercise-picker.js` | Count taps and seconds to log a set, add an exercise mid-session, replace an exercise, delete and undo a set. Remove avoidable taps. Never make the common path slower | MISSING | No tap/second audit or harness exists. Static trace: ghost values allow a one-tap tick; add/replace/delete each have avoidable steps. |
| LG2 | Ergonomics | `css/styles.css`, `ui/visible-viewport.js` | One-handed reach, keyboard and numpad behaviour, safe areas, large targets, no control hidden behind the keyboard | PARTIAL | 44px, contrast, safe areas and inputmode pass; keyboard inset is used only by the program builder, the set sheet uses 88vh, and there is no enterkeyhint or focus-scroll. |

G8 (demo size) and G6 (week start) live in H1; G4 (year heatmap) is in §17.2.

**Acceptance:** each closed item names the Part H flow it improves with
before/after tap counts; no flow regresses; metric owners stay unique; every new
metric has a regression test and an action.

### 17.2 Strength analytics gaps

Principle (§3): every surface answers what changed, whether it is meaningful,
what contributed, what to do, and how it was calculated. Do **not** add metric
families without an action. Verify what already answers each question.

| ID | Item | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| A1 | Stall detection | `engine.js`, `templates.js` | Per lift: flag a flat or falling estimated 1RM over N comparable sessions with the evidence and one suggested action | PARTIAL | Stall rule + evidence message exist and are tested; the message has no reader, the cockpit shows only a badge, and no analytics surface lists stalls. |
| A2 | Volume vs target per muscle | `analytics/volume-guide.js`, `muscle-load.js` | Weekly sets per muscle against the volume guide with under/over status and one action | PARTIAL | Weekly credited sets vs MV/MEV/MAV/MRV with zones; no action by design; current-week only and no target band in the range view. |
| A3 | Strength trend | `analytics/strength-detail.js`, `strength-calcs.js`, `exercise-detail.js` | e1RM trend for main lifts over 4 weeks, 12 weeks, 1 year and all-time, with rate of change | PARTIAL | ROI, block PR and rolling-4 exist; the e1RM chart stops at 12w/6m/all (no 4w/1y) and ROI is program-week indexed. |
| A4 | Rep-range and intensity mix | new `analytics/intensity-mix.js` | Share of sets by rep range and by RIR/RPE band; shows whether training matches the goal | MISSING | No rep-range or RIR/RPE distribution owner; RIR is used only for sRPE/ATL. |
| A5 | Session vs last time | `session-recap.js`, `workout/session-review.js` | After a workout, compare to the last session of the same routine: volume, best sets, PRs | PARTIAL | Per-lift Last time/Next time/PRs exist; no session-level volume or best-set delta vs the previous session, and it is not routine-aware. |
| A6 | PR timeline | `strength/records.js`, `set-records.js`, `exercise-detail.js`, `year-review.js` | All-time PR table per lift plus a dated feed; baseline uses every earlier session | PARTIAL | Per-lift values, set records, dated per-exercise history and annual PRs exist; no all-time PR table with dates or cross-lift feed. |
| A7 | Muscle frequency | `analytics/muscles.js`, `muscle-load.js` | Sessions per muscle per week with the same period comparison as sets | PARTIAL | Credited sets and last-trained exist; no sessions-per-muscle-per-week series. |
| G4 | Year heatmap | `analytics/training-calendar.js`, `profile-stats.js` | Always-available year view shaded by time trained; tap a day for its recap; does not replace Year in Review | MISSING | Trailing heatmap only (26-week cap, default 12), shaded by volume/distance; no 52-week time view or day recap. |
| A8 | Relative strength | `profile-stats.js`, `athlete-profile.js` | e1RM divided by bodyweight per main lift, labelled as an estimate; hidden without recent weigh-ins | PARTIAL | Big-3 e1RM/BW + tier exists; the ratio is unlabeled, has no estimate wording, falls back to an undated session weight, and is not in Progress. |
| A9 | Long-range comparability | `analytics/ranges.js`, `progress-dashboard.js`, `exercise-detail.js` | Every strength domain has week, month, year and all-time views, so "is this working?" is answerable for a year | PARTIAL | Range vocabulary covers bands; strength volume has 4w–all; e1RM stops at 12w/6m/all and the legacy Strength screen is the only 4w–all home. |

**Data rules (unchanged):** Monday-based calendar weeks unless ST7 ships (then
the setting); never `state.currentWeek` in analytics; archived weeks count;
merge multiple slots per date; holds and carries are volume 0 but count as
working sets; estimates labelled; an empty range is a true zero.

### 17.3 H0 findings (logging and strength analytics)

| ID | Finding | Evidence | Severity | Target |
| --- | --- | --- | --- | --- |
| L-F1 | The closed-app rest alert cannot fire in the state it names: the only native rest call sits inside the JS interval and Android pauses WebView timers in the background. The daily alarm that survives is fixed-time, not planned-day, and is never cancelled by training. | `timers.js`, `MainActivity.kt`, `ReminderScheduler.kt` | **P1** | H3 / G5 (device half `[You]`) |
| L-F2 | A1's evidence text is dead code: the model builds "3 comparable sessions over N days … hold the load and review recovery", but nothing renders it; the cockpit shows a badge only and no analytics surface lists stalls. | `engine.js` diagnostic message, `templates.js` badge | **P1** | H4 / A1 |
| L-F3 | A4 has no owner at all. RIR/RPE is captured per set and used for sRPE/ATL, but no module distributes rep ranges or effort bands. This is the largest H4 scope risk and feeds H5. | repo-wide grep; `workout/effort.js` readers | **P1** | H4 / A4 |
| L-F4 | The strength analytics H4 depends on are orphaned by the P8 restructure: Lifetime PR/ROI/projection, 4w–all volume details and goal/PR rows live behind the legacy `strength` context, reachable only from Home's hybrid mini card. The hub has no strength/volume band. | `view-strength.js`, `progress-dashboard.js`, `hybrid-dashboard.js` | **P0 navigation** | H4 / PG3, PG5, A3, A6, A9 |
| L-F5 | G2 and G3 are schema/date risks, not UI rows. Reps are one `r` with no per-side field; strength sessions stamp `now`. A backdated strength flow reusing the run slot resolver would write into the active activation, the cross-run leak `arch:` weeks exist to prevent. | `set-utils.js`, `one-off-session.js`, `run-logger.js` | **P0 design** | H3 / G2, G3 |
| L-F6 | The replace-exercise sheet says "Use the full list below" but contains no full-list control; the G9 guard ratchets at >=32 while 66 entries ship. | `exercise-picker.js`, `exercise_catalog.test.js` | P2 | H3 / G7, G9 |

**H0 metric-owner conclusion:** every existing metric calculation already has a
test; no untested calculation was found. The gaps are missing features and
unreachable/dead surfaces, not unverified arithmetic. H0 therefore adds the two
inventories and the finding register rather than a redundant test.

## 18. Queued and deferred (H5–H8)

### 18.1 Strength progression coaching (H5)

G11 / S2: progressive-overload suggestions and a periodic progress report from
logged performance, with deloads and Undo. Builds on A1, A3, A4 and G10.

### 18.2 Running matrix (H6, DEFERRED — owner not running)

Do not verify, build or change running features now, other than a no-regression
smoke check when shared code (sessions, calendar, imports) is touched. When
resumed, verify each row first:

| ID | Feature | Target behaviour |
| --- | --- | --- |
| R1 | Run logging | Live GPS and manual entry on the shared session model |
| R2 | Structured intervals | Warm-up/work/recovery/cool-down with pace or HR targets, shown live |
| R3 | Zones | Pace and HR zones from user thresholds; time-in-zone |
| R4 | Volume and trend | Weekly distance, long run, same-weekday comparison |
| R5 | Best efforts and PRs | Fastest 1 km, 1 mi, 5 km, 10 km with persisted evidence |
| R6 | Race-time estimate | Labelled estimate with inputs; hidden when data is sparse |
| R7 | Efficiency trend | Pace-to-HR efficiency for comparable easy runs |
| R8 | Imports | FIT/CSV/Health Connect attributed to the real day; re-import refused by identity |
| R9 | Plan integration | Planned vs completed run, adherence |
| R10 | Run recap and share | Short review and PNG card from the same figures |

Running data rules: calendar dates only; a 5 km + 10 km day is 15 km; strength
+ run is two sessions; units follow settings; estimates labelled; no GPS routes
or photos in the training-context export; no new network surface.

### 18.3 Hybrid intelligence (H7)

HY1 interference-aware scheduling (configurable heuristics, never blocking,
always "because"); HY2 load-change signal on the existing sRPE reader (never
called an injury predictor); HY3 goal mode (race date or lift targets, taper,
maintenance floors); HY4 move/missed-session replanning; HY5 hybrid weekly
review reusing `analytics/hybrid-balance.js`. HY6 (single readiness owner) is
already in H2 via HM7.

### 18.4 Platform (H8)

L14 ongoing notification with set and rest controls; S10 widgets. No watch app
promise. **Parked decisions:** bring-your-own AI coach (breaks the "no new
network surface" rule if it calls out); cloud sync, accounts, iOS, public
release (§8, §11).

## 19. Measuring the bar

Replace the unfalsifiable "on par with Hevy" with these flows, measured as taps
and seconds on a real phone and recorded in a table (flow, openHybrid before,
openHybrid after, Hevy, openGym, date). The owner supplies the Hevy and openGym
numbers.

1. Change the weight unit.
2. Find a setting by name (search).
3. Start today's planned workout from a cold open.
4. Log a working set with previous values shown.
5. Add an exercise mid-session.
6. Review one lift's progress.
7. Review last week.
8. Open the month recap.
9. Find a past PR.

A PR may not make any flow slower. Keep a dated **friction log** from real
training weeks and promote recurring entries into the phases above.

### 19.1 H0 baseline table

H0 records the baseline here. openHybrid numbers are measured on the owner's
phone; Hevy and openGym numbers are owner-supplied. Blank cells are **pending**,
never assumed.

| # | Flow | openHybrid before | openHybrid after | Hevy | openGym | Date |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Change the weight unit | pending | — | pending | pending | — |
| 2 | Find a setting by name | pending | — | pending | pending | — |
| 3 | Start today's planned workout from cold open | pending | — | pending | pending | — |
| 4 | Log a working set with previous values shown | pending | — | pending | pending | — |
| 5 | Add an exercise mid-session | pending | — | pending | pending | — |
| 6 | Review one lift's progress | pending | — | pending | pending | — |
| 7 | Review last week | pending | — | pending | pending | — |
| 8 | Open the month recap | pending | — | pending | pending | — |
| 9 | Find a past PR | pending | — | pending | pending | — |

**`[You]` task:** run each flow on the phone and on Hevy/openGym, record taps,
seconds and the date, and commit the filled table before H1 closes. The agent
can produce the interaction trace and a screenshot checklist; it cannot claim a
device timing it did not measure.

### 19.2 Friction log

| Date | Flow | Friction | Promoted to |
| --- | --- | --- | --- |
| — | — | — | — |


## 20. Roadmap v2 working rules

- One tracker: this file. No parallel checklist or audit file.
- Verify before building. Never rebuild a verified ✅. Never mark ✅ without a
  test or a check you actually ran.
- Additive data only. Anything logged or saved before a change must read
  identically after it. Never write derived effort. Migrations need a backup
  path and an `AGENTS.md` note.
- One owning module per metric and per setting. Two owners is a defect.
- Calendar analytics use real dates; programme progression uses programme week.
- Estimates stay labelled. Every bug fix and new metric adds the smallest
  useful regression test.
- Clean-room only: no copied Hevy, openGym or Apple code, assets, media, icons
  or visual identity. openGym is AGPL-3.0; copied code would bring those terms.
  Use them as behavioural references only.
- Update roadmap status and the session log in the same commit as the change.
  Keep the log to the last ten entries.
- When a phase is functionally complete but below the §10 bar, stop and report
  the exact gaps instead of merging.

## 21. Session log

- **2026-11-24 — H0 verified: three audits, two inventories, and the P0 findings.**
  - All 47 C/D/D.2/E rows resolved to DONE/PARTIAL/MISSING with owners and
    evidence. ST1 is recorded in §14.7 and PG1's 22-entry destination map in
    §16.7; the Part H baseline table is in §19.1 with device numbers `[You]`.
  - P0 findings: S-F1 (onboarding equipment answer destroyed at boot), S-F2
    (back-dated weigh-in wins and loads stale bodyweight), S-F4 (weight-unit
    switch relabels history), L-F4 (strength analytics orphaned behind the
    legacy screen) and L-F5 (backdated strength schema/date risk). H1 starts
    with these before the registry.
  - No product code changed in H0. The audit found no untested metric
    calculation; the gaps are missing features, dead surfaces and navigation.

> Entries before the last ten are kept verbatim in `docs/ROADMAP_ARCHIVE.md`.

- **2026-11-24 — Roadmap v2 adopted: Settings/Profile first, strength-first.**
  - Owner priorities, the H0–H4 phase queue, Settings/Profile IA, Home,
    Progress restructure, logging/strength analytics, queued H5–H8, the Part H
    flow measures and the working rules are merged as §13–§21.
  - Part A hygiene: the stale baseline is replaced by current gaps; DONE phases
    carry gate-evidence lines (tap counts are explicitly pending); CP/EP phases
    are renamed; the feature matrix gains a Decision column and `◑ reframed`;
    CP6's native leftovers move to H8.
  - No product code changed. **H0 — verify and audit** is next.

- **2026-11-24 — Phase 7 starts: the Week in Review shares a real PNG card.**
  - Overview and Stats both offer **Share week**, drawn by the one share
    pipeline (`drawProgressCard` → `shareImageCanvas`) from
    `weeklyReviewShareRows`. The rows are the week's own totals; a historical
    week omits plan adherence and next-week focus, and a week with no training
    has no share action at all rather than a card full of zeros.
  - The browser check opens Review from the Progress footer, switches to
    Overview and asserts a real `openhybrid-week-YYYY-MM-DD.png` download.
  - The offline path got two guards after an unresolved-merge-marker `sw.js`
    (from branch resolution, not product code) made `navigator.serviceWorker.ready`
    hang until the per-check kill: a precache test now rejects conflict markers
    in `sw.js`, and the Running check races `.ready` against a 15s failure so a
    broken worker reports its cause instead of timing out.
  - Next Phase 7 slices: calendar share card, reduced motion/text scaling,
    export/import for routine and measurement metadata, large-library checks.

- **2026-11-24 — Phase 6: S2 adaptive trainer landed; only native surfaces remain.**
  - **Onboarding now asks for a typical session length** (30/45/60/75+ min). The
    starter recommender uses it and the existing weekly-frequency answer, so a
    6-day 75-minute block cannot lead for a 3–4 day 30-minute athlete. The
    category filter still comes from the goal, so time cannot hand an endurance
    athlete a powerlifting plan.
  - **Adaptation stays explicit.** Working loads adjust through the cockpit's
    per-lift diagnostics; deloads and progression shapes are visible edits with
    Undo. Nothing silently rewrites the plan or logged training. S2 is DONE.
  - **Phase 6 remains ACTIVE only for L14 (Android live activity) and S10
    (widgets)** — both native, device-checklist work.
  - Tests: the recommender's frequency/session-length ranking; existing engine,
    progression, deload and Undo coverage remains green; browser suite unchanged.

- **2026-11-24 — Phase 6 starts: a compact training context, not a connector.**
  - **Settings → Data → Export Training Context (JSON).** The file carries the
    athlete's stated goals/settings, the active plan at its current week (using
    the same `liftTarget` as the cockpit), the last eight weeks of weekly totals
    and up to 24 dated training days with exact completed sets/runs. It has a
    format and version, and is deliberately not a backup.
  - **Privacy is the shape of the file.** No name, session/exercise notes,
    links, GPS routes, photos, body tape/body fat or Health Connect records are
    read into it. The unit is labelled; a bodyweight read is included only as
    the latest weigh-in.
  - **The return path already exists.** Plans → Import plan (.json) accepts a
    plan produced externally; no OAuth, hosted service, connector or new network
    surface was added. S3/S4 are DONE.
  - Tests: goals/plan week, exact sets/runs, notes/routes/photos/health absent,
    24-session cap with an honest omission count, undated/out-of-window sessions
    excluded, filename date.
  - **Phase 6 remains ACTIVE for L14 (Android live activity), S10 (widgets) and
    S2 (adaptive trainer).**

- **2026-11-24 — Phase 5 finished: the month and year share the same evidence.**
  - **Training Report → PNG card.** The existing Share action now draws the
    sessions/volume/distance/score/fitness/adherence figures from the SAME
    `buildCalendarMonthReport`/`buildYearReport` model the screen renders, and
    attaches the report text as the caption. No figures are re-derived.
  - **Year in Review → Share year.** A trained year offers an image card built
    from `buildYearInReview` totals, best month and PR count, with the same
    seasonal boundaries and honest partial-year range.
  - **Both use one image pipeline.** `shareImageCanvas` now saves through
    `saveBinaryExport`: the old `data:` anchor was blocked by the app's CSP, so a
    Share tap silently did nothing in the installed PWA. Android uses the native
    binary bridge; the browser downloads a real PNG.
  - The browser contract now forces the Web Share fallback, downloads the
    Training Report and Year in Review PNGs, and asserts their filenames at
    320/390/412.
  - **Phase 5 is DONE.** Next: Phase 6 — platform and intelligence.

- **2026-11-24 — Phase 4 finished: the routine library gets categories and a filter.**
  - **Routines can be filed by context.** A fixed vocabulary — at home, travel,
    dumbbells, band, cardio/HIIT, gym, bodyweight, suspension, other — is optional
    metadata. The `•••` menu opens a 44px category sheet; the card shows a small
    category chip; an unknown imported category is stripped without dropping the
    routine.
  - **The routine list can be filtered without hiding the library.** A native
    44px select shows only categories that actually contain routines, filters the
    flat list and the folder sections, hides folders with no matches while a
    filter is active, and offers Show all routines when nothing matches. The
    filter is ephemeral and resets on tab entry.
  - **It is organisation only.** Categories and filtering never rewrite
    `state.weeks`, the active program, the program week, folders or logged
    training. The category sheet and filter are covered by the real routines
    browser check (set → chip → filter → All) plus store/import tests.
  - **Phase 4 is DONE.** Next: Phase 5 — the monthly report share card and the
    Year in Review share image.

- **2026-11-24 — Phase 2 finished: calendar month, best weekly streak, and three honest decisions.**
  - **The Training Report is now the current calendar month.** `buildCalendarMonthReport`
    compares 1–N of this month with 1–N of the prior month (full prior month when
    this month is complete), so a partial month is never measured against a full
    one. The toolbar reads “This month” / “12 months”; the 28-day rolling builder
    remains exported for its own regression tests and a future trailing preset.
  - **Pulse reports the best weekly streak beside the current one.**
    `streakWeeks` now scans all trained Monday-weeks once, returning current,
    at-risk and historical best; the band only prints “best N” when it is
    genuinely higher, so a current record is not duplicated.
  - **P2, P6 and P10 closed by decision, with reasons in the matrix:**
    gym performance is answered across Pulse/Muscles/Main exercises rather than a
    duplicate screen; muscle distribution stays in credited sets because
    sessions/duration double-count a compound set across muscles; the training
    calendar stays at 12 weeks because 52 columns cannot fit a phone, with Year in
    Review owning the year. P10’s other half — best weekly streak — is implemented.
  - Tests: calendar-month partial/complete/empty cases and the best-weekly-streak
    gap case. Hub browser contract re-run after the UI changes.
  - **Phase 2 is DONE.** Next: Phase 4 — the routine library’s categories and
    filters (Phase 3 was already complete).

- **2026-11-24 — Phase 1 closed by decision; Phase 2 starts with one-muscle focus.**
  - **Phase 1 is DONE.** Volume is deliberately not a separate trophy: set
    volume is weight × reps and is already represented by the load/rep records,
    while a volume badge would reward adding sets rather than better
    performance. Detection covers e1RM, holds (duration), carries and reps.
  - **The Muscles band can focus one muscle.** A native 19-option select (44px,
    no chip wall) filters the chart, headline, legend and text table to that
    muscle while keeping its rank and share of credited sets in view. Grouping
    Week/Month/Year still applies; All muscles restores the six-group + Other
    stack. The focus is ephemeral and resets on hub entry, like the range.
  - `tests/muscles_view.test.js` covers the focused chart, rank context, exact
    table and unknown-key fallback. The Progress-hub browser check now selects a
    muscle, asserts the focus sticks and resets, at 320/390/412.
  - Next: P3 (calendar-month wording), P6 (distribution currency) or P10 (year
    zoom) in Phase 2.

- **2026-11-24 — Phase 0 truth pass, then the last Phase 1 switches.**
  - **The matrix is now verified rather than assumed.** Every row was checked
    against its owning module and tests. Owners that had moved were corrected
    (P1 → the band composer, PR → `strength/records.js`, active day →
    `analytics/logged-days.js`, streak week → `analytics/pulse.js`), and every
    `◐`/`○` row now names its gap in a new Gap column. Phase 0 is DONE; no
    product code changed for it.
  - **A workout keeps the screen awake.** `js/workout/keep-awake.js` requests the
    Screen Wake Lock only while the workout tab is visible and the session is
    running. Leaving the tab, finishing, discarding, or turning the new
    `settings.keepAwake` switch off releases it; an unsupported/denied platform
    is silent. A held lock is never requested twice, and a late request after
    the tab closed is released immediately.
  - **Live PR now has an explicit preference.** `settings.livePR` (default on)
    silences the banner and haptic only: `detectSetPR` still shows the badge and
    persists `isPR`/`prKind`, so history is identical with the switch off.
  - **Phase 1 is DONE.** Volume is deliberately not a separate trophy: set
    volume is weight × reps and is already represented by the load/rep records,
    while a volume badge would reward adding sets rather than better
    performance. Detection covers e1RM, holds (duration), carries and reps.
  - Tests: `tests/keep_awake.test.js` (unsupported/off/active/idempotent) and
    the new `pr_surfaces` case (banner off, record still written); settings
    wiring is green because both switches have real handlers.
  - Next: Phase 2.
