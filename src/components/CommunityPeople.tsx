import { useLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { useCommunity } from "../state/Community";
import { CoachingRelationship, CommunityUser } from "../services/community";
import { useTheme } from "../theme";
import { Avatar } from "./Avatar";
import { CommunityTabs } from "./CommunityTabs";
import { Button, Card, Field, Icon, Notice, Row, Txt } from "./ui";

export function CommunityPeople({ openProfile }: { openProfile: (id: string) => void }) {
  const { t } = useLanguage();
  const { request, user } = useCommunity();
  const { colors } = useTheme();
  const [people, setPeople] = useState<CommunityUser[]>([]);
  const [clients, setClients] = useState<CoachingRelationship[]>([]);
  const [blocked, setBlocked] = useState<{ id: string; handle: string }[]>([]);
  const [mode, setMode] = useState<"friends" | "following" | "followers" | "clients" | "search" | "blocks">("friends");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    void Promise.resolve().then(async () => {
      if (generation.current !== current) return;
      setBusy(true); setError(""); setPeople([]); setBlocked([]);
      try {
        if (mode === "blocks") {
          const result = await request<{ id: string; handle: string }[]>("/blocks");
          if (generation.current === current) setBlocked(result);
        } else if (mode === "clients") {
          const result = await request<CoachingRelationship[]>("/coaching");
          if (generation.current === current) setClients(result.filter(item => item.status === "active" && item.role === "trainer"));
        } else {
          const result = await request<CommunityUser[]>(mode === "search" ? `/profiles?q=${encodeURIComponent(search)}` : "/connections");
          if (generation.current === current) setPeople(result.filter(person => person.id !== user?.id));
        }
      } catch (error) { if (generation.current === current) setError((error as Error).message); }
      finally { if (generation.current === current) setBusy(false); }
    });
    return () => { generation.current = current + 1; };
  }, [mode, search, revision, request, user?.id]);
  const visible = people.filter(person => mode === "friends" ? person.connected : mode === "following" ? person.followed : mode === "followers" ? person.followsYou : true);
  const follow = async (person: CommunityUser) => {
    const current = generation.current;
    setBusy(true); setError("");
    try {
      const updated = await request<CommunityUser>(`/follow/${person.id}`, person.followed ? "DELETE" : "PUT");
      if (generation.current === current) setPeople(list => list.map(item => item.id === person.id ? updated : item));
    } catch (reason) { if (generation.current === current) setError((reason as Error).message); }
    finally { if (generation.current === current) setBusy(false); }
  };
  return <>
    <Card>
      <Row><Icon name="user-plus" /><Txt weight="600" size={20}>Encuentra a tu gente</Txt></Row>
      <Txt muted>{t("Tu @ es {value1}. Compártelo con tus amigos: seguiros mutuamente os conecta para competir.", { value1: user?.handle ?? "" })}</Txt>
      <Field label="Buscar por usuario" value={query} onChangeText={setQuery} placeholder="@de_tu_amigo" maxLength={24} />
      <Button label="Buscar personas" disabled={!query.replace(/^@/, "").trim()} variant="secondary" onPress={() => { setSearch(query.trim()); setMode("search"); setRevision(value => value + 1); }} />
    </Card>
    <CommunityTabs value={mode} options={[{ value: "friends", label: "Amigos" }, { value: "following", label: "Siguiendo" }, { value: "followers", label: "Te siguen" }, ...(user?.trainerEnabled ? [{ value: "clients", label: "Mis deportistas" }] : [])]} onChange={value => setMode(value as typeof mode)} />
    <Txt weight="600" size={19}>{mode === "search" ? t("Resultados para {value1}", { value1: search }) : mode === "blocks" ? "Usuarios bloqueados" : mode === "clients" ? "Mis deportistas" : mode === "friends" ? "Tu equipo" : mode === "following" ? "A quién sigues" : "Quién te sigue"}</Txt>
    {!!error && <><Notice error>{error}</Notice><Button label="Reintentar personas" variant="secondary" onPress={() => setRevision(value => value + 1)} /></>}
    {busy ? <Txt muted>Cargando personas…</Txt> : mode === "blocks" ? <Card>
      {blocked.map(person => <Button key={person.id} label={t("Desbloquear @{value1}", { value1: person.handle })} variant="secondary" onPress={async () => {
        const current = generation.current;
        setBusy(true); setError("");
        try { await request(`/blocks/${person.id}`, "DELETE"); if (generation.current === current) setRevision(value => value + 1); }
        catch (error) { if (generation.current === current) setError((error as Error).message); }
        finally { if (generation.current === current) setBusy(false); }
      }} />)}
      {!blocked.length && <Txt muted>No tienes usuarios bloqueados.</Txt>}
    </Card> : mode === "clients" ? <Card style={{ padding: 12 }}>
      {clients.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={t("Ver perfil de @{value1}", { value1: item.person.handle })} onPress={() => openProfile(item.person.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 12, backgroundColor: pressed ? colors.soft : "transparent" })}>
        <Avatar id={item.person.avatar} size={42} /><View style={{ flex: 1, minWidth: 0 }}><Txt weight="600" numberOfLines={1} translate={false}>{item.person.name}</Txt><Txt muted size={12} translate={false}>@{item.person.handle}</Txt><Txt size={12} style={{ color: colors.accent }}>Colaboración activa · Gestionar rutina</Txt></View><Icon name="chevron-right" size={18} />
      </Pressable>)}
      {!clients.length && <Txt muted>Aún no tienes deportistas con una colaboración activa.</Txt>}
    </Card> : visible.length ? <Card style={{ padding: 12 }}>
      {visible.map(person => <Row key={person.id} style={{ alignItems: "center", gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel={t("Ver perfil de @{value1}", { value1: person.handle })} onPress={() => openProfile(person.id)}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12, padding: 8, borderRadius: 12, backgroundColor: pressed ? colors.soft : "transparent" })}>
        <Avatar id={person.avatar} size={42} /><View style={{ flex: 1, minWidth: 0 }}><Txt weight="600" numberOfLines={1} translate={false}>{person.name}</Txt><Txt muted size={12} numberOfLines={1} translate={false}>@{person.handle}</Txt>
          <Txt size={12} style={{ color: colors.accent }}>{person.connected ? "Amigos" : person.followsYou ? "Te sigue · conecta con esta persona" : person.followed ? "Siguiendo" : "Listo para conectar"}</Txt></View><Icon name="chevron-right" size={18} />
      </Pressable>{!person.connected && <Button label={person.followed ? "Siguiendo" : person.followsYou ? "Conectar" : "Seguir"} compact variant={person.followsYou ? "primary" : "secondary"} disabled={busy} onPress={() => void follow(person)} />}</Row>)}
    </Card> : !error && <Card><Icon name="users" size={28} /><Txt weight="600">{mode === "search" ? "No encontramos ese usuario" : mode === "friends" ? "Tu próximo rival puede ser un amigo" : "Aún no hay personas aquí"}</Txt><Txt muted>{mode === "search" ? "Comprueba el @ o busca solo parte del nombre de usuario." : "Busca por @ y entra en su perfil para seguirle. Si te devuelve el seguimiento, aparecerá en Amigos."}</Txt></Card>}
    <Button label={mode === "blocks" ? "Volver a mis amigos" : "Gestionar bloqueados"} compact variant="ghost" onPress={() => setMode(mode === "blocks" ? "friends" : "blocks")} />
  </>;
}
