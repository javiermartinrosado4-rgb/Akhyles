import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir, mkdtemp, writeFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { backupToRepository, verifyDatabase } from "../server/backup";

async function main() {
  await mkdir("test-results", { recursive: true });
  const directory = resolve(await mkdtemp("test-results/restic-"));
  process.env.RESTIC_REPOSITORY = join(directory, "repository");
  process.env.RESTIC_PASSWORD_FILE = join(directory, "test-password.txt");
  process.env.GYM_BACKUP_STAGING = join(directory, "staging");
  process.env.GYM_DATABASE = join(directory, "source.sqlite");
  await writeFile(process.env.RESTIC_PASSWORD_FILE, randomBytes(32).toString("hex"), { flag: "wx", mode: 0o600 });
  const db = new DatabaseSync(process.env.GYM_DATABASE);
  db.exec("PRAGMA journal_mode=WAL; CREATE TABLE accounts(id TEXT PRIMARY KEY); INSERT INTO accounts VALUES ('synthetic-account');");
  const run = (args: string[]) => {
    const result = spawnSync("restic", args, { encoding: "utf8", timeout: 120000 });
    assert.equal(result.status, 0, `Restic ${args[0]} failed: ${result.stderr}`);
    return result.stdout;
  };
  try {
    run(["init"]);
    await backupToRepository();
    run(["check", "--read-data"]);
    const snapshots = JSON.parse(run(["snapshots", "--json"]));
    assert.equal(snapshots.length, 1);
    const target = join(directory, "restored");
    run(["restore", snapshots[0].id, "--target", target]);
    const find = async (root: string): Promise<string | undefined> => {
      for (const entry of await readdir(root, { withFileTypes: true })) {
        const path = join(root, entry.name);
        if (entry.isDirectory()) { const found = await find(path); if (found) return found; }
        else if (entry.name === "akhyles.sqlite") return path;
      }
    };
    const restored = await find(target);
    assert.ok(restored);
    verifyDatabase(restored);
    const check = new DatabaseSync(restored, { readOnly: true });
    try { assert.equal(check.prepare("SELECT id FROM accounts").get()?.id, "synthetic-account"); }
    finally { check.close(); }
    assert.deepEqual(await readdir(process.env.GYM_BACKUP_STAGING), []);
    console.log("PASS: encrypted Restic backup, full data check, restore, SQLite integrity and staging cleanup (synthetic local repository).");
  } finally { db.close(); }
}
void main().catch(error => { console.error("Backup recovery test failed:", error instanceof Error ? error.message : "unknown error"); process.exitCode = 1; });
