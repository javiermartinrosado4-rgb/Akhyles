import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { AchievementRarity, rarityOrder } from "../components/AchievementRarity";
import { AchievementBadge } from "../components/AchievementBadge";
import { Button, Card, Heading, Icon, LaurelCrown, Page, Row, Txt } from "../components/ui";
import { personalAchievements } from "../logic/personalAchievements";
import { AchievementPage, CommunityAchievement } from "../services/community";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";

export default function Achievements() {
  const { state } = useStore();
  const { user, request } = useCommunity();
  const [shared, setShared] = useState<CommunityAchievement[]>([]);
  const [error, setError] = useState("");
  const personal = personalAchievements(state);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void request<AchievementPage>(`/profiles/${user.id}/achievements`).then(page => { if (alive) setShared(page.achievements); }).catch(() => { if (alive) setError("Tus logros siguen guardados en este dispositivo. Se actualizarán al recuperar la conexión."); });
    return () => { alive = false; };
  }, [request, user]);
  const cards = useMemo(() => personal.map(item => {
    const remote = shared.find(achievement => achievement.definitionId === `local:${item.id}`);
    return { item, remote };
  }).sort((a, b) => rarityOrder(a.remote?.rarity, `local:${a.item.id}`) - rarityOrder(b.remote?.rarity, `local:${b.item.id}`) || b.item.unlockedAt.localeCompare(a.item.unlockedAt) || a.item.title.localeCompare(b.item.title)), [personal, shared]);
  return <Page>
    <Row style={{ alignItems: "center", gap: 10 }}><LaurelCrown size={28} /><Heading eyebrow="Perfil" title="Mis logros" subtitle="Tu historial completo, ordenado por exclusividad." /></Row>
    <Button label="Volver al perfil" compact variant="ghost" icon="arrow-left" onPress={() => router.replace("/profile")} />
    {!!error && <Card><Txt muted>{error}</Txt></Card>}
    <Card><Txt weight="600">{cards.length} {cards.length === 1 ? "logro desbloqueado" : "logros desbloqueados"}</Txt><Txt muted size={13}>Los logros privados siguen contando para su rareza, pero solo se publican si tú lo permites.</Txt></Card>
    {cards.length === 0 ? <Card><Icon name="award" size={28} /><Txt weight="600">Tu colección empieza con el primer entrenamiento</Txt><Txt muted>Registra una sesión para desbloquear Primer paso.</Txt></Card> : cards.map(({ item, remote }) => <Card key={item.id} style={{ gap: 7 }}>
      <AchievementBadge achievement={{ id: item.id, definitionId: `local:${item.id}`, kind: "personal", details: { title: item.title } }} size={68} />
      <AchievementRarity rarity={remote?.rarity} definition={`local:${item.id}`} />
      <Txt weight="600" size={18}>{item.title}</Txt>
      <Txt muted>{item.description}</Txt>
      <Txt muted size={12}>Desbloqueado el {new Date(item.unlockedAt).toLocaleDateString("es-ES")}</Txt>
      {remote && <Txt muted size={12}>{remote.likes ? `${remote.likes} felicitaciones` : "Aún no tiene felicitaciones"}</Txt>}
    </Card>)}
  </Page>;
}
