# UI contrast audit

**Status:** complete for the matrix below. Zero AA failures on the audited
screens in every shipped mode; the ratchet in `npm run browser:verify` keeps it
that way.

| Field | Value |
|---|---|
| Date | 2026-11-27 |
| Method | real Chromium, rendered text measured against the painted backdrop |
| Tool | `scripts/contrast-audit.mjs` (`npm run contrast:audit`) |
| Maths | `scripts/lib/contrast.mjs`, proven by `tests/contrast_math.test.js` |
| Ratchet | `docs/audit/contrast-baseline.json` |
| Guard | `tests/theme_contrast.test.js`, `tests/light_override_guard.test.js` |

---

## 1. Why the existing guards could not see this

| Guard | What it enforced | What it missed |
|---|---|---|
| `tests/theme_contrast.test.js` | 13 token pairs, nearly all against `--surface-1` | Any component, any `--surface-2`/`--surface-3`, any tinted surface |
| `scripts/theme-visibility-browser-check.mjs` | 1.8:1 floor on six screens | **Every element under a gradient or image** — which is most cards, the nav and every chart. No cockpit, History, plan page, sheet or modal |
| `tests/note_contrast.test.js` | three hand-picked light values | One-off, not systemic |
| `scripts/theme-literal-check.mjs` | literal count per file | Cannot tell a readable literal from an unreadable one |

The reported symptom — "some text is unreadable in light/dark" — lives exactly
in that gap: a mid-tone on a gradient card, or a translucent label on a tinted
chip.

## 2. What the audit measures

- Walks **text nodes** (and `::placeholder`), not elements.
- Composites alpha text over the backdrop before measuring, because
  `rgba(0,0,0,.42)` is not black, it is 3.03:1 grey on white.
- Treats a gradient as a **set** of candidate backdrops and takes the worst.
  `--pixels` re-shoots the screen with every glyph made transparent and samples
  the real pixels, which **clears** a worst-stop over-estimate. Pixels never
  invent a worse result: an emoji or a chart line inside the box is content, not
  backdrop.
- Reads the real `font-size`/`font-weight` to choose 4.5:1 or the 3:1 large-text
  floor, instead of assuming.
- Reports severity: P0 unreadable (below 1.8:1, or body text below 3:1), P1 body
  text below 4.5:1, P2 large text or non-text below 3:1.

## 3. Matrix

| Tier | Coverage |
|---|---|
| A (every run, 390px) | Home, History, Progress, Plans, Settings, Profile, Train, cockpit — light + Midnight |
| B (`--width=320`) | the same at 320px |
| C (every run) | Slate, Forest, Ember on Home, cockpit, Progress, Settings |
| D (`--full`) | Customize sheet, Plans browse, plan detail, Review |
## 4. What it found

**63 failing text runs** across 8 screens in two modes. A later run in CI found
**13 more** in a state the local run never rendered — see §4.1. Grouped by cause — the
grouping is the point, because fixing the cause cleared dozens of rows:

| # | Root cause | Rows | Worst measured |
|---|---|---|---|
| 1 | `fill="color-mix(… 6200%, transparent)"` is invalid CSS, so SVG text falls back to the initial **black** | 4 | **1.11:1** |
| 2 | Filled buttons took `--text-white`, which is *dark* in light mode and white in Midnight | 3 | **1.81:1** |
| 3 | Accent/status hue as the *text* colour on its own 6–14% tint | 12 | **1.65:1** |
| 4 | Alpha text (`rgba(0,0,0,.28–.55)`, `color-mix(… 25–75%)`) in light overrides | 21 | **1.96:1** |
| 5 | Placeholders left to the UA default (`graytext`, ~`#757575`) | 10 | 3.25:1 |
| 6 | Rest / inactive chips dimmed with `opacity` on the whole cell, labels included | 8 | 2.24:1 |
| 7 | Blanket `#view-analytics svg text { fill: rgba(0,0,0,.5) }` light override | 2 | 3.98:1 |
| 8 | Card page/step too flat to read as a card (1.07:1) + a 1px border doing the work | — | structural |

The **6200%** row is the clearest example of why a rendered measurement matters:
the declaration is syntactically valid-looking, is not flagged by any linter,
and silently resolves to black — invisible on every dark card.

## 5. What changed

Colour only. No layout, spacing or size changes, and no new colour literals:
every fix removes a literal or replaces one with a token.

**Token layer** (`css/tokens.css` + mirrored in `js/theme/tokens.js`):
`--warning-text`, `--success-text`, `--danger-text`, `--info-text`. In light mode
these are genuinely darker (`#92400e`, `#065f46`, `#991b1b`, `#1e40af`) so status
words clear 4.5:1 on their own tint; dark palettes keep the base hues, which
already pass there.

**Dark surface ladder, all four palettes.** Cards were separated by a hairline
and a 1.07:1 step; the step is now 1.17–1.18:1 and the base card is borderless,
with `--divider` reserved for inner rows.

| Palette | surface-1 | surface-2 | surface-3 | card/page |
|---|---|---|---|---|
| Midnight | `#1b1b1b` | `#252525` | `#2d2d2d` | 1.18:1 |
| Slate | `#162033` | `#1c2941` | `#21314d` | 1.18:1 |
| Forest | `#0f2319` | `#132d20` | `#173626` | 1.17:1 |
| Ember | `#291b15` | `#34231b` | `#3e2a20` | 1.17:1 |

Raising the surfaces eats muted-text headroom, so `--text-3` moved with them
(`#969696`, `#8d9bb1`, `#ab9282`) and `tests/theme_contrast.test.js` now refuses
any text token below 4.5:1 on any surface in any palette.

**Component fixes:** chart axis labels use `var(--text-2)`; `.btn-blue` and
`.plans-empty__cta` use `var(--on-accent)`; run-logger pace labels/units are
text tokens; placeholders have one rule (`var(--text-2)`); rest/inactive day
cells dim the dot instead of the date; locked badges dim the icon, not the
label; legend/attribution lines use `--text-3` instead of `opacity`; the
analytics blanket SVG override is gone; profile relative-strength tiles colour
the tile tint, not the reading.

## 6. Exemptions (explicit, not silent)

| Class | Why | Where enforced |
|---|---|---|
| Emoji glyphs | painted by the font, `color` does not apply; WCAG treats them as images | `kind: 'emoji'` is skipped and counted |
| Bitmap backdrops | a photo/map cannot be measured from CSS | refused with a `skip` line naming the selector |
| Exported share cards | fixed brand art, not UI | out of scope by design (see `AGENTS.md`) |
| Disabled controls | WCAG 1.4.3 exempts inactive components | still reported when the control is *visible content* (locked badges, rest days) — those were fixed, not exempted |

## 7. Running it

```bash
npm run contrast:audit                  # all five modes, 390px
npm run contrast:audit -- --core-modes  # light + Midnight only (quick loop)
npm run contrast:audit -- --pixels      # confirm against real pixels
npm run contrast:audit -- --width=320
npm run contrast:audit -- --full        # sheets, browse, plan detail, review
npm run contrast:audit -- --md          # write docs/audit/contrast-findings.md
npm run contrast:audit -- --update      # re-record the ratchet
```

It runs inside `npm run browser:verify` after `theme-visibility`. A new or worse
row fails the build; a fixed row simply stops being reported, and `--update`
prunes it.

## 8. Open

- 180 raw colour declarations remain inside light-theme overrides
  (`docs/audit/light-override-baseline.json`). The guard stops that number
  growing; each migration needs the audit to confirm the rendered result.
- `--full` drives four extra surfaces opportunistically. Progress detail
  screens (Strength, Muscles, Body, Review tabs) are not yet driven by name
  because they need per-band navigation; adding them is the next coverage win.
- Charts that paint text into `<canvas>` and the exported share cards are not
  measured.
