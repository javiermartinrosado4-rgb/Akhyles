import { AppState } from "../types";
import { weeklyProgressInsight } from "../logic/insights";
import { Card, Icon, Row, Txt } from "./ui";
import { useLanguage } from "../i18n";
import { presentationPointsDelta } from "../logic/achievements";

export function WeeklyProgressInsight({ state }: { state: AppState }) {
  const { locale } = useLanguage();
  const insight = weeklyProgressInsight(state);
  const number = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const heading = insight.trend.status === "up" ? "Esta semana estás mejorando" : insight.trend.status === "down" ? "Semana de recuperación" : insight.trend.status === "steady" ? "Progreso estable esta semana" : "Construyendo tu referencia semanal";
  const trend = insight.trend.status === "first" ? "Completa sesiones comparables para ver tu tendencia." : `${insight.trend.percent >= 0 ? "+" : ""}${number(insight.trend.percent)}% de fuerza comparable · ${insight.trend.compared} ejercicios`;
  return <Card>
    <Row style={{ justifyContent: "space-between" }}><Row><Icon name="trending-up" /><Txt weight="600" size={18}>Tu progreso semanal</Txt></Row><Txt muted size={12}>{insight.complete ? "Semana cerrada" : "En curso"}</Txt></Row>
    <Txt weight="600">{heading}</Txt>
    <Txt muted size={13}>{trend}</Txt>
    <Row style={{ flexWrap: "wrap", gap: 10 }}>
      <Txt size={13}>{insight.completed}/{insight.scheduled} sesiones · {insight.adherence}%</Txt>
      <Txt size={13}>{insight.coverage}/11 grupos valorados</Txt>
      <Txt size={13}>Fiabilidad {insight.reliability}%</Txt>
    </Row>
    {insight.points?.delta !== undefined && <Txt size={13} muted>A-Points: {insight.points.delta >= 0 ? "+" : ""}{number(presentationPointsDelta(insight.points.delta) ?? 0)} esta semana.</Txt>}
    {!!insight.personalBests.length && <Txt size={13} weight="600">{insight.personalBests.length === 1 ? "1 nueva marca personal" : `${insight.personalBests.length} nuevas marcas personales`} · {insight.personalBests.slice(0, 2).map(item => item.name).join(", ")}</Txt>}
    {insight.improvingWeeks >= 2 && <Txt size={13} muted>{insight.improvingWeeks} semanas consecutivas mejorando.</Txt>}
  </Card>;
}
