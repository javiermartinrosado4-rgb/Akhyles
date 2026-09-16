import { useLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { RankingBoard, RankingScope } from "../logic/leaderboard";
import { exportProgress } from "../logic/sharing";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { Avatar } from "./Avatar";
import { CommunityTabs } from "./CommunityTabs";
import { Button, Card, Icon, Notice, Row, Txt } from "./ui";
import { nextPointsGoal, nextPointsTier, pointsTier } from "../logic/achievements";


const scopes: { value: RankingScope; label: string }[] = [
  { value: "friends", label: "Amigos" }, { value: "global", label: "Global" },
  { value: "gym", label: "Mi gym" },
];
const reliabilityLabel = (value: number) => value < 35 ? "Inicial" : value < 65 ? "En desarrollo" : value < 85 ? "Sólida" : "Amplia";
export function CommunityRanking({ openProfile, findPeople, editLocation, scope, onScopeChange }: {
  openProfile: (id: string) => void; findPeople: () => void; editLocation: () => void;
  scope: RankingScope; onScopeChange: (scope: RankingScope) => void;
}) {
  const { t, locale } = useLanguage();
  const points = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const { user, request, refresh } = useCommunity();
  const { state } = useStore();
  const { colors } = useTheme();
  const [board, setBoard] = useState<RankingBoard | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rules, setRules] = useState(false);
  const [reliabilityInfo, setReliabilityInfo] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const version = ++generation.current;
    void Promise.resolve().then(async () => {
      if (generation.current !== version) return;
      setLoading(true); setError(""); setBoard(null);
      try {
        const result = await request<RankingBoard>(`/ranking?format=board&scope=${scope}`);
        if (generation.current === version) setBoard(result);
      } catch (error) { if (generation.current === version) setError((error as Error).message); }
      finally { if (generation.current === version) setLoading(false); }
    });
    return () => { generation.current = version + 1; };
  }, [request, scope, revision, user?.rankingPublic, user?.trainingPlace, user?.city]);
  const join = async () => {
    if (!user || busy) return;
    setBusy(true); setError("");
    try {
      await request("/progress/me", "PUT", exportProgress(state, !!user.progressPublic && !!user.detailsPublic, !!user.progressPublic && !!user.bodyWeightPublic));
      await request("/me/privacy", "PATCH", { routinePublic: !!user.routinePublic, progressPublic: !!user.progressPublic, rankingPublic: true });
      await refresh(); setRevision(value => value + 1);
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  };
  const more = async () => {
    if (!board || board.next === null || busy) return;
    const version = generation.current;
    setBusy(true); setError("");
    try {
      const result = await request<RankingBoard>(`/ranking?format=board&scope=${scope}&offset=${board.next}`);
      if (version === generation.current) setBoard(previous => previous && ({ ...result,
        entries: [...previous.entries, ...result.entries.filter(row => !previous.entries.some(old => old.id === row.id))] }));
    } catch (error) { if (version === generation.current) setError((error as Error).message); }
    finally { setBusy(false); }
  };
  return <>
    <CommunityTabs value={scope} options={scopes} onChange={onScopeChange} />
    {!!error && <Notice error>{error}</Notice>}
    {loading ? <Card><Txt muted accessibilityLiveRegion="polite">Cargando clasificación…</Txt></Card> : board && <>
      <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.accent, gap: 16 }}>
        <Row><FontAwesome name="trophy" size={22} color={colors.accent} /><Txt weight="600" style={{ flex: 1 }}>{scope === "friends" ? "Clasificación de amigos" : scope === "global" ? "Mídete con la comunidad" : board.location || "Compite cerca de ti"}</Txt></Row>
        {board.me ? <>
          <Row style={{ alignItems: "flex-end", justifyContent: "space-between" }}>
            <View><Txt muted size={12}>TU POSICIÓN</Txt><Txt size={44} weight="700">#{board.me.rank}</Txt></View>
            <View style={{ alignItems: "flex-end" }}><Txt weight="700" size={30}>{points(board.me.points)}</Txt><Txt muted size={12}>A-POINTS · {board.me.coverage}/11 grupos</Txt></View>
          </Row>
          <View style={{ gap: 4 }}><Row style={{ justifyContent: "space-between" }}><Txt weight="600">{pointsTier(board.me.points).name}</Txt><Txt muted size={12}>Meta: {nextPointsGoal(board.me.points)} A-Points</Txt></Row><Txt muted size={12}>Te faltan {points(nextPointsGoal(board.me.points) - board.me.points)} puntos.{nextPointsTier(board.me.points) ? ` Próximo tier: ${nextPointsTier(board.me.points)!.name}.` : ""}</Txt></View>
          {board.nextRival ? <View style={{ gap: 8 }}><Txt>{t("Te separan {points} pts de @{name}. Iguala su marca para compartir puesto.", { points: points(board.gap!), name: board.nextRival.handle })}</Txt>
            <Button label="Ver al siguiente rival" variant="secondary" compact onPress={() => openProfile(board.nextRival!.id)} /></View>
            : <Txt>{board.total > 1 ? "Estás en el primer puesto. ¡Ahora toca defenderlo!" : "Ya estás dentro. Encuentra a tu gente y empieza el reto."}</Txt>}
        </> : <>
          <Txt size={26} weight="700">{board.needsLocation ? "Pon tu zona en el mapa" : !user?.rankingPublic ? "Cada marca cuenta." : "Prepara tu primera posición"}</Txt>
          <Txt muted>{board.needsLocation ? t("Añade {value1} al perfil social para ver esta clasificación.", { value1: t(scope === "gym" ? "tu gimnasio y, si quieres, tu ciudad" : "tu ciudad") }) : !user?.rankingPublic ? "Compara tus A-Points, encuentra un rival y entrena para superar tu propia marca." : "Necesitas sexo, peso corporal y al menos una marca homologada. Tus A-Points se calculan solo con los ejercicios que registras."}</Txt>
          {board.needsLocation && <Button label="Añadir ubicación al perfil" onPress={editLocation} />}
        </>}
        {!user?.rankingPublic && <><Button label={busy ? "Activando…" : "Participar en los rankings"} disabled={busy} onPress={() => void join()} />
          <Txt muted size={12}>Voluntario: se mostrarán tu perfil, A-Points y cobertura de grupos. No activa compartir tu peso ni tus entrenamientos. Puedes salir desde Mi perfil.</Txt></>}
      </Card>
      {board.me && <Card style={{ padding: 12, gap: 8 }}><Row style={{ justifyContent: "space-between" }}><Txt muted size={12}>{t("{value1} grupos registrados", { value1: board.me.coverage })}</Txt><Button label={t("Fiabilidad {value1}% ⓘ", { value1: board.me.reliability })} compact variant="ghost" onPress={() => setReliabilityInfo(value => !value)} /></Row>{reliabilityInfo && <><Txt weight="600">Fiabilidad de la puntuación · {board.me.reliability}% · {reliabilityLabel(board.me.reliability)}</Txt><Txt muted size={12}>Indica cuánto contexto comparable respalda tus A-Points: grupos con marcas homologadas, variedad de ejercicios, registros recientes y sesiones distintas. No cambia tus A-Points, no exige ejercicios concretos y no te excluye del ranking.</Txt></>}</Card>}
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><View><Txt weight="600" size={20}>Clasificación</Txt><Txt muted size={12}>{t(board.total === 1 ? "{count} participante" : "{count} participantes", { count: board.total })}{scope === "friends" ? t(" · seguimiento mutuo") : ""}</Txt></View>
        <Button label="Actualizar" icon="refresh-cw" variant="ghost" compact disabled={busy} onPress={() => setRevision(value => value + 1)} /></Row>
      {board.entries.length > 0 ? <Card style={{ padding: 0, overflow: "hidden", gap: 0 }}>
        {board.entries.map(person => <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={t("Puesto {value1}, {value2}, @{value3}, {value4} A-Points{value5}", { value1: person.rank, value2: person.name, value3: person.handle, value4: points(person.points), value5: person.id === user?.id ? t(", tú") : "" })}
          onPress={() => openProfile(person.id)} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 15, flexDirection: "row", alignItems: "center", gap: 10,
            backgroundColor: person.id === user?.id ? colors.accentSoft : pressed ? colors.soft : colors.surface,
            borderBottomWidth: 1, borderBottomColor: colors.border })}>
          <View style={{ width: 27, alignItems: "center" }}>{person.rank <= 3 ? <FontAwesome name="trophy" size={16} color={person.rank === 1 ? "#B68A36" : colors.accent} /> : null}<Txt size={13} weight="700">{person.rank}</Txt></View>
          <Avatar id={person.avatar} size={36} />
          <View style={{ flex: 1, minWidth: 0 }}><Txt numberOfLines={1} weight="600" size={14} translate={false}>{person.id === user?.id ? t("{value1} · Tú", { value1: person.name }) : person.name}</Txt><Txt muted numberOfLines={1} size={12} translate={false}>@{person.handle}</Txt></View>
          <View style={{ alignItems: "flex-end" }}><Txt weight="700" style={{ fontVariant: ["tabular-nums"] }}>{points(person.points)}</Txt><Txt muted size={11}>{t("{value1} grupos · fiabilidad {value2}%", { value1: person.coverage, value2: person.reliability })}</Txt></View>
        </Pressable>)}
      </Card> : !board.needsLocation && <Card><Icon name="users" size={28} /><Txt weight="600">{scope === "friends" ? "Un buen rival lo cambia todo" : "Todavía no hay participantes"}</Txt><Txt muted>{scope === "friends" ? "Busca a tus amigos por su @. Cuando os sigáis mutuamente y participéis, competiréis aquí." : "Aparecerán aquí quienes activen el ranking y tengan las marcas necesarias."}</Txt><Button label="Encontrar personas" variant="secondary" onPress={findPeople} /></Card>}
      {board.next !== null && <Button label="Ver más posiciones" disabled={busy} variant="secondary" onPress={() => void more()} />}
      {scope === "friends" && board.entries.length > 0 && <Button label="Encontrar más amigos" icon="user-plus" variant="secondary" onPress={findPeople} />}
    </>}
    {!loading && !board && <Button label="Reintentar ranking" onPress={() => setRevision(value => value + 1)} />}
    <Button label={rules ? "Ocultar cómo se compite" : "Cómo se calculan las posiciones"} icon="info" compact variant="ghost" onPress={() => setRules(value => !value)} />
    {rules && <Card><Txt weight="600">La misma regla para todos</Txt><Txt muted size={13}>A-Points combina fuerza relativa al sexo y peso corporal con las marcas homologadas que cada persona registra. No hay grupos obligatorios: una puntuación parcial se normaliza por los grupos disponibles. A igual puntuación, mismo puesto.</Txt><Txt muted size={13}>La fiabilidad aporta contexto, pero no modifica la posición. Ranking beta de marcas declaradas, no verificadas; las equivalencias de ejercicios son estimaciones. Gimnasio y ciudad se agrupan por el nombre escrito en el perfil, no por GPS.</Txt></Card>}
  </>;
}
