import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { useEffect, useRef, useState } from "react";
import { Redirect, router } from "expo-router";
import { AppState as NativeAppState, Pressable, Switch, View } from "react-native";
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
  Icon,
} from "../components/ui";
import { useStore } from "../state/Store";
import { useAccount } from "../state/Account";
import { allExercises, displayName, getExercise, restSeconds } from "../logic/routine";
import { applyExerciseRecommendation, draftFor, finishWorkout } from "../logic/workout";
import { number, validWeight } from "../logic/validation";
import { ActiveWorkout, AppState, ExerciseRecord, SetDraft, SetRecord, PlannedWorkout } from "../types";
import { WeightSuggestion } from "../components/WeightSuggestion";
import { useTheme } from "../theme";
import { Calories } from "../components/Calories";
import { EquipmentPhoto } from "../components/EquipmentPhoto";
import { ExerciseEditor } from "../components/ExerciseEditor";
import { MachineBrandSelect } from "../components/MachineBrandSelect";
import { defaultBarWeight, defaultLoadInputMode, formatLoad, fromStoredLoad, isAssistedPullup, loadHint, LoadInputMode, supportsApparatusWeight, supportsBarWeight, supportsPerSideInput, toStoredLoad, validBarWeight } from "../logic/load";

const draftFromRecord = (sets: SetRecord[], mode: LoadInputMode = "total", exerciseId?: string) =>
  sets.map((set) => ({
    weight: formatLoad(fromStoredLoad(set.weight, mode, exerciseId)),
    reps: String(set.reps),
    ...(mode === "per-side" ? {
      leftWeight: formatLoad(set.leftWeight ?? fromStoredLoad(set.weight, mode, exerciseId)),
      rightWeight: formatLoad(set.rightWeight ?? fromStoredLoad(set.weight, mode, exerciseId)),
      ...(set.leftReps !== undefined ? { leftReps: String(set.leftReps), rightReps: String(set.rightReps ?? set.reps) } : {}),
    } : {}),
  }));

type LiveExerciseInput = {
  key: string;
  draft: SetDraft[];
  barWeight: string;
  apparatusWeight: string;
  note: string;
  revision: number;
};

const liveInputFor = (state: AppState, active?: ActiveWorkout): LiveExerciseInput => {
  if (!active) return { key: "", draft: [], barWeight: "0", apparatusWeight: "0", note: "", revision: 0 };
  const entry = active.day.exercises[active.index];
  return {
    key: `${active.startedAt}:${active.historical?.workoutId ?? "active"}:${entry.id}`,
    draft: active.draft.map(set => ({ ...set })),
    barWeight: active.barWeights?.[entry.exerciseId] ?? String(defaultBarWeight(entry.exerciseId)),
    apparatusWeight: active.apparatusWeights?.[entry.exerciseId] ?? String(state.preferences.apparatusWeights?.[entry.exerciseId] ?? 0),
    note: state.preferences.notes?.[entry.exerciseId] ?? "",
    revision: 0,
  };
};

export default function Workout() {
  const { t } = useLanguage();
  const { state, update } = useStore();
  const account = useAccount();
  const { colors } = useTheme();
  const skippedName = (name: string) => {
    const exercise = allExercises(state.preferences).find(item => (state.preferences.names[item.id] ?? item.name) === name);
    return exercise ? displayName(exercise.id, state.preferences) : name;
  };
  const [error, setError] = useState("");
  const [savedNotice, setSavedNotice] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  const [exerciseMenuOpen, setExerciseMenuOpen] = useState(false);
  const active = state.active;
  const activeKey = active ? `${active.startedAt}:${active.historical?.workoutId ?? "active"}:${active.day.exercises[active.index].id}` : "";
  const [liveInput, setLiveInput] = useState<LiveExerciseInput>(() => liveInputFor(state, active));
  const liveInputRef = useRef(liveInput);
  const dirtyInput = useRef(false);
  const flushInputRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    const next = liveInputFor(state, active);
    liveInputRef.current = next;
    dirtyInput.current = false;
    setLiveInput(next);
  }, [activeKey]);

  useEffect(() => {
    if (!dirtyInput.current) return;
    const timer = setTimeout(() => flushInputRef.current(), 350);
    return () => clearTimeout(timer);
  }, [liveInput.revision]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener("change", nextState => {
      if (nextState !== "active") flushInputRef.current();
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => () => flushInputRef.current(), []);

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
  const exercise = getExercise(entry.exerciseId, state.preferences);
  const hasApparatusWeight = (exercise.variant === "machine" || exercise.variant === "smith") && supportsApparatusWeight(entry.exerciseId);
  const hasAddedBaseWeight = supportsBarWeight(entry.exerciseId) || hasApparatusWeight;
  const changeLiveInput = (change: (current: LiveExerciseInput) => LiveExerciseInput) => {
    const next = { ...change(liveInputRef.current), revision: liveInputRef.current.revision + 1 };
    dirtyInput.current = true;
    liveInputRef.current = next;
    setLiveInput(next);
  };
  const flushLiveInput = () => {
    if (!dirtyInput.current) return;
    const input = liveInputRef.current;
    if (input.key !== activeKey) return;
    dirtyInput.current = false;
    update(current => {
      if (!current.active || current.active.day.exercises[current.active.index]?.id !== entry.id) return current;
      const nextActive = {
        ...current.active,
        draft: input.draft,
        drafts: { ...(current.active.drafts ?? {}), [entry.id]: input.draft },
        ...(supportsBarWeight(entry.exerciseId) ? { barWeights: { ...current.active.barWeights, [entry.exerciseId]: input.barWeight } } : {}),
        ...(hasApparatusWeight ? { apparatusWeights: { ...current.active.apparatusWeights, [entry.exerciseId]: input.apparatusWeight } } : {}),
      };
      return historical ? { ...current, active: nextActive } : {
        ...current,
        active: nextActive,
        preferences: {
          ...current.preferences,
          ...(supportsBarWeight(entry.exerciseId) && input.barWeight.trim() && validBarWeight(number(input.barWeight)) ? { barWeights: { ...current.preferences.barWeights, [entry.exerciseId]: number(input.barWeight) } } : {}),
          ...(hasApparatusWeight && input.apparatusWeight.trim() && validBarWeight(number(input.apparatusWeight)) ? { apparatusWeights: { ...current.preferences.apparatusWeights, [entry.exerciseId]: number(input.apparatusWeight) } } : {}),
          notes: { ...(current.preferences.notes ?? {}), [entry.exerciseId]: input.note.slice(0, 300) },
        },
      };
    });
  };
  flushInputRef.current = flushLiveInput;
  const closeHistorical = () => {
    flushLiveInput();
    update(s => ({ ...s, active: undefined }));
    router.replace("/routine");
  };
  const skipped = active.skipped ?? [];
  const drafts = active.drafts ?? { [entry.id]: active.draft };
  const completed = new Set(active.records.map((record) => record.prescription.id));
  const isSkipped = skipped.includes(entry.id);
  const loadMode = active.loadModes?.[entry.id] ?? state.preferences.loadModes?.[entry.exerciseId] ?? defaultLoadInputMode(entry.exerciseId);
  const barWeightText = liveInput.barWeight;
  const apparatusWeightText = liveInput.apparatusWeight;
  const machineBrand = active.machineBrands?.[entry.id] ?? entry.machineBrand ?? state.preferences.machineBrands?.[entry.exerciseId];
  const isBodyweight = exercise.variant === "bodyweight";
  const canIdentifyMachine = !["free", "bodyweight"].includes(exercise.variant);
  const baseWeightText = supportsBarWeight(entry.exerciseId) ? barWeightText : apparatusWeightText;
  const baseWeightLabel = supportsBarWeight(entry.exerciseId) ? "Peso de la barra" : "Peso del aparato";
  const weighted = active.weighted?.[entry.id] ?? false;
  const asymmetricEnabled = (active.asymmetricSets?.[entry.id] ?? []).some(Boolean);
  // Keep the first set anchored to the previous performance without mixing it
  // into the editable draft. The draft can be a new recommendation; this is
  // only a compact reference for the athlete.
  const previousWorkout = [...state.history]
    .filter(workout => workout.id !== historical?.workoutId)
    .sort((a, b) => (b.startedAt ?? b.date).localeCompare(a.startedAt ?? a.date))
    .find(workout => workout.records.some(record => record.prescription.exerciseId === entry.exerciseId));
  const previousRecord = previousWorkout?.records
    .slice()
    .reverse()
    .find(record => record.prescription.exerciseId === entry.exerciseId);
  const previousSet = previousRecord?.sets[0];
  const previousWeight = previousSet
    ? formatLoad(fromStoredLoad(previousSet.weight, loadMode, entry.exerciseId))
    : undefined;
  const previousSideWeight = previousSet && loadMode === "per-side" && previousSet.leftWeight !== undefined && previousSet.rightWeight !== undefined
    ? previousSet.leftWeight === previousSet.rightWeight
      ? formatLoad(previousSet.leftWeight)
      : `${formatLoad(previousSet.leftWeight)} / ${formatLoad(previousSet.rightWeight)}`
    : previousWeight;
  const previousReps = previousSet
    ? previousSet.leftReps !== undefined && previousSet.rightReps !== undefined && loadMode === "per-side"
      ? previousSet.leftReps === previousSet.rightReps
        ? String(previousSet.leftReps)
        : `${previousSet.leftReps} / ${previousSet.rightReps}`
      : String(previousSet.reps)
    : undefined;
  const changeBarWeight = (value: string) => {
    setError("");
    setSavedNotice(false);
    changeLiveInput(current => ({ ...current, barWeight: value }));
  };
  const changeApparatusWeight = (value: string) => {
    setError("");
    setSavedNotice(false);
    changeLiveInput(current => ({ ...current, apparatusWeight: value }));
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
    changeLiveInput(current => {
      const original = current.draft[index];
      const replace = (set: SetDraft) => field === "weight" && loadMode === "per-side" && !asymmetricEnabled
        ? { ...set, weight: value, leftWeight: value, rightWeight: value }
        : field === "reps" && loadMode === "per-side" && !asymmetricEnabled
          ? { ...set, reps: value, leftReps: value, rightReps: value }
          : { ...set, [field]: value };
      // The first entered set is a useful default for the rest. A later set
      // still follows the default when it is blank or still equal to the
      // original first-set suggestion; a distinct edit is always preserved.
      const draft = current.draft.map((set, i) => {
        if (i === index) return replace(set);
        if (index !== 0 || i < 1 || !value.trim()) return set;
        if (field === "weight" && (!set.weight.trim() || set.weight === original.weight)) return replace(set);
        if (field === "reps" && (!set.reps.trim() || set.reps === original.reps)) return replace(set);
        if (field === "leftWeight" && (!(set.leftWeight ?? "").trim() || set.leftWeight === original.leftWeight)) return replace(set);
        if (field === "rightWeight" && (!(set.rightWeight ?? "").trim() || set.rightWeight === original.rightWeight)) return replace(set);
        if (field === "leftReps" && (!(set.leftReps ?? "").trim() || set.leftReps === original.leftReps)) return replace(set);
        if (field === "rightReps" && (!(set.rightReps ?? "").trim() || set.rightReps === original.rightReps)) return replace(set);
        return set;
      });
      return { ...current, draft };
    });
  };
  const changeAsymmetric = (value: boolean) => update(s => {
    if (!s.active) return s;
    const values = Array.from({ length: liveInputRef.current.draft.length }, () => value);
    return { ...s, active: { ...s.active, asymmetricSets: { ...(s.active.asymmetricSets ?? {}), [entry.id]: values } } };
  });

  const changeLoadMode = (nextMode: LoadInputMode) => {
    if (nextMode === loadMode) return;
    setSavedNotice(false);
    const input = liveInputRef.current;
    const bar = number(input.barWeight) || 0;
    const toPlates = (value: number, mode: LoadInputMode) => mode === "total-with-bar" ? Math.max(0, value - bar) : toStoredLoad(value, mode, entry.exerciseId);
    const fromPlates = (value: number, mode: LoadInputMode) => mode === "total-with-bar" ? value + bar : fromStoredLoad(value, mode, entry.exerciseId);
    const draft = input.draft.map(set => {
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
    const nextInput = { ...input, draft, revision: input.revision + 1 };
    dirtyInput.current = false;
    liveInputRef.current = nextInput;
    setLiveInput(nextInput);
    update(s => {
      if (!s.active) return s;
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
    changeLiveInput(current => ({ ...current, note }));
  };

  const goTo = (
    target: number,
    records = active.records,
    nextSkipped = skipped,
    nextDrafts = drafts,
  ) => {
    flushLiveInput();
    const targetEntry = active.day.exercises[target];
    setSavedNotice(false);
    const saved = records.find((record) => record.prescription.id === targetEntry.id);
    const savedDraft =
      nextDrafts[targetEntry.id] ??
      (saved ? draftFromRecord(saved.sets, active.loadModes?.[targetEntry.id] ?? state.preferences.loadModes?.[targetEntry.exerciseId] ?? defaultLoadInputMode(targetEntry.exerciseId), targetEntry.exerciseId) : draftFor(targetEntry, active.loadModes?.[targetEntry.id] ?? state.preferences.loadModes?.[targetEntry.exerciseId] ?? defaultLoadInputMode(targetEntry.exerciseId)));
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
                [entry.id]: liveInputRef.current.draft,
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
        return { ...recommended, active: { ...recommended.active, records: ordered, skipped: nextSkipped, drafts: { ...(recommended.active.drafts ?? {}), [entry.id]: liveInputRef.current.draft }, draft: liveInputRef.current.draft } };
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
    // A finished workout is important enough to push immediately. If another
    // sync is already running, AccountProvider queues this request and retries
    // with the freshly completed session instead of dropping it.
    void account.sync();
    setError("");
    router.replace("/today");
  };

  const saveExercise = () => {
    dirtyInput.current = false;
    const preparing = !!active.preparing;
    if (!isBodyweight && hasAddedBaseWeight && loadMode !== "total-with-bar" && (!baseWeightText.trim() || !validBarWeight(number(baseWeightText)))) {
      setError("Introduce un peso base entre 0 y 100 kg. Puedes poner 0."); return;
    }
    const sets = liveInputRef.current.draft.map((set, index) => {
      const sideSpecific = loadMode === "per-side";
      const leftWeight = sideSpecific ? number(set.leftWeight ?? set.weight) : undefined;
      const rightWeight = sideSpecific ? number(set.rightWeight ?? set.weight) : undefined;
      const enteredWeight = sideSpecific ? Math.min(leftWeight!, rightWeight!) : number(set.weight);
      const sideReps = loadMode === "per-side";
      const uneven = sideSpecific && asymmetricEnabled;
      const leftReps = sideReps ? number(set.leftReps ?? set.reps) : undefined;
      const rightReps = sideReps ? number(set.rightReps ?? set.reps) : undefined;
      return {
        weight: isBodyweight && !weighted ? 0 : loadMode === "total-with-bar" ? Math.max(0, enteredWeight - (number(barWeightText) || 0)) : toStoredLoad(enteredWeight, loadMode, entry.exerciseId),
        // A future session only needs its loads. ExerciseRecord still requires
        // a numeric placeholder because these temporary records are discarded
        // when the planned workout is saved; completed/history sessions keep
        // the normal requirement for real repetitions.
        reps: preparing
          ? (Number.isInteger(set.reps ? number(set.reps) : NaN) ? number(set.reps) : 1)
          : sideReps ? (uneven ? Math.min(leftReps!, rightReps!) : number(set.reps)) : number(set.reps),
        ...(sideSpecific ? { leftWeight, rightWeight } : {}),
        ...(sideReps ? { leftReps: preparing && !Number.isInteger(leftReps) ? undefined : leftReps, rightReps: preparing && !Number.isInteger(rightReps) ? undefined : rightReps } : {}),
      };
    });
    if (
      sets.some(
        (set) =>
          !validWeight(set.weight) ||
          (set.leftWeight !== undefined && (!validWeight(set.leftWeight) || !validWeight(set.rightWeight ?? NaN))) ||
          (!preparing && ((set.leftReps !== undefined && (!Number.isInteger(set.leftReps) || set.leftReps < 1 || set.leftReps > 100)) ||
            (set.rightReps !== undefined && (!Number.isInteger(set.rightReps) || set.rightReps < 1 || set.rightReps > 100)) ||
            !Number.isInteger(set.reps) || set.reps < 1 || set.reps > 100)),
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
    else goTo(target, records, nextSkipped, { ...drafts, [entry.id]: liveInputRef.current.draft });
  };

  const skipExercise = () => {
    dirtyInput.current = false;
    const records = active.records.filter(
      (record) => record.prescription.id !== entry.id,
    );
    const nextSkipped = [...new Set([...skipped, entry.id])];
    const target = nextPending(records, nextSkipped);
    if (target < 0) complete(records, nextSkipped);
    else goTo(target, records, nextSkipped, {
      ...drafts,
      [entry.id]: liveInputRef.current.draft,
    });
  };
  const unresolvedElsewhere = active.day.exercises.some(item => item.id !== entry.id && !completed.has(item.id) && !skipped.includes(item.id));

  return (
    <Page>
      <Row style={{ justifyContent: "space-between" }}>
        <Button
          label={historical ? "Volver al calendario" : messages.Workout.guardarYSalir}
          compact
          variant="ghost"
          icon="arrow-left"
          onPress={() => {
            if (historical) closeHistorical();
            else {
              flushLiveInput();
              router.replace("/today");
            }
          }}
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
            backgroundColor: colors.selectionHighlight,
          }}
        />
      </View>
      <Row style={{ gap: 8 }}>
        <Button
          label="Ejercicio anterior"
          compact
          tight
          hideLabel
          variant="secondary"
          icon="arrow-left"
          disabled={active.index === 0}
          onPress={() => goTo(active.index - 1)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Seleccionar ejercicio"
          accessibilityState={{ expanded: exerciseMenuOpen }}
          onPress={() => setExerciseMenuOpen(value => !value)}
          style={{ flex: 1, minWidth: 0, minHeight: 42, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, overflow: "hidden", position: "relative", backgroundColor: colors.selection, borderWidth: 1, borderColor: colors.selectionHighlight, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Txt size={12} weight="600" numberOfLines={1} translate={false} style={{ color: colors.text, flexShrink: 1, textAlign: "center" }}>
            {active.index + 1}. {displayName(entry.exerciseId, state.preferences)}
          </Txt>
          <Icon name={exerciseMenuOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.text} />
        </Pressable>
        <Button
          label="Ejercicio siguiente"
          compact
          tight
          hideLabel
          variant="secondary"
          icon="arrow-right"
          disabled={active.index === active.day.exercises.length - 1}
          onPress={() => goTo(active.index + 1)}
        />
      </Row>
      {exerciseMenuOpen && <Card style={{ padding: 8, gap: 4 }}>
        {active.day.exercises.map((item, index) => {
          const done = completed.has(item.id);
          const skippedItem = skipped.includes(item.id);
          const current = index === active.index;
          return <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Ir a ${displayName(item.exerciseId, state.preferences)}`}
            onPress={() => { setExerciseMenuOpen(false); goTo(index); }}
            style={{ minHeight: 42, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, overflow: "hidden", position: "relative", backgroundColor: current ? colors.selection : done ? colors.done : skippedItem ? colors.soft : colors.accentSoft, borderWidth: current ? 1 : 0, borderColor: colors.selectionHighlight, opacity: skippedItem ? 0.55 : 1, justifyContent: "center" }}
          >
            <Txt size={13} weight="600" numberOfLines={1} translate={false} style={{ color: current || done ? colors.text : colors.selectionHighlight }}>
              {index + 1}. {displayName(item.exerciseId, state.preferences)}
            </Txt>
          </Pressable>;
        })}
      </Card>}
      <View style={{ gap: 12 }}>
        <Txt size={11} weight="600" muted style={{ letterSpacing: 2 }}>{t(active.day.name).toUpperCase()}</Txt>
        <View testID="workout-exercise-heading" style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt translate={false} accessibilityRole="header" size={26} weight="600" style={{ letterSpacing: -0.8, color: colors.selectionHighlight }}>
              {displayName(entry.exerciseId, state.preferences)}
            </Txt>
          </View>
          <EquipmentPhoto key={entry.exerciseId} exerciseId={entry.exerciseId} exerciseName={displayName(entry.exerciseId, state.preferences)} />
        </View>
        <Row style={{ alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Txt muted style={{ flex: 1 }}>{t(entry.sets === 1 ? "{value1} serie efectiva · {value2}–{value3} repeticiones" : "{value1} series efectivas · {value2}–{value3} repeticiones", { value1: entry.sets, value2: entry.range[0], value3: entry.range[1] })}</Txt>
          {loadMode === "per-side" && (!isBodyweight || weighted) && <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Txt size={11} weight="600" muted>Pesos distintos por lado</Txt>
            <Switch
              accessibilityLabel="Pesos distintos por lado"
              value={asymmetricEnabled}
              onValueChange={changeAsymmetric}
              disabled={readOnly}
              trackColor={{ false: colors.border, true: colors.accentSoft }}
              thumbColor={asymmetricEnabled ? colors.accent : colors.muted}
              ios_backgroundColor={colors.border}
            />
          </View>}
        </Row>
        {active.preparing && <Notice>En un entrenamiento futuro puedes guardar solo los pesos. Las repeticiones se indicarán al realizar la sesión.</Notice>}
      </View>
      {!isBodyweight && <Card>
        <Txt weight="600">Cómo introduces la carga</Txt>
        <Txt muted size={12}>{loadHint(entry.exerciseId)}</Txt>
        {!readOnly && <Row>
          <Button label="Total" compact tone="green" variant={loadMode === "total" ? "primary" : "secondary"} onPress={() => changeLoadMode("total")} />
          {supportsPerSideInput(entry.exerciseId) && <Button label="Por lado" compact tone="green" variant={loadMode === "per-side" ? "primary" : "secondary"} onPress={() => changeLoadMode("per-side")} />}
          {supportsBarWeight(entry.exerciseId) && <Button label="Total levantado" compact tone="green" variant={loadMode === "total-with-bar" ? "primary" : "secondary"} onPress={() => changeLoadMode("total-with-bar")} />}
        </Row>}
        {hasAddedBaseWeight && loadMode !== "total-with-bar" && <Field label={baseWeightLabel} value={baseWeightText} onChangeText={supportsBarWeight(entry.exerciseId) ? changeBarWeight : changeApparatusWeight} onBlur={flushLiveInput} numeric suffix="kg" disabled={readOnly} />}
        {hasAddedBaseWeight && <Txt muted size={12}>{loadMode === "total-with-bar" ? "El total ya incluye la barra; no se añadirá nada más." : supportsBarWeight(entry.exerciseId) ? t("Barra añadida: {value1} kg. Se suma una sola vez a la carga externa. Si no hay barra, usa 0.", { value1: barWeightText || "0" }) : `Peso del aparato: ${apparatusWeightText || "0"} kg. Se suma a la carga indicada y la gráfica muestra el total, también para sesiones anteriores.`}</Txt>}
        {canIdentifyMachine && !readOnly && <MachineBrandSelect exerciseId={entry.exerciseId} value={machineBrand} onChange={changeMachineBrand} />}
      </Card>}
      {isBodyweight && <Card>
        <Txt weight="600">Peso corporal</Txt>
        <Txt muted size={12}>{loadHint(entry.exerciseId)}</Txt>
        {!readOnly && <Row><Button label="Sin lastre" compact tone="green" variant={!weighted ? "primary" : "secondary"} onPress={() => changeWeighted(false)} /><Button label="Con lastre" compact tone="green" variant={weighted ? "primary" : "secondary"} onPress={() => changeWeighted(true)} /></Row>}
        {!readOnly && weighted && <Row><Button label="Total" compact tone="green" variant={loadMode === "total" ? "primary" : "secondary"} onPress={() => changeLoadMode("total")} /><Button label="Por lado" compact tone="green" variant={loadMode === "per-side" ? "primary" : "secondary"} onPress={() => changeLoadMode("per-side")} /></Row>}
      </Card>}
      <Card style={{ padding: 0, gap: 0, overflow: "hidden" }}>
      {liveInput.draft.map((set, index) => (
        <View key={`${entry.id}-${index}`} style={{ padding: 16, gap: 12, borderBottomWidth: index < liveInput.draft.length - 1 ? 1 : 0, borderBottomColor: colors.border }}>
          <Txt weight="600">
            {t("Serie {count}", { count: index + 1 })}
          </Txt>
          {loadMode === "per-side" ? <View style={{ gap: 10 }}>
            {!asymmetricEnabled ? <Row style={{ alignItems: "flex-end", gap: 8 }}>
              {(!isBodyweight || weighted) && <Field label="Peso por lado" value={set.leftWeight ?? set.weight} onChangeText={(value) => changeSet(index, "weight", value)} onBlur={flushLiveInput} numeric suffix={messages.Workout.kg} disabled={readOnly} />}
              <Field label="Repeticiones" value={set.leftReps ?? set.reps} onChangeText={(value) => changeSet(index, "reps", value)} onBlur={flushLiveInput} numeric suffix={messages.Workout.rep} disabled={readOnly} />
            </Row> : ( ["left", "right"] as const).map(side => {
              const left = side === "left";
              return <Row key={side} style={{ alignItems: "flex-end", gap: 8 }}>
                <Txt weight="600" size={12} style={{ width: 66 }}>{left ? "Izquierdo" : "Derecho"}</Txt>
                {(!isBodyweight || weighted) && <Field label="Peso" value={left ? (set.leftWeight ?? set.weight) : (set.rightWeight ?? set.weight)} onChangeText={(value) => changeSet(index, left ? "leftWeight" : "rightWeight", value)} onBlur={flushLiveInput} numeric suffix={messages.Workout.kg} disabled={readOnly} />}
                <Field label="Repeticiones" value={left ? (set.leftReps ?? set.reps) : (set.rightReps ?? set.reps)} onChangeText={(value) => changeSet(index, left ? "leftReps" : "rightReps", value)} onBlur={flushLiveInput} numeric suffix={messages.Workout.rep} disabled={readOnly} />
              </Row>;
            })}
          </View> : <Row>
            {(!isBodyweight || weighted) && <Field
              label={t("{value1} serie {value2}", { value1: t(isBodyweight ? "Lastre añadido" : isAssistedPullup(entry.exerciseId) ? "Kilos de ayuda" : loadMode === "total-with-bar" ? "Peso total levantado" : hasApparatusWeight ? "Carga añadida" : "Peso total"), value2: index + 1 })}
              value={set.weight}
              onChangeText={(value) => changeSet(index, "weight", value)}
              onBlur={flushLiveInput}
              numeric
              suffix={messages.Workout.kg}
              disabled={readOnly}
            />}
            <Field
              label={t("Repeticiones serie {value1}", { value1: index + 1 })}
              value={set.reps}
              onChangeText={(value) => changeSet(index, "reps", value)}
              onBlur={flushLiveInput}
              numeric
              suffix={messages.Workout.rep}
              disabled={readOnly}
            />
          </Row>}
          {index === 0 && previousSet && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, paddingTop: 1 }}>
              {(!isBodyweight || Number(previousSet.weight) > 0) && previousSideWeight !== undefined && (
                <Txt size={11} weight="600" muted>
                  {`Anterior sesi\u00f3n: ${previousSideWeight} kg${loadMode === "per-side" ? " por lado" : ""}`}
                </Txt>
              )}
              {previousReps !== undefined && (
                <Txt size={11} weight="600" muted>{`Anterior sesi\u00f3n: ${previousReps} rep.`}</Txt>
              )}
            </View>
          )}
        </View>
      ))}
      </Card>
      <View style={{ width: "100%", gap: 10 }}>
        {!historical && <Field
          label="Notas para este ejercicio"
          value={liveInput.note}
          onChangeText={changeExerciseNote}
          onBlur={flushLiveInput}
          placeholder="Pon lo que quieras aquí, se guardará para la próxima vez que hagas este ejercicio"
          multiline
          maxLength={300}
          disabled={readOnly}
        />}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", width: "100%" }}>
          <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 140, minWidth: 0 }}>
            <Pill>{t("Descanso recomendado: {value1} min", { value1: restSeconds(exercise) / 60 })}</Pill>
          </View>
          {!historical && <Button
            label="Cambiar ejercicio para hoy"
            compact
            tight
            variant="secondary"
            icon="repeat"
            style={{ flexGrow: 0, flexShrink: 1, minWidth: 0, paddingHorizontal: 10 }}
            onPress={() => setEditingExercise(value => !value)}
          />}
        </View>
      </View>
      {editingExercise && (
        <ExerciseEditor
          dayId={active.day.id}
          prescription={entry}
          close={() => setEditingExercise(false)}
          report={setError}
          sessionOnly
        />
      )}
      {exercise.note && <Notice>{exercise.note}</Notice>}
      {completed.has(entry.id) && <Pill>Ejercicio registrado · puedes corregirlo</Pill>}
      {isSkipped && <Pill>Omitido por hoy · puedes volver y registrarlo</Pill>}
      {!!error && <Notice error>{error}</Notice>}
      {readOnly ? <Button label="Volver al calendario" tone="green" onPress={closeHistorical} icon="arrow-left" /> : <Button
        label={historical && savedNotice ? "Guardado" : !historical && !active.preparing && !unresolvedElsewhere ? "Guardar y finalizar" : "Guardar y continuar"}
        onPress={saveExercise}
        icon="check"
      />}
      {!historical && <Button
        label="Hoy no he podido hacer este ejercicio"
        tone="danger"
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
