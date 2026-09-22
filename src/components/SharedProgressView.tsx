import { useLanguage } from "../i18n";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { periodProgress, ChartPoint } from "../logic/progress";
import { SharedProgress, SharedRoutine } from "../logic/sharing";
import { scoreGroups } from "../logic/scoreReferences";
import { Muscle } from "../types";
import { catalog, formatExerciseName } from "../data/catalog";
import { translate } from "../i18n/translate";
import { useTheme } from "../theme";
import { useCommunity } from "../state/Community";
import { PublishedRoutine } from "../services/community";
import { BodyMap } from "./BodyMap";
import { PeriodSelector } from "./ProgressExplorer";
import { LineChart, ChartSeries } from "./LineChart";
import { Button, Card, Choice, Icon, Row, Txt } from "./ui";
import { presentationPoints } from "../logic/achievements";

type Section = "summary" | "charts" | "sessions";

/** Shared records have no custom-name flag; only recognize known defaults. */
export function sharedExerciseName(id: string, stored: string, language: "es" | "en") {
  const exercise = catalog.find(item => item.id === id);
  if (!exercise) return stored;
  const isDefault = stored === exercise.name
    || formatExerciseName(stored) === exercise.name
    || stored === translate(exercise.name, {}, "en");
  return isDefault ? translate(exercise.name, {}, language) : stored;
}

export function SharedProgressView({ progress, routineId, initialSection = "summary", showAllExercises = false }: { progress: SharedProgress; routineId?: string | null; initialSection?: Section; showAllExercises?: boolean }) {
  const { t, locale, language } = useLanguage();
  const { colors, dark } = useTheme();
  const { request } = useCommunity();
  const [section, setSection] = useState<Section>(initialSection);
  const [period, setPeriod] = useState<"month" | "year" | "all">("month");
  const [cursor, setCursor] = useState(() => new Date());
  const [pointsMode, setPointsMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [initialExercisesShown, setInitialExercisesShown] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  const [routine, setRoutine] = useState<SharedRoutine | null>(null);
  const [routineError, setRoutineError] = useState("");
  const [retry, setRetry] = useState(0);
  const [dayIndex, setDayIndex] = useState<number | null>(null);
  useEffect(() => {
    if (section !== "sessions" || !routineId) return;
    let alive = true;
    request<PublishedRoutine>("/routines/" + routineId).then(result => {
      if (alive) { setRoutine(result.routine); setRoutineError(""); }
    }).catch(error => { if (alive) setRoutineError(error.message); });
    return () => { alive = false; };
  }, [section, routineId, request, retry]);
  const workouts = useMemo(() => [...(progress.workouts ?? [])].sort((a, b) => Date.parse(a.date) - Date.parse(b.date)), [progress.workouts]);
  const names = useMemo(() => new Map(workouts.flatMap(workout => workout.exercises.map(exercise => [exercise.id, sharedExerciseName(exercise.id, exercise.name, language)] as const))), [workouts, language]);
  const ids = [...names.keys()];
  useEffect(() => {
    if (showAllExercises && !initialExercisesShown && ids.length) { setSelected(ids); setInitialExercisesShown(true); }
  }, [ids, initialExercisesShown, showAllExercises]);
  const measurements = [...(progress.bodyWeights ?? []), ...(progress.pointsHistory ?? []), ...workouts.map(workout => ({ date: workout.date, value: 0 }))];
  const now = new Date();
  const minimum = new Date(Math.min(now.getTime(), ...measurements.map(point => Date.parse(point.date)).filter(Number.isFinite)));
  const start = period === "all" ? -Infinity : new Date(cursor.getFullYear(), period === "month" ? cursor.getMonth() : 0, 1).getTime();
  const end = period === "all" ? Infinity : new Date(cursor.getFullYear() + (period === "year" ? 1 : 0), period === "month" ? cursor.getMonth() + 1 : 0, 1).getTime();
  const filter = (points: ChartPoint[]) => periodProgress(points, start, end, false);
  const palette = dark ? ["#8ABCF4", "#FFB47A", "#D1A4EA", "#71D6CC", "#F69EAB", "#DDD071"] : ["#2864A5", "#A54A16", "#8249A1", "#167D79", "#B13A5C", "#7D7014"];
  const series: ChartSeries[] = pointsMode
    ? [{ id: "points", name: "A-Points", color: colors.accent, points: filter((progress.pointsHistory ?? []).map(point => ({ ...point, value: presentationPoints(point.value) ?? 0 }))) }]
    : [
      { id: "body", name: t("Peso corporal"), color: colors.text, primary: true, width: 0.75, opacity: 0.38, pointRadius: 1.25, points: filter(progress.bodyWeights ?? []) },
      ...selected.map(id => ({
        id, name: names.get(id) ?? id, color: palette[ids.indexOf(id) % palette.length],
        points: filter(workouts.flatMap(workout => {
          const sets = workout.exercises.filter(exercise => exercise.id === id).flatMap(exercise => exercise.sets)
            .filter(set => set.weight > 0 && set.reps > 0).sort((a, b) => b.weight - a.weight || b.reps - a.reps);
          return sets.length ? [{ date: workout.date, value: sets[0].weight, detail: sets[0].reps + " rep" }] : [];
        })),
      })),
    ];
  const categories = (Object.keys(scoreGroups) as Muscle[]).map(id => ({
    id, name: scoreGroups[id], value: progress.categories?.find(category => category.id === id)?.value,
  }));
  const groups = [...Object.entries(scoreGroups), ["other", "Otros ejercicios"]];
  const periodLabel = period === "all" ? "Todo el historial" : period === "year" ? String(cursor.getFullYear()) : cursor.toLocaleDateString(locale, { month: "long", year: "numeric" });

  return <View style={{ gap: 14 }}>
    <Row style={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" }}>
      <View><Txt muted size={12}>PROGRESO COMPARTIDO</Txt><Txt size={26} weight="600">{presentationPoints(progress.points)?.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? "—"}<Txt muted size={13}> A-Points</Txt></Txt></View>
      <View style={{ alignItems: "flex-end" }}><Txt weight="600">{t("{n} sesiones", { n: progress.sessions })}</Txt><Txt muted size={11}>{t("Actualizado {date}", { date: new Date(progress.updated).toLocaleDateString(locale) })}</Txt></View>
    </Row>
    <Row style={{ flexWrap: "wrap" }}>
      {(["summary", "charts", "sessions"] as const).map(value => <Button key={value} compact label={value === "summary" ? "Resumen" : value === "charts" ? "Gráficas" : "Entrenamientos"} variant={section === value ? "primary" : "secondary"} onPress={() => setSection(value)} />)}
    </Row>
    {section === "summary" && <>
      {!!progress.strengthReferences?.length && <Card style={{ gap: 7 }}><Txt weight="600">Referencias de fuerza</Txt><Txt muted size={12}>Marcas declaradas por esta persona.</Txt>{progress.strengthReferences.map(item => <Row key={item.id} style={{ justifyContent: "space-between" }}><Txt>{item.name}</Txt><Txt weight="600">{item.weight > 0 ? `${item.weight} kg × ${item.reps}` : `${item.reps} rep`} <Txt muted size={11}>· ≈{item.maximum.toLocaleString(locale, { maximumFractionDigits: 1 })} kg</Txt></Txt></Row>)}</Card>}
      {!progress.categories && <Txt muted size={13}>El mapa estará disponible cuando esta persona actualice su progreso compartido.</Txt>}
      <BodyMap categories={categories} sex={progress.sex} />
    </>}
    {section === "charts" && <>
      <Row style={{ flexWrap: "wrap" }}>
        <Button label="Peso y cargas" compact variant={!pointsMode ? "primary" : "secondary"} onPress={() => setPointsMode(false)} />
        <Button label="A-Points" compact variant={pointsMode ? "primary" : "secondary"} onPress={() => setPointsMode(true)} />
      </Row>
      <PeriodSelector mode={period} onMode={setPeriod} cursor={cursor} onCursor={setCursor} minimum={minimum} maximum={now} />
      <LineChart key={period + start + pointsMode} title={t(pointsMode ? "A-Points" : "Peso corporal y cargas") + " · " + t(periodLabel)}
        unit={pointsMode ? "points" : "kg"} series={series} domainStart={Number.isFinite(start) ? start : undefined} domainEnd={Number.isFinite(end) ? end : undefined} />
      {!pointsMode && <Card>
        <Txt weight="600">Ejercicios por grupo muscular</Txt>
        <Txt muted size={13}>El peso corporal compartido permanece como referencia tenue. Elige las cargas que quieras comparar.</Txt>
        {!progress.bodyWeights?.length && <Txt muted size={12}>Esta persona no ha compartido mediciones de peso corporal.</Txt>}
        {!ids.length && <Txt muted>No hay cargas compartidas.</Txt>}
        {groups.map(([muscle, name]) => {
          const members = ids.filter(id => (catalog.find(exercise => exercise.id === id)?.muscle ?? "other") === muscle);
          if (!members.length) return null;
          return <View key={muscle} style={{ gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t(group === muscle ? "Ocultar ejercicios de {name}" : "Mostrar ejercicios de {name}", { name: t(name) })} accessibilityState={{ expanded: group === muscle }}
              onPress={() => setGroup(group === muscle ? null : muscle)} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Txt weight="600">{name}</Txt><Icon name={group === muscle ? "chevron-up" : "chevron-down"} size={18} />
            </Pressable>
            {group === muscle && members.map(id => <Choice key={id} title={names.get(id)!} translateTitle={false} description="Carga máxima registrada · kg" multiple selected={selected.includes(id)}
              onPress={() => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} />)}
          </View>;
        })}
        {!!selected.length && <Button label="Ocultar todos los ejercicios" compact variant="ghost" onPress={() => setSelected([])} />}
      </Card>}
      <Txt muted size={11}>Se muestran los registros que esta persona ha compartido.</Txt>
    </>}
    {section === "sessions" && <>
      {!routineId ? <Txt muted>Esta persona no ha compartido su rutina contigo.</Txt> : routineError ? <><Txt muted>{routineError}</Txt><Button label="Reintentar" onPress={() => setRetry(value => value + 1)} /></> : !routine ? <Txt muted>Cargando rutina…</Txt> : <>
        <Card><Txt weight="600">Su semana</Txt><Row style={{ flexWrap: "wrap" }}>
          {routine.days.map((day, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={day.name} accessibilityState={{ selected: dayIndex === index }} onPress={() => setDayIndex(dayIndex === index ? null : index)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, overflow: "hidden", position: "relative", justifyContent: "center", backgroundColor: dayIndex === index ? colors.selection : colors.accentSoft, opacity: pressed ? 0.78 : 1 })}><Txt translate={false} size={13} weight="600" style={{ color: dayIndex === index ? colors.onAccent : colors.accent }}>{day.name}</Txt></Pressable>)}
        </Row></Card>
        {dayIndex !== null && routine.days[dayIndex] && <Card style={{ backgroundColor: colors.accentSoft }}>
          <Txt muted size={12}>RUTINA COMPARTIDA</Txt>
          <Txt translate={false} size={28} weight="600">{routine.days[dayIndex].name}</Txt>
          <Txt muted>{t("{n} ejercicios", { n: routine.days[dayIndex].exercises.length })}</Txt>
          <Txt weight="600">Vista previa completa</Txt>
          {routine.days[dayIndex].exercises.map((exercise, index) => <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 12 }}>
            <Txt weight="600" size={13}>{String(index + 1).padStart(2, "0")}</Txt>
            <View style={{ flex: 1 }}><Txt translate={false} weight="600" size={14}>{sharedExerciseName(exercise.exerciseId, exercise.name, language)}</Txt><Txt muted size={12}>{t("{n} series · {min}–{max} repeticiones", { n: exercise.sets, min: exercise.range[0], max: exercise.range[1] })}</Txt></View>
          </View>)}
        </Card>}
      </>}
    </>}
  </View>;
}
