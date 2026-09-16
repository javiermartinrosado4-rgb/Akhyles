import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdvancedMachineDemoScenario, createCommunityFriendDemoScenario } from "../src/data/demoScenarios";
import { getExercise } from "../src/logic/routine";

const now = new Date("2026-09-14T12:00:00");

test("advanced machine demo keeps two years of continuous torso-leg records", () => {
  const state = createAdvancedMachineDemoScenario(now);
  assert.equal(state.profile.level, "advanced");
  assert.deepEqual(state.routine.map(day => day.name), ["Torso A", "Pierna A", "Torso B", "Pierna B"]);
  assert.ok(state.history.length >= 400);
  const machineRecords = state.history.flatMap(workout => workout.records)
    .filter(record => getExercise(record.prescription.exerciseId, state.preferences).variant === "machine");
  assert.ok(machineRecords.length > state.history.length * 4);
  for (const day of state.routine.filter(day => day.name.startsWith("Torso")))
    assert.ok(day.exercises.every(item => ["chest", "back", "shoulders", "biceps", "triceps"].includes(getExercise(item.exerciseId, state.preferences).muscle)));
  for (const day of state.routine.filter(day => day.name.startsWith("Pierna")))
    assert.ok(day.exercises.every(item => ["quads", "hamstrings", "adductors", "calves", "abs"].includes(getExercise(item.exerciseId, state.preferences).muscle)));

  const months = new Map<string, number>();
  for (const workout of state.history) {
    const key = workout.date.slice(0, 7);
    months.set(key, (months.get(key) ?? 0) + 1);
  }
  const completeMonths = [...months.values()].slice(1, -1);
  assert.ok(completeMonths.every(count => count >= 4));
});

test("community friend demo provides six months of compatible history", () => {
  const state = createCommunityFriendDemoScenario(now);
  assert.equal(state.profile.handle, "leo_entrena");
  assert.equal(state.profile.level, "intermediate");
  assert.deepEqual(state.routine.map(day => day.name), ["Torso A", "Pierna A", "Torso B", "Pierna B"]);
  assert.ok(state.history.length >= 100 && state.history.length <= 108);
});
