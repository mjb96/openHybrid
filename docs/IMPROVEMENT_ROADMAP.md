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

> **Theme colour system — A3 and Part B complete; default palette approved 25 Nov 2026.**
> The A0 audit (`docs/audit/theme-colour-audit.md`) inventoried 3,590 literals.
> A1/A2 shipped the three-layer token system: `css/tokens.css` (primitives →
> semantic → personality) and `js/theme/tokens.js` (`resolveThemeTokens`,
> `applyThemeTokens`, `useThemeTokens` with `theme:changed`).
> **A3** applies it. Surfaces, text, borders, overlays, accents and data colours
> in the shipped CSS are now tokens or `color-mix` over tokens; the old indigo
> brand accent is gone (cyan/teal is the accent, and `--domain-strength` keeps
> the periwinkle labels), and 415 colour fallbacks were removed. Every chart
> module is literal-free — series, grids, axes, goal lines and dots read the
> semantic layer, so a chart flips with the theme. The in-app celebration canvas
> resolves tokens with `resolveThemeTokens`; exported share cards keep a fixed
> dark brand palette on purpose (they are art, not UI).
> Light mode is repaired, not just re-tinted: the legacy `--text-inverse` alias
> collision (white text on white sheets), `color-scheme: light`, the light brand
> block, light nav/gradients and the UA button face on nav items are fixed, and
> `theme-color` is synced from the resolved token at runtime.
> **Guard rails:** `scripts/theme-literal-check.mjs` is a ratchet in
> `npm run verify` — **1,750 literals remain across 57 files** (down from 3,590),
> mostly shadow stacks, one-off light overrides and the deliberately branded
> share art; no file may exceed its recorded ceiling.
> `tests/theme_contrast.test.js` pins WCAG AA for Midnight, Slate, Forest, Ember
> and Light.
> **Part B** ships Slate, Forest and Ember as full semantic palettes: a block in
> `css/tokens.css` plus an identical `PALETTE_TOKENS` map in
> `js/theme/tokens.js`, consulted by `resolveThemeTokens`. Only surfaces, text
> and the accent change; status/data colours stay constant, and light mode keeps
> its own palette (a choice is remembered for dark). `scripts/theme-screenshots.mjs`
> covers Home/Train/Settings for each palette, and the visibility check audits
> every mode at 390.
> **Contrast is now measured.** `docs/audit/ui-contrast-audit.md` records the
> audit that followed: 63 failing text runs (worst 1.11:1) across Home, History,
> Progress, Plans, Settings, Profile, Train and the cockpit, in light and all
> four dark palettes, at 390 and 320. `scripts/contrast-audit.mjs` measures AA
> against the backdrop actually painted behind each text run — compositing
> alpha text and treating a gradient as a set of candidate stops — and runs in
> `browser:verify` against a ratchet that fails only on new or worse rows.
> Fixes were colour-only and removed literals: status **text** tokens (a status
> hue on its own tint was 1.65:1), filled-button ink from `--on-accent`, one
> placeholder rule instead of the UA default, day-cell and badge dimming moved
> off the label and onto the dot/icon, and two invalid `color-mix(… 6200%)`
> fills that silently resolved to black on every dark card.
> **The dark surface ladder moved for all four palettes:** cards are borderless
> and separated by a 1.17–1.18:1 step (was 1.07:1 behind a 1px hairline), and
> `--text-3` was lifted with the surfaces. `tests/theme_contrast.test.js` now
> pins every text token against `bg`/`surface-1..3` in all five palettes, and
> `tests/light_override_guard.test.js` ratchets raw colours inside light-theme
> rules.
> Open: the remaining 1,544 literals (share art, shadow stacks, one-off light
> overrides — 180 raw colours still sit inside light overrides and may only
> fall), and Progress detail screens are not yet driven by name in the audit's
> `--full` tier.

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
| ST2 | **Declarative settings registry** | `js/settings/registry.js`, `js/settings/store.js` | One registry (id, label, type, group, footer, search keywords, default, migration). Screens and search render from it; no setting exists outside it. Test: every stored key is in the registry | DONE | 65 descriptors now render the 13 Settings pages and profile editor through `js/settings/render.js` and `js/settings/components.js`; search and summaries read the same registry; `js/settings/store.js` validates writes, batches, resets and syncs. The registry test gates every stored key and default. |
| ST3 | **Settings search** | `js/settings/render.js`, `js/settings/registry.js` | Matches labels, footers and keywords; result opens the exact row with the group in view | DONE | Search is one field under the profile card. It matches registry labels and keywords, tolerates an in-order subsequence ("thm" → Theme), shows the section › page path, and selecting opens the page and pulses the exact row. Settings is tap 1 from Home. |
| ST4 | **Contextual shortcuts** | `settings.js` + owning surfaces | Gear or "Settings" links from the logger, Plans and Progress open the relevant detail screen and edit the same value (never a second copy) | DONE | The router forwards `data-page`/`data-anchor` to `openSettings`, and the surfaces link to the page that owns the value: Progress and Measures → **Units & language** (`once.units`, the same measurement/weight unit), Plans → **Equipment** (`once.equipment`, the kit a plan is built around). The logger keeps the registry-driven Workout settings sheet (`open-workout-settings`), so no value has a second writer. Tests: `contextual_settings_links` (router forwarding + each page target + the logger sheet); the Progress-hub, Measures and Plans browser checks open the real pages. |
| ST5 | **Profile redevelopment** | `settings.js`, `onboarding.js`, `equipment-profiles.js` | Per §14.3; migrates existing profile data losslessly | DONE | Profile now leads with editable Identity, Body metrics (weigh-in, height, DOB, sex, target/rate) and Training goal groups, with links to weight history and Measures. Schema v17 adds the optional fields as null; the weigh-in writes the canonical `bodyWeightLog` and stays in sync with Home. |
| ST6 | **Units and formats** | `settings.js`, `measurements-sheet.js`, `metrics/weight-unit.js` | One Units screen; every surface follows it (§10 rejects hard-coded units); unit toggles change display only, never stored values | DONE | **Weight is canonical kilograms.** `js/metrics/weight-unit.js` owns both boundaries; the v17→v18 migration converts an existing lbs state exactly once and stamps `state.unitBasis='kg'` (idempotent), and `setWeightUnit` is now display-only — no confirm, no rewrite, no recovery copy. Every weight-shaped value converts: set loads, bodyweight/target, `prGoals`, prescriptions, `progressionIncrement` and a weight-based `rateGoal`. Distance (km) and tape (cm) were already canonical; plate setups and dumbbell/machine/band ladders stay per-unit UI data by design. Exports are unambiguous: training CSV `WeightKg`/`BodyWeightKg`, bodyweight CSV `Date,WeightKg`, importers accept both and store kilograms. `scripts/weight-unit-browser-check.mjs` proves a typed 225 lb persists as 102.06 kg while a stored 90.72 kg reads "200" on Home and in the weigh-in sheet. Time/date format remains a separate, unbuilt item (not weight). |
| ST7 | **Week start (G6)** | `settings.js`, `analytics/weekly-aggregate.js`, `dates.js` | Monday or Sunday; rail, calendar and every "this week" total follow it. Touches the Monday-only data rule: needs a migration note, a backup path and tests across Pulse, Muscles, reports and Year in Review | DONE | `calendarWeekStart(date, weekStartDay)` is the one rule; `weekStartOf`/`weekKeyOf` resolve the setting through one projection applied on every `app:storage-loaded` (boot, import, Settings change), so Home's rail, History, bodyweight, Pulse, the week chart, strength volume, Muscles, Balance, Reports and the Year heatmap share it. Changing it repaints immediately (S-F3), and the weekly-summary notification follows the week end. **Program weeks stay Monday plan indices** (`startOfProgramWeek`, `weekSchedule`) by design. **No migration:** stored dates are already real calendar days, so the setting only changes bucketing and reverting restores the Monday view. Tests: `week_start` (both starts; Pulse, strength-week and Weekly Review attribution; Home rail; weekday labels; program anchor; wiring), `notifications` (week-end instant), and the Progress-hub browser check drives the real Settings control and asserts the rail + Pulse range change without a reload. |
| ST8 | **Appearance and feel** | `settings.js`, `theme.js`, `ui/motion.js`, `ui/text-size.js`, `haptics.js` | Theme, text size, reduced motion, haptics, sounds, demo size (G8) on one screen | PARTIAL | Theme, palette, System/Reduce/Full motion, **text size** (Default / Large / Extra large scaling the root font) and **haptics** (on/off for set/PR feedback) now share Look & Home. Sounds still live with the rest timers they belong to (Training → Logging), and demo size (G8) is not built. Tests: `text_size` + a static wiring guard; the Settings browser check toggles Extra large and asserts the root font grows.
| ST9 | **Data safety screens** | `settings.js`, `portability/auto-backup.js`, `photos/library.js` | Backup status, last backup, restore, export; honest about what each does and does not carry (photos are device-local) | DONE | Settings → Data now states the **last manual backup** (Today / Yesterday / N days ago) and gives one calm warning at 7+ days or when none exists. The timestamp is root metadata (`lastBackupAt`), written only after the platform confirms a saved/started export — never after a cancel or failure — and it is not a setting, so it never appears in the settings registry. Automatic backup keeps its own status/time; progress photos stay device-local with the Measures zip. Restore remains the JSON import + the previous-import snapshot. Tests: `backup_status` (wording, ISO timestamps, stale line, junk) and a static wiring guard. |
| ST10 | **Destructive actions** | `settings.js`, `ui/confirm-modal.js` | Reset and delete-all behind an explicit two-step confirm with a plain description of what is lost; recoverable actions use Undo instead (§4.5) | DONE | Delete-all now requires typing DELETE after the first confirmation; the Data page shows every export beside it. Simple pages have a confirmed Reset to defaults with an Undo snackbar; Units is excluded so a reset cannot relabel history without conversion. |
| ST11 | **Notifications screens** | `settings.js`, `notifications.js` | UI and preferences only; delivery work is G5 in H3 | PARTIAL | Four toggles + two time pickers exist. The master switch is now `settings.notificationsEnabled` and survives reload (S-F5); no planned-day preference yet. Delivery is G5. |

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
| `weekStartDay` | Training card | `mon` | `settings.js` | every calendar surface via `calendarWeekStart` (Home rail, History, bodyweight, Pulse/analytics); program weeks stay Monday | move to Units; S-F3 closed by ST7 |
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
| S-F1 | **Fixed 24 Nov (#319):** onboarding now writes its equipment answer through `applyActiveEquipment`, so boot reprojects the profile without reverting it. | `equipment-profiles.js`, `onboarding.js`, `tests/equipment_profiles.test.js` | Resolved | H1 / ST5 |
| S-F2 | **Fixed 24 Nov (#319):** both readers use `latestWeighIn`, which orders by date and still accepts legacy undated readings. Back-dated entries no longer become current. | `metrics/bodyweight.js`, `workout/set-mutations.js`, `settings.js`, `tests/bodyweight_current.test.js` | Resolved | H1 / ST5 |
| S-F3 | **Fixed 27 Nov (ST7):** every calendar surface now resolves `settings.weekStartDay` through one rule (`calendarWeekStart`), the change repaints immediately, and the weekly-summary notification lands at the athlete's week end. Program weeks stay Monday plan indices. | `js/dates.js`, `js/analytics/weekly-aggregate.js`, `js/app.js`, `js/settings.js`, `tests/week_start.test.js` | Resolved | H1 / ST7; one calendar-week owner + tests |
| S-F4 | **Fixed 24 Nov (#321); superseded by ST6 27 Nov:** the switch used to convert stored weights behind a confirmation and recovery copy. Storage is now canonical kilograms, so the switch rewrites nothing and needs neither. | `metrics/weight-unit.js`, `settings.js`, `tests/week_start.test.js`, `tests/canonical_weight.test.js` | Resolved | H1 / ST6 |
| S-F5 | **Fixed 24 Nov (#319):** `settings.notificationsEnabled` is the persisted master switch; a granted OS permission alone never arms reminders, and switching off cancels the native alarm. | `state.js`, `notifications.js`, `settings.js`, `tests/notifications.test.js` | Resolved | H1 / ST11 |

### 14.9 Settings & Profile rebuild — Phase 0 audit (25 Nov 2026)

**Status: AWAITING APPROVAL — no UI has been written.** The full setting-by-setting
matrix, entry-point audit, proposed 13-row IA, profile-field map and
dead/duplicate/conflicting list live in
`docs/audit/settings-profile-rebuild-audit.md`.

- **48 settings keys** under `settings.*` all map to a page; 3 settings-like root
  values (`thresholdPaceSeconds`, `prGoals`, `healthConnect.stepGoal`) need a
  registry descriptor that can point outside `settings`.
- **Entry points:** Home avatar → Profile → gear → Settings modal. The Home
  sliders button opens **Customize Home**, not Settings. No `/settings` or
  `/profile` URL exists, no PWA shortcut, no cockpit gear and no browser back
  through Profile.
- **Dead stores:** `settings.recoveryFeel` (write-only), `state.profileSections`
  (never read), `state.dashboardTiles` (legacy Home-layout store beside
  `settings.ui.home`). `weeklyFrequency`/`sessionMinutes` are written by
  onboarding and read nowhere.
- **Duplicates/conflicts:** `defaultBodyWeight` vs `bodyWeightLog`;
  `fastingDefault` vs `fastingSession.goal`; `equipmentTier` not re-derived;
  `equipment`/`bandWeights` projections; theme+palette will migrate in Part B;
  the requested module vocabulary (strength/running/analytics/wellness) does
  not match the stored `running`/`fasting`/`health`/`recovery` switch ids.
- **Missing for the requested IA:** height/DOB/sex/training-start fields,
  date/time/number/pace formats, last-backup timestamp, Watches, AI Coach and
  Strava. No current calculation uses height/sex/DOB, so storing them would be
  display-only until a formula exists.
- **Proposed top level (13 rows + profile card + search):** Training (Workout,
  Timer alerts, Plan & schedule, Reminders) · Set once (Units & language,
  Equipment, Look & Home, Modules) · Connections (Watches, Integrations, AI
  Coach) · Data & backup · About.
- **Decisions requested:** remove/revive the four dead stores; where
  `fastingDefault` lives; whether PR goals live on Profile or Workout; add
  height/DOB/sex now or later; add format keys now or defer; show or omit
  Watches/AI Coach/Strava; derive equipment tier; confirm the pushed-route tab
  bar behaviour.

Phase 1 starts only after approval: navigation + `/settings` route +
redirects + hidden tab bar + Settings shell. Phase 2 adds the typed registry,
store, validators and migrations; no control renders before those exist.

### 14.10 Settings & Profile rebuild — Phase 1 (navigation shell)

**Status: DONE for the navigation slice.** No setting was moved or removed; the
old cards remain inside the route until Phase 4 replaces them.

- **Home header:** the avatar is gone. A 48px gear opens Settings directly; the
  sliders button still opens **Customize Home** and is the same Home-layout
  control that will live under Look & Home.
- **Route:** full-screen `#/settings` with a 48px back chevron labelled **Home**.
  The hash token is the `/settings` route because the app is a static PWA
  (GitHub Pages sub-path + Android WebViewAssetLoader); a History-API path
  cannot be refreshed without a server rewrite. `#/settings/profile` is the
  Profile sub-page.
- **Profile:** reached only from the Settings profile card. The old
  `open-profile` action and `#profile` hash redirect to `#/settings/profile`.
- **Tab bar:** hidden on Settings and Profile, restored on Home.
- **Back:** browser/system Back and the chevron pop one level
  (Profile → Settings → Home) and restore Home's scroll position.
- **Profile content:** the existing athlete profile renders into the Settings
  sub-page (`settingsProfileContent`) with its own back control; no second data
  store.

**Not done yet:** the 13-row IA, registry renderer, search index, validators,
gym-profile sub-page, contextual workout sheet, deep links into individual
settings, and visual redesign. Those are Phases 2–6. **Known decision:** the
brief writes `/settings`; the implemented token is `#/settings` for static
hosting. Approve the hash or add a server/404 rewrite before Phase 6.

### 14.11 Settings & Profile rebuild — Phase 2 (registry + store)

**Status: DONE for the registry/store/migration slice.** No card was rewritten
and no stored key was deleted.

- **Registry:** `js/settings/registry.js` now has **57 descriptors** covering all
  48 `settings.*` keys, the three settings-like root paths
  (`thresholdPaceSeconds`, `prGoals`, `healthConnect.stepGoal`) and the three
  legacy stores (`recoveryFeel`, `profileSections`, `dashboardTiles`, marked
  `deprecated`). Every renderable entry has a section/page in the 13-row IA,
  keywords, type/default and a summary formatter; entries may declare
  `visibleWhen` and `enabledWhen` with a one-line disabled reason.
- **Store:** `js/settings/store.js` is the validated write path: `get`, `set`,
  `setMany` (atomic), selector `subscribe` by key/page/section, `describe`
  (value/visible/enabled/reason/summary), `resetPage` with a returned undo
  snapshot, `restore`, and `snapshot`. Writes persist through the existing
  `saveStateToLocalStorage`. Cross-tab `storage` events copy registered setting
  values only — never training history — into the live state.
- **Migrations:** `snapshotBeforeMigration` writes the exact pre-upgrade bytes
  to `<state>_pre_migration` before any ordered migration runs. Import already
  writes its `<state>_backup` before replacing live data.
- **Tests:** `tests/settings_store.test.js` covers validation-before-mutation,
  atomic batches, root paths, selector subscriptions, reset/undo, cross-tab
  isolation and the migration snapshot. The registry test now asserts every
  default passes its validator and every summary is throw-free. `npm test`
  passes 2,709 tests.
- **Not done yet:** the existing cards still write `appState` directly; Phase 4
  switches them to the store. The remaining Phase 0 decisions (dead-store
  removals, `fastingDefault` home, PR-goal home, optional personal fields,
  format keys, Watches/AI Coach/Strava, equipment-tier derivation) are still
  open.

### 14.12 Settings & Profile rebuild — Phase 3 (shared components)

**Status: DONE for the component layer.** No page was rebuilt; Phase 4 composes
these components into the 13-row IA.

- `js/settings/components.js` is the one builder set: `settingsPage`,
  `settingsGroup`, `settingsRow`, `toggleControl`, `segmentedControl`,
  `stepperControl`, `sliderRow`, `timeControl`, `textControl`, `selectList`,
  `pickerSheet`, `dangerRow` and `mountCollapsingTitle`.
- Rows are 64px with a 36px rounded-square icon tile, inset hairline dividers,
  a one-line truncated summary, a chevron only for drill-downs, and an explicit
  disabled reason. Toggles keep a 48px hit area around a 42×24 track; segmented
  options are 44px; steppers, inputs, time fields and the back control are 48px.
- `css/settings.css` uses the app's existing semantic tokens only (no hex/rgb),
  is linked in `index.html` and hand-listed in the precache CORE set.
- `tests/settings_components.test.js` pins structure, escaping, accessible
  names, the disabled contract and the no-literal-colour rule. A new
  `settings-components-browser-check` renders the real module at 320/390/412 in
  light/dark, measures every target and proves the title collapses.
- **Not done yet:** no user-facing page uses the components; Phase 4 replaces
  the legacy cards. The Phase 0 decisions remain open.

### 14.13 Settings & Profile rebuild — Phases 4–8 (pages, profile, links, data)

**Status: implemented and browser-checked.** The legacy cards are gone; the
Settings route now renders the 13-row IA from the registry and shared components.

- **Top level:** profile card, instant search and the five groups (Training,
  Set once, Connections, Data, About) → 13 pushed pages.
- **Pages:** Workout, Timer alerts, Plan & schedule, Reminders, Units &
  language, Equipment, Look & Home, Modules, Integrations, Data & backup,
  Watches, AI Coach and About. Rows use live summaries and dependency rules;
  equipment, Health Connect and backup actions keep their existing owners.
- **Profile (Phase 5):** the existing athlete page now leads with editable
  Identity, Body metrics and Training goal groups (name, weigh-in, height, DOB,
  sex, target/rate, goal/experience) plus links to weight history and Measures.
  Schema v17 adds those optional fields as null; nothing is estimated.
- **Search + links (Phase 6):** search matches labels/keywords across the
  registry, shows the page path and opens the exact setting with a pulse.
  `#/settings/<page>/<anchor>` restores the page and row on refresh. The active
  workout has a 48px gear that opens a workout settings sheet (rest timer, plate
  hints, warm-up, keep-awake, PR banners, active gym) and returns with the
  session intact.
- **Equipment (Phase 7):** multiple profiles with kit, bar/plates, pair counts,
  dumbbells, machine stacks and bands; one active profile, switchable from the
  workout sheet. Per-exercise rest overrides show Default vs Custom with a
  one-tap revert; other exercise defaults remain editable from the exercise card.
  Each simple page ends with a confirmed **Reset to defaults** and an Undo
  snackbar; Units is excluded because a unit reset must go through conversion.
- **Data & backup (Phase 8):** export JSON/CSV/context, import backup/CSV/FIT,
  auto-backup status, storage used, and a typed `DELETE` confirmation for the
  danger zone. Import still writes its pre-import backup and migrations keep the
  pre-migration snapshot.
- **Evidence:** `settings-nav-browser-check` covers every page, search, units,
  module gating, equipment, data and Health Connect; `settings-navigation`
  covers routes/back/scroll; `settings-contextual` covers deep links and the
  workout sheet; `settings-components` measures the component contract.
- **Remaining:** visual snapshot matrix and the final a11y/contrast pass for the
  full theme engine (Part B), plus the Phase 0 dead-store removal decisions.

## 15. Home (H2)

Source of truth for intent: §3 "Home is a decision surface". Verify what exists
first.

| ID | Item | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| HM1 | One-tap start with preview | `home/today-card.js`, `workout/session-preview.js`, `train/train-landing.js` | Today card shows the planned lifts with target and last-time numbers; one Start/Resume/Review action; start from cold open in 2 taps or fewer | DONE | `sessionExercisePreview` resolves the same `liftTarget` and dated history the cockpit uses; Home renders up to three rows plus a compact collapsed line. `home-today-browser-check` asserts the target and last-time numbers at 320/390/412 px light/dark. Cold start remains 2 taps. |
| HM2 | Move a day (G1) | `schedule/week.js`, `home/week-strip.js`, `home/move-day-sheet.js` | Reschedule a planned workout from the day cell without editing the plan; attribution uses the real date; Undo | DONE | Free dates only in the current calendar week: `state.weekSchedule[weekStart][day] = date` moves the plan; Home/Train/cockpit resolve the scheduled day for a date; the old weekday reads rest, occupied/past dates are disabled with a reason, and the shared undo bar restores the override. Logged work keeps its stamped date. Logic and UI are covered by `tests/week_schedule.test.js` and `scripts/move-day-browser-check.mjs` (390/320). Replace/keep-both for an occupied target stays with G3. |
| HM3 | Strength this week | `home/hybrid-dashboard.js` | Sessions, sets and volume vs the same weekdays last week, plus this week's PRs; one line each; links to the owning Progress surface | DONE | Sessions, sets, elapsed volume delta, top e1RM change and PR count render on separate lines. The card now opens the Progress hub scrolled to the Main exercises band (`data-scroll-target`), whose “All N lifts” sheet is the PG5 index — no route to the legacy Strength screen. The browser check asserts the landing. |
| HM4 | One strength insight | `home/strength-insight.js`, `home.js` | A single "because" recommendation from strength data (stalled lift, under-trained muscle, deload cue), never contradicting the plan or a recovery warning | DONE | One line: a planned deload week, else the first stalled planned lift (decision owned by `computeDiagnosticForLift`, the same rule as the cockpit badge), else the previous generic insight. It never replaces a warning/caution line and is suppressed while the overtraining escalation is on screen; `tests/home_strength_insight.test.js` pins the precedence and the engine-driven stall. Under-trained-muscle wording stays with A2's volume guide. |
| HM5 | Quick actions | `index.html`, `home.js` | At most three: empty workout, log a past session (G3), and one contextual action | DONE (G3 deferred) | The three Home shortcuts are now **Empty workout · Weight · History**: Run moved to Train's Quick start (the surface that owns starting an activity), so Home is about starting/recording, not browsing. "Log a past session" stays in History until G3 lands. The module switches still hide the Train Run/Walk offers. |
| HM6 | Honest states | `home/today-card.js`, `home/week-view.js` | Rest day, no plan, first run, offline, partial data: each distinct and useful | DONE | Ready/rest/in-progress/completed/unresolved/no-plan/past-week empty were already distinct. Added an explicit **first session** state (no completed work anywhere), moved the offline note into the card head so it is visible while collapsed, and made a one-signal readiness read say "limited signal" instead of presenting it as settled. `home_today_card` tests pin all three; Home Today browser check passes. |
| HM7 | No duplicate metrics | `home/dashboard-model.js`, `week-strip.js`, `hybrid-dashboard.js`, `bodyweight-card.js` | Audit Home for the same figure shown twice or by two owners; also confirm there is one readiness surface and one owner (HY6) | DONE | One owner per figure: readiness → the Today card's guidance (and the recovery detail); bodyweight + delta → the bodyweight card; weekly volume, sessions and working sets → the Strength week card; planned sessions → the week rail. The coach is advisory only (fasting, load/ACWR, streak) and hides while the overtraining card is up. `tests/home_metric_ownership.test.js` pins the rule; `home-today-browser-check` still passes. |

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
  dashboard. The **footer** — the trailing "More detail" list plus five quiet
  links — was removed on 25 Nov 2026: History and the “how this is calculated”
  note are header icons, the recaps are one Reviews row, and every other
  destination is the detail behind its band.
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
| PG2 | One home per destination | `analytics/views/view-progress-hub.js`, `progress-landing.js` | Classify each PG1 entry: attach to a band, merge into Reviews, promote to Records, move to Settings, or retire. No entry left unassigned | DONE | `js/analytics/progress-sections.js` is the one registry; the footer and "More detail" list are gone. Reviews is one Week \| Month \| Year row, History is the header icon, and `tests/progress_registry_guard.test.js` fails on any unregistered section/destination. |
| PG3 | Band-header drilldown | `analytics/views/band-kit.js` | Same pattern on every band; extra content moves from the Overview and the footer into the band detail | DONE | Every band with a detail renders its whole header as a 44px "Details ›" control; the detail inherits the range (header chip) and Back scrolls to the originating band (`data-band-origin`). The browser check asserts the chip and the restored position. |
| PG4 | Reviews surface | `views/view-weekly-review.js`, `views/view-reviews.js` | One Week \| Month \| Year recap surface replacing the duplicated recap entries; the share card still draws from the same models as the screen | DONE | The hub's Reviews row and the screen now speak the same three periods. Week = the weekly story (stats, adherence, PRs, focus, share) + Streak + Goal progress; Month = the Training Report (month / trailing 12 months) + the Consistency Log; Year = Year in Review (seasonal) + the always-available year calendar. The duplicated Overview block was removed (it re-stated the weekly story), and the share card still draws from `buildWeeklyReview`. Legacy contexts open the period they name (`weekly-review`→Week, `monthly-report`/`weekly-summary`→Month, `year-review`→Year, `progress`/`streak`/`goal-progress`→Week); only Week follows the shared week navigator. Tests: `review_tabs` (period bar, aria-pressed, legacy names) and the Week render guard; the Progress-hub browser check drives all three tabs. |
| PG5 | All lifts index | `views/view-exercises.js`, `analytics/exercises-summary.js`, `analytics/all-lifts-sheet.js` | Searchable list of every lift with last performed, e1RM trend and stall flag; opens the exercise detail | DONE | “All N lifts” opens a searchable sheet over the SAME rows the band built: name, sessions, best e1RM, window change, last performed, PR badge and a **flat** badge (≥3 sessions with no e1RM improvement in the selected range — a window fact, not the engine's per-program PROGRESS CHECK). Search filters live with an honest “N of M” count, and a row opens the existing exercise drilldown. `tests/all_lifts.test.js` + `scripts/all-lifts-browser-check.mjs`. |
| PG6 | Records row | `strength/records.js`, `set-records.js`, `strength/pr-index.js`, `analytics/records-sheet.js` | PR table and dated feed (A6) | DONE | “Records →” opens one sheet with the all-time best e1RM per lift (date and PR count) and the dated PR feed, both from `buildRecordIndex`; Year in Review now reads the same collector. Search filters table and feed; a row opens the exercise drilldown. `tests/pr_index.test.js` + `scripts/records-browser-check.mjs`. |
| PG7 | Strength-first defaults | `ui/customize.js`, `customize-sheet.js`, `progress-dashboard.js` | Order per §16.4; Customize lists each band's detail switches; hidden modules are labelled "module off", not "no data" | DONE | Default order is Pulse → Main exercises → Muscles → Body → Reviews, then Balance/Endurance/Fasting. Customize reads the registry for top-level rows and indented detail switches, keeps the reorder column at one x, and disables module-off rows with "module off" copy. Saved old orders preserve their position (`reports` → `reviews`). |
| PG8 | Navigation contract | `analytics/navigation.js`, `analytics.js` | At most 2 levels to any evidence; origin-aware Back; scroll position and range preserved; range label on every drilldown; last row clear of the fixed bottom nav | DONE | Band-origin Back returns to and scrolls to the originating band; every detail shows the inherited `Progress · <range>` chip; the last band still clears the fixed nav. The browser check asserts all three. |
| PG9 | Overview concision | `views/view-progress-hub.js`, `analytics.js` | Move secondary charts and tables out of the Overview into band detail; keep the Overview scannable in one screen of scrolling per three bands | DONE | Slice 2 completed the split: the Main exercises band keeps its stall list and ranked rows but the rep-range/effort mix moved to the Strength detail (`#strengthMixSection`); Muscles keeps one chart + legend and its ranked rows + period body map moved to the Muscle load detail (`#muscleLoadMap`, range-labelled above the weekly recovery rows); the Body band keeps the weight chart, entered body fat and a **Measurements (N) →** action while the site strip, photo library and site table stay in Measures; Endurance keeps its bars/stats and lost its duplicated 12-week day grid + table (the G4 year heatmap owns day-level history); the four duplicated `Show data` tables were removed from those bands. Measured at 390px: 2,365px total (2.80 screens, from 3,541 / 4.2), max band 409px; at 320px 2,450px (2.90 screens, max 435px Pulse). The Progress-hub browser check now ratchets total ≤ 3.15 screens and no band > 470px at 320/390/412, and asserts the moved evidence in its new home. |

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
| H-F1 | **Fixed 24 Nov:** the rail and coach line now both count planned sessions (`planDone`/`planTotal`). The set-based `consistencyPct` remains only for the Hybrid Score pillar, not the "plan done" copy. | `dashboard-model.js` `planPct`, `tests/dashboard_model.test.js` | Resolved | H2 / HM7 |
| H-F2 | Home still cannot move a planned day: no reschedule control, attribution change or Undo. The lift preview part of this finding is fixed by HM1. | no reschedule action in `js/` | **P1** | H2 / HM2 |
| H-F3 | The single insight is not strength-derived and is not deload/overtraining-aware; it can cheer "primed for a hard session" beside the overtraining card. | `dashboard-model.js` `pickTopInsight` priority list | **P1** | H2 / HM4 |
| H-F4 | Quick actions are Weight / Run / History, not empty workout / log a past session / one contextual action. | `index.html`, `home.js` quick-action block | P2 | H2 / HM5 |
| H-F5 | No explicit first-run Home state; offline is a note inside Today, not a page-level stale signal. | `today-card.js`, `home.js` | P2 | H2 / HM6 |
| P-F1 | **Fixed 25 Nov:** the registry guard sees every rendered band and destination, so a footer leaf or an unregistered detail fails the suite instead of hiding outside the checked arrays. | `progress_registry_guard.test.js`, `progress-sections.js` | Resolved | H4 / PG2 |
| P-F2 | **Fixed 24 Nov:** "Year in Review" now routes to `year-review`, which opens Review's Stats tab where the year section actually lives. The Progress-hub browser check asserts the active tab and visible year container. | `view-reports.js`, `analytics.js`, `progress-hub-browser-check.mjs` | Resolved | H4 / PG4 |
| P-F3 | **Drilldown fixed 25 Nov:** every data band header opens its detail. The all-lifts index/search/stall flag (PG5) and a real Records table/feed (PG6) remain. | `band-kit.js`, `view-exercises.js`, `strength/records.js` | PARTIAL | H4 / PG3, PG5, PG6 |
| P-F4 | The hub still computes the retired four-domain dashboard and 12-week series on every render, while reading only `secondary`/`allEmpty`. | `analytics.js` hub render | P2 | H4 / PG9 |
| P-F5 | **Fixed 25 Nov:** Back from a band detail carries `data-band-origin` and scrolls to that band after the hub renders. | `app.js`, `analytics.js`, `navigation.js` | Resolved | H4 / PG8 |

## 17. Workout logging (H3) and strength analytics (H4)

### 17.1 Logging gaps

Verify first; sources: openGym, Hevy.

| ID | Gap | Owner | Target behaviour | Status | Evidence / gap |
| --- | --- | --- | --- | --- | --- |
| G2 | Reps per side | `workout/load-basis.js`, `set-utils.js` | Log the total, show the per-side split, step targets so a side never gets a fractional rep; history and 1RM keep meaning the total | DONE (display) | A unilateral row (catalogue `unilateral`) states the split beside the entry as the total is typed (`8 → 4 per side`), and an odd total is shown honestly (`4.5 per side`) rather than rounded. Storage, history and 1RM keep the TOTAL, so there is no schema change and no second truth. Target re-interpretation and even-step progression were deliberately not introduced: the plan's prescription stays what it says. |
| G3 | Log a past session | `activities.js`, `workout/one-off-session.js`, `ui/confirm-modal.js`, `workout/backdated-session.js` | From History: date, start time, duration, routine or freestyle, then the normal logger; if that day has a session, offer replace, keep both or cancel | DONE | History now offers **Log past**: one date prompt (never a future date), then the normal cockpit as a one-off `session:` week stamped with the chosen date at noon. The active program, current week and activation are never written. If that day already has training, a **Keep both / Cancel** choice names the day; replace is deliberately not offered for programmed or finished history (a photo-style irreversible delete would need its own Undo). Tests: `backdated_session` (validation, occupancy, noon stamp) + a static wiring guard; the History browser check creates a past session and proves the collision Cancel changes nothing. |
| G5 | Closed-app rest alerts | `notifications.js`, `timers.js`, Android `ReminderScheduler` | Rest-timer alert while backgrounded or closed (Android), plus an optional reminder on planned-but-unlogged days, scheduled per calendar date and cancelled when the day is trained or moved. Native checklist applies; no network surface | PARTIAL | A fixed-time daily OS alarm exists; it is not planned-day, not cancelled by training, and the rest alert cannot fire while WebView timers are paused. |
| G7 | Favourite exercises | `exercises/favourites.js`; picker/library read it | Star an exercise; favourites sort first in the picker and library | DONE | Every picker row carries a 44px star (`aria-pressed`, Add/Remove <name>), and the unfiltered library leads with ONE **Favourites** section — catalogue and custom together, never duplicated — while a filtered list sorts favourites first. The preference is one id-keyed map (`settings.favouriteExercises`), so a catalogue alias stars the same exercise, toggling is idempotent and the map is bounded at 120; the import sanitizer keeps only `key: true` on a null-prototype object. Tests: `favourites` (alias key, custom key, bound, stable order, star naming, hostile import) and `exercise-picker-browser-check` (star size/state, persisted state, Favourites section, favourite leads). |
| G9 | Curated exercise core | `exercises/catalog.js` | Choose about 300–500 core exercises and give each reviewed instructions (66 reviewed today against ~5,700 entries). Ship in batches of 25. Do not expand the catalogue | DONE | **The curated core is fixed at 157 entries by owner decision; the 300–500 line is superseded.** All **157/157** now carry authored instructions, a declared difficulty and specific safety notes, shipped in human-reviewed batches of 25. Copy names the setup, the execution and what actually goes wrong under load; the sentence/length and complete-or-not-at-all guards hold, and the ratchet is 157. No catalogue expansion. |
| G10 | Explained targets | `engine.js`, `templates.js`, `workout/target-why.js` | Every progression target states in one line why today's number is today's number | DONE | The cockpit card now shows one why line under the target: the engine's message for a stall/fatigue hold, the progression rationale behind the suggested load, a baseline line for a first performance, or the program prescription when history exists but no progression applies. It never invents a reason and never duplicates the diagnostic message; `tests/target_why.test.js` pins the cases and the render. |
| LG1 | Set-entry tap audit | `templates.js`, `workout.js`, `set-sheet.js`, `exercise-picker.js` | Count taps and seconds to log a set, add an exercise mid-session, replace an exercise, delete and undo a set. Remove avoidable taps. Never make the common path slower | MISSING | No tap/second audit or harness exists. Static trace: ghost values allow a one-tap tick; add/replace/delete each have avoidable steps. |
| LG2 | Ergonomics | `css/styles.css`, `ui/visible-viewport.js` | One-handed reach, keyboard and numpad behaviour, safe areas, large targets, no control hidden behind the keyboard | DONE | 44px, contrast, safe areas and inputmode pass. The visible viewport is tracked app-wide (`--visible-viewport-height`), the per-set sheet is capped by it instead of 88vh, numeric fields get `enterkeyhint="done"` on focus, and a delegated focus handler scrolls a field clear of the on-screen keyboard (nearest scrollable ancestor first). `scripts/lg2-keyboard-browser-check.mjs` drives the real browser at 390 with a shrunken viewport. |

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
| A1 | Stall detection | `engine.js`, `templates.js`, `analytics/stall-list.js`, `views/view-exercises.js` | Per lift: flag a flat or falling estimated 1RM over N comparable sessions with the evidence and one suggested action | DONE | The cockpit already explains its PROGRESS CHECK; the Main exercises band now lists the same fact for the ACTIVE programme. `buildStallList` asks `computeDiagnosticForLift` per programmed lift (no re-derived rule), so each entry carries the engine’s evidence sentence and target; a row opens the exercise drilldown. The list is empty without a programme and is capped with an honest “+N more”. Tests: `stall_list` + the exercises view; the all-lifts browser check asserts the block. |
| A2 | Volume vs target per muscle | `analytics/volume-guide.js`, `muscle-load.js`, `analytics/muscles.js` | Weekly sets per muscle against the volume guide with under/over status and one action | DONE | The range view states the focused muscle's **weekly average** against the typical band (`MEV–MAV`), with the shared `classifyVolume` label (detraining/maintenance/growth/optimal/overreaching) and one action: **Review volume guide**. Copy stays factual — population references are never turned into “add N sets”. The current-week Volume Guide and its target band are unchanged. Tests: `muscles_model` average/landmarks and `muscles_view` focused block; the Progress-hub browser check asserts both. |
| A3 | Strength trend | `analytics/strength-detail.js`, `strength-calcs.js`, `exercise-detail.js`, `views/view-strength-entity.js` | e1RM trend for main lifts over 4 weeks, 12 weeks, 1 year and all-time, with rate of change | DONE | The exercise drilldown offers 4 weeks / 12 weeks / 6 months / 1 year / all time, and states the e1RM **rate of change per week** for the selected span (first→latest, never fabricated from one point or for holds/carries). ROI and block PR stay as they were; the program-week-indexed ROI is a separate metric, not this chart. `exercise-detail` tests pin the boundaries and the rate; the all-lifts browser check drives the range control. |
| A4 | Rep-range and intensity mix | `analytics/intensity-mix.js`, `views/view-exercises.js` | Share of sets by rep range and by RIR/RPE band; shows whether training matches the goal | DONE | The Main exercises band shows stacked rep-range (1–3 / 4–6 / 7–12 / 13+) and effort (RIR 0–1 / 2–3 / 4+) shares, with the unrated-set count and a goal line that states the observed mix without prescribing. Warm-ups are excluded, holds/carries are excluded from rep ranges but keep a recorded RIR, shares add to 100 by largest remainder, and under five rep sets no mix is claimed. `tests/intensity_mix.test.js` + the exercises view; the all-lifts browser check asserts the block. |
| A5 | Session vs last time | `session-recap.js`, `workout/session-comparison.js`, `workout/session-review.js` | After a workout, compare to the last session of the same routine: volume, best sets, PRs | DONE | The recap Summary now carries one “vs last time” block: volume (and %), set delta, best-e1RM delta and the session’s PR count. Identity is the routine when the session came from the library, otherwise the same programmed day; only completed working sets count, a future/empty session is never the baseline, and runs are not compared here. `tests/session_comparison.test.js` + the recap test; verified in the History detail. |
| A6 | PR timeline | `strength/records.js`, `set-records.js`, `exercise-detail.js`, `year-review.js`, `strength/pr-index.js` | All-time PR table per lift plus a dated feed; baseline uses every earlier session | DONE | One shared date-strict collector (`pr-index.js`) owns e1RM PR events for the Records table/feed and Year in Review: first date is a baseline, a tie is not a record, same-date sessions merge to the best, aliases collapse, and `isE1rmPr` supplies the epsilon. Set records and per-exercise history remain in `set-records.js`. |
| A7 | Muscle frequency | `analytics/muscles.js`, `muscle-load.js`, `views/view-muscles.js` | Sessions per muscle per week with the same period comparison as sets | DONE | A session is a training DATE: one compound day trains chest and triceps once each, not once per lift or per set. The model exposes `sessions`, `previousSessions` and `sessionsDelta` per muscle and `sessionsByMuscle` per bucket; the focused muscle states `N sessions (+/− vs previous)` and both data tables carry a Sessions column. Tests: `muscles_model` frequency/previous-window cases; the Progress-hub browser check asserts the focused meta. |
| G4 | Year heatmap | `analytics/year-heatmap.js`, `views/view-year-heatmap.js` | Always-available year view shaded by time trained; tap a day for its recap; does not replace Year in Review | DONE | Review → Stats ends with **Year at a glance**: twelve month grids (the rolling year, Monday- or Sunday-first from the athlete's setting) shading each day by MEASURED training time — strength gym time plus run time. A day with training but no recorded duration is outlined as “logged, time not recorded” rather than shaded as a short session, and a run-only day is one session, never two. Every past day is a 44px button that opens History filtered to that date; future days are inert. It renders independently of the seasonal Year in Review, so off-season the year is still available. Tests: `year_heatmap` (shade bands, mixed/run-only/unmeasured days, archived weeks, window edges, week start) and `year_heatmap_view`; the Progress-hub browser check asserts 12 months, shaded days, the measured total, no overflow at 320/390/412 and a real day tap into History. |
| A8 | Relative strength | `profile-stats.js`, `athlete-profile.js`, `exercise-detail.js` | e1RM divided by bodyweight per main lift, labelled as an estimate; hidden without recent weigh-ins | DONE | The exercise drilldown states `X.XX× bodyweight (est. · <weight> on <date>)` for the big three, using the latest DATED weigh-in within 30 days and nothing else. The Profile band is labelled `est.` with the weigh-in note, and the undated per-session bodyweight fallback is gone (`_latestBodyWeight`/`_recentBodyWeight`). Tests: `relative_strength.test.js` + exercise-detail cases + the all-lifts browser check. |
| A9 | Long-range comparability | `analytics/ranges.js`, `progress-dashboard.js`, `view-strength-entity.js` | Every strength domain has week, month, year and all-time views, so "is this working?" is answerable for a year | DONE | The hub's 30D/3M/1Y/All bar is the one range control and governs every strength band (sets, muscles, rep mix). The chosen window now carries into the e1RM drilldown — `30d→4w`, `3m→12w`, `1y→1y`, `all→all` — so a one-year question opens on a year instead of resetting to 12 weeks; week-level questions stay on Pulse, the selected-week Strength screen and the Volume Guide, and all-time lives in Records plus the drilldown's All. Every strength metric detail already offers 4 weeks through All time. Tests: `exercise_range_handoff` (mapping, unknown ids, vocabulary), the all-lifts browser check asserts the inherited range, and the hub check covers the band ranges. |

**Data rules (ST6/ST7 shipped):** every stored weight is KILOGRAMS and
`settings.weightUnit` is display-only (distance km, tape cm); calendar weeks follow `settings.weekStartDay`
(Monday default, Sunday optional) through the one `calendarWeekStart` rule;
program weeks are Monday plan indices and never move; never
`state.currentWeek` in analytics; archived weeks count;
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

**Done (26 Nov 2026):** Review → Month → **Block Review** over the last four
completed calendar weeks — sessions, tonnage and per-lift e1RM change vs the
previous block, all-time PR flags and the engine's own progress checks.
**Slice 2** adds one plan-changing action on `stalled` evidence (2+ engine
checks): **Deload week N** targets the next program week, halves its sets via
`markWeekDeload`, snapshots the plan and offers the shared Undo. It is offered
only on a personal copy; a shared catalogue plan gets “Customize to deload”.
No new engine rule and no background nagging.

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

**H6a audit (26 Nov 2026).** Verified in the current app: **R1** (live GPS +
manual + the active-session journal), **R4** (weekly distance, longest run,
calendar comparison), **R8** (FIT/CSV imports with date identity and re-import
refusal), **R10** (recap + share from the same figures). Implemented now:
**R5** best efforts (fastest 1 km / 1 mi / 5 km / 10 km from recorded splits) and
**R6** Riegel race estimates, always `(est.)`, with the basis named. Still
deferred until the owner resumes running: **R2** intervals, **R3** zones,
**R7** efficiency, **R9** planned-vs-completed runs. Best efforts read only the
splits the runs already carry; no new stored field.

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

### 18.5 LiftShift adoption (QUEUED — after the Settings/Profile rebuild)

Local work order: `~/.opencode/plan/openhybrid-liftshift-adoption.md`.
We take ideas, methods and published numbers from primary sources; every line
and every word is ours. No attribution entry is needed because nothing is
derived from their source.

Three commits, in order:

1. **Correct `NOTICE.md`:** the exercisedb entry count is **1,273**, not 1,324
   (verified: 4,282 openGym + 1,273 exercisedb = 5,555 catalogue entries).
2. **Retire openGym plan-file import:** delete `js/programs/opengym-plan.js`,
   its test and browser check; keep `openhybrid-plan` JSON import/export,
   CSV/FIT history import, Customize/fork and the program builder. The catalogue
   and CSV importer stay.
3. **Focus prompts for the training-context export:** a pure
   `training-context-focus.js` with eight own-wording focuses and an ephemeral
   sheet opened by the existing export button. No new setting, no static markup,
   no network surface.

**Parked with a home:** per-lift status and premature-PR detection → A1; rep/RIR
band mix → A4; rolling per-muscle volume across a training break → A2; 52-week
heatmap → G4; drop/unilateral half-credit and library replacement → F/G9.
**Held:** strength balance ratios until a device export shows at least 8 of 13
pairs populated in a 90-day window.

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
| 6 | Review one lift's progress | 3 taps | 2 taps | pending | pending | 2026-11-25 (agent-traced) |
| 7 | Review last week | 2 taps | 2 taps | pending | pending | 2026-11-25 (agent-traced) |
| 8 | Open the month recap | 1 tap | 1 tap | pending | pending | 2026-11-25 (agent-traced) |
| 9 | Find a past PR | 2 taps | 2 taps | pending | pending | 2026-11-25 (agent-traced) |

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

## 22. Plans (PL0–PL8)

**Status: ACTIVE (opened 27 Nov 2026).** Owner-directed: Plans is the surface
the owner cannot currently use. Strength first; no running features; no accounts.

### 22.1 Measured diagnosis (390×844, active 8-week plan, 5 training days)

- Plans landing: **3,216 px, 40 controls, 0 filter chips**; four stacked control
  rows before content (card 20 px → utilities 186 → tabs 234 → search 283 →
  recommendations 337 → "All programs" 598).
- Browse: 12 of 58 plans, **A–Z only** ("10K Builder" first). Category/level
  chips render only while a filter is already active, and the only elements that
  set one live in dead code — so the catalogue cannot be filtered at all.
- Search in My Plans **hides your plans** and searches the catalogue only.
- My Plans: custom plans render as plain cards; no Edit/Duplicate/Delete.
- Plan page: **2,923 px, 62 controls**, leads with "Not a match for your
  profile", CTA at **636 px**, and no per-day exercise list (one 5-lift sample).
- Builder: **50 controls for one 6-exercise day** (5 per row); no per-exercise
  targets — the tab says "Per-exercise targets are coming".

### 22.2 Decisions

1. **Per-exercise targets are authoritative** on non-deload weeks, stored in the
   existing `program.prescriptions[day][lift]` sidecar (already read first by
   `liftTarget`, already written by imported plans and routines). Deloads apply
   to prescribed lifts too, derived as `max(2, round(sets/2))`. The weekly grid
   stays the fallback for lifts without a target and says so. No per-week ×
   per-lift table: the structured-programming ADR gate stays closed.
2. **One Plans home, Browse pushed.** The `Discover | My Plans` tabs, the utility
   row and the landing search retire. Search lives on Browse and covers the
   catalogue **plus your plans and routines**. Browse's equipment facet is
   **opt-in** — filtering by kit by default would silently hide a dozen plans,
   which is the same failure as a filter that cannot be cleared.
3. **Routines stay in Plans**, below plans, unchanged.
4. **A trained plan is archived, never deleted.** `deleteCustomProgram` refuses a
   plan with any activation or completion; the row offers "Archive (keeps
   history)" instead, and an Archived disclosure offers Restore. The record stays
   resolvable so History and previous runs keep the plan's name.
4. **Autosave stays** with a settled-state indicator: "Saving…" only after 150 ms,
   "Saved on this device", failure + Retry, a write-revision counter, a sticky
   editor header and no per-keystroke live-region announcements.
5. **Adopted from Hevy/Strong, behaviour only**: the row `⋯` as the only
   per-exercise action surface; a plan day is the logger's anatomy in planning
   mode (one shared row component); history prefill as a ghost; "Save this day as
   a routine". Not adopted: "program = folder of routines", four-way post-session
   update prompts, template limits, drag-only reordering.

### 22.3 Work items

| ID | Item | Status | Acceptance |
|---|---|---|---|
| PL0 | Contracts + reusable audit harness | DONE | `plans:audit` prints the measured surface; decisions recorded here |
| PL1 | Plans home | DONE | 844 px (one 390×844 screen), 17 controls, first content at 31 px, one primary, tabs/utility row gone; plan rows carry a `•••` (edit/duplicate/delete/make active). The original ≤12-control target was revised to ≤18 after measurement: the 17 are real actions (one plan row + its menu, three recommendation bookmarks, the recommendation basis, Browse, `+`), not chrome |
| PL2 | Browse (search + filter sheet + sort) | DONE | all 58 catalogue plans plus your own by default (59 with one custom plan); Strength 59 → 9, then 4 days 9 → 6, 13+ weeks 6 → 3; `plans-browse-browser-check` covers facets, clear-all, own-plan search, the Workouts switch, the empty state and Back-with-facets |
| PL3 | My plans management | DONE | management from the row `•••`; distinct counts; a **trained** plan offers Archive (keeps history) instead of Delete, with an Archived list + Restore; `plans-archive-browser-check` proves the record survives and history keeps its name |
| PL4 | Plan page unification | DONE | one page, one week control; day rows expand inline to per-lift targets (6 on the fixture day) resolved through `liftTarget` **with** `ctx`; CTA 504 → **314 px**; page 2,036 px / 25 controls → **1,840 px / 14**; fit below training; `#progActivePlanView`, the day-preview sheet and the `Overview | Structure | Plan` tabs deleted |
| PL5 | Editor: per-exercise targets | DONE | each row is name · **target** · `•••`; the target sheet writes `prescriptions[day][lift]`; 6 target controls on the fixture day; editor 1,770 → **1,596 px**, controls 50 → **38**; 3×12 survives reload, the deload preview shows 2×12, JSON round-trips and clamps |
| PL6 | Editor IA + new-plan entry | DONE | **Plan → Week → Day**: the editor opens on the plan (1,233 px), seven day rows, progression/checks as disclosures, day editor pushed; "New plan" asks where to start (blank / template / copy / import) instead of a name form; a plan day saves as a routine with its targets |
| PL7 | Cleanup + docs | PARTIAL | `collections.js` (no importers), the hero carousel, aplan view, utility row, editor tabs/day strip, landing search and sheet-grid CSS are deleted — **196 blocks, ~1,300 lines**; the brand test now ratchets `.plan-row`. The `programs.css` split into home/page/editor files is **deferred** (cascade-order risk for no product gain) and recorded as the remaining PL7 item. |
| PL8 | Verification | DONE | `npm run preflight` green (verify + 59 browser checks); §22.4 filled; the **device pass is `[You]`** (real phone: today's session, a plan edit, Browse at 390 px) |

### 22.4 Gate evidence

Recorded at the end of PL8. The before column is §22.1; the after column uses the
same fixture and harness.

| Measure | Before | After |
|---|---|---|
| Plans home height (390 px) | 3,216 px | **844 px** (one screen) |
| Visible controls / above the fold | 32 / 21 | **17 / 17** |
| First content top | 337 px (recommendations) | **31 px** (page title) |
| Filter a plan by goal + days + kit | impossible | **Strength 59 → 9 · 4 days 9 → 6 · 13+ weeks 6 → 3** in Browse |
| Find your own plan by name | impossible | Browse search covers catalogue + your plans + routines |
| Plan page height / visible controls | 2,036 px / 25 | **1,840 px / 14** |
| Plan page primary action position | 504 px | **314 px** |
| Per-lift targets on one day | hidden in a sheet, prescriptions dropped | **6 inline targets, `ctx`-correct** |
| Change one lift's sets/reps | impossible | **row target → edit → Save**, and it survives a reload |
| Editor controls per exercise row | 8 | **3** (name · target · `•••`) |
| Editor navigation | three content tabs | **Plan → Week → Day**, progression/checks fold on the plan |
| New plan | name/focus/weeks form first | **starting-point sheet**; name inline in the editor |
| Editor height / controls | 1,770 px / 50 | **1,233 px / 25** (plan screen) |
| Delete/duplicate from My Plans | 3 taps (into the page) | **1 tap** (row `•••`) |

PL1/PL2 measurements are from `npm run plans:audit` at 390×844 with the §22.1
fixture. PL4/PL5 measurements are included; PL6–PL8 fill the rest as they land.


## 23. Session log
- **2026-11-27 — Plans visual pass: no cover art, one reason, one job per row.**
  - Owner feedback: the plan "thumbnails" were the weak part. Removed the
    gradient/glyph hero from the plan page and the cover tiles from the
    recommendations and similar plans.
  - The plan page opens with a typographic header: category · level eyebrow with
    a category dot, the title, the focus/tagline, `8 weeks · 2×/week`, then the
    fit verdict (only when there is one) and real attribution only ("Inspired by
    You" is suppressed). Primary + Edit share one row; the rest is in `⋯`.
  - Recommendations and similar plans are `.rec-row` text rows with an accent
    bar, name, facts, chevron. A why-line appears per row only when the reasons
    DIFFER; three identical sentences become one shared line.
  - Dead hero/tile CSS removed (17 blocks). `plan-recommendations` checks the new
    row language at 320/390/412 and accepts a shared reason as stated evidence.
- **2026-11-27 — Plans (PL7/PL8): cleanup, and the gate closed.**
  - PL7 removed `js/programs/collections.js` (no importers) and **196 dead CSS
    blocks (~1,300 lines)**: the old active-plan view, hero carousel, utility
    row, editor tabs and day strip, landing search/popular searches, the retired
    day-sheet grid and the sample/commitment/day-split blocks. The brand test now
    ratchets `.plan-row` instead of the deleted search bar. The stylesheet SPLIT
    is deliberately deferred (cascade-order risk, no product gain) and is the one
    remaining PL7 item.
  - PL8: `npm run preflight` (verify + all 59 browser checks) green; the §22.4
    table is filled. The phone pass stays `[You]`.
- **2026-11-27 — Plans (PL6): the editor is Plan → Week → Day, and a plan day is a routine.**
  - The editor opens on the **plan**: identity, seven day rows with their real
    exercise/set counts, and Progression/Checks as disclosures (kept open across
    edits). Tapping a day pushes the day editor; `‹ Week` returns. The three
    content tabs are gone. Plan screen 1,596 → **1,233 px**, 25 controls.
  - **New plan** now asks where to start — blank, from a template (forked
    recommendation), copy one of mine, or import `.json` — instead of a
    name/focus/weeks form before anything is visible. The old modal is deleted;
    the name is edited inline.
  - **Save this day as a routine** on the plan page copies the day, its order and
    its per-exercise targets into the routine library
    (`buildRoutineFromPlanDay`), ready to start as a one-off session.
  - Checks: `program-editor` covers the week list, the pushed day, the target
    round-trip and the starting sheet; `plans-json` proves a plan day saves as a
    routine; `active-program-edit`, `copy-program` and
    `program-preview-consistency` follow the new navigation. New unit tests for
    the routine-from-plan shape.
- **2026-11-27 — Plans (PL0–PL2): one home and a real Browse.**
  - Measured before: the Plans landing was 3,216 px with four stacked control
    rows, no filter entry at all (the chips only rendered while a filter was
    already active, and the only triggers were dead code), and search in My Plans
    hid your plans and searched the catalogue only.
  - One home now: active plan → recommendations → your plans as rows with a
    `•••` → routines → Browse. 844 px, content at 31 px, 17 controls.
  - Browse is pushed: one search over catalogue + your plans + routines, a
    Filters sheet (goal/level/days/length/equipment, equipment opt-in), a
    plan/workout switch and four sorts. `plans-browse-browser-check` covers
    facets (59 → 9 → 6 → 3), clear-all, own-plan search, the empty state and
    Back-with-filters. `npm run plans:audit` is the repeatable measurement.
  - `Discover | My Plans`, the utility row, the landing search and ~700 lines of
    unreachable collection/hero code are gone.

- **2026-11-27 — Plans (PL3–PL5): archive, one plan page, per-exercise targets.**
  - **PL3:** a plan with any activation or completion can no longer be deleted —
    activations store only `programId`, so deleting one made History lose its
    name. The row offers Archive (keeps history); an Archived list restores it.
  - **PL4:** the plan page is one surface with one week control: identity/facts →
    one primary action (the same `buildActivePlanBanner` model as Home) → the
    week, each day expanding inline to the exact targets the cockpit uses →
    progression → fit/equipment → goals/notes → past runs. `#progActivePlanView`,
    the `Overview | Structure | Plan` tabs and the day sheet are deleted.
    2,036 → 1,840 px, 25 → 14 controls, CTA 504 → 314 px.
  - **PL5:** the editor writes `prescriptions[day][lift]`; each row is
    name · target · `•••` (3 controls, was 8). A derived deload halves a
    prescribed lift, structural edits carry the target, and `program-json`
    round-trips it. 1,770 → 1,596 px, 50 → 38 controls.
  - Checks: 49/49 browser checks; new `plans-archive`, `plans-browse`,
    `plans-surface-audit`; `program-editor` proves 3×12 survives reload and the
    deload preview reads 2×12.


- **2026-11-27 — H1 ST6: canonical weight storage (units are display-only).**
  - `state` now stores **kilograms** everywhere and `settings.weightUnit` is a
    display preference. The v17→v18 migration converts an existing lbs state
    once, exactly (no rounding), and stamps `state.unitBasis='kg'`, so a
    restored older backup upgrades safely and the step is idempotent.
  - `setWeightUnit` is display-only: no confirmation, no rewrite, no recovery
    copy. Every boundary goes through one module
    (`js/metrics/weight-unit.js` for data, `js/workout/units.js` for the
    logger); `progressionIncrement` and a weight-based `rateGoal` are canonical
    too, and the engine returns display suggestions because the cockpit puts
    them straight in the weight field.
  - Fixed the read/write surfaces that assumed stored == displayed: the set row
    (value, ghost, prescription, PREVIOUS column), the stored `tw` adherence
    target, bodyweight and Measures sheets, Settings profile steppers, warm-up
    ramp, drop sets, engine suggestions, recap/History/share, Profile stats,
    Year/Week/Month reviews, Progress body/exercise/block views, session
    previews, and the training-context/CSV exports.
  - **Export fix (part of this):** the training CSV writes `WeightKg` /
    `BodyWeightKg` and the bodyweight CSV `Date,WeightKg`; the importers accept
    both spellings and convert everything into kilograms. Before this, a lb
    export re-imported into a kg app was silently read as kg.
  - Tests: `canonical_weight` (helpers, migration incl. archived weeks and
    routines, idempotence, render/write boundaries, engine copy, CSV round trip)
    plus updates to the volume/recap/activity/bodyweight expectations.
    `scripts/weight-unit-browser-check.mjs` drives the real cockpit: 225 lb
    typed stores 102.06 kg, and 90.72 kg reads as 200 lb on Home and in the
    weigh-in sheet. A static guard fails the suite if a module uses a
    weight-unit boundary helper without importing it — the failure mode that a
    `checkJs:false` typecheck cannot see.

- **2026-11-27 — H1 ST7: week start (G6) now governs every calendar surface.**
  - One calendar-week rule: `calendarWeekStart(date, weekStartDay)` in
    `js/dates.js`; `weekStartOf`/`weekKeyOf` in `weekly-aggregate.js` resolve
    it through ONE projection that the app applies from
    `settings.weekStartDay` on every `app:storage-loaded` (boot, import/restore
    and the Settings change itself). The setting stays the owner; no analytics
    module keeps its own Monday assumption.
  - **Program weeks deliberately do NOT move.** `startOfProgramWeek` stays
    Monday because a program week is a plan index over Monday-indexed slots
    (and `weekSchedule` moves are keyed by that Monday). "Week 2 of 8" cannot
    depend on a display preference.
  - Fixed the surfaces that were only half-right: Home's rail now anchors its
    seven dates on the real week start (it used to reorder labels over a Monday
    week, so a Sunday-start rail began on the *next* Sunday); Pulse, the week
    chart, strength-volume detail, the past-week recap and Strength's session
    chips derive weekday NAMES from the date, since calendar-week records are
    keyed by POSITION in the athlete's week.
  - S-F3 closed: choosing Sunday now repaints the visible surface immediately
    instead of at the next navigation, and the weekly-summary notification fires
    at 18:00 on the LAST day of the athlete's week (Sunday, or Saturday for a
    Sunday-start athlete).
  - No data migration: dates are already stamped real calendar days, so the
    setting only changes bucketing; switching back restores the Monday view
    exactly. No stored field is rewritten.
  - Tests: `week_start` (both starts, Sunday/Monday attribution, program anchor,
    labels, wiring), `notifications` (next week-end instant), and the Progress
    hub browser check now drives the REAL Settings control and asserts the Home
    rail and Pulse range change without a reload.

- **2026-11-26 — G9 scope decision: the core stays at 157.**
  - The owner chose not to promote catalogue entries into the curated core;
    the 300–500 line is superseded. Work is now bounded to finishing the
    remaining **66 of 157** reviewed entries in batches of 25 (91 complete).
  - No code change beyond the roadmap/brief record.

- **2026-11-26 — G9: reviewed-exercise batch (25), 66 → 91.**
  - Added instructions, difficulty and safety notes for 25 core lifts picked by
    real programme usage: dumbbell/cable/machine chest and fly work, overhead
    press and push press, Pendlay/inverted/renegade/band/kettlebell rows, band
    lat pulldown, pullover, pull-apart, shrugs, cable curls, goblet squat, walking
    lunge, leg extension, sumo deadlift and barbell hip thrust.
  - Copy stays conservative and specific (a claim about loading a barbell, not
    generic advice); every line passes the sentence/length guard.
  - Ratchet: the reviewed-count guard is now 91 of 157. The 300–500 target needs
    a CORE-SELECTION decision (which catalogue entries are promoted), so the
    remaining work stays in human-reviewed batches of 25.

- **2026-11-27 — UI contrast audit: measured AA, and the dark surface ladder.**
  - Built `scripts/contrast-audit.mjs` (+ `scripts/lib/contrast.mjs`): real
    Chromium, text-node walk, alpha compositing, gradient worst-stop, optional
    pixel confirmation that can only clear an over-estimate, real font-size
    thresholds, JSON ratchet and `--md`. Phase 0 proves it against nine known-bad
    shipped rows before its silence is believed.
  - Found 63 failing runs (P0 13 · P1 48 · P2 2). Root causes, not screens:
    invalid `color-mix(… 6200%)` fills (SVG text fell back to black, 1.11:1),
    `--text-white` as filled-button ink (1.81:1 Midnight, 2.73:1 light), status
    hues as text on their own tint (1.65:1), alpha text in light overrides
    (1.96:1), UA placeholder grey, `opacity` dimming whole day cells and badges,
    and a blanket analytics SVG `fill` override.
  - Fixed all of them colour-only: four status **text** tokens (light values are
    genuinely darker), `--on-accent` on filled buttons, one placeholder rule,
    dimming moved to the dot/icon/swatch, day cells and locked badges keep their
    labels at full contrast.
  - B2 for all four dark palettes: surfaces `#1b1b1b/#252525/#2d2d2d` (Midnight),
    `#162033/#1c2941/#21314d` (Slate), `#0f2319/#132d20/#173626` (Forest),
    `#291b15/#34231b/#3e2a20` (Ember) — a 1.17–1.18:1 card/page step, borderless
    cards, `--divider` for inner rows only, `--text-3` lifted with the surfaces.
  - Guards: `theme_contrast.test.js` 13 → 45 pairs across `bg`/`surface-1..3` and
    five palettes; `light_override_guard.test.js` ratchets raw colours inside
    light rules; the audit runs in `browser:verify` behind an empty baseline and
    was verified to exit 1 on an injected regression.
  - First CI run failed on the audit itself: the pinned clock is an instant and
    the app derives the day in LOCAL time, so a UTC runner rendered the previous,
    finished day and measured 45 more text runs. That unrendered state held four
    real defects (heat-map credit at 3.06:1 light / 3.12-3.19 dark, PR pill
    4.10:1, primary-muscle chip 3.72:1, cockpit "Today" badge 3.25:1) — all
    fixed. The audit now pins `timezoneId` and the fixture marks the audited day
    finished, so the summary is always covered.
  - Gates: `npm run verify` green (2,975 tests), browser audit 0 findings on
    1,080 text runs across all five modes at 390, clean at 320 (1,075) and with
    `--full` (1,090), and all 60 browser checks pass.
