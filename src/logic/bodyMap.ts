import { Muscle } from "../types";
import { pointsTiers } from "./achievements";

export interface MuscleScore {
  id: Muscle; name: string; value?: number; kind?: string;
  exerciseName?: string; load?: number; reps?: number; maximum?: number; date?: string;
  body?: "add" | "subtract";
}
// The map uses precisely the same 100-point milestones as Community.
// Red is the entry level and the sequence follows the visible spectrum to purple.
const visibleSpectrum = ["#D94A4A", "#E87832", "#E5B83F", "#83B94F", "#42AE82", "#35AABD", "#3C87CF", "#536CC0", "#7055B8", "#8D47B5", "#A33BA7"];
export const strengthBands = pointsTiers.map((tier, index) => ({
  min: tier.minimum,
  label: tier.name,
  range: index === pointsTiers.length - 1 ? `${tier.minimum.toLocaleString("es-ES")}+` : `${tier.minimum.toLocaleString("es-ES")}–${(pointsTiers[index + 1].minimum - 1).toLocaleString("es-ES")}`,
  color: visibleSpectrum[index],
}));
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
