import { Muscle, StrengthReference, StrengthReferenceId } from "../types";
import { estimatedMax, wilksCoefficient } from "./strengthScore";
import { ScoreReference, scoreReferences } from "./scoreReferences";

export const strengthReferenceDefinitions: Record<StrengthReferenceId, { name: string; muscle: Muscle; exerciseId: string; pullup?: boolean }> = {
  bench: { name: "Press de banca", muscle: "chest", exerciseId: "chest-press-free" },
  pullup: { name: "Dominadas", muscle: "back", exerciseId: "pronated-pullup", pullup: true },
  overhead_press: { name: "Press militar", muscle: "shoulders", exerciseId: "shoulder-press-free" },
  squat: { name: "Sentadilla", muscle: "quads", exerciseId: "squat-free" },
  deadlift: { name: "Peso muerto", muscle: "hamstrings", exerciseId: "deadlift-conventional" },
};

export function validStrengthReference(value: unknown): value is StrengthReference {
  if (!value || typeof value !== "object") return false;
  const item = value as StrengthReference;
  return Object.hasOwn(strengthReferenceDefinitions, item.id) && Number.isFinite(item.weight) && item.weight >= 0 && item.weight <= 1000 &&
    Number.isInteger(item.reps) && item.reps >= 1 && item.reps <= 10 && Number.isFinite(item.bodyWeight) && item.bodyWeight >= 40 && item.bodyWeight <= 200 &&
    (item.sex === "male" || item.sex === "female") && typeof item.date === "string" && Number.isFinite(Date.parse(item.date));
}

export function scoreStrengthReference(item: StrengthReference) {
  const definition = strengthReferenceDefinitions[item.id];
  const reference: ScoreReference | undefined = scoreReferences[definition.exerciseId];
  const coefficient = wilksCoefficient(item.bodyWeight, item.sex);
  const load = definition.pullup ? item.bodyWeight + item.weight : item.weight;
  const maximum = estimatedMax(load, item.reps);
  if (!reference || coefficient === undefined || maximum === undefined) return;
  const value = maximum / reference[item.sex] * (item.sex === "male" ? 2.52 : 2.41) * coefficient / 4;
  return { ...definition, load, maximum, value, kind: "declared" as const, weight: item.weight, reps: item.reps, date: item.date };
}
