import assert from "node:assert/strict";
import test from "node:test";
import { AppState } from "../src/types";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { generateRoutine } from "../src/logic/routine";
import { ensureProgramHistory, preserveProgramHistory } from "../src/logic/programHistory";
import { scheduledDay, trainingStreak } from "../src/logic/schedule";
import { cloudState } from "../src/logic/cloud";
const base = (): AppState => ({ version: 1, completed: true, onboardingStep: 0, theme: "system",
  profile: { ...demoProfile, days: 4, trainingDays: [1, 2, 4, 5] }, preferences: emptyPreferences,
  routine: generateRoutine({ ...demoProfile, days: 4 }, emptyPreferences), history: [],
});

test("unknown legacy months never acquire missed sessions, while explicit history survives", () => {
  const state = base();
  state.routineVersions = [{ effectiveFrom: "1970-01-01", profile: state.profile, routine: state.routine }];
  state.history = [{ id: "old", dayName: "Old workout", date: "2026-05-01T12:00:00Z", minutes: 20, records: [] }];
  const migrated = ensureProgramHistory(state, new Date(2026, 8, 11));
  assert.equal(scheduledDay(migrated.profile, migrated.routine, new Date(2026, 7, 3), migrated.routineVersions), undefined);
  assert.deepEqual(migrated.history, state.history);
  assert.equal(migrated.routineVersions![0].effectiveFrom, "2026-09-11");
});

test("manual edits, regeneration and cloud round-trips retain prior days and date boundaries", () => {
  const before = ensureProgramHistory(base(), new Date(2026, 5, 1));
  // Previously ISO timestamp versions failed on their effective day.
  before.routineVersions![0].effectiveFrom = new Date(2026, 5, 1, 10).toISOString();
  assert.ok(scheduledDay(before.profile, before.routine, new Date(2026, 5, 1), before.routineVersions));
  const changedProfile = { ...before.profile, days: 5, trainingDays: [1, 2, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[] };
  const after = preserveProgramHistory(before, { ...before, profile: changedProfile, routine: generateRoutine(changedProfile, emptyPreferences) }, new Date(2026, 8, 1));
  assert.equal(scheduledDay(after.profile, after.routine, new Date(2026, 7, 26), after.routineVersions), undefined);
  const again = preserveProgramHistory(after, { ...after, routine: after.routine.map(day => ({ ...day, name: `Edited ${day.name}` })) }, new Date(2026, 8, 3));
  assert.equal(scheduledDay(again.profile, again.routine, new Date(2026, 7, 31), again.routineVersions)?.name, before.routine[0].name);
  assert.deepEqual(cloudState(again).routineVersions, again.routineVersions);
  assert.equal(again.routineVersions!.length, 3);
});

test("one missed day does not break a weekly streak while half remains achievable", () => {
  const state = base();
  const history = [7, 8].map(day => ({ id: String(day), dayId: "old-id", dayName: "Before regeneration", date: new Date(2026, 8, day, 12).toISOString(), minutes: 40, records: [] }));
  assert.equal(trainingStreak(state.profile, state.routine, history, [], [], new Date(2026, 8, 15, 12)), 1);
  assert.equal(trainingStreak(state.profile, state.routine, history, [], [], new Date(2026, 8, 19, 12)), 0);
});
