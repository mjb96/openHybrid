# Settings & Profile rebuild — Phase 0 audit

**Date:** 25 November 2026  
**Status:** Phase 0 complete — **awaiting approval of the mapping before any UI work**  
**Scope:** every stored setting, every profile field, every entry point to Profile/Settings, and the proposed §14-style IA. No product code was changed.

**Evidence base:** `js/state.js` defaults, `js/settings/registry.js` (48 descriptors), `index.html` settings markup, `js/settings.js`, `js/onboarding.js`, `js/athlete-profile.js`, `js/profile-stats.js`, `js/modules.js`, `js/equipment-profiles.js`, `js/ui/customize.js`, `js/notifications.js`, `js/timers.js`, `js/theme.js`, `js/ui/motion.js`.

**Counts:** 48 keys under `settings.*`; 3 settings-like root values; 4 profile fields that are stored user data rather than settings; 14 current Settings cards + 1 Profile screen; 6 entry points (2 live, 1 dead, 1 missing, 2 browser/document-level).

---

## 1. Current entry points

| # | Entry point | Current behaviour | Taps from Home | Status |
| --- | --- | --- | --- | --- |
| 1 | Home header avatar `#homeAvatar` (`data-action="open-profile"`) | `switchGlobalAppTab('profile')` opens the Profile view | 1 | **Change:** becomes a gear that opens Settings |
| 2 | Profile screen gear (`data-action="open-settings"` in `athlete-profile.js`) | Opens the Settings overlay (`#settingsOverlay`, a modal) | 2 (Home → Profile → gear) | **Remove** as a separate path; Profile is reached from the Settings card |
| 3 | Legacy dashboard tile `custom:settings` via `app:navigate` (`dashboard.js`) | Calls `openSettings()` | — | **Dead** unless the legacy dashboard is mounted; no live `#glanceGrid`; verify and remove |
| 4 | Settings close button / backdrop / Escape | `closeSettings()` via modal-stack, which pushes a browser-history marker | — | Keep behaviour; becomes a pushed route instead of an overlay |
| 5 | Browser back | Works only while the Settings modal owns a history entry; Profile has no history entry | — | **Missing** for Profile/Settings hierarchy |
| 6 | Home sliders button (`data-action="open-customize"`, `data-surface="home"`) | Opens the **Customize Home** bottom sheet (card visibility/order); it does **not** open Settings | 1 | Keep as the contextual Home-layout shortcut; mirror under Settings → Look & Home → Home layout |
| 7 | Active workout | No settings gear in the cockpit | — | **Missing** contextual entry required by the brief |
| 8 | URL / PWA shortcut | No `/settings` or `/profile` route; `manifest.json` has no shortcuts; navigation is `activeTab` + modal state | — | **Missing** deep links and redirects |

No existing URL routes need a redirect in the strict browser sense. The compatibility work is to add `/settings` and `/settings/profile`, and map the old state-based entry (`open-profile` → Profile) to `/settings/profile`.

---

## 2. Stored settings (`appState.settings.*`)

Storage is `localStorage` key `hybrid_engine_v2_state` → `settings.<key>` in the browser, mirrored by the Android private state mirror. “Read by” names the owning modules, not every display site.

| Key | Type / default | Read by | Today’s Settings location | Proposed page |
| --- | --- | --- | --- | --- |
| `name` | text `''` | onboarding, athlete profile, Home greeting, morning briefing, share card | Profile card (auto-save) | Profile → Identity |
| `avatarDataUrl` | object `null` (JPEG data URL) | athlete profile, Home avatar, import validation | Profile hero avatar | Profile → Identity |
| `fitnessGoal` | select `hybrid` | recommendation fit, plan library, training context, Hybrid Score | Profile card → Goal | Profile → Training goal |
| `fitnessLevel` | select `intermediate` | recommendation fit, plan library, training context, Hybrid Score | Profile card → Experience | Profile → Training goal |
| `weightGoal` | select `maintain` | recommendation fit, training context, engine, Hybrid Score | **Not shown** (onboarding only) | Profile → Training goal |
| `equipmentTier` | select `gym` | recommendation fit, training context | **Not shown** (onboarding only) | Equipment → Access (derive; do not store twice) |
| `weeklyFrequency` | select `some` | onboarding only — **no runtime reader** | **Not shown** | Plan & schedule → Days per week |
| `sessionMinutes` | select `45` | onboarding only — **no runtime reader** | **Not shown** | Plan & schedule → Session length |
| `defaultBodyWeight` | number `null` | onboarding, CSV import, set mutations, Settings Profile card | Profile card → Body Weight | Profile → Body metrics (bodyweight-log fallback) |
| `onboardingComplete` | system `false` | onboarding, state recovery gate | Not shown | System only (never a row) |
| `progressionIncrement` | number `2.5` | engine, session recap | Logging → Progression Step | Workout → Progression |
| `autoAdvanceWeek` | toggle `true` | app.js week stepping | Program Week | Plan & schedule |
| `previousValuesScope` | select `all` | workout, state | Logging → Last performed means | Workout → Auto-fill previous set |
| `showPlateHints` | toggle `false` | workout | Logging → Show plate hints | Workout → Input style / plate hints |
| `autoWarmupRamp` | toggle `false` | warm-up ramp, exercise config | Logging → Auto warm-up ramp | Workout → Warm-up handling |
| `restPeriods` | object `DEFAULT_REST_TIERS` | timers, rest duration | Logging → rest tiers/presets | Timer alerts → Rest tier defaults |
| `restOverrides` | object `{}` | timers, set sheet, exercise options | Logging → Reset remembered rests | Workout → per-exercise overrides |
| `restTimerEnabled` | toggle `true` | timers | Logging → Auto rest timer | Workout → Rest timer |
| `restAlertSound` | toggle `true` | timers | Logging → Rest alert sound | Timer alerts → Sound |
| `restAlertVolume` | number `0.4` | timers | Logging → Alert volume | Timer alerts → Volume |
| `exercisePrefs` | object `{}` | set shape, exercise options/config, workout | **Not shown** (cockpit exercise sheet) | Workout → per-exercise overrides |
| `musclePriorities` | object `{}` | volume guide, muscle load, Strength view | **Not shown** (Strength → Volume Guide) | Plan & schedule → Muscle focus |
| `keepAwake` | toggle `true` | workout wake lock | Logging → Keep screen awake | Workout → Keep screen on |
| `livePR` | toggle `true` | workout PR banner | Logging → Live PR banners | Workout → Haptics & PR banners |
| `weightUnit` | select `kg` | bodyweight, measurements, workout, Home, analytics | Training → Weight Unit | Units & language |
| `distanceUnit` | select `km` | Home, GPS, analytics, onboarding | Training → Distance Unit | Units & language |
| `measurementUnit` | select `cm` | measurements, Measures sheet, migrations | **Not shown** (Measures sheet) | Units & language |
| `weekStartDay` | select `mon` | Home rail, dashboard model, History, bodyweight | Training → Week Starts On | Plan & schedule |
| `equipment` | object: 5 core true | recommendation fit, compare, engine, onboarding | Equipment → equipment checkboxes | Equipment → Available equipment (active profile projection) |
| `bandWeights` | object `10/20/30` | engine, volume, load mode | Equipment → Band weights | Equipment → Band weights (active profile projection) |
| `equipmentProfiles` | object `[]` (v6 seeds one) | equipment profiles, plate sheet, suggestions | Equipment → Profile | Equipment → Gym profiles |
| `activeEquipmentProfileId` | object `null` (v6 seeds one) | equipment profiles, plate sheet, suggestions | Equipment → Profile | Equipment → Active profile |
| `reminderTime` | time `07:30` | notifications | Notifications → Reminder Time | Reminders → Workout reminder time |
| `notificationsEnabled` | toggle `false` | notifications | Notifications → Workout Reminder | Reminders → Workout reminders master |
| `notifWeeklySummary` | toggle `false` | notifications | Notifications → Weekly Summary | Reminders → Weekly summary |
| `notifStreak` | toggle `false` | notifications | Notifications → Streak Alert | Reminders → Streak alert |
| `streakAlertTime` | time `20:00` | notifications | Notifications → Alert Time | Reminders → Streak alert time |
| `notifMissedWorkout` | toggle `false` | notifications | Notifications → Missed Session Alert | Reminders → Missed session |
| `notifFastingStage` | toggle `true` | fasting nudge | Notifications → Fasting → Stage nudges | Reminders (Fasting module only) |
| `fastingDefault` | number `16` | fasting actions | Fasting card → Default Protocol | Modules → Fasting (decision D3) |
| `targetWeight` | number `null` | bodyweight, body metrics, Home bodyweight card | **Not shown** (Progress → Bodyweight) | Profile → Body goal |
| `rateGoal` | number `null` | bodyweight model/view | **Not shown** (Progress → Bodyweight) | Profile → Body goal |
| `theme` | select `dark` | boot/theme application, onboarding | Appearance → Theme | Look & Home → Theme |
| `reducedMotion` | select `system` | `ui/motion.js`, CSS | Appearance → Motion | Look & Home → Motion |
| `palette` | select `midnight` | theme, boot | Appearance → Dark palette | Look & Home → Accent/palette |
| `hybridTraining` | toggle `true` | modules, CSS `[data-hybrid]` | Modules → Hybrid training | Modules → Hybrid presentation |
| `modules` | object `{}` (= all on) | modules, CSS `[data-module]`, filters | Modules → Running/Fasting/Health/Recovery | Modules → feature modules |
| `ui` | object `{}` (normalized) | customize, progress dashboard, analytics | **Not shown** (Home/Progress Customize buttons) | Look & Home → Home layout / Progress layout |

**All 48 keys are covered by a proposed page.** Three are not currently in the defaults literal but are registered/seeded by migration (`measurementUnit`, `modules`, `ui`); a future registry-driven defaults test must still see them.

---

## 3. Settings-like values outside `settings.*`

| Value | Storage | Read by | Today’s UI | Proposed page |
| --- | --- | --- | --- | --- |
| `state.thresholdPaceSeconds` | state root | analytics, activities, session recap | Training → Threshold Pace | Units & language → Pace / threshold |
| `state.prGoals` | state root map | athlete profile, weight-unit conversion | Profile → Stats → per-lift target | Profile → Training goals (or Workout → Lift targets; decision D4) |
| `state.healthConnect.connected` | state root | health bridge/UI | Health Connect card | Integrations → Health Connect |
| `state.healthConnect.lastSync` | state root | health bridge/UI | Health Connect card | Integrations → Health Connect |
| `state.healthConnect.stepGoal` | state root | health bridge/UI | Health Connect → Daily Step Goal | Integrations → Health Connect |
| `state.healthConnect.syncFields` | state root | health fields/bridge | Health Connect → Sync Data Types | Integrations → Health Connect |
| `state.healthConnect.fieldStatus` | state root (derived) | health bridge | Health Connect labels | Integrations → Health Connect (status only) |
| `state.deloadApplied` | state root | phase, risk, Home, Hybrid Score | No row (per-week action) | Plan & schedule → deload **action**, not a preference |
| `state._deloadDismissedWeek` | state root | Home | No row | No row (ephemeral acknowledgement) |
| `state.activeProgramId`, `currentWeek`, `weekStartedAt` | state root | whole app | Program Week stepper (current week only) | Plan & schedule shows the active plan; not a setting |
| `state.profileSections` | state root | **none** | — | **Dead**: remove or migrate |
| `state.dashboardTiles` | state root | `dragdrop.js` only; no mounted surface found | — | **Legacy duplicate** of `settings.ui.home`; migrate then remove |
| `state.bodyWeightLog` | state root array | Home, Profile, bodyweight, Measures | Profile Body Weight writes today | Profile → Body metrics history |
| `state.bodyMeasurements` | state root array | Measures, Body band | Measures | Profile → Body metrics link |
| `state.progressPhotos` | state root metadata + IDB blobs | Measures, Body band | Measures → Photos | Profile → Body photos link |
| `state.programLibrary` | state root | Plans, Profile | Plans/Profile | Profile → Lifetime snapshot |
| `state.hybridScore` | state root (derived/achievement) | Profile level, briefing | Profile | Profile → Lifetime snapshot |
| `state.streakFreezes` | state root (derived/reward) | streak model | Home/Profile | Profile → Lifetime snapshot |
| `state.overtrainingAck` | state root (ephemeral) | Home | — | Not a setting |
| `state.wellnessLog`, `healthConnect.*` arrays | state root | recovery/health | — | Integrations (read-only history) |
| `state.fastingSession` | state root | fasting | Fasting module | Modules → Fasting (active state, not a preference) |

---

## 4. Profile page fields

| Field | Source | Editable today? | Used by | Proposed |
| --- | --- | --- | --- | --- |
| Name | `settings.name` | Yes (Settings Profile card) | greeting, profile hero, share card | Profile → Identity |
| Avatar | `settings.avatarDataUrl` | Yes (Settings hero) | Home header, Profile hero | Profile → Identity |
| Latest bodyweight | `bodyWeightLog` (fallback `defaultBodyWeight`) | Yes (Settings card writes today’s log entry) | Home bodyweight card, Profile, load modes | Profile → Body metrics, with history link to the bodyweight log |
| Weight trend / target / rate | `bodyWeightLog`, `settings.targetWeight`, `settings.rateGoal` | Target/rate only in Progress → Bodyweight | Bodyweight model, Home card | Profile → Body goals (single owner) |
| Current/longest streak | derived `computeStreak` | No | Profile lifetime | Profile → Lifetime snapshot |
| Lifetime sessions/volume/distance | derived from weeks | No | Profile lifetime | Profile → Lifetime snapshot |
| Active program / week | `activeProgramId`, `currentWeek` | Program screens only | Profile program card | Profile → Training |
| Level / XP | derived `hybridScore.xp` | No | Profile progression | Profile → Lifetime snapshot |
| Relative strength, big-3 PRs | derived e1RM | No | Profile performance | Profile → Performance |
| Running PBs | derived running history | No | Profile performance | Profile → Performance |
| This-week summary | derived calendar week | No | Profile | Profile → Training |
| Heatmap, recent sessions | derived | No | Profile | Profile → Activity |
| Program completions | `programLibrary.completions` | No | Profile | Profile → Lifetime snapshot |
| Per-lift PR goals | `state.prGoals` | Yes (Profile Stats modal) | Profile, progression | Profile → Training goals |
| Height | **not stored** | — | — | New optional field; decision D5 |
| Date of birth | **not stored** | — | — | New optional field; decision D5 |
| Sex | **not stored** | — | — | New optional field; decision D5 |
| Training start date | **not stored** | — | — | New optional field; derive from first logged session until set |
| Backed-up status | native auto-backup status, no stored timestamp | — | — | Profile card subtitle; needs a last-backup timestamp |

The Profile screen currently renders **analytics**, not identity/body editing. Name, avatar, bodyweight, goals and PR targets are edited in Settings or in place, so the new Profile page is a consolidation, not a second store.

---

## 5. Proposed IA (13 top-level rows)

| New row | Contents (keys) | Notes |
| --- | --- | --- |
| Profile card | name, avatar, backup status | Opens `/settings/profile` |
| Search | registry-driven index | Under the card |
| **Training → Workout** | `restTimerEnabled`, `restPeriods`, `restOverrides`, `autoWarmupRamp`, `previousValuesScope`, `progressionIncrement`, `showPlateHints`, `keepAwake`, `livePR`, `exercisePrefs`, `prGoals` | Per-exercise overrides show Default vs Custom |
| **Training → Timer alerts** | `restAlertSound`, `restAlertVolume` | Rest duration defaults can live here or in Workout; decision D1 |
| **Training → Plan & schedule** | `autoAdvanceWeek`, `weekStartDay`, `weeklyFrequency`, `sessionMinutes`, `musclePriorities` | Deload remains an action, not a stored preference; programme length is per plan |
| **Training → Reminders** | `notificationsEnabled`, `reminderTime`, `notifWeeklySummary`, `notifStreak`, `streakAlertTime`, `notifMissedWorkout`, `notifFastingStage` | Fasting nudge hidden when module off |
| **Set once → Units & language** | `weightUnit`, `distanceUnit`, `measurementUnit`, `thresholdPaceSeconds` | No date/time/number format or pace-format keys exist yet; decision D2 |
| **Set once → Equipment** | `equipmentProfiles`, `activeEquipmentProfileId`, `equipment`, `bandWeights`, `equipmentTier` | Active-profile projection; tier derived |
| **Set once → Look & Home** | `theme`, `palette`, `reducedMotion`, `ui`, `dashboardTiles` | Home layout entry is the same Customize Home control; `dashboardTiles` migrates first |
| **Set once → Modules** | `modules`, `hybridTraining`, `fastingDefault` | Feature switches + presentation; Fasting default needs a home (D3) |
| **Connections → Watches** | — | No existing setting; row must be hidden/“not available” until built |
| **Connections → Integrations** | `healthConnect.*`, import actions | Health Connect exists; Strava does not |
| **Connections → AI Coach** | — | No provider/API-key/consent setting exists; training-context export is not a coach |
| **Data → Data & backup** | export/import/auto-backup actions, storage used, danger zone | Auto-backup is native status, not a state key |
| **About** | version, changelog, licences, source, diagnostics, feedback | Only version + source exist today |

That is **13 rows** plus the profile card and search, within the 14-row cap.

---

## 6. Dead, duplicate and conflicting settings

| # | Finding | Evidence | Decision needed |
| --- | --- | --- | --- |
| D1 | `settings.recoveryFeel` is written by onboarding but read nowhere; the registry already marks it retired. | `onboarding.js:255`, `settings/registry.js RETIRED_SETTINGS_KEYS` | Remove the write; keep the retired-key migration guard. |
| D2 | `state.profileSections` is defaulted and patched but never read. | `state.js:868,920`; no reader | Remove after an import/backward-compat check. |
| D3 | `state.dashboardTiles` is a second Home-layout store next to `settings.ui.home`; only `dragdrop.js` reads it and no `#glanceGrid` surface is mounted. | `dragdrop.js:70-140`, `state.js:869` | Migrate any hidden/order arrays to `settings.ui.home`, then remove. |
| D4 | `settings.weeklyFrequency` and `settings.sessionMinutes` are persisted only by onboarding and read nowhere; recommendation fit uses live training, not these values. | `onboarding.js:253-254`; grep shows no runtime reader | Decide whether to revive them in Plan & schedule or stop storing them. |
| D5 | `settings.equipmentTier` is set once by onboarding and never re-derived when the active profile changes; the registry footer claims it is derived. | `onboarding.js:247`, `equipment-profiles.js` projection | Derive it read-time from the active profile, or make it an explicit choice. |
| D6 | `settings.equipment` and `settings.bandWeights` are projections of the active profile, but onboarding also writes `equipment` directly. | `equipment-profiles.js:293-357`, `onboarding.js` | Keep projections internal; route every write through `applyActiveEquipment`. |
| D7 | `settings.defaultBodyWeight` duplicates the latest `bodyWeightLog` entry and is also a fallback. | `settings.js:617`, `set-mutations.js:321-358`, `bodyweight.js` | Keep as fallback only; make the log the single visible owner. |
| D8 | `settings.fastingDefault` and `fastingSession.goal` both describe a fast length. | `settings.js:815`, `fasting.js` | One owner: the next fast inherits the default; the active fast keeps its own goal. |
| D9 | `state.thresholdPaceSeconds`, `state.prGoals` and `state.healthConnect.stepGoal` are settings but live outside `settings`, so registry/search/summary cannot own them. | `settings/registry.js NON_SETTINGS_STATE_KEYS` | Move into the registry model (storage can stay where it is if the descriptor declares the path). |
| D10 | `theme` + `palette` are today’s appearance model; Part B replaces them with `followSystem`/`lightTheme`/`darkTheme`/`accent`. | `settings.js`, `theme.js` | Migrate with no loss when Part B lands. |
| D11 | `hybridTraining` sits in the Modules card but is a presentation preference, not a feature module. | `modules.js` comments, `AGENTS.md` | Move to Look & Home or label it clearly inside Modules. |
| D12 | Home/Progress layout is edited by two mechanisms (`ui.customize.js` sheet and the dead `dashboardTiles` drag-drop). | `ui/customize.js`, `dragdrop.js` | One owner: `settings.ui`; the sliders shortcut opens the same control under Look & Home. |
| D13 | `fastingDefault`, `targetWeight`, `rateGoal`, `musclePriorities`, `exercisePrefs`, `prGoals` are editable outside Settings; the new IA must link to those editors or absorb them, not create a second copy. | `analytics.js`, `view-strength.js`, `athlete-profile.js`, cockpit sheets | Decide per field in Phase 4/5; single value owner stays. |
| D14 | The Settings screen is a modal overlay with a five-filter tab row, not a pushed route; Profile is a `view-container` with no history state. | `settings.js`, `app.js`, `modal-stack.js` | Phase 1 must introduce `/settings` routing before any UI. |

No stored data is proposed for deletion in Phase 0. D1–D4 are the only true dead stores; each needs an explicit keep/migrate/remove decision.

---

## 7. Missing fields and settings for the requested IA

These do **not** exist today and would be additive keys; none is required for the first navigation/registry slice.

| Proposed field | Why it is needed | Default / rule |
| --- | --- | --- |
| `heightCm` | Profile body metrics; user asked for height. No current calculation uses it. | `null`; optional; cm canonical |
| `birthDate` | Profile; user asked for DOB. No current calculation uses it. | `null`; optional; ISO date |
| `sex` | Profile; “used for calculations only”. No current formula consumes sex. | `null`; optional; do not fabricate a value |
| `trainingStartDate` | Profile; derive from the first logged session when absent. | `null`; ISO date |
| `dateFormat`, `timeFormat`, `numberFormat` | Units & language asks for them. | locale-derived / explicit; decision D2 |
| `paceFormat` | Units & language asks for it; today only a threshold value exists. | `min/km` or `min/mi` |
| `accentOverride` | Part B accent override. | `null` |
| `followSystem`, `lightTheme`, `darkTheme`, `reduceEffects` | Part B theme engine. | system/midnight; decision after A |
| `lastBackupAt` | Profile subtitle “Backed up 2h ago”; today only native status. | `null`; written after a successful backup |
| `aiCoachProvider`, `aiCoachKey`, `aiCoachConsent` | AI Coach row. | **Do not add until the product decision on local vs API key** |
| `watches`/pairing state | Watches row. | **No current watch pairing exists** |

---

## 8. Decisions to approve

1. **D1/D2/D3/D4 removals.** Approve removing `recoveryFeel`, `profileSections`, `dashboardTiles` (after migrating to `settings.ui.home`), and either reviving or removing `weeklyFrequency`/`sessionMinutes`.
2. **Fasting default home.** Put `fastingDefault` under Modules → Fasting, or under Plan & schedule? The IA has no fasting row.
3. **PR goals home.** Profile → Training goals or Training → Workout → Lift targets?
4. **New personal fields.** Add height/DOB/sex now as optional stored-only fields, or defer until a calculation actually uses them? The brief asks for them; the app currently has no height/sex/age formula.
5. **Date/time/number/pace format.** Add keys in Phase 2 now, or leave the rows out until localisation work lands?
6. **Watches / AI Coach / Strava.** The IA names them but no feature/store exists. Show disabled “Not available yet” rows, or omit until built?
7. **Equipment tier.** Derive from the active profile (recommended) or keep an explicit access choice?
8. **Tab bar.** Confirm Settings is a pushed route that hides the bottom bar; the current modal overlay does not own the tab bar.

---

## 9. What Phase 0 did not do

- No UI, CSS, route, store or registry changes.
- No setting was migrated, removed or renamed.
- No screenshots; Phase 1 begins after approval.

**Next (Phase 1, after approval):** navigation + `/settings` route + redirects + hidden tab bar + Settings shell. Phase 2 adds the typed registry/store/migrations. No control renders until those exist.
