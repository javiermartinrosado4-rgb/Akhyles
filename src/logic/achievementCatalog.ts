import { pointsTierById } from "./achievements";

export type AchievementKind = "tier" | "personal_best" | "sessions" | "coverage" | "reliability" | "perfect_week" | "consistency" | "personal";
export interface AchievementDetails {
  beforePoints?: number; afterPoints?: number; gainedPoints?: number; coverage?: number; reliability?: number;
  beforeMaximum?: number; maximum?: number; percent?: number; milestone?: number; weight?: number; load?: number; reps?: number; date?: string;
  sessions?: number; weekStart?: string; completed?: number; scheduled?: number; weeks?: number; strengthPercent?: number; compared?: number;
}
export interface AchievementLike { type: "tier" | "personal_best" | "personal"; kind?: string; tierId?: string; exerciseName?: string; details?: AchievementDetails & { title?: string; description?: string } }

const copy: Record<AchievementKind, { title: string; explanation: string; icon: "award" | "zap" | "activity" | "eye" | "calendar" | "repeat" }> = {
  tier: { title: "Nivel desbloqueado", explanation: "Tu puntuación ha alcanzado un nuevo nivel gracias a mejoras registradas de forma sostenida.", icon: "award" },
  personal_best: { title: "Nueva marca personal", explanation: "Has superado tu mejor rendimiento estimado en este ejercicio.", icon: "zap" },
  sessions: { title: "Los escalones de Rocky", explanation: "Como en el entrenamiento de Rocky, el hito no es una sesión perfecta: es presentarte una y otra vez hasta llegar más lejos.", icon: "activity" },
  coverage: { title: "Equilibrio total", explanation: "Ya tienes suficientes grupos corporales registrados para ver cómo se reparte tu fuerza.", icon: "activity" },
  reliability: { title: "Datos que cuentan", explanation: "Tu historial ya tiene la consistencia necesaria para que las comparaciones sean más fiables.", icon: "eye" },
  perfect_week: { title: "Semana completa", explanation: "Has completado todas las sesiones previstas para esta semana.", icon: "calendar" },
  consistency: { title: "Racha de progreso", explanation: "Encadenas semanas con una mejora de fuerza comparable; la tendencia ya tiene recorrido.", icon: "repeat" },
  personal: { title: "Logro desbloqueado", explanation: "Un hito personal obtenido a partir de tu historial de entrenamiento.", icon: "award" },
};

export function achievementPresentation(achievement: AchievementLike) {
  const kind = (achievement.kind && achievement.kind in copy ? achievement.kind : achievement.type) as AchievementKind;
  const base = copy[kind] ?? copy.personal_best;
  if (kind === "personal") return { ...base, title: (achievement.details as AchievementDetails & { title?: string } | undefined)?.title ?? base.title, explanation: (achievement.details as AchievementDetails & { description?: string } | undefined)?.description ?? base.explanation };
  if (kind === "tier") return { ...base, title: `${base.title} · ${pointsTierById(achievement.tierId).name}` };
  if (kind === "personal_best") {
    const exercise = achievement.exerciseName ?? "Marca personal";
    if (achievement.details?.milestone !== undefined) return { ...base, title: `Hito de fuerza · ${exercise}`, explanation: `Has alcanzado ${achievement.details.milestone} kg en este ejercicio.` };
    if (/press\s+(militar|por encima de la cabeza)|overhead press/i.test(exercise)) return {
      ...base, title: `El peso de Atlas · ${exercise}`,
      explanation: "Atlas sostiene el cielo en el mito; este guiño se reserva para un press vertical excepcional.",
    };
    return { ...base, title: `${base.title} · ${exercise}` };
  }
  if (kind === "sessions") return { ...base, title: `${base.title} · ${achievement.details?.sessions ?? ""} sesiones`.trim() };
  if (kind === "coverage") return { ...base, title: `${base.title} · ${achievement.details?.coverage ?? ""}/11 grupos`.trim() };
  if (kind === "reliability") return { ...base, title: `${base.title} · ${achievement.details?.reliability ?? ""}% fiable`.trim() };
  if (kind === "consistency") return { ...base, title: `${base.title} · ${achievement.details?.weeks ?? ""} semanas`.trim() };
  return base;
}
