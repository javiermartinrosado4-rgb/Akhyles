import { ImageSourcePropType } from "react-native";

export type AchievementArtworkInput = { id?: string; definitionId?: string; kind?: string; type?: string; exerciseName?: string; details?: { sessions?: number; title?: string } };
export type AchievementArtwork = { source: ImageSourcePropType; marker?: string; label: string };
const art = {
  atlas: require("../../assets/achievements/atlas.png"), firstStep: require("../../assets/achievements/first-step.png"), personalBest: require("../../assets/achievements/personal-best.png"), consistency: require("../../assets/achievements/consistency.png"), tier: require("../../assets/achievements/tier.png"), balance: require("../../assets/achievements/balance.png"),
} as const;
const localId = (value: AchievementArtworkInput) => (value.definitionId ?? value.id ?? "").replace(/^local:/, "");
const isAtlasPress = (exercise = "") => /press\s+(militar|por encima de la cabeza)|overhead press/i.test(exercise);
export function achievementArtwork(value: AchievementArtworkInput): AchievementArtwork {
  const id = localId(value); const sessions = /^sessions-(\d+)$/.exec(id)?.[1] ?? value.details?.sessions?.toString(); const prs = /^prs-(\d+)$/.exec(id)?.[1]; const kind = value.kind ?? value.type;
  if (isAtlasPress(value.exerciseName)) return { source: art.atlas, label: "Atlas" };
  if (id === "first-workout") return { source: art.firstStep, label: "Primer paso" };
  if (id === "first-pr") return { source: art.personalBest, label: "Primera marca personal" };
  if (sessions || kind === "sessions") return { source: art.consistency, marker: sessions, label: "Hito de constancia" };
  if (prs) return { source: art.personalBest, marker: prs, label: "Marcas personales acumuladas" };
  if (id.startsWith("return-") || kind === "consistency" || kind === "perfect_week") return { source: art.consistency, label: "Constancia" };
  if (kind === "coverage" || kind === "reliability") return { source: art.balance, label: "Progreso equilibrado" };
  if (kind === "tier") return { source: art.tier, label: "Nivel Akhyles" };
  return { source: art.personalBest, label: "Logro Akhyles" };
}
