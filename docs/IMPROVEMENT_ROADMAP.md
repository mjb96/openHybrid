# openHybrid Product Improvement Roadmap

> Product and engineering source of truth.
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

The active goal is still **not Play Store release**. Release work is parked while
the product is improved. The next milestone is an app that feels coherent and
effortless in repeated personal use — and that is genuinely complete against the
non-social feature set a serious lifter expects.

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
- **Progress** leads with a this-week hero and 12-week strip, then Strength,
  Running, Recovery and Review, with body measurements (waist, chest, hips,
  arm, thigh, neck) beside the bodyweight trend. Calendar-week attribution is
  used throughout; the Training Report covers 30 days or 12 months; the exercise
  drilldown has a real shape-aware trend, all-time bests and PR baseline.
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

### What holds the experience back

- Analytics still has more valid metrics than hierarchy. The Progress hub is a
  decision surface now, but several domains have no comparable long-range view,
  so "is this working?" is answerable for a week and harder for a year.
- The logging loop is strong for a prescribed lift and thinner for everything
  around it: notes have no clear scope model, plate maths is a hint rather than
  a calculator, and RPE entry is not constrained the way the rest of the row is.
- Body composition stops at bodyweight plus six tape sites. There is no body fat
  and no visual history, which is the one place a lifter most expects a
  before/after.
- History can repeat, edit, delete and share a session, and it can now save one
  as a reusable routine, but a saved routine cannot yet be started and routines
  have no folders.
- Reports stop at the month. Nothing marks a year.
- Android has no live activity and no widgets, so the phone's own surfaces are
  blind to a session in progress.
- Non-EZ exercise technique metadata remains incomplete.
- Large modules and CSS specificity make consistent UX changes riskier than they
  should be.

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
Progress. Home never repeats the same metric in two forms.

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
- **Statuses.** `DONE`, `ACTIVE`, `NEXT`, `LATER`, `PARKED`.
- **Gating.** A phase starts only when the previous phase's acceptance section
  is green. A phase that is functionally complete but UX-below-bar stays open
  with its exact gaps named (see §10).
- **Scope.** The capability backlog covers the **36 non-social features** in §7,
  adapted to openHybrid. Social and Coach scope is deferred in §8.
- **Evidence.** Every phase states what it reuses. Duplicating an existing model
  is a defect, not a shortcut.

## 6. Capability roadmap

Sequenced so analytics is built on trustworthy logging, organisation is built on
stable data contracts, and platform work is built on stable surfaces.

### Phase 0 — Baseline and truth

**Status: ACTIVE.** **Goal:** no new UI; make the matrix and the metric
definitions true.

Work:

1. Verify every row of §7 against code, a test, or a manual check. Correct this
   document where it is wrong — that is a valid Phase 0 deliverable.
2. Freeze the shared vocabulary in one place (§9): session, training day,
   working set, volume, active day, streak week, PR, body-composition reading,
   archived-week inclusion.
3. Name the owning module for every metric. Two owners is a bug.
4. Add the smallest regression test for any metric that has none.
5. Record the gap map (status, owner, missing behaviour, risk) in the PR body.

**Acceptance:** every row has a verified status, an owner and a named gap; every
metric definition has exactly one owning module; no product code changes.

### Phase 1 — Logging fidelity

**Status: NEXT.** **Goal:** a logged set carries everything later analytics
needs, so no later surface has to re-derive or invent it.

Features: L3, L9, L10, L12, L13 (see §7).

1. **Notes with real scopes.** Routine note, session note, and a pinned
   exercise note, each shown where it applies, with a clickable link rendered as
   a link. Existing per-set notes and `liftMeta` notes migrate losslessly; no
   note is duplicated into two scopes.
2. **RPE constrained.** 6–10 in 0.5 steps, per set and per session, entered
   live, reviewed later, never invented for a set the athlete did not rate.
   Out-of-range legacy values stay readable and are never rewritten.
3. **Plate calculator.** A sheet from the set row: target total, bar weight,
   available plate sizes and pair counts, per-side output, and an explicit
   shortfall when the target is unreachable. It reads the active equipment
   profile and never invents a plate. The existing inline plate line stays.
4. **Warm-up editor.** Editable percentage/reps rows with insert and delete,
   plate and dumbbell rounding through the existing ramp, and per-lift opt-in.
   `liftMeta[...].autoRamp` still prevents resurrection after a dismissal.
5. **Rest timer polish.** Per-exercise default, ±15 s adjustments, drop-set
   suppression, inline timer, alert sound/volume, and the existing reload
   persistence.
6. **Superset polish.** Rest after the pair rather than after each member,
   stable colours, persistence in the routine, and an explicit unlink.
7. **Previous values scope.** Verify the `last anywhere` / `last in this
   routine` toggle and tap-to-fill, and make the scope visible where it matters.
   Scope limits the panel and the fill action; it never limits PR detection.
8. **Live PR.** Confirm detection for estimated 1RM, weight, volume, reps and
   duration; show one non-blocking banner; persist the evidence on the set.
9. **Finish sheet.** Name, duration, date/time, notes, summary. No visibility or
   social field exists to add.

**Data rules:** additive only. A set logged before this phase must read
identically after it. Never write derived effort. PR baselines use every earlier
session; a visible range filters the chart and the evidence list, never the
baseline.

**Reuse:** `js/workout/plates.js`, `plate-hint-dom.js`, `warmup-ramp.js`,
`set-shape.js`, `exercise-config.js`, `set-mutations.js`, `js/timers.js`,
`js/session-recap.js`.

**Acceptance:** a set logged in Phase 1 can answer every Phase 2 and Phase 5
question without a new field; an export taken before the phase re-imports
unchanged; all gates green.

### Phase 2 — Progress analytics

**Status: LATER.** **Goal:** answer consistency, strength and volume questions
with calendar-correct numbers, at week, month, year and all-time range.

Features: P2, P3 (model), P4, P5, P6, P9 (close gaps), P10.

1. **7-day activity strip + muscle diagram** on the performance view, reusing
   the Home heat map and `session-muscles.js`.
2. **Sets per muscle group** with weekly, monthly and yearly buckets, a muscle
   selection, and 30-day / 3-month / year / all-time ranges.
3. **Muscle distribution** as volume share with a sessions / duration / sets
   toggle, plus a period comparison that reuses `period-comparison.js`.
4. **Main exercises** — the top five in range, each opening the exercise detail.
5. **Consecutive-week streak** — current, best, rest days — defined as weeks
   with at least one session. This is deliberately **not** the existing day
   streak with freezes; both may exist but must not be presented as the same
   number. Link to the History calendar rather than building a second calendar.
6. **Exercise detail completeness** — set records by rep target, bodyweight
   reps, hold duration bests, carry distance bests, and cardio bests.
7. **Monthly report model** — calendar month, sessions, time, volume, sets,
   active days, PRs, muscle split, top exercises, and a prior-month comparison.

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

### Phase 3 — Body composition

**Status: LATER.** **Goal:** close the two real body-composition gaps without
risking localStorage.

Features: P7, P8.

1. **Body fat and the full site set.** Add body fat percentage and expand from
   six to fourteen circumference sites (neck, shoulders, chest, waist, hips,
   glutes, bilateral arm, forearm, thigh, calf). Centimetres stay canonical, one
   record per date, every site optional, and an existing date is never
   overwritten. A unit toggle changes the reading only.
2. **Bodyweight from a set.** A bodyweight exercise can update today's weigh-in
   through the existing bodyweight log, with confirmation — never silently.
3. **Progress photos.** Blobs in IndexedDB; `appState` holds metadata only
   (`{ id, date, mime, width, height }`). Timeline, side-by-side compare,
   edit/replace/delete, and a share image built by the existing share pipeline.
   A quota failure is visible and recoverable, deleting a record deletes its
   blob, and an orphan sweep exists.

**Data rules:** no base64 in `appState` or `localStorage`. A stored-schema change
needs a migration, a backup path and an `AGENTS.md` note. Export documents that
photos are device-local and carries metadata only.

**Reuse:** `js/metrics/bodyweight.js`, `js/metrics/measurements.js`,
`js/bodyweight-sheet.js`, `js/measurements-sheet.js`,
`js/portability/import-measurements-csv.js`, `js/share/`.

**Acceptance:** deleting a record deletes its blob; a restore without photos
leaves readable metadata rather than broken images; the export is honest about
what it does not carry.

### Phase 4 — Organisation

**Status: ACTIVE.** **Goal:** routines become a first-class library, and a good
session becomes reusable in one action.

Features: P11, S5, S6.

1. **Save as routine** from a History detail, building a routine from the
   session's actual exercises, sets and rest. *Landed: History "Save as routine"
   (root `state.routines`/`state.libraryFolders`, schema v14, Undo) and the
   Plans → My Plans routine list — Start, Rename, Delete with Undo, a badge that
   counts routines, and an honest summary line. Folders and categories are
   next.*
2. **Copy, edit and delete** with Undo — verify the existing actions and close
   the gaps rather than adding a second action row.
3. **Routine folders** — create, rename, delete, reorder, assign, undo.
4. **Routine library** — categories (at home, travel, dumbbells, band,
   cardio/HIIT, gym, bodyweight, suspension), filters, and saving either a whole
   programme or a single routine.

**Data rules:** a plan-changing edit snapshots the PLAN only (`days` +
`weeklyVolModifiers`), never `state.weeks`, so an Undo can never rewrite logged
training. A customization is a frozen deep copy; it must not silently inherit a
new progression model at write time.

**Reuse:** `captureProgramDraft`, `markUndoable`, `duplicateCustomProgram`,
`js/programs/library.js`, `js/programs/copy-program.js`,
`js/activities/model.js`.

**Acceptance:** no organisation action can alter a logged set; every destructive
action has Undo; the routine list survives export/import.

### Phase 5 — Reports and recap

**Status: LATER.** **Goal:** make the month and the year worth reviewing.

Features: P3 (share), P12.

1. **Monthly report share card** built from the Phase 2 model, using the one
   share pipeline.
2. **Year in Review** — a December entry with annual totals, best month, PRs,
   longest streak, body-part distribution, top exercises and a share image.

**Data rules:** date-strict, using the same calendar series as Phase 2. No
fabricated comparison when the prior period has no data. No "supporters" or
social block exists to add.

**Reuse:** `js/brain/monthly-report.js`, `js/analytics/views/view-monthly-report.js`,
`js/share/workout-share.js` (`shareImageCanvas`).

**Acceptance:** every figure traces to a Phase 2 model value; the card cannot
claim a number the screen does not show; a first-year user sees an honest
partial year.

### Phase 6 — Platform and intelligence

**Status: LATER.** **Goal:** native-feeling surfaces and assistance without a
backend.

Features: L14, S10, S2, S3/S4 (reframed).

1. **Android live activity** — an ongoing notification with the current exercise
   and set, a set-complete action, and rest ±15 s / skip. Android only; the PWA
   degrades with no promise.
2. **Android widgets** — calendar, seven-day data, routine of the day, streak,
   quick log. No iOS widget promise exists.
3. **Adaptive trainer** — onboarding inputs (level, goal, equipment, frequency,
   session length, focus) produce a plan whose working weights adjust from
   logged performance, with deloads, short tips, and Undo.
4. **AI, reframed** — export a compact training-context file and import a plan
   JSON. No OAuth, connector or hosted service without a new product decision.

**Data rules:** no backend, no account, no new network surface. Native code
changes require the Android device checklist and must not fork state ownership.

**Reuse:** `js/health/health-bridge.js` for the Android bridge pattern,
`js/programs/progression.js`, `js/programs/editor-model.js`,
`js/onboarding/starter-programs.js`.

**Acceptance:** browser and PWA builds degrade cleanly; a killed WebView loses
nothing; no data leaves the device.

### Phase 7 — Polish and scale

**Status: ONGOING.** **Goal:** keep the finished surface fast and reachable.

Share cards for progress charts and the calendar; performance with five years of
history and a large photo library; accessibility and text scaling; empty states;
reduced motion; export/import for measurements, photo metadata and routines;
documentation.

**Order rationale:** logging → analytics → body → organisation → reports →
platform. Phase 6 may run in parallel once Phase 2's metric contracts are frozen.
Phase 0 and Phase 1 are strictly sequential.

## 7. Feature matrix

**Legend:** ✅ shipped · ◐ partial · ○ missing. Phase 0 verifies each row; do
not rebuild a ✅.

### Progress tracking (12)

| ID | Feature | Owner | Target behaviour | Status | Phase |
| --- | --- | --- | --- | --- | --- |
| P1 | Progress hub | `analytics/progress-landing.js` | Four domain cards + week strip; each says what changed and links to evidence | ✅ | — |
| P2 | Gym performance | `analytics/gym-performance.js` | 7-day activity + body diagram, set count, distribution, main exercises | ◐ | 2 |
| P3 | Monthly report | `brain/monthly-report.js` | Calendar-month recap with prior-month comparison and share | ◐ | 2, 5 |
| P4 | Muscle group chart | `home/body-heatmap.js` | Sets per muscle on a body diagram with a week switcher | ◐ | 2 |
| P5 | Sets per muscle per week | `analytics/volume-guide.js` | Weekly/monthly/yearly buckets, muscle selection, long ranges | ◐ | 2 |
| P6 | Muscle distribution | `analytics/muscle-load.js` | Volume share with sessions/time/sets and period comparison | ◐ | 2 |
| P7 | Body measurements | `metrics/measurements.js` | Weight, body fat, 14 sites, per-site graph | ◐ | 3 |
| P8 | Progress photos | — | Dated photos, timeline, compare, edit/replace/delete, share | ○ | 3 |
| P9 | Exercise performance | `analytics/exercise-detail.js` | Graph, PR summary, set records by rep target, history | ◐ | 2 |
| P10 | Consistency and streak | `analytics/training-calendar.js` | Calendar, consecutive-week streak, rest days, year zoom | ◐ | 2 |
| P11 | Saved-workout actions | `activities/` | Summary, save as routine, copy, edit, delete | ◐ | 4 |
| P12 | Year in Review | — | December annual recap with totals, best month, PRs, streak | ○ | 5 |

### Workout logging (14)

| ID | Feature | Owner | Target behaviour | Status | Phase |
| --- | --- | --- | --- | --- | --- |
| L1 | Log and track | `workout.js` | Routines or empty sessions, all variables, save | ✅ | — |
| L2 | Start empty workout | `workout.js` | Timer, add exercises, finish | ✅ | — |
| L3 | Exercise notes | `workout/exercise-config.js` | Routine, session and pinned exercise scopes, clickable link | ◐ | 1 |
| L4 | Rest timer | `timers.js` | Per exercise, 5 s–5 min, ±15 s, drop suppression, sound | ✅ | 1 |
| L5 | Add/remove sets | `workout/set-mutations.js` | Add, remove, reorder, load/reps/rep-range/time | ✅ | — |
| L6 | Set types | `workout/set-sheet.js` | Normal, warm-up, failure, drop with volume and PR rules | ✅ | — |
| L7 | Previous values | `workout.js` | Last anywhere vs last in routine, tap-to-fill | ✅ | 1 |
| L8 | Warm-up calculator | `workout/warmup-ramp.js` | Percentage rows, plate/dumbbell rounding, insert/delete | ✅ | 1 |
| L9 | Plate calculator | `workout/plates.js` | Target, bar, plates, counts, per-side, shortfall | ◐ | 1 |
| L10 | RPE | `workout/set-sheet.js` | 6–10 in half steps, live entry, review later | ◐ | 1 |
| L11 | Supersets | `workout-order.js` | Pairs and circuits, colours, rest after both | ◐ | 1 |
| L12 | Saving a workout | `workout/session-status.js` | Name, duration, date, notes, summary | ✅ | 1 |
| L13 | Live PR | `workout.js` | 1RM/weight/volume/reps/duration detection and banner | ◐ | 1 |
| L14 | Live activity | — | Lock-screen/ongoing notification with set and rest controls | ○ | 6 |

### Settings and extra (10)

| ID | Feature | Owner | Target behaviour | Status | Phase |
| --- | --- | --- | --- | --- | --- |
| S1 | Workout settings | `settings.js` | One panel: sounds, rest, previous values, warm-up, keep awake, plate, RPE, superset scroll, inline timer, live PR | ◐ | 1 |
| S2 | Adaptive trainer | `programs/progression.js` | Onboarding → plan, performance-adjusted loads, deloads | ◐ | 6 |
| S3 | AI plan generation | — | Export context, import a plan; no account linking | ○ | 6 |
| S4 | AI analysis | — | Same surface as S3 | ○ | 6 |
| S5 | Folders and routines | `programs/library.js` | Create, folder, reorder, use | ◐ | 4 |
| S6 | Routine library | `programs/catalog.js` | Categories, filters, save a programme or a single routine | ◐ | 4 |
| S7 | Exercise library | `exercises/` | 5,700+ entries, filters, instructions | ✅ | — |
| S8 | Custom exercises | `exercises/` | Name, equipment, muscles, type, duplicate/edit/delete | ✅ | — |
| S9 | Programming options | `workout/exercise-config.js` | Notes, rest, sets, types, load, reps/time, reorder, replace | ✅ | — |
| S10 | Home widgets | — | Calendar, 7-day data, routine of the day, streak, quick log | ○ | 6 |

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
| iOS | Out of scope for the current launch push. No iOS project exists. |
| Public release work | Parked, not cancelled. See §11. |

## 9. Cross-cutting data and reliability rules

Product improvement must not weaken these foundations:

- Local data and successful training logs are never silently overwritten.
- Programme activations never leak old workout slots into a new run.
- Calendar analytics use real dates; programme progression uses programme week.
- Warm-ups and incomplete work do not become completed training evidence.
- Exercise aliases preserve historical identity without rewriting stored keys.
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

One definition per term, owned by one module. Phase 0 confirms each against code.

| Term | Meaning | Owner |
| --- | --- | --- |
| Session | One completed or in-progress training record — strength, run, or both | `activities/model.js` |
| Training day | A calendar date carrying at least one session | `analytics/logged-days.js` |
| Working set | A non-warm-up set with a valid shape; holds and carries count | `set-utils.js` |
| Volume | Weight × reps. Holds and carries are 0 | `set-utils.js` |
| Active day | A day with at least one session, used by reports | `brain/monthly-report.js` |
| Streak week | A Monday-based week with at least one session | `analytics/training-calendar.js` |
| PR | A set that beats every earlier comparable set, all-time | `analytics/exercise-detail.js` |
| Body reading | One dated record per site, centimetres canonical | `metrics/measurements.js` |

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

The programme is measured against a product bar, not a feature checklist:
**openHybrid must be a tier above openGym and on par with Hevy** in workout
logging, programmes, and the overall Home → Train → Progress → History →
Settings journey. A phase is not mergeable when it only adds code while leaving
a parity gap that the phase was supposed to close.

Every product PR states the matrix rows it closes, the parity claim, and the
evidence: browser checks plus a before/after interaction trace or screenshots, a
tap-count comparison for the common path, empty/error/loading/offline states,
320/390/412 px and light/dark checks, 44 px targets, settings-driven units,
correct calendar/program attribution, and no history rewrite or new network
surface. Tests and browser checks are added or strengthened, never weakened to
pass. Work is clean-room: no copied Hevy/openGym code, assets, media or visual
identity.

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

| Phase | Date | Outcome |
| --- | --- | --- |
| 0 — Experience map and product contract | 2026-08-03 | Shared model of jobs, destinations and interface rules; screen/sheet/route inventory; journey map; vocabulary |
| 1 — Navigation and Home hierarchy | 2026-08-03 | Four intent-led destinations; Home became a decision surface; legacy routes kept working |
| 2 — Natural workout and run logging | 2026-08-07 | Strength cockpit, review-not-form completion, focused live-run surface with persistent condition notices |
| 2D — Logger upgrade | 2026-11-21 | Truth fixes, load basis, set shapes, rest overrides, plate line, timer persistence, `+ Drop`, adaptive warm-up ramp |
| 3 — Progress and analytics redesign | 2026-08-09 | Decision-surface hub, metric tiers, one detail-screen contract, calendar-correct weekly attribution |
| 4 — Plans, exercise discovery, editing | 2026-08-07 | Fit-based recommendations, active-plan lead, "Who it's for", Simple/Advanced progression, one editor undo |
| 6 — Visual system, accessibility, performance | Continuous | Safe-area tokens, touch targets, non-blocking webfonts, content-hashed cache, performance baseline |

### Delivered foundations

| Area | Current capability |
| --- | --- |
| Navigation | Four intent-led destinations — Home, Train, Progress, Plans — with stable legacy route IDs and origin-aware drilldown Back behaviour |
| Home | One week surface: optional rail, pinned Today decision, inline day recaps with heat map, bodyweight, one insight, quick actions |
| Training | Planned/one-off strength, running, set logging, timers, swaps, supersets, bodyweight modes, session completion, focused live-run surface |
| History | Calendar \| List, search, provenance, source filter, day sheet, exact detail, lossless edit, delete/undo, repeat, share |
| Plans | 58-program catalogue, active plan first with one primary action and one search, fit-based recommendations with reasons, compare, details, timeline, editable copies, builder |
| Exercises | 157 canonical exercises plus ~5,555 catalogue entries, 66 reviewed instruction sets, aliases, filters and details |
| Progress | Calendar-week strength/running, exact evidence, load/readiness, weekly/monthly review, Gym/Run/Recovery detail |
| Data | Activity history, activation isolation, export/restore, CSV/FIT import, automatic backups, Android state mirror |
| Quality | ~2,000 node tests, typecheck, smoke, precache/workflow gates, 43 real-browser checks |

## 13. Session log

- **2026-11-22 — Routines slice 2: list and start them from Plans.**
  - My Plans now leads with a **Routines** section (Your plans follows). Each
    `routine-card` shows the name and `N exercises · M working sets`, plus
    `~N min` only when every prescription's rest is known — never an invented
    estimate. Start is a 44px target; the quiet `•••` menu renames or deletes,
    and the My Plans badge counts routines alongside plans.
  - Start copies `routineSourceWeek` into an ordinary one-off `session:` week and
    opens the cockpit with the routine's exercises, loads and rep targets. It
    never activates or reseeds a program: `activeProgramId`, `currentWeek` and
    the logged program week stay byte-identical.
  - Delete asks once, then offers Undo that restores the record at its position;
    rename updates the routine name, its day title and `updatedAt` without
    rewriting the saved prescriptions. A routine never renders as `.prog-card`
    and never enters `customPrograms`.
  - Empty My Plans keeps "Nothing here yet" and now names saving a routine from
    History; the Routines section itself is hidden when there are none.
  - Validation: 2,099 node tests (routine summary), typecheck, smoke, the routines
    browser check (save → list → start → rename → delete/Undo at 390×844) and the
    plans-json / plans-active-banner / touch-target / core-ergonomics checks.

- **2026-11-22 — Routines slice 1: save a workout as a routine.**
  - A finished strength session can now be saved as a reusable routine from
    History's action menu. It keeps the session's exercises in order, the count
    of completed working sets, the heaviest working load, the rep target, the
    shape (reps / hold / carry) and the rest — and deliberately drops completion
    flags, PR badges, warm-ups, role stamps, effort, notes and gym stats.
  - Routines live in new root `routines`/`libraryFolders` arrays (schema v14)
    and are not programs: they never enter `customPrograms`, never resolve
    through `getProgramById`, and write no week slot, so saving one cannot touch
    logged training or the active program. `routineSourceWeek` turns a routine
    back into the copy shape `createOneOffStrengthSession` already consumes.
  - The action suggests the program day's name, saves immediately and offers
    Undo. There is no Plans routine surface yet.
  - Validation: 11 routine-model tests (exercise order, working-set count,
    tr→r fallback, rest precedence, shape round-trip, exclusions, zero-set
    refusal, one-off copy, store repair, full export/import round-trip), a v14
    migration test, the full node suite, typecheck, smoke, precache and workflow
    gates.
  - Review follow-up: load identity now survives the round trip (bodyweight and
    assisted sets store no derived weight and keep their `bw`/`band` flag; a
    banded set keeps the band as its load), a legacy dumbbell set keeps its pair
    basis (Both), the copy source returns its day with the week, records carry
    `kind:'routine'`, and imported routines/folders are validated, bounded and
    counted in the import preview. A real-browser check covers the History
    action, persistence, Undo and run-detail isolation.
  - Next: a routine list and "Start routine", then folders.

- **2026-11-22 — Plans hierarchy: active plan first, one search, real card art.**
  - One session, four commits: the search-heading security fix, the active-plan
    hierarchy, the quiet utility/tab chrome, and the three-up recommendation
    row. Plans now reads top to bottom as active plan → plan utilities →
    Discover | My Plans → search → content.
  - **Security:** the results heading is pure `searchResultsHeading(query,
    count)` in `js/programs/search.js`, which entity-escapes the query once and
    normalises the count. Typing `<img src=x onerror="alert(1)">` into
    `#progSearchInput` renders as text (`&lt;img`) instead of executing, while
    `3 results for "bench"` still reads naturally; a hostile-query test locks
    both.
  - The running plan's Start/Resume is the only primary action, and its badge
    reads `ACTIVE PLAN` (was `NOW TRAINING`; copy only — no state, attribute or
    action changed). Beneath the card sits one quiet 44px utility row:
    `+ New plan`, `Import plan (.json)` and — only while a plan is actually
    running — `Manage plan`.
  - Manage only VIEWS the active plan: it dispatches `library:view-active` and
    never activates, switches or restarts anything. Activation remains the
    plan's own confirmed action and the banner's Continue is untouched.
  - One search: the field is visible on both tabs with placeholder/accessible
    name "Search plans", a query is checked before the tab, and its order is
    tabs above search, so the whole order is Discover | My Plans → search →
    content. My Plans no longer hides search or loses catalogue search.
  - The utility row is inline text — no border, fill or shadow, 44px targets,
    2px side padding, muted `.74rem`/700; only Manage carries accent text, so
    New plan is no longer a competing filled primary. The library tabs are a
    text bar: transparent, no segmented card, 22px gap, a 2px cyan underline on
    the active tab, `--text-primary` against muted and a quiet grey count pill.
  - Vertical stack: utility margin 4px; tabs 44px plus a 1px subtle rule with
    4px below; search margin 8px; the recommendation section's outer gaps
    collapse (header 0, basis 0, 2px before All programs) because its heading,
    44px basis summary and cards carry their own internal padding. All programs
    moved 711px → 639px at 390×844 against the 640px target; cards, art and the
    44px controls are untouched. The three-up row below then took it to 605px.
  - "Recommended For You" is one 3-up tile grid (request 3) instead of a
    horizontal rail, so all three cards sit fully inside 390px at rest —
    16–130 / 138–252 / 260–374, with no clipped third card. New `tile` size in
    `program-card.js` (and its DOM mirror): accent-tinted gradient from
    `accentColor`/`coverGradient[1]`, 1:1 cover, 44px glyph bottom-left, 44px
    bookmark top-right, name + reason only. `small` and `large` are untouched,
    so detail Similar programs keeps its rail card.
  - Cover glyphs stop treating every athletic category as the flame:
    hyrox→trophy, functional→activity, tactical→gauge, conditioning→flame,
    triathlon→activity; hybrid keeps bolt. Search's popularity tiebreaker now
    reads `Number(program.popularity) || 0`, so a custom/imported plan without
    that catalogue field cannot score NaN and disappear from results.
  - 390×844 audit (same seed/clock as the quiet-row shot): All programs is
    605px, inside the 620px target and down from 639px; the recommendation
    check's own fixture measures 598px. Screenshots `shots/plans-after-quiet.png`
    and `shots/plans-after-art.png`.
  - Validation: 2,081 node tests (hostile-query heading, tile glyph/markup and
    no-popularity search probes added), typecheck, smoke, precache/workflow, and
    the Plans active-banner, Plans JSON, plan-recommendations,
    program-detail-viewport, core-ergonomics and touch-target browser checks.
  - Next: Progress domain detail hierarchy. The recommendation reasons are
    still identical for athletes who share a goal ("Matches your strength goal"
    three times) and should name level or equipment next.

- **2026-11-22 — Home hierarchy: date headline, week chip, one Start; compact
  rail; one-line bodyweight; insight inside Today.**
  - Home's `h1` is the real calendar day ("Mon 3 Aug"), not the program week, so
    a cold boot can never flash "Week 1" as the screen's name. The week moved to
    the compact chip beneath it: "Week 1 of 4 · Working Sets".
  - The chip only claims a range when the active plan has a `totalWeeks` and the
    current week is inside it — a legacy or unknown plan renders "Week N"
    instead of inventing "of 4". With no active program the phase is omitted
    rather than falling back to the resolver's "Training" placeholder.
  - Removed the duplicate Home "Workout" quick action. Start on the Today
    decision is the only strength start; the secondary row keeps Weight, Run and
    History, and the Today card's meta no longer repeats the week a third time.
  - Header CSS: the meta column gets `min-width: 0`, the headline uses
    `clamp(1.15rem, 5.2vw, 1.5rem)` with `overflow-wrap: anywhere`, and the
    phase label is a compact single-line pill (bordered, 999px radius,
    ellipsis). No brand-token changes; the palette and type scale are untouched.
  - Week rail: every cell is a 48px target (was 66px) with tighter padding,
    gaps and type. Done, today, planned, missed and rest all keep their own
    label, dot and colour — the states are compressed, not removed.
  - Bodyweight: one 44px row (measured 64px card) with the latest value, a
    one-line meta and a 28px 30-day spark. The whole row opens the prefilled
    weigh-in sheet, so the card no longer carries a separate chart button and a
    separate Log button.
  - Coach insight moved from a standalone card below the week surface into
    Today's own surface, rendered after the Today mount so it always describes
    the settled day. It hides on a past-week recap or a picked day, and
    Customize still controls it as `data-home-card="insight"`.
  - Validation: 2,074 node tests, typecheck, smoke, precache/workflow, 43/43
    real-browser checks, and the 2,240-control touch-target check. Two browser
    contracts were adjusted to the new intent: the bodyweight check asserts one
    ≤100px row with a single opener and a 24–32px spark rather than the old
    chart/Log split, and the Home Today check asserts the coach line sits inside
    `#homeWeekStrip` after `#homeTodayCard`, is at least 44px tall, and is
    hidden on a past week or picked day.
  - Next: Progress domain detail hierarchy.

- **2026-11-22 — Progress hub: calendar-week control and honest empty states.**
  - The hub now shows the shared calendar-week navigator and rebuilds the hero,
    all four domain cards and the 12-week strip for the selected Monday–Sunday
    week. It still never reads `state.currentWeek`.
  - Dates are human ("This week", "Previous week", "2 weeks ago"; "23–29 Nov"),
    never ISO keys. The weekday navigator uses the same day-first format.
  - The 12-week strip encodes **sessions** (its label) instead of volume, so a
    running-only week is no longer drawn as an empty dash. It names the oldest
    and selected week and carries a range tooltip per bar.
  - Empty domain headlines say "No sets", "No runs" and "No signal" instead of a
    lone em dash; a brand-new profile leads with one honest empty state and a
    Start action rather than four dashes.
  - The Running card now anchors on the selected week's Sunday (the live week
    keeps today, so its comparison stays elapsed-matched). A historical week is
    never scored against the active programme's plan: it reports the sessions
    that were logged instead of inventing "0 of 6 planned" for an old
    programme. Review and Strength follow the same navigator, and the metric
    detail screens use human dates instead of raw ISO keys.
  - Accessibility: the light-mode empty-state CTA measures 5.46:1 (was 1.49:1),
    and "Return to this week" keeps its 28px pill with a 44px hit area.
  - Validation: 2,045 node tests, typecheck, smoke, precache/workflow, the
    320/390/412 px Progress hub contract (including two step-backs and the
    Running-card value), the Strength Volume contract and the 2,242-control
    touch-target check.
  - Next: Progress domain detail hierarchy, then the Home hierarchy (demote the
    program week, one Start, collapse bodyweight).

- **2026-11-22 — Logger overhaul, Phase A: one line per set.**
  - The strength row is now the five-column contract — SET | PREVIOUS | WEIGHT
    | VALUE | ✓. The wide `Log S1` button is gone (it overflowed its 28px track
    and squeezed the weight/reps fields), so the tick is the only completion
    action and the set number is a quiet 44px sheet opener.
  - PREVIOUS is a real column showing the same-index set from last time
    (`60×8`), or an em dash when there is no honest prior. Comparison glyphs
    come from one `compareWithPrevious` helper shared by the template and the
    in-place refresh after a tick, so `↑` appears without a full re-render.
  - The inline `⋯` panel (eight equally-loud pills) moved to a managed per-set
    bottom sheet: set type, value shape, load, weight meaning, rest, effort,
    note and remove. It opens from the set number or the PREVIOUS column and
    closes cleanly (the sheet's `.active` class is cleared on close — leaving it
    made the modal stack re-open the sheet on the next mutation).
  - The append row is one filled `+ Add set` plus quiet warm-up / drop / swap
    links. The value column says REPS, TIME, DISTANCE or VALUE so a plank card
    never claims reps.
  - Fixed a stale CSS override that silently restated the old column template
    and squeezed the reps field to 44px, and the row's rest label now updates
    from `set-mutations` instead of a button that no longer exists.
  - Validation: 2,031 node tests, typecheck, smoke, and the set-row,
    rest-timer and core-ergonomics browser checks (the last now selects Dips on
    Thursday — Pull-Ups live on Tuesday, so the old assertion depended on a
    "first card with a load choice" shortcut).
  - Next: Phase B, a compact sticky session header (stats + clock + day rail in
    one band), then the floating rest pill with −15/+15/pause/skip.

- **2026-11-22 — Roadmap restructured into a gated capability backlog.**
  - This file now carries the active plan, the rules and the last ten entries.
    Everything older moved verbatim to `docs/ROADMAP_ARCHIVE.md`, which is
    explicitly historical and closed.
  - Added the 36-feature non-social matrix (12 progress, 14 logging, 10
    settings/extra) with an owner, target behaviour, verified status and phase
    per row, plus Phases 0–7 with data rules, reuse notes and acceptance.
  - Framing resolved: coherence is the gate, capability is the work. Each phase
    must pass §10 before the next starts, so the backlog cannot turn the app
    back into a feature list.
  - Deferred with reasons: social graph, Coach, Strength Level percentiles (no
    licensed dataset), Pro gating, cloud sync, iOS, public release.
  - Next: Phase 0 — verify every matrix row against code, freeze the shared
    vocabulary, and name one owner per metric.

- **2026-11-21 — Share any workout.**
  - A session can be shared as an image from the finished recap and from
    History's detail menu, not only when a PR happens. The card is built from
    the same `buildSessionRecap` model both surfaces render, so it cannot claim
    a volume, set count, distance or PR the app does not show.
  - Strength cards carry volume, working sets, time and the top three lifts
    (with holds shown as time and carries as metres); run cards carry distance
    and pace in the athlete's unit; mixed days name both.
  - The navigator.share → download fallback now lives in one helper
    (`shareImageCanvas`), and run display formatting moved into
    `js/workout/run-units.js` so the recap and the card cannot drift.
  - Validation: 6 summary/caption tests, 4 formatter tests, and the History
    browser check stubs `navigator.share` to prove a real PNG with the session
    title and caption is handed to the OS.

- **2026-11-21 — Body measurements.**
  - The bodyweight view now carries a Measurements card: waist, chest, hips,
    arm, thigh and neck, stored canonically in centimetres with one record per
    date and any site optional. It shows each site's latest reading, the change
    since that site was last measured, and the last four dates.
  - A cm/in toggle changes the reading only — stored values are never rewritten.
    `settings.measurementUnit` is seeded from the athlete's kg/lb choice by
    v12→v13, and the raw centimetres export as their own CSV.
  - The sheet prefills an existing date exactly; a different date starts blank
    with the last reading as a placeholder, because copying today's numbers to
    yesterday would record a measurement that was never taken.
  - Validation: 10 new measurement/CSV tests, a v13 migration test, and the
    bodyweight browser check now logs, edits, unit-toggles and deletes
    measurements in the real app.
  - The CSV export now round-trips: `import-measurements-csv.js` reads the same
    shape (cm or inch columns), merges same-date rows, skips implausible
    readings and never overwrites an existing date. Settings → Data auto-detects
    it beside the bodyweight reader.
  - Next: progress photos, which need a storage decision.

- **2026-11-21 — Adaptive warm-up ramp.**
  - The auto ramp now covers dumbbells, which the settings copy has promised all
    along: there is no bar to subtract, so each rung rounds DOWN to the heaviest
    bell in the active profile's ladder. `each`/`per-side` weights ramp per bell;
    a `total`/Both weight ramps in pair space and doubles back. An unconfigured
    ladder produces no ramp (and no `autoRamp` stamp) instead of inventing a bar.
  - `rampSetsFor` adapts the ladder to the movement: compound lifts keep
    40/60/80 (5/3/2 reps), single-joint work gets 50/75 (5/3), and bodyweight-only
    movements never ramp.
  - Validation: 6 new ramp tests (snap-down, pair space, empty ladder, rung
    selection, insert/stamp), the full node suite (2,005), typecheck, smoke and
    the live cockpit check.

- **2026-11-21 — `+ Drop` shortcut.**
  - A drop set is now one tap: the cockpit appends a `type:'D'` row seeded from the
    last filled non-warm-up set at 80% load, rounded to 2.5 kg / 5 lb, copying the
    set's shape (reps/time/distance) and its basis/load mode. Nothing is inferred at
    completion time — the athlete can edit or delete it like any other row.
  - The shortcut appears only after a working set is logged (the same
    `.has-logged-work` state that hides `+ Warmup`), sits after the prescribed rows,
    and keeps bodyweight/band/assisted loads as-is rather than discounting them.
  - Validation: 3 new row-mutation tests (kg, lb + warm-up skipping, no-source),
    the browser check at 320/390/412 px asserts visibility, 44px target, seeded
    weight lighter than the source and the `Drop set` pill, plus the full node suite.
  - Next: adaptive warm-up rounding or the Android device checklist.

- **2026-11-21 — Rest timer survives reload and backgrounding.**
  - The countdown is persisted to `localStorage` (`hybrid_restTimer_v1`) as an
    absolute end time, written only on state transitions — never on the 250 ms
    tick. A reload or a WebView killed in the background resumes the same rest
    with the time spent away already deducted.
  - A paused rest restores paused with its held remaining; adjusting ±30 s
    rewrites the snapshot. Expired rests are discarded rather than resurrected
    at 0:00, stale snapshots (>2 h) are ignored, and Reset all data clears it.
  - Validation: 7 new persistence unit tests, rest-timer browser check now
    reloads mid-rest at 320/390/412 px and proves the clock resumes, plus the
    full node suite (1,996), typecheck and smoke.
  - Next: the `+ Drop` shortcut or the Android device checklist.

- **2026-11-21 — Overhaul verification complete.**
  - All major Home/Train/History/Progress/Logger gaps identified in the audits
    are implemented across #259–#279. The Current status section records the
    shipped shape and the deliberate follow-ups.
  - Preflight passed on `main`: typecheck, precache check, workflow check,
    **1,989 node tests**, smoke, and **all 43 required browser checks**
    (374.5s, concurrency 3, two timeout retries).
  - Remaining items are explicit follow-ups, not unfinished audit work:
    readiness history components, per-muscle corridor charts, `+ Drop`, timer
    persistence, adaptive warm-up rounding, Android landscape/device checks and
    exercise-metadata batches.

- **2026-11-20 — P0 data correctness: every surface reads the real date.**
  - Week in Review totals, sessions, distance and PRs come from the calendar-week
    engine. Imported/archived `arch:*` weeks count on their stamped date; a frozen
    program week can no longer stand in for this calendar week.
  - Home's rail and Today card use `indexSlotsByDate`. Imported archived work
    today is the completed card; a frozen week cannot fake today; work in the
    active slot keeps Start/Resume (an off-plan lift there must not read as an
    imported completion). Run-only days open a recap and distance uses the
    athlete's unit.
  - Activities no longer invents a strength row from a cardio-only import's note;
    FIT strength keeps duration/HR/calories with no exercise names; provenance and
    kg/lbs/km/mi agree with the rest of the app.
  - Training load falls back to per-set RPE/RIR at read time and never writes
    derived effort; the memo signature includes set effort. Hybrid Score no longer
    scores imported-only history as 1.
  - Week in Review adherence is session-based, the same unit as the Progress hub,
    so it can no longer show "6% · 5/81" beside "4 of 4 planned".
  - Release review additionally made the score arc follow the reviewed day (a
    date-dependent test would have expired on 2026-11-22) and restored Start/
    Resume for work in the active slot; both were caught before merge.
  - Verified: 1,918 tests, typecheck, smoke, full 42-check browser suite, and a
    seeded real-UI trace with archived imports in mi/lbs.
  - Next: the data-safety "protect the bytes" PR 0, then Phase B History
    (calendar-first, delete/restore clearing `sessionStatus`/`sessionSummary`),
    then the audit's P1 list.

- **2026-11-20 — Release quality gate and PR template.**
  - Every product PR now states the gap-matrix rows it closes and a parity claim
    against the bar (a tier above openGym, on par with Hevy) for logging,
    programmes and the affected UI journey.
  - Merge requires evidence: browser checks plus a before/after interaction
    trace, tap-count comparison, empty/error/loading/offline coverage,
    320/390/412px + light/dark, 44px targets, settings-driven units, correct
    calendar/program attribution, no history rewrite and no new network surface.
  - `.github/PULL_REQUEST_TEMPLATE.md` carries the checklist. A phase that is
    functionally complete but UX-below-bar stays open with its exact gaps.
  - Baseline: 1,898 tests, typecheck, smoke, and all 42 real-browser checks pass
    on `main` `6b1abf7` (one local timeout retry).

- **2026-11-20 — Home date cells show recaps in place; no Activities detour.**
  - Clicking today always stays on Home: a ready day toggles its details, while
    completed/in-progress/rest days scroll to the Today decision or summary.
  - Clicking a completed date in the current or a previous week selects it and
    renders a day recap with duration, volume, sets, PRs, the muscle heat map
    and the stored program-day title. Back returns to the week recap or Today.
  - No date cell dispatches `app:open-activities`; the recap's explicit "Open
    full activity" is now the only route to the Activities page. Rest and
    planned dates are not links.

- **2026-11-20 — Active cockpit gets a compact, sticky header.**
  - Starting a session hides the full landing-style header, day selector,
    "Exercises" heading and vertical outline. A sticky block keeps Back, volume,
    sets, Finish, the session clock and a numbered exercise rail on screen.
  - The active card scrolls into view with a 245px offset so its first working
    set sits below the sticky block. Logging a set updates volume, set count and
    the rail in place, without a cockpit re-render.

Older entries: `docs/ROADMAP_ARCHIVE.md`.
