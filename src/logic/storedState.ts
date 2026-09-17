import { AppState, Day, ExerciseRecord, Prescription } from "../types";
import { validRange, validWeight } from "./validation";
import { validBarWeight } from "./load";
import { scoreGroups } from "./scoreReferences";
import { validStrengthReference } from "./strengthReferences";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown) => typeof v === "string";
const optionalText = (v: unknown) => v === undefined || text(v);
const date = (v: unknown) => text(v) && Number.isFinite(Date.parse(v as string));
const list = <T,>(v: unknown, check: (item: T) => boolean) => Array.isArray(v) && v.every(item => check(item as T));
const map = <T,>(v: unknown, check: (item: T) => boolean) => object(v) && Object.values(v).every(item => check(item as T));
const optionalMap = <T,>(v: unknown, check: (item: T) => boolean) => v === undefined || map(v, check);
const prescription = (p: Prescription) => object(p) && text(p.id) && text(p.exerciseId) && validRange(p.range) && validWeight(p.weight) && Number.isInteger(p.sets) && p.sets >= 1 && p.sets <= 6 && (p.machineBrand === undefined || (text(p.machineBrand) && p.machineBrand.length <= 60));
const day = (d: Day) => object(d) && text(d.id) && text(d.name) && list(d.exercises, prescription);
const record = (r: ExerciseRecord) => object(r) && prescription(r.prescription) && text(r.name) && ["compound", "isolation"].includes(r.type) &&
  (r.loadMode === undefined || ["total", "per-side", "total-with-bar"].includes(r.loadMode)) && (r.barWeight === undefined || validBarWeight(r.barWeight)) && (r.apparatusWeight === undefined || validBarWeight(r.apparatusWeight)) && (r.machineBrand === undefined || (text(r.machineBrand) && r.machineBrand.length <= 60)) && list(r.sets, (s: { weight: number; reps: number; leftReps?: number; rightReps?: number }) => object(s) && validWeight(s.weight) && Number.isInteger(s.reps) && s.reps >= 1 && s.reps <= 100 && (s.leftReps === undefined || (Number.isInteger(s.leftReps) && s.leftReps >= 1 && s.leftReps <= 100)) && (s.rightReps === undefined || (Number.isInteger(s.rightReps) && s.rightReps >= 1 && s.rightReps <= 100)));
const draft = (v: unknown) => list(v, (s: { weight: string; reps: string; leftReps?: unknown; rightReps?: unknown }) => object(s) && text(s.weight) && text(s.reps) && optionalText(s.leftReps) && optionalText(s.rightReps));

/** Check nested collections before hydration or a cloud response can reach render code. */
export function validStoredCollections(s: AppState): boolean {
  if (!object(s) || !object(s.profile) || !object(s.preferences)) return false;
  const p = s.preferences;
  if (typeof s.completed !== "boolean" || !Number.isInteger(s.onboardingStep) || s.onboardingStep < 0 || s.onboardingStep > 3 ||
      !["balanced", ...Object.keys(scoreGroups)].includes(s.profile.priority) ||
      !list(p.custom, (e: { id: string; name: string; muscle: string; secondary: string[]; range: [number, number]; substitutions: string[]; equipment: string; variant: string; minLevel: string; type: string; priority: number }) =>
        object(e) && text(e.id) && text(e.name) && Object.hasOwn(scoreGroups, e.muscle) && list(e.secondary, text) && validRange(e.range) && list(e.substitutions, text) && text(e.equipment) &&
        ["machine", "cable", "smith", "free", "bodyweight"].includes(e.variant) && ["beginner", "intermediate", "advanced"].includes(e.minLevel) && ["compound", "isolation"].includes(e.type) && Number.isFinite(e.priority)) ||
      !list(p.unavailable, text) || !list(p.equipment, (v: string) => ["machine", "cable", "smith", "free", "bodyweight"].includes(v)) ||
      !map(p.names, text) || !map(p.weights, validWeight) || !map(p.ranges, validRange) || !optionalMap(p.notes, text) || !optionalMap(p.loadModes, (mode: string) => ["total", "per-side", "total-with-bar"].includes(mode)) ||
      !optionalMap(p.loadSteps, (n: number) => validWeight(n) && n > 0) || !optionalMap(p.barWeights, validBarWeight) || !optionalMap(p.apparatusWeights, validBarWeight) || !optionalMap(p.machineBrands, text) ||
      !list(s.routine, day) || !list(s.history, (w: AppState["history"][number]) => object(w) && text(w.id) && text(w.dayName) && date(w.date) &&
        Number.isFinite(w.minutes) && w.minutes >= 0 && list(w.records, record) &&
        (w.bodyWeight === undefined || (Number.isFinite(w.bodyWeight) && w.bodyWeight >= 30 && w.bodyWeight <= 350)) &&
        (w.sex === undefined || ["male", "female", ""].includes(w.sex)) && (w.skipped === undefined || list(w.skipped, text)))) return false;
  if (s.bodyWeights !== undefined && !list(s.bodyWeights, (w: { date: string; weight: number }) => object(w) && date(w.date) && Number.isFinite(w.weight))) return false;
  if (s.achievements !== undefined && !list(s.achievements, (item: { id: string; title: string; description: string; unlockedAt: string; category: string }) => object(item) && text(item.id) && text(item.title) && text(item.description) && date(item.unlockedAt) && ["progress", "consistency", "strength"].includes(item.category))) return false;
  if (s.strengthReferences !== undefined && (!Array.isArray(s.strengthReferences) || s.strengthReferences.length > 5 || s.strengthReferences.some(item => !validStrengthReference(item)) || new Set(s.strengthReferences.map(item => item.id)).size !== s.strengthReferences.length)) return false;
  if (s.volumeTargets !== undefined && !object(s.volumeTargets)) return false;
  if (s.plannedWorkouts !== undefined && !list(s.plannedWorkouts, (w: { date: string; dayId: string; day: Day }) => object(w) && date(w.date) && text(w.dayId) && day(w.day))) return false;
  if (s.active !== undefined) {
    const a = s.active;
    if (!object(a) || !day(a.day) || !a.day.exercises.length || !date(a.startedAt) || !list(a.records, record) || !draft(a.draft) ||
        !optionalMap(a.drafts, draft) || !optionalMap(a.barWeights, text) || !optionalMap(a.apparatusWeights, text) || !optionalMap(a.machineBrands, text) || !optionalMap(a.weighted, (value: boolean) => typeof value === "boolean") || !optionalMap(a.loadModes, (mode: string) => ["total", "per-side", "total-with-bar"].includes(mode))) return false;
  }
  return true;
}
