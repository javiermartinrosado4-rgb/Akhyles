import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { createGymServer } from "../server/app";
import { rankCohort, normalizeLocation, RankingBoard } from "../src/logic/leaderboard";
import { exportProgress } from "../src/logic/sharing";
import { createDemoScenario } from "../src/data/demoScenarios";

test("ranking preserves ties, own rank beyond page, nearest higher rival and stable ordering", () => {
  const rows = Array.from({ length: 24 }, (_, i) => ({ id: String(i), handle: `person_${i}`, name: "Persona", points: 500 - i * 10, coverage: 10 }));
  rows[1].points = 500;
  const first = rankCohort(rows.reverse(), "22");
  assert.deepEqual(first.entries.slice(0, 3).map(row => row.rank), [1, 1, 3]);
  assert.equal(first.me?.rank, 23);
  assert.equal(first.nextRival?.id, "21");
  assert.equal(first.gap, 10);
  assert.equal(first.next, 20);
  assert.equal(rankCohort(rows, "22", 20).entries.length, 4);
  assert.equal(rankCohort(rows, "missing").me, null);
  assert.equal(rankCohort(rows, "0").nextRival, null);
  assert.deepEqual(rankCohort([], "0").entries, []);
  assert.equal(normalizeLocation("  MÁLAGA   Centro "), "malaga centro");
});

test("community boards filter mutual friends, normalized locations, consent and blocks without sharing private data", async () => {
  const server = createGymServer({ authLimit: 100 });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, token: string, method = "GET", data?: unknown) => {
    const response = await fetch(url + path, { method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: data ? JSON.stringify(data) : undefined });
    return { status: response.status, data: await response.json() };
  };
  try {
    const accounts = [];
    for (const handle of ["board_alice", "board_bob", "board_carla", "board_dani"]) {
      accounts.push((await call("/auth/register", "", "POST", { handle, name: handle, password: "test-password-123", level: "intermediate" })).data);
    }
    const [alice, bob, carla, dani] = accounts;
    const progress = exportProgress(createDemoScenario(false, new Date(2026, 8, 11, 12)));
    for (const [index, account] of accounts.entries()) {
      assert.equal((await call("/me", account.token, "PATCH", { name: account.user.name, bio: "", level: "intermediate", trainingPlace: index === 0 ? "  Gym   Centro " : "gym centro", city: index === 3 ? "Sevilla" : index === 0 ? "MÁLAGA" : "malaga" })).status, 200);
      assert.equal((await call("/progress/me", account.token, "PUT", { ...progress, points: 200 + index * 10 })).status, 200);
      await call("/me/privacy", account.token, "PATCH", { routinePublic: false, progressPublic: false, rankingPublic: index !== 2 });
    }
    const board = async (scope: string) => (await call(`/ranking?format=board&scope=${scope}`, alice.token)).data as RankingBoard;
    assert.equal((await board("global")).total, 3);
    assert.equal((await board("friends")).total, 1);
    await call(`/follow/${bob.user.id}`, alice.token, "PUT");
    assert.equal((await board("friends")).total, 1, "one-way follow is not friendship");
    await call(`/follow/${alice.user.id}`, bob.token, "PUT");
    assert.equal((await board("friends")).total, 2);
    assert.equal((await board("city")).total, 2);
    assert.equal((await board("gym")).total, 2, "same chain in another city is excluded");
    assert.equal((await board("global")).gap, 10);
    assert.equal((await board("global")).nextRival?.id, bob.user.id);
    const response = await board("global");
    assert.ok(!JSON.stringify(response).includes("bodyWeight"));
    assert.ok(!JSON.stringify(response).includes("workouts"));
    assert.ok(!response.entries.some(row => row.id === carla.user.id));
    assert.ok(Array.isArray((await call("/ranking", alice.token)).data), "legacy API remains an array");
    await call(`/blocks/${alice.user.id}`, bob.token, "PUT");
    assert.equal((await board("friends")).total, 1);
    assert.equal((await board("global")).total, 2);
    await call("/me/privacy", dani.token, "PATCH", { routinePublic: false, progressPublic: false, rankingPublic: false });
    assert.equal((await board("global")).total, 1);
    await call("/me", alice.token, "PATCH", { name: "Alice", bio: "", level: "intermediate" });
    assert.equal((await call("/me", alice.token)).data.city, "MÁLAGA", "omitted location is preserved");
    await call("/me", alice.token, "PATCH", { name: "Alice", bio: "", level: "intermediate", city: "", trainingPlace: "" });
    assert.equal((await board("city")).needsLocation, true);
    assert.equal((await board("gym")).total, 0);
    for (const path of ["scope=planet", "offset=-1", "offset=NaN", "offset=1.5"]) {
      assert.equal((await call(`/ranking?format=board&${path}`, alice.token)).status, 400);
    }
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
