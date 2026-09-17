import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { Image, Pressable, View } from "react-native";
import { useState } from "react";
import { Button, Card, Heading, Icon, Page, Row, Txt } from "../components/ui";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { ProgressExplorer } from "../components/ProgressExplorer";
import { scoreProgress } from "../logic/progress";
import { BodyMap } from "../components/BodyMap";
import { WeeklyProgressInsight } from "../components/WeeklyProgressInsight";
import { nextPointsGoal, nextPointsTier, pointsTier } from "../logic/achievements";

export default function Progress() {
  const { t, locale } = useLanguage();
  const { state } = useStore();
  const { colors } = useTheme();
  const [showPointsInfo, setShowPointsInfo] = useState(false);
  const [showMethod, setShowMethod] = useState(false);
  const score = scoreProgress(state);
  const points = score.points.at(-1)?.value;
  return <Page>
    <Heading eyebrow={messages.Progress.tuRecorrido} title={messages.Progress.cadaSesionSuma} subtitle={messages.Progress.elProgresoTambienEsVolverAIntentarlo} />
    <Row>
      <Card style={{ flex: 1 }}><Txt size={30} weight="500">{state.history.length}</Txt><Txt size={12} muted>{state.history.length === 1 ? t("Sesión completada") : messages.Progress.sesionesCompletadas}</Txt></Card>
      <Pressable accessibilityRole="button" accessibilityLabel="Qué son los A-Points" onPress={() => setShowPointsInfo(value => !value)} style={{ flex: 1 }}>
        <Card><Row><Image source={require("../../assets/brand/icon.png")} style={{ width: 22, height: 22, borderRadius: 5, resizeMode: "contain" }} accessibilityLabel="Akhyles" /><Txt weight="600">A-Points</Txt></Row><Txt size={30} weight="500">{points?.toLocaleString(locale, { maximumFractionDigits: 1 }) ?? "—"}</Txt></Card>
      </Pressable>
    </Row>
    {points !== undefined && <Card style={{ gap: 6 }}>
      <Row style={{ justifyContent: "space-between" }}><Txt weight="600">{pointsTier(points).name}</Txt><Txt muted size={12}>Meta cercana</Txt></Row>
      <Txt size={20} weight="600">{points.toLocaleString(locale, { maximumFractionDigits: 1 })} / {nextPointsGoal(points).toLocaleString(locale)} A-Points</Txt>
      <View style={{ height: 8, borderRadius: 8, overflow: "hidden", backgroundColor: colors.soft }}><View style={{ width: `${Math.min(100, (points % 25) / 25 * 100)}%`, height: "100%", backgroundColor: colors.accent }} /></View>
      <Txt muted size={12}>Te faltan {(nextPointsGoal(points) - points).toLocaleString(locale, { maximumFractionDigits: 1 })} puntos para {nextPointsGoal(points).toLocaleString(locale)}.{nextPointsTier(points) ? ` Próximo tier: ${nextPointsTier(points)!.name} a los ${nextPointsTier(points)!.minimum}.` : ""}</Txt>
    </Card>}
    <Txt muted size={12}>{t("{value1}/11 grupos valorados · Equivalencias beta · {value2}", { value1: score.coverage, value2: t(score.rankingEligible ? "Disponible en el ranking" : "Completa pecho, espalda, cuádriceps e isquios para el ranking") })}</Txt>
    {showPointsInfo && <Card>
      <Txt weight="600">Tu fuerza, en perspectiva</Txt>
      <Txt muted size={13}>0–100 es una orientación inicial. Cerca de 1.000 representa una valoración muy alta; la escala no tiene techo. Este es tu desglose relativo por grupo:</Txt>
      {score.categories.map(category => <Row key={category.id} style={{ justifyContent: "space-between" }}><Txt size={14}>{category.name}{category.kind === "analogy" ? " · ≈" : ""}</Txt><Txt weight="600">{category.value === undefined ? "Sin datos" : `${category.value.toLocaleString(locale, { maximumFractionDigits: 1 })} pts`}</Txt></Row>)}
      <Txt muted size={12}>≈ Equivalencia estimada. Los grupos sin datos todavía no aportan al total.</Txt>
      <Button label={showMethod ? "Ocultar metodología" : "Cómo se calculan mis A-Points"} compact variant="ghost" onPress={() => setShowMethod(value => !value)} />
      {showMethod && <>
      <Txt muted size={13}>Tu fuerza estimada se ajusta al sexo y al peso corporal de cada sesión. Partimos de Wathan, Wilks y las proporciones publicadas por Symmetric Strength para crear un modelo propio, sin ajuste por edad.</Txt>
      <Txt muted size={13}>Cuenta la mejor marca relativa de cada grupo, no cuántas series o ejercicios repites. El total pondera los grupos registrados con pesos fijos. Al añadir un grupo, la media puede subir o bajar: refleja una visión más completa, no una pérdida de fuerza.</Txt>
      <Txt muted size={13}>0–100 es una orientación inicial; los niveles altos pueden acercarse a 1.000 y superarlo. No hay techo. Las cifras no son percentiles ni categorías de competición.</Txt>
      <Txt muted size={12}>≈ Equivalencia estimada de Akhyles, no validada científicamente. Cubrimos los 86 ejercicios del catálogo; las máquinas pueden diferir entre gimnasios. No afirmamos una comparación exacta. Los personalizados no puntúan hasta tener una referencia.</Txt>
      <Txt muted size={12}>La carga por lado se convierte a total y la barra se añade una sola vez. Puedes modificar su peso, incluso a 0; los básicos proponen 20 kg y el resto 0. Se conserva el valor de cada sesión. Si ya incluiste la barra en la carga, déjala en 0. Dominadas y fondos: introduce lastre; dominadas asistidas: kilos de ayuda. Más asistencia reduce la puntuación.</Txt>
      <Txt muted size={12}>Guardamos todas las repeticiones, pero solo las diez primeras cuentan en la estimación. Se necesitan sexo y peso corporal históricos; no los inventamos. Intervalo admitido: hombres 40–200 kg; mujeres 40–150 kg. Ranking voluntario, beta y basado en marcas declaradas, no verificadas.</Txt>
      </>}
    </Card>}
    <WeeklyProgressInsight state={state} />
    <ProgressExplorer />
    {!state.history.length && <Card style={{ alignItems: "center", paddingVertical: 32 }}><View style={{ padding: 22, backgroundColor: colors.accentSoft, borderRadius: 50 }}><Icon name="bar-chart-2" size={34} /></View><Txt size={20} weight="600">{messages.Progress.tuHistoriaEmpiezaAqui}</Txt><Txt muted size={14} style={{ textAlign: "center" }}>{messages.Progress.alTerminarTuPrimerEntrenamientoVerasAqui}</Txt></Card>}
    <BodyMap categories={score.categories} sex={state.profile.sex} />
  </Page>;
}
