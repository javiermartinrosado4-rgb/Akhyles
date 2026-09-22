import { cloudState, canonical } from "./cloud";
import { AppState, Workout } from "../types";

/**
 * V2 stores the small account document separately from append-only history.
 * A completed workout remains atomic, so its exercises and sets can never be
 * partially restored. This is intentionally a transport/storage boundary: it
 * does not change training, scoring or presentation semantics.
 */
export type SyncEntityType = "state" | "workout" | "body-weight";
export interface SyncEntity<T = unknown> {
  type: SyncEntityType;
  id: string;
  data: T;
}
export interface SyncChange extends SyncEntity { revision: number; deleted?: boolean }
export const syncEntityKey = (entity: Pick<SyncEntity, "type" | "id">) => `${entity.type}:${entity.id}`;

export function syncEntities(state: AppState): SyncEntity[] {
  const safe = cloudState(state);
  const { history, bodyWeights, ...document } = safe;
  const entities: SyncEntity[] = [{ type: "state", id: "primary", data: { ...document, history: [], bodyWeights: [] } }];
  for (const workout of history) entities.push({ type: "workout", id: workout.id, data: workout });
  for (const point of bodyWeights ?? []) entities.push({ type: "body-weight", id: point.date, data: point });
  return entities;
}

/** Rebuild the current AppState shape so existing screens remain unchanged. */
export function stateFromSyncEntities(entities: SyncEntity[]): AppState | null {
  const primary = entities.find(entity => entity.type === "state" && entity.id === "primary")?.data;
  if (!primary || typeof primary !== "object" || Array.isArray(primary)) return null;
  const workouts = entities.filter(entity => entity.type === "workout").map(entity => entity.data as Workout)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const bodyWeights = entities.filter(entity => entity.type === "body-weight").map(entity => entity.data as { date: string; weight: number })
    .sort((a, b) => a.date.localeCompare(b.date));
  return { ...(primary as AppState), history: workouts, bodyWeights };
}

export function entityFingerprint(entity: SyncEntity): string {
  return canonical(entity.data);
}

export function changedEntities(previous: SyncEntity[], next: SyncEntity[]): SyncEntity[] {
  const before = new Map(previous.map(entity => [`${entity.type}:${entity.id}`, entityFingerprint(entity)]));
  return next.filter(entity => before.get(`${entity.type}:${entity.id}`) !== entityFingerprint(entity));
}

export function syncEntityChanges(previous: SyncEntity[], next: SyncEntity[]): { changed: SyncEntity[]; deleted: SyncEntity[] } {
  const nextKeys = new Set(next.map(syncEntityKey));
  return { changed: changedEntities(previous, next), deleted: previous.filter(entity => !nextKeys.has(syncEntityKey(entity))) };
}

export function applySyncChanges(base: SyncEntity[], changes: SyncChange[]): SyncEntity[] {
  const entities = new Map(base.map(entity => [syncEntityKey(entity), entity]));
  for (const change of changes) {
    const key = syncEntityKey(change);
    if (change.deleted) entities.delete(key); else entities.set(key, { type: change.type, id: change.id, data: change.data });
  }
  return [...entities.values()];
}
