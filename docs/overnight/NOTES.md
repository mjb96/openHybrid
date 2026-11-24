# Overnight notes — 2026-11-24

> Running log for the autonomous overnight run. The plan is
> `docs/IMPROVEMENT_ROADMAP.md` §13–§21 (Roadmap v2, merged from the owner's
> `ROADMAP_V2_HYBRID_PLAN.md`). One tracker only.

## Preflight

- Rollback tag: `pre-overnight-2026-11-24` at `8498083` (main after H0 merge).
- Baseline on main: **2,664 node tests**, **48/48 browser checks**, typecheck,
  smoke and precache/workflow gates green.
- Running and hybrid-intelligence features are frozen; shared-code changes get a
  no-regression check only.
- H1 changes that rewrite or re-read stored data are built fully but left open
  with `needs-human` per the overnight policy.

## Open at start

- PR #319 — H1 P0 data-safety fixes (equipment boot, stale bodyweight,
  notification master switch). Checks green; labelled needs-human because it
  changes how stored data is read.
- S-F4 unit conversion — built on `overnight/h1-unit-conversion`; needs-human
  because it rewrites stored weights.

## Loop log

- _2026-11-24_ — Preflight committed. Next: PR the unit-conversion slice, then
  move to independent H2/H4 UI slices while H1 data PRs wait for review.

## Final state

- 11 PRs merged; main green at `3fe4d0a` with **2,677 tests** and **48/48**
  browser checks.
- PR #319 (P0 settings data-read fixes) and #321 (unit conversion rewrite)
  remain open with `needs-human`; both have green checks.
- No reverted PRs. No work left half-merged.
- Stop reason: reached a clean slice boundary with the data-changing H1 work
  awaiting owner review; continuing would have stacked unmerged data changes.
