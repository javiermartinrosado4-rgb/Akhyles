import assert from "node:assert/strict";
import test from "node:test";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { datesForMonth, datesForWeek, localDateKey, scheduledWorkout, startOfWeek, trainingStreak } from "../src/logic/schedule";
import { generateRoutine } from "../src/logic/routine";
import { Weekday } from "../src/types";

test("calendar produces complete Monday-first weeks and six-week monthly grids", () => {
  const date = new Date(2026, 8, 15);
  assert.equal(localDateKey(startOfWeek(date)), "2026-09-14");
  assert.equal(datesForWeek(date).length, 7);
  const month = datesForMonth(date);
  assert.equal(month.length, 42);
  assert.equal(localDateKey(month[0]), "2026-08-31");
  assert.equal(localDateKey(month.at(-1)!), "2026-10-11");
});

test("a date-specific planned workout overrides only that calendar date", () => {
  const profile = { ...demoProfile, days: 1, trainingDays: [2 as const] };
  const routine = generateRoutine(profile, emptyPreferences);
  const date = new Date(2026, 8, 8, 12);
  const original = scheduledWorkout(profile, routine, [], date)!;
  const override = { date: date.toISOString(), dayId: original.id, day: { ...original, name: "Torso con pesos preparados", exercises: original.exercises.map(entry => ({ ...entry, weight: 42 })) } };
  assert.equal(scheduledWorkout(profile, routine, [override], date)?.name, "Torso con pesos preparados");
  const stale = { ...override, day: { ...override.day, exercises: override.day.exercises.map(entry => ({ ...entry, sets: 4 })) } };
  assert.equal(scheduledWorkout(profile, routine, [stale], date)?.exercises[0].sets, original.exercises[0].sets);
  const movedDate = new Date(2026, 8, 9, 12);
  assert.equal(scheduledWorkout(profile, routine, [{ ...stale, date: movedDate.toISOString() }], movedDate)?.exercises[0].sets, original.exercises[0].sets);
  assert.equal(scheduledWorkout(profile, routine, [override], new Date(2026, 8, 15))?.name, original.name);
  assert.equal(scheduledWorkout(profile, routine, [override], date, [localDateKey(date)]), undefined);
});
test("training streak counts completed scheduled sessions and ignores a pending day", () => {
  const profile = { ...demoProfile, days: 1, trainingDays: [1 as const] };
  const routine = generateRoutine(profile, emptyPreferences);
  const monday = new Date(2026, 8, 14, 12);
  const history = [{
    id: "monday", dayId: routine[0].id, dayName: routine[0].name,
    date: monday.toISOString(), minutes: 40, records: [],
  }];
  const tuesday = new Date(2026, 8, 15, 12);
  assert.equal(trainingStreak(profile, routine, history, [], [], tuesday), 1);
  const followingMonday = new Date(2026, 8, 21, 12);
  assert.equal(trainingStreak(profile, routine, history, [], [], followingMonday), 1);
  assert.equal(trainingStreak(profile, routine, history, [], [], new Date(2026, 8, 22, 12)), 0);
});

test("a program change applies forward without rewriting past calendar sessions or streaks", () => {
  const oldProfile = { ...demoProfile, days: 4, trainingDays: [1, 2, 4, 5] as Weekday[], priority: "balanced" as const };
  const newProfile = { ...oldProfile, days: 5, trainingDays: [1, 2, 3, 4, 5] as Weekday[], priority: "shoulders" as const };
  const oldRoutine = generateRoutine(oldProfile, emptyPreferences);
  const newRoutine = generateRoutine(newProfile, emptyPreferences);
  const versions = [
    { effectiveFrom: "1970-01-01", profile: oldProfile, routine: oldRoutine },
    { effectiveFrom: "2026-09-01", profile: newProfile, routine: newRoutine },
  ];
  const augustMonday = new Date(2026, 7, 31, 12);
  const septemberWednesday = new Date(2026, 8, 2, 12);
  assert.equal(scheduledWorkout(newProfile, newRoutine, [], augustMonday, [], versions)?.name, "Torso A");
  assert.equal(scheduledWorkout(newProfile, newRoutine, [], septemberWednesday, [], versions)?.name, "Torso");
  assert.equal(scheduledWorkout(newProfile, newRoutine, [], new Date(2026, 7, 31, 12), [], versions)?.exercises.length, oldRoutine[0].exercises.length);
});
