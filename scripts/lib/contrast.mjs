// =============================================================================
// CONTRAST MATH (pure — no DOM, no browser)
//
// The one place that decides whether a foreground colour is legible on a
// backdrop. `scripts/contrast-audit.mjs` walks the real app and feeds pairs
// through here; `tests/contrast_math.test.js` proves the maths against rows
// that are known-bad in shipped CSS.
//
// Two rules this module exists to keep:
//   * text is composited (alpha over backdrop) BEFORE it is measured, because
//     `rgba(0,0,0,.42)` is not black, it is 3:1 grey on white;
//   * a backdrop is a SET of candidate colours, because a gradient paints
//     several. The worst candidate decides, never the average.
// =============================================================================

/** @typedef {{ r: number, g: number, b: number, a: number }} Color */

const NAMED = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  black: { r: 0, g: 0, b: 0, a: 1 },
  currentcolor: null,
};

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** @param {number} n @returns {string} */
function hex2(n) {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

/**
 * Parse one colour token into 0-255 channels plus alpha.
 *
 * Accepts the shapes Chromium actually serialises: hex 3/4/6/8, `rgb()`/
 * `rgba()` with commas or spaces, `color(srgb r g b / a)` (this is how a
 * resolved `color-mix()` comes back) and the handful of named colours we use.
 * Returns null for anything it cannot read — never a guess.
 *
 * @param {unknown} value
 * @returns {Color|null}
 */
export function parseColor(value) {
  if (value == null) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw) return null;
  if (raw in NAMED) {
    const named = NAMED[raw];
    return named ? { ...named } : null;
  }

  const hex = raw.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const digits = hex[1];
    const expand = (s) => parseInt(s.length === 1 ? s + s : s, 16);
    if (digits.length === 3 || digits.length === 4) {
      return {
        r: expand(digits[0]), g: expand(digits[1]), b: expand(digits[2]),
        a: digits.length === 4 ? expand(digits[3]) / 255 : 1,
      };
    }
    if (digits.length === 6 || digits.length === 8) {
      return {
        r: parseInt(digits.slice(0, 2), 16),
        g: parseInt(digits.slice(2, 4), 16),
        b: parseInt(digits.slice(4, 6), 16),
        a: digits.length === 8 ? parseInt(digits.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }

  // `color(srgb 0.06 0.43 0.5 / 0.12)` — the computed form of color-mix().
  const srgb = raw.match(/^color\(\s*srgb\s+([^)]+)\)$/);
  if (srgb) {
    const parts = srgb[1].split(/[\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const nums = parts.map(Number);
    if (nums.some((n) => !Number.isFinite(n))) return null;
    return {
      r: clamp(nums[0], 0, 1) * 255,
      g: clamp(nums[1], 0, 1) * 255,
      b: clamp(nums[2], 0, 1) * 255,
      a: nums.length > 3 ? clamp(nums[3], 0, 1) : 1,
    };
  }

  const fn = raw.match(/^(rgba?|hsla?)\(([^)]+)\)$/);
  if (fn) {
    const parts = fn[2].split(/[,/\s]+/).filter(Boolean);
    if (parts.length < 3) return null;
    if (fn[1].startsWith('rgb')) {
      const channel = (token) => (token.endsWith('%') ? (Number(token.slice(0, -1)) / 100) * 255 : Number(token));
      const nums = parts.slice(0, 4).map((p, i) => (i === 3 ? Number(p) : channel(p)));
      if (nums.some((n) => !Number.isFinite(n))) return null;
      return {
        r: clamp(nums[0], 0, 255), g: clamp(nums[1], 0, 255), b: clamp(nums[2], 0, 255),
        a: nums.length > 3 ? clamp(nums[3] > 1 ? nums[3] / 100 : nums[3], 0, 1) : 1,
      };
    }
    return hslToRgb(Number(parts[0]), Number(parts[1]) / 100, Number(parts[2]) / 100,
      parts.length > 3 ? Number(parts[3]) : 1);
  }

  // `color-mix(in srgb, <colour> N%, transparent)` that Chromium left unresolved.
  const mix = raw.match(/^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%,\s*transparent\)$/);
  if (mix) {
    const base = parseColor(mix[1]);
    if (!base) return null;
    return { ...base, a: base.a * (Number(mix[2]) / 100) };
  }

  return null;
}

/** @param {number} h @param {number} s @param {number} l @param {number} a @returns {Color} */
function hslToRgb(h, s, l, a) {
  const hue = ((h % 360) + 360) % 360 / 360;
  const sat = clamp(s, 0, 1);
  const lum = clamp(l, 0, 1);
  if (sat === 0) return { r: lum * 255, g: lum * 255, b: lum * 255, a: clamp(a, 0, 1) };
  const q = lum < 0.5 ? lum * (1 + sat) : lum + sat - lum * sat;
  const p = 2 * lum - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return {
    r: channel(hue + 1 / 3) * 255,
    g: channel(hue) * 255,
    b: channel(hue - 1 / 3) * 255,
    a: clamp(a, 0, 1),
  };
}

/**
 * Paint `fg` over `bg` (source-over). Returns an opaque colour.
 * @param {Color} fg @param {Color} bg @returns {Color}
 */
export function composite(fg, bg) {
  const a = clamp(fg.a ?? 1, 0, 1);
  const b = clamp(bg.a ?? 1, 0, 1);
  const outA = a + b * (1 - a);
  if (outA <= 0) return { r: 0, g: 0, b: 0, a: 1 };
  return {
    r: (fg.r * a + bg.r * b * (1 - a)) / outA,
    g: (fg.g * a + bg.g * b * (1 - a)) / outA,
    b: (fg.b * a + bg.b * b * (1 - a)) / outA,
    a: outA,
  };
}

/** WCAG 2.x relative luminance of an opaque colour. @param {Color} c */
export function relativeLuminance(c) {
  const channel = (v) => {
    const x = clamp(v / 255, 0, 1);
    return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(c.r) + 0.7152 * channel(c.g) + 0.0722 * channel(c.b);
}

/** @param {Color} a @param {Color} b */
export function contrastRatio(a, b) {
  const x = relativeLuminance(a);
  const y = relativeLuminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** @param {Color} c */
export function cssColor(c) {
  const solid = c.a >= 0.999
    ? `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`
    : `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${c.a.toFixed(2)})`;
  return solid;
}

const COLOR_TOKEN = /#[0-9a-fA-F]{3,8}\b|(?:rgba?|hsla?)\([^)]*\)|color\([^)]*\)|color-mix\([^)]*\)/g;
const NAMED_TOKEN = /\b(?:white|black|transparent)\b/gi;

/**
 * Extract every colour a `background-image` can paint.
 *
 * We deliberately do not model gradient geometry: the caller needs the set of
 * colours that can appear UNDER a text run, and the worst one decides. An
 * angled gradient's stops are all candidates, which over-reports at the ends
 * and never under-reports. Callers mark such rows `approximate`.
 *
 * @param {string} value a computed `background-image`
 * @returns {Color[]}
 */
export function gradientStops(value) {
  if (!value || value === 'none') return [];
  const found = String(value).match(COLOR_TOKEN) || [];
  // Drop the `linear-gradient(...)` function name and its arguments' numbers;
  // only real colour tokens survive parseColor.
  const colours = found.map(parseColor).filter(Boolean);
  if (colours.length) return colours;
  // `linear-gradient(white, black)` without rgb()/hex wrappers.
  return (String(value).match(NAMED_TOKEN) || []).map(parseColor).filter(Boolean);
}

/** True when a background-image paints a bitmap we cannot read. @param {string} value */
export function hasImageBackdrop(value) {
  if (!value || value === 'none') return false;
  return /url\(/i.test(value) && !/gradient/i.test(value);
}

/**
 * WCAG "large text": >= 24px, or >= 18.66px at weight 700+.
 * @param {number} fontSizePx @param {number} fontWeight
 */
export function isLargeText(fontSizePx, fontWeight) {
  const size = Number(fontSizePx) || 0;
  const weight = Number(fontWeight) || 400;
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

/**
 * The AA floor for a text run. 3:1 for large text, 4.5:1 otherwise.
 * @param {{ fontSizePx: number, fontWeight: number }} style
 */
export function aaThreshold(style) {
  return isLargeText(style.fontSizePx, style.fontWeight) ? 3 : 4.5;
}

/**
 * Measure text against a set of candidate backdrops.
 *
 * Returns the worst ratio and the backdrop that produced it, so a report can
 * say "3.77:1 on #ffffff" instead of "somewhere in this gradient".
 *
 * @param {Color} foreground
 * @param {Color[]} backdrops
 * @returns {{ ratio: number, backdrop: Color|null, painted: Color|null }}
 */
export function worstContrast(foreground, backdrops) {
  let worst = Infinity;
  let worstBackdrop = null;
  let worstPainted = null;
  for (const backdrop of backdrops || []) {
    const painted = composite(foreground, backdrop);
    const ratio = contrastRatio(painted, backdrop);
    if (ratio < worst) {
      worst = ratio;
      worstBackdrop = backdrop;
      worstPainted = painted;
    }
  }
  return {
    ratio: Number.isFinite(worst) ? worst : 0,
    backdrop: worstBackdrop,
    painted: worstPainted,
  };
}

/**
 * Severity for a measured row.
 *
 * P0 is "cannot read this": below 1.8 is invisible, below 3 fails even the
 * large-text and non-text floor. P1 is body text under its AA floor, P2 large
 * text under 3. An approximate (gradient-estimated) row is never promoted to
 * P0 on the estimate alone unless it is genuinely invisible.
 *
 * @param {number} ratio @param {number} threshold
 * @param {{ approximate?: boolean }} [options]
 */
export function severityFor(ratio, threshold, options = {}) {
  if (ratio < 1.8) return 'P0';
  if (threshold > 3) {
    // Body text: below 3 is unreadable, below 4.5 is an AA miss.
    if (ratio < 3) return options.approximate ? 'P1' : 'P0';
    if (ratio < threshold) return 'P1';
    return null;
  }
  // Large text and non-text UI only owe 3:1.
  return ratio < threshold ? 'P2' : null;
}

/**
 * Rebuild an opaque grey at a sampled luminance.
 *
 * Pixel sampling gives luminance, not a colour; contrast only needs luminance,
 * so this is the exact bridge between them. (sRGB gamma is inverted here.)
 * @param {number} lum
 * @returns {Color}
 */
export function shadeFromLuminance(lum) {
  const linear = clamp(lum, 0, 1);
  const encoded = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  const shade = clamp(encoded, 0, 1) * 255;
  return { r: shade, g: shade, b: shade, a: 1 };
}

/**
 * Sample real pixels for a rect from a decoded full-page screenshot.
 *
 * The caller hides all text before shooting, so every pixel inside the rect is
 * backdrop. Antialiasing and stray glyph fragments are why we take luminance
 * percentiles rather than the single darkest pixel.
 *
 * @param {{ data: Uint8ClampedArray, width: number, height: number }} image
 * @param {{ x: number, y: number, width: number, height: number }} rect
 * @param {Color} foreground
 * @returns {{ ratio: number, backdrop: Color|null } | null}
 */
export function contrastFromPixels(image, rect, foreground) {
  const { data, width, height } = image;
  if (!width || !height) return null;
  const x0 = clamp(Math.floor(rect.x) + 1, 0, width - 1);
  const y0 = clamp(Math.floor(rect.y) + 1, 0, height - 1);
  const x1 = clamp(Math.ceil(rect.x + rect.width) - 1, x0 + 1, width);
  const y1 = clamp(Math.ceil(rect.y + rect.height) - 1, y0 + 1, height);
  if (x1 <= x0 || y1 <= y0) return null;

  const lum = [];
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * width + x) * 4;
      lum.push(relativeLuminance({ r: data[i], g: data[i + 1], b: data[i + 2], a: 1 }));
    }
  }
  if (!lum.length) return null;
  lum.sort((a, b) => a - b);
  return worstContrastFromLuminances([percentile(lum, 0.05), percentile(lum, 0.95)], foreground);
}

/**
 * Worst contrast against a set of sampled luminances (5th/95th percentile).
 * @param {number[]} luminances @param {Color} foreground
 * @returns {{ ratio: number, backdrop: Color|null }}
 */
export function worstContrastFromLuminances(luminances, foreground) {
  let worst = Infinity;
  let worstBackdrop = null;
  for (const lum of luminances) {
    if (!Number.isFinite(lum)) continue;
    const backdrop = shadeFromLuminance(lum);
    const ratio = contrastRatio(composite(foreground, backdrop), backdrop);
    if (ratio < worst) { worst = ratio; worstBackdrop = backdrop; }
  }
  return {
    ratio: Number.isFinite(worst) ? worst : 0,
    backdrop: worstBackdrop,
  };
}

/** @param {number[]} sorted @param {number} p */
function percentile(sorted, p) {
  if (!sorted.length) return NaN;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}
