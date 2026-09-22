import assert from "node:assert/strict";
import test from "node:test";
import { defaultLoadInputMode, effectiveExternalLoad, effectiveLiftedLoad, fromStoredLoad, scoreLoad, storedSetLoad, supportsApparatusWeight, supportsPerSideInput, toStoredLoad, validBarWeight } from "../src/logic/load";

test("per-side input is always normalized to total load", () => {
  assert.equal(toStoredLoad(15, "per-side"), 30);
  assert.equal(fromStoredLoad(30, "per-side"), 15);
  assert.equal(toStoredLoad(30, "total"), 30);
  assert.equal(defaultLoadInputMode("chest-cable"), "per-side");
  assert.equal(defaultLoadInputMode("standing-cable-pec-dec"), "per-side");
  assert.equal(toStoredLoad(20, defaultLoadInputMode("chest-cable")), 40);
  assert.equal(toStoredLoad(15, "per-side", "triceps-extension"), 15);
  assert.equal(fromStoredLoad(15, "per-side", "triceps-extension"), 15);
  assert.equal(storedSetLoad({ weight: 15, leftWeight: 15, rightWeight: 15 }, "triceps-extension"), 15);
  assert.equal(toStoredLoad(20, "per-side", "chest-cable"), 40);
  assert.equal(supportsPerSideInput("leg-press"), true);
  assert.equal(supportsPerSideInput("bench-smith"), true);
  assert.equal(supportsPerSideInput("pronated-pullup"), true);
});

test("apparatus weight is hidden for the requested isolation and ab work", () => {
  for (const id of ["chest-cable", "standing-cable-pec-dec", "pec-deck", "preacher-curl", "machine-curl", "triceps-machine", "leg-extension", "standing-curl", "seated-curl", "lying-curl", "abductor", "adductor-machine", "machine-crunch", "machine-leg-tuck", "machine-leg-raise"]) {
    assert.equal(supportsApparatusWeight(id), false, id);
  }
  assert.equal(supportsApparatusWeight("hack"), true);
  assert.equal(supportsApparatusWeight("seated-press"), true);
});

test("assisted pull-ups use body weight minus assistance and ignore machine mass", () => {
  assert.equal(effectiveExternalLoad("assisted-pullup", 25, 10), 25);
  assert.equal(effectiveLiftedLoad("assisted-pullup", 25, 80, 10), 55);
  assert.equal(effectiveLiftedLoad("assisted-pullup", 25), undefined);
});

test("asymmetric per-side records preserve a conservative bilateral load", () => {
  assert.equal(storedSetLoad({ weight: 12, leftWeight: 14, rightWeight: 12 }), 24);
  assert.equal(storedSetLoad({ weight: 28, leftWeight: 14, rightWeight: 14 }), 28);
  assert.equal(storedSetLoad({ weight: 28 }), 28);
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
