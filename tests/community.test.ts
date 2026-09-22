import test from "node:test";
import assert from "node:assert/strict";
import { AddressInfo } from "node:net";
import { mkdirSync } from "node:fs";
import { createHmac, randomUUID } from "node:crypto";
import sharp from "sharp";
import { request as httpRequest } from "node:http";
import { createGymServer } from "../server/app";
import { compareProgress, comparisonSample, ComparisonSample } from "../src/logic/comparison";
import { demoProfile, emptyPreferences } from "../src/data/options";
import { generateRoutine } from "../src/logic/routine";
import { startWorkout } from "../src/logic/workout";
import { createDemoScenario } from "../src/data/demoScenarios";
import { exportProgress, isSharedProgress, isSharedRoutine } from "../src/logic/sharing";

const DAY = 86_400_000;
const now = Date.now();
const sample = (growth = 10, level: ComparisonSample["level"] = "intermediate", id = "dumbbell-curl"): ComparisonSample => ({ level, records: [
  { exerciseId: id, date: new Date(now - 14 * DAY).toISOString(), strength: 10 },
  { exerciseId: id, date: new Date(now - 1000).toISOString(), strength: 10 * (1 + growth / 100) },
] });

test("community comparison controls level, exercise cohort, recency, self-exclusion and minimum sample", () => {
  const own = sample(10);
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(10)), now).status, "average");
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(5)), now).status, "faster");
  assert.equal(compareProgress(own, Array.from({ length: 5 }, () => sample(15)), now).status, "slower");
  assert.equal(compareProgress(own, Array.from({ length: 4 }, () => sample()), now).status, "insufficient");
  assert.equal(compareProgress(own, [sample(10, "beginner"), sample(10, "advanced"), sample(10, "intermediate", "lateral-dumbbell")], now).peers, 0);
  const stale = { ...own, records: own.records.map(r => ({ ...r, date: new Date(Date.parse(r.date) - 10 * DAY).toISOString() })) };
  assert.equal(compareProgress(stale, [own], now).rate, null);
  const short = { ...own, records: own.records.map(r => ({ ...r, date: new Date(now - DAY).toISOString() })) };
  assert.equal(compareProgress(short, [own], now).rate, null);
  assert.equal(compareProgress({ ...own, records: [...own.records, ...own.records] }, Array.from({ length: 5 }, () => own), now).exercises, 1);
});

test("comparison export ignores unapproved machines and sends no personal measurements", () => {
  const record = (id: string) => ({ prescription: { id, exerciseId: id, sets: 2, range: [6, 8] as [number, number], weight: 10 }, name: id, type: "isolation" as const, sets: [{ weight: 10, reps: 8 }, { weight: 15, reps: 20 }] });
  const value = comparisonSample({ version: 1, profile: demoProfile, completed: true, onboardingStep: 0, theme: "system", preferences: emptyPreferences, routine: [], history: [{ id: "one", level: "intermediate", dayName: "Uno", bodyWeight: 80, date: new Date(now - 1000).toISOString(), minutes: 40, records: [record("dumbbell-curl"), record("supported-row")] }] }, now);
  assert.equal(value.records.length, 1);
  assert.equal(value.records[0].exerciseId, "dumbbell-curl");
  assert.ok(value.records[0].strength < 15);
  assert.deepEqual(Object.keys(value).sort(), ["level", "records"]);
  assert.deepEqual(Object.keys(value.records[0]).sort(), ["date", "exerciseId", "strength"]);
});

test("new workouts keep their starting level and old or other-level sessions do not change cohorts", () => {
  const day = generateRoutine(demoProfile, emptyPreferences)[0];
  assert.equal(startWorkout(day, "75", "beginner").level, "beginner");
  const exported = comparisonSample({ version: 1, profile: demoProfile, completed: true, onboardingStep: 0, theme: "system", preferences: emptyPreferences, routine: [], history: [undefined, "beginner", "intermediate"].map((level, i) => ({
    id: String(i), level: level as "beginner" | "intermediate" | undefined, dayName: "Uno", date: new Date(now - 1000).toISOString(), minutes: 40,
    records: [{ name: "Curl", type: "isolation", prescription: { id: "curl", exerciseId: "dumbbell-curl", sets: 2, range: [8, 10], weight: 10 }, sets: [{ weight: 10, reps: 10 }] }],
  })) }, now);
  assert.equal(exported.records.length, 1);
});

async function fixture(database?: string) {
  const server = createGymServer({ database, authLimit: 100, accountFederationSecret: Buffer.alloc(32, 7).toString("base64") });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, method = "GET", data?: unknown, token?: string) => {
    const res = await fetch(url + path, { method, headers: { ...(data ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
    return { status: res.status, data: await res.json() };
  };
  const register = async (handle: string) => (await call("/auth/register", "POST", { handle, name: "Persona de prueba", password: "test-password-123", level: "intermediate" })).data;
  const close = () => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return { server, url, call, register, close };
}

test("an Akhyles account creates and reuses one Community identity without a second password", async () => {
  const f = await fixture();
  try {
    const secret = Buffer.alloc(32, 7).toString("base64");
    const accountId = "a".repeat(32);
    const body = Buffer.from(JSON.stringify({ sub: accountId, name: "Cuenta principal", iss: "akhyles-accounts", aud: "akhyles-community", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300 })).toString("base64url");
    const assertion = `${body}.${createHmac("sha256", Buffer.from(secret, "base64")).update(body).digest("base64url")}`;
    const first = await f.call("/auth/akhyles", "POST", { assertion, level: "intermediate" });
    assert.equal(first.status, 200);
    assert.equal(first.data.user.name, "Cuenta principal");
    const second = await f.call("/auth/akhyles", "POST", { assertion, level: "beginner" });
    assert.equal(second.status, 200);
    assert.equal(second.data.user.id, first.data.user.id);
    assert.equal((await f.call("/me", "GET", undefined, second.data.token)).data.handle, first.data.user.handle);
  } finally { await f.close(); }
});

test("custom exercises enter a private pending review queue", async () => {
  const f = await fixture();
  try {
    const athlete = await f.register("exercise_proposer");
    const proposal = { name: "Remo con toalla", muscle: "back", secondary: ["biceps"], type: "compound", variant: "bodyweight", range: [8, 12] };
    const created = await f.call("/exercise-proposals", "POST", proposal, athlete.token);
    assert.equal(created.status, 201);
    assert.equal(created.data.status, "pending");
    const mine = await f.call("/exercise-proposals/me", "GET", undefined, athlete.token);
    assert.equal(mine.status, 200);
    assert.deepEqual(mine.data[0].range, [8, 12]);
    assert.equal((await f.call("/admin/exercise-proposals", "GET", undefined, athlete.token)).status, 403);
  } finally { await f.close(); }
});

test("trainer profiles remain available while profile comments are retired", async () => {
  const f = await fixture();
  try {
    const trainer = await f.register("profile_trainer"), athlete = await f.register("profile_athlete");
    await f.call("/me", "PATCH", { name: "Entrenador", bio: "", level: "intermediate", trainerEnabled: true }, trainer.token);
    const saved = await f.call("/me/trainer-profile", "PUT", { public: true, specialties: ["Hipertrofia"], modalities: ["Online"], experienceYears: 4, credentials: "Certificación", availability: "Plazas abiertas", pricing: "Consulta", statsPublic: true }, trainer.token);
    assert.equal(saved.status, 200);
    assert.equal((await f.call(`/profiles/${trainer.user.id}/trainer`, "GET", undefined, athlete.token)).data.specialties[0], "Hipertrofia");
    assert.equal((await f.call(`/profiles/${trainer.user.id}/comments`, "GET", undefined, athlete.token)).status, 410);
  } finally { await f.close(); }
});

test("achievements use symbolic load milestones instead of every personal best", async () => {
  const f = await fixture();
  try {
    const athlete = await f.register("achievement_athlete"), friend = await f.register("achievement_friend");
    await f.call("/me/privacy", "PATCH", { trainingVisibility: "public" }, athlete.token);
    const initial = { version: 1, sessions: 1, sets: 3, points: 95, pointsModel: "akhyles-relative-v3", pointsCoverage: 1, pointsReliability: 20, pointsRankingEligible: true, updated: new Date().toISOString(), exercises: [{ id: "chest-press-free", name: "Press de banca", weight: 90, reps: 5, maximum: 102, date: new Date().toISOString() }] };
    assert.equal((await f.call("/progress/me", "PUT", initial, athlete.token)).status, 200);
    const improved = { ...initial, points: 110, updated: new Date(Date.now() + 1000).toISOString(), exercises: [{ ...initial.exercises[0], weight: 100, maximum: 114, date: new Date(Date.now() + 1000).toISOString() }] };
    assert.equal((await f.call("/progress/me", "PUT", improved, athlete.token)).status, 200);
    const page = await f.call(`/achievements?user=${athlete.user.id}`, "GET", undefined, athlete.token);
    assert.equal(page.status, 200); assert.equal(page.data.achievements.length, 2);
    assert.ok(page.data.achievements.some((achievement: { type: string; tierId?: string }) => achievement.type === "tier" && achievement.tierId === "demigod"));
    const personalBest = page.data.achievements.find((achievement: { type: string }) => achievement.type === "personal_best");
    assert.equal(personalBest.kind, "personal_best");
    assert.equal(personalBest.details.milestone, 100);
    assert.equal((await f.call(`/achievements/${personalBest.id}/like`, "PUT", undefined, friend.token)).status, 200);
    assert.ok((await f.call("/notifications", "GET", undefined, athlete.token)).data.some((notification: { type: string }) => notification.type.startsWith("achievement_like:")));
    assert.equal((await f.call("/me/notification-preferences", "PATCH", { achievementLikes: false }, athlete.token)).data.achievementLikes, false);
    await f.call(`/achievements/${personalBest.id}/like`, "DELETE", undefined, friend.token);
    await f.call(`/achievements/${personalBest.id}/like`, "PUT", undefined, friend.token);
    assert.equal((await f.call("/notifications", "GET", undefined, athlete.token)).data.filter((notification: { type: string }) => notification.type.startsWith("achievement_like:")).length, 1);
    await f.call("/me/privacy", "PATCH", { trainingVisibility: "private" }, athlete.token);
    assert.equal((await f.call(`/achievements?user=${athlete.user.id}`, "GET", undefined, athlete.token)).data.achievements.length, 2);
    assert.equal((await f.call(`/achievements?user=${athlete.user.id}`, "GET", undefined, friend.token)).data.achievements.length, 0);
    assert.equal((await f.call("/posts", "POST", {}, athlete.token)).status, 410);
    assert.equal((await f.call(`/profiles/${athlete.user.id}/comments`, "GET", undefined, friend.token)).status, 410);
  } finally { await f.close(); }
});

test("revoking coaching or a session rejects an already streaming write", async () => {
  const f = await fixture();
  try {
    const client = await f.register("audit_client"), trainer = await f.register("audit_trainer");
    await f.call("/me", "PATCH", { name: "Trainer", bio: "", level: "intermediate", trainerEnabled: true }, trainer.token);
    const relationship = (await f.call("/coaching/requests", "POST", { targetId: trainer.user.id }, client.token)).data;
    await f.call(`/coaching/${relationship.id}`, "PATCH", { action: "accept" }, trainer.token);
    const routine = { version: 1, days: [{ name: "Torso", exercises: [{ exerciseId: "chest-press", name: "Press", sets: 2, range: [8, 10] }] }], customExercises: [] };
    await f.call("/coaching/routine/me", "PUT", routine, client.token);
    for (const revokeSession of [false, true]) {
      const path = revokeSession ? "/routines/me" : `/coaching/${relationship.id}/routine`;
      const payload = JSON.stringify(revokeSession ? routine : { routine, revision: 1 });
      let finish!: () => void;
      let started!: () => void;
      const received = new Promise<void>(resolve => { started = resolve; });
      const observe = () => { started(); };
      f.server.once("request", observe);
      const response = new Promise<number>((resolve, reject) => {
        const req = httpRequest(f.url + path, { method: "PUT", headers: { Authorization: `Bearer ${trainer.token}`, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } }, res => {
          res.resume(); res.on("end", () => resolve(res.statusCode!));
        });
        req.on("error", reject); req.write(payload.slice(0, -1)); finish = () => req.end(payload.slice(-1));
      });
      await received;
      if (revokeSession) await f.call("/auth/logout", "POST", undefined, trainer.token);
      else await f.call(`/coaching/${relationship.id}`, "PATCH", { action: "revoke" }, client.token);
      finish();
      assert.equal(await response, revokeSession ? 401 : 404);
    }
  } finally { await f.close(); }
});

test("achievement pagination rejects fractional offsets as invalid input", async () => {
  const f = await fixture();
  try {
    const user = await f.register("audit_pagination");
    assert.equal((await f.call("/achievements?offset=1.5", "GET", undefined, user.token)).status, 400);
  } finally { await f.close(); }
});

test("gym catalogue reuses normalized entries and profiles store the canonical gym id", async () => {
  const f = await fixture();
  try {
    const alex = await f.register("gym_alex");
    const first = await f.call("/gyms", "POST", { name: "  Fit Factory Centro ", city: "Malaga" }, alex.token);
    const duplicate = await f.call("/gyms", "POST", { name: "fit-factory centro", city: "malaga" }, alex.token);
    assert.equal(first.status, 201);
    assert.equal(duplicate.status, 200);
    assert.equal(duplicate.data.id, first.data.id);
    assert.equal((await f.call("/me", "PATCH", { name: "Alex", bio: "", level: "intermediate", trainingPlace: first.data.name, city: first.data.city, gymId: first.data.id }, alex.token)).data.gymId, first.data.id);
    const search = await f.call("/gyms?q=factory&city=malaga", "GET", undefined, alex.token);
    assert.equal(search.data.length, 1);
    assert.equal(search.data[0].id, first.data.id);
  } finally { await f.close(); }
});

test("profile follower and following lists expose the correct public people", async () => {
  const f = await fixture();
  try {
    const alex = await f.register("list_alex"), lucia = await f.register("list_lucia"), sara = await f.register("list_sara");
    await f.call(`/follow/${lucia.user.id}`, "PUT", undefined, alex.token);
    await f.call(`/follow/${alex.user.id}`, "PUT", undefined, lucia.token);
    await f.call(`/follow/${alex.user.id}`, "PUT", undefined, sara.token);
    const following = await f.call(`/profiles/${alex.user.id}/following`, "GET", undefined, alex.token);
    const followers = await f.call(`/profiles/${alex.user.id}/followers`, "GET", undefined, alex.token);
    assert.deepEqual(following.data.map((person: { handle: string }) => person.handle), ["list_lucia"]);
    assert.deepEqual(followers.data.map((person: { handle: string }) => person.handle), ["list_lucia", "list_sara"]);
  } finally { await f.close(); }
});

test("detailed histories, measurements and ranking require opt-in and blocking revokes access", async () => {
  const f = await fixture();
  try {
    const alice = await f.register("history_alice"), bob = await f.register("history_bob"), outsider = await f.register("outsider");
    const state = createDemoScenario(true, new Date(2026, 8, 11, 12));
    assert.ok(state.history.length > 350);
    assert.ok(Date.parse(state.history.at(-1)!.date) - Date.parse(state.history[0].date) > 720 * 24 * 60 * 60 * 1000);
    const compact = exportProgress(state);
    assert.equal(compact.workouts, undefined);
    assert.equal(compact.bodyWeights, undefined);
    const detailed = exportProgress(state, true, true);
    assert.equal(detailed.workouts!.length, 180);
    assert.equal(detailed.workouts![0].date, state.history[0].date);
    assert.equal(detailed.workouts!.at(-1)!.date, state.history.at(-1)!.date);
    assert.equal(isSharedProgress(detailed), true);
    assert.equal(JSON.stringify(detailed.workouts).includes("bodyWeight"), false);
    assert.equal(isSharedProgress({ ...detailed, cloud: { owner: "secret" } }), false);
    assert.equal(isSharedProgress({ ...detailed, workouts: [{ ...detailed.workouts![0], exercises: [{ id: "x", name: "X", sets: [{ weight: -1, reps: 4 }] }] }] }), false);
    assert.equal(isSharedRoutine({ version: 1, days: [{ name: "Invalid", exercises: [{ sets: 99 }] }], customExercises: [] }), false);
    assert.equal((await f.call("/progress/me", "PUT", detailed, alice.token)).status, 200);
    await f.call(`/follow/${alice.user.id}`, "PUT", undefined, bob.token);
    await f.call(`/follow/${bob.user.id}`, "PUT", undefined, alice.token);
    await f.call("/me/privacy", "PATCH", { routinePublic: false, progressPublic: true }, alice.token);
    let shared = (await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).data;
    assert.equal(shared.workouts, undefined);
    assert.equal(shared.bodyWeights, undefined);
    assert.equal((await f.call("/ranking", "GET", undefined, bob.token)).data.length, 0);
    await f.call("/me/privacy", "PATCH", { routinePublic: false, progressPublic: true, detailsPublic: true, rankingPublic: true }, alice.token);
    shared = (await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).data;
    assert.equal(shared.workouts.length, detailed.workouts!.length);
    assert.ok(shared.pointsHistory.length);
    assert.equal(shared.bodyWeights, undefined);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, outsider.token)).status, 403);
    assert.equal((await f.call("/ranking", "GET", undefined, bob.token)).data[0].id, alice.user.id);
    assert.equal((await f.call("/connections", "GET", undefined, bob.token)).data[0].connected, true);
    await f.call("/me/privacy", "PATCH", { routinePublic: false, progressPublic: true, bodyWeightPublic: true }, alice.token);
    assert.ok((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).data.bodyWeights.length);
    await f.call(`/blocks/${alice.user.id}`, "PUT", undefined, bob.token);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).status, 404);
    assert.equal((await f.call(`/profiles/${bob.user.id}`, "GET", undefined, alice.token)).status, 404);
    assert.equal((await f.call("/ranking", "GET", undefined, bob.token)).data.length, 0);
    assert.equal((await f.call(`/follow/${bob.user.id}`, "PUT", undefined, alice.token)).status, 400);
    await f.call(`/blocks/${alice.user.id}`, "DELETE", undefined, bob.token);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).status, 403);
    assert.equal((await f.call("/profile-reports", "POST", { userId: alice.user.id, reason: "Prueba local" }, bob.token)).status, 200);
  } finally { await f.close(); }
});

test.skip("two real accounts publish, follow, like, report and enforce ownership and sessions", async () => {
  const f = await fixture();
  try {
    const alice = await f.register("alice"), bob = await f.register("bob");
    assert.equal((await f.call("/me")).status, 401);
    assert.equal((await f.call("/auth/login", "POST", { handle: "alice", password: "wrong-password" })).status, 401);
    assert.equal((await f.call("/auth/register", "POST", { handle: "ALICE", name: "Otra", password: "test-password-123", level: "beginner" })).status, 409);
    const image = await sharp({ create: { width: 32, height: 32, channels: 3, background: "#456351" } }).png().toBuffer();
    const created = await f.call("/posts", "POST", { photo: `data:image/png;base64,${image.toString("base64")}`, caption: "Primer entrenamiento" }, alice.token);
    assert.equal(created.status, 201);
    const id = created.data.id;
    const photo = await fetch(`${f.url}/photos/${id}`);
    assert.equal(photo.headers.get("content-type"), "image/jpeg");
    const metadata = await sharp(Buffer.from(await photo.arrayBuffer())).metadata();
    assert.equal(metadata.width, 32); assert.equal(metadata.exif, undefined);
    assert.equal((await f.call(`/posts/${id}`, "DELETE", undefined, bob.token)).status, 404);
    assert.equal((await f.call(`/follow/${alice.user.id}`, "PUT", undefined, bob.token)).data.followers, 1);
    assert.equal((await f.call("/posts?following=1", "GET", undefined, bob.token)).data.posts.length, 1);
    await f.call(`/posts/${id}/like`, "PUT", undefined, bob.token);
    await f.call(`/posts/${id}/like`, "PUT", undefined, bob.token);
    assert.equal((await f.call("/posts", "GET", undefined, alice.token)).data.posts[0].likes, 1);
    await f.call("/reports", "POST", { postId: id, reason: "Prueba de denuncia" }, bob.token);
    assert.equal((await f.call("/posts", "GET", undefined, bob.token)).data.posts.length, 0);
    assert.equal((await f.call("/posts", "GET", undefined, alice.token)).data.posts.length, 1);
    assert.equal((await f.call("/posts", "POST", { photo: "data:image/png;base64,YWJj", caption: "Inválida" }, alice.token)).status, 400);
    assert.equal((await f.call(`/posts/${id}`, "DELETE", undefined, alice.token)).status, 200);
    assert.equal((await fetch(`${f.url}/photos/${id}`)).status, 404);
    const fresh = await f.call("/auth/login", "POST", { handle: "alice", password: "test-password-123" });
    assert.equal(fresh.status, 200);
    await f.call("/auth/logout", "POST", undefined, fresh.data.token);
    assert.equal((await f.call("/me", "GET", undefined, fresh.data.token)).status, 401);
    const cors = await fetch(`${f.url}/health`, { headers: { Origin: "https://other.example" } });
    assert.equal(cors.status, 403);
  } finally { await f.close(); }
});

test("deleting a Community account removes its server data but not device data", async () => {
  const f = await fixture();
  try {
    const member = await f.register("erase_me");
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#456351" } }).png().toBuffer();
    assert.equal((await f.call("/posts", "POST", { photo: `data:image/png;base64,${image.toString("base64")}`, caption: "Para borrar" }, member.token)).status, 410);
    assert.equal((await f.call("/me", "DELETE", undefined, member.token)).status, 200);
    assert.equal((await f.call("/me", "GET", undefined, member.token)).status, 401);
    assert.equal((await f.call("/auth/login", "POST", { handle: "erase_me", password: "test-password-123" })).status, 401);
  } finally { await f.close(); }
});

test("server comparison uses distinct accounts and supports withdrawing records", async () => {
  const f = await fixture();
  try {
    const own = await f.register("self");
    assert.equal((await f.call("/comparison", "POST", sample(10), own.token)).data.status, "insufficient");
    for (let i = 0; i < 5; i++) {
      const peer = await f.register(`peer_${i}`);
      await f.call("/comparison", "POST", sample(5), peer.token);
    }
    const compared = (await f.call("/comparison", "POST", sample(10), own.token)).data;
    assert.equal(compared.peers, 5); assert.equal(compared.status, "faster");
    const withdrawn = await f.call("/comparison", "DELETE", undefined, own.token);
    assert.equal(withdrawn.status, 200);
    const peer = await f.call("/auth/login", "POST", { handle: "peer_0", password: "test-password-123" });
    assert.equal((await f.call("/comparison", "POST", sample(5), peer.data.token)).data.peers, 4);
    assert.equal((await f.call("/comparison", "POST", { level: "other", records: [] }, own.token)).status, 400);
  } finally { await f.close(); }
});

test.skip("community account and profile persist when the server restarts", async () => {
  mkdirSync("test-results", { recursive: true });
  const database = `test-results/community-${randomUUID()}.sqlite`;
  const first = await fixture(database);
  let token: string;
  let postId: string;
  try {
    const person = await first.register("persistent"); token = person.token;
    await first.call("/me", "PATCH", { name: "Persistente", bio: "Cada sesión suma", level: "advanced" }, token);
    const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#456351" } }).png().toBuffer();
    postId = (await first.call("/posts", "POST", { caption: "Foto persistente", photo: `data:image/png;base64,${image.toString("base64")}` }, token)).data.id;
  } finally { await first.close(); }
  const second = await fixture(database);
  try {
    const profile = await second.call("/me", "GET", undefined, token!);
    assert.equal(profile.data.name, "Persistente"); assert.equal(profile.data.bio, "Cada sesión suma");
    assert.equal((await second.call("/posts", "GET", undefined, token!)).data.posts[0].id, postId!);
    assert.equal((await fetch(`${second.url}/photos/${postId!}`)).status, 200);
  } finally { await second.close(); }
});

test("routine and progress sharing require opt-in and a mutual follow", async () => {
  const f = await fixture();
  try {
    const alice = await f.register("coach"), bob = await f.register("friend");
    const routine = {
      version: 1,
      days: [{ name: "Torso A", exercises: [{ exerciseId: "supported-row", name: "Remo Sentado Pecho Apoyado", sets: 2, range: [8, 10], note: "Pecho pegado al apoyo" }] }],
      customExercises: [],
    };
    const created = await f.call("/routines/me", "PUT", routine, alice.token);
    assert.equal(created.status, 200);
    // A direct link is not public by default and a one-way follow is insufficient.
    assert.equal((await f.call(`/routines/${created.data.id}`)).status, 401);
    await f.call(`/follow/${alice.user.id}`, "PUT", undefined, bob.token);
    assert.equal((await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token)).status, 403);
    await f.call(`/follow/${bob.user.id}`, "PUT", undefined, alice.token);
    await f.call("/me/privacy", "PATCH", { routinePublic: true, progressPublic: true }, alice.token);
    const publicRoutine = await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token);
    assert.equal(publicRoutine.status, 200);
    assert.equal(publicRoutine.data.owner.handle, "coach");
    assert.equal(publicRoutine.data.routine.days[0].exercises[0].note, "Pecho pegado al apoyo");
    assert.equal(JSON.stringify(publicRoutine.data).includes("weight"), false);
    const profile = await f.call(`/profiles/${alice.user.id}`, "GET", undefined, bob.token);
    assert.equal(profile.data.routineId, created.data.id);
    assert.equal(profile.data.progressVisible, true);
    const progress = { version: 1, sessions: 12, sets: 96, updated: "2026-09-08T10:00:00.000Z", exercises: [{ id: "supported-row", name: "Remo Sentado Pecho Apoyado", weight: 55, reps: 10, date: "2026-09-08T10:00:00.000Z" }] };
    assert.equal((await f.call("/progress/me", "PUT", progress, alice.token)).status, 200);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).data.exercises[0].weight, 55);
    await f.call("/me/privacy", "PATCH", { routinePublic: false, progressPublic: false }, alice.token);
    assert.equal((await f.call(`/routines/${created.data.id}`, "GET", undefined, bob.token)).status, 403);
    assert.equal((await f.call(`/profiles/${alice.user.id}/progress`, "GET", undefined, bob.token)).status, 403);
    assert.equal((await f.call("/routines/me", "PUT", { ...routine, days: [] }, alice.token)).status, 400);
  } finally { await f.close(); }
});

test("coaching requires consent, isolates managed routines and prevents stale trainer writes", async () => {
  const f = await fixture();
  try {
    const trainer = await f.register("trainer"), athlete = await f.register("athlete"), outsider = await f.register("outside");
    await f.call("/me", "PATCH", { name: "Trainer", bio: "", level: "intermediate", trainerEnabled: true }, trainer.token);
    const requested = await f.call("/coaching/requests", "POST", { targetId: trainer.user.id }, athlete.token);
    assert.equal(requested.status, 201);
    assert.equal((await f.call(`/coaching/${requested.data.id}`, "PATCH", { action: "accept" }, trainer.token)).data.status, "active");
    const routine = { version: 1, days: [{ name: "Torso", exercises: [{ exerciseId: "supported-row", name: "Remo", sets: 3, range: [8, 10] }] }], customExercises: [] };
    assert.equal((await f.call("/coaching/routine/me", "PUT", routine, athlete.token)).status, 200);
    const managed = await f.call(`/coaching/${requested.data.id}/routine`, "GET", undefined, trainer.token);
    assert.equal(managed.data.routine.days[0].exercises[0].sets, 3);
    assert.equal((await f.call(`/coaching/${requested.data.id}/routine`, "GET", undefined, outsider.token)).status, 404);
    const saved = await f.call(`/coaching/${requested.data.id}/routine`, "PUT", { routine: { ...routine, days: [{ ...routine.days[0], exercises: [{ ...routine.days[0].exercises[0], sets: 4 }] }] }, revision: managed.data.revision }, trainer.token);
    assert.equal(saved.status, 200);
    assert.equal((await f.call(`/coaching/${requested.data.id}/routine`, "PUT", { routine, revision: managed.data.revision }, trainer.token)).status, 409);
    assert.equal((await f.call(`/coaching/${requested.data.id}`, "PATCH", { action: "revoke" }, athlete.token)).status, 200);
    assert.equal((await f.call(`/coaching/${requested.data.id}/routine`, "GET", undefined, trainer.token)).status, 404);
  } finally { await f.close(); }
});
