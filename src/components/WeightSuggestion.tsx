import { useLanguage } from "../i18n";
import { ExerciseRecord } from "../types";
import { getExercise } from "../logic/routine";
import { defaultLoadInputMode, fromStoredLoad, storedSetLoad } from "../logic/load";
import { progressionForRecord } from "../logic/workout";
import { useStore } from "../state/Store";
import { Card, Notice, Txt } from "./ui";
export function WeightSuggestion({ record }: { record: ExerciseRecord }) {
  const { t, locale } = useLanguage();
  const { state } = useStore();
  const e = getExercise(record.prescription.exerciseId, state.preferences);
  const assisted = e.id === "assisted-pullup";
  const mode = record.loadMode ?? defaultLoadInputMode(e.id);
  const displayLoad = (value: number) => fromStoredLoad(value, mode, e.id);
  const { result } = progressionForRecord(state.preferences, record);
  return <Card>
    <Txt translate={false} weight="600">{record.name}</Txt>
    <Txt muted size={13}>{record.sets.map(s => `${displayLoad(storedSetLoad(s, e.id)).toLocaleString(locale)} kg × ${s.reps}`).join(" · ")}</Txt>
    <Notice>{result.increase ? assisted
      ? `Máximo alcanzado. Próxima sesión: ${displayLoad(result.suggested).toLocaleString(locale)} kg de ayuda (-${result.percent.toLocaleString(locale)}%). Se prepara automáticamente; puedes modificar la asistencia.`
      : t("Máximo alcanzado en todas las series. Próxima sesión: {weight} kg (+{percent}%). Se prepara automáticamente; puedes modificar el peso dentro de cada serie.", { weight: displayLoad(result.suggested).toLocaleString(locale), percent: result.percent.toLocaleString(locale) })
      : t(result.message)}</Notice>
    <Txt>{t("Próxima carga preparada: {weight} kg", { weight: displayLoad(state.preferences.weights[e.id] ?? result.current).toLocaleString(locale) })}</Txt>
    <Txt muted size={12}>Al guardar las series de tu próxima sesión confirmarás la carga utilizada.</Txt>
  </Card>;
}
