import React from "react";
import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import Animated, {
  Easing,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const MARK_SIZE = 238;
const mark = {
  gold: require("../../assets/preview/kintsugi-cracks-only-gold-v2.png"),
};

type Route = {
  source: ImageSourcePropType;
  x: [number, number];
  y: [number, number];
  bend: [number, number];
  rotate: number;
  delay: number;
};

const fragments: Route[] = [
  { source: require("../../assets/preview/kintsugi-curved-fragment-crownTip.png"), x: [12, -10], y: [-94, -20], bend: [28, 2], rotate: 16, delay: 0.02 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-crownLeft.png"), x: [-72, -18], y: [24, -18], bend: [-8, -24], rotate: -13, delay: 0 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-crownRight.png"), x: [64, 18], y: [-54, 10], bend: [24, 18], rotate: 11, delay: 0.05 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-middleLeft.png"), x: [-82, -20], y: [4, 24], bend: [-18, -12], rotate: -9, delay: 0.08 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-middleCenter.png"), x: [18, -18], y: [-76, -16], bend: [26, -4], rotate: 14, delay: 0.03 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-middleRight.png"), x: [86, 18], y: [18, -22], bend: [18, 22], rotate: 12, delay: 0.1 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-baseLeft.png"), x: [-58, -10], y: [70, 18], bend: [-24, 14], rotate: 8, delay: 0.05 },
  { source: require("../../assets/preview/kintsugi-curved-fragment-baseRight.png"), x: [66, 14], y: [74, 12], bend: [28, -10], rotate: -10, delay: 0.12 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

function LiquidMaskVein({ d, length, progress, start = 0 }: { d: string; length: number; progress: SharedValue<number>; start?: number }) {
  const animatedProps = useAnimatedProps(() => {
    const local = Math.max(0, Math.min(1, (progress.value - start) / (1 - start)));
    return { strokeDashoffset: interpolate(local, [0, 1], [length, 0]) };
  });
  return (
    <AnimatedPath animatedProps={animatedProps} d={d} fill="none" stroke="#FFFFFF" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${length} ${length}`} />
  );
}

function LiquidGold({ progress }: { progress: SharedValue<number> }) {
  return (
    <MaskedView
      pointerEvents="none"
      style={styles.piece}
      maskElement={
        <Svg style={styles.liquid} viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`}>
          <LiquidMaskVein progress={progress} d="M 66 104 C 82 101, 98 84, 124 70" length={72} />
          <LiquidMaskVein progress={progress} d="M 87 101 C 91 116, 90 132, 92 148" length={55} start={0.035} />
          <LiquidMaskVein progress={progress} d="M 142 144 C 160 144, 175 149, 197 158" length={65} start={0.07} />
          <LiquidMaskVein progress={progress} d="M 123 198 C 143 200, 158 219, 198 232" length={92} start={0.105} />
        </Svg>
      }
    >
      <Image source={mark.gold} resizeMode="contain" style={styles.piece} />
    </MaskedView>
  );
}

function GoldShine({ progress }: { progress: SharedValue<number> }) {
  const sweep = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.84, 1], [0, 0.34, 0.34, 0]),
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-64, MARK_SIZE + 64]) },
      { rotate: "-18deg" },
    ],
  }));
  return (
    <MaskedView
      pointerEvents="none"
      style={styles.piece}
      maskElement={<Image source={mark.gold} resizeMode="contain" style={styles.piece} />}
    >
      <View style={styles.shineSurface}>
        <Animated.View style={[styles.shineBand, sweep]} />
      </View>
    </MaskedView>
  );
}

function Fragment({ progress, route }: { progress: SharedValue<number>; route: Route }) {
  const animated = useAnimatedStyle(() => {
    const local = Math.max(0, Math.min(1, (progress.value - route.delay) / (1 - route.delay)));
    return {
      opacity: interpolate(local, [0, 0.12, 1], [0, 1, 1]),
      transform: [
        { translateX: interpolate(local, [0, 0.52, 1], [route.x[0], route.x[1] + route.bend[0], 0]) },
        { translateY: interpolate(local, [0, 0.52, 1], [route.y[0], route.y[1] + route.bend[1], 0]) },
        { rotate: `${interpolate(local, [0, 0.58, 1], [route.rotate, route.rotate * -0.3, 0])}deg` },
        { scale: interpolate(local, [0, 0.7, 1], [0.94, 1.018, 1]) },
      ],
    };
  });
  return <Animated.Image source={route.source} resizeMode="contain" style={[styles.piece, animated]} />;
}

export function KintsugiIntroPreview({ replay = false }: { replay?: boolean }) {
  const [visible, setVisible] = React.useState(true);
  const assemble = useSharedValue(0);
  const gold = useSharedValue(0);
  const flash = useSharedValue(0);
  const exit = useSharedValue(0);

  const play = React.useCallback(() => {
    setVisible(true);
    assemble.value = 0;
    gold.value = 0;
    flash.value = 0;
    exit.value = 0;
    // The liquid runs continuously on the UI thread; overlapping branches keep
    // the repair reading as one flow instead of four separate reveals.
    assemble.value = withDelay(75, withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }));
    gold.value = withDelay(650, withTiming(1, { duration: 500, easing: Easing.linear }));
    flash.value = withDelay(1_080, withTiming(1, { duration: 810, easing: Easing.inOut(Easing.cubic) }));
    exit.value = withDelay(1_950, withTiming(1, { duration: 200, easing: Easing.in(Easing.quad) }, finished => {
      if (finished) runOnJS(setVisible)(false);
    }));
  }, [assemble, exit, flash, gold]);

  React.useEffect(() => {
    play();
  }, [play]);

  const shell = useAnimatedStyle(() => ({
    opacity: 1 - exit.value,
    transform: [{ scale: interpolate(exit.value, [0, 1], [1, 0.965]) }],
  }));
  const goldReveal = useAnimatedStyle(() => ({
    opacity: interpolate(gold.value, [0, 0.48, 1], [0, 0, 1]),
  }));

  if (!visible && replay) return (
    <Pressable accessibilityRole="button" onPress={play} style={({ pressed }) => [styles.replay, { opacity: pressed ? 0.72 : 1 }]}>
      <Text style={styles.replayText}>Repetir intro</Text>
    </Pressable>
  );
  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, shell]} pointerEvents="auto">
      <View style={styles.mark}>
        {fragments.map((fragment, index) => <Fragment key={index} progress={assemble} route={fragment} />)}
        <LiquidGold progress={gold} />
        <Animated.Image source={mark.gold} resizeMode="contain" style={[styles.piece, goldReveal]} />
        <GoldShine progress={flash} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    zIndex: 1000, elevation: 1000, alignItems: "center", justifyContent: "center",
    // Matches the native splash background exactly; there is no colour flash
    // between tapping the app icon and the first animated frame.
    backgroundColor: "#0F1412",
  },
  mark: { width: MARK_SIZE, height: MARK_SIZE },
  piece: {
    position: "absolute", top: 0, right: 0, bottom: 0, left: 0,
    width: MARK_SIZE, height: MARK_SIZE,
  },
  liquid: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  shineSurface: { flex: 1, overflow: "hidden" },
  shineBand: {
    position: "absolute", top: -44, bottom: -44, width: 42,
    backgroundColor: "#FFF3C1", shadowColor: "#FFE28A", shadowOpacity: 0.8,
    shadowRadius: 14, elevation: 8,
  },
  replay: {
    position: "absolute", right: 16, bottom: 104, zIndex: 900, elevation: 900,
    minHeight: 44, paddingHorizontal: 16, borderRadius: 22,
    alignItems: "center", justifyContent: "center", backgroundColor: "#C39850",
  },
  replayText: { color: "#102016", fontSize: 13, fontWeight: "700" },
});
