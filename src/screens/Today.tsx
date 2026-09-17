import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { router } from "expo-router";
import { Image, Pressable, View } from "react-native";
import { useState } from "react";
import { APP, copy } from "../config";
import {
  Button,
  Card,
  Heading,
  Icon,
  Notice,
  Page,
  Pill,
  Row,
  Txt,
} from "../components/ui";
import { useStore } from "../state/Store";
import { allExercises, displayName, duration } from "../logic/routine";
import { isActiveWorkoutOnDate, resumeWorkout, startWorkout } from "../logic/workout";
import {
  routineSchedule,
  scheduledWorkout,
  weekdayName,
  workoutsOnDate,
} from "../logic/schedule";
import {
  overallStats,
  workoutStats,
} from "../logic/performance";
import { useTheme } from "../theme";
import { Calories } from "../components/Calories";
import { motivationalQuoteForDate } from "../content/motivation";
import { RoutineOverview } from "./Routine";
import { sessionProgressInsight } from "../logic/insights";
import { WeeklyProgressInsight } from "../components/WeeklyProgressInsight";



export default function Today() {
  const { t, locale } = useLanguage();
  const { state, update } = useStore();
  const { colors } = useTheme();
  const skippedName = (name: string) => {
    const exercise = allExercises(state.preferences).find(item => (state.preferences.names[item.id] ?? item.name) === name);
    return exercise ? displayName(exercise.id, state.preferences) : name;
  };
  const formatNumber = (value: number) => value.toLocaleString(locale, { maximumFractionDigits: 0 });
  const now = new Date();
  const quote = motivationalQuoteForDate(now);
  const planned = scheduledWorkout(state.profile, state.routine, state.plannedWorkouts, now, state.skippedWorkoutDates, state.routineVersions);
  const activeToday = isActiveWorkoutOnDate(state.active, now) ? state.active : undefined;
  // A session started before midnight is still recoverable, but must never be
  // presented as the plan for the current calendar day.
  const pendingActive = state.active && !state.active.preparing && !activeToday ? state.active : undefined;
  const todayWorkouts = workoutsOnDate(state.history, now);
  const completed = [...todayWorkouts]
    .reverse()
    .find((workout) =>
      planned
        ? workout.dayId === planned.id ||
          (!workout.dayId && workout.dayName === planned.name)
        : true,
    );
  const todaySession = activeToday?.day ?? (completed
    ? state.routine.find((day) => day.id === completed.dayId) ?? planned
    : planned);
  const latestStats = completed ? workoutStats(completed) : undefined;
  const trend = completed ? sessionProgressInsight(completed, state.history) : undefined;
  const overall = overallStats(state.history);
  const schedule = routineSchedule(state.profile, state.routine);
  // Opening the training tab should immediately show today's prescribed work,
  // without expanding the rest of the weekly routine.
  const [expandedDayId, setExpandedDayId] = useState<string | null>(() => planned?.id ?? null);
  const [editingRoutine, setEditingRoutine] = useState(false);
  const session = expandedDayId
    ? (todaySession?.id === expandedDayId ? todaySession : state.routine.find(day => day.id === expandedDayId))
    : undefined;
  const nextPlanned = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(now.getDate() + offset + 1);
    return {
      date,
      item: schedule.find(
        ({ weekday }) =>
          weekday === (date.getDay() === 0 ? 7 : date.getDay()),
      ),
    };
  }).find(({ item }) => item);

  const trendMessage =
    trend?.status === "up"
      ? t("Vas progresando: +{value1}% en {value2} ejercicios comparables. Buen trabajo; mantén la constancia.", { value1: trend.percent, value2: trend.compared })
      : trend?.status === "down"
        ? t("Esta sesión ha bajado un {value1}% en {value2} ejercicios comparables. Una sesión aislada no define tu progreso.", { value1: Math.abs(trend.percent), value2: trend.compared })
        : trend?.status === "steady"
          ? t("Rendimiento estable ({value1}{value2}%) en {value3} ejercicios comparables. Sigue acumulando sesiones con buena técnica.", { value1: trend.percent >= 0 ? "+" : "", value2: trend.percent, value3: trend.compared })
          : "Primera referencia comparable de esta sesión. A partir de la próxima podrás ver la tendencia.";

  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Row><Image source={require("../../assets/brand/icon.png")} style={{ width: 26, height: 26, borderRadius: 6 }} accessibilityLabel="Akhyles" /><Txt size={21} weight="600">{APP.name}</Txt></Row>
        <Pill>{messages.Today.unPasoALaVez}</Pill>
      </Row>
      <Heading
        eyebrow={new Intl.DateTimeFormat(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
        }).format(now)}
        title={
          activeToday
            ? "Entrenamiento en curso"
            : completed
              ? "Sesión terminada"
              : planned
                ? "Esto es lo que toca hoy"
                : "Hoy toca recuperar"
        }
        subtitle={
          activeToday
            ? "Puedes continuar exactamente donde lo dejaste."
            : completed
              ? "Aquí tienes el resumen de tu entrenamiento y tu tendencia."
              : planned
                ? t("Tu calendario marca {name}.", { name: t(planned.name) })
                : nextPlanned?.item
                  ? t("Próxima sesión: {value1}, {value2}.", { value1: t(weekdayName(nextPlanned.item.weekday)), value2: t(nextPlanned.item.day.name) })
                  : "No hay una sesión programada para hoy."
        }
      />
      <Card style={{ padding: 18 }}>
        <Txt size={16} weight="600">“{t(quote.text)}”</Txt>
        {quote.author && <Txt muted size={12} style={{ marginTop: 6 }} translate={false}>— {quote.author}</Txt>}
      </Card>

      <Card style={{ padding: 14 }}>
        <Txt weight="600">Tu semana</Txt>
        <Row style={{ flexWrap: "wrap" }}>{schedule.map(({ day, weekday }) => <Pressable key={day.id} accessibilityRole="button" accessibilityLabel={`${t(weekdayName(weekday))} ${t(day.name)}`} onPress={() => setExpandedDayId(value => value === day.id ? null : day.id)} style={{ paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: expandedDayId === day.id ? colors.accentSoft : colors.soft }}><Txt size={12} weight="600">{t(weekdayName(weekday))} · {t(day.name)}</Txt></Pressable>)}</Row>
      </Card>

      <Button label={editingRoutine ? "Cerrar edición de rutina" : "Editar mi rutina"} variant="secondary" onPress={() => setEditingRoutine(value => !value)} />
      {editingRoutine && <RoutineOverview />}
      {activeToday && activeToday.day.id !== session?.id && <Button label={messages.Today.continuarEntrenamiento} icon="play" onPress={() => router.push("/workout")} />}
      {pendingActive && <Card>
        <Pill>ENTRENAMIENTO PENDIENTE</Pill>
        <Txt weight="600" size={18}>{pendingActive.day.name}</Txt>
        <Txt muted>Empezaste esta sesión otro día. Puedes retomarla sin alterar el plan de hoy.</Txt>
        <Button label="Continuar entrenamiento pendiente" icon="play" onPress={() => router.push("/workout")} />
      </Card>}

      {session && (
        <Card
          style={{
            backgroundColor: colors.accentSoft,
            borderColor: colors.accentSoft,
            padding: 24,
          }}
        >
          <Pill>
            {activeToday?.day.id === session.id
              ? "SESIÓN EN CURSO"
                : completed && todaySession?.id === session.id
                ? "SESIÓN TERMINADA"
                : planned?.id === session.id ? "SESIÓN DE HOY" : "Vista previa de la rutina"}
          </Pill>
          <Txt size={34} weight="600">{session.name}</Txt>
          <Row>
            <Icon name="clock" size={16} />
            <Txt size={14}>{t("≈ {value1} min estimados", { value1: duration(session, state.preferences) })}</Txt>
            <Txt muted>·</Txt>
            <Txt size={14}>{t(session.exercises.length === 1 ? "{count} ejercicio" : "{count} ejercicios", { count: session.exercises.length })}</Txt>
          </Row>
          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginVertical: 6,
            }}
          />
          <View testID="session-preview" style={{ gap: 8 }}>
            <Txt weight="600" size={15}>Vista previa completa</Txt>
            <Txt muted size={12}>Este es el orden de tu sesión antes de empezar.</Txt>
            {session.exercises.map((entry, index) => (
              <View
                key={entry.id}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Txt weight="600" size={13} style={{ color: colors.accent, width: 20 }}>
                  {String(index + 1).padStart(2, "0")}
                </Txt>
                <View style={{ flex: 1 }}>
                  <Txt weight="600" size={14} translate={false}>
                    {displayName(entry.exerciseId, state.preferences)}
                  </Txt>
                  <Txt muted size={12}>{t(entry.sets === 1 ? "{value1} serie · {value2}–{value3} repeticiones" : "{value1} series · {value2}–{value3} repeticiones", { value1: entry.sets, value2: entry.range[0], value3: entry.range[1] })}</Txt>
                </View>
              </View>
            ))}
          </View>
          {(activeToday?.day.id === session.id || (!activeToday && !completed && planned?.id === session.id)) && (
            <Button
              label={
                activeToday
                  ? messages.Today.continuarEntrenamiento
                  : messages.Today.iniciarEntrenamiento
              }
              icon="play"
              disabled={!activeToday && !session.exercises.length}
              onPress={() => {
                  update((stateBeforeStart) => ({
                    ...stateBeforeStart,
                    active: activeToday ? resumeWorkout(stateBeforeStart) : startWorkout(
                      session,
                      stateBeforeStart.profile.weight,
                      stateBeforeStart.profile.level,
                      stateBeforeStart.profile.sex,
                      stateBeforeStart.preferences.barWeights,
                      stateBeforeStart.preferences.apparatusWeights,
                      stateBeforeStart.preferences.loadModes,
                    ),
                  }));
                router.push("/workout");
              }}
            />
          )}
          <Button
            label="Ver calendario"
            variant="ghost"
            compact
            onPress={() => router.replace("/routine")}
          />
        </Card>
      )}

      {!todaySession && (
        <Card>
          <Pill>DÍA DE DESCANSO</Pill>
          <Txt weight="600" size={20}>No tienes entrenamiento programado hoy.</Txt>
          <Txt muted>
            Tu calendario se puede cambiar en Perfil. Para recuperarte, procura dormir 8 horas cada noche, acostándote y levantándote a los mismos horarios. Mantén una alimentación suficiente.
          </Txt>
          <Button
            label="Abrir calendario"
            variant="secondary"
            onPress={() => router.replace("/routine")}
          />
        </Card>
      )}

      <WeeklyProgressInsight state={state} />

      {completed && latestStats && trend && (
        <>
          <Txt weight="600" size={18}>Tu último entrenamiento</Txt>
          <Calories workout={completed} />
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{latestStats.sets}</Txt>
              <Txt size={12} muted>{latestStats.sets === 1 ? "serie realizada" : "series realizadas"}</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{latestStats.reps}</Txt>
              <Txt size={12} muted>{latestStats.reps === 1 ? "repetición" : "repeticiones"}</Txt>
            </Card>
          </Row>
          <Card>
            <Txt size={28} weight="500">{formatNumber(latestStats.volume)}</Txt>
            <Txt size={12} muted>kg × repeticiones de volumen registrado</Txt>
            {!!completed.skipped?.length && (
              <Txt size={12} muted>{t("Omitidos hoy: {value1}", { value1: completed.skipped.map(skippedName).join(", ") })}</Txt>
            )}
          </Card>
          <Notice>{trendMessage}</Notice>
          {trend.status === "down" && (
            <Card>
              <Txt weight="600" size={18}>Consejos para recuperarte</Txt>
              <Txt>
                Descanso: procura dormir 8 horas cada noche, acostándote y levantándote a los mismos horarios.
              </Txt>
              <Txt>
                Proteína: apunta a 1,8 gramos por kilo de peso corporal al día.
              </Txt>
              <Txt>
                Energía e hidratación: come suficiente para sostener tus entrenamientos y llega bien hidratado.
              </Txt>
              <Txt muted>
                Si la bajada de rendimiento se repite, revisa la fatiga acumulada y ajusta el plan.
              </Txt>
            </Card>
          )}
          <Txt weight="600" size={18}>Estadísticas generales</Txt>
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{overall.sessions}</Txt>
              <Txt size={12} muted>{overall.sessions === 1 ? "sesión" : "sesiones"}</Txt>
            </Card>
            <Card style={{ flex: 1 }}>
              <Txt size={26} weight="500">{overall.sets}</Txt>
              <Txt size={12} muted>{overall.sets === 1 ? "serie total" : "series totales"}</Txt>
            </Card>
          </Row>
          <Card>
            <Txt size={28} weight="500">{formatNumber(overall.volume)}</Txt>
            <Txt size={12} muted>kg × repeticiones acumulados</Txt>
            <Txt size={12} muted>
              La tendencia compara la mejor serie estimada de ejercicios comunes con la sesión anterior del mismo tipo. El volumen depende de cómo registres barras, máquinas y mancuernas.
            </Txt>
          </Card>
        </>
      )}

      {!completed && (
        <>
          <Row>
            <Card style={{ flex: 1 }}>
              <Txt size={30} weight="500">3–5</Txt>
              <Txt size={12} muted>minutos de descanso</Txt>
            </Card>
            <Card style={{ flex: 1 }}><Icon name="droplet" size={24} /><Txt size={12} muted>Bebe agua durante el entrenamiento</Txt></Card>
          </Row>
          <Notice>{copy.twoSets}</Notice>
        </>
      )}
    </Page>
  );
}
