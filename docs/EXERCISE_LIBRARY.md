# Exercise catalogue

openHybrid has two catalogue layers:

| Layer | Source | Licence | Media |
|---|---|---|---|
| **Core** (`CORE_EXERCISES`) | Original openHybrid text | AGPL-3.0-only | None |
| **Extended** (`OPENGYM_EXERCISES`) | openGym catalogue metadata (names/ids/muscles/equipment) | AGPL-3.0 / MIT | None |

## What is imported

`scripts/import-opengym-catalogue.mjs` reads a local openGym checkout and imports **metadata** that:

- has `textSource: "opengym"` (openGym-authored, AGPL-3.0) or
  `textSource: "exercisedb"` (ExerciseDB v1 metadata distributed by openGym under MIT);
- has a non-empty name;
- maps to a real openHybrid muscle/equipment/movement value.

It **excludes**:

- entries with no name/source;
- **all instructional text and descriptions** — imported form guidance was
  unreviewed, so only the reviewed core catalogue ships guidance;
- **all media** — openGym’s stills and animations are licensed to Gym visual and are not AGPL. Nothing under `catalogue/media/` is read or copied.

The generated file also carries `OPENGYM_ID_NAMES`, a complete source-id → display-name
map (including ids whose text entry was merged with a duplicate name). The openGym plan
importer (`js/programs/opengym-plan.js`) uses it to resolve plan exercises; each imported
exercise keeps its sets, reps, starting weight and rest in the custom program's
`prescriptions` sidecar, which the cockpit and rest timer read.

The generated file is `js/exercises/opengym-catalogue.js`; do not edit it by hand.

## Regenerate

```bash
# From a local openGym checkout:
node scripts/import-opengym-catalogue.mjs \
  --source /path/to/openGym/catalogue/exercises

npm run precache:gen
npm test
```

The importer reports total entries read, imported count, core duplicates, import duplicates,
missing/no-muscle rows, counts by text source, and the output size.

## Mapping rules

- **Name** — title-cased; parentheses become an em dash so variants keep distinct search keys
  (`Bridge (on Knees)` → `Bridge — On Knees`).
- **Equipment** — mapped to `EQUIPMENT` (e.g. `leverage machine` → `machine`, `ez barbell` → `ezBar`,
  `body weight` → `bodyweight`). Unknown equipment becomes `other`.
- **Muscles** — `target` becomes the primary muscle at `1`; `secondaryMuscles` become `0.25`.
  A missing target falls back to the openGym body part.
- **Movement/category** — keyword/body-part mapping into `MOVEMENT_PATTERNS` and
  `EXERCISE_CATEGORIES`. Mobility/stretching/yoga/rehab entries become `conditioning`/`mobility`
  and are not volume-eligible.
- **Review status** — imported entries get `difficulty: null` and `safetyNotes: []`.
  They must not pretend to be reviewed. The existing reviewed core remains the 157-entry layer.
- **Browse order** — with no search query, filtered browse shows the reviewed core first, then the
  imported text catalogue alphabetically. A muscle/equipment filter must not bury a common lift
  under thousands of alphabetically earlier stretches.

## Media

Media is deliberately out of scope until there is a licence-compatible source. The audit found:

- **Free Exercise DB** (`yuhonas/free-exercise-db`) — public-domain/Unlicense, 800+ exercises with two
  stills each. Not true animations; could be crossfaded.
- **Wikimedia Commons** — real demo videos under CC licences, but sparse and inconsistent; needs
  per-file attribution and manual review.
- **wger** — exercise data is Creative Commons per entry; app is AGPL.
- **openGym media** — must not be copied.

**Prototype (10 core lifts).** `assets/exercises/*.webp` holds two public-domain
stills per lift from Free Exercise DB (Unlicense), crossfaded into a slow loop in
the exercise detail. The mapping is `js/exercises/media.js`; the files are
precached by discovery (368 KB for ten lifts). Attributed in `NOTICE.md`. Any
wider rollout keeps the same rule: per-file licence record, attribution, and a
size decision before shipping.

## Integrity tests

`tests/opengym_catalogue.test.js` checks breadth, IDs, names, categories, movements, equipment,
muscle credits, provenance IDs, the generated-file licence header, and the absence of media fields.
`tests/exercise_catalog.test.js` continues to guard core catalogue uniqueness, program resolution and
reviewed-metadata shape.
