import test from "node:test";
import assert from "node:assert/strict";
import { exportRoutine, importRoutine, isSharedRoutine } from "../src/logic/sharing";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { generateRoutine } from "../src/logic/routine";
import { validRange } from "../src/logic/validation";
import { validStoredCollections } from "../src/logic/storedState";
import { AppState } from "../src/types";
import { localDateKey } from "../src/logic/schedule";
import { isActiveWorkoutOnDate, openHistoricalWorkout, startWorkout, resumeWorkout } from "../src/logic/workout";

test("date-only calendar keys never shift with the device timezone", () => {
  const previous = process.env.TZ;
  try { process.env.TZ = "America/Los_Angeles"; assert.equal(localDateKey("2026-09-14"), "2026-09-14"); }
  finally { if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous; }
});

test("calendar preparation is not treated as a workout started today", () => {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  const preparing = startWorkout(routine[0], undefined, undefined, undefined, undefined, undefined, undefined, {
    preparing: true,
    plannedDate: new Date().toISOString(),
  });
  assert.equal(isActiveWorkoutOnDate(preparing), false);
  assert.equal(isActiveWorkoutOnDate(startWorkout(routine[0])), true);
});

test("opening history in the workout screen never becomes an active workout", () => {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  const active = startWorkout(routine[0]);
  const historical = openHistoricalWorkout({ id: "past", dayId: routine[0].id, dayName: routine[0].name, date: "2026-09-01T12:00:00.000Z", minutes: 30, records: active.day.exercises.map(prescription => ({ prescription, name: prescription.exerciseId, type: "compound", sets: Array.from({ length: prescription.sets }, () => ({ weight: prescription.weight, reps: 8 })) })) }, false, demoProfile);
  assert.equal(isActiveWorkoutOnDate(historical), false);
  assert.equal(resumeWorkout({ routine, preferences: emptyPreferences, history: [], active: historical } as unknown as AppState)?.historical?.workoutId, "past");
});

test("load mode preferences resolve by exercise and historical side records reopen per side", () => {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  const prescription = routine[0].exercises[0];
  const active = startWorkout(routine[0], undefined, undefined, undefined, undefined, undefined, { [prescription.exerciseId]: "per-side" });
  assert.equal(active.loadModes?.[prescription.id], "per-side");
  const historical = openHistoricalWorkout({
    id: "side-past", dayId: routine[0].id, dayName: routine[0].name, date: "2026-09-01T12:00:00.000Z", minutes: 30,
    records: [{ prescription, name: prescription.exerciseId, type: "compound", sets: [{ weight: 20, reps: 8, leftWeight: 12, rightWeight: 8, leftReps: 8, rightReps: 7 }] }],
  }, false, demoProfile, undefined, undefined, { [prescription.exerciseId]: "total" });
  assert.equal(historical.loadModes?.[prescription.id], "per-side");
  assert.equal(historical.draft[0]?.leftWeight, "12");
  assert.equal(historical.draft[0]?.rightWeight, "8");
});

test("removing the current last exercise cannot crash resume or copy its draft to another exercise", () => {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  const active = startWorkout(routine[0]); active.index = active.day.exercises.length - 1;
  active.draft = [{weight:"999",reps:"99"}]; active.day.exercises.pop();
  const state = {routine,preferences:emptyPreferences,history:[],active} as unknown as AppState;
  const resumed = resumeWorkout(state)!;
  assert.equal(resumed.index, active.day.exercises.length - 1);
  assert.notEqual(resumed.draft[0].weight, "999");
});

const shared = () => exportRoutine(generateRoutine(demoProfile, emptyPreferences), emptyPreferences);

test("malformed nested saved data never reaches rendering", () => {
  const state: AppState = { version: 1, profile: demoProfile, preferences: emptyPreferences, completed: true, onboardingStep: 0, theme: "system", routine: generateRoutine(demoProfile, emptyPreferences), history: [] };
  assert.equal(validStoredCollections(state), true);
  for (const patch of [{ history: [null] }, { history: [{ id: "bad", records: "bad" }] }, { onboardingStep: -1 }, { volumeTargets: null }, { active: { day: null } }])
    assert.equal(validStoredCollections({ ...state, ...patch } as AppState), false);
});

test("shared routines reject plans that cannot survive local hydration", () => {
  for (const range of [[12, 8], [1, 31], [8, 10, 12]]) {
    const plan = shared(); plan.days[0].exercises[0].range = range as [number, number];
    assert.equal(isSharedRoutine(plan), false, JSON.stringify(range));
  }
  for (const count of [0, 8]) {
    const plan = shared(); plan.days = Array.from({ length: count }, () => plan.days[0]);
    assert.equal(isSharedRoutine(plan), false, `${count} days`);
  }
  const unknown = shared(); unknown.days[0].exercises[0].exerciseId = "missing-exercise";
  assert.equal(isSharedRoutine(unknown), false);
  assert.throws(() => importRoutine(unknown, emptyPreferences));
  const privateData = { ...shared(), token: "must-never-be-forwarded" };
  assert.equal(isSharedRoutine(privateData), false);
});

test("range validation rejects malformed external values without throwing", () => {
  for (const value of [null, undefined, {}, "8-10", [], [8, 10, 12]])
    assert.equal(validRange(value as never), false);
  assert.equal(validRange([8, 10]), true);
});

test("a custom adductor exercise can be shared and imported", () => {
  const preferences = structuredClone(emptyPreferences);
  const exercise = { ...generateRoutine(demoProfile, preferences)[0].exercises[0] };
  preferences.custom.push({ id: "custom-adductors", name: "Aductores personalizados", muscle: "adductors", secondary: [], priority: 100,
    minLevel: "beginner", type: "isolation", equipment: "Máquina", variant: "machine", range: [8, 12], substitutions: [], custom: true });
  const plan = exportRoutine([{ id: "custom-day", name: "Pierna", exercises: [{ ...exercise, exerciseId: "custom-adductors" }] }], preferences);
  assert.equal(isSharedRoutine(plan), true);
  assert.equal(importRoutine(plan, emptyPreferences).preferences.custom[0].muscle, "adductors");
});
