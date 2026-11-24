# Decisions — 2026-11-24

## D1 — Roadmap v2 is the active plan
- **Question:** use the uploaded `ROADMAP_V2_HYBRID_PLAN.md` or the existing tracker?
- **Choice:** merge it into `docs/IMPROVEMENT_ROADMAP.md` §13–§21 and keep one tracker.
- **Reason:** the owner's brief and Part I require one tracker; PR #317 did the merge.
- **Reverse:** revert PR #317 and the H0/H1 sessions that reference it.

## D2 — H1 data-read and data-rewrite slices are built but not merged
- **Question:** can the overnight run merge the P0 settings fixes and unit conversion?
- **Options:** merge when green; leave for human review.
- **Choice:** build fully, open PRs, label `needs-human`, do not merge.
- **Reason:** overnight policy §4 names changes to how stored data is read and
  schema-adjacent rewrites as human-verification work. A data-loss defect here
  would be worse than a delayed merge.
- **Reverse:** nothing merged; close or revise the PRs.

## D3 — Weight units convert on switch
- **Question:** convert stored weights, canonicalise kg, or lock the unit?
- **Choice:** convert on switch, with a localStorage recovery copy and a plain
  confirmation (owner selected this before the overnight run).
- **Reason:** preserves meaning immediately; canonical storage remains a larger
  migration and is not required to fix the relabelling bug.
- **Reverse:** restore the recovery copy; the conversion is a one-way rewrite
  per switch by design.

## D4 — Running stays frozen
- **Choice:** no running feature work; only no-regression checks when shared
  session/calendar/import code is touched.
- **Reason:** owner is not running and the plan marks H6 deferred.
