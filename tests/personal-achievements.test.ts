import assert from "node:assert/strict";
import test from "node:test";
import { createDemoScenario } from "../src/data/demoScenarios";
import { personalAchievements, syncPersonalAchievements } from "../src/logic/personalAchievements";

test("personal achievements are derived locally and persist without Community", () => {
  const state = createDemoScenario();
  const achievements = personalAchievements(state);
  assert.ok(achievements.some(item => item.id === "first-workout"));
  assert.ok(achievements.some(item => item.id === "sessions-10"));
  assert.deepEqual(syncPersonalAchievements(state).achievements, achievements);
});

test("historical workouts rebuild achievements when the saved list is empty", () => {
  const state = createDemoScenario();
  const rebuilt = syncPersonalAchievements({ ...state, achievements: [] });
  assert.ok(rebuilt.achievements?.some(item => item.id === "first-workout"));
  assert.equal(rebuilt.achievements?.filter(item => item.id === "first-workout").length, 1);
});
