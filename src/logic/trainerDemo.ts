import { TrainerAttention, TrainerClientSummary } from "./trainerWorkspace";
import { SharedProgress } from "./sharing";
import { scoreGroups } from "./scoreReferences";
import { Muscle } from "../types";

export type DemoCalendarStatus = "completed" | "planned" | "missed" | "skipped";
export interface DemoCalendarEntry { date: string; name?: string; status: DemoCalendarStatus; adjusted?: boolean; }

type DemoProfile = { adherence: number; strengthPercent: number; scheduled: number; completed: number; attention: TrainerAttention; routineStatus: NonNullable<TrainerClientSummary["routineStatus"]>; lastActivityDays: number; };

const profiles: Record<string, DemoProfile> = {
  hugo_atleta: { adherence: 93, strengthPercent: 8.4, scheduled: 15, completed: 14, attention: "on-track", routineStatus: "applied", lastActivityDays: 0 },
  clara_disciplina: { adherence: 79, strengthPercent: 4.1, scheduled: 15, completed: 12, attention: "on-track", routineStatus: "applied", lastActivityDays: 1 },
  ivan_torso: { adherence: 54, strengthPercent: -1.2, scheduled: 13, completed: 7, attention: "needs-review", routineStatus: "sent", lastActivityDays: 3 },
  sofia_progreso: { adherence: 87, strengthPercent: 6.8, scheduled: 15, completed: 13, attention: "on-track", routineStatus: "applied", lastActivityDays: 0 },
  diego_constante: { adherence: 68, strengthPercent: 2.3, scheduled: 15, completed: 10, attention: "on-track", routineStatus: "applied", lastActivityDays: 2 },
  lucia_fuerza: { adherence: 43, strengthPercent: 0.8, scheduled: 14, completed: 6, attention: "needs-review", routineStatus: "sent", lastActivityDays: 5 },
};

const isoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const sessions = ["Torso A", "Pierna A", undefined, "Torso B", "Pierna B", undefined, undefined];

/** Representative local records so the trainer can evaluate the complete shared-progress interface. */
export const demoProgress = (handle: string): SharedProgress | null => {
  const profile = profiles[handle];
  if (!__DEV__ || !profile) return null;
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const date = (days: number) => { const value = new Date(today); value.setDate(value.getDate() - days); return value.toISOString(); };
  const variation = Math.round(profile.strengthPercent * 10) / 10;
  const female = handle === "lucia_fuerza" || handle === "sofia_progreso" || handle === "clara_disciplina";
  const body = [female ? 62.6 : 84.6, female ? 62.4 : 84.4, female ? 62.1 : 84.1, female ? 61.9 : 83.9, female ? 61.7 : 83.7, female ? 61.5 : 83.5].map((value, index) => ({ date: date(70 - index * 14), value: value + (handle.length % 3) }));
  const workout = (days: number, chest: number, legs: number) => ({
    id: `demo-${handle}-${days}`, name: days % 2 ? "Torso A" : "Pierna A", date: date(days), minutes: 62,
    exercises: [
      { id: "bench-smith", name: "Press banca en multipower", sets: [{ weight: chest - 5, reps: 10 }, { weight: chest, reps: 8 }] },
      { id: "barbell-row", name: "Remo libre con barra", sets: [{ weight: chest - 10, reps: 10 }, { weight: chest - 5, reps: 8 }] },
      { id: "high-bar-squat", name: "Sentadilla high bar", sets: [{ weight: legs - 7.5, reps: 8 }, { weight: legs, reps: 6 }] },
      { id: "standing-curl", name: "Curl de isquios tumbado", sets: [{ weight: 35 + Math.round(days / 18), reps: 11 }] },
    ],
  });
  const workouts = [70, 56, 42, 28, 14, 7].map((days, index) => workout(days, 55 + index * 2.5 + variation, 80 + index * 4 + variation));
  return {
    version: 1, sex: female ? "female" : "male", sessions: profile.completed + 18, sets: (profile.completed + 18) * 14, points: 146 + variation * 3, updated: date(0),
    // Internal A-Points values deliberately cover several material bands so
    // local visual review exercises the coloured anatomy rather than a flat map.
    categories: (Object.keys(scoreGroups) as Muscle[]).map((id, index) => ({ id, name: scoreGroups[id], value: 190 + ((index * 137 + handle.length * 29) % 980) })),
    exercises: [
      { id: "bench-smith", name: "Press banca en multipower", weight: 67.5 + variation, reps: 8, maximum: 85, date: date(7) },
      { id: "barbell-row", name: "Remo libre con barra", weight: 62.5 + variation, reps: 8, maximum: 79, date: date(7) },
      { id: "high-bar-squat", name: "Sentadilla high bar", weight: 100 + variation, reps: 6, maximum: 120, date: date(14) },
      { id: "standing-curl", name: "Curl de isquios tumbado", weight: 38, reps: 11, maximum: 52, date: date(14) },
    ],
    weekly: { weekStart: isoDate(today), complete: false, completed: profile.completed, scheduled: profile.scheduled, adherence: profile.adherence, strengthPercent: profile.strengthPercent, strengthCompared: 8, personalBests: 2, improvingWeeks: 4 },
    workouts, bodyWeights: body,
    pointsHistory: [70, 56, 42, 28, 14, 7].map((days, index) => ({ date: date(days), value: 128 + index * 4 + variation })),
  };
};

/** Local-only sample data. It lets the trainer workspace be evaluated with a believable training history before live calendar sharing is enabled. */
export const demoClient = (client: TrainerClientSummary): TrainerClientSummary => {
  if (!__DEV__) return client;
  const profile = profiles[client.handle];
  if (!profile) return client;
  const last = new Date(); last.setDate(last.getDate() - profile.lastActivityDays);
  return { ...client, ...profile, activeSince: new Date(last.getTime() - 182 * 86_400_000).toISOString(), progress: demoProgress(client.handle), lastActivity: last.toISOString() };
};

export const demoCalendar = (handle: string): DemoCalendarEntry[] => {
  if (!__DEV__ || !profiles[handle]) return [];
  const profile = profiles[handle];
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Array.from({ length: 28 }, (_, index) => {
    const offset = index - 13;
    const date = new Date(today); date.setDate(today.getDate() + offset);
    const session = sessions[(date.getDay() + 6) % 7];
    if (!session) return { date: isoDate(date), status: "skipped" };
    const completed = offset < 0 && ((index + handle.length + Math.round(profile.adherence)) % 10 < Math.round(profile.adherence / 10));
    return { date: isoDate(date), name: session, status: offset > 0 ? "planned" : completed ? "completed" : "missed" };
  });
};
