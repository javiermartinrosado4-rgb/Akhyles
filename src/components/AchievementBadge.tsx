import { Image, View } from "react-native";
import { AchievementArtworkInput, achievementArtwork } from "../logic/achievementArtwork";
import { Txt } from "./ui";

export function AchievementBadge({ achievement, size = 54 }: { achievement: AchievementArtworkInput; size?: number }) {
  const artwork = achievementArtwork(achievement);
  return <View accessibilityLabel={`Emblema: ${artwork.label}`} style={{ width: size, height: size, flexShrink: 0, position: "relative", alignItems: "center", justifyContent: "center" }}>
    <Image source={artwork.source} accessibilityIgnoresInvertColors resizeMode="contain" style={{ width: size, height: size }} />
    {!!artwork.marker && <View style={{ position: "absolute", right: -2, bottom: -2, minWidth: size * 0.38, height: size * 0.38, paddingHorizontal: 3, borderRadius: size, alignItems: "center", justifyContent: "center", backgroundColor: "#0A2540", borderWidth: 2, borderColor: "#F7C948" }}><Txt size={Math.max(9, Math.round(size * 0.22))} weight="700" style={{ color: "#FFF8E5" }} translate={false}>{artwork.marker}</Txt></View>}
  </View>;
}
