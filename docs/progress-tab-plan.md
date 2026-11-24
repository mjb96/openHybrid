# Progress tab — Hevy-feature parity for a FOSS app

**Status:** plan only. No production code written.
**Date:** 2026-11-23
**Product direction:** openHybrid is AGPL-3.0 FOSS. **Nothing is gated, ever.** Every Hevy *Pro* feature is a baseline feature here.

**Research sources** (Hevy's own product + help docs, read 2026-11-23):
- <https://www.hevyapp.com/features/gym-progress/>
- <https://www.hevyapp.com/features/gym-performance/>
- <https://www.hevyapp.com/features/sets-per-muscle-group-per-week/>
- <https://www.hevyapp.com/features/training-chart/>
- <https://www.hevyapp.com/features/exercise-performance/>
- <https://www.hevyapp.com/features/monthly-report/>
- <https://help.hevyapp.com/hc/en-us/articles/44128140257431> — how sets per muscle are counted
- <https://help.hevyapp.com/hc/en-us/articles/35119778922263> — the Pro feature table
- <https://help.hevyapp.com/hc/en-us/articles/33106320824727> — 2026 features guide

---

## 0. Ground rules

| Rule | Consequence for this plan |
| --- | --- |
| **FOSS, never paywalled** | No entitlement module, no range clamp, no locked state, no upsell copy, no "upgrade" string anywhere. A guard test enforces it permanently (§8.2). |
| **Warm-up sets are excluded from total volume** | Every new reducer filters with `isValidWorkingSet()`. `setVolume()` alone does **not** exclude warm-ups — see §7 for the exact hazard and the guard. |
| **Clean-room** | Parity of *function* only. No Hevy assets, colour values, copy or chart geometry. Our tokens, our words, our SVG. |
| **Local-first** | No network, no account, no telemetry added. Photos are device-local blobs. |
| **One definition per metric** | New surfaces call the owning module. They never re-derive e1RM, volume, PRs or muscle credits. |

---

## 1. What Hevy ships

Statistics live under **Profile → Statistics** (not a top-level tab). Five screens: Last 7 days body graph, Advanced statistics (four sub-screens), Measures, Calendar, plus Monthly Report and Year in Review.

### 1.1 The interaction grammar

Hevy's analytics feel premium because of six reused controls, not the styling:

| Control | Behaviour |
| --- | --- |
| **Period selector** | `30 days · 3 months · 1 year · All time`, shared by every stat |
| **Grouping selector** | `Weekly · Monthly · Yearly` — a *second* axis on sets-per-muscle only. "Last year by month" is a different question from "last month by week" |
| **Muscle multi-select** | Plot one, several or all muscles on the same chart |
| **Comparison ghost** | Current period in colour, equal-length previous period in grey, same axis |
| **Header stat row** | Workouts · duration · volume · sets, for the selected period |
| **Navigate from a number** | Tap a record → the exact workout where it happened |

Two more, per-screen: a **week stepper** on the body view, and a **metric switcher** on an exercise chart (heaviest weight / 1RM / set volume / session volume / reps / duration / distance). Every chart is shareable as an image.

### 1.2 Hevy's Pro list — and what openHybrid already gives away

Hevy's entire paid tier, mapped to this codebase:

| Hevy Pro feature | openHybrid today | Status |
| --- | --- | --- |
| Unlimited routines (free = 4) | `state.routines` — no cap | ✅ parity+ |
| Unlimited custom exercises (free = 7) | `state.customExercises` — no cap | ✅ parity+ |
| 1-year & all-time statistics (free = 3 months) | All history is always readable | ✅ parity+ |
| **Set count per muscle group** | Credits computed; no chart | ⚠️ **P2** |
| **Additional body measurements** (free = weight + waist) | 14 tape sites + body fat + per-site trends | ✅ parity+ |
| **Warm-up calculator** | `workout/warmup-ramp.js`, opt-in auto ramp, plate + dumbbell rounding | ✅ parity+ |
| **Progressive overload recommendations** | `programs/progression-style.js`, `computeDiagnosticForLift`, recap "Next time" | ✅ parity (surface it in P4) |
| **Personalized trainer programs** | 58-program catalogue + `recommendation-fit.js` + starter programs | ✅ parity+ |
| **Trainer progress reports** | Monthly Report (current calendar month *and* trailing 12 months), Year in Review | ✅ parity+ |
| **Progress photos** | Nothing exists | ⚠️ **P5** |

Read the right-hand column carefully: **eight of ten Hevy Pro features are already free in this app**, several of them better (unlimited everything, 14 measurement sites, real 12-month reports). Only two are genuine gaps, and only one needs new storage.

That is the pitch, and it should be stated on the surface itself: this app gives away what Hevy charges $2.99/month for.

### 1.3 Where Hevy is weak (our openings)

- **Strength Level** (barbell bench/squat/deadlift only) uses age/weight/sex population percentiles — requires licensed reference data.
- **"It records, it doesn't think."** Consistent reviewer criticism: it shows the plateau, never why or what to change.
- **No endurance dimension at all** — no running, no hybrid load, no recovery.
- Monthly report is **previous month only**; no historical reports.
- Muscle credit is only primary/secondary (1 and 0.5).

---

## 2. Parity matrix

| # | Capability | Today | Phase |
| --- | --- | --- | --- |
| 1 | Last 7 days body graph on Progress | heatmap exists in Home recaps only | **P1** |
| 2 | Set count per muscle group (period × grouping, multi-select) | credits exist, chart does not | **P2** |
| 3 | Muscle distribution + previous-period ghost + header stats | nothing compares periods | **P3** |
| 4 | Training split by body, week stepper | session heatmap only | **P3** |
| 5 | Main exercises by period | only inside Year in Review | **P4** |
| 6 | Exercise summary graph | `buildExerciseDetailModel` | ✅ exists |
| 7 | Exercise **metric switcher** | kind inferred, not selectable | **P4** |
| 8 | **Set Records** by rep target | records bucket by load, not by reps | **P4** |
| 9 | Record tap → the workout | `activityId` on every session row | ✅ exists |
| 10 | Range control (30D/3M/1Y/All) on everything | week-nav only | **P1** |
| 11 | Body measurements (weight, body fat, 14 sites) | complete | ✅ parity+ |
| 12 | **Progress photos** + compare | nothing | **P5** |
| 13 | Monthly Report | current calendar month + trailing 12 months | ✅ parity+ |
| 14 | Year in Review | exists | ✅ parity+ |
| 15 | Calendar + streak | History calendar | ✅ parity+ |
| 16 | Share summaries as an image | Progress, Training Report and Year in Review cards wired; per-chart cards remain | ◐ |
| 17 | Running analytics (30 metrics, pace/HR/zones/load) | strictly more than Hevy | ✅ beyond · **band 5** |
| 18 | Hybrid strength-vs-endurance balance | `hybrid-balance.js`, Home card only | ✅ beyond · **band 2** |
| 19 | Fasting analytics (score, stages, trends, calendar) | `view-fasting.js` + 1,147 lines of calcs | ✅ beyond · **band 7** |
| 20 | Recovery / load / readiness | exists, device-dependent | ✅ beyond · footer leaf |
| 21 | Strength Level percentiles | — | **not built** (§11) |

---

## 3. The Progress tab, top to bottom

Our Progress is a top-level destination — better than Hevy's buried Profile → Statistics. Keep the navigation; adopt the content and grammar.

**But this is a hybrid app, and a strength-only band list would be a regression.** Hevy can only answer "is my lifting working". openHybrid has to answer that *and* "is my running working" *and* "is my fuelling behaviour on plan" — without becoming a second Home.

```
Progress                                    [ 30D | 3M | 1Y | All ]  <- sticky
---------------------------------------------------------------------------
1  Pulse              "am I showing up, in both?"
     7-day rail · body diagram · streak · strength + run counts

2  Balance            "is the mix right?"
     strength vs endurance split (sRPE or minutes), 5-week trend
     muscle distribution · this period vs previous period
     workouts · time · volume · sets

3  Muscles            "is the volume where I need it?"
     [Week | Month | Year] · muscle chips · stacked bars
     body diagram (<- week ->) beside ranked rows

4  Main exercises     "what am I actually doing?"
     top 5 · sets · best e1RM · next time -> exercise detail

5  Endurance          "is my running improving?"
     run distance + walk distance (separate) · pace delta
     runs · time · longest run
     -> All 30 running metrics · Run history

6  Body               "is my body responding?"
     weight + rate · 14 tape sites + body fat · photos

7  Fasting            "is my fasting on plan?"
     14-day fast length vs goal · average · streak · adherence
     -> Fasting analytics (score, stages, calendar, achievements)

8  Reports
     Monthly Report -> · Year in Review ->
---------------------------------------------------------------------------
More detail: Recovery & load · Projections · History
Method disclosure
```

### 3.1 Band 2 is the hero, not Band 3

Hevy's centrepiece is *sets per muscle*. Ours has to be **Balance**, because a strength-only chart cannot describe a hybrid athlete:

- Strength load and endurance load on the same axis, using the existing `buildHybridBalance` currency — **sRPE when the athlete records RPE, training minutes when they do not** — labelled with which one it is.
- The 5-week pace-matched trend, so "this week looks light" is answered against the same weekdays, not a full week.
- Muscle distribution underneath, so "the mix" means both *between modalities* and *across muscles*.

That is the one thing on this screen Hevy structurally cannot do. Everything else is parity; this is the reason to use this app.

It is also **optional** (§3.6). A lifter in a strength-only block does not need a 100 %-strength split staring at them every week, so they can hide it — which is precisely why the **muscle distribution and the period totals live in Muscles, not here**. Balance owns one idea: the strength/endurance mix. Nothing else depends on it being on screen.

### 3.2 Conditional bands — how eight bands stay short

The failure mode of every analytics redesign is a nine-screen scroll. The rule that prevents it: **a band appears only when it has something true to say.**

| Band | Renders when |
| --- | --- |
| 1 Pulse | always |
| 2 Balance | both modalities have ≥ 1 session in range |
| 3 Muscles | at least one working set in range |
| 4 Main exercises | >= 3 exercises with >= 2 sessions in range |
| 5 Endurance | Running module on **and** >= 1 dated run in range |
| 6 Body | any weigh-in, measurement or photo exists |
| 7 Fasting | Fasting module on **and** >= 1 completed fast in range |
| 8 Reports | always (two links, no cost) |

A new athlete sees Pulse + Balance + Reports (3 bands). A hybrid veteran with six months of data sees all eight. Nobody ever scrolls past five empty cards, which is what Hevy's free tier does after three months.

Module gating stays authoritative: with Running off, band 5 does not exist; with Fasting off, band 7 does not exist — and neither leaves a visible shell (the `[data-module]` / `moduleEnabled` contract).

### 3.3 What each existing surface becomes

Nothing is rebuilt from scratch, and **no second dashboard is created** (the competing-surfaces rule).

| Existing surface | Fate |
| --- | --- |
| `progress-landing.js` (hub model) | Becomes the band composer |
| Strength Overview / Stats | Survive as the Strength deep dive; bands 3 and 4 summarise them |
| Running Overview / Stats + 30 metrics | **Untouched.** Band 5 summarises and links into them |
| Fasting analytics (Overview / Stats) | **Untouched.** Band 7 summarises and links into it |
| Recovery & Load | Stays a Progress leaf + footer link; not a landing band (device-dependent, often empty) |
| Projections | Stays a leaf; linked from Endurance |
| History calendar | Stays its own destination |

### 3.4 Range control

- One range drives bands 2–8. Band 1 is always "last 7 days" by definition — the bar does not apply to it, and its label says so rather than leaving a control that looks broken.
- Bands are hideable via the existing Customize sheet (`PROGRESS_CARDS`). Pulse and Balance are pinned.
- Running and Recovery are **not** relegated to a footer link. Running gets a real band; Recovery keeps its leaf and its footer link because it depends on an external device feed.

### 3.5 Switching between strength and endurance

Three mechanisms, in order of permanence. None of them hides a number.

| Mechanism | What it does | Persists |
| --- | --- | --- |
| **Module switch** (Settings → Training → Modules) | Running off removes the Endurance band entirely; Fasting off removes that band | Yes — `settings.modules` |
| **Domain filter** under the range bar: `All · Strength · Endurance` | Collapses the other modality's bands to a one-line summary | No — ephemeral, like the range |
| **Collapsed band header** | One tap re-expands it; the summary line is the tap target | No |

**Why a filter and not a mode switch.** A three-way *mode* (Hybrid / Strength / Endurance) implies mutually exclusive views, which is the wrong mental model for this app — the whole thesis is that both disciplines belong on one screen. A filter that **collapses rather than hides** keeps the other half's headline visible:

```
ENDURANCE · 38.2 km · ▲ +4.8 km                    View ›
```

One 44 px row instead of a 300 px band. You still know your running went up while you read your strength detail, and nothing is a tap away that used to be free.

| State | Balance | Muscles | Main exercises | Endurance |
| --- | --- | --- | --- | --- |
| **All** (default) | full | full | full | full |
| **Strength** | full | full | full | collapsed row |
| **Endurance** | full | collapsed row | collapsed row | full |

`Balance` is **never** collapsed by the filter — it is the cross-modal band and the reason the tab exists. Pulse, Body and Reports are never affected; they are not modality-specific.

**Placement.** The domain chips sit directly under the range bar, but they are deliberately *lighter*: 0.62 rem text chips with a 2 px underline when active, no pill background, no border. Two identically-weighted segmented rows stacked on a 390 px screen would read as two competing navigations. Only the range row is sticky — the domain filter scrolls away, because it is set once per session, while a collapsed band header is always one tap away.

**Edge cases, decided now:**

- Running module off → the filter has one option, so **the filter is not rendered at all**. A single-choice control is noise.
- A collapsed band whose data is empty renders nothing at all — never a "0 km · View" row.
- The default is **All on every visit**. Remembering "you were in Endurance mode last week" would silently hide half the dashboard and is indistinguishable from a bug.
- Deep links (a Home card for running, a notification) open Progress with **Endurance focused**, i.e. the other modality collapsed — the same state the user would have reached by tapping the chip.

**Accessibility:** the chips are `role="group"` buttons with `aria-pressed` (never a fake tablist). Expanding a collapsed band announces the change through the band's `role="status"` region, and focus stays on the chip that was tapped rather than jumping into the band.

### 3.6 Customising the Progress tab

The foundation already exists and should be extended, not rebuilt:

| Piece | What it does today |
| --- | --- |
| `js/ui/customize.js` | `PROGRESS_CARDS` catalogue, `normalizeUi` (drops unknown ids), `isCardVisible` / `setCardVisible` / `resetSurface` |
| `js/ui/customize-sheet.js` | One bottom sheet serving Home and Progress: switch rows, applies live, re-renders the surface behind it |
| `js/ui/sortable.js` + `js/dragdrop.js` | `createSortable` press-and-hold reorder with FLIP animation and haptics; `dashboardTiles { order, hidden }` is the persisted-order precedent |

#### The catalogue (eight bands)

| id | Label | Note in the sheet | Hideable |
| --- | --- | --- | --- |
| `pulse` | Pulse | Last 7 days, streak and training days | Yes |
| `balance` | Balance | Strength vs endurance split | Yes |
| `muscles` | Muscles | Sets per muscle and body split | Yes |
| `exercises` | Main exercises | Most-trained lifts and next load | Yes |
| `endurance` | Endurance | Run and walk distance, pace, consistency | Yes (needs Running module) |
| `body` | Body | Weight, measurements and photos | Yes |
| `fasting` | Fasting | Fast length against your goal | Yes (needs Fasting module) |
| `reports` | Reports | Monthly report and year in review | Yes |

**Nothing is pinned.** Pulse and Balance are the strongest cards, but a strength-only block makes the Balance split meaningless (it renders as 100 % strength every week), and a user who only wants charts has no use for Pulse. Both are legitimate preferences, so both get a switch.

The cost is real and worth stating: the tab no longer guarantees a narrative — with Pulse hidden it can open straight onto a chart. Two rules keep that safe rather than broken:

| Rule | Behaviour |
| --- | --- |
| **At least one card stays visible** | The last remaining switch cannot be turned off. The row explains "Keep at least one card" inline; the toggle springs back rather than failing silently |
| **The page header is chrome, not a card** | "Progress · What changed, and why" and the range bar render even when every card is hidden, so the surface never looks like a blank screen |

Home remains the decision surface ("what should I do today?"), so Progress being chart-first for some athletes is acceptable — Progress answers "is this working?", and some people want that as numbers, not a summary.

If a stored preference from an older build somehow hides everything, the existing "All Progress cards are hidden" message plus **Show all** is the recovery path.

Two sub-toggles earn their place:

| id | Parent | Why it exists |
| --- | --- | --- |
| `bodyPhotos` | Body | **Privacy.** Photos are the one card someone may not want on screen when the phone is passed around |
| `musclesBody` | Muscles | Visual preference: the ranked rows carry the same numbers, so the diagram is optional |

Nothing else gets a sub-toggle. Every extra switch is a decision the athlete has to make about a surface they haven't seen yet.

#### Order

`settings.ui.progress.order` holds an id array. The sheet gets a drag handle per row, reusing `createSortable` in `list` layout — the same engine as dashboard tiles, so it already has FLIP animation, edge auto-scroll and haptics.

- Pinned bands are fixed in positions 1–2 and are not draggable.
- Everything else is draggable among itself.
- A drag handle alone is not accessible, so each row also offers **Move up / Move down** in its overflow menu, operable by keyboard and screen reader.
- `order` is normalised on read: unknown ids dropped, missing ids appended in catalogue order. A new band therefore appears without editing anyone's saved array.

#### Conditional bands vs hidden bands — the distinction that matters

These are different things and the sheet must say so:

| Situation | Sheet shows | Dashboard shows |
| --- | --- | --- |
| Band has no data yet | Switch **on**, note "No data yet" | Nothing (nothing true to say) |
| Band has data but is hidden by the athlete | Switch **off** | Nothing |
| Band has data, module is off | Row is **not rendered** (module switch owns it) | Nothing |

Without this, a user whose running module is off would think they hid Endurance, and a new athlete would think the app lost their data. The availability map comes from the same `buildProgressDashboard` model, so the sheet can never disagree with the surface behind it.

#### Persistence

```ts
settings.ui = {
  home:     { hidden: string[] },
  progress: { hidden: string[], order: string[] },   // order is additive
};
```

**No schema bump.** `normalizeUi` already tolerates a missing key and runs on every read; `settings.ui` was seeded in v11→v12. Adding `order` is additive and defaulted (empty array = catalogue order).

#### Old preferences must not be silently dropped

`normalizeUi` currently discards unknown ids. Renaming cards without an alias map would quietly reset the saved choices of every existing user — the exact "silent data loss" pattern this repo refuses. So add `LEGACY_PROGRESS_CARD_ALIASES`:

| Old id | Maps to |
| --- | --- |
| `strength` | `muscles` + `exercises` |
| `muscleLoad` | `muscles` |
| `running` | `endurance` |
| `bodyweight` | `body` |
| `recovery`, `projections` | nothing (both become footer leaves; the alias is consumed and dropped) |

If an old id was hidden, its successor is hidden. The alias is read-only compatibility: the next write stores new ids only.

#### Interaction with the domain filter

The `All · Strength · Endurance` chips are **derived, never stored**. A modality chip renders only when at least one *visible* band belongs to it:

- hide `muscles` and `exercises` → the Strength chip disappears
- hide `endurance` → the whole filter disappears (one modality left, §3.5)

#### Sheet behaviour

- Title "Customize Progress"; subtitle: *"Hide or reorder cards. Your data is always kept."*
- Rows: drag handle · label · note · switch, 44 px, switches remain `.settings-switch` (unchanged 42×24 track inside a 44 px hit area).
- Pinned rows show the words **"Always shown"** where the switch would be. No lock icon — nothing in this app is gated.
- Footer: **Reset to default** (`resetSurface`).
- Live: toggling re-renders the bands behind the sheet; closing the sheet does not re-render again.
- If everything hideable is off: the existing "All Progress cards are hidden" message plus a **Show all** button.
- Changes are announced through a `role="status"` region ("Muscles hidden. 5 of 8 cards shown.").

### 3.7 Responsive

Phone-first stays the default (`.view-container` is `max-width: 600px`; bottom nav caps at 552 px). Add a **surface modifier only** — `.view-container--progress` — so Home, Train, Plans and the cockpit are untouched.

| Width | Bands |
| --- | --- |
| 320–429 | one column; chips scroll horizontally; heatmap front/back stacked |
| 430–599 | one column; 2-up stat pairs |
| 600–899 | two columns inside a band (chart + list); page max-width 760 px |
| 900+ | sticky left rail (band index + range) + scrolling bands; max-width 1080 px; bottom nav retained |

No desktop navigation model — that is an app-shell change, not a Progress change.

### 3.8 Every band must also have

| Requirement | Rule |
| --- | --- |
| Loading | fixed-height skeleton, `aria-busy`, only after 120 ms |
| Empty | one sentence naming what's missing + one action; never an empty axis |
| Error | band title + "couldn't calculate this" + Try again; never a blank section |
| Offline | analytics are local — no error state, at most "showing your on-device data" |
| Stale | "As of <date>" when the range ends in the past |
| Touch | 44 px; tap opens a sheet, never a hover tooltip |
| A11y | `role="img"` label carrying range + first/latest/change; visually-hidden data table; heatmap paired with ranked text chips |
| Colour | never the only encoder — status words and a labelled legend |
| Reduced motion | respect the global `prefers-reduced-motion` block |

None of these exist in analytics today; they belong in one shared helper, not seven views.

---

## 4. Display specification

### 4.1 Four display rules

Everything below follows from these; they are what stop the tab becoming a wall of numbers.

1. **One number per band is the headline.** Eyebrow names the question, one large value answers it, everything else is supporting text at 0.72rem or smaller. The existing hub already does this (`.ph-week__eyebrow` + `.ph-week__title`).
2. **Chart type follows the question, not the data size.**
   - *Over time* → **vertical** stacked bars (reading left → right is temporal).
   - *Composition* (share of a whole) → **horizontal** 100% stacked bars (segments read like a sentence).
   - *Ranking* → **horizontal rows** with a name column and a value column.
   - *Anatomy* → the **body diagram**, which is the only place position encodes meaning.
   - *One series against a threshold* → a **line with a corridor**.
3. **Never more than six colours in one chart.** 19 muscles cannot be a 19-colour stacked bar on a 390 px screen. Colour carries *group*, lightness carries *muscle within the group*, and everything unselected collapses to neutral grey.
4. **Nothing is discovered only by hovering.** Every value in a chart exists as text in a row, a legend, or the data table. The chart is the fast read; the rows are the truth.

### 4.2 Phone layout (390 px reference)

Content width is `390 − 2×16 = 358 px` (`.view-container` padding `--space-4`).

```
┌─────────────────────────────────────────────────────┐
│ Progress                              [Customize]   │  .hub-head (exists)
│ What changed, and why.                              │
├─────────────────────────────────────────────────────┤
│ ╭───────────────────────────────────────────────╮   │  sticky
│ │  30D    3M    1Y    All                       │   │  .pg-range
│ ╰───────────────────────────────────────────────╯   │  44px tall, top: 0
├─────────────────────────────────────────────────────┤
│ LAST 7 DAYS                          2 workouts     │  eyebrow + value
│                                                     │
│  ●   ●   ○   ●   ○   ○   ●      ╭───────────╮       │  7 dots + body
│  M   T   W   T   F   S   S      │  front /  │       │  diagram
│  ▲ today                        │   back    │       │
│                                 ╰───────────╯       │
│ 3-week streak · 5 of 6 planned                      │
├─────────────────────────────────────────────────────┤
│ SETS PER MUSCLE                        96 this month│
│ ┌ Week ┐┌ Month ┐┌ Year ┐                           │  .pg-segment
│                                                     │
│  ▇  ▇  ▇  ▇  ▇  ▇  ▇  ▇      ← stacked, 8 max      │  .pg-stack
│  ▅  ▅  ▅  ▅  ▅  ▅  ▅  ▅                            │  140px plot
│  W1 W2 W3 W4 W5 W6 W7 W8                           │
│                                                     │
│  ● Chest  ● Back  ● Shoulders  ● Arms  ● Legs       │  .pg-legend
│  ● Core   ○ Other                                   │  max 6 + Other
│                                                     │
│  Chest      ████████████░░░░░   18   typical        │  .pg-row (28px)
│  Back       ██████████████░░░   21   high           │
│  Quads      ████████░░░░░░░░░   12   low            │
│  Hamstrings ██████░░░░░░░░░░░    9   typical        │
│  Glutes     ████░░░░░░░░░░░░░    6   low            │
│                        Show all 19 →                │
├─────────────────────────────────────────────────────┤
│ MUSCLE DISTRIBUTION                                 │
│  14 workouts   9h 20m                               │  .pg-statrow
│  12,480 kg     312 sets                             │  2×2 on phone
│                                                     │
│  This period  ████████████░░░░░                     │  .pg-split (14px)
│  Previous     ██████████████░░░                     │  100% stacked
│                                                     │
│  Chest +2.1%   Back −1.4%   Quads +0.8%   …         │  delta chips
├─────────────────────────────────────────────────────┤
│ TRAINING SPLIT              ‹   This week   ›       │  .pg-stepper
│                                                     │
│      ╭───────────────╮      Chest      6            │  body + ranked
│      │  front / back │      Back       8            │  chips (2 col)
│      ╰───────────────╯      Quads      4            │
│                             Shoulders  5            │
├─────────────────────────────────────────────────────┤
│ MAIN EXERCISES                                      │
│  Bench Press        12 sessions   ↑ +2.5%           │  .pg-ex-row
│  ▁▂▃▄▅▆▇  105 kg · next 107.5 kg                    │  spark + next
│  ─────────────────────────────────────────────      │
│  Back Squat         10 sessions   → matched         │
│  ▁▃▄▄▆▆▇  142.5 kg · next 145 kg                    │
├─────────────────────────────────────────────────────┤
│ BODY                                                │
│  78.4 kg   ▼ 0.3 this month                         │
│  [ bodyweight chart — existing bodyWeightChartSVG ] │
│  Waist 82 · Chest 104 · Arm 38   All 14 sites →     │
│  ┌────┐┌────┐┌────┐  + Add photo                    │  .pg-photo-strip
│  └────┘└────┘└────┘                                 │
├─────────────────────────────────────────────────────┤
│ REPORTS                                             │
│  Monthly Report →        Year in Review →           │
└─────────────────────────────────────────────────────┘
```

### 4.3 Tablet and desktop

Two things change, nothing else:

```
≥600 px                                   ≥900 px
┌───────────────────────────────┐         ┌──────────┬──────────────────────────┐
│ 30D 3M 1Y All                 │         │ Progress │ 30D 3M 1Y All            │
├──────────────┬────────────────┤         │          │                          │
│ stacked bars │ rows           │         │ Last 7d  │ LAST 7 DAYS              │
│ (60%)        │ (40%)          │  sticky │ Sets     │ ...                      │
├──────────────┴────────────────┤  rail   │ Dist.    │ SETS PER MUSCLE          │
│ 4-up stat row (not 2×2)       │  (220px)│ Split    │ chart + rows side by side│
└───────────────────────────────┘         │ Body     │ ...                      │
                                          └──────────┴──────────────────────────┘
```

- Bands become a two-column grid internally (chart + rows), never a wider single chart. Charts cap at 480 px so a bar never becomes a 40 px-wide slab.
- The stat row goes 4-up at ≥520 px (matches the existing `.an-volume-summary` breakpoint).
- Bottom nav stays. No desktop navigation model — out of scope by design.

### 4.4 Band-by-band layout

Each band is one `.pg-band` card. Header pattern is identical everywhere, so the eye learns it once.

| Element | Class | Size / token |
| --- | --- | --- |
| Question label | `.pg-band__eyebrow` | 0.62rem, 800, uppercase, `letter-spacing .08em`, `--text-muted` |
| Band title | `.pg-band__title` | 0.95rem–1.10rem, 800, `--text-primary` |
| Headline value | `.pg-band__value` | 1.45rem, 800, `tabular-nums` (one per band) |
| Supporting line | `.pg-band__sub` | 0.72rem, `--text-muted` |
| Range/grouping chips | `.pg-range` / `.pg-segment` | 44 px tall, `aria-pressed`, pill radius 999px |
| Chart frame | `.pg-chart` | `--bg-card`, 1px `--border-default`, radius 14px, padding 14px 12px |

| Band | Layout | Charts | Touch targets |
| --- | --- | --- | --- |
| 0 Filter | text chips `All · Strength · Endurance` under the range bar; hidden when only one modality exists | none | 44 px, text-only, 2 px active underline |
| 1 Pulse | 2 columns: 7-day rail + body diagram; strength and run counts beneath | rail + existing heatmap | day cell 51×56 (whole cell tappable); body region ≥24 px via `.hit-target` |
| 2 Balance | header → hybrid split bar + 5-week trend → inline legend. One idea, ~200 px | 100 % horizontal + sparkline | bar row 44 px |
| 3 Muscles | header → grouping chips → stacked chart → legend → body diagram (`‹ week ›`) → **distribution bars vs previous period + delta chips** → ranked rows (top 5 + “Show all 19”) | stacked vertical + body map + 100 % horizontal + rows | chips 44 px; each bar 18 px wide but its *column* is tappable (≥44 px via gap); rows 44 px |
| 4 Main exercises | header → up to 5 rows (name · sessions · delta · spark · next) | sparkline 56×18 | whole row 56 px → drilldown |
| 5 Endurance | header → distance bars → stat row (runs · time · avg pace · longest) → consistency strip → “All 30 running metrics” | vertical bars + dot strip | link rows 44 px; strip cells tappable |
| 6 Body | header → weight value + delta → weight chart → 4 key sites + “All 14” → photo strip | existing line chart | site buttons 44 px; photo thumb 72×72 |
| 7 Fasting | header → 14 fast-duration bars against the goal → stat row (avg · streak · longest) → “Fasting analytics” | horizontal bars + goal line | rows 44 px |
| 8 Reports | two full-width rows | none | 44 px |

Band 6 does **not** render all 14 sites expanded. It shows the four the athlete measures most (waist, chest, arm, thigh) plus "All 14 sites →". Each of those four cells opens **Measures** on that site; the screen's Trends block is the single-site explorer (site select, 30D/3M/1Y/All, shared SVG chart, exact readings table). That is how "all this data" fits without a nine-screen scroll.

### 4.5 Chart geometry

| Chart | Geometry | Labels | Overflow |
| --- | --- | --- | --- |
| 7-day rail | 7 equal columns, 358/7 ≈ 51 px; dot 14 px, today ringed 2 px | single-letter weekday under, date only in the sheet | never |
| Stacked sets chart | plot 140 px tall; bar 18 px wide, 6 px gap; max **8** buckets on phone, 12 at ≥600 px | bucket label under each bar (W1…, Jan…), y-axis **omitted** — every value is in the rows below | horizontal scroll, newest pinned right, auto-scrolled to the end |
| Ranked muscle rows | row 28 px; name column 78 px; track flexible; value 34 px right, `tabular-nums` | name truncated with ellipsis; status word after value (`typical`/`low`/`high`) | top 5, then disclosure for 19 |
| Distribution bars | 2 rows × 14 px, radius 3 px; segments `<3%` merged into `Other` | legend above, deltas below | never |
| Body diagram | existing SVG geometry; no changes | `aria-label` names top 3 muscles | front/back stack at <340 px |
| Exercise sparkline | 56×18, `aria-hidden` (row already states the numbers) | — | clipped, never scrolls |
| Weight chart | existing `bodyWeightChartSVG`, non-compact | existing | existing |
| Photo strip | 72×72 thumbs, radius 10 px, horizontal scroll, snap | date under each | horizontal scroll |
| Hybrid split bar | 1 row × 14 px, 100 % stacked, 2 segments (strength / endurance) | inline legend: “Strength 54 % · Endurance 46 %” | never |
| Endurance run/walk bars | grouped, never stacked: run bar 11 px + walk bar 6 px per bucket, 140 px plot, max 8 buckets | bucket label under each group, no y-axis | horizontal scroll > 8 buckets |
| Run consistency strip | 12 weeks × 7 dots, 8 px dots, 2 px gap | `aria-label` only | tap a week → that week's runs |
| Fasting duration bars | 14 rows × 8 px horizontal bars + dashed goal line | day label left, duration right, goal label at the line | never |

Axis rule: **no chart in this tab draws a numeric y-axis.** Every value is available in an adjacent row or the data table, which is both more accessible and far cheaper to render. The only exception is the bodyweight chart, which keeps the existing axis because a trend needs scale.

### 4.6 Colour

Two separate systems, deliberately:

**Heat (anatomy)** — keep `HEAT_BUCKETS` exactly as-is. Orange `#ff7a1a` at 28/50/74/96 % opacity, `#22364f` base, `#dbe4ef` base in light mode. Already shipped, already paired with text chips on Home. Do not fork.

**Categories (muscle groups)** — six hues from existing tokens, so no new palette is introduced:

| Group | Token | Muscles | Light-mode override |
| --- | --- | --- | --- |
| Chest | `--color-cyan` `#22d3ee` | chest, upper_chest | `#0e7490` |
| Back | `--color-blue` `#3b82f6` | lats, upper_back, traps, erectors | `#1d4ed8` |
| Shoulders | `--color-violet` `#8b5cf6` | front/side/rear delts | `#6d28d9` |
| Arms | `--color-green` `#10b981` | biceps, triceps, brachialis, forearms | `#047857` |
| Legs | `--color-amber` `#f59e0b` | quads, hamstrings, glutes, adductors, calves | `#b45309` |
| Core | `--color-orange` `#ff6b00` | core | `#c2410c` |

Within a group, the 2–5 muscles differ by lightness steps of the same hue (100 / 82 / 66 / 52 %), so the legend reads "these are all back" before it reads individual muscles. Unselected and `Other` use `--text-muted` at 25 %.

Every categorical chart is paired with named rows, so colour is never the sole carrier. A colour-blind reader can use the rows and the data table.

### 4.7 Density and truncation

- Max **8 bars**, **6 legend series**, **5 rows** before a disclosure, **4 stats** in a stat row, **4 measurement sites** on the band.
- Type floor is `--text-xxs` (0.62 rem ≈ 10 px) for eyebrows and legend only. Nothing in this tab is smaller than the app already ships. Body text never below 0.72 rem.
- Long names truncate with ellipsis; they never shrink and never wrap to three lines. The full name is in the sheet and in the `aria-label`.
- Numbers are `tabular-nums` (already global for stat classes) so changing a range doesn't jitter the layout.
- Each band is its own scroll unit of attention; total tab height on a phone should land around 3.5–4 screens of content. If a phase pushes past that, something belongs behind a disclosure.

### 4.8 The five states, visually

| State | Look | Height |
| --- | --- | --- |
| Loading | 3 rounded `--overlay-sm` blocks at the exact final geometry (chart area, one title line, two row lines). No spinner, no shift when data lands | reserved |
| Empty | Chart area collapses to 72 px: one sentence + one button ("Log a workout") | 72 px |
| Error | 96 px: "Couldn't calculate this" + reason in a disclosure + **Try again** | 96 px |
| Offline | No visual change. Optional 0.62 rem footnote: "Showing your on-device data." | 0 |
| Stale | `.pg-stale` pill, top-right of the band: "As of 12 Nov" | 0 |

The skeleton must match final geometry — a layout jump on every Progress visit is the fastest way to make an overhaul feel worse than what it replaced.

### 4.9 Data table alternative

Every chart gets a `<details>` "Show data" immediately beneath it: a compact table (0.65 rem, `tabular-nums`, 2–3 columns, horizontally scrollable on phone). It is the accessible equivalent, the print/export format, and the escape hatch when a user wants exact numbers. One shared renderer, `dataTableDisclosure(columns, rows, caption)`.

### 4.10 Class naming

All new CSS is `pg-*` in a new `css/progress.css` (no additions to the 2,122-line `analytics.css`, no `!important`):

`pg-band` · `pg-band__head` · `pg-band__eyebrow` · `pg-band__title` · `pg-band__value` · `pg-band__sub` · `pg-range` · `pg-segment` · `pg-chart` · `pg-stack` · `pg-stack__plot` · `pg-stack__bar` · `pg-legend` · `pg-legend__item` · `pg-rows` · `pg-row` · `pg-row__name` · `pg-row__track` · `pg-row__bar` · `pg-row__value` · `pg-statrow` · `pg-stat` · `pg-split` · `pg-split__seg` · `pg-stepper` · `pg-chips` · `pg-chip` · `pg-ex-row` · `pg-photo-strip` · `pg-photo` · `pg-stale` · `pg-skeleton` · `pg-state`

Names are deliberately distinct from `.ph-*` (the current hub) so the two can coexist during rollout and the old hub can be reverted without a CSS conflict.

### 4.11 Mockups

Hand-built in HTML using the real tokens from `css/styles.css` — no framework, no images, no approximation of the palette. The HTML is the editable source; the PNGs are 2× captures.

| File | Shows |
| --- | --- |
| `docs/mockups/progress-mockups.html` | All four frames, side by side — the source |
| `docs/mockups/progress-phone-top.png` | Range bar · Last 7 days (rail + body diagram) · Sets per muscle (grouping chips, stacked chart, legend, ranked rows) |
| `docs/mockups/progress-phone-bottom.png` | Muscle distribution (2×2 stats, this-vs-previous bars, deltas) · Training split (week stepper, body map, ranked list) · Main exercises (delta, sparkline, next weight) · Body (weight, measurements, photo strip) · Reports |
| `docs/mockups/progress-customize-sheet.png` | Customize sheet: every card has a switch (Pulse and Balance included), drag handles, two sub-toggles, a no-data note, and the shown count |
| `docs/mockups/progress-phone-focus.png` | The domain filter in the **Strength** state: Balance and Muscles expanded, Endurance collapsed to a 50 px summary row |
| `docs/mockups/progress-phone-endurance.png` | Endurance band: distance bars, pace/longest stats, 12-week run-day strip, links to the 30-metric screen |
| `docs/mockups/progress-phone-fasting.png` | Fasting band: 14 fasts against the goal line, adherence/streak/longest stats, link to fasting analytics |
| `docs/mockups/exercise-detail-phone.png` | Metric switcher · e1RM chart with PR marker · Set records table · History |
| `docs/mockups/progress-tablet.png` | Sticky section rail, two-column bands, 4-up stat row |

Two caveats, stated so nobody over-reads them:

- These are **design direction, not a pixel spec**. Where a mockup and the tables above disagree, the tables win — they carry the token sizes, geometry and behaviour.
- The body diagram in the mockups is a **schematic placeholder**. The shipped version uses the existing `body-paths.js` geometry, which is far more anatomical and is already vendored with its licence.

---

### 4.12 Band 5 — Endurance

Running is not a footer link in this app; it is half the product. The band answers one question and links to the existing depth.

| | |
| --- | --- |
| Headline | **Run distance only** for the selected range, with the change vs the equal-length previous period |
| Chart | Grouped bars per bucket: run distance in blue, walk distance in muted grey beside it — never stacked, because a stack reads as a total |
| Stat row | Runs · run time · average pace · longest **run** |
| Walks | Their own quieter row: walk count and walk distance, never added to the run figure and never given a pace |
| Consistency | 12-week strip: a filled cell is a run day, a hollow cell is a walk-only day |
| Secondary metric | Pace is a **stat with a delta**, not a second line on the bars — two units on one axis is the classic unreadable chart |
| Links | "All 30 running metrics →" (existing `RUNNING_METRICS` screen) · "Run history" |
| Data | per-session `type` from `runSessionsForDay`, not the day-level `runDaySummary.type` (§7.2) |
| Empty | "No runs in this period" + Log a run / Import a FIT file |

What this band deliberately does **not** do: reproduce VDOT, HR zones, cadence, training effect or race projections. Those already have a home, they are `progress-landing`'s "advanced" tier, and duplicating them here would create the competing surface the roadmap forbids. The band is a summary plus one tap.

### 4.13 Band 7 — Fasting

Fasting is a **behaviour**, not a training metric, so it gets its own band rather than being mixed into Body. It appears only when the module is on and there is history.

| | |
| --- | --- |
| Headline | Average completed fast against the athlete's own protocol goal |
| Chart | Last 14 fasts as horizontal duration bars with a dashed goal line. Duration against target is the honest chart; a smooth line implies a trend the data can't support |
| Stat row | Adherence (completed ÷ target) · current streak · longest |
| Links | “Fasting analytics →” (score ring, stages, trends, correlations, calendar, achievements — all existing) |
| Data | `fasting-calcs.js` (525 lines) already owns duration, goals, streaks and calendar; `fasting-achievements.js` owns badges |
| Module gate | Hidden entirely with the Fasting module off — no empty shell, no dead link |
| Empty | “No completed fasts in this period” + Start a fast |

**Copy rule, non-negotiable:** this band reports **elapsed time against the athlete's own goal**. No autophagy, fat-loss, hormone or medical claim, and stage names are labelled as elapsed-time phases, not physiological outcomes. `fasting-insights.js` gets reviewed against this rule in the fasting phase — it is the one place in the app where a plausible-sounding sentence could become a health claim.

### 4.14 Why endurance and fasting are summary bands, not rebuilds

`RUNNING_METRICS` already carries ~30 metrics and `view-fasting.js` + `fasting-calcs.js` already carry score, stages, trends, correlations, calendar and achievements. Rebuilding either inside the new dashboard would create exactly the competing surface the roadmap forbids, and would double the maintenance of every formula.

So each gets one band that answers its single question and one link into the existing depth. The band owns **no new maths**: distance, pace eligibility, load and fasting durations all come from the modules that already own them. That is also why these two phases are rated low risk — they can ship without touching a single calculation.

The one thing the fasting band *does* own is its **copy rule** (§4.13): elapsed time against the athlete's own goal, never a health claim.

## 5. Exercise detail upgrade

Two additions, both small, because the model already carries the data.

**1. Metric switcher (closes #7).** `buildExerciseDetailModel` already stores per session: `e1rm`, `volume`, `reps`, `holdSeconds`, `distanceM`, `top`. Switching the chart metric is selecting a different field — no new model. Controls: `Weight · e1RM · Set volume · Session volume · Reps` (+ `Time` / `Distance` for holds and carries).

**2. Set Records (closes #8).** New reducer over one lift's working sets:

```ts
// for each target in [1, 3, 5, 8, 10, 12]:
//   heaviest set whose reps >= target, with date + activityId for tap-through
// bodyweight lifts  → most reps in a set, most reps in a session
// holds             → best time     carries → best distance
```
The definition is printed above the table. Tap a record → the workout where it happened (`activityId` already exists on every session row).

---

## 6. Range control

`js/analytics/ranges.js` (pure):

```ts
type RangeId = '30d' | '3m' | '1y' | 'all';
resolveRange(id, today) → { id, startISO, endISO, isPartial, label }
```
- `isPartial` is true for the live week/month — comparisons against it are **elapsed-length matched**, never full-period.
- Labels are real date spans, never "3 months ago".
- **No cap function exists.** Every range is available to every user. This is the FOSS invariant, and the guard test in §8.2 fails if one is reintroduced.
- Range state is a module variable (matching `view-bodyweight.js`'s `rangeDays`), not persisted — no schema change, no stale preference.

---

## 7. Warm-ups and volume — the invariant

**Requirement: warm-up sets never contribute to total volume.** The codebase already follows this; the plan pins it so new surfaces cannot break it.

| Fact | Evidence |
| --- | --- |
| `isWarmupSet(s)` covers `type:'W'` and the legacy `isWarmup` flag | `set-utils.js` |
| `isValidWorkingSet(s)` = completed **and not warm-up** and positive value | `set-utils.js` |
| `dayVolume()` excludes warm-ups by default | `set-utils.js` |
| `strengthDayStats`, `exercise-history`, `strength-detail`, `strength-volume-detail`, `session-compare`, `profile-stats` all filter first | verified call sites |
| **`setVolume()` does NOT filter warm-ups** — it assumes the caller did | `set-utils.js` |

**The hazard:** a new reducer written as `sets.reduce((n, s) => n + setVolume(s), 0)` silently includes warm-up tonnage. Every reducer in this plan must filter with `isValidWorkingSet()` first.

**Two cleanups that belong in P2:**
1. Delete the dead `renderWeeklyVolumeDetail` in `views/view-progress.js` — it is exported but imported nowhere, and it sums `setVolume` over `isCompletedSet` sets, which counts warm-ups. Dead code that is wrong is a future bug.
2. Add a guard test that fails if any analytics module calls `setVolume` without an `isValidWorkingSet` filter in the same scope.

This also settles the sets-per-muscle question: **warm-ups are excluded**, diverging from Hevy and saying so.

### 7.2 Runs and walks are two different activities

**Rule: a walk never contributes to a run total or a run pace.** Distance walked is reported on its own line; it is never summed into run distance, never averaged into run pace, and never counted as a run.

This is a correction, not a cosmetic change. The stored data already distinguishes them (`gps-tracker.js` writes `type: 'walk' | 'run'`, and `activities/model.js` labels it), but three places lose the distinction:

| Where | What happens today | Fix |
| --- | --- | --- |
| `runDaySummary` (`state/run-sessions.js:245`) | Collapses the whole day to `type: 'walk'` **only if every session is a walk**; a run + walk day reports `'run'` and the walk's distance merges in | Add per-shape totals — `runDist`, `walkDist`, `runCount`, `walkCount` — and keep `dist` as the combined figure for surfaces that legitimately want distance moved |
| `RUNNING_METRICS` (`analytics/running-detail.js`) | `weekly-distance`, `four-week-distance`, `total-distance`, `weekly-run-count`, `longest-run` all say *"every dated run and walk"* | Re-point distance and run-count metrics at `runDist` / `runCount`; add walk metrics rather than hiding them |
| FIT import (`portability/import-fit.js`) | Sets no `type` at all, so an imported walk becomes a run | Map walking/hiking sports to `type:'walk'` on import |

Two consequences to be honest about:

1. **Existing numbers will go down.** Anyone with mixed run/walk history will see a smaller weekly and lifetime distance. That is the point — but it must be stated in the Running analytics "How this is calculated" disclosure and in release notes, not discovered as a mystery.
2. **Walks are not in the strength/endurance split either.** The split is measured in sRPE or minutes (`hybrid-balance.js`), and on the minutes fallback an unrated 45-minute dog walk would count the same as a hard 45-minute session — it would outvote real training. So the split counts **runs only**, and the excluded walk time is shown beneath the legend as `Not counted: 2 h 10 m walking`, the same "not in run totals" language the Endurance band uses. Nothing is hidden; it is simply not allowed to move a training-share number.

   This is a change to `dailyLoadBreakdownTimeline` (additive `walkMin`/`walkLoad` fields) and therefore also to the Home hybrid card, which reads the same model. That is deliberate: one definition of the mix, everywhere.

Implementation shape: **additive fields, not a rewrite.** `dist` keeps its meaning so the cockpit, History and share cards are untouched; everything that says "running" moves to `runDist`. Nothing stored is migrated or rewritten — the sessions already carry the truth.

---

## 8. Data, performance, and the no-paywall guarantee

### 8.1 Data work — almost none

| Need | Source | Status |
| --- | --- | --- |
| Sets per muscle by week/month/year | `muscleCreditsForExercise` + `indexSlotsByDate` | data exists — add a reducer |
| Period vs previous period | `collectCalendarWeek` over two windows | data exists |
| 7-day body graph | `loggedSessionsByDate` + heatmap | data exists |
| Main exercises | `exercisePerformanceHistory` | data exists |
| Metric switcher | `buildExerciseDetailModel` per-session fields | data exists |
| Set records by rep target | one walk over one lift's sets | ~40 lines |
| **Progress photos** | nothing | new: state metadata + IDB blobs |

No Web Worker, no event store, no IndexedDB rollup cache. Every reducer is a single pass over deduplicated dated slots (~20,800 sets at the perf-baseline corpus) — milliseconds. The repo's rule is to optimise demonstrated bottlenecks only. IndexedDB appears **only** for photo blobs, because they must never enter `localStorage`.

### 8.2 The no-paywall guarantee (a test, not a promise)

`tests/progress_no_paywall.test.js`:
- fails if any file under `js/analytics/` contains user-facing `premium` / `upgrade` / `unlock` / `pro plan` / `paywall` / `subscription` / `entitlement` strings;
- fails if `ranges.js` exports anything that can cap a range;
- fails if `css/progress.css` defines a locked/blurred chart style;
- fails if any band hides data behind a capability check.

Same ratchet pattern the repo already uses for touch-target exemptions: the list of allowed restrictions is empty and may only ever stay empty.

### 8.3 Performance budget

| Metric | Budget |
| --- | --- |
| Progress hub paint (data on screen), warm | ≤ 150 ms; ≤ 400 ms cold |
| Range switch 30D ↔ 3M | ≤ 100 ms |
| Range switch 1Y / All | ≤ 300 ms; skeleton after 120 ms |
| Hub DOM growth, light vs 5-year corpus | ≤ 1.20× (global guard stays 1.35×) |
| Heatmap nodes | ≤ 450 |
| Long tasks while scrolling | none > 50 ms |
| Cold-boot penalty with Progress unopened | 0 ms |

---

## 9. Progress photos (in scope)

Follows the roadmap rule already written down: *"Progress photos never enter `appState` or `localStorage` as base64. State holds metadata; blobs live in IndexedDB; deleting a record deletes its blob."*

### 9.1 Storage

```
appState.progressPhotos: [{            // schema v15 → v16, additive
  id, date, note?, width, height, bytes, updatedAt
}]

IndexedDB HybridTrainingDB v3         // additive upgrade, existing stores untouched
  store 'photos' (no keyPath)         // value = the Blob, key = 'photo:<date>'
```

- v15→v16 is a default-empty array, validated like every other additive  step.
- IDB v2→v3 follows `js/db.js` discipline: create stores inside `onupgradeneeded`, never delete `runMaps` or `routes`, and reject (don't hang) when an upgrade is blocked by another connection.
- Deleting all app data deletes the `photos` store too (`clearRouteDatabase` precedent).

### 9.2 Capture and display

- Input: `<input type="file" accept="image/*" capture="environment">` — works in the PWA and the Android WebView; camera permission is the OS's.
- Downscale to ≤1200 px longest edge via canvas, encode JPEG q≈0.82 (~150–250 KB each) **before** storing. Never store the original camera file.
- One entry per date, optional — "as much or as little as necessary". **One photo per
  date** (execution decision D2): the id *is* the date, so saving a second photo for
  the same day REPLACES the first in one step (the viewer's Replace button is the
  explicit action; there is no second confirmation on top of it). Multi-photo-per-date
  is deferred, not forbidden — the key is unchanged, so it is a later additive change.
- The date entry, not a bare strip, is the record: a photo is saved together with that
  day's weight, entered body fat and tape sites on **Measures**, and the Body band's
  strip is a preview into it. Measures is reached from the Body band **and** from a
  quiet Progress footer link, because the band only renders when it has data.
  Measures' Trends block charts ONE site (or entered body fat) over 30D/3M/1Y/All;
  its range is leaf-local, and the Body band's four site cells deep-link to it.
- Grid: newest first, date chips, tap → full-screen; pick a second date → side-by-side
  compare. There is no photo SHARE card: the app's share path draws a summary from
  band models, and a photo share would need its own canvas path.
- Delete: explicit confirm naming it **permanent** (blob and metadata go together). Photos are the one thing in this app with no Undo — say so.
- Quota: **not implemented.** No `navigator.storage.estimate()` read exists in the app;
  the upload downscales instead, and the export archive is the backup.

### 9.3 Export and backup — the part that must not be hand-waved

Verified facts that shape this:
- Full JSON export is state + GPS route records, written as **text** (`js/portability/auto-backup.js`, `export-service.js`).
- Android sets **`android:allowBackup="false"` by design**, so OS backup does not cover WebView IndexedDB.
- There is no zip library in the project.

Therefore, without deliberate work, **photo blobs would be the only user data with no backup path.** Plan:

1. **No new dependency.** A store-only ZIP writer (`js/portability/zip.js`, ~80 lines: local headers + central directory + CRC32, method 0) — JPEGs are already compressed, so deflate buys nothing.
2. **`Export photos`** produces `openhybrid-photos-<date>.zip` containing `photos/<date>-<id>.jpg` + `manifest.json` (the metadata array).
3. **`Import photos`** reads the manifest, restores metadata, and writes blobs; idempotent by photo id.
4. **Automatic backups:** state it plainly in Settings — "Automatic backups include your training data; photos are exported separately." Extending the Android bridge to write the zip automatically is a follow-up, not a P5 blocker.
5. Photo **metadata** stays in the normal JSON export, so a state restore never loses the list even if blobs must be re-imported.

---

## 10. Phases

Eight slices, each shippable, each ending green (`npm run verify`).

| Phase | Ships | Risk |
| --- | --- | --- |
| **P1 — Range + Pulse** | sticky 30D/3M/1Y/All; band 1 with heatmap + both-modality counts; shared band-state helper; surface modifier for ≥600 px; **catalogue swap with `LEGACY_PROGRESS_CARD_ALIASES`**; conditional-vs-hidden copy in the sheet | Low |
| **P2 — Balance** | band 2: hybrid split (sRPE or minutes) + pace-matched trend + muscle distribution + previous-period ghost + 2×2 stats | Low–Medium |
| **P3 — Muscles** | band 3: period × grouping, multi-select, stacked chart, body diagram + week stepper, ranked rows; warm-up invariant guard; delete dead `renderWeeklyVolumeDetail` | Medium |
| **P4 — Exercises** | band 4 with next-time suggestion; metric switcher; set records by rep target | Medium (touches drilldown) |
| **P5 — Endurance** | band 5: **run/walk split** (`runDist`/`walkDist`/counts on `runDaySummary`, re-point 5 `RUNNING_METRICS` definitions, map FIT walking sports), grouped bars, pace delta, consistency strip, links into the 30-metric screen | Medium — changes existing metric definitions |
| **P6 — Body + photos** | band 6 compose; photo capture/downscale/compare/delete; v16 + IDB v3; ZIP export/import; quota display | **Highest** — new storage + data loss |
| **P7 — Fasting** | band 7: 14-fast duration chart vs goal, adherence, streak; module gate; copy review of `fasting-insights.js` for health claims | Low–Medium |
| **P8 — Share, customize, hardening** | share any band; **customize reorder (drag + keyboard Move up/down), `bodyPhotos` / `musclesBody` sub-toggles, Reset**; a11y sweep; all-time performance pass; offline + reduced-motion verification | Low |

Sequencing rationale: P1 is the cheapest visible win and proves the shared chrome; P2 is the flagship and lands before the Hevy-parity block so the app's own thesis is established first; P5 and P7 are read-only summaries of surfaces that already work, so they can move earlier if wanted; P6 is the only phase that can lose data, so it is last among the features.

Every phase must keep the existing `scripts/progress-hub-browser-check.mjs` contracts (`data-action`, `data-context`, 44 px, 320/390/412, light/dark) and classify any new metric in `metric-tiers.js` + inventory it in `analytics/metric-inventory.js` — unclassified metrics default to `advanced`, which is not permitted on the landing, so a missed id fails the guard by design.

---

## 11. Strength Level — not built

Strength Level is **not** a Hevy Pro feature, so it is not required by this brief; it is also the one thing we cannot copy honestly.

It compares a lifter against an age/weight/sex population. That requires licensed reference data. Without it, a percentile is fabricated, and the roadmap already defers it for exactly this reason. Bench/squat/deadlift-only coverage would also be a poor fit for an app whose catalogue is 5,700 exercises.

The honest substitutes already exist here and are better fits: **projections** (`analytics/views/view-projections.js` — milestone ETAs from your own trend) and **progress against your own history** in the exercise drilldown. If population comparison is ever wanted, the precondition is a licensed dataset plus a recorded product decision — not code.

---

## 12. Acceptance and tests

| Layer | Assertion |
| --- | --- |
| Unit | Reducers deterministic; archived `arch:` weeks, `session:` one-offs and two-sessions-on-one-date each count exactly once |
| Unit | **Warm-up sets contribute 0 to volume and 0 to sets-per-muscle** — a fixture with warm-ups must produce identical totals to the same fixture without them |
| Unit | Muscle credits match `volume-guide.js` for the same week — one definition, two surfaces |
| Unit | Set records agree with `strength/records.js` semantics for the same lift |
| Unit | Period-vs-previous comparison is equal-length and date-matched |
| Guard | New calendar modules added to `analytics_calendar_guard.test.js`; no `currentWeek` reads |
| Guard | `progress_no_paywall.test.js` — no gating, no range cap, no locked style |
| Guard | Every new metric classified in `metric-tiers.js` and inventoried |
| Guard | `normalizeUi` never drops a saved choice it can alias; `order` normalisation appends new bands; hiding every hideable card is refused (one stays visible) |
| Render | Bands render through a mini-DOM fixture; all five states render |
| Browser | Extend `progress-hub-browser-check.mjs`: band order, range switching, tap-to-sheet, 320/390/412, light/dark, 44 px, no horizontal overflow, empty + offline; **each customize toggle hides exactly one band and survives reload; keyboard reorder works without a pointer** |
| Migration | v15→v16 additive and reversible; IDB v2→v3 preserves every route; deleting a photo removes its blob |
| Photos | Downscale caps dimensions and bytes; ZIP round-trips (export → import → identical metadata + blob count); delete purges |
| Perf | §8.3 budgets measured on the light and 5-year corpora |

Never weaken an existing test or browser check to make a phase pass.

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Warm-up tonnage leaking into a new total | `isValidWorkingSet` filter mandated + guard test + a fixture that proves parity |
| Double-counting archived/one-off/two-on-one-date sessions | every reducer consumes `indexSlotsByDate`; 33-set two-slot fixture |
| Program-week vs calendar-week drift | `CALENDAR_CORE` guard |
| Heatmap colours diverging from Home | import `HEAT_BUCKETS`; never redefine |
| Drilldown regression in P4 | `analytics_views_render.test.js` + PR parity fixture |
| **Run/walk separation changes existing numbers** | Method disclosure + release note; additive `runDist`/`walkDist` keep `dist` working; a fixture proves a mixed day's run totals exclude the walk |
| **Photo blobs with no backup** | ZIP export/import in P5; explicit copy in Settings; metadata still in JSON export |
| Photo blobs leaking into localStorage/export | metadata-only in state; blob deletion tested |
| Quota exhaustion | downscale before store (no usage display — not implemented) |
| Customize sheet churn hiding wrong cards | `normalizeUi` drops unknown ids; retain legacy ids |
| Hub browser check breaking | extend, don't replace; keep every `data-action`/`data-context` |
| Scope creep into visual imitation | clean-room: our geometry, tokens and copy |

---

## 14. Decisions

Settled 2026-11-23. The first four were the execution blockers.

| # | Question | Decision | Why |
| --- | --- | --- | --- |
| 1 | Exclude warm-ups everywhere, not just volume? | **Yes — volume, sets-per-muscle and every new total.** | Warm-ups are preparation, not training evidence. Hevy counts them; we deliberately do not, and the band says so. One rule, every surface. |
| 2 | Muscle credit `1 / .5 / .25` or Hevy's `1 / .5`? | **Keep `1 / .5 / .25`.** | It is already the app's definition in `volume-guide.js` and `muscle-load.js`. Changing it would move every muscle-load number for cosmetic parity. The method note states the weights. |
| 3 | Photos in automatic Android backups now? | **No — manual ZIP export in this phase; automatic is a parked follow-up.** | `HybridAutoBackupBridge` writes text; photos need a binary bridge method, rotation semantics and a real-device test that cannot be verified here. Settings states the limitation plainly. |
| 4 | Multiple photos per date? | **One photo per date.** `id = photo:<YYYY-MM-DD>`. Adding a second offers *Replace* or *Cancel*. | Comparison, the strip and export all stay unambiguous, and re-import is idempotent by date. Deferred, not forbidden — `id` remains the key, so multi-per-date is a later additive change. |
| 5 | Where is the warm-up exclusion stated? | **On the band** (method note) *and* in the shared "How this is calculated" disclosure. | It is a visible divergence from the app people compare us to; burying it in a footer would look like an oversight. |
| 6 | Walks in the hybrid Balance split? | **Excluded from the split and reported as "not counted" time** (§7.2). | On the minutes fallback an unrated walk would outvote a hard session. Shown, not hidden, and never allowed to move a training-share number. |
| 7 | Tablet/desktop layout scope | **Still open** — not a blocker. | "Two columns at ≥600 px, sticky rail at ≥900 px" is the plan; a desktop navigation model would be an app-shell change and needs its own decision. |

---

## Appendix — do-not list

- Do not add an entitlement check, a range cap, a locked state or an upgrade prompt.
- Do not let a warm-up set reach any volume or sets total.
- Do not call `setVolume()` without an `isValidWorkingSet()` filter.
- Do not compute a percentile, strength level or population rank.
- Do not re-derive muscle credits, e1RM or PRs; call the owning module.
- Do not fork heat buckets or the bodyweight chart.
- Do not store photo bytes in `appState` or `localStorage`.
- Do not hide, blur or delete out-of-range data.
- Do not add a chart library, worker or event store before a measured budget needs one.
- Do not copy Hevy's visuals, copy, colours or assets — parity of function only.
