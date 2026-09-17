import { AppState, Exercise, Muscle, Workout } from "../types";
import { getLocale, translate } from "../i18n/translate";
import { allExercises } from "./routine";
import { scoreLoad, storedSetLoad, validBarWeight } from "./load";
import { estimatedMax, wilksCoefficient } from "./strengthScore";
import { displayPoints, gluteInference, groupWeights, scoreGroups, scoreReferences } from "./scoreReferences";
import { localDateKey } from "./schedule";
import { scoreStrengthReference } from "./strengthReferences";
export interface ChartPoint { date: string; value: number; detail?: string }
export function periodProgress(points: ChartPoint[], cutoff: number, end = Infinity, includePrevious = true): ChartPoint[] {
  const sorted = [...points].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  if (!Number.isFinite(cutoff) && !Number.isFinite(end)) return sorted;
  const current = sorted.filter(point => Date.parse(point.date) >= cutoff && Date.parse(point.date) < end);
  // A point immediately before the selected range is useful context for a
  // line chart. Keep it even when the period contains several measurements so
  // a monthly view connects naturally with the end of the previous month.
  if (!includePrevious || !current.length) return current;
  const previous = sorted.filter(point => Date.parse(point.date) < cutoff).at(-1);
  return previous ? [previous, ...current] : current;
}
export const eligibleForScore = (e: Exercise) => !e.custom && scoreReferences[e.id] !== undefined;
export function exerciseProgress(history: Workout[], id: string, apparatusWeights: Record<string, number> = {}): ChartPoint[] {
  return [...history].sort((a, b) => a.date.localeCompare(b.date)).flatMap(w => {
    const sets = w.records.filter(r => r.prescription.exerciseId === id)
      .flatMap(r => r.sets.map(set => ({ ...set, total: scoreLoad(id, storedSetLoad(set), r.apparatusWeight ?? r.barWeight ?? apparatusWeights[id] ?? 0) })));
    const best = sets.filter(s => s.weight > 0 && s.reps > 0).sort((a, b) => b.total - a.total || b.reps - a.reps)[0];
    return best ? [{ date: w.date, value: best.total, detail: translate("{reps} rep · peso corporal {weight} kg", { reps: best.reps, weight: w.bodyWeight ?? translate("sin registrar") }) }] : [];
  });
}
export function scoreProgress(state: AppState) {
  const eligible = new Map(allExercises(state.preferences).filter(eligibleForScore).map(e => [e.id, e]));
  const history = [...state.history].sort((a, b) => a.date.localeCompare(b.date));
  const exercises = new Set<string>();
  const scoredSessions = new Set<string>();
  const best = new Map<Muscle, number>();
  const evidence = new Map<Muscle, { exerciseId: string; kind: string; exerciseName: string; load: number; reps: number; maximum: number; date: string; body?: "add" | "subtract" }>();
  const points: ChartPoint[] = [];
  for (const w of history) {
    // Missing historic demographics must not be guessed from today's profile.
    const sex = w.sex ?? [...(state.routineVersions ?? [])]
      .filter(version => version.effectiveFrom !== "1970-01-01" && localDateKey(version.effectiveFrom) <= localDateKey(w.date))
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0]?.profile.sex;
    if (!Number.isFinite(w.bodyWeight) || !sex) continue;
    const coefficient = wilksCoefficient(w.bodyWeight!, sex);
    if (coefficient === undefined) continue;
    let changed = false;
    for (const r of w.records) {
      const exercise = eligible.get(r.prescription.exerciseId);
      if (!exercise) continue;
      if (r.barWeight !== undefined && !validBarWeight(r.barWeight)) continue;
      const category = exercise.muscle;
      const reference = scoreReferences[exercise.id];
      for (const set of r.sets) {
        const stored = storedSetLoad(set);
        if (!Number.isFinite(stored) || stored < 0 || stored > 1000 || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100) continue;
        const externalLoad = scoreLoad(exercise.id, stored, r.apparatusWeight ?? r.barWeight);
        const load = reference.body === "add" ? w.bodyWeight! + externalLoad : reference.body === "subtract" ? w.bodyWeight! - externalLoad : externalLoad;
        // Higher-rep work remains valid training; no extra strength bonus beyond ten reps.
        const maximum = estimatedMax(load, Math.min(set.reps, 10));
        const value = maximum === undefined ? undefined : maximum / reference[sex] * (sex === "male" ? 2.52 : 2.41) * coefficient / 4;
        if (value === undefined) continue;
        exercises.add(r.prescription.exerciseId);
        scoredSessions.add(w.date);
        if (value > (best.get(category) ?? 0)) evidence.set(category, {
          exerciseId: exercise.id, kind: reference.kind, exerciseName: r.name || exercise.name,
          load, reps: set.reps, maximum: maximum!, date: w.date, body: reference.body,
        });
        best.set(category, Math.max(best.get(category) ?? 0, value));
        const gluteFactor = gluteInference[exercise.id];
        if (gluteFactor !== undefined) {
          const inferred = value * gluteFactor;
          if (inferred > (best.get("glutes") ?? 0)) evidence.set("glutes", {
            exerciseId: exercise.id, kind: "inferred", exerciseName: r.name || exercise.name,
            load, reps: set.reps, maximum: maximum!, date: w.date,
          });
          best.set("glutes", Math.max(best.get("glutes") ?? 0, inferred));
        }
        changed = true;
      }
    }
    if (changed && best.size) {
      // A partial training profile must not lose Points just for omitting a
      // muscle group. Normalize only against the homologated groups recorded.
      const weighted = [...best].reduce((sum, [group, value]) => sum + value * groupWeights[group], 0);
      const coverageWeight = [...best].reduce((sum, [group]) => sum + groupWeights[group], 0);
      points.push({ date: w.date, value: displayPoints(weighted / coverageWeight),
        detail: translate("{count}/11 grupos · equivalencias beta", { count: best.size }) });
    }
  }
  for (const item of state.strengthReferences ?? []) {
    const reference = scoreStrengthReference(item);
    if (!reference || reference.value <= (best.get(reference.muscle) ?? 0)) continue;
    best.set(reference.muscle, reference.value);
    evidence.set(reference.muscle, { exerciseId: reference.exerciseId, kind: reference.kind, exerciseName: reference.name, load: reference.load, reps: reference.reps, maximum: reference.maximum, date: reference.date });
  }
  // References are a declared current baseline. Preserve historical chart points,
  // then append the combined current score without pretending it was a workout.
  if (state.strengthReferences?.length && best.size) {
    const weighted = [...best].reduce((sum, [group, value]) => sum + value * groupWeights[group], 0);
    const coverageWeight = [...best].reduce((sum, [group]) => sum + groupWeights[group], 0);
    const value = displayPoints(weighted / coverageWeight);
    const date = [...state.strengthReferences].map(item => item.date).sort().at(-1)!;
    if (points.at(-1)?.value !== value) points.push({ date, value, detail: translate("{count}/11 grupos · incluye referencias declaradas", { count: best.size }) });
  }
  const categories = (Object.keys(scoreGroups) as Muscle[]).map(id => ({ id, name: scoreGroups[id], value: best.has(id) ? displayPoints(best.get(id)!) : undefined, ...evidence.get(id) }));
  const dates = [...scoredSessions].map(Date.parse).filter(Number.isFinite).sort((a, b) => a - b);
  const latest = Math.max(dates.at(-1) ?? 0, ...(state.strengthReferences ?? []).map(item => Date.parse(item.date)));
  const age = !latest ? Infinity : Math.max(0, Date.now() - latest) / 86_400_000;
  // Informative only: it never changes the score or excludes an athlete.
  const reliability = best.size === 0 ? 0 : Math.round(
    Math.min(best.size, 8) / 8 * 45 +
    Math.min(exercises.size, 4) / 4 * 15 +
    (age <= 14 ? 20 : age <= 42 ? 12 : age <= 84 ? 6 : 0) +
    (dates.length >= 4 ? 20 : dates.length >= 2 ? 10 : dates.length ? 4 : 0),
  );
  const rankingEligible = best.size > 0;
  return { points, exercises: [...exercises], categories, coverage: best.size, reliability, rankingEligible };
}
export function bodyWeightProgress(state: AppState): ChartPoint[] {
  return [
    ...(state.bodyWeights ?? []).map(p => ({ date: p.date, value: p.weight })),
    ...state.history.filter(w => Number.isFinite(w.bodyWeight) && w.bodyWeight! > 0).map(w => ({ date: w.date, value: w.bodyWeight! })),
  ].sort((a, b) => a.date.localeCompare(b.date)).map(point => {
    const atTime = Date.parse(point.date);
    const history = state.history
      .filter(workout => Date.parse(workout.date) <= atTime)
      .map(workout => ({ ...workout, bodyWeight: point.value }));
    const score = scoreProgress({ ...state, history }).points.at(-1);
    return { ...point, detail: score ? `A-Points: ${score.value.toLocaleString(getLocale(), { maximumFractionDigits: 1 })}` : translate("A-Points: sin valoración todavía") };
  });
}
