import { AppState } from "../types";
import { estimatedMax } from "./strengthScore";
import { scoreLoad } from "./load";

export type MasteryRank = "Initiate" | "Warrior" | "Spartan" | "Hero" | "Demigod" | "Olympian" | "Titan";
export interface ExerciseMastery { exerciseId: string; name: string; rank: MasteryRank; ratio: number; maximum: number; bodyWeight: number; }

const ranks: MasteryRank[] = ["Initiate", "Warrior", "Spartan", "Hero", "Demigod", "Olympian", "Titan"];
const standards: Record<string, number[]> = {
  "chest-press-free": [.5, .75, 1, 1.25, 1.5, 1.75, 2],
  "high-bar-squat": [.75, 1, 1.25, 1.5, 1.75, 2, 2.25],
  "low-bar-squat": [.75, 1, 1.25, 1.5, 1.75, 2, 2.25],
  "squat-free": [.75, 1, 1.25, 1.5, 1.75, 2, 2.25],
  "deadlift-conventional": [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5],
  "pronated-pullup": [1, 1.05, 1.15, 1.25, 1.4, 1.5, 1.75],
  "neutral-pullup": [1, 1.05, 1.15, 1.25, 1.4, 1.5, 1.75],
};

function standardFor(id: string) { return standards[id]; }

/** Comparable, body-weight-relative ranks for the core lifts only. */
export function exerciseMasteries(state: AppState): ExerciseMastery[] {
  const best = new Map<string, Omit<ExerciseMastery, "rank" | "ratio">>();
  for (const workout of state.history) {
    const bodyWeight = workout.bodyWeight;
    if (!Number.isFinite(bodyWeight) || bodyWeight! <= 0) continue;
    for (const record of workout.records) {
      const standard = standardFor(record.prescription.exerciseId);
      if (!standard) continue;
      const bodyweightMovement = ["pronated-pullup", "neutral-pullup"].includes(record.prescription.exerciseId);
      const maximum = Math.max(...record.sets.map(set => {
        const external = scoreLoad(record.prescription.exerciseId, set.weight, record.apparatusWeight ?? record.barWeight);
        return estimatedMax(bodyweightMovement ? bodyWeight! + external : external, Math.min(set.reps, 10)) ?? 0;
      }), 0);
      const old = best.get(record.prescription.exerciseId);
      if (maximum > (old?.maximum ?? 0)) best.set(record.prescription.exerciseId, { exerciseId: record.prescription.exerciseId, name: record.name, maximum, bodyWeight: bodyWeight! });
    }
  }
  return [...best.values()].map(item => {
    const ratio = item.maximum / item.bodyWeight;
    const standard = standardFor(item.exerciseId)!;
    const achieved = standard.reduce((rank, threshold, index) => ratio >= threshold ? index : rank, -1);
    return { ...item, ratio: Math.round(ratio * 100) / 100, rank: ranks[Math.max(0, achieved)] };
  }).sort((a, b) => ranks.indexOf(b.rank) - ranks.indexOf(a.rank) || b.ratio - a.ratio);
}
