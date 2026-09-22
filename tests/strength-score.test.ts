import assert from "node:assert/strict";
import { test } from "node:test";
import { estimatedMax, relativeLiftScore, wilksCoefficient } from "../src/logic/strengthScore";
import { bodyWeightProgress, periodProgress, scoreProgress } from "../src/logic/progress";
import { scoreLoad, toStoredLoad } from "../src/logic/load";
import { createDemoScenario } from "../src/data/demoScenarios";
import { Workout } from "../src/types";
import { catalog } from "../src/data/catalog";
import { displayPoints, groupWeights, scoreReferences } from "../src/logic/scoreReferences";
import { startWorkout } from "../src/logic/workout";
import { exportProgress, isSharedProgress } from "../src/logic/sharing";

test("published Wilks coefficients and Wathan rep estimate", () => {
  assert.ok(Math.abs(wilksCoefficient(80, "male")! - 0.6827) < 0.0001);
  assert.ok(wilksCoefficient(80, "female")! > wilksCoefficient(80, "male")!);
  assert.ok(Math.abs(wilksCoefficient(51.84, "female")! - 1.2496) < 0.0001);
  assert.ok(wilksCoefficient(60, "male")! > wilksCoefficient(100, "male")!);
  assert.equal(estimatedMax(100, 1), 100);
  assert.equal(estimatedMax(1100, 1), 1100);
  assert.equal(estimatedMax(1300, 1), 1300);
  assert.equal(estimatedMax(1301, 1), undefined);
  assert.ok(estimatedMax(100, 10)! > estimatedMax(100, 5)!);
  for (const reps of [0, -1, 1.5, 11, 100, Infinity, NaN]) assert.equal(estimatedMax(100, reps), undefined);
  for (const weight of [NaN, Infinity, 0, 39, 201]) assert.equal(wilksCoefficient(weight, "male"), undefined);
  assert.equal(wilksCoefficient(151, "female"), undefined);
  assert.equal(wilksCoefficient(80, ""), undefined);
});

test("equal normalized performance has equal points for sex and weight, with exact plate conversion", () => {
  const male = relativeLiftScore("deadlift", 200, 80, "male")!;
  const femaleEquivalent = male * 4 / (wilksCoefficient(60, "female")! * 2.41);
  assert.ok(Math.abs(relativeLiftScore("deadlift", femaleEquivalent, 60, "female")! - male) < 1e-10);
  assert.equal(scoreLoad("chest-press-free", toStoredLoad(30, "per-side"), 20), 80);
  assert.equal(scoreLoad("chest-press-free", 60, 20), 80);
  assert.ok(Math.abs(relativeLiftScore("squat", 174, 80, "male")! - male) < 1e-10);
  assert.ok(Math.abs(relativeLiftScore("bench", 130, 80, "male")! - male) < 1e-10);
});

const session = (exerciseId: string, date: string, weight = 80): Workout => ({
  id: `${exerciseId}-${date}`, date, sex: "male", bodyWeight: 80, minutes: 40, dayName: "Test",
  records: [{ name: exerciseId, type: "compound", prescription: { id: exerciseId, exerciseId, weight, sets: 1, range: [1, 10] }, sets: [{ weight, reps: 5 }] }],
});
test("duplicates do not farm points; coverage is explicit and future lifts do not rewrite past points", () => {
  const state = createDemoScenario(false); state.routineVersions = []; state.history = [session("chest-press-free", "2026-08-01")];
  const first = scoreProgress(state);
  assert.equal(first.coverage, 1); assert.equal(first.rankingEligible, true);
  assert.ok(first.reliability > 0 && first.reliability <= 100);
  state.history[0].records[0].sets.push({ weight: 80, reps: 5 });
  state.history[0].records.push(structuredClone(state.history[0].records[0]));
  assert.deepEqual(scoreProgress(state), first);
  state.history.push(session("squat-free", "2026-08-02"), session("deadlift-conventional", "2026-08-03"), session("supported-row", "2026-08-03"));
  const complete = scoreProgress(state);
  assert.equal(complete.coverage, 5); assert.equal(complete.rankingEligible, true);
  assert.deepEqual(complete.points[0], first.points[0]);
  state.profile.sex = "female"; state.profile.weight = "60";
  assert.deepEqual(scoreProgress(state), complete);
  state.history.push(session("high-bar-squat", "2026-08-04"));
  assert.equal(scoreProgress(state).points.at(-1)!.value, complete.points.at(-1)!.value);
  state.history = [session("chest-press-free", "2026-08-01")]; delete state.history[0].sex;
  assert.equal(scoreProgress(state).points.length, 0);
});

test("weight measurements show the relative Akhyles Points for that body weight", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  state.history = [session("chest-press-free", "2026-08-01", 80)];
  state.bodyWeights = [{ date: "2026-08-02", weight: 80 }, { date: "2026-08-03", weight: 90 }];
  const measurements = bodyWeightProgress(state).filter(point => point.date >= "2026-08-02");
  assert.match(measurements[0].detail!, /^A-Points: /);
  assert.notEqual(measurements[0].detail, measurements[1].detail);
});

test("a monthly chart keeps one previous measurement to draw a useful trend", () => {
  const points = [
    { date: "2026-08-28T10:00:00Z", value: 70 },
    { date: "2026-09-07T10:00:00Z", value: 69 },
  ];
  assert.deepEqual(periodProgress(points, Date.parse("2026-09-01T00:00:00Z")), points);
  assert.deepEqual(periodProgress(points, Date.parse("2026-10-01T00:00:00Z")), []);
});

test("a monthly chart connects every current-month measurement to the previous month", () => {
  const points = [
    { date: "2026-08-28T10:00:00Z", value: 70 },
    { date: "2026-09-07T10:00:00Z", value: 69 },
    { date: "2026-09-21T10:00:00Z", value: 68 },
  ];
  assert.deepEqual(periodProgress(points, Date.parse("2026-09-01T00:00:00Z"), Date.parse("2026-10-01T00:00:00Z")), points);
});

test("an explicitly selected chart period excludes later data and can omit the previous baseline", () => {
  const points = [
    { date: "2025-12-28T10:00:00Z", value: 72 },
    { date: "2026-01-08T10:00:00Z", value: 71 },
    { date: "2026-01-22T10:00:00Z", value: 70 },
    { date: "2026-02-04T10:00:00Z", value: 69 },
  ];
  assert.deepEqual(
    periodProgress(points, Date.parse("2026-01-01T00:00:00Z"), Date.parse("2026-02-01T00:00:00Z"), false),
    points.slice(1, 3),
  );
  assert.deepEqual(
    periodProgress(points, Date.parse("2026-02-01T00:00:00Z"), Date.parse("2026-03-01T00:00:00Z"), false),
    points.slice(3),
  );
});

test("all catalog exercises have explicit finite analogies, and the scale is uncapped", () => {
  assert.equal(catalog.length, 94);
  for (const exercise of catalog) {
    const reference = scoreReferences[exercise.id];
    assert.ok(reference, exercise.id);
    assert.ok(reference.male > 0 && reference.female > 0, exercise.id);
    const state = createDemoScenario(false); state.history = [session(exercise.id, "2026-08-01", exercise.id === "assisted-pullup" ? 20 : 30)];
    assert.ok(Number.isFinite(scoreProgress(state).points[0]?.value), exercise.id);
  }
  assert.ok(Math.abs(Object.values(groupWeights).reduce((sum, value) => sum + value, 0) - 1) < 1e-10);
  assert.equal(displayPoints(0), 0); assert.ok(displayPoints(37) < 100);
  assert.equal(displayPoints(120), 1000); assert.ok(displayPoints(240) > 1000);
});

test("assistance subtracts, unweighted pullups count, high reps saturate, missing groups never fabricate strength", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  const points = (id: string, weight: number, reps = 5) => {
    state.history = [session(id, "2026-08-01", weight)]; state.history[0].records[0].sets[0].reps = reps;
    return scoreProgress(state).points[0]?.value ?? 0;
  };
  assert.ok(points("assisted-pullup", 10) > points("assisted-pullup", 30));
  assert.equal(points("assisted-pullup", 81), 0);
  assert.ok(points("pronated-pullup", 0) > 0);
  assert.ok(points("pronated-pullup", 20) > points("pronated-pullup", 0));
  assert.equal(points("dumbbell-curl", 20, 10), points("dumbbell-curl", 20, 100));
  assert.equal(points("dumbbell-curl", 20, 101), 0);
  assert.equal(points("dumbbell-curl", 20, 1.5), 0);
  assert.equal(points("unknown-custom", 20), 0);
});

test("arm calibration recognises strong per-side dumbbell and cable work", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  state.history = [session("dumbbell-curl", "2026-08-01", 28), session("triceps-extension", "2026-08-02", 30)];
  for (const workout of state.history) workout.records[0].sets[0].reps = 10;
  const result = scoreProgress(state);
  assert.ok((result.categories.find(item => item.id === "biceps")?.value ?? 0) >= 350);
  assert.ok((result.categories.find(item => item.id === "triceps")?.value ?? 0) >= 500);
});

test("arm calibration anchors 30 kg per dumbbell to the Olympian ceiling", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  state.history = [session("dumbbell-curl", "2026-08-01", 60), session("katana-dumbbell", "2026-08-02", 60)];
  for (const workout of state.history) workout.records[0].sets[0].reps = 1;
  const result = scoreProgress(state);
  assert.ok(Math.abs((result.categories.find(item => item.id === "biceps")?.value ?? 0) - 1000) < 2);
  assert.ok(Math.abs((result.categories.find(item => item.id === "triceps")?.value ?? 0) - 1000) < 2);
});

test("unilateral cable triceps at 15 kg per side stays medium-strong, not Olympian", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  state.history = [session("triceps-single", "2026-08-01", 30)];
  state.history[0].records[0].sets[0].reps = 10;
  const value = scoreProgress(state).categories.find(item => item.id === "triceps")?.value ?? 0;
  assert.ok(value >= 450 && value < 700, `unexpected triceps score: ${value}`);
});

test("compound lower-body lifts provide discounted glute evidence", () => {
  const state = createDemoScenario(false); state.routineVersions = [];
  state.history = [session("deadlift-conventional", "2026-08-01", 160)];
  const result = scoreProgress(state);
  const glutes = result.categories.find(item => item.id === "glutes");
  const hamstrings = result.categories.find(item => item.id === "hamstrings");
  assert.ok(glutes?.value && hamstrings?.value);
  assert.equal(glutes?.kind, "inferred");
  assert.ok(glutes!.value! < hamstrings!.value!);
});

test("declared strength references provide labelled best evidence without double counting a group", () => {
  const state = createDemoScenario(false); state.history = [];
  state.strengthReferences = [{ id: "bench", weight: 100, reps: 5, bodyWeight: 80, sex: "male", date: "2026-08-01" }];
  const declared = scoreProgress(state);
  assert.equal(declared.coverage, 1);
  assert.equal(declared.categories.find(item => item.id === "chest")?.kind, "declared");
  assert.ok(declared.points.at(-1)?.value);
  state.history = [session("chest-press-free", "2026-08-02", 60)];
  assert.equal(scoreProgress(state).coverage, 1);
  assert.equal(scoreProgress(state).categories.find(item => item.id === "chest")?.kind, "declared");
});

test("historic bar overrides, including zero, survive preference changes and sharing", () => {
  const state = createDemoScenario(false); state.history = [session("chest-press-free", "2026-08-01", 60)];
  state.history[0].records[0].barWeight = 0;
  const zero = scoreProgress(state).points[0].value;
  state.preferences = { ...state.preferences, barWeights: { "chest-press-free": 50 } };
  assert.equal(scoreProgress(state).points[0].value, zero);
  const shared = exportProgress(state, true);
  assert.equal(shared.workouts![0].exercises[0].barWeight, 0);
  assert.equal(isSharedProgress(shared), true);
  state.history[0].records[0].barWeight = 15.5;
  assert.ok(scoreProgress(state).points[0].value > zero);
  const day = { id: "test", name: "Test", exercises: [state.history[0].records[0].prescription] };
  assert.equal(startWorkout(day, "80", "intermediate", "male", { "chest-press-free": 0 }).barWeights!["chest-press-free"], "0");
});
