import { catalog } from "../data/catalog";
import { AppState, Level } from "../types";
import { scoreLoad } from "./load";

export interface ComparisonRecord {
  exerciseId: string;
  date: string;
  strength: number;
  /** A manufacturer is a cohort filter, never a made-up kg conversion. */
  machineBrand?: string;
}
export interface ComparisonSample {
  level: Level;
  records: ComparisonRecord[];
}
export interface ComparisonResult {
  status: "insufficient" | "average" | "faster" | "slower";
  peers: number;
  rate: number | null;
  average: number | null;
  exercises: number;
}
export const comparableIds = new Set(catalog.filter(e => !e.custom && (e.variant === "free" || e.scoreEligible)).map(e => e.id));
const DAY = 86_400_000;

// Send only comparable performance, never photos, body measurements or the entire profile.
export function comparisonSample(state: AppState, now = Date.now()): ComparisonSample {
  return {
    level: state.profile.level,
    records: state.history.flatMap(workout => {
      if (workout.level !== state.profile.level) return [];
      const time = Date.parse(workout.date);
      if (time < now - 28 * DAY || time > now) return [];
      return workout.records.filter(r => comparableIds.has(r.prescription.exerciseId)).flatMap(r => {
        const strengths = r.sets.filter(s => s.weight > 0 && s.reps >= 1 && s.reps <= 12)
          .map(s => scoreLoad(r.prescription.exerciseId, s.weight, r.apparatusWeight ?? r.barWeight) * (1 + s.reps / 30));
        return strengths.length ? [{ exerciseId: r.prescription.exerciseId, date: workout.date, strength: Math.max(...strengths), ...(r.machineBrand ? { machineBrand: r.machineBrand } : {}) }] : [];
      });
    }),
  };
}

function rates(sample: ComparisonSample, now: number) {
  const groups = new Map<string, Map<number, number>>();
  for (const r of sample.records) {
    const time = Date.parse(r.date);
    if (!comparableIds.has(r.exerciseId) || !Number.isFinite(time) || time < now - 28 * DAY || time > now || !Number.isFinite(r.strength) || r.strength <= 0) continue;
    const cohort = `${r.exerciseId}:${r.machineBrand?.trim().toLocaleLowerCase("es") || "unknown"}`;
    const group = groups.get(cohort) ?? new Map<number, number>();
    group.set(time, Math.max(group.get(time) ?? 0, r.strength));
    groups.set(cohort, group);
  }
  const output = new Map<string, number>();
  for (const [id, group] of groups) {
    const points = [...group].sort((a, b) => a[0] - b[0]);
    const first = points[0], last = points.at(-1)!;
    const days = (last[0] - first[0]) / DAY;
    if (days >= 7 && last[0] >= now - 7 * DAY)
      output.set(id, (last[1] / first[1] - 1) * 100 * 28 / days);
  }
  return output;
}

export function compareProgress(own: ComparisonSample, others: ComparisonSample[], now = Date.now()): ComparisonResult {
  const mine = rates(own, now);
  const ids = [...mine.keys()].sort();
  const peerRates = others.filter(s => s.level === own.level).map(s => rates(s, now))
    .filter(r => ids.length > 0 && ids.every(id => r.has(id)))
    .map(r => ids.reduce((sum, id) => sum + r.get(id)!, 0) / ids.length);
  const rate = ids.length ? ids.reduce((sum, id) => sum + mine.get(id)!, 0) / ids.length : null;
  if (rate === null || peerRates.length < 5)
    return { status: "insufficient", peers: peerRates.length, rate, average: null, exercises: ids.length };
  const average = peerRates.reduce((sum, value) => sum + value, 0) / peerRates.length;
  return { status: Math.abs(rate - average) <= 1 ? "average" : rate > average ? "faster" : "slower", peers: peerRates.length, rate, average, exercises: ids.length };
}
