import { AppState } from "../types";

export interface CloudMetadata {
  owner: string;
  revision: number;
  base: string | null;
  syncedAt?: string;
}
export interface RemoteCopy { revision: number; updated: string; state: AppState | null }

/** An explicit allowlist prevents session tokens and device notification IDs from leaving the phone. */
export function cloudState(s: AppState): AppState {
  return {
    version: s.version, programRevision: s.programRevision, profile: s.profile,
    preferences: s.preferences, onboardingStep: s.onboardingStep, completed: s.completed,
    theme: s.theme, volumeTargets: s.volumeTargets, routine: s.routine, history: s.history,
    plannedWorkouts: s.plannedWorkouts, skippedWorkoutDates: s.skippedWorkoutDates,
    active: s.active, bodyWeights: s.bodyWeights, routineVersions: s.routineVersions,
    achievements: s.achievements,
  };
}
export function canonical(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const v = value as Record<string, unknown>;
  return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${canonical(v[k])}`).join(",")}}`;
}
export const snapshot = (s: AppState) => canonical(cloudState(s));
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
