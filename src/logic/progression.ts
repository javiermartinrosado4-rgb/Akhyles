import { messages } from "../content/es";
import { translate } from "../i18n/translate";
import { ExerciseType, Range, SetRecord } from "../types";
import { storedSetLoad } from "./load";
import { validRange, validWeight } from "./validation";
// Prepared loads stay on the quarter-kilo grid commonly available in gyms.
export const roundWeight = (value: number) => Math.round(value * 4) / 4;
export function progression(
  type: ExerciseType,
  range: Range,
  sets: SetRecord[],
  expectedSets = 2,
  loadStep = 1.25,
  direction: "increase" | "decrease" = "increase",
) {
  // Per-side records are persisted with both side values, while legacy data
  // may still have the old single-side value in `weight`. Always progress from
  // the normalized bilateral total so old and new records behave identically.
  const normalizedSets = sets.map((set) => ({ ...set, weight: storedSetLoad(set) }));
  const valid =
    validRange(range) &&
    normalizedSets.length === expectedSets &&
    normalizedSets.every(
      (s) =>
        validWeight(s.weight) &&
        Number.isInteger(s.reps) &&
        s.reps > 0 &&
        s.reps <= 100,
    );
  // The first effective set is the fixed progression test. Later sets remain
  // valuable training evidence, but do not block the next-session suggestion.
  const increase = valid && (normalizedSets[0]?.reps ?? 0) >= range[1];
  const current = normalizedSets[0]?.weight ?? 0;
  const step = validWeight(loadStep) && loadStep > 0 ? loadStep : 1.25;
  // Use the smallest equipment increment that reaches 3%, but never accept
  // one above 5%. Both values are normalized stored totals, so a per-side
  // record cannot be doubled a second time here.
  const candidates = Array.from(
    { length: validWeight(current) ? Math.ceil(current * 0.05 / step) + 2 : 0 },
    (_, index) => roundWeight(direction === "decrease"
      ? Math.max(0, current - (index + 1) * step)
      : current + (index + 1) * step),
  ).filter((candidate, index, all) => {
    const delta = Math.abs(candidate - current);
    return all.indexOf(candidate) === index &&
      delta >= current * 0.03 - 1e-8 && delta <= current * 0.05 + 1e-8 &&
      (direction === "decrease" ? candidate < current : candidate > current);
  }).sort((a, b) => Math.abs(a - current) - Math.abs(b - current));
  const suggested = increase && current > 0 ? candidates[0] ?? current : current;
  const canIncrease = increase && validWeight(suggested) && (direction === "decrease" ? suggested < current : suggested > current);
  const percent = canIncrease ? Math.round(Math.abs(suggested / current - 1) * 1000) / 10 : 0;
  return {
    increase: canIncrease,
    suggested: canIncrease ? suggested : current,
    current,
    percent,
    message: !valid
      ? messages.progression.completaTodasLasSeriesParaValorarLa
      : canIncrease
          ? translate("Máximo alcanzado en la primera serie. Próxima sesión: {suggested} kg (+{percent}%). Se prepara automáticamente; puedes modificar el peso dentro de cada serie.", { suggested, percent })
          : increase && current > 0
            ? "Máximo alcanzado. Tu incremento disponible no permite una subida del 3–5 %; se mantiene la carga. Puedes ajustar el incremento en Editar ejercicio."
          : messages.progression.mantenElPesoHastaAlcanzarElMaximo,
  };
}
