import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { createDemoScenario } from "../src/data/demoScenarios";
import { exportProgress } from "../src/logic/sharing";

const database = resolve(process.env.AKHYLES_DEMO_DATABASE ?? "server/data/akhyles.sqlite");

function main() {
  const state = createDemoScenario(true);
  const progress = exportProgress(state, true, true);
  const db = new DatabaseSync(database);
  const lucia = db.prepare("SELECT id FROM users WHERE handle = ?").get("lucia_fuerza") as { id: string } | undefined;
  const alex = db.prepare("SELECT id FROM users WHERE handle = ?").get("alex_entrena") as { id: string } | undefined;
  if (!lucia) throw new Error("No existe @lucia_fuerza en la Comunidad local.");

  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare("UPDATE users SET bio = ?, level = ? WHERE id = ?").run(
      "Dos años entrenando con Akhyles. Historial ficticio para probar gráficas, marcas y sesiones compartidas.",
      state.profile.level,
      lucia.id,
    );
    db.prepare(`INSERT INTO shared_progress (user_id, data, updated) VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`)
      .run(lucia.id, JSON.stringify(progress), progress.updated);
    db.prepare(`INSERT INTO sharing_options (user_id, details, body_weight, ranking) VALUES (?, 1, 1, 1)
      ON CONFLICT(user_id) DO UPDATE SET details = 1, body_weight = 1, ranking = 1`).run(lucia.id);
    db.prepare(`INSERT INTO community_privacy (user_id, routine_public, progress_public, progress_visibility) VALUES (?, 1, 1, 'friends')
      ON CONFLICT(user_id) DO UPDATE SET routine_public = 1, progress_public = 1, progress_visibility = 'friends'`).run(lucia.id);
    if (alex) {
      db.prepare("INSERT OR IGNORE INTO follows (user_id, followed_id) VALUES (?, ?)").run(alex.id, lucia.id);
      db.prepare("INSERT OR IGNORE INTO follows (user_id, followed_id) VALUES (?, ?)").run(lucia.id, alex.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  } finally {
    db.close();
  }

  console.log(JSON.stringify({
    handle: "lucia_fuerza",
    sessions: progress.sessions,
    sharedWorkouts: progress.workouts?.length ?? 0,
    pointsMeasurements: progress.pointsHistory?.length ?? 0,
    bodyWeightMeasurements: progress.bodyWeights?.length ?? 0,
    from: progress.workouts?.[0]?.date,
    to: progress.workouts?.at(-1)?.date,
    connectedToAlex: !!alex,
  }));
}

try { main(); }
catch (error) { console.error(error instanceof Error ? error.message : error); process.exit(1); }
