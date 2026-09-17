import assert from "node:assert/strict";
import { test } from "node:test";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { getExercise, generateRoutine, prescribe } from "../src/logic/routine";
import { sessionProgressInsight, weeklyProgressInsight } from "../src/logic/insights";
import { AppState, Workout } from "../src/types";

const workout = (id: string, date: string, weight: number): Workout => {
  const exercise = getExercise("dumbbell-curl", emptyPreferences);
  return { id, date, dayId: "day-0", dayName: "Full body", bodyWeight: 70, minutes: 30, records: [{
    name: exercise.name, type: exercise.type, prescription: { ...prescribe(exercise, emptyPreferences), weight },
    sets: [{ weight, reps: 8 }],
  }] };
};

test("weekly insight compares equivalent elapsed periods and exposes verified personal best evidence", () => {
  const prior = workout("prior", "2026-09-07T10:00:00", 10);
  const current = workout("current", "2026-09-14T10:00:00", 12);
  const state: AppState = { version: 1, profile: { ...demoProfile, days: 1, trainingDays: [1] }, preferences: emptyPreferences, theme: "system", completed: true, onboardingStep: 0, routine: generateRoutine({ ...demoProfile, days: 1, trainingDays: [1] }, emptyPreferences), history: [prior, current] };
  const session = sessionProgressInsight(current, state.history);
  assert.equal(session.status, "up");
  assert.equal(session.compared, 1);
  assert.ok(session.changes[0].percent > 0);
  const week = weeklyProgressInsight(state, new Date("2026-09-16T12:00:00"));
  assert.equal(week.trend.status, "up");
  assert.equal(week.personalBests.length, 1);
  assert.equal(week.personalBests[0].name, exerciseName());
});

function exerciseName() { return getExercise("dumbbell-curl", emptyPreferences).name; }
