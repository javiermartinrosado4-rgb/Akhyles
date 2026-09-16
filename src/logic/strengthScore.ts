import { Profile } from "../types";

/** Independently implemented public methodology; not the complete Symmetric Strength model. */
export const POINTS_MODEL = "akhyles-relative-v3";
export type StrengthCategory = "squat" | "bench" | "deadlift";
export const strengthCategories: Record<StrengthCategory, string> = {
  squat: "Sentadilla", bench: "Press de banca", deadlift: "Peso muerto",
};
const lifts: Record<string, StrengthCategory> = {
  "squat-free": "squat", "high-bar-squat": "squat", "low-bar-squat": "squat",
  "chest-press-free": "bench", "deadlift-conventional": "deadlift",
};
export const strengthCategory = (id: string): StrengthCategory | undefined => lifts[id];

// Classic Wilks coefficients; regression tests match EPF's original Wilks table.
// Note: the IPF 2020 appendix transcription has an incorrect female x^5 decimal.
// Deliberately do not extrapolate outside the supported bodyweight interval.
export function wilksCoefficient(weight: number, sex: Profile["sex"]): number | undefined {
  if (!Number.isFinite(weight) || weight < 40 || weight > (sex === "female" ? 150 : 200) || !["male", "female"].includes(sex)) return;
  const coefficients = sex === "male"
    ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 0.00000701863, -0.00000001291]
    : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 0.00004731582, -9.054e-8];
  const denominator = coefficients.reduceRight((value, coefficient) => value * weight + coefficient, 0);
  return denominator > 0 ? 500 / denominator : undefined;
}

/** Wathan estimate; 1 rep is an observed maximum, not an extrapolation. */
export function estimatedMax(load: number, reps: number): number | undefined {
  // Valid external load (1000), optional bar (100) and body mass (200).
  if (!Number.isFinite(load) || load <= 0 || load > 1300 || !Number.isInteger(reps) || reps < 1 || reps > 10) return;
  return reps === 1 ? load : 100 * load / (48.8 + 53.8 * Math.exp(-0.075 * reps));
}

export function relativeLiftScore(category: StrengthCategory, maximum: number, bodyWeight: number, sex: Profile["sex"]): number | undefined {
  const coefficient = wilksCoefficient(bodyWeight, sex);
  if (coefficient === undefined || !Number.isFinite(maximum) || maximum <= 0) return;
  // Public squat/deadlift and bench/deadlift ratios: symmetricstrength.com/about.
  const ratios = sex === "male" ? { squat: 0.87, bench: 0.65, deadlift: 1 } : { squat: 0.84, bench: 0.57, deadlift: 1 };
  const hypotheticalTotal = maximum / ratios[category] * (ratios.squat + ratios.bench + 1);
  return hypotheticalTotal * coefficient / 4;
}
