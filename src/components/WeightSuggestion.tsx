import { useLanguage } from "../i18n";
import { ExerciseRecord } from "../types";
import { progression } from "../logic/progression";
import { getExercise } from "../logic/routine";
import { useStore } from "../state/Store";
import { Card, Notice, Txt } from "./ui";
export function WeightSuggestion({ record }: { record: ExerciseRecord }) {
  const { t, locale } = useLanguage();
  const { state } = useStore();
  const e = getExercise(record.prescription.exerciseId, state.preferences);
  const result = progression(record.type, record.prescription.range, record.sets, record.prescription.sets,
    state.preferences.loadSteps?.[e.id] ?? e.loadStep);
  return <Card>
    <Txt translate={false} weight="600">{record.name}</Txt>
    <Txt muted size={13}>{record.sets.map(s => `${s.weight} kg × ${s.reps}`).join(" · ")}</Txt>
    <Notice>{result.increase ? t("Máximo alcanzado en todas las series. Próxima sesión: {weight} kg (+{percent}%). Se prepara automáticamente; puedes modificar el peso dentro de cada serie.", { weight: result.suggested.toLocaleString(locale), percent: result.percent.toLocaleString(locale) }) : t(result.message)}</Notice>
    <Txt>{t("Próxima carga preparada: {weight} kg", { weight: (state.preferences.weights[e.id] ?? result.current).toLocaleString(locale) })}</Txt>
    <Txt muted size={12}>Al guardar las series de tu próxima sesión confirmarás la carga utilizada.</Txt>
  </Card>;
}
