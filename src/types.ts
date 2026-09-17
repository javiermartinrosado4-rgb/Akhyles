export type Level = "beginner" | "intermediate" | "advanced";
export type Muscle =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "adductors"
  | "calves"
  | "abs";
export type Variant = "machine" | "free" | "cable" | "smith" | "bodyweight";
export type ExerciseType = "compound" | "isolation";
export type ExerciseTier = "S+" | "S" | "A" | "B";
export type Range = [number, number];
export type ThemeMode = "system" | "light" | "dark";
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export interface Profile {
  avatar?: string;
  name?: string;
  handle?: string;
  includeGlutes?: boolean;
  mesocycle?: boolean;
  sex: "male" | "female" | "";
  /** ISO calendar date selected by the athlete. */
  birthDate?: string;
  /** Retained only to hydrate profiles created before birth dates were introduced. */
  age: string;
  height: string;
  weight: string;
  weightReminder?: boolean;
  trainingReminder?: boolean;
  level: Level;
  days: number;
  trainingDays?: Weekday[];
  priority: Muscle | "balanced";
}
export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  secondary: Muscle[];
  priority: number;
  tier?: ExerciseTier;
  minLevel: Level;
  type: ExerciseType;
  equipment: string;
  variant: Variant;
  range: Range;
  substitutions: string[];
  note?: string;
  custom?: boolean;
  pullPattern?: "vertical" | "horizontal";
  scoreEligible?: boolean;
  loadStep?: number;
}
export interface Prescription {
  id: string;
  exerciseId: string;
  sets: number;
  range: Range;
  weight: number;
  /** Optional manufacturer for a machine/smith movement; never required to train. */
  machineBrand?: string;
}
export interface Day {
  id: string;
  name: string;
  exercises: Prescription[];
}
export interface Preferences {
  barWeights?: Record<string, number>;
  /** Base carriage/frame mass for selectorized and plate-loaded apparatuses. */
  apparatusWeights?: Record<string, number>;
  machineBrands?: Record<string, string>;
  unavailable: string[];
  /** Exercises the athlete wants the automatic generator to prefer when compatible. */
  favorites?: string[];
  equipment: Variant[];
  names: Record<string, string>;
  /** Personal reminders shown while logging this specific exercise. */
  notes?: Record<string, string>;
  weights: Record<string, number>;
  ranges: Record<string, Range>;
  custom: Exercise[];
  loadSteps?: Record<string, number>;
  /** Preferred way to enter loads; once selected it is reused in future sessions. */
  loadModes?: Record<string, import("./logic/load").LoadInputMode>;
}
export interface SetRecord {
  weight: number;
  reps: number;
  /** When both sides are logged, weight is the conservative bilateral total (2 × weaker side). */
  leftWeight?: number;
  rightWeight?: number;
  /** Optional per-side repetitions; reps remains the conservative lower-side value. */
  leftReps?: number;
  rightReps?: number;
}
export interface ExerciseRecord {
  /** Input representation used when this record was saved. It keeps historical edits from reinterpreting a total as a per-side load. */
  loadMode?: import("./logic/load").LoadInputMode;
  /** Extra bar mass used with the logged external/plate load, frozen per session. */
  barWeight?: number;
  /** Apparatus base mass, frozen when the workout is saved. */
  apparatusWeight?: number;
  machineBrand?: string;
  prescription: Prescription;
  name: string;
  type: ExerciseType;
  sets: SetRecord[];
}
export interface Workout {
  /** Sex reference at session time; absent legacy values are not inferred. */
  sex?: Profile["sex"];
  startedAt?: string;
  level?: Level;
  bodyWeight?: number;
  id: string;
  dayId?: string;
  dayName: string;
  date: string;
  minutes: number;
  records: ExerciseRecord[];
  skipped?: string[];
}
export interface LocalAchievement {
  id: string;
  title: string;
  description: string;
  unlockedAt: string;
  category: "progress" | "consistency" | "strength";
}
/** A self-reported recent performance in a comparable core lift. */
export type StrengthReferenceId = "bench" | "pullup" | "overhead_press" | "squat" | "deadlift";
export interface StrengthReference {
  id: StrengthReferenceId;
  /** Total load for barbell lifts; added load only for pull-ups. */
  weight: number;
  reps: number;
  bodyWeight: number;
  sex: Exclude<Profile["sex"], "">;
  date: string;
}
export interface PlannedWorkout {
  date: string;
  dayId: string;
  day: Day;
}
/** A program snapshot starts on this date and never rewrites prior calendar data. */
export interface RoutineVersion {
  effectiveFrom: string;
  profile: Profile;
  routine: Day[];
}
export interface ActiveWorkout {
  /** Calendar preparation mode: edits are saved to the planned date, never history. */
  preparing?: boolean;
  plannedDate?: string;
  /** Historical sessions reuse the workout screen without becoming an active workout. */
  historical?: { workoutId: string; readOnly: boolean; skipped?: string[] };
  barWeights?: Record<string, string>;
  apparatusWeights?: Record<string, string>;
  machineBrands?: Record<string, string>;
  sex?: Profile["sex"];
  level?: Level;
  bodyWeight?: number;
  day: Day;
  index: number;
  startedAt: string;
  records: ExerciseRecord[];
  draft: SetDraft[];
  drafts?: Record<string, SetDraft[]>;
  /** Per-series switch for asymmetric left/right loading. */
  asymmetricSets?: Record<string, boolean[]>;
  /** Bodyweight movements only expose added load when the athlete enables it. */
  weighted?: Record<string, boolean>;
  /** Whether each exercise is currently entered as total plates or plates per side. */
  loadModes?: Record<string, import("./logic/load").LoadInputMode>;
  skipped?: string[];
}
export interface SetDraft { weight: string; reps: string; leftWeight?: string; rightWeight?: string; leftReps?: string; rightReps?: string; }
export interface AppState {
  /** Device-only synchronization metadata; never included in uploaded progress. */
  cloud?: import("./logic/cloud").CloudMetadata;
  programRevision?: number;
  signedOut?: boolean;
  bodyWeights?: { date: string; weight: number }[];
  weightReminderNotificationId?: string;
  trainingReminderNotificationIds?: string[];
  /** Personal achievements are derived from the local history and survive without Community. */
  achievements?: LocalAchievement[];
  /** Optional declared core-lift performances, kept separately from workout history. */
  strengthReferences?: StrengthReference[];
  version: 1;
  profile: Profile;
  onboardingStep: number;
  completed: boolean;
  theme: ThemeMode;
  preferences: Preferences;
  volumeTargets?: Partial<Record<Muscle, number>>;
  routine: Day[];
  routineVersions?: RoutineVersion[];
  history: Workout[];
  plannedWorkouts?: PlannedWorkout[];
  skippedWorkoutDates?: string[];
  active?: ActiveWorkout;
}
