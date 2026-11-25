# Theme colour audit — Phase A0

**Status:** audit complete, **awaiting approval**. No product code, CSS, HTML or manifest was
changed. This document is the input to Part A1 (token layer) and must be approved before any
token, CSS or UI work starts.

| Field | Value |
|---|---|
| Date | 2026-11-25 |
| Branch | `theme-system-audit` (worktree `openHybrid-theme-audit`) |
| Base | `origin/main` @ `3bcb17d` |
| Scope | `js/`, `css/`, `index.html`, `manifest.json`, `android/`, `scripts/`, `sw.js` |
| Out of scope | `js/vendor/**` (third-party Leaflet), `assets/` binaries, icon PNG bytes |

---

## 1. Executive summary

The repository **has** a token layer, but the product does not consume it. Colour is authored
in five overlapping layers, three of which redefine the same tokens with different values, and
the brand layer, loaded after the palette blocks, pins the card surfaces to a fixed navy that
no palette can change.

Measured inventory (colour literals, not token references):

| Metric | Count |
|---|---|
| Colour occurrences (`hex` + `rgb()/rgba()` + named) | **3,590** |
| — in `js/` + `css/` | 3,456 |
| — in `index.html` (inline `<style>` + inline attributes) | 117 |
| — in `scripts/` (fixtures + icon generator) | 14 |
| — `manifest.json` + `android/` | 3 |
| Distinct normalised values | **866** |
| Distinct hex values | 276 |
| Distinct `rgba()`/`rgb()` values | 578 |
| Distinct named CSS colours | **1** (`color: white`) |
| Distinct selectors carrying a hard-coded colour | 810 |
| `var(--token, #hex)` fallbacks (31 distinct tokens) | **415** |
| Colour declarations carrying `!important` | 451 |
| Distinct border colour values | 214 |
| Tinted (non-white/black) border occurrences / distinct values | **290 / 175** |
| Accent-tinted `box-shadow` literals / distinct rules | **73 / 72** |
| Distinct white alpha steps | 62 |
| Distinct black alpha steps | 55 |
| CSS gradients | 122 |
| Distinct CSS files with literals | 6 (`styles` 1,521; `programs` 345; `analytics` 231; `progress` 127; `hybrid-score` 122; `brand-consistency` 85) |

**Verdict:** this is not a "sprinkle tokens on a few screens" job. The token layer exists but is
contradicted by a second token block, a third per-palette block and a large body of per-view
hard-coding. A1 must first make the token layer single-source and truthful, then migrate by
frequency, then delete the per-card effects. Doing CSS cleanup before that would lock in the
current contradictions.

### Top five inconsistencies

1. **Palette switching does not change cards.** `css/brand-consistency.css` loads fifth and forces
   `background: linear-gradient(160deg, rgba(16,27,42,.98), rgba(7,17,31,.98)) !important` and
   `border-color: rgba(96,165,250,.10) !important` on every `.card-dark`, `.glance-card`,
   `.profile-stat-card`, `.profile-active-program`, `.an-chart` and `.an-insights`. Midnight,
   Slate, Forest and Ember therefore differ only in the page background and a handful of accents;
   every card stays Slate navy with an ice-blue border.
2. **The same token is defined three times with different values.**
   `--bg-app` is `#020408` (`styles.css :root`), `#050a12` (`brand-consistency.css :root`) and
   `#070a12` (Midnight block). `--color-blue` is `#3b82f6`, `#0e7490` and `#22d3ee` depending on
   which block wins. `--color-violet` is declared twice in the same `:root`.
3. **The default accent is not the accent.** The default palette is Midnight (cyan), yet the app
   uses indigo `rgba(99,102,241,…)` **152 times** across **33 alpha steps** for focus rings,
   borders, glows and card hovers, plus 11 raw `#4f46e5` declarations. Charts still draw Slate blue
   `#3b82f6` because they bypass tokens entirely.
4. **415 token fallbacks decide the render.** One in eight literals (415 of 3,590) is a
   duplicated fallback. Several contradict the token they claim to back up: undefined `--border` falls back to
   `#23272e` (13×), `--bg-card` falls back to GitHub-dark `#161b22` (12×), `--bg-app` to `#0b0f14`
   (7×), and `--text-inverse` falls back to white while in light mode the token itself resolves to
   `#0f172a` — the documented cause of the unreadable light-mode confirm dialog.
5. **Borders and glows have no ceiling.** 214 distinct border values, 175 distinct tinted border
   values (290 occurrences), 72 distinct accent-tinted shadows. Indigo alone runs at 0.18, 0.20,
   0.22, 0.25, 0.28, 0.30, 0.35, 0.40, 0.42, 0.45, 0.50, 0.55 and 0.60. There is no way for a
   designer to say "this is the border" because there are 175 answers.

Platform surfaces also disagree: `<meta name="theme-color">` is `#070a12`, `manifest.json` is
`#020408` for both `theme_color` and `background_color`, and Android `colors.xml` is `#070a12`.
None of them update when the palette or light mode changes.

---

## 2. How colour is authored today

| Layer | File | What it owns | Problem |
|---|---|---|---|
| 1. Base tokens | `css/styles.css:22-166` | 60+ custom properties | Values are the **Slate** palette, not the default Midnight |
| 2. Palette overrides | `css/styles.css:10862-10922` | 4 blocks keyed `html[data-theme="dark"][data-palette="…"]` | Only applies in dark mode; only overrides ~10 tokens; Slate omits `--glass-border` |
| 3. Light theme | `css/styles.css:3899-3945` + ~660 literals in light-mode rules | Light surfaces/text/borders | Light ignores `data-palette` entirely |
| 4. Brand layer | `css/brand-consistency.css` (239 lines) | Re-declares `:root` surfaces/accents, then re-declares Midnight | A second token system; pins card gradients with `!important` |
| 5. Screen CSS | `programs.css`, `analytics.css`, `progress.css`, `hybrid-score.css` | Per-screen colours | ~800 literals; `progress.css` claims "tokens only" but ships 127 literals |
| 6. Runtime authors | JS template literals, inline `style`, SVG strings, canvas | Charts, share cards, inline cards, modals | Invisible to CSS theming; no token access |

**Boot order matters.** `index.html` ships `<html lang="en" data-palette="midnight">` with **no**
`data-theme`. Until `_applyTheme()` runs (`js/settings.js:710-717`), the cascade is
`brand-consistency.css :root` → `--bg-app: #050a12` / `--bg-card: #0b1420`, a fourth navy that
matches neither Slate nor Midnight. Once JS sets `data-theme="dark"`, the Midnight block wins and
the page becomes `#070a12`. If JS fails, the app renders in an undeclared palette with half the
tokens from Slate.

`brand-consistency.css` is also the reason the palettes are cosmetic: it is loaded after the
palette blocks and uses `!important` on the surfaces that matter.

---

## 3. Token baseline — what Midnight actually resolves to

The brief supplied to this session did not include a token table, and no approved Midnight token
table exists in the repository. Rather than invent one, the table below records **the values the
default build actually resolves to today**. This is the candidate canonical set for approval;
A1 should not treat it as approved.

| Token | `styles.css :root` | `brand-consistency :root` | Midnight block | **Effective (default boot)** | Note |
|---|---|---|---|---|---|
| `--bg-app` | `#020408` | `#050a12` | `#070a12` | **`#070a12`** | Slate value is the base; Midnight is an override |
| `--bg-card` | `#090e1a` | `#0b1420` | `#0d1420` | **`#0d1420`** | `.card-dark` ignores it — paints `#101b2a → #07111f` |
| `--bg-input` | `#111728` | `#101b2a` | `#121b2b` | **`#121b2b`** | |
| `--bg-input-focus` | `#161e34` | `#142235` | `#172236` | **`#172236`** | |
| `--bg-deep` | `#080f1e` | `#07111f` | `#0a111d` | **`#0a111d`** | `--bg-dark` duplicates it |
| `--bg-nav` | `rgba(6,9,17,.80)` | — | `rgba(7,10,18,.82)` | **`rgba(7,10,18,.82)`** | `.bottom-nav` paints `rgba(5,10,18,.95)` |
| `--text-primary` | `#f8fafc` | — | `#e5edf5` | **`#e5edf5`** | |
| `--text-secondary` | `#94a3b8` | — | `#94a3b8` | **`#94a3b8`** | `--text-muted` and `--text-tertiary` also `#94a3b8` |
| `--text-muted` | `#94a3b8` | — | — | **`#94a3b8`** | No visual distinction from secondary |
| `--text-inverse` | `var(--text-primary)` | — | — | **`#e5edf5`** (light: `#0f172a`) | Used on permanently dark panels → the light-mode confirm bug |
| `--color-blue` | `#3b82f6` | `#22d3ee` | `#0e7490` | **`#22d3ee`** | Three values; brand wins |
| `--color-cyan` | `#22d3ee` | — | `#22d3ee` | **`#22d3ee`** | |
| `--color-indigo` | `#6366f1` | `#0891b2` | — | **`#0891b2`** | |
| `--color-green` | `#10b981` | — | `#10b981` | **`#10b981`** | |
| `--color-amber` | `#f59e0b` | — | — | **`#f59e0b`** | |
| `--color-red` | `#ef4444` | — | — | **`#ef4444`** | |
| `--color-violet` | `#8b5cf6` | — | — | **`#8b5cf6`** | Declared twice in `:root` |
| `--color-orange` | `#ff6b00` | `#f97316` | `#a3e635` | **`#a3e635`** | "Orange" resolves to lime; `--brand-burnt-orange` is lime too |
| `--accent-blue` | `var(--color-blue)` | `var(--brand-cobalt)` | — | **`#22d3ee`** | Only tracks the palette because brand overrides it |
| `--accent-indigo` | `var(--color-indigo)` | `var(--brand-cobalt-strong)` | — | **`#0891b2`** | |
| `--accent-pink` | `#ec4899` | — | — | **`#ec4899`** | `.text-accent-pink` / `.bg-accent-pink` render **cyan** |
| `--glass-border` | `rgba(255,255,255,.07)` | — | `rgba(148,163,184,.12)` | **`rgba(148,163,184,.12)`** | Missing from the Slate block |
| `--border-subtle` | `rgba(255,255,255,.04)` | — | — | **`.04`** | |
| `--border-default` | `rgba(255,255,255,.07)` | — | — | **`.07`** | |
| `--border-medium` | `rgba(255,255,255,.10)` | — | — | **`.10`** | Weaker than `--border-light` (`.12`) — name inverted |
| `--border-light` | `rgba(255,255,255,.12)` | — | — | **`.12`** | |
| `--border-strong` | `rgba(255,255,255,.14)` | — | — | **`.14`** | |
| `--border` | **undefined** | — | — | **falls back to `#23272e`** | 13 call sites rely on the fallback |
| `--ok / --warn / --danger / --info` | **absent** | — | — | **absent** | Semantic colour is only available as `--color-*` |
| `--accent / --accent-ink / --accent-soft` | **absent** | — | — | **absent** | Every accent use reaches for a palette colour by name |
| `--data-1 … --data-8` | **absent** | — | — | **absent** | Charts hard-code hex |

### Where the current default differs from the Midnight values

These are the places a tokenised build must fix, because the current default build already
disagrees with the palette it claims to use:

| Surface | Current value | Should be | Where |
|---|---|---|---|
| Manifest `theme_color` / `background_color` | `#020408` (Slate) | `#070a12` | `manifest.json:28-29` |
| `<meta name="theme-color">` | `#070a12` | follows palette/theme | `index.html:13` |
| Android status/navigation/splash | `#070a12` | follows palette/theme | `android/.../colors.xml:3`, `themes.xml` |
| `.card-dark` background | `#101b2a → #07111f` | `--bg-card` (`#0d1420`) | `brand-consistency.css:88` |
| `.card-dark` border | `rgba(96,165,250,.10)` | `--border-default` | `brand-consistency.css:87` |
| `.bottom-nav` background | `rgba(5,10,18,.95)` | `--bg-nav` | `brand-consistency.css:127` |
| Progress share card background | `#020408` | `--bg-app` | `js/analytics/share-card.js:35` |
| PR share card background | `#160b24 → #0b0e13` | `--bg-app` | `js/brain/pr-share.js:35-36` |
| Hybrid Score share background | `#0a0612 → #120a24 → #05060f` | `--bg-app` | `js/brain/hybrid-score/share-card.js:51` |
| Chart dot stroke | `#0d1117` / `#111827` | `--bg-card` | `chart-primitives.js:62`, `charts.js:301` |
| Chart series blue | `#3b82f6` | `--data-2` | `charts.js:377`, `strength-charts.js` |
| Heat-map muscle fill | `#ff7a1a` | `--data-heat` | `styles.css:2624-2632` |
| Model "muscle" base | `#22364f` | `--data-heat-0` | `styles.css:2623` |
| Program cover fallback | `#1a0e2e → #0d1b2a` | `--cover-default` | `program-card.js:79`, `app.js:1204` |
| Today marker | `#a3e635` (lime) | `--accent-alt` / `--today` | `--color-orange` in Midnight |

---

## 4. Surface and navy near-duplicates

246 occurrences of 82 different dark hex values outside the program catalogue. The app paints
its "near-black navy" with at least **seven** unrelated values, and its "card" with at least
**twelve**:

| Cluster | Values (occurrences) | Used by |
|---|---|---|
| App background | `#070a12` (4), `#020408` (3), `#050a12` (1), `#060a12` (2), `#05060f` (2), `#000000` (5), `#0a0612` (2) | Midnight block, `:root`, brand `:root`, boot/light fallbacks, share cards |
| Deep surface | `#0a111d` (2), `#080f1e` (3), `#080f1a` (4), `#0b0f14` (8), `#0d1117` (9), `#0b0e13` (1) | `--bg-deep`, legacy fallbacks, chart strokes, PR card |
| Card surface | `#0d1420` (3), `#0b1420` (2), `#0d1020` (4), `#090e1a` (5), `#0b101b` (1), `#07111f` (1), `#101b2a` (1), `#0f172a` (65), `#161b22` (7), `#1f242c` (4), `#23272e` (9), `#2a3038` (3) | Midnight card, brand card, Slate card, brand gunmetal, Tailwind slate-900 (mostly light-mode text), GitHub-dark fallback, History/Recap surfaces |
| Input surface | `#121b2b` (2), `#111728` (3), `#161e34` (2), `#172236` (2), `#111827` (4), `#0e1525` (2), `#0d1625`, `#0d1926` | input tokens plus legacy variants |
| Raised surface | `#111a2a`, `#142235`, `#17243a`, `#101929`, `#101b2a` | brand raised, near-duplicates |
| Purple navy | `#1a0e2e` (9), `#2d1a5c` (2), `#140a2c`, `#120a24`, `#160b24` | program covers, PR share card, Hybrid Score share |
| Teal black | `#001a1a` (2), `#032020`, `#052424`, `#0e2a2a` | run/fasting surfaces |
| Green/ember navy | `#06110d`, `#0b1a14`, `#08150f`, `#10241c`, `#153126`; `#140d0a`, `#1d120e`, `#180f0b`, `#2a1a13`, `#332017` | forest/ember (intended palette values) |

Only the intended forest/ember values are legitimate duplicates. Everything in the first six rows
is accidental drift. The practical consequence: `#0f172a` (Tailwind `slate-900`) appears **65
times**, more than any other dark value, and is not a palette token in any palette; it is used as
light-mode text and as chart strokes.

`#0d1020` (4), `#0b1420` (2) and `#0d1420` (3) are three card navies that differ by at most 3 in
each channel — indistinguishable on a phone, impossible to reason about in code.

---

## 5. Borders and tints

The token set offers five borders (`subtle .04`, `default .07`, `light .12`, `medium .10`,
`strong .14`). The codebase contains **214** distinct border values.

| Problem | Evidence |
|---|---|
| No single "hairline" | `rgba(255,255,255,.04/.05/.06/.07/.08/.09/.10/.12/.14/.15/.18/.20/.25)` all appear |
| No single "separator" | `rgba(0,0,0,.03/.04/.05/.06/.07/.08/.09/.10/.12/.14/.18)` all appear in light overrides |
| Tinted borders are the default, not the exception | 290 occurrences at 175 distinct values |
| Indigo is the de-facto focus colour | `rgba(99,102,241,…)` at 33 alpha steps, 152 occurrences, 12 of them at `.5` alone |
| Cyan focus tint competes with indigo | `rgba(34,211,238,…)` at 30 alpha steps, 74 occurrences |
| Semantic tints are unbounded | green 41 alphas, amber 32, red 29, blue 35, violet 19 |
| Naming inversion | `--border-light` (.12) is stronger than `--border-medium` (.10) in dark; in light `--border-light` = `--border-strong` = `.14` |
| Undefined token | `var(--border, #23272e)` ×13 — the fallback is the only value |
| Palette gap | Slate has no `--glass-border`, so it inherits `rgba(255,255,255,.07)` while Midnight/Forest/Ember use `rgba(148,163,184,.12)` — ~40% weaker card edges in Slate |

Representative tinted-border families to collapse:

| Family | Occurrences | Distinct alphas | Proposed |
|---|---|---|---|
| indigo `99,102,241` | 152 | 33 | `--border-focus` (one value) + `--accent-soft` |
| cyan `34,211,238` | 74 | 30 | `--border-focus` + `--accent-soft` |
| blue `59,130,246` | 85 | 35 | `--info-soft` |
| green `16,185,129` | 101 | 41 | `--ok-soft` |
| amber `245,158,11` | 66 | 32 | `--warn-soft` |
| red `239,68,68` | 63 | 29 | `--danger-soft` |

---

## 6. Accent where nothing is interactive

The default accent is cyan (`--color-cyan: #22d3ee` in every palette that defines it). It is
painted on surfaces that cannot be tapped, and the app's actual focus colour is indigo. Both are
defects for a system where "accent = interactive".

| Location | Use | Why it is wrong | Measured |
|---|---|---|---|
| `body` (`styles.css:201-203`, `:5228-5231`, `brand-consistency.css:74-78`) | three stacked indigo/cyan/violet radial glows | pure decoration; three competing declarations, the last wins | — |
| `.cockpit-ex-note` (`styles.css:2979-2984`) | cyan left border + cyan-tinted panel | an exercise *note* is not interactive | — |
| `.run-add-chevron` (`styles.css`) | `color: rgba(34,211,238,.35)` | decorative chevron | **2.28:1** on `#0d1420` |
| `.run-pace-unit` | `rgba(34,211,238,.45)` | unit label | **2.98:1** |
| `.run-pace-label` | `rgba(34,211,238,.60)` | label text | **4.38:1** (fails 4.5 body text) |
| `.text-accent-pink`, `.bg-accent-pink`, `.ratio-fill-pink` (`styles.css:310,773,766`) | class says pink, renders cyan | name lies; no light override | **1.81:1** cyan on white |
| `index.html:718-719,777-778` | `text-accent-pink` labels + inline `color:#22d3ee` values | read-only HR fields; cyan text on white in light mode | **1.81:1** |
| `.fit-import-tile--run`, `.workout-run-card.run-collapsed` | cyan borders/fills | module decoration, not controls | — |
| `.today-card` (`styles.css:2634`) | cyan wash gradient | Today is a surface; its CTA is the interaction | — |
| `.pg-day.is-trained .pg-day__mark` (`progress.css:336`) | cyan mark | legitimate data mark, but it borrows the accent token — should be `--data-*` | — |
| `body` / `.card-dark:hover` / `.profile-avatar-btn` / `.ob-cta` / `.day-pill.active` | indigo `rgba(99,102,241,…)` rings and glows | the default palette's accent is cyan | — |
| `.day-pill.active` (`styles.css:5583`) | `linear-gradient(135deg,#4f46e5,var(--color-indigo))` | dead rule later overridden by brand gradient; still ships | — |

The inverse also exists: the accent is **missing** where something is interactive. `.text-accent-pink`
labels are static text (should be `--text-secondary`), while focus rings use indigo (should be
`--accent`). A1 should decide one accent and apply it to *controls only*.

### 6.1 Tailwind-style palette class strings

There is no generated palette, but `styles.css` ships a hand-written utility vocabulary that behaves
like one. It has drifted because each class was added by hand:

| Class | Definition | Renders (Midnight) | Issue |
|---|---|---|---|
| `.text-primary` | `var(--text-primary)` | `#e5edf5` | ok |
| `.text-secondary` | `var(--text-secondary)` | `#94a3b8` | ok |
| `.text-main` | `var(--text-primary)` | `#e5edf5` | duplicate of `.text-primary` |
| `.text-muted` | `var(--text-secondary)` | `#94a3b8` | "muted" is not the muted token |
| `.text-white` | `var(--text-white)` | `#ffffff` | in light `#1e293b` (dark) — name lies |
| `.text-inverse` | `var(--text-white)` | `#ffffff` | ignores `--text-inverse` entirely |
| `.text-accent-blue` | `var(--color-blue)` | `#22d3ee` | palette hue as a decorative text class |
| `.text-accent-cyan` | `var(--color-cyan)` | `#22d3ee` | |
| `.text-accent-green` | `var(--color-green)` | `#10b981` | status hue as text |
| `.text-accent-red` | `var(--color-red)` | `#ef4444` | status hue as text |
| `.text-accent-amber` | `var(--color-amber)` | `#f59e0b` | status hue as text |
| `.text-accent-pink` | `var(--color-cyan)` | `#22d3ee` | name says pink, renders cyan; no light override |
| `.bg-accent-blue` | `var(--color-blue)` | `#22d3ee` | |
| `.bg-accent-pink` | `var(--color-cyan)` | `#22d3ee` | name says pink, renders cyan |
| `.ratio-fill-pink` | `var(--color-cyan)` | `#22d3ee` | name says pink, renders cyan |
| `.btn-blue` | `var(--color-blue)` + `--text-white` | cyan fill, white ink | no hover/active token |
| `.btn-green` | `var(--color-green)` + `--text-white` | green fill, white ink | primary CTAs override ink in Midnight |
| `.btn-amber` | `var(--color-amber)` + `--text-white` | amber fill, white ink | white on `#f59e0b` is ~2.2:1 |
| `.btn-danger` | `var(--color-red)` + `--text-white` | red fill, white ink | |
| `.alert-red` | `#200b0b` + `rgba(239,68,68,.22)` | hard-coded | bypasses tokens |

---

## 7. Effects: per-card glows and stacked gradients

**73 accent-tinted shadow literals across 72 distinct rules.** Elevation itself is also hard-coded
even though `--shadow-xs…xl` exist: `rgba(0,0,0,.22/.25/.30/.35/.38/.40/.45/.48/.50/.55/.65/.70/.82)`.

| Selector | Tint | Purpose |
|---|---|---|
| `.profile-avatar-btn`, `:hover`, `.settings-avatar-large` | indigo `.35/.5/.4` | profile identity glow |
| `.ob-cta`, `.card-dark:hover`, `#view-workout > article:last-of-type` | indigo `.25–.55` | primary CTA / card hover |
| `.day-pill.active` | indigo `.42` | selected day |
| `.home-metric-card--gym` | indigo `.12` | card type glow |
| `.home-metric-card--run`, `.log-run-fab:hover` | cyan `.08/.25` | card type glow |
| `.cockpit-exercise:not(.collapsed)` | indigo `.06` | open exercise |
| `.cockpit-exercise.completed` | green `.08` | completed state |
| `#cockpitRunPanel` | cyan `.06` | run panel |
| `#startWorkoutBtn.btn-green` (+ hover/active) | green `.25/.35/.45` | primary action |
| `.bottom-nav` | orange `#ff6b00` `.10/.12` | nav outline |
| `.pr-badge` | amber `#fbbf24` `.40` | PR marker |
| `.profile-level-ring` | amber `.6` | level ring |
| `textarea:focus` | cyan `.15` | focus ring |

**Gradients:** 122 in CSS. The three `body` gradients alone stack indigo, cyan and violet.
`analytics.css` repaints cards with `linear-gradient(160deg,#0e1525,#090e1a) !important`
(lines 912, 1225) — a fixed Slate surface inside Midnight. `analytics.css` also uses
`linear-gradient(135deg, rgba(99,102,241,.20), rgba(6,182,212,.12))` for chart hero fills, an
indigo→cyan wash that exists in no palette.

There is no token for "card glow" or "selected ring", so every new component invents one. A1
should reduce this to: `--shadow-card`, `--shadow-sheet`, `--glow-accent` (one value),
`--glow-danger` (one value), and **no per-card glow by default**.

---

## 8. Data-visualisation palettes (separate token family)

Charts, heat maps, calendars and muscle groups currently reuse semantic and brand hues as
categorical series. That is why a light-mode chart legend can show `#f59e0b` text at **2.15:1** and
`#10b981` at **2.54:1** on white.

### 8.1 Charts (SVG strings, no token access)

| File | Series colours | Notes |
|---|---|---|
| `js/analytics/charts.js` | `#3b82f6` (squat), `#10b981` (bench), `#f59e0b` (deadlift), `#22d3ee`, `#ec4899`, `#a855f7`, `#f97316`, `#ef4444`, `#a3e635` | 30 distinct; dot stroke `#111827`; bodyweight line `#22d3ee` |
| `js/analytics/charts/strength-charts.js` | `#3b82f6`, `#60a5fa`, `#10b981`, `#ec4899`, `#1e3a8a`, `rgba(16,185,129,${intensity})` | 17 distinct; intensity interpolated in rgba |
| `js/analytics/charts/load-charts.js` | `#f59e0b`, `#10b981`, `#a78bfa`, `#3b82f6`, `#ef4444`, `#7c3aed` | 12 distinct; ATL/CTL/ACWR |
| `js/analytics/charts/running-charts.js` | `#ec4899`, `#f59e0b`, `#22d3ee`, `#ef4444`, `#10b981`, `#be185d` | 16 distinct |
| `js/analytics/charts/recovery-charts.js` | `#10b981`, `#818cf8`, `#3b82f6`, `#f59e0b`, `#f97316`, `#ef4444` | 12 distinct |
| `js/analytics/charts/fasting-charts.js` | `#f59e0b`, `#f97316`, `#3b82f6`, `#10b981`, `#8b5cf6` | 13 distinct |
| `js/analytics/charts/chart-primitives.js` | `#60a5fa`, `#f59e0b`, `#ef4444`, `#3b82f6`, stroke `#0d1117` | shared primitives |
| `js/analytics/running-detail.js` | 15 distinct incl. `#14b8a6`, `#06b6d4`, `#f43f5e`, `#fb7185` | metric cards |

The same concept changes hue between files: recovery readiness is `#3b82f6` in one chart and
`#818cf8` in another; running pace is `#ec4899` in one and `#f472b6` in another. `#0d1117` and
`#111827` are both used as the dot stroke in different charts.

**Proposed:** `--data-1 … --data-8` (cyan, blue, green, amber, violet, pink, orange, slate) plus
`--data-N-soft` at one alpha; charts read tokens via `getComputedStyle` once per render and fall
back to the current hex only for the offline/print path.

### 8.2 Muscle groups (`view-muscles.js:33-42`)

23 explicit hex values across 6 groups + `OTHER_COLOR`:

| Group | Shades |
|---|---|
| chest | `#22d3ee`, `#67e8f9`, `#0e7490` |
| back | `#3b82f6`, `#60a5fa`, `#93c5fd`, `#1d4ed8` |
| shoulders | `#8b5cf6`, `#a78bfa`, `#c4b5fd`, `#6d28d9` |
| arms | `#10b981`, `#34d399`, `#6ee7b7`, `#047857` |
| legs | `#f59e0b`, `#fbbf24`, `#fcd34d`, `#d97706`, `#b45309` |
| core | `#ff6b00`, `#fb923c` |
| other | `rgba(148,163,184,.45)` |

**Proposed:** `--data-muscle-chest|back|shoulders|arms|legs|core` base + `--data-muscle-*-1..5`
shades, derived in one place. These are a domain palette, not `--data-N`, because the six hues are
semantic (body region) and must stay stable across charts.

### 8.3 Body heat map (`styles.css:2618-2632`)

`#22364f` base + `#ff7a1a` at four opacities (`.28/.5/.74/.96`), light base `#dbe4ef`, light stroke
`#fff`. `#ff7a1a` is neither `--color-orange` (`#ff6b00`) nor `--brand-burnt-orange` (`#a3e635`) —
a third orange.

**Proposed:** `--data-heat-0…4` (one hue, four steps) and `--data-heat-stroke`.

### 8.4 Calendar / fasting status fills

Fasting calendar builds inline styles from `#f59e0b22`, `#3b82f622`, `#10b98122` — 8-digit hex
alpha that exists in no token. Completed/partial/active/missed/future each get four colour
properties (`bg`, `border`, `text`, `dot`).

**Proposed:** `--state-complete`, `--state-partial`, `--state-active`, `--state-missed`,
`--state-future`, each with `-bg`, `-border`, `-text`, `-dot` or a single `color-mix` rule.

### 8.5 Domain colours

Progress bands already use `--color-cyan` for endurance, `--color-violet` for strength,
`--color-violet` for fasting, cyan for bodyweight. There is no `--domain-*` token, so a palette
change re-colours a domain. **Proposed:** `--domain-strength|run|walk|recovery|fasting|body|muscles|balance`.

---

## 9. Platform surfaces

| Surface | Current | Behaviour | Risk |
|---|---|---|---|
| `<meta name="theme-color">` (`index.html:13`) | `#070a12` | static; never updated by `setTheme`/`setPalette` | browser chrome stays Midnight in Forest/Ember/Light |
| `manifest.json:28-29` | `#020408` both | static Slate | PWA install/splash differs from in-app background |
| Android `colors.xml:3` | `#070a12` | used for status bar, nav bar and splash | light mode keeps a dark status bar (`windowLightStatusBar=false`); no palette variants |
| `<html>` `color-scheme` (`styles.css:182`) | `dark` | never flips | native date/time/select/scrollbars stay dark in light mode; only `input[type=time].settings-input` overrides to light |
| `index.html` inline `<style>` | 75 literals | offline indicator, tiles, week strip, run/OT signals, readiness ring | duplicates tokens that exist; e.g. `.offline-indicator` amber `rgba(30,27,12,.94)` on `#fcd34d` |
| `index.html` inline `style` attributes | 41 literals | HR/pace/calorie values, badminton badges, day colours | e.g. cyan `#22d3ee` values with no light override |
| `sw.js` | 0 | — | no action |
| `scripts/` | 14 | icon generator `#070a12`; fixtures `#3b82f6`, photo-test gradients | icon generator is a real brand surface; fixtures are test-only |

Android, manifest and meta all need to be driven from the same resolved palette. That is a
platform change (native + JS), not just CSS, and needs an explicit decision (see §12).

---

## 10. Files ranked by hard-coded colour

| File | Literals | Dominant purpose | Notes |
|---|---:|---|---|
| `css/styles.css` | 1,521 | all | 11,100-line catch-all; tokens live here too |
| `css/programs.css` | 345 | surface/decoration | program cards, builder |
| `css/analytics.css` | 231 | data-viz/effect | `!important` card repaints at 912/1225 |
| `css/progress.css` | 127 | fallback/light | claims "tokens only" in its header |
| `css/hybrid-score.css` | 122 | effect | still loaded; Hybrid Score is retired from Progress but live in briefing/profile |
| `css/brand-consistency.css` | 85 | surface/effect | second token system, `!important` card pins |
| `css/leaflet` (vendor) | 40 | vendor | leave alone |
| `js/analytics/charts.js` | 116 | data-viz | SVG strings |
| `index.html` | 117 | surface/effect | 75 in inline `<style>`, 41 attributes |
| `js/analytics/views/view-fasting.js` | 61 | data-viz/decoration | local `AMBER/GREEN/BLUE/PURPLE/RED` constants |
| `js/analytics/views/view-recovery.js` | 53 | data-viz/decoration | inline SVG |
| `js/analytics/charts/strength-charts.js` | 42 | data-viz | |
| `js/programs/catalog/hyrox.js` | 39 | program identity | `coverGradient` + `accentColor` |
| `js/analytics/charts/running-charts.js` | 38 | data-viz | |
| `js/ui/confirm-modal.js` | 34 | surface/effect | injects its own `<style>`; light-mode bug class |
| `js/programs/catalog/fitness.js` | 33 | program identity | |
| `js/analytics/views/view-strength.js` | 33 | data-viz | |
| `js/analytics/running-detail.js` | 31 | data-viz | |
| `js/programs/catalog/hypertrophy.js` | 27 | program identity | |
| `js/programs/catalog/hybrid.js` | 24 | program identity | |
| `js/programs/catalog/strength.js` | 24 | program identity | |

The six `js/programs/catalog/*.js` files total ~190 literals, almost all `coverGradient` pairs and
`accentColor`. They are editorial identity, not UI chrome. **Decision needed:** themable or fixed.

---

## 11. Proposed semantic token set (candidate)

This is a proposal for approval, derived from current Midnight values plus the UI refresh plan's
token groups (`docs/UI_REFRESH_PLAN.md`, "Design tokens"). Values marked *new* do not exist today.

| Group | Token | Candidate value | Replaces |
|---|---|---|---|
| Surface | `--bg-app` | `#070a12` | `#020408`, `#050a12`, `#060a12`, share-card backgrounds |
| | `--bg-card` | `#0d1420` | `#090e1a`, `#0b1420`, `#0d1020`, `#101b2a→#07111f` |
| | `--bg-raised` | `#111a2a` | `#142235`, `#17243a`, `#101929` |
| | `--bg-input` | `#121b2b` | `#111728`, `#0e1525` |
| | `--bg-input-focus` | `#172236` | `#161e34` |
| | `--bg-deep` | `#0a111d` | `#080f1e`, `#080f1a`, `#0b0f14` |
| | `--bg-nav` | `rgba(7,10,18,.82)` | `rgba(5,10,18,.95)`, `rgba(6,9,17,.80)` |
| Overlay | `--overlay-1..5` | white `.03/.05/.07/.10/.14` | 62 white alphas |
| Text | `--text-primary` | `#e5edf5` | `#f8fafc` |
| | `--text-secondary` | `#94a3b8` | `#94a3b8` |
| | `--text-muted` | `#7c8da5` *new separation* | `#94a3b8` used for both |
| | `--text-faint` | `#7c8da5` | `--text-faint` (keep) |
| | `--text-ghost` | `#64748b` | `--text-ghost` (keep) |
| | `--text-inverse` | `#04121a` (ink on accent) | mis-aliased `--text-primary` |
| Border | `--border-subtle` | `rgba(148,163,184,.10)` | 214 border values |
| | `--border-default` | `rgba(148,163,184,.14)` | |
| | `--border-strong` | `rgba(148,163,184,.24)` | |
| | `--border-focus` | `rgba(34,211,238,.55)` | 33 indigo + 30 cyan alphas |
| Accent | `--accent` | `#22d3ee` | `--color-cyan`, `--brand-cobalt` |
| | `--accent-strong` | `#0891b2` | `--color-blue` (Midnight), `--brand-cobalt-strong` |
| | `--accent-soft` | `rgba(34,211,238,.12)` | `--cyan-alpha`, indigo tints |
| | `--accent-ink` | `#04121a` | `#04121a` one-offs |
| | `--accent-alt` | `#a3e635` | `--color-orange` (Midnight), `--color-lime` |
| Status | `--ok` / `--ok-soft` | `#10b981` / `rgba(16,185,129,.12)` | `--color-green` + 41 alphas |
| | `--warn` / `--warn-soft` | `#f59e0b` / `rgba(245,158,11,.12)` | `--color-amber` + 32 alphas |
| | `--danger` / `--danger-soft` | `#ef4444` / `rgba(239,68,68,.12)` | `--color-red` + 29 alphas |
| | `--info` / `--info-soft` | `#60a5fa` / `rgba(96,165,250,.12)` | `--color-blue` (Slate) + 35 alphas |
| Data | `--data-1..8` | cyan, blue, green, amber, violet, pink, orange, slate | 100+ chart hex |
| | `--data-N-soft` | same hue at `.14` | chart area fills |
| Domain | `--domain-strength` | `#a78bfa` | violet series |
| | `--domain-run` | `#22d3ee` | cyan series |
| | `--domain-walk` | `#94a3b8` | slate series |
| | `--domain-recovery` | `#10b981` | green readiness |
| | `--domain-fasting` | `#f59e0b` | amber fasts |
| | `--domain-body` | `#a3e635` | lime bodyweight |
| | `--domain-muscles` | `#f97316` | orange volume |
| | `--domain-balance` | `#60a5fa` | blue split |
| Heat | `--data-heat-0..4` | `#22364f` + `#ff7a1a` steps | heat map |
| Effect | `--shadow-card` / `--shadow-sheet` | existing `--shadow-sm/lg` values | 194 shadow literals |
| | `--glow-accent` | `rgba(34,211,238,.22)` | 72 distinct tinted shadows |
| | `--glow-danger` | `rgba(239,68,68,.28)` | danger glows |

Removing the 415 fallbacks alone deletes ~12% of all literals without a visual change. Applying
this token set to the 20 most frequent values removes 1,212 more literals (35% of the total).

---

## 12. Product decisions required before A1

1. **Approve the Midnight token table.** The brief's exact table is not in the repository or this
   session; §3 records what the app currently resolves to. Which values are canonical?
2. **Accent colour: cyan or indigo?** Midnight is cyan, but 152 indigo uses and 11 `#4f46e5`
   declarations say indigo. One must lose. Recommendation: cyan is `--accent`; indigo is deleted.
3. **Do palettes apply in light mode?** Today they do not (all palette selectors require
   `data-theme="dark"`). Either palette becomes surface-only in light, or light gets per-palette
   surfaces. This changes `settings.palette` semantics.
4. **Data-viz palette.** Adopt `--data-1..8`? Do status hues (`ok/warn/danger`) remain usable as
   series colours (they are today) or are series colours separate? Recommendation: separate, so a
   red series never reads as an error.
5. **Program cover gradients.** 190 literals across the catalogue. Themable (`--cover-*`) or fixed
   editorial art? If fixed, they must be excluded from the lint allowlist explicitly.
6. **Heat-map orange.** `#ff7a1a` is a third orange. Tokenise as `--data-heat-*` or align with
   `--data-7`?
7. **Platform colour sync.** Should `theme-color`, manifest and Android bars follow the palette and
   light mode? That needs a native/JS change and an Android release; a CSS-only Part A cannot do it.
8. **`--text-inverse`.** Confirm it means "ink on accent" (dark) rather than "primary text". This
   is the root of the light-mode confirm-dialog bug. Recommendation: redefine as `--accent-ink` and
   deprecate `--text-inverse`.
9. **Border naming.** May `--border-light`/`--border-medium` be renamed so the scale is monotonic?
   Renaming touches every palette block and the brand test.
10. **Legacy class names.** `.text-accent-pink` / `.bg-accent-pink` / `.ratio-fill-pink` render
    cyan. Rename (breaks templates/tests) or keep as documented aliases?
11. **`brand-consistency.css`.** Its card pins must go for palettes to work. Confirm that the
    "one surface vocabulary" intent survives tokenisation rather than being re-pinned.
12. **`hybrid-score.css`.** 122 literals for a surface retired from Progress but still used by the
    morning briefing and profile. Tokenise or delete with the Hybrid Score cleanup?

---

## 13. Proposed A1 work order (not started)

1. Make one token file the single source: `:root` = Midnight; palette blocks override only what
   differs; delete the brand re-declaration of core tokens; keep `brand-consistency.css` for
   layout/rhythm only.
2. Add the missing groups (`--accent*`, semantic, `--data-*`, `--domain-*`, `--cover-*`).
3. Remove all 415 fallbacks (mechanical, no visual change) and define `--border`.
4. Replace the 72 tinted shadows and 290 tinted borders with the new tokens; delete per-card glows.
5. Migrate the 20 most frequent values (1,212 literals, 35%) in `styles.css`, `brand-consistency.css`,
   `programs.css`, `analytics.css`, `progress.css`.
6. Tokenise charts through one palette module (`--data-*`), then heat map and muscle groups.
7. Update `tests/brand_visual_system.test.js` (it currently asserts the old cobalt palette) and add
   a ratchet that fails on new raw hex outside the data-viz allowlist.
8. Platform sync (manifest/theme-color/Android) as a separate, approved slice.

---

## Appendix A — full inventory by value

Every distinct normalised colour, its total occurrences, purposes, representative locations and a
proposed token. Rows are sorted by frequency. `fallback` means the literal is the second argument
of `var(--token, …)`; those rows are deletions, not new tokens. Repeated identical values are
grouped into one row (the `n` column). Purposes are listed with occurrence counts; the proposal
uses the dominant one.

| Value | n | Purpose | Representative locations | Proposed token |
|---:|---:|---|---|---|
| `#94a3b8` | 137 | fallback 107 · decoration 15 · token 7 · surface/effect 5 · text 2 · data-viz 1 | `css/styles.css:37`<br>`css/styles.css:119`<br>`css/styles.css:127`<br>`css/styles.css:993`<br>`css/styles.css:1004`<br>… | `--text-secondary` |
| `#f59e0b` | 120 | text 36 · decoration 33 · fallback 21 · data-viz 19 · token 3 · effect 3 · surface/effect 3 · surface 1 · border 1 | `css/styles.css:45`<br>`css/styles.css:1265`<br>`css/styles.css:1279`<br>`css/styles.css:1590`<br>`css/styles.css:2261`<br>… | `--warn` |
| `#ffffff` | 112 | text 54 · surface 21 · effect 12 · vendor 12 · fallback 6 · token 3 · decoration 3 · surface/effect 1 | `css/styles.css:38`<br>`css/styles.css:2242`<br>`css/styles.css:2244`<br>`css/styles.css:2638`<br>`css/styles.css:2651`<br>… | `--text-white/--accent-ink` |
| `#10b981` | 110 | decoration 34 · text 31 · fallback 28 · data-viz 8 · token 5 · effect 2 · surface 1 · border 1 | `css/styles.css:44`<br>`css/styles.css:1118`<br>`css/styles.css:1200`<br>`css/styles.css:1206`<br>`css/styles.css:1213`<br>… | `--ok` |
| `#3b82f6` | 97 | text 25 · decoration 24 · fallback 24 · data-viz 11 · effect 6 · token 3 · border 2 · surface 2 | `css/styles.css:41`<br>`css/styles.css:7934`<br>`css/styles.css:9552`<br>`css/styles.css:9571`<br>`css/styles.css:9579`<br>… | `--info (Slate accent)` |
| `#22d3ee` | 96 | fallback 41 · decoration 21 · text 16 · token 6 · effect 5 · data-viz 5 · surface/effect 2 | `css/styles.css:43`<br>`css/styles.css:2075`<br>`css/styles.css:2167`<br>`css/styles.css:2168`<br>`css/styles.css:2190`<br>… | `--accent (Midnight)` |
| `#f8fafc` | 84 | fallback 53 · effect 8 · decoration 8 · token 4 · surface 4 · surface/effect 4 · text 3 | `css/styles.css:34`<br>`css/styles.css:3024`<br>`css/styles.css:3035`<br>`css/styles.css:3047`<br>`css/styles.css:3906`<br>… | `--text-primary (Slate)/--text-inverse` |
| `#ef4444` | 72 | decoration 31 · text 18 · fallback 16 · surface/effect 3 · token 2 · surface 2 | `css/styles.css:46`<br>`css/styles.css:1007`<br>`css/styles.css:1276`<br>`css/styles.css:1312`<br>`css/styles.css:2163`<br>… | `--danger` |
| `#0f172a` | 65 | text 64 · token 1 | `css/styles.css:1334`<br>`css/styles.css:3912`<br>`css/styles.css:3969`<br>`css/styles.css:4000`<br>`css/styles.css:4006`<br>… | `--text-primary (light)/chart stroke` |
| `#8b5cf6` | 43 | decoration 17 · text 14 · fallback 9 · token 2 · effect 1 | `css/styles.css:47`<br>`css/styles.css:134`<br>`css/styles.css:2981`<br>`css/styles.css:2982`<br>`css/styles.css:2984`<br>… | `--data-5` |
| `#cbd5e1` | 39 | fallback 34 · text 3 · token 1 · decoration 1 | `css/styles.css:126`<br>`css/styles.css:1194`<br>`css/styles.css:1310`<br>`css/styles.css:1420`<br>`css/styles.css:1697`<br>… | `--text-sub` |
| `#60a5fa` | 38 | text 18 · data-viz 7 · effect 3 · surface/effect 3 · surface 2 · fallback 2 · decoration 2 · token 1 | `css/styles.css:1044`<br>`css/styles.css:3199`<br>`css/styles.css:3255`<br>`css/styles.css:7579`<br>`css/styles.css:8099`<br>… | `--info (tint)` |
| `rgba(0,0,0,0.05)` | 38 | surface 31 · effect 3 · border 3 · text 1 | `css/styles.css:4001`<br>`css/styles.css:4011`<br>`css/styles.css:4016`<br>`css/styles.css:4032`<br>`css/styles.css:4041`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.08)` | 37 | border 28 · effect 4 · token 2 · surface 1 · decoration 1 · surface/effect 1 | `css/styles.css:3923`<br>`css/styles.css:3933`<br>`css/styles.css:3940`<br>`css/styles.css:3954`<br>`css/styles.css:3961`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.07)` | 36 | border 24 · effect 9 · surface 1 · text 1 · decoration 1 | `css/styles.css:3932`<br>`css/styles.css:3953`<br>`css/styles.css:3986`<br>`css/styles.css:4028`<br>`css/styles.css:4064`<br>… | `--overlay-*` (light) |
| `rgba(255,255,255,0.07)` | 31 | border 13 · data-viz 9 · surface 4 · token 2 · surface/effect 2 · effect 1 | `css/styles.css:71`<br>`css/styles.css:145`<br>`css/styles.css:3580`<br>`css/analytics.css:750`<br>`css/analytics.css:913`<br>… | `--overlay-*` |
| `rgba(255,255,255,0.5)` | 31 | text 17 · decoration 8 · data-viz 4 · surface 1 · vendor 1 | `css/styles.css:3856`<br>`js/vendor/leaflet/leaflet.css:269`<br>`js/analytics/charts/load-charts.js:12`<br>`js/analytics/charts/load-charts.js:94`<br>`js/analytics/charts/load-charts.js:138`<br>… | `--overlay-*` |
| `rgba(0,0,0,0.12)` | 30 | border 26 · effect 3 · surface 1 | `css/styles.css:3935`<br>`css/styles.css:3981`<br>`css/styles.css:3991`<br>`css/styles.css:4033`<br>`css/styles.css:4042`<br>… | `--overlay-*` (light) |
| `rgba(255,255,255,0.06)` | 29 | surface 17 · decoration 7 · border 3 · token 1 · surface/effect 1 | `css/styles.css:74`<br>`css/styles.css:3893`<br>`css/styles.css:9640`<br>`css/styles.css:9645`<br>`css/programs.css:3664`<br>… | `--overlay-*` |
| `#f97316` | 27 | text 13 · decoration 8 · effect 2 · border 1 · surface 1 · fallback 1 · token 1 | `css/styles.css:1512`<br>`css/styles.css:1513`<br>`css/styles.css:2897`<br>`css/styles.css:7573`<br>`css/styles.css:7699`<br>… | `--data-7/--brand-today` |
| `rgba(255,255,255,0.08)` | 26 | decoration 8 · border 6 · surface 5 · data-viz 5 · token 1 · surface/effect 1 | `css/styles.css:75`<br>`css/styles.css:6005`<br>`css/programs.css:210`<br>`css/programs.css:2827`<br>`css/analytics.css:1407`<br>… | `--overlay-*` |
| `#0e7490` | 23 | text 17 · decoration 2 · border 1 · token 1 · surface 1 · effect 1 | `css/styles.css:2975`<br>`css/styles.css:5781`<br>`css/styles.css:5790`<br>`css/styles.css:5852`<br>`css/styles.css:6035`<br>… | `--accent-strong (styles Midnight)` |
| `rgba(0,0,0,0.06)` | 23 | border 12 · effect 9 · token 2 | `css/styles.css:3926`<br>`css/styles.css:3927`<br>`css/styles.css:3975`<br>`css/styles.css:4003`<br>`css/styles.css:5767`<br>… | `--overlay-*` (light) |
| `#ec4899` | 22 | data-viz 10 · text 5 · effect 3 · token 2 · surface 1 · decoration 1 | `css/styles.css:63`<br>`css/styles.css:133`<br>`js/analytics/charts/running-charts.js:34`<br>`js/analytics/charts/running-charts.js:34`<br>`js/analytics/charts/running-charts.js:56`<br>… | `--data-6` |
| `rgba(255,255,255,0.6)` | 22 | text 12 · data-viz 5 · decoration 4 · border 1 | `css/styles.css:6350`<br>`css/styles.css:8442`<br>`js/analytics/charts/chart-primitives.js:93`<br>`js/analytics/charts/load-charts.js:128`<br>`js/analytics/charts/recovery-charts.js:211`<br>… | `--text-*` |
| `rgba(0,0,0,0.10)` | 21 | border 11 · effect 4 · decoration 3 · token 1 · surface 1 · surface/effect 1 | `css/styles.css:3934`<br>`css/styles.css:3942`<br>`css/styles.css:3958`<br>`css/styles.css:5118`<br>`css/styles.css:5395`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.55)` | 21 | text 12 · effect 8 · surface 1 | `css/styles.css:140`<br>`css/styles.css:433`<br>`css/styles.css:1842`<br>`css/styles.css:1872`<br>`css/styles.css:3992`<br>… | `--overlay-*` (light) |
| `rgba(255,255,255,0.04)` | 21 | surface 10 · surface/effect 4 · decoration 3 · effect 2 · token 1 · border 1 | `css/styles.css:144`<br>`css/styles.css:5243`<br>`css/analytics.css:1406`<br>`css/analytics.css:1477`<br>`css/analytics.css:1509`<br>… | `--overlay-*` |
| `#2563eb` | 19 | text 9 · effect 4 · fallback 3 · surface 2 · token 1 | `css/styles.css:2247`<br>`css/styles.css:6061`<br>`css/styles.css:8235`<br>`css/styles.css:8541`<br>`css/styles.css:8593`<br>… | `--info-strong` |
| `#475569` | 17 | text 14 · token 2 · decoration 1 | `css/styles.css:3913`<br>`css/styles.css:3916`<br>`css/styles.css:5855`<br>`css/styles.css:6310`<br>`css/progress.css:439`<br>… | `--text-secondary (light)` |
| `rgba(0,0,0,0.02)` | 17 | surface 17 | `css/styles.css:6041`<br>`css/styles.css:8929`<br>`css/programs.css:2242`<br>`css/programs.css:2247`<br>`css/programs.css:2436`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.03)` | 17 | surface 16 · token 1 | `css/styles.css:3925`<br>`css/styles.css:4106`<br>`css/styles.css:4890`<br>`css/styles.css:5980`<br>`css/styles.css:6262`<br>… | `--overlay-*` (light) |
| `rgba(255,255,255,0.4)` | 17 | text 8 · decoration 5 · data-viz 4 | `js/analytics/charts/chart-primitives.js:106`<br>`js/analytics/charts/recovery-charts.js:66`<br>`js/analytics/charts/strength-charts.js:225`<br>`js/analytics/charts/strength-charts.js:231`<br>`js/analytics/charts.js:618`<br>… | `--overlay-*` |
| `#f1f5f9` | 16 | text 13 · fallback 3 | `css/styles.css:3420`<br>`css/styles.css:3550`<br>`css/styles.css:3875`<br>`css/styles.css:10363`<br>`css/styles.css:10435`<br>… | `--text-*` |
| `rgba(0,0,0,0.04)` | 16 | surface 15 · token 1 | `css/styles.css:3939`<br>`css/styles.css:5818`<br>`css/styles.css:5952`<br>`css/styles.css:6024`<br>`css/styles.css:6319`<br>… | `--overlay-*` (light) |
| `#ff6b00` | 15 | fallback 13 · token 1 · decoration 1 | `css/styles.css:48`<br>`css/styles.css:1311`<br>`css/styles.css:2000`<br>`css/styles.css:2000`<br>`css/styles.css:2160`<br>… | `--data-7 (legacy Coros)` |
| `rgba(255,255,255,0.05)` | 15 | surface 7 · decoration 3 · data-viz 3 · effect 1 · surface/effect 1 | `css/styles.css:1990`<br>`css/styles.css:3034`<br>`css/styles.css:9631`<br>`css/analytics.css:1717`<br>`css/hybrid-score.css:17`<br>… | `--overlay-*` |
| `#1a0e2e` | 14 | effect 12 · decoration 2 | `js/app.js:1204`<br>`js/athlete-profile.js:161`<br>`js/profile-stats.js:653`<br>`js/programs/catalog/hybrid.js:30`<br>`js/programs/catalog/hybrid.js:180`<br>… | `--cover-default` |
| `rgba(255,255,255,0.14)` | 14 | border 8 · decoration 4 · token 1 · surface 1 | `css/styles.css:148`<br>`css/programs.css:2818`<br>`css/programs.css:3637`<br>`css/programs.css:3663`<br>`css/progress.css:468`<br>… | `--overlay-*` |
| `rgba(99,102,241,0.5)` | 14 | border 12 · effect 2 | `css/styles.css:1872`<br>`css/styles.css:1880`<br>`css/styles.css:3323`<br>`css/styles.css:3338`<br>`css/styles.css:3407`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#64748b` | 13 | text 6 · decoration 3 · token 2 · fallback 2 | `css/styles.css:130`<br>`css/styles.css:3920`<br>`css/styles.css:9160`<br>`css/styles.css:10154`<br>`css/programs.css:4199`<br>… | `--text-ghost` |
| `rgba(0,0,0,0.45)` | 13 | effect 6 · text 6 · surface 1 | `css/styles.css:437`<br>`css/styles.css:1072`<br>`css/styles.css:4034`<br>`css/styles.css:5509`<br>`css/styles.css:5933`<br>… | `--shadow-*` |
| `rgba(0,0,0,0.5)` | 13 | effect 9 · text 4 | `css/styles.css:4494`<br>`css/styles.css:4509`<br>`css/styles.css:4880`<br>`css/styles.css:5239`<br>`css/styles.css:5439`<br>… | `--shadow-*` |
| `rgba(255,255,255,0.12)` | 13 | border 3 · token 2 · surface 2 · data-viz 2 · effect 2 · decoration 1 · surface/effect 1 | `css/styles.css:76`<br>`css/styles.css:146`<br>`css/styles.css:1826`<br>`css/progress.css:243`<br>`css/hybrid-score.css:198`<br>… | `--overlay-*` |
| `rgba(99,102,241,0.35)` | 13 | border 9 · effect 3 · decoration 1 | `css/styles.css:1828`<br>`css/styles.css:3334`<br>`css/styles.css:4276`<br>`css/styles.css:4746`<br>`css/styles.css:5123`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#1d4ed8` | 12 | text 7 · surface 2 · effect 1 · token 1 · decoration 1 | `css/styles.css:5876`<br>`css/styles.css:5994`<br>`css/styles.css:6081`<br>`css/styles.css:8143`<br>`css/styles.css:8577`<br>… | `--info-strong` |
| `#4f46e5` | 12 | effect 6 · text 5 · decoration 1 | `css/styles.css:5583`<br>`css/styles.css:5714`<br>`css/styles.css:5828`<br>`css/styles.css:5937`<br>`css/styles.css:6017`<br>… | `--border-focus (legacy indigo)` |
| `#a78bfa` | 12 | text 4 · decoration 4 · data-viz 2 · token 1 · effect 1 | `css/styles.css:9627`<br>`css/analytics.css:59`<br>`js/analytics/charts/load-charts.js:152`<br>`js/analytics/charts/load-charts.js:165`<br>`js/analytics/charts/load-charts.js:166`<br>… | `--data-5 (tint)` |
| `rgba(0,0,0,0.35)` | 12 | effect 4 · surface 3 · text 3 · decoration 1 · surface/effect 1 | `css/styles.css:753`<br>`css/styles.css:1548`<br>`css/styles.css:1720`<br>`css/styles.css:3082`<br>`css/styles.css:4001`<br>… | `--shadow-*` |
| `rgba(255,255,255,0.03)` | 12 | surface 4 · decoration 4 · border 2 · token 1 · effect 1 | `css/styles.css:73`<br>`css/styles.css:3892`<br>`css/styles.css:6294`<br>`css/styles.css:9620`<br>`css/progress.css:125`<br>… | `--overlay-*` |
| `rgba(255,255,255,0.55)` | 12 | data-viz 10 · effect 1 · decoration 1 | `css/styles.css:8320`<br>`css/analytics.css:938`<br>`js/analytics/charts/chart-primitives.js:49`<br>`js/analytics/charts/load-charts.js:73`<br>`js/analytics/charts/load-charts.js:83`<br>… | `--data-*` (§8) |
| `rgba(99,102,241,0.10)` | 12 | surface 7 · effect 4 · token 1 | `css/styles.css:151`<br>`css/styles.css:1879`<br>`css/styles.css:2039`<br>`css/styles.css:2184`<br>`css/styles.css:5122`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#155e75` | 11 | text 5 · decoration 3 · effect 3 | `css/styles.css:10628`<br>`css/styles.css:10632`<br>`css/styles.css:10633`<br>`css/styles.css:10635`<br>`css/styles.css:10635`<br>… | `--accent` |
| `rgba(255,255,255,0.7)` | 11 | data-viz 9 · surface 1 · text 1 | `css/styles.css:5857`<br>`js/analytics/charts/strength-charts.js:253`<br>`js/analytics/charts/strength-charts.js:255`<br>`js/analytics/charts/strength-charts.js:257`<br>`js/analytics/charts.js:218`<br>… | `--data-*` (§8) |
| `#dc2626` | 10 | text 10 | `css/styles.css:5963`<br>`css/styles.css:6088`<br>`css/programs.css:2239`<br>`css/programs.css:3426`<br>`js/programs/catalog/hybrid.js:205`<br>… | `--danger-strong` |
| `#f43f5e` | 10 | text 7 · surface 2 · border 1 | `css/styles.css:7122`<br>`css/styles.css:7287`<br>`css/styles.css:7369`<br>`css/styles.css:7396`<br>`css/styles.css:7470`<br>… | `--danger (rose)` |
| `rgba(16,185,129,0.35)` | 10 | effect 3 · border 3 · decoration 3 · text 1 | `css/styles.css:565`<br>`css/styles.css:1373`<br>`css/styles.css:2158`<br>`css/styles.css:3731`<br>`css/styles.css:5607`<br>… | `--ok-soft` |
| `rgba(255,255,255,.04)` | 10 | surface 8 · border 1 · decoration 1 | `css/styles.css:3467`<br>`css/styles.css:9999`<br>`css/styles.css:10172`<br>`css/styles.css:10249`<br>`css/styles.css:10313`<br>… | `--overlay-*` |
| `rgba(255,255,255,.08)` | 10 | decoration 4 · border 3 · surface 3 | `css/styles.css:10291`<br>`css/styles.css:10350`<br>`css/styles.css:10414`<br>`css/hybrid-score.css:56`<br>`css/hybrid-score.css:90`<br>… | `--border-*` |
| `rgba(255,255,255,0.8)` | 10 | data-viz 6 · vendor 2 · border 1 · text 1 | `css/analytics.css:853`<br>`js/vendor/leaflet/leaflet.css:415`<br>`js/vendor/leaflet/leaflet.css:451`<br>`js/analytics/charts/running-charts.js:171`<br>`js/analytics/charts/strength-charts.js:166`<br>… | `--data-*` (§8) |
| `rgba(99,102,241,0.12)` | 10 | surface 7 · effect 2 · border 1 | `css/styles.css:4497`<br>`css/styles.css:4512`<br>`css/styles.css:4883`<br>`css/styles.css:5439`<br>`css/styles.css:6239`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#070a12` | 9 | token 3 · decoration 3 · fallback 1 · surface/effect 1 · surface 1 | `css/styles.css:6280`<br>`css/styles.css:10866`<br>`css/brand-consistency.css:38`<br>`css/brand-consistency.css:49`<br>`index.html:13`<br>… | `--bg-app (Midnight)` |
| `#0d1117` | 9 | data-viz 8 · decoration 1 | `css/analytics.css:937`<br>`js/analytics/charts/chart-primitives.js:62`<br>`js/analytics/charts/load-charts.js:67`<br>`js/analytics/charts/load-charts.js:120`<br>`js/analytics/charts/running-charts.js:61`<br>… | `--chart-stroke` |
| `#23272e` | 9 | fallback 9 | `css/styles.css:9375`<br>`css/styles.css:9378`<br>`css/styles.css:9388`<br>`css/styles.css:9541`<br>`css/styles.css:9551`<br>… | `--border` (delete fallback) |
| `#6366f1` | 9 | text 4 · fallback 2 · effect 2 · token 1 | `css/styles.css:42`<br>`css/analytics.css:1550`<br>`css/hybrid-score.css:57`<br>`css/hybrid-score.css:107`<br>`js/analytics/recovery-detail.js:80`<br>… | `--text-*` (review) |
| `#7c3aed` | 9 | effect 4 · text 4 · decoration 1 | `css/styles.css:6453`<br>`css/styles.css:7150`<br>`css/styles.css:9146`<br>`js/analytics/charts/load-charts.js:152`<br>`js/athlete-profile.js:354`<br>… | `--data-5 (deep)` |
| `#a5b4fc` | 9 | text 9 | `css/styles.css:3604`<br>`css/styles.css:4379`<br>`css/styles.css:4454`<br>`css/styles.css:4486`<br>`css/styles.css:4732`<br>… | `--text-*` (review) |
| `#b45309` | 9 | text 5 · decoration 3 · token 1 | `css/styles.css:4203`<br>`css/styles.css:4216`<br>`css/styles.css:5946`<br>`css/styles.css:10852`<br>`css/styles.css:10855`<br>… | `--warn-ink (light)` |
| `#fbbf24` | 9 | text 4 · effect 2 · decoration 2 · border 1 | `css/styles.css:1503`<br>`css/styles.css:1504`<br>`css/styles.css:3257`<br>`css/styles.css:4165`<br>`css/styles.css:6572`<br>… | `--warn (tint)` |
| `rgba(0,0,0,0.09)` | 9 | surface 4 · border 4 · token 1 | `css/styles.css:3928`<br>`css/styles.css:4037`<br>`css/styles.css:4054`<br>`css/styles.css:4891`<br>`css/styles.css:5921`<br>… | `--overlay-*` (light) |
| `rgba(239,68,68,0.12)` | 9 | surface 7 · token 1 · surface/effect 1 | `css/styles.css:68`<br>`css/styles.css:2901`<br>`css/styles.css:5961`<br>`css/styles.css:9628`<br>`css/analytics.css:664`<br>… | `--danger-soft` |
| `#0b0f14` | 8 | fallback 5 · surface 3 | `css/styles.css:3046`<br>`css/styles.css:8320`<br>`css/styles.css:9301`<br>`css/styles.css:9380`<br>`css/styles.css:9608`<br>… | `--bg-app` (delete fallback) |
| `#0d1b2a` | 8 | effect 6 · decoration 2 | `js/app.js:1205`<br>`js/programs/catalog/hybrid.js:155`<br>`js/programs/detail.js:87`<br>`js/programs/library.js:900`<br>`js/programs/program-card.js:79`<br>… | `--cover-default` |
| `#a3e635` | 8 | token 3 · decoration 2 · data-viz 2 · text 1 | `css/styles.css:1584`<br>`css/styles.css:3176`<br>`css/styles.css:10863`<br>`css/brand-consistency.css:47`<br>`css/brand-consistency.css:56`<br>… | `--accent-alt (lime)` |
| `#ff7a1a` | 8 | decoration 4 · surface 2 · text 1 · border 1 | `css/styles.css:2604`<br>`css/styles.css:2605`<br>`css/styles.css:2606`<br>`css/styles.css:2624`<br>`css/styles.css:2625`<br>… | `--data-heat` |
| `rgba(0,0,0,0.1)` | 8 | border 8 | `css/styles.css:4012`<br>`css/styles.css:4017`<br>`css/styles.css:7306`<br>`css/styles.css:7608`<br>`css/styles.css:8065`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.18)` | 8 | border 4 · surface 2 · effect 1 · decoration 1 | `css/styles.css:1136`<br>`css/styles.css:1691`<br>`css/styles.css:5824`<br>`css/styles.css:5883`<br>`css/styles.css:5909`<br>… | `--overlay-*` (light) |
| `rgba(16,185,129,0.12)` | 8 | surface 8 | `css/styles.css:3730`<br>`css/styles.css:7050`<br>`css/styles.css:7286`<br>`css/programs.css:1380`<br>`css/programs.css:1546`<br>… | `--ok-soft` |
| `rgba(255,255,255,0.25)` | 8 | border 4 · decoration 3 · effect 1 | `css/styles.css:564`<br>`css/styles.css:3232`<br>`css/styles.css:3253`<br>`css/styles.css:9140`<br>`css/analytics.css:330`<br>… | `--border-*` |
| `rgba(255,255,255,0.3)` | 8 | text 6 · surface 1 · surface/effect 1 | `css/programs.css:431`<br>`js/analytics/charts/chart-primitives.js:83`<br>`js/analytics/charts/fasting-charts.js:210`<br>`js/analytics/views/view-fasting.js:368`<br>`js/analytics/views/view-fasting.js:404`<br>… | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 8 | text 7 · border 1 | `css/styles.css:553`<br>`css/programs.css:3444`<br>`js/analytics/charts/fasting-charts.js:289`<br>`js/analytics/views/view-fasting.js:147`<br>`js/analytics/views/view-fasting.js:148`<br>… | `--border-*` |
| `rgba(255,255,255,0.9)` | 8 | data-viz 4 · effect 3 · text 1 | `css/styles.css:5741`<br>`css/styles.css:5745`<br>`css/programs.css:780`<br>`css/analytics.css:824`<br>`js/analytics/charts.js:156`<br>… | `--data-*` (§8) |
| `rgba(59,130,246,0.18)` | 8 | border 4 · surface 3 · surface/effect 1 | `css/styles.css:1027`<br>`css/styles.css:1626`<br>`css/styles.css:1744`<br>`css/styles.css:3255`<br>`css/styles.css:5875`<br>… | `--info-soft` |
| `rgba(99,102,241,0.06)` | 8 | effect 5 · surface 3 | `css/styles.css:4029`<br>`css/styles.css:5215`<br>`css/styles.css:5618`<br>`css/styles.css:5732`<br>`css/styles.css:5837`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.4)` | 8 | border 7 · effect 1 | `css/styles.css:3415`<br>`css/styles.css:4498`<br>`css/styles.css:4513`<br>`css/styles.css:4884`<br>`css/styles.css:4903`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#06b6d4` | 7 | text 6 · decoration 1 | `js/analytics/running-detail.js:76`<br>`js/programs/catalog/fitness.js:129`<br>`js/programs/catalog/fitness.js:174`<br>`js/programs/catalog/hyrox.js:720`<br>`js/programs/catalog/running.js:83`<br>… | `--accent (near-dup)` |
| `#0a1628` | 7 | effect 7 | `js/programs/catalog/hypertrophy.js:30`<br>`js/programs/catalog/hypertrophy.js:55`<br>`js/programs/catalog/hypertrophy.js:80`<br>`js/programs/catalog/hypertrophy.js:105`<br>`js/programs/catalog/hypertrophy.js:480`<br>… | `--shadow-*`/`--glow-*` (review) |
| `#161b22` | 7 | fallback 7 | `css/styles.css:2984`<br>`css/styles.css:9377`<br>`css/styles.css:9378`<br>`css/styles.css:9388`<br>`css/styles.css:9541`<br>… | `--bg-card` (delete fallback) |
| `#1a0a0a` | 7 | effect 7 | `js/programs/catalog/hybrid.js:205`<br>`js/programs/catalog/strength.js:30`<br>`js/programs/catalog/strength.js:79`<br>`js/programs/catalog/strength.js:104`<br>`js/programs/catalog/strength.js:157`<br>… | `--shadow-*`/`--glow-*` (review) |
| `#a855f7` | 7 | data-viz 3 · text 3 · decoration 1 | `js/analytics/charts.js:194`<br>`js/analytics/charts.js:199`<br>`js/analytics/charts.js:203`<br>`js/analytics/recovery-detail.js:118`<br>`js/programs/catalog/hypertrophy.js:155`<br>… | `--data-5 (near-dup)` |
| `#bfdbfe` | 7 | text 6 · token 1 | `css/programs.css:113`<br>`css/programs.css:297`<br>`css/programs.css:986`<br>`css/programs.css:1030`<br>`css/programs.css:2195`<br>… | `--info` |
| `#f87171` | 7 | text 6 · border 1 | `css/styles.css:3075`<br>`css/styles.css:3235`<br>`css/styles.css:3258`<br>`css/styles.css:3267`<br>`css/styles.css:3657`<br>… | `--text-*` (review) |
| `rgba(0,0,0,.08)` | 7 | border 5 · surface 2 | `css/styles.css:10101`<br>`css/styles.css:10102`<br>`css/styles.css:10273`<br>`css/styles.css:10274`<br>`css/styles.css:10338`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.14)` | 7 | border 5 · token 2 | `css/styles.css:3941`<br>`css/styles.css:3943`<br>`css/styles.css:4874`<br>`css/styles.css:5988`<br>`css/styles.css:6320`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.4)` | 7 | vendor 3 · surface 2 · effect 2 | `css/styles.css:4023`<br>`css/styles.css:5624`<br>`css/programs.css:831`<br>`js/vendor/leaflet/leaflet.css:354`<br>`js/vendor/leaflet/leaflet.css:525`<br>… | vendor |
| `rgba(0,0,0,0.6)` | 7 | surface 3 · text 2 · effect 2 | `css/styles.css:3348`<br>`css/styles.css:4018`<br>`css/styles.css:5243`<br>`css/styles.css:7824`<br>`css/styles.css:8980`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.75)` | 7 | text 5 · effect 2 | `css/styles.css:3996`<br>`css/styles.css:4038`<br>`css/styles.css:4055`<br>`css/styles.css:5691`<br>`css/styles.css:5958`<br>… | `--overlay-*` (light) |
| `rgba(255,255,255,0.09)` | 7 | border 2 · decoration 2 · surface 1 · effect 1 · surface/effect 1 | `css/analytics.css:1549`<br>`css/progress.css:1101`<br>`css/hybrid-score.css:146`<br>`js/brain/hybrid-score/ui.js:41`<br>`js/fasting/fasting-ring.js:35`<br>… | `--overlay-*` |
| `rgba(255,255,255,0.1)` | 7 | surface/effect 3 · data-viz 2 · decoration 2 | `js/analytics/charts.js:268`<br>`js/analytics/charts.js:319`<br>`index.html:309`<br>`index.html:323`<br>`index.html:346`<br>… | `--overlay-*` |
| `rgba(34,211,238,0.08)` | 7 | surface 4 · effect 2 · token 1 | `css/styles.css:152`<br>`css/styles.css:2965`<br>`css/styles.css:5445`<br>`css/styles.css:8873`<br>`css/styles.css:9399`<br>… | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.28)` | 7 | border 2 · surface/effect 2 · surface 1 · effect 1 · decoration 1 | `css/styles.css:8108`<br>`css/styles.css:8457`<br>`css/styles.css:8886`<br>`css/hybrid-score.css:163`<br>`js/analytics/views/view-progress.js:78`<br>… | `--info-soft` |
| `rgba(99,102,241,0.08)` | 7 | surface 4 · effect 3 | `css/styles.css:3394`<br>`css/styles.css:4902`<br>`css/styles.css:5199`<br>`css/styles.css:5243`<br>`css/styles.css:5810`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.18)` | 7 | border 4 · surface 2 · effect 1 | `css/styles.css:4484`<br>`css/styles.css:5051`<br>`css/styles.css:5652`<br>`css/styles.css:5766`<br>`css/styles.css:5836`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.28)` | 7 | border 4 · surface 2 · effect 1 | `css/styles.css:1841`<br>`css/styles.css:4488`<br>`css/styles.css:5658`<br>`css/styles.css:9017`<br>`css/programs.css:2430`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#1e3a5f` | 6 | effect 6 | `js/programs/catalog/hypertrophy.js:30`<br>`js/programs/catalog/hypertrophy.js:55`<br>`js/programs/catalog/hypertrophy.js:105`<br>`js/programs/catalog/hypertrophy.js:480`<br>`js/programs/catalog/running.js:30`<br>… | `--shadow-*`/`--glow-*` (review) |
| `rgba(0,0,0,.02)` | 6 | surface 6 | `css/styles.css:10101`<br>`css/styles.css:10102`<br>`css/styles.css:10273`<br>`css/styles.css:10338`<br>`css/styles.css:10375`<br>… | `--overlay-*` (light) |
| `rgba(0,0,0,0.28)` | 6 | effect 4 · text 2 | `css/styles.css:3623`<br>`css/styles.css:4070`<br>`css/styles.css:8599`<br>`css/programs.css:782`<br>`css/analytics.css:914`<br>… | `--shadow-*` |
| `rgba(0,0,0,0.40)` | 6 | effect 3 · text 3 | `css/styles.css:139`<br>`css/styles.css:424`<br>`css/styles.css:6071`<br>`css/styles.css:8617`<br>`css/styles.css:9222`<br>… | `--shadow-*` |
| `rgba(0,0,0,0.50)` | 6 | text 3 · effect 2 · decoration 1 | `css/styles.css:1827`<br>`css/styles.css:5954`<br>`css/styles.css:5999`<br>`css/styles.css:6012`<br>`css/programs.css:4052`<br>… | `--overlay-*` (light) |
| `rgba(15,23,42,0.08)` | 6 | surface 4 · border 1 · effect 1 | `css/progress.css:427`<br>`css/progress.css:449`<br>`css/progress.css:452`<br>`css/progress.css:689`<br>`css/hybrid-score.css:282`<br>… | `--data-*`/review |
| `rgba(16,185,129,0.10)` | 6 | surface 6 | `css/styles.css:1191`<br>`css/styles.css:2011`<br>`css/styles.css:6190`<br>`css/analytics.css:888`<br>`css/analytics.css:1723`<br>… | `--ok-soft` |
| `rgba(16,185,129,0.15)` | 6 | surface 5 · effect 1 | `css/programs.css:3980`<br>`css/programs.css:4002`<br>`css/analytics.css:229`<br>`css/analytics.css:741`<br>`js/analytics/views/view-strength.js:141`<br>… | `--ok-soft` |
| `rgba(245,158,11,0.10)` | 6 | surface 3 · decoration 2 · token 1 | `css/styles.css:153`<br>`css/styles.css:2721`<br>`css/styles.css:2723`<br>`css/styles.css:8032`<br>`css/analytics.css:1072`<br>… | `--warn-soft` |
| `rgba(245,158,11,0.12)` | 6 | surface 5 · surface/effect 1 | `css/styles.css:393`<br>`css/styles.css:5059`<br>`css/styles.css:9626`<br>`css/styles.css:9632`<br>`css/programs.css:1552`<br>… | `--warn-soft` |
| `rgba(245,158,11,0.28)` | 6 | border 3 · effect 2 · surface 1 | `css/styles.css:394`<br>`css/styles.css:6565`<br>`css/styles.css:8033`<br>`css/styles.css:8456`<br>`css/analytics.css:1073`<br>… | `--warn-soft` |
| `rgba(245,158,11,0.35)` | 6 | border 4 · decoration 2 | `css/styles.css:5941`<br>`css/styles.css:7520`<br>`css/styles.css:8071`<br>`css/programs.css:1551`<br>`js/analytics/views/view-weekly-review.js:60`<br>… | `--warn-soft` |
| `rgba(255,255,255,.09)` | 6 | border 5 · surface 1 | `css/styles.css:9997`<br>`css/styles.css:10057`<br>`css/styles.css:10139`<br>`css/styles.css:10170`<br>`css/styles.css:10248`<br>… | `--border-*` |
| `rgba(255,255,255,0.10)` | 6 | decoration 2 · token 1 · surface 1 · border 1 · surface/effect 1 | `css/styles.css:147`<br>`css/styles.css:5378`<br>`css/hybrid-score.css:18`<br>`js/brain/hybrid-score/share-card.js:112`<br>`js/home/tile-renderers.js:86`<br>… | `--overlay-*` |
| `rgba(255,255,255,0.45)` | 6 | data-viz 3 · decoration 1 · text 1 · surface/effect 1 | `js/analytics/charts/chart-primitives.js:37`<br>`js/analytics/charts/fasting-charts.js:14`<br>`js/analytics/charts.js:150`<br>`js/analytics/charts.js:816`<br>`js/analytics/views/view-fasting.js:383`<br>… | `--data-*` (§8) |
| `rgba(34,211,238,0.22)` | 6 | border 4 · surface 1 · effect 1 | `css/styles.css:5501`<br>`css/styles.css:5636`<br>`css/styles.css:5643`<br>`css/styles.css:8874`<br>`css/styles.css:9360`<br>… | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.35)` | 6 | border 2 · effect 2 · text 1 · decoration 1 | `css/styles.css:898`<br>`css/styles.css:910`<br>`css/analytics.css:1487`<br>`css/progress.css:345`<br>`css/progress.css:504`<br>… | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.10)` | 6 | surface 5 · token 1 | `css/styles.css:66`<br>`css/styles.css:5992`<br>`css/styles.css:6177`<br>`css/styles.css:8540`<br>`css/styles.css:8885`<br>… | `--info-soft` |
| `rgba(59,130,246,0.12)` | 6 | surface 4 · border 1 · surface/effect 1 | `css/styles.css:1143`<br>`css/styles.css:8096`<br>`css/styles.css:8577`<br>`css/styles.css:11106`<br>`css/analytics.css:844`<br>… | `--info-soft` |
| `rgba(59,130,246,0.15)` | 6 | border 3 · surface 2 · decoration 1 | `css/styles.css:2881`<br>`css/styles.css:3198`<br>`css/styles.css:6083`<br>`css/styles.css:8939`<br>`css/analytics.css:230`<br>… | `--info-soft` |
| `rgba(59,130,246,0.35)` | 6 | decoration 3 · surface 2 · border 1 | `css/styles.css:5993`<br>`js/analytics/views/view-recovery.js:611`<br>`js/analytics/views/view-recovery.js:644`<br>`js/analytics/views/view-weekly-review.js:64`<br>`index.html:866`<br>… | `--info-soft` |
| `rgba(99,102,241,0.2)` | 6 | surface 5 · border 1 | `css/styles.css:3602`<br>`css/styles.css:4377`<br>`css/styles.css:4452`<br>`css/styles.css:4730`<br>`css/styles.css:5094`<br>… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#000000` | 5 | text 2 · effect 2 · border 1 | `css/styles.css:4166`<br>`css/styles.css:6211`<br>`css/styles.css:6212`<br>`css/programs.css:811`<br>`css/analytics.css:328` | `--text-*` (review) |
| `#020408` | 5 | token 2 · surface 2 · decoration 1 | `css/styles.css:23`<br>`css/styles.css:10881`<br>`js/analytics/share-card.js:35`<br>`manifest.json:28`<br>`manifest.json:29` | `--bg-app (Slate)` |
| `#0891b2` | 5 | token 3 · effect 2 | `css/styles.css:8236`<br>`css/brand-consistency.css:42`<br>`css/brand-consistency.css:48`<br>`css/brand-consistency.css:55`<br>`css/brand-consistency.css:58` | `--accent-strong` |
| `#090e1a` | 5 | token 3 · effect 2 | `css/styles.css:24`<br>`css/styles.css:31`<br>`css/styles.css:10882`<br>`css/analytics.css:912`<br>`css/analytics.css:1225` | `--bg-card (Slate)` |
| `#334155` | 5 | decoration 2 · token 1 · fallback 1 · text 1 | `css/styles.css:3918`<br>`css/analytics.css:1711`<br>`js/session-recap.js:429`<br>`js/session-recap.js:525`<br>`js/ui/confirm-modal.js:51` | `--text-strong (light)` |
| `#34d399` | 5 | decoration 2 · text 1 · token 1 · effect 1 | `css/styles.css:3256`<br>`css/styles.css:10905`<br>`css/analytics.css:543`<br>`js/analytics/views/view-muscles.js:31`<br>`js/session-recap.js:322` | `--ok (tint)` |
| `#3d1515` | 5 | effect 5 | `js/programs/catalog/hybrid.js:205`<br>`js/programs/catalog/strength.js:30`<br>`js/programs/catalog/strength.js:104`<br>`js/programs/catalog/strength.js:157`<br>`js/programs/catalog/strength.js:354` | `--shadow-*`/`--glow-*` (review) |
| `#526176` | 5 | token 3 · text 2 | `css/styles.css:3914`<br>`css/styles.css:3917`<br>`css/styles.css:3919`<br>`js/ui/confirm-modal.js:49`<br>`js/ui/confirm-modal.js:50` | `--text-muted (light)` |
| `#6ee7b7` | 5 | text 4 · decoration 1 | `css/styles.css:1313`<br>`css/styles.css:3038`<br>`css/styles.css:4638`<br>`css/styles.css:10075`<br>`js/analytics/views/view-muscles.js:31` | `--ok` |
| `#c4b5fd` | 5 | decoration 3 · text 2 | `css/styles.css:6509`<br>`css/styles.css:6890`<br>`js/analytics/views/view-muscles.js:30`<br>`js/athlete-profile.js:392`<br>`js/profile-stats.js:586` | `--data-5` |
| `rgba(0,0,0,0.22)` | 5 | effect 2 · border 2 · text 1 | `css/styles.css:137`<br>`css/styles.css:2257`<br>`css/styles.css:3995`<br>`css/styles.css:9142`<br>`css/programs.css:3304` | `--shadow-*` |
| `rgba(0,0,0,0.25)` | 5 | effect 4 · border 1 | `css/styles.css:461`<br>`css/styles.css:1064`<br>`css/styles.css:5957`<br>`css/styles.css:9377`<br>`css/analytics.css:854` | `--shadow-*` |
| `rgba(0,0,0,0.60)` | 5 | text 5 | `css/styles.css:5918`<br>`css/programs.css:2426`<br>`css/programs.css:2860`<br>`css/programs.css:3277`<br>`css/programs.css:3418` | `--overlay-*` (light) |
| `rgba(0,0,0,0.65)` | 5 | effect 2 · text 2 · vendor 1 | `css/styles.css:141`<br>`css/styles.css:687`<br>`css/styles.css:4013`<br>`css/styles.css:9142`<br>`js/vendor/leaflet/leaflet.css:285` | `--shadow-*` |
| `rgba(16,185,129,0.08)` | 5 | surface 4 · effect 1 | `css/styles.css:539`<br>`css/styles.css:1359`<br>`css/styles.css:2158`<br>`css/styles.css:5624`<br>`css/programs.css:3994` | `--ok-soft` |
| `rgba(16,185,129,0.25)` | 5 | border 2 · effect 1 · surface 1 · decoration 1 | `css/styles.css:577`<br>`css/styles.css:7051`<br>`css/programs.css:3939`<br>`css/programs.css:4092`<br>`js/analytics/views/view-recovery.js:270` | `--ok-soft` |
| `rgba(239,68,68,0.10)` | 5 | surface 2 · surface/effect 2 · border 1 | `css/programs.css:2166`<br>`css/analytics.css:889`<br>`css/hybrid-score.css:189`<br>`index.html:262`<br>`index.html:272` | `--danger-soft` |
| `rgba(239,68,68,0.18)` | 5 | border 3 · surface 1 · decoration 1 | `css/styles.css:543`<br>`css/styles.css:1392`<br>`css/styles.css:3258`<br>`css/styles.css:3266`<br>`css/programs.css:3427` | `--danger-soft` |
| `rgba(239,68,68,0.30)` | 5 | border 3 · decoration 1 · surface/effect 1 | `css/styles.css:2162`<br>`css/styles.css:8461`<br>`css/analytics.css:310`<br>`css/hybrid-score.css:189`<br>`index.html:262` | `--danger-soft` |
| `rgba(239,68,68,0.35)` | 5 | border 4 · effect 1 | `css/styles.css:1414`<br>`css/styles.css:2903`<br>`css/styles.css:3136`<br>`css/styles.css:10756`<br>`js/programs/activation.js:167` | `--danger-soft` |
| `rgba(239,68,68,0.5)` | 5 | border 4 · surface 1 | `css/styles.css:3234`<br>`css/styles.css:3258`<br>`css/styles.css:3267`<br>`css/styles.css:10703`<br>`css/progress.css:804` | `--danger-soft` |
| `rgba(255,255,255,.07)` | 5 | border 3 · decoration 1 · surface 1 | `css/styles.css:10203`<br>`css/styles.css:10207`<br>`css/styles.css:10260`<br>`css/styles.css:10432`<br>`css/hybrid-score.css:123` | `--overlay-*` |
| `rgba(255,255,255,0.38)` | 5 | text 5 | `js/analytics/views/view-fasting.js:261`<br>`js/analytics/views/view-fasting.js:402`<br>`js/analytics/views/view-fasting.js:403`<br>`js/analytics/views/view-fasting.js:404`<br>`js/analytics/views/view-fasting.js:677` | `--text-*` |
| `rgba(34,211,238,0.18)` | 5 | border 3 · effect 1 · surface 1 | `css/styles.css:930`<br>`css/styles.css:1022`<br>`css/styles.css:3975`<br>`css/programs.css:3432`<br>`css/progress.css:340` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.3)` | 5 | border 5 | `css/styles.css:860`<br>`css/styles.css:979`<br>`css/styles.css:1024`<br>`css/styles.css:2963`<br>`css/styles.css:3288` | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.12)` | 5 | surface 3 · effect 1 · border 1 | `css/programs.css:173`<br>`css/programs.css:296`<br>`css/programs.css:984`<br>`css/programs.css:4082`<br>`css/brand-consistency.css:222` | `--data-*`/review |
| `rgba(37,99,235,0.5)` | 5 | border 5 | `css/programs.css:26`<br>`css/programs.css:295`<br>`css/programs.css:1675`<br>`css/programs.css:3215`<br>`css/programs.css:3972` | `--data-*`/review |
| `rgba(59,130,246,0.3)` | 5 | border 2 · surface/effect 2 · decoration 1 | `css/styles.css:1029`<br>`css/styles.css:1615`<br>`js/analytics/views/view-recovery.js:149`<br>`index.html:312`<br>`index.html:375` | `--info-soft` |
| `rgba(99,102,241,0.40)` | 5 | border 3 · effect 2 | `css/styles.css:4485`<br>`css/styles.css:5411`<br>`css/styles.css:5715`<br>`css/styles.css:6336`<br>`css/programs.css:3309` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.45)` | 5 | border 5 | `css/styles.css:1888`<br>`css/styles.css:3282`<br>`css/styles.css:4059`<br>`css/styles.css:9004`<br>`css/programs.css:2331` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.55)` | 5 | border 4 · effect 1 | `css/styles.css:4046`<br>`css/styles.css:4419`<br>`css/styles.css:4955`<br>`css/styles.css:5089`<br>`css/styles.css:5414` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#04121a` | 4 | text 3 · fallback 1 | `css/styles.css:3493`<br>`css/styles.css:11091`<br>`css/programs.css:4280`<br>`css/brand-consistency.css:70` | `--accent-ink` |
| `#059669` | 4 | effect 3 · text 1 | `css/styles.css:5603`<br>`css/styles.css:7307`<br>`css/programs.css:4005`<br>`css/analytics.css:543` | `--ok-strong` |
| `#080f1a` | 4 | fallback 4 | `css/styles.css:2518`<br>`css/styles.css:2541`<br>`css/styles.css:2619`<br>`css/styles.css:9987` | `--bg-deep` (delete fallback) |
| `#0d1020` | 4 | surface 4 | `css/programs.css:542`<br>`css/programs.css:597`<br>`css/programs.css:730`<br>`css/programs.css:1167` | `--bg-card (near-dup)` |
| `#111827` | 4 | data-viz 4 | `js/analytics/charts.js:139`<br>`js/analytics/charts.js:203`<br>`js/analytics/charts.js:301`<br>`js/analytics/charts.js:372` | `--chart-stroke` |
| `#1e293b` | 4 | surface 2 · token 1 · text 1 | `css/styles.css:3915`<br>`css/styles.css:6314`<br>`css/analytics.css:852`<br>`js/workout/set-mutations.js:254` | `--bg-raised (light inverse)` |
| `#1f242c` | 4 | fallback 4 | `css/styles.css:9587`<br>`css/styles.css:9604`<br>`css/styles.css:9620`<br>`css/styles.css:9652` | `--border` (delete fallback) |
| `#67e8f9` | 4 | border 1 · text 1 · token 1 · decoration 1 | `css/styles.css:3271`<br>`css/styles.css:5464`<br>`css/brand-consistency.css:44`<br>`js/analytics/views/view-muscles.js:28` | `--accent (tint)` |
| `#c7d2fe` | 4 | text 3 · border 1 | `css/styles.css:3282`<br>`css/styles.css:5053`<br>`css/styles.css:9019`<br>`css/analytics.css:1359` | `--text-*` (review) |
| `#e7ecf3` | 4 | decoration 4 | `js/brain/pr-share.js:52`<br>`js/share/workout-share.js:127`<br>`js/share/workout-share.js:142`<br>`js/share/workout-share.js:157` | `(review)` |
| `#f472b6` | 4 | surface/effect 2 · text 1 · decoration 1 | `js/analytics/running-detail.js:58`<br>`js/session-recap.js:322`<br>`index.html:376`<br>`index.html:409` | `--data-6 (tint)` |
| `#fca5a5` | 4 | text 3 · surface/effect 1 | `css/styles.css:10744`<br>`css/styles.css:10758`<br>`js/programs/activation.js:167`<br>`index.html:278` | `--danger-soft (text)` |
| `rgba(0,0,0,0.01)` | 4 | surface 2 · token 1 · effect 1 | `css/styles.css:3924`<br>`css/programs.css:2252`<br>`css/programs.css:2258`<br>`css/analytics.css:828` | `--overlay-*` (light) |
| `rgba(0,0,0,0.025)` | 4 | surface 4 | `css/styles.css:4101`<br>`css/styles.css:5911`<br>`css/analytics.css:834`<br>`css/analytics.css:1129` | `--overlay-*` (light) |
| `rgba(0,0,0,0.15)` | 4 | effect 2 · border 1 · surface 1 | `css/styles.css:3936`<br>`css/styles.css:4120`<br>`css/styles.css:8771`<br>`css/analytics.css:854` | `--shadow-*` |
| `rgba(0,0,0,0.30)` | 4 | effect 2 · text 2 | `css/styles.css:138`<br>`css/styles.css:1655`<br>`css/programs.css:2335`<br>`css/programs.css:3449` | `--shadow-*` |
| `rgba(0,0,0,0.38)` | 4 | text 2 · effect 2 | `css/styles.css:6267`<br>`css/styles.css:8557`<br>`css/brand-consistency.css:91`<br>`css/brand-consistency.css:175` | `--overlay-*` (light) |
| `rgba(0,0,0,0.48)` | 4 | text 2 · effect 2 | `css/programs.css:2242`<br>`css/analytics.css:1306`<br>`css/brand-consistency.css:96`<br>`css/brand-consistency.css:158` | `--overlay-*` (light) |
| `rgba(0,0,0,0.70)` | 4 | text 3 · effect 1 | `css/styles.css:606`<br>`css/styles.css:5119`<br>`css/programs.css:2246`<br>`css/programs.css:3301` | `--overlay-*` (light) |
| `rgba(16,185,129,0.18)` | 4 | border 2 · surface 2 | `css/styles.css:536`<br>`css/styles.css:3256`<br>`css/styles.css:4468`<br>`css/styles.css:5840` | `--ok-soft` |
| `rgba(16,185,129,0.22)` | 4 | border 3 · surface 1 | `css/styles.css:1317`<br>`css/styles.css:3738`<br>`css/styles.css:6191`<br>`css/analytics.css:884` | `--ok-soft` |
| `rgba(16,185,129,0.3)` | 4 | border 2 · decoration 2 | `css/programs.css:3981`<br>`css/programs.css:3993`<br>`js/analytics/views/view-recovery.js:144`<br>`js/analytics/views/view-strength.js:635` | `--ok-soft` |
| `rgba(239,68,68,0.06)` | 4 | surface 4 | `css/programs.css:2164`<br>`css/programs.css:3425`<br>`css/analytics.css:838`<br>`css/progress.css:453` | `--danger-soft` |
| `rgba(245,158,11,0.05)` | 4 | surface 4 | `css/styles.css:8073`<br>`css/programs.css:3435`<br>`css/analytics.css:1192`<br>`css/analytics.css:1214` | `--warn-soft` |
| `rgba(245,158,11,0.06)` | 4 | surface 3 · effect 1 | `css/styles.css:6565`<br>`css/styles.css:8023`<br>`css/programs.css:2084`<br>`js/analytics/views/view-progress.js:92` | `--warn-soft` |
| `rgba(245,158,11,0.08)` | 4 | surface 3 · decoration 1 | `css/styles.css:7521`<br>`css/styles.css:8071`<br>`css/analytics.css:1135`<br>`js/analytics/views/view-fasting.js:535` | `--warn-soft` |
| `rgba(245,158,11,0.14)` | 4 | border 2 · surface 1 · surface/effect 1 | `css/styles.css:4217`<br>`css/analytics.css:1193`<br>`css/analytics.css:1215`<br>`index.html:280` | `--warn-soft` |
| `rgba(255,255,255,.03)` | 4 | surface 4 | `css/styles.css:10293`<br>`css/styles.css:10352`<br>`css/styles.css:10434`<br>`css/hybrid-score.css:91` | `--overlay-*` |
| `rgba(255,255,255,0.22)` | 4 | border 3 · surface/effect 1 | `css/styles.css:2923`<br>`css/styles.css:2943`<br>`css/styles.css:4796`<br>`index.html:256` | `--border-*` |
| `rgba(255,255,255,0.30)` | 4 | text 4 | `js/analytics/views/view-fasting.js:159`<br>`js/analytics/views/view-fasting.js:258`<br>`js/analytics/views/view-fasting.js:269`<br>`js/analytics/views/view-fasting.js:272` | `--text-*` |
| `rgba(255,255,255,0.65)` | 4 | text 1 · data-viz 1 · decoration 1 · surface/effect 1 | `js/analytics/charts/fasting-charts.js:207`<br>`js/analytics/charts/recovery-charts.js:60`<br>`js/analytics/charts/strength-charts.js:110`<br>`index.html:410` | `--text-*` |
| `rgba(34,211,238,0.45)` | 4 | border 3 · text 1 | `css/styles.css:957`<br>`css/styles.css:3271`<br>`css/styles.css:9435`<br>`css/programs.css:3887` | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.15)` | 4 | surface 2 · effect 2 | `css/programs.css:1027`<br>`css/programs.css:1090`<br>`css/programs.css:3217`<br>`css/programs.css:4078` | `--data-*`/review |
| `rgba(37,99,235,0.3)` | 4 | border 4 | `css/programs.css:985`<br>`css/programs.css:1028`<br>`css/programs.css:1091`<br>`css/programs.css:4015` | `--data-*`/review |
| `rgba(59,130,246,0.06)` | 4 | surface 4 | `css/styles.css:5874`<br>`css/styles.css:8938`<br>`css/analytics.css:840`<br>`js/analytics/views/view-progress.js:78` | `--info-soft` |
| `rgba(59,130,246,0.08)` | 4 | surface 3 · border 1 | `css/styles.css:2695`<br>`css/styles.css:2879`<br>`css/styles.css:5679`<br>`css/styles.css:8591` | `--info-soft` |
| `rgba(6,182,212,0.18)` | 4 | effect 2 · border 2 | `css/styles.css:7250`<br>`css/styles.css:8845`<br>`css/styles.css:8910`<br>`css/analytics.css:1363` | `--data-*`/review |
| `rgba(99,102,241,0.07)` | 4 | effect 3 · surface 1 | `css/styles.css:202`<br>`css/styles.css:1888`<br>`css/styles.css:2244`<br>`css/styles.css:5651` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.09)` | 4 | surface 2 · effect 1 · border 1 | `css/styles.css:5868`<br>`css/styles.css:6270`<br>`css/styles.css:6346`<br>`css/programs.css:2429` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.15)` | 4 | surface 3 · border 1 | `css/styles.css:4058`<br>`css/styles.css:4275`<br>`css/styles.css:5865`<br>`css/styles.css:9005` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.25)` | 4 | effect 2 · border 2 | `css/styles.css:4749`<br>`css/styles.css:5216`<br>`css/styles.css:5744`<br>`css/programs.css:4065` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(var(--brand-cobalt-rgb),0.10)` | 4 | surface 3 · effect 1 | `css/styles.css:4614`<br>`css/brand-consistency.css:133`<br>`css/brand-consistency.css:168`<br>`css/brand-consistency.css:188` | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.28)` | 4 | effect 2 · border 2 | `css/brand-consistency.css:127`<br>`css/brand-consistency.css:146`<br>`css/brand-consistency.css:169`<br>`css/brand-consistency.css:189` | `--shadow-*`/`--glow-*` (review) |
| `#001a1a` | 3 | effect 3 | `css/styles.css:5443`<br>`css/styles.css:5642`<br>`js/programs/catalog/hybrid.js:368` | `--surface-legacy (teal black)` |
| `#080f1e` | 3 | token 3 | `css/styles.css:28`<br>`css/styles.css:30`<br>`css/styles.css:10886` | `--bg-deep` |
| `#0a1020` | 3 | effect 3 | `js/programs/catalog/fitness.js:418`<br>`js/programs/catalog/running.js:285`<br>`js/programs/catalog/running.js:368` | `--shadow-*`/`--glow-*` (review) |
| `#0d1420` | 3 | token 3 | `css/styles.css:10867`<br>`css/brand-consistency.css:39`<br>`css/brand-consistency.css:50` | `--bg-card (Midnight)` |
| `#111728` | 3 | token 3 | `css/styles.css:25`<br>`css/styles.css:29`<br>`css/styles.css:10883` | `--bg-input (Slate)` |
| `#14b8a6` | 3 | text 3 | `js/analytics/recovery-detail.js:109`<br>`js/analytics/running-detail.js:67`<br>`js/analytics/running-detail.js:120` | `--data-3 (teal)` |
| `#1a0a00` | 3 | effect 3 | `js/programs/catalog/hyrox.js:572`<br>`js/programs/catalog/strength.js:250`<br>`js/programs/catalog/strength.js:299` | `--shadow-*`/`--glow-*` (review) |
| `#1a0d2e` | 3 | effect 3 | `js/programs/catalog/hybrid.js:319`<br>`js/programs/catalog/hypertrophy.js:249`<br>`js/programs/catalog/hypertrophy.js:387` | `--shadow-*`/`--glow-*` (review) |
| `#22c55e` | 3 | text 2 · fallback 1 | `css/styles.css:10356`<br>`js/brain/hybrid-score/config.js:95`<br>`js/programs/catalog/hyrox.js:621` | `--text-*` (review) |
| `#2a3038` | 3 | fallback 3 | `css/styles.css:3021`<br>`css/styles.css:3032`<br>`css/styles.css:3044` | `--border-medium` (delete fallback) |
| `#2d1a00` | 3 | effect 3 | `js/programs/catalog/hyrox.js:30`<br>`js/programs/catalog/strength.js:250`<br>`js/programs/catalog/strength.js:299` | `--shadow-*`/`--glow-*` (review) |
| `#2d1a5c` | 3 | effect 3 | `js/athlete-profile.js:161`<br>`js/profile-stats.js:653`<br>`js/programs/catalog/hybrid.js:30` | `--shadow-*`/`--glow-*` (review) |
| `#333333` | 3 | vendor 3 | `js/vendor/leaflet/leaflet.css:381`<br>`js/vendor/leaflet/leaflet.css:421`<br>`js/vendor/leaflet/leaflet.css:524` | vendor |
| `#5b21b6` | 3 | text 3 | `css/styles.css:2996`<br>`css/styles.css:7309`<br>`css/programs.css:3694` | `--text-*` (review) |
| `#6b7280` | 3 | text 2 · decoration 1 | `css/styles.css:8070`<br>`js/fasting/fasting-ring.js:28`<br>`js/fasting.js:19` | `--text-*` (review) |
| `#777777` | 3 | vendor 3 | `js/vendor/leaflet/leaflet.css:444`<br>`js/vendor/leaflet/leaflet.css:455`<br>`js/vendor/leaflet/leaflet.css:460` | vendor |
| `#818cf8` | 3 | text 3 | `js/analytics/charts/recovery-charts.js:99`<br>`js/analytics/charts/recovery-charts.js:108`<br>`js/analytics/views/view-recovery.js:326` | `--data-2 (tint)` |
| `#d2f1fa` | 3 | effect 2 · surface 1 | `css/styles.css:5770`<br>`css/styles.css:5847`<br>`css/styles.css:8805` | `--shadow-*`/`--glow-*` (review) |
| `#e2e8f0` | 3 | token 1 · border 1 · surface/effect 1 | `css/styles.css:128`<br>`css/styles.css:2635`<br>`index.html:293` | `--text-*` |
| `#e879f9` | 3 | text 3 | `js/programs/catalog/hypertrophy.js:249`<br>`js/programs/catalog/hypertrophy.js:387`<br>`js/programs/catalog.js:28` | `--text-*` (review) |
| `#f4f7fb` | 3 | effect 3 | `css/brand-consistency.css:221`<br>`css/brand-consistency.css:233`<br>`js/ui/confirm-modal.js:47` | `--shadow-*`/`--glow-*` (review) |
| `#fb923c` | 3 | text 2 · decoration 1 | `js/analytics/views/view-muscles.js:33`<br>`js/programs/catalog/fitness.js:647`<br>`js/programs/catalog.js:31` | `--data-7 (tint)` |
| `#fcd34d` | 3 | surface/effect 2 · decoration 1 | `js/analytics/views/view-muscles.js:32`<br>`index.html:101`<br>`index.html:280` | `--warn` |
| `rgba(0,0,0,0.015)` | 3 | surface 2 · effect 1 | `css/analytics.css:1220`<br>`css/analytics.css:1246`<br>`css/analytics.css:1342` | `--overlay-*` (light) |
| `rgba(0,0,0,0.20)` | 3 | effect 1 · border 1 · surface 1 | `css/styles.css:469`<br>`css/programs.css:2345`<br>`css/programs.css:3455` | `--shadow-*` |
| `rgba(0,0,0,0.3)` | 3 | effect 3 | `css/styles.css:911`<br>`css/styles.css:3866`<br>`css/programs.css:358` | `--shadow-*` |
| `rgba(148,163,184,.10)` | 3 | border 2 · decoration 1 | `css/styles.css:10947`<br>`css/styles.css:11051`<br>`css/styles.css:11079` | `--data-8-soft` |
| `rgba(15,23,42,0.03)` | 3 | surface 3 | `css/styles.css:10760`<br>`css/styles.css:10850`<br>`css/hybrid-score.css:279` | `--data-*`/review |
| `rgba(16,185,129,0.07)` | 3 | surface 2 · effect 1 | `css/styles.css:5973`<br>`css/styles.css:6256`<br>`css/programs.css:4091` | `--ok-soft` |
| `rgba(16,185,129,0.14)` | 3 | surface 2 · effect 1 | `css/programs.css:4096`<br>`css/analytics.css:904`<br>`css/analytics.css:1732` | `--ok-soft` |
| `rgba(16,185,129,0.16)` | 3 | surface 3 | `css/styles.css:2014`<br>`css/styles.css:3038`<br>`css/progress.css:658` | `--ok-soft` |
| `rgba(16,185,129,0.20)` | 3 | border 2 · effect 1 | `css/styles.css:5621`<br>`css/styles.css:6257`<br>`css/analytics.css:989` | `--ok-soft` |
| `rgba(16,185,129,0.28)` | 3 | border 2 · surface 1 | `css/analytics.css:642`<br>`css/analytics.css:1723`<br>`css/hybrid-score.css:171` | `--ok-soft` |
| `rgba(16,185,129,0.45)` | 3 | border 2 · effect 1 | `css/styles.css:573`<br>`css/styles.css:1360`<br>`css/styles.css:2010` | `--ok-soft` |
| `rgba(239,68,68,0.15)` | 3 | surface 2 · border 1 | `css/styles.css:7711`<br>`css/programs.css:1879`<br>`css/analytics.css:228` | `--danger-soft` |
| `rgba(239,68,68,0.2)` | 3 | surface 1 · decoration 1 · border 1 | `css/styles.css:3234`<br>`js/analytics/views/view-recovery.js:280`<br>`js/programs/library.js:892` | `--danger-soft` |
| `rgba(245,158,11,0.20)` | 3 | surface 2 · border 1 | `css/styles.css:6406`<br>`css/styles.css:8044`<br>`css/programs.css:3436` | `--warn-soft` |
| `rgba(255,255,255,0.02)` | 3 | effect 2 · surface 1 | `css/styles.css:2132`<br>`css/hybrid-score.css:17`<br>`css/hybrid-score.css:145` | `--overlay-*` |
| `rgba(255,255,255,0.15)` | 3 | surface 1 · decoration 1 · surface/effect 1 | `js/analytics/views/view-fasting.js:373`<br>`js/analytics/views/view-recovery.js:612`<br>`index.html:147` | `--overlay-*` |
| `rgba(255,255,255,0.18)` | 3 | token 1 · decoration 1 · text 1 | `css/styles.css:77`<br>`css/progress.css:777`<br>`js/home/tile-renderers.js:38` | `--overlay-*` |
| `rgba(255,255,255,0.85)` | 3 | surface 1 · text 1 · decoration 1 | `css/styles.css:8814`<br>`js/analytics/views/view-fasting.js:270`<br>`scripts/measures-browser-check.mjs:94` | `--overlay-*` |
| `rgba(34,211,238,0.06)` | 3 | surface 2 · effect 1 | `css/styles.css:929`<br>`css/styles.css:5646`<br>`css/programs.css:3430` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.12)` | 3 | surface 3 | `css/styles.css:5485`<br>`css/styles.css:9464`<br>`css/progress.css:587` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.14)` | 3 | surface 3 | `css/styles.css:3065`<br>`css/styles.css:9520`<br>`css/progress.css:502` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.6)` | 3 | text 2 · border 1 | `css/styles.css:888`<br>`css/styles.css:938`<br>`css/styles.css:5644` | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.10)` | 3 | surface 3 | `css/programs.css:2371`<br>`css/programs.css:2376`<br>`css/programs.css:4014` | `--data-*`/review |
| `rgba(37,99,235,0.25)` | 3 | surface 2 · border 1 | `css/programs.css:174`<br>`css/programs.css:1040`<br>`css/programs.css:3971` | `--data-*`/review |
| `rgba(59,130,246,0.1)` | 3 | surface 2 · surface/effect 1 | `css/styles.css:2704`<br>`js/analytics/views/view-progress.js:31`<br>`index.html:312` | `--info-soft` |
| `rgba(59,130,246,0.14)` | 3 | surface 2 · border 1 | `css/styles.css:4198`<br>`css/styles.css:9633`<br>`css/analytics.css:880` | `--info-soft` |
| `rgba(59,130,246,0.25)` | 3 | border 3 | `css/styles.css:1540`<br>`css/styles.css:2705`<br>`css/styles.css:8097` | `--info-soft` |
| `rgba(59,130,246,0.4)` | 3 | decoration 2 · surface 1 | `css/styles.css:3198`<br>`css/programs.css:4193`<br>`js/analytics/views/view-recovery.js:450` | `--info-soft` |
| `rgba(96,165,250,0.5)` | 3 | data-viz 2 · decoration 1 | `js/analytics/charts/running-charts.js:84`<br>`js/analytics/charts/strength-charts.js:111`<br>`js/analytics/charts/strength-charts.js:118` | `--data-*` (§8) |
| `rgba(99,102,241,0.14)` | 3 | surface 2 · effect 1 | `css/styles.css:4793`<br>`css/styles.css:4832`<br>`css/analytics.css:1509` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.16)` | 3 | surface 2 · decoration 1 | `css/styles.css:3281`<br>`css/styles.css:5209`<br>`css/styles.css:9028` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.20)` | 3 | border 2 · effect 1 | `css/styles.css:5242`<br>`css/styles.css:5617`<br>`css/analytics.css:1357` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.22)` | 3 | border 3 | `css/styles.css:432`<br>`css/styles.css:5438`<br>`css/styles.css:5869` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.30)` | 3 | border 2 · surface 1 | `css/styles.css:3957`<br>`css/styles.css:5104`<br>`css/styles.css:8727` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.6)` | 3 | border 3 | `css/styles.css:3558`<br>`css/styles.css:3886`<br>`css/styles.css:4707` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(var(--brand-cobalt-rgb),0.12)` | 3 | decoration 1 · surface 1 · effect 1 | `css/brand-consistency.css:135`<br>`css/brand-consistency.css:179`<br>`css/brand-consistency.css:229` | `(review)` |
| `#001a10` | 2 | effect 2 | `js/programs/catalog/running.js:189`<br>`js/programs/catalog/running.js:238` | `--shadow-*`/`--glow-*` (review) |
| `#00301a` | 2 | effect 2 | `js/programs/catalog/running.js:189`<br>`js/programs/catalog/running.js:238` | `--shadow-*`/`--glow-*` (review) |
| `#05060f` | 2 | decoration 2 | `js/athlete-profile.js:337`<br>`js/brain/hybrid-score/share-card.js:51` | `(review)` |
| `#060a12` | 2 | fallback 2 | `css/styles.css:9319`<br>`css/styles.css:9333` | `--bg-app` (delete fallback) |
| `#0a0612` | 2 | decoration 2 | `js/athlete-profile.js:337`<br>`js/brain/hybrid-score/share-card.js:51` | `(review)` |
| `#0a111d` | 2 | token 2 | `css/styles.css:10871`<br>`css/brand-consistency.css:53` | `--bg-deep (brand Midnight)` |
| `#0b1420` | 2 | token 1 · surface 1 | `css/brand-consistency.css:24`<br>`css/brand-consistency.css:208` | `--bg-card (brand root)` |
| `#0d1a2e` | 2 | effect 2 | `js/programs/catalog/hybrid.js:319`<br>`js/programs/catalog/hyrox.js:354` | `--shadow-*`/`--glow-*` (review) |
| `#0e1525` | 2 | effect 2 | `css/analytics.css:912`<br>`css/analytics.css:1225` | `--shadow-*`/`--glow-*` (review) |
| `#0e1a1e` | 2 | effect 2 | `js/programs/catalog/fitness.js:129`<br>`js/programs/catalog/fitness.js:174` | `--shadow-*`/`--glow-*` (review) |
| `#0ea5e9` | 2 | text 2 | `js/programs/catalog/fitness.js:418`<br>`js/programs/catalog.js:29` | `--text-*` (review) |
| `#121b2b` | 2 | token 2 | `css/styles.css:10868`<br>`css/brand-consistency.css:51` | `--bg-input (Midnight)` |
| `#161e34` | 2 | token 2 | `css/styles.css:26`<br>`css/styles.css:10884` | `--bg-input-focus (Slate)` |
| `#172236` | 2 | token 2 | `css/styles.css:10869`<br>`css/brand-consistency.css:52` | `--bg-input-focus (Midnight)` |
| `#1a0520` | 2 | effect 2 | `js/programs/catalog/hypertrophy.js:155`<br>`js/programs/catalog/hyrox.js:297` | `--shadow-*`/`--glow-*` (review) |
| `#1a0e0e` | 2 | effect 2 | `js/programs/catalog/fitness.js:30`<br>`js/programs/catalog/fitness.js:75` | `--shadow-*`/`--glow-*` (review) |
| `#1a1205` | 2 | text 2 | `css/styles.css:7917`<br>`css/styles.css:7929` | `--text-*` (review) |
| `#1a3040` | 2 | effect 2 | `js/programs/catalog/fitness.js:129`<br>`js/programs/catalog/fitness.js:174` | `--shadow-*`/`--glow-*` (review) |
| `#1e3a8a` | 2 | effect 1 · data-viz 1 | `js/analytics/charts/strength-charts.js:95`<br>`js/analytics/charts.js:46` | `--info` |
| `#22364f` | 2 | decoration 1 · surface 1 | `css/styles.css:2623`<br>`css/styles.css:2628` | `--data-heat-0` |
| `#2a1a05` | 2 | effect 2 | `js/programs/catalog/jt-shed.js:185`<br>`js/programs/catalog/jt-shed.js:371` | `--shadow-*`/`--glow-*` (review) |
| `#2d0a0a` | 2 | effect 2 | `js/programs/catalog/strength.js:79`<br>`js/programs/catalog/strength.js:206` | `--shadow-*`/`--glow-*` (review) |
| `#2d1b69` | 2 | effect 2 | `js/programs/catalog/hybrid.js:230`<br>`js/programs/catalog/hybrid.js:273` | `--shadow-*`/`--glow-*` (review) |
| `#374151` | 2 | text 2 | `css/styles.css:8065`<br>`css/styles.css:8066` | `--text-*` |
| `#3d2222` | 2 | effect 2 | `js/programs/catalog/fitness.js:30`<br>`js/programs/catalog/fitness.js:75` | `--shadow-*`/`--glow-*` (review) |
| `#3d2a0a` | 2 | effect 2 | `js/programs/catalog/jt-shed.js:185`<br>`js/programs/catalog/jt-shed.js:371` | `--shadow-*`/`--glow-*` (review) |
| `#4338ca` | 2 | text 2 | `css/styles.css:5780`<br>`css/programs.css:3310` | `--text-*` (review) |
| `#6b7688` | 2 | decoration 2 | `js/brain/pr-share.js:65`<br>`js/share/workout-share.js:177` | `(review)` |
| `#6d28d9` | 2 | effect 1 · decoration 1 | `css/styles.css:5302`<br>`js/analytics/views/view-muscles.js:30` | `--data-5 (deep)` |
| `#7c8aa0` | 2 | fallback 1 · decoration 1 | `css/styles.css:9634`<br>`js/athlete-profile.js:413` | `(review)` |
| `#84cc16` | 2 | text 2 | `js/programs/catalog/fitness.js:367`<br>`js/programs/catalog.js:27` | `--accent-alt` |
| `#86efac` | 2 | text 2 | `js/programs/catalog/fitness.js:530`<br>`js/programs/catalog.js:30` | `--text-*` (review) |
| `#93c5fd` | 2 | data-viz 1 · decoration 1 | `js/analytics/charts.js:69`<br>`js/analytics/views/view-muscles.js:29` | `--info (tint)` |
| `#9aa9bd` | 2 | text 2 | `css/programs.css:2479`<br>`css/programs.css:2485` | `--text-*` (review) |
| `#a8b1bd` | 2 | fallback 2 | `css/styles.css:9607`<br>`css/styles.css:9713` | `--text-muted` (delete fallback) |
| `#b9c4d4` | 2 | text 2 | `css/programs.css:2497`<br>`css/programs.css:2502` | `--text-*` (review) |
| `#be185d` | 2 | text 1 · effect 1 | `css/styles.css:8546`<br>`js/analytics/charts/running-charts.js:200` | `--data-6 (deep)` |
| `#d97706` | 2 | text 1 · decoration 1 | `css/styles.css:8071`<br>`js/analytics/views/view-muscles.js:32` | `--warn-strong` |
| `#dddddd` | 2 | vendor 2 | `js/vendor/leaflet/leaflet.css:261`<br>`js/vendor/leaflet/leaflet.css:401` | vendor |
| `#e3f8fc` | 2 | effect 2 | `css/styles.css:5770`<br>`css/styles.css:5847` | `--shadow-*`/`--glow-*` (review) |
| `#f0f4f8` | 2 | token 1 · decoration 1 | `css/styles.css:3901`<br>`css/analytics.css:1690` | `(review)` |
| `#f4f4f4` | 2 | vendor 2 | `js/vendor/leaflet/leaflet.css:307`<br>`js/vendor/leaflet/leaflet.css:320` | vendor |
| `r` | 2 | decoration 2 | `css/analytics.css:922`<br>`css/analytics.css:928` | `(review)` |
| `rgba(0,0,0,.24)` | 2 | effect 2 | `css/styles.css:9988`<br>`css/programs.css:2456` | `--shadow-*` |
| `rgba(0,0,0,0.42)` | 2 | text 2 | `css/programs.css:3297`<br>`css/analytics.css:1298` | `--overlay-*` (light) |
| `rgba(0,0,0,0.80)` | 2 | text 2 | `css/styles.css:5825`<br>`css/programs.css:2346` | `--overlay-*` (light) |
| `rgba(0,0,0,0.85)` | 2 | effect 1 · text 1 | `css/styles.css:5525`<br>`css/styles.css:5922` | `--shadow-*` |
| `rgba(12,17,35,1)` | 2 | effect 2 | `css/styles.css:5237`<br>`css/styles.css:5689` | `--data-*`/review |
| `rgba(139,92,246,${a})` | 2 | surface 1 · effect 1 | `js/profile-stats.js:53`<br>`js/profile-stats.js:56` | `--data-5-soft` |
| `rgba(139,92,246,0.05)` | 2 | effect 2 | `css/styles.css:5231`<br>`css/styles.css:5864` | `--data-5-soft` |
| `rgba(139,92,246,0.15)` | 2 | surface 2 | `css/styles.css:6888`<br>`css/styles.css:7248` | `--data-5-soft` |
| `rgba(139,92,246,0.25)` | 2 | surface 1 · border 1 | `css/styles.css:6898`<br>`css/styles.css:6910` | `--data-5-soft` |
| `rgba(15,23,42,0.05)` | 2 | effect 1 · surface 1 | `css/progress.css:428`<br>`js/ui/confirm-modal.js:51` | `--data-*`/review |
| `rgba(15,23,42,0.10)` | 2 | border 1 · effect 1 | `css/hybrid-score.css:280`<br>`js/ui/confirm-modal.js:47` | `--data-*`/review |
| `rgba(15,23,42,0.16)` | 2 | effect 1 · border 1 | `css/progress.css:1185`<br>`js/ui/confirm-modal.js:52` | `--data-*`/review |
| `rgba(15,23,42,0.52)` | 2 | text 2 | `css/styles.css:9188`<br>`css/analytics.css:929` | `--data-*`/review |
| `rgba(16,185,129,.07)` | 2 | surface 2 | `css/styles.css:10074`<br>`css/styles.css:10156` | `--ok-soft` |
| `rgba(16,185,129,.35)` | 2 | border 2 | `css/styles.css:10073`<br>`css/styles.css:10156` | `--ok-soft` |
| `rgba(16,185,129,0.06)` | 2 | token 1 · surface 1 | `css/styles.css:67`<br>`css/analytics.css:839` | `--ok-soft` |
| `rgba(16,185,129,0.4)` | 2 | border 1 · decoration 1 | `css/programs.css:3941`<br>`js/analytics/views/view-recovery.js:433` | `--ok-soft` |
| `rgba(16,185,129,0.5)` | 2 | border 2 | `css/styles.css:3038`<br>`css/styles.css:3256` | `--ok-soft` |
| `rgba(16,185,129,0.65)` | 2 | decoration 2 | `css/analytics.css:312`<br>`css/analytics.css:313` | `--ok-soft` |
| `rgba(16,27,42,0.98)` | 2 | effect 2 | `css/brand-consistency.css:90`<br>`css/brand-consistency.css:184` | `--data-*`/review |
| `rgba(203,213,225,.62)` | 2 | data-viz 2 | `js/analytics/charts.js:445`<br>`js/analytics/charts.js:451` | `--data-*` (§8) |
| `rgba(236,72,153,0.10)` | 2 | token 1 · surface 1 | `css/styles.css:154`<br>`css/styles.css:8545` | `--data-6-soft` |
| `rgba(239,68,68,0.08)` | 2 | surface 2 | `css/styles.css:10757`<br>`css/programs.css:1877` | `--danger-soft` |
| `rgba(239,68,68,0.14)` | 2 | surface 1 · surface/effect 1 | `css/styles.css:8460`<br>`index.html:278` | `--danger-soft` |
| `rgba(239,68,68,0.3)` | 2 | border 1 · decoration 1 | `css/styles.css:7713`<br>`js/analytics/views/view-recovery.js:489` | `--danger-soft` |
| `rgba(239,68,68,0.45)` | 2 | border 1 · surface/effect 1 | `css/styles.css:10743`<br>`index.html:270` | `--danger-soft` |
| `rgba(239,68,68,0.65)` | 2 | border 1 · decoration 1 | `css/styles.css:3072`<br>`css/analytics.css:315` | `--danger-soft` |
| `rgba(244,63,94,0.08)` | 2 | surface 2 | `css/styles.css:7343`<br>`css/styles.css:7487` | `--data-*`/review |
| `rgba(245,158,11,0.18)` | 2 | surface 2 | `css/styles.css:3257`<br>`css/analytics.css:1082` | `--warn-soft` |
| `rgba(245,158,11,0.4)` | 2 | border 1 · surface/effect 1 | `css/programs.css:1519`<br>`index.html:103` | `--warn-soft` |
| `rgba(245,158,11,0.55)` | 2 | border 1 · decoration 1 | `css/styles.css:6566`<br>`css/analytics.css:314` | `--warn-soft` |
| `rgba(245,158,11,0.6)` | 2 | border 1 · effect 1 | `css/styles.css:3166`<br>`css/styles.css:6567` | `--warn-soft` |
| `rgba(249,115,22,0.12)` | 2 | surface 2 | `css/styles.css:2896`<br>`css/analytics.css:665` | `--data-*`/review |
| `rgba(251,191,36,0.14)` | 2 | surface 2 | `css/styles.css:4210`<br>`css/styles.css:9596` | `--data-*`/review |
| `rgba(251,191,36,0.25)` | 2 | border 2 | `css/styles.css:1499`<br>`css/styles.css:4149` | `--data-*`/review |
| `rgba(255,107,0,0.12)` | 2 | effect 1 · surface 1 | `css/styles.css:5525`<br>`css/styles.css:8707` | `--data-*`/review |
| `rgba(255,255,255,.02)` | 2 | surface 2 | `css/styles.css:10059`<br>`css/styles.css:10141` | `--overlay-*` |
| `rgba(255,255,255,.035)` | 2 | surface 2 | `css/analytics.css:1825`<br>`css/analytics.css:1920` | `--overlay-*` |
| `rgba(255,255,255,.05)` | 2 | surface 2 | `css/styles.css:11073`<br>`css/analytics.css:11` | `--overlay-*` |
| `rgba(255,255,255,.06)` | 2 | surface 2 | `css/hybrid-score.css:48`<br>`css/hybrid-score.css:51` | `--overlay-*` |
| `rgba(255,255,255,0.025)` | 2 | effect 2 | `css/analytics.css:116`<br>`css/brand-consistency.css:91` | `--overlay-*` |
| `rgba(255,255,255,0.045)` | 2 | surface 1 · effect 1 | `css/styles.css:3506`<br>`css/hybrid-score.css:145` | `--overlay-*` |
| `rgba(255,255,255,0.2)` | 2 | data-viz 1 · text 1 | `js/analytics/charts/load-charts.js:30`<br>`js/analytics/views/view-fasting.js:546` | `--data-*` (§8) |
| `rgba(255,255,255,0.28)` | 2 | text 2 | `js/analytics/views/view-fasting.js:153`<br>`js/analytics/views/view-fasting.js:155` | `--text-*` |
| `rgba(255,255,255,0.92)` | 2 | token 1 · surface 1 | `css/styles.css:3905`<br>`css/analytics.css:866` | `--overlay-*` |
| `rgba(255,255,255,0.94)` | 2 | surface 1 · text 1 | `css/styles.css:5805`<br>`css/programs.css:632` | `--overlay-*` |
| `rgba(30,34,48,0.98)` | 2 | effect 2 | `js/programs/activation.js:150`<br>`js/ui/confirm-modal.js:32` | `--data-*`/review |
| `rgba(34,211,238,0.03)` | 2 | surface 1 · effect 1 | `css/styles.css:980`<br>`css/styles.css:8873` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.07)` | 2 | surface 2 | `css/styles.css:878`<br>`css/styles.css:2948` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.09)` | 2 | surface 2 | `css/styles.css:1024`<br>`css/styles.css:3289` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.10)` | 2 | effect 1 · surface 1 | `css/styles.css:5635`<br>`css/analytics.css:1489` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.15)` | 2 | effect 1 · border 1 | `css/styles.css:469`<br>`css/programs.css:1885` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.16)` | 2 | surface 1 · decoration 1 | `css/styles.css:2972`<br>`css/styles.css:3270` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.25)` | 2 | text 1 · effect 1 | `css/styles.css:954`<br>`css/styles.css:5502` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.32)` | 2 | decoration 2 | `css/styles.css:9391`<br>`css/styles.css:9467` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.5)` | 2 | border 2 | `css/styles.css:3064`<br>`css/progress.css:586` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.55)` | 2 | effect 1 · border 1 | `css/styles.css:8271`<br>`css/progress.css:723` | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.18)` | 2 | surface 2 | `css/programs.css:111`<br>`css/programs.css:2380` | `--data-*`/review |
| `rgba(37,99,235,0.2)` | 2 | border 1 · surface 1 | `css/programs.css:137`<br>`css/programs.css:3214` | `--data-*`/review |
| `rgba(37,99,235,0.35)` | 2 | border 2 | `css/programs.css:3108`<br>`css/programs.css:3892` | `--data-*`/review |
| `rgba(5,8,16,0.62)` | 2 | surface 2 | `js/ui/celebration.js:51`<br>`js/ui/confirm-modal.js:25` | `--data-*`/review |
| `rgba(59,130,246,.12)` | 2 | decoration 1 · effect 1 | `css/analytics.css:486`<br>`css/analytics.css:495` | `--info-soft` |
| `rgba(59,130,246,0.05)` | 2 | surface 2 | `css/styles.css:1026`<br>`css/styles.css:8916` | `--info-soft` |
| `rgba(59,130,246,0.09)` | 2 | surface 2 | `css/styles.css:1029`<br>`css/styles.css:8920` | `--info-soft` |
| `rgba(59,130,246,0.2)` | 2 | surface 1 · surface/effect 1 | `css/styles.css:2710`<br>`index.html:408` | `--info-soft` |
| `rgba(59,130,246,0.22)` | 2 | border 2 | `css/styles.css:8542`<br>`css/styles.css:8592` | `--info-soft` |
| `rgba(59,130,246,0.26)` | 2 | decoration 1 · border 1 | `css/styles.css:2694`<br>`css/styles.css:6178` | `--info-soft` |
| `rgba(59,130,246,0.5)` | 2 | border 2 | `css/styles.css:3255`<br>`css/styles.css:7326` | `--info-soft` |
| `rgba(59,130,246,0.6)` | 2 | decoration 1 · border 1 | `css/styles.css:8226`<br>`css/programs.css:4183` | `--info-soft` |
| `rgba(6,182,212,${a})` | 2 | surface 1 · effect 1 | `js/profile-stats.js:54`<br>`js/profile-stats.js:56` | `--data-*`/review |
| `rgba(6,182,212,0.03)` | 2 | surface 2 | `css/styles.css:1757`<br>`css/styles.css:8864` | `--data-*`/review |
| `rgba(6,182,212,0.04)` | 2 | effect 2 | `css/styles.css:203`<br>`css/styles.css:5733` | `--data-*`/review |
| `rgba(6,182,212,0.06)` | 2 | border 1 · surface 1 | `css/styles.css:1758`<br>`css/styles.css:8844` | `--data-*`/review |
| `rgba(6,182,212,0.22)` | 2 | border 2 | `css/styles.css:5848`<br>`css/styles.css:5858` | `--data-*`/review |
| `rgba(6,182,212,0.25)` | 2 | border 1 · surface/effect 1 | `css/styles.css:5789`<br>`index.html:303` | `--data-*`/review |
| `rgba(6,182,212,0.35)` | 2 | border 2 | `css/styles.css:8806`<br>`css/styles.css:8863` | `--data-*`/review |
| `rgba(6,9,17,0.80)` | 2 | token 2 | `css/styles.css:27`<br>`css/styles.css:10885` | `--data-*`/review |
| `rgba(7,17,31,0.98)` | 2 | effect 2 | `css/brand-consistency.css:90`<br>`css/brand-consistency.css:184` | `--data-*`/review |
| `rgba(8,12,22,1)` | 2 | effect 2 | `css/styles.css:5507`<br>`css/styles.css:5689` | `--data-*`/review |
| `rgba(8,145,178,0.45)` | 2 | text 2 | `css/styles.css:6037`<br>`css/styles.css:8850` | `--data-*`/review |
| `rgba(8,145,178,0.65)` | 2 | text 2 | `css/styles.css:6034`<br>`css/styles.css:8849` | `--data-*`/review |
| `rgba(96,165,250,0.10)` | 2 | border 2 | `css/brand-consistency.css:89`<br>`css/brand-consistency.css:185` | `--data-*`/review |
| `rgba(99,102,241,0.05)` | 2 | effect 1 · surface 1 | `css/styles.css:5864`<br>`css/styles.css:6018` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.13)` | 2 | effect 2 | `css/styles.css:5229`<br>`css/styles.css:5657` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(var(--brand-cobalt-rgb),0.06)` | 2 | effect 1 · decoration 1 | `css/brand-consistency.css:96`<br>`css/brand-consistency.css:159` | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.07)` | 2 | surface 1 · effect 1 | `css/styles.css:4894`<br>`css/brand-consistency.css:77` | `--bg-card`/`--bg-raised` (review) |
| `#003333` | 1 | effect 1 | `js/programs/catalog/hybrid.js:368` | `--shadow-*`/`--glow-*` (review) |
| `#0078a8` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:265` | vendor |
| `#032020` | 1 | effect 1 | `css/styles.css:5642` | `--shadow-*`/`--glow-*` (review) |
| `#047857` | 1 | decoration 1 | `js/analytics/views/view-muscles.js:31` | `--ok-ink (light)` |
| `#050a12` | 1 | token 1 | `css/brand-consistency.css:23` | `--bg-app (brand root — rename)` |
| `#05231a` | 1 | text 1 | `css/styles.css:1213` | `--text-*` (review) |
| `#052424` | 1 | effect 1 | `css/styles.css:5443` | `--shadow-*`/`--glow-*` (review) |
| `#060a18` | 1 | effect 1 | `css/styles.css:5696` | `--shadow-*`/`--glow-*` (review) |
| `#06110d` | 1 | token 1 | `css/styles.css:10895` | `(review)` |
| `#07111f` | 1 | token 1 | `css/brand-consistency.css:11` | `(review)` |
| `#07566b` | 1 | text 1 | `css/styles.css:9531` | `--text-*` (review) |
| `#080d1e` | 1 | effect 1 | `css/styles.css:5704` | `--shadow-*`/`--glow-*` (review) |
| `#08150f` | 1 | token 1 | `css/styles.css:10900` | `(review)` |
| `#090e2a` | 1 | effect 1 | `css/styles.css:5437` | `--shadow-*`/`--glow-*` (review) |
| `#0a0a14` | 1 | effect 1 | `js/programs/catalog/fitness.js:319` | `--shadow-*`/`--glow-*` (review) |
| `#0a0a1a` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:387` | `--shadow-*`/`--glow-*` (review) |
| `#0a0f22` | 1 | effect 1 | `css/styles.css:5696` | `--shadow-*`/`--glow-*` (review) |
| `#0a1208` | 1 | effect 1 | `js/programs/catalog/fitness.js:367` | `--shadow-*`/`--glow-*` (review) |
| `#0a140a` | 1 | effect 1 | `js/programs/catalog/hyrox.js:89` | `--shadow-*`/`--glow-*` (review) |
| `#0a1520` | 1 | effect 1 | `js/programs/catalog/fitness.js:218` | `--shadow-*`/`--glow-*` (review) |
| `#0a1a0a` | 1 | effect 1 | `js/programs/catalog/fitness.js:530` | `--shadow-*`/`--glow-*` (review) |
| `#0a1a1a` | 1 | effect 1 | `js/programs/catalog/hyrox.js:720` | `--shadow-*`/`--glow-*` (review) |
| `#0a1a20` | 1 | surface/effect 1 | `index.html:283` | `(review)` |
| `#0a1a2e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:521` | `--shadow-*`/`--glow-*` (review) |
| `#0a2818` | 1 | effect 1 | `js/programs/catalog/running.js:139` | `--shadow-*`/`--glow-*` (review) |
| `#0b0e13` | 1 | decoration 1 | `js/brain/pr-share.js:36` | `(review)` |
| `#0b101b` | 1 | effect 1 | `css/programs.css:2455` | `--shadow-*`/`--glow-*` (review) |
| `#0b1220` | 1 | decoration 1 | `js/share/workout-share.js:117` | `(review)` |
| `#0b1a14` | 1 | token 1 | `css/styles.css:10896` | `(review)` |
| `#0c1a3a` | 1 | effect 1 | `css/styles.css:5437` | `--shadow-*`/`--glow-*` (review) |
| `#0d0a20` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:198` | `--shadow-*`/`--glow-*` (review) |
| `#0d0f1a` | 1 | surface 1 | `css/programs.css:138` | `--bg-card`/`--bg-raised` (review) |
| `#0d1228` | 1 | effect 1 | `css/styles.css:5704` | `--shadow-*`/`--glow-*` (review) |
| `#0d1625` | 1 | effect 1 | `css/programs.css:2766` | `--shadow-*`/`--glow-*` (review) |
| `#0d1926` | 1 | surface 1 | `css/styles.css:9513` | `--bg-card`/`--bg-raised` (review) |
| `#0d1f35` | 1 | effect 1 | `js/programs/catalog/running.js:368` | `--shadow-*`/`--glow-*` (review) |
| `#0d2435` | 1 | effect 1 | `js/programs/catalog/running.js:285` | `--shadow-*`/`--glow-*` (review) |
| `#0d2a3d` | 1 | effect 1 | `js/programs/catalog/fitness.js:418` | `--shadow-*`/`--glow-*` (review) |
| `#0d2e14` | 1 | effect 1 | `js/programs/catalog/hyrox.js:89` | `--shadow-*`/`--glow-*` (review) |
| `#0d2e1a` | 1 | effect 1 | `js/programs/catalog/fitness.js:530` | `--shadow-*`/`--glow-*` (review) |
| `#0d3b2e` | 1 | effect 1 | `js/programs/catalog/hybrid.js:180` | `--shadow-*`/`--glow-*` (review) |
| `#0e0a1a` | 1 | effect 1 | `js/programs/catalog/hyrox.js:670` | `--shadow-*`/`--glow-*` (review) |
| `#0e0e1a` | 1 | effect 1 | `js/programs/catalog/hyrox.js:769` | `--shadow-*`/`--glow-*` (review) |
| `#0e1623` | 1 | surface 1 | `css/programs.css:18` | `--bg-card`/`--bg-raised` (review) |
| `#0e1a0e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:621` | `--shadow-*`/`--glow-*` (review) |
| `#0e1a2e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:468` | `--shadow-*`/`--glow-*` (review) |
| `#0e2d2d` | 1 | effect 1 | `js/programs/catalog/hyrox.js:720` | `--shadow-*`/`--glow-*` (review) |
| `#0f3460` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:80` | `--shadow-*`/`--glow-*` (review) |
| `#0f766e` | 1 | token 1 | `css/styles.css:10903` | `(review)` |
| `#101010` | 1 | effect 1 | `js/programs/catalog/fitness.js:272` | `--shadow-*`/`--glow-*` (review) |
| `#101929` | 1 | effect 1 | `css/programs.css:2455` | `--shadow-*`/`--glow-*` (review) |
| `#101a2b` | 1 | decoration 1 | `js/share/workout-share.js:118` | `(review)` |
| `#101b2a` | 1 | token 1 | `css/brand-consistency.css:12` | `--bg-raised (brand gunmetal)` |
| `#102040` | 1 | effect 1 | `js/programs/catalog/hyrox.js:521` | `--shadow-*`/`--glow-*` (review) |
| `#10241c` | 1 | token 1 | `css/styles.css:10897` | `(review)` |
| `#10b98122` | 1 | decoration 1 | `js/analytics/views/view-fasting.js:348` | `(review)` |
| `#111a2a` | 1 | token 1 | `css/brand-consistency.css:40` | `(review)` |
| `#111b2d` | 1 | surface 1 | `css/programs.css:27` | `--bg-card`/`--bg-raised` (review) |
| `#120a24` | 1 | decoration 1 | `js/brain/hybrid-score/share-card.js:51` | `(review)` |
| `#121820` | 1 | fallback 1 | `css/styles.css:9701` | `--bg-card` (delete fallback) |
| `#140a2c` | 1 | decoration 1 | `js/athlete-profile.js:337` | `(review)` |
| `#140d0a` | 1 | token 1 | `css/styles.css:10910` | `(review)` |
| `#141426` | 1 | effect 1 | `js/programs/catalog/fitness.js:319` | `--shadow-*`/`--glow-*` (review) |
| `#142235` | 1 | token 1 | `css/brand-consistency.css:13` | `(review)` |
| `#14253a` | 1 | effect 1 | `js/programs/catalog/fitness.js:218` | `--shadow-*`/`--glow-*` (review) |
| `#151a21` | 1 | fallback 1 | `css/styles.css:3023` | `--bg-card` (delete fallback) |
| `#153126` | 1 | token 1 | `css/styles.css:10898` | `(review)` |
| `#160b24` | 1 | decoration 1 | `js/brain/pr-share.js:35` | `(review)` |
| `#171b21` | 1 | fallback 1 | `css/styles.css:9600` | `--surface-2` (delete fallback) |
| `#17243a` | 1 | effect 1 | `css/programs.css:2766` | `--shadow-*`/`--glow-*` (review) |
| `#180f0b` | 1 | token 1 | `css/styles.css:10915` | `(review)` |
| `#1a0900` | 1 | effect 1 | `js/programs/catalog/hyrox.js:411` | `--shadow-*`/`--glow-*` (review) |
| `#1a0e00` | 1 | effect 1 | `js/programs/catalog/hyrox.js:30` | `--shadow-*`/`--glow-*` (review) |
| `#1a0e10` | 1 | effect 1 | `js/programs/catalog/fitness.js:647` | `--shadow-*`/`--glow-*` (review) |
| `#1a1230` | 1 | effect 1 | `js/programs/catalog/hyrox.js:670` | `--shadow-*`/`--glow-*` (review) |
| `#1a1540` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:198` | `--shadow-*`/`--glow-*` (review) |
| `#1a1a2e` | 1 | fallback 1 | `css/styles.css:7840` | `--bg-card` (delete fallback) |
| `#1a1a30` | 1 | effect 1 | `js/programs/catalog/hyrox.js:769` | `--shadow-*`/`--glow-*` (review) |
| `#1a2618` | 1 | effect 1 | `js/programs/catalog/fitness.js:367` | `--shadow-*`/`--glow-*` (review) |
| `#1a2d4e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:468` | `--shadow-*`/`--glow-*` (review) |
| `#1a2d5c` | 1 | effect 1 | `js/programs/catalog/hyrox.js:354` | `--shadow-*`/`--glow-*` (review) |
| `#1a300e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:621` | `--shadow-*`/`--glow-*` (review) |
| `#1a4731` | 1 | effect 1 | `js/programs/catalog/running.js:139` | `--shadow-*`/`--glow-*` (review) |
| `#1b2130` | 1 | fallback 1 | `css/programs.css:2818` | `--bg-card` (delete fallback) |
| `#1b4332` | 1 | effect 1 | `js/programs/catalog/hybrid.js:155` | `--shadow-*`/`--glow-*` (review) |
| `#1d120e` | 1 | token 1 | `css/styles.css:10911` | `(review)` |
| `#1e1e1e` | 1 | effect 1 | `js/programs/catalog/fitness.js:272` | `--shadow-*`/`--glow-*` (review) |
| `#1e1e2e` | 1 | fallback 1 | `css/styles.css:9049` | `--bg-card` (delete fallback) |
| `#200b0b` | 1 | surface 1 | `css/styles.css:777` | `--bg-card`/`--bg-raised` (review) |
| `#222222` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:583` | vendor |
| `#29303a` | 1 | fallback 1 | `css/styles.css:9699` | `--border` (delete fallback) |
| `#2a1405` | 1 | effect 1 | `js/programs/catalog/shed-pplul.js:136` | `--shadow-*`/`--glow-*` (review) |
| `#2a1a13` | 1 | token 1 | `css/styles.css:10912` | `(review)` |
| `#2d0a35` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:155` | `--shadow-*`/`--glow-*` (review) |
| `#2d1040` | 1 | effect 1 | `js/programs/catalog/hypertrophy.js:249` | `--shadow-*`/`--glow-*` (review) |
| `#2d1060` | 1 | effect 1 | `js/programs/catalog/hyrox.js:297` | `--shadow-*`/`--glow-*` (review) |
| `#2d1600` | 1 | effect 1 | `js/programs/catalog/hyrox.js:411` | `--shadow-*`/`--glow-*` (review) |
| `#2d1800` | 1 | effect 1 | `js/programs/catalog/hyrox.js:572` | `--shadow-*`/`--glow-*` (review) |
| `#2d1a10` | 1 | effect 1 | `js/programs/catalog/fitness.js:647` | `--shadow-*`/`--glow-*` (review) |
| `#2d1a4e` | 1 | effect 1 | `js/programs/catalog/hyrox.js:194` | `--shadow-*`/`--glow-*` (review) |
| `#2dd4bf` | 1 | token 1 | `css/styles.css:10904` | `(review)` |
| `#332017` | 1 | token 1 | `css/styles.css:10913` | `(review)` |
| `#3388ff` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:268` | vendor |
| `#3730a3` | 1 | text 1 | `css/styles.css:9030` | `--text-*` (review) |
| `#38bdf8` | 1 | text 1 | `js/programs/catalog.js:32` | `--text-*` (review) |
| `#3b82f622` | 1 | decoration 1 | `js/analytics/views/view-fasting.js:347` | `(review)` |
| `#3d2208` | 1 | effect 1 | `js/programs/catalog/shed-pplul.js:136` | `--shadow-*`/`--glow-*` (review) |
| `#4c1d95` | 1 | effect 1 | `css/styles.css:5302` | `--shadow-*`/`--glow-*` (review) |
| `#585858` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:542` | vendor |
| `#666666` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:571` | vendor |
| `#757575` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:536` | vendor |
| `#7c8ba1` | 1 | decoration 1 | `js/share/workout-share.js:145` | `(review)` |
| `#7c8da5` | 1 | token 1 | `css/styles.css:129` | `--text-faint` |
| `#8b97a8` | 1 | decoration 1 | `js/brain/hybrid-score/share-card.js:85` | `(review)` |
| `#93b3a3` | 1 | token 1 | `css/styles.css:10902` | `(review)` |
| `#999999` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:563` | vendor |
| `#9aa7b8` | 1 | decoration 1 | `js/brain/pr-share.js:60` | `(review)` |
| `#9ca3af` | 1 | text 1 | `js/programs/catalog/fitness.js:272` | `--text-*` (review) |
| `#9d174d` | 1 | text 1 | `css/styles.css:8578` | `--text-*` (review) |
| `#aebbcf` | 1 | surface 1 | `css/programs.css:2489` | `--bg-card`/`--bg-raised` (review) |
| `#b91c1c` | 1 | text 1 | `css/styles.css:5926` | `--danger-ink (light)` |
| `#bba99b` | 1 | token 1 | `css/styles.css:10917` | `(review)` |
| `#bbbbbb` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:321` | vendor |
| `#cccccc` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:290` | vendor |
| `#cffafe` | 1 | token 1 | `css/brand-consistency.css:45` | `--accent` |
| `#d7f3e6` | 1 | text 1 | `css/styles.css:1326` | `--text-complete (light bug)` |
| `#dae3ef` | 1 | token 1 | `css/styles.css:3904` | `(review)` |
| `#dbe4ef` | 1 | decoration 1 | `css/styles.css:2646` | `--data-heat-0 (light)` |
| `#dff9ff` | 1 | text 1 | `css/styles.css:9434` | `--text-*` (review) |
| `#e11d48` | 1 | text 1 | `css/styles.css:7312` | `--text-*` (review) |
| `#e4eaf2` | 1 | token 1 | `css/styles.css:3903` | `(review)` |
| `#e5e7eb` | 1 | fallback 1 | `css/styles.css:9582` | `--text-primary` (delete fallback) |
| `#e5edf5` | 1 | token 1 | `css/styles.css:10872` | `--text-primary (Midnight)` |
| `#e6f2ea` | 1 | token 1 | `css/styles.css:10901` | `(review)` |
| `#e8ebff` | 1 | effect 1 | `css/styles.css:5765` | `--shadow-*`/`--glow-*` (review) |
| `#eef0ff` | 1 | effect 1 | `css/styles.css:5765` | `--shadow-*`/`--glow-*` (review) |
| `#eef2f8` | 1 | token 1 | `css/styles.css:3907` | `(review)` |
| `#f1f3f7` | 1 | surface 1 | `css/styles.css:4074` | `--bg-card`/`--bg-raised` (review) |
| `#f2f2f7` | 1 | fallback 1 | `css/styles.css:10100` | `--bg-body` (delete fallback) |
| `#f59e0b22` | 1 | decoration 1 | `js/analytics/views/view-fasting.js:346` | `(review)` |
| `#f5ede4` | 1 | token 1 | `css/styles.css:10916` | `(review)` |
| `#facc15` | 1 | decoration 1 | `scripts/measures-browser-check.mjs:160` | `--warn (yellow)` |
| `#fb7185` | 1 | text 1 | `js/analytics/running-detail.js:98` | `--danger (rose tint)` |
| `#fef2f2` | 1 | surface 1 | `css/styles.css:8898` | `--bg-card`/`--bg-raised` (review) |
| `cyan` | 1 | decoration 1 | `index.html:1860` | `(review)` |
| `lime` | 1 | decoration 1 | `index.html:1860` | `(review)` |
| `navy` | 1 | decoration 1 | `index.html:1860` | `(review)` |
| `rgba()` | 1 | decoration 1 | `js/brain/hybrid-score/share-card.js:125` | `(review)` |
| `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})` | 1 | decoration 1 | `js/brain/hybrid-score/share-card.js:130` | `(review)` |
| `rgba(0,0,0,.16)` | 1 | effect 1 | `css/analytics.css:503` | `--shadow-*` |
| `rgba(0,0,0,0.035)` | 1 | surface 1 | `css/styles.css:8561` | `--overlay-*` (light) |
| `rgba(0,0,0,0.055)` | 1 | effect 1 | `css/analytics.css:824` | `--shadow-*` |
| `rgba(0,0,0,0.11)` | 1 | border 1 | `css/styles.css:5917` | `--overlay-*` (light) |
| `rgba(0,0,0,0.13)` | 1 | token 1 | `css/styles.css:3929` | `--overlay-*` (light) |
| `rgba(0,0,0,0.2)` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:470` | vendor |
| `rgba(0,0,0,0.62)` | 1 | surface 1 | `css/styles.css:3014` | `--overlay-*` (light) |
| `rgba(0,0,0,0.7)` | 1 | surface 1 | `css/styles.css:1897` | `--overlay-*` (light) |
| `rgba(0,0,0,0.78)` | 1 | text 1 | `css/styles.css:4063` | `--overlay-*` (light) |
| `rgba(0,0,0,0.8)` | 1 | text 1 | `css/styles.css:7088` | `--overlay-*` (light) |
| `rgba(0,0,0,0.82)` | 1 | decoration 1 | `css/brand-consistency.css:134` | `--overlay-*` (light) |
| `rgba(0,0,0,0.88)` | 1 | text 1 | `css/styles.css:4067` | `--overlay-*` (light) |
| `rgba(1,2,5,0.90)` | 1 | surface 1 | `css/styles.css:660` | `--data-*`/review |
| `rgba(10,14,28,0.95)` | 1 | surface 1 | `css/styles.css:4132` | `--data-*`/review |
| `rgba(109,40,217,0.05)` | 1 | surface 1 | `css/programs.css:2241` | `--data-*`/review |
| `rgba(109,40,217,0.10)` | 1 | border 1 | `css/programs.css:2241` | `--data-*`/review |
| `rgba(11,16,33,1)` | 1 | effect 1 | `css/styles.css:5507` | `--data-*`/review |
| `rgba(12,17,35,0.98)` | 1 | effect 1 | `css/styles.css:5710` | `--data-*`/review |
| `rgba(124,58,237,0.06)` | 1 | surface 1 | `css/programs.css:2184` | `--data-*`/review |
| `rgba(124,58,237,0.10)` | 1 | surface 1 | `css/programs.css:2136` | `--data-*`/review |
| `rgba(124,58,237,0.12)` | 1 | border 1 | `css/programs.css:2186` | `--data-*`/review |
| `rgba(124,58,237,0.2)` | 1 | effect 1 | `css/programs.css:1311` | `--data-*`/review |
| `rgba(124,58,237,0.20)` | 1 | border 1 | `css/programs.css:2138` | `--data-*`/review |
| `rgba(124,58,237,0.28)` | 1 | surface 1 | `css/programs.css:2194` | `--data-*`/review |
| `rgba(124,58,237,0.3)` | 1 | effect 1 | `css/programs.css:1306` | `--data-*`/review |
| `rgba(124,58,237,0.55)` | 1 | effect 1 | `css/styles.css:6462` | `--data-*`/review |
| `rgba(124,58,237,0.9)` | 1 | surface 1 | `css/programs.css:820` | `--data-*`/review |
| `rgba(129,140,248,0.4)` | 1 | decoration 1 | `js/analytics/views/view-recovery.js:470` | `--data-*`/review |
| `rgba(139,92,246,0.03)` | 1 | effect 1 | `css/styles.css:5734` | `--data-5-soft` |
| `rgba(139,92,246,0.07)` | 1 | effect 1 | `css/styles.css:5651` | `--data-5-soft` |
| `rgba(139,92,246,0.09)` | 1 | effect 1 | `css/styles.css:5868` | `--data-5-soft` |
| `rgba(139,92,246,0.12)` | 1 | effect 1 | `css/styles.css:6909` | `--data-5-soft` |
| `rgba(139,92,246,0.13)` | 1 | effect 1 | `css/styles.css:5657` | `--data-5-soft` |
| `rgba(139,92,246,0.14)` | 1 | effect 1 | `css/styles.css:6499` | `--data-5-soft` |
| `rgba(139,92,246,0.18)` | 1 | effect 1 | `css/styles.css:7250` | `--data-5-soft` |
| `rgba(139,92,246,0.22)` | 1 | border 1 | `css/styles.css:6500` | `--data-5-soft` |
| `rgba(139,92,246,0.3)` | 1 | border 1 | `css/styles.css:6889` | `--data-5-soft` |
| `rgba(139,92,246,0.32)` | 1 | effect 1 | `js/athlete-profile.js:340` | `--data-5-soft` |
| `rgba(139,92,246,0.35)` | 1 | data-viz 1 | `js/analytics/charts/fasting-charts.js:263` | `--data-*` (§8) |
| `rgba(139,92,246,0.55)` | 1 | data-viz 1 | `js/analytics/charts/fasting-charts.js:264` | `--data-*` (§8) |
| `rgba(139,92,246,0.65)` | 1 | surface 1 | `css/styles.css:7186` | `--data-5-soft` |
| `rgba(139,92,246,0.75)` | 1 | effect 1 | `css/styles.css:7188` | `--data-5-soft` |
| `rgba(139,92,246,0.8)` | 1 | surface 1 | `js/profile-stats.js:127` | `--data-5-soft` |
| `rgba(139,92,246,0)` | 1 | effect 1 | `js/athlete-profile.js:340` | `--data-5-soft` |
| `rgba(14,116,144,0.08)` | 1 | surface 1 | `css/programs.css:3626` | `--data-*`/review |
| `rgba(14,116,144,0.35)` | 1 | border 1 | `css/programs.css:3625` | `--data-*`/review |
| `rgba(14,20,44,0.95)` | 1 | surface 1 | `css/styles.css:5580` | `--data-*`/review |
| `rgba(148,163,184,.14)` | 1 | data-viz 1 | `js/analytics/charts.js:444` | `--data-*` (§8) |
| `rgba(148,163,184,.16)` | 1 | decoration 1 | `css/programs.css:2488` | `--data-8-soft` |
| `rgba(148,163,184,.18)` | 1 | surface 1 | `css/styles.css:11017` | `--data-8-soft` |
| `rgba(148,163,184,.2)` | 1 | decoration 1 | `css/programs.css:2482` | `--data-8-soft` |
| `rgba(148,163,184,${heatmap_alpha[l]})` | 1 | surface 1 | `js/profile-stats.js:124` | `--data-8-soft` |
| `rgba(148,163,184,0.08)` | 1 | decoration 1 | `js/analytics/views/view-fasting.js:535` | `--data-8-soft` |
| `rgba(148,163,184,0.1)` | 1 | surface 1 | `css/styles.css:2891` | `--data-8-soft` |
| `rgba(148,163,184,0.12)` | 1 | token 1 | `css/styles.css:10877` | `--data-8-soft` |
| `rgba(148,163,184,0.13)` | 1 | token 1 | `css/styles.css:10906` | `--data-8-soft` |
| `rgba(148,163,184,0.14)` | 1 | surface 1 | `css/programs.css:3503` | `--data-8-soft` |
| `rgba(148,163,184,0.25)` | 1 | border 1 | `css/styles.css:2893` | `--data-8-soft` |
| `rgba(148,163,184,0.35)` | 1 | decoration 1 | `css/styles.css:8242` | `--data-8-soft` |
| `rgba(148,163,184,0.45)` | 1 | text 1 | `js/analytics/views/view-muscles.js:35` | `--data-8-soft` |
| `rgba(148,163,184,0.5)` | 1 | effect 1 | `css/progress.css:687` | `--data-8-soft` |
| `rgba(148,163,184,0.55)` | 1 | text 1 | `js/analytics/views/view-endurance.js:15` | `--data-8-soft` |
| `rgba(15,23,42,.06)` | 1 | effect 1 | `css/styles.css:2639` | `--data-*`/review |
| `rgba(15,23,42,.08)` | 1 | effect 1 | `css/styles.css:10100` | `--data-*`/review |
| `rgba(15,23,42,.1)` | 1 | border 1 | `css/programs.css:3394` | `--data-*`/review |
| `rgba(15,23,42,0.04)` | 1 | surface 1 | `css/progress.css:563` | `--data-*`/review |
| `rgba(15,23,42,0.12)` | 1 | border 1 | `css/progress.css:630` | `--data-*`/review |
| `rgba(15,23,42,0.14)` | 1 | border 1 | `js/ui/confirm-modal.js:51` | `--data-*`/review |
| `rgba(15,23,42,0.18)` | 1 | effect 1 | `js/ui/confirm-modal.js:47` | `--data-*`/review |
| `rgba(15,23,42,0.35)` | 1 | text 1 | `css/analytics.css:891` | `--data-*`/review |
| `rgba(15,23,42,0.60)` | 1 | text 1 | `css/analytics.css:1216` | `--data-*`/review |
| `rgba(15,23,42,0.78)` | 1 | text 1 | `css/styles.css:9191` | `--data-*`/review |
| `rgba(15,23,42,0.92)` | 1 | text 1 | `css/analytics.css:898` | `--data-*`/review |
| `rgba(15,44,62,0.78)` | 1 | effect 1 | `css/styles.css:9362` | `--data-*`/review |
| `rgba(16,185,129,.1)` | 1 | surface 1 | `css/analytics.css:475` | `--ok-soft` |
| `rgba(16,185,129,.12)` | 1 | surface 1 | `css/hybrid-score.css:49` | `--ok-soft` |
| `rgba(16,185,129,.14)` | 1 | surface 1 | `css/hybrid-score.css:46` | `--ok-soft` |
| `rgba(16,185,129,.25)` | 1 | border 1 | `css/analytics.css:475` | `--ok-soft` |
| `rgba(16,185,129,${intensity})` | 1 | text 1 | `js/analytics/charts/strength-charts.js:244` | `--ok-soft` |
| `rgba(16,185,129,0.04)` | 1 | surface 1 | `css/styles.css:1316` | `--ok-soft` |
| `rgba(16,185,129,0.055)` | 1 | surface 1 | `css/analytics.css:1273` | `--ok-soft` |
| `rgba(16,185,129,0.065)` | 1 | surface 1 | `css/analytics.css:206` | `--ok-soft` |
| `rgba(16,185,129,0.09)` | 1 | surface 1 | `css/analytics.css:883` | `--ok-soft` |
| `rgba(16,185,129,0.1)` | 1 | surface 1 | `css/programs.css:2302` | `--ok-soft` |
| `rgba(16,185,129,0.11)` | 1 | surface 1 | `css/analytics.css:640` | `--ok-soft` |
| `rgba(16,185,129,0.2)` | 1 | border 1 | `css/programs.css:2303` | `--ok-soft` |
| `rgba(16,185,129,0.26)` | 1 | border 1 | `css/styles.css:1192` | `--ok-soft` |
| `rgba(16,185,129,0.30)` | 1 | surface 1 | `css/styles.css:4480` | `--ok-soft` |
| `rgba(16,185,129,0.40)` | 1 | border 1 | `css/styles.css:4469` | `--ok-soft` |
| `rgba(16,185,129,0.55)` | 1 | effect 1 | `css/styles.css:3679` | `--ok-soft` |
| `rgba(16,185,129,0.6)` | 1 | effect 1 | `css/styles.css:3708` | `--ok-soft` |
| `rgba(16,185,129,0.70)` | 1 | text 1 | `css/styles.css:6133` | `--ok-soft` |
| `rgba(16,185,129,0.80)` | 1 | text 1 | `css/styles.css:6196` | `--ok-soft` |
| `rgba(16,185,129,0.9)` | 1 | surface 1 | `css/programs.css:815` | `--ok-soft` |
| `rgba(16,185,129,0)` | 1 | effect 1 | `css/analytics.css:988` | `--ok-soft` |
| `rgba(167,139,250,0.12)` | 1 | surface 1 | `css/styles.css:9627` | `--data-*`/review |
| `rgba(18,22,34,0.98)` | 1 | effect 1 | `js/programs/activation.js:150` | `--data-*`/review |
| `rgba(180,110,0,0.85)` | 1 | text 1 | `css/programs.css:3437` | `--data-*`/review |
| `rgba(180,115,0,0.75)` | 1 | text 1 | `css/styles.css:5942` | `--data-*`/review |
| `rgba(180,83,9,0.08)` | 1 | decoration 1 | `js/analytics/views/view-fasting.js:535` | `--data-*`/review |
| `rgba(185,28,28,0.35)` | 1 | border 1 | `css/styles.css:5927` | `--data-*`/review |
| `rgba(196,181,253,0.92)` | 1 | decoration 1 | `js/athlete-profile.js:347` | `--data-*`/review |
| `rgba(2,4,8,0.94)` | 1 | surface 1 | `css/progress.css:792` | `--data-*`/review |
| `rgba(20,13,10,0.86)` | 1 | token 1 | `css/styles.css:10914` | `--data-*`/review |
| `rgba(20,24,36,0.98)` | 1 | effect 1 | `js/ui/confirm-modal.js:32` | `--data-*`/review |
| `rgba(20,25,40,0.96)` | 1 | surface 1 | `css/styles.css:4128` | `--data-*`/review |
| `rgba(21,94,117,0.10)` | 1 | surface 1 | `css/analytics.css:1694` | `--data-*`/review |
| `rgba(21,94,117,0.36)` | 1 | border 1 | `css/analytics.css:1693` | `--data-*`/review |
| `rgba(22,163,74,0.10)` | 1 | effect 1 | `css/programs.css:3315` | `--data-*`/review |
| `rgba(22,163,74,0.45)` | 1 | border 1 | `css/programs.css:3314` | `--data-*`/review |
| `rgba(220,38,38,0.05)` | 1 | surface 1 | `css/programs.css:2240` | `--data-*`/review |
| `rgba(220,38,38,0.06)` | 1 | surface 1 | `css/styles.css:6093` | `--data-*`/review |
| `rgba(220,38,38,0.10)` | 1 | border 1 | `css/programs.css:2240` | `--data-*`/review |
| `rgba(220,38,38,0.30)` | 1 | border 1 | `css/styles.css:6089` | `--data-*`/review |
| `rgba(224,247,250,0.95)` | 1 | effect 1 | `css/styles.css:9530` | `--data-*`/review |
| `rgba(226,232,240,0.92)` | 1 | decoration 1 | `js/brain/hybrid-score/share-card.js:60` | `--data-*`/review |
| `rgba(234,242,249,0.98)` | 1 | effect 1 | `css/styles.css:9530` | `--data-*`/review |
| `rgba(236,72,153,${intensity})` | 1 | text 1 | `js/analytics/charts/strength-charts.js:246` | `--data-6-soft` |
| `rgba(236,72,153,0.12)` | 1 | surface 1 | `css/styles.css:8578` | `--data-6-soft` |
| `rgba(236,72,153,0.18)` | 1 | surface/effect 1 | `index.html:376` | `--data-6-soft` |
| `rgba(236,72,153,0.2)` | 1 | surface/effect 1 | `index.html:409` | `--data-6-soft` |
| `rgba(236,72,153,0.22)` | 1 | border 1 | `css/styles.css:8547` | `--data-6-soft` |
| `rgba(236,72,153,0.3)` | 1 | surface/effect 1 | `index.html:376` | `--data-6-soft` |
| `rgba(236,72,153,0.8)` | 1 | data-viz 1 | `js/analytics/charts.js:729` | `--data-*` (§8) |
| `rgba(236,72,153,0.85)` | 1 | data-viz 1 | `js/analytics/charts/running-charts.js:49` | `--data-*` (§8) |
| `rgba(239,68,68,.14)` | 1 | surface 1 | `css/hybrid-score.css:47` | `--danger-soft` |
| `rgba(239,68,68,.28)` | 1 | border 1 | `css/styles.css:10162` | `--danger-soft` |
| `rgba(239,68,68,.3)` | 1 | border 1 | `css/styles.css:11076` | `--danger-soft` |
| `rgba(239,68,68,0.055)` | 1 | surface 1 | `css/analytics.css:1269` | `--danger-soft` |
| `rgba(239,68,68,0.065)` | 1 | surface 1 | `css/analytics.css:201` | `--danger-soft` |
| `rgba(239,68,68,0.1)` | 1 | surface 1 | `css/styles.css:9495` | `--danger-soft` |
| `rgba(239,68,68,0.16)` | 1 | surface 1 | `css/styles.css:10742` | `--danger-soft` |
| `rgba(239,68,68,0.20)` | 1 | border 1 | `css/styles.css:8899` | `--danger-soft` |
| `rgba(239,68,68,0.22)` | 1 | border 1 | `css/styles.css:778` | `--danger-soft` |
| `rgba(239,68,68,0.28)` | 1 | effect 1 | `css/styles.css:8455` | `--danger-soft` |
| `rgba(239,68,68,0.4)` | 1 | border 1 | `css/styles.css:7582` | `--danger-soft` |
| `rgba(239,68,68,0.40)` | 1 | border 1 | `css/styles.css:5962` | `--danger-soft` |
| `rgba(239,68,68,0.55)` | 1 | border 1 | `css/styles.css:10792` | `--danger-soft` |
| `rgba(239,68,68,0.80)` | 1 | decoration 1 | `css/analytics.css:316` | `--danger-soft` |
| `rgba(239,68,68,0.85)` | 1 | text 1 | `css/styles.css:3656` | `--danger-soft` |
| `rgba(244,247,251,.94)` | 1 | surface 1 | `css/programs.css:2767` | `--data-*`/review |
| `rgba(244,63,94,0.06)` | 1 | surface 1 | `css/styles.css:7607` | `--data-*`/review |
| `rgba(244,63,94,0.12)` | 1 | surface 1 | `css/styles.css:7287` | `--data-*`/review |
| `rgba(244,63,94,0.2)` | 1 | border 1 | `css/styles.css:7607` | `--data-*`/review |
| `rgba(244,63,94,0.25)` | 1 | border 1 | `css/styles.css:7344` | `--data-*`/review |
| `rgba(244,63,94,0.3)` | 1 | border 1 | `css/styles.css:7395` | `--data-*`/review |
| `rgba(244,63,94,0.35)` | 1 | border 1 | `css/styles.css:7486` | `--data-*`/review |
| `rgba(245,158,11,.08)` | 1 | surface 1 | `css/analytics.css:500` | `--warn-soft` |
| `rgba(245,158,11,.14)` | 1 | surface 1 | `css/hybrid-score.css:44` | `--warn-soft` |
| `rgba(245,158,11,.16)` | 1 | surface 1 | `css/analytics.css:490` | `--warn-soft` |
| `rgba(245,158,11,.2)` | 1 | decoration 1 | `css/analytics.css:500` | `--warn-soft` |
| `rgba(245,158,11,0.07)` | 1 | surface 1 | `css/styles.css:5947` | `--warn-soft` |
| `rgba(245,158,11,0.1)` | 1 | surface 1 | `css/programs.css:1520` | `--warn-soft` |
| `rgba(245,158,11,0.15)` | 1 | border 1 | `css/programs.css:2085` | `--warn-soft` |
| `rgba(245,158,11,0.16)` | 1 | surface 1 | `css/styles.css:8072` | `--warn-soft` |
| `rgba(245,158,11,0.2)` | 1 | effect 1 | `css/styles.css:3167` | `--warn-soft` |
| `rgba(245,158,11,0.22)` | 1 | decoration 1 | `css/styles.css:2722` | `--warn-soft` |
| `rgba(245,158,11,0.25)` | 1 | border 1 | `css/analytics.css:1136` | `--warn-soft` |
| `rgba(245,158,11,0.3)` | 1 | decoration 1 | `js/analytics/views/view-progress.js:92` | `--warn-soft` |
| `rgba(245,158,11,0.30)` | 1 | border 1 | `css/styles.css:4174` | `--warn-soft` |
| `rgba(245,158,11,0.34)` | 1 | border 1 | `css/styles.css:4218` | `--warn-soft` |
| `rgba(245,158,11,0.45)` | 1 | decoration 1 | `css/analytics.css:311` | `--warn-soft` |
| `rgba(245,158,11,0.5)` | 1 | border 1 | `css/styles.css:3257` | `--warn-soft` |
| `rgba(245,158,11,0.75)` | 1 | surface 1 | `css/progress.css:729` | `--warn-soft` |
| `rgba(245,158,11,0.85)` | 1 | text 1 | `css/programs.css:2083` | `--warn-soft` |
| `rgba(245,158,11,0.9)` | 1 | surface 1 | `css/programs.css:810` | `--warn-soft` |
| `rgba(245,237,228,0.12)` | 1 | token 1 | `css/styles.css:10921` | `--data-*`/review |
| `rgba(247,249,252,0.94)` | 1 | surface 1 | `css/styles.css:9529` | `--data-*`/review |
| `rgba(248,250,252,0.97)` | 1 | surface 1 | `css/progress.css:817` | `--data-*`/review |
| `rgba(249,115,22,.14)` | 1 | surface 1 | `css/hybrid-score.css:50` | `--data-*`/review |
| `rgba(249,115,22,0.08)` | 1 | surface 1 | `css/styles.css:1514` | `--data-*`/review |
| `rgba(249,115,22,0.10)` | 1 | surface 1 | `css/analytics.css:890` | `--data-*`/review |
| `rgba(249,115,22,0.25)` | 1 | border 1 | `css/styles.css:1508` | `--data-*`/review |
| `rgba(249,115,22,0.35)` | 1 | border 1 | `css/styles.css:2898` | `--data-*`/review |
| `rgba(249,115,22,0.72)` | 1 | text 1 | `css/styles.css:1509` | `--data-*`/review |
| `rgba(249,115,22,0.78)` | 1 | text 1 | `css/styles.css:1497` | `--data-*`/review |
| `rgba(251,191,36,0.08)` | 1 | surface 1 | `css/styles.css:1505` | `--data-*`/review |
| `rgba(251,191,36,0.18)` | 1 | effect 1 | `css/styles.css:4139` | `--data-*`/review |
| `rgba(251,191,36,0.34)` | 1 | border 1 | `css/styles.css:4211` | `--data-*`/review |
| `rgba(251,191,36,0.35)` | 1 | decoration 1 | `css/styles.css:9596` | `--data-*`/review |
| `rgba(251,191,36,0.40)` | 1 | effect 1 | `css/styles.css:4170` | `--data-*`/review |
| `rgba(251,191,36,0.6)` | 1 | text 1 | `css/styles.css:1500` | `--data-*`/review |
| `rgba(251,191,36,0.72)` | 1 | text 1 | `css/styles.css:1496` | `--data-*`/review |
| `rgba(255,107,0,0.1)` | 1 | effect 1 | `css/styles.css:5525` | `--data-*`/review |
| `rgba(255,107,0,0.55)` | 1 | border 1 | `css/styles.css:5524` | `--data-*`/review |
| `rgba(255,122,26,.28)` | 1 | surface 1 | `css/styles.css:2629` | `--data-*`/review |
| `rgba(255,122,26,.5)` | 1 | surface 1 | `css/styles.css:2630` | `--data-*`/review |
| `rgba(255,122,26,.74)` | 1 | surface 1 | `css/styles.css:2631` | `--data-*`/review |
| `rgba(255,215,0,0.75)` | 1 | text 1 | `css/programs.css:2987` | `--data-*`/review |
| `rgba(255,255,255,...)` | 1 | decoration 1 | `css/analytics.css:908` | `--overlay-*` |
| `rgba(255,255,255,…)` | 1 | decoration 1 | `css/analytics.css:1232` | `--overlay-*` |
| `rgba(255,255,255,.1)` | 1 | border 1 | `css/styles.css:10213` | `--border-*` |
| `rgba(255,255,255,.10)` | 1 | border 1 | `css/styles.css:10397` | `--border-*` |
| `rgba(255,255,255,.12)` | 1 | surface 1 | `css/analytics.css:11` | `--overlay-*` |
| `rgba(255,255,255,.14)` | 1 | surface 1 | `css/styles.css:10331` | `--overlay-*` |
| `rgba(255,255,255,.18)` | 1 | border 1 | `css/styles.css:11096` | `--border-*` |
| `rgba(255,255,255,.92)` | 1 | surface 1 | `css/programs.css:3393` | `--overlay-*` |
| `rgba(255,255,255,0.01)` | 1 | token 1 | `css/styles.css:72` | `--overlay-*` |
| `rgba(255,255,255,0.035)` | 1 | effect 1 | `css/styles.css:5239` | `--shadow-*` |
| `rgba(255,255,255,0.20)` | 1 | border 1 | `css/styles.css:549` | `--border-*` |
| `rgba(255,255,255,0.40)` | 1 | text 1 | `js/analytics/views/view-fasting.js:173` | `--text-*` |
| `rgba(255,255,255,0.50)` | 1 | data-viz 1 | `js/analytics/charts/fasting-charts.js:305` | `--data-*` (§8) |
| `rgba(255,255,255,0.60)` | 1 | text 1 | `js/analytics/views/view-fasting.js:176` | `--text-*` |
| `rgba(255,255,255,0.75)` | 1 | border 1 | `css/styles.css:8324` | `--overlay-*` |
| `rgba(255,255,255,0.90)` | 1 | text 1 | `css/programs.css:3456` | `--text-*` |
| `rgba(255,255,255,0.95)` | 1 | data-viz 1 | `js/analytics/views/view-fasting.js:168` | `--data-*` (§8) |
| `rgba(255,255,255,0.96)` | 1 | surface 1 | `css/brand-consistency.css:227` | `--overlay-*` |
| `rgba(29,78,216,0.5)` | 1 | effect 1 | `css/styles.css:8145` | `--data-*`/review |
| `rgba(3,5,10,0.55)` | 1 | surface 1 | `css/styles.css:796` | `--data-*`/review |
| `rgba(30,27,12,0.94)` | 1 | surface/effect 1 | `index.html:102` | `--data-*`/review |
| `rgba(34,197,94,0.12)` | 1 | effect 1 | `css/programs.css:3222` | `--data-*`/review |
| `rgba(34,197,94,0.5)` | 1 | border 1 | `css/programs.css:3221` | `--data-*`/review |
| `rgba(34,211,238,0.025)` | 1 | surface 1 | `css/styles.css:861` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.04)` | 1 | effect 1 | `css/styles.css:5635` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.05)` | 1 | surface 1 | `css/styles.css:1021` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.13)` | 1 | surface 1 | `css/styles.css:9436` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.2)` | 1 | decoration 1 | `index.html:716` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.20)` | 1 | border 1 | `css/styles.css:5444` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.24)` | 1 | border 1 | `css/styles.css:9397` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.28)` | 1 | border 1 | `css/styles.css:5486` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.30)` | 1 | decoration 1 | `js/profile-stats.js:90` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.34)` | 1 | border 1 | `css/styles.css:9511` | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0)` | 1 | decoration 1 | `js/profile-stats.js:91` | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.06)` | 1 | surface 1 | `css/programs.css:3109` | `--data-*`/review |
| `rgba(37,99,235,0.07)` | 1 | surface 1 | `css/programs.css:3893` | `--data-*`/review |
| `rgba(37,99,235,0.22)` | 1 | surface 1 | `css/programs.css:304` | `--data-*`/review |
| `rgba(37,99,235,0.30)` | 1 | border 1 | `css/programs.css:2372` | `--data-*`/review |
| `rgba(37,99,235,0.4)` | 1 | border 1 | `css/programs.css:763` | `--data-*`/review |
| `rgba(37,99,235,0.40)` | 1 | border 1 | `css/programs.css:2377` | `--data-*`/review |
| `rgba(37,99,235,0.45)` | 1 | border 1 | `css/programs.css:112` | `--data-*`/review |
| `rgba(37,99,235,0.7)` | 1 | text 1 | `css/programs.css:1408` | `--data-*`/review |
| `rgba(37,99,235,0.8)` | 1 | text 1 | `css/programs.css:490` | `--data-*`/review |
| `rgba(37,99,235,0.85)` | 1 | surface 1 | `css/programs.css:3926` | `--data-*`/review |
| `rgba(37,99,235,0.9)` | 1 | surface 1 | `css/programs.css:805` | `--data-*`/review |
| `rgba(4,10,18,0.02)` | 1 | effect 1 | `js/programs/program-card.js:42` | `--data-*`/review |
| `rgba(4,10,18,0.52)` | 1 | effect 1 | `js/programs/program-card.js:42` | `--data-*`/review |
| `rgba(4,6,14,0.94)` | 1 | surface 1 | `css/styles.css:5523` | `--data-*`/review |
| `rgba(4,7,12,0.94)` | 1 | surface 1 | `css/styles.css:9693` | `--data-*`/review |
| `rgba(5,10,18,0.95)` | 1 | surface 1 | `css/brand-consistency.css:131` | `--data-*`/review |
| `rgba(5,10,20,.62)` | 1 | decoration 1 | `css/programs.css:2482` | `--data-*`/review |
| `rgba(5,150,105,0.07)` | 1 | surface 1 | `css/styles.css:4897` | `--data-*`/review |
| `rgba(5,150,105,0.32)` | 1 | border 1 | `css/styles.css:4898` | `--data-*`/review |
| `rgba(5,150,105,0.80)` | 1 | text 1 | `css/styles.css:6253` | `--data-*`/review |
| `rgba(5,150,105,0.85)` | 1 | text 1 | `css/styles.css:6258` | `--data-*`/review |
| `rgba(5,8,16,0.64)` | 1 | surface 1 | `js/programs/activation.js:145` | `--data-*`/review |
| `rgba(51,181,229,0.4)` | 1 | vendor 1 | `js/vendor/leaflet/leaflet.css:86` | vendor |
| `rgba(52,211,153,0.08)` | 1 | surface 1 | `css/styles.css:4622` | `--data-*`/review |
| `rgba(52,211,153,0.14)` | 1 | surface 1 | `css/styles.css:4637` | `--data-*`/review |
| `rgba(52,211,153,0.42)` | 1 | border 1 | `css/styles.css:4621` | `--data-*`/review |
| `rgba(59,130,246,.14)` | 1 | effect 1 | `css/analytics.css:476` | `--info-soft` |
| `rgba(59,130,246,.22)` | 1 | effect 1 | `css/analytics.css:495` | `--info-soft` |
| `rgba(59,130,246,.26)` | 1 | effect 1 | `css/analytics.css:476` | `--info-soft` |
| `rgba(59,130,246,.35)` | 1 | border 1 | `css/styles.css:11086` | `--info-soft` |
| `rgba(59,130,246,${intensity})` | 1 | text 1 | `js/analytics/charts/strength-charts.js:245` | `--info-soft` |
| `rgba(59,130,246,0.04)` | 1 | surface 1 | `css/styles.css:6058` | `--info-soft` |
| `rgba(59,130,246,0.055)` | 1 | surface 1 | `css/analytics.css:1277` | `--info-soft` |
| `rgba(59,130,246,0.065)` | 1 | surface 1 | `css/analytics.css:211` | `--info-soft` |
| `rgba(59,130,246,0.07)` | 1 | surface 1 | `css/styles.css:6082` | `--info-soft` |
| `rgba(59,130,246,0.11)` | 1 | border 1 | `css/analytics.css:626` | `--info-soft` |
| `rgba(59,130,246,0.13)` | 1 | surface 1 | `css/styles.css:9461` | `--info-soft` |
| `rgba(59,130,246,0.16)` | 1 | border 1 | `css/styles.css:8917` | `--info-soft` |
| `rgba(59,130,246,0.20)` | 1 | border 1 | `css/styles.css:5680` | `--info-soft` |
| `rgba(59,130,246,0.32)` | 1 | border 1 | `css/styles.css:4199` | `--info-soft` |
| `rgba(59,130,246,0.55)` | 1 | effect 1 | `css/styles.css:8266` | `--info-soft` |
| `rgba(6,17,13,0.84)` | 1 | token 1 | `css/styles.css:10899` | `--data-*`/review |
| `rgba(6,182,212,0.05)` | 1 | surface 1 | `css/styles.css:8909` | `--data-*`/review |
| `rgba(6,182,212,0.07)` | 1 | effect 1 | `css/styles.css:5230` | `--data-*`/review |
| `rgba(6,182,212,0.08)` | 1 | effect 1 | `css/styles.css:5850` | `--data-*`/review |
| `rgba(6,182,212,0.09)` | 1 | surface 1 | `css/styles.css:8913` | `--data-*`/review |
| `rgba(6,182,212,0.10)` | 1 | surface 1 | `css/styles.css:5788` | `--data-*`/review |
| `rgba(6,182,212,0.12)` | 1 | effect 1 | `css/analytics.css:1357` | `--data-*`/review |
| `rgba(6,182,212,0.15)` | 1 | surface 1 | `css/styles.css:7249` | `--data-*`/review |
| `rgba(6,182,212,0.30)` | 1 | border 1 | `css/styles.css:8815` | `--data-*`/review |
| `rgba(6,182,212,0.4)` | 1 | surface/effect 1 | `index.html:284` | `--data-*`/review |
| `rgba(6,182,212,0.55)` | 1 | border 1 | `css/styles.css:5849` | `--data-*`/review |
| `rgba(6,182,212,0.65)` | 1 | surface 1 | `css/styles.css:7187` | `--data-*`/review |
| `rgba(6,182,212,0.75)` | 1 | effect 1 | `css/styles.css:7188` | `--data-*`/review |
| `rgba(6,182,212,0.8)` | 1 | surface 1 | `js/profile-stats.js:128` | `--data-*`/review |
| `rgba(7,10,18,0.82)` | 1 | token 1 | `css/styles.css:10870` | `--data-*`/review |
| `rgba(79,70,229,0.06)` | 1 | effect 1 | `css/styles.css:6499` | `--data-*`/review |
| `rgba(79,70,229,0.75)` | 1 | text 1 | `css/styles.css:5760` | `--data-*`/review |
| `rgba(8,12,22,0.98)` | 1 | effect 1 | `css/styles.css:5710` | `--data-*`/review |
| `rgba(8,145,178,0.02)` | 1 | surface 1 | `css/styles.css:6047` | `--data-*`/review |
| `rgba(8,145,178,0.04)` | 1 | surface 1 | `css/styles.css:6052` | `--data-*`/review |
| `rgba(8,145,178,0.05)` | 1 | surface 1 | `css/styles.css:6031` | `--data-*`/review |
| `rgba(8,145,178,0.08)` | 1 | surface 1 | `css/styles.css:6055` | `--data-*`/review |
| `rgba(8,145,178,0.10)` | 1 | effect 1 | `css/styles.css:5772` | `--data-*`/review |
| `rgba(8,145,178,0.18)` | 1 | border 1 | `css/styles.css:6053` | `--data-*`/review |
| `rgba(8,145,178,0.20)` | 1 | border 1 | `css/styles.css:6032` | `--data-*`/review |
| `rgba(8,145,178,0.25)` | 1 | text 1 | `css/styles.css:6036` | `--data-*`/review |
| `rgba(8,145,178,0.26)` | 1 | border 1 | `css/styles.css:5771` | `--data-*`/review |
| `rgba(8,145,178,0.28)` | 1 | border 1 | `css/styles.css:6055` | `--data-*`/review |
| `rgba(8,145,178,0.30)` | 1 | border 1 | `css/styles.css:6046` | `--data-*`/review |
| `rgba(8,15,26,.66)` | 1 | surface 1 | `css/programs.css:2489` | `--data-*`/review |
| `rgba(8,20,34,0.96)` | 1 | effect 1 | `css/styles.css:9362` | `--data-*`/review |
| `rgba(9,14,26,0.95)` | 1 | surface 1 | `css/styles.css:5569` | `--data-*`/review |
| `rgba(9,14,26,1)` | 1 | effect 1 | `css/styles.css:5237` | `--data-*`/review |
| `rgba(91,33,182,0.09)` | 1 | surface 1 | `css/programs.css:3693` | `--data-*`/review |
| `rgba(91,33,182,0.4)` | 1 | border 1 | `css/programs.css:3692` | `--data-*`/review |
| `rgba(96,165,250,0.035)` | 1 | effect 1 | `css/brand-consistency.css:78` | `--data-*`/review |
| `rgba(96,165,250,0.45)` | 1 | decoration 1 | `js/analytics/charts/running-charts.js:75` | `--data-*`/review |
| `rgba(99,102,241,0.03)` | 1 | surface 1 | `css/styles.css:8932` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.04)` | 1 | surface 1 | `css/styles.css:5630` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.3)` | 1 | effect 1 | `css/styles.css:9020` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.38)` | 1 | border 1 | `css/analytics.css:1358` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.42)` | 1 | effect 1 | `css/styles.css:5586` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.7)` | 1 | border 1 | `css/styles.css:9018` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.75)` | 1 | text 1 | `css/styles.css:5351` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.80)` | 1 | text 1 | `css/programs.css:2414` | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(var(--brand-cobalt-rgb),0.035)` | 1 | effect 1 | `css/brand-consistency.css:213` | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.045)` | 1 | surface 1 | `css/brand-consistency.css:162` | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.075)` | 1 | effect 1 | `css/brand-consistency.css:212` | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.11)` | 1 | effect 1 | `css/brand-consistency.css:200` | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.14)` | 1 | surface 1 | `css/brand-consistency.css:138` | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.15)` | 1 | effect 1 | `css/brand-consistency.css:76` | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.18)` | 1 | surface 1 | `css/styles.css:4632` | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.20)` | 1 | border 1 | `css/brand-consistency.css:174` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.22)` | 1 | border 1 | `css/brand-consistency.css:180` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.23)` | 1 | border 1 | `css/brand-consistency.css:157` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.24)` | 1 | border 1 | `css/brand-consistency.css:95` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.30)` | 1 | border 1 | `css/brand-consistency.css:228` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.46)` | 1 | border 1 | `css/brand-consistency.css:132` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.48)` | 1 | border 1 | `css/styles.css:4612` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.58)` | 1 | border 1 | `css/brand-consistency.css:199` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.72)` | 1 | border 1 | `css/brand-consistency.css:145` | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.78)` | 1 | border 1 | `css/brand-consistency.css:203` | `--border-*` (review) |
| `rgba(var(--zone-color),0.15)` | 1 | surface 1 | `css/styles.css:7984` | `--bg-card`/`--bg-raised` (review) |
| `transparent` | 1 | decoration 1 | `index.html:2066` | `(review)` |
| `white` | 1 | text 1 | `css/styles.css:5409` | `--text-*` (review) |


## Appendix B — inventory by file

Per-file grouped values with occurrence counts and line numbers. Use this to estimate migration
effort per file. Full line lists are capped at 8 for readability.


### `css/styles.css` — 1521 literals, 505 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ffffff` | 56 | text 26 · surface 11 · effect 8 · fallback 6 · token 3 · decoration 2 | 38, 2242, 2244, 2638, 2651, 2841, 2927, 3324… | `--text-white/--accent-ink` |
| `#94a3b8` | 54 | fallback 49 · token 5 | 37, 119, 127, 993, 1004, 2066, 2262, 2599… | `--text-muted` (delete fallback) |
| `#f8fafc` | 40 | fallback 25 · effect 7 · token 4 · text 2 · surface 2 | 34, 3024, 3035, 3047, 3906, 3908, 4129, 5739… | `--text-primary` (delete fallback) |
| `#0f172a` | 39 | text 38 · token 1 | 1334, 3912, 3969, 4000, 4006, 4043, 4099, 4114… | `--text-primary (light)/chart stroke` |
| `rgba(0,0,0,0.05)` | 31 | surface 29 · text 1 · effect 1 | 4001, 4011, 4016, 4032, 4041, 4049, 4085, 4097… | `--overlay-*` (light) |
| `rgba(0,0,0,0.12)` | 27 | border 23 · effect 3 · surface 1 | 3935, 3981, 3991, 4033, 4042, 4050, 4098, 4113… | `--overlay-*` (light) |
| `#22d3ee` | 24 | fallback 20 · token 3 · decoration 1 | 43, 2075, 2167, 2168, 2190, 2260, 2434, 2947… | `--color-cyan` (delete fallback) |
| `#f59e0b` | 24 | fallback 16 · text 3 · token 2 · effect 1 · surface 1 · decoration 1 | 45, 1265, 1279, 1590, 2261, 2347, 2502, 2504… | `--color-amber` (delete fallback) |
| `#10b981` | 23 | fallback 16 · token 5 · surface 1 · decoration 1 | 44, 1118, 1200, 1206, 1213, 1264, 2012, 2014… | `--color-green` (delete fallback) |
| `rgba(0,0,0,0.07)` | 22 | border 15 · effect 5 · surface 1 · text 1 | 3932, 3953, 3986, 4028, 4064, 4082, 5740, 5741… | `--overlay-*` (light) |
| `rgba(0,0,0,0.08)` | 22 | border 16 · effect 3 · token 2 · surface 1 | 3923, 3933, 3940, 3954, 3961, 3970, 3980, 4077… | `--overlay-*` (light) |
| `#cbd5e1` | 19 | fallback 15 · text 3 · token 1 | 126, 1194, 1310, 1420, 1697, 2999, 7330, 9555… | `--text-secondary` (delete fallback) |
| `rgba(0,0,0,0.55)` | 17 | text 10 · effect 6 · surface 1 | 140, 433, 1842, 1872, 3992, 4051, 4090, 5820… | `--overlay-*` (light) |
| `rgba(0,0,0,0.10)` | 16 | border 9 · effect 4 · token 1 · surface 1 · decoration 1 | 3934, 3942, 3958, 5118, 5395, 5745, 5807, 5819… | `--overlay-*` (light) |
| `#ef4444` | 15 | fallback 9 · token 2 · surface 2 · decoration 1 · text 1 | 46, 1007, 1276, 1312, 2163, 7574, 7933, 8377… | `--color-red` (delete fallback) |
| `rgba(0,0,0,0.03)` | 15 | surface 14 · token 1 | 3925, 4106, 4890, 5980, 6262, 6342, 7306, 7327… | `--overlay-*` (light) |
| `#ff6b00` | 14 | fallback 13 · token 1 | 48, 1311, 2000, 2000, 2160, 2160, 2161, 2161… | `--color-orange` (delete fallback) |
| `rgba(0,0,0,0.06)` | 14 | effect 6 · border 6 · token 2 | 3926, 3927, 3975, 4003, 5767, 5772, 5797, 5968… | `--shadow-*` |
| `rgba(99,102,241,0.5)` | 14 | border 12 · effect 2 | 1872, 1880, 3323, 3338, 3407, 3603, 4378, 4453… | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#3b82f6` | 13 | fallback 9 · token 3 · decoration 1 | 41, 7934, 9552, 9571, 9579, 9586, 9641, 10182… | `--accent-blue` (delete fallback) |
| `#0e7490` | 11 | text 9 · border 1 · token 1 | 2975, 5781, 5790, 5852, 6035, 6056, 8807, 8809… | `--accent-strong (styles Midnight)` |
| `#4f46e5` | 11 | effect 6 · text 5 | 5583, 5714, 5828, 5937, 6017, 6337, 6453, 7150… | `--border-focus (legacy indigo)` |
| `rgba(0,0,0,0.04)` | 10 | surface 9 · token 1 | 3939, 5818, 5952, 6024, 6319, 6330, 8063, 8597… | `--overlay-*` (light) |
| `rgba(0,0,0,0.5)` | 10 | effect 6 · text 4 | 4494, 4509, 4880, 5239, 5439, 5445, 5618, 6240… | `--shadow-*` |
| `#23272e` | 9 | fallback 9 | 9375, 9378, 9388, 9541, 9551, 9571, 9606, 9607… | `--border` (delete fallback) |
| `#60a5fa` | 9 | text 5 · fallback 2 · surface 1 · effect 1 | 1044, 3199, 3255, 7579, 8099, 8235, 9633, 9675… | `--info (tint)` |
| `#8b5cf6` | 9 | fallback 6 · token 2 · decoration 1 | 47, 134, 2981, 2982, 2984, 2989, 2995, 10583… | `--accent-purple` (delete fallback) |
| `#a5b4fc` | 9 | text 9 | 3604, 4379, 4454, 4486, 4732, 5096, 5202, 5463… | `--text-*` (review) |
| `rgba(0,0,0,0.09)` | 9 | surface 4 · border 4 · token 1 | 3928, 4037, 4054, 4891, 5921, 7086, 8587, 8598… | `--overlay-*` (light) |
| `rgba(0,0,0,0.45)` | 9 | text 6 · effect 3 | 437, 1072, 4034, 5509, 5933, 6366, 8710, 8831… | `--overlay-*` (light) |
| `#0b0f14` | 8 | fallback 5 · surface 3 | 3046, 8320, 9301, 9380, 9608, 9663, 9670, 9671 | `--bg-app` (delete fallback) |
| `#155e75` | 8 | decoration 3 · effect 3 · text 2 | 10628, 10632, 10633, 10635, 10635, 10635, 10636, 10637 | `--accent` |
| `#ff7a1a` | 8 | decoration 4 · surface 2 · text 1 · border 1 | 2604, 2605, 2606, 2624, 2625, 2626, 2627, 2632 | `--data-heat` |
| `rgba(0,0,0,0.1)` | 8 | border 8 | 4012, 4017, 7306, 7608, 8065, 8066, 8070, 8653 | `--overlay-*` (light) |
| `rgba(0,0,0,0.18)` | 8 | border 4 · surface 2 · effect 1 · decoration 1 | 1136, 1691, 5824, 5883, 5909, 5932, 6011, 7087 | `--overlay-*` (light) |
| `rgba(0,0,0,0.35)` | 8 | surface 3 · effect 3 · text 1 · decoration 1 | 753, 1548, 1720, 3082, 4001, 4123, 5313, 6297 | `--overlay-*` (light) |
| `rgba(99,102,241,0.10)` | 8 | surface 4 · effect 3 · token 1 | 151, 1879, 2039, 2184, 5122, 5547, 5719, 5767 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.35)` | 8 | border 5 · effect 3 | 1828, 3334, 4276, 4746, 5123, 5831, 6347, 9023 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.4)` | 8 | border 7 · effect 1 | 3415, 4498, 4513, 4884, 4903, 5052, 5095, 7310 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#161b22` | 7 | fallback 7 | 2984, 9377, 9378, 9388, 9541, 9554, 9571 | `--bg-card` (delete fallback) |
| `#2563eb` | 7 | text 5 · fallback 1 · effect 1 | 2247, 6061, 8235, 8541, 8593, 8887, 8940 | `--info-strong` |
| `#f97316` | 7 | text 2 · effect 2 · border 1 · surface 1 · fallback 1 | 1512, 1513, 2897, 7573, 7699, 7789, 9572 | `--data-7/--brand-today` |
| `#fbbf24` | 7 | text 4 · effect 2 · border 1 | 1503, 1504, 3257, 4165, 6572, 6597, 9596 | `--warn (tint)` |
| `rgba(0,0,0,.08)` | 7 | border 5 · surface 2 | 10101, 10102, 10273, 10274, 10338, 10375, 10440 | `--overlay-*` (light) |
| `rgba(59,130,246,0.18)` | 7 | border 4 · surface 3 | 1027, 1626, 1744, 3255, 5875, 6059, 8602 | `--info-soft` |
| `rgba(99,102,241,0.06)` | 7 | effect 5 · surface 2 | 4029, 5215, 5618, 5732, 5837, 5938, 6271 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.08)` | 7 | surface 4 · effect 3 | 3394, 4902, 5199, 5243, 5810, 6240, 9024 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.12)` | 7 | surface 5 · effect 1 · border 1 | 4497, 4512, 4883, 5439, 6239, 6335, 8726 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#b45309` | 6 | text 4 · decoration 1 · token 1 | 4203, 4216, 5946, 10852, 10855, 10918 | `--warn-ink (light)` |
| `rgba(0,0,0,.02)` | 6 | surface 6 | 10101, 10102, 10273, 10338, 10375, 10440 | `--overlay-*` (light) |
| `rgba(255,255,255,.04)` | 6 | surface 4 · border 1 · decoration 1 | 3467, 9999, 10172, 10249, 10313, 10931 | `--overlay-*` |
| `rgba(99,102,241,0.2)` | 6 | surface 5 · border 1 | 3602, 4377, 4452, 4730, 5094, 5200 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#1d4ed8` | 5 | text 4 · surface 1 | 5876, 5994, 6081, 8143, 8577 | `--info-strong` |
| `#f1f5f9` | 5 | fallback 3 · text 2 | 3420, 3550, 3875, 10363, 10435 | `--text-primary` (delete fallback) |
| `#f43f5e` | 5 | text 2 · surface 2 · border 1 | 7122, 7287, 7369, 7396, 7470 | `--danger (rose)` |
| `#f87171` | 5 | text 4 · border 1 | 3075, 3235, 3258, 3267, 3657 | `--text-*` (review) |
| `rgba(0,0,0,0.14)` | 5 | border 3 · token 2 | 3941, 3943, 4874, 5988, 6320 | `--overlay-*` (light) |
| `rgba(0,0,0,0.40)` | 5 | effect 3 · text 2 | 139, 424, 6071, 8617, 9222 | `--shadow-*` |
| `rgba(0,0,0,0.6)` | 5 | surface 3 · text 1 · effect 1 | 3348, 4018, 5243, 7824, 8980 | `--overlay-*` (light) |
| `rgba(0,0,0,0.75)` | 5 | text 4 · effect 1 | 3996, 4038, 4055, 5691, 5958 | `--overlay-*` (light) |
| `rgba(16,185,129,0.35)` | 5 | effect 3 · border 2 | 565, 1373, 2158, 3731, 5607 | `--ok-soft` |
| `rgba(255,255,255,.09)` | 5 | border 5 | 9997, 10057, 10139, 10170, 10248 | `--overlay-*` |
| `rgba(34,211,238,0.08)` | 5 | surface 2 · effect 2 · token 1 | 152, 2965, 5445, 8873, 9399 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.22)` | 5 | border 4 · surface 1 | 5501, 5636, 5643, 8874, 9360 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.3)` | 5 | border 5 | 860, 979, 1024, 2963, 3288 | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.10)` | 5 | surface 4 · token 1 | 66, 5992, 6177, 8540, 8885 | `--info-soft` |
| `rgba(99,102,241,0.18)` | 5 | border 3 · surface 2 | 4484, 5051, 5652, 5766, 5836 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.55)` | 5 | border 4 · effect 1 | 4046, 4419, 4955, 5089, 5414 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#080f1a` | 4 | fallback 4 | 2518, 2541, 2619, 9987 | `--bg-deep` (delete fallback) |
| `#1f242c` | 4 | fallback 4 | 9587, 9604, 9620, 9652 | `--border` (delete fallback) |
| `#475569` | 4 | token 2 · text 2 | 3913, 3916, 5855, 6310 | `--text-secondary (light)` |
| `#64748b` | 4 | token 2 · decoration 1 · fallback 1 | 130, 3920, 9160, 10154 | `--text-ghost` |
| `#6ee7b7` | 4 | text 4 | 1313, 3038, 4638, 10075 | `--ok` |
| `rgba(0,0,0,0.22)` | 4 | effect 2 · border 2 | 137, 2257, 3995, 9142 | `--shadow-*` |
| `rgba(0,0,0,0.25)` | 4 | effect 3 · border 1 | 461, 1064, 5957, 9377 | `--shadow-*` |
| `rgba(0,0,0,0.50)` | 4 | text 3 · effect 1 | 1827, 5954, 5999, 6012 | `--overlay-*` (light) |
| `rgba(0,0,0,0.65)` | 4 | effect 2 · text 2 | 141, 687, 4013, 9142 | `--shadow-*` |
| `rgba(16,185,129,0.08)` | 4 | surface 3 · effect 1 | 539, 1359, 2158, 5624 | `--ok-soft` |
| `rgba(16,185,129,0.18)` | 4 | border 2 · surface 2 | 536, 3256, 4468, 5840 | `--ok-soft` |
| `rgba(239,68,68,0.12)` | 4 | surface 3 · token 1 | 68, 2901, 5961, 9628 | `--danger-soft` |
| `rgba(239,68,68,0.18)` | 4 | border 2 · surface 1 · decoration 1 | 543, 1392, 3258, 3266 | `--danger-soft` |
| `rgba(239,68,68,0.35)` | 4 | border 3 · effect 1 | 1414, 2903, 3136, 10756 | `--danger-soft` |
| `rgba(239,68,68,0.5)` | 4 | border 3 · surface 1 | 3234, 3258, 3267, 10703 | `--danger-soft` |
| `rgba(245,158,11,0.10)` | 4 | decoration 2 · token 1 · surface 1 | 153, 2721, 2723, 8032 | `--warn-soft` |
| `rgba(245,158,11,0.12)` | 4 | surface 4 | 393, 5059, 9626, 9632 | `--warn-soft` |
| `rgba(245,158,11,0.28)` | 4 | border 2 · effect 2 | 394, 6565, 8033, 8456 | `--warn-soft` |
| `rgba(255,255,255,.07)` | 4 | border 3 · decoration 1 | 10203, 10207, 10260, 10432 | `--overlay-*` |
| `rgba(255,255,255,0.03)` | 4 | surface 2 · token 1 · decoration 1 | 73, 3892, 6294, 9620 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 4 | surface 3 · token 1 | 74, 3893, 9640, 9645 | `--overlay-*` |
| `rgba(255,255,255,0.25)` | 4 | border 4 | 564, 3232, 3253, 9140 | `--overlay-*` |
| `rgba(59,130,246,0.08)` | 4 | surface 3 · border 1 | 2695, 2879, 5679, 8591 | `--info-soft` |
| `rgba(59,130,246,0.12)` | 4 | surface 3 · border 1 | 1143, 8096, 8577, 11106 | `--info-soft` |
| `rgba(59,130,246,0.15)` | 4 | border 3 · surface 1 | 2881, 3198, 6083, 8939 | `--info-soft` |
| `rgba(99,102,241,0.07)` | 4 | effect 3 · surface 1 | 202, 1888, 2244, 5651 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.15)` | 4 | surface 3 · border 1 | 4058, 4275, 5865, 9005 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.28)` | 4 | border 2 · surface 2 | 1841, 4488, 5658, 9017 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.40)` | 4 | border 2 · effect 2 | 4485, 5411, 5715, 6336 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.45)` | 4 | border 4 | 1888, 3282, 4059, 9004 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#000000` | 3 | effect 2 · text 1 | 4166, 6211, 6212 | `--shadow-*`/`--glow-*` (review) |
| `#080f1e` | 3 | token 3 | 28, 30, 10886 | `--bg-deep` |
| `#090e1a` | 3 | token 3 | 24, 31, 10882 | `--bg-card (Slate)` |
| `#111728` | 3 | token 3 | 25, 29, 10883 | `--bg-input (Slate)` |
| `#2a3038` | 3 | fallback 3 | 3021, 3032, 3044 | `--border-medium` (delete fallback) |
| `#526176` | 3 | token 3 | 3914, 3917, 3919 | `--text-muted (light)` |
| `#7c3aed` | 3 | effect 3 | 6453, 7150, 9146 | `--data-5 (deep)` |
| `#a3e635` | 3 | text 1 · decoration 1 · token 1 | 1584, 3176, 10863 | `--accent-alt (lime)` |
| `#c7d2fe` | 3 | text 2 · border 1 | 3282, 5053, 9019 | `--text-*` (review) |
| `#d2f1fa` | 3 | effect 2 · surface 1 | 5770, 5847, 8805 | `--shadow-*`/`--glow-*` (review) |
| `rgba(0,0,0,0.15)` | 3 | effect 1 · border 1 · surface 1 | 3936, 4120, 8771 | `--shadow-*` |
| `rgba(0,0,0,0.28)` | 3 | text 2 · effect 1 | 3623, 4070, 8599 | `--overlay-*` (light) |
| `rgba(148,163,184,.10)` | 3 | border 2 · decoration 1 | 10947, 11051, 11079 | `--data-8-soft` |
| `rgba(16,185,129,0.10)` | 3 | surface 3 | 1191, 2011, 6190 | `--ok-soft` |
| `rgba(16,185,129,0.12)` | 3 | surface 3 | 3730, 7050, 7286 | `--ok-soft` |
| `rgba(16,185,129,0.22)` | 3 | border 2 · surface 1 | 1317, 3738, 6191 | `--ok-soft` |
| `rgba(16,185,129,0.45)` | 3 | border 2 · effect 1 | 573, 1360, 2010 | `--ok-soft` |
| `rgba(245,158,11,0.35)` | 3 | border 3 | 5941, 7520, 8071 | `--warn-soft` |
| `rgba(255,255,255,.03)` | 3 | surface 3 | 10293, 10352, 10434 | `--overlay-*` |
| `rgba(255,255,255,.08)` | 3 | border 3 | 10291, 10350, 10414 | `--overlay-*` |
| `rgba(255,255,255,0.05)` | 3 | surface 3 | 1990, 3034, 9631 | `--overlay-*` |
| `rgba(255,255,255,0.07)` | 3 | token 2 · surface 1 | 71, 145, 3580 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 3 | token 2 · surface 1 | 76, 146, 1826 | `--overlay-*` |
| `rgba(255,255,255,0.22)` | 3 | border 3 | 2923, 2943, 4796 | `--overlay-*` |
| `rgba(34,211,238,0.18)` | 3 | border 2 · effect 1 | 930, 1022, 3975 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.45)` | 3 | border 2 · text 1 | 957, 3271, 9435 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.6)` | 3 | text 2 · border 1 | 888, 938, 5644 | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.25)` | 3 | border 3 | 1540, 2705, 8097 | `--info-soft` |
| `rgba(59,130,246,0.28)` | 3 | surface 1 · effect 1 · border 1 | 8108, 8457, 8886 | `--info-soft` |
| `rgba(6,182,212,0.18)` | 3 | border 2 · effect 1 | 7250, 8845, 8910 | `--data-*`/review |
| `rgba(99,102,241,0.09)` | 3 | effect 1 · border 1 · surface 1 | 5868, 6270, 6346 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.16)` | 3 | surface 2 · decoration 1 | 3281, 5209, 9028 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.22)` | 3 | border 3 | 432, 5438, 5869 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.25)` | 3 | border 2 · effect 1 | 4749, 5216, 5744 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.30)` | 3 | border 2 · surface 1 | 3957, 5104, 8727 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.6)` | 3 | border 3 | 3558, 3886, 4707 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#001a1a` | 2 | effect 2 | 5443, 5642 | `--surface-legacy (teal black)` |
| `#020408` | 2 | token 2 | 23, 10881 | `--bg-app (Slate)` |
| `#04121a` | 2 | fallback 1 · text 1 | 3493, 11091 | `--accent-ink` |
| `#059669` | 2 | effect 1 · text 1 | 5603, 7307 | `--ok-strong` |
| `#060a12` | 2 | fallback 2 | 9319, 9333 | `--bg-app` (delete fallback) |
| `#070a12` | 2 | fallback 1 · token 1 | 6280, 10866 | `--bg-app (Midnight)` |
| `#161e34` | 2 | token 2 | 26, 10884 | `--bg-input-focus (Slate)` |
| `#1a1205` | 2 | text 2 | 7917, 7929 | `--text-*` (review) |
| `#1e293b` | 2 | token 1 · text 1 | 3915, 6314 | `--bg-raised (light inverse)` |
| `#22364f` | 2 | decoration 1 · surface 1 | 2623, 2628 | `--data-heat-0` |
| `#34d399` | 2 | text 1 · token 1 | 3256, 10905 | `--ok (tint)` |
| `#374151` | 2 | text 2 | 8065, 8066 | `--text-*` |
| `#5b21b6` | 2 | text 2 | 2996, 7309 | `--text-*` (review) |
| `#67e8f9` | 2 | border 1 · text 1 | 3271, 5464 | `--accent (tint)` |
| `#a8b1bd` | 2 | fallback 2 | 9607, 9713 | `--text-muted` (delete fallback) |
| `#c4b5fd` | 2 | text 2 | 6509, 6890 | `--data-5` |
| `#dc2626` | 2 | text 2 | 5963, 6088 | `--danger-strong` |
| `#e2e8f0` | 2 | token 1 · border 1 | 128, 2635 | `--text-*` |
| `#e3f8fc` | 2 | effect 2 | 5770, 5847 | `--shadow-*`/`--glow-*` (review) |
| `#ec4899` | 2 | token 2 | 63, 133 | `--data-6` |
| `#fca5a5` | 2 | text 2 | 10744, 10758 | `--danger-soft (text)` |
| `rgba(0,0,0,0.02)` | 2 | surface 2 | 6041, 8929 | `--overlay-*` (light) |
| `rgba(0,0,0,0.025)` | 2 | surface 2 | 4101, 5911 | `--overlay-*` (light) |
| `rgba(0,0,0,0.3)` | 2 | effect 2 | 911, 3866 | `--shadow-*` |
| `rgba(0,0,0,0.30)` | 2 | effect 2 | 138, 1655 | `--shadow-*` |
| `rgba(0,0,0,0.38)` | 2 | text 2 | 6267, 8557 | `--overlay-*` (light) |
| `rgba(0,0,0,0.4)` | 2 | surface 1 · effect 1 | 4023, 5624 | `--overlay-*` (light) |
| `rgba(0,0,0,0.70)` | 2 | effect 1 · text 1 | 606, 5119 | `--shadow-*` |
| `rgba(0,0,0,0.85)` | 2 | effect 1 · text 1 | 5525, 5922 | `--shadow-*` |
| `rgba(12,17,35,1)` | 2 | effect 2 | 5237, 5689 | `--data-*`/review |
| `rgba(139,92,246,0.05)` | 2 | effect 2 | 5231, 5864 | `--data-5-soft` |
| `rgba(139,92,246,0.15)` | 2 | surface 2 | 6888, 7248 | `--data-5-soft` |
| `rgba(139,92,246,0.25)` | 2 | surface 1 · border 1 | 6898, 6910 | `--data-5-soft` |
| `rgba(15,23,42,0.03)` | 2 | surface 2 | 10760, 10850 | `--data-*`/review |
| `rgba(16,185,129,.07)` | 2 | surface 2 | 10074, 10156 | `--ok-soft` |
| `rgba(16,185,129,.35)` | 2 | border 2 | 10073, 10156 | `--ok-soft` |
| `rgba(16,185,129,0.07)` | 2 | effect 1 · surface 1 | 5973, 6256 | `--ok-soft` |
| `rgba(16,185,129,0.16)` | 2 | surface 2 | 2014, 3038 | `--ok-soft` |
| `rgba(16,185,129,0.20)` | 2 | border 2 | 5621, 6257 | `--ok-soft` |
| `rgba(16,185,129,0.25)` | 2 | effect 1 · border 1 | 577, 7051 | `--ok-soft` |
| `rgba(16,185,129,0.5)` | 2 | border 2 | 3038, 3256 | `--ok-soft` |
| `rgba(236,72,153,0.10)` | 2 | token 1 · surface 1 | 154, 8545 | `--data-6-soft` |
| `rgba(239,68,68,0.30)` | 2 | border 2 | 2162, 8461 | `--danger-soft` |
| `rgba(244,63,94,0.08)` | 2 | surface 2 | 7343, 7487 | `--data-*`/review |
| `rgba(245,158,11,0.06)` | 2 | effect 1 · surface 1 | 6565, 8023 | `--warn-soft` |
| `rgba(245,158,11,0.08)` | 2 | surface 2 | 7521, 8071 | `--warn-soft` |
| `rgba(245,158,11,0.20)` | 2 | surface 2 | 6406, 8044 | `--warn-soft` |
| `rgba(245,158,11,0.6)` | 2 | border 1 · effect 1 | 3166, 6567 | `--warn-soft` |
| `rgba(251,191,36,0.14)` | 2 | surface 2 | 4210, 9596 | `--data-*`/review |
| `rgba(251,191,36,0.25)` | 2 | border 2 | 1499, 4149 | `--data-*`/review |
| `rgba(255,107,0,0.12)` | 2 | effect 1 · surface 1 | 5525, 8707 | `--data-*`/review |
| `rgba(255,255,255,.02)` | 2 | surface 2 | 10059, 10141 | `--overlay-*` |
| `rgba(255,255,255,0.04)` | 2 | token 1 · effect 1 | 144, 5243 | `--overlay-*` |
| `rgba(255,255,255,0.08)` | 2 | token 1 · decoration 1 | 75, 6005 | `--overlay-*` |
| `rgba(255,255,255,0.10)` | 2 | token 1 · surface 1 | 147, 5378 | `--overlay-*` |
| `rgba(255,255,255,0.6)` | 2 | text 1 · border 1 | 6350, 8442 | `--overlay-*` |
| `rgba(255,255,255,0.9)` | 2 | effect 2 | 5741, 5745 | `--overlay-*` |
| `rgba(34,211,238,0.03)` | 2 | surface 1 · effect 1 | 980, 8873 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.06)` | 2 | surface 1 · effect 1 | 929, 5646 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.07)` | 2 | surface 2 | 878, 2948 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.09)` | 2 | surface 2 | 1024, 3289 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.12)` | 2 | surface 2 | 5485, 9464 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.14)` | 2 | surface 2 | 3065, 9520 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.16)` | 2 | surface 1 · decoration 1 | 2972, 3270 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.25)` | 2 | text 1 · effect 1 | 954, 5502 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.32)` | 2 | decoration 2 | 9391, 9467 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.35)` | 2 | text 1 · border 1 | 898, 910 | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.05)` | 2 | surface 2 | 1026, 8916 | `--info-soft` |
| `rgba(59,130,246,0.06)` | 2 | surface 2 | 5874, 8938 | `--info-soft` |
| `rgba(59,130,246,0.09)` | 2 | surface 2 | 1029, 8920 | `--info-soft` |
| `rgba(59,130,246,0.14)` | 2 | surface 2 | 4198, 9633 | `--info-soft` |
| `rgba(59,130,246,0.22)` | 2 | border 2 | 8542, 8592 | `--info-soft` |
| `rgba(59,130,246,0.26)` | 2 | decoration 1 · border 1 | 2694, 6178 | `--info-soft` |
| `rgba(59,130,246,0.3)` | 2 | border 2 | 1029, 1615 | `--info-soft` |
| `rgba(59,130,246,0.5)` | 2 | border 2 | 3255, 7326 | `--info-soft` |
| `rgba(6,182,212,0.03)` | 2 | surface 2 | 1757, 8864 | `--data-*`/review |
| `rgba(6,182,212,0.04)` | 2 | effect 2 | 203, 5733 | `--data-*`/review |
| `rgba(6,182,212,0.06)` | 2 | border 1 · surface 1 | 1758, 8844 | `--data-*`/review |
| `rgba(6,182,212,0.22)` | 2 | border 2 | 5848, 5858 | `--data-*`/review |
| `rgba(6,182,212,0.35)` | 2 | border 2 | 8806, 8863 | `--data-*`/review |
| `rgba(6,9,17,0.80)` | 2 | token 2 | 27, 10885 | `--data-*`/review |
| `rgba(8,12,22,1)` | 2 | effect 2 | 5507, 5689 | `--data-*`/review |
| `rgba(8,145,178,0.45)` | 2 | text 2 | 6037, 8850 | `--data-*`/review |
| `rgba(8,145,178,0.65)` | 2 | text 2 | 6034, 8849 | `--data-*`/review |
| `rgba(99,102,241,0.05)` | 2 | effect 1 · surface 1 | 5864, 6018 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.13)` | 2 | effect 2 | 5229, 5657 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.14)` | 2 | surface 2 | 4793, 4832 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.20)` | 2 | border 2 | 5242, 5617 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#032020` | 1 | effect 1 | 5642 | `--shadow-*`/`--glow-*` (review) |
| `#05231a` | 1 | text 1 | 1213 | `--text-*` (review) |
| `#052424` | 1 | effect 1 | 5443 | `--shadow-*`/`--glow-*` (review) |
| `#060a18` | 1 | effect 1 | 5696 | `--shadow-*`/`--glow-*` (review) |
| `#06110d` | 1 | token 1 | 10895 | `(review)` |
| `#07566b` | 1 | text 1 | 9531 | `--text-*` (review) |
| `#080d1e` | 1 | effect 1 | 5704 | `--shadow-*`/`--glow-*` (review) |
| `#08150f` | 1 | token 1 | 10900 | `(review)` |
| `#0891b2` | 1 | effect 1 | 8236 | `--accent-strong` |
| `#090e2a` | 1 | effect 1 | 5437 | `--shadow-*`/`--glow-*` (review) |
| `#0a0f22` | 1 | effect 1 | 5696 | `--shadow-*`/`--glow-*` (review) |
| `#0a111d` | 1 | token 1 | 10871 | `--bg-deep (brand Midnight)` |
| `#0b1a14` | 1 | token 1 | 10896 | `(review)` |
| `#0c1a3a` | 1 | effect 1 | 5437 | `--shadow-*`/`--glow-*` (review) |
| `#0d1228` | 1 | effect 1 | 5704 | `--shadow-*`/`--glow-*` (review) |
| `#0d1420` | 1 | token 1 | 10867 | `--bg-card (Midnight)` |
| `#0d1926` | 1 | surface 1 | 9513 | `--bg-card`/`--bg-raised` (review) |
| `#0f766e` | 1 | token 1 | 10903 | `(review)` |
| `#10241c` | 1 | token 1 | 10897 | `(review)` |
| `#121820` | 1 | fallback 1 | 9701 | `--bg-card` (delete fallback) |
| `#121b2b` | 1 | token 1 | 10868 | `--bg-input (Midnight)` |
| `#140d0a` | 1 | token 1 | 10910 | `(review)` |
| `#151a21` | 1 | fallback 1 | 3023 | `--bg-card` (delete fallback) |
| `#153126` | 1 | token 1 | 10898 | `(review)` |
| `#171b21` | 1 | fallback 1 | 9600 | `--surface-2` (delete fallback) |
| `#172236` | 1 | token 1 | 10869 | `--bg-input-focus (Midnight)` |
| `#180f0b` | 1 | token 1 | 10915 | `(review)` |
| `#1a1a2e` | 1 | fallback 1 | 7840 | `--bg-card` (delete fallback) |
| `#1d120e` | 1 | token 1 | 10911 | `(review)` |
| `#1e1e2e` | 1 | fallback 1 | 9049 | `--bg-card` (delete fallback) |
| `#200b0b` | 1 | surface 1 | 777 | `--bg-card`/`--bg-raised` (review) |
| `#22c55e` | 1 | fallback 1 | 10356 | `--color-green` (delete fallback) |
| `#29303a` | 1 | fallback 1 | 9699 | `--border` (delete fallback) |
| `#2a1a13` | 1 | token 1 | 10912 | `(review)` |
| `#2dd4bf` | 1 | token 1 | 10904 | `(review)` |
| `#332017` | 1 | token 1 | 10913 | `(review)` |
| `#334155` | 1 | token 1 | 3918 | `--text-strong (light)` |
| `#3730a3` | 1 | text 1 | 9030 | `--text-*` (review) |
| `#4338ca` | 1 | text 1 | 5780 | `--text-*` (review) |
| `#4c1d95` | 1 | effect 1 | 5302 | `--shadow-*`/`--glow-*` (review) |
| `#6366f1` | 1 | token 1 | 42 | `(review)` |
| `#6b7280` | 1 | text 1 | 8070 | `--text-*` (review) |
| `#6d28d9` | 1 | effect 1 | 5302 | `--data-5 (deep)` |
| `#7c8aa0` | 1 | fallback 1 | 9634 | `--text-tertiary` (delete fallback) |
| `#7c8da5` | 1 | token 1 | 129 | `--text-faint` |
| `#93b3a3` | 1 | token 1 | 10902 | `(review)` |
| `#9d174d` | 1 | text 1 | 8578 | `--text-*` (review) |
| `#a78bfa` | 1 | text 1 | 9627 | `--data-5 (tint)` |
| `#b91c1c` | 1 | text 1 | 5926 | `--danger-ink (light)` |
| `#bba99b` | 1 | token 1 | 10917 | `(review)` |
| `#be185d` | 1 | text 1 | 8546 | `--data-6 (deep)` |
| `#d7f3e6` | 1 | text 1 | 1326 | `--text-complete (light bug)` |
| `#d97706` | 1 | text 1 | 8071 | `--warn-strong` |
| `#dae3ef` | 1 | token 1 | 3904 | `(review)` |
| `#dbe4ef` | 1 | decoration 1 | 2646 | `--data-heat-0 (light)` |
| `#dff9ff` | 1 | text 1 | 9434 | `--text-*` (review) |
| `#e11d48` | 1 | text 1 | 7312 | `--text-*` (review) |
| `#e4eaf2` | 1 | token 1 | 3903 | `(review)` |
| `#e5e7eb` | 1 | fallback 1 | 9582 | `--text-primary` (delete fallback) |
| `#e5edf5` | 1 | token 1 | 10872 | `--text-primary (Midnight)` |
| `#e6f2ea` | 1 | token 1 | 10901 | `(review)` |
| `#e8ebff` | 1 | effect 1 | 5765 | `--shadow-*`/`--glow-*` (review) |
| `#eef0ff` | 1 | effect 1 | 5765 | `--shadow-*`/`--glow-*` (review) |
| `#eef2f8` | 1 | token 1 | 3907 | `(review)` |
| `#f0f4f8` | 1 | token 1 | 3901 | `(review)` |
| `#f1f3f7` | 1 | surface 1 | 4074 | `--bg-card`/`--bg-raised` (review) |
| `#f2f2f7` | 1 | fallback 1 | 10100 | `--bg-body` (delete fallback) |
| `#f5ede4` | 1 | token 1 | 10916 | `(review)` |
| `#fef2f2` | 1 | surface 1 | 8898 | `--bg-card`/`--bg-raised` (review) |
| `rgba(0,0,0,.24)` | 1 | effect 1 | 9988 | `--shadow-*` |
| `rgba(0,0,0,0.01)` | 1 | token 1 | 3924 | `--overlay-*` (light) |
| `rgba(0,0,0,0.035)` | 1 | surface 1 | 8561 | `--overlay-*` (light) |
| `rgba(0,0,0,0.11)` | 1 | border 1 | 5917 | `--overlay-*` (light) |
| `rgba(0,0,0,0.13)` | 1 | token 1 | 3929 | `--overlay-*` (light) |
| `rgba(0,0,0,0.20)` | 1 | effect 1 | 469 | `--shadow-*` |
| `rgba(0,0,0,0.60)` | 1 | text 1 | 5918 | `--overlay-*` (light) |
| `rgba(0,0,0,0.62)` | 1 | surface 1 | 3014 | `--overlay-*` (light) |
| `rgba(0,0,0,0.7)` | 1 | surface 1 | 1897 | `--overlay-*` (light) |
| `rgba(0,0,0,0.78)` | 1 | text 1 | 4063 | `--overlay-*` (light) |
| `rgba(0,0,0,0.8)` | 1 | text 1 | 7088 | `--overlay-*` (light) |
| `rgba(0,0,0,0.80)` | 1 | text 1 | 5825 | `--overlay-*` (light) |
| `rgba(0,0,0,0.88)` | 1 | text 1 | 4067 | `--overlay-*` (light) |
| `rgba(1,2,5,0.90)` | 1 | surface 1 | 660 | `--data-*`/review |
| `rgba(10,14,28,0.95)` | 1 | surface 1 | 4132 | `--data-*`/review |
| `rgba(11,16,33,1)` | 1 | effect 1 | 5507 | `--data-*`/review |
| `rgba(12,17,35,0.98)` | 1 | effect 1 | 5710 | `--data-*`/review |
| `rgba(124,58,237,0.55)` | 1 | effect 1 | 6462 | `--data-*`/review |
| `rgba(139,92,246,0.03)` | 1 | effect 1 | 5734 | `--data-5-soft` |
| `rgba(139,92,246,0.07)` | 1 | effect 1 | 5651 | `--data-5-soft` |
| `rgba(139,92,246,0.09)` | 1 | effect 1 | 5868 | `--data-5-soft` |
| `rgba(139,92,246,0.12)` | 1 | effect 1 | 6909 | `--data-5-soft` |
| `rgba(139,92,246,0.13)` | 1 | effect 1 | 5657 | `--data-5-soft` |
| `rgba(139,92,246,0.14)` | 1 | effect 1 | 6499 | `--data-5-soft` |
| `rgba(139,92,246,0.18)` | 1 | effect 1 | 7250 | `--data-5-soft` |
| `rgba(139,92,246,0.22)` | 1 | border 1 | 6500 | `--data-5-soft` |
| `rgba(139,92,246,0.3)` | 1 | border 1 | 6889 | `--data-5-soft` |
| `rgba(139,92,246,0.65)` | 1 | surface 1 | 7186 | `--data-5-soft` |
| `rgba(139,92,246,0.75)` | 1 | effect 1 | 7188 | `--data-5-soft` |
| `rgba(14,20,44,0.95)` | 1 | surface 1 | 5580 | `--data-*`/review |
| `rgba(148,163,184,.18)` | 1 | surface 1 | 11017 | `--data-8-soft` |
| `rgba(148,163,184,0.1)` | 1 | surface 1 | 2891 | `--data-8-soft` |
| `rgba(148,163,184,0.12)` | 1 | token 1 | 10877 | `--data-8-soft` |
| `rgba(148,163,184,0.13)` | 1 | token 1 | 10906 | `--data-8-soft` |
| `rgba(148,163,184,0.25)` | 1 | border 1 | 2893 | `--data-8-soft` |
| `rgba(148,163,184,0.35)` | 1 | decoration 1 | 8242 | `--data-8-soft` |
| `rgba(15,23,42,.06)` | 1 | effect 1 | 2639 | `--data-*`/review |
| `rgba(15,23,42,.08)` | 1 | effect 1 | 10100 | `--data-*`/review |
| `rgba(15,23,42,0.52)` | 1 | text 1 | 9188 | `--data-*`/review |
| `rgba(15,23,42,0.78)` | 1 | text 1 | 9191 | `--data-*`/review |
| `rgba(15,44,62,0.78)` | 1 | effect 1 | 9362 | `--data-*`/review |
| `rgba(16,185,129,0.04)` | 1 | surface 1 | 1316 | `--ok-soft` |
| `rgba(16,185,129,0.06)` | 1 | token 1 | 67 | `--ok-soft` |
| `rgba(16,185,129,0.26)` | 1 | border 1 | 1192 | `--ok-soft` |
| `rgba(16,185,129,0.30)` | 1 | surface 1 | 4480 | `--ok-soft` |
| `rgba(16,185,129,0.40)` | 1 | border 1 | 4469 | `--ok-soft` |
| `rgba(16,185,129,0.55)` | 1 | effect 1 | 3679 | `--ok-soft` |
| `rgba(16,185,129,0.6)` | 1 | effect 1 | 3708 | `--ok-soft` |
| `rgba(16,185,129,0.70)` | 1 | text 1 | 6133 | `--ok-soft` |
| `rgba(16,185,129,0.80)` | 1 | text 1 | 6196 | `--ok-soft` |
| `rgba(167,139,250,0.12)` | 1 | surface 1 | 9627 | `--data-*`/review |
| `rgba(180,115,0,0.75)` | 1 | text 1 | 5942 | `--data-*`/review |
| `rgba(185,28,28,0.35)` | 1 | border 1 | 5927 | `--data-*`/review |
| `rgba(20,13,10,0.86)` | 1 | token 1 | 10914 | `--data-*`/review |
| `rgba(20,25,40,0.96)` | 1 | surface 1 | 4128 | `--data-*`/review |
| `rgba(220,38,38,0.06)` | 1 | surface 1 | 6093 | `--data-*`/review |
| `rgba(220,38,38,0.30)` | 1 | border 1 | 6089 | `--data-*`/review |
| `rgba(224,247,250,0.95)` | 1 | effect 1 | 9530 | `--data-*`/review |
| `rgba(234,242,249,0.98)` | 1 | effect 1 | 9530 | `--data-*`/review |
| `rgba(236,72,153,0.12)` | 1 | surface 1 | 8578 | `--data-6-soft` |
| `rgba(236,72,153,0.22)` | 1 | border 1 | 8547 | `--data-6-soft` |
| `rgba(239,68,68,.28)` | 1 | border 1 | 10162 | `--danger-soft` |
| `rgba(239,68,68,.3)` | 1 | border 1 | 11076 | `--danger-soft` |
| `rgba(239,68,68,0.08)` | 1 | surface 1 | 10757 | `--danger-soft` |
| `rgba(239,68,68,0.1)` | 1 | surface 1 | 9495 | `--danger-soft` |
| `rgba(239,68,68,0.14)` | 1 | surface 1 | 8460 | `--danger-soft` |
| `rgba(239,68,68,0.15)` | 1 | surface 1 | 7711 | `--danger-soft` |
| `rgba(239,68,68,0.16)` | 1 | surface 1 | 10742 | `--danger-soft` |
| `rgba(239,68,68,0.2)` | 1 | surface 1 | 3234 | `--danger-soft` |
| `rgba(239,68,68,0.20)` | 1 | border 1 | 8899 | `--danger-soft` |
| `rgba(239,68,68,0.22)` | 1 | border 1 | 778 | `--danger-soft` |
| `rgba(239,68,68,0.28)` | 1 | effect 1 | 8455 | `--danger-soft` |
| `rgba(239,68,68,0.3)` | 1 | border 1 | 7713 | `--danger-soft` |
| `rgba(239,68,68,0.4)` | 1 | border 1 | 7582 | `--danger-soft` |
| `rgba(239,68,68,0.40)` | 1 | border 1 | 5962 | `--danger-soft` |
| `rgba(239,68,68,0.45)` | 1 | border 1 | 10743 | `--danger-soft` |
| `rgba(239,68,68,0.55)` | 1 | border 1 | 10792 | `--danger-soft` |
| `rgba(239,68,68,0.65)` | 1 | border 1 | 3072 | `--danger-soft` |
| `rgba(239,68,68,0.85)` | 1 | text 1 | 3656 | `--danger-soft` |
| `rgba(244,63,94,0.06)` | 1 | surface 1 | 7607 | `--data-*`/review |
| `rgba(244,63,94,0.12)` | 1 | surface 1 | 7287 | `--data-*`/review |
| `rgba(244,63,94,0.2)` | 1 | border 1 | 7607 | `--data-*`/review |
| `rgba(244,63,94,0.25)` | 1 | border 1 | 7344 | `--data-*`/review |
| `rgba(244,63,94,0.3)` | 1 | border 1 | 7395 | `--data-*`/review |
| `rgba(244,63,94,0.35)` | 1 | border 1 | 7486 | `--data-*`/review |
| `rgba(245,158,11,0.05)` | 1 | surface 1 | 8073 | `--warn-soft` |
| `rgba(245,158,11,0.07)` | 1 | surface 1 | 5947 | `--warn-soft` |
| `rgba(245,158,11,0.14)` | 1 | surface 1 | 4217 | `--warn-soft` |
| `rgba(245,158,11,0.16)` | 1 | surface 1 | 8072 | `--warn-soft` |
| `rgba(245,158,11,0.18)` | 1 | surface 1 | 3257 | `--warn-soft` |
| `rgba(245,158,11,0.2)` | 1 | effect 1 | 3167 | `--warn-soft` |
| `rgba(245,158,11,0.22)` | 1 | decoration 1 | 2722 | `--warn-soft` |
| `rgba(245,158,11,0.30)` | 1 | border 1 | 4174 | `--warn-soft` |
| `rgba(245,158,11,0.34)` | 1 | border 1 | 4218 | `--warn-soft` |
| `rgba(245,158,11,0.5)` | 1 | border 1 | 3257 | `--warn-soft` |
| `rgba(245,158,11,0.55)` | 1 | border 1 | 6566 | `--warn-soft` |
| `rgba(245,237,228,0.12)` | 1 | token 1 | 10921 | `--data-*`/review |
| `rgba(247,249,252,0.94)` | 1 | surface 1 | 9529 | `--data-*`/review |
| `rgba(249,115,22,0.08)` | 1 | surface 1 | 1514 | `--data-*`/review |
| `rgba(249,115,22,0.12)` | 1 | surface 1 | 2896 | `--data-*`/review |
| `rgba(249,115,22,0.25)` | 1 | border 1 | 1508 | `--data-*`/review |
| `rgba(249,115,22,0.35)` | 1 | border 1 | 2898 | `--data-*`/review |
| `rgba(249,115,22,0.72)` | 1 | text 1 | 1509 | `--data-*`/review |
| `rgba(249,115,22,0.78)` | 1 | text 1 | 1497 | `--data-*`/review |
| `rgba(251,191,36,0.08)` | 1 | surface 1 | 1505 | `--data-*`/review |
| `rgba(251,191,36,0.18)` | 1 | effect 1 | 4139 | `--data-*`/review |
| `rgba(251,191,36,0.34)` | 1 | border 1 | 4211 | `--data-*`/review |
| `rgba(251,191,36,0.35)` | 1 | decoration 1 | 9596 | `--data-*`/review |
| `rgba(251,191,36,0.40)` | 1 | effect 1 | 4170 | `--data-*`/review |
| `rgba(251,191,36,0.6)` | 1 | text 1 | 1500 | `--data-*`/review |
| `rgba(251,191,36,0.72)` | 1 | text 1 | 1496 | `--data-*`/review |
| `rgba(255,107,0,0.1)` | 1 | effect 1 | 5525 | `--data-*`/review |
| `rgba(255,107,0,0.55)` | 1 | border 1 | 5524 | `--data-*`/review |
| `rgba(255,122,26,.28)` | 1 | surface 1 | 2629 | `--data-*`/review |
| `rgba(255,122,26,.5)` | 1 | surface 1 | 2630 | `--data-*`/review |
| `rgba(255,122,26,.74)` | 1 | surface 1 | 2631 | `--data-*`/review |
| `rgba(255,255,255,.05)` | 1 | surface 1 | 11073 | `--overlay-*` |
| `rgba(255,255,255,.1)` | 1 | border 1 | 10213 | `--overlay-*` |
| `rgba(255,255,255,.10)` | 1 | border 1 | 10397 | `--overlay-*` |
| `rgba(255,255,255,.14)` | 1 | surface 1 | 10331 | `--overlay-*` |
| `rgba(255,255,255,.18)` | 1 | border 1 | 11096 | `--overlay-*` |
| `rgba(255,255,255,0.01)` | 1 | token 1 | 72 | `--overlay-*` |
| `rgba(255,255,255,0.02)` | 1 | surface 1 | 2132 | `--overlay-*` |
| `rgba(255,255,255,0.035)` | 1 | effect 1 | 5239 | `--overlay-*` |
| `rgba(255,255,255,0.045)` | 1 | surface 1 | 3506 | `--overlay-*` |
| `rgba(255,255,255,0.14)` | 1 | token 1 | 148 | `--overlay-*` |
| `rgba(255,255,255,0.18)` | 1 | token 1 | 77 | `--overlay-*` |
| `rgba(255,255,255,0.20)` | 1 | border 1 | 549 | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 1 | border 1 | 553 | `--overlay-*` |
| `rgba(255,255,255,0.5)` | 1 | surface 1 | 3856 | `--overlay-*` |
| `rgba(255,255,255,0.55)` | 1 | effect 1 | 8320 | `--overlay-*` |
| `rgba(255,255,255,0.7)` | 1 | surface 1 | 5857 | `--overlay-*` |
| `rgba(255,255,255,0.75)` | 1 | border 1 | 8324 | `--overlay-*` |
| `rgba(255,255,255,0.85)` | 1 | surface 1 | 8814 | `--overlay-*` |
| `rgba(255,255,255,0.92)` | 1 | token 1 | 3905 | `--overlay-*` |
| `rgba(255,255,255,0.94)` | 1 | surface 1 | 5805 | `--overlay-*` |
| `rgba(29,78,216,0.5)` | 1 | effect 1 | 8145 | `--data-*`/review |
| `rgba(3,5,10,0.55)` | 1 | surface 1 | 796 | `--data-*`/review |
| `rgba(34,211,238,0.025)` | 1 | surface 1 | 861 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.04)` | 1 | effect 1 | 5635 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.05)` | 1 | surface 1 | 1021 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.10)` | 1 | effect 1 | 5635 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.13)` | 1 | surface 1 | 9436 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.15)` | 1 | effect 1 | 469 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.20)` | 1 | border 1 | 5444 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.24)` | 1 | border 1 | 9397 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.28)` | 1 | border 1 | 5486 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.34)` | 1 | border 1 | 9511 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.5)` | 1 | border 1 | 3064 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.55)` | 1 | effect 1 | 8271 | `--accent-soft`/`--border-focus` |
| `rgba(4,6,14,0.94)` | 1 | surface 1 | 5523 | `--data-*`/review |
| `rgba(4,7,12,0.94)` | 1 | surface 1 | 9693 | `--data-*`/review |
| `rgba(5,150,105,0.07)` | 1 | surface 1 | 4897 | `--data-*`/review |
| `rgba(5,150,105,0.32)` | 1 | border 1 | 4898 | `--data-*`/review |
| `rgba(5,150,105,0.80)` | 1 | text 1 | 6253 | `--data-*`/review |
| `rgba(5,150,105,0.85)` | 1 | text 1 | 6258 | `--data-*`/review |
| `rgba(52,211,153,0.08)` | 1 | surface 1 | 4622 | `--data-*`/review |
| `rgba(52,211,153,0.14)` | 1 | surface 1 | 4637 | `--data-*`/review |
| `rgba(52,211,153,0.42)` | 1 | border 1 | 4621 | `--data-*`/review |
| `rgba(59,130,246,.35)` | 1 | border 1 | 11086 | `--info-soft` |
| `rgba(59,130,246,0.04)` | 1 | surface 1 | 6058 | `--info-soft` |
| `rgba(59,130,246,0.07)` | 1 | surface 1 | 6082 | `--info-soft` |
| `rgba(59,130,246,0.1)` | 1 | surface 1 | 2704 | `--info-soft` |
| `rgba(59,130,246,0.13)` | 1 | surface 1 | 9461 | `--info-soft` |
| `rgba(59,130,246,0.16)` | 1 | border 1 | 8917 | `--info-soft` |
| `rgba(59,130,246,0.2)` | 1 | surface 1 | 2710 | `--info-soft` |
| `rgba(59,130,246,0.20)` | 1 | border 1 | 5680 | `--info-soft` |
| `rgba(59,130,246,0.32)` | 1 | border 1 | 4199 | `--info-soft` |
| `rgba(59,130,246,0.35)` | 1 | border 1 | 5993 | `--info-soft` |
| `rgba(59,130,246,0.4)` | 1 | surface 1 | 3198 | `--info-soft` |
| `rgba(59,130,246,0.55)` | 1 | effect 1 | 8266 | `--info-soft` |
| `rgba(59,130,246,0.6)` | 1 | decoration 1 | 8226 | `--info-soft` |
| `rgba(6,17,13,0.84)` | 1 | token 1 | 10899 | `--data-*`/review |
| `rgba(6,182,212,0.05)` | 1 | surface 1 | 8909 | `--data-*`/review |
| `rgba(6,182,212,0.07)` | 1 | effect 1 | 5230 | `--data-*`/review |
| `rgba(6,182,212,0.08)` | 1 | effect 1 | 5850 | `--data-*`/review |
| `rgba(6,182,212,0.09)` | 1 | surface 1 | 8913 | `--data-*`/review |
| `rgba(6,182,212,0.10)` | 1 | surface 1 | 5788 | `--data-*`/review |
| `rgba(6,182,212,0.15)` | 1 | surface 1 | 7249 | `--data-*`/review |
| `rgba(6,182,212,0.25)` | 1 | border 1 | 5789 | `--data-*`/review |
| `rgba(6,182,212,0.30)` | 1 | border 1 | 8815 | `--data-*`/review |
| `rgba(6,182,212,0.55)` | 1 | border 1 | 5849 | `--data-*`/review |
| `rgba(6,182,212,0.65)` | 1 | surface 1 | 7187 | `--data-*`/review |
| `rgba(6,182,212,0.75)` | 1 | effect 1 | 7188 | `--data-*`/review |
| `rgba(7,10,18,0.82)` | 1 | token 1 | 10870 | `--data-*`/review |
| `rgba(79,70,229,0.06)` | 1 | effect 1 | 6499 | `--data-*`/review |
| `rgba(79,70,229,0.75)` | 1 | text 1 | 5760 | `--data-*`/review |
| `rgba(8,12,22,0.98)` | 1 | effect 1 | 5710 | `--data-*`/review |
| `rgba(8,145,178,0.02)` | 1 | surface 1 | 6047 | `--data-*`/review |
| `rgba(8,145,178,0.04)` | 1 | surface 1 | 6052 | `--data-*`/review |
| `rgba(8,145,178,0.05)` | 1 | surface 1 | 6031 | `--data-*`/review |
| `rgba(8,145,178,0.08)` | 1 | surface 1 | 6055 | `--data-*`/review |
| `rgba(8,145,178,0.10)` | 1 | effect 1 | 5772 | `--data-*`/review |
| `rgba(8,145,178,0.18)` | 1 | border 1 | 6053 | `--data-*`/review |
| `rgba(8,145,178,0.20)` | 1 | border 1 | 6032 | `--data-*`/review |
| `rgba(8,145,178,0.25)` | 1 | text 1 | 6036 | `--data-*`/review |
| `rgba(8,145,178,0.26)` | 1 | border 1 | 5771 | `--data-*`/review |
| `rgba(8,145,178,0.28)` | 1 | border 1 | 6055 | `--data-*`/review |
| `rgba(8,145,178,0.30)` | 1 | border 1 | 6046 | `--data-*`/review |
| `rgba(8,20,34,0.96)` | 1 | effect 1 | 9362 | `--data-*`/review |
| `rgba(9,14,26,0.95)` | 1 | surface 1 | 5569 | `--data-*`/review |
| `rgba(9,14,26,1)` | 1 | effect 1 | 5237 | `--data-*`/review |
| `rgba(99,102,241,0.03)` | 1 | surface 1 | 8932 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.04)` | 1 | surface 1 | 5630 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.3)` | 1 | effect 1 | 9020 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.42)` | 1 | effect 1 | 5586 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.7)` | 1 | border 1 | 9018 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.75)` | 1 | text 1 | 5351 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(var(--brand-cobalt-rgb),0.07)` | 1 | surface 1 | 4894 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.10)` | 1 | surface 1 | 4614 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.18)` | 1 | surface 1 | 4632 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.48)` | 1 | border 1 | 4612 | `--border-*` (review) |
| `rgba(var(--zone-color),0.15)` | 1 | surface 1 | 7984 | `--bg-card`/`--bg-raised` (review) |
| `white` | 1 | text 1 | 5409 | `--text-*` (review) |

### `css/programs.css` — 345 literals, 171 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ffffff` | 20 | text 14 · surface 6 | 356, 380, 439, 806, 816, 821, 1120, 1142… | `--text-white/--accent-ink` |
| `#0f172a` | 11 | text 11 | 2361, 2396, 2411, 2419, 2841, 2853, 3281, 3292… | `--text-primary (light)/chart stroke` |
| `#f1f5f9` | 11 | text 11 | 183, 476, 548, 606, 740, 903, 1195, 1329… | `--text-*` |
| `rgba(0,0,0,0.02)` | 11 | surface 11 | 2242, 2247, 2436, 2858, 2870, 3284, 3295, 3318… | `--overlay-*` (light) |
| `#2563eb` | 9 | text 4 · surface 2 · fallback 2 · effect 1 | 1297, 2351, 2431, 3291, 3293, 3321, 3750, 4129… | `--info-strong` |
| `#60a5fa` | 8 | text 7 · surface 1 | 172, 1089, 2137, 3125, 3176, 3267, 4173, 4193 | `--info (tint)` |
| `rgba(0,0,0,0.08)` | 7 | border 6 · effect 1 | 2248, 2358, 2385, 3273, 3296, 3420, 3746 | `--overlay-*` (light) |
| `#bfdbfe` | 6 | text 6 | 113, 297, 986, 1030, 2195, 3216 | `--info` |
| `rgba(0,0,0,0.06)` | 6 | border 4 · effect 2 | 2242, 2327, 2332, 3319, 3404, 4209 | `--overlay-*` (light) |
| `rgba(0,0,0,0.07)` | 6 | border 5 · effect 1 | 2386, 2838, 2859, 2871, 3285, 3410 | `--overlay-*` (light) |
| `#22d3ee` | 5 | fallback 5 | 617, 669, 698, 699, 710 | `--color-cyan` (delete fallback) |
| `rgba(0,0,0,0.04)` | 5 | surface 5 | 2341, 2424, 2846, 3419, 4010 | `--overlay-*` (light) |
| `rgba(0,0,0,0.05)` | 5 | border 3 · effect 1 · surface 1 | 2253, 2258, 3274, 3300, 3305 | `--overlay-*` (light) |
| `rgba(37,99,235,0.5)` | 5 | border 5 | 26, 295, 1675, 3215, 3972 | `--data-*`/review |
| `#0d1020` | 4 | surface 4 | 542, 597, 730, 1167 | `--bg-card (near-dup)` |
| `#10b981` | 4 | text 4 | 1544, 1592, 4172, 4192 | `--ok` |
| `#1d4ed8` | 4 | text 3 · effect 1 | 1297, 2368, 2370, 2375 | `--info-strong` |
| `#f59e0b` | 4 | text 4 | 1518, 1550, 1593, 4158 | `--warn` |
| `rgba(0,0,0,0.60)` | 4 | text 4 | 2426, 2860, 3277, 3418 | `--overlay-*` (light) |
| `rgba(37,99,235,0.12)` | 4 | surface 3 · effect 1 | 173, 296, 984, 4082 | `--data-*`/review |
| `rgba(37,99,235,0.15)` | 4 | surface 2 · effect 2 | 1027, 1090, 3217, 4078 | `--data-*`/review |
| `rgba(37,99,235,0.3)` | 4 | border 4 | 985, 1028, 1091, 4015 | `--data-*`/review |
| `#0e7490` | 3 | text 3 | 2403, 2663, 3431 | `--accent-strong (styles Midnight)` |
| `#f8fafc` | 3 | surface 2 · decoration 1 | 2464, 2482, 2837 | `--text-primary (Slate)/--text-inverse` |
| `rgba(0,0,0,0.10)` | 3 | border 2 · decoration 1 | 211, 2425, 4009 | `--overlay-*` (light) |
| `rgba(0,0,0,0.45)` | 3 | effect 2 · surface 1 | 2900, 3910, 4036 | `--shadow-*` |
| `rgba(16,185,129,0.12)` | 3 | surface 3 | 1380, 1546, 3933 | `--ok-soft` |
| `rgba(16,185,129,0.35)` | 3 | border 1 · text 1 · decoration 1 | 1545, 4172, 4192 | `--ok-soft` |
| `rgba(255,255,255,0.14)` | 3 | border 2 · surface 1 | 2818, 3637, 3663 | `--overlay-*` |
| `rgba(37,99,235,0.10)` | 3 | surface 3 | 2371, 2376, 4014 | `--data-*`/review |
| `rgba(37,99,235,0.25)` | 3 | surface 2 · border 1 | 174, 1040, 3971 | `--data-*`/review |
| `#94a3b8` | 2 | fallback 2 | 4137, 4156 | `--text-muted` (delete fallback) |
| `#9aa9bd` | 2 | text 2 | 2479, 2485 | `--text-*` (review) |
| `#b9c4d4` | 2 | text 2 | 2497, 2502 | `--text-*` (review) |
| `#cbd5e1` | 2 | fallback 2 | 4124, 4149 | `--text-secondary` (delete fallback) |
| `#dc2626` | 2 | text 2 | 2239, 3426 | `--danger-strong` |
| `#f87171` | 2 | text 2 | 1878, 2174 | `--text-*` (review) |
| `rgba(0,0,0,0.01)` | 2 | surface 2 | 2252, 2258 | `--overlay-*` (light) |
| `rgba(0,0,0,0.03)` | 2 | surface 2 | 2257, 3278 | `--overlay-*` (light) |
| `rgba(0,0,0,0.12)` | 2 | border 2 | 2326, 2340 | `--overlay-*` (light) |
| `rgba(0,0,0,0.14)` | 2 | border 2 | 2437, 2847 | `--overlay-*` (light) |
| `rgba(0,0,0,0.20)` | 2 | border 1 · surface 1 | 2345, 3455 | `--overlay-*` (light) |
| `rgba(0,0,0,0.30)` | 2 | text 2 | 2335, 3449 | `--overlay-*` (light) |
| `rgba(0,0,0,0.35)` | 2 | text 2 | 2257, 2865 | `--overlay-*` (light) |
| `rgba(0,0,0,0.5)` | 2 | effect 2 | 1112, 2819 | `--shadow-*` |
| `rgba(0,0,0,0.55)` | 2 | text 2 | 2342, 2848 | `--overlay-*` (light) |
| `rgba(0,0,0,0.70)` | 2 | text 2 | 2246, 3301 | `--overlay-*` (light) |
| `rgba(0,0,0,0.75)` | 2 | effect 1 · text 1 | 349, 2251 | `--shadow-*` |
| `rgba(16,185,129,0.15)` | 2 | surface 2 | 3980, 4002 | `--ok-soft` |
| `rgba(16,185,129,0.25)` | 2 | surface 1 · border 1 | 3939, 4092 | `--ok-soft` |
| `rgba(16,185,129,0.3)` | 2 | border 2 | 3981, 3993 | `--ok-soft` |
| `rgba(239,68,68,0.06)` | 2 | surface 2 | 2164, 3425 | `--danger-soft` |
| `rgba(255,255,255,0.08)` | 2 | decoration 2 | 210, 2827 | `--overlay-*` |
| `rgba(34,211,238,0.08)` | 2 | surface 2 | 1883, 3888 | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.18)` | 2 | surface 2 | 111, 2380 | `--data-*`/review |
| `rgba(37,99,235,0.2)` | 2 | border 1 · surface 1 | 137, 3214 | `--data-*`/review |
| `rgba(37,99,235,0.35)` | 2 | border 2 | 3108, 3892 | `--data-*`/review |
| `rgba(99,102,241,0.10)` | 2 | effect 1 · surface 1 | 2332, 2349 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.12)` | 2 | surface 1 · effect 1 | 3308, 3311 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.18)` | 2 | border 1 · effect 1 | 2357, 4069 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.28)` | 2 | border 2 | 2430, 3289 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.35)` | 2 | border 2 | 2350, 2406 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#000000` | 1 | text 1 | 811 | `--text-*` (review) |
| `#04121a` | 1 | text 1 | 4280 | `--accent-ink` |
| `#059669` | 1 | effect 1 | 4005 | `--ok-strong` |
| `#0b101b` | 1 | effect 1 | 2455 | `--shadow-*`/`--glow-*` (review) |
| `#0d0f1a` | 1 | surface 1 | 138 | `--bg-card`/`--bg-raised` (review) |
| `#0d1625` | 1 | effect 1 | 2766 | `--shadow-*`/`--glow-*` (review) |
| `#0e1623` | 1 | surface 1 | 18 | `--bg-card`/`--bg-raised` (review) |
| `#101929` | 1 | effect 1 | 2455 | `--shadow-*`/`--glow-*` (review) |
| `#111b2d` | 1 | surface 1 | 27 | `--bg-card`/`--bg-raised` (review) |
| `#155e75` | 1 | text 1 | 3627 | `--accent` |
| `#17243a` | 1 | effect 1 | 2766 | `--shadow-*`/`--glow-*` (review) |
| `#1b2130` | 1 | fallback 1 | 2818 | `--bg-card` (delete fallback) |
| `#4338ca` | 1 | text 1 | 3310 | `--text-*` (review) |
| `#5b21b6` | 1 | text 1 | 3694 | `--text-*` (review) |
| `#64748b` | 1 | fallback 1 | 4199 | `--phase-color` (delete fallback) |
| `#aebbcf` | 1 | surface 1 | 2489 | `--bg-card`/`--bg-raised` (review) |
| `#ef4444` | 1 | fallback 1 | 2829 | `--accent-red` (delete fallback) |
| `#f97316` | 1 | text 1 | 1981 | `--data-7/--brand-today` |
| `rgba(0,0,0,.24)` | 1 | effect 1 | 2456 | `--shadow-*` |
| `rgba(0,0,0,0.22)` | 1 | text 1 | 3304 | `--overlay-*` (light) |
| `rgba(0,0,0,0.28)` | 1 | effect 1 | 782 | `--shadow-*` |
| `rgba(0,0,0,0.3)` | 1 | effect 1 | 358 | `--shadow-*` |
| `rgba(0,0,0,0.4)` | 1 | surface 1 | 831 | `--overlay-*` (light) |
| `rgba(0,0,0,0.40)` | 1 | text 1 | 2400 | `--overlay-*` (light) |
| `rgba(0,0,0,0.42)` | 1 | text 1 | 3297 | `--overlay-*` (light) |
| `rgba(0,0,0,0.48)` | 1 | text 1 | 2242 | `--overlay-*` (light) |
| `rgba(0,0,0,0.50)` | 1 | effect 1 | 4052 | `--shadow-*` |
| `rgba(0,0,0,0.6)` | 1 | text 1 | 4011 | `--overlay-*` (light) |
| `rgba(0,0,0,0.80)` | 1 | text 1 | 2346 | `--overlay-*` (light) |
| `rgba(109,40,217,0.05)` | 1 | surface 1 | 2241 | `--data-*`/review |
| `rgba(109,40,217,0.10)` | 1 | border 1 | 2241 | `--data-*`/review |
| `rgba(124,58,237,0.06)` | 1 | surface 1 | 2184 | `--data-*`/review |
| `rgba(124,58,237,0.10)` | 1 | surface 1 | 2136 | `--data-*`/review |
| `rgba(124,58,237,0.12)` | 1 | border 1 | 2186 | `--data-*`/review |
| `rgba(124,58,237,0.2)` | 1 | effect 1 | 1311 | `--data-*`/review |
| `rgba(124,58,237,0.20)` | 1 | border 1 | 2138 | `--data-*`/review |
| `rgba(124,58,237,0.28)` | 1 | surface 1 | 2194 | `--data-*`/review |
| `rgba(124,58,237,0.3)` | 1 | effect 1 | 1306 | `--data-*`/review |
| `rgba(124,58,237,0.9)` | 1 | surface 1 | 820 | `--data-*`/review |
| `rgba(14,116,144,0.08)` | 1 | surface 1 | 3626 | `--data-*`/review |
| `rgba(14,116,144,0.35)` | 1 | border 1 | 3625 | `--data-*`/review |
| `rgba(148,163,184,.16)` | 1 | decoration 1 | 2488 | `--data-8-soft` |
| `rgba(148,163,184,.2)` | 1 | decoration 1 | 2482 | `--data-8-soft` |
| `rgba(148,163,184,0.14)` | 1 | surface 1 | 3503 | `--data-8-soft` |
| `rgba(15,23,42,.1)` | 1 | border 1 | 3394 | `--data-*`/review |
| `rgba(16,185,129,0.07)` | 1 | surface 1 | 4091 | `--ok-soft` |
| `rgba(16,185,129,0.08)` | 1 | surface 1 | 3994 | `--ok-soft` |
| `rgba(16,185,129,0.1)` | 1 | surface 1 | 2302 | `--ok-soft` |
| `rgba(16,185,129,0.14)` | 1 | surface 1 | 4096 | `--ok-soft` |
| `rgba(16,185,129,0.2)` | 1 | border 1 | 2303 | `--ok-soft` |
| `rgba(16,185,129,0.4)` | 1 | border 1 | 3941 | `--ok-soft` |
| `rgba(16,185,129,0.9)` | 1 | surface 1 | 815 | `--ok-soft` |
| `rgba(180,110,0,0.85)` | 1 | text 1 | 3437 | `--data-*`/review |
| `rgba(22,163,74,0.10)` | 1 | effect 1 | 3315 | `--data-*`/review |
| `rgba(22,163,74,0.45)` | 1 | border 1 | 3314 | `--data-*`/review |
| `rgba(220,38,38,0.05)` | 1 | surface 1 | 2240 | `--data-*`/review |
| `rgba(220,38,38,0.10)` | 1 | border 1 | 2240 | `--data-*`/review |
| `rgba(239,68,68,0.08)` | 1 | surface 1 | 1877 | `--danger-soft` |
| `rgba(239,68,68,0.10)` | 1 | border 1 | 2166 | `--danger-soft` |
| `rgba(239,68,68,0.15)` | 1 | border 1 | 1879 | `--danger-soft` |
| `rgba(239,68,68,0.18)` | 1 | border 1 | 3427 | `--danger-soft` |
| `rgba(244,247,251,.94)` | 1 | surface 1 | 2767 | `--data-*`/review |
| `rgba(245,158,11,0.05)` | 1 | surface 1 | 3435 | `--warn-soft` |
| `rgba(245,158,11,0.06)` | 1 | surface 1 | 2084 | `--warn-soft` |
| `rgba(245,158,11,0.1)` | 1 | surface 1 | 1520 | `--warn-soft` |
| `rgba(245,158,11,0.12)` | 1 | surface 1 | 1552 | `--warn-soft` |
| `rgba(245,158,11,0.15)` | 1 | border 1 | 2085 | `--warn-soft` |
| `rgba(245,158,11,0.20)` | 1 | border 1 | 3436 | `--warn-soft` |
| `rgba(245,158,11,0.35)` | 1 | border 1 | 1551 | `--warn-soft` |
| `rgba(245,158,11,0.4)` | 1 | border 1 | 1519 | `--warn-soft` |
| `rgba(245,158,11,0.85)` | 1 | text 1 | 2083 | `--warn-soft` |
| `rgba(245,158,11,0.9)` | 1 | surface 1 | 810 | `--warn-soft` |
| `rgba(255,215,0,0.75)` | 1 | text 1 | 2987 | `--data-*`/review |
| `rgba(255,255,255,.92)` | 1 | surface 1 | 3393 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 1 | surface 1 | 3664 | `--overlay-*` |
| `rgba(255,255,255,0.3)` | 1 | surface 1 | 431 | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 1 | text 1 | 3444 | `--overlay-*` |
| `rgba(255,255,255,0.9)` | 1 | text 1 | 780 | `--overlay-*` |
| `rgba(255,255,255,0.90)` | 1 | text 1 | 3456 | `--overlay-*` |
| `rgba(255,255,255,0.94)` | 1 | text 1 | 632 | `--overlay-*` |
| `rgba(34,197,94,0.12)` | 1 | effect 1 | 3222 | `--data-*`/review |
| `rgba(34,197,94,0.5)` | 1 | border 1 | 3221 | `--data-*`/review |
| `rgba(34,211,238,0.06)` | 1 | surface 1 | 3430 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.15)` | 1 | border 1 | 1885 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.18)` | 1 | border 1 | 3432 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.45)` | 1 | border 1 | 3887 | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.06)` | 1 | surface 1 | 3109 | `--data-*`/review |
| `rgba(37,99,235,0.07)` | 1 | surface 1 | 3893 | `--data-*`/review |
| `rgba(37,99,235,0.22)` | 1 | surface 1 | 304 | `--data-*`/review |
| `rgba(37,99,235,0.30)` | 1 | border 1 | 2372 | `--data-*`/review |
| `rgba(37,99,235,0.4)` | 1 | border 1 | 763 | `--data-*`/review |
| `rgba(37,99,235,0.40)` | 1 | border 1 | 2377 | `--data-*`/review |
| `rgba(37,99,235,0.45)` | 1 | border 1 | 112 | `--data-*`/review |
| `rgba(37,99,235,0.7)` | 1 | text 1 | 1408 | `--data-*`/review |
| `rgba(37,99,235,0.8)` | 1 | text 1 | 490 | `--data-*`/review |
| `rgba(37,99,235,0.85)` | 1 | surface 1 | 3926 | `--data-*`/review |
| `rgba(37,99,235,0.9)` | 1 | surface 1 | 805 | `--data-*`/review |
| `rgba(5,10,20,.62)` | 1 | decoration 1 | 2482 | `--data-*`/review |
| `rgba(59,130,246,0.4)` | 1 | decoration 1 | 4193 | `--info-soft` |
| `rgba(59,130,246,0.6)` | 1 | border 1 | 4183 | `--info-soft` |
| `rgba(8,15,26,.66)` | 1 | surface 1 | 2489 | `--data-*`/review |
| `rgba(91,33,182,0.09)` | 1 | surface 1 | 3693 | `--data-*`/review |
| `rgba(91,33,182,0.4)` | 1 | border 1 | 3692 | `--data-*`/review |
| `rgba(99,102,241,0.06)` | 1 | surface 1 | 3288 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.09)` | 1 | surface 1 | 2429 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.25)` | 1 | effect 1 | 4065 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.40)` | 1 | border 1 | 3309 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.45)` | 1 | border 1 | 2331 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.80)` | 1 | text 1 | 2414 | `--accent-soft`/`--border-focus` (legacy indigo) |

### `css/analytics.css` — 231 literals, 132 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 19 | fallback 19 | 12, 18, 20, 22, 1387, 1446, 1476, 1498… | `--text-muted` (delete fallback) |
| `#f8fafc` | 10 | fallback 9 · effect 1 | 19, 1240, 1382, 1409, 1572, 1719, 1725, 1727… | `--text-inverse` (delete fallback) |
| `rgba(0,0,0,0.07)` | 8 | border 4 · effect 3 · decoration 1 | 816, 835, 874, 899, 1241, 1242, 1263, 1709 | `--overlay-*` (light) |
| `rgba(255,255,255,0.08)` | 8 | border 5 · surface 2 · decoration 1 | 1407, 1478, 1507, 1519, 1543, 1570, 1729, 1738 | `--overlay-*` |
| `rgba(0,0,0,0.08)` | 7 | border 6 · decoration 1 | 822, 867, 1130, 1293, 1327, 1460, 1684 | `--overlay-*` (light) |
| `rgba(255,255,255,0.04)` | 6 | surface 5 · effect 1 | 1406, 1477, 1509, 1529, 1545, 1569 | `--overlay-*` |
| `rgba(255,255,255,0.07)` | 5 | border 2 · surface 2 · effect 1 | 750, 913, 1226, 1415, 1578 | `--overlay-*` |
| `#10b981` | 4 | fallback 3 · effect 1 | 1520, 1724, 1730, 1732 | `--color-green` (delete fallback) |
| `#22d3ee` | 4 | fallback 3 · decoration 1 | 1490, 1514, 1550, 1687 | `--color-cyan` (delete fallback) |
| `#ffffff` | 4 | surface 2 · text 1 · effect 1 | 15, 327, 1240, 1292 | `--text-white/--accent-ink` |
| `rgba(0,0,0,0.02)` | 4 | surface 4 | 1262, 1459, 1683, 1702 | `--overlay-*` (light) |
| `#3b82f6` | 3 | fallback 2 · effect 1 | 15, 1720, 1730 | `--color-blue` (delete fallback) |
| `rgba(0,0,0,0.015)` | 3 | surface 2 · effect 1 | 1220, 1246, 1342 | `--overlay-*` (light) |
| `rgba(0,0,0,0.06)` | 3 | border 2 · effect 1 | 923, 924, 1294 | `--overlay-*` (light) |
| `#090e1a` | 2 | effect 2 | 912, 1225 | `--bg-card (Slate)` |
| `#0e1525` | 2 | effect 2 | 912, 1225 | `--shadow-*`/`--glow-*` (review) |
| `#155e75` | 2 | text 2 | 1695, 1705 | `--accent` |
| `#2563eb` | 2 | effect 2 | 518, 541 | `--info-strong` |
| `#60a5fa` | 2 | effect 2 | 518, 541 | `--info (tint)` |
| `#cbd5e1` | 2 | fallback 2 | 1666, 1731 | `--text-secondary` (delete fallback) |
| `r` | 2 | decoration 2 | 922, 928 | `(review)` |
| `rgba(0,0,0,0.025)` | 2 | surface 2 | 834, 1129 | `--overlay-*` (light) |
| `rgba(0,0,0,0.05)` | 2 | surface 1 · effect 1 | 891, 904 | `--overlay-*` (light) |
| `rgba(0,0,0,0.28)` | 2 | effect 2 | 914, 1227 | `--shadow-*` |
| `rgba(16,185,129,0.10)` | 2 | surface 2 | 888, 1723 | `--ok-soft` |
| `rgba(16,185,129,0.12)` | 2 | surface 2 | 663, 843 | `--ok-soft` |
| `rgba(16,185,129,0.14)` | 2 | effect 1 · surface 1 | 904, 1732 | `--ok-soft` |
| `rgba(16,185,129,0.15)` | 2 | surface 1 · effect 1 | 229, 741 | `--ok-soft` |
| `rgba(16,185,129,0.28)` | 2 | border 1 · surface 1 | 642, 1723 | `--ok-soft` |
| `rgba(16,185,129,0.65)` | 2 | decoration 2 | 312, 313 | `--ok-soft` |
| `rgba(239,68,68,0.12)` | 2 | surface 2 | 664, 842 | `--danger-soft` |
| `rgba(245,158,11,0.05)` | 2 | surface 2 | 1192, 1214 | `--warn-soft` |
| `rgba(245,158,11,0.14)` | 2 | border 2 | 1193, 1215 | `--warn-soft` |
| `rgba(255,255,255,.035)` | 2 | surface 2 | 1825, 1920 | `--overlay-*` |
| `rgba(255,255,255,.04)` | 2 | surface 2 | 1374, 1851 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 2 | decoration 1 · border 1 | 919, 1674 | `--overlay-*` |
| `rgba(59,130,246,.12)` | 2 | decoration 1 · effect 1 | 486, 495 | `--info-soft` |
| `rgba(99,102,241,0.10)` | 2 | surface 2 | 1429, 1463 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.35)` | 2 | border 2 | 1416, 1579 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `#000000` | 1 | border 1 | 328 | `--border-*` (review) |
| `#059669` | 1 | effect 1 | 543 | `--ok-strong` |
| `#0d1117` | 1 | decoration 1 | 937 | `--chart-stroke` |
| `#0e7490` | 1 | decoration 1 | 1688 | `--accent-strong (styles Midnight)` |
| `#0f172a` | 1 | text 1 | 1302 | `--text-primary (light)/chart stroke` |
| `#1e293b` | 1 | surface 1 | 852 | `--bg-raised (light inverse)` |
| `#334155` | 1 | fallback 1 | 1711 | `--text-secondary` (delete fallback) |
| `#34d399` | 1 | effect 1 | 543 | `--ok (tint)` |
| `#6366f1` | 1 | fallback 1 | 1550 | `--color-indigo` (delete fallback) |
| `#a78bfa` | 1 | token 1 | 59 | `--data-5 (tint)` |
| `#b45309` | 1 | text 1 | 1137 | `--warn-ink (light)` |
| `#c7d2fe` | 1 | text 1 | 1359 | `--text-*` (review) |
| `#f0f4f8` | 1 | decoration 1 | 1690 | `(review)` |
| `#f59e0b` | 1 | token 1 | 946 | `--warn` |
| `#f97316` | 1 | text 1 | 665 | `--data-7/--brand-today` |
| `rgba(0,0,0,.16)` | 1 | effect 1 | 503 | `--shadow-*` |
| `rgba(0,0,0,0.01)` | 1 | effect 1 | 828 | `--shadow-*` |
| `rgba(0,0,0,0.04)` | 1 | surface 1 | 896 | `--overlay-*` (light) |
| `rgba(0,0,0,0.055)` | 1 | effect 1 | 824 | `--shadow-*` |
| `rgba(0,0,0,0.12)` | 1 | border 1 | 897 | `--overlay-*` (light) |
| `rgba(0,0,0,0.15)` | 1 | effect 1 | 854 | `--shadow-*` |
| `rgba(0,0,0,0.25)` | 1 | effect 1 | 854 | `--shadow-*` |
| `rgba(0,0,0,0.42)` | 1 | text 1 | 1298 | `--overlay-*` (light) |
| `rgba(0,0,0,0.48)` | 1 | text 1 | 1306 | `--overlay-*` (light) |
| `rgba(0,0,0,0.50)` | 1 | decoration 1 | 1323 | `--overlay-*` (light) |
| `rgba(0,0,0,0.6)` | 1 | effect 1 | 330 | `--shadow-*` |
| `rgba(15,23,42,0.35)` | 1 | text 1 | 891 | `--data-*`/review |
| `rgba(15,23,42,0.52)` | 1 | text 1 | 929 | `--data-*`/review |
| `rgba(15,23,42,0.60)` | 1 | text 1 | 1216 | `--data-*`/review |
| `rgba(15,23,42,0.92)` | 1 | text 1 | 898 | `--data-*`/review |
| `rgba(16,185,129,.1)` | 1 | surface 1 | 475 | `--ok-soft` |
| `rgba(16,185,129,.25)` | 1 | border 1 | 475 | `--ok-soft` |
| `rgba(16,185,129,0.055)` | 1 | surface 1 | 1273 | `--ok-soft` |
| `rgba(16,185,129,0.06)` | 1 | surface 1 | 839 | `--ok-soft` |
| `rgba(16,185,129,0.065)` | 1 | surface 1 | 206 | `--ok-soft` |
| `rgba(16,185,129,0.09)` | 1 | surface 1 | 883 | `--ok-soft` |
| `rgba(16,185,129,0.11)` | 1 | surface 1 | 640 | `--ok-soft` |
| `rgba(16,185,129,0.20)` | 1 | effect 1 | 989 | `--ok-soft` |
| `rgba(16,185,129,0.22)` | 1 | border 1 | 884 | `--ok-soft` |
| `rgba(16,185,129,0)` | 1 | effect 1 | 988 | `--ok-soft` |
| `rgba(21,94,117,0.10)` | 1 | surface 1 | 1694 | `--data-*`/review |
| `rgba(21,94,117,0.36)` | 1 | border 1 | 1693 | `--data-*`/review |
| `rgba(239,68,68,0.055)` | 1 | surface 1 | 1269 | `--danger-soft` |
| `rgba(239,68,68,0.06)` | 1 | surface 1 | 838 | `--danger-soft` |
| `rgba(239,68,68,0.065)` | 1 | surface 1 | 201 | `--danger-soft` |
| `rgba(239,68,68,0.10)` | 1 | surface 1 | 889 | `--danger-soft` |
| `rgba(239,68,68,0.15)` | 1 | surface 1 | 228 | `--danger-soft` |
| `rgba(239,68,68,0.30)` | 1 | decoration 1 | 310 | `--danger-soft` |
| `rgba(239,68,68,0.65)` | 1 | decoration 1 | 315 | `--danger-soft` |
| `rgba(239,68,68,0.80)` | 1 | decoration 1 | 316 | `--danger-soft` |
| `rgba(245,158,11,.08)` | 1 | surface 1 | 500 | `--warn-soft` |
| `rgba(245,158,11,.16)` | 1 | surface 1 | 490 | `--warn-soft` |
| `rgba(245,158,11,.2)` | 1 | decoration 1 | 500 | `--warn-soft` |
| `rgba(245,158,11,0.08)` | 1 | surface 1 | 1135 | `--warn-soft` |
| `rgba(245,158,11,0.10)` | 1 | surface 1 | 1072 | `--warn-soft` |
| `rgba(245,158,11,0.18)` | 1 | surface 1 | 1082 | `--warn-soft` |
| `rgba(245,158,11,0.25)` | 1 | border 1 | 1136 | `--warn-soft` |
| `rgba(245,158,11,0.28)` | 1 | border 1 | 1073 | `--warn-soft` |
| `rgba(245,158,11,0.45)` | 1 | decoration 1 | 311 | `--warn-soft` |
| `rgba(245,158,11,0.55)` | 1 | decoration 1 | 314 | `--warn-soft` |
| `rgba(249,115,22,0.10)` | 1 | surface 1 | 890 | `--data-*`/review |
| `rgba(249,115,22,0.12)` | 1 | surface 1 | 665 | `--data-*`/review |
| `rgba(255,255,255,...)` | 1 | decoration 1 | 908 | `--overlay-*` |
| `rgba(255,255,255,…)` | 1 | decoration 1 | 1232 | `--overlay-*` |
| `rgba(255,255,255,.05)` | 1 | surface 1 | 11 | `--overlay-*` |
| `rgba(255,255,255,.12)` | 1 | surface 1 | 11 | `--overlay-*` |
| `rgba(255,255,255,0.025)` | 1 | effect 1 | 116 | `--overlay-*` |
| `rgba(255,255,255,0.05)` | 1 | decoration 1 | 1717 | `--overlay-*` |
| `rgba(255,255,255,0.09)` | 1 | surface 1 | 1549 | `--overlay-*` |
| `rgba(255,255,255,0.25)` | 1 | effect 1 | 330 | `--overlay-*` |
| `rgba(255,255,255,0.55)` | 1 | decoration 1 | 938 | `--overlay-*` |
| `rgba(255,255,255,0.8)` | 1 | border 1 | 853 | `--overlay-*` |
| `rgba(255,255,255,0.9)` | 1 | effect 1 | 824 | `--overlay-*` |
| `rgba(255,255,255,0.92)` | 1 | surface 1 | 866 | `--overlay-*` |
| `rgba(34,211,238,0.10)` | 1 | surface 1 | 1489 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.35)` | 1 | border 1 | 1487 | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,.14)` | 1 | effect 1 | 476 | `--info-soft` |
| `rgba(59,130,246,.22)` | 1 | effect 1 | 495 | `--info-soft` |
| `rgba(59,130,246,.26)` | 1 | effect 1 | 476 | `--info-soft` |
| `rgba(59,130,246,0.055)` | 1 | surface 1 | 1277 | `--info-soft` |
| `rgba(59,130,246,0.06)` | 1 | surface 1 | 840 | `--info-soft` |
| `rgba(59,130,246,0.065)` | 1 | surface 1 | 211 | `--info-soft` |
| `rgba(59,130,246,0.11)` | 1 | border 1 | 626 | `--info-soft` |
| `rgba(59,130,246,0.12)` | 1 | surface 1 | 844 | `--info-soft` |
| `rgba(59,130,246,0.14)` | 1 | border 1 | 880 | `--info-soft` |
| `rgba(59,130,246,0.15)` | 1 | surface 1 | 230 | `--info-soft` |
| `rgba(6,182,212,0.12)` | 1 | effect 1 | 1357 | `--data-*`/review |
| `rgba(6,182,212,0.18)` | 1 | effect 1 | 1363 | `--data-*`/review |
| `rgba(99,102,241,0.12)` | 1 | surface 1 | 1598 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.14)` | 1 | effect 1 | 1509 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.20)` | 1 | effect 1 | 1357 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.28)` | 1 | effect 1 | 1363 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `rgba(99,102,241,0.38)` | 1 | border 1 | 1358 | `--accent-soft`/`--border-focus` (legacy indigo) |

### `css/progress.css` — 127 literals, 41 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `rgba(255,255,255,0.06)` | 14 | surface 9 · decoration 3 · border 2 | 68, 126, 286, 332, 685, 727, 772, 801… | `--overlay-*` |
| `#0f172a` | 12 | text 12 | 444, 474, 567, 664, 691, 715, 818, 848… | `--text-primary (light)/chart stroke` |
| `#22d3ee` | 12 | fallback 12 | 98, 294, 336, 339, 344, 409, 503, 534… | `--color-cyan` (delete fallback) |
| `#475569` | 12 | text 12 | 439, 564, 566, 630, 665, 692, 732, 921… | `--text-secondary (light)` |
| `rgba(255,255,255,0.07)` | 9 | border 9 | 20, 481, 575, 800, 836, 843, 1025, 1071… | `--overlay-*` |
| `#0e7490` | 7 | text 5 · surface 1 · effect 1 | 447, 450, 451, 565, 567, 631, 1182 | `--accent-strong (styles Midnight)` |
| `rgba(255,255,255,0.03)` | 6 | decoration 3 · border 2 · surface 1 | 125, 127, 181, 212, 483, 636 | `--overlay-*` |
| `rgba(255,255,255,0.14)` | 6 | border 5 · decoration 1 | 468, 810, 861, 871, 879, 905 | `--overlay-*` |
| `rgba(255,255,255,0.04)` | 5 | surface 4 · decoration 1 | 703, 892, 928, 1073, 1128 | `--overlay-*` |
| `rgba(15,23,42,0.08)` | 4 | surface 3 · border 1 | 427, 449, 452, 689 | `--data-*`/review |
| `#10b981` | 3 | fallback 3 | 368, 402, 658 | `--color-green` (delete fallback) |
| `#64748b` | 3 | text 3 | 475, 710, 922 | `--text-ghost` |
| `#ef4444` | 3 | fallback 3 | 152, 804, 950 | `--color-red` (delete fallback) |
| `#8b5cf6` | 2 | fallback 2 | 548, 728 | `--color-violet` (delete fallback) |
| `#f59e0b` | 2 | fallback 2 | 369, 1180 | `--color-amber` (delete fallback) |
| `rgba(34,211,238,0.35)` | 2 | effect 2 | 345, 504 | `--accent-soft`/`--border-focus` |
| `#1d4ed8` | 1 | surface 1 | 690 | `--info-strong` |
| `#3b82f6` | 1 | fallback 1 | 686 | `--color-blue` (delete fallback) |
| `#94a3b8` | 1 | fallback 1 | 560 | `--text-muted` (delete fallback) |
| `#ffffff` | 1 | surface 1 | 426 | `--text-white/--accent-ink` |
| `rgba(0,0,0,0.45)` | 1 | effect 1 | 1104 | `--shadow-*` |
| `rgba(148,163,184,0.5)` | 1 | effect 1 | 687 | `--data-8-soft` |
| `rgba(15,23,42,0.04)` | 1 | surface 1 | 563 | `--data-*`/review |
| `rgba(15,23,42,0.05)` | 1 | effect 1 | 428 | `--data-*`/review |
| `rgba(15,23,42,0.12)` | 1 | border 1 | 630 | `--data-*`/review |
| `rgba(15,23,42,0.16)` | 1 | effect 1 | 1185 | `--data-*`/review |
| `rgba(16,185,129,0.16)` | 1 | surface 1 | 658 | `--ok-soft` |
| `rgba(2,4,8,0.94)` | 1 | surface 1 | 792 | `--data-*`/review |
| `rgba(239,68,68,0.06)` | 1 | surface 1 | 453 | `--danger-soft` |
| `rgba(239,68,68,0.12)` | 1 | surface 1 | 155 | `--danger-soft` |
| `rgba(239,68,68,0.5)` | 1 | border 1 | 804 | `--danger-soft` |
| `rgba(245,158,11,0.75)` | 1 | surface 1 | 729 | `--warn-soft` |
| `rgba(248,250,252,0.97)` | 1 | surface 1 | 817 | `--data-*`/review |
| `rgba(255,255,255,0.09)` | 1 | border 1 | 1101 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 1 | surface 1 | 243 | `--overlay-*` |
| `rgba(255,255,255,0.18)` | 1 | decoration 1 | 777 | `--overlay-*` |
| `rgba(34,211,238,0.12)` | 1 | surface 1 | 587 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.14)` | 1 | surface 1 | 502 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.18)` | 1 | surface 1 | 340 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.5)` | 1 | border 1 | 586 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.55)` | 1 | border 1 | 723 | `--accent-soft`/`--border-focus` |

### `css/hybrid-score.css` — 122 literals, 43 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 26 | fallback 26 | 48, 51, 53, 55, 60, 63, 74, 80… | `--text-muted` (delete fallback) |
| `#f8fafc` | 12 | fallback 12 | 14, 73, 79, 116, 120, 121, 150, 164… | `--text-inverse` (delete fallback) |
| `#cbd5e1` | 11 | fallback 11 | 30, 32, 59, 89, 105, 155, 181, 192… | `--text-secondary` (delete fallback) |
| `#3b82f6` | 10 | fallback 8 · effect 2 | 16, 27, 31, 57, 72, 170, 173, 208… | `--hs-accent` (delete fallback) |
| `#10b981` | 8 | fallback 5 · text 2 · effect 1 | 46, 49, 156, 174, 180, 182, 247, 267 | `--color-green` (delete fallback) |
| `rgba(255,255,255,.08)` | 7 | decoration 4 · surface 3 | 56, 90, 104, 106, 111, 111, 266 | `--overlay-*` |
| `#ef4444` | 3 | fallback 2 · text 1 | 47, 189, 248 | `--color-red` (delete fallback) |
| `#f59e0b` | 3 | fallback 2 · text 1 | 44, 187, 223 | `--color-amber` (delete fallback) |
| `rgba(255,255,255,0.08)` | 3 | surface 2 · border 1 | 69, 204, 258 | `--overlay-*` |
| `#6366f1` | 2 | effect 2 | 57, 107 | `--shadow-*`/`--glow-*` (review) |
| `rgba(255,255,255,.04)` | 2 | surface 2 | 104, 114 | `--overlay-*` |
| `rgba(255,255,255,.06)` | 2 | surface 2 | 48, 51 | `--overlay-*` |
| `rgba(255,255,255,0.02)` | 2 | effect 2 | 17, 145 | `--overlay-*` |
| `rgba(255,255,255,0.05)` | 2 | effect 1 · surface 1 | 17, 199 | `--overlay-*` |
| `#8b5cf6` | 1 | effect 1 | 107 | `--data-5` |
| `#f97316` | 1 | text 1 | 50 | `--data-7/--brand-today` |
| `rgba(0,0,0,0.35)` | 1 | effect 1 | 19 | `--shadow-*` |
| `rgba(15,23,42,0.03)` | 1 | surface 1 | 279 | `--data-*`/review |
| `rgba(15,23,42,0.08)` | 1 | surface 1 | 282 | `--data-*`/review |
| `rgba(15,23,42,0.10)` | 1 | border 1 | 280 | `--data-*`/review |
| `rgba(16,185,129,.12)` | 1 | surface 1 | 49 | `--ok-soft` |
| `rgba(16,185,129,.14)` | 1 | surface 1 | 46 | `--ok-soft` |
| `rgba(16,185,129,0.10)` | 1 | surface 1 | 171 | `--ok-soft` |
| `rgba(16,185,129,0.28)` | 1 | border 1 | 171 | `--ok-soft` |
| `rgba(239,68,68,.14)` | 1 | surface 1 | 47 | `--danger-soft` |
| `rgba(239,68,68,0.10)` | 1 | surface 1 | 189 | `--danger-soft` |
| `rgba(239,68,68,0.30)` | 1 | border 1 | 189 | `--danger-soft` |
| `rgba(245,158,11,.14)` | 1 | surface 1 | 44 | `--warn-soft` |
| `rgba(245,158,11,0.10)` | 1 | surface 1 | 186 | `--warn-soft` |
| `rgba(245,158,11,0.28)` | 1 | surface 1 | 186 | `--warn-soft` |
| `rgba(249,115,22,.14)` | 1 | surface 1 | 50 | `--data-*`/review |
| `rgba(255,255,255,.03)` | 1 | surface 1 | 91 | `--overlay-*` |
| `rgba(255,255,255,.07)` | 1 | surface 1 | 123 | `--overlay-*` |
| `rgba(255,255,255,.09)` | 1 | surface 1 | 81 | `--overlay-*` |
| `rgba(255,255,255,0.03)` | 1 | surface 1 | 70 | `--overlay-*` |
| `rgba(255,255,255,0.04)` | 1 | surface 1 | 258 | `--overlay-*` |
| `rgba(255,255,255,0.045)` | 1 | effect 1 | 145 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 1 | surface 1 | 32 | `--overlay-*` |
| `rgba(255,255,255,0.09)` | 1 | border 1 | 146 | `--overlay-*` |
| `rgba(255,255,255,0.10)` | 1 | border 1 | 18 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 1 | border 1 | 198 | `--overlay-*` |
| `rgba(59,130,246,0.10)` | 1 | surface 1 | 162 | `--info-soft` |
| `rgba(59,130,246,0.28)` | 1 | border 1 | 163 | `--info-soft` |

### `index.html` — 117 literals, 65 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 7 | decoration 5 · surface/effect 2 | 285, 288, 718, 719, 777, 778, 975 | `--accent (Midnight)` |
| `#f59e0b` | 7 | decoration 4 · surface/effect 3 | 107, 254, 255, 724, 783, 956, 977 | `--warn` |
| `#10b981` | 6 | decoration 6 | 721, 726, 779, 782, 955, 976 | `--ok` |
| `#94a3b8` | 5 | surface/effect 5 | 297, 351, 353, 377, 401 | `--text-secondary` |
| `#ef4444` | 5 | surface/effect 3 · decoration 2 | 263, 271, 274, 957, 979 | `--danger` |
| `rgba(255,255,255,0.1)` | 5 | surface/effect 3 · decoration 2 | 309, 323, 346, 2064, 2066 | `--overlay-*` |
| `rgba(255,255,255,0.5)` | 5 | decoration 5 | 2058, 2059, 2060, 2061, 2062 | `--overlay-*` |
| `#f8fafc` | 4 | surface/effect 4 | 304, 352, 400, 405 | `--text-primary (Slate)/--text-inverse` |
| `rgba(255,255,255,0.04)` | 4 | surface/effect 4 | 322, 345, 357, 394 | `--overlay-*` |
| `#60a5fa` | 3 | surface/effect 3 | 334, 375, 408 | `--info (tint)` |
| `#070a12` | 2 | decoration 1 · surface/effect 1 | 13, 310 | `--bg-app (Midnight)` |
| `#3b82f6` | 2 | decoration 2 | 720, 725 | `--info (Slate accent)` |
| `#f472b6` | 2 | surface/effect 2 | 376, 409 | `--data-6 (tint)` |
| `#fcd34d` | 2 | surface/effect 2 | 101, 280 | `--warn` |
| `rgba(16,185,129,0.35)` | 2 | decoration 2 | 882, 946 | `--ok-soft` |
| `rgba(239,68,68,0.10)` | 2 | surface/effect 2 | 262, 272 | `--danger-soft` |
| `rgba(255,255,255,0.06)` | 2 | surface/effect 1 · decoration 1 | 403, 2064 | `--overlay-*` |
| `rgba(255,255,255,0.07)` | 2 | surface/effect 2 | 217, 302 | `--overlay-*` |
| `rgba(59,130,246,0.28)` | 2 | surface/effect 2 | 333, 349 | `--info-soft` |
| `rgba(59,130,246,0.3)` | 2 | surface/effect 2 | 312, 375 | `--info-soft` |
| `rgba(59,130,246,0.35)` | 2 | decoration 2 | 866, 942 | `--info-soft` |
| `#0a1a20` | 1 | surface/effect 1 | 283 | `(review)` |
| `#e2e8f0` | 1 | surface/effect 1 | 293 | `--text-*` |
| `#f97316` | 1 | decoration 1 | 978 | `--data-7/--brand-today` |
| `#fca5a5` | 1 | surface/effect 1 | 278 | `--danger-soft (text)` |
| `#ffffff` | 1 | surface/effect 1 | 274 | `--text-white/--accent-ink` |
| `cyan` | 1 | decoration 1 | 1860 | `(review)` |
| `lime` | 1 | decoration 1 | 1860 | `(review)` |
| `navy` | 1 | decoration 1 | 1860 | `(review)` |
| `rgba(0,0,0,0.08)` | 1 | surface/effect 1 | 220 | `--overlay-*` (light) |
| `rgba(0,0,0,0.10)` | 1 | surface/effect 1 | 227 | `--overlay-*` (light) |
| `rgba(0,0,0,0.35)` | 1 | surface/effect 1 | 104 | `--overlay-*` (light) |
| `rgba(236,72,153,0.18)` | 1 | surface/effect 1 | 376 | `--data-6-soft` |
| `rgba(236,72,153,0.2)` | 1 | surface/effect 1 | 409 | `--data-6-soft` |
| `rgba(236,72,153,0.3)` | 1 | surface/effect 1 | 376 | `--data-6-soft` |
| `rgba(239,68,68,0.12)` | 1 | surface/effect 1 | 272 | `--danger-soft` |
| `rgba(239,68,68,0.14)` | 1 | surface/effect 1 | 278 | `--danger-soft` |
| `rgba(239,68,68,0.30)` | 1 | surface/effect 1 | 262 | `--danger-soft` |
| `rgba(239,68,68,0.45)` | 1 | surface/effect 1 | 270 | `--danger-soft` |
| `rgba(245,158,11,0.12)` | 1 | surface/effect 1 | 254 | `--warn-soft` |
| `rgba(245,158,11,0.14)` | 1 | surface/effect 1 | 280 | `--warn-soft` |
| `rgba(245,158,11,0.35)` | 1 | decoration 1 | 878 | `--warn-soft` |
| `rgba(245,158,11,0.4)` | 1 | surface/effect 1 | 103 | `--warn-soft` |
| `rgba(255,255,255,0.05)` | 1 | surface/effect 1 | 245 | `--overlay-*` |
| `rgba(255,255,255,0.08)` | 1 | surface/effect 1 | 395 | `--overlay-*` |
| `rgba(255,255,255,0.09)` | 1 | surface/effect 1 | 358 | `--overlay-*` |
| `rgba(255,255,255,0.10)` | 1 | surface/effect 1 | 246 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 1 | surface/effect 1 | 226 | `--overlay-*` |
| `rgba(255,255,255,0.15)` | 1 | surface/effect 1 | 147 | `--overlay-*` |
| `rgba(255,255,255,0.22)` | 1 | surface/effect 1 | 256 | `--overlay-*` |
| `rgba(255,255,255,0.3)` | 1 | surface/effect 1 | 347 | `--overlay-*` |
| `rgba(255,255,255,0.45)` | 1 | surface/effect 1 | 390 | `--overlay-*` |
| `rgba(255,255,255,0.6)` | 1 | decoration 1 | 2066 | `--overlay-*` |
| `rgba(255,255,255,0.65)` | 1 | surface/effect 1 | 410 | `--overlay-*` |
| `rgba(30,27,12,0.94)` | 1 | surface/effect 1 | 102 | `--data-*`/review |
| `rgba(34,211,238,0.2)` | 1 | decoration 1 | 716 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0.35)` | 1 | decoration 1 | 938 | `--accent-soft`/`--border-focus` |
| `rgba(59,130,246,0.1)` | 1 | surface/effect 1 | 312 | `--info-soft` |
| `rgba(59,130,246,0.12)` | 1 | surface/effect 1 | 332 | `--info-soft` |
| `rgba(59,130,246,0.18)` | 1 | surface/effect 1 | 375 | `--info-soft` |
| `rgba(59,130,246,0.2)` | 1 | surface/effect 1 | 408 | `--info-soft` |
| `rgba(6,182,212,0.25)` | 1 | surface/effect 1 | 303 | `--data-*`/review |
| `rgba(6,182,212,0.4)` | 1 | surface/effect 1 | 284 | `--data-*`/review |
| `rgba(99,102,241,0.35)` | 1 | decoration 1 | 870 | `--accent-soft`/`--border-focus` (legacy indigo) |
| `transparent` | 1 | decoration 1 | 2066 | `(review)` |

### `js/analytics/charts.js` — 116 literals, 30 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f59e0b` | 18 | data-viz 14 · decoration 4 | 130, 159, 242, 301, 302, 307, 377, 385… | `--warn` |
| `rgba(255,255,255,0.6)` | 12 | text 9 · data-viz 3 | 29, 117, 174, 233, 267, 278, 318, 329… | `--overlay-*` |
| `#ec4899` | 9 | data-viz 7 · text 2 | 49, 50, 86, 89, 643, 653, 725, 726… | `--data-6` |
| `#10b981` | 8 | data-viz 4 · decoration 3 · text 1 | 130, 242, 377, 383, 641, 655, 779, 831 | `--ok` |
| `#3b82f6` | 7 | data-viz 5 · decoration 1 · text 1 | 45, 377, 381, 642, 651, 785, 830 | `--info (Slate accent)` |
| `#22d3ee` | 6 | data-viz 3 · effect 2 · decoration 1 | 242, 458, 467, 479, 479, 482 | `--accent (Midnight)` |
| `rgba(255,255,255,0.7)` | 6 | data-viz 6 | 218, 359, 652, 654, 656, 744 | `--data-*` (§8) |
| `#ef4444` | 5 | decoration 5 | 130, 159, 242, 735, 807 | `--danger` |
| `#111827` | 4 | data-viz 4 | 139, 203, 301, 372 | `--chart-stroke` |
| `rgba(255,255,255,0.8)` | 4 | data-viz 3 · text 1 | 173, 382, 384, 386 | `--data-*` (§8) |
| `rgba(255,255,255,0.9)` | 4 | data-viz 4 | 156, 212, 261, 312 | `--data-*` (§8) |
| `#0d1117` | 3 | data-viz 3 | 89, 737, 808 | `--chart-stroke` |
| `#a855f7` | 3 | data-viz 3 | 194, 199, 203 | `--data-5 (near-dup)` |
| `rgba(255,255,255,0.5)` | 3 | data-viz 3 | 98, 351, 691 | `--data-*` (§8) |
| `#60a5fa` | 2 | data-viz 2 | 65, 108 | `--info (tint)` |
| `#a3e635` | 2 | data-viz 2 | 469, 483 | `--accent-alt (lime)` |
| `rgba(203,213,225,.62)` | 2 | data-viz 2 | 445, 451 | `--data-*` (§8) |
| `rgba(255,255,255,0.08)` | 2 | data-viz 2 | 223, 817 | `--data-*` (§8) |
| `rgba(255,255,255,0.1)` | 2 | data-viz 2 | 268, 319 | `--data-*` (§8) |
| `rgba(255,255,255,0.12)` | 2 | data-viz 2 | 352, 692 | `--data-*` (§8) |
| `rgba(255,255,255,0.4)` | 2 | data-viz 2 | 618, 626 | `--data-*` (§8) |
| `rgba(255,255,255,0.45)` | 2 | data-viz 2 | 150, 816 | `--data-*` (§8) |
| `#1e3a8a` | 1 | data-viz 1 | 46 | `--data-*` (§8) |
| `#93c5fd` | 1 | data-viz 1 | 69 | `--info (tint)` |
| `#f97316` | 1 | decoration 1 | 242 | `--data-7/--brand-today` |
| `rgba(148,163,184,.14)` | 1 | data-viz 1 | 444 | `--data-*` (§8) |
| `rgba(236,72,153,0.8)` | 1 | data-viz 1 | 729 | `--data-*` (§8) |
| `rgba(255,255,255,0.05)` | 1 | data-viz 1 | 610 | `--data-*` (§8) |
| `rgba(255,255,255,0.07)` | 1 | data-viz 1 | 99 | `--data-*` (§8) |
| `rgba(255,255,255,0.55)` | 1 | data-viz 1 | 108 | `--data-*` (§8) |

### `css/brand-consistency.css` — 85 literals, 58 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0891b2` | 4 | token 3 · effect 1 | 42, 48, 55, 58 | `--accent-strong` |
| `#22d3ee` | 4 | token 3 · effect 1 | 41, 48, 54, 57 | `--accent (Midnight)` |
| `rgba(var(--brand-cobalt-rgb),0.28)` | 4 | effect 2 · border 2 | 127, 146, 169, 189 | `--shadow-*`/`--glow-*` (review) |
| `#ffffff` | 3 | effect 2 · text 1 | 126, 221, 233 | `--text-white/--accent-ink` |
| `rgba(var(--brand-cobalt-rgb),0.10)` | 3 | surface 2 · effect 1 | 133, 168, 188 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.12)` | 3 | decoration 1 · surface 1 · effect 1 | 135, 179, 229 | `(review)` |
| `#070a12` | 2 | token 2 | 38, 49 | `--bg-app (Midnight)` |
| `#0b1420` | 2 | token 1 · surface 1 | 24, 208 | `--bg-card (brand root)` |
| `#0d1420` | 2 | token 2 | 39, 50 | `--bg-card (Midnight)` |
| `#94a3b8` | 2 | token 2 | 19, 46 | `--text-secondary` |
| `#a3e635` | 2 | token 2 | 47, 56 | `--accent-alt (lime)` |
| `#f4f7fb` | 2 | effect 2 | 221, 233 | `--shadow-*`/`--glow-*` (review) |
| `rgba(0,0,0,0.38)` | 2 | effect 2 | 91, 175 | `--shadow-*` |
| `rgba(0,0,0,0.48)` | 2 | effect 2 | 96, 158 | `--shadow-*` |
| `rgba(16,27,42,0.98)` | 2 | effect 2 | 90, 184 | `--data-*`/review |
| `rgba(7,17,31,0.98)` | 2 | effect 2 | 90, 184 | `--data-*`/review |
| `rgba(96,165,250,0.10)` | 2 | border 2 | 89, 185 | `--data-*`/review |
| `rgba(var(--brand-cobalt-rgb),0.06)` | 2 | effect 1 · decoration 1 | 96, 159 | `--shadow-*`/`--glow-*` (review) |
| `#04121a` | 1 | text 1 | 70 | `--accent-ink` |
| `#050a12` | 1 | token 1 | 23 | `--bg-app (brand root — rename)` |
| `#07111f` | 1 | token 1 | 11 | `(review)` |
| `#0a111d` | 1 | token 1 | 53 | `--bg-deep (brand Midnight)` |
| `#101b2a` | 1 | token 1 | 12 | `--bg-raised (brand gunmetal)` |
| `#111a2a` | 1 | token 1 | 40 | `(review)` |
| `#121b2b` | 1 | token 1 | 51 | `--bg-input (Midnight)` |
| `#142235` | 1 | token 1 | 13 | `(review)` |
| `#172236` | 1 | token 1 | 52 | `--bg-input-focus (Midnight)` |
| `#1d4ed8` | 1 | token 1 | 15 | `--info-strong` |
| `#2563eb` | 1 | token 1 | 14 | `--info-strong` |
| `#60a5fa` | 1 | token 1 | 17 | `--info (tint)` |
| `#67e8f9` | 1 | token 1 | 44 | `--accent (tint)` |
| `#bfdbfe` | 1 | token 1 | 18 | `--info` |
| `#cffafe` | 1 | token 1 | 45 | `--accent` |
| `#f97316` | 1 | token 1 | 20 | `--data-7/--brand-today` |
| `rgba(0,0,0,0.82)` | 1 | decoration 1 | 134 | `--overlay-*` (light) |
| `rgba(15,23,42,0.08)` | 1 | effect 1 | 223 | `--data-*`/review |
| `rgba(255,255,255,0.025)` | 1 | effect 1 | 91 | `--overlay-*` |
| `rgba(255,255,255,0.96)` | 1 | surface 1 | 227 | `--overlay-*` |
| `rgba(34,211,238,0.22)` | 1 | effect 1 | 71 | `--accent-soft`/`--border-focus` |
| `rgba(37,99,235,0.12)` | 1 | border 1 | 222 | `--data-*`/review |
| `rgba(5,10,18,0.95)` | 1 | surface 1 | 131 | `--data-*`/review |
| `rgba(96,165,250,0.035)` | 1 | effect 1 | 78 | `--data-*`/review |
| `rgba(var(--brand-cobalt-rgb),0.035)` | 1 | effect 1 | 213 | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.045)` | 1 | surface 1 | 162 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.07)` | 1 | effect 1 | 77 | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.075)` | 1 | effect 1 | 212 | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.11)` | 1 | effect 1 | 200 | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.14)` | 1 | surface 1 | 138 | `--bg-card`/`--bg-raised` (review) |
| `rgba(var(--brand-cobalt-rgb),0.15)` | 1 | effect 1 | 76 | `--shadow-*`/`--glow-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.20)` | 1 | border 1 | 174 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.22)` | 1 | border 1 | 180 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.23)` | 1 | border 1 | 157 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.24)` | 1 | border 1 | 95 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.30)` | 1 | border 1 | 228 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.46)` | 1 | border 1 | 132 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.58)` | 1 | border 1 | 199 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.72)` | 1 | border 1 | 145 | `--border-*` (review) |
| `rgba(var(--brand-cobalt-rgb),0.78)` | 1 | border 1 | 203 | `--border-*` (review) |

### `js/analytics/views/view-fasting.js` — 61 literals, 34 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f59e0b` | 5 | decoration 4 · border 1 | 21, 346, 346, 346, 534 | `--warn` |
| `rgba(255,255,255,0.38)` | 5 | text 5 | 261, 402, 403, 404, 677 | `--overlay-*` |
| `#10b981` | 4 | decoration 3 · border 1 | 23, 348, 348, 348 | `--ok` |
| `#3b82f6` | 4 | decoration 3 · border 1 | 24, 347, 347, 347 | `--info (Slate accent)` |
| `rgba(255,255,255,0.07)` | 4 | border 2 · surface 1 · data-viz 1 | 150, 163, 349, 351 | `--overlay-*` |
| `rgba(255,255,255,0.30)` | 4 | text 4 | 159, 258, 269, 272 | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 4 | text 4 | 147, 148, 175, 263 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 2 | decoration 2 | 145, 540 | `--overlay-*` |
| `rgba(255,255,255,0.25)` | 2 | decoration 2 | 349, 351 | `--overlay-*` |
| `rgba(255,255,255,0.28)` | 2 | text 2 | 153, 155 | `--overlay-*` |
| `rgba(255,255,255,0.3)` | 2 | text 2 | 368, 404 | `--overlay-*` |
| `#10b98122` | 1 | decoration 1 | 348 | `(review)` |
| `#3b82f622` | 1 | decoration 1 | 347 | `(review)` |
| `#8b5cf6` | 1 | decoration 1 | 25 | `--data-5` |
| `#94a3b8` | 1 | decoration 1 | 534 | `--text-secondary` |
| `#b45309` | 1 | decoration 1 | 534 | `--warn-ink (light)` |
| `#ef4444` | 1 | decoration 1 | 26 | `--danger` |
| `#f59e0b22` | 1 | decoration 1 | 346 | `(review)` |
| `#f97316` | 1 | decoration 1 | 22 | `--data-7/--brand-today` |
| `rgba(148,163,184,0.08)` | 1 | decoration 1 | 535 | `--data-8-soft` |
| `rgba(180,83,9,0.08)` | 1 | decoration 1 | 535 | `--data-*`/review |
| `rgba(245,158,11,0.08)` | 1 | decoration 1 | 535 | `--warn-soft` |
| `rgba(255,255,255,0.04)` | 1 | border 1 | 350 | `--overlay-*` |
| `rgba(255,255,255,0.08)` | 1 | surface 1 | 81 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 1 | decoration 1 | 350 | `--overlay-*` |
| `rgba(255,255,255,0.15)` | 1 | surface 1 | 373 | `--overlay-*` |
| `rgba(255,255,255,0.2)` | 1 | text 1 | 546 | `--overlay-*` |
| `rgba(255,255,255,0.4)` | 1 | text 1 | 554 | `--overlay-*` |
| `rgba(255,255,255,0.40)` | 1 | text 1 | 173 | `--overlay-*` |
| `rgba(255,255,255,0.45)` | 1 | text 1 | 383 | `--overlay-*` |
| `rgba(255,255,255,0.60)` | 1 | text 1 | 176 | `--overlay-*` |
| `rgba(255,255,255,0.7)` | 1 | text 1 | 676 | `--overlay-*` |
| `rgba(255,255,255,0.85)` | 1 | text 1 | 270 | `--overlay-*` |
| `rgba(255,255,255,0.95)` | 1 | data-viz 1 | 168 | `--data-*` (§8) |

### `js/analytics/views/view-recovery.js` — 53 literals, 22 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ef4444` | 10 | decoration 9 · text 1 | 129, 315, 318, 339, 346, 477, 495, 505… | `--danger` |
| `#3b82f6` | 6 | decoration 3 · text 2 · border 1 | 101, 316, 611, 644, 651, 652 | `--info (Slate accent)` |
| `rgba(255,255,255,0.4)` | 6 | text 6 | 435, 452, 472, 491, 509, 522 | `--overlay-*` |
| `#f59e0b` | 4 | text 2 · decoration 2 | 102, 128, 317, 457 | `--warn` |
| `rgba(255,255,255,0.5)` | 4 | text 4 | 510, 513, 523, 526 | `--overlay-*` |
| `#94a3b8` | 3 | decoration 3 | 204, 439, 543 | `--text-secondary` |
| `#ffffff` | 2 | text 2 | 611, 644 | `--text-white/--accent-ink` |
| `rgba(255,255,255,0.05)` | 2 | surface 2 | 512, 525 | `--overlay-*` |
| `rgba(255,255,255,0.3)` | 2 | text 2 | 510, 523 | `--overlay-*` |
| `rgba(59,130,246,0.35)` | 2 | surface 2 | 611, 644 | `--info-soft` |
| `#10b981` | 1 | text 1 | 127 | `--ok` |
| `#818cf8` | 1 | text 1 | 326 | `--data-2 (tint)` |
| `rgba(129,140,248,0.4)` | 1 | decoration 1 | 470 | `--data-*`/review |
| `rgba(16,185,129,0.25)` | 1 | decoration 1 | 270 | `--ok-soft` |
| `rgba(16,185,129,0.3)` | 1 | decoration 1 | 144 | `--ok-soft` |
| `rgba(16,185,129,0.4)` | 1 | decoration 1 | 433 | `--ok-soft` |
| `rgba(239,68,68,0.2)` | 1 | decoration 1 | 280 | `--danger-soft` |
| `rgba(239,68,68,0.3)` | 1 | decoration 1 | 489 | `--danger-soft` |
| `rgba(255,255,255,0.08)` | 1 | decoration 1 | 354 | `--overlay-*` |
| `rgba(255,255,255,0.15)` | 1 | decoration 1 | 612 | `--overlay-*` |
| `rgba(59,130,246,0.3)` | 1 | decoration 1 | 149 | `--info-soft` |
| `rgba(59,130,246,0.4)` | 1 | decoration 1 | 450 | `--info-soft` |

### `js/analytics/charts/strength-charts.js` — 42 literals, 17 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 8 | data-viz 4 · effect 3 · decoration 1 | 33, 33, 38, 39, 68, 95, 116, 252 | `--info (Slate accent)` |
| `rgba(255,255,255,0.5)` | 7 | text 5 · decoration 1 · data-viz 1 | 15, 54, 69, 81, 134, 177, 208 | `--overlay-*` |
| `#60a5fa` | 4 | data-viz 4 | 46, 49, 50, 70 | `--info (tint)` |
| `#10b981` | 3 | data-viz 2 · decoration 1 | 57, 71, 256 | `--ok` |
| `rgba(255,255,255,0.7)` | 3 | data-viz 3 | 253, 255, 257 | `--data-*` (§8) |
| `rgba(255,255,255,0.05)` | 2 | data-viz 2 | 153, 220 | `--data-*` (§8) |
| `rgba(255,255,255,0.4)` | 2 | data-viz 2 | 225, 231 | `--data-*` (§8) |
| `rgba(255,255,255,0.55)` | 2 | data-viz 2 | 117, 163 | `--data-*` (§8) |
| `rgba(255,255,255,0.8)` | 2 | data-viz 2 | 166, 197 | `--data-*` (§8) |
| `rgba(96,165,250,0.5)` | 2 | decoration 1 · data-viz 1 | 111, 118 | `--data-*`/review |
| `#0d1117` | 1 | data-viz 1 | 49 | `--chart-stroke` |
| `#1e3a8a` | 1 | effect 1 | 95 | `--info` |
| `#ec4899` | 1 | data-viz 1 | 254 | `--data-6` |
| `rgba(16,185,129,${intensity})` | 1 | text 1 | 244 | `--ok-soft` |
| `rgba(236,72,153,${intensity})` | 1 | text 1 | 246 | `--data-6-soft` |
| `rgba(255,255,255,0.65)` | 1 | decoration 1 | 110 | `--overlay-*` |
| `rgba(59,130,246,${intensity})` | 1 | text 1 | 245 | `--info-soft` |

### `js/vendor/leaflet/leaflet.css` — 40 literals, 20 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ffffff` | 12 | vendor 12 | 289, 355, 382, 414, 452, 570, 580, 581… | `--text-white/--accent-ink` |
| `#333333` | 3 | vendor 3 | 381, 421, 524 | vendor |
| `#777777` | 3 | vendor 3 | 444, 455, 460 | vendor |
| `rgba(0,0,0,0.4)` | 3 | vendor 3 | 354, 525, 590 | vendor |
| `#dddddd` | 2 | vendor 2 | 261, 401 | vendor |
| `#f4f4f4` | 2 | vendor 2 | 307, 320 | vendor |
| `rgba(255,255,255,0.8)` | 2 | vendor 2 | 415, 451 | vendor |
| `#0078a8` | 1 | vendor 1 | 265 | vendor |
| `#222222` | 1 | vendor 1 | 583 | vendor |
| `#3388ff` | 1 | vendor 1 | 268 | vendor |
| `#585858` | 1 | vendor 1 | 542 | vendor |
| `#666666` | 1 | vendor 1 | 571 | vendor |
| `#757575` | 1 | vendor 1 | 536 | vendor |
| `#999999` | 1 | vendor 1 | 563 | vendor |
| `#bbbbbb` | 1 | vendor 1 | 321 | vendor |
| `#cccccc` | 1 | vendor 1 | 290 | vendor |
| `rgba(0,0,0,0.2)` | 1 | vendor 1 | 470 | vendor |
| `rgba(0,0,0,0.65)` | 1 | vendor 1 | 285 | vendor |
| `rgba(255,255,255,0.5)` | 1 | vendor 1 | 269 | vendor |
| `rgba(51,181,229,0.4)` | 1 | vendor 1 | 86 | vendor |

### `js/programs/catalog/hyrox.js` — 39 literals, 37 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#7c3aed` | 2 | text 2 | 194, 297 | `--data-5 (deep)` |
| `#f59e0b` | 2 | text 2 | 30, 411 | `--warn` |
| `#06b6d4` | 1 | text 1 | 720 | `--accent (near-dup)` |
| `#0a140a` | 1 | effect 1 | 89 | `--shadow-*`/`--glow-*` (review) |
| `#0a1a1a` | 1 | effect 1 | 720 | `--shadow-*`/`--glow-*` (review) |
| `#0a1a2e` | 1 | effect 1 | 521 | `--shadow-*`/`--glow-*` (review) |
| `#0d1a2e` | 1 | effect 1 | 354 | `--shadow-*`/`--glow-*` (review) |
| `#0d2e14` | 1 | effect 1 | 89 | `--shadow-*`/`--glow-*` (review) |
| `#0e0a1a` | 1 | effect 1 | 670 | `--shadow-*`/`--glow-*` (review) |
| `#0e0e1a` | 1 | effect 1 | 769 | `--shadow-*`/`--glow-*` (review) |
| `#0e1a0e` | 1 | effect 1 | 621 | `--shadow-*`/`--glow-*` (review) |
| `#0e1a2e` | 1 | effect 1 | 468 | `--shadow-*`/`--glow-*` (review) |
| `#0e2d2d` | 1 | effect 1 | 720 | `--shadow-*`/`--glow-*` (review) |
| `#102040` | 1 | effect 1 | 521 | `--shadow-*`/`--glow-*` (review) |
| `#10b981` | 1 | text 1 | 89 | `--ok` |
| `#1a0520` | 1 | effect 1 | 297 | `--shadow-*`/`--glow-*` (review) |
| `#1a0900` | 1 | effect 1 | 411 | `--shadow-*`/`--glow-*` (review) |
| `#1a0a00` | 1 | effect 1 | 572 | `--shadow-*`/`--glow-*` (review) |
| `#1a0e00` | 1 | effect 1 | 30 | `--shadow-*`/`--glow-*` (review) |
| `#1a0e2e` | 1 | effect 1 | 194 | `--cover-default` |
| `#1a1230` | 1 | effect 1 | 670 | `--shadow-*`/`--glow-*` (review) |
| `#1a1a30` | 1 | effect 1 | 769 | `--shadow-*`/`--glow-*` (review) |
| `#1a2d4e` | 1 | effect 1 | 468 | `--shadow-*`/`--glow-*` (review) |
| `#1a2d5c` | 1 | effect 1 | 354 | `--shadow-*`/`--glow-*` (review) |
| `#1a300e` | 1 | effect 1 | 621 | `--shadow-*`/`--glow-*` (review) |
| `#22c55e` | 1 | text 1 | 621 | `--text-*` (review) |
| `#22d3ee` | 1 | text 1 | 521 | `--accent (Midnight)` |
| `#2d1060` | 1 | effect 1 | 297 | `--shadow-*`/`--glow-*` (review) |
| `#2d1600` | 1 | effect 1 | 411 | `--shadow-*`/`--glow-*` (review) |
| `#2d1800` | 1 | effect 1 | 572 | `--shadow-*`/`--glow-*` (review) |
| `#2d1a00` | 1 | effect 1 | 30 | `--shadow-*`/`--glow-*` (review) |
| `#2d1a4e` | 1 | effect 1 | 194 | `--shadow-*`/`--glow-*` (review) |
| `#3b82f6` | 1 | text 1 | 354 | `--info (Slate accent)` |
| `#60a5fa` | 1 | text 1 | 468 | `--info (tint)` |
| `#8b5cf6` | 1 | text 1 | 769 | `--data-5` |
| `#a78bfa` | 1 | text 1 | 670 | `--data-5 (tint)` |
| `#f97316` | 1 | text 1 | 572 | `--data-7/--brand-today` |

### `js/analytics/charts/running-charts.js` — 38 literals, 16 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 6 | effect 2 · data-viz 2 · decoration 2 | 111, 111, 116, 117, 125, 138 | `--accent (Midnight)` |
| `#ec4899` | 6 | effect 3 · data-viz 2 · text 1 | 34, 34, 56, 82, 200, 217 | `--data-6` |
| `#f59e0b` | 6 | decoration 3 · data-viz 3 | 41, 42, 69, 70, 85, 138 | `--warn` |
| `rgba(255,255,255,0.5)` | 4 | text 4 | 17, 95, 134, 186 | `--overlay-*` |
| `rgba(255,255,255,0.6)` | 3 | decoration 3 | 74, 118, 213 | `--overlay-*` |
| `#ef4444` | 2 | decoration 2 | 59, 138 | `--danger` |
| `rgba(255,255,255,0.55)` | 2 | data-viz 2 | 83, 218 | `--data-*` (§8) |
| `#0d1117` | 1 | data-viz 1 | 61 | `--chart-stroke` |
| `#10b981` | 1 | decoration 1 | 138 | `--ok` |
| `#be185d` | 1 | effect 1 | 200 | `--data-6 (deep)` |
| `#f97316` | 1 | decoration 1 | 138 | `--data-7/--brand-today` |
| `rgba(236,72,153,0.85)` | 1 | data-viz 1 | 49 | `--data-*` (§8) |
| `rgba(255,255,255,0.08)` | 1 | data-viz 1 | 175 | `--data-*` (§8) |
| `rgba(255,255,255,0.8)` | 1 | data-viz 1 | 171 | `--data-*` (§8) |
| `rgba(96,165,250,0.45)` | 1 | decoration 1 | 75 | `--data-*`/review |
| `rgba(96,165,250,0.5)` | 1 | data-viz 1 | 84 | `--data-*` (§8) |

### `js/ui/confirm-modal.js` — 34 literals, 22 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 4 | fallback 4 | 38, 54, 62, 78 | `--text-muted` (delete fallback) |
| `#ffffff` | 4 | text 2 · effect 1 · surface 1 | 42, 43, 47, 52 | `--text-white/--accent-ink` |
| `#0f172a` | 2 | text 2 | 48, 52 | `--text-primary (light)/chart stroke` |
| `#3b82f6` | 2 | fallback 2 | 42, 61 | `--color-blue` (delete fallback) |
| `#526176` | 2 | text 2 | 49, 50 | `--text-muted (light)` |
| `#f8fafc` | 2 | fallback 2 | 37, 59 | `--text-inverse` (delete fallback) |
| `rgba(255,255,255,0.06)` | 2 | surface 2 | 41, 58 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 2 | effect 1 · border 1 | 33, 41 | `--overlay-*` |
| `#334155` | 1 | text 1 | 51 | `--text-strong (light)` |
| `#cbd5e1` | 1 | fallback 1 | 41 | `--text-secondary` (delete fallback) |
| `#ef4444` | 1 | fallback 1 | 43 | `--color-red` (delete fallback) |
| `#f4f7fb` | 1 | effect 1 | 47 | `--shadow-*`/`--glow-*` (review) |
| `rgba(0,0,0,0.55)` | 1 | effect 1 | 33 | `--shadow-*` |
| `rgba(15,23,42,0.05)` | 1 | surface 1 | 51 | `--data-*`/review |
| `rgba(15,23,42,0.10)` | 1 | effect 1 | 47 | `--data-*`/review |
| `rgba(15,23,42,0.14)` | 1 | border 1 | 51 | `--data-*`/review |
| `rgba(15,23,42,0.16)` | 1 | border 1 | 52 | `--data-*`/review |
| `rgba(15,23,42,0.18)` | 1 | effect 1 | 47 | `--data-*`/review |
| `rgba(20,24,36,0.98)` | 1 | effect 1 | 32 | `--data-*`/review |
| `rgba(255,255,255,0.14)` | 1 | decoration 1 | 58 | `--overlay-*` |
| `rgba(30,34,48,0.98)` | 1 | effect 1 | 32 | `--data-*`/review |
| `rgba(5,8,16,0.62)` | 1 | surface 1 | 25 | `--data-*`/review |

### `js/analytics/views/view-strength.js` — 33 literals, 14 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 8 | text 6 · decoration 1 · surface 1 | 87, 92, 109, 146, 433, 481, 625, 629 | `--info (Slate accent)` |
| `#10b981` | 7 | text 4 · decoration 3 | 141, 141, 427, 473, 609, 609, 637 | `--ok` |
| `#94a3b8` | 3 | decoration 2 · text 1 | 82, 110, 473 | `--text-secondary` |
| `#8b5cf6` | 2 | text 2 | 88, 453 | `--data-5` |
| `#ef4444` | 2 | decoration 2 | 78, 156 | `--danger` |
| `rgba(16,185,129,0.15)` | 2 | surface 2 | 141, 609 | `--ok-soft` |
| `rgba(255,255,255,0.4)` | 2 | decoration 2 | 48, 77 | `--overlay-*` |
| `#60a5fa` | 1 | text 1 | 165 | `--info (tint)` |
| `#64748b` | 1 | text 1 | 465 | `--text-ghost` |
| `#f59e0b` | 1 | text 1 | 91 | `--warn` |
| `rgba(16,185,129,0.3)` | 1 | decoration 1 | 635 | `--ok-soft` |
| `rgba(255,255,255,0.5)` | 1 | decoration 1 | 135 | `--overlay-*` |
| `rgba(255,255,255,0.6)` | 1 | text 1 | 592 | `--overlay-*` |
| `rgba(59,130,246,0.15)` | 1 | decoration 1 | 143 | `--info-soft` |

### `js/programs/catalog/fitness.js` — 33 literals, 27 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#06b6d4` | 2 | text 2 | 129, 174 | `--accent (near-dup)` |
| `#0e1a1e` | 2 | effect 2 | 129, 174 | `--shadow-*`/`--glow-*` (review) |
| `#1a0e0e` | 2 | effect 2 | 30, 75 | `--shadow-*`/`--glow-*` (review) |
| `#1a3040` | 2 | effect 2 | 129, 174 | `--shadow-*`/`--glow-*` (review) |
| `#3d2222` | 2 | effect 2 | 30, 75 | `--shadow-*`/`--glow-*` (review) |
| `#f59e0b` | 2 | text 2 | 30, 75 | `--warn` |
| `#0a0a14` | 1 | effect 1 | 319 | `--shadow-*`/`--glow-*` (review) |
| `#0a1020` | 1 | effect 1 | 418 | `--shadow-*`/`--glow-*` (review) |
| `#0a1208` | 1 | effect 1 | 367 | `--shadow-*`/`--glow-*` (review) |
| `#0a1520` | 1 | effect 1 | 218 | `--shadow-*`/`--glow-*` (review) |
| `#0a1a0a` | 1 | effect 1 | 530 | `--shadow-*`/`--glow-*` (review) |
| `#0d2a3d` | 1 | effect 1 | 418 | `--shadow-*`/`--glow-*` (review) |
| `#0d2e1a` | 1 | effect 1 | 530 | `--shadow-*`/`--glow-*` (review) |
| `#0ea5e9` | 1 | text 1 | 418 | `--text-*` (review) |
| `#101010` | 1 | effect 1 | 272 | `--shadow-*`/`--glow-*` (review) |
| `#141426` | 1 | effect 1 | 319 | `--shadow-*`/`--glow-*` (review) |
| `#14253a` | 1 | effect 1 | 218 | `--shadow-*`/`--glow-*` (review) |
| `#1a0e10` | 1 | effect 1 | 647 | `--shadow-*`/`--glow-*` (review) |
| `#1a2618` | 1 | effect 1 | 367 | `--shadow-*`/`--glow-*` (review) |
| `#1e1e1e` | 1 | effect 1 | 272 | `--shadow-*`/`--glow-*` (review) |
| `#2d1a10` | 1 | effect 1 | 647 | `--shadow-*`/`--glow-*` (review) |
| `#3b82f6` | 1 | text 1 | 218 | `--info (Slate accent)` |
| `#6366f1` | 1 | text 1 | 319 | `--text-*` (review) |
| `#84cc16` | 1 | text 1 | 367 | `--accent-alt` |
| `#86efac` | 1 | text 1 | 530 | `--text-*` (review) |
| `#9ca3af` | 1 | text 1 | 272 | `--text-*` (review) |
| `#fb923c` | 1 | text 1 | 647 | `--data-7 (tint)` |

### `js/analytics/running-detail.js` — 31 literals, 15 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f59e0b` | 5 | text 5 | 85, 88, 105, 131, 135 | `--warn` |
| `#10b981` | 4 | text 4 | 63, 79, 117, 127 | `--ok` |
| `#3b82f6` | 4 | text 3 · decoration 1 | 41, 51, 95, 101 | `--info (Slate accent)` |
| `#22d3ee` | 3 | text 3 | 53, 54, 113 | `--accent (Midnight)` |
| `#14b8a6` | 2 | text 2 | 67, 120 | `--data-3 (teal)` |
| `#60a5fa` | 2 | text 2 | 55, 56 | `--info (tint)` |
| `#ef4444` | 2 | text 2 | 70, 109 | `--danger` |
| `#f97316` | 2 | text 2 | 82, 91 | `--data-7/--brand-today` |
| `#06b6d4` | 1 | text 1 | 76 | `--accent (near-dup)` |
| `#8b5cf6` | 1 | text 1 | 123 | `--data-5` |
| `#a78bfa` | 1 | text 1 | 68 | `--data-5 (tint)` |
| `#ec4899` | 1 | text 1 | 52 | `--data-6` |
| `#f43f5e` | 1 | text 1 | 73 | `--danger (rose)` |
| `#f472b6` | 1 | text 1 | 58 | `--data-6 (tint)` |
| `#fb7185` | 1 | text 1 | 98 | `--danger (rose tint)` |

### `js/analytics/charts/load-charts.js` — 28 literals, 12 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f59e0b` | 5 | effect 2 · data-viz 2 · decoration 1 | 55, 55, 58, 81, 109 | `--warn` |
| `#10b981` | 4 | data-viz 2 · decoration 2 | 43, 84, 107, 108 | `--ok` |
| `#a78bfa` | 4 | data-viz 2 · effect 1 · decoration 1 | 152, 165, 166, 173 | `--data-5 (tint)` |
| `rgba(255,255,255,0.5)` | 3 | text 3 | 12, 94, 138 | `--overlay-*` |
| `#0d1117` | 2 | data-viz 2 | 67, 120 | `--chart-stroke` |
| `#3b82f6` | 2 | data-viz 2 | 49, 82 | `--info (Slate accent)` |
| `#ef4444` | 2 | decoration 2 | 66, 119 | `--danger` |
| `rgba(255,255,255,0.55)` | 2 | data-viz 2 | 73, 83 | `--data-*` (§8) |
| `#7c3aed` | 1 | effect 1 | 152 | `--data-5 (deep)` |
| `#94a3b8` | 1 | data-viz 1 | 114 | `--text-secondary` |
| `rgba(255,255,255,0.2)` | 1 | data-viz 1 | 30 | `--data-*` (§8) |
| `rgba(255,255,255,0.6)` | 1 | data-viz 1 | 128 | `--data-*` (§8) |

### `js/programs/catalog/hypertrophy.js` — 27 literals, 16 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0a1628` | 5 | effect 5 | 30, 55, 80, 105, 480 | `--shadow-*`/`--glow-*` (review) |
| `#1e3a5f` | 4 | effect 4 | 30, 55, 105, 480 | `--shadow-*`/`--glow-*` (review) |
| `#1a0d2e` | 2 | effect 2 | 249, 387 | `--shadow-*`/`--glow-*` (review) |
| `#3b82f6` | 2 | text 2 | 30, 105 | `--info (Slate accent)` |
| `#6366f1` | 2 | text 2 | 55, 198 | `--text-*` (review) |
| `#e879f9` | 2 | text 2 | 249, 387 | `--text-*` (review) |
| `#0a0a1a` | 1 | effect 1 | 387 | `--shadow-*`/`--glow-*` (review) |
| `#0d0a20` | 1 | effect 1 | 198 | `--shadow-*`/`--glow-*` (review) |
| `#0f3460` | 1 | effect 1 | 80 | `--shadow-*`/`--glow-*` (review) |
| `#1a0520` | 1 | effect 1 | 155 | `--shadow-*`/`--glow-*` (review) |
| `#1a1540` | 1 | effect 1 | 198 | `--shadow-*`/`--glow-*` (review) |
| `#2d0a35` | 1 | effect 1 | 155 | `--shadow-*`/`--glow-*` (review) |
| `#2d1040` | 1 | effect 1 | 249 | `--shadow-*`/`--glow-*` (review) |
| `#8b5cf6` | 1 | text 1 | 80 | `--data-5` |
| `#a855f7` | 1 | text 1 | 155 | `--data-5 (near-dup)` |
| `#f59e0b` | 1 | text 1 | 480 | `--warn` |

### `js/programs/catalog/hybrid.js` — 24 literals, 18 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#1a0e2e` | 4 | effect 4 | 30, 180, 230, 273 | `--cover-default` |
| `#22d3ee` | 2 | text 2 | 155, 368 | `--accent (Midnight)` |
| `#2d1b69` | 2 | effect 2 | 230, 273 | `--shadow-*`/`--glow-*` (review) |
| `#8b5cf6` | 2 | text 2 | 30, 319 | `--data-5` |
| `#001a1a` | 1 | effect 1 | 368 | `--surface-legacy (teal black)` |
| `#003333` | 1 | effect 1 | 368 | `--shadow-*`/`--glow-*` (review) |
| `#0d1a2e` | 1 | effect 1 | 319 | `--shadow-*`/`--glow-*` (review) |
| `#0d1b2a` | 1 | effect 1 | 155 | `--cover-default` |
| `#0d3b2e` | 1 | effect 1 | 180 | `--shadow-*`/`--glow-*` (review) |
| `#10b981` | 1 | text 1 | 180 | `--ok` |
| `#1a0a0a` | 1 | effect 1 | 205 | `--shadow-*`/`--glow-*` (review) |
| `#1a0d2e` | 1 | effect 1 | 319 | `--shadow-*`/`--glow-*` (review) |
| `#1b4332` | 1 | effect 1 | 155 | `--shadow-*`/`--glow-*` (review) |
| `#2d1a5c` | 1 | effect 1 | 30 | `--shadow-*`/`--glow-*` (review) |
| `#3d1515` | 1 | effect 1 | 205 | `--shadow-*`/`--glow-*` (review) |
| `#7c3aed` | 1 | text 1 | 230 | `--data-5 (deep)` |
| `#a78bfa` | 1 | text 1 | 273 | `--data-5 (tint)` |
| `#dc2626` | 1 | text 1 | 205 | `--danger-strong` |

### `js/programs/catalog/strength.js` — 24 literals, 9 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#1a0a0a` | 6 | effect 6 | 30, 79, 104, 157, 206, 354 | `--shadow-*`/`--glow-*` (review) |
| `#3d1515` | 4 | effect 4 | 30, 104, 157, 354 | `--shadow-*`/`--glow-*` (review) |
| `#ef4444` | 3 | text 3 | 30, 79, 206 | `--danger` |
| `#1a0a00` | 2 | effect 2 | 250, 299 | `--shadow-*`/`--glow-*` (review) |
| `#2d0a0a` | 2 | effect 2 | 79, 206 | `--shadow-*`/`--glow-*` (review) |
| `#2d1a00` | 2 | effect 2 | 250, 299 | `--shadow-*`/`--glow-*` (review) |
| `#dc2626` | 2 | text 2 | 157, 354 | `--danger-strong` |
| `#f59e0b` | 2 | text 2 | 250, 299 | `--warn` |
| `#f97316` | 1 | text 1 | 104 | `--data-7/--brand-today` |

### `js/analytics/views/view-muscles.js` — 23 literals, 23 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#047857` | 1 | decoration 1 | 31 | `--ok-ink (light)` |
| `#0e7490` | 1 | decoration 1 | 28 | `--accent-strong (styles Midnight)` |
| `#10b981` | 1 | decoration 1 | 31 | `--ok` |
| `#1d4ed8` | 1 | decoration 1 | 29 | `--info-strong` |
| `#22d3ee` | 1 | decoration 1 | 28 | `--accent (Midnight)` |
| `#34d399` | 1 | decoration 1 | 31 | `--ok (tint)` |
| `#3b82f6` | 1 | decoration 1 | 29 | `--info (Slate accent)` |
| `#60a5fa` | 1 | decoration 1 | 29 | `--info (tint)` |
| `#67e8f9` | 1 | decoration 1 | 28 | `--accent (tint)` |
| `#6d28d9` | 1 | decoration 1 | 30 | `--data-5 (deep)` |
| `#6ee7b7` | 1 | decoration 1 | 31 | `--ok` |
| `#8b5cf6` | 1 | decoration 1 | 30 | `--data-5` |
| `#93c5fd` | 1 | decoration 1 | 29 | `--info (tint)` |
| `#a78bfa` | 1 | decoration 1 | 30 | `--data-5 (tint)` |
| `#b45309` | 1 | decoration 1 | 32 | `--warn-ink (light)` |
| `#c4b5fd` | 1 | decoration 1 | 30 | `--data-5` |
| `#d97706` | 1 | decoration 1 | 32 | `--warn-strong` |
| `#f59e0b` | 1 | decoration 1 | 32 | `--warn` |
| `#fb923c` | 1 | decoration 1 | 33 | `--data-7 (tint)` |
| `#fbbf24` | 1 | decoration 1 | 32 | `--warn (tint)` |
| `#fcd34d` | 1 | decoration 1 | 32 | `--warn` |
| `#ff6b00` | 1 | decoration 1 | 33 | `--data-7 (legacy Coros)` |
| `rgba(148,163,184,0.45)` | 1 | text 1 | 35 | `--data-8-soft` |

### `js/programs/activation.js` — 23 literals, 19 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#cbd5e1` | 3 | fallback 3 | 155, 157, 171 | `--text-secondary` (delete fallback) |
| `#94a3b8` | 2 | fallback 2 | 168, 170 | `--text-muted` (delete fallback) |
| `#f8fafc` | 2 | fallback 2 | 154, 166 | `--text-inverse` (delete fallback) |
| `#10b981` | 1 | text 1 | 160 | `--ok` |
| `#3b82f6` | 1 | fallback 1 | 165 | `--color-blue` (delete fallback) |
| `#60a5fa` | 1 | text 1 | 161 | `--info (tint)` |
| `#f59e0b` | 1 | text 1 | 159 | `--warn` |
| `#fca5a5` | 1 | text 1 | 167 | `--danger-soft (text)` |
| `#ffffff` | 1 | text 1 | 165 | `--text-white/--accent-ink` |
| `rgba(0,0,0,0.55)` | 1 | effect 1 | 151 | `--shadow-*` |
| `rgba(18,22,34,0.98)` | 1 | effect 1 | 150 | `--data-*`/review |
| `rgba(239,68,68,0.12)` | 1 | surface 1 | 167 | `--danger-soft` |
| `rgba(239,68,68,0.35)` | 1 | border 1 | 167 | `--danger-soft` |
| `rgba(255,255,255,0.05)` | 1 | surface 1 | 169 | `--overlay-*` |
| `rgba(255,255,255,0.06)` | 1 | surface 1 | 166 | `--overlay-*` |
| `rgba(255,255,255,0.12)` | 1 | effect 1 | 151 | `--overlay-*` |
| `rgba(255,255,255,0.14)` | 1 | border 1 | 166 | `--overlay-*` |
| `rgba(30,34,48,0.98)` | 1 | effect 1 | 150 | `--data-*`/review |
| `rgba(5,8,16,0.64)` | 1 | surface 1 | 145 | `--data-*`/review |

### `js/athlete-profile.js` — 22 literals, 20 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f8fafc` | 3 | decoration 3 | 364, 379, 411 | `--text-primary (Slate)/--text-inverse` |
| `#05060f` | 1 | decoration 1 | 337 | `(review)` |
| `#0a0612` | 1 | decoration 1 | 337 | `(review)` |
| `#140a2c` | 1 | decoration 1 | 337 | `(review)` |
| `#1a0e2e` | 1 | effect 1 | 161 | `--cover-default` |
| `#2d1a5c` | 1 | effect 1 | 161 | `--shadow-*`/`--glow-*` (review) |
| `#4f46e5` | 1 | decoration 1 | 354 | `--border-focus (legacy indigo)` |
| `#64748b` | 1 | decoration 1 | 420 | `--text-ghost` |
| `#7c3aed` | 1 | decoration 1 | 354 | `--data-5 (deep)` |
| `#7c8aa0` | 1 | decoration 1 | 413 | `(review)` |
| `#8b5cf6` | 1 | decoration 1 | 173 | `--data-5` |
| `#94a3b8` | 1 | decoration 1 | 396 | `--text-secondary` |
| `#c4b5fd` | 1 | decoration 1 | 392 | `--data-5` |
| `#f59e0b` | 1 | decoration 1 | 366 | `--warn` |
| `#ffffff` | 1 | decoration 1 | 359 | `--text-white/--accent-ink` |
| `rgba(139,92,246,0.32)` | 1 | effect 1 | 340 | `--data-5-soft` |
| `rgba(139,92,246,0)` | 1 | effect 1 | 340 | `--data-5-soft` |
| `rgba(196,181,253,0.92)` | 1 | decoration 1 | 347 | `--data-*`/review |
| `rgba(255,255,255,0.04)` | 1 | decoration 1 | 373 | `--overlay-*` |
| `rgba(255,255,255,0.08)` | 1 | decoration 1 | 418 | `--overlay-*` |

### `js/programs/detail.js` — 22 literals, 11 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#8b5cf6` | 5 | decoration 3 · text 2 | 82, 89, 346, 479, 1204 | `--data-5` |
| `#22d3ee` | 3 | decoration 2 · text 1 | 344, 478, 1204 | `--accent (Midnight)` |
| `#ef4444` | 3 | decoration 2 · text 1 | 342, 478, 1204 | `--danger` |
| `#f59e0b` | 3 | decoration 2 · text 1 | 345, 479, 571 | `--warn` |
| `#10b981` | 2 | decoration 2 | 573, 1204 | `--ok` |
| `#0d1b2a` | 1 | effect 1 | 87 | `--cover-default` |
| `#1a0e2e` | 1 | effect 1 | 86 | `--cover-default` |
| `#3b82f6` | 1 | text 1 | 343 | `--info (Slate accent)` |
| `#64748b` | 1 | decoration 1 | 479 | `--text-ghost` |
| `#a78bfa` | 1 | decoration 1 | 478 | `--data-5 (tint)` |
| `rgba(255,255,255,0.12)` | 1 | border 1 | 453 | `--overlay-*` |

### `js/programs/catalog/running.js` — 21 literals, 12 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 4 | text 4 | 30, 238, 285, 368 | `--accent (Midnight)` |
| `#001a10` | 2 | effect 2 | 189, 238 | `--shadow-*`/`--glow-*` (review) |
| `#00301a` | 2 | effect 2 | 189, 238 | `--shadow-*`/`--glow-*` (review) |
| `#0a1020` | 2 | effect 2 | 285, 368 | `--shadow-*`/`--glow-*` (review) |
| `#0a1628` | 2 | effect 2 | 30, 83 | `--shadow-*`/`--glow-*` (review) |
| `#10b981` | 2 | text 2 | 139, 189 | `--ok` |
| `#1e3a5f` | 2 | effect 2 | 30, 83 | `--shadow-*`/`--glow-*` (review) |
| `#06b6d4` | 1 | text 1 | 83 | `--accent (near-dup)` |
| `#0a2818` | 1 | effect 1 | 139 | `--shadow-*`/`--glow-*` (review) |
| `#0d1f35` | 1 | effect 1 | 368 | `--shadow-*`/`--glow-*` (review) |
| `#0d2435` | 1 | effect 1 | 285 | `--shadow-*`/`--glow-*` (review) |
| `#1a4731` | 1 | effect 1 | 139 | `--shadow-*`/`--glow-*` (review) |

### `js/analytics/charts/fasting-charts.js` — 19 literals, 13 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `rgba(255,255,255,0.07)` | 7 | data-viz 7 | 43, 106, 158, 214, 244, 299, 332 | `--data-*` (§8) |
| `#10b981` | 1 | decoration 1 | 12 | `--ok` |
| `#3b82f6` | 1 | decoration 1 | 11 | `--info (Slate accent)` |
| `#8b5cf6` | 1 | decoration 1 | 13 | `--data-5` |
| `#f59e0b` | 1 | decoration 1 | 9 | `--warn` |
| `#f97316` | 1 | decoration 1 | 10 | `--data-7/--brand-today` |
| `rgba(139,92,246,0.35)` | 1 | data-viz 1 | 263 | `--data-*` (§8) |
| `rgba(139,92,246,0.55)` | 1 | data-viz 1 | 264 | `--data-*` (§8) |
| `rgba(255,255,255,0.3)` | 1 | text 1 | 210 | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 1 | text 1 | 289 | `--overlay-*` |
| `rgba(255,255,255,0.45)` | 1 | decoration 1 | 14 | `--overlay-*` |
| `rgba(255,255,255,0.50)` | 1 | data-viz 1 | 305 | `--data-*` (§8) |
| `rgba(255,255,255,0.65)` | 1 | text 1 | 207 | `--overlay-*` |

### `js/brain/hybrid-score/share-card.js` — 19 literals, 16 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 2 | decoration 2 | 102, 121 | `--text-secondary` |
| `#f59e0b` | 2 | decoration 2 | 19, 92 | `--warn` |
| `rgba(255,255,255,0.08)` | 2 | decoration 2 | 72, 118 | `--overlay-*` |
| `#05060f` | 1 | decoration 1 | 51 | `(review)` |
| `#0a0612` | 1 | decoration 1 | 51 | `(review)` |
| `#10b981` | 1 | decoration 1 | 19 | `--ok` |
| `#120a24` | 1 | decoration 1 | 51 | `(review)` |
| `#3b82f6` | 1 | decoration 1 | 19 | `--info (Slate accent)` |
| `#8b97a8` | 1 | decoration 1 | 85 | `(review)` |
| `#cbd5e1` | 1 | decoration 1 | 108 | `--text-sub` |
| `#f8fafc` | 1 | decoration 1 | 81 | `--text-primary (Slate)/--text-inverse` |
| `rgba()` | 1 | decoration 1 | 125 | `(review)` |
| `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})` | 1 | decoration 1 | 130 | `(review)` |
| `rgba(226,232,240,0.92)` | 1 | decoration 1 | 60 | `--data-*`/review |
| `rgba(255,255,255,0.04)` | 1 | decoration 1 | 104 | `--overlay-*` |
| `rgba(255,255,255,0.10)` | 1 | decoration 1 | 112 | `--overlay-*` |

### `js/programs/catalog.js` — 19 literals, 15 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 2 | text 2 | 24, 36 | `--ok` |
| `#dc2626` | 2 | text 2 | 21, 39 | `--danger-strong` |
| `#ef4444` | 2 | text 2 | 19, 38 | `--danger` |
| `#f59e0b` | 2 | text 2 | 25, 37 | `--warn` |
| `#06b6d4` | 1 | text 1 | 26 | `--accent (near-dup)` |
| `#0ea5e9` | 1 | text 1 | 29 | `--text-*` (review) |
| `#22d3ee` | 1 | text 1 | 22 | `--accent (Midnight)` |
| `#38bdf8` | 1 | text 1 | 32 | `--text-*` (review) |
| `#3b82f6` | 1 | text 1 | 20 | `--info (Slate accent)` |
| `#7c3aed` | 1 | text 1 | 23 | `--data-5 (deep)` |
| `#84cc16` | 1 | text 1 | 27 | `--accent-alt` |
| `#86efac` | 1 | text 1 | 30 | `--text-*` (review) |
| `#8b5cf6` | 1 | text 1 | 18 | `--data-5` |
| `#e879f9` | 1 | text 1 | 28 | `--text-*` (review) |
| `#fb923c` | 1 | text 1 | 31 | `--data-7 (tint)` |

### `js/profile-stats.js` — 18 literals, 15 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 2 | decoration 1 · text 1 | 95, 390 | `--accent (Midnight)` |
| `rgba(139,92,246,${a})` | 2 | surface 1 · effect 1 | 53, 56 | `--data-5-soft` |
| `rgba(6,182,212,${a})` | 2 | surface 1 · effect 1 | 54, 56 | `--data-*`/review |
| `#10b981` | 1 | text 1 | 391 | `--ok` |
| `#1a0e2e` | 1 | effect 1 | 653 | `--cover-default` |
| `#2d1a5c` | 1 | effect 1 | 653 | `--shadow-*`/`--glow-*` (review) |
| `#94a3b8` | 1 | text 1 | 389 | `--text-secondary` |
| `#c4b5fd` | 1 | decoration 1 | 586 | `--data-5` |
| `#ef4444` | 1 | text 1 | 393 | `--danger` |
| `#f59e0b` | 1 | text 1 | 392 | `--warn` |
| `rgba(139,92,246,0.8)` | 1 | surface 1 | 127 | `--data-5-soft` |
| `rgba(148,163,184,${heatmap_alpha[l]})` | 1 | surface 1 | 124 | `--data-8-soft` |
| `rgba(34,211,238,0.30)` | 1 | decoration 1 | 90 | `--accent-soft`/`--border-focus` |
| `rgba(34,211,238,0)` | 1 | decoration 1 | 91 | `--accent-soft`/`--border-focus` |
| `rgba(6,182,212,0.8)` | 1 | surface 1 | 128 | `--data-*`/review |

### `js/analytics/charts/recovery-charts.js` — 16 literals, 12 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 3 | text 2 · decoration 1 | 47, 118, 155 | `--ok` |
| `#818cf8` | 2 | text 2 | 99, 108 | `--data-2 (tint)` |
| `rgba(255,255,255,0.55)` | 2 | data-viz 2 | 81, 88 | `--data-*` (§8) |
| `#3b82f6` | 1 | text 1 | 148 | `--info (Slate accent)` |
| `#ef4444` | 1 | text 1 | 132 | `--danger` |
| `#f59e0b` | 1 | text 1 | 165 | `--warn` |
| `#f97316` | 1 | text 1 | 179 | `--data-7/--brand-today` |
| `rgba(255,255,255,0.08)` | 1 | data-viz 1 | 204 | `--data-*` (§8) |
| `rgba(255,255,255,0.4)` | 1 | decoration 1 | 66 | `--overlay-*` |
| `rgba(255,255,255,0.5)` | 1 | text 1 | 19 | `--overlay-*` |
| `rgba(255,255,255,0.6)` | 1 | data-viz 1 | 211 | `--data-*` (§8) |
| `rgba(255,255,255,0.65)` | 1 | data-viz 1 | 60 | `--data-*` (§8) |

### `js/ui/celebration.js` — 14 literals, 12 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f59e0b` | 2 | decoration 1 · text 1 | 19, 65 | `--warn` |
| `#f8fafc` | 2 | decoration 1 · fallback 1 | 19, 66 | `--text-primary (Slate)/--text-inverse` |
| `#10b981` | 1 | decoration 1 | 19 | `--ok` |
| `#3b82f6` | 1 | decoration 1 | 19 | `--info (Slate accent)` |
| `#8b5cf6` | 1 | decoration 1 | 19 | `--data-5` |
| `#94a3b8` | 1 | fallback 1 | 67 | `--text-muted` (delete fallback) |
| `rgba(0,0,0,0.5)` | 1 | effect 1 | 61 | `--shadow-*` |
| `rgba(255,255,255,0.03)` | 1 | effect 1 | 59 | `--overlay-*` |
| `rgba(255,255,255,0.09)` | 1 | effect 1 | 59 | `--overlay-*` |
| `rgba(255,255,255,0.14)` | 1 | decoration 1 | 60 | `--overlay-*` |
| `rgba(255,255,255,0.35)` | 1 | text 1 | 68 | `--overlay-*` |
| `rgba(5,8,16,0.62)` | 1 | surface 1 | 51 | `--data-*`/review |

### `js/programs/program-card.js` — 12 literals, 5 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0d1b2a` | 4 | effect 2 · decoration 2 | 79, 80, 172, 173 | `--cover-default` |
| `#1a0e2e` | 4 | effect 2 · decoration 2 | 79, 80, 172, 173 | `--cover-default` |
| `#8b5cf6` | 2 | decoration 2 | 82, 174 | `--data-5` |
| `rgba(4,10,18,0.02)` | 1 | effect 1 | 42 | `--data-*`/review |
| `rgba(4,10,18,0.52)` | 1 | effect 1 | 42 | `--data-*`/review |

### `js/share/workout-share.js` — 12 literals, 8 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#e7ecf3` | 3 | decoration 3 | 127, 142, 157 | `(review)` |
| `#22d3ee` | 2 | decoration 2 | 123, 152 | `--accent (Midnight)` |
| `#94a3b8` | 2 | decoration 2 | 133, 161 | `--text-secondary` |
| `#0b1220` | 1 | decoration 1 | 117 | `(review)` |
| `#101a2b` | 1 | decoration 1 | 118 | `(review)` |
| `#6b7688` | 1 | decoration 1 | 177 | `(review)` |
| `#7c8ba1` | 1 | decoration 1 | 145 | `(review)` |
| `#fbbf24` | 1 | decoration 1 | 170 | `--warn (tint)` |

### `js/analytics/charts/chart-primitives.js` — 11 literals, 11 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0d1117` | 1 | data-viz 1 | 62 | `--chart-stroke` |
| `#3b82f6` | 1 | text 1 | 112 | `--info (Slate accent)` |
| `#60a5fa` | 1 | data-viz 1 | 49 | `--info (tint)` |
| `#ef4444` | 1 | decoration 1 | 106 | `--danger` |
| `#f59e0b` | 1 | text 1 | 69 | `--warn` |
| `rgba(255,255,255,0.08)` | 1 | data-viz 1 | 36 | `--data-*` (§8) |
| `rgba(255,255,255,0.3)` | 1 | text 1 | 83 | `--overlay-*` |
| `rgba(255,255,255,0.4)` | 1 | decoration 1 | 106 | `--overlay-*` |
| `rgba(255,255,255,0.45)` | 1 | data-viz 1 | 37 | `--data-*` (§8) |
| `rgba(255,255,255,0.55)` | 1 | data-viz 1 | 49 | `--data-*` (§8) |
| `rgba(255,255,255,0.6)` | 1 | text 1 | 93 | `--overlay-*` |

### `js/analytics/views/view-progress.js` — 11 literals, 8 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ffffff` | 4 | text 4 | 33, 34, 35, 36 | `--text-white/--accent-ink` |
| `#3b82f6` | 1 | text 1 | 33 | `--info (Slate accent)` |
| `#6366f1` | 1 | fallback 1 | 155 | `--color-indigo` (delete fallback) |
| `rgba(245,158,11,0.06)` | 1 | surface 1 | 92 | `--warn-soft` |
| `rgba(245,158,11,0.3)` | 1 | decoration 1 | 92 | `--warn-soft` |
| `rgba(59,130,246,0.06)` | 1 | surface 1 | 78 | `--info-soft` |
| `rgba(59,130,246,0.1)` | 1 | surface 1 | 31 | `--info-soft` |
| `rgba(59,130,246,0.28)` | 1 | decoration 1 | 78 | `--info-soft` |

### `js/session-recap.js` — 11 literals, 10 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#334155` | 2 | decoration 2 | 429, 525 | `--text-strong (light)` |
| `#10b981` | 1 | decoration 1 | 339 | `--ok` |
| `#34d399` | 1 | decoration 1 | 322 | `--ok (tint)` |
| `#3b82f6` | 1 | decoration 1 | 339 | `--info (Slate accent)` |
| `#60a5fa` | 1 | decoration 1 | 322 | `--info (tint)` |
| `#94a3b8` | 1 | decoration 1 | 323 | `--text-secondary` |
| `#ef4444` | 1 | decoration 1 | 339 | `--danger` |
| `#f472b6` | 1 | decoration 1 | 322 | `--data-6 (tint)` |
| `#f59e0b` | 1 | decoration 1 | 339 | `--warn` |
| `#f97316` | 1 | decoration 1 | 339 | `--data-7/--brand-today` |

### `js/workout/run-type.js` — 10 literals, 9 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#64748b` | 2 | text 2 | 15, 16 | `--text-ghost` |
| `#10b981` | 1 | text 1 | 12 | `--ok` |
| `#22d3ee` | 1 | text 1 | 13 | `--accent (Midnight)` |
| `#8b5cf6` | 1 | text 1 | 11 | `--data-5` |
| `#a855f7` | 1 | text 1 | 14 | `--data-5 (near-dup)` |
| `#ec4899` | 1 | text 1 | 8 | `--data-6` |
| `#ef4444` | 1 | text 1 | 7 | `--danger` |
| `#f59e0b` | 1 | text 1 | 10 | `--warn` |
| `#f97316` | 1 | text 1 | 9 | `--data-7/--brand-today` |

### `js/analytics/share-card.js` — 9 literals, 6 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 3 | decoration 3 | 49, 59, 68 | `--text-secondary` |
| `#f8fafc` | 2 | decoration 2 | 44, 63 | `--text-primary (Slate)/--text-inverse` |
| `#020408` | 1 | decoration 1 | 35 | `--bg-app (Slate)` |
| `#22d3ee` | 1 | decoration 1 | 40 | `--accent (Midnight)` |
| `#475569` | 1 | decoration 1 | 76 | `--text-secondary (light)` |
| `rgba(255,255,255,0.05)` | 1 | decoration 1 | 56 | `--overlay-*` |

### `js/programs/library.js` — 8 literals, 8 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0d1b2a` | 1 | effect 1 | 900 | `--cover-default` |
| `#10b981` | 1 | text 1 | 266 | `--ok` |
| `#1a0e2e` | 1 | effect 1 | 900 | `--cover-default` |
| `#8b5cf6` | 1 | decoration 1 | 151 | `--data-5` |
| `#dc2626` | 1 | text 1 | 269 | `--danger-strong` |
| `#ef4444` | 1 | text 1 | 268 | `--danger` |
| `#f59e0b` | 1 | text 1 | 267 | `--warn` |
| `rgba(239,68,68,0.2)` | 1 | border 1 | 892 | `--danger-soft` |

### `js/analytics/recovery-detail.js` — 7 literals, 7 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | decoration 1 | 64 | `--ok` |
| `#14b8a6` | 1 | text 1 | 109 | `--data-3 (teal)` |
| `#22d3ee` | 1 | text 1 | 86 | `--accent (Midnight)` |
| `#6366f1` | 1 | text 1 | 80 | `--text-*` (review) |
| `#a855f7` | 1 | text 1 | 118 | `--data-5 (near-dup)` |
| `#ef4444` | 1 | text 1 | 102 | `--danger` |
| `#f59e0b` | 1 | text 1 | 95 | `--warn` |

### `js/app.js` — 7 literals, 7 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0d1b2a` | 1 | effect 1 | 1205 | `--cover-default` |
| `#10b981` | 1 | decoration 1 | 1574 | `--ok` |
| `#1a0e2e` | 1 | effect 1 | 1204 | `--cover-default` |
| `#8b5cf6` | 1 | decoration 1 | 1207 | `--data-5` |
| `#ef4444` | 1 | decoration 1 | 1574 | `--danger` |
| `rgba(255,255,255,0.05)` | 1 | decoration 1 | 1535 | `--overlay-*` |
| `rgba(255,255,255,0.5)` | 1 | decoration 1 | 1534 | `--overlay-*` |

### `js/brain/hybrid-score/config.js` — 7 literals, 7 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | text 1 | 94 | `--ok` |
| `#22c55e` | 1 | text 1 | 95 | `--text-*` (review) |
| `#3b82f6` | 1 | text 1 | 96 | `--info (Slate accent)` |
| `#ef4444` | 1 | text 1 | 99 | `--danger` |
| `#f59e0b` | 1 | text 1 | 97 | `--warn` |
| `#f97316` | 1 | text 1 | 98 | `--data-7/--brand-today` |
| `rgba(255,255,255,0.4)` | 1 | text 1 | 103 | `--overlay-*` |

### `js/brain/hybrid-score/ui.js` — 7 literals, 6 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#94a3b8` | 2 | fallback 2 | 24, 46 | `--hs-accent` (delete fallback) |
| `#10b981` | 1 | decoration 1 | 16 | `--ok` |
| `#3b82f6` | 1 | decoration 1 | 16 | `--info (Slate accent)` |
| `#f59e0b` | 1 | decoration 1 | 16 | `--warn` |
| `#f8fafc` | 1 | fallback 1 | 45 | `--text-inverse` (delete fallback) |
| `rgba(255,255,255,0.09)` | 1 | decoration 1 | 41 | `--overlay-*` |

### `js/brain/pr-share.js` — 7 literals, 7 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#0b0e13` | 1 | decoration 1 | 36 | `(review)` |
| `#160b24` | 1 | decoration 1 | 35 | `(review)` |
| `#6b7688` | 1 | decoration 1 | 65 | `(review)` |
| `#8b5cf6` | 1 | decoration 1 | 57 | `--data-5` |
| `#9aa7b8` | 1 | decoration 1 | 60 | `(review)` |
| `#a78bfa` | 1 | decoration 1 | 43 | `--data-5 (tint)` |
| `#e7ecf3` | 1 | decoration 1 | 52 | `(review)` |

### `scripts/measures-browser-check.mjs` — 7 literals, 7 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | decoration 1 | 160 | `--ok` |
| `#22d3ee` | 1 | decoration 1 | 156 | `--accent (Midnight)` |
| `#8b5cf6` | 1 | decoration 1 | 156 | `--data-5` |
| `#ef4444` | 1 | decoration 1 | 157 | `--danger` |
| `#f59e0b` | 1 | decoration 1 | 157 | `--warn` |
| `#facc15` | 1 | decoration 1 | 160 | `--warn (yellow)` |
| `rgba(255,255,255,0.85)` | 1 | decoration 1 | 94 | `--overlay-*` |

### `js/fasting.js` — 6 literals, 6 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | text 1 | 28 | `--info (Slate accent)` |
| `#6b7280` | 1 | text 1 | 19 | `--text-*` (review) |
| `#8b5cf6` | 1 | text 1 | 37 | `--data-5` |
| `#ef4444` | 1 | text 1 | 64 | `--danger` |
| `#f59e0b` | 1 | text 1 | 46 | `--warn` |
| `#f97316` | 1 | text 1 | 55 | `--data-7/--brand-today` |

### `js/workout/run-logging.js` — 6 literals, 6 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | decoration 1 | 78 | `--ok` |
| `#22d3ee` | 1 | decoration 1 | 78 | `--accent (Midnight)` |
| `#ef4444` | 1 | decoration 1 | 78 | `--danger` |
| `#f59e0b` | 1 | decoration 1 | 78 | `--warn` |
| `#f97316` | 1 | decoration 1 | 78 | `--data-7/--brand-today` |
| `#ffffff` | 1 | text 1 | 127 | `--text-white/--accent-ink` |

### `js/workout/superset.js` — 6 literals, 6 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#06b6d4` | 1 | decoration 1 | 34 | `--accent (near-dup)` |
| `#10b981` | 1 | decoration 1 | 31 | `--ok` |
| `#3b82f6` | 1 | decoration 1 | 29 | `--info (Slate accent)` |
| `#a855f7` | 1 | decoration 1 | 30 | `--data-5 (near-dup)` |
| `#ec4899` | 1 | decoration 1 | 33 | `--data-6` |
| `#f59e0b` | 1 | decoration 1 | 32 | `--warn` |

### `js/home/tile-renderers.js` — 5 literals, 5 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | surface 1 | 126 | `--info (Slate accent)` |
| `#ec4899` | 1 | surface 1 | 127 | `--data-6` |
| `rgba(0,0,0,0.10)` | 1 | decoration 1 | 86 | `--overlay-*` (light) |
| `rgba(255,255,255,0.10)` | 1 | decoration 1 | 86 | `--overlay-*` |
| `rgba(255,255,255,0.18)` | 1 | text 1 | 38 | `--overlay-*` |

### `js/programs/catalog/jt-shed.js` — 5 literals, 3 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#2a1a05` | 2 | effect 2 | 185, 371 | `--shadow-*`/`--glow-*` (review) |
| `#3d2a0a` | 2 | effect 2 | 185, 371 | `--shadow-*`/`--glow-*` (review) |
| `#f59e0b` | 1 | decoration 1 | 19 | `--warn` |

### `js/workout/set-mutations.js` — 5 literals, 5 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#1e293b` | 1 | surface 1 | 254 | `--bg-raised (light inverse)` |
| `#60a5fa` | 1 | text 1 | 259 | `--info (tint)` |
| `#f8fafc` | 1 | text 1 | 254 | `--text-primary (Slate)/--text-inverse` |
| `rgba(0,0,0,0.4)` | 1 | effect 1 | 255 | `--shadow-*` |
| `rgba(255,255,255,0.14)` | 1 | decoration 1 | 254 | `--overlay-*` |

### `js/analytics/strength-detail.js` — 4 literals, 3 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 2 | decoration 1 · text 1 | 22, 37 | `--info (Slate accent)` |
| `#10b981` | 1 | text 1 | 42 | `--ok` |
| `#8b5cf6` | 1 | text 1 | 32 | `--data-5` |

### `js/analytics/views/view-weekly-review.js` — 4 literals, 4 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | text 1 | 169 | `--ok` |
| `#3b82f6` | 1 | text 1 | 165 | `--info (Slate accent)` |
| `rgba(245,158,11,0.35)` | 1 | decoration 1 | 60 | `--warn-soft` |
| `rgba(59,130,246,0.35)` | 1 | decoration 1 | 64 | `--info-soft` |

### `js/fasting/fasting-ring.js` — 4 literals, 4 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#6b7280` | 1 | decoration 1 | 28 | `(review)` |
| `#94a3b8` | 1 | fallback 1 | 45 | `--text-muted` (delete fallback) |
| `#f8fafc` | 1 | fallback 1 | 41 | `--text-inverse` (delete fallback) |
| `rgba(255,255,255,0.09)` | 1 | decoration 1 | 35 | `--overlay-*` |

### `js/programs/compare-ui.js` — 4 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 2 | decoration 1 · text 1 | 100, 109 | `--accent (Midnight)` |
| `#8b5cf6` | 2 | decoration 1 · text 1 | 99, 108 | `--data-5` |

### `js/gps-tracker.js` — 3 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f43f5e` | 2 | text 2 | 187, 196 | `--danger (rose)` |
| `#ffffff` | 1 | text 1 | 196 | `--text-white/--accent-ink` |

### `js/programs/catalog/shed-pplul.js` — 3 literals, 3 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#2a1405` | 1 | effect 1 | 136 | `--shadow-*`/`--glow-*` (review) |
| `#3d2208` | 1 | effect 1 | 136 | `--shadow-*`/`--glow-*` (review) |
| `#f97316` | 1 | decoration 1 | 19 | `--data-7/--brand-today` |

### `js/analytics/views/view-balance.js` — 2 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 1 | fallback 1 | 73 | `--color-cyan` (delete fallback) |
| `#8b5cf6` | 1 | fallback 1 | 72 | `--color-violet` (delete fallback) |

### `js/analytics/views/view-endurance.js` — 2 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | fallback 1 | 14 | `--color-blue` (delete fallback) |
| `rgba(148,163,184,0.55)` | 1 | text 1 | 15 | `--data-8-soft` |

### `js/analytics/views/view-exercises.js` — 2 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#10b981` | 1 | fallback 1 | 15 | `--color-green` (delete fallback) |
| `#f59e0b` | 1 | fallback 1 | 16 | `--color-amber` (delete fallback) |

### `js/workout-map.js` — 2 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#f43f5e` | 2 | text 2 | 41, 75 | `--danger (rose)` |

### `manifest.json` — 2 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#020408` | 2 | surface 2 | 28, 29 | `--bg-app (Slate)` |

### `scripts/generate-icons.mjs` — 2 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#070a12` | 2 | decoration 2 | 27, 28 | `--bg-app (Midnight)` |

### `scripts/photo-browser-check.mjs` — 2 literals, 2 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#22d3ee` | 1 | decoration 1 | 125 | `--accent (Midnight)` |
| `#8b5cf6` | 1 | decoration 1 | 125 | `--data-5` |

### `js/analytics/calculations/volume-landmarks.js` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `rgba(255,255,255,0.25)` | 1 | decoration 1 | 126 | `--overlay-*` |

### `js/analytics/scoring/readiness-scoring.js` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `rgba(255,255,255,0.4)` | 1 | decoration 1 | 234 | `--overlay-*` |

### `js/util.js` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | decoration 1 | 11 | `--info (Slate accent)` |

### `js/workout.js` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#ffffff` | 1 | text 1 | 746 | `--text-white/--accent-ink` |

### `android/app/src/main/res/values/colors.xml` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#070a12` | 1 | surface 1 | 3 | `--bg-app (Midnight)` |

### `scripts/active-program-edit-browser-check.mjs` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | decoration 1 | 57 | `--info (Slate accent)` |

### `scripts/exercise-picker-browser-check.mjs` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#3b82f6` | 1 | decoration 1 | 58 | `--info (Slate accent)` |

### `scripts/bodyweight-browser-check.mjs` — 1 literals, 1 distinct

| Value | n | Purpose | Lines | Token |
|---|---:|---|---|---|
| `#a3e635` | 1 | decoration 1 | 101 | `--accent-alt (lime)` |


## Appendix C — method and limitations

- Extraction: a Node scanner over `js/**/*.js`, `css/*.css`, `index.html`, `manifest.json`,
  `android/**`, `scripts/*.mjs`, `sw.js`. It matched `#rgb/#rgba/#rrggbb/#rrggbbaa`, `rgb()`,
  `rgba()`, `hsl()`, `hwb()`, `lab/lch/oklab/oklch`, and named CSS colours in colour-valued
  declarations. `transparent` and `currentColor` are excluded as keywords, not values (269 and 12
  occurrences respectively).
- `js/vendor/**` (Leaflet) is reported but excluded from totals except where noted.
- Purpose is inferred from the CSS property or the nearest JS property/attribute. Multi-line
  declarations and template-literal concatenation can misclassify; “decoration” is the fallback.
  Appendix tokens are a mechanical first pass and must be confirmed in A1.
- Named CSS colours: 21 matches, 20 false positives (`white-space`, `tier:'silver'`, prose). The
  one real use is `color: white` at `css/styles.css:5409`.
- The scanner counts literals, not painted pixels. A literal inside a dead rule (for example
  `.day-pill.active` before the brand override) still counts, because A1 must delete it.
- Contrast figures were computed with sRGB relative luminance and alpha compositing over the
  stated surface; they are reproducible from the cited values.
- This audit does not evaluate icon PNGs, `assets/` imagery or exercise media.

## Appendix D — source data

The scanner output used to build Appendices A and B is reproducible from the repo. To re-run:
scan `js/`, `css/`, `index.html`, `manifest.json`, `android/` and `scripts/` for the literals
listed above, attribute each to its enclosing selector/property, then group by normalised value.
No scanner is committed in Phase A0 because it is audit tooling, not product code; A1 should
commit a ratchet test instead of a one-off script.
