/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Avatar } from "../components/Avatar";
import { TrainerCalendarSession, TrainerRoutineCalendar } from "../components/RoutineCalendar";
import { SharedProgressView } from "../components/SharedProgressView";
import { TrainerSessionReport } from "../components/TrainerSessionReport";
import { Button, Card, Icon, Notice, Page, Pill, Row, Txt } from "../components/ui";
import { TrainerAttention, TrainerClientSummary } from "../logic/trainerWorkspace";
import { CoachingRelationship } from "../services/community";
import { useCommunity } from "../state/Community";
import { useTheme } from "../theme";

type ClientSection = "overview" | "plan" | "calendar" | "progress";
const attentionCopy: Record<TrainerAttention, { title: string; detail: string }> = {
  "on-track": { title: "Al día", detail: "El plan y la actividad reciente no requieren una acción inmediata." },
  "routine-pending": { title: "Plan pendiente", detail: "Hay una versión del plan pendiente de aplicar." },
  inactive: { title: "Sin actividad reciente", detail: "Conviene comprobar el contexto antes de ajustar el plan." },
  "needs-review": { title: "Requiere atención", detail: "La adherencia reciente sugiere revisar el contexto con este deportista." },
};
const dayKey = (value: string) => value.slice(0, 10);
const percentage = (current?: number, previous?: number) => current !== undefined && previous !== undefined && previous !== 0 ? Math.round((current - previous) * 1000 / previous) / 10 : undefined;

export default function TrainerClient() {
  const { relationship, section: requestedSection } = useLocalSearchParams<{ relationship?: string; section?: ClientSection }>();
  const { request } = useCommunity();
  const { colors } = useTheme();
  const [client, setClient] = useState<TrainerClientSummary | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState<ClientSection>(requestedSection && ["overview", "plan", "calendar", "progress"].includes(requestedSection) ? requestedSection : "overview");
  const [calendar, setCalendar] = useState<TrainerCalendarSession[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [today] = useState(() => Date.now());
  const valid = !!relationship && /^[\w-]+$/.test(relationship);
  const load = useCallback(async () => {
    if (!relationship || !valid) return;
    setBusy(true); setError("");
    try { setClient(await request<TrainerClientSummary>(`/trainer/clients/${relationship}`)); }
    catch {
      try {
        const list = await request<CoachingRelationship[]>("/coaching");
        const found = list.find(item => item.id === relationship && item.status === "active" && item.role === "trainer");
        if (!found) throw new Error("Deportista no disponible.");
        setClient({ relationshipId: found.id, id: found.person.id, name: found.person.name, handle: found.person.handle, avatar: found.person.avatar, activeSince: found.acceptedAt ?? found.updated, routineStatus: "none", adherence: null, strengthPercent: null, attention: "on-track" });
      } catch (reason) { setError((reason as Error).message); }
    } finally { setBusy(false); }
  }, [relationship, request, valid]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!client) return;
    const workouts = client.progress?.workouts ?? [];
    const completed = workouts.map(workout => ({ date: dayKey(workout.date), name: workout.name, status: "completed" as const }));
    setCalendar(client.progress?.calendar ?? completed);
    setSelectedWorkoutId(workouts.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0]?.id ?? null);
  }, [client]);
  const selected = client?.progress?.workouts?.find(workout => workout.id === selectedWorkoutId);
  const pointsHistory = [...(client?.progress?.pointsHistory ?? [])].sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const startingPoints = pointsHistory[0]?.value;
  const pointsDelta = client?.progress?.points !== undefined && startingPoints !== undefined ? client.progress.points - startingPoints : undefined;
  const pointsPercent = percentage(client?.progress?.points, startingPoints);
  const activeSince = client?.activeSince ? new Date(client.activeSince) : undefined;
  const collaborationDays = activeSince ? Math.max(1, Math.floor((today - activeSince.getTime()) / 86_400_000)) : undefined;
  const revoke = async () => { if (!relationship) return; setBusy(true); setError(""); try { await request(`/coaching/${relationship}`, "PATCH", { action: "revoke" }); router.replace("/trainer" as never); } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); } };
  const metric = (title: string, value: string, caption: string) => <View style={{ flexBasis: "46%", flexGrow: 1, gap: 2 }}><Txt muted size={11} weight="600" style={{ letterSpacing: 0.7 }}>{title}</Txt><Txt size={25} weight="600">{value}</Txt><Txt muted size={11}>{caption}</Txt></View>;

  return <Page><View style={{ gap: 16 }}>
    <Button label="Volver a Entrenador" compact variant="ghost" icon="arrow-left" onPress={() => router.replace("/trainer" as never)} />
    {!valid && <Notice error>La colaboración no es válida.</Notice>}{!!error && <Notice error>{error}</Notice>}
    {!client && !error && <Txt muted>Cargando deportista…</Txt>}
    {client && <>
      <Card style={{ gap: 14, backgroundColor: colors.accentSoft }}><Row style={{ gap: 14, alignItems: "center" }}><Avatar id={client.avatar} size={62} /><View style={{ flex: 1, gap: 3 }}><Txt size={11} weight="600" muted style={{ letterSpacing: 1.3 }}>EXPEDIENTE DEL DEPORTISTA</Txt><Txt size={24} weight="600" translate={false}>{client.name}</Txt><Txt muted translate={false}>@{client.handle}</Txt><Row style={{ flexWrap: "wrap", gap: 6 }}><Pill>{attentionCopy[client.attention].title}</Pill><Pill>Seguimiento activo</Pill></Row></View></Row><Txt size={13} muted>{attentionCopy[client.attention].detail}</Txt></Card>
      <Row style={{ gap: 6, flexWrap: "wrap" }}>{([ ["overview", "Resumen", "activity"], ["plan", "Plan", "copy"], ["calendar", "Calendario", "calendar"], ["progress", "Evolución", "trending-up"] ] as const).map(([id, label, icon]) => <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: section === id }} onPress={() => setSection(id)} style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 11, borderRadius: 12, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: section === id ? colors.selection : colors.surface, borderWidth: 1, borderColor: section === id ? colors.selectionHighlight : colors.border, opacity: pressed ? 0.75 : 1 })}><Icon name={icon} size={15} color={section === id ? colors.onAccent : colors.accent} /><Txt size={12} weight="600" style={{ color: section === id ? colors.onAccent : colors.text }}>{label}</Txt></Pressable>)}</Row>
      {section === "overview" && <View style={{ gap: 12 }}>
        <Card style={{ gap: 8 }}><Txt muted size={11} weight="600">SEGUIMIENTO</Txt><Txt weight="600" size={19}>{activeSince ? `Cliente desde ${activeSince.toLocaleDateString()}` : "Seguimiento activo"}</Txt><Txt muted size={13}>{collaborationDays ? `${collaborationDays} días de trabajo conjunto` : "Acceso completo a su historial, rutina y evolución."}{client.lastActivity ? ` · Última actividad: ${new Date(client.lastActivity).toLocaleDateString()}` : ""}</Txt></Card>
        <Card style={{ gap: 12, backgroundColor: colors.accentSoft }}><Txt weight="600" size={19}>Evolución durante el seguimiento</Txt><Row style={{ flexWrap: "wrap", gap: 14 }}>{metric("A-POINTS", client.progress?.points?.toLocaleString("es-ES", { maximumFractionDigits: 1 }) ?? "—", "nivel actual")}{metric("DESDE EL INICIO", pointsDelta === undefined ? "—" : `${pointsDelta >= 0 ? "+" : ""}${pointsDelta.toLocaleString("es-ES", { maximumFractionDigits: 1 })}`, pointsPercent === undefined ? "sin línea base" : `${pointsPercent >= 0 ? "+" : ""}${pointsPercent}%`)}</Row></Card>
        <Card style={{ gap: 12 }}><Txt weight="600" size={19}>Estado de esta semana</Txt><Row style={{ flexWrap: "wrap", gap: 14 }}>{metric("ADHERENCIA", client.adherence === null || client.adherence === undefined ? "—" : `${client.adherence}%`, "periodo reciente")}{metric("FUERZA", client.strengthPercent === null || client.strengthPercent === undefined ? "—" : `${client.strengthPercent >= 0 ? "+" : ""}${client.strengthPercent}%`, "variación registrada")}</Row>{selected && <Txt muted size={12}>Última sesión: {selected.name} · {new Date(selected.date).toLocaleDateString()}</Txt>}</Card>
        <Card style={{ gap: 8 }}><Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={18}>Siguiente acción</Txt><Icon name="arrow-up-right" size={18} /></Row><Txt>{client.attention === "needs-review" ? "La adherencia ha bajado: revisa el calendario y la última sesión antes de tocar el plan." : "Revisa el calendario para preparar la próxima sesión o analizar el último avance."}</Txt><Button label="Abrir calendario" compact tone="green" variant="secondary" icon="calendar" onPress={() => setSection("calendar")} /></Card>
      </View>}
      {section === "plan" && <View style={{ gap: 12 }}><Card style={{ gap: 10 }}><Txt weight="600" size={19}>Plan de entrenamiento</Txt><Txt muted>La rutina está siempre disponible dentro de una colaboración activa, junto con sus versiones y notas.</Txt><Button label="Abrir plan por días" icon="copy" onPress={() => router.push({ pathname: "/coach-routine", params: { relationship: client.relationshipId, from: "trainer-client", section: "plan" } })} /></Card></View>}
      {section === "calendar" && <View style={{ gap: 12 }}><View><Txt weight="600" size={19}>Calendario y sesiones</Txt><Txt muted size={12}>Solo se marcan como completados los días con una sesión real registrada. Selecciona uno para abrir todos sus resultados.</Txt></View><TrainerRoutineCalendar sessions={calendar} readOnly onPrepareSession={() => router.push({ pathname: "/coach-routine", params: { relationship: client.relationshipId, from: "trainer-client", section: "calendar" } })} onSelectDate={(date, item) => setSelectedWorkoutId(item?.status === "completed" ? client.progress?.workouts?.find(workout => dayKey(workout.date) === date)?.id ?? null : null)} />{selected ? <TrainerSessionReport progress={client.progress!} workoutId={selected.id} showSelector={false} /> : <Card><Txt muted>Selecciona una sesión completada para ver su informe.</Txt></Card>}</View>}
      {section === "progress" && <View style={{ gap: 12 }}><Card style={{ gap: 8 }}><Txt weight="600" size={19}>Evolución del deportista</Txt><Txt muted size={13}>Mapa de fuerza, peso corporal y gráficas de las marcas registradas durante la colaboración.</Txt></Card>{client.progress ? <SharedProgressView progress={client.progress} initialSection="charts" showAllExercises /> : <Card><Txt muted>El historial estará disponible al registrar la primera sesión.</Txt></Card>}</View>}
      <Row style={{ gap: 8 }}><Button label={busy ? "Actualizando…" : "Actualizar"} compact variant="secondary" tone="green" icon="refresh-cw" disabled={busy} onPress={() => void load()} /><Button label="Finalizar colaboración" compact variant="ghost" tone="danger" disabled={busy} onPress={() => void revoke()} /></Row>
    </>}
  </View></Page>;
}
