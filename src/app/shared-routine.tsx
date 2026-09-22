import { useLanguage } from "../i18n";
import { useEffect, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Button, Card, Heading, Notice, Page, Pill, Txt } from "../components/ui";
import { defaultTrainingDays } from "../data/options";
import { importRoutine, isSharedRoutine, SharedRoutine } from "../logic/sharing";
import { PublishedRoutine } from "../services/community";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { sharedExerciseName } from "../components/SharedProgressView";

export default function SharedRoutineScreen() {
  const { t, language } = useLanguage();
  const { id, from } = useLocalSearchParams<{ id?: string; from?: string }>();
  const { state, update } = useStore();
  const { user, request } = useCommunity();
  const [published, setPublished] = useState<PublishedRoutine | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const invalidId = !id || !/^[\w-]+$/.test(id);

  useEffect(() => {
    if (invalidId || !id) return;
    let current = true;
    request<PublishedRoutine>(`/routines/${id}`)
      .then(result => {
        if (!isSharedRoutine(result.routine)) throw new Error("Esta rutina no se puede importar.");
        if (current) setPublished(result);
      })
      .catch(reason => { if (current) setError(reason instanceof Error ? reason.message : "No se ha podido abrir la rutina."); });
    return () => { current = false; };
  }, [id, invalidId, request]);

  const apply = () => {
    if (!published || !state.completed) return;
    const imported = importRoutine(published.routine as SharedRoutine, state.preferences);
    const days = imported.routine.length;
    update(previous => ({
      ...previous,
      active: undefined,
      plannedWorkouts: undefined,
      skippedWorkoutDates: undefined,
      routine: imported.routine,
      preferences: imported.preferences,
      profile: {
        ...previous.profile,
        days,
        trainingDays: previous.profile.trainingDays?.length === days
          ? previous.profile.trainingDays
          : defaultTrainingDays(days),
      },
    }));
    router.replace("/today");
  };

  return <Page>
    <Button label="Volver" compact variant="ghost" icon="arrow-left" onPress={() => router.replace(from === "community" ? "/community" : state.completed ? "/today" : "/")} />
    <Heading eyebrow="Rutina compartida" title="Copia un plan" subtitle="Revisa el contenido antes de sustituir tu rutina actual." />
    {(invalidId || !!error) && <Notice error={true}>{invalidId ? "El enlace de rutina no es válido." : error}</Notice>}
    {!invalidId && !user && <Notice>Inicia sesión en Comunidad. Para abrir una rutina privada, tú y su propietario debéis seguiros mutuamente.</Notice>}
    {!invalidId && !error && !published && <Txt muted>Cargando rutina compartida…</Txt>}
    {published && <>
      <Card>
        <Pill>@{published.owner.handle}</Pill>
        <Txt size={22} weight="600">{t("Rutina de {name}", { name: published.owner.name })}</Txt>
        <Txt muted>{t("{n} días · {exercises} ejercicios", { n: published.routine.days.length, exercises: published.routine.days.reduce((sum, day) => sum + day.exercises.length, 0) })}</Txt>
      </Card>
      {published.routine.days.map(day => <Card key={day.name}>
        <Txt translate={false} weight="600" size={18}>{day.name}</Txt>
        {day.exercises.map((exercise, index) => <Txt translate={false} key={`${exercise.exerciseId}-${index}`}>
          {sharedExerciseName(exercise.exerciseId, exercise.name, language)} · {exercise.sets} × {exercise.range[0]}–{exercise.range[1]}
          {exercise.note ? "\n" + t("Nota: {note}", { note: exercise.note }) : ""}
        </Txt>)}
      </Card>)}
      {!state.completed ? <Notice>Completa primero tu perfil de entrenamiento para poder guardar esta rutina.</Notice> : confirming ? <Card>
        <Txt weight="600">¿Copiar esta rutina?</Txt>
        <Txt muted>Se reemplazará tu estructura actual y se reiniciarán los pesos. Tus notas personales existentes para un mismo ejercicio se conservan.</Txt>
        <Button label="Copiar rutina" onPress={apply} />
        <Button label="Cancelar" variant="ghost" compact onPress={() => setConfirming(false)} />
      </Card> : <Button label="Copiar esta rutina" icon="copy" onPress={() => setConfirming(true)} />}
    </>}
  </Page>;
}
