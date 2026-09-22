import { AppState, Workout } from "../types";

export interface CloudMetadata {
  owner: string;
  revision: number;
  base: string | null;
  syncedAt?: string;
  /** Incremental Sync V2 cursor and per-entity optimistic revisions. Device-only. */
  v2?: { cursor: number; revisions: Record<string, number>; verified?: boolean };
}
export interface RemoteCopy { revision: number; updated: string; state: AppState | null }

/**
 * The cloud document contains durable progress only. An unfinished screen is a
 * device draft: syncing it made two otherwise identical accounts look
 * different simply because one device had the workout screen open. Personal
 * achievements are rebuilt from the durable history on every launch, so they
 * must not become a second source of truth either.
 */
export function cloudState(s: AppState): AppState {
  // Profile photos are uploaded and owned by Community. They must never be
  // embedded in the private progress document: a single Base64 photo can be
  // close to the API request limit and makes conflict resolution fail with
  // "La copia es demasiado grande". Keep the small built-in avatar ids.
  const profile = typeof s.profile.avatar === "string" && s.profile.avatar.startsWith("data:image/")
    ? (() => { const { avatar: _avatar, ...rest } = s.profile; return rest; })()
    : s.profile;
  return {
    version: s.version, profile,
    preferences: s.preferences, onboardingStep: s.onboardingStep, completed: s.completed,
    theme: s.theme, volumeTargets: s.volumeTargets, routine: s.routine,
    history: s.history,
    plannedWorkouts: s.plannedWorkouts, skippedWorkoutDates: s.skippedWorkoutDates,
    bodyWeights: s.bodyWeights, routineVersions: s.routineVersions, strengthReferences: s.strengthReferences,
  };
}
export function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const v = value as Record<string, unknown>;
  return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
}
/**
 * Older releases did not serialize optional empty collections consistently.
 * Treating [] and an omitted optional collection as different created false
 * conflicts after an upgrade. Ordering is normalized only for collections
 * whose order has no meaning to the product; workout records and routine
 * exercises deliberately retain their order.
 */
function semanticCloudState(state: AppState): AppState {
  const safe = cloudState(state);
  const optional = <T,>(items: T[] | undefined, compare?: (a: T, b: T) => number) => {
    if (!items?.length) return undefined;
    return compare ? [...items].sort(compare) : items;
  };
  const history = optional(safe.history, (a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)) ?? [];
  const bodyWeights = optional(safe.bodyWeights, (a, b) => a.date.localeCompare(b.date) || a.weight - b.weight);
  const plannedWorkouts = optional(safe.plannedWorkouts, (a, b) => a.date.localeCompare(b.date) || a.dayId.localeCompare(b.dayId));
  const skippedWorkoutDates = optional(safe.skippedWorkoutDates, (a, b) => a.localeCompare(b));
  const routineVersions = optional(safe.routineVersions, (a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom));
  const strengthReferences = optional(safe.strengthReferences, (a, b) => a.id.localeCompare(b.id));
  return { ...safe, history, bodyWeights, plannedWorkouts, skippedWorkoutDates, routineVersions, strengthReferences };
}
export const snapshot = (s: AppState) => canonical(semanticCloudState(s));

/**
 * Merge additions made independently on two devices when every editable
 * account setting is identical. Completed workouts and weigh-ins are
 * append-only records, so their union is lossless. If either device edited
 * the same workout (or any routine/profile setting), return null and require
 * an explicit choice instead of guessing.
 */
function mergeUnique<T>(local: T[], remote: T[], key: (item: T) => string): T[] | null {
  const values = new Map<string, T>();
  for (const item of remote) values.set(key(item), item);
  for (const item of local) {
    const existing = values.get(key(item));
    if (existing !== undefined && canonical(existing) !== canonical(item)) return null;
    values.set(key(item), item);
  }
  return [...values.values()];
}
export function mergeConcurrentProgress(local: AppState, remote: AppState): AppState | null {
  const a = semanticCloudState(local), b = semanticCloudState(remote);
  const { history: localHistory, bodyWeights: localWeights, ...localDocument } = a;
  const { history: remoteHistory, bodyWeights: remoteWeights, ...remoteDocument } = b;
  if (canonical(localDocument) !== canonical(remoteDocument)) return null;
  const history = mergeUnique<Workout>(localHistory, remoteHistory, workout => workout.id);
  const bodyWeights = mergeUnique(localWeights ?? [], remoteWeights ?? [], point => `${point.date}:${point.weight}`);
  if (!history || !bodyWeights) return null;
  return {
    ...a,
    history: history.sort((x, y) => x.date.localeCompare(y.date) || x.id.localeCompare(y.id)),
    bodyWeights: bodyWeights.length ? bodyWeights.sort((x, y) => x.date.localeCompare(y.date) || x.weight - y.weight) : undefined,
  };
}

/** A concise, privacy-preserving explanation for the rare cases that need a choice. */
export function conflictAreas(local: AppState, remote: AppState): string[] {
  const a = semanticCloudState(local), b = semanticCloudState(remote);
  const differs = (left: unknown, right: unknown) => canonical(left) !== canonical(right);
  const areas: string[] = [];
  if (differs(a.history, b.history)) areas.push("historial de entrenamientos (series, repeticiones o pesos)");
  if (differs(a.routine, b.routine) || differs(a.routineVersions, b.routineVersions)) areas.push("rutina");
  if (differs(a.plannedWorkouts, b.plannedWorkouts) || differs(a.skippedWorkoutDates, b.skippedWorkoutDates)) areas.push("calendario");
  if (differs(a.profile, b.profile) || differs(a.preferences, b.preferences) || differs(a.volumeTargets, b.volumeTargets)) areas.push("perfil o preferencias");
  if (differs(a.bodyWeights, b.bodyWeights) || differs(a.strengthReferences, b.strengthReferences)) areas.push("mediciones o referencias de fuerza");
  if (differs(a.completed, b.completed) || differs(a.onboardingStep, b.onboardingStep) || differs(a.theme, b.theme)) areas.push("ajustes de la aplicación");
  return areas;
}
export function hasProgress(s: AppState): boolean {
  return s.completed || s.onboardingStep > 0 || s.history.length > 0 || s.routine.length > 0 || !!s.active;
}
export function syncDecision(local: AppState, remote: RemoteCopy, owner: string): "upload" | "download" | "same" | "conflict" | "wrong-account" {
  if (local.cloud && local.cloud.owner !== owner) return "wrong-account";
  const here = snapshot(local), there = remote.state ? snapshot(remote.state) : null;
  const base = local.cloud?.owner === owner ? local.cloud.base : null;
  if (here === there) return "same";
  if (!remote.state) return (local.cloud?.revision ?? 0) > 0 ? "conflict" : "upload";
  if (!base) return hasProgress(local) ? "conflict" : "download";
  if (here === base) return "download";
  if (there === base) return "upload";
  return "conflict";
}
export function acknowledge(local: AppState, owner: string, revision: number, base: string, syncedAt: string): AppState {
  return { ...local, cloud: { owner, revision, base, syncedAt } };
}
