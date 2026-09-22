import assert from "node:assert/strict";
import test from "node:test";
import { emptyPreferences, demoProfile } from "../src/data/options";
import { repairSingleStackLoads } from "../src/logic/loadMigration";
import { AppState, Day, Workout } from "../src/types";

const tricepsDay = (weight: number): Day => ({
  id: "torso-a", name: "Torso A",
  exercises: [{ id: "triceps-slot", exerciseId: "triceps-extension", sets: 2, weight, range: [8, 10] }],
});

const tricepsWorkout = (weight: number): Workout => ({
  id: "workout", dayId: "torso-a", dayName: "Torso A", date: "2026-09-21T18:00:00.000Z", minutes: 40,
  records: [{
    loadMode: "per-side", name: "Extensión Tríceps", type: "isolation",
    prescription: tricepsDay(weight).exercises[0],
    sets: [{ weight, leftWeight: weight / 2, rightWeight: weight / 2, reps: 10 }],
  }],
});

test("existing single-stack per-side loads are repaired once across every stored program copy", () => {
  const day = tricepsDay(30), workout = tricepsWorkout(30);
  const state: AppState = {
    version: 1, profile: demoProfile, onboardingStep: 0, completed: true, theme: "system",
    preferences: { ...emptyPreferences, weights: { "triceps-extension": 30 }, loadModes: { "triceps-extension": "per-side" } },
    routine: [day], history: [workout],
    routineVersions: [{ effectiveFrom: "2026-09-01", profile: demoProfile, routine: [day] }],
    plannedWorkouts: [{ date: "2026-09-28T12:00:00.000Z", dayId: day.id, day }],
    active: {
      day, index: 0, startedAt: "2026-09-21T18:00:00.000Z", records: [workout.records[0]],
      draft: [{ weight: "15", leftWeight: "15", rightWeight: "15", reps: "10" }],
      drafts: { "triceps-slot": [{ weight: "15", leftWeight: "15", rightWeight: "15", reps: "10" }] },
      loadModes: { "triceps-slot": "per-side" }, skipped: [],
    },
  };
  const repaired = repairSingleStackLoads(state);
  assert.equal(repaired.loadNormalizationVersion, 2);
  assert.equal(repaired.preferences.weights["triceps-extension"], 15);
  assert.equal(repaired.routine[0].exercises[0].weight, 15);
  assert.equal(repaired.routineVersions![0].routine[0].exercises[0].weight, 15);
  assert.equal(repaired.plannedWorkouts![0].day.exercises[0].weight, 15);
  assert.equal(repaired.history[0].records[0].sets[0].weight, 15);
  assert.equal(repaired.active!.records[0].sets[0].weight, 15);
  assert.equal(repaired.active!.draft[0].weight, "15");
  assert.equal(repairSingleStackLoads(repaired), repaired);
});

test("dual-stack cable loads remain bilateral totals during migration", () => {
  const day: Day = { id: "chest", name: "Pecho", exercises: [{ id: "fly", exerciseId: "chest-cable", sets: 2, weight: 40, range: [8, 10] }] };
  const state: AppState = {
    version: 1, profile: demoProfile, onboardingStep: 0, completed: true, theme: "system",
    preferences: { ...emptyPreferences, weights: { "chest-cable": 40 }, loadModes: { "chest-cable": "per-side" } },
    routine: [day], history: [],
  };
  const repaired = repairSingleStackLoads(state);
  assert.equal(repaired.preferences.weights["chest-cable"], 40);
  assert.equal(repaired.routine[0].exercises[0].weight, 40);
});
