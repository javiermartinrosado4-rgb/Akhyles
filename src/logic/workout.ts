import { ActiveWorkout, AppState, Day, Level, Prescription, Profile, Workout } from "../types";
import { progression } from "./progression";
import { getExercise } from "./routine";
import { localDateKey } from "./schedule";
import { number } from "./validation";
import { defaultBarWeight } from "./load";
export const draftFor = (p: Prescription) =>
  Array.from({ length: p.sets }, () => ({
    weight: String(p.weight),
    reps: "",
  }));
export function startWorkout(day: Day, bodyWeight?: string, level?: Level, sex?: Profile["sex"], barWeights?: Record<string, number>, apparatusWeights?: Record<string, number>): ActiveWorkout {
  if (!day.exercises.length) throw new Error("La sesión no tiene ejercicios.");
  const draft = draftFor(day.exercises[0]);
  return {
    sex,
    barWeights: Object.fromEntries(day.exercises.map(entry => [entry.exerciseId, String(barWeights?.[entry.exerciseId] ?? defaultBarWeight(entry.exerciseId))])),
    apparatusWeights: Object.fromEntries(day.exercises.map(entry => [entry.exerciseId, String(apparatusWeights?.[entry.exerciseId] ?? 0)])),
    level,
    bodyWeight: bodyWeight ? number(bodyWeight) : undefined,
    day: {
      ...day,
      exercises: day.exercises.map((p): Prescription => ({
        ...p,
        range: [...p.range],
      })),
    },
    index: 0,
    startedAt: new Date().toISOString(),
    records: [],
    draft,
    drafts: { [day.exercises[0].id]: draft },
    skipped: [],
  };
}
export const isActiveWorkoutOnDate = (active: ActiveWorkout | undefined, date = new Date()) =>
  !!active && localDateKey(active.startedAt) === localDateKey(date);
export function finishWorkout(s: AppState, workout: Workout): AppState {
  if (s.history.some(w => w.id === workout.id || (workout.startedAt && w.startedAt === workout.startedAt))) return { ...s, active: undefined };
  let next: AppState = { ...s, active: undefined, history: [...s.history, workout] };
  for (const r of workout.records) {
    if (!r.sets.length) continue;
    const e = getExercise(r.prescription.exerciseId, s.preferences);
    const result = progression(r.type, r.prescription.range, r.sets, r.prescription.sets,
      s.preferences.loadSteps?.[e.id] ?? e.loadStep);
    next = confirmWeight(next, e.id, result.increase ? result.suggested : r.sets.at(-1)!.weight);
  }
  return next;
}
// Refresh untouched exercises on resume while preserving all entered work.
export function resumeWorkout(s: AppState): ActiveWorkout | undefined {
  const active = s.active;
  // A session can legitimately cross midnight. Keep it recoverable until it is
  // explicitly finished or discarded; Today's UI keeps it separate from the
  // new calendar day's plan.
  if (!active || s.history.some(w => w.startedAt === active.startedAt)) return undefined;
  if (!active.day.exercises.length) return undefined;
  const index = Math.max(0, Math.min(active.day.exercises.length - 1, active.index));
  const current = s.routine.find(d => d.id === active.day.id)
    ?? s.routine.find(d => d.name === active.day.name)
    ?? s.routine
      .map(day => ({ day, overlap: day.exercises.filter(entry => active.day.exercises.some(item => item.exerciseId === entry.exerciseId)).length }))
      .sort((a, b) => b.overlap - a.overlap)[0]?.day;
  const drafts = { ...active.drafts };
  if (index === active.index) drafts[active.day.exercises[index].id] = active.draft;
  const exercises = active.day.exercises.map(entry => {
    const completed = active.records.find(record => record.prescription.id === entry.id)?.prescription;
    // A completed record is the immutable description of work already done.
    // Routine edits can reuse a prescription id for a replacement, but must
    // never turn that replacement into the exercise shown as completed here.
    if (completed) {
      const next = { ...completed, range: [...completed.range] as [number, number] };
      const previous = drafts[entry.id] ?? active.records.find(record => record.prescription.id === entry.id)!.sets
        .map(set => ({ weight: String(set.weight), reps: String(set.reps) }));
      drafts[entry.id] = draftFor(next).map((blank, i) => previous[i] ?? blank);
      return next;
    }
    const planned = current?.exercises.find(p => p.id === entry.id && p.exerciseId === entry.exerciseId)
      ?? current?.exercises.find(p => p.exerciseId === entry.exerciseId);
    // The current routine is always authoritative for the number of effective
    // sets. Calendar overrides preserve a load, never an obsolete set count.
    const next = { ...entry, sets: planned?.sets ?? entry.sets };
    const previous = drafts[entry.id] ?? active.records.find(r => r.prescription.id === entry.id)?.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) })) ?? [];
    drafts[entry.id] = draftFor(next).map((blank, i) => previous[i] ?? blank);
    return next;
  });
  return { ...active, index, day: { ...active.day, exercises }, drafts, draft: drafts[exercises[index].id] };
}

export function confirmWeight(
  s: AppState,
  exerciseId: string,
  weight: number,
): AppState {
  return {
    ...s,
    preferences: {
      ...s.preferences,
      weights: { ...s.preferences.weights, [exerciseId]: weight },
    },
    routine: s.routine.map((d) => ({
      ...d,
      exercises: d.exercises.map((p) =>
        p.exerciseId === exerciseId ? { ...p, weight } : p,
      ),
    })),
  };
}
