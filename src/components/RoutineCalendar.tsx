import { useLanguage } from "../i18n";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, View } from "react-native";
import { Day, ExerciseRecord, PlannedWorkout, Workout } from "../types";
import { useStore } from "../state/Store";
import { displayName, getExercise } from "../logic/routine";
import { applyExerciseRecommendation, openHistoricalWorkout, startWorkout } from "../logic/workout";
import { datesForMonth, localDateKey, scheduledDay, scheduledWorkout, trainingStreak, weeklyAdherence } from "../logic/schedule";
import { number, validWeight } from "../logic/validation";
import { defaultLoadInputMode } from "../logic/load";
import { useTheme } from "../theme";
import { Button, Card, Choice, Field, Notice, Row, Txt } from "./ui";


const cloneDay = (day: Day): Day => ({ ...day, exercises: day.exercises.map(entry => ({ ...entry, range: [...entry.range] as [number, number] })) });
const dateAtNoon = (date: Date) => {
  const saved = new Date(date);
  saved.setHours(12, 0, 0, 0);
  return saved.toISOString();
};
const moveMonth = (date: Date, offset: number) => new Date(date.getFullYear(), date.getMonth() + offset, 1);
const sameDate = (a: Date, b: Date) => localDateKey(a) === localDateKey(b);
type MovingSession = { sourceKey: string; day: Day; fromRecurring: boolean };

function PastWorkoutEditor({ workout, editable, create }: { workout: Workout; editable: boolean; create?: boolean }) {
  const { t } = useLanguage();
  const { update } = useStore();
  const { colors } = useTheme();
  const [draft, setDraft] = useState(() => workout.records.map(record => record.sets.map(set => ({ weight: String(set.weight), reps: String(set.reps) }))));
  const [error, setError] = useState("");
  const set = (recordIndex: number, setIndex: number, field: "weight" | "reps", value: string) => {
    setDraft(current => current.map((record, r) => r === recordIndex ? record.map((entry, s) => s === setIndex ? { ...entry, [field]: value } : entry) : record));
    setError("");
  };
  const save = () => {
    const records: ExerciseRecord[] = workout.records.map((record, r) => ({
      ...record,
      sets: record.sets.map((_set, s) => ({ weight: number(draft[r][s].weight), reps: number(draft[r][s].reps) })),
    }));
    if (records.some(record => record.sets.some(set => !validWeight(set.weight) || !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100))) {
      setError("Revisa cada peso y repetición antes de guardar.");
      return;
    }
    update(state => {
      const saved = { ...state, history: state.history.some(item => item.id === workout.id)
        ? state.history.map(item => item.id === workout.id ? { ...item, records } : item)
        : [...state.history, { ...workout, records }] };
      return records.reduce((current, record) => applyExerciseRecommendation(current, record, workout.date), saved);
    });
  };
  return <Card>
    <Txt weight="600" size={20} translate={false}>{create ? "Editar entrenamiento" : editable ? "Editar entrenamiento" : "Visualizar entrenamiento"}</Txt>
    <Txt translate={false} weight="600" size={16}>{workout.dayName}</Txt>
    <Txt muted size={12}>{create ? "Puedes completar pesos y repeticiones aunque aún no hubiera ningún registro guardado." : editable ? "Edita los pesos y repeticiones de esta sesión. La fecha y la rutina no cambian." : "Esta sesión tiene más de una semana y solo se puede visualizar."}</Txt>
    {workout.records.map((record, r) => <Card key={`${workout.id}-${record.prescription.id}`} style={{ padding: 12, gap: 7 }}>
      <Row style={{ alignItems: "flex-start" }}>
        <Txt weight="600" size={13} style={{ color: colors.accent, width: 24 }}>{String(r + 1).padStart(2, "0")}</Txt>
        <View style={{ flex: 1 }}>
          <Txt translate={false} weight="600">{record.name}</Txt>
          <Txt muted size={12}>{t(record.prescription.sets === 1 ? "{value1} serie · {value2}–{value3} repeticiones" : "{value1} series · {value2}–{value3} repeticiones", { value1: record.prescription.sets, value2: record.prescription.range[0], value3: record.prescription.range[1] })}</Txt>
        </View>
      </Row>
      {record.sets.map((_set, s) => <Row key={s}>
        {editable ? <>
          <Field label={t("Peso {name}, serie {n}", { name: record.name, n: s + 1 })} value={draft[r][s].weight} onChangeText={value => set(r, s, "weight", value)} numeric suffix="kg" />
          <Field label={t("Repeticiones {name}, serie {n}", { name: record.name, n: s + 1 })} value={draft[r][s].reps} onChangeText={value => set(r, s, "reps", value)} numeric suffix="rep" />
        </> : <>
          <Txt muted>{t("Peso {name}, serie {n}", { name: record.name, n: s + 1 })}: {draft[r][s].weight} kg</Txt>
          <Txt muted>{t("Repeticiones {name}, serie {n}", { name: record.name, n: s + 1 })}: {draft[r][s].reps}</Txt>
        </>}
      </Row>)}
    </Card>)}
    {!!error && <Notice error>{error}</Notice>}
    {editable ? <Button label="Guardar corrección" onPress={save} /> : <Txt muted size={12}>Los registros de hace más de una semana se conservan como historial.</Txt>}
  </Card>;
}

function PlannedWorkoutEditor({ date, day, existing }: { date: Date; day: Day; existing?: PlannedWorkout }) {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const [weights, setWeights] = useState(() => Object.fromEntries(day.exercises.map(entry => [entry.id, String(entry.weight)])));
  const [error, setError] = useState("");
  const save = () => {
    const exercises = day.exercises.map(entry => ({ ...entry, weight: number(weights[entry.id]) }));
    if (exercises.some(entry => !validWeight(entry.weight))) {
      setError("Indica un peso entre 0 y 1000 kg. Puedes usar decimales.");
      return;
    }
    const item: PlannedWorkout = { date: dateAtNoon(date), dayId: day.id, day: { ...cloneDay(day), exercises } };
    update(current => ({ ...current, plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== localDateKey(date)), item] }));
    setError("");
  };
  const clear = () => update(current => ({ ...current, plannedWorkouts: (current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== localDateKey(date)) }));
  return <Card>
    <Txt weight="600">{t("Preparar {name}", { name: day.name })}</Txt>
    <Txt muted size={12}>Estos pesos se aplican solo a esta fecha. La rutina semanal y tus otras sesiones futuras no cambian.</Txt>
    {day.exercises.map(entry => <Field key={entry.id} label={t("Peso para {name}", { name: displayName(entry.exerciseId, state.preferences) })} value={weights[entry.id]} onChangeText={value => { setWeights(current => ({ ...current, [entry.id]: value })); setError(""); }} numeric suffix="kg" />)}
    {!!error && <Notice error>{error}</Notice>}
    <Button label="Guardar pesos para esta sesión" onPress={save} />
    {!!existing && <Button label="Usar pesos de la rutina" compact variant="ghost" onPress={clear} />}
  </Card>;
}

export function RoutineCalendar() {
  const { t, locale } = useLanguage();
  const { state, update } = useStore();
  const { colors } = useTheme();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(current => localDateKey(current) === localDateKey(new Date()) ? current : new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [cursor, setCursor] = useState(now);
  const [selected, setSelected] = useState(now);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<MovingSession | null>(null);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => new Date(2024, 0, 1 + index).toLocaleDateString(locale, { weekday: "short" }));
  const dates = datesForMonth(cursor);
  const monthTitle = cursor.toLocaleDateString(locale, { month: "long" });
  const yearTitle = String(cursor.getFullYear());
  const selectedKey = localDateKey(selected);
  const selectedHistory = state.history.filter(workout => localDateKey(workout.date) === selectedKey);
  const selectedBase = scheduledDay(state.profile, state.routine, selected, state.routineVersions);
  const selectedPlan = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, selected, state.skippedWorkoutDates, state.routineVersions);
  const selectedOverride = state.plannedWorkouts?.find(item => localDateKey(item.date) === selectedKey);
  const selectedSkipped = state.skippedWorkoutDates?.includes(selectedKey) ?? false;
  const isPast = selectedKey < localDateKey(now);
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const canEditPast = selectedKey >= localDateKey(lastWeek) && selectedKey <= localDateKey(now);
  // A plan can be moved back to the closing weekend of the prior week. This
  // covers a delayed Friday/Saturday/Sunday session without allowing edits to
  // arbitrary historical training records.
  const moveFloor = new Date(now);
  moveFloor.setDate(moveFloor.getDate() - 8);
  const canUseAsMoveTarget = selectedKey >= localDateKey(moveFloor);
  const streak = trainingStreak(state.profile, state.routine, state.history, state.plannedWorkouts, state.skippedWorkoutDates, now, state.routineVersions);
  const adherence = weeklyAdherence(state.profile, state.routine, state.history, state.plannedWorkouts, state.skippedWorkoutDates, now, state.routineVersions);
  const [showStreakInfo, setShowStreakInfo] = useState(false);
  const addSession = (day: Day) => {
    const item: PlannedWorkout = { date: dateAtNoon(selected), dayId: day.id, day: cloneDay(day) };
    update(current => ({ ...current, plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => localDateKey(value.date) !== selectedKey), item] }));
    setAdding(false);
  };
  const removeSession = () => update(current => ({
    ...current,
    plannedWorkouts: (current.plannedWorkouts ?? []).filter(item => localDateKey(item.date) !== selectedKey),
    skippedWorkoutDates: selectedBase ? Array.from(new Set([...(current.skippedWorkoutDates ?? []), selectedKey])) : current.skippedWorkoutDates,
  }));
  const restoreSession = () => update(current => ({ ...current, skippedWorkoutDates: (current.skippedWorkoutDates ?? []).filter(date => date !== selectedKey) }));
  const moveHere = (targetKey = selectedKey) => {
    if (!moving) return;
    const targetDate = new Date(`${targetKey}T12:00:00`);
    const targetPlan = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, targetDate, state.skippedWorkoutDates, state.routineVersions);
    if (targetKey === moving.sourceKey || selectedHistory.length || targetPlan || targetKey < localDateKey(moveFloor)) return;
    const item: PlannedWorkout = { date: dateAtNoon(selected), dayId: moving.day.id, day: cloneDay(moving.day) };
    item.date = dateAtNoon(targetDate);
    update(current => ({
      ...current,
      plannedWorkouts: [...(current.plannedWorkouts ?? []).filter(value => ![moving.sourceKey, targetKey].includes(localDateKey(value.date))), item],
      skippedWorkoutDates: moving.fromRecurring ? Array.from(new Set([...(current.skippedWorkoutDates ?? []), moving.sourceKey])) : current.skippedWorkoutDates,
    }));
    setSelected(targetDate);
    setMoving(null);
  };
  const canMoveHere = !!moving && canUseAsMoveTarget && !selectedHistory.length && !selectedPlan && selectedKey !== moving.sourceKey;
  const emptyPastWorkout: Workout | undefined = selectedPlan && canEditPast ? {
    id: `calendar-${selectedKey}-${selectedPlan.id}`,
    dayId: selectedPlan.id,
    dayName: selectedPlan.name,
    date: dateAtNoon(selected),
    minutes: 0,
    records: selectedPlan.exercises.map(entry => {
      const exercise = getExercise(entry.exerciseId, state.preferences);
      return { prescription: entry, loadMode: defaultLoadInputMode(entry.exerciseId), name: displayName(entry.exerciseId, state.preferences), type: exercise.type, sets: Array.from({ length: entry.sets }, () => ({ weight: entry.weight, reps: 1 })) };
    }),
  } : undefined;
  return <Card>
    <Txt weight="600" size={20}>Calendario de entrenamiento</Txt>
    <Txt muted size={13}>Consulta cualquier mes del año. Selecciona un día para corregir un registro pasado o preparar el peso de una sesión futura.</Txt>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 }}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("Cómo funciona la racha")} onPress={() => setShowStreakInfo(value => !value)}><Txt size={28}>⚡</Txt></Pressable>
      <View style={{ flex: 1 }}>
        <Txt weight="600">{t(streak === 1 ? "{n} semana cumpliendo el plan" : "{n} semanas cumpliendo el plan", { n: streak })}</Txt>
        <Txt muted size={12}>{t("Esta semana: {n}/{total} sesiones.", { n: adherence.completed, total: adherence.scheduled })}</Txt>
        {adherence.perfect && <Txt size={12} weight="600" style={{ color: colors.done }}>✓ Semana completa: 100% del plan</Txt>}
      </View>
    </View>
    {showStreakInfo && <Notice>La racha se mantiene al completar al menos la mitad de las sesiones planificadas de cada semana.</Notice>}
    <Row style={{ alignItems: "flex-start", gap: 10 }}>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Button label="Mes anterior" compact variant="ghost" icon="arrow-left" onPress={() => setCursor(current => moveMonth(current, -1))} />
        <Txt size={13} weight="600" style={{ textTransform: "capitalize", textAlign: "center", marginTop: 2 }}>{monthTitle}</Txt>
      </View>
      <View style={{ flex: 1, alignItems: "center" }}>
        <Button label="Mes siguiente" compact variant="ghost" icon="arrow-right" onPress={() => setCursor(current => moveMonth(current, 1))} />
        <Txt size={12} muted style={{ textAlign: "center", marginTop: 2 }}>{yearTitle}</Txt>
      </View>
    </Row>
    <View style={{ flexDirection: "row", gap: 0 }}>
      {weekdayLabels.map(label => <Txt key={label} size={11} muted weight="600" style={{ width: "13.85%", textAlign: "center" }}>{label}</Txt>)}
    </View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 0 }}>
      {dates.map(date => {
        const history = state.history.filter(workout => localDateKey(workout.date) === localDateKey(date));
        const planned = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, date, state.skippedWorkoutDates, state.routineVersions);
        const overridden = state.plannedWorkouts?.some(item => localDateKey(item.date) === localDateKey(date));
        const skipped = state.skippedWorkoutDates?.includes(localDateKey(date));
        const muted = date.getMonth() !== cursor.getMonth();
        const missed = !history.length && !!planned && localDateKey(date) < localDateKey(now);
        const statusColor = history.length ? colors.done : missed ? colors.error : undefined;
        const isSelected = sameDate(date, selected);
        const startMovingHere = () => {
          setSelected(date); setAdding(false);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
          if (planned && !history.length && localDateKey(date) >= localDateKey(moveFloor))
            setMoving({ sourceKey: localDateKey(date), day: planned, fromRecurring: !!scheduledDay(state.profile, state.routine, date, state.routineVersions) });
        };
        return <Pressable key={localDateKey(date)} accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString(locale)}: ${history.length ? t("Entrenamiento registrado") : planned ? `${planned.name}${missed ? ": " + t("Sin realizar") : ""}` : t(skipped ? "Sesión quitada" : "Descanso")}`} accessibilityState={{ selected: isSelected }} onPointerEnter={() => { if (moving && !history.length) setSelected(date); }} onPointerUp={() => { if (moving && !history.length) moveHere(localDateKey(date)); }} onPress={() => { setSelected(date); setAdding(false); }} style={({ pressed }) => ({ width: "13.85%", minHeight: 68, borderRadius: 10, padding: 6, gap: 3, backgroundColor: statusColor ? `${statusColor}20` : isSelected ? colors.accentSoft : pressed ? colors.soft : "transparent", borderWidth: isSelected ? 2 : statusColor ? 1 : 0, borderColor: isSelected ? colors.accent : statusColor, opacity: muted ? 0.38 : 1 })}>
          <Pressable onLongPress={startMovingHere} delayLongPress={350} accessibilityRole="button" accessibilityLabel={`Mover ${planned?.name ?? "sesión"}`} disabled={!planned || !!history.length}>
            <Txt size={12} weight={sameDate(date, now) ? "600" : "400"} style={{ textAlign: "center" }}>{date.getDate()}</Txt>
          </Pressable>
          {history.length ? <Txt translate={false} size={10} weight="700" numberOfLines={1} ellipsizeMode="tail" style={{ color: colors.done }}>{history[0].dayName}</Txt> : planned ? <Txt translate={false} size={10} numberOfLines={1} ellipsizeMode="tail" style={{ color: missed ? colors.error : colors.text }}>{planned.name}</Txt> : null}
          {!!statusColor && <Txt size={10} style={{ color: statusColor }}>{history.length ? "✓" : "✕"}</Txt>}
          {overridden && !history.length && <Txt size={9} muted>ajustada</Txt>}
          {skipped && !history.length && <Txt size={9} muted>quitada</Txt>}
        </Pressable>;
      })}
    </View>
    <Txt muted size={12}>Verde ✓: completada · Rojo ✕: sin realizar · “ajustada”: pesos guardados para esa fecha.</Txt>
    <Txt weight="600">{selected.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</Txt>
    {!!selectedHistory.length && selectedHistory.map(workout => <Card key={workout.id}>
      <Txt weight="600">{canEditPast ? "Editar este entrenamiento" : "Visualizar este entrenamiento"}</Txt>
      <Txt muted size={12}>{canEditPast ? "Abre la sesión completa para corregir pesos y repeticiones." : "Abre la sesión completa en modo lectura. Los entrenamientos de hace más de una semana no se modifican."}</Txt>
      <Button label={canEditPast ? `Editar ${workout.dayName}` : `Visualizar ${workout.dayName}`} icon={canEditPast ? "edit" : "eye"} onPress={() => {
        update(current => ({ ...current, active: openHistoricalWorkout(workout, !canEditPast, current.profile, current.preferences.barWeights, current.preferences.apparatusWeights, current.routine) }));
        router.push("/workout");
      }} />
    </Card>)}
    {!selectedHistory.length && selectedPlan && !isPast && !moving && <>
      <Card>
        <Txt weight="600">Preparar este día</Txt>
        <Txt muted size={12}>Abre el mismo editor detallado del entrenamiento para dejar listas las cargas, máquinas, notas y series por lado de esta fecha.</Txt>
        <Button label={"Preparar " + selectedPlan.name} icon="play" onPress={() => {
          update(current => ({ ...current, active: startWorkout(selectedPlan, current.profile.weight, current.profile.level, current.profile.sex, current.preferences.barWeights, current.preferences.apparatusWeights, current.preferences.loadModes, { preparing: true, plannedDate: dateAtNoon(selected) }) }));
          router.push("/workout");
        }} />
      </Card>
      <Button label="Mover esta sesión" compact variant="secondary" onPress={() => setMoving({ sourceKey: selectedKey, day: selectedPlan, fromRecurring: !!selectedBase })} />
      <Button label="Quitar sesión del calendario" compact variant="ghost" onPress={removeSession} />
    </>}
    {!selectedHistory.length && moving && <Notice>{canMoveHere ? t("Suelta o confirma aquí: {name}.", { name: moving.day.name }) : "Mantén pulsado el día, espera la vibración y arrástralo hasta una fecha libre. También puedes usar el sábado o domingo de la semana anterior."}</Notice>}
    {!selectedHistory.length && canMoveHere && <Button label="Mover aquí" onPress={moveHere} />}
    {!selectedHistory.length && moving && <Button label="Cancelar movimiento" compact variant="ghost" onPress={() => setMoving(null)} />}
    {!selectedHistory.length && !selectedPlan && !isPast && !moving && <>
      {selectedSkipped ? <Button label="Restaurar sesión programada" compact variant="secondary" onPress={restoreSession} /> : <>
        {!adding ? <Button label="Añadir sesión al calendario" compact variant="secondary" onPress={() => setAdding(true)} /> : <>
          <Txt weight="600">Elige la sesión que quieres añadir</Txt>
          {state.routine.map(day => <Choice key={day.id} title={t("Añadir {name}", { name: day.name })} description={t("{n} ejercicios", { n: day.exercises.length })} selected={false} onPress={() => addSession(day)} />)}
          <Button label="Cancelar" compact variant="ghost" onPress={() => setAdding(false)} />
        </>}
      </>}
    </>}
    {!selectedHistory.length && !selectedPlan && <Txt muted size={13}>{isPast ? "No hay un entrenamiento registrado este día." : "Día de descanso en tu calendario."}</Txt>}
    {!selectedHistory.length && selectedPlan && isPast && canEditPast && !moving && emptyPastWorkout && <PastWorkoutEditor workout={emptyPastWorkout} editable create />}
    {!selectedHistory.length && selectedPlan && isPast && !canEditPast && <Txt muted size={13}>Esta sesión tiene más de 7 días y no se puede editar.</Txt>}
  </Card>;
}
