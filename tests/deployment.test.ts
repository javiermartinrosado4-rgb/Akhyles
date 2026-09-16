import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AddressInfo } from "node:net";
import { serverConfig } from "../server/config";
import { snapshotDatabase, verifyDatabase } from "../server/backup";
import { createGymServer } from "../server/app";
import { requirePublicHttps, resolveCommunityUrl } from "../src/logic/endpoints";

test("production rejects local, cleartext, credentials, IP obfuscation and fallback endpoints", () => {
  for (const url of ["http://api.akhyles.app", "https://localhost", "https://localhost.", "https://foo.localhost", "https://127.1", "https://2130706433", "https://0x7f000001", "https://[::1]", "https://10.0.2.2", "https://192.168.1.1", "https://api.local", "https://api.internal", "https://api.example.com", "https://user:secret@api.akhyles.app", "https://api.akhyles.app?token=x", "https://api.akhyles.app#x"]) {
    assert.throws(() => requirePublicHttps(url), url);
    assert.throws(() => resolveCommunityUrl(url, undefined, undefined, true), url);
  }
  assert.equal(resolveCommunityUrl(undefined, "http://localhost:8081", "10.0.2.2", true), "");
  assert.equal(resolveCommunityUrl("https://api.akhyles.app/", undefined, undefined, true), "https://api.akhyles.app");
});

test("production environment fails closed and supports native-only CORS", () => {
  const env: NodeJS.ProcessEnv = { NODE_ENV: "production", GYM_DATABASE: resolve("test-results/production.sqlite"), GYM_ALLOWED_ORIGINS: "" };
  assert.deepEqual(serverConfig(env).origins, []);
  assert.throws(() => serverConfig({ ...env, GYM_DATABASE: ":memory:" }));
  assert.throws(() => serverConfig({ ...env, GYM_DATABASE: "relative.sqlite" }));
  assert.throws(() => serverConfig({ ...env, GYM_ALLOWED_ORIGINS: undefined }));
  for (const origin of ["*", "http://localhost:8081", "https://app.akhyles.app/", "https://app.akhyles.app/path"]) {
    assert.throws(() => serverConfig({ ...env, GYM_ALLOWED_ORIGINS: origin }));
  }
  assert.throws(() => serverConfig({ ...env, GYM_API_PORT: "NaN" }));
  assert.throws(() => serverConfig({ ...env, GYM_GOOGLE_CLIENT_ID: "secret" }));
});

test("online backup restores committed WAL data and does not include later writes", async () => {
  await mkdir("test-results", { recursive: true });
  const directory = await mkdtemp("test-results/backup-");
  const source = join(directory, "source.sqlite"), target = join(directory, "restored.sqlite");
  const db = new DatabaseSync(source);
  try {
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE photos(id TEXT PRIMARY KEY, photo BLOB); INSERT INTO photos VALUES ('first', X'010203');");
    await snapshotDatabase(source, target);
    db.exec("INSERT INTO photos VALUES ('later', X'040506');");
    const restored = new DatabaseSync(target, { readOnly: true });
    try {
      const rows = restored.prepare("SELECT * FROM photos").all();
      assert.equal(rows.length, 1);
      assert.equal(rows[0].id, "first");
      assert.deepEqual(Array.from(rows[0].photo as Uint8Array), [1, 2, 3]);
    } finally { restored.close(); }
    verifyDatabase(target);
    await assert.rejects(snapshotDatabase(source, source));
  } finally { db.close(); }
});

test("proxy rate limits use overwritten client IP, while direct clients cannot spoof it", async () => {
  for (const trustProxy of [false, true]) {
    const server = createGymServer({ trustProxy, authLimit: 1, origins: [] });
    await new Promise<void>(r => server.listen(0, "127.0.0.1", r));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const request = (ip: string) => fetch(url + "/auth/google/config", { headers: { "X-Forwarded-For": ip } });
      assert.equal((await request("203.0.113.1")).status, 200);
      const limited = await request("203.0.113.1");
      assert.equal(limited.status, 429);
      assert.equal(limited.headers.get("retry-after"), "900");
      assert.equal((await request("203.0.113.2")).status, trustProxy ? 200 : 429);
      assert.equal((await fetch(url + "/health", { headers: { Origin: "https://evil.invalid" } })).status, 403);
      const health = await fetch(url + "/health");
      assert.equal(health.status, 200);
      assert.ok(health.headers.get("x-request-id"));
    } finally { await new Promise<void>(r => server.close(() => r())); }
  }
});
