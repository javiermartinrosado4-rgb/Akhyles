import { ActiveWorkout, AppState, Day, Level, Prescription, Profile, Workout } from "../types";
import { progression } from "./progression";
import { getExercise } from "./routine";
import { localDateKey } from "./schedule";
import { number } from "./validation";
import { defaultBarWeight, defaultLoadInputMode, fromStoredLoad, LoadInputMode, formatLoad } from "./load";
import { syncPersonalAchievements } from "./personalAchievements";
export const draftFor = (p: Prescription, mode: LoadInputMode = "total") =>
  Array.from({ length: p.sets }, () => ({
    weight: formatLoad(fromStoredLoad(p.weight, mode)),
    reps: "",
  }));
export function startWorkout(day: Day, bodyWeight?: string, level?: Level, sex?: Profile["sex"], barWeights?: Record<string, number>, apparatusWeights?: Record<string, number>, loadModes?: Record<string, LoadInputMode>, options?: { preparing?: boolean; plannedDate?: string }): ActiveWorkout {
  if (!day.exercises.length) throw new Error("La sesión no tiene ejercicios.");
  const modeFor = (entry: Prescription) => loadModes?.[entry.id] ?? loadModes?.[entry.exerciseId] ?? defaultLoadInputMode(entry.exerciseId);
  const mode = modeFor(day.exercises[0]);
  const draft = draftFor(day.exercises[0], mode);
  return {
    ...(options?.preparing ? { preparing: true, plannedDate: options.plannedDate } : {}),
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
    loadModes: Object.fromEntries(day.exercises.map(entry => [entry.id, modeFor(entry)])),
    skipped: [],
  };
}
export const isActiveWorkoutOnDate = (active: ActiveWorkout | undefined, date = new Date()) =>
  !!active && !active.preparing && !active.historical && localDateKey(active.startedAt) === localDateKey(date);
export function openHistoricalWorkout(workout: Workout, readOnly: boolean, profile: Profile, barWeights?: Record<string, number>, apparatusWeights?: Record<string, number>, routine?: Day[]): ActiveWorkout {
  const routineDay = routine?.find(day => day.id === workout.dayId)
    ?? routine?.find(day => day.name === workout.dayName);
  const remaining = [...workout.records];
  const orderedRecords = routineDay
    ? [
        ...routineDay.exercises.flatMap(entry => {
          const index = remaining.findIndex(record => record.prescription.id === entry.id);
          const fallback = index >= 0 ? index : remaining.findIndex(record => record.prescription.exerciseId === entry.exerciseId);
          return fallback < 0 ? [] : [remaining.splice(fallback, 1)[0]!];
        }),
        ...remaining,
      ]
    : workout.records;
  const day: Day = { id: workout.dayId ?? `history-${workout.id}`, name: workout.dayName, exercises: orderedRecords.map(record => ({ ...record.prescription, range: [...record.prescription.range] as [number, number] })) };
  const historicalModes = Object.fromEntries(workout.records.map(record => {
    const perSide = record.sets.some(set => set.leftWeight !== undefined || set.rightWeight !== undefined || set.leftReps !== undefined || set.rightReps !== undefined);
    // A preference is for the next workout, not evidence about a completed one.
    // Legacy records without side fields were stored as totals; applying a newer
    // per-side preference here made every save double their load again.
    return [record.prescription.id, record.loadMode ?? (perSide ? "per-side" : "total")];
  }));
  const active = startWorkout(day, profile.weight, workout.level ?? profile.level, workout.sex ?? profile.sex, barWeights, apparatusWeights, historicalModes);
  const drafts = Object.fromEntries(workout.records.map(record => [record.prescription.id, record.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps), ...(set.leftWeight !== undefined ? { leftWeight: String(set.leftWeight), rightWeight: String(set.rightWeight ?? set.weight) } : {}), ...(set.leftReps !== undefined ? { leftReps: String(set.leftReps), rightReps: String(set.rightReps ?? set.reps) } : {}) }))]));
  const first = day.exercises[0];
  return { ...active, startedAt: workout.startedAt ?? workout.date, historical: { workoutId: workout.id, readOnly, skipped: workout.skipped }, records: orderedRecords, drafts, draft: drafts[first.id], machineBrands: Object.fromEntries(workout.records.filter(record => record.machineBrand).map(record => [record.prescription.id, record.machineBrand!])), barWeights: Object.fromEntries(workout.records.filter(record => record.barWeight !== undefined).map(record => [record.prescription.exerciseId, String(record.barWeight)])), apparatusWeights: Object.fromEntries(workout.records.filter(record => record.apparatusWeight !== undefined).map(record => [record.prescription.exerciseId, String(record.apparatusWeight)])) };
}
export function finishWorkout(s: AppState, workout: Workout): AppState {
  if (s.history.some(w => w.id === workout.id || (workout.startedAt && w.startedAt === workout.startedAt))) return { ...s, active: undefined };
  let next: AppState = { ...s, active: undefined, history: [...s.history, workout] };
  // An exercise may deliberately appear more than once in a week (or even in
  // one session). Apply one recommendation per exercise, using its last
  // performed slot, so an earlier occurrence cannot overwrite the latest
  // evidence or leave a stale default for the next workout.
  const recommendations = new Map<string, number>();
  for (const r of workout.records) {
    if (!r.sets.length) continue;
    const e = getExercise(r.prescription.exerciseId, s.preferences);
    const result = progression(r.type, r.prescription.range, r.sets, r.prescription.sets,
      s.preferences.loadSteps?.[e.id] ?? e.loadStep, e.id === "assisted-pullup" ? "decrease" : "increase");
    recommendations.set(e.id, result.increase ? result.suggested : r.sets[0]!.weight);
  }
  for (const [exerciseId, weight] of recommendations) next = confirmWeight(next, exerciseId, weight);
  return syncPersonalAchievements(next);
}
// Refresh untouched exercises on resume while preserving all entered work.
export function resumeWorkout(s: AppState): ActiveWorkout | undefined {
  const active = s.active;
  if (active?.historical) return active;
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
