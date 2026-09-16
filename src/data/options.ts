import { Level, Muscle, Variant, Profile, Preferences, Weekday } from "../types";
export const weekdays: { id: Weekday; short: string; name: string }[] = [
  { id: 1, short: "L", name: "Lunes" },
  { id: 2, short: "M", name: "Martes" },
  { id: 3, short: "X", name: "Miércoles" },
  { id: 4, short: "J", name: "Jueves" },
  { id: 5, short: "V", name: "Viernes" },
  { id: 6, short: "S", name: "Sábado" },
  { id: 7, short: "D", name: "Domingo" },
];
const defaults: Record<number, Weekday[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};
export const defaultTrainingDays = (count: number) => [...(defaults[count] ?? defaults[3])];
export const levels: { id: Level; name: string; description: string }[] = [
  {
    id: "beginner",
    name: "Principiante",
    description:
      "Menos de un año entrenando con constancia o todavía aprendiendo la técnica.",
  },
  {
    id: "intermediate",
    name: "Intermedio",
    description: "Entre uno y tres años de entrenamiento consistente.",
  },
  {
    id: "advanced",
    name: "Avanzado",
    description: "Más de tres años entrenando seriamente.",
  },
];
export const muscles: { id: Muscle | "balanced"; name: string }[] = [
  { id: "balanced", name: "Entrenamiento equilibrado" },
  { id: "chest", name: "Pecho" },
  { id: "back", name: "Espalda" },
  { id: "shoulders", name: "Hombros" },
  { id: "biceps", name: "Bíceps" },
  { id: "triceps", name: "Tríceps" },
  { id: "glutes", name: "Glúteos" },
  { id: "quads", name: "Cuádriceps" },
  { id: "hamstrings", name: "Isquios" },
  { id: "adductors", name: "Aductores" },
  { id: "calves", name: "Gemelos" },
  { id: "abs", name: "Abdominales" },
];
export const variants: { id: Variant; name: string }[] = [
  { id: "machine", name: "Máquinas" },
  { id: "cable", name: "Poleas / cable" },
  { id: "smith", name: "Multipower" },
  { id: "free", name: "Peso libre" },
  { id: "bodyweight", name: "Peso corporal" },
];
export const levelRank: Record<Level, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};
export const emptyProfile: Profile = {
  name: "",
  handle: "",
  mesocycle: false,
  sex: "",
  birthDate: "",
  age: "",
  height: "",
  weight: "",
  weightReminder: false,
  level: "beginner",
  days: 3,
  trainingDays: defaultTrainingDays(3),
  priority: "balanced",
};
export const emptyPreferences: Preferences = {
  unavailable: [],
  favorites: [],
  equipment: ["machine", "free", "cable", "smith", "bodyweight"],
  names: {},
  notes: {},
  weights: {},
  ranges: {},
  custom: [],
};
export const demoProfile: Profile = {
  ...emptyProfile,
  sex: "male",
  birthDate: "1998-01-01",
  age: "28",
  height: "178",
  weight: "76,5",
  weightReminder: false,
  level: "intermediate",
  days: 3,
  priority: "chest",
};
export const muscleName = (id: Muscle | "balanced") =>
  muscles.find((m) => m.id === id)?.name ?? id;
export const levelName = (id: Level) =>
  levels.find((l) => l.id === id)?.name ?? id;
