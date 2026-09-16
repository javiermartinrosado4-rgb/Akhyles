import { Muscle } from "../types";

export interface MuscleScore {
  id: Muscle; name: string; value?: number; kind?: string;
  exerciseName?: string; load?: number; reps?: number; maximum?: number; date?: string;
  body?: "add" | "subtract";
}
// Product bands on the existing Akhyles Points scale, not population percentiles.
export const strengthBands = [
  { min: 0, label: "Recluta", range: "0–99", color: "#E6C85C" },
  { min: 100, label: "Iniciado", range: "100–249", color: "#68B77A" },
  { min: 250, label: "Intermedio", range: "250–499", color: "#599EC3" },
  { min: 500, label: "Gymbro", range: "500–999", color: "#D8655D" },
  { min: 1000, label: "Leyenda", range: "1.000+", color: "#A574CD" },
] as const;
export const hasMuscleScore = (value?: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function muscleAppearance(value: number | undefined, dark = false) {
  if (!hasMuscleScore(value)) return { color: dark ? "#3C4C45" : "#CBD3CD", label: "Sin datos" };
  const band = [...strengthBands].reverse().find(item => value >= item.min)!;
  return { color: band.color, label: band.label };
}
// Anatomical subdivisions inherit their scored group; unscored structures stay neutral.
export const anatomicalGroups: Partial<Record<string, Muscle>> = {
  chest: "chest", deltoids: "shoulders", biceps: "biceps", triceps: "triceps",
  "upper-back": "back", "lower-back": "back", trapezius: "back",
  abs: "abs", obliques: "abs", quadriceps: "quads", hamstring: "hamstrings",
  gluteal: "glutes", adductors: "adductors", calves: "calves",
};
