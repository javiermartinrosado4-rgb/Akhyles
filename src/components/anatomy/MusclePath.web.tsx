import type { MusclePathProps } from "./MusclePath";

// Native SVG responder props leak onto the DOM with RN Web 0.21 / React 19.
// Keep web events on an SVG path; native platforms use react-native-svg's onPress.
export default function MusclePath({ onSelect, ...props }: MusclePathProps) {
  return <path {...props} strokeLinejoin="round" onClick={onSelect} style={{ cursor: onSelect ? "pointer" : "default", transition: "fill 180ms, stroke 180ms" }} />;
}
