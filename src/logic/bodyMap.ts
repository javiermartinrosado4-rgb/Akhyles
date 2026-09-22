import { Muscle } from "../types";
import { pointsTiers } from "./achievements";
import { presentationPoints } from "./achievements";

export interface MuscleScore {
  id: Muscle; name: string; value?: number; kind?: string;
  exerciseName?: string; load?: number; reps?: number; maximum?: number; date?: string;
  body?: "add" | "subtract";
}
// Presentation-only materials: scoring values and historical records remain intact.
const materials = [
  { color: "#A8AAA4", material: "Piedra gris clara" },
  { color: "#F1EFE6", material: "Mármol blanco" },
  { color: "#A96038", material: "Bronce" },
  { color: "#216B50", material: "Mármol verde" },
  { color: "#B9C1C2", material: "Plata" },
  { color: "#1B1D1C", material: "Mármol negro con kintsugi dorado" },
  { color: "#C39850", material: "Oro" },
];
export const strengthBands = pointsTiers.map((tier, index) => ({
  min: tier.minimum,
  label: tier.name,
  range: index === pointsTiers.length - 1 ? `${tier.minimum.toLocaleString("es-ES")}+` : `${tier.minimum.toLocaleString("es-ES")}–${(pointsTiers[index + 1].minimum - 1).toLocaleString("es-ES")}`,
  color: materials[index].color,
  material: materials[index].material,
}));
export const hasMuscleScore = (value?: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;
export function muscleAppearance(value: number | undefined, dark = false) {
  if (!hasMuscleScore(value)) return { color: dark ? "#3C4C45" : "#CBD3CD", label: "Sin valorar", material: "" };
  const band = [...strengthBands].reverse().find(item => presentationPoints(value)! >= item.min)!;
  return { color: band.color, label: band.label, material: band.material };
}
// Anatomical subdivisions inherit their scored group; unscored structures stay neutral.
export const anatomicalGroups: Partial<Record<string, Muscle>> = {
  chest: "chest", deltoids: "shoulders", biceps: "biceps", triceps: "triceps",
  "upper-back": "back", "lower-back": "back", trapezius: "back",
  abs: "abs", obliques: "abs", quadriceps: "quads", hamstring: "hamstrings",
  gluteal: "glutes", adductors: "adductors", calves: "calves",
};
