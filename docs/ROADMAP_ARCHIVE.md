# openHybrid Roadmap Archive

> **HISTORICAL — not a tracker.**
>
> This file holds the pre-restructure `docs/IMPROVEMENT_ROADMAP.md` verbatim, as
> it stood on **22 November 2026** (commit `8e07b85`), plus the full session log.
> It is kept for one reason: the completed phases, inventories, incident
> post-mortems and rejected alternatives are the evidence behind decisions that
> are still in force. Read it to answer "why is it like this?", never to find the
> current plan.
>
> The live plan is `docs/IMPROVEMENT_ROADMAP.md`. Do not add plan entries here;
> historical session-log entries are moved here verbatim so the live log stays
> at ten.
>
> What moved where:
>
> | Archive content | Current location |
> | --- | --- |
> | Sections 1–4 (objective, status, direction, principles) | Restructured in place, kept current |
> | Phase 0 experience inventory, journey map, vocabulary | Archive only (delivered) |
> | Phases 1–4, 2D, 6 task lists | Compressed to outcomes in "Delivered programme" |
> | Cross-cutting data rules, definition of done, quality gate | Kept current in the main doc |
> | Incident post-mortems (weekday dependence, silent skip, CI timing) | Archive only, plus the guards they produced |
> | Sections 10–11 (delivered foundations, execution queue) | Replaced by the capability matrix and phase queue |
> | Session log entries before 2026-11-20 | Archive only |

---

# openHybrid Product Improvement Roadmap

> Product and engineering source of truth.
>
> Reframed on **3 August 2026** around product quality rather than release
> readiness.

## 1. Product objective

Make openHybrid feel like the most natural way to combine strength and running:

- obvious without being simplistic;
- fast during training;
- calm and useful outside training;
- trustworthy when interpreting progress;
- adaptable without exposing unnecessary complexity.

The active goal is **not** Play Store release. Release work is parked while the
core product is improved. The next milestone is an app that feels coherent and
effortless in repeated personal use, not an app with more features.

openHybrid should answer three questions exceptionally well:

1. **What should I do today?**
2. **How do I log it with minimal friction?**
3. **Is my training working, and what should I do next?**

Everything on a primary screen must help answer one of those questions.

## 2. Current-state assessment

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


### Current status — 21 November 2026

The Home → Train → History → Progress → Plans surface overhaul and the Logger
upgrade have landed. In order:

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
  arm, thigh, neck) beside the bodyweight trend. Calendar-week attribution is used throughout;
  the Training Report covers 30 days or 12 months; the exercise drilldown has a
  real shape-aware trend, all-time bests and PR baseline.
- **Logger** supports reps, timed holds and loaded carries; failure, per-set
  rest/note, plate lines, load basis, effort, per-exercise shape/load/basis
  defaults, warm-up rest, a rest timer that survives reload/backgrounding, a
  `+ Drop` shortcut that seeds a lighter typed row, and a Last time / Next time
  recap.
- **Plans** keeps the active plan first, recommends from athlete fit, and has a
  Overview | Structure | Plan detail with week-stepped targets.

Deliberate follow-ups (not regressions): readiness history components,
per-muscle corridor charts, Android landscape/device checks and the remaining
authored exercise-metadata batches.

### What holds the experience back

- The product exposes too much of its capability at once. Home, Insights,
  Programs, Settings, and the workout cockpit can all become information-dense.
- The four-destination shell now uses Home / Train / Progress / Plans, but Train
  still opens directly into the workout cockpit rather than a true landing
  surface. Quick starts and recent activities need a more coherent Train home.
- Home contains several competing summaries and calls to action before the
  user reaches the answer to “what do I do now?”
- Analytics has many valid metrics but insufficient hierarchy. Users can see
  numbers without immediately knowing which matter, why they changed, or what
  action follows.
- Programs offers 57 choices before establishing a strong recommended path.
- Advanced logging controls are valuable but can visually compete with the
  basic set-completion flow.
- Some surfaces still behave like separate feature additions rather than one
  continuous interaction system.
- Non-EZ exercise technique metadata remains incomplete.
- Large modules and CSS specificity make consistent UX changes riskier than
  they should be.

### Product diagnosis

openHybrid does not need a broad redesign or a new visual identity. It needs
**progressive disclosure, clearer hierarchy, fewer competing actions, and
stronger continuity between planning, training, and review**.

## 3. Opinionated product direction

These are the working decisions for the improvement programme. They can change
when usability evidence contradicts them.

### Recommended information architecture

Use four primary destinations:

1. **Home** — today, immediate coaching, and this-week orientation.
2. **Train** — planned session, quick start, active session, and recent
   activities.
3. **Progress** — strength, running, consistency, and recovery.
4. **Plans** — current plan, recommendations, programme discovery, and builder.

Profile and Settings remain accessible from the avatar. The current central
Start destination should become part of **Train** and context-aware Home actions
rather than compete with Workout in the bottom navigation.

This is a proposed structural change. Implement it behind focused browser tests
and keep existing deep links/back routes working during migration.

### Home should be a decision surface

The first viewport should contain:

- a concise greeting/date;
- one dominant Today card;
- planned session or rest-day status;
- Start, Resume, or Review as the single primary action;
- one short coaching sentence;
- a compact weekly-progress strip.

Hybrid Score, readiness, streaks, weekly charts, goals, and highlights can
remain, but below the primary decision or inside Progress. Home should not
repeat the same metric in multiple forms.

### Train should feel physical and immediate

- Planned training and quick-start modes live in one place.
- During a workout, the current exercise and next action dominate.
- Advanced controls appear when requested or when context makes them relevant.
- Inputs favour one-handed use, large targets, predictable keyboard behaviour,
  and immediate feedback.
- Finishing creates a short useful review, not another form to complete.
- Running gets an equally clear active-session mode rather than feeling like an
  attachment to the strength cockpit.

### Progress should explain, not merely report

Every analytics surface should answer, in order:

1. What changed?
2. Is the change meaningful and comparable?
3. What contributed to it?
4. What, if anything, should I do?
5. How was it calculated?

The default Progress landing page should prioritise:

- consistency and completed training;
- strength progress;
- running progress;
- training balance/recovery.

Advanced metrics remain available through drilldowns. Do not add more metrics
until the existing ones have a clear audience, hierarchy, and action.

### Plans should recommend before asking users to browse

- Lead with the active plan and its next week.
- Offer a small set of clearly explained recommendations based on goal,
  experience, schedule, and equipment.
- Keep Browse all as a secondary path.
- Explain why a plan fits, its weekly commitment, progression, and equipment
  before showing catalogue-style detail.
- Offer Simple and Advanced editing paths rather than presenting every
  programme field at once.

### Coaching should be brief, specific, and inspectable

- One primary recommendation at a time.
- Name the evidence behind it.
- State confidence when data is sparse.
- Prefer “because” over unexplained scores.
- Offer one relevant action, not several generic question chips.
- Never let coaching contradict the planned session, completion status, or
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

## 5. Prioritised roadmap

Status: **ACTIVE**, **NEXT**, **LATER**, **DONE**, or **PARKED**.

## Phase 0 — Experience map and product contract

**Status: DONE 2026-08-03**

**Outcome:** a shared model of the app’s main jobs, destinations, and interface
rules before individual screens are polished in isolation.

### Tasks

- Inventory every app screen, sheet, modal, entry point, back route, primary
  action, empty state, loading state, and destructive action.
- Map these end-to-end journeys:
  - first use to first useful session;
  - open app to start/resume today’s workout;
  - quick-start strength/run/walk;
  - log, edit, finish, and review a workout;
  - understand this week’s progress;
  - choose or modify a plan;
  - find and understand an exercise;
  - recover from offline, sync, permission, or data errors.
- Classify every visible item as primary, supporting, advanced, or removable.
- Create a shared vocabulary for page headers, section titles, metric labels,
  actions, empty states, and error language.
- Record a baseline for taps, decision points, and time-to-completion on the
  core journeys.

### Completed experience inventory

The inventory below was reconciled against `index.html`, the app/action routers,
the analytics context router, programme and workout modules, automated browser
journeys, and the rendered app at 320px and 390px. It describes product
surfaces, not implementation-file ownership.

#### Primary and full-screen surfaces

| Surface | Current user job and entry | Important states/actions | Product owner |
| --- | --- | --- | --- |
| **Home** | Open app and decide what matters today | One week surface: the seven-day rail plus a state-aware Today decision that collapses to one compact row on a fresh day; alerts, Activities; sparse-data, rest-day, completed, active-fast, warning, and offline states | **Home**. Today owns the first decision and never hides its primary action; the rail is optional, Today is pinned. Progress owns deeper interpretation. |
| **Train** (`workout` route retained) | See the planned session, start/resume it, or start an unplanned activity | Week rail, session preview with exercises and `liftTarget` targets, one Start/Resume, Quick start (Run/Walk/Fast), one recent row; cockpit day selector, schedule context, session timer, GPS/manual run, exercise/set logger, advanced set options, swap/add/reorder/superset/plate math, finish, clear; rest, empty one-off, in-progress, completed, GPS wait/failure and invalid-input states | **Train**. The landing is a session preview, not a second Home. Start opens the cockpit directly; an active session is Resume. |
| **Progress hub** (`analytics` route retained) | Understand training history and choose a domain | Hybrid Score, Strength, Running, Recovery & Load, Review, optional Fasting, Body Weight, Projections | **Progress**. The old visible “Insights” label is retired; internal context IDs remain compatible. |
| **Progress details** | Explain a metric and expose evidence | Strength overview/stats, weekly volume, Gym Performance, exercise/muscle/metric drilldowns; Running overview/stats/performance/metric; Recovery overview/stats/performance; Review week/month; Hybrid Score; activity calendar; fasting/bodyweight/projections | **Progress**. Origin-aware Back returns to Home or Progress; entity drilldowns return to their parent and preserve calendar week. |
| **Plans library** (`program` route retained) | Continue, discover, save, compare, or create a plan | Active-plan banner, Discover/Saved/Completed, search, 16 category filters, five level filters, recommendations, collections and empty results | **Plans**. Phase 4 will lead with fit/recommendations before catalogue controls. |
| **Plan detail / active plan** | Decide whether a plan fits and inspect the current run | Overview/Structure/Plan, week/day preview, commitment/equipment, compare, save/copy/start/customise; current week/schedule and prior-run continuity | **Plans**. Preserve preview/logger prescription parity and activation isolation. |
| **Plan builder** | Create or modify a personal plan | Name/duration, days, exercise picker, order/replace/remove, weekly progression, preview/save/delete; unsaved and invalid states | **Plans**. Split Simple and Advanced paths later. |
| **Profile** | Review identity, all-time stats, active plan and achievements | Opened from Home avatar; links to plan, settings and goal editing; sparse-stat and no-plan states | **Profile**, reached from avatar rather than primary navigation. |
| **Settings** | Configure identity, units, training behaviour, equipment, notifications, appearance, backups, Health Connect and account | Long modal panel; permission unavailable, signed-out, backup unavailable, recoverable snapshot, destructive reset/delete and import-replace states | **Profile/Settings**. Preserve focus return, Android Back/Escape and explicit destructive scope. |
| **History list/detail** | Find exact logged strength, run and walk evidence; edit/delete a record | Calendar \| List, month headers, search, same-day separate runs, imported provenance, detail, route / no-route, empty history, delete with Undo | **History** is the record/action destination; **Train** keeps recent activity and **Progress** links to the same records as evidence. |
| **Session recap** | Review a just-finished or historical session | Completed work, comparisons, notable progress, share, route; sparse/partial session states | **Train**, with deep links into Progress evidence. |
| **Quick activity** | Track a run or walk now | GPS acquisition, live time/distance/pace, pause/resume, finish/cancel, permission/background/replay failures | **Train**. Phase 2C will give this surface parity with the strength cockpit. |
| **Onboarding and restore** | Start safely with a new profile or recover existing work | Restore-first gateway, name, goal, experience/frequency/recovery/equipment, recommended plan, optional units/bodyweight, notification choice, provisional score; import failure paths | **First use**. New setup must never obscure restore options or trap a permission denial. |

#### Visible hierarchy classification

| Surface | Primary | Supporting | Advanced / disclose on demand | Merge, move, or remove from default hierarchy |
| --- | --- | --- | --- | --- |
| **Home** | Today status + Start/Resume/Review | Greeting/date, one coaching sentence, retained Strength/Running In Focus cards | Calculation details beyond In Focus | Keep briefing/CTA/status merged into Today; remove repeated glance metrics; preserve In Focus and suppress score prominence while calibrating |
| **Train** | Current session, active exercise/set or active run, Finish | Day/session context, remaining outline, rest timer, Last performed | RPE/RIR, set type, load mode, notes, swap/add/reorder/superset, plate math | Move imports/setup out of active run; collapse completed/future exercise detail; keep alternate activity behind Quick Start |
| **Progress** | Consistency, Strength, Running, Recovery & Load headlines | Trend, interpretation, evidence link | Formula explanations, CTL/ATL/TSB, diagnostics, optional fasting | Merge overlapping Gym/Strength destinations; make Hybrid Score optional synthesis; remove equal visual weight from all eight current hub entries |
| **Plans** | Active plan and three-to-five explained recommendations | Weekly commitment, fit, sample week, progression, Browse all | Full filters, compare, complete plan, Advanced builder | Move 16 category and five level filters behind Browse all; remove repeated stats/decorative labels |
| **Profile/Settings** | Identity and entry to settings | Current goals, active plan and all-time context | Equipment map, notification tuning, integrations, backup/account controls | Group the long settings panel by job; never mix destructive data/account actions with everyday preferences |
| **Onboarding** | Restore existing data or set up a new profile; start first plan | Goal, experience, schedule/equipment fit | Units/bodyweight, notifications, score explanation | Shorten or defer optional score reveal/settings if first-session observation shows they delay training |

#### Dialog, sheet, and system-state inventory

| Group | Surfaces | Required close/recovery contract |
| --- | --- | --- |
| **Training** | Today summary, manual run logger, finish review, add exercise, exercise detail, swap exercise, clear today, workout picker, Quick Start, workout preview, rest/plate/set action disclosures | Escape/Android Back/visible Close where dismissible; commit current inputs before navigation; return focus and scroll to the trigger. Clear/discard names the exact workout and must not imply account deletion. |
| **Plans** | Create programme, activation/start-week choice, compare, builder exercise picker, programme-text fallback, programme rating | Return to the exact library/detail/builder context. Starting/restarting archives prior runs; it never edits catalogue data. |
| **Progress/profile** | Fasting detail, PR goal, settings, avatar/photo choice, celebration/share | Dismissal returns to the originating card. Optional or unavailable integrations remain skippable. |
| **Data safety** | Generic confirm, migration recovery, import preview, reset all data, Android state mirror | No silent default. Explain local scope, keep the durable mirror, and require an explicit destructive verb. |
| **System feedback** | Offline status, toast, loading copy, GPS acquisition/quality, Health Connect permission, service-worker update | Loading, offline, permission-denied, partial success and failure use different language; logging remains locally safe. |

#### Duplicate and competing ownership

| Current overlap | Decision |
| --- | --- |
| Workout tab versus global Start tab | **Resolved in the shell prototype:** Train owns the planned cockpit and Quick Start; no fifth Start destination. |
| Home CTA, Morning Briefing mission and Choose another workout | Phase 1B combines status/coaching/action into one Today card. One primary action; alternate workout remains secondary. |
| Home In Focus graphs, former At-a-Glance tiles and Progress domains | **Resolved:** Home retains the two owner-preferred In Focus graphs; the repeated At-a-Glance grid is removed. Progress owns deeper comparison and calculation detail. |
| Home History, Progress activity calendar and session evidence | **History** owns calendar/list browsing, detail and edit/delete. Train owns recent activity; Progress links to the same exact records as evidence rather than maintaining a competing calendar. |
| Manual run logger, cockpit run card and GPS Quick Activity | Train distinguishes **Track now** from **Log a past activity**; the active-session hierarchy is shared in Phase 2C. |
| Active-plan banner in Plans, Home programme week and workout day selector | Plans owns plan management; Home shows only today/this-week context; Train owns session/day selection. |
| Current body weight in Settings and Body Weight history in Progress | Settings owns the profile baseline/unit; Progress owns dated entries and trend interpretation. |

### Journey map and baseline

Tap counts are the shortest current path from the named start with the needed
data already present. “Decision points” count screens/sheets where the user must
choose a path, not individual form fields. Human recognition time has not been
measured; the repeatable baseline is tap/decision count plus the visible
first-viewport evidence. Phase acceptance that specifies seconds still requires
direct usability observation.

| Journey | Current shortest path and completion | Baseline | Recovery and principal friction | Intended owner |
| --- | --- | --- | --- | --- |
| **First use → first useful session** | Restore/new gateway → name → goal → experience/equipment → choose recommended plan → optional setup → notification choice → score reveal → Home → Today | 8–10 taps after text entry; 7 decision surfaces | Back exists through setup; import is available before creating empty data. It is capable but long, and the provisional score delays first training. | First use → Home → Train |
| **Open → planned start/resume** | Home → Start/Resume today | 1 tap; 0 intermediate decisions | Strong path. Rest/completed/unresolved-day states must never reuse the wrong action. | Home → Train |
| **Choose another strength session** | Home → Choose another workout → programme/empty/copy-past choice | 2 taps plus session choice; 1 sheet | Choice sheet is safe and activation-aware, but “planned”, “empty” and “copy past” need clearer hierarchy. | Home/Train |
| **Quick run/walk/fast** | Train → Quick start → mode | 2 taps when already in Train; 3 from another destination | The four-tab prototype removes a competing global Start destination but adds one tap from Home. A future Train landing should expose common modes without crowding the active cockpit. | Train |
| **Log → edit → finish → review strength** | Edit weight/reps → complete set; repeat → Finish Workout → Finish → recap | Normal set: 3 interactions; finish: 2 taps; 1 finish decision | Explicit validation, session persistence, Keep Training and Discard exist. Advanced controls and long scrolling compete with the active exercise. | Train |
| **Understand this week** | Home orientation → tap strength/run/readiness/volume → Progress detail/evidence | 1 tap to a detail; 1 domain decision if entering Progress directly | Accurate calendar attribution is strong; Home repeats summaries and Progress presents eight equal entry choices before interpretation. | Home → Progress |
| **Choose or modify a plan** | Plans → search/filter/recommendation → detail → Start/Customise → activation/builder | 3–6 taps before activation; 2–4 catalogue decisions | Compare, fit and safe copy exist. Sixteen category filters and 57 programmes precede a confident recommendation path. | Plans |
| **Find and understand an exercise** | Train add/swap or builder picker → search/filter → detail → select | 3–5 taps; 2 picker decisions | Shared search/detail/aliases are consistent and custom exercises are preserved. Technique metadata outside reviewed EZ-bar entries remains incomplete. | Train/Plans shared picker |
| **Recover from failure** | Offline banner/local save; GPS/Health permission message; sync choose-version modal; import preview; snapshot recovery in Settings | 1–3 decisions depending on failure | Data recovery is strong but scattered. Error copy and a single “where do I fix this?” route need standardisation. | Context first, Settings for durable repair |

### Shared product vocabulary

| Meaning | Use | Avoid or reserve |
| --- | --- | --- |
| Primary destinations | **Home, Train, Progress, Plans** | Workout/Insights/Programs as destination labels |
| Named schedule | **plan** in navigation and general guidance; **programme** when referring to a specific catalogue/builder object | Routine, template, schema |
| One performed occurrence | **session**; use **workout** for strength-oriented sessions and **activity** for cross-modality history | Day slot, record, blob |
| Begin/resume/review | **Start**, **Resume**, or **Review** according to actual state | Go to, continue when the resulting state is ambiguous |
| Persist deliberate work | **Save** for forms/imports; set completion is direct and immediate; **Finish workout/activity** ends a session | Submit, commit, sync as user-facing verbs |
| History-derived values | **Last performed** for read-only evidence; **Suggested next** for active-run progression; **Use previous values** for explicit copying | Previous target, auto-filled history |
| Empty/loading/error | “No … yet” + next action; “Loading …”; “Saved on this device”; specific failure + recovery action | Blank cards, perpetual spinners, generic “Something went wrong” |
| Destructive actions | Verb + exact object: **Discard workout**, **Delete activity**, **Reset all data**, **Delete account and cloud data** | Clear, remove, reset without scope |

### Four-destination route contract

The visible information architecture can change without a risky route rewrite:

| Stable internal target | Visible destination | Compatibility rule |
| --- | --- | --- |
| `home` | Home | Remains the default landing and owner of today’s single primary action. |
| `workout` | Train | Existing Home, programme, quick-start and resume actions continue to resolve. Train owns the Quick Start trigger. |
| `analytics` + existing context IDs | Progress | All current contexts and `app:navigate` deep links remain valid. Internal origin value `insights` is retained for compatibility; visible Back copy says Progress. |
| `program` | Plans | Programme details, active-plan view, builder, profile links and browser checks retain their current targets. |
| `profile` / `custom:settings` | Avatar surfaces | No primary nav item. Back closes the modal/subview before returning Home. |
| full-screen activity/recap and managed modals | Contextual child surfaces | Android Back/Escape closes the top child first and restores the initiating surface/focus. |

### Acceptance

- **Met:** each journey has a stated start, completion, recovery and friction.
- **Met:** every destination, important full-screen surface and modal group has a
  user job and product owner.
- **Met:** duplicate actions have an explicit owner and resolution.
- **Met:** Home / Train / Progress / Plans keeps stable internal route IDs and
  was validated against current action routes before the shell prototype.

## Phase 1 — Navigation and Home hierarchy

**Status: FOUNDATION COMPLETE — In Focus polish remains a later bounded pass**

**Outcome:** opening openHybrid immediately answers what matters today.

### 1A. Navigation

- **DONE 2026-08-03:** Replaced the five-item Home / Workout / Start / Insights /
  Programs shell with four intent-led destinations: Home / Train / Progress /
  Plans. Quick Start moved inside Train, visible analytics/back copy now says
  Progress, and internal route/context IDs remain unchanged for compatibility.
- [x] Prototype the four-destination navigation.
- [x] Consolidate Workout and Start into Train.
- [x] Rename Insights to Progress.
- [x] Keep avatar access to Profile and Settings.
- [x] Preserve history/back behaviour for every analytics and programme drilldown.
- [x] Make active state, labels, and icons unambiguous at 320–412px and 200% text.

### 1B. Home

- **DONE 2026-08-03:** Replaced the full Hybrid Score hero, Morning Briefing,
  standalone workout CTA, and separate alternate-workout action with one
  calendar-day-aware Today card. It owns the first decision and does not follow
  a stale day last selected in Train.
- **DONE 2026-08-03:** Support these mutually exclusive states:
  - planned session ready;
  - session in progress;
  - session completed;
  - rest day;
  - unresolved workout from another day;
  - limited/offline data.
- **SETTLED:** a missing/corrupt active plan continues to route directly to the
  existing Plans recovery surface, which explains that history is safe and asks
  for a replacement. The pure Today model also has a no-plan fallback, but Home
  must not bypass that stronger data-recovery contract.
- [x] Combine readiness/coaching into one short contextual message.
- [x] Reduce Hybrid Score to a supporting summary unless it has enough evidence to
  explain a meaningful change.
- **OWNER DIRECTION 2026-08-03:** Keep the Strength and Running **In Focus**
  cards on Home. Their inspectable weekly bars and exact-day interaction are a
  valued part of the product, not expendable duplication.
- **DONE 2026-08-03:** Removed the four-card At-a-Glance grid because its
  Readiness, Weekly Volume, Top Lifts, and Average Pace repeated information
  already owned by Today, In Focus, and Progress.
- [x] Preserve and clarify the In Focus cards, including their exact Progress
  and activity routes.
- [x] Move repeated supporting metrics out of Home.
- [ ] Revisit In Focus visual density only as a deliberate polish pass; do not
  replace or remove the cards without owner direction.
- [x] Make Choose another workout a clear secondary action inside Today/Train.

### Acceptance

- **Needs direct observation:** a user can identify and start the intended
  action in under five seconds.
- **Met in responsive browser checks:** the first viewport has one primary
  button and the complete decision card remains visible at 320–412px.
- **Met:** no separate At-a-Glance grid repeats Today/In Focus metrics; the
  retained In Focus cards remain the intentional Home analytics surface.
- **Met in state and routing tests:** rest, completed, in-progress, and
  unresolved states cannot recommend starting the wrong
  session.
- **Met:** Home remains useful with no history and sparse data; missing/corrupt
  plans use the explicit Plans recovery surface.

## Phase 2 — Natural workout and run logging

**Status: COMPLETE 2026-08-07 — 2A, 2B and 2C all delivered.** One 2A item was
consciously left: making superset, reorder and plate-math contextual rather than
equally prominent (only `+ Warmup` was done). It is a prominence tweak, not a
gap in the journey, and is folded into the Phase 6 visual-system work.

**Outcome:** logging feels faster than remembering the workout later.

### 2A. Strength cockpit

- **DONE 2026-08-03:** Separate global Last performed history from
  activation-and-workout-day-scoped progression suggestions. New-program fields
  stay blank and historical values enter them only after **Use previous values**.
- **DONE 2026-08-05:** Make the active exercise visually dominant; collapse
  completed/future exercises while retaining a clear session overview. The
  accordion already did the dominance and collapsing; the session outline (below)
  supplied the missing "clear session overview" half.
- Design a consistent set-row interaction:
  - **DONE 2026-08-05 — previous values visible.** Last time's numbers were only
    ever an input PLACEHOLDER, so they vanished on the first keystroke — exactly
    when you want to compare against them. Each row now carries a persistent
    `Last 62.5kg × 8` line (`previousSetLabel`), from the same
    `priorPerformance.workingSets` the call site was already computing and
    `buildSetRow` was silently discarding.
  - weight and reps easy to edit;
  - **DONE 2026-08-05 — completion is the strongest row action.** Quick-log and
    the tick both complete a set, and quick-log was the loud one: a filled blue
    button beside a plain grey square. Quick-log is now a quiet outline and the
    tick is drawn as the primary control even before it is ticked. Touch targets
    unchanged at 44px — this de-emphasises, it does not shrink.
  - RIR/RPE, set type, load mode, and notes progressively disclosed *(RIR is
    already disclosed on completion via CSS; set type/load/remove sit behind the
    `⋯` control)*;
  - **DONE 2026-08-05 — invalid or incomplete input explained inline.**
    Completion previously ran a blank-check only, so `-50` and `0` reps were
    both accepted. `validateSetEntry` (`js/workout/set-entry.js`) refuses
    impossible values and warns on merely surprising ones, and the message
    renders on the offending row instead of in a toast.
- **SETTLED 2026-08-05:** ticking a set opens the rest timer (existing
  behaviour) rather than advancing focus. Keeping it: rest is the thing that
  actually happens next, and with the timer now attached to the card and
  pausable, it no longer takes the screen away from the athlete. Advancing focus
  would also fight the auto-flow accordion, which already moves on when an
  exercise finishes. Recorded as a decision, not left implicit.
- **DONE 2026-08-05:** Keep rest timing attached to the active exercise/set,
  with obvious pause/skip/adjust controls. Adjust (±30s) and skip (Done) already
  existed and the bar already re-parents into the open card; **pause did not** —
  the bar rendered a decorative "⏸ REST" label with no pause behind it.
  `toggleRestPause` makes that label the control it looked like.
- **PARTLY DONE 2026-08-05:** Make add, swap, reorder, superset, warm-up, and
  plate-math actions contextual instead of equally prominent. `+ Warmup` now
  steps aside once a working set is logged (you do not warm up after your work;
  any row can still be re-typed to a warm-up from its ⋯ menu). Superset, reorder
  and plate-math prominence are untouched.
- **DONE 2026-08-05:** Lightweight session outline above the accordion
  (`js/workout/session-outline.js` pure model + render in `js/workout.js`):
  one row per exercise with its working-set count and done/active/todo status,
  plus a summary stating remaining WORK ("4 sets left · 1 of 5 exercises done"),
  never a percentage. Tapping a row jumps to that exercise. Counting rules
  match the logger exactly — warm-ups excluded, `isCompletedSet` decides done —
  so the outline can never promise more remaining work than the card beneath it.
- Preserve all existing data and programme-target semantics.

### 2B. Session completion

**Status: DONE 2026-08-06.**

- **DONE — a review, not a form.** The sheet showed two numbers and asked for
  three inputs. Duration stays visible; gym effort, run effort and notes moved
  behind an optional disclosure that auto-opens when any of them already has a
  value (a collapsed field holding real data reads as "not recorded"). Finish is
  the one dominant action, Keep Training is quiet, and Discard is separated below
  a divider so it cannot be hit while reaching for Keep Training.
- **DONE — notable progress.** The sheet could not have shown an achievement
  even if it wanted to: `updateExercisePRs()` runs inside the finish handler,
  after the sheet is populated and as it closes. `js/workout/session-review.js`
  (`buildSessionReview`, pure) computes the session's bests from the SAME
  canonical primitives the Strength screen uses — `isValidWorkingSet`,
  `estimatedE1rmForSet`, `isE1rmPr`/`E1RM_PR_EPSILON` — so a "new best" here can
  never be one the rest of the app disagrees with. Hidden entirely when nothing
  was beaten. The previous best spans archived program runs, so switching
  programs cannot hand out fresh records.
- **DONE — notes optional, and remembered where they were entered.** The sheet's
  notes field reads and writes `week.notes[day]`, the same store the cockpit's
  notes field uses, so the two can never hold different text for one session and
  the athlete is never asked twice on a blank field.
- **DONE — low adherence explains itself without blocking completion.**
  `completionPresentation` was returning one generic body for every finishable
  session — including one that completed everything, which was warned that work
  "will be treated as skipped" when nothing had been. Adherence now selects the
  explanation (complete / strength-complete / run-complete / partial) and never
  the availability of Finish. The partial wording states it is a normal session,
  not a failure.
- **DONE — discard scope unmistakable and recoverable.** The confirmation said
  "Clear today's log?" — wrong whenever another day was selected, and "Clear"
  is reserved by the shared vocabulary precisely because it states no scope. It
  now names the exact workout ("Discard Friday's Pull B + Easy Run workout?")
  and what is and is not affected. `snapshotDayWorkoutData` /
  `restoreDayWorkoutData` (beside the clear, so a field cannot be cleared
  without being captured) make it reversible, and the stored GPS route is
  deferred to the undo window's `finalize` — deleting it immediately would let
  Undo restore a run whose route was already destroyed.
- **DONE — the completed state does not dead-end.** The recap offered only
  "Done"; it now links to the exact record in history and to Progress.
- **Extracted while doing it:** `js/ui/undo-bar.js`. Activities and the cockpit
  share one undo DOM element, so two independent implementations would race for
  the same timer and strand each other's `finalize()` — an orphaned GPS route.
  One owner, `finalize` guaranteed to run exactly once.

### 2C. Running

**Status: DONE 2026-08-07.**

- **DONE 2026-08-07 — the live run has its own focused surface.** The cockpit
  run card enters a focus mode while a session is live (`run-session-active`):
  setup, manual distance/time/RPE entry, notes and the watch-import tile step
  aside so the session and its controls are what is on screen. Nothing is
  removed — `stopTracking` fills those same inputs, so they return holding the
  run the moment it ends.
- **DONE 2026-08-07 — elapsed time, distance, pace, GPS quality, pause/resume
  and Finish are the priority.** A live signal chip was added to both surfaces
  (cockpit + Quick Activity), and Pause/Finish were rendering at 38px, under the
  app's own 44px touch target — found by driving the surface, not by reading it.
- **DONE 2026-08-07 — the live run speaks the athlete's distance unit.** The
  tracker was the ONE surface in the app that did not convert: a miles athlete
  watched kilometres climb under a hardcoded "DIST (KM)" label, then saw the
  number change on Stop, because `stopTracking` fills the cockpit input in the
  display unit. `js/gps/active-run-display.js` is the shared model for both
  surfaces, and the browser check asserts the live figure and the saved figure
  are the same number.
- **DONE 2026-08-07 — a live run cannot be collapsed or reparented out of
  view.** `.run-collapsed` hides `.run-body-content` wholesale and a re-render
  applied it on any day with no scheduled run — precisely when an unscheduled
  run is being tracked. Reordering is skipped for the same reason: moving the
  node detaches the live Leaflet map from under the athlete.
- **DONE 2026-08-07 — acquisition, permission denial, background tracking,
  replay and partial-route states all read honestly.**
  `js/gps/run-notices.js` is the copy model; the rule it enforces is that a
  toast is for something that HAPPENED and is over, while every state here is a
  CONDITION still true after the message fades.
  - **Acquisition + signal**: searching / strong / fair / weak / no-signal /
    paused, graded from the LAST accepted fix, never the whole-run summary.
  - **Permission denial**: the three `GeolocationPositionError` codes were
    collapsed into one "GPS unavailable" message. They are now distinct, and a
    denial points at the setting only the athlete can change.
  - **Background tracking**: the web build states plainly that it stops when the
    app leaves the foreground; Android states that it keeps recording. Shown
    before the phone goes in a pocket, not discovered by losing a run. An
    unknown platform defaults to the weaker claim.
  - **Replay**: a recovered run says whether anything is MISSING — the one fact
    the athlete cannot work out themselves when the run disagrees with their
    watch. Rendered without sending the still-live session back to the start
    panel.
  - **Partial route**: "saved without its map" names what survived (distance,
    time, splits) instead of a vanished toast; a run that never had a route is
    not reported as having lost one.
- **DONE 2026-08-07 — fixed a dead end this work uncovered.** With location
  denied, Home Quick Start opened a full-screen Activity view holding nothing
  but "← Cancel": the web error path called `showPanel('start')` and that scope
  has no start panel. `startTracking` now returns `{ ok, reason }` instead of a
  bare boolean every caller ignored, and the notice is that screen's content.
  Retry repeats the same activity — a blocked walk must not return as a run.
- **DONE 2026-08-07 — a mid-run dropout no longer risks the session.**
  `onPositionError` while tracking returns after refreshing the signal, so
  recorded distance is never discarded over a transient loss.
- Use the user's distance unit consistently at every boundary. *(Live tracker
  done. The other two write boundaries already land on the canonical km store:
  the manual logger converts its input by the setting, and a FIT session's
  `total_distance` is parsed as kilometres to begin with.)*

### Acceptance

- A normal working set can be logged with one edit-and-complete sequence.
- Advanced controls never obstruct basic logging.
- No keyboard covers the active input or primary action.
- Changing exercise/day/session preserves user-entered work.
- Strength and running finish flows use the same interaction vocabulary.

## Phase 2D — Logger upgrade (planned)

**Status: L0–L4 done.** The logger has the truth fixes, set shapes, rest
overrides, plate line, timer persistence, `+ Drop` and the adaptive warm-up
ramp. The openGym logger was inspected as a reference for
CONCEPTS only. No openGym code, media or nested data shape is copied.

**Outcome:** the number the athlete types means what they think it means, and a
set can be a rep set, a hold, a carry, or a failure without lying to volume,
1RM, history or progression.

### Surface model — list, not one exercise per page
- **No page-per-exercise carousel.** openGym's version is built around a large
  exercise demo; without that media it would hide the session and add a swipe
  to every jump. Hevy's scrolling exercise list is the better reference.
- Keep the existing accordion: a numbered exercise rail (`1..N`) jumps between
  exercises, the active card expands, completed cards collapse to a summary,
  and Prev/Next at the card foot moves focus without hiding the rest.
- A deliberate "Focus" mode may come later as an optional layout; it is not the
  default and is not part of the first slice.

### Set-row contract
- Five columns only: **SET | PREVIOUS | WEIGHT | REPS | ✓**. The set number is a
  label, not a Log button; the tick is the single completion action. A blank row
  takes its visible target/ghost and then validates, as the checkbox already
  does.
- PREVIOUS is the real prior set for that row (`60×8`), or an em dash when there
  is none. It is never the prescription or a ghost.
- Completed rows read as one compact line; the active row is the only one with
  highlighted inputs. RIR/RPE appears after completion. Set type, load, rest
  after this set, note and remove live in the `⋯` sheet.
- Target: a working row no taller than ~52px, so a 390×844 cockpit shows the
  active exercise, its previous values and at least the first working set under
  the sticky session block.

### Settings model — simple but comprehensive
Three levels only. Session defaults live in Settings; per-exercise and per-set
options live in the `⋯` sheets. Nothing appears in two places.

**Settings → Training → Logging (session defaults)**
- Weight unit (kg/lbs) with an explicit Convert / Keep numbers choice.
- Dumbbell load default: **Each / Both**; one-arm work is detected, and an
  exercise can override it.
- Effort scale: **Off / RIR / RPE** (one scale, not one per set).
- Rest: auto timer on/off; compound / accessory / isolation tiers; warm-up rest.
- Auto warm-up ramp: off/on (rungs round to owned plates/dumbbells).
- Previous values: **Last / Best** under each exercise.
- New exercises start with: **Plan / Last session**.
- Plate hints: off/on (bar and plate inventory stay under Equipment).
- Keep screen awake; collapse completed exercises.

**Per-exercise `⋯` (only what that exercise needs)**
- Mode: Reps / Time / Distance.
- Load default: Weighted / Bodyweight / Assisted / Band.
- Weight meaning: Each / Both / Per side (auto-detected, overrideable).
- Rest: Use default / Custom / No timer.
- Warm-up: Auto / Own / None (only when the ramp is relevant).
- Note.

**Per-set `⋯`**
- Set type: Working / Warm-up / Drop / Failure.
- Load mode (the row-level version of the default).
- Rest after this set: default / custom / no timer.
- RIR/RPE after completion; note; remove.

**Deliberately not copied from openGym**
- Pyramid sets, tempo, per-side L/R sub-rows, per-exercise unit pins,
  per-exercise plate-loading overrides, cardio mode inside the strength logger,
  circuits/AMRAP player, animations/orientation/button-layout switches, custom
  sound packs, spoken cues, and warm-up/bodyweight volume toggles. These are
  either separate features, analytics settings, or complexity without a clear
  logging payoff.

### L0 — Truth fixes (first)
- **DONE 2026-11-20 — a first-ever row no longer labels the prescription as
  history.** `buildSetRow` defaulted `previousSetData` to the ghost target, so a
  new lift with a coaching/target weight rendered `Last 112.5kg × 6` above
  "First time logging this". The default is now null; only a real prior set
  renders the persistent Last line.
- **Unit switch needs an explicit decision.** Changing kg ↔ lbs must offer
  Convert the numbers / Keep the numbers and change the label (openGym's
  behaviour), never silently reinterpret stored loads. Convert every weight
  field before writing the new unit.
- Keep target, ghost and history visually separate: target is a prescription,
  ghost is an editable suggestion, Last is measured work.

### L1 — Load basis (the big one)
- Add an optional `basis` to a set/exercise: `total` (default legacy), `each`
  (a dumbbell pair; volume counts both) or `per-side` (one-arm; volume counts
  the one implement). One-arm/pair detection comes from the catalogue and the
  exercise name, never from guessing at entry time.
- Store `w` as ENTERED and stamp the basis used; old sets have no basis and keep
  exactly today's meaning (total, counted once). No retroactive rewrite.
- Centralise `effectiveLoad(set, exerciseName)` and use it in `setVolume`,
  e1RM, history, weekly aggregation and progression. The weight column label
  becomes `Each (kg)` / `Both (kg)` / `Per side (kg)`.
- **DONE 2026-11-21 — per-exercise Load default and Weight meaning.** The
  config sheet stores Weighted/Bodyweight/Assisted/Band and Each/Both/Per side;
  a blank row renders that default, and completion stamps the load mode/basis
  actually used. Logged sets are never rewritten. openGym plan prescriptions
  carrying a basis remain future import work.

### L2 — Set shapes
- **DONE 2026-11-21 — failure flag**; unrated failure reads as RIR 0.
- **DONE 2026-11-21 — timed holds (`sec`) and loaded carries (`dist`, metres)**
  are real set modes. The row swaps its second input to time/distance and the
  `⋯` sheet cycles Reps → Time → Distance. Volume stays weight × reps, so
  holds/carries add no invented tonnage; they still count as working sets.
  CSV import now preserves them instead of skipping them, and a carry name
  containing “walk” is not turned into a run.
- **DONE 2026-11-21 — `+ Drop` shortcut.** `appendDropSetRow` appends a separate
  `type:'D'` row after the prescribed sets, seeded from the last filled non-warm-up
  set: 80% load rounded to a loadable step (2.5 kg / 5 lb), same shape and reps,
  and the source's basis/load mode. It is hidden until a working set exists, and a
  bodyweight/band/assisted source keeps its load instead of inventing a discount.
  Rest-pause/cluster stay deferred until real use demands them.

### L3 — Rest and timer
- Surface the rest tiers that already exist but are hidden (compound/accessory/
  isolation), plus warm-up and next-exercise rest.
- Per-exercise and per-set rest overrides (`restSec`) with an explicit "No
  timer" value (0).
- Superset rounds rest once, on the longest member.
- Persist the running timer (`endsAt`) across reload/background; arm the
  Android notification at START, not only when the countdown happens to end
  while hidden. ±15s alongside the current adjustment.

### L4 — Plates and warm-ups
- Inline per-set plate line (per side) with a "short" warning and delta chips
  between consecutive loads; bar weight per equipment type.
- **DONE 2026-11-21 — warm-up rungs adapt to the equipment and the movement.**
  Dumbbell lifts now ramp on the profile's owned ladder (each rung rounds DOWN
  to a bell the rack has, and an unconfigured ladder produces no ramp rather
  than barbell math). `rampSetsFor` gives compound lifts the three-rung
  40/60/80 ladder and single-joint work two rungs (50/75%); bodyweight-only
  movements never ramp because there is no external load to build up.

### L5 — Polish
- Per-set note (140 chars), RIR/RPE display choice, planned-vs-last prefill
  choice. No new account, sync or backend surface.

### Acceptance
- A 2 × 20 kg dumbbell set at 8 reps counts **320 kg** volume with basis
  `each`, **160 kg** with `total`; a one-arm row counts once. Existing logs
  keep their stored meaning.
- A timed hold or carry is loggable and importable without inventing reps.
- A failure set contributes RIR 0 unless the athlete rated it.
- A running rest timer survives a reload and alerts when backgrounded.
- Every new setting is reachable from Settings or the exercise config.

## Phase 3 — Progress and analytics redesign

**Status: COMPLETE except readiness-component details, which need a persisted
readiness history (see 3D) and are deferred to a data-model change.**

**Detail screens re-audited 2026-08-09 — no change warranted.** Every analytics
context renders lean (22–108 nodes, 406–900px) with no placeholder `--` tiles,
and the dense load-model dashboard already sits behind an opt-in Stats tab as 3B
requires. A proposed reorder of the Strength detail was withdrawn: it rested on a
measurement taken from the wrong element. Render the context by name and count
before reopening this.

**Outcome:** Progress turns training history into understandable decisions.

### 3A. Progress landing page

Create four primary domains:

1. **Consistency** — sessions completed, planned versus performed, and streak
   context without shame.
2. **Strength** — comparable lift progress, volume, and muscle set credits.
3. **Running** — distance, pace, duration, and performance trends.
4. **Recovery & Load** — readiness inputs, training load, and balance.

Each domain shows one headline, one trend, one interpretation, and one link to
detail. Optional fasting analytics appear only when the user enables fasting.

- **DONE 2026-08-04:** The hub is no longer a static index of eight equal links.
  `js/analytics/progress-landing.js` (pure model) and
  `js/analytics/views/view-progress-hub.js` (presentation) render the four
  domains above, each with a headline, a like-for-like comparison, one
  plain-language interpretation and one route to its evidence.
- [x] Consistency exists as a first-class domain for the first time, built from
  real stamped dates so archived activations still count.
- [x] Hybrid Score demoted to a secondary destination (optional synthesis).
- [x] Fasting appears only for profiles with an active or completed fast.
- [x] Review is owned by the Consistency card alone — the duplicate secondary
  entry to the same screen was removed.
- [x] **DONE 2026-08-04:** domain cards now carry a labelled trend sparkline
  where an honest series exists — Consistency (training days, 8 weeks),
  Strength (the named lift's own e1RM, 12 weeks, same-exercise) and Running
  (the metric engine's weekly points). Recovery has no trend, because
  readiness keeps no history and a fabricated flat line would be worse than
  none. Fixed `spark()` while doing it: a constant series was pinned to the
  baseline, so a steady 3 sessions a week rendered identically to zero.

**Volume Guide (MEV) — DONE 2026-08-04.** The guide was the weakest analytics
surface: buried under Strength → Stats, drawn as one unlabelled bar stacking
four overlays, and described in vocabulary rather than facts.

- [x] Unified onto the single `classifyVolume` landmark classifier. The module
  had been re-implementing weaker thresholds of its own, so the guide and the
  muscle landmark report could describe identical volume differently.
- [x] Rows now carry the full MV/MEV/MAV/MRV scale and draw against an axis that
  runs to the usual ceiling, with the landmarks labelled. Previously the band
  collapsed to min–max and discarded MRV, so 30 credits against a ceiling of 26
  looked identical to a merely productive week.
- [x] Statuses state facts and distances — "4 credits below the 8–18 typical
  range", "26 credits is the usual weekly ceiling" — replacing "Below general
  reference" / "Covered". Guidance never becomes a prescription; a browser
  assertion fails the build if any status starts instructing.
- [x] Focus tab sorts by what needs attention (below range, then above ceiling,
  then in range).
- [x] Priority selects moved off the 19-row default list into their own
  Priorities tab.
- [x] Summary splits into in-range / below / above-ceiling / not-started, and
  the four buckets always sum to the focus count.
- [ ] Deferred by owner decision: per-muscle multi-week corridor charts
  (`muscleVolumeCorridor` exists but is barely surfaced) and any review of the
  landmark values themselves.

### 3B. Metric hierarchy

Classify every metric:

- **Headline:** useful to most users and actionable.
- **Supporting:** explains a headline.
- **Advanced:** useful to an informed subset.
- **Diagnostic:** visible only when explaining a model.
- **Remove/merge:** duplicates another metric or has no clear action.

Initial recommendations:

- Promote completed sessions, same-exercise estimated 1RM trend, weekly running
  volume, best sustainable pace, and readiness confidence.
- Keep CTL/ATL/TSB and formula-level values behind explanations.
- Treat Hybrid Score as an optional synthesis, not the sole definition of
  progress.
- Merge “Gym Performance”, “Strength Stats”, and overlapping strength
  destinations into a clearer Strength Progress hierarchy.
- Use Training Load and Recovery as related but distinct concepts.

### 3C. Detail-screen contract

Every metric detail includes:

- plain-language title and current value;
- date range and comparison basis;
- accessible trend visual;
- “What changed” summary;
- exact contributing activities;
- “How this is calculated” disclosure;
- honest empty, sparse, partial-week, and permission-limited states.

### 3D. Remaining model work

**Status: SUBSTANTIALLY DONE 2026-08-04 — one item deliberately not attempted.**

- [x] **Strength Performance on calendar-dated, same-exercise e1RM + exact
  evidence.** Satisfied by `strength-calendar.js` / `calendarStrengthSummary`
  (same-exercise only, identity = the lift's bare-string name) plus
  `strength-detail.js`'s evidence rows. Verified during the audit below rather
  than rebuilt.
- [x] **Recovery details** for sleep, resting HR, HRV and steps —
  `js/analytics/recovery-detail.js` + `views/view-recovery-metric.js`. Soreness
  and mood were added alongside them.
- [ ] **Readiness COMPONENTS remain undone, and not by oversight.** Readiness is
  computed on demand and no history is persisted, so a component detail would
  have no series to show. Giving it one means persisting a readiness history —
  a data-model change with sync and migration consequences, which does not
  belong inside a presentation phase. Deliberately deferred, not forgotten.
- [x] **Projection sample-size/confidence treatment** — `trendQuality` grades
  each projection on sample count AND fit, and the horizon it may claim is
  capped by that grade.
- [x] **Calendar-week/program-week audit.** Result: `running-detail.js`,
  `strength-detail.js` and `strength-volume-detail.js` contain ZERO genuine
  `state.currentWeek` reads (their `currentWeek` mentions are local period
  parameters). The only real reads are `logged-days.js`'s `resolveSlotDate`
  pair, which legitimately owns the legacy program-slot mapping used when
  writing an activity back to a program day. `tests/analytics_calendar_guard.js`
  now covers five further modules so this stays true; the extension was verified
  by planting a violation and confirming it fails.
- [x] **Edit/delete/import propagation** — `tests/analytics_propagation.test.js`
  mutates state in place (the same object identity the app mutates) and asserts
  every model recomputes: deleting a workout, editing a set weight, correcting a
  DATE so work moves week, importing a run, importing wellness readings, and
  coaching projections losing confidence as history is removed.

### Acceptance

- A non-expert can explain the main trend after reading one screen.
- No default screen requires knowledge of analytics acronyms.
- Every recommendation links to its evidence.
- Partial weeks compare like-for-like elapsed periods.
- Zero, sparse, or missing data never produces false precision.
- No new analytics metric is added without an audience and action statement.

## Phase 4 — Plans, exercise discovery, and editing

**Status: 4A, 4B and 4C COMPLETE (2026-08-07)** — recommendation engine,
active-plan lead, chip/collection overload, compare, the programme-detail
decision order with a real "Who it's for", Simple | Advanced progression editing,
and one undo across every plan-changing editor action. **4D (exercise metadata)
is the only Phase 4 item left.**

**Outcome:** choosing and changing training feels guided rather than
catalogue-driven.

### 4A. Plans landing page

- **DONE 2026-08-07 — leads with the active plan, and the plan it describes is
  the one the athlete is actually in.** The banner was already first on the
  screen, but it read the programme TEMPLATE and nothing else, so it announced
  "Today: Push A" over a session that was already finished, in progress, or
  performed on another day — Plans and Home disagreed about what to do next, and
  Plans was the one that was wrong. `js/programs/active-plan-banner.js`
  (`buildActivePlanBanner`, pure) reads the same canonical primitives Home's
  Today card and the workout picker read — `evaluateSessionCompletion`,
  `explicitSessionStatus`, `activeOneOffSession`, `buildProgramSessionChoices` —
  in the same precedence order, so the two surfaces cannot drift:
  - an unfinished **one-off** session outranks the plan, as on Home; offering a
    programmed day first would have quietly dropped the one-off pointer;
  - a **part-logged** day resumes on ITS day, not today;
  - a **finished** day reads "Completed today" and names what is next;
  - a **rest** day names the next real session by weekday — the old card said a
    bare "Next", which told the athlete nothing about when;
  - "still to come this week" stops at Sunday. The old forward scan wrapped, so
    on a Saturday an unlogged Monday was presented as upcoming.
- **DONE 2026-08-07 — "Continue" now carries the day it means.** It dispatched a
  bare tab switch, so it opened the cockpit on whatever day was last selected
  THERE. It now emits the same day-carrying actions Home does
  (`select-program-workout` / `start-today-workout` /
  `open-program-workout-picker`); the browser check parks the cockpit on Friday,
  presses Resume on Plans, and asserts Monday opens. `continue-active-program`
  and the `library:continue-training` event are gone with it.
- **DONE 2026-08-07 — one progress number, and progress that actually moves.**
  The plan percentage was printed three times (ring, bar, footer text) and only
  changes when the program WEEK does, so the card looked identical after a
  session as before it. It is now stated once, with its basis on the ring's
  accessible label ("25% of the plan complete · 2 of 8 weeks finished" — the
  ring had no label at all), beside this week's real count ("1 of 3 sessions done
  this week").
- **DONE 2026-08-07 — the leading card is reachable and hittable.** It was a
  `div` with a `data-action` and no `role`/`tabindex`, so the first thing on the
  Plans screen could not be operated by keyboard, and its only button rendered at
  31px against the app's own 44px target.
- `tests/active_plan_banner.test.js` (12 cases, including one asserting Home and
  Plans agree state-for-state) + `scripts/plans-active-banner-browser-check.mjs`.
- **DONE 2026-08-07 — three to five recommendations with explicit "why it fits"
  reasons.** They were neither personalised nor reasons. `scoreForUser` read
  popularity, completionRate, rating, `featured` and `author.type` — catalogue
  constants identical for every athlete — plus the active program id and a
  beginner boost; it never read `fitnessGoal`, `fitnessLevel`, `equipmentTier`,
  `equipment` or `weightGoal`, all of which onboarding collects. A dedicated
  advanced runner with no kit and a beginner with a full gym received
  byte-identical suggestions under the heading "Based on your training".
  `js/programs/recommendation-fit.js` now scores goal, level, equipment, weight
  goal and *actual recent training frequency*, and every card states a reason
  that is true of that athlete. Editorial signal survives only as a tiebreaker
  that can never promote an unfitting programme or appear as a reason. When
  nothing personal matches, the row does not render — an empty row is honest,
  an invented one is not.
- **DONE 2026-08-07 — the recommendations state their basis, correctable in
  place.** "Ask only for missing information" turned out to be unreachable as
  written: `settings` ships with `fitnessGoal: 'hybrid'`, `fitnessLevel:
  'intermediate'`, `equipmentTier: 'gym'` already seeded, and
  `shouldShowOnboarding` auto-completes onboarding for anyone with stored data
  (`_hadStoredState`) **without asking anything**. So nothing is ever "missing",
  and an upgrading athlete has never answered these questions while the row
  tells them it was built on *their* goal. Nothing in state distinguishes an
  assumption from a choice. The row now names what it used
  ("Hybrid · Intermediate · Full gym") in a collapsed disclosure, and one tap
  corrects it — writing the SAME settings fields the Settings screen owns, so
  the two can never disagree. A prompt for missing values was built first and
  discarded when it proved to be dead code.
- Make Browse all secondary but complete. *(Already complete: all 58 programmes
  are reachable through the category chips — see the corrected note below.)*
- **DONE 2026-08-07 — chip and collection overload cut, and recommendations now
  actually lead.** Measured before changing anything, the default Discover surface
  carried **36 chip controls** — 16 categories and 5 levels at the top, plus the
  same 15 categories AGAIN in the Browse-all grid — above a 220px `featured`
  carousel, with the personal recommendation row starting 651px down.
  - The filters are the tool for browsing, so they now render only while browsing
    (`isBrowsing()`); picking a category from the Browse-all grid enters that
    mode, and "All" leaves it. Default-mode chips: **36 → 15**, drawn once.
  - The editorial carousel moved BELOW everything personal. It is `featured` —
    identical for every athlete — and the recommendation rules already keep
    editorial out of the personal score and out of the stated reasons; letting it
    own the top of the screen contradicted them just as plainly. Hero: y415 → y1465.
  - The recommendation row is now the first row on the surface, after the active
    plan itself: **y651 → y327**, inside the first viewport.
  - Deliberately unchanged: the last-used filter still persists across reloads, so
    an athlete who left mid-browse returns to it. That is existing intended
    behaviour and reversing it is a separate decision.
- **DONE 2026-08-07 — compare states its numbers.** The two-programme,
  seven-consistent-field comparison already met this bullet, so nothing was
  rebuilt. But its "training focus" bars were bare coloured strips with no value,
  no scale and no accessible name, while every stat row beside them stated its
  value — the one part of the comparison that is a CHART could not be read at all
  by a screen reader. Both values are now printed and each row carries an
  accessible summary. The compare modal had no browser coverage at all; it does now.

### 4B. Programme detail

**Status: DONE 2026-08-07** (with one bullet consciously adapted — see below).

- Present in this order:
  1. who it is for;
  2. weekly commitment;
  3. equipment fit;
  4. sample week;
  5. progression;
  6. full plan;
  7. Start or Customise.
- Remove repeated stats and decorative labels that do not affect a decision.
- Keep preview/logger prescription parity.

**DONE 2026-08-07 — the page answers "who is this for", which it previously could
not answer at all.** The closest it came was a marketing tagline and a "What
you'll achieve" list, neither of which knows anything about the athlete reading
them. `js/programs/detail-fit.js` (`buildWhoItsFor`, pure) leads the page with:

- an **audience line** about the PROGRAMME, from its authored level ("Written for
  new lifters and anyone rebuilding a base") — true whoever is reading it;
- a **verdict** and reasons for THIS athlete, from the same `programFit` scoring
  the Plans recommendations use, so a programme cannot be called fitting on one
  surface and unfitting on the other. The verdict follows the personal SCORE, not
  the count of reasons — three weak matches beside one disqualifying caution is
  not a fit;
- the **cautions**, which the recommendations row deliberately never shows. The
  row drops an unfitting programme rather than caption it; someone who opened
  this page needs to know what it will cost them. Real output for an intermediate
  athlete on StrongLifts: *Fits, with caveats · ✓ Matches your strength goal ·
  ✓ Uses only equipment you have · ! Easier than your intermediate level.*
- An athlete who has answered nothing gets the audience line alone. No verdict,
  no invented match — the same rule 4A applied to the recommendations row.

**DONE 2026-08-07 — order and duplication.** Measured before and after at 390px:

| Section | Before | After |
| --- | --- | --- |
| Who it's for | *absent* | y369 |
| Weekly commitment | y369 | y516 |
| Equipment fit | inside the Overview tab | y582 |
| Sample week | y707 | y900 |
| Full plan (tabs) | y1664 | y1857 |

- Equipment was promoted out of the Overview tab and now states **fit**, not just
  a kit list: missing items are marked, and the heading says "You have the kit" or
  "N items missing" so colour is never the only signal.
- The decorative tag row lost its **difficulty tag** (the stats row already has a
  Level column, and the fit verdict now leads with it) and its **equipment-tier
  tag** (the equipment section directly above names the actual kit and whether you
  own it). Goals remain. Verified in the browser: zero of each.

**ADAPTED, not skipped — Start/Customise is not last.** 4B lists it seventh, but
the page measures 2,547px; putting the primary action at the bottom would trade
one hierarchy problem for a worse one, and "one obvious primary action" outranks
strict list order. It now sits immediately after the three fit answers (who it's
for, commitment, equipment) and before the deep material (sample week,
progression, full plan) — the decision information comes first, which is what the
ordering was for. Recorded as a decision rather than left as a silent gap.

### 4C. Builder

- Introduce **Simple** editing for name, days, exercises, and broad progression.
- Keep **Advanced** editing for weekly targets, deloads, and future per-lift
  prescriptions.
- Make day selection, reorder, replace, copy, rest-day conversion, and preview
  feel direct and reversible.
- Do not introduce normalised per-lift prescriptions until an ADR covers
  migration, old workout history, exports, sync, and rollback.

**DONE 2026-08-07 — Simple | Advanced progression, and the ADR gate untouched.**
Name, days and exercises were already Simple editing; the gap was "broad
progression". The only way to say *make this get harder* was the per-week grid —
three inputs times every week, so **36 fields on a 12-week plan before the
programme exists**.

- The Progression tab now opens on **Simple**: three shapes (`steady`, `volume`,
  `intensity`) plus a deload cadence (none / every 4th / every 6th).
  `js/programs/progression.js` gained `planProgressionShape` /
  `applyProgressionShape` / `restoreProgression` / `describeProgressionPlan`, all
  pure.
- **Nothing is written until Apply.** Choosing a shape only re-plans, and the
  block is described in one sentence first — "3 sets · 8-10 reps across 3 training
  weeks · 1 deload week (4)". Rewriting every week at once is not something to do
  to someone silently.
- **Apply hands back a real Undo** (a deep snapshot, not a live reference), which
  is 4C's "direct and reversible" for the one edit that touches the whole block.
- The shapes ramp from the athlete's OWN week-1 values, not fixed constants, and
  a deload never consumes a step of the ramp it exists to recover from.
- **Advanced is unchanged** and still owns per-week sets/reps/phase/deload.
- **No new stored field.** Shapes write the same `weeklyVolModifiers` the grid
  writes, so the ADR gate on normalised per-lift prescription DATA is not
  approached, let alone opened.
- **Pre-existing defect found by driving it:** the Advanced week rows had
  sub-target buttons — `Copy W-1` at 36px and the deload toggle at 40px, against
  the app's 44px standard. They were never measured because the editor check only
  ever looked at the Schedule tab. Both now use `--touch-target`, and the check
  visits Advanced.

**DONE 2026-08-07 — one undo for every plan-changing edit, and three
confirmation dialogs removed.** Interaction principle 5 prefers Undo over
repeated confirmation, and the builder had the dialogs *without* the Undo: remove
an exercise, wipe a day to rest, or copy over a planned day each cost a modal and
still left the mistake permanent.

- `captureProgramDraft` / `restoreProgramDraft` (`editor-model.js`, pure) snapshot
  the whole editable plan — `days` + `weeklyVolModifiers` — rather than the one
  field an action touches. A single shape is impossible to get subtly wrong per
  action, and the plan is seven days and a week table. **The snapshot is the PLAN
  ONLY**: logged workouts live in `state.weeks` and are never captured, so an undo
  can restore a template without ever rewriting training history.
- One strip, above the section body so it is visible from any tab, naming the
  edit ("Removed Bench Press", "Monday is now a rest day"). Covers remove, add,
  replace, reorder, rest-day, copy-day and the progression apply — the
  progression-only undo added earlier in the day was folded into it.
- The confirmations on remove / rest-day / copy-day are **gone**. A dialog asks
  before the fact and still leaves the mistake permanent; Undo answers the case
  the dialog was actually protecting against.
- **A dead control, found by driving it:** the day card's "Make rest day" /
  "Add training" toggle carried no `data-day`, and both handlers are guarded by
  `&& day` — so that button had **never done anything**, on any day, since it was
  written. It works now, and the check clicks it.

### 4D. Exercises

- Complete instructions, difficulty, safety notes, muscles, movement, and
  equipment for the remaining catalogue in reviewed batches.
  **Batch 2 shipped 2026-08-07 — the 16 most-programmed lifts, now 32 of 155.**
  `muscles` / `movement` / `equipment` are complete across the catalogue (which is
  what made muscle browsing possible); `instructions`, `difficulty` and
  `safetyNotes` are the authored half and stood at 16 of 155.
  - The batch was chosen by **real usage across the programme catalogue**, not
    alphabetically: Back Squat (41 programme references), Barbell Bench Press
    (31), Barbell Row, Lateral Raise, Conventional Deadlift, Romanian Deadlift
    (26 each), and down through Pull-Up, Chin-Up, Leg Press and Barbell Curl.
    These are the lifts an athlete actually meets in the cockpit.
  - `tests/exercise_catalog.test.js` now guards the SHAPE, so a later batch cannot
    ship half-filled: an entry with instructions must have a difficulty from
    `EXERCISE_DIFFICULTIES` and at least one safety note, and every line must read
    as a sentence (20–160 chars, capitalised, terminated). An exercise that
    explains how to do it without saying what to watch for now fails the suite.
  - The `EZ()` helper was renamed `REVIEWED()` — it was never EZ-bar-specific,
    only first used there.
  - **Batch 3 shipped 2026-08-07 — 48 of 155.** Same selection method (next 16 by
    programme usage): Plank, Rear-Delt Fly, Face Pull, DB Shoulder Press, Lat
    Pulldown, Front Squat, Band Face Pull, Push-Up, Dip, Incline DB Curl, Hanging
    Leg Raise, Close-Grip Bench, One-Arm DB Row, DB Lying Leg Curl, Leg Curl,
    SkiErg.
  - **Batch 4 shipped 2026-08-09 — 64 of 155.** Same selection method: Chest-
    Supported DB Row, Ab Wheel Rollout, Farmer Carry, Skull Crusher, DB Curl,
    Reverse Lunge, Incline Barbell Bench, Overhead Triceps Extension, Cable Row,
    DB Romanian Deadlift, Band Leg Curl, Barbell Standing Calf Raise, Seated Calf
    Raise, Burpee Broad Jump, Sled Push, Wall Ball. **This clears every exercise
    referenced more than once by the programme catalogue** — the remaining 91 are
    each used 0–1 times, so batch 5 onward is long-tail coverage rather than
    lifts an athlete is likely to meet in the cockpit.
  - **91 entries remain.** Safety notes are a claim shown to someone loading a
    barbell, so batches stay small enough to read in a PR rather than being
    bulk-generated. This content is conservative, standard gym guidance offered
    FOR REVIEW, not as expert instruction. Coverage past roughly the top 30 lifts
    has sharply diminishing value — stopping is a legitimate outcome, and the
    remaining entries degrade gracefully (the detail sheet simply shows less).
- **DONE 2026-08-07 — primary-muscle browsing, in six training words.**
  `MUSCLES` holds 19 anatomical keys, which is exactly the clutter this bullet
  warns against — a picker with nineteen chips is worse than no muscle filter.
  `MUSCLE_GROUPS` (Chest / Back / Shoulders / Arms / Legs / Core) covers every
  anatomical key exactly once, and `primaryMuscleGroups` claims a group only on
  FULL credit: filtering on any involvement returns 21 exercises for glutes
  against the 8 that actually train them, and a list answering "what can I do for
  glutes" with Bench Press is not a filter. Live in both pickers (workout library
  and builder), composing with search and equipment.
  - **A mislabelled control, found on the way:** the filter beside it was labelled
    "Filter by muscle group" / "All muscle groups" while filtering
    push/pull/legs/core/conditioning — movements, not muscles. It now says
    "All movements".
  - Conditioning movements with no single primary muscle (Burpee, Kettlebell
    Swing, Rowing, SkiErg) are NOT forced into a group; they stay reachable with
    no muscle filter set, and a test asserts it.
  - Custom exercises carry no catalogue muscle data, so they are withheld while a
    muscle filter is active — the same rule the category and equipment filters
    already followed — and stay first-class otherwise.
- Preserve distinct identities for materially different equipment variations.
- Consider favourites and recent exercises only if they reduce repeat search.
- Keep custom exercises first-class and clearly identified.

### Acceptance

- A user can reach a suitable plan without browsing all 57.
- Plan recommendation reasons are understandable and correct.
- Common programme edits require no knowledge of the storage schema.
- Exercise search, filters, details, aliases, and custom entries behave the same
  in workout and programme flows.

## Phase 5 — Coaching and personalisation

**Status: LATER**

**Outcome:** the app adapts its presentation and advice without becoming opaque.

- Let users choose the domains they care about: strength, running, recovery,
  fasting, body weight, and advanced load metrics.
- Hide irrelevant optional surfaces while keeping them recoverable in Settings.
- Turn Morning Briefing into one recommendation with evidence and one action.
- Remember dismissed or repeatedly ignored prompts locally.
- Make recommendation confidence explicit.
- Improve goal-aware coaching only when the underlying evidence is sufficient.
- Investigate personal volume baselines after at least 6–8 stable weeks of data;
  do not label general ranges as personal limits.
- Keep all coaching deterministic or inspectable unless a future product
  decision explicitly changes that rule.

## Phase 6 — Visual system, accessibility, and performance

**Status: CONTINUOUS**

These are part of every phase, not a final polish pass.

### Visual system

- Establish a small spacing scale and use it consistently.
- Reduce unnecessary nested cards, borders, badges, and uppercase micro-labels.
- Increase minimum body/metadata legibility where the current dense style falls
  below comfortable mobile reading.
- Standardise headers, section spacing, cards, list rows, inputs, segmented
  controls, bottom sheets, dialogs, toasts, and empty states.
- Keep colour semantic: orange for restrained emphasis, red for destructive or
  genuine danger, green for completion/success, blue for information/action.
- Use motion to explain continuity, never to delay interaction.

### Mobile viewport correctness

**Status: SAFE-AREA SYSTEM DONE 2026-08-06.** Split out of the accessibility
bullet below, because "test safe areas" had been true on paper while the app
shipped controls underneath the Android status bar for months.

- **DONE 2026-08-06:** `--safe-top` / `--safe-bottom` tokens
  (`css/styles.css`, beside `--touch-target`) consult BOTH inset sources, and
  every top-anchored surface pads from them: `.view-container` (all five
  destinations), `.modal-overlay`, `.ob-step`,
  `.migration-recovery`, `.week-nav-bar`, plus bottom clearance on
  `.bottom-sheet`, `.profile-customiser-sheet` and `.fasting-sheet`.
- **DONE 2026-08-06:** `scripts/safe-area-browser-check.mjs` publishes a
  non-zero inset the way the Android shell does — the first check in the suite
  to do so, and the reason this class of defect was previously invisible.
- **DONE 2026-08-06:** `CACHE_NAME` now carries a content hash, so a CSS-only
  fix actually reaches installed PWA clients.
- [ ] Remaining: `--app-safe-bottom` has no publisher in `MainActivity`, so
  bottom clearance still relies on `env()` alone. Add it if a gesture-bar
  overlap is observed on device; the CSS side already consumes it.
- [ ] Remaining: landscape and keyboard-open layouts are not yet covered by the
  safe-area check.

### Accessibility

- **DONE 2026-08-09 — 44px targets are now MEASURED, not asserted in markup.**
  `tests/accessibility.test.js` greps `index.html`, which only ever sees the
  static shell. This app renders most controls from JS template literals, and
  every offender found lived there — invisible to the static test:
  - `.hero-dot-btn` **5×5px** (a 25px² target, the smallest control in the app)
    and with no accessible name at all;
  - `.wfg-tab` 19px tall, `.collection-see-all` 11px, `.wfg-arrow` 28×28,
    `.create-cta-btn` 32px, `.lib-tab` 33px, `.wfg-detail-link` 30px,
    `#progSearchInput` 42px.
  - `scripts/touch-target-browser-check.mjs` drives all four destinations and
    measures the EFFECTIVE hit area: **23 controls under 44px → 2**, and
    **3 unnamed → 0**, out of 145 visible controls.
  - It measures REACHABILITY, not CSS. Each control is scrolled into view and
    probed with `elementFromPoint` at the edges of its claimed hit area, so a
    hit area cropped by an `overflow: hidden` ancestor or stolen by a later
    sibling is caught. Two traps found while building it: a point outside the
    viewport is UNKNOWN, not unreachable (one pair of In Focus week arrows lives
    at x≈615 in a horizontal scroller and every probe against it returns null);
    and without `scrollIntoView` almost everything is below the fold, so every
    probe returns null and the check silently degrades to trusting the CSS.
  - Two mechanisms, deliberately distinct: `min-height: var(--touch-target)`
    where the box can grow, and a new `.hit-target` utility (`css/styles.css`)
    where the visual size is deliberate — it grows a centred `::after` that
    takes the taps while the component looks byte-identical.
  - The remaining 2 carry a documented geometric floor: a carousel dot whose
    pitch is 10px (a 44px-wide hit area would overlap its neighbours and make
    the first two dots UNREACHABLE — worse than a small target), and one of
    seven day columns in a 390px chart. `tests/touch_target_exemptions.test.js`
    keeps that list to at most three, requires each entry to state arithmetic
    rather than a preference, and fails if the 44px minimum itself is lowered.
- **DONE 2026-08-09 — the walk now covers the in-session cockpit and its
  modals**, which is where an athlete actually spends a session and where the
  densest controls live. Coverage went from **145 controls to 895**.
  - Both accessible-name defects were in the SET ROW, the app's core logging
    interaction: the reps input was unnamed while the weight input beside it
    carried `aria-label="Effective load for set N"` — one was labelled and the
    other missed — and the completion checkbox's only name was a `✓` glyph
    inherited from its wrapping label. A screen-reader user logging a set could
    not tell weight from reps.
  - Six undersized cockpit controls fixed: `.run-pace-input` (21px),
    `.gps-start-btn` (29px), `.wk-clear-link` (35px), `.subview-back-btn` (37px)
    and the three run inputs (41px). These are reached mid-workout, one-handed,
    which is the worst case a 44px target exists for.
  - Three unnamed text inputs in the pickers (`elSearchInput`,
    `customExerciseTextInput`, `swapCustomInput`) had placeholders only.
  - Each modal must actually OPEN before it is measured — the opener is asserted,
    so a selector that stops matching FAILS rather than silently contributing
    nothing. Verified by introducing a typo in one opener.
- **DONE 2026-08-09 — the live-run surface and onboarding are walked too.**
  Coverage is now **875 controls across 12 surfaces**.
  - The live-run map's zoom buttons ship from **Leaflet at 30×30** and are
    injected at runtime, so they appear in no markup in this repo and nothing
    static could ever have seen them. They are real controls on the one surface
    operated while the athlete is moving. Third-party defaults do not get an
    exemption; they are now 44×44.
  - Leaflet's required credit link IS exempt (49.5×14) with the arithmetic: it is
    not an operable control, and a 44px-tall credit bar would cover a fifth of a
    220px map. The zoom buttons in the same map are not exempt.
  - New rule in the walk: a COVERED control is not that surface's control. While
    onboarding is up, Home is still `.view-container.active` underneath it, so
    its week arrows were measured and — correctly — found unreachable through the
    overlay. That is not a defect in the arrows. The same rule stopped every
    modal from double-counting the cockpit behind it (add-exercise 383 → 359
    controls), so the totals are now honest rather than merely large.
- Maintain 44px targets and zoom support.
- Test TalkBack, keyboard, Switch Access, focus return, Android Back/Escape,
  reduced motion, light/dark contrast, landscape, and 200% text.
- Ensure charts have meaningful summaries and interactive data has a non-visual
  equivalent.
- Avoid noisy live regions and unlabeled icon controls.

### Performance

**BASELINES ESTABLISHED 2026-08-09** — `scripts/performance-baseline.mjs`
(`npm run perf:baseline`), in the browser suite.

- **The measurement found a real defect on its first run.** `index.html` loaded
  the Google Fonts stylesheet as a plain render-blocking `<link>`, under a
  comment claiming `display=swap` kept first paint fast. It does not:
  `display=swap` governs how the font FILE swaps in, while the stylesheet itself
  blocks rendering until it loads **or fails**. On any start where
  `fonts.googleapis.com` is unreachable — which is EVERY offline start of this
  PWA — first contentful paint measured **12,656ms, of which that one request was
  12,530ms**. Fully cached, and the app painted nothing for twelve seconds
  waiting on a font it did not need. Now **280ms**. The assumption was written
  down, it was plausible, and it was wrong; that is the entire argument for
  measuring rather than reasoning.
- Fix is CSP-safe: `media="print"` makes the link non-blocking and
  `js/font-css.js` (classic, external — the CSP forbids inline script, including
  `onload`) flips it to `all` on load. A `<noscript>` keeps the blocking link for
  script-less clients. Verified the font still APPLIES when reachable, not just
  that paint got faster.
- **A second bug, introduced by that fix and caught before merge:**
  `js/font-css.js` was not precached, because the generator walked the module
  graph from `js/app.js` and nothing *imports* a classic `<script>`. It would
  have 404'd offline, leaving the stylesheet at `media="print"` forever and the
  brand font permanently unapplied — on exactly the start the precache exists to
  serve. `computeRequiredAssets` now takes every script root, and
  `tests/precache_manifest.test.js` derives the roots FROM `index.html` rather
  than a second hand-written list.

Measured baseline (this container; ~3× slower than CI, and neither is a phone):

| scenario | new athlete | 5 years | 5 years, offline |
|---|---|---|---|
| first contentful paint | 204ms | 152ms | 140ms |
| cold start | 863ms | 1,000ms | 1,086ms |
| warm start | 854ms | 1,087ms | 1,183ms |
| Train / Progress / Plans | 117/101/124ms | 373/247/107ms | 343/298/115ms |
| open workout | 109ms | 430ms | 407ms |
| filter 155 exercises | 25ms | 31ms | 23ms |
| active-view DOM nodes | 218 | 224 | 224 |
| JS heap | 11.5MB | 16.1MB | 16.1MB |

**Budgets are asserted only where the number does not move with the machine:**

- first contentful paint under 3s (measured ~0.2s; the defect signature was
  12.6s) — a guard on render-blocking, not a speed target;
- the active view renders no more than 1.35× the nodes with five years of
  history than with one week (measured **1.03×** — the DOM is genuinely bounded,
  so nothing renders per-record);
- the app renders with every external host blocked.

Wall-clock is REPORTED, never asserted: this container is ~3× slower than CI and
neither is representative hardware, so a millisecond budget would be flaky or
useless. The table is for same-machine comparison, which is the only comparison
it supports.

- [ ] Remaining: no measurement yet on a real device, which is the only place
  "representative hardware" is true. `[You]` — the harness prints the same table
  against a deployed build.
- Optimise only demonstrated bottlenecks.
- Prefer bounded DOM, keyed updates, deferred optional work, and smaller modules
  without weakening offline behaviour.

### Maintainability

- **STARTED 2026-08-09 — the injected context is extracted, which is what the
  split was blocked on.** `js/workout.js` held its six app accessors
  (`_getState`, `_getSelectedDay`, `_getDays`, `_saveState`, `_switchTab`,
  `_scheduleSave`) as module-local `let`s set once by `initWorkout`. Any module
  carved out of the file still needs them, and its only route was to import
  `workout.js` — which would import the new module back. ES modules tolerate that
  cycle, but it makes initialisation order load-bearing, which is a poor
  foundation for a refactor whose purpose is to make the file safer to change.
  `js/workout/context.js` now owns them and both sides depend on it, so the graph
  stays a tree.
  - **A "pure move" nearly shipped a behaviour change.** Two guards read
    `if (!_getState || !_getSelectedDay) return;` as a readiness test. Once the
    accessors became wrapper functions they were permanently truthy, so
    `renderWorkout` and `refreshSessionOutline` would have run before the app
    wired anything instead of bailing. `workoutContextReady()` exists for exactly
    that and both guards now use it. Worth remembering that "move, don't change"
    is not automatically true once the shape of the thing being moved changes.
  - The precache guard added earlier the same day caught the new module before it
    could 404 offline — the ratchet paying for itself within hours.
  - Verified: 1,780 unit tests, typecheck, smoke, precache regenerated, and all
    seven workout-surface browser checks (set-row, session-outline, rest-timer,
    finish-review, exercise-picker, workout-history, train-landing).
- **FIRST SEAM CUT 2026-08-09 — exercise selection is its own module.**
  `js/workout/exercise-picker.js` (252 lines) owns the add-exercise library and
  the in-session swap. `js/workout.js` is **2,670 → 2,492 lines**.
  - Two dependencies pointed backwards and both are now resolved forward.
    `_unitOf` was read on both sides, so it moved to `js/workout/units.js`
    (`weightUnitLabel`) rather than being duplicated or owned by either.
    `renderWorkout` is registered with the context (`setWorkoutRenderer` /
    `rerenderWorkout`), so the picker asks for a redraw without importing
    workout.js back — the honest shape, since it does not own how one happens.
  - `renderExerciseLibraryList` is EXPORTED because workout.js's `change` router
    re-renders the list when a filter changes. That router is the next thing worth
    moving; naming the seam beats reaching into a private across a file boundary.
  - The public surface is re-exported from workout.js, so `js/app.js` — its only
    importer — is untouched. Moving an implementation is the change; moving the
    public surface too would spread the diff for no benefit.
  - **`tests/workout_split_guard.test.js` holds the shape the approach depends on:**
    no `js/workout/*` module may import `../workout.js`; `context.js` must stay
    dependency-free (it is the root of the extracted subtree); the split modules
    must actually be wired in rather than orphaned; and workout.js must still
    export every name app.js imports. All four verified to FAIL when violated. A
    cycle would not fail loudly — ES modules resolve them, and the bug surfaces
    later as an `undefined` binding under an unrelated refactor.
  - **Verified by DRIVING it, not by unit tests** — this code is DOM-heavy and
    almost untestable in isolation. A scripted swap and a scripted add both
    redraw the cockpit, close their modal and persist: `Bench Press` →
    `Machine Chest Press` appears in the cockpit, `Face Pull` appends, 7 lifts
    stored. That is the `rerenderWorkout` indirection proven end to end.
  - Noted while wiring the guard: **app.js imports 21 of workout.js's 44
    exports.** Roughly half the public surface is either internal-only or dead.
    Worth auditing before the next seam — a smaller surface is a cheaper split.
- **EXPORT AUDIT 2026-08-10 — nothing to remove, and it corrected the plan.**
  I recorded that "app.js imports 21 of 44 exports, so half the surface is
  internal-only or dead". Measured: **zero are dead.** The other 23 are each
  called from the event ROUTERS, most with exactly one reference. Un-exporting
  them — the audit's obvious action — would have been precisely wrong, because
  the next step needs them exported.
- **The routers must go LAST, not next.** They are only **81 lines** but dispatch
  to **27 functions defined in workout.js**. Extracting them means importing all
  27 back, which is the cycle `tests/workout_split_guard.test.js` forbids and
  should forbid. The correct order is the reverse of what I proposed: move
  HANDLERS out while the router stays and imports them, and move the routers only
  once there is nothing left in workout.js for them to reach into.
- **SECOND SEAM CUT 2026-08-10 — `js/workout/clear-log.js`** (156 lines): the
  confirm-reset flow, the destructive corner of the cockpit. **workout.js
  2,492 → 2,379 lines.**
  - **This cut found a live bug I had shipped in #209.** The context wrapper was
    `switchTab = (tab) => _switchTab?.(tab)`, and `clear-log.js` calls
    `switchTab('home', { skipWorkoutCommit: true })` when a workout is discarded.
    The wrapper silently dropped the options object, so discarding a workout
    committed UI state for the workout it had just thrown away. Nothing failed —
    no types, the call still returned, and the only symptom was a stale commit
    nobody was watching for. Every wrapper now takes `...args`, and
    `tests/workout_split_guard.test.js` asserts it, verified against the original
    one-parameter form.
  - The type-checker again found what a grep did not: my dependency scan covered
    lines 2009–2100 while the block ran to 2126, so `renderWorkout`, `showUndo`,
    `restoreDayWorkoutData`, `snapshotDayWorkoutData` and `deleteDayWorkoutData`
    were all missing from the new module's imports. `@ts-check` on every extracted
    file is what makes these cuts safe at this pace.
- **THIRD SEAM CUT 2026-08-10 — `js/workout/run-units.js`** (65 lines): distance
  and pace conversion at the UI boundary. **workout.js 2,379 → 2,334 lines.**
  - The easiest seam in the file and worth taking early: pure functions, no DOM,
    no module state — the athlete's unit setting arrives as an argument.
  - **The real gain is coverage, not line count.** These were private helpers, so
    nothing could import them and the suite had NO test of them at all —
    including the entire MILE path, which is every athlete on `distanceUnit:'mi'`.
    `tests/run_units.test.js` is their first test: 10 cases covering unit
    defaulting, conversion both ways, pace/time inversion, zero-padded seconds,
    and the refusal to invent a pace from a distance with no time.
  - Documented invariant: distance is STORED canonically in km and the display
    value is ROUNDED, so a round trip is lossy BY DESIGN. A test asserting exact
    round-tripping would assert something false; one case pins the lossy-but-close
    behaviour instead, so removing the rounding fails loudly.
  - Two of my own errors, both caught by running things: the first test asserted a
    NUMBER where these return strings (they feed input values), and my
    verification fixture used `distance:` where the state field is `dist:`, which
    silently produced an empty input and would have "verified" nothing. Fixed,
    then proven: 10 km stored renders as `10 @ 5:00/km` and `6.21 @ 8:03/mi`.
- **FOURTH SEAM CUT 2026-08-11 — `js/workout/run-logging.js`** (244 lines):
  cockpit run rendering, manual persistence, imported evidence, map refresh and
  live-input pace/time derivation now have one owner. Pure distance/pace
  conversion remains in `run-units.js`; run logging owns when that UI boundary
  is applied. **workout.js 2,334 → 2,130 lines.** The event routers stay in
  workout.js and call the extracted input handler; the finish-review run-RPE
  write stays with completion, where that lifecycle choice belongs.
  - Canonical kilometres remain the storage boundary. New integration coverage
    proves a miles edit round-trips to km, keeps its existing session identity,
    and preserves imported cadence evidence rather than replacing the run blob.
  - Live-run safety assertions moved with the code: a rerender still cannot
    collapse or reparent an active card and detach its Leaflet map.
  - `tests/workout_split_guard.test.js` ratchets both `clear-log.js` and
    `run-logging.js` as wired, forward-only modules.
- **FIFTH SEAM CUT 2026-08-11 — `js/workout/set-mutations.js`** (297 lines):
  row addition/removal and removal Undo, warm-up/type/RIR changes, bodyweight
  prompting, and direct/band load choices now have one owner. **workout.js
  2,130 → 1,837 lines.** The facade still re-exports every existing handler and
  the event routers still dispatch to those names, so app.js and the DOM action
  surface did not move.
  - The latest-bodyweight reader is an explicit shared export because workout
    rendering needs the same value as load mutation. The first focused run
    caught that dependency as a runtime `ReferenceError`; wiring it explicitly
    kept one source of truth rather than cloning the lookup back into the facade.
  - Quick-log, checkbox completion and finish review stay in workout.js: they
    coordinate PRs, timers, accordion flow and session lifecycle rather than
    being simple row mutations. The split guard ratchets `set-mutations.js` as
    wired and forward-only.
- [ ] Next seam: supersets — move its handlers out while the router stays.
  Routers still move last.
- Split `js/workout.js` by rendering, set mutations, exercise selection, run
  logging, and completion.
- Split `js/app.js` routing/event ownership.
- Continue decomposing State and Settings by domain.
- Retire the now-dormant Home tile registry/renderers after Progress confirms
  which pieces still merit reuse; retain the weekly-chart presenter used by In
  Focus.
- Reduce inline styles and specificity/`!important` hotspots.
- Add reusable view primitives only after two real surfaces share the pattern.

## 6. Cross-cutting data and reliability rules

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

## 7. Product validation loop

Each shippable slice follows this loop:

1. **State the user job.**
2. **Record the current friction** with screenshots, taps, decision points, and
   failure cases.
3. **Implement the smallest coherent change.**
4. **Test the full journey**, not only the changed component.
5. **Compare before and after** at compact/mobile/desktop widths and sparse,
   normal, long-history, loading, empty, offline, and error states.
6. **Keep, adjust, or revert** based on evidence.
7. **Record the result** in the session log.

Use a small set of representative profiles:

- new user with no data;
- beginner following a simple plan;
- experienced strength-focused user;
- running-focused user;
- balanced hybrid user;
- sparse recovery permissions;
- long-history user;
- offline/local-only user;
- signed-in multi-device user;
- user returning after missed weeks.

### Local browser-check timings are not authoritative — CI is

`scripts/running-analytics-check.mjs` budgets the open of a 23-month /
1,000-activity running detail at 5s. In a Claude Code container it measures
**~15.2s and fails**; on CI it **passes**. Both are true, and CI is the one that
counts: `.github/workflows/verify.yml` runs `npm ci` + `npx playwright install`
and then `npm run browser:verify` as a required step with no
`continue-on-error`, and it has been green throughout (runs 31152008876 /
31159641519). The container is simply ~3× slower than the budget assumes.

Resolved, and recorded because it cost a false alarm: a timing failure seen
only in a container is **not** evidence of an app regression. Confirm against CI
(or a second commit) before acting. It is also not evidence the gate is broken —
the same session wrongly suspected CI of running the browser suite vacuously,
which the workflow file disproves.

The genuinely useful finding underneath it: a Claude Code container starts with
**no `node_modules`**, so every browser check exits `SKIP: Playwright is not
installed` with status 0 and the runner counts 28 skips as 28 passes. Run
`npm install` at the start of any session that intends to trust
`npm run browser:verify` locally.

### The weekday-dependence class — GUARDED 2026-08-08 (was fixed one at a time, three times)

`main` went red a third time, on a **Sunday**: `train-landing-browser-check` and
`active-run-browser-check` both failed because `hybrid_engine` rests on Sunday, so
the Train landing offers "Log wellness check-in" instead of a workout and the
workout picker lists no Sunday session. Nothing was wrong with the app.

That is the same defect that produced `no prescribed lift for sat` and the
jt-shed silent skip. **Fixing instances did not stop it — I fixed two and never
swept for the rest.** `tests/browser_check_clock_guard.test.js` now guards the
class:

- a check that reads a weekday (`getDay`/`getUTCDay`) from the **wall clock**
  must also `pinClock`;
- no check may gate its main assertion on today's weekday (the silent-skip shape);
- an `UNPINNED_BACKLOG` list records the checks that still read the clock and may
  only ever SHRINK — a companion test fails if a name stays on it after the check
  is pinned. It stops the class growing while the backlog is worked off; it does
  not bless it.

Backlog, classified 2026-08-08 — the ten were NOT equally risky, and the guard's
regex is deliberately broader than the real hazard:

- **Genuinely fragile (3) — PINNED 2026-08-09.** These used the weekday as a
  PROGRAM DAY KEY, so they assumed the programme had a session today. All three
  now pin to Monday 2026-08-03 in `Australia/Sydney` and were each run
  individually to a pass:
  - `home-today` — also declared **no** `timezoneId`, so node and the page could
    disagree about the calendar day, and a run crossing midnight built the
    fixture for one day and asserted against another.
  - `active-program-edit` — Scenario C activates the real `stronglifts_5x5`,
    whose rest days move with the weekday.
  - `jt-shed` — the worst of the three, and **not** safe by construction as the
    2026-08-08 classification guessed. Its `isJtTrainingDay` / `isMainLiftDay`
    branches SKIPPED scenarios B, C and D on the days that did not suit them, so
    on Wednesday and Sunday it asserted almost nothing and still reported a pass
    — the same silent-skip shape as `jt-shed-simplified`, which the guard's regex
    did not match because it wore a different spelling. The branches are gone;
    the pinned date is asserted to be a main-lift day at load, so a future edit to
    the date fails loudly instead of quietly reducing coverage.
  - Also fixed in all three: `new Date(\`${iso}T12:00:00\`)` parses as LOCAL time,
    so `.getUTCDay()` could return the previous day on a host east of UTC. Now
    `T12:00:00Z`, matching `js/dates.js`.
- **Arithmetic only (7 → 6) — and one of the seven was MISCLASSIFIED.**
  `home-attribution-check` failed on **Monday 2026-08-10** having passed all
  week, and it was in this bucket because I read its `getUTCDay()` as week-start
  arithmetic. It is not: it derives a comparison WINDOW and an "alternate day"
  from the weekday. On a Monday "this calendar week" is one day long, so
  Scenario 2 — which dates its this-week session as `curMon` — had no elapsed
  span to compare against last week and the named same-exercise delta it exists
  to assert simply was not there. **PINNED 2026-08-10** to Thursday 2026-08-06.
  - Pinning to Wednesday first made it WORSE (three failures instead of one),
    because the check picks an "alternate day" of wed-or-fri and Wednesday
    collided with it. The node-side `new Date().getDay()` at that selection also
    had to move to the pinned date, or node and the page disagree about the day.
  - The remaining six were then RUN on that same Monday rather than reasoned
    about: `gym-performance`, `progress-hub`, `run-performance`,
    `strength-volume` and `volume-guide` all passed, so for them the
    classification holds. `running-analytics-check` failed on its own
    environment-sensitive performance threshold (26.5s in this container against
    ~2s in CI), which is the documented flake above, not a weekday issue.
  - Lesson for the classification itself: "reads a weekday" is not one defect.
    Computing a week START from it is harmless; deriving a comparison WINDOW or a
    day CHOICE from it is not. `UNPINNED_BACKLOG` is now six.

### A silent skip is not a pass — FIXED 2026-08-07

`jt-shed-simplified-browser-check.mjs` keyed its cockpit assertion by weekday and
guarded it with `if (expectedByDay[todayKey])`. J&T rests on Wednesday and Sunday,
so **two days in seven the check ran, printed nothing, and passed** without
asserting the thing it exists to assert. Same fragility as the finish-review
failure below, wearing a skip instead of a crash — which is worse, because a
crash gets fixed.

Now pinned to a Monday with `pinClock`, and the guard is an assertion: a missing
expectation means the programme changed, which is a real signal.

### A check must not depend on the day of the week — FIXED 2026-08-07

`finish-review-browser-check.mjs` derived its workout day from the wall clock in
`Australia/Sydney` and required the active program to prescribe a lift there.
`hybrid_engine` has **no lifts on Saturday or Sunday**, so the check threw
`no prescribed lift for sat` and turned `main` red — in both *Deploy Pages* and
*Release (AAB + APK)*, which share the `verify / Web verification` job — for a
commit whose earlier run that same UTC day had been green. Nothing was wrong
with the app; the check was only runnable Mon–Fri Sydney time.

`pinClock` (`scripts/browser-runtime.mjs`) is now the shared way to fix a page's
wall clock, and the finish-review fixture is pinned to Monday 2026-08-03. Also
noted, not yet fixed: `jt-shed-simplified-browser-check.mjs` guards its cockpit
assertion with `if (expectedByDay[todayKey])`, so on a Wednesday or Sunday it
silently stops asserting instead of failing — the same fragility, wearing a
skip instead of a crash.

## 8. Definition of done for a product slice

A slice is complete only when:

- the primary user job is easier or clearer;
- the common path has fewer or better decisions;
- loading, empty, offline, error, and recovery states are covered;
- mobile, text scaling, keyboard, and accessibility behaviour are verified;
- existing user work and historical data remain intact;
- unit, typecheck, smoke, precache, and relevant browser checks pass;
- the roadmap status and session log are updated;
- the change is committed as one understandable unit.

### Quality gate for the current overhaul programme

The overhaul is measured against a product bar, not a feature checklist:
**openHybrid must be a tier above openGym and on par with Hevy** in workout
logging, programmes, and the overall Home → Train → Progress → History →
Settings journey. A phase is not mergeable when it only adds code while leaving
a parity gap that the phase was supposed to close.

Every product PR therefore states the gap-matrix rows it closes, the parity
claim, and the evidence: browser checks plus a before/after interaction trace or
screenshots, a tap-count comparison for the common path, empty/error/loading/
offline states, 320/390/412 px and light/dark checks, 44 px targets, settings-
driven units, correct calendar/program attribution, and no history rewrite or
new network surface. Tests and browser checks are added or strengthened, never
weakened to pass. Work is clean-room: no copied Hevy/openGym code, assets,
media or visual identity.

Hard reject: a slower logging path, unexplained extra taps, hidden settings,
duplicated surfaces, wrong attribution, unreachable controls, missing empty
states, hard-coded units, or no offline/data-safety coverage. If a phase is
functionally complete but UX-below-bar, leave the PR open and report the exact
gaps instead of merging. `.github/PULL_REQUEST_TEMPLATE.md` carries the
checklist.

## 9. Explicitly parked

These are valid future concerns but are not active priorities:

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

## 10. Delivered foundations

| Area | Current capability |
| --- | --- |
| Navigation | Four intent-led destinations — Home, Train, Progress, Plans — with stable legacy route IDs and origin-aware drilldown Back behaviour |
| Home/coaching | One state-aware Today card followed by retained Strength/Running In Focus cards; repeated At-a-Glance tiles are removed |
| Training | Planned/one-off strength, running, set logging, timers, swaps, supersets, bodyweight modes, session completion, focused live-run surface |
| Plans | 58-program catalogue, an active-plan lead that agrees with Home about the next session, fit-based recommendations with stated reasons, comparison, details, timeline, editable personal copies, builder |
| Exercises | 157 canonical exercises, 66 with reviewed instructions/difficulty/safety notes, aliases, equipment/muscle data, filters and details |
| Progress | Calendar-week strength/running, exact evidence, load/readiness, weekly/monthly review, Gym/Run/Recovery detail |
| History/data | Activity history, exact deletion/undo, activation isolation, export/restore, backups, Android state mirror |
| Quality | 1,800 tests, typecheck, smoke, precache/workflow gates, 32 responsive/accessibility browser checks |

## 11. Immediate execution queue

Work in this order unless user evidence changes it:

1. **DONE — Complete the Phase 0 experience inventory and journey map.**
2. **DONE — Prototype Home / Train / Progress / Plans navigation without
   changing stored data.**
3. **DONE — Establish Home hierarchy with one Today decision card, retain the
   owner-preferred In Focus cards, and remove the repeated At-a-Glance grid.**
4. **DONE — Simplified the common strength set-row interaction.** Persistent
   previous values, inline entry validation, completion as the strongest row
   action, a pausable rest timer attached to the card, and the session outline.
   One 2A item remains: making add/swap/reorder/superset/plate-math contextual
   rather than equally prominent (only `+ Warmup` was done).
5. **DONE — Create the new Progress landing hierarchy.** Metric classification
   (3B) and the Volume Guide / MEV rebuild remain.
5a. **DONE — Rebuilt the Volume Guide (MEV) presentation.** Unified onto the
   existing `classifyVolume` classifier, full MV→MEV→MAV→MRV scale with
   labelled landmarks, factual statuses, attention-ordered focus list and
   priorities moved to their own tab.
5b. **DONE 2026-08-04 — Phase 3B metric classification.**
   `js/analytics/metric-tiers.js` classifies every metric, and Gym Performance /
   Weekly Volume merged into one Volume destination. (This entry read ACTIVE for
   two days after it shipped; the audit caught the drift.)
5c. **DONE 2026-08-06 — Mobile viewport correctness + cache busting.** Safe-area
   tokens across every surface, and a content-hashed `CACHE_NAME` so a CSS-only
   fix actually reaches installed PWA clients.
5d. **DONE 2026-08-06 — Imported-activity identity.** FIT files are dated from
   the activity's own start and a re-import is refused rather than
   double-counted.
6. **DONE 2026-08-06 — Phase 2B session completion.** Review rather than form,
   notable progress, optional effort/notes on the cockpit's own store,
   adherence-aware explanation, a discard that names its exact scope and can be
   undone, and a completed state that links onward.
7. **DONE 2026-08-07 — Phase 2C running, and with it all of Phase 2.** The
   focused live-run surface (athlete's own distance unit, live GPS signal state,
   focus mode over setup/import/manual entry, a live run a re-render cannot
   collapse), then the state copy: permission denial, background tracking,
   replay and partial-route conditions became persistent notices instead of
   toasts — which uncovered and fixed a blank-screen dead end on a denied
   permission.
8. **DONE 2026-08-07 — Plans discovery reworked around recommendations before
   Browse all.** All of 4A: the recommendation engine, the active-plan lead, the
   chip/collection reduction (36 default chip controls → 15, recommendations from
   y651 → y327, the editorial carousel moved below everything personal) and
   compare stating its numbers. 4B (detail decision order + "Who it's for") and
   4C (Simple | Advanced progression, one editor undo) followed the same day.
   **Next: 4D — exercise metadata in reviewed batches.**
   **Correction:** this entry claimed the landing "renders 25 of 58 programmes,
   so a new programme is findable only by search". That was never true and was
   repeated twice without being checked. Measured against the real catalogue,
   the category chips reach **58 of 58** — every programme, including newly
   added ones. Discovery needed better *leading*, not rescuing from
   unreachability.
9. **NEXT — 4D: exercise metadata and shared visual-system cleanup in bounded
   batches.** 157 canonical exercises, 66 fully reviewed. Also add primary-muscle
   and equipment browsing without anatomical clutter.

Avoid parallel redesign of every screen. Each step should be usable and
testable on its own.

## 12. Session log

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
- **2026-11-20 — Train is a session preview, not a second Home.**
  - The landing now shows the week rail and today's card with the actual
    exercises and `liftTarget` targets, then one Start/Resume. The card is the
    preview; Start opens the cockpit directly, with no extra route.
  - Quick start is only Run / Walk / Fast. The duplicate "Workout" entry is
    gone; a different or empty workout is "Choose another workout".
  - Recent is one row (hidden when empty); the four-card "Start something else"
    grid is gone.
  - The train-landing browser check now asserts the exercise preview, targets,
    seven-day rail, no duplicate Workout quick start, and the Resume state.
- **2026-11-20 — Logger L0: the prescription stopped impersonating history.**
  - A first-ever set row showed `Last 112.5kg × 6` whenever a coaching/target
    ghost existed, while the card said "First time logging this". `buildSetRow`
    defaulted `previousSetData` to the ghost target; only a real prior set now
    renders the Last line.
  - The logger upgrade plan (2D) is written: load basis, failure/timed/distance
    set shapes, rest resolution/persistence, plate lines and warm-up rounding,
    each additive and migration-free.
- **2026-11-20 — Completed session summary and the anatomical heat map.**
  - A completed Today card now carries duration, volume, working sets, PRs,
    today's weigh-in and a front/back muscle heat map instead of only a review
    action.
  - 89-region static path geometry is vendored from the Apache-2.0 Body Muscles
    project (`js/home/body-paths.js`, `NOTICE.md`, `LICENSES/Apache-2.0.txt`).
    openHybrid supplies the credit-weighted model, palette, layout and copy; no
    openGym or Gym-visual media is used.
  - `js/home/session-muscles.js` sums the catalogue's per-muscle credits across
    completed working sets (warm-ups and unticked rows excluded), normalises to
    the hardest-trained muscle and maps it onto the body regions. The chips are
    the accessible text equivalent.
- **2026-11-20 — Logger parity: visible logging settings and set feedback.**
  - Settings → Training now has a real **Logging** group: rest tiers,
    Efficient/Standard/Strength presets, reset remembered rests, progression
    step, auto rest/warm-up, and previous-values scope. The old hidden markup is
    no longer a dead power-user knob.
  - `settings.previousValuesScope` (`all` default, or `program`) scopes the Last
    performed panel and Use previous values; PR detection deliberately stays
    all-time so switching scope never hides a genuine record.
  - Each completed set now compares against the SAME set index last session
    (`↑` / `=` / `↓`) in place on tick, quick-log and log-all. Quick-log and
    log-all now run the same PR detection as a manual tick (they previously
    skipped it entirely).
  - Added an independent `set.failure` flag with a row control. `type: 'F'`
    remains AMRAP; failure is not a set type and survives into the recap.
    Draft/prescription predicates recognise it.
  - Added `set.basis`: `each` doubles a dumbbell pair's volume, `per-side`
    counts the working side once, and legacy/`total` sets keep the old number.
    e1RM stays per-implement. Blank dumbbell rows default to Each (Per side for
    unilateral movements); the row chip cycles the basis and the value is
    stamped only once real user data exists. All volume readers now go through
    `setVolume`, so Strength, History, Home and Progress agree.
  - Added per-set **rest** and **note**. Rest precedence is explicit set value
    (0 = no timer) → plan prescription → remembered per-exercise override →
    exercise tier; note is a 140-character cue shown in the logger and recap.
    Both are additive fields and are recognised by the draft predicates.
  - Added a per-set **plate line** for barbell lifts, using the entered/ghost
    weight and the active equipment profile, plus the load change since the
    previous set. It updates live while typing and respects `showPlateHints`.
  - Rest settings now include a configurable warm-up tier (0 disables it), an
    alert sound on/off switch and a volume control. Presets update all four
    tiers.
  - The session recap now closes the loop per lift: **Last time** (the previous
    working sets) and **Next time** (the progression suggestion with its
    rationale). The next line is omitted when the session carries no prescribed
    rep target, instead of inventing a load.
  - Validation: node tests, typecheck, smoke, settings-nav browser check
    (visible Logging controls/preset/scope), set-row and quick-log tests.
  - Next: timed/distance sets and the per-exercise config sheet.
- **2026-11-20 — Per-exercise preferences: rest, warm-up and note.**
  - Each cockpit exercise card now has a 44px settings button opening a sheet
    for **rest** (Default / custom seconds / No timer), **warm-up** (Use global
    / Always / Never) and a durable 140-character **exercise note**.
  - Rest reuses the existing name-keyed `settings.restOverrides`, so plans,
    per-set rest and the timer engine keep one precedence chain; a remembered
    `0` is now an explicit no-timer and is honoured by the engine.
  - Warm-up mode and the note live in additive `settings.exercisePrefs`, keyed
    by canonical exercise id (name fallback), so alias spellings share one
    preference. A per-exercise mode overrides `autoWarmupRamp`; nothing stored
    is rewritten.
  - The note renders on the card during the session. Validation: node tests,
    typecheck, smoke, set-row browser check writes and re-reads all three
    controls through localStorage.
  - Next: timed/distance set shapes.
- **2026-11-21 — Timed holds and carries are real set shapes.**
  - `js/set-utils.js` now owns the shape model: legacy reps, `mode:'time'`
    with `sec`, and `mode:'distance'` with `dist` (metres). Validation accepts
    `M:SS`/seconds or metres and refuses impossible values inline.
  - The cockpit renders a time or distance field in place of reps; the row’s
    `⋯` sheet cycles Reps → Time → Distance, and the per-exercise sheet adds a
    **Set shape** default. Selection comes from catalogue metadata (carry →
    distance, plank/hold → time) or the athlete’s override; a stored set’s own
    shape always wins.
  - Holds and carries count as working sets for frequency, muscle load, History
    and recap, but `setVolume` returns 0: tonnage is weight × reps, and
    inventing reps for a 45-second plank would inflate every volume total.
    e1RM and PR detection stay rep-only. Comparison, previous values, quick-log,
    inheritance and the recap all use the set’s own shape.
  - CSV import stores holds/carries as time/distance sets instead of skipping
    them; carries keep their metres and never become runs.
  - Validation: 1,974 node tests, typecheck, smoke, set-row browser check
    (Time → 1:30 and Distance → 20 m saved through the live cockpit).
  - Next: per-exercise load default / weight meaning, then the `+ Drop` link.
- **2026-11-21 — Per-exercise load defaults and weight meaning.**
  - The exercise settings sheet now owns **Load default** (Weighted /
    Bodyweight / Assisted / Band) and **Weight meaning** (Each / Both / Per
    side for dumbbells), alongside Set shape, rest, warm-up and note.
  - Defaults shape a BLANK row on a display copy, so opening a workout never
    writes preferences into the program scaffold. Completion stamps the load
    mode (and `bw`/`band`) and basis actually used; stored sets are unchanged.
  - Band defaults use the exercise's band ROLE, so a banded pull-up is
    assistance and a banded pushdown is resistance.
  - Validation: node tests, typecheck, smoke, set-row browser check proves a
    Band default shows the 20 kg band on the next blank row.
- **2026-11-21 — Exercise drilldown: real chart, bests and session evidence.**
  - `js/analytics/exercise-detail.js` is now the pure model behind the view.
    It keeps each set's shape, reports the all-time best set (e1RM for reps,
    longest time for holds, longest distance for carries) and marks a PR only
    when a session beats every earlier one — the selected range filters the
    chart/session list but never the PR baseline.
  - The view leads with the latest set and its change, four summary cards, a
    dependency-free SVG trend with PR dots and axis labels, then exact session
    evidence. Bodyweight reps no longer disappear just because no load was
    recorded.
  - Validation: node tests (rep/hold/carry, out-of-range PR baseline), typecheck,
    smoke, progress-hub browser check (chart points, four cards, session rows,
    range switch, no overflow at 320/390/412px).
  - Next: History copy/repeat and full exercise editing.
- **2026-11-21 — History calendar day sheet.**
  - Tapping a calendar day now opens a managed bottom sheet with that day's
    sessions instead of jumping straight to a filtered list. It respects the
    active type/source/activation filters, closes through the shared modal stack
    (Escape/backdrop/X), and **View full day** switches to the filtered list.
  - Opening a session from the sheet dismisses it first; an empty day shows an
    honest empty state and hides the full-day action.
  - Validation: typecheck, smoke, History browser check (two same-day sessions,
    close keeps the calendar, View full day shows both rows).
  - Next: final Home/Progress polish and preflight.
- **2026-11-21 — History source filter.**
  - Activity rows now carry a coarse `origin` (`app` or `imported`) derived from
    the stored source, not from display copy. Runs whose week was imported but
    whose session came from GPS remain app-tracked.
  - History gains an explicit **Source** selector (All / Logged in app /
    Imported). It filters the list, the calendar dots and the same-day list,
    with an honest no-results state.
  - Validation: activities model tests (imported strength + FIT run vs app runs),
    typecheck, smoke, History browser check (3 imported / 1 app / 4 all).
  - Next: final Home/Progress polish and preflight.
- **2026-11-21 — Edit a saved session's exercises, not just its numbers.**
  - `edit-saved.js` now works on a cloned draft. Add exercise (catalogue search
    or custom name), add/remove set, remove exercise and edit notes/weights/
    reps/holds/carries, then Save once. Cancel is genuinely lossless.
  - Committing preserves session id, date and route, stamps filled new sets as
    completed, drops empty additions, keeps existing set metadata and refreshes
    `sessionSummary.completedSets`/adherence. Later programme scaffolding on the
    same day is preserved but not reordered or shown as history.
  - New set rows are shape-aware (Plank opens Time, Farmer Carry opens Distance).
  - Validation: 1,988 node tests, typecheck, smoke, edit-saved browser check
    (Cancel untouched, add Back Squat, remove one set, summary, recap).
  - Next: final Home/Progress polish and preflight.
- **2026-11-21 — Repeat a strength workout from History.**
  - The strength detail now leads with **Repeat this workout**. It force-closes
    History and creates a fresh one-off session from the source sets through the
    existing `createOneOffStrengthSession` copy path: exercises, loads, reps,
    rests and notes carry over, completion and PR flags do not.
  - The same action is still reachable from Choose workout → Copy past workout.
  - Validation: typecheck, smoke, History browser check (copy is created, title
    kept, two sets, none completed, History dismissed).
  - Next: final Home/Progress polish and preflight.
- **2026-11-21 — Training Report: real session counts, 30 days or 12 months.**
  - `forEachLoggedDay` now exposes `sessionCount` (one strength session + every
    run in the slot). The Training Report sums sessions, not unique dates, so a
    strength+run day no longer reports one session.
  - `buildPeriodReport` drives both windows; the Review Stats toggle switches
    between the rolling 30-day report and a 12-month report, each compared with
    its own prior window. The card states its exact date range and active days.
  - The section is titled **Training Report** rather than “Monthly Report”.
  - Validation: node tests (same-day strength+2 runs = 3 sessions; year window),
    typecheck, smoke, progress-hub browser check (toggle + range + stats).
  - Next: History copy/repeat and full exercise editing.
- **2026-11-20 — Progress overview: week hero, recent weeks, calendar heatmaps.**
  - The hub now leads with a this-week summary (sessions / planned, volume,
    distance, PRs, adherence bar) and a 12-week session strip, then the four
    domain cards. Both read the same date-strict index as History.
  - `loggedSessionsByDate` now counts sessions inside a slot (strength + each
    run), not slots. A strength+run day no longer showed “2 of 6” in the
    Consistency card while the hero showed 3.
  - Training Calendar in both Strength Stats and Review Stats is calendar-week
    based (`buildCalendarTrainingWeeks`), so imported/archived weeks appear in
    the weeks they happened. The Review Consistency Log is a 12-week calendar
    table (Sessions / Volume / Distance), not a program-week W1..Wn log.
  - Muscle Load no longer says “0 of 0 focus muscles in range” when no focus
    muscles are chosen; Bodyweight distinguishes “no recent weigh-ins” from
    “no weigh-ins at all”.
  - Projections now read dated calendar weeks for strength and running, so
    imported/archived sessions produce real ETAs. Legacy undated states still
    fall back to the program-week series instead of losing their projection.
  - Current Recovery/Strength load (ATL/CTL/ACWR, monotony, strain,
    consistency and progression) uses the same dated timeline as Home whenever
    real dates exist; undated legacy states keep the program-week reading. The
    program-week series remain for the trend charts and are labelled as such.
  - Validation: 1,936 node tests, typecheck, smoke, progress-hub browser check
    (hero, 12 bars, Review Stats calendar/log), strength-volume check.
  - Next: History copy/repeat and full exercise editing.
- **2026-11-20 — History overhaul: calendar-first imported history.**
  - Activities is presented as **History** and now has List | Calendar views.
    Calendar cells group the same row model History renders, so a day with two
    sessions shows both and opens a day-filtered list. The list has sticky month
    headers, instant search, type filters and imported/GPS provenance badges.
  - Imported strength titles resolve the program-day title Home uses. Cardio-only
    imports no longer create a phantom strength row, FIT strength keeps its
    duration/HR detail, and an imported run without GPS says so instead of
    rendering an empty map.
  - Deleting strength now clears `sessionStatus`/`sessionSummary` and Undo
    restores them; the delete-cancel path closes its action menu.
  - Removed the duplicate Progress activity calendar; Train and Progress link to
    History instead. The old `home/activity-calendar.js` map is deleted.
  - Week in Review adherence now compares sessions (same unit as the Progress
    hub) instead of prescribed-vs-completed sets. Swap keeps its position even
    without a stored `liftOrder`; hip-thrust substitutions stay glute-dominant.
  - Validation: 1,932 node tests, typecheck, smoke, and the new
    `scripts/history-browser-check.mjs` (imported titles, provenance, search,
    Calendar | List, same-day sessions, no-route state).
  - Next: Progress IA and the remaining program-week-only charts (Training
    Calendar, Consistency Log, load-model split).
- **2026-11-20 — Home week history, bounded to four previous weeks.**
  - The week header now pages back through four calendar weeks. A past week
    renders a recap (sessions, volume, sets, PRs and the same heat map) instead
    of a Today decision, and offers only "Back to this week".
  - `js/home/week-view.js` reads `indexSlotsByDate`, not `state.currentWeek`, so
    archived activations and same-date sessions are attributed by real calendar
    date. No future weeks and no infinite history.
  - The rail keeps its 44px cells; hiding "This week" in Customize resets to the
    current week and leaves Today pinned.
- **2026-11-20 — Home: Today folded into the week surface.**
  - `#homeTodayCard` now lives inside `#homeWeekStrip`: the seven-day rail is the
    header and Today is the decision body, not a second card.
  - A fresh `ready` day collapses to one compact row with the primary action
    still visible. Tapping today's date cell or the row expands the guidance,
    secondary action and offline status; tapping again collapses it.
  - In-progress, completed, rest, no-plan and unresolved states stay fully open,
    so a warning or a result can never hide behind a chevron.
  - `data-home-card="weekStrip"` moved onto the rail. Hiding "This week" in
    Customize removes only the seven cells; Today remains pinned.
  - The home-today browser check now covers collapse/expand, the 44px Start
    target while collapsed, and the hidden-rail case.
- **2026-11-20 — Catalogue is metadata-only; imported form text removed.**
  - Kept all 5,555 usable openGym/ExerciseDB catalogue names, ids, muscles and
    equipment for search and plan import, but stopped shipping the 5,400
    unreviewed instruction/description sets (about half the catalogue payload).
  - Form guidance now comes only from the reviewed 157-entry core catalogue;
    imported exercises say "Form guide not reviewed yet."
  - Removed the in-app openGym/ExerciseDB licence disclosure; the legal
    attribution remains in NOTICE.md and the source link.
- **2026-11-20 — Complete openGym catalogue text and plan ID map.**
  - Imported all 5,555 usable openGym catalogue entries: 4,282 openGym-authored
    (AGPL-3.0) plus 1,273 ExerciseDB v1 entries openGym distributes under MIT.
  - Added `OPENGYM_ID_NAMES`, so openGym plan files can resolve exercisedb-era
    exercise IDs such as `0289` → Dumbbell Bench Press.
  - Added an openGym plan importer: weekdays map to program days, and each
    exercise keeps its sets, reps, starting weight and rest in a `prescriptions`
    sidecar. The cockpit target/ghost weight and rest timer read it.
  - Media remains excluded; NOTICE.md now carries the ExerciseDB MIT notice.
- **2026-11-20 — Settings sub-pages, saved-workout edits, simpler Plans and JSON plans.**
  - Settings is split into Profile / Training / Health / Appearance / Data with a
    global search and no-results state.
  - History now edits a finished strength session or run in place (weights, reps,
    distance, time, HR, notes) without changing its identity, date or route.
  - Plans is two surfaces: one searchable Discover list and My Plans (saved,
    completed, custom and imported). The category/difficulty chip walls and the
    multi-rail discovery stack are gone.
  - Plans export/import as portable `openhybrid-plan` JSON. Import always creates
    a fresh custom program; nothing shared is overwritten.
  - Plans chrome uses the shared icon set instead of emoji bookmarks/filter chips.
- **2026-11-20 — Home/Progress customization and Hybrid Score removal.**
  - `settings.ui` now stores hidden optional cards for Home and Progress. A
    shared Customize sheet on both surfaces persists changes, applies them live
    and resets to default; v12 seeds the empty preference. Pinned: safety flags,
    Today, quick actions and navigation.
  - Removed Hybrid Score from the Progress secondary destinations, the weekly
    review hero/arc/share card and the onboarding finale. The computation and
    recorded history remain available for the morning briefing/notifications
    during the one-release compatibility window.
- **2026-11-20 — Midnight theme, Home bodyweight card, In Focus removed.**
  - `js/theme.js` adds the icon palette (Midnight: navy, steel, cyan, lime) as
    the default for dark/system profiles, with Slate/Forest/Ember alternatives
    in Settings → Appearance. Schema v10 seeds the palette; Light is untouched.
  - Home now includes a compact bodyweight card: latest value, 30-day line with
    goal, weekly trend and a Log button that opens the prefilled sheet. The full
    graph remains in Progress.
  - Removed the In Focus carousel and its DOM chart module; Home is a decision
    surface, Progress owns deep charts. The Run quick action keeps the old
    `log-run-fab` affordance.
- **2026-11-20 — Reliable CSV and batch FIT import.**
  - The OpenGym/Strong/Hevy CSV reader now accepts semicolon and tab exports,
    UTF-16 Excel files, unit-suffixed headers, and imports cardio rows as
    archived runs instead of silently skipping them. Strength and cardio sharing
    one workout stay in one archived week.
  - Settings gains a multi-file Garmin/Wahoo/Coros FIT importer. Dated runs keep
    distance, time, pace, HR, splits and GPS; strength FIT files import time and
    heart rate only rather than guessing exercise names.
  - Re-importing the same CSV or FIT activity is refused by its stable identity.
- **2026-11-20 — Extended exercise catalogue text.**
  - Imported 4,282 openGym-authored exercises with instructions
    (`textSource: "opengym"`, AGPL-3.0) into the searchable/picker catalogue.
    `exercisedb` rows and all media are excluded; attribution is in NOTICE.md.
  - Mapping normalises names, equipment, muscles, movement and category into the
    existing openHybrid contract; imported entries remain unreviewed (no invented
    difficulty or safety notes).
  - Added attribution/provenance docs and a catalogue contract test.
- **2026-11-20 — Warm-up ramp, muscle load and bodyweight export.**
  - Optional warm-up ramp: editable 40/60/80% rows above the bar, rounded to
    the active profile's plates/pair counts, inserted once after the first
    working weight. `settings.autoWarmupRamp` is opt-in; schema v9 seeds false.
  - Progress → Muscle Load: per-muscle weekly credits/status from the Volume
    Guide plus a simple last-trained recovery label, summary and recovery-first
    ordering.
  - Bodyweight CSV export: every weigh-in, sorted and deduped, alongside the
    existing full training CSV.
  - Added `docs/UI_REFRESH_PLAN.md`: tokens/themes/accents, customizable Home
    and Progress data, openGym-inspired visual batches, and the Hybrid Score
    removal recommendation.
- **2026-11-20 — Bodyweight graph and weekly rate.**
  - Progress → Body weight now has a real chart with labelled axes, daily
    weigh-ins, a 7-day average and an optional goal line, plus 30-day/90-day/all
    ranges and a weekly-averages list.
  - `js/metrics/bodyweight.js` computes weekly means and a least-squares
    21-day rate (minimum six weigh-ins across ten days), with lose/gain/hold
    corridors and an on-pace verdict. `settings.targetWeight`/`rateGoal` are
    optional and seeded by schema v8.
  - Logging opens a prefilled sheet (last weight, today's date) with ±0.1/±0.5/±1
    steppers, a date picker, recent weigh-ins with edit/delete, and a primary
    Save. Selecting a past date updates that day instead of duplicating it.
  - A new bodyweight browser check covers the graph, goal line, rate status,
    range switch, stepper entry, recent list and goal editor.
- **2026-11-19 — Equipment inventory accuracy.**
  - Optional pairs per plate size (`plateSetup[unit].counts`): a target the rack
    cannot build now says how much is short instead of implying plates the
    lifter does not own. Blank counts keep the historical unlimited behaviour.
  - Per-profile dumbbell ladders and per-exercise machine stacks. Suggested
    loads snap to the nearest owned rung when a ladder is configured; without
    one, the existing increment-based suggestion is unchanged.
  - Schema v7 seeds the optional shape without changing existing plate math,
    bars or denominations. Settings gains count fields, a dumbbell ladder input
    and a machine-stack editor.
  - New openHybrid icon: two lanes forming an H (steel + cyan) joined by a lime
    running lane. Generated from `assets/brand/icon.svg` by
    `scripts/generate-icons.mjs` into square PWA 192/512/maskable assets and
    every Android legacy, round and adaptive-foreground size.

- **2026-11-19 — Renamed Helyx to openHybrid.**
  - Full identity rename: UI, docs, notifications, share/export filenames,
    service-worker cache prefix, Sentry release and release artifacts.
  - Android application ID and namespace moved to `com.mjb96.openhybrid`; the
    Kotlin source/test packages moved with them. This is a new app identity, so
    the README documents export/restore for existing installs.
  - Repository links point at `mjb96/openHybrid`; the GitHub repository is
    renamed to that canonical casing. The AGPL grant is unchanged.
- **2026-11-19 — Relicensed to AGPL-3.0 and opened the source.**
  - Replaced the all-rights-reserved `LICENSE` with the verbatim GNU Affero
    General Public License v3 text; `package.json` now declares
    `AGPL-3.0-only`.
  - Added `NOTICE.md` for Leaflet (BSD-2-Clause), Sentry (MIT), the bundled FIT
    parser/Buffer (MIT) and Plus Jakarta Sans (OFL-1.1).
  - Settings → App links to the corresponding source, and
    `tests/license.test.js` ratchets the licence text, package metadata, README
    grant, third-party notices and the in-app source link.
- **2026-11-19 — Parallel browser verification.**
  - `scripts/run-browser-checks.mjs` now runs the 34 independent checks through
    a worker pool instead of one blocking `spawnSync` at a time. Each check
    already binds port 0 and launches its own Playwright context, so isolation
    is unchanged; output is buffered and printed as one labelled block per
    check.
  - Default concurrency is 3 workers (2 on a 2-core machine, 1 on a single
    core) after four simultaneous Chromium launches produced rare launch
    deadlocks; `--serial` restores the old loop and `--concurrency=N` pins
    workers. Invalid values fail instead of silently going serial.
  - The measured CI browser phase was ~423 s across 34 checks, dominated by
    per-check Chromium startup. Pooled runs cut wall time to roughly a third.
  - Each check now has a 180 s watchdog that kills its whole process group
    (Chromium included) and fails as `exit 124`, so a Playwright deadlock cannot
    hold CI open until the job limit; `--timeout=N` overrides it, and Ctrl-C
    tears down every active check.
  - A timed-out check is retried once (`--retries=N`, 0 disables) after the
    process group is killed, because a hung Playwright launch is transient.
    Non-timeout failures are never retried. The success line only prints when
    the run actually passed; the earlier version could time out checks and still
    end with "All 34 passed".
- **2026-11-19 — Program-level progression styles.**
  - Added `js/programs/progression-style.js` with Double (default), Linear and
    Rep-first rules, surfaced in the custom program editor's Progression tab and
    stored as `program.progressionStyle`.
  - `suggestProgression` keeps the existing RPE/fatigue/cut/stall safeguards:
    Linear holds on a missed top set; Rep-first builds to target + 2 reps before
    adding load; Double remains the current behaviour.
  - `computeDiagnosticForLift` accepts the program style and the workout coach
    target follows it. The program-editor browser check covers selection and
    persistence.
- **2026-11-19 — Equipment profiles for different gyms.**
  - Added `js/equipment-profiles.js` (pure model) and a v5→v6 migration that
    seeds one profile from the existing kit; the legacy `settings.equipment` /
    `settings.bandWeights` fields stay as the active profile's projection so
    program fit, swaps and plate paths keep working unchanged.
  - Settings → Equipment now has a profile selector, editable name, and
    add/delete actions. Deleting the last profile is refused; deleting the
    active one falls back to the first.
  - Each profile also carries its own kg/lb bar weight and plate denominations;
    `plateHint` uses the active profile. The per-side line in the workout logger
    is opt-in (`settings.showPlateHints`, default off) so the earlier
    target-line simplification stays intact by default.
  - The browser check seeds a commercial gym and a home profile, switches
    between them, edits plates, toggles hints, renames, adds, deletes and
    verifies persistence.
- **2026-11-19 — Modules: hide Running, Fasting, Health and Recovery.**
  - Added Settings → Modules switches persisted in `settings.modules`, default on.
  - Home hides the run quick action, run trend card, active fast pill and fasting
    insight; Train filters run/walk quick starts and recent runs; Progress drops
    running/recovery domains and fasting/projection destinations; Settings hides
    Fasting and Health Connect sections.
  - Data is never deleted. Hidden analytics sections carry `data-module` hooks,
    so a deep link cannot reopen a disabled module; stored history stays intact.
  - Dummy run data covers the module gate in `tests/module_gates.test.js`.
- **2026-11-19 — Home rebuilt as a decision surface.**
  - Home now reads: greeting/date → Today card → safety flags → seven-day week
    strip → one coach insight → quick actions. The In Focus charts remain as a
    secondary section below the fold for their existing attribution and deep-link
    contracts.
  - The week strip is a pure model (`js/home/week-strip.js`) with done / today /
    missed / planned / rest states and opens Activities for a recorded date.
  - Quick actions cover bodyweight, quick workout, run logging and Activities.
  - Tests cover week-strip states, week-start rotation, run completion and a
    rest-only week. Existing Home Today, attribution, running and touch-target
    browser contracts are preserved.
- **2026-11-19 — OpenGym/Strong/Hevy workout CSV import.**
  - Added a clean-room CSV reader (`js/portability/import-workout-csv.js`) for
    the public one-row-per-set export shape used by OpenGym, Strong and Hevy.
    No OpenGym code is copied.
  - Imports strength sets into archived `arch:import:<id>` weeks with stable
    session IDs, preserving warm-ups, RPE/RIR, workout notes, dates and duration.
    Re-importing the same file is idempotent and the active program is untouched.
  - Added **Settings → Data & backup → Import Workout History (CSV)** with a
    preview and confirmation. Cardio rows are counted and skipped in this pass.
  - Tests cover quoted CSV, OpenGym/Strong/Hevy headers, unit conversion,
    warm-ups, archived-week mapping and idempotency.
  - Bodyweight CSV import followed: `import-body-csv.js` reads the
    `date,weight_kg` export, keeps the last reading per day, converts units and
    never overwrites an existing date. Settings auto-detects workout vs body file.
  - Run/cardio import is deferred: the owner's export has no cardio rows, so
    strength + bodyweight is the import scope for now.
- **2026-11-19 — Supabase removed; the app is local-only.**
  - Deleted the Supabase client, auth/sync/conflict modules, cloud recovery
    snapshots, account UI, edge function and RLS SQL. `package.json` no longer
    carries `@supabase/supabase-js`; the vendored runtime is Sentry only.
  - `/api`-free: onboarding now offers only a JSON backup restore; Settings has
    no account/cloud section; the state mirror and JSON/CSV export/backup are
    the persistence story.
  - Privacy policy, Play Data Safety guide, store listing, threat model and
    versioning docs updated for the local-only posture.
  - Verification: 1,771 tests, typecheck, precache, smoke; browser 32/32;
    Android test/lint/assemble pass.
  - Next: OpenGym history import.

- **2026-11-19 — Android state mirror for offline durability.**
  - Added `StateMirrorBridge` and `StateMirrorSafe`: the Android shell now
    keeps an app-private copy of the serialized app state, written atomically
    (temp file → fsync → rename) with a `.bak` of the previous good copy.
  - `js/state/mirror.js` restores the mirror only when localStorage is missing,
    corrupt or older; it writes after every local save and coalesces bursts.
    A localStorage quota failure now says whether the change reached the private
    mirror or was not saved, instead of claiming success.
  - Import rewrites the mirror; reset and account deletion clear it. The
    threat model, ADR-002 and the bridge list were updated for the sixth native
    bridge.
  - Verification: 1,808 JS tests, typecheck, precache and smoke; Android
    `testDebugUnitTest`, `lintDebug` and `assembleDebug` pass (5 new JVM tests).
  - Next: verify mirror recovery on a physical device, then decide whether the
    full native rewrite is still wanted now that the WebView shell has durable
    local storage.
- **2026-08-13 (later) — Shed PPLUL replaced its fixed wave with the owner’s
  performance-based ongoing block.**
  - The five lifting days now match the supplied plan exercise-for-exercise and
    set-for-set: reduced low-fatigue back/rear-delt/single-leg volume, Friday
    paused bench instead of close-grip bench, Saturday paused conventional
    deadlift, and the optional farmer carry reduced to two sets. Thursday is
    explicitly 45–60 minutes of conversational-pace walking; it remains an
    optional recovery day rather than becoming a mandatory Run Day.
  - Removed the 8/6/4 calendar, automatic Weeks 4/8 deloads and Week 12 rep-PR
    assessment. Every week now keeps the authored rep ranges; repetitions, load,
    RIR and execution determine progression. Weeks 4, 8 and 12 are review
    checkpoints only, with a 30–50% volume reduction suggested only when fatigue
    evidence supports it.
  - Retained a renewable 12-week app window instead of shortening the catalogue
    entry to four weeks, so an active run already past Week 4 is not invalidated.
    `ongoing:true` and `reviewEveryWeeks:4` state the real intent. No workout or
    history data is migrated or rewritten.
  - Added `Paused Barbell Bench Press` and `Paused Conventional Deadlift` as
    distinct reviewed exercise identities, so their history and PRs never merge
    with the standard variations. The supplied performance baselines remain
    reference metadata, never auto-filled prescriptions.
  - Shed’s authored programme/week/exercise guidance now renders on the real
    detail page rather than sitting unused in catalogue metadata. A Chromium
    guard proves the new brief, paused lifts and active-recovery day are visible,
    the retired wave is absent, and the page has no 320–412px overflow.
  - Verified 1,800 unit tests after merging the browser-network guard from main,
    plus typecheck, smoke, regenerated precache, and the
    programme-detail browser check. Next: extract supersets from `workout.js`;
    event routers remain last.

- **2026-08-13 (later) — post-merge release/deploy browser flake removed at the
  network boundary.**
  - PR #213's exact Git tree passed both required Web checks, then the two
    `main` publication workflows failed in different random subsets of the same
    32 checks. A rerun failed in three different checks again. Every functional
    assertion passed; each failure was only Chromium's anonymous "Failed to
    load resource: 404" console line.
  - A request probe showed the only normal boot-time external resources are the
    Google Fonts stylesheet and font file. Browser product checks now create
    contexts through `createBrowserContext`, which permits their local fixture
    servers and deterministically blocks every external HTTP(S) host. A missing
    local module, stylesheet, icon or manifest still reaches the page as a real
    404 and fails loudly.
  - `tests/browser_check_network_guard.test.js` prevents a future product check
    from bypassing the isolated context. The performance baseline is an explicit
    exception: it retains direct contexts and its own online/offline scenarios,
    so the font-loading performance contract is still measured rather than
    hidden.
  - Verified 1,800 unit tests, typecheck, smoke, precache, and all 32 required
    browser checks. Next: push the fix PR, confirm both Web checks are stable,
    then return to the supersets extraction; routers remain last.

- **2026-08-13 — PR #213 reconciled with the run-unit extraction already on
  main.**
  - Merged main's `run-units.js` and its 10 tests without duplicating the pure
    conversion helpers: `run-logging.js` imports them and owns when the UI
    boundary is applied; `workout.js` remains the 1,837-line facade.
  - Combined the working brief and roadmap histories, renumbered the completed
    seams in landing order, and regenerated one precache containing
    `run-units.js`, `run-logging.js`, and `set-mutations.js`.
  - Verified 1,797 unit tests, typecheck, smoke, precache, and all 32 required
    browser checks. The safe-area check that produced the old push-run's
    anonymous 404 passed first time. Next: extract supersets; routers remain
    last.

- **2026-08-11 — fifth workout seam: set mutations extracted.**
  - `js/workout/set-mutations.js` now owns adding and removing set rows,
    removal Undo, warm-up/type/RIR edits, bodyweight prompting, and direct/band
    load selection. `js/workout.js` fell from 2,130 to 1,837 lines while keeping
    its public handler surface and all four event routers stable.
  - A focused browser/unit run exposed the renderer's shared bodyweight lookup;
    it is now an explicit import from the new module rather than duplicated.
    The split guard also refuses to let the new module become orphaned or import
    workout.js back.
  - Verified 1,787 unit tests, typecheck, smoke, precache, and the relevant
    browser contracts. Next: extract supersets; routers remain last.

- **2026-08-11 — fourth workout seam: cockpit run logging extracted.**
  - `js/workout/run-logging.js` now owns the run card's render/persist boundary,
    unit-boundary integration, imported detail/map rendering, safe live-card
    positioning, and manual pace/time derivation. Pure conversion stays in
    `run-units.js`. `js/workout.js` fell from 2,334 to 2,130 lines without moving
    the event routers or changing its public surface.
  - Added regression coverage for manual pace/time derivation and a miles edit
    updating one canonical-km run session without dropping FIT cadence data.
    The live-run source assertions now follow the implementation into the new
    module, and the split guard refuses to let that module become orphaned.
  - Verified 1,787 unit tests, typecheck, smoke, regenerated precache, and all
    32 required browser checks. Next: extract set mutations; supersets follow,
    and the routers still move last.

- **2026-08-10 (third) — run-unit conversion extracted, and tested for the first
  time.** `js/workout/run-units.js`; workout.js 2,379 → 2,334.
  - Line count is the least interesting part. These were PRIVATE helpers, so the
    mile conversion path — every athlete using `distanceUnit:'mi'` — had never
    been tested by anything. Extraction made them reachable and they now have 10
    cases, including that a pace is never invented from a distance with no time.
  - Two of my own mistakes, both caught by running rather than reading: I asserted
    a number where the functions return strings, and my browser verification used
    `distance:` where the state field is `dist:` — which produced an empty input
    and would have passed as "verified" while proving nothing. The second is the
    more dangerous kind, and it is the third time this session a fixture field
    name has quietly falsified a check.
  - Proven end to end afterwards: 10 km stored renders `10 @ 5:00/km` and
    `6.21 @ 8:03/mi`.
  - Not run: `running-analytics-check`, whose container threshold (26s vs ~2s in
    CI) exceeds a sane local timeout. It is analytics, not the cockpit run panel,
    and CI covers it.

- **2026-08-10 (later) — export audit said "do nothing", and the next cut found a
  bug I had shipped the day before.**
  - The audit disproved my own note. **Zero of workout.js's 44 exports are dead**;
    the 23 that app.js does not import are the event routers' call surface.
    Un-exporting them would have broken the very next step.
  - It also reversed the plan: the routers are 81 lines dispatching to 27 local
    functions, so they must move LAST, after the handlers they call. I had
    proposed them next. Recorded so the order is not re-derived wrongly.
  - `js/workout/clear-log.js` extracted instead (2,492 → 2,379 lines) — and doing
    it surfaced that my `switchTab` context wrapper **dropped its second
    argument**, so discarding a workout committed UI state for the discarded
    workout. Shipped in #209, invisible: no types, no error, no failing test.
    Fixed with `...args` on every wrapper plus a regression test verified against
    the broken form.
  - Both of this session's real defects came from the type-checker or from
    extraction forcing me to read call sites — not from reasoning about the code.
    That is now twice that `@ts-check` on a newly extracted file paid for itself.


- **2026-08-10 — `main` red on a Monday, and the cause was a check I had
  classified as safe.** `home-attribution-check` failed in CI on PR #210.
  - **First: it was not the refactor.** The same check fails on clean
    `origin/main`, verified by checking main out and running it. Worth doing
    deliberately — earlier in this work I blamed my own diff for a flake that was
    not mine, and the reflex is easy to repeat.
  - The real cause is the weekday-dependence class again, from the "arithmetic
    only (7)" bucket I had judged harmless. It was not: this check derives a
    comparison WINDOW and a wed/fri "alternate day" from the weekday, not just a
    week start. On a Monday "this calendar week" is one day long and the
    same-exercise delta it asserts cannot exist.
  - Pinned to Thursday. Wednesday was the obvious pin and was WRONG — it collided
    with the check's own alternate-day choice and turned one failure into three.
  - **The other six were then run, not reasoned about.** Five pass on that
    Monday; the sixth fails on the documented container-speed threshold. So the
    classification held for them, and was wrong only where a weekday read meant
    more than week-start arithmetic — which is the distinction the roadmap now
    records.
  - `UNPINNED_BACKLOG`: 10 → 7 → 6 across the two sessions.


- **2026-08-09 (ninth) — first real cut of workout.js: exercise selection
  extracted. 2,670 → 2,492 lines.**
  - Two dependencies pointed backwards. `_unitOf` was read on both sides, so it
    became `js/workout/units.js`; `renderWorkout` is now registered with the
    context, so the picker requests a redraw instead of importing workout.js.
    Both resolutions keep the graph a tree, which is the property everything else
    depends on.
  - **The type-checker found two things a grep would not.** The extracted block
    referenced `browseExercises`, `equipmentLabel` and `EXERCISE_CATEGORY_LABELS`
    that I had not carried over, and `workout-order.js` is at `js/`, not
    `js/workout/`. Adding `@ts-check` to the new file — which the original never
    had — is what surfaced them.
  - **Verified by driving it.** This code is DOM-heavy and near-untestable in
    isolation, so a scripted swap and add proved the new redraw hook end to end:
    the cockpit redrew, the modal closed, state persisted.
  - `tests/workout_split_guard.test.js` guards the shape (no back-imports,
    dependency-free context, no orphans, public surface intact). Each of the four
    was verified to fail when violated — and the guard's own first run reported
    `devWarn } from './debug.js'` as a missing export, because a lazy regex
    spanned several import statements. A guard that has never failed has not been
    tested either.
  - Found in passing: **app.js imports 21 of workout.js's 44 exports.** Half the
    public surface is internal-only or dead. Recorded for audit before the next
    seam rather than acted on here.


- **2026-08-09 (eighth) — workout.js split unblocked: the injected context is its
  own module.** `js/workout.js` is 2,670 lines with 44 exports and exactly one
  consumer (`js/app.js`), which makes it safe to carve up — except that every
  candidate module needed the six app accessors the file held as module locals,
  and could only reach them by importing the file back.
  - `js/workout/context.js` now owns them. Pure move, no behaviour change, and
    the enabling step rather than the improvement.
  - **It nearly was not a pure move.** Two readiness guards tested whether the
    accessor FUNCTIONS existed. Wrapping them made those tests permanently true,
    so two render paths would have run before the app wired anything. Caught by
    reading the call sites rather than trusting the description of the change.
  - The precache root guard shipped earlier today caught the new module
    immediately — the first thing it protected was a file added hours later.
  - Next seam scoped and recorded rather than half-started: exercise selection
    shares several private helpers with the rest of the file, so it is a wider
    cut than its export list implies and deserves its own verified slice.


- **2026-08-09 (seventh) — Progress detail screens audited; NO change warranted,
  and the audit exists so this is not re-litigated.**
  - I proposed a redesign of the Strength detail on the basis that it renders
    ~867 nodes, opens on ten metrics and shows four `--` tiles above the per-lift
    progression. **That measurement was wrong.** It came from clicking the first
    `[data-action="open-analytics"]` in document order — a hidden control in an
    unrelated section — rather than the hub's Strength card, and from a fixture
    with no RPE logged, which is why load metrics read `--`.
  - Rendering every context deliberately gives the real picture. All eight are
    lean and none shows a single `--`:

    | context | nodes | height |
    |---|---:|---:|
    | strength | 37 | 601px |
    | strength-volume | 92 | 900px |
    | muscle | 76 | 842px |
    | weekly-review | 22 | 406px |
    | running | 25 | 469px |
    | recovery | 38 | 842px |
    | hybrid-score | 108 | 565px |
    | projections | 43 | 570px |

  - The dense load-model dashboard is real but lives behind an **Overview | Stats**
    tab the athlete opts into — which is exactly what 3B asks for ("keep CTL/ATL/
    TSB and formula-level values behind explanations"). It was already right.
  - **Phase 3 needs no presentation work.** The remaining item is still readiness
    COMPONENTS, still blocked on a persisted readiness series, still deliberately
    deferred. Do not re-open the detail screens on the strength of a screenshot;
    render the context and count.
  - Method note worth keeping: two of my measurements this session were wrong in
    the same way — a selector that matched something other than what I believed
    it matched, reported with confidence. The touch-target and performance checks
    both survived because I verified them by making them FAIL. This audit did not
    have that property until I rendered each context by name.


- **2026-08-09 (sixth) — a personal copy silently lost its programme's
  progression, reported from real use.** Shed PPLUL showed **4 × 8 for every
  lift on every day**, deadlift included, where the spec has six distinct
  accessory prescriptions and a separate deadlift wave.
  - **The catalog programme was fine.** Driving every training day across weeks
    1, 4, 5, 9 and 12 reproduced nothing — all correct. The bug was in the
    athlete's COPY: `duplicateCustomProgram` deep-clones, so a copy made before
    its source gained `progressionModel` has no hook, `isShedPplulProgram`
    returns false, and every lift collapses to the single shared week modifier.
    Because the copy lives in the athlete's own state, shipping a corrected
    catalog never reaches it.
  - Fix is READ-TIME: `liftTarget` resolves the model from `sourceProgramId`
    when the programme itself has none (`withInheritedProgressionModel`,
    `js/engine.js`, WeakMap-cached per programme object). Nothing stored is
    rewritten — no migration, sync or export surface, and the Phase 4C ADR gate
    is untouched. Copies repair themselves on the next render.
  - **Edits survive.** A swapped-in exercise is simply unauthored by the model,
    so the resolver returns null and the normal fallback applies — the same
    boundary that already protects an exercise added mid-session. Guarded by a
    test, along with "no source ⇒ no inheritance" so a self-built programme can
    never acquire a progression it was not given.
  - Already-materialised weeks self-correct: unlogged accessories reconcile to
    the right set counts and a logged set keeps its row. Verified in the browser
    against a week materialised under the broken prescription.
  - This is a CLASS, not one programme — any copy of any programme whose
    progression model landed later had the same silent failure.
  - Verified: 1,780 unit tests (+4, each verified to fail without the fix),
    typecheck, smoke, precache regenerated, workflow gates, and the J&T,
    preview-consistency and copy-program browser checks.


- **2026-08-09 (fifth) — performance baselines, and the first run found a
  12-second first paint.** `scripts/performance-baseline.mjs`.
  - `index.html` loaded the Google Fonts stylesheet as a plain render-blocking
    `<link>`, under a comment asserting `display=swap` kept first paint fast.
    That comment was wrong: `display=swap` governs the font FILE, not the
    stylesheet, which blocks rendering until it loads or fails. On a network that
    cannot reach `fonts.googleapis.com` — every offline start of this PWA —
    **FCP was 12,656ms, and 12,530ms of it was that one request**. Now 280ms.
  - **I introduced a second bug fixing the first, and the gates caught it.**
    `js/font-css.js` is a classic `<script>`, so nothing imports it, so the
    precache generator's walk from `js/app.js` never saw it. Offline it would
    404, the stylesheet would stay `media="print"`, and the brand font would
    never apply — on precisely the start the precache exists for. Fixed at the
    generator; the test now derives script roots from `index.html` instead of
    keeping a second hand-written list that could drift the same way.
  - **Twice this session a "60-second hang" was my own fixture** — first week 1
    dated five years ago, then every day marked `finished` so Home offered
    "Review workout" and the cockpit never opened. Both are written into the
    generator as comments. Neither was an app defect and both would have been
    embarrassing to report as one.
  - Deliberate restraint on budgets: only three things are asserted, all
    structural. Wall-clock is reported, never asserted — this container is ~3×
    slower than CI and neither is a phone, so a millisecond budget would be
    flaky or vacuous. Every asserted budget was verified to FAIL by restoring
    the defect it guards.
  - Verified: 1,776 unit tests (+2), typecheck, smoke, precache regenerated,
    workflow gates.
  - Next: run the harness against a deployed build on a real device (`[You]`);
    Phase 6 maintainability (splitting `js/workout.js` and `js/app.js`).


- **2026-08-09 (fourth) — live-run and onboarding walked; 875 controls across 12
  surfaces.** This closes the touch-target sweep.
  - **The only real defect was third-party.** Leaflet ships its map zoom buttons
    at 30×30 and injects them at runtime, so they exist in no markup in this repo
    — invisible to every static test by construction, on the one surface an
    athlete operates while moving. Now 44×44. Leaflet's credit link is exempt
    with arithmetic; the zoom buttons in the same map are not.
  - **A COVERED control is not that surface's control.** Onboarding exposed this:
    Home stays `.view-container.active` underneath the overlay, so its week
    arrows were measured and correctly found unreachable — a true measurement of
    a non-problem. The fix (skip anything whose own centre resolves to a
    different element) also stopped every modal double-counting the cockpit
    behind it, dropping add-exercise from 383 to 359 controls. The totals got
    smaller and more honest at the same time, which is the right direction.
  - Verified: 1,774 unit tests, typecheck, smoke, precache regenerated, workflow
    gates, active-run and safe-area checks, and the check verified to FAIL on a
    Leaflet-control regression.

- **2026-08-09 (third) — the touch-target walk extended to the cockpit and its
  modals: 145 controls measured → 895.** The four nav destinations are where the
  app STARTS; the cockpit is where a session is actually spent.
  - **Both naming defects were in the set row** — the single most-used control in
    the app. The weight input carried `aria-label="Effective load for set N"`;
    the reps input beside it carried nothing. Someone labelled one and missed the
    other, and nothing was watching. The completion checkbox's only name was a
    `✓` glyph from its wrapping label, which is a name a resolver accepts and a
    human cannot use.
  - Six undersized cockpit controls, the worst a 21px pace input. All are reached
    mid-workout and one-handed.
  - Every modal opener is ASSERTED, not best-effort: a selector that stops
    matching fails the check instead of quietly measuring nothing. Verified by
    introducing a typo. This is the same silent-skip failure the `jt-shed` check
    shipped for months, and it would have been very easy to reproduce here.
  - Verified: 1,774 unit tests, typecheck, smoke, precache regenerated, workflow
    gates, the five cockpit browser checks re-run individually, and the extended
    check verified to FAIL on both a naming regression and an unopenable modal.
  - Next: the live-run surface (`run-session-active`) and onboarding.

- **2026-08-09 (later) — Phase 6 accessibility: touch targets measured in the
  real app.** Phase 6 is `CONTINUOUS`, not queued behind Phase 4, so it needed no
  wait. Started with touch targets because the evidence was already in hand from
  driving the app in earlier sessions.
  - **The static a11y test could not have found any of this.** It greps
    `index.html`; every offender was rendered from a JS template literal. The
    worst was a **5×5px** carousel dot with no accessible name — 1/77th of the
    required area, in the app for as long as the Plans hero has existed.
  - Measuring honestly took three iterations, and the first two would have
    shipped false results. Naive `querySelectorAll` reported 373 controls and 83
    failures — but every view stays in the DOM, so the Settings panel's inputs
    were counted on all four destinations; 235 of those controls were not on
    screen. Then "unnamed" flagged every correctly-labelled checkbox, because it
    checked `aria-label` and ignored `<label for>`. Real numbers: 145 visible
    controls, 23 under 44px, 3 unnamed.
  - Fixed to 2 and 0. The 2 are geometric floors with the arithmetic recorded,
    not preferences — notably the carousel dots, where a nominal 44×44 would
    have made two of the three dots unreachable behind their neighbour's hit
    area. A reachable 10×44 beats an unreachable 44×44.
  - `.hit-target` (`css/styles.css`) is the new mechanism for controls whose
    small visual size is deliberate: the paint is unchanged, only the hit area
    grows. Written down with it: never expand past half the gap to the next
    control, or overlapping targets make the earlier one unhittable.
  - The check was verified to FAIL twice, by reverting a fix and by breaking
    `.hit-target`'s positioning context — a check that cannot fail is a file,
    not a guard.
  - **One hypothesis I recorded was wrong, and measuring is what caught it.** I
    reasoned that `.hero-banner`'s `overflow: hidden` must crop the dots' 44px
    hit area to ~34px and was about to move the dots up to "fix" it. Probing
    outward from the dot centre returned a reachable 44px tall × 10px wide,
    exactly as designed. The clipping never happened. Worth remembering: the
    reachability probe exists precisely so this class of reasoning gets checked
    instead of acted on.
  - Verified: 1,774 unit tests (+5), typecheck, smoke, precache regenerated via
    `npm run precache:gen` (CSS changed, so `CACHE_NAME` had to move or installed
    PWA clients would never receive the fix), workflow gates, full browser suite.
  - Next: extend the walk to modal/sheet surfaces and the in-session cockpit,
    which the four-destination walk does not reach.

- **2026-08-09 — the three fragile clock-dependent checks pinned; one of them was
  not asserting what its name claims.** `home-today`, `active-program-edit` and
  `jt-shed` now pin to Monday 2026-08-03 in `Australia/Sydney`. Each was run
  individually to a pass rather than swept.
  - **`jt-shed` was worse than the 2026-08-08 classification guessed.** That entry
    reasoned it "already branches on `isJtTrainingDay`, so it may be safe by
    construction". The branching WAS the defect: scenarios B, C and D were skipped
    whole on the weekdays that did not suit them, so on Wednesday and Sunday the
    check ran, printed a handful of `ok` lines and passed without exercising the
    cockpit, the switch-away-and-back guarantee, or the Block-2 back-off model at
    all. Guarding against a red `main` had quietly become a hole in coverage.
    Removing the branches restored 25 assertions that only ran four days in seven.
  - The guard test's silent-skip regex matches `if (expectedByDay[todayKey])` and
    did not see `if (isJtTrainingDay)`. A regex over shapes catches the shape it
    was written for; it is a ratchet against regression, not a search for
    instances. The remaining seven were re-read rather than trusted to it.
  - Also fixed in all three: `new Date(\`${iso}T12:00:00\`)` parses as LOCAL time,
    so `.getUTCDay()` could name the previous day on a host east of UTC. CI runs
    in UTC, so this was invisible there. Now `T12:00:00Z`.
  - `UNPINNED_BACKLOG` is down from ten to seven — all arithmetic-only
    (week-start maths), none of which uses the weekday as a program day key.
  - Verified: 1,769 unit tests, typecheck, smoke, precache manifest, and all three
    edited checks re-run individually.
  - Next: the Phase 6 accessibility sweep (44px targets, keyboard reachability,
    labels on icon controls and charts) — Phase 6 is `CONTINUOUS`, not queued
    behind Phase 4, and this session's browser work surfaced concrete offenders.

- **2026-08-08 — `main` red on a Sunday, and the fix is a guard rather than a
  third patch.** `train-landing` and `active-run` both failed because
  `hybrid_engine` rests on Sunday: the landing offers a wellness check-in instead
  of a workout, and the picker lists no Sunday session. Nothing wrong with the app
  — the same weekday dependence as the Saturday `no prescribed lift` failure and
  the jt-shed silent skip.
  - **The real finding is about me, not the checks.** I had already fixed this
    twice and had the evidence in hand — a grep listing a dozen clock-reading
    scripts — and fixed only the two that were failing at the time. Fixing
    instances of a class you have already named twice is how it comes back a
    third time.
  - Both checks pinned. `tests/browser_check_clock_guard.test.js` now enforces the
    class: read a weekday from the wall clock ⇒ pin the clock; never gate the main
    assertion on today's weekday; and an `UNPINNED_BACKLOG` of the remaining ten
    that may only shrink, with a companion test that fails if a name lingers after
    its check is pinned.
  - Those ten all pass on a Sunday (CI's Sunday run failed exactly 2 of 30), so
    they are latent rather than broken — each waiting for the weekday its own
    fixture programme rests.
  - Verified: 1,769 unit tests (+4), typecheck, smoke, precache, workflow gates,
    and train-landing / active-run / jt-shed-simplified re-run on the Sunday that
    broke them.

- **2026-08-07 — 4D batch 3: 32 → 48 of 155, and a flake diagnosed rather than
  blamed.** Next 16 by programme usage — Plank, Rear-Delt Fly, Face Pull, DB
  Shoulder Press, Lat Pulldown, Front Squat, Band Face Pull, Push-Up, Dip,
  Incline DB Curl, Hanging Leg Raise, Close-Grip Bench, One-Arm DB Row, DB Lying
  Leg Curl, Leg Curl, SkiErg. The shape guard from batch 2 caught nothing, which
  is what it is for.
  - **`exercise-picker-browser-check` failed once, and it was NOT the change.**
    First reaction was to treat a red check on my own diff as my regression;
    running the same code again passed, and clean `main` passed too. The real
    cause was a fixed `waitForTimeout(300)` before a click, racing the Plans
    render in a container ~3× slower than CI. Replaced with a `waitForSelector`,
    then run twice more to confirm. Recorded because a timing flake that looks
    exactly like a regression costs more than the second it saves — and because
    "verify before concluding" applies to blaming yourself as much as to blaming
    the code.
  - Verified: 1,765 unit tests, typecheck, smoke, precache, workflow gates, and
    exercise-picker (×3).

- **2026-08-07 — 4D batch 2: the 16 most-programmed lifts got their instructions,
  difficulty and safety notes.** 16 of 155 reviewed → 32 of 155.
  - Batch chosen by **measured usage across the programme catalogue**, not
    alphabetically: Back Squat appears in 41 programme days, Barbell Bench Press
    31, then Row / Lateral Raise / Conventional Deadlift / Romanian Deadlift at 26
    each. Reviewing the lifts an athlete actually meets beats reviewing the
    lifts that sort first.
  - A **shape guard** now backs the content: an entry with instructions must carry
    a difficulty from `EXERCISE_DIFFICULTIES` and at least one safety note, and
    every line must read as a sentence. An exercise that says how to do it and not
    what to watch for fails the suite — which is the failure mode that matters
    here, and the one a later batch is most likely to reintroduce.
  - `EZ()` renamed `REVIEWED()`: it was never EZ-bar-specific, only first used
    there, and the name would have misled the next batch.
  - **Said plainly: this content is offered for review, not as expert
    instruction.** It is conservative, standard gym guidance; safety notes are a
    claim shown to someone loading a barbell, so batches stay small enough to
    actually read in a PR. 123 entries remain.
  - Verified: 1,765 unit tests (+4), typecheck, smoke, precache, workflow gates,
    exercise-picker and program-editor browser checks.

- **2026-08-07 — 4D opened with muscle browsing, and the oldest deferred item
  finally done.**
  - **`jt-shed-simplified` stopped lying by omission.** Its cockpit assertion was
    keyed by weekday behind `if (expectedByDay[todayKey])`, and J&T rests on
    Wednesday and Sunday — so two days in seven it ran, printed nothing, and
    passed without asserting anything. Pinned to a Monday with the `pinClock`
    helper built for the finish-review fix, and the guard is now an assertion.
    This had been deferred four sessions running; it went first this time.
  - **Primary-muscle browsing.** `MUSCLES` has 19 anatomical keys — exactly the
    "anatomical clutter" 4D says not to expose. Six training words instead
    (Chest / Back / Shoulders / Arms / Legs / Core), covering every anatomical key
    exactly once, filtering on FULL credit only: any-involvement returns 21
    exercises for glutes against the 8 that actually train them, and a glutes list
    containing Bench Press is not a filter. Both pickers, composing with search
    and equipment.
  - **A control that lied about itself:** the filter beside it read "Filter by
    muscle group" / "All muscle groups" while filtering
    push/pull/legs/core/conditioning. It says "All movements" now — the muscle
    filter it claimed to be is the one that just got built.
  - **Honest edges:** conditioning movements with no single primary muscle
    (Burpee, Kettlebell Swing, Rowing, SkiErg) are not forced into a group, and
    custom exercises — which carry no catalogue muscle data — are withheld while a
    muscle filter is active, exactly as the existing filters already behave.
  - **Measured for the metadata half of 4D:** all 80 entries carry the fields, but
    only 13 of 80 have real `instructions`; `safetyNotes` and `difficulty` are
    empty on most. `muscles` / `movement` / `equipment` are complete on all 80,
    which is what made this browsing work possible at all. The remaining ~67 need
    authored content, and safety notes are a claim shown to athletes — batched
    with review rather than bulk-generated.
  - `tests/exercise_catalog.test.js` +8. `exercise-picker-browser-check` gained a
    4D section, including that three selects fit one row at 320px and none falls
    under 44px. Verified: 1,761 unit tests, typecheck, smoke, precache, workflow
    gates, and the exercise-picker / program-editor / jt-shed-simplified /
    core-ergonomics browser checks.

- **2026-08-07 — Phase 4C finished: one undo, three dialogs gone, and a button
  that had never worked.** Interaction principle 5 prefers Undo over repeated
  confirmation; the builder had the dialogs *without* the Undo, so removing an
  exercise or wiping a day to rest cost a modal and was still permanent.
  - `captureProgramDraft` / `restoreProgramDraft` snapshot the whole editable plan
    rather than the one field an action touches — one shape that cannot be got
    subtly wrong per action. **Plan only:** logged workouts live in `state.weeks`
    and are never captured, so an undo cannot rewrite training history. A test
    asserts the snapshot's keys are exactly `days` / `weeklyVolModifiers` / `label`.
  - One strip above the section body, naming the edit, covering remove / add /
    replace / reorder / rest-day / copy-day / progression. The progression-only
    undo shipped earlier the same day was folded into it rather than left as a
    second mechanism.
  - **A dead control, found only by driving it:** the day card's "Make rest day" /
    "Add training" toggle carried no `data-day`, and both handlers are guarded by
    `&& day`. That button had never done anything since it was written. The browser
    check now clicks it, and the reason is a comment above `renderSchedule` so it
    cannot quietly regress.
  - **Repeated my own mistake:** a backtick inside an HTML comment terminated a JS
    template literal again — the same defect from earlier in this session. Caught
    by the browser check (`days=0 focusedCards=0`), not by review. The note now
    lives in a JS comment outside the template. Prose containing code punctuation
    does not belong inside a template literal.
  - `tests/program_editor.test.js` +6. `program-editor-browser-check` gained an
    undo section driving remove → undo → rest-day → undo. Verified: 1,753 unit
    tests, typecheck, smoke, precache, workflow gates, and the program-editor /
    active-program-edit / modal-accessibility / core-ergonomics browser checks.

- **2026-08-07 — Phase 4C: the builder can be asked one question instead of 36.**
  Name, days and exercises were already Simple editing; "broad progression" was
  the gap, and the only way to say *make this get harder* was a per-week grid of
  three inputs times every week — 36 fields on a 12-week plan, before the
  programme exists. Progression now opens on **Simple**: three shapes plus a
  deload cadence, writing the same `weeklyVolModifiers` the grid writes, so no new
  stored field exists and the 4C ADR gate on normalised per-lift prescription
  DATA is not approached.
  - Choosing a shape only PLANS. The block is described in a sentence first
    ("3 sets · 8-10 reps across 3 training weeks · 1 deload week (4)") and nothing
    is written until Apply — rewriting every week at once is not something to do
    to someone silently. Apply returns a deep snapshot, so Undo restores exactly
    what was there, including hand-tuned weeks.
  - Shapes ramp from the athlete's own week-1 values rather than fixed constants,
    and a deload never consumes a step of the ramp it exists to recover from.
  - **Found by driving it, not by reading:** the Advanced week rows had a 36px
    "Copy W-1" and a 40px deload toggle against the app's 44px standard. They had
    never been measured because the editor check only ever looked at the Schedule
    tab; it now visits Advanced, and both use `--touch-target`.
  - `tests/builder_progression_shapes.test.js` (13 cases, including that planning
    is pure, that undo is a snapshot rather than a live reference, and that a
    stored rep RANGE like "8-10" survives a steady block intact).
    `program-editor-browser-check` gained a 4C section driving
    choose → preview → apply → undo → Advanced. Verified: 1,747 unit tests,
    typecheck, smoke, precache, workflow gates, and the program-editor /
    active-program-edit / program-detail-viewport / core-ergonomics browser checks.
  - **Left undone and stated:** day reorder/replace/copy/rest-day conversion are
    direct but not undoable. Only progression is. A shared editor undo is the next
    slice, not something this change quietly claims.

- **2026-08-07 — Phase 4B: programme detail answers "who is this for".** It could
  not answer it at all before — a tagline and an achievements list, neither aware
  of the athlete. `detail-fit.js` reuses the recommendation engine's own
  `programFit`, so the two surfaces cannot describe the same programme
  differently, and adds the one thing the recommendations row must never show:
  the **cautions**. The row drops an unfitting programme rather than caption it;
  someone who opened the detail page has already chosen to look and needs the
  cost. An intermediate athlete on StrongLifts now reads "Fits, with caveats …
  ! Easier than your intermediate level" instead of a page that implied it was
  simply a good idea. An athlete who answered nothing still gets no verdict.
  - Equipment moved out of the Overview tab and became a FIT statement: missing
    items marked, count stated in words so colour is not the only signal.
  - The decorative tag row lost the difficulty tag and the equipment-tier tag —
    both restated a neighbour. Measured to zero in the browser.
  - **Start/Customise deliberately not moved last**, though 4B lists it seventh:
    the page is 2,547px and burying the primary action would be a worse trade. It
    sits after the three fit answers and before the deep material. Stated as a
    decision, not left as a silent gap.
  - `tests/detail_fit.test.js` (7 cases, incl. one asserting detail and the
    recommendations row cannot disagree). `program-detail-viewport-check` gained a
    4B section asserting the section ORDER and zero repeated tags. Verified: 1,734
    unit tests, typecheck, smoke, precache, workflow gates, and the
    program-detail-viewport / preview-viewport / program-preview-consistency /
    copy-program / plan-recommendations / active-program-edit / core-ergonomics
    browser checks — the preview-parity ones because 4B must not change what the
    page promises the cockpit will deliver.

- **2026-08-07 — Phase 4A finished: Discover recommends before it asks you to
  browse.** Measured the surface first rather than trusting the description of it:
  36 chip controls (the 15 categories drawn twice, once at the top and once in the
  Browse-all grid), a 220px editorial carousel at y415, and the personal
  recommendation row not starting until y651. Filters now render only while
  browsing, the carousel sits below everything personal, and recommendations lead
  at y327 — 15 default chips, each category drawn once. The last-used filter still
  persists across reloads: existing intended behaviour, and reversing it is its own
  decision. Compare already met its bullet (two programmes, seven consistent
  fields) so nothing was rebuilt there, but its training-focus bars stated no
  values and carried no accessible name — the only chart in the comparison, and
  unreadable. Both values now printed, each row summarised, and the compare modal
  has browser coverage for the first time.

- **2026-08-07 — The two-workouts-in-one-day fix was INCOMPLETE, and a second
  defect was hiding behind it.** Reported back from real use: "I completed two
  sessions yesterday and the In Focus tile is showing only 17 sets when it should
  be over 30 … the app is saying I've only completed 4 of 5 workouts this week
  when in fact I've done 5." Both true. Two separate causes.
  - **A — the dedup discarded a whole session before any merging could run.**
    `indexSlotsByDate`'s identity was
    `slot.sessionId ? candidate.sessionId === slot.sessionId : !candidate.sessionId`.
    Only ONE-OFF sessions carry a session id, so every PROGRAMMED slot on a date
    formed one "duplicate family": completing Monday's Push (17 sets) and
    Tuesday's Pull (16) on the same day made the smaller a duplicate of the
    larger and threw it away. Reproduced exactly — **17 sets for a 33-set day.**
    The identity now includes the program day: two different program days are
    different sessions and can never be duplicates, while the collision the
    dedup actually exists for — the SAME program day under two week keys, from a
    cloud copy or a re-activation that reused week numbers — still collapses to
    one. A test asserts that duplicate does not become 10 sets.
  - **Why the first fix missed it, plainly:** the earlier fixture gave its second
    session a `sessionId`, which took the other branch of that very condition. It
    passed while the reported case failed. The merge work was real and necessary,
    but the test was not representative of two programmed workouts.
  - **B — Consistency counted dates and labelled them sessions.** Separate bug,
    separate file. `consistencyDomain` compared `trainedDaysIn` (distinct
    calendar dates) against `plannedTrainingDays` under the unit "of N planned",
    so five sessions across four days read **"4 of 5 planned"**. It now counts
    SESSIONS via `loggedSessionsByDate` (dedup-aware, one source shared with In
    Focus), and the trend beside it still counts training days and says so on its
    own label. Five sessions across four days now read "5 of 5 planned" with the
    trend point still 4 — both true, each labelled.
  - `tests/week_chart_model.test.js` +3, `tests/progress_landing.test.js` +3.
    Verified: 1,727 unit tests, typecheck, smoke, precache, workflow gates, and
    the plan-recommendations / progress-hub / home-attribution / home-today /
    strength-volume / gym-performance / run-performance / volume-guide /
    core-ergonomics browser checks.

- **2026-08-07 — Bug from real use: "the In Focus tiles do not handle 2 workouts
  in one day properly." They did not, and it was losing data, not just
  mis-drawing.**
  - `collectCalendarWeek` merged a calendar day's `lifts` across stored slots but
    **assigned** `runs[day]` and `gymStats[day]`. Several slots can own one date —
    a programmed workout plus a one-off later that day, or a tracked run plus an
    imported one — so the last slot won and everything the earlier session
    recorded was discarded. Measured before changing anything:

    | Metric | Two sessions | Was | Now |
    | --- | --- | --- | --- |
    | Strength sets | 2 + 3 | 5 ✓ | 5 |
    | Strength volume | 800 + 600 | 1400 ✓ | 1400 |
    | Strength Time | 45:00 + 20:00 | **20:00** | 65:00 |
    | Running distance | 5 + 10 km | **10 km** | 15 km |
    | Running time | 25:00 + 50:00 | **50:00** | 75:00 |

    Sets and volume being right is what made this look like a display quirk. A
    morning run simply vanished behind an evening one, in the day bar and in the
    week total.
  - Two runs stored inside ONE slot always worked (`runDaySummary` sums them), so
    the fix is scoped to assembly across slots, and a test keeps the
    single-slot case honest so nothing is now counted twice.
  - The merged run summary is recomputed by `runDaySummary` over the **combined**
    session list rather than by adding two summaries, so duration-weighted RPE and
    HR stay weighted. `mergeGymStats` merges each field by what it means:
    durations and calories add, peak HR takes the max, average HR is weighted by
    session duration, and `time` is written back in the storable `M:SS` shape
    (never a display string, which would parse as zero).
  - `activityCount` was hardcoded to `hasData ? 1 : 0`, so a day with two sessions
    always reported one. `collectCalendarWeek` now counts them while assembling —
    only it can see that two slots landed on one date — and the chart falls back
    to the old behaviour for a caller passing a raw `state.weeks[N]`.
  - `tests/week_chart_model.test.js` +6. Verified: 1,721 unit tests, typecheck,
    smoke, precache, workflow gates, and the home-today / home-attribution /
    strength-volume / progress-hub / gym-performance / run-performance browser
    checks — every surface that reads this assembly.

- **2026-08-07 — Phase 4A continued: Plans leads with the plan you are actually
  in, and a red `main` was diagnosed.**
  - **The leading card described a template, not a training week.** The Plans
    banner read `program.days` and nothing else, so it advertised "Today: Push A"
    over a finished session — verified by running the old helper against real
    state rather than by reading it. Home's Today card had been carefully built
    not to trust stale days; Plans then contradicted it on the same screen the
    athlete uses to decide. `js/programs/active-plan-banner.js` reads the same
    primitives in the same precedence order, so the disagreement is now
    structurally impossible, and a test asserts the two states track each other.
  - **Two defects the rewrite exposed.** "Continue" was a bare tab switch, so it
    opened the cockpit on whatever day was last selected there — the exact
    stale-day class Phase 1B fixed on Home. And the forward scan for "next
    session" wrapped past Sunday, so on a Saturday an unlogged Monday from the
    SAME program week was presented as upcoming. The wrap was caught by a test
    failing, not by review.
  - **One number, once.** The plan percentage appeared three times on one card
    and moves only when the program week does. Stated once now, with its basis on
    the ring's (previously absent) accessible label, beside the count that does
    move — sessions done this week. The card also became keyboard-operable and its
    action grew from 31px to the app's own 44px target.
  - **`todayProgramDay` had three inline implementations**, only one of them
    timezone-aware. It now lives with the other date primitives in `js/dates.js`;
    `today-card.js` and `app.js` consume it. `js/workout.js` still has its own
    copy — left alone deliberately, it belongs with the cockpit split.
  - **`main` was red, and not because of the app.** Both *Deploy Pages* and
    *Release (AAB + APK)* failed on the PR #192 merge. One root cause, in the
    shared `verify / Web verification` job: `finish-review-browser-check.mjs`
    derived its workout day from the wall clock and `hybrid_engine` prescribes no
    lifts at the weekend, so at 16:33 UTC — already Saturday in the check's pinned
    Sydney timezone — it threw `no prescribed lift for sat`. The same commit had
    passed hours earlier. Fixed with a shared `pinClock` helper rather than by
    making the fixture cleverer; `jt-shed-simplified` has the same fragility
    hiding behind a silent skip and is recorded above, not fixed here.
  - Verified: 1,715 unit tests (+12), typecheck, smoke, precache regenerated,
    workflow gates, and the full 30-check browser suite including the new
    `plans-active-banner-browser-check.mjs`.

- **2026-08-07 — Bug from real use: "if I'm doing tricep pushdowns with bands
  why does bodyweight come into it".** Reported as a band-weight bug (light 10 /
  medium 20 / heavy 30). Those values were already correct everywhere — defaults,
  the v5 migration that force-canonicalises every account, and a validator that
  throws otherwise — so nothing was changed there. The follow-up question found
  the actual defect.
  - **A band does two opposite jobs and only one was implemented.** On a pull-up
    a band ASSISTS: load = bodyweight − band. On a pushdown the band IS the
    load. Every banded set went through `applyBandAssistance`, so a
    `Band Triceps Pushdown` with a Medium (20 kg) band on an 80 kg athlete
    logged **60 kg and 720 volume credits** instead of 20 kg and 240 — body mass
    leaking into an exercise that never lifts it, at roughly triple the volume.
    Reachable with real catalogue exercises (`Band Triceps Pushdown`,
    `Band Leg Curl` in JT Shed).
  - `bandRole(exerciseName)` decides from the existing `isBodyweightExercise`
    predicate, and `applyBandLoad` is now the single entry point the cockpit
    uses — picking assistance vs resistance is a property of the exercise, not
    something a caller should have to remember. New `loadMode: 'banded'`.
  - **History is re-read, never rewritten.** Sets logged before the fix keep the
    exact `w` they were logged with; `resolvedLoadMode` just stops calling a
    banded pushdown "assisted". Retroactively rewriting logged loads would be a
    data-loss change and is deliberately NOT done — past volume for band
    accessories stays as recorded. A corrective migration would need its own
    decision and a backup.
  - **Both adjacent findings fixed in the follow-up commit.**
    - **The band weights are visible again.** The settings block was
      `display:none` ("retired as a power-user knob"), so an athlete could
      neither verify L=10/M=20/H=30 nor correct them if their bands differ —
      almost certainly why this was reported as a band-weight bug. Restored with
      a hint explaining that the value is the load on band work and the
      assistance on pull-ups. Settings number inputs also rendered at 36px and
      now meet the 44px target.
    - **Nothing invents a body weight any more.** `_currentBodyweight` returned
      a hardcoded 75 kg, which then became the LOGGED load on every bodyweight
      and band-assisted set and flowed into volume, PRs and the Hybrid Score as
      if measured; `buildSetRow` printed it in the weight field as the
      athlete's own. It now returns null, and the athlete is asked once at the
      moment the number is needed (`numberPromptModal`, stored to
      `defaultBodyWeight` + today's `bodyWeightLog` entry, exactly as the
      profile does). A dismissed prompt cancels the change rather than logging a
      zero, and a band RESISTANCE set never triggers it — it never needed body
      mass.
    - `core-ergonomics-check` had been passing *because of* the fabrication: its
      fixture carried no body weight and relied on the 75 kg stand-in. It now
      supplies a real one.
  - `tests/workout_load_mode.test.js` +15 (23 total), including that changing
    bodyweight cannot move a pushdown's load by a kilo, that every non-weight
    body weight is treated as unknown, and that the set row never prints a body
    weight the athlete never gave. `workout_logging` gained the banded-accessory
    case and awaits the now-async load-mode entry points. Verified: 1703 unit
    tests, typecheck, smoke, precache, workflow gates, and the core-ergonomics /
    set-row / session-outline / finish-review / modal-accessibility browser
    checks.

- **2026-08-07 — Phase 4A opened: recommendations that are actually
  recommendations.**
  - **The row was a popularity chart wearing a personalisation label.**
    `scoreForUser` scored on popularity, completionRate, rating, `featured` and
    `author.type` — every one a catalogue constant, identical for all athletes —
    plus the active program id and a beginner boost for new accounts. It never
    read `fitnessGoal`, `fitnessLevel`, `equipmentTier`, `equipment` or
    `weightGoal`, all of which onboarding collects and stores. Proven before
    changing anything: a dedicated advanced runner with no equipment and a
    beginner with a full gym got **byte-identical** suggestions, under the
    heading "Recommended For You · Based on your training".
  - **The reasons were badges.** "Staff Pick" and "openHybrid Certified" describe the
    programme, not the fit; the fallback was a spec ("4 days/week · 12 weeks").
    Neither answers "why am I being shown this?".
  - `js/programs/recommendation-fit.js` scores goal, experience level,
    equipment (reusing `compare.js`'s `equipmentFit` rather than a second
    matcher), weight goal, and **actual recent training frequency** — the part
    that earns the words "based on your training". Editorial signal is kept as a
    small tiebreaker held OUT of the personal score, so it can order two equal
    fits but can never promote an unfitting programme, and it never appears as a
    reason.
  - **No reason, no recommendation.** `eligible` requires at least one true
    personal reason; `getRecommendations` returns nothing for an athlete who has
    told the app nothing, and the row simply does not render. An empty row is
    honest; an invented one is not.
  - **Mismatches are stated, not buried.** Missing equipment is named
    ("Needs barbell, rack"), and the easier-than-you penalty SCALES with the
    gap — one rung down is a legitimate lighter option, but Couch to 5K was
    still ranking second for an advanced runner until it did.
  - **`renderProgramCard`'s third parameter was dead.** It took `showBadge` and
    never read it, so the recommendations row passed `true` and rendered
    nothing — the reasons existed and were dropped on the floor. It now takes
    the reason string and renders it.
  - **The headline reason is chosen across the row, not per card**
    (`distinguishingReasons`): taking `reasons[0]` gave all five cards the same
    line. Where every programme genuinely matches on every known axis they still
    share one — that is the honest answer, and the card's existing meta line
    differentiates on duration and days/week.
  - **Corrected a false premise this roadmap had repeated twice:** the Plans
    landing was said to render "25 of 58 programmes, so a new programme is
    findable only by search". Measured against the real catalogue, the category
    chips reach **58 of 58**. Discovery needed better leading, not rescuing.
  - **Second slice — the row states its basis.** "Ask only for missing
    information" proved unreachable: `settings` seeds hybrid/intermediate/gym,
    and `shouldShowOnboarding` auto-completes onboarding for anyone with stored
    data without asking a single question. So nothing is ever missing, and an
    upgrading athlete is told the row was built on *their* goal when it was
    built on three assumptions — nothing in state tells the two apart. An inline
    "what's missing?" prompt was built, proven dead by driving it, and replaced
    with a collapsed basis strip that names the values used and corrects them in
    one tap, writing the same settings fields the Settings screen owns.
  - **Also confirmed already done:** "lead with the active plan, current week,
    next session, and progress" — `renderActiveProgramBanner` renders above the
    tabs with programme name, Week N of M, the next session and a progress ring.
    No change needed.
  - `tests/recommendation_fit.test.js` (28) and
    `scripts/plan-recommendations-browser-check.mjs`, which drives the real
    Discover surface for two different athletes and asserts they are shown
    different programmes with visible, non-badge reasons. Verified: 1683 unit
    tests, typecheck, smoke, precache, workflow gates, and the five existing
    programme browser checks. Second slice verified at 1687 tests.

- **2026-08-07 — Phase 2C finished, and with it Phase 2: the states that are
  not the run.** `js/gps/run-notices.js` is the copy model, built on one rule —
  a toast is for something that HAPPENED and is over; every state here is a
  CONDITION still true after the message fades. A denied permission does not
  un-deny itself, and an athlete who looks down mid-warm-up has already missed
  the toast.
  - **A blank screen on a denied permission.** Reproduced before fixing: Home
    Quick Start → Run with location denied opened a full-screen Activity view
    containing nothing but "← CANCEL / Run". The web error path called
    `showPanel('start')` and the Quick Activity scope has no start panel, so
    there was literally nothing to show. `startTracking` now returns
    `{ ok, reason }` — it returned a bare boolean that BOTH callers ignored —
    and the notice is that screen's content, with a Try again that repeats the
    same activity (a blocked walk must not come back as a run).
  - **Three failures had become one message.** `locationErrorNotice` separates
    the `GeolocationPositionError` codes again: only the athlete can lift a
    denied permission (so it names settings), and only the sky fixes a lost fix
    (so it offers manual entry instead).
  - **Background tracking is stated, not discovered.** The web build genuinely
    stops when the app leaves the foreground; it now says so before the phone
    goes in a pocket. Android says it keeps recording. An unknown platform
    defaults to the weaker claim rather than promising background recording it
    may not have.
  - **A recovered run says whether anything is MISSING** — native's `restored`
    flag means it fell back to the last durably-journalled point, and that is
    the fact an athlete needs when the run disagrees with their watch. Rendered
    through `showInfoNotice`, which deliberately does NOT call `showPanel`: a
    recovered session is still live and must not be sent back to the start panel.
  - **A mid-run dropout no longer risks the run.** `onPositionError` while
    tracking now returns after refreshing the signal chip. The recorded distance
    is real work; the chip already reports the dropout on its own.
  - **Partial saves name what survived.** "Saved without its map" instead of a
    vanished toast, and a run that never had a route is not reported as having
    lost one. An unsaved run on Android says the run is *not lost* — the journal
    still holds it, which is the only distinction that matters there.
  - `tests/run_notices.test.js` (20) + 6 more surface-wiring tests, and the
    browser check gained the denied-permission and mid-run-dropout scenarios —
    the blank screen is now one assertion ("the screen must say more than its
    chrome"). Verified: 1659 unit tests, typecheck, smoke, precache, workflow
    gates, active-run browser check.

- **2026-08-07 — Phase 2C: the live run becomes its own session surface.**
  - **The tracker was the one surface still showing raw kilometres.** Everything
    else in the app converts km to the configured unit at the display boundary;
    `tickStats` wrote `_distKm.toFixed(2)` under a hardcoded `DIST (KM)` label.
    Worse, `stopTracking` DOES convert when it fills the cockpit input — so a
    miles athlete watched one number for the whole run and saw a different one
    the instant they finished. `js/gps/active-run-display.js` is now the shared
    model for both surfaces (cockpit + Quick Activity), and the browser check
    asserts the live figure and the value Stop writes are the same string.
  - **"Is it tracking me right now?" had no answer on screen.**
    `summarizeGpsQuality` grades a FINISHED run; mid-run the athlete needs the
    current state. `gpsSignalPresentation` grades the LAST ACCEPTED fix, so a
    run that was clean for twenty minutes and has had no fix for two reads as
    "No signal", not "strong". Accuracy tiers moved to an exported
    `GPS_ACCURACY_TIERS` in `route-quality.js` so the live grade and the saved
    grade cannot drift apart. A paused run reports **paused**, never signal
    loss — fixes are deliberately not ingested while paused, so the growing
    staleness there is the app working correctly.
  - **Focus mode.** While a session is live the cockpit run card hides setup,
    manual entry, notes and the watch import (`run-session-active`). CSS, not
    removal: `stopTracking` fills those inputs, so they come back holding the
    run for review.
  - **A live run could be collapsed out of view by an unrelated re-render.**
    `.run-collapsed` hides `.run-body-content` wholesale, and `renderWorkout`
    applies it on any day with no scheduled run — exactly the case when an
    unscheduled run is being tracked. The reorder is skipped while live for the
    same reason: moving the node detaches the live Leaflet map.
  - **Found by driving it, not reading it:** Pause and Finish rendered at 38px,
    under the app's own 44px touch target — the two controls a run is steered
    with, out of breath. Also removed a `qsStartPanel` scope entry pointing at
    an element that has never existed in the markup.
  - `scripts/active-run-browser-check.mjs` (registered in the runner) drives a
    real GPS session with injected fixes — exact accuracy and spacing, because
    the tiers being asserted are accuracy thresholds. Plus
    `tests/active_run_display.test.js` (17) and `tests/active_run_surface.test.js`
    (7). Verified: 1632 unit tests, typecheck, smoke, workflow gates, precache
    regenerated, and the active-run browser check green.
  - **Container note:** `node_modules` was absent, which is why
    `tests/route_db_migration.test.js` was recorded as a "pre-existing failure"
    yesterday and why all 27 browser checks were silently skipping. `npm
    install` fixed both — the suite is 1632/1632 with no exclusions.
  - **Full browser suite: 27 of 28 pass.** `safe-area` and
    `program-preview-consistency` failed inside the 28-check serial run and both
    pass in isolation — contention flakes, not regressions.
    `running-analytics-check` misses a 5s budget at ~15.2s — but only in the
    container: it reproduced identically on the parent commit AND passes on CI,
    which runs the full browser suite as a required step. Not an app regression
    and not a broken gate; the container is ~3× slower than the budget assumes.
    Recorded under §7 so the next session does not re-raise it.

- **2026-08-07 — Bug: a deleted set came back, and the review kept calling the
  session incomplete.** Reported from real use ("if I delete a set when I'm
  doing a workout, it keeps coming back saying it's not complete"). Both halves
  reproduced against the real modules before any fix.
  - **The row came back.** `verifyWeekStorageSchema` re-materialises the
    prescribed row count into every day of the current week, and it runs
    constantly — boot, week nav, run logging, GPS finish.
    `reconcilePrescribedSets` never REMOVES a touched row but does PAD a short
    array back up to the prescription, so deleting the 4th set of a 4×5 mid-
    session put a blank row back moments later. Removing an exercise's last set
    — the only way to drop an exercise from today — resurrected the whole
    exercise the same way.
  - **The missing fact was intent.** A short array can mean "not materialised
    yet" (pad it) or "the athlete removed that set" (leave it), and nothing
    recorded which. `js/workout/set-plan.js` is that record: deleting a row
    stamps the athlete's own working-set count into
    `liftMeta[day][lift].plannedSets`. Per week+day (as liftMeta is), working
    sets only, and 0 is a real value meaning "removed from this session" — it
    is what keeps the exercise gone.
  - **The review counted the set anyway.** `evaluateSessionCompletion` took its
    denominator straight from the plan, so even with the row gone it read
    "3 of 4 planned sets" for a session finished exactly as intended.
    `plannedWorkingSets` now returns `prescribed` AND `session`: completion is
    judged against the session, `modified` still against the plan — removing a
    set is precisely the deviation that flag exists to record. The cockpit's
    "Target: N × R" label reads the same session plan, so it cannot promise a
    set the session no longer has.
  - **Deliberate rebuilds hand the count back**: `reseedActiveProgramIntoWeek`
    clears the stamp for any lift it re-prescribes, and
    `reconcileActiveProgramEdits` clears the day it rebuilds wholesale.
  - **Undo restores the stamp too**, not just the row — otherwise undoing a
    deletion would leave the session's set count frozen at the reduced number.
    The removal/restore pair is pure (`applySetRemoval`/`restoreSetRemoval`) so
    the cockpit's ✕ is a thin wrapper and the data contract is DOM-free
    testable, matching `applyExerciseSwap`.
  - `tests/workout_set_plan.test.js` (14), including the regression that an
    untouched short day is STILL padded — the repair path this fix must not
    disable. Verified: 1598 unit tests, typecheck, smoke, precache regenerated.
    (`tests/route_db_migration.test.js` fails in this container for want of the
    `fake-indexeddb` dev dependency — pre-existing, unrelated.)

- **2026-08-06 — Phase 2B complete: finishing a workout is a review, not a form.**
  Finished the four remaining bullets after the notable-progress slice below.
  - **A form became a review.** Duration stays visible; gym effort, run effort
    and notes moved behind one optional disclosure. It **auto-opens when any of
    them already holds a value** — a collapsed field containing real data reads
    as "not recorded", which is worse than showing it. Finish is the one filled
    button, Keep Training is quiet, and Discard sits below a divider so it
    cannot be hit while reaching for Keep Training.
  - **Notes are remembered where they were entered.** The sheet reads and writes
    `week.notes[day]` — the SAME store the cockpit's notes field uses — rather
    than being a second place to type. Whichever surface the athlete used, the
    other shows what they already wrote.
  - **Low adherence now explains itself.** `completionPresentation` returned one
    generic body for every finishable session, so a session that completed
    everything was still warned that unfinished work "will be treated as
    skipped". A warning that fires every time is one nobody reads when it
    finally matters. Adherence selects the explanation (complete /
    strength-complete / run-complete / partial) and never the availability of
    Finish. Two existing assertions pinned the old wording and were changed
    deliberately and annotated.
  - **The discard confirmation was wrong, not just vague.** It said "Clear
    today's log?" whatever day was selected — at the one moment a destructive
    confirmation must be exact. It now names the workout ("Discard Friday's
    Pull B + Easy Run workout?") and states what is and is not affected.
    "Clear" is reserved by the shared vocabulary precisely because it states no
    scope.
  - **And it is now reversible.** `snapshotDayWorkoutData` /
    `restoreDayWorkoutData` live beside the clear in `delete-day.js`, so a field
    cannot be cleared without also being captured — a field cleared but not
    snapshotted would be silently unrecoverable, the worst way for an Undo to
    fail because it looks like it worked. The stored GPS route is deferred to
    the undo window's `finalize`: deleting it immediately would let Undo restore
    a run whose route had already been destroyed.
  - **Extracted `js/ui/undo-bar.js` while doing it.** Activities and the cockpit
    share one undo DOM element, so two independent implementations would not
    merely duplicate ~20 lines — they would race for the same timer and strand
    each other's `finalize()`, orphaning a route in IndexedDB. One owner;
    `finalize` runs exactly once (on timeout, on displacement, never after an
    undo). Each caller owns its own post-undo message, so a restored workout
    does not announce "Activity restored".
  - **A finished workout no longer dead-ends** on "Done": the recap links to the
    exact record in history and to Progress, closing the recap first because it
    is a full-screen surface.
  - `tests/discard_undo.test.js` (11) and the completion-policy additions, plus
    `scripts/finish-review-browser-check.mjs`, which drives the real cockpit
    through finish → discard → undo and asserts the restored loads and notes.
    Proven non-vacuous by restoring the old "Clear today's log?" copy and
    confirming exit 1.
  - **Found by driving it:** the undo-bar module touched `document` at import,
    which made the finalize-exactly-once contract untestable outside a browser —
    exactly the contract where a mistake orphans a route. Now DOM-guarded.
  - Verified: 1594 unit tests, typecheck, precache, workflow gates, smoke and
    the browser suite.

- **2026-08-06 — Finish review: notable progress (Phase 2B) + agent-brief and
  tooling cleanup.**
  - **The finish sheet could not have shown an achievement.** It rendered Total
    Volume and Sets Completed and asked for duration and two RPEs — two numbers
    and three inputs, which reads as a form. And `updateExercisePRs()` runs
    inside the finish HANDLER, after the sheet is populated and as it closes, so
    the one moment the athlete is looking at the screen and cares most was the
    one moment the app had nothing to say.
  - `js/workout/session-review.js` is a pure model computing the session's
    completed work and any lift that beat its previous best. It reuses the
    canonical primitives rather than recomputing: `isValidWorkingSet` (warm-ups
    and zero-rep rows are not training), `estimatedE1rmForSet` (refuses
    bodyweight/assisted/band work instead of fabricating a load) and
    `isE1rmPr`/`E1RM_PR_EPSILON` (one shared 0.5 threshold; a first-ever log is
    a BASELINE, not a record). A "new best" the Strength screen did not also
    show would be worse than showing nothing.
  - The previous best is scoped ALL and spans archived `arch:` runs on purpose:
    a personal best is a fact about the athlete, not the program, so switching
    programs must not hand out fresh records for lifts already beaten.
  - **Hidden entirely when nothing was beaten.** Most good sessions are not PR
    sessions; praise on every finish is a line nobody reads. Verified in the
    real cockpit both ways — a PR session renders "Barbell Bent-Over Row 122.5
    kg est. 1RM · +5.8", a normal session renders nothing at all.
  - Labelled as an estimate at the point of display ("Estimated from your best
    set — not a tested max"), per the cross-cutting rule.
  - **Still outstanding in 2B:** duration and the two RPE inputs still read as a
    form; discard scope wording; the completed-state links.
  - **Cleanup bundle, committed separately.** (1) CLAUDE.md and AGENTS.md are
    the same brief for two tools and had drifted — CLAUDE.md still named the
    PARKED Play-Store goal as active and denied the exercise alias layer that
    exists. Both auto-load at session start, so an agent reading the stale copy
    began from wrong facts. Kept as two full copies (a pointer would leave an
    agent with no brief if unexpanded) and pinned identical below the title by
    `tests/agent_brief_sync.test.js`. (2) `run-browser-checks.mjs` exited on the
    first failure, so one environment-sensitive check hid the ~14 behind it; it
    now runs everything and fails at the end, with `--bail` for the old loop and
    counts that describe what actually ran. (3) Roadmap §11 listed Phase 3B as
    ACTIVE two days after it shipped.
  - Verified: 1582 unit tests, typecheck, precache, workflow gates, smoke, and
    the cockpit browser checks.

- **2026-08-06 — FIT import: real dates and duplicate detection.** Two defects
  found in the repository audit. Neither had a roadmap entry, and both quietly
  corrupted the date-strict analytics the app has invested most heavily in.
  - **The importer never read the activity's start time.** `extractSessionStats`
    mapped distance, duration, HR, elevation, cadence, training effect, zones and
    laps — but not `start_time` or `timestamp`. The handler then stamped the run
    with `weeks[currentWeek].dates[selectedDay] || today`, i.e. whichever day the
    cockpit happened to be showing. Import last Tuesday's run today and it was
    logged as today, and since every weekly aggregate, streak, calendar week and
    load model attributes by the stamped date, all of them followed it.
  - **Nothing identified an activity**, so every import minted a fresh
    `newRunSessionId()` and appended. Re-importing the same file created a second
    identical run, double-counting distance and load in every total built on it.
  - Fixed by reading the activity's own start: `sessionStartTs` prefers
    `start_time` and falls back to the session `timestamp` **minus the duration**,
    because FIT writes `timestamp` at the END of a session — using it raw would
    push a late-evening run into the next day. Implausible values (pre-2000, more
    than two days ahead) are refused rather than dating an import to 1989.
  - The stored date needed no relocation work: `running-detail.js` and
    `activities/model.js` already resolve `run.localDate || week.dates[day]`, so
    stamping the session's own `localDate` is sufficient and nothing has to move
    between week/day slots — which also means an import can never re-date the
    strength work sharing that slot.
  - Dedup keys on the activity start timestamp (two activities cannot begin in
    the same millisecond), scoped to `source: 'fit'` so a live-tracked GPS run
    can never block a file import. It scans **archived `arch:<id>:<n>` weeks
    too** — a program switch moves weeks there, and without that a switch would
    silently re-enable duplicate imports of everything already logged. Proven by
    planting the naive numeric-keys-only version and watching the test fail.
  - A refused re-import is **not** reported as a failure. `extractData` gained a
    `{ handled: true }` return so the destination's specific message ("Already
    imported — logged on 2026-07-14") is not overwritten by a generic "Import
    failed", which would have been both wrong and alarming.
  - The gym import got the same date correction, but no dedup: it writes into a
    slot-scoped `gymStats[day]` object that overwrites rather than appending, so
    it never had the duplication defect.
  - **Deliberately NOT done:** no fuzzy matching between a live-tracked run and a
    later file import of the same session. That is a genuinely different and
    much less certain problem, and a false positive there would refuse a real
    import.
  - `tests/fit_import_identity.test.js` (15 tests) covers extraction from Date /
    ISO / epoch inputs, end-timestamp fallback, implausible-value rejection,
    duplicate detection across archived weeks, source scoping, malformed state,
    and all three destination outcomes.
  - Verified: 1562 unit tests, typecheck, precache, workflow gates, smoke.

- **2026-08-06 — Added Shed PPLUL (Push/Pull/Legs/Upper/Lower).** A 12-week,
  five-day intermediate program authored by the owner.
  - **Why it needed more than a catalog entry.** A program is a one-week
    `days{}` template plus `weeklyVolModifiers`, and `getWeekModifier` returns
    ONE modifier per week shared by every day. This program runs two main-lift
    progressions simultaneously — bench/squat/press on 4×8→4×6→5×4 and the
    deadlift on 3×6→3×5→4×3 — which one shared modifier cannot express.
  - Resolved with `js/programs/shed-pplul-model.js` + `progressionModel:
    'shed-pplul'`, consulted by `liftTarget` (`js/engine.js`) through the same
    declarative hook Jacked & Tan already uses. Four added lines in the engine,
    gated on a field no other program sets; a test asserts every other catalog
    program is refused by the new resolver.
  - **Not shared with J&T, deliberately.** The Simplified table is close but
    wrong here: its deadlift is 2×6 in week 4 and 3×4 in weeks 5–7 where this
    spec calls for 2×5 and 3×5, its week 12 is a single set rather than an
    assessment plus two back-offs, and it anchors main lifts on mon/tue/thu/fri
    rather than mon/wed/fri/sat. Sharing one table would also have meant a
    future edit to either program silently changing the other.
  - **No stored-shape change.** `day.lifts` stay bare strings and nothing
    per-set is persisted, so this adds no migration, sync or export surface. The
    Phase 4C ADR gate concerns *normalised per-lift prescription data*, which is
    untouched — this is a pure read-time resolver.
  - `days` and `dayExercises` are BUILT from one `DAY_PLAN` in the model, so the
    Structure preview, day-preview sheet and cockpit cannot drift apart. Verified
    in a real browser: the week-1 detail view renders 4×8 for the primaries and
    3×6 for the deadlift, both resolved through `liftTarget` — the same call the
    logger makes.
  - Accessories hold their rep range across the block (double progression adds
    reps, then load) and halve their sets only in weeks 4 and 8. Week 12 keeps
    accessories at full volume, which differs from the J&T table on purpose.
  - Added one exercise the catalogue lacked, `Band Kneeling Crunch`. The other
    28 already resolved — `Dumbbell Farmer Carry` and `Dumbbell Reverse Lunge`
    via existing aliases/canonical names.
  - ~~**Observation, not a defect:** the Plans landing renders 25 of the now 58
    programs, so a new entry is reachable via search but not by browsing.~~
    **Wrong — corrected 2026-08-07.** Measured: the category chips reach 58 of
    58. A new programme is reachable by browsing, not only by search.
  - `tests/shed_pplul_program.test.js` (20 tests) pins both progression tables
    week by week, the divergence between them in all 12 weeks, deload accessory
    scaling, per-day prescriptions for a lift appearing on two days (Pull-Up,
    EZ-Bar Curl), and that an unauthored lift falls through instead of
    inheriting a main-lift prescription.
  - Verified: 1547 unit tests, typecheck, precache, workflow gates, smoke, and
    8 browser checks including preview/logger parity and the J&T check.

- **2026-08-06 — Safe-area system + content-hashed cache name.** Two coupled
  defects found by a full-repository audit. Neither was a new regression; both
  had been shipping for months, and each was hiding the other.
  - **The status-bar bug was diagnosed correctly a year ago and fixed on ONE
    element.** `--app-safe-top` (published by `MainActivity` from the real
    window insets) existed precisely because Android only reports
    `env(safe-area-inset-top)` for a DISPLAY CUTOUT — on a notchless phone
    `env()` is 0px, so `env()` alone silently does nothing. That mechanism was
    wired to `.settings-header` and nowhere else. `.view-container` — the
    wrapper for Home, Train, Progress, Plans and Profile — consulted `env()`
    only. Measured before the fix at 390×844 with a 48px inset published:
    `.settings-header` padding-top 20px → 68px, `.view-container` 20px → **20px**,
    and the first control on Home stuck at y=26px.
  - **The occluded control was the avatar button** — `aria-label="Open your
    profile"`, the only route to Profile and Settings. So the one screen whose
    header had been fixed had become the one screen you could not reach. That is
    the detail that turned this from a polish item into the audit's P1.
  - Fixed as `--safe-top` / `--safe-bottom` tokens beside `--touch-target`,
    consumed by `.view-container`, `.modal-overlay`, `.ob-step` (first run),
    `.migration-recovery` (the route out of a failed
    migration), `.week-nav-bar`, and bottom clearance on `.bottom-sheet`,
    `.profile-customiser-sheet` and `.fasting-sheet`. Every site keeps its
    pre-token declaration FIRST as a fallback, so an engine that cannot resolve
    the token keeps today's clearance rather than collapsing to none.
    `.sheet-backdrop`, `.fasting-sheet-backdrop` and `.settings-overlay` were
    deliberately NOT padded: they render no content, so the content surfaces
    behind them are what had to change.
  - **Why no test ever caught it:** every browser check runs desktop Chromium,
    where BOTH inset sources are 0px, so the entire defect class was
    structurally invisible. `scripts/safe-area-browser-check.mjs` is the first
    check to publish a non-zero inset. It asserts nothing interactive lands
    above the inset across Home/Train/Progress/Plans/Profile, onboarding and
    migration-recovery at 320/360/390/412px in both themes, AND that the
    zero-inset case is unchanged so the tokens can never quietly reflow desktop.
    Proven non-vacuous by deleting the `.view-container` line and confirming
    exit 1 on all four widths.
  - **The second defect is why the first one may never have reached you.**
    Non-JS assets are cache-first and a browser only reinstalls a service worker
    whose BYTES changed, so a commit touching only CSS left `sw.js` identical:
    no reinstall, no re-`addAll`, and installed clients kept serving the old
    stylesheet indefinitely while network-first JS moved on. **Ten of the last
    twenty-three CSS/HTML commits shipped that way — including both Android
    status-bar fixes (`57d2b1e`, `7728951`).** `CACHE_NAME` now carries a
    12-hex content hash generated by `gen-precache.mjs`; `precache:check` fails
    when it is stale. This also explains the long-standing impression that the
    APK is more reliable than the PWA: the APK re-copies its bundled assets on
    every build and never consults the service-worker cache.
  - **A mistake worth recording:** while proving the cache guard bites I
    appended a probe line to `css/styles.css` and reverted it with
    `git checkout css/styles.css` — which discarded every uncommitted safe-area
    edit in that file along with the probe. Caught immediately by `git status`
    and reapplied. Subsequent revert-and-restore cycles used a file copy, not
    git. The guard itself worked correctly both times.
  - `tests/settings_safe_area_guard.test.js` → `tests/safe_area_guard.test.js`,
    widened from one element to the token contract, every consuming surface, the
    dvh caps, the native half, and a check that the browser check stays
    registered. Also added `dvh` fallbacks to `.program-workout-picker` and
    `.profile-customiser-sheet`, which had kept `vh`-only caps the
    `.bottom-sheet` comment already explains are wrong on Android.
  - Verified: 1527 unit tests, typecheck, precache, workflow gates, smoke, and
    24 browser checks (every check except `running-analytics-check.mjs`, which
    fails locally on a hardware-dependent performance threshold — 15.3s vs
    ~2.2s in CI — and was deliberately not weakened).
  - **Deliberately NOT done:** no `--app-safe-bottom` publisher in
    `MainActivity` (the CSS consumes it, but nothing reports it yet, so bottom
    clearance still comes from `env()`); no landscape or keyboard-open coverage
    in the safe-area check; no visual/spacing changes of any kind.

- **2026-08-05 — Estimated 1RM audit + correctness fixes.** Traced e1RM end to
  end (set entry → live state → completion → storage → sync → history → PR
  detection → analytics → Hybrid Brain → UI) before changing anything.
  - **Good news first, because it shaped the fix:** there is exactly ONE formula
    and one implementation (`js/strength/e1rm.js`, Epley, capped at 12 reps).
    Eleven modules import it; none reimplement it (`engine.epley1RM` is a thin
    alias). Set eligibility, exercise identity, same-date dedup, program-run
    archiving and prescription-vs-performance separation were all already sound.
    So this is a set of targeted corrections, not a rebuild — and **Epley is
    kept**, because swapping formulas would rewrite every historical chart and PR
    for a metric that is directional by design.
  - **D1 (high) — `exerciseStats.allTimeMax` only ever ROSE.** Documented as
    deliberate, but it made the field permanently wrong the first time anyone
    mistyped a load. Logging 500 for 50 and correcting it immediately pinned the
    baseline at 583 kg; deleting the workout did not help. The field is persisted
    AND synced, so the bad number followed the athlete to every device, and the
    cockpit's PR gate reads it — so no genuine PR for that lift could fire again.
    Now DERIVED from the logged sets on every call, and rebuilt on state load so
    a deletion propagates without waiting for the next logged set.
    A **legacy floor** (`legacyMax`) preserves any pre-existing max the stored
    sets cannot account for — real history for anyone whose early sessions
    predate reliable set storage — gated on an explicit `derived: true` marker.
    My first attempt inferred legacy from "old value exceeds new", which cannot
    distinguish genuine legacy from a value derived moments ago whose set was
    then deleted: it laundered every typo straight back into a permanent floor.
    Two tests caught that before it shipped.
  - **D2 (medium) — a tested single was inflated 3.3%.** Epley's algebraic form
    gives w × 31/30 at one rep, so a 100 kg single reported as 103.3 kg. The
    app's most reliable data point was its most distorted, and an actual max
    could never report as the weight actually lifted. One rep now returns the
    load itself. Recalculated dynamically — nothing stored, nothing migrated;
    single-rep points on existing charts drop 3.3% and nothing else moves.
  - **D3 (medium) — five PR sites, four different rules.** Two counted an exact
    TIE as a record (so a lift matched every week reported a PR every week), two
    required +0.5, one +0.01. All now share `isE1rmPr` / `E1RM_PR_EPSILON`.
    0.5 is chosen as a meaningfulness threshold, not a float epsilon: the
    displayed value is rounded to whole units, so a difference too small to see
    must not fire a trophy.
  - **D4 (medium) — hardcoded `kg` on PR display.** The exercise-picker chips
    rendered "225kg PR" whatever the athlete's unit. The existing guard missed
    them twice over: it did not cover `js/workout.js`, AND its pattern required a
    SPACE before `kg` so the glued `}kg` form was invisible. Widening the pattern
    also exposed three more sites in `js/brain/hybrid-score/pillars.js` that were
    already in scope. Guard verified non-vacuous by planting an offender.
  - **Deliberately NOT done:** no persisted per-estimate metadata (formula,
    version, confidence, source-set IDs). Everything is deterministically
    recalculable from the sets, so storing it would add sync surface for no gain.
    Calculation versioning only earns its place if the formula changes again.
  - **Conventions now documented in tests:** `w` is the number the athlete typed
    and is never multiplied or divided, so dumbbell/unilateral loads mean
    whatever they mean to the athlete — and the logger, the estimate and the
    display all agree. Barbell and dumbbell variants keep separate identities.
    Bodyweight/assisted/band work is refused rather than fabricated.
  - **A false alarm worth recording:** mid-verification a logged set appeared to
    vanish on reload — apparent catastrophic data loss. It reproduced on
    unmodified `main`, then turned out to be my harness: Playwright's
    `addInitScript` re-runs on EVERY navigation, so the fixture re-seeded blank
    weeks on each reload. Real persistence is fine, confirmed with a seed-once
    fixture. Checked before reporting it.
  - `tests/e1rm_correctness.test.js` (39 tests) covers the brief's rep ranges,
    eligibility rules, identity, conventions, PR detection, edit/delete
    propagation, program-switch isolation, and empty/single/malformed history.
    One assertion in `tests/engine.test.js` was changed deliberately and
    annotated: it pinned `epley1RM(60, 1) === 62`, i.e. the D2 defect itself.

- **2026-08-05 — Rest timer pause + row action prominence (Phase 2A).**
  - **A control that looked real and did nothing.** The rest bar rendered a
    decorative `⏸ REST` label with no pause behind it, beside working −30s,
    +30s and Done buttons. That is worse than having no pause: you press it,
    nothing happens, and you stop trusting the whole bar. `toggleRestPause`
    makes the label the control it appeared to be. Rest is not always
    uninterrupted — a machine is taken, someone talks to you — and the only
    options before were to watch it run out or dismiss it and lose the
    prescription.
  - The state machine's real risk is leakage, so that is what the tests pin: a
    hold carried into the next set would mean that set's rest never counts down
    at all. Cleared on both `triggerRestTimerEngine` and `dismissRestTimer`.
    Adjusting while paused deliberately stays paused — ±30s corrects the
    prescription, it is not a request to start counting.
  - **Completion is now the strongest row action.** Quick-log and the tick both
    complete a set and quick-log was the loud one — a filled blue button next to
    a plain grey square. Reversed: quick-log is a quiet outline, the tick is
    drawn as primary even unticked. Targets stay 44px; this de-emphasises rather
    than shrinks, and the browser check asserts both halves.
  - **`+ Warmup` is contextual.** It steps aside once a working set is logged.
    The capability is not lost — any row can still be re-typed to a warm-up from
    its ⋯ menu.
  - **Ticking a set keeps opening the rest timer** rather than advancing focus.
    Settled and recorded rather than left implicit: rest is what actually
    happens next, the timer no longer takes the screen away now that it is
    attached to the card and pausable, and advancing focus would fight the
    auto-flow accordion that already moves on when an exercise finishes.
  - **Two mistakes worth recording.**
    1. I first made `+ Warmup` a template branch on a `hasLoggedWork` flag. It
       worked at render and was wrong from the first tick, because ticking
       updates the DOM *without* re-rendering the card — the third time this
       session that same path has caught a change. It is now one CSS-driven
       class kept current by `refreshContextualRowActions()`, beside
       `refreshSessionOutline()`.
    2. A backtick inside an HTML comment **inside a JS template literal** closed
       the string early and killed the whole exercise-card render. Unit tests
       and typecheck both passed; only the browser check saw it, and only after
       I fixed that check to print console errors before bailing out — it was
       reporting a dozen confusing assertion failures while swallowing the one
       line that explained them.
  - `tests/rest_timer_pause.test.js` (7 tests, verified non-vacuous by planting
    the pause-leak regression) and `scripts/rest-timer-browser-check.mjs`, which
    drives the real timer: pause it, prove the clock is frozen across 1.8s,
    resume it, prove it moves again.

- **2026-08-05 — Set row: previous values and inline validation (Phase 2A).**
  Two of the set-row contract's five requirements.
  - **A data-integrity defect, not a UX one.** Completing a set only ever asked
    "is this field non-empty?", so `-50` kg and `0` reps both logged. `setVolume`
    is `parseFloat(w) * parseInt(r)`, so a negative weight **subtracts** from
    tonnage, weekly volume, muscle set credits and every MV/MEV/MAV/MRV
    comparison built on them — one mistyped minus quietly corrupting the
    analytics the app exists to provide. A zero-rep set was worse in a different
    way: it read as done in the cockpit while `isValidWorkingSet` dropped it
    from analytics, so the screen and the numbers disagreed.
  - `js/workout/set-entry.js` (pure) draws the line deliberately asymmetrically.
    Impossible values are **errors** and block the tick; merely surprising ones
    (>100 reps, >1500 load) are **warnings** that inform and get out of the way.
    An athlete really can rep 120 bodyweight squats, and a logger that argues
    with them is a logger they stop using. The weight bound is set at the loose
    (lbs) end because the app never converts units — a missed warning costs far
    less than refusing a real lift.
  - Blank weight is exempt on **bodyweight/assisted** rows, which derive their
    load from body mass and band assistance. Where the load mode is unreadable
    it defaults to `weighted` — the strict mode — so the fallback can only
    over-require, never under-require.
  - **Previous values visible.** `buildSetRow` was already being *handed*
    `previousSetData` — real work at the call site, from
    `priorPerformance.workingSets` — and threw it away. Each row now shows a
    persistent `Last 62.5kg × 8`, which stays put while typing rather than
    living in a placeholder that clears on the first keystroke. No prior set
    renders nothing at all: `-- × --` reads as data that failed to load.
  - The message renders **on the row**, replacing the old toast — a toast
    appears away from the offending field and is gone before you look up.
  - **Found by driving it, not by a test:** clearing the error was wired to
    `change`, which only fires on blur, so the complaint sat there through the
    entire retype. Moved to an `input` listener that only *clears* — re-validating
    per keystroke would flag `-` and `1.` as the number is still being typed.
  - `tests/set_entry.test.js` (25 tests) and
    `scripts/set-row-browser-check.mjs`, which drives the real cockpit and
    asserts the refused set never reaches `localStorage` — the tick bouncing
    visually would be worth little if the value were stored anyway.
  - **Still outstanding in 2A:** completion as the strongest row action (the
    blue `Log Sn` quick-log button still competes with the checkbox), the
    tick-advances-focus vs opens-rest-timer question, and making
    add/swap/reorder/superset contextual rather than equally prominent.

- **2026-08-05 — Session outline (Phase 2A).** The cockpit already collapsed
  completed and inactive exercises, but answering "how much is left?" still
  meant scrolling the accordion and counting sets by eye. Added a compact index
  above the exercise list.
  - `js/workout/session-outline.js` is a pure model (`buildSessionOutline`,
    `outlineSummaryLine`) — no DOM, no state. Its counting rules are the
    logger's own: warm-ups are not working sets and `isCompletedSet` decides
    done, so the outline and the card below it can never disagree. 15 tests pin
    that, including the degenerate cases: an empty session and a
    warm-ups-only session are NOT "complete" — congratulating someone for an
    empty workout is the failure mode worth guarding.
  - The summary states remaining work, not a percentage. "3 sets left" is
    actionable; "62%" is not.
  - Tapping a row opens that exercise, reusing the accordion's existing
    single-open invariant rather than adding a second one.
  - **Bug the browser check found, not the unit tests:** ticking a set uses a
    DOM-only update path, so the outline went stale the moment anyone logged
    anything — a wrong index being worse than none. Fixed with
    `refreshSessionOutline()` called at the top of
    `evaluateAccordionAutoFlowTransitions()`, ahead of its early return.
  - `scripts/session-outline-browser-check.mjs` drives the real cockpit and
    asserts the outline mirrors the accordion exactly (same names, same order,
    same counts), updates after a logged set, and keeps 44px rows at 320/390/412px.
    Registered in `run-browser-checks.mjs`.
  - **Still outstanding in 2A:** the set-row interaction redesign itself, the
    tick-advances-focus vs opens-rest-timer question, and making
    add/swap/reorder/superset contextual rather than equally prominent.

- **2026-08-04 — Phase 3D completion + branch consolidation.** Folded the
  recovery-details and projection-confidence branches into one and finished the
  phase's remaining model work.
  **Calendar audit.** Swept every analytics module for program-week/calendar
  conflation. Clean where it matters: `running-detail`, `strength-detail` and
  `strength-volume-detail` have no genuine `state.currentWeek` reads. Extended
  `analytics_calendar_guard` from 4 modules to 9 and proved the extension bites
  by planting a violation.
  **Propagation.** `tests/analytics_propagation.test.js` mutates state IN PLACE
  — the same object identity the app mutates, so anything memoising on identity
  rather than content would return stale data — and asserts every model
  recomputes across delete, edit, re-date, run import, wellness import and
  coaching projections.
  **Steps** added to the recovery details, completing that 3D bullet.
  **Readiness components deliberately NOT done:** readiness is computed on
  demand with no persisted history, so a component detail would have no series.
  Adding one means persisting a readiness history — a data-model change with
  sync and migration consequences that does not belong in a presentation phase.
  Verified: 1431 unit tests, typecheck, precache, workflow gates, smoke, and
  every browser gate.

- **2026-08-04 — Recovery metric details (3D).** Recovery was the only domain
  with NO inspectable metrics: Running had 30 detail screens, Strength 3,
  Recovery zero — every recovery number was `static` or `domain-only` in the
  inventory, so the new Progress hub's Recovery card drilled into a screen
  where nothing could be examined.
  `js/analytics/recovery-detail.js` registers sleep, HRV, resting heart rate,
  soreness and mood with dated series, honest period comparisons, exact
  contributing readings and stated confidence; `views/view-recovery-metric.js`
  renders them on the shared Phase 3C contract footer rather than a fourth
  hand-rolled copy. Recovery Stats gained a "Recovery signals" card row so they
  are reachable.
  Two obligations unique to this domain, both enforced by tests AND a browser
  assertion in the same fixture: **lower is better** for resting HR and
  soreness (a fall reads green there and amber on sleep — tone comes from the
  metric, never the arrow), and **self-reported vs device-measured** readings
  state different confidence instead of being presented as equally objective.
  Missing days are skipped rather than counted as zero; future-dated and
  implausible readings are excluded and counted in the footer.
  Two further fixes found by looking at the rendered screen:
  1. `.metric-range` buttons had `min-height: 36px` — below the 44px target.
     That rule is SHARED, so every range selector in Running, Strength and
     Recovery details was undersized. Raised at source.
  2. The headline showed "55 bpm" while the sentence beneath said "54.6 bpm" —
     one number, two answers. The interpretation now quotes the same formatted
     value the headline renders.
  Verified: 1409 unit tests, typecheck, precache, workflow gates, smoke, and
  `scripts/recovery-metric-browser-check.mjs` across both themes at
  320/390/412px including an empty profile.
- **2026-08-04 — Projection confidence (3D).** Projections promised ETAs with
  no statement of how much data stood behind them. Worse, the trend maths made
  the LEAST trustworthy input the most optimistic: a noisy three-week series
  (100 → 150 → 110) produced "+5/week", a faster promise than a clean six-week
  100 → 110 progression at "+2/week", and both rendered identically.
  `trailingTrend` now also computes the fit (R²) alongside the sample count,
  and `trendQuality` grades a projection high / moderate / low. The horizon a
  projection may claim is capped by that grade — 78 weeks at high confidence,
  26 at moderate, 8 at low — so a weak trend that arithmetically "reaches" a
  distant target returns no ETA rather than a guess dressed as a plan. Every
  projection carries its grade and a plain note ("Based on only 3 weeks of
  inconsistent data — a rough indication, not a forecast"), rendered as a chip
  on the Projections screen.
  Also fixed three more hardcoded `kg` sites, all in coaching text —
  `predictions.js`'s briefing line, plus the weekly and monthly review copy.
  These survived the earlier unit sweep because that guard only swept
  `js/analytics`. The guard now also covers `js/brain` **recursively**
  (`js/brain/hybrid-score/` would otherwise have stayed invisible), and was
  verified by planting a temporary offender in that subdirectory to prove it
  fails rather than passing vacuously.
  Verified: 1396 unit tests, typecheck, precache, workflow gates, smoke.

- **2026-08-04 — CI fix: the Volume merge broke a check I could not see fail.**
  `gym-performance-browser-check.mjs` waited on `#analytics-gym-performance`,
  the section Phase 3B deleted when it merged Gym Performance into the Volume
  screen. CI caught it; local runs did not, because that check was among the
  only TWO browser checks lacking the `net::ERR_` console filter every other
  check has — so behind a restrictive egress proxy it died on third-party font
  and Sentry fetches long before reaching its assertions. It had been dismissed
  as an environmental failure, which is exactly when it stopped being one.
  Fixes, in order of importance:
  1. **Root cause** — added the standard `net::ERR_` filter to
     `gym-performance`, `run-performance` and `running-analytics`, so every
     browser check is now runnable locally and this class of regression is
     catchable before CI. (running-analytics still fails locally on a genuine
     PERFORMANCE threshold — 15.3s vs CI's 2.2s on this hardware. That
     threshold was deliberately NOT weakened.)
  2. **A real product bug the check exposed** — the Home gym card, which is
     about gym activity over time, was landing on the current week's tonnage
     breakdown after the merge. Added an explicit `strength-volume-trends`
     deep link so it opens on Trends, and the check now asserts that landing
     tab rather than only the controls.
  3. The gym check keeps its unique assertions (per-range bin counts, exact
     evidence rows) and drives the merged screen the way a user does.

- **2026-08-04 — Train landing (Phase 0/2).** Train opened straight into the
  workout cockpit: a day-selector bar and an exercise list, with no answer to
  "what am I doing today, and what else could I start?". Quick start hid behind
  a sheet and recent activity was not on the screen at all.
  Train now opens on a **landing** — one dominant Today card with a single
  primary action, the four quick starts inline, and recent activity. The
  cockpit sits behind an explicit action and keeps a Back control; entering
  Train from the nav always returns to the landing, the same rule Progress
  follows. Today comes from `buildTodayCardModel`, the SAME model Home renders,
  so Train and Home can never disagree about today's session or whether it is
  finished.
  Safety: an unfinished session is never buried — the landing surfaces it as
  "In progress · Resume workout" with a visual marker, and both faces stay
  rendered so switching never tears down the cockpit's state machine mid-session.
  This changed the app's most-used path, so six existing browser checks needed
  updating to step into the cockpit rather than assume it is the tab's first
  face (core-ergonomics, modal-accessibility, workout-history, exercise-picker,
  active-program-edit, program-preview-consistency). Their assertions were kept
  intact, and core-ergonomics now additionally asserts the LANDING at 200% text.
  Verified: 1389 unit tests, typecheck, precache, workflow gates, smoke, and
  every runnable browser gate including the new
  `scripts/train-landing-browser-check.mjs`.

- **2026-08-04 — Phase 3C: one detail-screen contract.** Every detail screen
  must answer the same five questions, but Running and Strength each
  hand-rolled the "How this is calculated" footer — which is precisely how they
  drifted: Running stated Confidence, Strength did not, and neither said how
  much interpretive weight a metric deserved.
  `views/metric-contract.js` now owns that footer, so the contract is
  implemented once and enforced by a test rather than by a reviewer noticing a
  missing `<dt>`. Required rows: Source, Confidence, **How to read it** (the
  Phase 3B tier, in plain words), Included history, Excluded. A caller that
  cannot supply a field gets an honest statement ("No explicit confidence
  treatment for this metric") rather than a silently omitted row, which had
  read as "this metric has no such concern" instead of "unknown".
  Care taken not to regress on the way: running's `paceIneligible` exclusion
  category is passed through rather than dropped by the shared shape, and the
  footer takes an explicit plural because naive `+ 's'` produced "independent
  activitys". Verified: 1389 unit tests, typecheck, precache, workflow gates
  and smoke, including a test that drives BOTH real detail screens and asserts
  every contract row survives.

- **2026-08-04 — Phase 3B: metric hierarchy + merged the Volume destination.**
  Two parts.
  **(1) Classification.** `js/analytics/metric-tiers.js` classifies every metric
  as headline / supporting / advanced / diagnostic, and declares which surfaces
  each tier may appear on. An UNCLASSIFIED metric defaults to `advanced`, so a
  new metric has to earn promotion by being named rather than defaulting onto a
  primary screen. Headline is deliberately scarce — exactly four, one per
  Progress-landing domain, and a test fails if a fifth appears. Hybrid Score is
  `supporting`, not headline: a composite summarises the domains, it does not
  replace them.
  **(2) The merge.** Weekly Volume and Gym Performance were two screens
  answering "how much have I lifted" at different scopes, with no route between
  them — Gym Performance was reachable ONLY from a Home carousel card. They are
  now one **Volume** destination (`view-strength-volume.js`) with "This week"
  (day/workouts/exercises/muscles depth) and "Trends" (7D/4W/1Y across time,
  sessions, sets and volume). Both old views became body renderers that take a
  container, so no functionality was rewritten or lost. The `weekly-volume` and
  `gym-performance` contexts both resolve to the merged screen and choose the
  opening tab, so every existing entry point, Back destination and saved deep
  link keeps working. Verified: 1379 unit tests, typecheck, precache, workflow
  gates, smoke, plus `scripts/strength-volume-browser-check.mjs` proving both
  legacy deep links land on the right tab, every control from BOTH old screens
  survives, and the merged screen has one title rather than two stacked headers.

- **2026-08-04 — Progress hub trends (finishes Phase 3A).** Added a labelled
  sparkline to each domain card that has an honest series behind it:
  Consistency draws training days over 8 weeks from the same date-strict set
  as its headline, Strength follows the exact lift the headline names (12
  weeks, same-exercise — never a cross-lift line), and Running reuses the
  metric engine's own weekly points rather than computing distance a second
  way. Recovery deliberately has no trend: readiness keeps no history, and a
  flat fabricated line would imply stability nobody measured.
  Found and fixed a flaw in the shared `spark()` helper while verifying: a
  constant series has zero span, so every point was pinned to the baseline and
  a steady 3-sessions-a-week trend rendered identically to a series of zeros.
  Constant series now draw through the middle; genuine zeros still sit on the
  floor. Also replaced the Running card's empty-state copy, which was echoing
  the metric engine's internal phrasing ("0 contributing activities in the
  current scope") onto a default screen. 1366 unit tests, typecheck, precache,
  workflow gates, smoke and the browser gates all pass.

- **2026-08-04 — Analytics correctness pass.** Three defects where the app
  contradicted itself, each with a regression test.
  **(1) Two streak numbers.** Home used the date-strict `computeStreak` while
  Progress → Review → Stats rebuilt its own trained-date set by approximating
  each slot from `weekStartedAt ± currentWeek` arithmetic — so the two screens
  disagreed whenever a session moved, logging had gaps, or an activation was
  archived. Progress now consumes the canonical `computeStreak` /
  `activeTrainingDates`, which are date-strict and honour streak freezes.
  **(2) NaN heatmap cells.** Both training calendars are PROGRAM-week indexed
  but ran `parseInt` over every week key, including an archived activation's
  `arch:<id>:<n>`. That yields NaN, which slipped past the renderers' range
  guards — every NaN comparison is false — and emitted `<rect x="NaN">`.
  Builders now skip non-numeric keys via the existing `isNumericWeekKey`, and
  both renderers reject non-finite coordinates as defence in depth.
  **(3) Mislabelled weights.** Weight display had no owner, so a single screen
  could read `settings.weightUnit` for one figure and hardcode "kg" for the
  next; an lbs athlete saw both labels at once. Added `weightUnitOf` /
  `formatWeight` to `analytics/utils.js` (labelling only — the app has no
  weight conversion by design, since a set is stored in the unit it was
  entered in) and threaded the unit through the strength view, charts,
  insights, weekly review, monthly report, projections, body weight and the
  timeline table. A source guard over `analytics/views`, `analytics/charts`
  and `analytics/insights` now fails the build on a hardcoded kg suffix; it
  deliberately permits `'kg'` as a fallback *value*. Verified with an
  lbs-profile browser pass: zero stray kg across Strength overview/stats,
  Review and Projections. 1358 unit tests, typecheck, precache, workflow
  gates, smoke and the browser gates all pass.

- **2026-08-04 — Volume Guide (MEV) rebuilt on the single classifier.** The
  guide had been running its own weaker thresholds while
  `calculations/volume-landmarks.js` already owned a five-zone `classifyVolume`
  — two classification systems, with the richer one unused, so the guide and
  the landmark report could describe the same volume differently. Unified onto
  the shared classifier and kept the full MV/MEV/MAV/MRV scale in the model
  instead of collapsing it to a min–max band, which had been discarding the MRV
  ceiling entirely: 30 credits against a ceiling of 26 rendered exactly like a
  merely productive week. Rows now draw against a labelled axis running to that
  ceiling, lead with "12 of 10–20 typical", and state distances as facts —
  "4 credits below the 8–18 typical range" — instead of "Below general
  reference"/"Covered". Scheduled work that will reach the band reads as "On
  plan" rather than a shortfall. Focus sorts by what needs attention; the 19
  per-row priority selects moved to their own Priorities tab; the summary splits
  into in-range/below/above-ceiling/not-started buckets that always sum to the
  focus count. Guidance is held to description, not prescription, by both a unit
  test and a browser assertion. Verified: 1349 unit tests, typecheck, precache,
  workflow gates, smoke, and a new `scripts/volume-guide-browser-check.mjs`
  across both themes at 320/390/412px. Next: Phase 3B metric classification and
  merging the overlapping Gym Performance / Strength Stats / Weekly Volume
  destinations.
- **2026-08-04 — Progress landing hierarchy (Phase 3A).** Replaced the static
  eight-link Progress index with four live domain cards — Consistency,
  Strength, Running, Recovery & Load — each answering what changed, how it
  compares, what it means and where the evidence is, before the user taps
  anything. Split as a pure model (`analytics/progress-landing.js`) plus
  presentation (`views/view-progress-hub.js`), with readiness injected from the
  shared dashboard model so Progress and Home can never disagree about it.
  Consistency became a first-class domain for the first time, built from real
  stamped dates via `loggedDateSet`, so archived activations count and nothing
  lands on a guessed date. Hybrid Score dropped to a secondary destination,
  Fasting now appears only for profiles that actually fast, and Review's
  duplicate secondary entry was removed so the Consistency card owns it.
  **Bug found and fixed while verifying:** the DEFAULT programme's Sunday
  (`js/constants.js`) was titled "Full Rest" with desc "No lifting. No running."
  but carried `runs: "Rest execution criteria verified."`, which matched none of
  `scheduledRun`'s rest patterns — so the canonical `classifyPlannedSession`
  returned **"Run Day"** for the rest day of the programme every new user gets,
  misleading the Today card, coach and morning briefing. Set to the `"Rest"`
  convention every other programme uses, with a regression test.
  `plannedTrainingDays` now calls that canonical classifier rather than a second
  reading of `day.runs`. Verified: 1340 unit tests, typecheck, precache,
  workflow gates, smoke, plus a new `scripts/progress-hub-browser-check.mjs`
  covering both themes at 320/390/412px, 44px targets, no overflow, the empty
  profile and domain routing. Next: the Volume Guide / MEV surface — unify it
  onto the single `classifyVolume` landmark classifier it already owns but does
  not use, show the full MV→MEV→MAV→MRV scale, and replace vocabulary statuses
  with actionable ones.
- **2026-08-03 — Home Today timezone CI correction.** Made the pure Today-card
  model accept an optional display timezone so calendar-day fixtures are
  deterministic without changing the runtime default of the user's device
  timezone. Added a same-instant UTC/Sydney regression and verified every
  Today state in both process timezones. The full Node 20 verification and
  browser suites pass, including mobile layouts and preservation of both In
  Focus cards. Next: simplify the common strength set-row interaction.
- **2026-08-03 — Home analytics hierarchy, corrected by owner direction.**
  Preserved the full Strength and Running In Focus cards, including historical
  week navigation, exact-day activity taps, and Progress detail routes. Removed
  only the repeated four-card At-a-Glance grid, whose Readiness, Weekly Volume,
  Top Lifts, and Average Pace duplicated Today, In Focus, or Progress. Recorded
  In Focus as a deliberate product preference so future density work polishes
  rather than replaces it. Verified calendar attribution, exact activity
  routing, dark/light responsive layouts, and Home overflow. Next: simplify the
  common strength set-row interaction.
- **2026-08-03 — State-aware Home Today card.** Replaced the competing Home
  score, briefing, and standalone actions with one calendar-day-aware decision
  card. Added Start, Resume, Review, rest, unresolved-session, offline, and
  sparse-data behaviour; kept missing plans on the safer Plans recovery route;
  made Hybrid Score supporting only at meaningful confidence; and fixed Home
  opening a stale day last selected in Train. The browser flow also exposed and
  fixed blank one-off workouts remaining unresolved after Discard, including a
  two-dialog history race that could navigate to a blank page. Verified state
  routing, summary review, safe one-off cleanup, dark/light layouts, 44px
  targets, first-viewport fit, and no overflow at 320/390/412px. Next: replace
  the two full Home charts and repeated metric tiles with a compact weekly strip
  and one or two highlights.
- **2026-08-03 — Experience map and four-destination shell.** Completed the
  screen/modal inventory, journey baselines, action ownership, shared vocabulary
  and route-compatibility contract. Replaced the competing Workout + Start
  navigation with Home / Train / Progress / Plans, moved Quick Start into Train,
  and kept the existing internal targets so deep links and historical state were
  untouched. Verified 44px controls, no horizontal overflow from 320–412px,
  200% text, modal focus return and Progress back routing. Next: Phase 1B, a
  single Today card for Home's first viewport.
- **2026-08-03 — New-program logger progression isolation.** Traced the stale
  target to the diagnostic engine querying all exercise history and reusing the
  newest global set as a target/quick-log ghost. Scoped progression to the
  active program activation and workout day, kept global history in a quieter
  expandable Last performed panel, removed implicit history prefills, and kept
  the explicit Use previous values action. Next: continue the broader strength
  set-row simplification with this prescription/history boundary preserved.
- **2026-08-03 — Roadmap refocused on product experience.** Release readiness
  moved to the parked list. Reorganised the work around Home, Train, Progress,
  Plans, natural workout controls, understandable analytics, guided programme
  discovery, coaching, accessibility, performance, and evidence-based product
  iteration. Next: inventory all screens/actions/states and prototype the
  proposed four-destination information architecture.
- **2026-08-03 — Repository/UI/exercise review.** Reconciled implementation and
  documentation, expanded the catalogue to 16 reviewed EZ-bar variations,
  added shared exercise filtering/details, fixed obsolete service-worker CDN
  behaviour, and completed unit/browser verification.
- **2026-08-03 — Simplified Jacked & Tan option.** Added a lower-complexity
  programme while retaining the advanced version.
- **2026-07-24 — Programme editor and exercise discovery.** Added mobile
  keyboard-safe selection, preview/logger parity, active-program edit
  reconciliation, and home-gym catalogue coverage.

## Session log archive (moved from the live roadmap, 24 November 2026)

> Verbatim entries from the pre-v2 session log. They record what was done and
> why; the live plan is `docs/IMPROVEMENT_ROADMAP.md`.

- **2026-11-23 — Measures: the photo gets the numbers it belongs to, and four defects the browser found.**
  - **A progress photo on its own is a picture.** Weight, body fat, tape and a photo
    were split across three surfaces (a photo strip, a measurements card, a weigh-in
    sheet), so the before/after story had no single home. **Progress → Measures** is
    now one dated entry composed from the three stores that already own the pieces
    (`js/metrics/measures.js`): every field optional, nothing re-derived, photos
    untouched by the save so a cancelled sheet cannot orphan a blob.
  - **The photo surface was built by driving it, and it was broken.** A 44px delete
    button covered the 64px tile, so tapping a photo asked "delete?" and there was
    **no way to see it at all**. Deleting from that viewer **navigated the app to
    `about:blank`** — closing the viewer popped a history marker while the confirm
    pushed another, and the later pops landed past the app entry. And the file input
    used `hidden`, which removes it from the tab order, so the picker was
    unreachable by keyboard. Tiles now open a real viewer (compare, replace, edit,
    delete), the confirm stacks OVER the viewer, and the visible control is always a
    button with the input `hidden`.
  - **Measures was unreachable on a fresh profile.** The Body band is range-scoped
    and only renders with data, so a new athlete — the one who most needs to record
    a first entry — had no route in. It now has a quiet footer destination, and the
    browser check starts from an empty profile specifically to keep that honest.
  - Three check failures on the way were the CHECK's fault, not the app's: a seeded
    weigh-in made "empty" non-empty, and the compare picker's placeholder
    `<option value="">` was being selected as if it were a photo. Both are the kind
    of thing that reads green for months.
  - Two new browser contracts, both clock-pinned: `measures-browser-check.mjs`
    (empty → + → real file chooser → weight/waist/fat → entry → second date →
    See All → compare → replace → delete, asserting records **and** blobs at
    390/320) and an extended `photo-browser-check.mjs` that now adds a photo through
    the button's real chooser instead of writing `input.files` behind its back.
  - `npm run verify` green (2,614 tests) and **all 48 browser checks** passed, with
    the hub check now proving both routes into Measures.

- **2026-11-23 — Progress: second audit. Two fixes were incomplete, and three buttons were dead.**
  - **Share, Export photos and Delete photo did nothing.** The delegated handler
    resolved a range/focus control first and bailed when it found none; those three
    buttons carry none of those attributes. That also made the only backup path for
    photo bytes unreachable. The dispatch is now a pure, tested function
    (`progressControlTarget`) whose ORDER is asserted, so the regression cannot recur
    silently.
  - **The exercises band labelled pounds as kilograms.** The composer defaulted the
    unit to `kg` and neither caller passed the athlete's; it now defaults from state.
  - **A capped chart dropped the NEWEST buckets** (104 weeks / 60 months started at
    the earliest date), so a five-year athlete saw old training and not current
    training, while the headline counted everything.
  - **Balance still said "no strength work"** about a session with sets but no
    duration or RPE: "was this modality trained?" now comes from the slot index, not
    from the split's currency.
  - **A warm-up-only day with a saved duration counted as a session.** `gymTimeIsSession`
    distinguishes preparation (sets exist, none valid) from an imported FIT gym file
    (no sets at all, duration is the only evidence).
  - Also: the empty state now distinguishes "all cards hidden" from "nothing for this
    range"; Reports stops advertising Year in Review outside December/January; the
    body band labels all-time values "Latest · <date>"; running evidence rows and
    pace formatting respect the athlete's unit and can no longer print `5:60`; the
    Muscles headline is the sum of the rows it shows; the method disclosure describes
    the range rather than a week.
  - The audit also found tests that could not fail (a tautological share sum, a `/in/`
    regex that matched "weigh-in", a 0.6-point tolerance on a rule that says exactly
    100). Those now assert the real values, and six new regression tests cover the
    findings. `npm run verify` green (2,578 tests).

- **2026-11-23 — Progress: independent rules audit, and the fixes it forced.**
  - An adversarial audit of all 13 rule families found six failures. The worst:
    the **Fasting band never rendered**, because the model read `entry.hours` while
    the only writer stores `durationHours` — and the test fixture used the fictional
    shape, so the suite was green while the feature was dead. The band now reads the
    real field and judges each fast against the goal that applied TO IT, not today's.
  - **Balance could claim "no strength work" about a lifter who trained twice**
    without rating the sets: the currency was chosen from whichever modality had RPE.
    The split now requires a currency BOTH sides can use (sRPE only when both rated,
    otherwise minutes for both, labelled), and "was this modality trained?" is
    answered independently of the currency.
  - **Pulse's adherence compared sessions with days** ("10 of 4"); it now compares
    planned DAYS with trained days and caps at 100. The at-risk streak, which could
    never reach the screen, is stated in the empty state.
  - **The Muscles "All" range charted one bucket** (it fell back to today instead of
    the earliest session); the composer's `visibleCount` counted sub-cards and could
    hide the last remaining band; two screen-reader strings and the share card
    hardcoded `km`; a body-weight "0 kg best" reached the accessible name and table.
    All fixed, with regression tests built from the real writer (`stopFastAtTime`)
    rather than a shape nothing persists.
  - The audit also validated ranges, exercises PR semantics, endurance logic, photo
    idempotency and a real zip round trip, calendar discipline, and the warm-up rule.
  - `npm run verify` green (2,569 tests); the full browser suite is re-run on every
    fix.

- **2026-11-23 — Progress: one time control, and the defects a real screenshot found.**
  - The shared **week navigator is gone from Progress**. It was a leftover from the
    week-scoped hub: a second, contradictory answer to "which period am I looking
    at" beside the range bar, and it only ever governed Pulse. Pulse is now always
    the current calendar week; the navigator stays on the screens that really are
    one calendar week. The browser check now asserts it is ABSENT on the hub and
    that changing the range changes the Endurance band.
  - Three defects only a rendered screenshot could show: the shared body map is
    sized for Home's day recap and rendered ~800px tall inside a band; the band
    action row sat between the headline and the chart; and the fixed bottom nav
    covered the last band's footer. The map is capped at 156px, actions render
    after the evidence, and the hub carries its own bottom breathing room.
  - Evidence: `docs/mockups/live-progress-*.png` are screenshots of the real app.

- **2026-11-23 — Progress finished: photos, customization, share.**
  - **Photos** ship with their backup path: metadata in `appState` (v16), bytes in
    IndexedDB (DB v3), one photo per date, downscaled before storage, exported as a
    hand-written store-only zip and re-imported idempotently.
  - **Customization** gained per-band detail switches (`bodyPhotos` for privacy,
    `musclesBody` for preference) and keyboard reorder — up/down buttons rather than
    a drag-only gesture, because a pointer-only control would have excluded the
    users the switch row already served.
  - **Share** draws one canvas summary from the same band models the screen renders,
    so the image cannot disagree with the page.
  - `npm run verify` green (2,555 tests); all 46 browser checks pass.
  - The Progress programme is complete: eight bands, one dashboard, one range
    control, no paywall possible (guard test), and every surface answering one of
    the three product questions.

- **2026-11-23 — Progress P6b: progress photos, with their backup path.**
  - Photos are the only user data here with no platform backup (Android sets
    `allowBackup="false"`, so IndexedDB is device-local). They ship **with** their
    export or not at all.
  - Storage: metadata in `appState` (**v15 → v16**, additive and validated), JPEG
    bytes in a new IndexedDB `photos` store (**DB v2 → v3**). One photo per date —
    the id IS the date, so adding a second replaces instead of orphaning a blob and
    a re-import is idempotent. Deleting a record deletes its blob, and a delete asks
    first because a photo has no Undo.
  - Capture downscales before storage (longest edge 1200, JPEG q 0.82 ≈ 200 KB):
    a 4 MB camera photo per entry would eat a phone's quota. `fitWithin` is pure and
    tested without a canvas.
  - Export is a **store-only zip written by hand** (`js/portability/zip.js`) rather
    than a dependency — JPEGs are already compressed. The writer and reader are one
    module, so the round-trip test proves both, and an archive without a manifest is
    refused instead of half-imported.
  - The calendar guard caught `toISOString().slice(0,10)` in the export filename;
    it lands on the wrong day near midnight and now uses `localDayKey`.
  - `npm run verify` green (2,548 tests) and **all 46 browser checks pass**.
  - Remaining: customize reorder UI + the `bodyPhotos`/`musclesBody` sub-toggles,
    and share-any-band. The catalogue already supports `order`/`moveCard`.

- **2026-11-23 — Progress P8a: one dashboard, and a no-paywall ratchet.**
  - The four legacy Consistency/Strength/Running/Recovery domain cards are
    **retired**. They were a second dashboard on the same tab; the bands ARE
    Progress now, with the footer keeping the quiet destinations, History and
    Week in Review.
  - Retiring them exposed a real gap: Review had no entry point once its card was
    gone. It has a footer link that preserves the selected week, found by the
    browser check failing its historical-week assertions.
  - `progress-hub-browser-check.mjs` was **rewritten for the surface that exists**
    rather than patched around: band order with Pulse first, four range chips with
    one selected, no band without a headline, an empty profile that leads with an
    empty state and invents nothing, and a Muscles row that opens a detail screen.
    The stepped-back week now proves the Endurance band reads the selected week.
  - `tests/progress_no_paywall.test.js` is a permanent ratchet: the build fails if
    any Progress source gains a gating or monetisation term, if `ranges.js` exposes
    a cap, or if the stylesheet defines a locked/blurred state. `unlock` is
    excluded on purpose — Health Connect permissions are not payments.
  - `npm run verify` green (2,530 tests); hub browser contract passes.
  - Remaining: progress photos (own session: v16 + IDB v3 + zip export) and the
    customize reorder UI / sub-toggles from P8b.

- **2026-11-23 — Progress P7: Fasting band.**
  - `Fasting` answers "is my fasting on plan?" from completed fasts in the selected
    window: average duration, percentage that met the goal, current streak and the
    longest fast, with recent fasts as discrete bars against a goal line — fourteen
    points do not support a smooth trend line.
  - The band owns one rule: **elapsed time against a self-set target.** No
    autophagy, fat-loss, hormone or metabolic claim, and no stage interpretation. A
    test greps the rendered output for those words so a future edit cannot slip one
    in unnoticed.
  - A window with no completed fasts renders nothing; the module switch removes the
    band entirely.
  - All eight bands are now built and wired. `npm run verify` green (2,527 tests);
    hub browser contract passes.
  - Next: P6b photos (v16 + IDB v3 + zip export) and P8 (share, customize reorder,
    and retiring the legacy domain cards — which means rewriting, not extending,
    the four-domain assertions in the hub browser check).

- **2026-11-23 — Progress P6a: Body band.**
  - `Body` composes what already exists — `buildBodyweightModel` for weight and its
    change over the selected window, `buildMeasurementModel` for the tape sites and
    any entered body fat. Nothing re-derived, nothing estimated.
  - The chart IS `bodyWeightChartSVG`, the same one Home and Progress already draw,
    so there is no second sparkline. It renders only from two points: a single
    weigh-in cannot imply a trend, and it also produces no change line.
  - Body fat reads as a percentage with its own point delta, and as absent rather
    than zero when nothing was measured. Both units come from state.
  - A defect worth recording: body-fat points carry `value`, not `cm`, so the first
    model read silently dropped every reading. The test caught it.
  - **Progress photos are deliberately not in this slice.** They live outside
    `appState`, Android's `allowBackup` is false, and a photo store without the zip
    export would be the only user data in the app with no backup path. They ship
    with their export or not at all.
  - `npm run verify` green (2,520 tests); hub browser contract passes.
  - Next: P6b photos (v16 + IDB v3 + zip export) as its own session, then P7 fasting.

- **2026-11-23 — Progress P5: Endurance band, and running metrics become run-only.**
  - `Endurance` answers "is my running improving?" from the same canonical
    collector the Running screen uses, so the band cannot disagree with the screen
    it links to: run and walk distance as grouped bars, pace as a stat with a
    delta (never a second axis), a 12-week run/walk-day strip, and "not in run
    totals" stated in words.
  - **Behaviour change:** every `running.*` metric is now run-only. Weekly,
    4-week and lifetime distance, run count and longest run exclude walks; the
    filter sits at the aggregation boundary **and** in `evidenceFor`, so a walk can
    never be offered as evidence for a number it is not part of. Metric copy says
    "walks are counted separately"; "Weekly Activity Count" / "Total Activities"
    became "Weekly Run Count" / "Total Runs".
  - FIT imports now carry the sport: `isWalkingSport` maps walking/hiking files to
    `type: 'walk'`, so an imported walk cannot become a run.
  - This was safe to do directly because the project has a single user — no
    migration note was needed for a community, and the numbers changing is the
    point rather than a regression.
  - `npm run verify` green (2,512 tests); hub browser contract passes.
  - Next: P6 Body and progress photos — the only phase that adds storage.

- **2026-11-23 — Progress P4: main exercises and set records.**
  - `Main exercises` ranks the lifts trained most in the selected window by
    sessions, with best e1RM, the change across the window and a PR flag. The flag
    compares the window's best against the **all-time** best for the same exercise,
    so a lift that peaked two months ago cannot look like a record, and aliases
    collapse through `resolveExercise` so two stored names are one row. Every row
    links into the existing drilldown (`data-entity` / `data-entity-name`).
  - `Set records` ("heaviest working set at or above each rep target") moved into
    its own module, `js/strength/set-records.js`, rather than a second rule inside
    `exercise-detail.js`. Holds and carries report their own best; bodyweight
    history reports most reps in a set and session instead of inventing a weight
    record; warm-ups never count. The drilldown prints the definition, because a
    records table without its rule is a rumour.
  - The "no hardcoded kg" guard caught the first version of that table. The unit
    now comes from the model.
  - `npm run verify` green (2,493 tests); hub browser contract passes.
  - Next: P5 Endurance and the run/walk metric re-pointing.

- **2026-11-23 — Progress P3: Muscles, with credited sets and a grouping switch.**
  - `Muscles` answers "is the volume where I need it?": credited sets per muscle
    over the selected window, bucketed week/month/year, with each muscle's share
    and its change against the equal-length previous window.
  - Credits stay owned by `muscleCreditsForExercise` (1 / 0.5 / 0.25), so a
    compound set is one set for the chest and half for the triceps and the shares
    sum to 100. Warm-ups contribute nothing; holds and carries count as sets with
    zero tonnage.
  - Colour carries the six GROUP hues; the legend is capped at six series plus
    Other, because 19 distinguishable hues do not exist on a 390 px screen. Every
    bucket states its total in text and every number reappears in the rows and
    the data table.
  - Deleted the dead `renderWeeklyVolumeDetail`, which summed `setVolume` over
    `isCompletedSet` sets and therefore counted warm-up tonnage. Nothing imported
    it; it was a future bug, not a screen.
  - No new metric ids were needed — `strength.muscle-set-credits`,
    `strength.per-muscle-volume` and `strength.weekly-volume` already classify and
    inventory these numbers.
  - `npm run verify` green (2,461 tests); hub browser contract passes.
  - Next: P4 main exercises, the exercise metric switcher and set records.

- **2026-11-23 — Progress P2: Balance, plus the range and focus controls.**
  - `Balance` answers "is the mix right?" over the selected window, in sRPE when
    the athlete rates effort and training minutes when they do not, saying which.
  - **Walks are excluded from the split** (D1): on the minutes fallback an
    unrated walk would count like a hard session and outvote real training.
    `dailyLoadBreakdownTimeline` reports `walkLoad`/`walkMin` additively and Home's
    hybrid card subtracts them too, so the mix has one definition everywhere. The
    excluded time is still shown — hidden from the share, not from the user.
  - A one-modality window is an explanation, never a 100 % bar. The composer
    gained `alwaysShow`, so only Pulse and Reports render without data.
  - The **range bar** (30D/3M/1Y/All) and the **All/Strength/Endurance filter**
    land with it: 44 px `aria-pressed` chips, one delegated listener, ephemeral
    state so a remembered mode cannot silently hide half the dashboard.
  - `npm run verify` green (2,440 tests) and the hub browser contract passes at
    320/390/412 in both themes.
  - Next: P3 Muscles (sets per muscle, distribution, body split).

- **2026-11-23 — Progress P1: Pulse band, one range vocabulary, eight-band catalogue.**
  - The Progress hub now opens on **Pulse** — the selected calendar week, its
    streak and its run/walk split — instead of the old week hero. It follows the
    shared week navigator, so the band and the navigator can never name different
    weeks. A warm-up-only day reads as rest; an untrained current week keeps the
    streak alive and labels it at risk rather than resetting it.
  - `analytics/ranges.js` is the one time-window contract: trailing windows end
    today (so a comparison is elapsed-matched by construction) and `all` never
    invents a start date. Labels state real dates.
  - `analytics/views/band-kit.js` implements the five required states, the
    text-alternative table, legend and ranked rows once for every future band.
  - `Customize Progress` moves from six legacy cards to the eight bands.
    `PROGRESS_CARD_ALIASES` maps old ids onto their successors so saved choices
    survive the rename; nothing is pinned, but the last visible card cannot be
    hidden.
  - `progress-dashboard.js` composes bands and keeps "hidden by the athlete",
    "module off" and "no data yet" as three distinct answers. A throwing band
    renders an error rather than blanking the tab.
  - **Fixed a silent offline gap:** stylesheets are hand-listed in
    `gen-precache.mjs` but were not covered by `precache_manifest.test.js`, so a
    new `<link>` could ship uncached and render the tab unstyled offline. The
    test now scans stylesheet links the way it scans `<script src>`.
  - Design + work order live in `docs/progress-tab-plan.md` and
    `docs/progress-tab-execution.md`; mockups in `docs/mockups/`.
  - Next: P2 Balance, then P3 Muscles.

- **2026-11-23 — Hybrid week on Home, a Hybrid training switch, and the shared
  bodyweight chart.**
  - Home gains one hybrid section below the week surface: a calendar-week
    strength/endurance sRPE split with a pace-matched 5-week trend, this week's
    tonnage/e1RM/PRs, and distance/pace. Each card is hideable and links to the
    owning Progress surface; the endurance card respects the Running module and
    shows aerobic fitness from `effectiveVdot`, labelled `(est.)` because the app
    has no measured VO₂ max source.
  - `dailyLoadBreakdownTimeline` makes the split and rolling ATL/CTL one formula;
    sets without a session duration report `unmeasured-strength` rather than a
    fabricated endurance-only week.
  - Settings → Modules gains a Hybrid training switch (`settings.hybridTraining`,
    v14→v15). It hides only hybrid cards and never rewrites the four module
    switches, so strength-only is a dashboard choice, not a data decision.
  - The weigh-in sheet no longer autofocuses the weight field (the keyboard used
    to cover the steppers), and Home draws the same bodyweight chart as Progress
    beneath the compact summary row.
  - Fixed while wiring it: quick-start Run/Walk/Fast had no module hooks, a
    duplicated `#dashboardQuickActions` block, a direct `settings.modules` read in
    the Home insight, and the floating rest pill's missing CSS (21px pause target).
  - Verified: node tests, typecheck, smoke, precache, and the new
    `hybrid-dashboard-browser-check` plus home-today, customize, module-toggles,
    bodyweight, rest-timer and touch-target checks.
  - Next: return to the gated backlog at Phase 0 → Phase 1.

- **2026-11-23 — Owner review follow-ups: recap order, exercise rest, live ghosts,
  a balance split that survives a missing RPE.**
  - `buildSessionRecap` sorted lifts by tonnage, so the finish recap, History
    detail and share card opened with the heaviest lift instead of the one the
    athlete actually started with. It now orders by `week.liftOrder[day]` — the
    cockpit's own order and the only stable record of sequence, since sets carry
    no completion timestamp — with stored insertion order after the known lifts.
  - Rest chosen in the set sheet is now an EXERCISE preference: it writes
    `settings.restOverrides`, clears the row's own `restSec`, and every set of
    the lift (and the next session) resolves it. A `restSec` already stored on
    another set still outranks it, so nothing logged is rewritten.
  - The ghost on a blank row follows the athlete: `ghostForRow` copies the
    nearest earlier non-warm-up set's entered weight/reps and the next row
    updates live as you type. The coach's target stays on the row as
    `data-prescribed`, so true-adherence is still measured against the
    prescription rather than the athlete's own last set.
  - **The reported defect — "Training balance says no load logged though I have
    logged sessions" — was the currency, not the card.** Strength sRPE needs an
    RPE, and logging never forces one, so a normal lifter's sessions produced
    zero load. The split now uses sRPE when RPE exists and TRAINING MINUTES
    (`gymStats.time` + run durations) when it does not, with `basis` shown on the
    card ("Split by training time"). Working sets with neither RPE nor a duration
    report `unmeasured-strength` instead of `no-data`.
  - Tests: recap ordering (3 cases), `ghostForRow`, `data-prescribed`, exercise
    rest persistence, the minutes fallback, and unmeasured-vs-no-data.
  - Next: notification copy — a day that is already trained still reads
    "Today: <session>" because `briefingToText` (js/brain/morning-briefing.js)
    never consults `session.done`; `composeMorningReminder` composes the briefing
    at fire time on web, but Android's native alarm fires outside JS. Decide
    whether a completed day suppresses the reminder or rewords it to
    "Done today", and cancel the OS alarm on finish if suppression is chosen.

- **2026-11-23 — 14-site review fixes: display units, disclosure, trend labels.**
  - The per-site chart now receives DISPLAY values: `measurementTrendData`
    converts stored centimetres with `cmToDisplay` before `renderSiteTrend`, and
    the chart never converts. A cm→in toggle repaints the open trend at 13.0 in
    / 13.4 in (fixture) instead of relabelling centimetres as inches. The site
    delta uses the same boundary, so Arm L reads `+0.4` in inch mode, not `+1`.
    The SVG `role="img"` label is now
    `Arm L trend (in): 13.0 in on 10/11, 13.4 in on 19/11, +0.4 in` — unit,
    first/latest and change — and the one-reading note uses the active unit too.
  - Tape placeholders now follow the body-fat rule: each site suggests its
    latest reading ON OR BEFORE the chosen date, so back-dating the 12th shows
    the 10th's tape rather than the 19th's.
  - Editing a date with bilateral readings opens the “Arms, thighs and calves”
    disclosure and echoes `N recorded` in the summary; a new or legacy-only date
    keeps it closed. The hint now states that a wrong legacy Arm/Thigh can only
    be removed by deleting the whole date (no half-wired destructive action).
  - Light mode's existing `#155e75` trend stroke/dot override is measured in the
    real light card: both 5.76:1 against the composited surface.
  - Validation: 1 new node test plus the updated chart contract (2,319
    combined), typecheck, smoke, precache/workflow gates. The bodyweight browser
    check now covers forearm_l/r render, the `+9 more` recent cap, the
    one-reading note, cm→in chart + delta conversion, back-dated tape
    placeholders, disclosure auto-open/count, and light stroke/dot contrast,
    then the full 45-check browser suite. Screenshots remain untracked:
    `shots/measurements-14-sites.png`, `shots/measurements-14-sites-sheet.png`,
    `shots/measurements-trend.png`.
  - Next: Progress photos (P8), the only remaining body-composition row.

- **2026-11-23 — Year in Review (P12).**
  - Review → Stats now leads with a seasonal calendar-year recap. In December it
    recaps the current (partial) year; in January it recaps the year that just
    ended; in every other month the section is absent. The `<h2>` lives inside
    `#yearReviewContainer`, because `.analytics-section h2.section-header` is
    `display:flex !important` and a `hidden` attribute on the heading alone did
    nothing. A pinned June 2027 context proves the container and heading are
    both gone while the rest of Stats still renders.
  - `js/brain/year-review.js` is the pure builder, mounted by
    `js/analytics/views/view-year-review.js`: a year hero (sessions and the
    explicit date range), Lifted / Run / Working sets / e1RM PRs, the busiest
    month, the in-year longest CONSECUTIVE run (worded so it cannot be confused
    with the freeze-aware Streak card), up to five top exercises and the top
    five annual PR events.
  - Sessions are counted by DISTINCT identity on the real stamped date through
    `indexSlotsByDate(state).allByDate`: one strength session plus every run is
    two on a strength+run day, two runs are two, a copied slot is one, and two
    different programmed days completed on one date are two. The best month is
    chosen by sessions, then volume, then the earlier month. The consecutive run
    never reaches back before 1 January.
  - Annual e1RM PRs are now PER-DATE events, not calendar-week events. Every
    valid set from every deduplicated slot on a date contributes to that date's
    best for its canonical lift; dates are scanned in order and `isE1rmPr`
    compares against every earlier date. This is safe at the Dec/Jan boundary (a
    30 Dec PR and a higher 2 Jan set count in their own years), never emits two
    PRs from two same-date sessions, and still treats a first-ever lift as a
    baseline and a tie as no record. The builder returns every event; the view
    caps the list at five and labels a capped list "Biggest e1RM PRs".
  - Volume is formatted by the shared `formatVolume` in
    `js/analytics/utils.js`: kg keeps the existing `14.1t` / `550 kg` output
    byte-for-byte, while lbs is grouped and labelled `14,050 lb` — never
    converted, because stored weights are already in the athlete's entered unit.
    Weekly Review and the Training Report now use the same helper. Top exercises
    resolve aliases to canonical names, count holds/carries as working sets with
    zero tonnage, and an unbroken 50-character custom name wraps at 320/412.
  - Bodyweight is deliberately omitted — a weigh-in is stored in the unit the
    athlete was using then. No share card, no new route, no schema change, no
    network surface.
  - `scripts/progress-hub-browser-check.mjs` gained clock-pinned December
    contexts over 12 monthly weeks in real numeric/`arch:*` keys: 390 kg, 390
    light lbs (Lifted/Run asserted in both units), and 320/412 light contexts
    with the long custom name (no document or container overflow). A pinned
    June 2027 context proves the off-season section is hidden. The existing
    three-width and empty-profile assertions are untouched.
  - Clock guard: the five existing width contexts still derive `today`/`MON`
    from the wall clock; the new pinned block covers only its own context. The
    file therefore remains a FILE-LEVEL exemption in
    `tests/browser_check_clock_guard.test.js` — its `UNPINNED_BACKLOG` entry was
    removed because the shrink-only rule rejects a check that now contains
    `pinClock`. The residual risk is recorded here rather than blessing the
    whole file as fixed.
  - Validation: 2,309 node tests, typecheck, smoke, precache/workflow gates,
    progress-hub and all 45 real-browser checks. The 390×844 visual check is
    reproduced from the pinned December block in
    `scripts/progress-hub-browser-check.mjs`
    (`node scripts/progress-hub-browser-check.mjs`); no PNG is committed.
  - Next: the monthly-report share card, then a Year in Review share image built
    from the values this screen shows.

- **2026-11-23 — Per-site measurement trend (P7 complete).**
  - Every measured cell on the Measurements card is now a 44px button
    (`data-action="measurement-site"`). One tap opens `#bwMsTrend` below the
    grid, a second tap on the same site collapses it, `aria-pressed` reports the
    choice, and no analytics re-render or scroll call runs.
  - `renderSiteTrend` (`js/analytics/charts.js`) is a dependency-free SVG line:
    readings sort oldest → newest, y labels show the min/mid/max, x labels show
    the dates, and under two readings it states what is missing instead of
    drawing a line. Body fat renders on a percentage scale; tape sites use the
    athlete's chosen unit.
  - The chart is painted from the last rendered model (`showMeasurementTrend`),
    so a cm/in toggle keeps the open site open in the new unit. The app router
    maps `measurement-site` to that function; the card itself does not change.
  - Validation: 3 new node tests (2,318 combined), typecheck, smoke, precache
    and workflow gates. The extended bodyweight browser check taps Arm L (SVG
    with both dots, 390px fit), taps again (collapsed), checks the body-fat
    percentage scale, measures 44px controls and the trend at 320px, then ran
    the full 45-check browser suite. Screenshot: `shots/measurements-trend.png`.
  - Next: Progress photos (P8), the only remaining body-composition row.


- **2026-11-23 — Fourteen measurement sites, legacy readings preserved.**
  - The measurements record now tracks 14 canonical length sites: neck,
    shoulders, chest, waist, hips, glutes, arm_l/r, forearm_l/r, thigh_l/r and
    calf_l/r (`MEASUREMENT_SITES`). Left and right are independent readings;
    nothing derives one side from the other.
  - The sheet keeps six primary fields visible and puts the eight bilateral
    fields behind an “Arms, thighs and calves” disclosure, with a hint that
    earlier single Arm/Thigh readings are preserved and exported. Body fat stays
    a full-width percentage field.
  - The old single `arm`/`thigh` keys are `LEGACY_MEASUREMENT_SITES`
    (“Arm (old)”/“Thigh (old)”). Normalization keeps them, `measurementSiteTrends`
    returns them only with `{ includeLegacy: true }`, and the card asks for
    them so no historical reading disappears. `buildMeasurementRecord` is
    canonical only, and `preserveLegacySites` carries an existing Arm/Thigh into
    the replacement record, so editing a waist cannot drop them.
  - CSV columns are the 14 canonical labels, then `Arm (cm)`/`Thigh (cm)`, then
    `Body fat (%)`. The reader resolves all 16 length keys with `_cm`/`_in`
    suffixes; old six-site files still import into the legacy keys, and a new
    export round-trips canonical + legacy + body fat.
  - Validation: 6 new node tests (2,286 combined), typecheck, smoke, precache
    and workflow gates. The extended bodyweight browser check seeds a legacy
    `{2026-11-05, arm 36, thigh 58}`, edits that date (waist 81) and asserts the
    legacy pair survives, fills shoulders/glutes/arm_l/arm_r/thigh_l/thigh_r/
    calf_l/calf_r on 2026-11-19 behind the disclosure, and covers stored values,
    the card, legacy deletion and 320px fit. 390×844 screenshots:
    `shots/measurements-14-sites.png` (card) and
    `shots/measurements-14-sites-sheet.png` (details open).
  - Next: the P7 per-site graph.

- **2026-11-23 — Body fat as an entered reading.**
  - Body fat joins the body-measurements record as an additive `bodyFat`
    percentage (2–70, one decimal). There is no height, sex or age in state, so
    no formula is offered: a scale, caliper or DEXA value is typed in. It is NOT
    a `MEASUREMENT_SITES` entry, because that set is centimetre-validated, and
    the cm/in toggle never touches the percentage.
  - The measurements sheet gains a full-width Body fat (%) field with its own
    divider and the honest hint "entered, not estimated". An existing date
    prefills it exactly; a new date starts blank with the last reading only as a
    placeholder. Save replaces the whole record, so editing another site cannot
    drop the stored percentage. A body-fat-only record counts as a real entry.
  - The Measurements card renders a distinct Body fat cell only when measured,
    with a first-reading state and a delta in PERCENTAGE POINTS (`pp`), never
    percent-of-percent. A body-fat-only log still renders the card.
  - CSV: the measurements export gains a `Body fat (%)` column. Imports accept
    `body_fat`, `bodyfat`, `body_fat_pct` and `body_fat_percent` as percentages,
    merge same-date rows and still never overwrite an existing date; a
    body-fat-only file is detected and semicolon files accept a decimal comma.
    Known limitation: a combined weigh-in + body-fat CSV belongs to the
    bodyweight reader, so its body fat is not imported (documented in the module
    header); the weigh-in confirm now says so explicitly.
  - Review fixes: light mode replaces the cyan body-fat accent and delta with
    `#155e75` — measured 5.76:1 on the card and 6.58:1 on the sheet in a real
    390px light context. (The suggested `#0e7490` measured only 4.25:1 on the
    card's composited surface, so it was darkened.) The "nothing added" import
    toast now says existing dates are never overwritten instead of claiming the
    measurements are already logged. Body-fat placeholders use the latest
    reading ON OR BEFORE the chosen date, never a future one.
  - Validation: 13 new node tests across the slice (2,280 combined), typecheck,
    smoke, precache/workflow gates, the extended bodyweight browser check
    (stored 18.4 and 19.0, `-0.6 pp` with its percentage-point title, exact
    prefill, blank+on-or-before placeholder, tape edit preserving body fat,
    unit-toggle isolation, delete, 320px fit, 390px light contrast) and the
    full 45-check browser suite.
  - Next: the remaining P7 scope — the 14-site catalogue and per-site graph.

- **2026-11-23 — Shape-aware PRs: one rule, one count.**
  - `js/strength/records.js` is now the one record model: e1RM (shared
    eligibility + `E1RM_PR_EPSILON`), hold (`sec`), carry (`dist`) and rep
    records at the same stored load and load mode. Bodyweight/assisted/banded
    sets are silent because `w` is mass or assistance, not a comparable load.
    The rep fallback is also closed to a bodyweight NAME: an imported
    "Pull Up 80 kg" with no `bw`/`loadMode` is refused instead of becoming a
    Rep PR, while loaded conditioning work (Sled Push) keeps its rep buckets.
    `bestRecordBefore` scans every activation including `arch:*` and requires
    prior history, so a first-ever log stays a baseline.
  - Rep records are bucketed by `(load, loadMode)` — the shape
    `bestRecordBefore` already stored. `bestRecordForSession` exposes every
    bucket (`reps: []`), `recordCandidates` flattens them, and the recap, finish
    review, exercise drilldown and cockpit detection iterate all of them, so a
    60×20 record is not hidden by 80×15 in the same session. The recap still
    shows ONE Rep PR badge (the heaviest earned bucket) and the delta/previous
    best come from the matched bucket, never `0`.
  - The cockpit detects every shape at tick, quick-log and completed-row edits
    (`change`/blur, not per keystroke), persists `prKind`, and synchronises both
    ways: a corrected-down set or an unticked one loses its class, badge and
    stored stamp. The baseline toast fires only on the unticked→ticked
    transition. Untick resolves the week and day as one pair, so it withdraws the
    stamp the tick wrote even in a one-off session. The recap compares each kind
    with the all-time prior best derived from its ONE history scan (shared with
    "Last time"); the share card stays e1RM-only. Holds and carries show their
    time/distance instead of `0 kg × 0`, and the badge sits left of the ✓ at
    320/390/412 (measured in the set-row browser check). That check also pins
    the 54px VALUE track's content box: Linux Chromium exposed the global 12px
    inline input padding as a zero-width content box, so `.input-set-value-node`
    now pads 4px and the set-row number spinners are hidden.
  - PR COUNT POPULATION — Home and Progress agree on **e1RM PR lifts**. Home's
    session/day recap counts `prKind: 'e1rm'` (a legacy stamp with no `prKind`
    was always an e1RM and still counts), and Progress counts the same e1RM lifts
    through `calendarStrengthSummary`. Hold/carry/rep records keep their recap
    badges but are not counted; the labels say `e1RM PR lifts` / `e1RM PRs` so
    the population is explicit. The Week in Review uses the same e1RM count and
    label. A saved edit re-derives the day's stamps against the baseline
    excluding that week/day, refuses an UNDATED day rather than comparing it with
    itself, and rebuilds `exerciseStats`.
  - `PR_KIND_LABELS` moved to the leaf `js/strength/pr-labels.js`, so the set-row
    template no longer pulls exercise history and the catalogue. The dead
    `priorBestMax` in `js/analytics.js` was removed; the live baseline is
    `computeStrengthAnalytics().liftProgression[lift].priorBestMax`.
  - Validation: 2,247 node tests, typecheck, smoke, precache, finish-review,
    edit-saved, set-row, workout-history, touch-target and all 45 browser checks.
    The recap's Hold PR + Carry PR was inspected in a local 390×844 screenshot
    under the untracked `hevy-audit/shots/pr-types.png` — an inspection artifact,
    not a committed asset or product dependency.
  - The superset browser check's fixture is now clock-pinned. Its programme week
    is anchored at `weekStartedAt: '2026-11-16'`; with an unpinned clock the
    week-old programme offered "Time to Advance?", whose sheet covered the app
    and made the nav inert on 2026-11-23. Reproduced on `origin/main`; pinning a
    time inside that anchored week makes the check assert the circuit, not the
    date.
  - Next: Android device checklist and the remaining capability-backlog rows.

- **2026-11-23 — Settings consolidation: one Logging card, honest search, no dead toggles.**
  - `js/settings/nav.js` now owns the five fixed destinations, the card-label
    map and search matching; an unknown card label falls back to Training rather
    than disappearing. `tests/settings_nav.test.js` parses `index.html`, so a new
    top-level card cannot ship without a group or an unknown tab.
  - Logging graduated from a buried sub-block to its own card (rest
    tiers/presets/alert, progression step, previous values, warm-up, plate
    hints). Training order is Training → Logging → Program Week → Equipment →
    Modules; every existing control id is unchanged.
  - Search is honest: it matches visible text, `aria-label`, `title` and option
    text; resets the panel scroll; announces no-results with `role="status"`;
    ignores cards hidden by a module switch; and clears on open/close. The
    filters are buttons with `aria-pressed` in a `role="group"` — the old
    `role="tab"` claimed tabpanels that never existed.
  - `.settings-switch` gained a 44px hit area around the unchanged 42×24 track,
    every switch input has an accessible name, and `.settings-body` now pads
    with `--safe-bottom` after its env() fallback.
  - One owner for defaults: `DEFAULT_REST_TIERS` replaced four hardcoded copies;
    `restPresetFor` derives the active preset from stored tiers (custom values
    show none); the duplicate Settings `saveThresholdPace` is gone — the field
    uses the analytics implementation, which parses `mm:ss` strictly (60–3600 s)
    and rejects empty, `4.30`, `0` or out-of-range input without overwriting the
    stored baseline. The toast distinguishes "saved" from "Enter pace as mm:ss".
  - Fasting stage nudges are a persisted toggle under Notifications → Fasting
    (default on), and the delivery path refuses to fire while the Fasting module
    is hidden or the toggle is off. The write-less `settings.fastingEnabled`
    read was deleted: module visibility plus real session history is the honest
    signal.
  - `tests/settings_wiring.test.js` ratchets the STATIC settings
    input/select/textarea ids to an app/settings handler (not buttons or
    JS-rendered controls), matching exact quoted ids rather than substrings. The
    four attribute-wired Health Connect toggles are the documented exceptions,
    each asserted to carry `data-hc-field`; the cap is six and the list may only
    shrink.
  - Every `.settings-switch` input has an accessible name, `.hc-data-toggle` is
    a 44px row with centred content, and the Settings body's bottom padding is
    asserted statically and in the browser at 40px + the published inset.
  - Validation: 2,267 node tests, typecheck, smoke, precache, settings-nav,
    module-toggles, equipment profiles, core ergonomics at 320/360/390/412 and
    200% text, safe area, touch target, and all 45 browser checks. The 390×844
    Training/Logging screenshots under the untracked
    `hevy-audit/shots/settings-logging*.png` (or the local capture command) are
    inspection artifacts, not committed assets.
  - Next: keep-awake and an explicit live-PR switch are the only S1 parity
    toggles still missing; add them only if real use asks. Otherwise continue
    the capability backlog (Phase 4 plans/routines).


- **2026-11-22 — Half-step effort ratings: review fixes.**
  - Per-set effort is now RIR 0–4 in half steps (0 … 4+, with 4+ stored as 4)
    beside Failure in a 5×2 grid. `js/workout/effort.js` is the one reader:
    `normalizeEffortRir` rejects blanks, arrays and out-of-range values,
    `effortForSet` turns `rir` or a legacy `rpe` into both numbers, and a failed
    set with no rating counts as RPE 10 without claiming to be rated.
  - The load-memo signature now hashes `failure` as well as `rpe`/`rir`, so
    toggling Failure on a completed unrated set invalidates the cache and ATL/CTL
    refresh immediately instead of waiting for an unrelated save.
  - Session RPE inputs accept half steps with `step="0.5"`/`inputmode="decimal"`;
    Dashboard Stress Balance keeps half-step session/run RPE, and the engine
    fatigue fallback and weekly performance average read RIR-only imports
    instead of ignoring them. The previous-workout panel and sheet share
    `effortForSet`.
  - The effort grid keeps 44px cells at 320/390/412; at 280px the cells hold
    their 44px minimum (the sheet can scroll horizontally below that) instead of
    shrinking below the touch target.
  - Validation: 2,201 node tests, typecheck, smoke, precache, set-row at
    320/dark + 390/light + 412/dark (including legacy `{rpe:8}` active state and
    `aria-pressed`), touch-target and all 45 browser checks.
  - Next: Android device checklist and the remaining capability-backlog rows.

- **2026-11-22 — Plate calculator review fixes.**
  - **Use this weight refuses what the sheet calls unbuildable.** 101 kg now
    disables it with `1 kg short — closest 100 kg`, so the one total it cannot
    load is never written; 100 kg stays enabled and persists.
  - The solver is an exact bounded search over the active pairs, not greedy:
    `[25, 20]` with two pairs of each builds 100 as 2×20 a side and 150 as
    25 + 20 + 20. Greedy is only the display fallback. The inline `plateHint`
    shares the solver and the bar/plates/counts fallback.
  - `nearestBuildableTotal` now searches BOTH directions from real reachable
    sums (`bar + 2 × per-side load`), never from a rounded leftover and never
    below the bar: 21.5 → 22.5, 48 lb → 50, ties go down.
  - `limited` is set only when exhausted/zero pair counts are what force the
    gap; the read-only kit names owned pairs including `×0`. The target ceiling
    is unit-aware (1500 kg / 3307 lb), and the shortfall/warning ink darkens to
    `#b45309` in light theme (measured 4.54:1 on the light card).
  - The target input describes only the headline result; the nested-modal
    parent `aria-hidden` residual risk is documented in the sheet module.
  - Validation: 2,180 node tests, typecheck, smoke, precache, set-row at
    320/dark + 390/light + 412/dark (including the 101 write gate and measured
    light-theme contrast), touch-target, modal accessibility, equipment
    profiles and all 45 browser checks (197.4 s, clean run).

- **2026-11-22 — Plate calculator sheet.**
  - The per-set sheet gains one full-width **Plate calculator**. It opens with
    the row's typed weight or ghost target and reads the ACTIVE equipment
    profile, so it can never show a plate the athlete does not own. The result
    leads with the per-side load, then per-side chips, the pairs off the rack,
    the total shortfall and the nearest buildable total.
  - Unreachable and impossible targets are explained instead of rounded away:
    101 kg on a standard rack reads `25 + 15 · 1 kg short` and names 100 kg; a
    rack limited to one 25 reports its 40 kg total shortfall; below the bar
    shows the delta to the empty bar.
  - **Use this weight** is the only write, and only on a barbell, weighted,
    unfinished set with a target at or above the bar. It types through the
    row's existing input/change/blur path (never state directly) and closes the
    calculator and set sheet; every other set disables it with the reason.
  - Pure additions: `plateShortfallTotal`, `nearestBuildableTotal` and
    `platePairs` in `workout/plates.js`, plus `workout/plate-sheet-model.js`.
    The calculator stacks above the set sheet, returns there on Escape, and is
    reachable only from the set sheet (no sixth row column, inline plate line
    unchanged).
  - Validation: 2,175 node tests (26 plate math/model), typecheck, smoke,
    precache, set-row at 320/dark + 412/dark with real-profile plate
    assertions, touch-target (set sheet and plate sheet now measured), modal
    accessibility, equipment profiles, and all 45 browser checks (245.7 s, one
    timeout retry).

- **2026-11-22 — Note scopes close the review gaps (`ed459ee`, `78526dc`, `7b3c353`).**
  - The workout note (`week.notes[day]`) now reaches the finish recap and
    History detail as text. It is strength-only: a run detail on a mixed date
    cannot borrow it (`activityKind !== 'run'`), and run notes stay on
    `runs[].notes`.
  - Exercise notes and private reference links live in
    `settings.exercisePrefs` keyed by canonical exercise id. Links pass
    `safeExternalHttpUrl` (http/https only), are built as real anchors with
    `noopener noreferrer`, and are never fetched. The cockpit, builder row and
    Train/plan previews show the note; only the cockpit/builder open settings.
  - Routine notes (`routine.note`, ≤500) are read by reference through
    `week.sourceRoutineId`, so edits update the live banner and deletion removes
    it. Import clones prefs on a null prototype and repairs invalid links/notes
    instead of dropping the routine.
  - The CSV `Notes` column remains the workout note only; routine notes,
    exercise notes and reference links are private scopes and never exported.
  - Light theme now darkens the cyan link and violet note labels to ≥4.5:1;
    the builder gained Exercise settings, and the multiline note dialog has a
    character counter, `aria-describedby` and Enter/Cmd+Enter semantics.
  - Validation: 2,161 node tests (including a jsdom prompt test), typecheck,
    smoke, routines, set-row at 390/light + 412/dark with measured contrast,
    touch-target, core-ergonomics and all 45 browser checks.

- **2026-11-22 — Supersets become circuits (`84aa2d0`, `4e4e723`).**
  - **The old path was pair-only and lost work.** `pairAsSuperset` always minted
    a new letter, so adding a third exercise re-lettered the original pair and
    stranded the previous partner under a dead id; members rendered in
    object-key order, colours stopped at F, the 27th circuit became `[`, and
    rest fired after every member instead of after the group. Rest also asked
    only the ticked member, so a Bench/Curl pair rested 180 s or 90 s depending
    on tick order.
  - `js/workout/superset.js` is the pure group model (no DOM, no
    `../workout.js` import): same-day lifts sharing a non-empty `groupId`,
    `membersInOrder`, derived `roundState`, join/remove/unlink and the group
    rest decision. Adding a third JOINS the existing letter; a cross-group merge
    is refused with an explanation rather than re-lettering either side.
    Members render in `liftOrder`; the in-place panel adds, removes one member
    (clearing a lone surviving tag) and unlinks all, with 44px controls.
  - **One rest per group.** `shouldRestAfterSet` counts only working, non-drop
    rows and rests only after every other member has done
    `min(done_ticked, its available rows)`, so an uneven circuit rests once the
    shorter member catches up. Warm-up ticks keep the warm-up tier; drop ticks
    never rest, complete a round or change the denominator. Both the manual tick
    and one-tap quick log gate through it.
  - `js/workout/rest-duration.js` owns the pure precedence (per-set > warm-up
    tier > AMRAP > plan > override > tier + RPE), extracted from the timer.
    `groupRestDuration` resolves every member through that same precedence and
    takes the longest, so a Bench/Curl pair rests 180 s in both tick orders; a
    per-set rest on the ticked row still wins outright, including `0`.
  - **Stable identity.** A–F keep their historic colours and the palette
    continues beyond F; ids run A…Z then AA…ZZ, so the 27th group is no longer
    `[` and invalid legacy tags render as `SS+`. The header reads
    `SS A · 3 exercises · rest after the last`, each member's SS button carries
    the count, and connectors use `2 of 3` ordinals. Completion adds a wider
    border and badge tick, never a text dim that breaks AA contrast.
  - **Routine/copy persistence.** `prescriptions[day][lift].groupId` survives
    save-as-routine and routine start; `createOneOffStrengthSession` carries
    only `{groupId}` from live source lifts, and both paths prune a
    single-member tag. Import drops a malformed optional `groupId` rather than
    the whole routine. Deleting a partner's last set prunes the survivor's tag;
    the Undo snapshot carries `liftMeta`, so both tags return. No schema
    migration: values live in existing `liftMeta`/`prescriptions` fields.
  - `tests/superset_circuit.test.js` (22) plus 2 logging contracts cover
    join-not-split, cross-group refusal, remove-one, stable colours, AA ids,
    uneven/warm-up/drop rounds, both rest orders, routine restore and
    Copy/Repeat. `scripts/superset-browser-check.mjs` drives the real cockpit at
    390px (pair → add third → liftOrder → no rest after A1/B1 → rest after C1 →
    remove one → unlink all) and asserts the same 180 s duration in both tick
    orders; the rest-timer check covers drop suppression and touch-target
    measures the SS panel.
  - Validation: 2,128 node tests, typecheck, smoke, precache and workflow gates,
    and 45/45 real-Chromium checks. Screenshot:
    `node scripts/superset-browser-check.mjs --screenshot=shots/superset-circuit.png`.
  - Next: exercise-level circuit behaviour after a mid-session swap and a
    second-pass UI review of the panel on a long day.

- **2026-11-22 — Routines: save, start and organise reusable workouts (six
  commits).**
  - `8652ec7` **save** — History's action menu saves a finished strength session
    as a routine: exercises in order, completed working sets, heaviest working
    load, rep target, set shape and rest. Completion flags, PR badges, warm-ups,
    role stamps, effort, notes and gym stats are deliberately dropped. Routines
    live in root `state.routines` / `state.libraryFolders` (schema v14) and are
    never programmes: they do not enter `customPrograms`, resolve through
    `getProgramById`, render as `.prog-card` or write a week/activation field.
  - `a9ae2e9` **load identity + import validation** — a bodyweight or assisted
    set keeps no derived weight (`bw`/`band`/`loadMode` survive), a banded set
    keeps the band as its load, and a legacy dumbbell set records its pair basis
    so the pair is not re-read as one bell. Export/import validates, bounds and
    repairs routines and folders; the import preview counts them.
  - `f1e9505` **list and start** — Plans → My Plans leads with routines; Start
    copies `routineSourceWeek` into a one-off `session:` week without touching
    `activeProgramId`, `currentWeek` or the logged program week. Rename and
    Delete (+ Undo) live in the `•••` menu.
  - `ee0b5be` **one-tap start** — the one-off is stamped `in_progress`, the
    session clock is bound and running, and the cockpit opens in active mode
    through `beginActiveWorkoutSession`; there is no second start path.
  - `b99875e` **folders** — ordered folder sections plus an Unfiled bucket with
    one-way membership on `routine.folderId`; create, rename, delete, Move
    up/down and Move to folder, with Undo that restores the folder and every
    member's membership.
  - `2f1f0bc` **review fixes** — display-order normalisation, a 60-lift /
    500-routine bound that import can keep, required prescriptions per listed
    lift, rep-target/anchor pairing, and a Start guard that refuses while another
    workout is open and offers Resume instead.
  - Activation isolation holds throughout: no routine action calls
    `startProgramActivation` or `reseedActiveProgramIntoWeek`, and logged program
    weeks stay byte-identical after saving, listing, starting and filing.
  - Validation: 2,104 node tests, typecheck, smoke, precache and workflow gates,
    and 44/44 real-Chromium checks. Screenshots come from
    `scripts/routines-browser-check.mjs --screenshots=<dir>`: `routine-card.png`,
    `routine-start-active.png`, `routine-folders.png`.
  - Next: routine-library categories and filters (Phase 4, item 4).

- **2026-11-22 — Folder order, bounds and the active-session guard.**
  - Folder order is now display order everywhere: `normaliseFolderOrder` sorts by
    `sortOrder` then name before renumbering, `deleteFolder` snapshots the
    display index, and `restoreFolder` inserts into the display list at that
    index and renumbers positionally. Undo restores the exact section order (the
    browser check asserts the DOM order, not just the count).
  - A new folder normalises an imported `10,20` library first, so it appends last
    with the next dense number. The builder clamps to 60 lifts and the save path
    refuses a 501st routine, so the app cannot write a record its own import
    drops; the rep target now pairs with its anchor set (`tr` then `r`, then any
    `tr`, then any `r`); imported routines must have a prescription for every
    listed lift and at least one lift overall; the move sheet files an unknown
    `folderId` under Unfiled with the same count/current marker as the library.
  - Start now refuses while another workout is open and offers Resume instead of
    replacing the clock or orphaning the one-off. The unused `routine.sortOrder`
    field is dropped (folder membership is the only grouping this slice needs).
  - Validation: three-folder reorder/delete/Undo tests, the lift/library bounds
    round-trip, rep-precedence and import-repair tests, and a 98-assertion browser
    check covering two routines, folder Undo order, orphaned membership, the
    active-session guard and the unchanged program weeks.

- **2026-11-22 — Routine folders.**
  - My Plans groups routines into folders ordered by `sortOrder`, then an
    **Unfiled** bucket for routines with no folder; empty folders stay visible
    with a quiet "No routines yet" so they can be filled. With no folders the
    flat Routines list is unchanged.
  - A folder is `{ id, name, sortOrder, createdAt }` and membership is ONE-WAY on
    `routine.folderId` — a folder never stores a member list. Create, rename,
    delete, Move up/down and the bottom-sheet Move to folder (folders + Unfiled)
    reuse the existing app action pattern and never touch `state.weeks`,
    `activeProgramId` or `currentWeek`.
  - Deleting a folder moves its routines to Unfiled and never deletes one; Undo
    restores the folder at its position AND every member's `folderId`.
  - Validation: store-helper tests (create/rename/delete/restore/move/reorder,
    phantom folder refused), the routines browser check (create → move → reload →
    reorder → delete → Undo at 390×844), plus typecheck, smoke, precache and the
    Plans / touch-target / ergonomics gates.

- **2026-11-22 — Routine Start is a real start.**
  - Plans → My Plans → Start now opens the cockpit already in session: the
    one-off is stamped `in_progress`, the session clock is bound and running, the
    sticky active header replaces the big Start CTA, and the first exercise is
    scrolled into view. It reuses the cockpit Start button's own sequence
    (`beginActiveWorkoutSession`) — there is no second start path.
  - `renderWorkout` treated a timer as running only once a whole second had
    elapsed, so the first render after Start (at 0s) put the Start CTA straight
    back. A bound timer is now a running session.
  - Validation: the routines browser check asserts no Start CTA, the active clock
    bar, an in-progress one-off, a clock bound to that session's key, and a set
    ticked immediately after Start.

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

- **2026-11-23 — Measures: adversarial audit, and the eight things green did not mean.**
  - **A duplicated date silently discarded the athlete's correction.** The readers
    keep the LAST row for a date (`normalizeWeighIns`/`normalizeMeasurements`), and a
    JSON restore can create that duplicate, but the writer touched only the FIRST —
    so a corrected weight was saved where nothing read it, and clearing every field
    left the date populated. The writer now replaces/removes every row for the date.
  - **The photo backup had no reachable restore and no reliable export.** `Export
    photos` sat on a range-scoped band that can be absent, `importPhotosZip` had **no
    caller at all**, and Settings → Data never had a photo control — so the "only
    backup path for photo bytes" could be unreachable and could never be restored.
    Both buttons now live beside the library, and the browser check exports a real
    zip, deletes a photo, and imports it back.
  - **A failed blob delete reported success.** `deletePhotoBlob` resolves false and
    never rejects, so metadata went and the bytes stayed, invisibly. `removePhoto`
    now throws and keeps BOTH; `deleteMeasureEntry` deletes bytes **before** rows so
    a throw changes nothing at all instead of half-deleting an entry.
  - **Edit entry raced the history marker**, the same class that blanked the page on
    Delete: the viewer closed (queueing `history.back()`) and then opened the sheet
    (`pushState`). It now hands the dialog over with `replaceManagedModal` — and the
    check caught the hand-off being wired to a missing import.
  - **The same tile did two different things.** The Body band's `+` opened the
    camera directly while Measures' `+` opened the entry — so one tap produced a
    photo with no context, the exact split this screen exists to close. Both now
    open the dated entry, and the band's bare file input is gone.
  - Also: `listPhotos`/import now reject a record whose id disagrees with its date
    (it could be neither viewed nor deleted, yet the confirm said "deleted"); the
    `bodyPhotos` privacy switch is honoured on Measures; "Delete measurements" in the
    sheet now says it is tape-only (it never removed the weigh-in or photo).
  - **Four tests/checks could not fail** — the audit's most useful finding. The 44px
    walk skipped any missing control; the replace step asserted `updatedAt > 0`, true
    before the action; `hasAnything` was a constant; the photo check collected a tile
    count and never asserted it. All four now assert the real value (the replace
    compares a SHA-256 of the stored bytes, since the clock is pinned).
  - Docs corrected where they described features that do not exist (a `mime` field, a
    `rollupMeta` store, photo share, quota warnings, `js/photos/store.js`).
  - `npm run verify` green (2,619 tests); all 48 browser checks green (one
    progress-hub attempt crossed the 180s kill under 3-way load and passed on the
    built-in retry — that check is 119s on its own, the suite's longest).

- **2026-11-24 — Body measurements: the read path, and the 0.1 cm edit that made it untrustworthy.**
  - **Measurements were already captured; they were hard to READ.** The Body band
    summarised four sites and Measures listed dates, but the only per-site chart
    lived inside the Bodyweight card — a different destination. Measures now leads
    with a **single-site explorer**: choose any measured site or body fat, switch
    30D / 3M / 1Y / All, and see the latest value, its change since the previous
    reading, the shared SVG trend and the exact readings table. The Body band's four
    site cells are 44px buttons that open Measures on that site.
  - **Editing at inches rewrote untouched stored centimetres.** 76.0 cm displayed as
    29.9 in, and Save converted the display value back to 75.9 cm for every site the
    athlete never touched (audit AUD-R6-1, previously deferred). `saveMeasureEntry`
    now accepts `unchangedSites` — the original canonical cm for fields whose
    prefilled display value was not edited — and the sheet passes them. A regression
    test and a browser assertion cover the round trip.
  - **Tape deltas now state their baseline.** They were "since the previous reading"
    but the band's sublabel named the selected range, so a 30D card could show a
    change measured months earlier. The card says so in one line, the body-fat line
    names the previous date, and the data table's columns are "Change since
    previous" / "Previous reading".
  - **One chart, two surfaces.** `renderSiteTrend` became a DOM wrapper around the
    pure `siteTrendHTML`, so the Bodyweight card and Measures cannot draw different
    trends. The explorer is a leaf: its range is `data-ms-range`, defaults to All,
    never rewrites the hub's `_progressRangeId`, and a range with no readings says
    so and offers Show all instead of inventing a point.
  - Also corrected the roadmap's own stale claims: Body composition was marked
    `LATER` with six sites and no body fat, and P8 photos was still `○`.
  - `npm test` green (2,640 tests), typecheck + smoke + precache green, and the
    Measures and Progress-hub browser checks pass at 390/320. Live captures:
    `docs/mockups/measures-trend-390.png` and `measures-trend-320.png`.
  - Next: the gated queue — Phase 0 truth pass then Phase 1 live-PR/keep-awake.

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

- **2026-11-24 — Roadmap v2 adopted: Settings/Profile first, strength-first.**
  - Owner priorities, the H0–H4 phase queue, Settings/Profile IA, Home,
    Progress restructure, logging/strength analytics, queued H5–H8, the Part H
    flow measures and the working rules are merged as §13–§21.
  - Part A hygiene: the stale baseline is replaced by current gaps; DONE phases
    carry gate-evidence lines (tap counts are explicitly pending); CP/EP phases
    are renamed; the feature matrix gains a Decision column and `◑ reframed`;
    CP6's native leftovers move to H8.
  - No product code changed. **H0 — verify and audit** is next.
