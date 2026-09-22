import { defaultTrainingDays } from "../data/options";
import { AppState } from "../types";

/** Repairs stale availability without discarding an otherwise valid program. */
export function repairTrainingDays(profile: AppState["profile"]): AppState["profile"] {
  const { days, trainingDays } = profile;
  if (trainingDays === undefined || !Number.isInteger(days) || days < 1 || days > 7) return profile;
  const valid = Array.isArray(trainingDays)
    ? [...new Set(trainingDays.filter(day => Number.isInteger(day) && day >= 1 && day <= 7))]
    : [];
  if (Array.isArray(trainingDays) && valid.length === days && valid.length === trainingDays.length) return profile;
  return { ...profile, trainingDays: [...valid, ...defaultTrainingDays(days).filter(day => !valid.includes(day))].slice(0, days) };
}
