import assert from "node:assert/strict";
import test from "node:test";
import { exerciseMasteries } from "../src/logic/exerciseMastery";
import { createDemoScenario } from "../src/data/demoScenarios";

test("core lift mastery uses exercise-specific body-weight-relative ranks", () => {
  const state = createDemoScenario();
  const workout = state.history[0];
  workout.bodyWeight = 80;
  workout.records = [{ ...workout.records[0], name: "Peso muerto", prescription: { ...workout.records[0].prescription, exerciseId: "deadlift-conventional" }, sets: [{ weight: 160, reps: 1 }] }];
  const mastery = exerciseMasteries(state).find(item => item.exerciseId === "deadlift-conventional");
  assert.equal(mastery?.rank, "Demigod");
  assert.equal(mastery?.ratio, 2);
});

test("pull-up mastery counts the athlete's body weight as well as added load", () => {
  const state = createDemoScenario();
  const workout = state.history[0];
  workout.bodyWeight = 80;
  workout.records = [{ ...workout.records[0], name: "Dominadas pronas", prescription: { ...workout.records[0].prescription, exerciseId: "pronated-pullup" }, sets: [{ weight: 0, reps: 1 }] }];
  assert.equal(exerciseMasteries(state).find(item => item.exerciseId === "pronated-pullup")?.ratio, 1);
});
