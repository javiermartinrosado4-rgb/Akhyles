import { ChartPoint } from "../logic/progress";
import { useTheme } from "../theme";
import { LineChart } from "./LineChart";
export function ProgressChart({ title, points, unit }: { title: string; points: ChartPoint[]; unit: string }) {
  const { colors } = useTheme();
  return <LineChart title={title} unit={unit} fitY compact showLegend={false} series={[{ id: "progress", name: title, color: colors.accent, width: 1.25, points }]} />;
}
