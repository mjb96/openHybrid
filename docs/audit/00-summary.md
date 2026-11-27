> **Historical record.** This audit describes the tree at the commit named below.
> Some findings have since been fixed; the current architecture rules live in
> `AGENTS.md` and the session log in `docs/IMPROVEMENT_ROADMAP.md`. Do not treat
> a finding here as current without checking the code.

# 00 — Executive summary

**Audit:** openHybrid, formerly Helyx (`mjb96/hybrid-app` @ `abbeb97`) vs openGym (`DuarteSantos8/openGym` @ `e4a68a9`), 2026-11-19.
**Artifacts:** `01-reference-inventory.md`, `02-our-app-inventory.md`, `03-gap-matrix.md`, `04-prioritized-backlog.md`.
**Frame:** Helyx is local-first, Android-first, no account/server/cloud sync (`hybrid-app/README.md:5-12`, `:186-189`); openGym is a self-hosted multi-user platform (`openGym/README.md:32-44`). Server features are marked NOT APPLICABLE, not "missing".

## Licence bottom line

**Update (2026-11-19):** this audit was commissioned while the project was named Helyx and was all-rights-reserved. It is now **openHybrid**, licensed **AGPL-3.0-only** (`hybrid-app/LICENSE`). openGym is also AGPL-3.0 (`openGym/LICENSE:1`), so openGym **code** is now licence-compatible; its exercise stills/animations remain separately licensed from Gym visual and cannot be reused (`openGym/NOTICE.md:48-60`). The backlog still assumes **clean-room implementation** as the provenance policy, not because code reuse is forbidden. Reusing an openGym module now requires carrying its AGPL notice and preserving the licence, and must never include the media.

## Top 5 gaps to close

1. **Saved-workout editing** — History is read-only in Helyx; openGym lets you fix sets/notes and move a session (`openGym/frontend/src/lib/session-edit.js:1-18`). Highest user value (typos are permanent), but the riskiest because PRs/e1RM/volume must be recomputed from history.
2. **Equipment inventory accuracy** — Helyx has denominations but assumes unlimited plates (`hybrid-app/js/workout/plates.js`) and has no dumbbell/machine-stack lists. openGym models owned pairs and stack steps (`openGym/frontend/src/lib/plates.js:1-50`; `dumbbells.js`). Highest strategic fit: every barbell/dumbbell session, fully offline.
3. **Automatic warm-up ramp** — openGym generates editable ramp sets (`openGym/frontend/src/lib/warmup-ramp.js`); Helyx has only a manual warm-up set type. Small, frequent, low risk.
4. **Muscle volume / recovery map** — Helyx has muscle credits and a textual volume guide (`hybrid-app/js/analytics/volume-guide.js`), but no per-muscle visual; openGym has three map modes (`openGym/frontend/src/lib/recovery.js:1-40`). This is Helyx's hybrid-training differentiator.
5. **Import breadth** — Helyx accepts OpenGym/Strong/Hevy CSV + bodyweight; openGym accepts 10+ formats incl. Liftosaur JSON and Apple Health (`openGym/docs/DATA_IMPORTS.md:24-40`). Switching cost is an adoption blocker.

## Top 3 things Helyx does better

1. **Live running** — native GPS tracking, route map, splits, FIT import and run analytics (`hybrid-app/js/gps-tracker.js:571-655`; `js/garmin.js:1-71`). openGym has no live GPS; runs arrive from health stores or manual entry (`openGym/frontend/src/lib/activities.js:1-20`).
2. **Fasting + recovery integration** — a full fasting tracker with protocols, zones and achievements (`hybrid-app/js/fasting.js:1-16`), which openGym does not have at all.
3. **Local-first privacy by design** — no account, no server, hardened Android WebView, app-private atomic state mirror and scrubbed crash reporting (`hybrid-app/js/state/mirror.js:1-12`; `android/.../TrustedOrigin.kt`; `js/monitoring/sentry.js:1-60`). openGym trades this for multi-device sync and collaboration.

## Biggest porting risks

1. **Licence** — AGPL vs proprietary. Clean-room only; this makes "same stack" code reuse impossible even though both are JavaScript.
2. **Exercise media** — Gym visual licence blocks animations; the catalogue text is AGPL. Expanding the library needs owned/public-domain text and a separate media licence.
3. **History editing correctness** — recomputing PRs/e1RM/volume and keeping archived weeks, exports and the Android mirror consistent is where a subtle bug would do lasting damage.
4. **New network/permission surfaces** — WebDAV, Strava, geofencing and photos each weaken the no-network/no-permission promise; make them opt-in and default-off.
5. **Schema migrations** — v7 equipment inventory, v8 measurements, potential v9 for photos/trophies; every bump must keep unknown/future versions failing closed and preserve the native mirror.

## Three questions only a human can answer

1. **Is "no network at all" a hard product line, or is opt-in user-owned network acceptable?** If WebDAV backup and Strava share-out are allowed, #15 and #25 move up; if not, they should be dropped.
2. **Is multi-device use required?** If people train on a phone and review on a tablet/laptop, optional sync would outrank most on-device gaps — and conflict with the current README promise.
3. **Is the 157-exercise catalogue deliberate, or is library breadth worth investment?** If breadth matters, a text-catalogue program moves to NEXT; if animations matter, a media licence is a business decision, not an engineering one.

## Assumptions that would change the ranking

- **No accounts/cloud sync remains a hard constraint.** If optional sync is added, sync/conflict merge, API and maybe coach move from NOT APPLICABLE into high-priority gaps.
- **Android-only remains the platform scope.** If iOS is planned, Apple Health, HealthKit live heart rate and Watch integration become relevant (and large).
- **The target user has access to a barbell and plates.** If the audience is mostly machines/bodyweight, equipment inventory (#1–2) drops and per-side/timed sets rise.
- **English-only is acceptable near-term.** If international reach is a goal, i18n jumps from LATER to a strategic program.
- **openGym's media cannot be licensed.** If a Gym visual licence is purchased, exercise animations stop being DROP and become a content project.
- **Helyx stays proprietary.** If the licence changed to AGPL, direct code reuse becomes possible — a business decision far larger than this audit.

## Method & checks

- Both repositories cloned read-only; source untouched. Helyx artifacts were written only under `hybrid-app/docs/audit/`.
- Capability matching was behavioural, not name-based. Maturity was classified from code and docs, with UNKNOWN where proof was unavailable (billing, production Sentry DSN, hidden edit paths, server scale limits).
- Final checklist is in the audit response; the working tree contains only the five new audit artifacts.

## Final checklist

- [x] Commit SHAs recorded at the top of 01 (`e4a68a9…`) and 02 (`abbeb97…`)
- [x] Licenses identified: openGym **AGPL-3.0** + proprietary media; openHybrid **AGPL-3.0-only** — code reuse is now licence-compatible, media reuse is not
- [x] `00-summary.md`, `01-reference-inventory.md`, `02-our-app-inventory.md`, `03-gap-matrix.md`, `04-prioritized-backlog.md` all exist
- [x] Every gap row has `repo:path:line` evidence or an explicit UNKNOWN
- [x] `git status` in both scratch repos is clean; the working repo shows only `docs/audit/`
- [x] Every NOT APPLICABLE row in 03 has a one-line justification
