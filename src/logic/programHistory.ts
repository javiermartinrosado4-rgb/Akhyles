import { AppState, RoutineVersion } from "../types";
import { localDateKey } from "./schedule";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const dayKey = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : localDateKey(value);

/** Legacy data has no evidence of an earlier recurring plan. Never invent one. */
export function ensureProgramHistory(state: AppState, now = new Date()): AppState {
  if (!state.routine.length) return state;
  const versions = (state.routineVersions ?? [])
    .filter(version => version.effectiveFrom !== "1970-01-01")
    .map(version => ({ ...version, effectiveFrom: dayKey(version.effectiveFrom) }))
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  if (!versions.length) versions.push(clone({ effectiveFrom: localDateKey(now), profile: state.profile, routine: state.routine }));
  return JSON.stringify(versions) === JSON.stringify(state.routineVersions) ? state : { ...state, routineVersions: versions };
}

/** One write boundary covers regeneration, imports, editing and automatic loads. */
export function preserveProgramHistory(previous: AppState, changed: AppState, now = new Date()): AppState {
  // Explicit restore/account switch/demo import owns its own historical snapshots.
  if (changed.routineVersions !== previous.routineVersions || changed.cloud?.owner !== previous.cloud?.owner)
    return ensureProgramHistory(changed, now);
  if (!changed.routine.length) return changed;
  const before = ensureProgramHistory(previous, now);
  const today = localDateKey(now);
  const plan = (s: AppState) => JSON.stringify([s.profile.days, s.profile.trainingDays, s.routine]);
  if (plan(previous) === plan(changed)) return { ...changed, routineVersions: before.routineVersions };
  const version: RoutineVersion = clone({ effectiveFrom: today, profile: changed.profile, routine: changed.routine });
  return {
    ...changed,
    routineVersions: [...(before.routineVersions ?? []).filter(item => item.effectiveFrom < today), version],
  };
}
