import { AppState, ExerciseRecord, Workout } from "../types";
import { estimatedMax } from "./strengthScore";
import { effectiveLiftedLoad, storedSetLoad } from "./load";
import { localDateKey, startOfWeek, weeklyAdherence } from "./schedule";
import { scoreProgress } from "./progress";

export type InsightStatus = "up" | "steady" | "down" | "first";
export interface ExerciseChange {
  id: string; name: string; before: number; after: number; percent: number;
  weight: number; reps: number; date: string;
}
export interface StrengthInsight {
  status: InsightStatus; percent: number; compared: number; changes: ExerciseChange[];
}
export interface WeeklyProgressInsight {
  weekStart: string; complete: boolean;
  completed: number; scheduled: number; adherence: number;
  trend: StrengthInsight;
  points?: { before?: number; after?: number; delta?: number };
  coverage: number; reliability: number; personalBests: ExerciseChange[];
  improvingWeeks: number;
}

type StrengthRecord = Omit<ExerciseChange, "before" | "percent">;

function strongest(record: ExerciseRecord, bodyWeight?: number) {
  return record.sets
    .filter(set => Number.isFinite(set.weight) && set.weight > 0 && Number.isInteger(set.reps) && set.reps > 0)
    .flatMap(set => {
      const load = effectiveLiftedLoad(record.prescription.exerciseId, storedSetLoad(set), bodyWeight, record.apparatusWeight, record.barWeight);
      const maximum = load === undefined ? undefined : estimatedMax(load, Math.min(set.reps, 10));
      return maximum === undefined ? [] : [{ weight: storedSetLoad(set), reps: Math.min(set.reps, 10), maximum }];
    })
    .sort((a, b) => b.maximum - a.maximum)[0];
}

function bestByExercise(workouts: Workout[]) {
  const best = new Map<string, StrengthRecord>();
  for (const workout of workouts) for (const record of workout.records) {
    const set = strongest(record, workout.bodyWeight);
    const previous = best.get(record.prescription.exerciseId);
    if (!set || (previous && previous.after >= set.maximum)) continue;
    best.set(record.prescription.exerciseId, {
      id: record.prescription.exerciseId, name: record.name, after: Math.round(set.maximum * 10) / 10,
      weight: set.weight, reps: set.reps, date: workout.date,
    });
  }
  return best;
}

function compare(current: Map<string, StrengthRecord>, earlier: Map<string, StrengthRecord>): StrengthInsight {
  const changes = [...current].flatMap(([id, now]) => {
    const before = earlier.get(id);
    if (!before || before.after <= 0 || now.after <= 0) return [];
    const percent = Math.round((now.after / before.after - 1) * 1000) / 10;
    return [{ ...now, before: before.after, percent }];
  });
  if (!changes.length) return { status: "first", percent: 0, compared: 0, changes: [] };
  // The median prevents one unusually large lift jump from defining the week.
  const ordered = [...changes].map(change => change.percent).sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  const percent = Math.round(((ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2)) * 10) / 10;
  return { status: percent > 1 ? "up" : percent < -1 ? "down" : "steady", percent, compared: changes.length, changes: changes.sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent)) };
}

export function sessionProgressInsight(current: Workout, history: Workout[]): StrengthInsight {
  const index = history.findIndex(workout => workout.id === current.id);
  const previous = (index >= 0 ? history.slice(0, index) : history)
    .filter(workout => current.dayId && workout.dayId ? workout.dayId === current.dayId : workout.dayName === current.dayName)
    .at(-1);
  return previous ? compare(bestByExercise([current]), bestByExercise([previous])) : { status: "first", percent: 0, compared: 0, changes: [] };
}

function periodWorkouts(history: Workout[], start: Date, end: Date) {
  const from = start.getTime(), until = end.getTime();
  return history.filter(workout => {
    const time = Date.parse(workout.date);
    return Number.isFinite(time) && time >= from && time <= until;
  });
}

function weeklyStrength(history: Workout[], start: Date, end: Date) {
  return bestByExercise(periodWorkouts(history, start, end));
}

export function weeklyProgressInsight(state: AppState, now = new Date()): WeeklyProgressInsight {
  const week = startOfWeek(now);
  const elapsed = Math.max(0, now.getTime() - week.getTime());
  const previousWeek = new Date(week); previousWeek.setDate(previousWeek.getDate() - 7);
  const previousEnd = new Date(previousWeek.getTime() + elapsed);
  const currentBest = weeklyStrength(state.history, week, now);
  const beforeBest = weeklyStrength(state.history, previousWeek, previousEnd);
  const trend = compare(currentBest, beforeBest);
  const priorHistory = state.history.filter(workout => Date.parse(workout.date) < week.getTime());
  const allBefore = bestByExercise(priorHistory);
  const personalBests = [...currentBest].flatMap(([id, current]) => {
    const prior = allBefore.get(id);
    if (!prior || current.after <= prior.after * 1.005) return [];
    return [{ ...current, before: prior.after, percent: Math.round((current.after / prior.after - 1) * 1000) / 10 }];
  }).sort((a, b) => b.percent - a.percent);
  const adherence = weeklyAdherence(state.profile, state.routine, state.history, state.plannedWorkouts, state.skippedWorkoutDates, week, state.routineVersions);
  const currentScore = scoreProgress(state);
  const previousScore = scoreProgress({ ...state, history: priorHistory });
  const after = currentScore.points.at(-1)?.value;
  const before = previousScore.points.at(-1)?.value;
  let improvingWeeks = 0;
  for (let offset = 0; offset < 12; offset++) {
    const end = new Date(week); end.setDate(end.getDate() - offset * 7 - 1); end.setHours(23, 59, 59, 999);
    const start = startOfWeek(end);
    const priorStart = new Date(start); priorStart.setDate(priorStart.getDate() - 7);
    const period = compare(weeklyStrength(state.history, start, end), weeklyStrength(state.history, priorStart, new Date(start.getTime() - 1)));
    if (period.status !== "up") break;
    improvingWeeks++;
  }
  const sunday = new Date(week); sunday.setDate(sunday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  return {
    // A perfect plan is closed as soon as its final planned session is done;
    // waiting for Sunday night would lose the event if the next sync is Monday.
    weekStart: localDateKey(week), complete: now >= sunday || (adherence.scheduled > 0 && adherence.completed === adherence.scheduled),
    completed: adherence.completed, scheduled: adherence.scheduled,
    adherence: adherence.scheduled ? Math.round(adherence.completed / adherence.scheduled * 100) : 0,
    trend, points: after === undefined ? undefined : { before, after, ...(before === undefined ? {} : { delta: Math.round((after - before) * 10) / 10 }) },
    coverage: currentScore.coverage, reliability: currentScore.reliability,
    personalBests, improvingWeeks,
  };
}
