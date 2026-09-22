import { useLanguage } from "../i18n";
import { useMemo, useState } from "react";
import { Image, Pressable, View } from "react-native";
import { useStore } from "../state/Store";
import { useTheme } from "../theme";
import { muscles } from "../data/options";
import { allExercises, displayName } from "../logic/routine";
import { bodyWeightProgress, ChartPoint, exerciseProgress, periodProgress, scoreProgress } from "../logic/progress";
import { presentationPoints } from "../logic/achievements";
import { number } from "../logic/validation";
import { Button, Card, Choice, Field, Icon, Notice, Row, Txt } from "./ui";
import { ChartSeries, LineChart } from "./LineChart";

type PeriodMode = "month" | "year" | "all";

const monthStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const yearStart = (date: Date) => new Date(date.getFullYear(), 0, 1);
const shift = (date: Date, mode: Exclude<PeriodMode, "all">, amount: number) => mode === "month"
  ? new Date(date.getFullYear(), date.getMonth() + amount, 1)
  : new Date(date.getFullYear() + amount, 0, 1);
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);


function PeriodChip({ label, selected, disabled, onPress }: { label: string; selected: boolean; disabled?: boolean; onPress: () => void }) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={t(label)}
    accessibilityState={{ selected, disabled: !!disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => ({
      minHeight: 42,
      flexGrow: 1,
      flexBasis: 84,
      paddingHorizontal: 10,
      paddingVertical: 9,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 13,
      borderWidth: 1,
      borderColor: selected ? colors.selectionHighlight : colors.border,
      backgroundColor: selected ? colors.selection : colors.surface,
      position: "relative",
      overflow: "hidden",
      opacity: disabled ? 0.35 : pressed ? 0.76 : 1,
    })}
  >
    <Txt size={13} weight="600" style={{ color: selected ? colors.onAccent : colors.text }}>{label}</Txt>
  </Pressable>;
}

export function PeriodSelector({ mode, onMode, cursor, onCursor, minimum, maximum }: {
  mode: PeriodMode;
  onMode: (mode: PeriodMode) => void;
  cursor: Date;
  onCursor: (date: Date) => void;
  minimum: Date;
  maximum: Date;
}) {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const MONTHS = Array.from({ length: 12 }, (_, month) => titleCase(new Date(2020, month, 1).toLocaleDateString(locale, { month: "short" }).replace(".", "")));
  const [choosing, setChoosing] = useState(false);
  const start = mode === "month" ? monthStart(cursor) : yearStart(cursor);
  const previous = mode === "all" ? start : shift(start, mode, -1);
  const next = mode === "all" ? start : shift(start, mode, 1);
  const min = mode === "month" ? monthStart(minimum) : yearStart(minimum);
  const max = mode === "month" ? monthStart(maximum) : yearStart(maximum);
  const canGoBack = mode !== "all" && previous.getTime() >= min.getTime();
  const canGoForward = mode !== "all" && next.getTime() <= max.getTime();
  const label = mode === "month"
    ? titleCase(cursor.toLocaleDateString(locale, { month: "long", year: "numeric" }))
    : mode === "year" ? String(cursor.getFullYear()) : "Todo el historial";
  const years = Array.from({ length: maximum.getFullYear() - minimum.getFullYear() + 1 }, (_, index) => maximum.getFullYear() - index);
  const chooseYear = (year: number) => {
    const month = mode === "month" ? cursor.getMonth() : 0;
    const candidate = new Date(year, month, 1);
    onCursor(candidate < min ? min : candidate > max ? max : candidate);
    if (mode === "year") setChoosing(false);
  };

  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: "row", gap: 8 }}>
      {([["month", "Mes"], ["year", "Año"], ["all", "Histórico"]] as const).map(([value, optionLabel]) => <PeriodChip
        key={value}
        label={optionLabel}
        selected={mode === value}
        onPress={() => { onMode(value); setChoosing(false); }}
      />)}
    </View>
    <Card style={{ padding: 14, gap: 10 }}>
      <Txt muted size={11}>PERIODO MOSTRADO</Txt>
      {mode === "all" ? <View style={{ paddingVertical: 5 }}>
        <Txt size={19} weight="600">Todo el historial</Txt>
        <Txt muted size={12}>Desde tu primer registro hasta hoy</Txt>
      </View> : <>
        <Row style={{ justifyContent: "space-between", gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel={t(mode === "month" ? "Mes anterior" : "Año anterior")} accessibilityState={{ disabled: !canGoBack }} disabled={!canGoBack} onPress={() => onCursor(previous)} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft, opacity: !canGoBack ? 0.35 : pressed ? 0.72 : 1 })}><Icon name="chevron-left" /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t(mode === "month" ? "Cambiar mes. Seleccionado {period}" : "Cambiar año. Seleccionado {period}", { period: label })} onPress={() => setChoosing(value => !value)} style={({ pressed }) => ({ flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: pressed ? colors.soft : "transparent" })}>
            <Txt size={19} weight="600" style={{ textAlign: "center" }}>{label}</Txt>
            <Txt muted size={11}>{choosing ? "Cerrar selector" : (mode === "month" ? "Elegir otro mes" : "Elegir otro año")}</Txt>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t(mode === "month" ? "Mes siguiente" : "Año siguiente")} accessibilityState={{ disabled: !canGoForward }} disabled={!canGoForward} onPress={() => onCursor(next)} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.accentSoft, opacity: !canGoForward ? 0.35 : pressed ? 0.72 : 1 })}><Icon name="chevron-right" /></Pressable>
        </Row>
        {choosing && <View style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
          {mode === "month" && <Row style={{ justifyContent: "space-between" }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Año anterior")} disabled={cursor.getFullYear() <= minimum.getFullYear()} onPress={() => chooseYear(cursor.getFullYear() - 1)} style={{ padding: 10, opacity: cursor.getFullYear() <= minimum.getFullYear() ? 0.35 : 1 }}><Icon name="chevron-left" size={18} /></Pressable>
            <Txt weight="600">{cursor.getFullYear()}</Txt>
            <Pressable accessibilityRole="button" accessibilityLabel={t("Año siguiente")} disabled={cursor.getFullYear() >= maximum.getFullYear()} onPress={() => chooseYear(cursor.getFullYear() + 1)} style={{ padding: 10, opacity: cursor.getFullYear() >= maximum.getFullYear() ? 0.35 : 1 }}><Icon name="chevron-right" size={18} /></Pressable>
          </Row>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {mode === "month" ? MONTHS.map((month, index) => {
              const candidate = new Date(cursor.getFullYear(), index, 1);
              const disabled = candidate < min || candidate > max;
              return <PeriodChip key={month} label={month} selected={cursor.getMonth() === index} disabled={disabled} onPress={() => { onCursor(candidate); setChoosing(false); }} />;
            }) : years.map(year => <PeriodChip key={year} label={String(year)} selected={cursor.getFullYear() === year} onPress={() => chooseYear(year)} />)}
          </View>
        </View>}
      </>}
    </Card>
  </View>;
}

export function ProgressExplorer() {
  const { t, locale } = useLanguage();
  const { state, update } = useStore();
  const { colors, dark } = useTheme();
  const bodyPoints = useMemo(() => bodyWeightProgress(state), [state]);
  const [selected, setSelected] = useState<string[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodMode>("month");
  const [pointsMode, setPointsMode] = useState(false);
  const [now] = useState(() => new Date());
  const [cursor, setCursor] = useState(() => monthStart(new Date()));
  const [weight, setWeight] = useState(() => {
    const value = number(state.profile.weight);
    return state.profile.weight.trim() && Number.isFinite(value)
      ? value.toLocaleString(locale, { useGrouping: false, maximumFractionDigits: 20 })
      : state.profile.weight;
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const palette = dark ? ["#8ABCF4", "#FFB47A", "#D1A4EA", "#71D6CC", "#F69EAB", "#DDD071"] : ["#2864A5", "#A54A16", "#8249A1", "#167D79", "#B13A5C", "#7D7014"];
  const exercises = allExercises(state.preferences);
  const ids = [...new Set([...state.history.flatMap(workout => workout.records.map(record => record.prescription.exerciseId)), ...state.routine.flatMap(day => day.exercises.map(prescription => prescription.exerciseId))])];
  const availableDates = [...state.history.map(workout => Date.parse(workout.date)), ...(state.bodyWeights ?? []).map(point => Date.parse(point.date))].filter(Number.isFinite);
  const minimum = availableDates.length ? new Date(Math.min(...availableDates)) : now;
  const bounds = period === "month"
    ? { start: monthStart(cursor).getTime(), end: shift(monthStart(cursor), "month", 1).getTime() }
    : period === "year"
      ? { start: yearStart(cursor).getTime(), end: shift(yearStart(cursor), "year", 1).getTime() }
      : { start: -Infinity, end: Infinity };
  // A selected month occupies the whole chart. Showing an older baseline here
  // made the current month look as though it began halfway across the graph.
  const filter = (points: ChartPoint[]) => periodProgress(points, bounds.start, bounds.end, false);
  const series: ChartSeries[] = [
    { id: "body", name: t("Peso corporal"), color: colors.text, primary: true, width: 0.75, opacity: 0.38, pointRadius: 1.25, points: filter(bodyPoints) },
    ...selected.map(id => ({ id, name: displayName(id, state.preferences), color: palette[ids.indexOf(id) % palette.length], points: filter(exerciseProgress(state.history, id, state.preferences.apparatusWeights)) })),
  ];
  const pointsHistory = useMemo(() => scoreProgress(state).points.map(point => ({ ...point, value: presentationPoints(point.value) ?? 0 })), [state]);
  const chartSeries = pointsMode
    ? [...series, { id: "points", name: "A-Points", color: colors.accent, width: 1.5, pointRadius: 2, points: filter(pointsHistory) }]
    : series;
  const periodLabel = period === "month"
    ? titleCase(cursor.toLocaleDateString(locale, { month: "long", year: "numeric" }))
    : period === "year" ? String(cursor.getFullYear()) : "Todo el historial";

  return <>
    <View style={{ gap: 4 }}><Txt weight="600" size={22}>Gráficas</Txt><Txt muted size={13}>Explora tu evolución por un mes concreto, por año o desde tu primer registro.</Txt></View>
    <PeriodSelector mode={period} onMode={setPeriod} cursor={cursor} onCursor={setCursor} minimum={minimum} maximum={now} />
    <Card><Txt weight="600">Registrar peso corporal</Txt><Field label="Peso corporal de hoy" value={weight} onChangeText={value => { setWeight(value); setError(""); setMessage(""); }} numeric suffix="kg" error={error} /><Button label="Guardar peso corporal" variant="secondary" onPress={() => { const value = number(weight); if (!Number.isFinite(value) || value < 30 || value > 350) { setError("Introduce un peso entre 30 y 350 kg."); return; } update(current => ({ ...current, profile: { ...current.profile, weight }, bodyWeights: [...(current.bodyWeights ?? []), { date: new Date().toISOString(), weight: value }] })); setMessage("Peso corporal guardado."); }} />{!!message && <Notice>{message}</Notice>}</Card>
    <Row style={{ justifyContent: "flex-end", alignItems: "center", gap: 8 }}><Image source={require("../../assets/brand/icon.png")} style={{ width: 18, height: 18, borderRadius: 4, opacity: 0.82 }} accessibilityLabel="Akhyles" /><Button label="A-Points" compact tight variant={pointsMode ? "primary" : "ghost"} onPress={() => setPointsMode(value => !value)} /></Row>
    <LineChart key={period + "-" + bounds.start + "-" + pointsMode} title={t(pointsMode ? "Peso y A-Points · {period}" : "Peso corporal y cargas · {period}", { period: t(periodLabel) })} unit={pointsMode ? "kg / pts" : "kg"} series={chartSeries} domainStart={Number.isFinite(bounds.start) ? bounds.start : undefined} domainEnd={Number.isFinite(bounds.end) ? bounds.end : undefined} />
    <Card><Txt weight="600">Ejercicios por grupo muscular</Txt><Txt muted size={13}>El peso corporal permanece como referencia tenue. Elige las cargas que quieras comparar.</Txt>{muscles.filter(muscle => muscle.id !== "balanced").map(muscle => { const group = ids.filter(id => exercises.find(exercise => exercise.id === id)?.muscle === muscle.id); const expanded = expandedGroup === muscle.id; return group.length ? <View key={muscle.id} style={{ gap: 8 }}><Pressable accessibilityRole="button" accessibilityLabel={t(expanded ? "Ocultar ejercicios de {name}" : "Mostrar ejercicios de {name}", { name: t(muscle.name) })} onPress={() => setExpandedGroup(value => value === muscle.id ? null : muscle.id)} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 }}><Txt weight="600">{muscle.name}</Txt><Txt muted>{expanded ? "−" : "+"}</Txt></Pressable>{expanded && group.map(id => <Choice key={id} title={displayName(id, state.preferences)} translateTitle={false} description={exerciseProgress(state.history, id, state.preferences.apparatusWeights).length ? "Carga máxima registrada · kg" : "Todavía sin registros"} selected={selected.includes(id)} onPress={() => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} multiple />)}</View> : null; })}{!!selected.length && <Button label="Ocultar todos los ejercicios" compact variant="ghost" onPress={() => setSelected([])} />}</Card>
  </>;
}
