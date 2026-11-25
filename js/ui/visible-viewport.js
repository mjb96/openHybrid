// @ts-check
// =============================================================================
// VISIBLE VIEWPORT HEIGHT
//
// On a phone, an open on-screen keyboard shrinks the area the user can actually
// see, but `100vh`/`100dvh` and `window.innerHeight` keep reporting the FULL
// screen height. A fixed, top-anchored panel sized with those units therefore
// runs its scroll area behind the keyboard. `window.visualViewport.height` is
// the real visible height, so this helper publishes it as the
// `--visible-viewport-height` CSS custom property and keeps it fresh while the
// keyboard opens/closes, the page scrolls, or the device rotates.
//
// It is deliberately dependency-free and injectable (pass a window-like object)
// so the sizing maths can be unit-tested without a real browser keyboard.
// =============================================================================

const CSS_VAR = '--visible-viewport-height';

/** The real visible viewport height in CSS pixels, or null when unknown. */
export function visibleViewportHeight(win) {
  const w = win || (typeof window !== 'undefined' ? window : undefined);
  if (!w) return null;
  const vv = w.visualViewport;
  const raw = vv && Number.isFinite(vv.height) ? vv.height : w.innerHeight;
  return Number.isFinite(raw) && raw > 0 ? raw : null;
}

/** Write the current visible viewport height to the CSS custom property. */
export function applyVisibleViewportHeight(win, doc) {
  const w = win || (typeof window !== 'undefined' ? window : undefined);
  const d = doc || (w && w.document) || (typeof document !== 'undefined' ? document : undefined);
  const h = visibleViewportHeight(w);
  if (h == null || !d?.documentElement) return null;
  const value = `${Math.round(h)}px`;
  // Setting a custom property invalidates style even when unchanged; this runs
  // on every visualViewport scroll, so skip the no-op writes.
  if (d.documentElement.style.getPropertyValue(CSS_VAR) !== value) {
    d.documentElement.style.setProperty(CSS_VAR, value);
  }
  return h;
}

/** Remove the CSS custom property so no stale height lingers after close. */
export function clearVisibleViewportHeight(doc) {
  const d = doc || (typeof document !== 'undefined' ? document : undefined);
  d?.documentElement?.style.removeProperty(CSS_VAR);
}

/**
 * Start tracking the visible viewport height. Applies it immediately and on
 * every visualViewport resize/scroll, orientation change and window resize.
 * Returns a teardown function that detaches every listener and clears the CSS
 * property — the caller MUST call it when the panel closes.
 * @returns {() => void}
 */
export function trackVisibleViewport(win) {
  const w = win || (typeof window !== 'undefined' ? window : undefined);
  if (!w) return () => {};
  const d = w.document;
  const update = () => applyVisibleViewportHeight(w, d);
  update();

  /** @type {Array<[any, string]>} */
  const bound = [];
  const add = (target, event) => {
    if (target && typeof target.addEventListener === 'function') {
      target.addEventListener(event, update);
      bound.push([target, event]);
    }
  };
  add(w.visualViewport, 'resize');
  add(w.visualViewport, 'scroll');
  add(w, 'resize');
  add(w, 'orientationchange');

  return () => {
    for (const [target, event] of bound) {
      try { target.removeEventListener(event, update); } catch { /* best effort */ }
    }
    clearVisibleViewportHeight(d);
  };
}

/**
 * How far a focused control must move to clear the keyboard. Positive scrolls
 * down (the control is below the visible area), negative scrolls up.
 * @param {{ top: number, bottom: number }} rect
 * @param {{ top: number, height: number }} viewport
 * @param {number} [margin]
 */
export function revealDelta(rect, viewport, margin = 16) {
  if (!rect || !viewport) return 0;
  const bottom = viewport.top + viewport.height;
  if (rect.bottom > bottom - margin) return rect.bottom - (bottom - margin);
  if (rect.top < viewport.top + margin) return rect.top - (viewport.top + margin);
  return 0;
}

/**
 * Keep a focused field above the on-screen keyboard (LG2). Installs delegated
 * focus handling once per app; the keyboard shrink is detected through
 * visualViewport, and the nearest scrollable ancestor is nudged (never the
 * page when a sheet owns the scroll).
 * @returns {() => void}
 */
export function trackFocusVisibility(win) {
  const w = win || (typeof window !== 'undefined' ? window : undefined);
  const d = w?.document;
  if (!w || !d) return () => {};
  /** @type {Element|null} */
  let focused = null;
  /** @type {any[]} */
  let timers = [];
  const isField = (el) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) && !el.readOnly;

  const scrollerFor = (el) => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = w.getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 2) return node;
    }
    return null;
  };

  const reveal = () => {
    if (!focused || !d.contains(focused)) return;
    const vv = w.visualViewport;
    const viewport = vv
      ? { top: vv.offsetTop, height: vv.height }
      : { top: 0, height: w.innerHeight };
    const delta = revealDelta(focused.getBoundingClientRect(), viewport, 16);
    if (!delta) return;
    const scroller = scrollerFor(focused);
    if (scroller) scroller.scrollTop += delta;
    else w.scrollBy(0, delta);
  };
  const settle = () => {
    timers.forEach((id) => w.clearTimeout(id));
    // The keyboard animates: check after it starts and again when it settles.
    timers = [w.setTimeout(reveal, 60), w.setTimeout(reveal, 320)];
  };

  const onFocus = (event) => {
    const field = /** @type {any} */ (event.target);
    if (!isField(field)) return;
    focused = field;
    // Numeric fields are one-value entries: close the keypad rather than
    // offering a return key that inserts a newline/blank.
    const mode = field.getAttribute?.('inputmode');
    if (mode && /numeric|decimal|tel/.test(mode) && !field.hasAttribute('enterkeyhint')) {
      field.setAttribute('enterkeyhint', 'done');
    }
    settle();
  };
  const onBlur = () => { focused = null; };

  d.addEventListener('focusin', onFocus);
  d.addEventListener('focusout', onBlur);
  if (w.visualViewport?.addEventListener) {
    w.visualViewport.addEventListener('resize', settle);
    w.visualViewport.addEventListener('scroll', settle);
  }
  return () => {
    timers.forEach((id) => w.clearTimeout(id));
    d.removeEventListener('focusin', onFocus);
    d.removeEventListener('focusout', onBlur);
    w.visualViewport?.removeEventListener?.('resize', settle);
    w.visualViewport?.removeEventListener?.('scroll', settle);
  };
}
