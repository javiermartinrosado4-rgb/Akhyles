import { SharedWorkout } from "./sharing";

export type SessionExercise = SharedWorkout["exercises"][number];

export type ExerciseTotals = {
  sets: number;
  reps: number;
  volume: number;
  bestWeight: number;
  bestReps: number;
  estimatedMax: number;
};

export type ReferenceSet = { weight: number; reps: number; estimatedMax: number; volume: number };

export type ExerciseComparison = {
  previous?: ExerciseTotals;
  current: ExerciseTotals;
  previousReference?: ReferenceSet;
  reference: ReferenceSet;
  setsDelta?: number;
  repsDelta?: number;
  volumeDelta?: number;
  maximumDelta?: number;
  weightDelta?: number;
  weightPercent?: number;
  repsPercent?: number;
  performancePercent?: number;
};

const round = (value: number) => Math.round(value * 10) / 10;
const dateAtNoon = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`);

export function exerciseTotals(exercise: SessionExercise): ExerciseTotals {
  const valid = exercise.sets.filter(set => set.weight >= 0 && set.reps > 0);
  const best = [...valid].sort((left, right) => right.weight * (1 + right.reps / 30) - left.weight * (1 + left.reps / 30) || right.reps - left.reps)[0];
  return {
    sets: valid.length,
    reps: valid.reduce((total, set) => total + set.reps, 0),
    volume: round(valid.reduce((total, set) => total + set.weight * set.reps, 0)),
    bestWeight: best?.weight ?? 0,
    bestReps: best?.reps ?? 0,
    estimatedMax: best ? round(best.weight * (1 + Math.min(best.reps, 10) / 30)) : 0,
  };
}

/** The first logged working set is the stable comparison reference. */
export function referenceSet(exercise: SessionExercise): ReferenceSet {
  const set = exercise.sets.find(item => item.weight >= 0 && item.reps > 0);
  const estimatedMax = set ? round(set.weight * (1 + Math.min(set.reps, 10) / 30)) : 0;
  return { weight: set?.weight ?? 0, reps: set?.reps ?? 0, estimatedMax, volume: round((set?.weight ?? 0) * (set?.reps ?? 0)) };
}

const percent = (current: number, previous: number) => previous > 0 ? round((current - previous) * 100 / previous) : undefined;

export function workoutTotals(workout: SharedWorkout) {
  const exercises = workout.exercises.map(exerciseTotals);
  return {
    exercises: exercises.length,
    sets: exercises.reduce((total, item) => total + item.sets, 0),
    reps: exercises.reduce((total, item) => total + item.reps, 0),
    volume: round(exercises.reduce((total, item) => total + item.volume, 0)),
  };
}

export function priorExercise(workouts: SharedWorkout[], selected: SharedWorkout, exerciseId: string) {
  return [...workouts]
    .filter(workout => Date.parse(workout.date) < Date.parse(selected.date) && workout.exercises.some(exercise => exercise.id === exerciseId))
    .sort((left, right) => Date.parse(right.date) - Date.parse(left.date))[0]?.exercises.find(exercise => exercise.id === exerciseId);
}

export function compareExercise(workouts: SharedWorkout[], selected: SharedWorkout, exercise: SessionExercise): ExerciseComparison {
  const current = exerciseTotals(exercise);
  const reference = referenceSet(exercise);
  const previousExercise = priorExercise(workouts, selected, exercise.id);
  if (!previousExercise) return { current, reference };
  const previous = exerciseTotals(previousExercise);
  const previousReference = referenceSet(previousExercise);
  return {
    current, previous, reference, previousReference,
    setsDelta: current.sets - previous.sets,
    repsDelta: current.reps - previous.reps,
    volumeDelta: round(current.volume - previous.volume),
    maximumDelta: round(current.estimatedMax - previous.estimatedMax),
    weightDelta: round(reference.weight - previousReference.weight),
    weightPercent: percent(reference.weight, previousReference.weight),
    repsPercent: percent(reference.reps, previousReference.reps),
    performancePercent: percent(reference.estimatedMax, previousReference.estimatedMax),
  };
}

function weekStart(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  return result;
}

function inRange(date: string, start: Date, end: Date) {
  const time = dateAtNoon(date).getTime();
  return time >= start.getTime() && time < end.getTime();
}

/** Compare the selected calendar week with the immediately preceding week. */
export function weeklyExerciseComparison(workouts: SharedWorkout[], selected: SharedWorkout, exerciseId: string) {
  const start = weekStart(dateAtNoon(selected.date));
  const end = new Date(start); end.setDate(end.getDate() + 7);
  const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - 7);
  const aggregate = (from: Date, until: Date) => {
    const exercises = workouts.filter(workout => inRange(workout.date, from, until)).flatMap(workout => workout.exercises.filter(exercise => exercise.id === exerciseId));
    if (!exercises.length) return undefined;
    return exercises.map(referenceSet).sort((a, b) => b.estimatedMax - a.estimatedMax)[0];
  };
  const current = aggregate(start, end);
  const previous = aggregate(previousStart, start);
  return current ? { current, previous, volumeDelta: previous ? round(current.volume - previous.volume) : undefined, repsDelta: previous ? current.reps - previous.reps : undefined, maximumDelta: previous ? round(current.estimatedMax - previous.estimatedMax) : undefined, weightDelta: previous ? round(current.weight - previous.weight) : undefined, weightPercent: previous ? percent(current.weight, previous.weight) : undefined, performancePercent: previous ? percent(current.estimatedMax, previous.estimatedMax) : undefined } : undefined;
}
