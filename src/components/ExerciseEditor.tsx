import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { useState } from "react";
import { View } from "react-native";
import { Button, Card, Choice, Field, Notice, Row, Txt } from "./ui";
import { EquipmentPhoto } from "./EquipmentPhoto";
import { useStore } from "../state/Store";
import {
  candidates,
  displayName,
  getExercise,
  prescribe,
  replacementCandidates,
} from "../logic/routine";
import { number, validRange, validWeight } from "../logic/validation";
import { copy } from "../config";
import {
  Exercise,
  ExerciseType,
  Muscle,
  Prescription,
  Range,
  Variant,
} from "../types";
import { muscles, variants } from "../data/options";
import { useTheme } from "../theme";
import { localDateKey } from "../logic/schedule";
import { useCommunity } from "../state/Community";

const freshId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/** Keep date-specific plans and an unfinished session aligned with the weekly routine. */
function syncRoutineReferences(state: ReturnType<typeof useStore>["state"], routine: typeof state.routine) {
  const plannedWorkouts = state.plannedWorkouts?.map(item => {
    if (localDateKey(item.date) < localDateKey(new Date())) return item;
    const source = routine.find(day => day.id === item.dayId || day.id === item.day.id);
    if (!source) return item;
    const exercises = source.exercises.map(entry => {
      const saved = item.day.exercises.find(previous => previous.id === entry.id);
      return saved ? { ...entry, weight: saved.weight } : entry;
    });
    return { ...item, dayId: source.id, day: { ...source, exercises } };
  });
  let active = state.active;
  if (active) {
    const source = routine.find(day => day.id === active!.day.id || day.name === active!.day.name);
    if (source) {
      const recorded = new Map(active.records.map(record => [record.prescription.id, record.prescription]));
      // A record is immutable evidence of what was actually performed. A later
      // routine edit only changes future/pending work; reusing its prescription
      // ID here would otherwise make the replacement look falsely completed.
      const exercises: Prescription[] = active.day.exercises.flatMap(current => {
        const completed = recorded.get(current.id);
        if (completed) return [{ ...completed, range: [...completed.range] as Range }];
        const planned = source.exercises.find(entry => entry.id === current.id);
        return planned ? [{ ...planned, weight: current.weight, range: [...planned.range] as Range }] : [];
      });
      for (const entry of source.exercises) {
        if (!active.day.exercises.some(current => current.id === entry.id))
          exercises.push({ ...entry, range: [...entry.range] as Range });
      }
      const previous = active.day.exercises[active.index];
      const found = exercises.findIndex(entry => entry.id === previous?.id);
      const index = found >= 0 ? found : Math.min(active.index, exercises.length - 1);
      const selected = exercises[index];
      const unchanged = selected?.id === previous?.id && selected?.exerciseId === previous?.exerciseId;
      active = selected ? { ...active, index, day: { ...source, exercises },
        draft: unchanged ? active.draft : active.drafts?.[selected.id] ?? Array.from({length:selected.sets}, () => ({weight:String(selected.weight),reps:""})) } : active;
    }
  }
  return { plannedWorkouts, active };
}

function TierBadge({ tier }: { tier: Exercise["tier"] }) {
  const { dark } = useTheme();
  if (!tier) return null;
  const color = {
    "S+": dark ? "#9CF0B1" : "#176B3A",
    S: dark ? "#A9D5FF" : "#1E5B9E",
    A: dark ? "#FFD480" : "#855A00",
    B: dark ? "#D5C5FF" : "#67548A",
  }[tier];
  return <View style={{ borderColor: color, borderWidth: 1, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 }}>
    <Txt size={12} weight="600" style={{ color }}>Tier {tier}</Txt>
  </View>;
}

export function ExerciseEditor({
  dayId,
  prescription,
  close,
  report,
}: {
  dayId: string;
  prescription?: Prescription;
  close: () => void;
  report: (text: string) => void;
}) {
  const { t, locale } = useLanguage();
  const { state, update } = useStore();
  const { user, request } = useCommunity();
  const prefs = state.preferences;
  const original = prescription
    ? getExercise(prescription.exerciseId, prefs)
    : undefined;
  const [mode, setMode] = useState<"edit" | "pick" | "custom">(
    original ? "edit" : "pick",
  );
  const [initialName] = useState(
    original ? displayName(original.id, prefs) : "",
  );
  const [name, setName] = useState(initialName);
  const [weight, setWeight] = useState(String(prescription?.weight ?? 0));
  const [sets, setSets] = useState(String(prescription?.sets ?? 2));
  const [min, setMin] = useState(String(prescription?.range[0] ?? 8));
  const [max, setMax] = useState(String(prescription?.range[1] ?? 10));
  const [muscle, setMuscle] = useState<Muscle>(original?.muscle ?? "chest");
  const [type, setType] = useState<ExerciseType>("isolation");
  const [variant, setVariant] = useState<Variant>(
    prefs.equipment.includes("machine")
      ? "machine"
      : (prefs.equipment[0] ?? "machine"),
  );
  const [submitToCommunity, setSubmitToCommunity] = useState(Boolean(user));
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [loadStep, setLoadStep] = useState(String(original ? prefs.loadSteps?.[original.id] ?? original.loadStep ?? 1.25 : 1.25));
  const day = state.routine.find((d) => d.id === dayId)!;
  const options = original && muscle === original.muscle
    ? [...new Map([...replacementCandidates(original, state.profile, prefs), ...candidates(muscle, state.profile, prefs)].map(candidate => [candidate.id, candidate])).values()]
    : candidates(muscle, state.profile, prefs);
  const startCustom = (initialName = "") => {
    setMode("custom");
    setName(initialName);
    setSets(String(prescription?.sets ?? 2));
    if (original) {
      setMuscle(original.muscle);
      setType(original.type);
      setMin(String(original.range[0]));
      setMax(String(original.range[1]));
    }
  };
  const apply = (exercise: Exercise, unavailable = false) => {
    const appliesAfterRecordedWork = !!prescription && state.active?.day.id === dayId &&
      state.active.records.some(record => record.prescription.id === prescription.id);
    update((s) => {
      const preferences = {
        ...s.preferences,
        unavailable:
          unavailable && original
            ? [...new Set([...s.preferences.unavailable, original.id])]
            : s.preferences.unavailable,
      };
      const routine = s.routine.map((d) => {
        let entries = d.exercises;
        if (unavailable && original)
          entries = entries.flatMap((p) => {
            if (p.exerciseId !== original.id) return [p];
            const replacement = candidates(
              original.muscle,
              s.profile,
              preferences,
            ).find(
              (e) =>
                !entries.some(
                  (other) => other.id !== p.id && other.exerciseId === e.id,
                ),
            );
            return replacement
              ? [{ ...prescribe(replacement, preferences, p.id), sets: p.sets, range: p.range, weight: p.weight }]
              : [];
          });
        else if (d.id === dayId)
          entries = prescription
            ? entries.map((p) =>
                p.id === prescription.id
                  ? { ...prescribe(exercise, preferences, p.id), sets: p.sets, range: p.range, weight: p.weight }
                  : p,
              )
            : [
                ...entries,
                prescribe(
                  exercise,
                  preferences,
                  `${Date.now()}-${exercise.id}`,
                ),
              ];
        return { ...d, exercises: entries };
      });
      return { ...s, preferences, routine, ...syncRoutineReferences(s, routine) };
    });
    if (mode === "custom" && submitToCommunity && user) {
      void request("/exercise-proposals", "POST", {
        name: exercise.name,
        muscle: exercise.muscle,
        secondary: exercise.secondary,
        type: exercise.type,
        variant: exercise.variant,
        range: exercise.range,
      }).then(() => report("Ejercicio guardado y enviado a revisión de Akhyles.")).catch(error => {
        report(`Ejercicio guardado localmente. No se pudo enviar la propuesta: ${error.message}`);
      });
    }
    report(
      appliesAfterRecordedWork
        ? "El ejercicio ya registrado se conserva en esta sesión. El cambio se aplicará a las próximas sesiones."
        : unavailable
        ? messages.ExerciseEditor
            .preferenciaGuardadaHemosSustituidoEsteEjercicioEn
        : messages.ExerciseEditor
            .ejercicioGuardadoElPlanSeAjustaAutomaticamente,
    );
    close();
  };
  const unavailable = () => {
    if (!original) return;
    const next = candidates(original.muscle, state.profile, prefs).find(
      (e) => e.id !== original.id,
    );
    if (next) apply(next, true);
    else {
      update((s) => ({
        ...s,
        preferences: {
          ...s.preferences,
          unavailable: [
            ...new Set([...s.preferences.unavailable, original.id]),
          ],
        },
        routine: s.routine.map((d) => ({
          ...d,
          exercises: d.exercises.filter((p) => p.exerciseId !== original.id),
        })),
        ...syncRoutineReferences(s, s.routine.map((d) => ({
          ...d,
          exercises: d.exercises.filter((p) => p.exerciseId !== original.id),
        }))),
      }));
      report(
        messages.ExerciseEditor.noQuedanSustitucionesCompatiblesParaEsteMusculo,
      );
      close();
    }
  };
  const remove = () => {
    if (!prescription) return;
    update((s) => {
      const routine = s.routine.map(day => day.id === dayId
        ? { ...day, exercises: day.exercises.filter(item => item.id !== prescription.id) }
        : day);
      return { ...s, routine, ...syncRoutineReferences(s, routine) };
    });
    report("Ejercicio eliminado de la rutina. Tus registros anteriores se conservan.");
    close();
  };
  const save = () => {
    if (![1.25, 2.5, 5, 10, 20].includes(number(loadStep))) return setError("Selecciona un incremento disponible.");
    const range: Range = [number(min), number(max)];
    const count = number(sets);
    const kg = number(weight);
    if (!name.trim())
      return setError(messages.ExerciseEditor.escribeUnNombreParaElEjercicio);
    if (!validWeight(kg))
      return setError(messages.ExerciseEditor.usaUnPesoEntre0Y1000);
    if (!validRange(range))
      return setError(messages.ExerciseEditor.elRangoDebeIrDeMenorA);
    if (!Number.isInteger(count) || count < 1 || count > 6)
      return setError(messages.ExerciseEditor.puedesProgramarEntre2Y6Series);
    const exercise: Exercise =
      mode === "custom"
        ? {
            id: `custom-${freshId()}`,
            name: name.trim(),
            muscle,
            type,
            variant,
            equipment: variants.find((v) => v.id === variant)!.name,
            minLevel: variant === "free" ? "intermediate" : "beginner",
            priority: 100,
            secondary: [],
            range,
            substitutions: [],
            custom: true,
          }
        : original!;
    if (
      mode === "custom" &&
      variant === "free" &&
      state.profile.level === "beginner"
    )
      return setError(
        messages.ExerciseEditor.losEjerciciosPersonalizadosDePesoLibreRequieren,
      );
    if (mode === "custom" && !prefs.equipment.includes(variant))
      return setError(
        messages.ExerciseEditor.eligeUnEquipamientoDisponibleEnTuGimnasio,
      );
    const preferences = {
      ...prefs,
      loadSteps: { ...prefs.loadSteps, [exercise.id]: number(loadStep) },
      names: mode === "edit" && name.trim() === initialName.trim()
        ? prefs.names
        : { ...prefs.names, [exercise.id]: name.trim() },
      weights: { ...prefs.weights, [exercise.id]: kg },
      ranges: { ...prefs.ranges, [exercise.id]: range },
      custom: mode === "custom" ? [...prefs.custom, exercise] : prefs.custom,
    };
    const entry: Prescription = {
      id: prescription?.id ?? `${freshId()}-${exercise.id}`,
      exerciseId: exercise.id,
      sets: count,
      weight: kg,
      range,
    };
    const edited = {
      ...day,
      exercises: prescription
        ? day.exercises.map((p) => (p.id === prescription.id ? entry : p))
        : [...day.exercises, entry],
    };
    update((s) => {
      const routine = s.routine.map((d) =>
        d.id === dayId
          ? edited
          : {
              ...d,
              exercises: d.exercises.map((p) =>
                p.exerciseId === exercise.id
                  ? { ...p, weight: kg, range }
                  : p,
              ),
            },
      );
      return { ...s, preferences, routine, ...syncRoutineReferences(s, routine) };
    });
    report(
      messages.ExerciseEditor.cambiosYPreferenciasGuardados,
    );
    close();
  };
  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <Txt weight="600">
          {mode === "edit"
            ? messages.ExerciseEditor.ajustarEjercicio
            : mode === "custom"
              ? messages.ExerciseEditor.tuPropioEjercicio
              : messages.ExerciseEditor.elegirEjercicio}
        </Txt>
        <Button
          label={messages.ExerciseEditor.cerrar}
          compact
          variant="ghost"
          onPress={close}
        />
      </Row>
      {mode === "edit" && (
        <>
          {original && <EquipmentPhoto exerciseId={original.id} exerciseName={displayName(original.id, prefs)} />}
          <Field
            label={messages.ExerciseEditor.nombreDelEjercicio}
            value={name}
            onChangeText={setName}
          />
          <Row style={{ alignItems: "flex-start" }}>
            <Field
              label={messages.ExerciseEditor.pesoInicial}
              value={weight}
              onChangeText={setWeight}
              numeric
              suffix={messages.ExerciseEditor.kg}
            />
            <Field
              label={messages.ExerciseEditor.seriesEfectivas}
              value={sets}
              onChangeText={setSets}
              numeric
            />
          </Row>
          {(number(min) < 4 || number(max) > 15) && <Notice>Rango guardable libremente. Para hipertrofia solemos recomendar entre 4 y 15 repeticiones; fuera de ese rango puede tener más sentido priorizar fuerza, técnica o resistencia.</Notice>}
          <Row>
            <Field
              label={messages.ExerciseEditor.repeticionesMinimas}
              value={min}
              onChangeText={setMin}
              numeric
            />
            <Field
              label={messages.ExerciseEditor.repeticionesMaximas}
              value={max}
              onChangeText={setMax}
              numeric
            />
          </Row>
          {(number(min) < 4 || number(max) > 15) && <Notice>El rango es libre. Para hipertrofia, la recomendación habitual es 4–15 repeticiones.</Notice>}
          {number(sets) > 2 && <Notice>{copy.extraSet}</Notice>}
          <Button
            label={messages.ExerciseEditor.guardarCambios}
            onPress={save}
          />
          <Button
            label={messages.ExerciseEditor.sustituirEjercicio}
            variant="secondary"
            icon="repeat"
            onPress={() => setMode("pick")}
          />
          <Button label="Eliminar ejercicio" variant="ghost" icon="trash-2" onPress={remove} />
          <Button
            label={messages.ExerciseEditor.miGimnasioNoLoTiene}
            variant="ghost"
            icon="slash"
            onPress={unavailable}
          />
        </>
      )}
      {mode === "pick" && (
        <>
          <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
            {muscles.filter((m) => m.id !== "balanced").map((m) => <Button key={m.id} compact label={m.name} variant={muscle === m.id ? "primary" : "secondary"} onPress={() => setMuscle(m.id as Muscle)} />)}
          </View>
          {original && <Notice>Elige cualquier grupo muscular. En el grupo original priorizamos el mismo patrón de movimiento.</Notice>}
          <Field
            label="Buscar o escribir otro ejercicio"
            value={query}
            onChangeText={setQuery}
            placeholder="Por ejemplo, jalón, press o tu propio ejercicio"
          />
          <Txt muted size={13}>
            {original ? "Sugerencias compatibles, ordenadas por patrón y tier." : messages.ExerciseEditor.porPrioridadCompatiblesConTuNivelY}
          </Txt>
          {options
            .filter(
              (e) =>
                e.id !== original?.id &&
                !state.routine
                  .find((d) => d.id === dayId)
                  ?.exercises.some(
                    (p) => p.exerciseId === e.id && p.id !== prescription?.id,
                  ),
            )
            .filter(e => !query.trim() || displayName(e.id, prefs).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale)))
            .map((e) => (
              <Choice
                key={e.id}
                title={displayName(e.id, prefs)}
                translateTitle={false}
                description={`${t(e.type === "compound" ? messages.ExerciseEditor.multiarticular : messages.ExerciseEditor.aislamiento)} · ${t(e.equipment)}`}
                trailing={<TierBadge tier={e.tier} />}
                selected={false}
                onPress={() => apply(e)}
              />
            ))}
          {!options.filter(
            (e) => e.id !== original?.id,
          ).length && !query.trim() && (
            <Notice>
              {messages.ExerciseEditor.noHayMasOpcionesCompatiblesCreaUna}
            </Notice>
          )}
          {!!query.trim() && <Button
            label={t("Crear “{name}” como ejercicio personalizado", { name: query.trim() })}
            variant="secondary"
            icon="plus"
            onPress={() => startCustom(query.trim())}
          />}
          <Button
            label={messages.ExerciseEditor.crearEjercicioPersonalizado}
            variant="secondary"
            icon="plus"
            onPress={() => startCustom()}
          />
        </>
      )}
      {mode === "custom" && (
        <>
          <Field
            label={messages.ExerciseEditor.nombreDelEjercicio}
            value={name}
            onChangeText={setName}
          />
          <Txt muted size={13}>
            {messages.ExerciseEditor.grupoMuscular}
          </Txt>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {muscles
              .filter((m) => m.id !== "balanced")
              .map((m) => (
                <Button
                  key={m.id}
                  label={m.name}
                  compact
                  variant={muscle === m.id ? "primary" : "secondary"}
                  onPress={() => setMuscle(m.id as Muscle)}
                />
              ))}
          </View>
          <Choice
            title={messages.ExerciseEditor.multiarticular}
            selected={type === "compound"}
            onPress={() => {
              setType("compound");
              setMin("6");
              setMax("8");
            }}
          />
          <Choice
            title={messages.ExerciseEditor.aislamiento}
            selected={type === "isolation"}
            onPress={() => {
              setType("isolation");
              setMin("8");
              setMax("10");
            }}
          />
          {variants.map((v) => (
            <Choice
              key={v.id}
              title={v.name}
              selected={variant === v.id}
              onPress={() => setVariant(v.id)}
              disabled={!prefs.equipment.includes(v.id)}
            />
          ))}
          {user && <Choice
            title="Proponer a la comunidad de Akhyles"
            description="Seguirá siendo tu ejercicio personalizado hasta que el equipo lo revise y apruebe."
            selected={submitToCommunity}
            multiple
            onPress={() => setSubmitToCommunity(value => !value)}
          />}
          <Row>
            <Field
              label={messages.ExerciseEditor.repeticionesMinimas}
              value={min}
              onChangeText={setMin}
              numeric
            />
            <Field
              label={messages.ExerciseEditor.repeticionesMaximas}
              value={max}
              onChangeText={setMax}
              numeric
            />
          </Row>
          <Field
            label={messages.ExerciseEditor.pesoInicial}
            value={weight}
            onChangeText={setWeight}
            numeric
            suffix={messages.ExerciseEditor.kg}
          />
          <Txt size={13} muted>
            {messages.ExerciseEditor.seGuardaraEnTuCatalogoCon2}
          </Txt>
          <Button
            label={messages.ExerciseEditor.guardarEjercicioPersonalizado}
            onPress={save}
          />
        </>
      )}
      {!!error && <Notice error>{error}</Notice>}
      <Txt weight="600">Incremento disponible de carga</Txt>
      <Txt size={12} muted>Para barras, indica el incremento total de ambos lados (dos discos de 1,25 = 2,5 kg). En mancuernas, registra el peso de una mancuerna. Se guarda con «Guardar cambios».</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {[1.25, 2.5, 5, 10, 20].map(step => <Button key={step} compact label={`${step} kg`} variant={number(loadStep) === step ? "primary" : "secondary"} onPress={() => setLoadStep(String(step))} />)}
      </View>
    </Card>
  );
}
