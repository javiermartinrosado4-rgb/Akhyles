import { backup, DatabaseSync } from "node:sqlite";
import { mkdtemp, mkdir, chmod, unlink, rmdir, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// SQLite's online backup includes committed WAL transactions without stopping the API.
export async function snapshotDatabase(source: string, destination: string) {
  if (resolve(source) === resolve(destination)) throw new Error("La copia no puede sustituir la base activa.");
  const db = new DatabaseSync(source, { readOnly: true });
  try { await backup(db, destination); } finally { db.close(); }
  await chmod(destination, 0o600);
  verifyDatabase(destination);
}

export function verifyDatabase(path: string) {
  const db = new DatabaseSync(path, { readOnly: true });
  try {
    const rows = db.prepare("PRAGMA integrity_check").all();
    if (rows.length !== 1 || rows[0].integrity_check !== "ok" || db.prepare("PRAGMA foreign_key_check").all().length)
      throw new Error("La copia SQLite no supera la verificación.");
  } finally { db.close(); }
}

function restic(args: string[], cwd?: string) {
  const result = spawnSync("restic", args, { cwd, stdio: "pipe", timeout: 3_600_000 });
  // Do not log repository URLs, environment, credentials or file contents.
  if (result.status !== 0) throw new Error(`Restic falló en ${args[0]}. Revisa acceso y repositorio desde el host.`);
}

export async function backupToRepository() {
  if (!process.env.GYM_DATABASE || !process.env.RESTIC_REPOSITORY || !process.env.RESTIC_PASSWORD_FILE)
    throw new Error("Define GYM_DATABASE, RESTIC_REPOSITORY y RESTIC_PASSWORD_FILE.");
  const staging = resolve(process.env.GYM_BACKUP_STAGING ?? "/backup-staging");
  await mkdir(staging, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(join(staging, "snapshot-"));
  const file = join(directory, "akhyles.sqlite");
  try {
    await snapshotDatabase(process.env.GYM_DATABASE, file);
    restic(["backup", "--host", "akhyles-community", "--tag", "community", "akhyles.sqlite"], directory);
    restic(["check"]);
    // Apply retention explicitly to this application's snapshot group only.
    restic(["forget", "--host", "akhyles-community", "--tag", "community", "--group-by", "host,tags", "--keep-within", "30d", "--prune"]);
    console.log(JSON.stringify({ event: "backup_ok", at: new Date().toISOString() }));
  } finally {
    // Exact files created by this operation; never recurse over user data.
    for (const name of await readdir(directory)) {
      const target = join(directory, name);
      if ((await stat(target)).isFile()) await unlink(target);
    }
    await rmdir(directory);
  }
}
