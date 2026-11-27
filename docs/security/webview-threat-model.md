# openHybrid Android WebView — Threat Model & Hardening

_Last reviewed against the shipped code: 2026-08-03._

openHybrid ships as a custom Android **WebView shell** (not Capacitor/TWA). The web
layer runs bundled assets and talks to six native `@JavascriptInterface`
bridges. Because those bridges reach real device capabilities (location, Health
Connect, notifications, file saving), the WebView is a **privileged execution
context** and is treated as a trust boundary.

## Assets & origins

- The app loads `https://appassets.androidplatform.net/assets/www/index.html`
  via `WebViewAssetLoader` (`MainActivity.configureWebView`). Content is served
  from the **bundled APK assets**, not a remote server — there is no live
  origin an attacker can MITM into the privileged context.
- `shouldOverrideUrlLoading` keeps only the `appassets.androidplatform.net`
  origin in-WebView; **every other URL opens in the user's external browser**,
  so a tapped external link can never run in the privileged context.
- `allowFileAccessFromFileURLs`, `allowUniversalAccessFromFileURLs` are
  **false**; zoom controls off; overscroll off. No `file://` access is needed
  because assets are served over the virtual https origin.

## Executable code — bundled and origin-restricted

Production runtime JavaScript is shipped inside the signed app/PWA bundle.
Third-party code does not execute from a CDN:

1. **Content-Security-Policy** (meta tag in `index.html`):
   `script-src 'self'` and `object-src 'none'` — arbitrary remote scripts,
   inline scripts, and plugins **cannot execute**.
   `frame-ancestors 'none'` blocks clickjacking; `base-uri 'self'` blocks base
   tag injection. Network destinations are separated by type: `connect-src` is
   limited to `'self'`, `img-src` allows the approved map tiles, and there are
   no third-party script, style or font origins.
2. **Leaflet is vendored** under `js/vendor/`, pinned to an exact version, and
   included in the service-worker precache.
3. The service worker has a regression guard that rejects remote-JavaScript
   cache entries.
4. There is no crash reporter or analytics SDK; handled errors stay in the
   console, and the only third-party request is for map tiles.

## Bridges (`addJavascriptInterface`)

Six bridges are injected: `HybridHealthBridge`, `HybridGpsBridge`,
`HybridNotifyBridge`, `HybridFileExportBridge`, `HybridAutoBackupBridge`, and
`HybridStateMirrorBridge`. Because CSP + bundled assets + external-link routing mean
**only first-party code executes in the WebView**, the bridges are only
reachable by trusted code. Defence-in-depth applied on top:

- **Parameter validation at the boundary.** Callback IDs passed from JS and
  echoed back into `evaluateJavascript` are sanitised to `[A-Za-z0-9_-]`
  (`BridgeSafe.callbackId`); a malformed id is rejected instead of being
  interpolated into a JS string (removes any script-injection vector via the
  callback channel). Numeric args (`getPointsSince(seq)`) are typed `Int`.
- **Least privilege.** Each bridge exposes only the methods the web layer calls
  (permission query/request, start/stop/drain for GPS, show/schedule for
  notifications, read/save for health/file, read/write/clear/status for the
  state mirror). No generic "eval", "exec", or filesystem-path methods are exposed.
  The state mirror has no path argument: it is fixed inside the app's private
  files directory, atomically replaced, and capped at 32 MB before it reaches disk.
- **No sensitive data returned unnecessarily.** GPS returns only buffered
  fixes for the active run; health returns only the metrics the app requested.

## Verification

- `tests/bridge_input.test.js` exercises the callback-id sanitiser contract and
  proves the app only ever generates safe ids.
- `tests/state_mirror.test.js` covers the JS restore decision and bridge protocol;
  `android/app/src/test/.../StateMirrorSafeTest.kt` covers atomic replacement,
  backup fallback and clearing of the app-private mirror.
- `scripts/check-precache.mjs` / `tests/precache_manifest.test.js` prove the
  offline bundle is complete (no privileged screen silently fetches remote JS).
- `tests/csp_vendored_runtime.test.js` proves `script-src 'self'`, checks the
  vendored runtime, and rejects CDN/remote-JS entries in the service worker.
- Manual device checks in `docs/android-device-checklist.md` remain required to
  confirm external-link routing and GPS/Health/notification/export/backup
  behaviour on the signed candidate.

## Assumptions that remain the user's responsibility

- There is no backend or account system; local data is protected by the app
  sandbox and Android backup being disabled.
- Release builds must keep `isDebuggable=false` and WebView debugging off
  (enforced in `MainActivity` — see below).
