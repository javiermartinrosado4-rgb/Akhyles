import assert from "node:assert/strict";
import { test } from "node:test";
import { anatomicalGroups, muscleAppearance, strengthBands } from "../src/logic/bodyMap";
import { pointsTierById } from "../src/logic/achievements";
import { createDemoScenario, repairLegacyDemoScores } from "../src/data/demoScenarios";
import { catalog } from "../src/data/catalog";
import { scoreProgress } from "../src/logic/progress";
import { bodyFront } from "../src/components/anatomy/bodyFront";
import { bodyBack } from "../src/components/anatomy/bodyBack";
import { bodyFemaleFront } from "../src/components/anatomy/bodyFemaleFront";
import { bodyFemaleBack } from "../src/components/anatomy/bodyFemaleBack";
import { scoreGroups } from "../src/logic/scoreReferences";

test("fixed strength colors do not depend on another muscle or missing values", () => {
  assert.equal(muscleAppearance(200).color, strengthBands[2].color);
  assert.equal(muscleAppearance(0).label, "Base");
  assert.equal(muscleAppearance(100).label, "En progreso");
  assert.equal(muscleAppearance(800).label, "Mítico");
  assert.equal(muscleAppearance(900).label, "Greek God");
  assert.equal(muscleAppearance(1000).label, "Olympian");
  assert.equal(muscleAppearance(9000).label, "Olympian");
  for (const missing of [undefined, NaN, Infinity, -1]) assert.equal(muscleAppearance(missing).label, "Sin datos");
});

test("Community point milestones use the same body-map rank names", () => {
  assert.equal(pointsTierById("points-900").name, "Greek God");
});

test("the map follows the visible spectrum from red at entry level to purple at the highest tier", () => {
  assert.equal(muscleAppearance(0).color, "#D94A4A");
  assert.equal(muscleAppearance(500).color, "#35AABD");
  assert.equal(muscleAppearance(1000).color, "#A33BA7");
});

test("old demo sessions recover their known sex without changing any loads or real sessions", () => {
  for (const female of [false, true]) {
    const state = createDemoScenario(female);
    const expected = scoreProgress(state);
    assert.ok(expected.coverage >= 10);
    assert.ok(expected.categories.filter(item => item.value !== undefined).every(item => item.load !== undefined && item.value! > 0));
    state.history.forEach(workout => { delete workout.sex; });
    state.routineVersions = [];
    assert.equal(scoreProgress(state).coverage, 0);
    const loads = JSON.stringify(state.history.map(workout => workout.records));
    const repaired = repairLegacyDemoScores(state);
    assert.deepEqual(scoreProgress(repaired), expected);
    assert.equal(JSON.stringify(repaired.history.map(workout => workout.records)), loads);
    assert.equal(repairLegacyDemoScores(repaired), repaired);
    state.profile.name = "Usuario real";
    assert.equal(repairLegacyDemoScores(state), state);
  }
  const mixed = createDemoScenario(false);
  mixed.history = [{ ...mixed.history[0], id: "real-session", sex: undefined }];
  assert.equal(repairLegacyDemoScores(mixed), mixed);
});

test("every group's actual recorded load drives its own strength without fabricating other groups", () => {
  for (const group of Object.keys(scoreGroups)) {
    const exercise = catalog.find(item => item.muscle === group)!;
    const state = createDemoScenario(false);
    state.routineVersions = [];
    state.history = [{ id: "real-lift", date: "2026-09-01T12:00:00Z", sex: "male", bodyWeight: 80, minutes: 30, dayName: "Test", records: [{
      name: exercise.name, type: exercise.type, barWeight: 0,
      prescription: { id: "lift", exerciseId: exercise.id, weight: 30, sets: 1, range: [5, 8] },
      sets: [{ weight: 30, reps: 5 }],
    }] }];
    const read = () => scoreProgress(state).categories.find(item => item.id === group)!;
    const base = read().value!;
    assert.ok(base > 0, group);
    assert.equal(scoreProgress(state).coverage, 1, group);
    state.history[0].records[0].sets[0].weight = 40;
    assert.ok(read().value! > base, `more weight must increase ${group}`);
    state.history[0].records[0].sets[0].weight = 30;
    state.history[0].records[0].sets[0].reps = 8;
    assert.ok(read().value! > base, `more reps at equal load must increase ${group}`);
    state.history[0].records[0].sets[0].reps = 5;
    state.history[0].bodyWeight = 100;
    assert.ok(read().value! < base, `same external load at higher bodyweight must score lower for ${group}`);
  }
});
test("both anatomical models cover all eleven scored groups, with neutral forearms", () => {
  for (const model of [[...bodyFront, ...bodyBack], [...bodyFemaleFront, ...bodyFemaleBack]]) {
    const mapped = new Set(model.map(part => anatomicalGroups[part.slug]).filter(Boolean));
    assert.deepEqual([...mapped].sort(), Object.keys(scoreGroups).sort());
    assert.equal(anatomicalGroups.forearm, undefined);
  }
});
test("muscle evidence follows the best normalized lift, includes the bar, and retains the original reps", () => {
  const state = createDemoScenario(false);
  state.routineVersions = [];
  state.history = [{ id: "sample", date: "2026-09-01T12:00:00Z", sex: "male", bodyWeight: 80, minutes: 30, dayName: "Test", records: [{
    name: "Press de banca", type: "compound", barWeight: 20,
    prescription: { id: "bench", exerciseId: "chest-press-free", weight: 60, sets: 1, range: [8, 12] },
    sets: [{ weight: 60, reps: 12 }],
  }] }];
  const before = scoreProgress(state).categories.find(item => item.id === "chest")!;
  assert.equal(before.load, 80);
  assert.equal(before.reps, 12);
  assert.equal(before.exerciseName, "Press de banca");
  state.history.push({ ...structuredClone(state.history[0]), id: "weaker", date: "2026-09-02T12:00:00Z" });
  state.history[1].records[0].sets = [{ weight: 30, reps: 5 }];
  assert.deepEqual(scoreProgress(state).categories.find(item => item.id === "chest"), before);
  state.history[1].records[0].sets = [{ weight: 100, reps: 8 }];
  const after = scoreProgress(state).categories.find(item => item.id === "chest")!;
  assert.ok(after.value! > before.value!);
  assert.equal(after.load, 120);
  assert.equal(after.date, "2026-09-02T12:00:00Z");
});
