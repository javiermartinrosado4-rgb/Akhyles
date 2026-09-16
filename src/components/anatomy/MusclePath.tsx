import { Path } from "react-native-svg";
export interface MusclePathProps {
  d: string; fill: string; stroke: string; strokeWidth: number; onSelect?: () => void;
}
export default function MusclePath({ onSelect, ...props }: MusclePathProps) {
  return <Path {...props} strokeLinejoin="round" onPress={onSelect} />;
}
