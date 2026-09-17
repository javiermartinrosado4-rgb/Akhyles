import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";
import {
  Button,
  Card,
  Heading,
  Notice,
  Page,
  Pill,
  Row,
  Txt,
  Field,
} from "../components/ui";
import { useStore } from "../state/Store";
import { allExercises, displayName, getExercise, restSeconds } from "../logic/routine";
import { applyExerciseRecommendation, draftFor, finishWorkout } from "../logic/workout";
import { number, validWeight } from "../logic/validation";
import { ExerciseRecord, SetRecord, PlannedWorkout } from "../types";
import { WeightSuggestion } from "../components/WeightSuggestion";
import { useTheme } from "../theme";
import { Calories } from "../components/Calories";
import { EquipmentPhoto } from "../components/EquipmentPhoto";
import { ExerciseEditor } from "../components/ExerciseEditor";
import { MachineBrandSelect } from "../components/MachineBrandSelect";
import { defaultBarWeight, defaultLoadInputMode, formatLoad, fromStoredLoad, isAssistedPullup, loadHint, LoadInputMode, supportsApparatusWeight, supportsBarWeight, supportsPerSideInput, toStoredLoad, validBarWeight } from "../logic/load";

const draftFromRecord = (sets: SetRecord[], mode: LoadInputMode = "total") =>
  sets.map((set) => ({
    weight: formatLoad(fromStoredLoad(set.weight, mode)),
    reps: String(set.reps),
    ...(mode === "per-side" ? {
      leftWeight: formatLoad(set.leftWeight ?? fromStoredLoad(set.weight, mode)),
      rightWeight: formatLoad(set.rightWeight ?? fromStoredLoad(set.weight, mode)),
      ...(set.leftReps !== undefined ? { leftReps: String(set.leftReps), rightReps: String(set.rightReps ?? set.reps) } : {}),
    } : {}),
  }));

export default function Workout() {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const { colors } = useTheme();
  const skippedName = (name: string) => {
    const exercise = allExercises(state.preferences).find(item => (state.preferences.names[item.id] ?? item.name) === name);
    return exercise ? displayName(exercise.id, state.preferences) : name;
  };
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  const active = state.active;
  if (!state.completed || state.signedOut) return <Redirect href="/" />;
  if (!active) {
    const workout = state.history.at(-1);
    return (
      <Page>
        <Heading
          eyebrow={messages.Workout.buenTrabajo}
          title={
            workout
              ? messages.Workout.unaSesionMasParaTi
              : messages.Workout.tuProximaSesionTeEspera
          }
          subtitle={
            workout
              ? t(workout.records.length === 1 ? "{value1} · {value2} ejercicio registrado{value3}" : "{value1} · {value2} ejercicios registrados{value3}", { value1: t(workout.dayName), value2: workout.records.length, value3: workout.skipped?.length ? t(workout.skipped.length === 1 ? " · {count} omitido" : " · {count} omitidos", { count: workout.skipped.length }) : "" })
              : messages.Workout.eligeUnDiaDesdeTuRutina
          }
        />
        {workout && (
          <>
            <Pill>{messages.Workout.entrenamientoGuardado}</Pill>
            <Calories workout={workout} />
            {!!workout.skipped?.length && (
              <Notice>{t("Hoy no has podido hacer: {exercises}. Tu rutina no se ha modificado.", { exercises: workout.skipped.map(skippedName).join(", ") })}</Notice>
            )}
            <Txt muted>{messages.Workout.revisaLasCargasParaTuProximaSesion}</Txt>
            {workout.records.map((record, i) => (
              <WeightSuggestion key={`${workout.id}-${i}`} record={record} />
            ))}
          </>
        )}
        <Button
          label={messages.Workout.volverAHoy}
          onPress={() => router.replace("/today")}
        />
      </Page>
    );
  }

  const entry = active.day.exercises[active.index];
  const historical = active.historical;
  const readOnly = !!historical?.readOnly;
  const closeHistorical = () => {
    update(s => ({ ...s, active: undefined }));
    router.replace("/routine");
  };
  const exercise = getExercise(entry.exerciseId, state.preferences);
  const skipped = active.skipped ?? [];
  const drafts = active.drafts ?? { [entry.id]: active.draft };
  const completed = new Set(active.records.map((record) => record.prescription.id));
  const isSkipped = skipped.includes(entry.id);
  const loadMode = active.loadModes?.[entry.id] ?? state.preferences.loadModes?.[entry.exerciseId] ?? defaultLoadInputMode(entry.exerciseId);
  const barWeightText = active.barWeights?.[entry.exerciseId] ?? String(defaultBarWeight(entry.exerciseId));
  const apparatusWeightText = active.apparatusWeights?.[entry.exerciseId] ?? String(state.preferences.apparatusWeights?.[entry.exerciseId] ?? 0);
  const machineBrand = active.machineBrands?.[entry.id] ?? entry.machineBrand ?? state.preferences.machineBrands?.[entry.exerciseId];
  const isBodyweight = exercise.variant === "bodyweight";
  const hasApparatusWeight = (exercise.variant === "machine" || exercise.variant === "smith") && supportsApparatusWeight(entry.exerciseId);
  const hasAddedBaseWeight = supportsBarWeight(entry.exerciseId) || hasApparatusWeight;
  const baseWeightText = supportsBarWeight(entry.exerciseId) ? barWeightText : apparatusWeightText;
  const baseWeightLabel = supportsBarWeight(entry.exerciseId) ? "Peso de la barra" : "Peso del aparato";
  const weighted = active.weighted?.[entry.id] ?? false;
  const changeBarWeight = (value: string) => {
    setError("");
    setSavedNotice(false);
    update(s => !s.active ? s : ({ ...s,
      active: { ...s.active, barWeights: { ...s.active.barWeights, [entry.exerciseId]: value } },
      preferences: !historical && value.trim() && validBarWeight(number(value)) ? { ...s.preferences,
        barWeights: { ...s.preferences.barWeights, [entry.exerciseId]: number(value) } } : s.preferences,
    }));
  };
  const changeApparatusWeight = (value: string) => {
    setError("");
    setSavedNotice(false);
    update(s => !s.active ? s : ({ ...s,
      active: { ...s.active, apparatusWeights: { ...s.active.apparatusWeights, [entry.exerciseId]: value } },
      preferences: !historical && value.trim() && validBarWeight(number(value)) ? { ...s.preferences,
        apparatusWeights: { ...s.preferences.apparatusWeights, [entry.exerciseId]: number(value) } } : s.preferences,
    }));
  };
  const changeMachineBrand = (brand?: string) => {
    setSavedNotice(false);
    update(s => !s.active ? s : ({ ...s, active: { ...s.active, machineBrands: { ...s.active.machineBrands, [entry.id]: brand ?? "" } },
      preferences: historical ? s.preferences : { ...s.preferences, machineBrands: { ...s.preferences.machineBrands, ...(brand ? { [entry.exerciseId]: brand } : {}) } } }));
  };

  const changeSet = (
    index: number,
    field: "weight" | "reps" | "leftWeight" | "rightWeight" | "leftReps" | "rightReps",
    value: string,
  ) => {
    setError("");
    setSavedNotice(false);
    update((s) => {
      if (!s.active) return s;
      const draft = s.active.draft.map((set, i) =>
        i === index ? { ...set, [field]: value } : set,
      );
      return {
        ...s,
        active: {
          ...s.active,
          draft,
          drafts: { ...(s.active.drafts ?? {}), [entry.id]: draft },
        },
      };
    });
  };

  const changeLoadMode = (nextMode: LoadInputMode) => {
    if (nextMode === loadMode) return;
    setSavedNotice(false);
    update(s => {
      if (!s.active) return s;
      const bar = number(barWeightText) || 0;
      const toPlates = (value: number, mode: LoadInputMode) => mode === "per-side" ? value * 2 : mode === "total-with-bar" ? Math.max(0, value - bar) : value;
      const fromPlates = (value: number, mode: LoadInputMode) => mode === "per-side" ? value / 2 : mode === "total-with-bar" ? value + bar : value;
      const draft = s.active.draft.map(set => {
        // When leaving per-side mode, the side fields are the latest edit;
        // set.weight may still contain the old derived total.
        const currentValue = loadMode === "per-side"
          ? Math.min(number(set.leftWeight ?? set.weight), number(set.rightWeight ?? set.weight))
          : number(set.weight);
        const weight = formatLoad(fromPlates(toPlates(currentValue, loadMode), nextMode));
        // Per-side input always presents one complete row per arm. Seed both
        // sides from the existing total so switching modes never loses a set.
        return nextMode === "per-side"
          ? { ...set, weight, leftWeight: set.leftWeight ?? weight, rightWeight: set.rightWeight ?? weight, leftReps: set.leftReps ?? set.reps, rightReps: set.rightReps ?? set.reps }
          : { ...set, weight, leftWeight: undefined, rightWeight: undefined, leftReps: undefined, rightReps: undefined };
      });
      const asymmetricSets = { ...(s.active.asymmetricSets ?? {}) };
      delete asymmetricSets[entry.id];
      return { ...s, active: { ...s.active, draft, drafts: { ...(s.active.drafts ?? {}), [entry.id]: draft }, loadModes: { ...(s.active.loadModes ?? {}), [entry.id]: nextMode }, asymmetricSets }, preferences: historical ? s.preferences : { ...s.preferences, loadModes: { ...(s.preferences.loadModes ?? {}), [entry.exerciseId]: nextMode } } };
    });
  };

  const changeWeighted = (value: boolean) => {
    update(s => !s.active ? s : ({ ...s, active: { ...s.active, weighted: { ...s.active.weighted, [entry.id]: value } } }));
  };

  const changeExerciseNote = (note: string) => {
    if (historical) return;
    update(s => ({ ...s, preferences: {
      ...s.preferences,
      notes: { ...(s.preferences.notes ?? {}), [entry.exerciseId]: note.slice(0, 300) },
    } }));
  };

  const goTo = (
    target: number,
    records = active.records,
    nextSkipped = skipped,
    nextDrafts = drafts,
  ) => {
    const targetEntry = active.day.exercises[target];
    setSavedNotice(false);
    const saved = records.find((record) => record.prescription.id === targetEntry.id);
    const savedDraft =
      nextDrafts[targetEntry.id] ??
      (saved ? draftFromRecord(saved.sets, active.loadModes?.[targetEntry.id] ?? state.preferences.loadModes?.[targetEntry.exerciseId] ?? defaultLoadInputMode(targetEntry.exerciseId)) : draftFor(targetEntry, active.loadModes?.[targetEntry.id] ?? state.preferences.loadModes?.[targetEntry.exerciseId] ?? defaultLoadInputMode(targetEntry.exerciseId)));
    const draft = draftFor(targetEntry, active.loadModes?.[targetEntry.id] ?? state.preferences.loadModes?.[targetEntry.exerciseId] ?? defaultLoadInputMode(targetEntry.exerciseId)).map((blank, index) => savedDraft[index] ?? blank);
    update((s) =>
      s.active
        ? {
            ...s,
            active: {
              ...s.active,
              index: target,
              records,
              skipped: nextSkipped,
              drafts: {
                ...nextDrafts,
                [entry.id]: active.draft,
                [targetEntry.id]: draft,
              },
              loadModes: s.active.loadModes,
              draft,
            },
          }
        : s,
    );
    setError("");
  };

  const nextPending = (records: ExerciseRecord[], nextSkipped: string[]) => {
    const resolved = new Set([
      ...records.map((record) => record.prescription.id),
      ...nextSkipped,
    ]);
    for (let offset = 1; offset < active.day.exercises.length; offset++) {
      const index = (active.index + offset) % active.day.exercises.length;
      if (!resolved.has(active.day.exercises[index].id)) return index;
    }
    return -1;
  };

  const complete = (records: ExerciseRecord[], nextSkipped: string[], savedRecord?: ExerciseRecord, stayOpen = false) => {
    if (historical) {
      // Replacing a record appends it while editing. Restore the original
      // session sequence before persisting so a corrected exercise never
      // jumps to a different position next time the history is opened.
      const ordered = active.day.exercises.flatMap(item => {
        const record = records.find(candidate => candidate.prescription.id === item.id);
        return record ? [record] : [];
      });
      update(s => {
        const saved = { ...s, active: stayOpen ? s.active : undefined, history: s.history.map(workout => workout.id === historical.workoutId ? { ...workout, records: ordered, skipped: historical.skipped } : workout) };
        const recommended = savedRecord ? applyExerciseRecommendation(saved, savedRecord, active.startedAt) : saved;
        if (!stayOpen || !recommended.active) return recommended;
        return { ...recommended, active: { ...recommended.active, records: ordered, skipped: nextSkipped, drafts: { ...(recommended.active.drafts ?? {}), [entry.id]: active.draft }, draft: active.draft } };
      });
      setError("");
      if (!stayOpen) router.replace("/routine");
      return;
    }
    if (active.preparing) {
      const plannedDate = active.plannedDate ?? new Date().toISOString();
      update(s => {
        const byId = new Map(records.map(record => [record.prescription.id, record]));
        const day = { ...active.day, exercises: active.day.exercises.map(entry => {
          const record = byId.get(entry.id);
          const weight = record?.sets[0]?.weight;
          const machineBrand = record?.machineBrand;
          return { ...entry, ...(Number.isFinite(weight) ? { weight } : {}), ...(machineBrand ? { machineBrand } : {}) };
        }) };
        const item: PlannedWorkout = { date: plannedDate, dayId: day.id, day };
        return { ...s, active: undefined, plannedWorkouts: [...(s.plannedWorkouts ?? []).filter(value => new Date(value.date).toDateString() !== new Date(plannedDate).toDateString()), item] };
      });
      setError("");
      router.replace("/routine");
      return;
    }
    const ordered = active.day.exercises.flatMap((item) => {
      const record = records.find((candidate) => candidate.prescription.id === item.id);
      return record ? [record] : [];
    });
    update((s) =>
      finishWorkout(s, {
        level: active.level,
        sex: active.sex,
        startedAt: active.startedAt,
        bodyWeight: active.bodyWeight ?? number(s.profile.weight),
        id: `session-${Date.now()}`,
        dayId: active.day.id,
        date: new Date().toISOString(),
        dayName: active.day.name,
        minutes: Math.max(
          1,
          Math.round(
            (Date.now() - new Date(active.startedAt).getTime()) / 60000,
          ),
        ),
        records: ordered,
        skipped: active.day.exercises
          .filter((item) => nextSkipped.includes(item.id))
          .map((item) => state.preferences.names[item.exerciseId] ?? getExercise(item.exerciseId, state.preferences).name),
      }),
    );
    setError("");
  };

  const saveExercise = () => {
    if (!isBodyweight && hasAddedBaseWeight && loadMode !== "total-with-bar" && (!baseWeightText.trim() || !validBarWeight(number(baseWeightText)))) {
      setError("Introduce un peso base entre 0 y 100 kg. Puedes poner 0."); return;
    }
    const sets = active.draft.map((set, index) => {
      const sideSpecific = loadMode === "per-side";
      const leftWeight = sideSpecific ? number(set.leftWeight ?? set.weight) : undefined;
      const rightWeight = sideSpecific ? number(set.rightWeight ?? set.weight) : undefined;
      const enteredWeight = sideSpecific ? Math.min(leftWeight!, rightWeight!) : number(set.weight);
      const sideReps = loadMode === "per-side";
      const leftReps = sideReps ? number(set.leftReps ?? set.reps) : undefined;
      const rightReps = sideReps ? number(set.rightReps ?? set.reps) : undefined;
      return {
        weight: isBodyweight && !weighted ? 0 : loadMode === "total-with-bar" ? Math.max(0, enteredWeight - (number(barWeightText) || 0)) : sideSpecific ? enteredWeight * 2 : toStoredLoad(enteredWeight, loadMode),
        reps: sideReps ? Math.min(leftReps!, rightReps!) : number(set.reps),
        ...(sideSpecific ? { leftWeight, rightWeight } : {}),
        ...(sideReps ? { leftReps, rightReps } : {}),
      };
    });
    if (
      sets.some(
        (set) =>
          !validWeight(set.weight) ||
          (set.leftWeight !== undefined && (!validWeight(set.leftWeight) || !validWeight(set.rightWeight ?? NaN))) ||
          (set.leftReps !== undefined && (!Number.isInteger(set.leftReps) || set.leftReps < 1 || set.leftReps > 100)) ||
          (set.rightReps !== undefined && (!Number.isInteger(set.rightReps) || set.rightReps < 1 || set.rightReps > 100)) ||
          !Number.isInteger(set.reps) ||
          set.reps < 1 ||
          set.reps > 100,
      )
    ) {
      setError(messages.Workout.completaCadaSerieConUnPesoValido);
      return;
    }
    const record: ExerciseRecord = {
      loadMode,
      ...(supportsBarWeight(entry.exerciseId) ? { barWeight: number(barWeightText) || 0 } : {}),
      ...(hasApparatusWeight ? { apparatusWeight: number(apparatusWeightText) || 0 } : {}),
      ...(machineBrand ? { machineBrand } : {}),
      prescription: entry,
      name: state.preferences.names[entry.exerciseId] ?? exercise.name,
      type: exercise.type,
      sets,
    };
    const records = [
      ...active.records.filter(
        (saved) => saved.prescription.id !== entry.id,
      ),
      record,
    ];
    const nextSkipped = skipped.filter((id) => id !== entry.id);
    const target = nextPending(records, nextSkipped);
    if (historical) {
      complete(records, nextSkipped, record, true);
      setSavedNotice(true);
    } else if (target < 0) complete(records, nextSkipped, record);
    else update(s => !s.active ? s : ({
      ...s,
      active: {
        ...s.active,
        records,
        skipped: nextSkipped,
        draft: active.draft,
        drafts: { ...(s.active.drafts ?? {}), [entry.id]: active.draft },
      },
    }));
  };

  const skipExercise = () => {
    const records = active.records.filter(
      (record) => record.prescription.id !== entry.id,
    );
    const nextSkipped = [...new Set([...skipped, entry.id])];
    const target = nextPending(records, nextSkipped);
    if (target < 0) complete(records, nextSkipped);
    else goTo(target, records, nextSkipped, {
      ...drafts,
      [entry.id]: active.draft,
    });
  };

  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label={historical ? "Volver al calendario" : messages.Workout.guardarYSalir}
          compact
          variant="ghost"
          icon="arrow-left"
          onPress={() => historical ? closeHistorical() : router.replace("/today")}
        />
        <Txt size={12} muted>
          {active.index + 1} / {active.day.exercises.length}
        </Txt>
      </Row>
      <View
        style={{ height: 5, borderRadius: 3, backgroundColor: colors.border }}
      >
        <View
          style={{
            height: 5,
            borderRadius: 3,
            width: `${((completed.size + skipped.length) / active.day.exercises.length) * 100}%`,
            backgroundColor: colors.accent,
          }}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
        {active.day.exercises.map((item, index) => {
          const done = completed.has(item.id);
          const skippedItem = skipped.includes(item.id);
          const current = index === active.index;
          return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Ir a ${displayName(item.exerciseId, state.preferences)}`} onPress={() => goTo(index)} style={{ minWidth: 76, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: current ? colors.accent : done ? colors.done : skippedItem ? colors.soft : colors.accentSoft, opacity: skippedItem ? 0.55 : 1 }}>
            <Txt size={11} weight="600" numberOfLines={1} translate={false} style={{ color: current || done ? colors.onAccent : colors.accent }}>{index + 1}. {displayName(item.exerciseId, state.preferences)}</Txt>
          </Pressable>;
        })}
      </ScrollView>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label="Ejercicio anterior"
          compact
          variant="secondary"
          icon="arrow-left"
          disabled={active.index === 0}
          onPress={() => goTo(active.index - 1)}
        />
        <Button
          label="Ejercicio siguiente"
          compact
          variant="secondary"
          icon="arrow-right"
          disabled={active.index === active.day.exercises.length - 1}
          onPress={() => goTo(active.index + 1)}
        />
      </Row>
      <View style={{ gap: 12 }}>
        <Txt size={11} weight="600" muted style={{ letterSpacing: 2 }}>{t(active.day.name).toUpperCase()}</Txt>
        <View testID="workout-exercise-heading" style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt translate={false} accessibilityRole="header" size={26} weight="600" style={{ letterSpacing: -0.8 }}>
              {displayName(entry.exerciseId, state.preferences)}
            </Txt>
          </View>
          <EquipmentPhoto key={entry.exerciseId} exerciseId={entry.exerciseId} exerciseName={displayName(entry.exerciseId, state.preferences)} />
        </View>
        <Txt muted>{t(entry.sets === 1 ? "{value1} serie efectiva · {value2}–{value3} repeticiones" : "{value1} series efectivas · {value2}–{value3} repeticiones", { value1: entry.sets, value2: entry.range[0], value3: entry.range[1] })}</Txt>
      </View>
      {!historical && <Button
        label="Cambiar ejercicio para hoy"
        compact
        variant="secondary"
        icon="repeat"
        onPress={() => setEditingExercise(value => !value)}
      />}
      {editingExercise && (
        <ExerciseEditor
          dayId={active.day.id}
          prescription={entry}
          close={() => setEditingExercise(false)}
          report={setError}
          sessionOnly
        />
      )}
      {completed.has(entry.id) && <Pill>Ejercicio registrado · puedes corregirlo</Pill>}
      {isSkipped && <Pill>Omitido por hoy · puedes volver y registrarlo</Pill>}
      <Pill>{t("Descanso recomendado: {value1} min", { value1: restSeconds(exercise) / 60 })}</Pill>
      <Notice>{messages.Workout.hazElCalentamientoYLasAproximacionesQue}</Notice>
      {exercise.note && <Notice>{exercise.note}</Notice>}
      {!isBodyweight && <Card>
        <Txt weight="600">Cómo introduces la carga</Txt>
        <Txt muted size={12}>{loadHint(entry.exerciseId)}</Txt>
        {!readOnly && <Row>
          <Button label="Total" compact variant={loadMode === "total" ? "primary" : "secondary"} onPress={() => changeLoadMode("total")} />
          {supportsPerSideInput(entry.exerciseId) && <Button label="Por lado" compact variant={loadMode === "per-side" ? "primary" : "secondary"} onPress={() => changeLoadMode("per-side")} />}
          {supportsBarWeight(entry.exerciseId) && <Button label="Total levantado" compact variant={loadMode === "total-with-bar" ? "primary" : "secondary"} onPress={() => changeLoadMode("total-with-bar")} />}
        </Row>}
        {hasAddedBaseWeight && loadMode !== "total-with-bar" && <Field label={baseWeightLabel} value={baseWeightText} onChangeText={supportsBarWeight(entry.exerciseId) ? changeBarWeight : changeApparatusWeight} numeric suffix="kg" disabled={readOnly} />}
        {hasAddedBaseWeight && <Txt muted size={12}>{loadMode === "total-with-bar" ? "El total ya incluye la barra; no se añadirá nada más." : supportsBarWeight(entry.exerciseId) ? t("Barra añadida: {value1} kg. Se suma una sola vez a la carga externa. Si no hay barra, usa 0.", { value1: barWeightText || "0" }) : `Peso del aparato: ${apparatusWeightText || "0"} kg. Se suma a la carga indicada y la gráfica muestra el total, también para sesiones anteriores.`}</Txt>}
        {hasApparatusWeight && !readOnly && <MachineBrandSelect exerciseId={entry.exerciseId} value={machineBrand} onChange={changeMachineBrand} />}
      </Card>}
      {isBodyweight && <Card>
        <Txt weight="600">Peso corporal</Txt>
        <Txt muted size={12}>{loadHint(entry.exerciseId)}</Txt>
        {!readOnly && <Row><Button label="Sin lastre" compact variant={!weighted ? "primary" : "secondary"} onPress={() => changeWeighted(false)} /><Button label="Con lastre" compact variant={weighted ? "primary" : "secondary"} onPress={() => changeWeighted(true)} /></Row>}
        {!readOnly && weighted && <Row><Button label="Total" compact variant={loadMode === "total" ? "primary" : "secondary"} onPress={() => changeLoadMode("total")} /><Button label="Por lado" compact variant={loadMode === "per-side" ? "primary" : "secondary"} onPress={() => changeLoadMode("per-side")} /></Row>}
      </Card>}
      {!historical && <Field
        label="Notas para este ejercicio"
        value={state.preferences.notes?.[entry.exerciseId] ?? ""}
        onChangeText={changeExerciseNote}
        placeholder="Pon lo que quieras aquí, se guardará para la próxima vez que hagas este ejercicio"
        multiline
        maxLength={300}
        disabled={readOnly}
      />}
      {active.draft.map((set, index) => (
        <Card key={`${entry.id}-${index}`}>
          <Txt weight="600">
            {t("Serie {count}", { count: index + 1 })}
          </Txt>
          {loadMode === "per-side" ? <View style={{ gap: 10 }}>
            {(["left", "right"] as const).map(side => {
              const left = side === "left";
              return <Row key={side} style={{ alignItems: "flex-end", gap: 8 }}>
                <Txt weight="600" size={12} style={{ width: 66 }}>{left ? "Izquierdo" : "Derecho"}</Txt>
                {(!isBodyweight || weighted) && <Field label="Peso" value={left ? (set.leftWeight ?? set.weight) : (set.rightWeight ?? set.weight)} onChangeText={(value) => changeSet(index, left ? "leftWeight" : "rightWeight", value)} numeric suffix={messages.Workout.kg} disabled={readOnly} />}
                <Field label="Repeticiones" value={left ? (set.leftReps ?? set.reps) : (set.rightReps ?? set.reps)} onChangeText={(value) => changeSet(index, left ? "leftReps" : "rightReps", value)} numeric suffix={messages.Workout.rep} disabled={readOnly} />
              </Row>;
            })}
          </View> : <Row>
            {(!isBodyweight || weighted) && <Field
              label={t("{value1} serie {value2}", { value1: t(isBodyweight ? "Lastre añadido" : isAssistedPullup(entry.exerciseId) ? "Kilos de ayuda" : loadMode === "total-with-bar" ? "Peso total levantado" : hasApparatusWeight ? "Carga añadida" : "Peso total"), value2: index + 1 })}
              value={set.weight}
              onChangeText={(value) => changeSet(index, "weight", value)}
              numeric
              suffix={messages.Workout.kg}
              disabled={readOnly}
            />}
            <Field
              label={t("Repeticiones serie {value1}", { value1: index + 1 })}
              value={set.reps}
              onChangeText={(value) => changeSet(index, "reps", value)}
              numeric
              suffix={messages.Workout.rep}
              disabled={readOnly}
            />
          </Row>}
        </Card>
      ))}
      {!!error && <Notice error>{error}</Notice>}
      {readOnly ? <Button label="Volver al calendario" onPress={closeHistorical} icon="arrow-left" /> : <Button
        label={historical && savedNotice ? "Guardado" : messages.Workout.guardar}
        onPress={saveExercise}
        icon="check"
      />}
      {!historical && <Button
        label="Hoy no he podido hacer este ejercicio"
        variant="ghost"
        icon="slash"
        onPress={skipExercise}
      />}
      <Txt size={12} muted>
        Las flechas conservan lo escrito en cada ejercicio. Omitir uno solo afecta a la sesión de hoy y no lo elimina de tu rutina.
      </Txt>
    </Page>
  );
}
