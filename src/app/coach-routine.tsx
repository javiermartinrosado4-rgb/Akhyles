import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Field, Heading, Icon, Notice, Page, Pill, Row, Txt } from "../components/ui";
import { ManagedRoutine } from "../services/community";
import { importRoutine, isSharedRoutine, SharedRoutine } from "../logic/sharing";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { defaultTrainingDays } from "../data/options";
import { catalog } from "../data/catalog";
import { useTheme } from "../theme";

const routineSummary = (routine: SharedRoutine) => ({
  days: routine.days.length,
  exercises: routine.days.reduce((sum, day) => sum + day.exercises.length, 0),
  sets: routine.days.reduce((sum, day) => sum + day.exercises.reduce((total, exercise) => total + exercise.sets, 0), 0),
});

export default function CoachRoutineScreen() {
  const { relationship, mode, from, section } = useLocalSearchParams<{ relationship?: string; mode?: string; from?: string; section?: string }>();
  const { request } = useCommunity();
  const { state, update } = useStore();
  const { colors } = useTheme();
  const [managed, setManaged] = useState<ManagedRoutine | null>(null);
  const [draft, setDraft] = useState<SharedRoutine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exerciseQueries, setExerciseQueries] = useState<Record<number, string>>({});
  const [newDay, setNewDay] = useState("");
  const [openDays, setOpenDays] = useState<Record<number, boolean>>({ 0: true });
  const [openExercises, setOpenExercises] = useState<Record<string, boolean>>({});
  const [changed, setChanged] = useState(false);
  const invalid = !relationship || !/^[\w-]+$/.test(relationship);
  const clientView = mode === "client";
  const returnToOrigin = () => {
    if (clientView || from === "community") { router.replace("/community"); return; }
    if (from === "trainer-client" && relationship) {
      router.replace({ pathname: "/trainer-client", params: { relationship, section: section === "calendar" ? "calendar" : "plan", from: "trainer" } });
      return;
    }
    router.replace("/trainer");
  };
  const summary = useMemo(() => draft ? routineSummary(draft) : null, [draft]);

  useEffect(() => {
    if (invalid || !relationship) return;
    let alive = true;
    void request<ManagedRoutine>(`/coaching/${relationship}/routine`).then(value => {
      if (!isSharedRoutine(value.routine)) throw new Error("La rutina recibida no es válida.");
      if (alive) { setManaged(value); setDraft(value.routine); setChanged(false); setOpenDays({ 0: true }); }
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "No se ha podido abrir la rutina."); });
    return () => { alive = false; };
  }, [invalid, relationship, request]);

  const edit = (transform: (routine: SharedRoutine) => SharedRoutine) => setDraft(previous => {
    if (!previous) return previous;
    setChanged(true);
    return transform(previous);
  });
  const change = (dayIndex: number, exerciseIndex: number, field: "sets" | "range" | "note", value: string) => edit(previous => {
    const days = previous.days.map((day, index) => index !== dayIndex ? day : { ...day, exercises: day.exercises.map((exercise, position) => {
      if (position !== exerciseIndex) return exercise;
      if (field === "sets") return { ...exercise, sets: Math.max(1, Math.min(6, Number(value) || 1)) };
      if (field === "note") return { ...exercise, note: value.slice(0, 300) || undefined };
      const [first, last] = value.split(/[–-]/).map(Number);
      return Number.isInteger(first) && Number.isInteger(last) && first >= 1 && last >= first && last <= 100 ? { ...exercise, range: [first, last] as [number, number] } : exercise;
    }) });
    return { ...previous, days };
  });
  const remove = (dayIndex: number, exerciseIndex: number) => edit(previous => ({ ...previous, days: previous.days.map((day, index) => index !== dayIndex ? day : { ...day, exercises: day.exercises.filter((_, position) => position !== exerciseIndex) }).filter(day => day.exercises.length) }));
  const addExercise = (dayIndex: number, exercise: typeof catalog[number]) => edit(previous => ({ ...previous, days: previous.days.map((day, index) => index === dayIndex ? { ...day, exercises: [...day.exercises, { exerciseId: exercise.id, name: exercise.name, sets: 3, range: exercise.range }] } : day) }));
  const addDay = () => {
    const name = newDay.trim();
    if (!name) return;
    const next = draft?.days.length ?? 0;
    edit(previous => ({ ...previous, days: [...previous.days, { name: name.slice(0, 80), exercises: [] }] }));
    setOpenDays(previous => ({ ...previous, [next]: true }));
    setNewDay("");
  };
  const save = async () => {
    if (busy || !relationship || !managed || !draft) return;
    if (!isSharedRoutine(draft)) { setError("Revisa el plan: entre 1 y 7 días con ejercicios, entre 1 y 6 series y repeticiones entre 1 y 30."); return; }
    setBusy(true); setError("");
    try {
      const result = await request<{ revision: number; updated: string }>(`/coaching/${relationship}/routine`, "PUT", { routine: draft, revision: managed.revision });
      setManaged(previous => previous ? { ...previous, routine: draft, revision: result.revision, updated: result.updated } : previous);
      setChanged(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se ha podido guardar la rutina."); }
    finally { setBusy(false); }
  };
  const apply = () => {
    if (!draft) return;
    const imported = importRoutine(draft, state.preferences);
    const days = imported.routine.length;
    update(previous => ({ ...previous, active: undefined, plannedWorkouts: undefined, skippedWorkoutDates: undefined, routine: imported.routine, preferences: imported.preferences, profile: { ...previous.profile, days, trainingDays: previous.profile.trainingDays?.length === days ? previous.profile.trainingDays : defaultTrainingDays(days) } }));
    router.replace("/today");
  };

  return <Page><View style={{ gap: 16 }}>
    <Button label={clientView ? "Volver" : "Volver al deportista"} compact variant="ghost" icon="arrow-left" onPress={returnToOrigin} />
    <View style={{ gap: 4 }}><Txt size={11} weight="600" muted style={{ letterSpacing: 1.4 }}>{clientView ? "PLAN DE TU ENTRENADOR" : "PLAN DEL DEPORTISTA"}</Txt><Heading title="Rutina gestionada" subtitle={clientView ? "Consulta el plan por días y abre solo el ejercicio que necesites." : "Un editor por bloques para revisar el plan sin perder el contexto."} /></View>
    {(invalid || !!error) && <Notice error>{invalid ? "La colaboración no es válida." : error}</Notice>}
    {!invalid && !managed && !error && <Txt muted>Cargando rutina gestionada…</Txt>}
    {summary && <Card style={{ backgroundColor: colors.accentSoft, gap: 8 }}><Row style={{ justifyContent: "space-between", alignItems: "center", gap: 12 }}><View style={{ flex: 1 }}><Txt weight="600" size={18}>{changed ? "Cambios sin enviar" : "Plan actual"}</Txt><Txt muted size={13}>{summary.days} días · {summary.exercises} ejercicios · {summary.sets} series</Txt></View><Pill>{managed?.revision ? `v${managed.revision}` : "Borrador"}</Pill></Row>{!clientView && <Txt muted size={12}>El deportista recibirá una versión clara del plan cuando envíes los cambios.</Txt>}</Card>}
    {draft?.days.map((day, dayIndex) => {
      const dayOpen = !!openDays[dayIndex];
      const daySets = day.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
      return <Card key={`${day.name}-${dayIndex}`} style={{ padding: 0, gap: 0, overflow: "hidden" }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${dayOpen ? "Cerrar" : "Abrir"} ${day.name}`} onPress={() => setOpenDays(previous => ({ ...previous, [dayIndex]: !previous[dayIndex] }))} style={({ pressed }) => ({ padding: 18, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.75 : 1 })}>
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft }}><Txt weight="600" size={12}>{String(dayIndex + 1).padStart(2, "0")}</Txt></View>
          <View style={{ flex: 1, gap: 2 }}><Txt weight="600" size={17} translate={false}>{day.name}</Txt><Txt muted size={12}>{day.exercises.length} ejercicios · {daySets} series</Txt></View><Icon name={dayOpen ? "chevron-up" : "chevron-down"} color={colors.text} size={19} />
        </Pressable>
        {dayOpen && <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 8 }}>{day.exercises.map((exercise, exerciseIndex) => {
          const key = `${dayIndex}-${exerciseIndex}`;
          const exerciseOpen = !!openExercises[key];
          return <View key={`${exercise.exerciseId}-${exerciseIndex}`} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, overflow: "hidden" }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${exerciseOpen ? "Cerrar" : "Abrir"} ${exercise.name}`} onPress={() => setOpenExercises(previous => ({ ...previous, [key]: !previous[key] }))} style={({ pressed }) => ({ padding: 13, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: exerciseOpen ? colors.accentSoft : colors.surface, opacity: pressed ? 0.75 : 1 })}>
              <Txt muted weight="600" size={12} style={{ width: 22 }}>{String(exerciseIndex + 1).padStart(2, "0")}</Txt><View style={{ flex: 1, gap: 2 }}><Txt weight="600" translate={false}>{exercise.name}</Txt><Txt muted size={12}>{exercise.sets} × {exercise.range[0]}–{exercise.range[1]} repeticiones{exercise.note ? " · con indicación" : ""}</Txt></View><Icon name={exerciseOpen ? "chevron-up" : "chevron-down"} color={colors.text} size={17} />
            </Pressable>
            {exerciseOpen && <View style={{ padding: 13, gap: 12 }}>{clientView ? <>{!!exercise.note && <View style={{ padding: 12, borderRadius: 12, backgroundColor: colors.accentSoft, gap: 3 }}><Txt size={11} weight="600" muted>INDICACIÓN DEL ENTRENADOR</Txt><Txt translate={false}>{exercise.note}</Txt></View>}<Txt muted size={12}>Realiza {exercise.sets} series dentro del rango indicado. Consulta a tu entrenador antes de cambiar este plan.</Txt></> : <><Row style={{ gap: 10 }}><Field label="Series" numeric value={String(exercise.sets)} onChangeText={value => change(dayIndex, exerciseIndex, "sets", value)} /><Field label="Repeticiones" value={`${exercise.range[0]}-${exercise.range[1]}`} onChangeText={value => change(dayIndex, exerciseIndex, "range", value)} /></Row><Field label="Indicación para el deportista" value={exercise.note ?? ""} onChangeText={value => change(dayIndex, exerciseIndex, "note", value)} placeholder="Ej. Pausa un segundo abajo y mantén la espalda estable." maxLength={300} multiline /><Button label="Quitar ejercicio" compact variant="ghost" icon="trash-2" disabled={busy} onPress={() => remove(dayIndex, exerciseIndex)} /></>}</View>}
          </View>;
        })}{!clientView && <View style={{ gap: 8, paddingTop: 4 }}><Field label="Añadir ejercicio" value={exerciseQueries[dayIndex] ?? ""} onChangeText={value => setExerciseQueries(previous => ({ ...previous, [dayIndex]: value }))} placeholder="Busca un ejercicio" />{!!exerciseQueries[dayIndex]?.trim() && <View style={{ gap: 6 }}>{catalog.filter(exercise => exercise.name.toLowerCase().includes(exerciseQueries[dayIndex].trim().toLowerCase())).slice(0, 5).map(exercise => <Button key={exercise.id} label={`Añadir ${exercise.name}`} compact tone="green" variant="secondary" onPress={() => { addExercise(dayIndex, exercise); setExerciseQueries(previous => ({ ...previous, [dayIndex]: "" })); setOpenExercises(previous => ({ ...previous, [`${dayIndex}-${day.exercises.length}`]: true })); }} />)}</View>}</View>}</View>}
      </Card>;
    })}
    {!clientView && draft && <Card style={{ gap: 10 }}><Txt weight="600">Añadir día de entrenamiento</Txt><Row style={{ gap: 10 }}><Field label="Nombre" value={newDay} onChangeText={setNewDay} placeholder="Ej. Pierna A" /><Button label="Añadir" compact tone="green" variant="secondary" icon="plus" onPress={addDay} /></Row></Card>}
    {managed && <View style={{ gap: 8, paddingBottom: 12 }}><Txt muted size={12}>Versión {managed.revision} · último cambio de @{managed.author.handle}</Txt>{clientView ? <Button label="Aplicar este plan a mi rutina" onPress={apply} /> : <Button label={busy ? "Guardando…" : changed ? "Enviar cambios al deportista" : "Plan guardado"} disabled={busy || !changed || !draft?.days.length} onPress={() => void save()} />}</View>}
  </View></Page>;
}
