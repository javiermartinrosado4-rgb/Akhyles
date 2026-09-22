import assert from "node:assert/strict";
import test from "node:test";
import { compareExercise, weeklyExerciseComparison } from "../src/logic/trainerSession";
import { SharedWorkout } from "../src/logic/sharing";

const workout = (date: string, firstWeight: number, firstReps: number, secondWeight: number): SharedWorkout => ({
  id: date, name: "Torso A", date, minutes: 60,
  exercises: [{ id: "bench-smith", name: "Press banca", sets: [{ weight: firstWeight, reps: firstReps }, { weight: secondWeight, reps: 20 }] }],
});

test("trainer comparisons use only the first series and expose percentage changes", () => {
  const previous = workout("2026-09-08T12:00:00Z", 60, 8, 30);
  const selected = workout("2026-09-15T12:00:00Z", 63, 9, 100);
  const comparison = compareExercise([previous, selected], selected, selected.exercises[0]);
  assert.equal(comparison.reference.weight, 63);
  assert.equal(comparison.reference.reps, 9);
  assert.equal(comparison.weightDelta, 3);
  assert.equal(comparison.weightPercent, 5);
  assert.ok((comparison.performancePercent ?? 0) > 0);
  const weekly = weeklyExerciseComparison([previous, selected], selected, "bench-smith");
  assert.equal(weekly?.current.weight, 63);
  assert.equal(weekly?.weightDelta, 3);
});
