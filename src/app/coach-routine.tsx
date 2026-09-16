import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { Button, Card, Field, Heading, Notice, Page, Txt } from "../components/ui";
import { ManagedRoutine } from "../services/community";
import { importRoutine, isSharedRoutine, SharedRoutine } from "../logic/sharing";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { defaultTrainingDays } from "../data/options";
import { catalog } from "../data/catalog";

export default function CoachRoutineScreen() {
  const { relationship, mode } = useLocalSearchParams<{ relationship?: string; mode?: string }>();
  const { request } = useCommunity();
  const { state, update } = useStore();
  const [managed, setManaged] = useState<ManagedRoutine | null>(null);
  const [draft, setDraft] = useState<SharedRoutine | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [exerciseQueries, setExerciseQueries] = useState<Record<number, string>>({});
  const [newDay, setNewDay] = useState("");
  const invalid = !relationship || !/^[\w-]+$/.test(relationship);
  const clientView = mode === "client";
  useEffect(() => {
    if (invalid || !relationship) return;
    let alive = true;
    void request<ManagedRoutine>(`/coaching/${relationship}/routine`).then(value => {
      if (!isSharedRoutine(value.routine)) throw new Error("La rutina recibida no es válida.");
      if (alive) { setManaged(value); setDraft(value.routine); }
    }).catch(reason => { if (alive) setError(reason instanceof Error ? reason.message : "No se ha podido abrir la rutina."); });
    return () => { alive = false; };
  }, [invalid, relationship, request]);
  const change = (dayIndex: number, exerciseIndex: number, field: "sets" | "range" | "note", value: string) => setDraft(previous => {
    if (!previous) return previous;
    const days = previous.days.map((day, index) => index !== dayIndex ? day : { ...day, exercises: day.exercises.map((exercise, exercisePosition) => {
      if (exercisePosition !== exerciseIndex) return exercise;
      if (field === "sets") return { ...exercise, sets: Math.max(1, Math.min(6, Number(value) || 1)) };
      if (field === "note") return { ...exercise, note: value.slice(0, 300) || undefined };
      const [first, last] = value.split(/[–-]/).map(Number);
      return Number.isInteger(first) && Number.isInteger(last) && first >= 1 && last >= first && last <= 100 ? { ...exercise, range: [first, last] as [number, number] } : exercise;
    }) });
    return { ...previous, days };
  });
  const remove = (dayIndex: number, exerciseIndex: number) => setDraft(previous => !previous ? previous : {
    ...previous, days: previous.days.map((day, index) => index !== dayIndex ? day : { ...day, exercises: day.exercises.filter((_, position) => position !== exerciseIndex) }).filter(day => day.exercises.length),
  });
  const addExercise = (dayIndex: number, exercise: typeof catalog[number]) => setDraft(previous => !previous ? previous : {
    ...previous, days: previous.days.map((day, index) => index === dayIndex ? { ...day, exercises: [...day.exercises, { exerciseId: exercise.id, name: exercise.name, sets: 3, range: exercise.range }] } : day),
  });
  const addDay = () => {
    const name = newDay.trim();
    if (!name) return;
    setDraft(previous => previous ? { ...previous, days: [...previous.days, { name: name.slice(0, 80), exercises: [] }] } : previous);
    setNewDay("");
  };
  const save = async () => {
    if (busy || !relationship || !managed || !draft) return;
    if (!isSharedRoutine(draft)) { setError("Revisa el plan: entre 1 y 7 días con ejercicios, entre 1 y 6 series y repeticiones entre 1 y 30."); return; }
    setBusy(true); setError("");
    try {
      const result = await request<{ revision: number; updated: string }>(`/coaching/${relationship}/routine`, "PUT", { routine: draft, revision: managed.revision });
      setManaged(previous => previous ? { ...previous, routine: draft, revision: result.revision, updated: result.updated } : previous);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se ha podido guardar la rutina."); }
    finally { setBusy(false); }
  };
  const apply = () => {
    if (!draft) return;
    const imported = importRoutine(draft, state.preferences);
    const days = imported.routine.length;
    update(previous => ({ ...previous, active: undefined, plannedWorkouts: undefined, skippedWorkoutDates: undefined, routine: imported.routine, preferences: imported.preferences,
      profile: { ...previous.profile, days, trainingDays: previous.profile.trainingDays?.length === days ? previous.profile.trainingDays : defaultTrainingDays(days) } }));
    router.replace("/today");
  };
  return <Page><View style={{ gap: 20 }}>
    <Button label="Volver a Comunidad" compact variant="ghost" icon="arrow-left" onPress={() => router.canGoBack() ? router.back() : router.replace("/community")} />
    <Heading eyebrow={clientView ? "Tu entrenador" : "Entrenador"} title="Rutina gestionada" subtitle={clientView ? "Revisa el último plan enviado antes de aplicarlo a tu rutina." : "Los cambios se envían al plan de tu deportista. La persona puede revocar este acceso cuando quiera."} />
    {(invalid || !!error) && <Notice error={true}>{invalid ? "La colaboración no es válida." : error}</Notice>}
    {!invalid && !managed && !error && <Txt muted>Cargando rutina gestionada…</Txt>}
    {draft?.days.map((day, dayIndex) => <Card key={`${day.name}-${dayIndex}`}>
      <Txt weight="600" size={18} translate={false}>{day.name}</Txt>
      {day.exercises.map((exercise, exerciseIndex) => <Card key={`${exercise.exerciseId}-${exerciseIndex}`} style={{ padding: 12 }}>
        <Txt weight="600" translate={false}>{exercise.name}</Txt>
        {clientView ? <View style={{ gap: 4 }}><Txt>Series: {exercise.sets}</Txt><Txt>Repeticiones: {exercise.range[0]}–{exercise.range[1]}</Txt>{!!exercise.note && <Txt muted>{exercise.note}</Txt>}</View> : <View style={{ gap: 12 }}><Field label="Series" numeric value={String(exercise.sets)} onChangeText={value => change(dayIndex, exerciseIndex, "sets", value)} /><Field label="Repeticiones" value={`${exercise.range[0]}-${exercise.range[1]}`} onChangeText={value => change(dayIndex, exerciseIndex, "range", value)} /><Field label="Nota para el ejercicio" value={exercise.note ?? ""} onChangeText={value => change(dayIndex, exerciseIndex, "note", value)} maxLength={300} multiline /><Button label="Quitar ejercicio" compact variant="ghost" disabled={busy} style={{ marginTop: 10 }} onPress={() => remove(dayIndex, exerciseIndex)} /></View>}
      </Card>)}
      {!clientView && <><Field label="Añadir ejercicio" value={exerciseQueries[dayIndex] ?? ""} onChangeText={value => setExerciseQueries(previous => ({ ...previous, [dayIndex]: value }))} placeholder="Busca un ejercicio" />
        {!!exerciseQueries[dayIndex]?.trim() && catalog.filter(exercise => exercise.name.toLowerCase().includes(exerciseQueries[dayIndex].trim().toLowerCase())).slice(0, 5).map(exercise => <Button key={exercise.id} label={`Añadir ${exercise.name}`} compact variant="ghost" onPress={() => { addExercise(dayIndex, exercise); setExerciseQueries(previous => ({ ...previous, [dayIndex]: "" })); }} />)}</>}
    </Card>)}
    {!clientView && draft && <Card><Field label="Nuevo día" value={newDay} onChangeText={setNewDay} placeholder="Ej. Pierna A" /><Button label="Añadir día" compact variant="secondary" onPress={addDay} /></Card>}
    {managed && <><Txt muted size={12}>Versión {managed.revision} · último cambio de @{managed.author.handle}</Txt>{clientView ? <Button label="Aplicar este plan a mi rutina" onPress={apply} /> : <Button label={busy ? "Guardando…" : "Guardar cambios para el deportista"} disabled={busy || !draft?.days.length} onPress={() => void save()} />}</>}
  </View></Page>;
}
