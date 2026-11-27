<!--
  DRAFT — [You] before publishing:
  1. Have this reviewed by someone qualified (health + location = GDPR special
     category data; this draft is a starting point, not legal advice).
  2. Fill every {{PLACEHOLDER}}.
  3. Host it as a public HTTPS web page (not a PDF; no login/geoblock) and put
     that URL in the Play listing + in-app Settings.
  4. Make the Account and data deletion section a public deletion-request
     resource (the Play form may link directly to its anchor).
  5. Keep "Last updated" accurate whenever you change data practices.
-->

# openHybrid — Privacy Policy

**Last updated: {{DATE}}**

openHybrid ("the app", "we", "us") is a strength-and-running training app. This
policy explains what data openHybrid handles, why, and your rights over it. We built
openHybrid to keep your data on your device by default and to sync only what you
choose to.

**Data controller:** {{YOUR NAME OR COMPANY}}
**Contact:** {{CONTACT_EMAIL}}

---

## 1. Summary (the short version)
- Your training data lives **on your device**. There is no account system and
  no cloud sync; openHybrid does not receive your training history.
- We do **not** sell your data, show ads, or use advertising/behavioural analytics.
- Health and location data are treated as **sensitive**. We minimise what we
  collect and never use it for advertising.
- You can **export or delete** your data at any time.

## 2. What data openHybrid handles

### 2.1 Data you enter or generate
- **Training logs:** workouts, sets, reps, weights, RPE/RIR, running distance
  and time, body weight, notes, program choices, streaks, goals.
- **Wellness & fasting:** any wellness check-ins or fasting sessions you log.
- **Profile & settings:** display name, units, an optional avatar image, and
  reminder preferences.

### 2.2 Health & fitness data (sensitive)
If you connect **Health Connect** (Android, optional), openHybrid reads only the
supported fields you select: daily steps, sleep duration, resting heart rate,
and heart-rate variability (HRV). This data powers your in-app recovery and
training views and stays on the device. You can turn individual fields off in
openHybrid and revoke permission in Health Connect.

### 2.3 Location data (sensitive)
If you use **GPS run tracking**, openHybrid uses your device location **while a run
is active** to record your route, distance, and pace. On Android this runs in a
foreground service with a visible notification while tracking, and stops when
you end the run. Location is **not** collected in the background outside of an
active run, and is never used for advertising. Your saved routes are stored
with the rest of your training data.

### 2.4 No account data
openHybrid has no account system. It does not ask for your name, email address or a
password, and it operates without a backend.

### 2.5 Data we do **not** collect
No advertising identifiers, no advertising or behavioural analytics, no
contacts, and no microphone access. openHybrid only uses a photo you explicitly
choose as an avatar.

## 3. How your data is stored and synced
- **On your device:** your training data is saved locally so the app works
  offline. On Android it is also mirrored into the app's private storage so a
  WebView storage eviction does not lose it.
- **No cloud copy:** openHybrid does not send your training, health or route data to
  a server. Moving devices is a deliberate JSON export/import or Android
  automatic backup.
- **No diagnostics egress:** openHybrid does not run a crash reporter or any
  analytics SDK. Errors stay on the device.

## 4. Third parties that may process data
One service is contacted, and only while you are looking at a map:

| Provider | Purpose | Data they may see |
|---|---|---|
| OpenStreetMap tile service | Run-map tiles | IP address and the map-tile area requested when a map is viewed |

This provider processes data as an independent controller for the limited
purpose above. We do not sell data to anyone.

## 5. Legal bases (GDPR/UK GDPR)
- **Consent:** for optional features you switch on — Health Connect access, GPS
  tracking and notifications. You can withdraw permission or stop using the
  feature; local data deletion is described below.
- **Legitimate interests:** keeping the app secure and fixing crashes through
  the limited, scrubbed diagnostics described above. {{LEGAL REVIEW: confirm
  the appropriate basis in every launch region.}}

Health and location data are **special-category / sensitive** data and are
processed only with your explicit consent (by enabling the relevant feature).

## 6. Data retention
- Local data stays until you delete it or uninstall the app.
- openHybrid holds no cloud copy of your training data.
- Crash reports are retained for {{SENTRY_RETENTION_PERIOD}} and then deleted.

## 7. Your rights
Depending on where you live (e.g. EEA/UK), you have the right to access,
correct, export (portability), delete, or restrict processing of your data, and
to withdraw consent. openHybrid lets you:
- **Export** your full data as a file (Settings → Export).
- **Delete** local data in Settings → Reset All Data, or by clearing app data /
  uninstalling.

To exercise any right, contact {{CONTACT_EMAIL}}. You also have the right to
complain to your local data-protection authority.

## 8. Deleting your data
openHybrid has no account to delete. Local data is removed by Settings → Reset All
Data, by clearing the app's storage, or by uninstalling. Android automatic
backup files remain in the folder you chose until you delete them. If you have a
privacy question about a crash report, contact **{{CONTACT_EMAIL}}**.

## 9. Children
openHybrid is not directed to children under {{MIN_AGE, e.g. 16}} and we do not
knowingly collect their data.

## 10. International transfers
Crash diagnostics and map/font requests may be processed on servers outside your
country by the limited providers above. Your training data is not transferred.

## 11. Changes to this policy
We will update this policy as the app evolves and revise the "Last updated"
date. Material changes will be surfaced in the app.

## 12. Contact
{{YOUR NAME OR COMPANY}} — {{CONTACT_EMAIL}}
