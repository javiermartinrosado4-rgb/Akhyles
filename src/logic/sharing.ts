import { catalog } from "../data/catalog";
import { AppState, Day, Exercise, Preferences, Range } from "../types";
import { scoreProgress } from "./progress";
import { estimatedMax, POINTS_MODEL } from "./strengthScore";
import { scoreLoad, storedSetLoad, validBarWeight } from "./load";
import { MuscleScore } from "./bodyMap";
import { scoreGroups } from "./scoreReferences";
import { validRange } from "./validation";
import { weeklyProgressInsight } from "./insights";
import { personalAchievements } from "./personalAchievements";
import { scoreStrengthReference } from "./strengthReferences";

const onlyKeys = (value: object, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
const safeId = (value: unknown): value is string => typeof value === "string" && /^[\w-]{1,80}$/.test(value) && !["__proto__", "constructor", "prototype"].includes(value);

export interface SharedExercise {
  exerciseId: string;
  name: string;
  sets: number;
  range: Range;
  /** The creator's exercise-specific reminder. Never includes loads. */
  note?: string;
  machineBrand?: string;
}

export interface SharedRoutineDay {
  name: string;
  exercises: SharedExercise[];
}

export interface SharedRoutine {
  version: 1;
  days: SharedRoutineDay[];
  /** Only custom movements used by this plan, so the receiver can import it. */
  customExercises: Exercise[];
}

export interface SharedProgress {
  version: 1;
  sessions: number;
  sets: number;
  /** Latest opt-in Akhyles Points score, never raw body measurements. */
  points?: number;
  pointsModel?: string;
  pointsCoverage?: number;
  /** Context for a ranking entry; never affects Points or eligibility. */
  pointsReliability?: number;
  pointsRankingEligible?: boolean;
  /** Optional declared core-lift references; body weight is never shared here. */
  strengthReferences?: { id: string; name: string; weight: number; reps: number; maximum: number; date: string }[];
  categories?: Pick<MuscleScore, "id" | "name" | "value">[];
  updated: string;
  exercises: { id: string; name: string; weight: number; load?: number; reps: number; maximum?: number; date: string }[];
  weekly?: { weekStart: string; complete: boolean; completed: number; scheduled: number; adherence: number; strengthPercent?: number; strengthCompared: number; personalBests: number; improvingWeeks: number };
  /** Canonical personal milestones used by Community only for rarity and opted-in sharing. */
  achievements?: { id: string; title: string; description: string; unlockedAt: string; category: "progress" | "consistency" | "strength" }[];
  /** Separately opted-in details. Never includes account data or private notes. */
  workouts?: SharedWorkout[];
  pointsHistory?: { date: string; value: number }[];
  bodyWeights?: { date: string; value: number }[];
}

export interface SharedWorkout {
  id: string;
  name: string;
  date: string;
  minutes: number;
  exercises: { id: string; name: string; barWeight?: number; apparatusWeight?: number; sets: { weight: number; reps: number }[] }[];
}

/** Keeps long histories representative without turning Community profiles into oversized backups. */
function evenlySample<T>(items: T[], limit: number): T[] {
  if (items.length <= limit) return items;
  return Array.from({ length: limit }, (_, index) => items[Math.round(index * (items.length - 1) / (limit - 1))]);
}

const validCustomExercise = (value: unknown): value is Exercise => {
  if (!value || typeof value !== "object") return false;
  const exercise = value as Partial<Exercise>;
  return onlyKeys(exercise, ["id", "name", "muscle", "secondary", "priority", "tier", "minLevel", "type", "equipment", "variant", "range", "substitutions", "note", "custom", "pullPattern", "scoreEligible", "loadStep"]) && safeId(exercise.id) &&
    typeof exercise.name === "string" && exercise.name.length > 0 && exercise.name.length <= 120 &&
    Object.hasOwn(scoreGroups, exercise.muscle ?? "") &&
    Array.isArray(exercise.secondary) && exercise.secondary.every(muscle => Object.hasOwn(scoreGroups, muscle)) &&
    Number.isFinite(exercise.priority) && ["beginner", "intermediate", "advanced"].includes(exercise.minLevel ?? "") &&
    ["compound", "isolation"].includes(exercise.type ?? "") && typeof exercise.equipment === "string" &&
    ["machine", "free", "cable", "smith", "bodyweight"].includes(exercise.variant ?? "") &&
    validRange(exercise.range!) &&
    Array.isArray(exercise.substitutions) && exercise.substitutions.every(id => typeof id === "string") &&
    (exercise.note === undefined || (typeof exercise.note === "string" && exercise.note.length <= 300));
};

export function exportRoutine(routine: Day[], preferences: Preferences): SharedRoutine {
  const exerciseIds = new Set(routine.flatMap(day => day.exercises.map(item => item.exerciseId)));
  return {
    version: 1,
    days: routine.map(day => ({
      name: day.name,
      exercises: day.exercises.map(item => ({
        exerciseId: item.exerciseId,
        name: preferences.names[item.exerciseId] ||
          preferences.custom.find(exercise => exercise.id === item.exerciseId)?.name ||
          catalog.find(exercise => exercise.id === item.exerciseId)?.name || "Ejercicio",
        sets: item.sets,
        range: [...item.range] as Range,
        note: preferences.notes?.[item.exerciseId],
        machineBrand: item.machineBrand,
      })),
    })),
    customExercises: preferences.custom.filter(exercise => exerciseIds.has(exercise.id)),
  };
}

export function isSharedRoutine(value: unknown): value is SharedRoutine {
  if (!value || typeof value !== "object") return false;
  const routine = value as Partial<SharedRoutine>;
  const { days, customExercises } = routine;
  if (routine.version !== 1 || !onlyKeys(routine, ["version", "days", "customExercises"]) || !Array.isArray(days) || days.length < 1 || days.length > 7 ||
      !Array.isArray(customExercises) || customExercises.length > 500 || !customExercises.every(validCustomExercise)) return false;
  const customIds = customExercises.map(exercise => exercise.id);
  if (new Set(customIds).size !== customIds.length || customIds.some(id => catalog.some(exercise => exercise.id === id))) return false;
  const ids = new Set([...catalog.map(exercise => exercise.id), ...customIds]);
  return days.every(day => day && onlyKeys(day, ["name", "exercises"]) && typeof day.name === "string" && day.name.trim().length > 0 && day.name.length <= 120 && Array.isArray(day.exercises) && day.exercises.length > 0 && day.exercises.length <= 100 &&
      day.exercises.every(exercise => exercise && onlyKeys(exercise, ["exerciseId", "name", "sets", "range", "note", "machineBrand"]) && safeId(exercise.exerciseId) && ids.has(exercise.exerciseId) &&
        typeof exercise.name === "string" && exercise.name.trim().length > 0 && exercise.name.length <= 120 && Number.isInteger(exercise.sets) && exercise.sets >= 1 && exercise.sets <= 6 &&
        validRange(exercise.range) &&
        (exercise.note === undefined || (typeof exercise.note === "string" && exercise.note.length <= 300)) &&
        (exercise.machineBrand === undefined || (typeof exercise.machineBrand === "string" && exercise.machineBrand.length <= 60)))) &&
    customExercises.every(validCustomExercise);
}

/** Imports the plan structure, deliberately resetting every load to zero. */
export function importRoutine(shared: SharedRoutine, preferences: Preferences): { routine: Day[]; preferences: Preferences } {
  if (!isSharedRoutine(shared)) throw new Error("Esta rutina no se puede importar.");
  const known = new Set([...catalog, ...preferences.custom].map(exercise => exercise.id));
  const custom = [
    ...preferences.custom,
    ...shared.customExercises.filter(exercise => !known.has(exercise.id)),
  ];
  const notes = { ...preferences.notes };
  for (const day of shared.days) for (const exercise of day.exercises) {
    // Personal notes take precedence; otherwise retain the creator's cue.
    if (!notes[exercise.exerciseId] && exercise.note) notes[exercise.exerciseId] = exercise.note;
  }
  return {
    routine: shared.days.map((day, dayIndex) => ({
      id: `shared-day-${dayIndex}`,
      name: day.name,
      exercises: day.exercises.map((exercise, exerciseIndex) => ({
        id: `shared-${dayIndex}-${exerciseIndex}`,
        exerciseId: exercise.exerciseId,
        sets: exercise.sets,
        range: [...exercise.range] as Range,
        weight: 0,
        ...(exercise.machineBrand ? { machineBrand: exercise.machineBrand } : {}),
      })),
    })),
    preferences: { ...preferences, custom, notes },
  };
}

/** A compact opt-in snapshot: current best logged set for each exercise, not full history. */
export function exportProgress(state: AppState, details = false, bodyWeight = false): SharedProgress {
  const score = scoreProgress(state);
  const chronological = [...state.history].sort((a, b) => a.date.localeCompare(b.date));
  const latest = new Map<string, { id: string; name: string; weight: number; load?: number; reps: number; maximum?: number; date: string }>();
  let sets = 0;
  for (const workout of state.history) for (const record of workout.records) {
    sets += record.sets.length;
    const best = record.sets.filter(set => set.weight > 0 && set.reps > 0)
      .map(set => ({ ...set, maximum: estimatedMax(scoreLoad(record.prescription.exerciseId, storedSetLoad(set), record.apparatusWeight ?? record.barWeight ?? state.preferences.barWeights?.[record.prescription.exerciseId]), Math.min(set.reps, 10)) ?? 0 }))
      .sort((a, b) => b.maximum - a.maximum)[0];
    const previous = latest.get(record.prescription.exerciseId);
    if (best && (!previous || best.maximum > (previous.maximum ?? 0))) latest.set(record.prescription.exerciseId, {
      id: record.prescription.exerciseId, name: record.name, weight: best.weight,
      load: scoreLoad(record.prescription.exerciseId, storedSetLoad(best), record.apparatusWeight ?? record.barWeight ?? state.preferences.barWeights?.[record.prescription.exerciseId]),
      reps: best.reps, maximum: Math.round(best.maximum * 10) / 10, date: workout.date,
    });
  }
  return {
    version: 1,
    sessions: state.history.length,
    sets,
    points: score.points.at(-1)?.value,
    pointsModel: POINTS_MODEL,
    pointsCoverage: score.coverage,
    pointsReliability: score.reliability,
    pointsRankingEligible: score.rankingEligible,
    strengthReferences: (state.strengthReferences ?? []).flatMap(item => {
      const scored = scoreStrengthReference(item);
      return scored ? [{ id: item.id, name: scored.name, weight: item.weight, reps: item.reps, maximum: Math.round(scored.maximum * 10) / 10, date: item.date }] : [];
    }),
    categories: score.categories.map(({ id, name, value }) => ({ id, name, ...(value === undefined ? {} : { value }) })),
    updated: new Date().toISOString(),
    exercises: [...latest.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
    weekly: (() => {
      const insight = weeklyProgressInsight(state);
      return { weekStart: insight.weekStart, complete: insight.complete, completed: insight.completed, scheduled: insight.scheduled, adherence: insight.adherence,
        strengthPercent: insight.trend.status === "first" ? undefined : insight.trend.percent, strengthCompared: insight.trend.compared,
        personalBests: insight.personalBests.length, improvingWeeks: insight.improvingWeeks };
    })(),
    achievements: personalAchievements(state).map(({ id, title, description, unlockedAt, category }) => ({ id, title, description, unlockedAt, category })),
    ...(details ? {
      workouts: evenlySample(chronological, 180).map(workout => ({
        id: workout.id, name: workout.dayName, date: workout.date, minutes: workout.minutes,
        exercises: workout.records.slice(0, 40).map(record => ({ id: record.prescription.exerciseId, name: record.name,
          ...(record.barWeight !== undefined ? { barWeight: record.barWeight } : {}),
          ...(record.apparatusWeight !== undefined ? { apparatusWeight: record.apparatusWeight } : {}),
          sets: record.sets.slice(0, 20).map(set => ({ weight: set.weight, reps: set.reps })),
        })),
      })),
      pointsHistory: evenlySample(score.points, 180).map(({ date, value }) => ({ date, value })),
    } : {}),
    ...(bodyWeight ? { bodyWeights: (state.bodyWeights ?? []).slice(-365).map(item => ({ date: item.date, value: item.weight })) } : {}),
  };
}

export function isSharedProgress(value: unknown): value is SharedProgress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<SharedProgress>;
  const { sessions, sets, updated, exercises } = progress;
  const keys = (value: object, allowed: string[]) => Object.keys(value).every(key => allowed.includes(key));
  const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
  const label = (value: unknown) => typeof value === "string" && value.length > 0 && value.length <= 160;
  const series = (value: unknown, max: number) => Array.isArray(value) && value.length <= 365 && value.every(point =>
    point && keys(point, ["date", "value"]) && date(point.date) && Number.isFinite(point.value) && point.value >= 0 && point.value <= max);
  if (!keys(progress, ["version", "sessions", "sets", "points", "pointsModel", "pointsCoverage", "pointsReliability", "pointsRankingEligible", "strengthReferences", "categories", "updated", "exercises", "weekly", "achievements", "workouts", "pointsHistory", "bodyWeights"])) return false;
  if (progress.strengthReferences !== undefined && (!Array.isArray(progress.strengthReferences) || progress.strengthReferences.length > 5 || progress.strengthReferences.some(item => !item || !keys(item, ["id", "name", "weight", "reps", "maximum", "date"]) || !label(item.id) || !label(item.name) || !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1000 || !Number.isInteger(item.reps) || item.reps < 1 || item.reps > 10 || !Number.isFinite(item.maximum) || item.maximum <= 0 || item.maximum > 1300 || !date(item.date)))) return false;
  if (progress.achievements !== undefined && (!Array.isArray(progress.achievements) || progress.achievements.length > 200 || progress.achievements.some(item => !item || !keys(item, ["id", "title", "description", "unlockedAt", "category"]) || !safeId(item.id) || !label(item.title) || typeof item.description !== "string" || item.description.length > 300 || !date(item.unlockedAt) || !["progress", "consistency", "strength"].includes(item.category)))) return false;
  if (progress.categories !== undefined && (!Array.isArray(progress.categories) || progress.categories.length > 11 ||
    new Set(progress.categories.map(category => category?.id)).size !== progress.categories.length ||
    progress.categories.some(category => !category || !keys(category, ["id", "name", "value"]) ||
      !Object.hasOwn(scoreGroups, category.id) || !label(category.name) ||
      (category.value !== undefined && (!Number.isFinite(category.value) || category.value < 0))))) return false;
  if (progress.pointsModel !== undefined && progress.pointsModel !== POINTS_MODEL) return false;
  if (progress.pointsCoverage !== undefined && (!Number.isInteger(progress.pointsCoverage) || progress.pointsCoverage < 0 || progress.pointsCoverage > 11)) return false;
  if (progress.pointsReliability !== undefined && (!Number.isInteger(progress.pointsReliability) || progress.pointsReliability < 0 || progress.pointsReliability > 100)) return false;
  if (progress.pointsRankingEligible !== undefined && typeof progress.pointsRankingEligible !== "boolean") return false;
  if (progress.weekly !== undefined) {
    const weekly = progress.weekly;
    if (!weekly || !keys(weekly, ["weekStart", "complete", "completed", "scheduled", "adherence", "strengthPercent", "strengthCompared", "personalBests", "improvingWeeks"]) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(weekly.weekStart) || typeof weekly.complete !== "boolean" ||
      ![weekly.completed, weekly.scheduled, weekly.adherence, weekly.strengthCompared, weekly.personalBests, weekly.improvingWeeks].every(Number.isInteger) ||
      weekly.completed < 0 || weekly.scheduled < 0 || weekly.completed > weekly.scheduled || weekly.adherence < 0 || weekly.adherence > 100 || weekly.strengthCompared < 0 || weekly.strengthCompared > 30 || weekly.personalBests < 0 || weekly.personalBests > 30 || weekly.improvingWeeks < 0 || weekly.improvingWeeks > 52 ||
      (weekly.strengthPercent !== undefined && (!Number.isFinite(weekly.strengthPercent) || weekly.strengthPercent < -100 || weekly.strengthPercent > 1000))) return false;
  }
  if (progress.pointsHistory !== undefined && !series(progress.pointsHistory, Number.MAX_VALUE)) return false;
  if (progress.bodyWeights !== undefined && !series(progress.bodyWeights, 350)) return false;
  if (progress.workouts !== undefined && (!Array.isArray(progress.workouts) || progress.workouts.length > 180 || progress.workouts.some(workout =>
    !workout || !keys(workout, ["id", "name", "date", "minutes", "exercises"]) || !label(workout.id) || !label(workout.name) || !date(workout.date) ||
    !Number.isFinite(workout.minutes) || workout.minutes < 0 || workout.minutes > 10080 || !Array.isArray(workout.exercises) || workout.exercises.length > 40 ||
    workout.exercises.some(exercise => !exercise || !keys(exercise, ["id", "name", "barWeight", "apparatusWeight", "sets"]) || !label(exercise.id) || !label(exercise.name) ||
      (exercise.barWeight !== undefined && !validBarWeight(exercise.barWeight)) ||
      (exercise.apparatusWeight !== undefined && !validBarWeight(exercise.apparatusWeight)) ||
      !Array.isArray(exercise.sets) || exercise.sets.length > 20 || exercise.sets.some(set => !set || !keys(set, ["weight", "reps"]) ||
        !Number.isFinite(set.weight) || set.weight < 0 || set.weight > 1000 || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100))
  ))) return false;
  return progress.version === 1 && typeof sessions === "number" && Number.isInteger(sessions) && sessions >= 0 &&
    typeof sets === "number" && Number.isInteger(sets) && sets >= 0 &&
    (progress.points === undefined || (typeof progress.points === "number" && Number.isFinite(progress.points) && progress.points >= 0)) && typeof updated === "string" &&
    Number.isFinite(Date.parse(updated)) && Array.isArray(exercises) && exercises.length <= 30 &&
    exercises.every(exercise => exercise && keys(exercise, ["id", "name", "weight", "load", "reps", "maximum", "date"]) && label(exercise.id) && label(exercise.name) &&
      Number.isFinite(exercise.weight) && exercise.weight >= 0 && exercise.weight <= 1000 && Number.isInteger(exercise.reps) &&
      exercise.reps >= 1 && exercise.reps <= 100 && (exercise.load === undefined || (Number.isFinite(exercise.load) && exercise.load > 0 && exercise.load <= 1300)) && (exercise.maximum === undefined || (Number.isFinite(exercise.maximum) && exercise.maximum > 0 && exercise.maximum <= 1300)) && typeof exercise.date === "string" && Number.isFinite(Date.parse(exercise.date)));
}
