import { messages } from "../content/es";
import { translate } from "../i18n/translate";
import { ExerciseType, Range, SetRecord } from "../types";
import { storedSetLoad } from "./load";
import { validRange, validWeight } from "./validation";
// Keep decimal loads stable without forcing gym-specific quarter-kilo jumps.
// Eight decimal places also removes normal IEEE-754 noise after per-side
// conversions (e.g. 11.25 × 2 = 22.5) while preserving user-entered values.
export const roundWeight = (value: number) => Number(value.toFixed(8));
export function progression(
  type: ExerciseType,
  range: Range,
  sets: SetRecord[],
  expectedSets = 2,
  _loadStep = 1.25,
  direction: "increase" | "decrease" = "increase",
  _honorConfiguredStep = false,
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
  // Progression is based on the load actually recorded, never on a machine
  // increment or a configured plate jump. This keeps small loads and
  // per-side cable exercises proportional: 20 kg total becomes 20.6 kg,
  // which is 10.3 kg per side, not a doubled fixed increment.
  const suggested = increase && current > 0
    ? roundWeight(direction === "decrease" ? Math.max(0, current * 0.97) : current * 1.03) : current;
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
