import { Muscle } from "../types";

/** Akhyles v3 product calibration, NOT measured strength standards.
 * Ratios are relative to the sex-specific deadlift reference. Machine leverage,
 * pulley ratios and ROM remain unknown. These analogies are always labelled beta.
 * Loads mean total external kg (sum of both dumbbells where applicable).
 */
export interface ScoreReference { male: number; female: number; kind: "published" | "analogy"; body?: "add" | "subtract" }
const analogy = (male: number, female = male): ScoreReference => ({ male, female, kind: "analogy" });
const bench = (factor: number) => analogy(0.65 * factor, 0.57 * factor);
const squat = (factor: number) => analogy(0.87 * factor, 0.84 * factor);
export const scoreReferences: Record<string, ScoreReference> = {
  "chest-press-free": { male: 0.65, female: 0.57, kind: "published" },
  "squat-free": { male: 0.87, female: 0.84, kind: "published" },
  "high-bar-squat": { male: 0.87, female: 0.84, kind: "published" },
  "low-bar-squat": { male: 0.87, female: 0.84, kind: "published" },
  "deadlift-conventional": { male: 1, female: 1, kind: "published" },
  "chest-cable": bench(0.4), "pec-deck": bench(0.65),
  "chest-press": bench(1.05), "seated-press": bench(1), "seated-press-free": bench(0.8),
  "incline-press": bench(0.9), "incline-press-free": bench(0.7), "dumbbell-bench": bench(0.8),
  "weighted-dips": { ...bench(1.3), body: "add" }, "push-up": { ...bench(0.65), body: "add" }, "bench-smith": bench(1.05), "incline-smith": bench(0.9),
  "standing-cable-pec-dec": bench(0.35),
  "supported-row": analogy(0.55, 0.5), "neutral-pulldown": analogy(0.5, 0.45), "wide-pulldown": analogy(0.48, 0.43),
  "assisted-pullup": { ...analogy(0.65, 0.6), body: "subtract" },
  "t-row": analogy(0.5, 0.45), "t-row-free": analogy(0.55, 0.5), "pullover": analogy(0.25, 0.22),
  "shrug-smith": analogy(0.3, 0.25), "shrug-barbell": analogy(0.35, 0.3), "shrug-dumbbell": analogy(0.3, 0.25),
  "gironda-row": analogy(0.55, 0.5), "pronated-pullup": { ...analogy(0.65, 0.6), body: "add" },
  "neutral-pullup": { ...analogy(0.68, 0.63), body: "add" },
  "barbell-row": analogy(0.6, 0.55), "one-arm-row": analogy(0.27, 0.25), "seated-face-pull": analogy(0.2, 0.17),
  "lateral-cable": analogy(0.055, 0.045), "lateral-dumbbell": analogy(0.13, 0.11),
  "shoulder-press": bench(0.65), "shoulder-press-free": bench(0.55), "handstand-push-up": { ...bench(0.55), body: "add" },
  "rear-cable": analogy(0.1, 0.085), "rear-free": analogy(0.12, 0.1),
  "cable-y-raise": analogy(0.08, 0.07), "cross-cable-lateral": analogy(0.11, 0.09),
  "rear-machine": analogy(0.25, 0.21), "low-high-face-pull": analogy(0.18, 0.15), "lateral-machine": analogy(0.2, 0.17),
  // Arm loads use a dedicated calibration. Olimpian is anchored to a
  // unilateral 30 kg dumbbell curl (60 kg total) for one strict rep at a
  // representative male bodyweight. Cable references are modestly more
  // generous because the constant tension makes the same stack number harder;
  // they are no longer allowed to inflate the map by several tiers.
  "bayesian-curl": analogy(0.13, 0.115), "cable-curl-unilateral": analogy(0.11, 0.095), "cable-curl-bar": analogy(0.15, 0.13), "dumbbell-curl": analogy(0.215, 0.19),
  "preacher-curl": analogy(0.24, 0.21), "preacher-free": analogy(0.225, 0.2),
  "unilateral-preacher": analogy(0.13, 0.115), "ez-bar-curl": analogy(0.225, 0.2),
  "machine-curl": analogy(0.25, 0.22), "incline-curl": analogy(0.23, 0.2), "pronated-curl": analogy(0.24, 0.21),
  "triceps-extension": analogy(0.2, 0.175), "triceps-single": analogy(0.2, 0.175),
  "katana": analogy(0.2, 0.175), "katana-single": analogy(0.2, 0.175), "katana-bar": analogy(0.19, 0.165),
  "triceps-machine": analogy(0.25, 0.22), "french-press": analogy(0.225, 0.2), "katana-dumbbell": analogy(0.215, 0.19),
  "bulgarian-quads": squat(0.4), "bulgarian-free": squat(0.4), "bulgarian-smith": squat(0.5),
  "hip-thrust": analogy(1.15, 1.2), "hip-thrust-free": analogy(1.1, 1.15), "hip-thrust-smith": analogy(1.1, 1.15),
  "abductor": analogy(0.4, 0.45), "adductor-machine": analogy(0.45, 0.5), "kickback": analogy(0.12, 0.14),
  "pendulum": squat(0.8), "leg-press": squat(1.8), "hack": squat(1.1), "leg-extension": squat(0.5),
  "squat-smith": squat(1.05), "rdl-bar": analogy(0.8), "rdl-dumbbell": analogy(0.65),
  "rdl-smith": analogy(0.85), "rdl-machine": analogy(0.9),
  "standing-curl": analogy(0.25, 0.27), "seated-curl": analogy(0.32, 0.34), "lying-curl": analogy(0.28, 0.3),
  "standing-calf": analogy(0.65), "squat-calf-machine": analogy(0.7), "leg-press-calf": analogy(1.2), "calf-leg-press-machine": analogy(1.2),
  "cable-floor-crunch": analogy(0.3, 0.28), "machine-crunch": analogy(0.4, 0.38),
  "machine-leg-tuck": analogy(0.25, 0.23), "machine-leg-raise": analogy(0.25, 0.23),
};
/** Secondary glute contribution inferred from compound lower-body patterns.
 * It is deliberately discounted because stance, depth and technique vary. */
export const gluteInference: Record<string, number> = {
  "deadlift-conventional": 0.58, "rdl-bar": 0.5, "rdl-dumbbell": 0.45, "rdl-smith": 0.5, "rdl-machine": 0.5,
  "squat-free": 0.52, "high-bar-squat": 0.5, "low-bar-squat": 0.58, "squat-smith": 0.5,
  "hack": 0.42, "pendulum": 0.42, "leg-press": 0.35,
  "bulgarian-quads": 0.48, "bulgarian-free": 0.48, "bulgarian-smith": 0.5,
};
export const scoreGroups: Record<Muscle, string> = {
  chest: "Pecho", back: "Espalda", shoulders: "Hombros", biceps: "Bíceps", triceps: "Tríceps",
  quads: "Cuádriceps", hamstrings: "Isquios", glutes: "Glúteos", adductors: "Aductores", calves: "Gemelos", abs: "Abdominales",
};
export const groupWeights: Record<Muscle, number> = { chest: 0.15, back: 0.15, quads: 0.15, hamstrings: 0.15,
  shoulders: 0.1, glutes: 0.1, biceps: 0.05, triceps: 0.05, calves: 0.04, abs: 0.04, adductors: 0.02 };
/** An uncapped display transform: internal strength 38 ≈ 100, 120 = 1000. */
export const displayPoints = (strength: number) => Number.isFinite(strength) && strength >= 0 ? Math.round(10000 * (strength / 120) ** 2) / 10 : 0;
