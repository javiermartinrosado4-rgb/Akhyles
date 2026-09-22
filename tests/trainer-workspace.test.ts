import assert from "node:assert/strict";
import test from "node:test";
import { attentionForClient, median } from "../src/logic/trainerWorkspace";

test("trainer dashboard metrics use a stable median and ignore unavailable values", () => {
  assert.equal(median([null, 82, undefined, 64, 76]), 76);
  assert.equal(median([50, 70]), 60);
  assert.equal(median([]), null);
});

test("trainer attention is based on training context because active collaborations have complete access", () => {
  assert.equal(attentionForClient({ adherence: 92, lastActivity: new Date().toISOString(), routineStatus: "applied" }), "on-track");
  assert.equal(attentionForClient({ adherence: 42, lastActivity: new Date().toISOString(), routineStatus: "applied" }), "needs-review");
});
