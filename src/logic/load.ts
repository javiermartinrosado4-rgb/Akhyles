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

export const defaultLoadInputMode = (exerciseId: string): LoadInputMode =>
  DUAL_CABLE_LOADS.has(exerciseId) ? "per-side" : "total";

export const supportsPerSideInput = (exerciseId: string) =>
  BARBELL_BASICS.has(exerciseId) || DUAL_CABLE_LOADS.has(exerciseId);
export const supportsBarWeight = (exerciseId: string) => BARBELL_BASICS.has(exerciseId);

export const toStoredLoad = (entered: number, mode: LoadInputMode) =>
  mode === "per-side" ? entered * 2 : entered;

export const fromStoredLoad = (stored: number, mode: LoadInputMode) =>
  mode === "per-side" ? stored / 2 : stored;

// A bar is optional: do not silently add 20 kg when the athlete records a total.
export const defaultBarWeight = (_exerciseId: string) => 0;
export const validBarWeight = (value: number) => Number.isFinite(value) && value >= 0 && value <= 100;
export const scoreLoad = (exerciseId: string, stored: number, barWeight?: number) =>
  stored + (barWeight ?? defaultBarWeight(exerciseId));

export const formatLoad = (value: number) =>
  String(Math.round(value * 100) / 100);

export function loadHint(exerciseId: string): string {
  if (DUAL_CABLE_LOADS.has(exerciseId)) return "Usa Por lado: registra lo que indica una de las dos poleas. Akhyles suma ambas para guardarlo y puntuarlo (20 kg por lado = 40 kg totales).";
  if (exerciseId === "assisted-pullup") return "Introduce kilos de ayuda, no kilos levantados. Menos asistencia representa más fuerza. Usa Total para el bloque de la máquina.";
  if (["pronated-pullup", "neutral-pullup", "weighted-dips", "push-up", "handstand-push-up"].includes(exerciseId)) return "Sin lastre solo registra las repeticiones. Si activas Con lastre, introduce únicamente el peso añadido: Akhyles suma el peso corporal de esta sesión para los cálculos.";
  if (BARBELL_BASICS.has(exerciseId)) return "Puedes registrar discos (total o por lado) y su barra, o introducir directamente el peso total levantado. Si no especificas barra, se asumen 0 kg.";
  return "Total externo: suma ambas mancuernas; en un unilateral usa la carga del lado trabajado. Si has incluido la barra en la carga, deja Peso de la barra en 0 para no sumarla dos veces. Por lado equivale a la mitad del total.";
}
