import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Avatar } from "./Avatar";
import { Button, Card, Pill, Row, Txt } from "./ui";
import type { TrainerClientSummary } from "../logic/trainerWorkspace";

type Filter = "today" | "yesterday" | "upcoming" | "calendar";
type Entry = { client: TrainerClientSummary; date: string; name?: string; status: "completed" | "planned" | "missed" | "skipped" };
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dateOffset = (days: number) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return dateKey(date); };

export function TrainerAgenda({ clients, onOpenClient }: { clients: TrainerClientSummary[]; onOpenClient: (client: TrainerClientSummary, target: "calendar") => void }) {
  const [filter, setFilter] = useState<Filter>("today");
  const entries = useMemo<Entry[]>(() => clients.flatMap(client => (client.progress?.calendar ?? client.progress?.workouts?.map(workout => ({ date: workout.date.slice(0, 10), name: workout.name, status: "completed" as const })) ?? []).map(session => ({ client, date: session.date, name: session.name, status: session.status }))), [clients]);
  const visible = useMemo(() => { const today = dateOffset(0); if (filter === "today") return entries.filter(entry => entry.date === today); if (filter === "yesterday") return entries.filter(entry => entry.date === dateOffset(-1)); return entries.filter(entry => entry.date >= today && entry.date <= dateOffset(filter === "upcoming" ? 7 : 28)); }, [entries, filter]);
  return <View style={{ gap: 9 }}><View><Txt weight="600" size={20}>Agenda</Txt><Txt muted size={12}>Consulta el plan sin generar avisos adicionales.</Txt></View><Row style={{ gap: 5, flexWrap: "wrap" }}>{([ ["today", "Hoy"], ["yesterday", "Ayer"], ["upcoming", "Próximos 7 días"], ["calendar", "Calendario"] ] as const).map(([id, label]) => <Button key={id} label={label} compact tone="green" variant={filter === id ? "secondary" : "ghost"} onPress={() => setFilter(id)} />)}</Row>{visible.length ? visible.map(entry => <Pressable key={`${entry.client.relationshipId}-${entry.date}`} accessibilityRole="button" onPress={() => onOpenClient(entry.client, "calendar")}><Card style={{ padding: 13 }}><Row style={{ gap: 10, alignItems: "center" }}><Avatar id={entry.client.avatar} size={39} /><View style={{ flex: 1 }}><Txt weight="600" translate={false}>{entry.client.name}</Txt><Txt muted size={12}>{filter === "today" ? "Hoy" : new Date(`${entry.date}T12:00:00`).toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })} · {entry.name}</Txt></View><Pill>{entry.status === "completed" ? "Completada" : entry.status === "missed" ? "No realizada" : "Prevista"}</Pill></Row></Card></Pressable>) : <Card><Txt weight="600">No hay sesiones en este periodo</Txt><Txt muted>El calendario completo de cada deportista sigue disponible desde su expediente.</Txt></Card>}</View>;
}
