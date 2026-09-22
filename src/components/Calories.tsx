import { Workout } from "../types";
import { estimateCalories } from "../logic/calories";
import { Card, Txt } from "./ui";

export function Calories({ workout }: { workout: Workout }) {
  const calories = estimateCalories(workout);
  return <Card>
    <Txt weight="600" size={22}>{calories === null ? "Calorías no disponibles" : `≈ ${calories} kcal`}</Txt>
    <Txt muted size={12}>{calories === null ? "Esta sesión no tiene un peso corporal registrado." : "Gasto total aproximado"}</Txt>
  </Card>;
}
