import { Workout } from "../types";
import { storedSetLoad } from "./load";

export interface WorkoutStats {
  sets: number;
  reps: number;
  volume: number;
  exercises: number;
}

export function workoutStats(workout: Workout): WorkoutStats {
  const sets = workout.records.flatMap((record) => record.sets.map(set => ({ ...set, normalizedWeight: storedSetLoad(set, record.prescription.exerciseId) })));
  return {
    sets: sets.length,
    reps: sets.reduce((sum, set) => sum + set.reps, 0),
    volume: Math.round(
      sets.reduce((sum, set) => sum + set.normalizedWeight * set.reps, 0),
    ),
    exercises: workout.records.length,
  };
}

const bestStrength = (workout: Workout) =>
  new Map(
    workout.records.map((record) => [
      record.prescription.exerciseId,
      Math.max(
        ...record.sets.map((set) => storedSetLoad(set, record.prescription.exerciseId) * (1 + set.reps / 30)),
      ),
    ]),
  );

export function workoutTrend(current: Workout, history: Workout[]) {
  const index = history.findIndex((workout) => workout.id === current.id);
  const earlier = (index >= 0 ? history.slice(0, index) : history)
    .filter((workout) =>
      current.dayId && workout.dayId
        ? workout.dayId === current.dayId
        : workout.dayName === current.dayName,
    )
    .at(-1);
  if (!earlier) return { status: "first" as const, percent: 0, compared: 0 };
  const now = bestStrength(current);
  const before = bestStrength(earlier);
  const common = [...now.keys()].filter(
    (id) => before.has(id) && before.get(id)! > 0 && now.get(id)! > 0,
  );
  if (!common.length)
    return { status: "first" as const, percent: 0, compared: 0 };
  const ratio =
    common.reduce((sum, id) => sum + now.get(id)! / before.get(id)!, 0) /
    common.length;
  const percent = Math.round((ratio - 1) * 1000) / 10;
  return {
    status:
      percent > 1
        ? ("up" as const)
        : percent < -1
          ? ("down" as const)
          : ("steady" as const),
    percent,
    compared: common.length,
  };
}

export function overallStats(history: Workout[]) {
  const stats = history.map(workoutStats);
  return {
    sessions: history.length,
    sets: stats.reduce((sum, item) => sum + item.sets, 0),
    reps: stats.reduce((sum, item) => sum + item.reps, 0),
    volume: stats.reduce((sum, item) => sum + item.volume, 0),
  };
}
