import assert from "node:assert/strict";
import test from "node:test";
import { emptyPreferences, emptyProfile } from "../src/data/options";
import { personalExport } from "../src/logic/personalExport";

test("personal export contains training data but no token or device metadata", () => {
  const exported = JSON.parse(personalExport({
    version: 1, completed: true, onboardingStep: 3, theme: "system", profile: emptyProfile, preferences: emptyPreferences,
    routine: [], history: [{ id: "workout", dayName: "Torso", date: "2026-09-21", minutes: 40, records: [] }],
    cloud: { owner: "private-owner", revision: 3, base: "private-snapshot" }, signedOut: false,
    weightReminderNotificationId: "device-only", trainingReminderNotificationIds: ["device-only"],
  }));
  assert.equal(exported.format, "akhyles-personal-export");
  assert.equal(exported.data.history[0].id, "workout");
  assert.equal("cloud" in exported.data, false);
  assert.equal("weightReminderNotificationId" in exported.data, false);
  assert.equal("trainingReminderNotificationIds" in exported.data, false);
});
