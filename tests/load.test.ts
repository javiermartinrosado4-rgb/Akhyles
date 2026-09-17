import assert from "node:assert/strict";
import test from "node:test";
import { defaultLoadInputMode, fromStoredLoad, scoreLoad, supportsPerSideInput, toStoredLoad, validBarWeight } from "../src/logic/load";

test("per-side input is always normalized to total load", () => {
  assert.equal(toStoredLoad(15, "per-side"), 30);
  assert.equal(fromStoredLoad(30, "per-side"), 15);
  assert.equal(toStoredLoad(30, "total"), 30);
  assert.equal(defaultLoadInputMode("chest-cable"), "per-side");
  assert.equal(defaultLoadInputMode("standing-cable-pec-dec"), "per-side");
  assert.equal(toStoredLoad(20, defaultLoadInputMode("chest-cable")), 40);
  assert.equal(supportsPerSideInput("leg-press"), true);
  assert.equal(supportsPerSideInput("bench-smith"), true);
  assert.equal(supportsPerSideInput("pronated-pullup"), true);
});

test("a custom bar, including zero, overrides the default without doubling", () => {
  assert.equal(scoreLoad("chest-press-free", toStoredLoad(30, "per-side"), 0), 60);
  assert.equal(scoreLoad("chest-press-free", 60, 15.5), 75.5);
  assert.equal(scoreLoad("supported-row", 60, 10), 70);
  assert.equal(validBarWeight(0), true);
  for (const value of [-1, NaN, Infinity, 101]) assert.equal(validBarWeight(value), false);
});

test("a bar is only added when the athlete enters it", () => {
  assert.equal(scoreLoad("chest-press-free", 60), 60);
  assert.equal(scoreLoad("squat-free", 60), 60);
  assert.equal(scoreLoad("deadlift-conventional", 60), 60);
  assert.equal(scoreLoad("chest-press-free", 60, 20), 80);
  assert.equal(scoreLoad("supported-row", 60), 60);
});
