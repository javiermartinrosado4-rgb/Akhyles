import { Level, Profile, Workout } from "../types";

export interface LevelSuggestion {
  nextLevel: Level;
  sessions: number;
  weeks: number;
  improvingExercises: number;
}

const nextLevel: Record<Level, Level | undefined> = {
  beginner: "intermediate",
  intermediate: "advanced",
  advanced: undefined,
};

const bestLoads = (history: Workout[]) => {
  const loads = new Map<string, number[]>();
  for (const workout of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const record of workout.records) {
      const best = Math.max(0, ...record.sets.map(set => set.weight));
      if (best > 0) loads.set(record.prescription.exerciseId, [...(loads.get(record.prescription.exerciseId) ?? []), best]);
    }
  }
  return loads;
};

/** Suggests, but never automatically applies, a more advanced exercise pool. */
export function levelSuggestion(profile: Profile, history: Workout[]): LevelSuggestion | undefined {
  const target = nextLevel[profile.level];
  if (!target || history.length < (profile.level === "beginner" ? 24 : 72)) return undefined;
  const dates = history.map(item => new Date(item.date).getTime()).filter(Number.isFinite).sort((a, b) => a - b);
  if (dates.length < 2) return undefined;
  const weeks = Math.floor((dates.at(-1)! - dates[0]) / (7 * 24 * 60 * 60 * 1000));
  const requiredWeeks = profile.level === "beginner" ? 12 : 48;
  if (weeks < requiredWeeks) return undefined;
  const minimumGain = profile.level === "beginner" ? 1.1 : 1.15;
  const improvingExercises = [...bestLoads(history).values()].filter(loads =>
    loads.length >= 3 && loads.at(-1)! >= loads[0] * minimumGain,
  ).length;
  if (improvingExercises < 3) return undefined;
  return { nextLevel: target, sessions: history.length, weeks, improvingExercises };
}
