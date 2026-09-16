import test from "node:test";
import assert from "node:assert/strict";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { generateRoutine } from "../src/logic/routine";
import { finishWorkout, resumeWorkout, startWorkout } from "../src/logic/workout";
import { estimateCalories } from "../src/logic/calories";
import { AppState, Workout } from "../src/types";

function state(): AppState {
  const routine = generateRoutine(demoProfile, emptyPreferences);
  routine[0].exercises[0].sets = 2;
  return { version: 1, profile: demoProfile, preferences: emptyPreferences, completed: true, onboardingStep: 0, theme: "system", routine, history: [] };
}
test("resume reconciles stale four-set prescriptions with two planned sets", () => {
  const s = state();
  s.active = startWorkout(s.routine[0], "80");
  s.active.day.exercises[0].sets = 4;
  s.active.draft = Array.from({ length: 4 }, () => ({ weight: "30", reps: "" }));
  const result = resumeWorkout(s)!;
  assert.equal(result.day.exercises[0].sets, 2);
  assert.equal(result.draft.length, 2);
  assert.equal(result.draft[0].weight, "30");
  assert.equal(s.active.day.exercises[0].sets, 4, "resume must not mutate persisted input");
  s.active.draft[3].reps = "8";
  const resumedAgain = resumeWorkout(s)!;
  assert.equal(resumedAgain.day.exercises[0].sets, 2);
  assert.equal(resumedAgain.draft.length, 2, "discard obsolete work beyond the current prescription");
});
test("finishing is idempotent and a finished session cannot be resumed", () => {
  const s = state();
  s.active = startWorkout(s.routine[0], "80");
  const workout: Workout = { id: "finished", startedAt: s.active.startedAt, bodyWeight: 80, dayName: "Test", date: new Date().toISOString(), minutes: 30, records: [] };
  const finished = finishWorkout(s, workout);
  assert.equal(finishWorkout(finished, workout).history.length, 1);
  assert.equal(resumeWorkout({ ...finished, active: s.active }), undefined);
  assert.throws(() => startWorkout({ id: "empty", name: "Empty", exercises: [] }));
});
test("an unfinished workout from a previous date remains recoverable", () => {
  const s = state();
  s.active = startWorkout(s.routine[0], "80");
  s.active.startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  s.active.draft[0] = { weight: "42.5", reps: "8" };
  const resumed = resumeWorkout(s);
  assert.ok(resumed);
  assert.equal(resumed.startedAt, s.active.startedAt);
  assert.deepEqual(resumed.draft[0], { weight: "42.5", reps: "8" });
});
test("resuming never relabels recorded work after a routine replacement reuses its id", () => {
  const s = state();
  s.active = startWorkout(s.routine[0], "80");
  const original = s.active.day.exercises[0];
  s.active.records = [{ prescription: original, name: "Original", type: "compound", sets: [{ weight: 42, reps: 8 }] }];
  s.routine[0].exercises[0] = { ...original, exerciseId: "neutral-pulldown" };

  const resumed = resumeWorkout(s)!;

  assert.equal(resumed.day.exercises[0].exerciseId, original.exerciseId);
  assert.equal(resumed.records[0].prescription.exerciseId, original.exerciseId);
});
test("calories depend on completed exercise work and body weight, not an open timer", () => {
  const s = state();
  const workout: Workout = { id: "test", dayName: "Test", date: new Date().toISOString(), minutes: 30, bodyWeight: 80, records: [{ prescription: s.routine[0].exercises[0], name: "Press", type: "compound", sets: [{ weight: 30, reps: 8 }, { weight: 30, reps: 8 }] }] };
  const calories = estimateCalories(workout)!;
  assert.ok(calories > 0 && calories < 150);
  assert.equal(estimateCalories({ ...workout, minutes: 2000 }), calories);
  assert.equal(estimateCalories({ ...workout, records: [] }), 0);
  assert.equal(estimateCalories({ ...workout, bodyWeight: undefined }), null);
  assert.ok(estimateCalories({ ...workout, bodyWeight: 100 })! > calories);
});
