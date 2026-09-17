import type { SetRecord } from "../types";

/** Load stored in a set is added external load. A saved bar or apparatus base is added once for charts and scoring. */
export type LoadInputMode = "total" | "per-side" | "total-with-bar";

// These are the three competition-style basics. Their logged plate load does
// not include the 20 kg Olympic bar, which is added only for strength scoring.
const BARBELL_BASICS = new Set([
  "chest-press-free",
  "squat-free",
  "high-bar-squat",
  "low-bar-squat",
  "deadlift-conventional",
]);

// These fly variations use two independent pulley stacks: the number a person
// sees on either stack is the useful input, while the stored/scored load stays
// the sum of both sides.
const DUAL_CABLE_LOADS = new Set(["chest-cable", "standing-cable-pec-dec"]);
export const usesPerSideDisplay = (exerciseId: string) => DUAL_CABLE_LOADS.has(exerciseId);

// These movements are logged using the exercise load itself. A machine/frame
// base weight is not useful for comparing them and should not be offered.
const APPARATUS_WEIGHT_EXCLUDED = new Set([
  "chest-cable", "standing-cable-pec-dec", "pec-deck",
  "bayesian-curl", "cable-curl-unilateral", "cable-curl-bar", "dumbbell-curl",
  "preacher-curl", "preacher-free", "unilateral-preacher", "ez-bar-curl",
  "incline-curl", "pronated-curl", "standing-curl", "machine-curl",
  "seated-curl", "lying-curl",
  "triceps-machine", "leg-extension", "abductor", "adductor-machine",
  "cable-floor-crunch", "machine-crunch", "machine-leg-tuck", "machine-leg-raise",
]);

export const defaultLoadInputMode = (exerciseId: string): LoadInputMode =>
  usesPerSideDisplay(exerciseId) ? "per-side" : "total";

/** Available for every entered load, including plate-loaded and Smith machines. */
export const supportsPerSideInput = (_exerciseId: string) => true;
export const supportsBarWeight = (exerciseId: string) => BARBELL_BASICS.has(exerciseId);

/** Configured increments use the athlete's visible unit. On two cable stacks,
 * 1.25 kg means 1.25 kg on each stack, or 2.5 kg internally. */
export const storedProgressionStep = (exerciseId: string, step: number, mode: LoadInputMode) =>
  mode === "per-side" && !supportsBarWeight(exerciseId) ? step * 2 : step;
export const supportsApparatusWeight = (exerciseId: string) => !APPARATUS_WEIGHT_EXCLUDED.has(exerciseId);
export const isAssistedPullup = (exerciseId: string) => exerciseId === "assisted-pullup";

/** Assistance is counterweight, never an extra machine mass. */
export const effectiveExternalLoad = (exerciseId: string, stored: number, apparatusWeight?: number, barWeight?: number, preferenceApparatusWeight?: number) =>
  scoreLoad(exerciseId, stored, isAssistedPullup(exerciseId) ? undefined : apparatusWeight ?? barWeight ?? preferenceApparatusWeight);

/** Load actually moved by the athlete, when the exercise is body-weight based. */
export const effectiveLiftedLoad = (exerciseId: string, stored: number, bodyWeight?: number, apparatusWeight?: number, barWeight?: number, preferenceApparatusWeight?: number) =>
  isAssistedPullup(exerciseId)
    ? Number.isFinite(bodyWeight) ? bodyWeight! - stored : undefined
    : effectiveExternalLoad(exerciseId, stored, apparatusWeight, barWeight, preferenceApparatusWeight);

export const toStoredLoad = (entered: number, mode: LoadInputMode) =>
  mode === "per-side" ? entered * 2 : entered;

export const fromStoredLoad = (stored: number, mode: LoadInputMode) =>
  mode === "per-side" ? stored / 2 : stored;

// A bar is optional: do not silently add 20 kg when the athlete records a total.
export const defaultBarWeight = (_exerciseId: string) => 0;
export const validBarWeight = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
export const scoreLoad = (exerciseId: string, stored: number, barWeight?: number) =>
  stored + (barWeight ?? defaultBarWeight(exerciseId));

/**
 * A per-side set is compared using both arms, while still being conservative:
 * 14 kg left / 12 kg right is worth 24 kg, not 12 kg and not an inflated 26 kg.
 * This also repairs legacy sessions which retained the two side values but stored
 * only the weaker single-arm load in `weight`.
 */
export const storedSetLoad = (set: Pick<SetRecord, "weight" | "leftWeight" | "rightWeight">) =>
  Number.isFinite(set.leftWeight) && Number.isFinite(set.rightWeight)
    ? 2 * Math.min(set.leftWeight!, set.rightWeight!)
    : set.weight;

export const formatLoad = (value: number) =>
  Number.isFinite(value) ? String(Number(value.toFixed(8))) : "";

export function loadHint(exerciseId: string): string {
  if (DUAL_CABLE_LOADS.has(exerciseId)) return "Usa Por lado: registra lo que indica una de las dos poleas. Akhyles suma ambas para guardarlo y puntuarlo (20 kg por lado = 40 kg totales).";
  if (exerciseId === "assisted-pullup") return "Introduce kilos de ayuda, no kilos levantados. La gráfica y los cálculos restan esa asistencia a tu peso corporal de esa sesión. Menos asistencia representa más fuerza.";
  if (["pronated-pullup", "neutral-pullup", "weighted-dips", "push-up", "handstand-push-up"].includes(exerciseId)) return "Sin lastre solo registra las repeticiones. Si activas Con lastre, introduce únicamente el peso añadido: Akhyles suma el peso corporal de esta sesión para los cálculos.";
  if (BARBELL_BASICS.has(exerciseId)) return "Puedes registrar discos (total o por lado) y su barra, o introducir directamente el peso total levantado. Si no especificas barra, se asumen 0 kg.";
  return "Introduce la carga total o la carga por lado. Akhyles duplica el valor por lado para guardar y comparar siempre el total. En un unilateral, usa la carga del lado trabajado.";
}
