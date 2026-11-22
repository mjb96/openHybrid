// Shared JSDoc-importable types for the app's core contracts.
// Reference from .js with:  /** @type {import('./types').AppState} */
// Kept intentionally loose where shapes are large/dynamic (Record<string, any>);
// the value is documenting the top-level state contract and catching typos.

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: string | null;
}

export interface GoalData {
  milestones: any[];
  completedCount: number;
}

export interface LoadMetrics {
  atl: number;
  ctl: number;
}

export interface HealthFieldStatus {
  selected: boolean;
  permission: 'granted' | 'denied' | 'unknown';
  error: boolean;
  days: number;
  lastDate: string | null;
  updatedAt: number;
}

export interface HealthConnectState {
  connected: boolean;
  lastSync: string | number | null;
  hrv: any[];
  restingHR: any[];
  sleep: any[];
  steps: any[];
  /** Legacy, inert series kept for data preservation (no ingestion path). */
  vo2max?: any[];
  stepGoal: number;
  /** Supported-field selection (see js/health/health-fields.js). */
  syncFields?: Record<string, boolean>;
  /** Honest per-field outcome of the last permission/read. */
  fieldStatus?: Record<string, HealthFieldStatus>;
}

export interface FastingSession {
  active: boolean;
  startTime: number | null;
  goal: number;
  history: any[];
}

export interface ProgramLibrary {
  bookmarks: string[];
  completions: Array<{ programId: string; completedAt: string; weeksCompleted: number }>;
  recentlyViewed: Array<{ programId: string; viewedAt: string }>;
  personalRatings: Record<string, { rating: number; review?: string; ratedAt: string }>;
  activeFilters: Record<string, any>;
}

/**
 * One exercise's prescription inside a routine. Authoritative for sets, reps,
 * load and rest; the routine day's `lifts` array stays bare strings.
 */
export interface RoutinePrescription {
  sets: number;
  /** Rep target, or '' when the exercise is prescribed as a hold or carry. */
  reps: number | '';
  weight: number | null;
  restSec: number | null;
  mode?: 'reps' | 'time' | 'distance';
  sec?: number;
  dist?: number;
  basis?: 'total' | 'each' | 'per-side';
  loadMode?: 'weighted' | 'bodyweight' | 'assisted' | 'banded';
}

export interface RoutineDay {
  title: string;
  badge: string;
  color: string;
  desc: string;
  runs: string;
  lifts: string[];
}

/**
 * A reusable SESSION TEMPLATE. Deliberately not a program: it never enters
 * `customPrograms`, never resolves through `getProgramById`, and never owns a
 * week slot.
 */
export interface Routine {
  id: string;
  name: string;
  folderId: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  source: { activityId: string | null; programId: string | null; day: string; date: string | null };
  days: Record<string, RoutineDay>;
  prescriptions: Record<string, Record<string, RoutinePrescription>>;
  totalWeeks: number;
  weeklyVolModifiers: Record<string, { sets: number; reps: number; intensityLabel: string }>;
}

export interface RoutineFolder {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  name?: string;
  weightUnit?: 'kg' | 'lbs';
  distanceUnit?: 'km' | 'mi';
  theme?: 'dark' | 'light' | 'system';
  restPeriods?: { warmup?: number; compound: number; accessory: number; isolation: number };
  restTimerEnabled?: boolean;
  restAlertSound?: boolean;
  restAlertVolume?: number;
  restOverrides?: Record<string, number>;
  exercisePrefs?: Record<string, { warmup?: 'inherit' | 'auto' | 'off'; note?: string; mode?: 'reps' | 'time' | 'distance'; loadMode?: 'weighted' | 'bodyweight' | 'assisted' | 'banded'; basis?: 'total' | 'each' | 'per-side' }>;
  progressionIncrement?: number;
  fitnessGoal?: string;
  weightGoal?: 'cut' | 'maintain' | 'bulk';
  fitnessLevel?: string;
  musclePriorities?: Record<string, 'grow' | 'maintain' | 'track'>;
  weekStartDay?: 'mon' | 'sun';
  fastingDefault?: number;
  defaultBodyWeight?: number;
  [key: string]: any;
}

export interface AppState {
  currentWeek: string;
  activeProgramId: string;
  activeActivationId?: string | null;
  activations?: any[];
  weekStartedAt: number | null;
  weeks: Record<string, any>;
  exerciseStats: Record<string, any>;
  customExercises: any[];
  customPrograms: any[];
  /** Reusable session templates (never programs). Seeded by ensureRoutines. */
  routines?: Routine[];
  /** Routine folders; metadata only, routines never leave appState. */
  libraryFolders?: RoutineFolder[];
  bodyWeightLog: Array<{ weight: number; date?: string }>;
  /** Canonical centimetres, one record per date; any site may be absent. */
  bodyMeasurements: Array<{ date: string; waist?: number; chest?: number; hips?: number; arm?: number; thigh?: number; neck?: number }>;
  thresholdPaceSeconds: number | null;
  deloadApplied: any;
  _deloadDismissedWeek: string | null;
  streakData: StreakData;
  goalData: GoalData;
  prGoals: Record<string, any>;
  loadMetrics: LoadMetrics;
  healthConnect: HealthConnectState;
  wellnessLog: any[];
  fastingSession: FastingSession;
  programLibrary: ProgramLibrary;
  profileSections?: { order: string[] | null; hidden: string[] };
  dashboardTiles?: { order: string[] | null; hidden: string[] };
  hybridScore?: { history: { date: string; score: number; level: number }[]; xp: number; lastRecordedDate: string | null };
  overtrainingAck?: { sig: string; date: string } | null;
  _overtrainingPushedDate?: string | null;
  _justOnboarded?: boolean;
  _hadStoredState?: boolean;
  streakFreezes?: { available: number; used: string[]; earnedTier: number };
  settings?: AppSettings;
}

// Globals injected by the native Android WebView host (HybridHealthBridge.kt /
// MainActivity.kt) and a few app-defined window hooks. Declared so `// @ts-check`
// modules that talk to the bridge type-check cleanly.
declare global {
  interface Window {
    /** Native Health Connect bridge (Android only; undefined on web/PWA). */
    HybridHealthBridge?: {
      getAvailabilityStatus(): string;
      requestPermissions(fieldsJson: string, callbackId: string): void;
      readHealthData(startIso: string, endIso: string, callbackId: string): void;
      readHealthDataByDay(startIso: string, endIso: string, fieldsJson: string, callbackId: string): void;
      notifyRestComplete(title: string, body: string): void;
    };
    /** Native Android Storage Access Framework text-export bridge. */
    HybridFileExportBridge?: {
      saveTextFile(filename: string, content: string, mime: string, callbackId: string): void;
    };
    /** Native Android automatic backup-folder bridge. */
    HybridAutoBackupBridge?: {
      getStatus(callbackId: string): void;
      chooseFolder(callbackId: string): void;
      writeAutomaticBackup(content: string, dayKey: string, weekKey: string, reason: string, callbackId: string): void;
      disable(callbackId: string): void;
    };
    /** Pending native→JS callbacks keyed by callbackId. */
    __hcCB?: Record<string, (json: string) => void>;
    __fileExportCB?: Record<string, (json: string) => void>;
    __autoBackupCB?: Record<string, (json: string) => void>;
    /** Hardware/gesture back handler; returns 'handled' or 'exit'. */
    __onAndroidBack?: () => string;
    _hybridGetState?: () => any;
    _hybridGetProgram?: () => any;
  }
}

export {};
