import { AppState, LocalAchievement, Workout } from "../types";
import { estimatedMax } from "./strengthScore";
import { effectiveLiftedLoad, storedSetLoad } from "./load";
import { strengthReferenceDefinitions } from "./strengthReferences";

const add = (items: LocalAchievement[], achievement: LocalAchievement) => items.some(item => item.id === achievement.id) ? items : [...items, achievement];
const ordered = (history: Workout[]) => [...history].sort((a, b) => a.date.localeCompare(b.date));

/** Rebuilds only achievements that can be proven from saved workout data. */
export function personalAchievements(state: AppState): LocalAchievement[] {
  const history = ordered(state.history);
  let result: LocalAchievement[] = [];
  if (history[0]) result = add(result, { id: "first-workout", category: "progress", title: "Primer paso", description: "Has registrado tu primer entrenamiento.", unlockedAt: history[0].date });
  const references = state.strengthReferences ?? [];
  if (references[0]) result = add(result, { id: "first-strength-reference", category: "strength", title: "Carta de presentación", description: "Has añadido tu primera referencia de fuerza.", unlockedAt: references.map(item => item.date).sort()[0] });
  if (references.length === Object.keys(strengthReferenceDefinitions).length) result = add(result, { id: "five-strength-references", category: "strength", title: "Los cinco pilares", description: "Has registrado referencias en los cinco básicos.", unlockedAt: references.map(item => item.date).sort().at(-1)! });
  for (const milestone of [3, 10, 25, 50, 100, 250, 500, 1000]) if (history[milestone - 1]) result = add(result, {
    id: `sessions-${milestone}`, category: "consistency", title: milestone === 100 ? "Checkpoint" : `${milestone} entrenamientos`,
    description: milestone === 100 ? "Cien sesiones registradas. Ya hay historia detrás." : "La constancia empieza a tener forma.", unlockedAt: history[milestone - 1].date,
  });
  const best = new Map<string, number>(); let totalPrs = 0;
  for (const workout of history) {
    for (const record of workout.records) {
      const current = Math.max(...record.sets.map(set => {
        const load = effectiveLiftedLoad(record.prescription.exerciseId, storedSetLoad(set), workout.bodyWeight, record.apparatusWeight, record.barWeight);
        return load === undefined ? 0 : estimatedMax(load, Math.min(set.reps, 10)) ?? 0;
      }), 0);
      const prior = best.get(record.prescription.exerciseId) ?? 0;
      if (prior > 0 && current > prior * 1.005) {
        totalPrs++;
        if (totalPrs === 1) result = add(result, { id: "first-pr", category: "strength", title: "Level Up!", description: "Has superado una marca personal.", unlockedAt: workout.date });
        for (const milestone of [10, 25, 50]) if (totalPrs === milestone) result = add(result, { id: `prs-${milestone}`, category: "strength", title: milestone === 50 ? "History Rewritten" : milestone === 25 ? "Record Breaker" : "PR Machine", description: `${milestone} marcas personales registradas.`, unlockedAt: workout.date });
      }
      if (current > prior) best.set(record.prescription.exerciseId, current);
    }
  }
  for (let index = 1; index < history.length; index++) {
    const gap = Date.parse(history[index].date) - Date.parse(history[index - 1].date);
    if (gap >= 30 * 86_400_000) result = add(result, { id: `return-${history[index].id}`, category: "consistency", title: "Respawn", description: "Has vuelto después de más de 30 días. Lo importante es volver.", unlockedAt: history[index].date });
  }
  return result.sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
}

export function syncPersonalAchievements(state: AppState): AppState {
  const achievements = personalAchievements(state);
  return JSON.stringify(achievements) === JSON.stringify(state.achievements ?? []) ? state : { ...state, achievements };
}
