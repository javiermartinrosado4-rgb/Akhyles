import { messages } from "../content/es";
import { translate } from "../i18n/translate";
import { ExerciseType, Range, SetRecord } from "../types";
import { validRange, validWeight } from "./validation";
export const roundWeight = (value: number) => Math.round(value * 4) / 4;
export function progression(
  type: ExerciseType,
  range: Range,
  sets: SetRecord[],
  expectedSets = 2,
  loadStep = 1.25,
  direction: "increase" | "decrease" = "increase",
) {
  const valid =
    validRange(range) &&
    sets.length === expectedSets &&
    sets.every(
      (s) =>
        validWeight(s.weight) &&
        Number.isInteger(s.reps) &&
        s.reps > 0 &&
        s.reps <= 100,
    );
  // The first effective set is the fixed progression test. Later sets remain
  // valuable training evidence, but do not block the next-session suggestion.
  const increase = valid && (sets[0]?.reps ?? 0) >= range[1];
  const current = sets[0]?.weight ?? 0;
  const step = validWeight(loadStep) && loadStep > 0 ? loadStep : 1.25;
  const increments = Array.from({ length: validWeight(current) ? Math.ceil(current * 0.05 / step) : 0 }, (_, i) => (i + 1) * step)
    .filter(n => n >= current * 0.03 - 1e-8 && n <= current * 0.05 + 1e-8)
    .sort((a, b) => Math.abs(a - current * 0.03) - Math.abs(b - current * 0.03));
  const available = increments[0];
  const suggested = increase && current > 0 && available !== undefined
    ? roundWeight(direction === "decrease" ? Math.max(0, current - available) : current + available) : current;
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
