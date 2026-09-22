import { AppState, Day, ExerciseRecord, SetDraft } from "../types";
import { LoadInputMode, usesSingleStackPerSideLoad } from "./load";

export const LOAD_NORMALIZATION_VERSION = 2 as const;

const modeFor = (state: AppState, exerciseId: string, prescriptionId?: string): LoadInputMode | undefined =>
  (prescriptionId ? state.preferences.loadModes?.[prescriptionId] : undefined)
  ?? state.preferences.loadModes?.[exerciseId];

const repairRecord = (record: ExerciseRecord): ExerciseRecord => {
  const hasSideValues = record.sets.some(set => Number.isFinite(set.leftWeight) || Number.isFinite(set.rightWeight));
  if ((record.loadMode !== "per-side" && !(record.loadMode === undefined && hasSideValues)) || !usesSingleStackPerSideLoad(record.prescription.exerciseId)) return record;
  return {
    ...record,
    sets: record.sets.map(set => {
      const side = Number.isFinite(set.leftWeight) && Number.isFinite(set.rightWeight)
        ? Math.min(set.leftWeight!, set.rightWeight!)
        : set.weight / 2;
      return { ...set, weight: side };
    }),
  };
};

const repairDay = (state: AppState, day: Day): Day => ({
  ...day,
  exercises: day.exercises.map(entry => modeFor(state, entry.exerciseId, entry.id) === "per-side" && usesSingleStackPerSideLoad(entry.exerciseId)
    ? { ...entry, weight: entry.weight / 2 }
    : entry),
});

const repairVisibleDraft = (draft: SetDraft[] | undefined) => draft?.map(set => ({ ...set }));

/** Repairs states produced before single-stack cable loads stopped being
 * doubled. The marker makes this safe across reloads, cloud restores and sync. */
export function repairSingleStackLoads(state: AppState): AppState {
  if ((state.loadNormalizationVersion ?? 0) >= LOAD_NORMALIZATION_VERSION) return state;
  const preferences = {
    ...state.preferences,
    weights: Object.fromEntries(Object.entries(state.preferences.weights).map(([exerciseId, weight]) => [
      exerciseId,
      modeFor(state, exerciseId) === "per-side" && usesSingleStackPerSideLoad(exerciseId) ? weight / 2 : weight,
    ])),
  };
  const base = { ...state, preferences };
  const active = state.active ? {
    ...state.active,
    day: repairDay(state, state.active.day),
    records: state.active.records.map(repairRecord),
    // Drafts already contain the visible per-side value, so they must never be
    // halved during migration.
    draft: repairVisibleDraft(state.active.draft)!,
    drafts: state.active.drafts && Object.fromEntries(Object.entries(state.active.drafts).map(([id, draft]) => [id, repairVisibleDraft(draft)!])),
  } : undefined;
  return {
    ...base,
    loadNormalizationVersion: LOAD_NORMALIZATION_VERSION,
    routine: state.routine.map(day => repairDay(state, day)),
    routineVersions: state.routineVersions?.map(version => ({ ...version, routine: version.routine.map(day => repairDay(state, day)) })),
    plannedWorkouts: state.plannedWorkouts?.map(item => ({ ...item, day: repairDay(state, item.day) })),
    history: state.history.map(workout => ({ ...workout, records: workout.records.map(repairRecord) })),
    active,
  };
}
