import { Image, Platform, useWindowDimensions, View } from "react-native";

/** Decorative only: never reserves space on mobile. */
export function ClassicalBust() {
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web" || width < 1080) return null;
  // Keep the full composition visible: the empty dark side of the artwork
  // blends into the header while the bust enters from the edge naturally.
  return <View style={{ pointerEvents: "none", position: "absolute", right: -48, top: -18, width: 760, height: 304, opacity: 0.72 }}>
    <Image source={require("../../assets/web/akhyles-classical-hero-v2.png")} resizeMode="contain" style={{ width: "100%", height: "100%" }} />
  </View>;
}
