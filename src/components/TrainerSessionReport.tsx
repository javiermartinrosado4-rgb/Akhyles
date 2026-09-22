import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { SharedProgress, SharedWorkout } from "../logic/sharing";
import { compareExercise, workoutTotals, weeklyExerciseComparison } from "../logic/trainerSession";
import { sharedExerciseName } from "./SharedProgressView";
import { Button, Card, Icon, Pill, Row, Txt } from "./ui";
import { useLanguage } from "../i18n";
import { useTheme } from "../theme";

const decimal = (value: number, locale: string) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
const signed = (value?: number, suffix = "") => value === undefined ? "—" : `${value > 0 ? "+" : ""}${decimal(value, "es-ES")}${suffix}`;

function Change({ label, value, unit = "", percent }: { label: string; value?: number; unit?: string; percent?: number }) {
  const { colors } = useTheme();
  const color = value === undefined || value === 0 ? colors.muted : value > 0 ? colors.done : colors.error;
  return <View style={{ flexGrow: 1, minWidth: "29%", gap: 2 }}><Txt muted size={10} weight="600">{label}</Txt><Txt weight="600" style={{ color }}>{signed(value, unit)}{percent === undefined ? "" : ` · ${signed(percent, "%")}`}</Txt></View>;
}

function SetRow({ index, set, locale }: { index: number; set: SharedWorkout["exercises"][number]["sets"][number]; locale: string }) {
  const sides = set.leftWeight !== undefined || set.rightWeight !== undefined;
  return <Row style={{ paddingVertical: 8, borderTopWidth: index ? 1 : 0, borderColor: "rgba(255,255,255,0.1)", gap: 9, alignItems: "center" }}>
    <Txt muted size={12} weight="600" style={{ width: 24 }}>{index + 1}</Txt>
    <View style={{ flex: 1 }}><Txt weight="600">{decimal(set.weight, locale)} kg × {set.reps}</Txt>{sides && <Txt muted size={11}>Izq. {set.leftWeight ?? "—"} kg × {set.leftReps ?? set.reps} · Der. {set.rightWeight ?? "—"} kg × {set.rightReps ?? set.reps}</Txt>}</View>
    <Txt muted size={12}>{decimal(set.weight * set.reps, locale)} kg</Txt>
  </Row>;
}

export function TrainerSessionReport({ progress, workoutId, showSelector = true }: { progress: SharedProgress; workoutId?: string | null; showSelector?: boolean }) {
  const { locale, language } = useLanguage();
  const { colors } = useTheme();
  const workouts = useMemo(() => [...(progress.workouts ?? [])].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)), [progress.workouts]);
  const [selectedId, setSelectedId] = useState<string | null>(workouts[0]?.id ?? null);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const selected = workouts.find(workout => workout.id === (workoutId ?? selectedId)) ?? workouts[0];
  if (!selected) return <Card><Txt weight="600">Aún no hay sesiones detalladas</Txt><Txt muted size={13}>Los resultados aparecerán al completar el primer entrenamiento.</Txt></Card>;
  const totals = workoutTotals(selected);
  const date = new Date(`${selected.date.slice(0, 10)}T12:00:00`);
  return <View style={{ gap: 12 }}>
    <Card style={{ gap: 12, backgroundColor: colors.accentSoft }}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}><View style={{ flex: 1 }}><Txt muted size={11} weight="600">RESULTADOS DE SESIÓN</Txt><Txt size={23} weight="600" translate={false}>{selected.name}</Txt><Txt muted size={12}>{date.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" })} · {selected.minutes} min{selected.bodyWeight ? ` · ${decimal(selected.bodyWeight, locale)} kg` : ""}</Txt></View><Pill>{totals.exercises} ejercicios</Pill></Row>
      <Row style={{ flexWrap: "wrap", gap: 12 }}><View style={{ flexGrow: 1, minWidth: "28%" }}><Txt muted size={10}>SERIES</Txt><Txt size={23} weight="600">{totals.sets}</Txt></View><View style={{ flexGrow: 1, minWidth: "28%" }}><Txt muted size={10}>REPETICIONES</Txt><Txt size={23} weight="600">{totals.reps}</Txt></View><View style={{ flexGrow: 1, minWidth: "28%" }}><Txt muted size={10}>VOLUMEN</Txt><Txt size={23} weight="600">{decimal(totals.volume, locale)} kg</Txt></View></Row>
      {!!selected.skipped?.length && <Txt size={12} style={{ color: colors.error }}>Omitidos: {selected.skipped.length} ejercicio{selected.skipped.length === 1 ? "" : "s"}</Txt>}
    </Card>
    {showSelector && <View style={{ gap: 7 }}><Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={19}>Sesiones completas</Txt><Txt muted size={12}>Últimas {Math.min(workouts.length, 12)}</Txt></Row><Row style={{ flexWrap: "wrap", gap: 6 }}>{workouts.slice(0, 12).map(workout => <Button key={workout.id} compact label={new Date(`${workout.date.slice(0, 10)}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "short" })} variant={workout.id === selected.id ? "primary" : "secondary"} onPress={() => { setSelectedId(workout.id); setOpenExercise(null); }} />)}</Row></View>}
    <View style={{ gap: 8 }}><Txt weight="600" size={19}>Ejercicio por ejercicio</Txt><Txt muted size={12}>La primera serie es la referencia; el resto queda disponible en el detalle.</Txt>{selected.exercises.map((exercise, index) => {
      const comparison = compareExercise(workouts, selected, exercise);
      const weekly = weeklyExerciseComparison(workouts, selected, exercise.id);
      const key = `${selected.id}:${exercise.id}:${index}`, expanded = openExercise === key;
      return <Pressable key={key} accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpenExercise(expanded ? null : key)} style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}><Card style={{ gap: 10, borderColor: expanded ? colors.accent : colors.border, borderWidth: 1 }}>
        <Row style={{ gap: 10, alignItems: "center" }}><View style={{ width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft }}><Txt weight="600" size={12}>{index + 1}</Txt></View><View style={{ flex: 1, minWidth: 0 }}><Txt weight="600" size={16} translate={false}>{sharedExerciseName(exercise.id, exercise.name, language)}</Txt><Txt muted size={12}>Referencia · {decimal(comparison.reference.weight, locale)} kg × {comparison.reference.reps} rep</Txt></View><Icon name={expanded ? "chevron-up" : "chevron-down"} size={19} color={colors.accent} /></Row>
        {comparison.previous ? <Row style={{ flexWrap: "wrap", gap: 9, paddingTop: 8, borderTopWidth: 1, borderColor: colors.border }}><Change label="CARGA" value={comparison.weightDelta} unit=" kg" percent={comparison.weightPercent} /><Change label="REPETICIONES" value={comparison.reference.reps - (comparison.previousReference?.reps ?? 0)} percent={comparison.repsPercent} /><Change label="RENDIMIENTO" value={comparison.performancePercent} unit="%" /></Row> : <Txt muted size={12}>Primera referencia registrada.</Txt>}
        {expanded && <View style={{ gap: 10 }}><View style={{ padding: 11, borderRadius: 12, backgroundColor: colors.soft, gap: 7 }}><Row style={{ flexWrap: "wrap", gap: 10 }}><View style={{ flexGrow: 1, minWidth: "42%" }}><Txt muted size={10}>SERIE DE REFERENCIA</Txt><Txt weight="600">{decimal(comparison.reference.weight, locale)} kg × {comparison.reference.reps}</Txt></View><View style={{ flexGrow: 1, minWidth: "42%" }}><Txt muted size={10}>1RM ESTIMADO</Txt><Txt weight="600">≈ {decimal(comparison.reference.estimatedMax, locale)} kg</Txt></View></Row>{exercise.targetSets && <Txt muted size={12}>Plan: {exercise.targetSets} series{exercise.range ? ` · ${exercise.range[0]}–${exercise.range[1]} repeticiones` : ""}</Txt>}{exercise.machineBrand && <Txt muted size={12}>Máquina: {exercise.machineBrand}{exercise.apparatusWeight ? ` · base ${exercise.apparatusWeight} kg` : ""}</Txt>}{exercise.barWeight ? <Txt muted size={12}>Barra registrada: {exercise.barWeight} kg</Txt> : null}</View>
          <View><Row style={{ justifyContent: "space-between" }}><Txt weight="600">Todas las series</Txt><Txt muted size={12}>Volumen</Txt></Row>{exercise.sets.map((set, setIndex) => <SetRow key={setIndex} index={setIndex} set={set} locale={locale} />)}</View>
          {!!comparison.previousReference && <Card style={{ gap: 5, backgroundColor: colors.soft }}><Txt weight="600" size={13}>Comparación con la sesión anterior</Txt><Txt muted size={12}>Referencia anterior: {decimal(comparison.previousReference.weight, locale)} kg × {comparison.previousReference.reps} rep · ≈ {decimal(comparison.previousReference.estimatedMax, locale)} kg.</Txt><Txt size={12}>Ahora: {signed(comparison.weightDelta, " kg")} · {signed(comparison.reference.reps - comparison.previousReference.reps, " rep")} · {signed(comparison.performancePercent, "% de rendimiento")}.</Txt></Card>}
          {!!weekly?.previous && <Card style={{ gap: 5, backgroundColor: colors.soft }}><Txt weight="600" size={13}>Semana frente a semana anterior</Txt><Txt muted size={12}>Referencia semanal: {decimal(weekly.current.weight, locale)} kg × {weekly.current.reps} rep.</Txt><Txt size={12}>{signed(weekly.weightDelta, " kg")} · {signed(weekly.performancePercent, "% de rendimiento")}.</Txt></Card>}
          {!!exercise.note && <Card style={{ gap: 3, backgroundColor: colors.accentSoft }}><Txt weight="600" size={13}>Nota del ejercicio</Txt><Txt muted size={12}>{exercise.note}</Txt></Card>}
        </View>}
      </Card></Pressable>;
    })}</View>
  </View>;
}
