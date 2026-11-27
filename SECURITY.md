# Security Policy

## Supported versions

Only the `main` branch is supported. Older commits and the rejected
`strength-first` branch are not maintained.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting:

<https://github.com/mjb96/openHybrid/security/advisories/new>

Do not open a public issue containing exploit details, credentials, personal
health data or precise location data. If private reporting is unavailable,
open a minimal public issue asking for a private channel and wait for a reply.

## Scope

In scope:

- the web app (`js/`), service worker and precache behaviour
- `localStorage` / IndexedDB data handling
- the Android WebView shell and its JavaScript bridges (`android/`)
- the app-private state mirror and Android automatic backup
- import/export, including JSON/CSV/FIT and photo archives

openHybrid is local-first: there is no account system, backend or cloud sync, so
there is no authentication, RLS, edge-function or account-deletion surface.

Out of scope:

- a compromised device or browser profile
- third-party services (map tiles)
- denial-of-service against your own deployment
- issues that require physical access to an unlocked device

## What to include

- the affected commit or version
- steps to reproduce
- the impact you believe it has
- a suggested fix, if you have one
- whether the issue affects the PWA, the Android app, or both

## Response

This is a solo, pre-release project with no bug bounty. Reports are handled on a
best-effort basis. Valid reports will be acknowledged and fixed in `main`; please
allow reasonable time before public disclosure.

## Data safety

Never include another person's health, training or location data in a report.
Use synthetic values in screenshots and reproduction steps.
