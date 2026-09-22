import assert from "node:assert/strict";
import test from "node:test";
import { emptyPreferences, emptyProfile } from "../src/data/options";
import { AppState } from "../src/types";
import { applySyncChanges, changedEntities, stateFromSyncEntities, syncEntities, syncEntityChanges } from "../src/logic/syncV2";

function sample(): AppState {
  return {
    version: 1, completed: true, onboardingStep: 3, theme: "system", profile: emptyProfile,
    preferences: emptyPreferences, routine: [], history: [
      { id: "w-1", dayName: "Torso", date: "2026-09-21", minutes: 45, records: [] },
      { id: "w-2", dayName: "Pierna", date: "2026-09-22", minutes: 50, records: [] },
    ], bodyWeights: [{ date: "2026-09-20", weight: 80 }],
  };
}

test("sync v2 separates history without changing its contents", () => {
  const state = sample(); const entities = syncEntities(state); const rebuilt = stateFromSyncEntities(entities);
  assert.equal(entities.filter(entity => entity.type === "workout").length, 2);
  assert.deepEqual(rebuilt?.history, state.history);
  assert.deepEqual(rebuilt?.bodyWeights, state.bodyWeights);
  assert.deepEqual(rebuilt?.routine, state.routine);
});

test("sync v2 only emits the new workout entity", () => {
  const before = syncEntities(sample()); const next = sample();
  next.history = [...next.history, { id: "w-3", dayName: "Full body", date: "2026-09-23", minutes: 40, records: [] }];
  const changed = changedEntities(before, syncEntities(next));
  assert.deepEqual(changed.map(entity => `${entity.type}:${entity.id}`), ["workout:w-3"]);
});

test("sync v2 merges a remote workout without rewriting the account document", () => {
  const before=syncEntities(sample()); const remote={ id: "remote-1", dayName: "Espalda", date: "2026-09-24", minutes: 42, records: [] };
  const merged=applySyncChanges(before,[{type:"workout",id:remote.id,data:remote,revision:1}]);
  assert.equal(stateFromSyncEntities(merged)?.history.some(workout=>workout.id===remote.id),true);
  assert.deepEqual(syncEntityChanges(before,merged).changed.map(entity=>entity.id),[remote.id]);
});
