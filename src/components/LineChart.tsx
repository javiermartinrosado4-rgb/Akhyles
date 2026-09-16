import { useLanguage } from "../i18n";
import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { ChartPoint } from "../logic/progress";
import { useTheme } from "../theme";
import { Button, Card, Row, Txt } from "./ui";

export interface ChartSeries { id: string; name: string; color: string; points: ChartPoint[]; primary?: boolean; width?: number; opacity?: number; pointRadius?: number }

const formatMonthLabel = (time: number, includeYear: boolean, locale: string) => {
  const options: Intl.DateTimeFormatOptions = includeYear ? { year: "2-digit", month: "short" } : { month: "short" };
  return new Date(time).toLocaleDateString(locale, options).replace(".", "");
};

const monthTicks = (start: number, end: number) => {
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  const first = new Date(start);
  first.setDate(1);
  first.setHours(0, 0, 0, 0);
  const max = new Date(end);
  max.setHours(23, 59, 59, 999);
  const ticks: number[] = [];
  const cursor = new Date(first);
  while (cursor.getTime() <= max.getTime()) {
    ticks.push(cursor.getTime());
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return ticks;
};

export function LineChart({ title, series, unit = "kg", fitY = false, compact = false, showLegend = true, domainStart, domainEnd, contextBoundary }: { title: string; series: ChartSeries[]; unit?: string; fitY?: boolean; compact?: boolean; showLegend?: boolean; domainStart?: number; domainEnd?: number; contextBoundary?: number }) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const dateLabel = (time: number) => new Date(time).toLocaleDateString(locale, { day: "numeric", month: "short", year: "2-digit" });
  const [cursor, setCursor] = useState<number | null>(null);
  const [width, setWidth] = useState(320);
  const valid = series.map(s => ({ ...s, points: s.points.filter(p => Number.isFinite(p.value) && Number.isFinite(Date.parse(p.date))).sort((a, b) => Date.parse(a.date) - Date.parse(b.date)) }));
  const points = valid.flatMap(s => s.points);
  const dates = [...new Set(points.map(p => Date.parse(p.date)))].sort((a, b) => a - b);
  const index = cursor === null ? dates.length - 1 : Math.min(cursor, dates.length - 1);
  const time = dates[index];
  const dataStart = dates[0] ?? 0, dataEnd = dates.at(-1) ?? 0;
  const start = domainStart ?? dataStart, end = domainEnd === undefined ? dataEnd : Math.max(start, domainEnd - 1);
  const rawMinimum = Math.min(...points.map(point => point.value));
  const rawMaximum = Math.max(...points.map(point => point.value));
  const padding = Math.max(1, (rawMaximum - rawMinimum) * 0.15);
  const minimum = fitY && points.length ? Math.max(0, Math.floor(rawMinimum - padding)) : 0;
  const maximum = fitY && points.length ? Math.max(minimum + 1, Math.ceil(rawMaximum + padding)) : Math.max(1, Math.ceil(Math.max(0, ...points.map(p => p.value)) / 10) * 10);
  const x = (date: string | number) => start === end ? (width + 26) / 2 : 43 + ((typeof date === "string" ? Date.parse(date) : date) - start) / (end - start) * (width - 60);
  const y = (value: number) => 200 - (value - minimum) / (maximum - minimum) * 175;
  const showMonths = dates.length > 1 && end - start > 45 * 24 * 3600 * 1000;
  const months = showMonths ? monthTicks(start, end) : [];
  const monthEvery = months.length > 9 ? 2 : 1;
  const monthGrid = months.filter((time, index) => index % monthEvery === 0 || index === months.length - 1);
  return <Card>
    <Txt translate={false} weight="600" size={18}>{title}</Txt>
    {showLegend && <Row style={{ flexWrap: "wrap" }}>
      {series.map(s => <Row key={s.id} style={{ gap: 6, opacity: s.opacity ?? 1 }}><View style={{ width: 20, height: s.width ?? (s.primary ? 4 : 2), backgroundColor: s.color }} /><Txt translate={false} size={12}>{s.primary ? t("{name} · siempre visible", { name: s.name }) : s.name}</Txt></Row>)}
    </Row>}
    {!points.length ? <Txt muted>Sin mediciones en este periodo. Registra tu peso corporal o completa un entrenamiento.</Txt> : <>
      <View onLayout={event => setWidth(Math.max(230, event.nativeEvent.layout.width))} testID="line-chart">
        <Svg width="100%" height={235} viewBox={`0 0 ${width} 235`} accessibilityRole="image" accessibilityLabel={t("{title}. Gráfica de líneas en {unit}, del {start} al {end}. Datos consultables debajo.", { title: t(title), unit: t(unit), start: dateLabel(start), end: dateLabel(end) })}>
          {[0, 0.25, 0.5, 0.75, 1].map(fraction => <Line key={`grid-${fraction}`} x1={43} x2={width - 17} y1={y(minimum + (maximum - minimum) * fraction)} y2={y(minimum + (maximum - minimum) * fraction)} stroke={colors.border} />)}
          {[0, 0.5, 1].map(fraction => { const value = minimum + (maximum - minimum) * fraction; return <SvgText key={`label-${fraction}`} x={36} y={y(value) + 4} fontSize={10} fill={colors.muted} textAnchor="end">{value.toLocaleString(locale, { maximumFractionDigits: 1 })}</SvgText>; })}
          {showMonths && monthGrid.map(time => <Line key={`month-${time}`} x1={x(time)} x2={x(time)} y1={20} y2={200} stroke={colors.border} strokeDasharray="3 4" />)}
          {contextBoundary !== undefined && <Line x1={x(contextBoundary)} x2={x(contextBoundary)} y1={20} y2={200} stroke={colors.muted} strokeDasharray="5 5" />}
          {valid.map(s => <Polyline key={s.id} points={s.points.map(p => `${x(p.date)},${y(p.value)}`).join(" ")} fill="none" stroke={s.color} strokeOpacity={s.opacity ?? 1} strokeWidth={s.width ?? (s.primary ? 4 : 2)} strokeLinejoin="round" />)}
          {valid.flatMap(s => s.points.map((p, i) => <Circle key={`${s.id}-${i}`} cx={x(p.date)} cy={y(p.value)} r={Math.max(s.points.length === 1 ? 3.5 : 0, (s.pointRadius ?? 3) + (Date.parse(p.date) === time ? 1 : 0))} fill={s.color} fillOpacity={s.opacity ?? 1} />))}
          <Line x1={x(time)} x2={x(time)} y1={20} y2={200} stroke={colors.muted} strokeDasharray="3 4" />
          <SvgText x={43} y={225} fontSize={10} fill={colors.muted}>{dateLabel(start)}</SvgText>
          <SvgText x={width - 17} y={225} fontSize={10} fill={colors.muted} textAnchor="end">{dateLabel(end)}</SvgText>
          {showMonths && monthGrid.map(time => <SvgText key={`month-label-${time}`} x={x(time)} y={215} fontSize={10} fill={colors.muted} textAnchor="middle">{formatMonthLabel(time, new Date(start).getFullYear() !== new Date(end).getFullYear(), locale)}</SvgText>)}
        </Svg>
      </View>
      {points.length === 1 && <Txt muted size={12}>Solo hay una medición en este periodo; se muestra como un punto hasta que exista otra para trazar la evolución.</Txt>}
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
        <Button label={compact ? "Anterior" : "Medición anterior"} compact variant="secondary" disabled={index <= 0} onPress={() => setCursor(index - 1)} />
        <Button label={compact ? "Siguiente" : "Medición siguiente"} compact variant="secondary" disabled={index >= dates.length - 1} onPress={() => setCursor(index + 1)} />
      </Row>
      <Txt weight="600" size={13}>{new Date(time).toLocaleString(locale)}</Txt>
      {valid.map(s => {
        const atDate = s.points.filter(p => Date.parse(p.date) === time).at(-1);
        return <View key={s.id} style={{ gap: 2 }}>
          <Txt translate={false} size={13}>{s.name}: {atDate ? `${atDate.value.toLocaleString(locale, { maximumFractionDigits: 2 })} ${unit}` : t("sin medición en esta fecha")}</Txt>
          {!!atDate?.detail && <Txt muted size={12}>{atDate.detail}</Txt>}
        </View>;
      })}
      {!compact && <>
        <View style={{ gap: 8, marginTop: 4 }}>
          <Txt muted size={11}>RESUMEN DEL PERIODO</Txt>
          {valid.filter(item => item.points.length).map(item => {
            const first = item.points[0].value;
            const last = item.points.at(-1)!.value;
            const change = last - first;
            const values = item.points.map(point => point.value);
            const format = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 2 });
            return <View key={`summary-${item.id}`} style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 }}>
              <Row style={{ justifyContent: "space-between" }}><Txt translate={false} size={13} weight="600">{item.name}</Txt><Txt size={13} weight="600">{format(last)} {unit}</Txt></Row>
              <Txt muted size={12}>{t("{n} {measurements} · Cambio {change} {unit} · Rango {min}–{max} {unit}", { n: item.points.length, measurements: t(item.points.length === 1 ? "medición" : "mediciones"), change: (change > 0 ? "+" : "") + format(change), unit: t(unit), min: format(Math.min(...values)), max: format(Math.max(...values)) })}</Txt>
            </View>;
          })}
        </View>
        <Txt muted size={11}>{t("Escala de {min} a {max} {unit}. Las líneas unen mediciones; no implican registros entre fechas.", { min: minimum.toLocaleString(locale), max: maximum.toLocaleString(locale), unit: t(unit) })}</Txt>
      </>}
    </>}
  </Card>;
}
