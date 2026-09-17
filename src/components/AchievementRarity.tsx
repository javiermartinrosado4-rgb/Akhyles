import { View } from "react-native";
import { AchievementRarityInfo } from "../services/community";
import { Txt } from "./ui";

const style = {
  common: { label: "Común", color: "#205C39", background: "#E7F5EC" },
  uncommon: { label: "Poco común", color: "#075E5B", background: "#E2F6F4" },
  rare: { label: "Raro", color: "#1D4F96", background: "#E7F0FD" },
  epic: { label: "Épico", color: "#59318E", background: "#F0E8FA" },
  legendary: { label: "Legendario", color: "#6D4B00", background: "#FFF3C9" },
} as const;

export function initialAchievementRarity(definition = "") {
  const session = /^local:sessions-(\d+)$/.exec(definition);
  if (session) return Number(session[1]) >= 500 ? "legendary" : Number(session[1]) >= 250 ? "epic" : Number(session[1]) >= 100 ? "rare" : Number(session[1]) >= 25 ? "uncommon" : "common";
  const prs = /^local:prs-(\d+)$/.exec(definition);
  if (prs) return Number(prs[1]) >= 50 ? "epic" : Number(prs[1]) >= 25 ? "rare" : "uncommon";
  const points = /(?:tier:|points-)(\d+)/.exec(definition);
  if (points) return Number(points[1]) >= 900 ? "legendary" : Number(points[1]) >= 600 ? "epic" : Number(points[1]) >= 400 ? "rare" : Number(points[1]) >= 200 ? "uncommon" : "common";
  if (definition.startsWith("local:return-")) return "uncommon";
  if (definition.startsWith("pr:")) return "uncommon";
  return "common";
}
export const rarityOrder = (rarity?: AchievementRarityInfo, definition?: string) => ({ legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }[rarity?.tier ?? initialAchievementRarity(definition)]);

export function AchievementRarity({ rarity, definition }: { rarity?: AchievementRarityInfo; definition?: string }) {
  const value = rarity ?? { tier: initialAchievementRarity(definition), holders: 0, eligible: 0, percentage: null };
  const palette = style[value.tier];
  const detail = value.percentage === null ? "" : `${value.percentage.toLocaleString("es-ES", { maximumFractionDigits: 2 })} %`;
  return <View accessibilityLabel={`Rareza ${palette.label}${detail ? `. ${detail}` : ""}`} style={{ alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: palette.background }}>
    <Txt size={11} weight="600" style={{ color: palette.color }}>{detail ? `${palette.label} · ${detail}` : palette.label}</Txt>
  </View>;
}
