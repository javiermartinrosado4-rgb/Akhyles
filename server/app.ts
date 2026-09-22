import { normalizeLocation, rankCohort, RankingScope } from "../src/logic/leaderboard";
import { createServer, IncomingMessage } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { isIP } from "node:net";
import sharp from "sharp";
import { googleVerifier } from "./google";
import { validAvatar, validAvatarPhoto } from "../src/data/avatars";
import { comparableIds, compareProgress, ComparisonSample } from "../src/logic/comparison";
import { isSharedProgress, isSharedRoutine } from "../src/logic/sharing";
import { POINTS_MODEL } from "../src/logic/strengthScore";
import { pointsTiers } from "../src/logic/achievements";
import { INITIAL_GYM_CHAINS } from "../src/data/gymChains";

const derive = promisify(scrypt);
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
function fail(status: number, message: string): never { throw new ApiError(status, message); }
const str = (value: unknown, max: number) => typeof value === "string" && value.length <= max ? value.trim() : fail(400, "Revisa los campos del formulario.");
const validExerciseId = (value: string) => /^[\w-]{1,80}$/.test(value) && !["__proto__", "constructor", "prototype"].includes(value);
const validLevel = (level: unknown) => ["beginner", "intermediate", "advanced"].includes(String(level));
interface User { id: string; account_id?: string | null; handle: string; name: string; bio: string; level: string; salt: string; password: string; training_place?: string; city?: string; gym_id?: string | null; trainer_enabled?: number }
interface Gym { id: string; provider: string; provider_place_id?: string | null; name: string; normalized_name: string; address: string; city: string; normalized_city: string; province: string; normalized_province: string; status: string }
interface GymChain { id: string; name: string; sort_order: number; status: string }
const normalizeGym = (value = "") => normalizeLocation(value).replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const requestGuards = new WeakMap<IncomingMessage, () => void>();

async function body(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json")) fail(415, "Se requiere JSON.");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Every route shares this reader; keep its hard ceiling aligned with the
    // published photo limit so oversized uploads cannot consume extra memory.
    if (size > 3_000_000) fail(413, "La fotografía es demasiado grande (máximo 2 MB para el perfil).");
    chunks.push(chunk);
  }
  // Authentication may have been revoked while the request body was arriving.
  requestGuards.get(req)?.();
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) fail(400, "Datos no válidos.");
    return parsed as Record<string, unknown>;
  } catch { return fail(400, "No se han podido leer los datos."); }
}

export function createGymServer({ database = ":memory:", origins = ["http://localhost:8081", "http://127.0.0.1:8081"], authLimit = 20, trustProxy = false, googleClientId = process.env.GYM_GOOGLE_CLIENT_ID ?? "", accountFederationSecret = process.env.GYM_ACCOUNT_FEDERATION_SECRET ?? "", adminAccountIds = (process.env.GYM_ADMIN_ACCOUNT_IDS ?? "").split(",").map(value => value.trim()).filter(Boolean), suggestionEmail = process.env.GYM_SUGGESTIONS_EMAIL ?? "javi@akhyles.com", resendApiKey = process.env.GYM_RESEND_API_KEY ?? "", suggestionFrom = process.env.GYM_SUGGESTIONS_FROM ?? "Akhyles <avisos@akhyles.com>", verifyGoogle = googleVerifier(googleClientId) } = {}) {
  const db = new DatabaseSync(database);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA secure_delete = ON;
    CREATE TABLE IF NOT EXISTS google_identities (subject TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE);
    CREATE TABLE IF NOT EXISTS user_avatars (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, avatar TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      account_id TEXT UNIQUE,
      handle TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      level TEXT NOT NULL,
      salt TEXT NOT NULL,
      password TEXT NOT NULL,
      training_place TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS gyms (
      id TEXT PRIMARY KEY,
      chain_id TEXT,
      provider TEXT NOT NULL DEFAULT 'community',
      provider_place_id TEXT,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      city TEXT NOT NULL DEFAULT '',
      normalized_city TEXT NOT NULL DEFAULT '',
      province TEXT NOT NULL DEFAULT '',
      normalized_province TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'community'
    );
    CREATE UNIQUE INDEX IF NOT EXISTS gyms_provider_place_id ON gyms(provider, provider_place_id) WHERE provider_place_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS gyms_normalized_location ON gyms(normalized_name, normalized_city);
    CREATE TABLE IF NOT EXISTS gym_chains (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE TABLE IF NOT EXISTS gym_machine_brands (gym_id TEXT NOT NULL REFERENCES gyms(id) ON DELETE CASCADE, exercise_id TEXT NOT NULL, brand TEXT NOT NULL, uses INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL, PRIMARY KEY(gym_id, exercise_id, brand));
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, caption TEXT NOT NULL, photo BLOB NOT NULL, created TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS posts_created ON posts(created DESC);
    CREATE TABLE IF NOT EXISTS likes (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, post_id TEXT REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id, post_id));
    CREATE TABLE IF NOT EXISTS follows (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, followed_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id, followed_id));
    CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, created INTEGER NOT NULL, read_at INTEGER, UNIQUE(recipient_id, actor_id, type));
    CREATE INDEX IF NOT EXISTS notifications_recipient ON notifications(recipient_id, read_at, created DESC);
    CREATE TABLE IF NOT EXISTS community_notification_preferences (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, achievement_likes INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS samples (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reports (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, post_id TEXT REFERENCES posts(id) ON DELETE CASCADE, reason TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(user_id, post_id));
    CREATE TABLE IF NOT EXISTS shared_routines (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS shared_progress (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, updated TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS community_privacy (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, routine_public INTEGER NOT NULL DEFAULT 0, progress_public INTEGER NOT NULL DEFAULT 0, progress_visibility TEXT NOT NULL DEFAULT 'private');
    CREATE TABLE IF NOT EXISTS sharing_options (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, details INTEGER NOT NULL DEFAULT 0, body_weight INTEGER NOT NULL DEFAULT 0, ranking INTEGER NOT NULL DEFAULT 0, achievements INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL CHECK(type IN ('tier', 'personal_best')),
      tier_id TEXT, exercise_id TEXT, exercise_name TEXT, created TEXT NOT NULL,
      UNIQUE(user_id, type, tier_id), UNIQUE(user_id, type, exercise_id, created)
    );
    CREATE INDEX IF NOT EXISTS achievements_created ON achievements(created DESC);
    CREATE TABLE IF NOT EXISTS achievement_likes (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, achievement_id TEXT REFERENCES achievements(id) ON DELETE CASCADE, PRIMARY KEY(user_id, achievement_id));
    CREATE TABLE IF NOT EXISTS blocks (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, blocked_id TEXT REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id, blocked_id));
    CREATE TABLE IF NOT EXISTS profile_reports (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, reported_id TEXT REFERENCES users(id) ON DELETE CASCADE, reason TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(user_id, reported_id));
    CREATE TABLE IF NOT EXISTS coaching_relationships (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('pending', 'active')), created TEXT NOT NULL, updated TEXT NOT NULL,
      UNIQUE(client_id, trainer_id)
    );
    CREATE TABLE IF NOT EXISTS managed_routines (
      client_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS managed_routine_revisions (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL, data TEXT NOT NULL, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created TEXT NOT NULL, UNIQUE(client_id, revision)
    );
    CREATE TABLE IF NOT EXISTS trainer_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      public INTEGER NOT NULL DEFAULT 0, specialties TEXT NOT NULL DEFAULT '[]', modalities TEXT NOT NULL DEFAULT '[]',
      experience_years INTEGER NOT NULL DEFAULT 0, credentials TEXT NOT NULL DEFAULT '', availability TEXT NOT NULL DEFAULT '',
      pricing TEXT NOT NULL DEFAULT '', stats_public INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS coaching_stats_consent (
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      enabled INTEGER NOT NULL DEFAULT 0, updated TEXT NOT NULL, PRIMARY KEY(client_id, trainer_id)
    );
    CREATE TABLE IF NOT EXISTS coaching_progress (
      client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL, updated TEXT NOT NULL, PRIMARY KEY(client_id, trainer_id)
    );
    CREATE TABLE IF NOT EXISTS trainer_reviews (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, trainer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_id TEXT NOT NULL REFERENCES coaching_relationships(id) ON DELETE CASCADE, rating INTEGER NOT NULL, communication INTEGER NOT NULL,
      adaptation INTEGER NOT NULL, follow_up INTEGER NOT NULL, body TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL,
      UNIQUE(client_id, relationship_id)
    );
    CREATE TABLE IF NOT EXISTS profile_comment_settings (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, audience TEXT NOT NULL DEFAULT 'friends');
    CREATE TABLE IF NOT EXISTS profile_comments (
      id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL, created TEXT NOT NULL, updated TEXT, UNIQUE(profile_id, author_id, body)
    );
    CREATE TABLE IF NOT EXISTS comment_reports (user_id TEXT REFERENCES users(id) ON DELETE CASCADE, comment_id TEXT REFERENCES profile_comments(id) ON DELETE CASCADE, reason TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(user_id, comment_id));
    CREATE INDEX IF NOT EXISTS profile_comments_profile_created ON profile_comments(profile_id, created DESC);
    CREATE TABLE IF NOT EXISTS exercise_proposals (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL, muscle TEXT NOT NULL, secondary_muscles TEXT NOT NULL,
      type TEXT NOT NULL, variant TEXT NOT NULL, rep_min INTEGER NOT NULL, rep_max INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
      submitted TEXT NOT NULL, reviewed TEXT, reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      review_note TEXT NOT NULL DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS exercise_proposals_status ON exercise_proposals(status, submitted DESC);
    CREATE TABLE IF NOT EXISTS implementation_suggestions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, category TEXT NOT NULL, title TEXT NOT NULL, details TEXT NOT NULL, created TEXT NOT NULL, delivered_at TEXT, delivery_attempts INTEGER NOT NULL DEFAULT 0);
  `);
  // Older databases may predate the notification uniqueness constraint. Keep
  // the first copy of each logical notification and enforce one notification
  // per recipient, actor and type from now on.
  db.exec("DELETE FROM notifications WHERE rowid NOT IN (SELECT MIN(rowid) FROM notifications GROUP BY recipient_id, actor_id, type)");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS notifications_once ON notifications(recipient_id, actor_id, type)");
  const insertChain = db.prepare("INSERT INTO gym_chains (id, name, sort_order, status) VALUES (?, ?, ?, 'active') ON CONFLICT(id) DO UPDATE SET name = excluded.name, sort_order = excluded.sort_order, status = 'active'");
  for (const chain of INITIAL_GYM_CHAINS) insertChain.run(chain.id, chain.name, chain.sortOrder);
  const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const gymColumns = db.prepare("PRAGMA table_info(gyms)").all() as { name: string }[];
  if (!gymColumns.some(column => column.name === "chain_id")) db.exec("ALTER TABLE gyms ADD COLUMN chain_id TEXT");
  if (!gymColumns.some(column => column.name === "province")) db.exec("ALTER TABLE gyms ADD COLUMN province TEXT NOT NULL DEFAULT ''");
  if (!gymColumns.some(column => column.name === "normalized_province")) db.exec("ALTER TABLE gyms ADD COLUMN normalized_province TEXT NOT NULL DEFAULT ''");
  if (!userColumns.some(column => column.name === "account_id")) db.exec("ALTER TABLE users ADD COLUMN account_id TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_account_id ON users(account_id) WHERE account_id IS NOT NULL");
  if (!userColumns.some(column => column.name === "training_place")) db.exec("ALTER TABLE users ADD COLUMN training_place TEXT NOT NULL DEFAULT ''");
  if (!userColumns.some(column => column.name === "gym_id")) db.exec("ALTER TABLE users ADD COLUMN gym_id TEXT");
  if (!userColumns.some(column => column.name === "trainer_enabled")) db.exec("ALTER TABLE users ADD COLUMN trainer_enabled INTEGER NOT NULL DEFAULT 0");
  const privacyColumns = db.prepare("PRAGMA table_info(community_privacy)").all() as { name: string }[];
  if (!privacyColumns.some(column => column.name === "progress_visibility")) {
    db.exec("ALTER TABLE community_privacy ADD COLUMN progress_visibility TEXT NOT NULL DEFAULT 'private'");
    db.exec("UPDATE community_privacy SET progress_visibility = CASE WHEN progress_public = 1 THEN 'friends' ELSE 'private' END");
  }
  const limits = new Map<string, { count: number; until: number }>();
  const nonces = new Map<string, number>();
  function rateLimit(key: string, limit: number) {
    const now = Date.now();
    for (const [id, value] of limits) if (value.until < now) limits.delete(id);
    const entry = limits.get(key) ?? { count: 0, until: now + 15 * 60_000 };
    if (!limits.has(key) && limits.size >= 10000) fail(503, "Servidor ocupado. Vuelve a intentarlo.");
    if (++entry.count > limit) fail(429, "Demasiados intentos. Inténtalo dentro de 15 minutos.");
    limits.set(key, entry);
  }
  function privacy(userId: string) {
    return (db.prepare("SELECT routine_public, progress_public, progress_visibility FROM community_privacy WHERE user_id = ?").get(userId) as
      { routine_public: number; progress_public: number; progress_visibility: "private" | "friends" | "public" } | undefined) ?? { routine_public: 0, progress_public: 0, progress_visibility: "private" as const };
  }
  function options(userId: string) {
    return (db.prepare("SELECT details, body_weight, ranking, achievements FROM sharing_options WHERE user_id = ?").get(userId) as
      { details: number; body_weight: number; ranking: number; achievements: number } | undefined) ?? { details: 0, body_weight: 0, ranking: 0, achievements: 0 };
  }
  function achievementLikeNotificationsEnabled(userId: string) {
    return (db.prepare("SELECT achievement_likes FROM community_notification_preferences WHERE user_id = ?").get(userId) as { achievement_likes: number } | undefined)?.achievement_likes !== 0;
  }
  async function notifyImplementationSuggestion(user: User, category: string, title: string, details: Record<string, unknown>) {
    const id = randomUUID(), created = new Date().toISOString();
    db.prepare("INSERT INTO implementation_suggestions (id, user_id, category, title, details, created) VALUES (?, ?, ?, ?, ?, ?)").run(id, user.id, category, title, JSON.stringify(details), created);
    if (!resendApiKey || !suggestionEmail) return;
    try {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: suggestionFrom, to: [suggestionEmail], subject: `[Akhyles] Sugerencia: ${title}`, text: `Nueva sugerencia de ${user.name} (@${user.handle})\n\nTipo: ${category}\nFecha: ${created}\n\n${JSON.stringify(details, null, 2)}` }) });
      if (response.ok) db.prepare("UPDATE implementation_suggestions SET delivered_at = ?, delivery_attempts = 1 WHERE id = ?").run(new Date().toISOString(), id);
      else db.prepare("UPDATE implementation_suggestions SET delivery_attempts = 1 WHERE id = ?").run(id);
    } catch { db.prepare("UPDATE implementation_suggestions SET delivery_attempts = 1 WHERE id = ?").run(id); }
  }
  function blocked(first: string, second: string) {
    return !!db.prepare("SELECT 1 FROM blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)").get(first, second, second, first);
  }
  function mutual(first: string, second: string) {
    return first === second || !!db.prepare(`SELECT 1 FROM follows a JOIN follows b
      ON a.user_id = b.followed_id AND a.followed_id = b.user_id
      WHERE a.user_id = ? AND a.followed_id = ?`).get(first, second);
  }
  function canViewAchievements(owner: string, viewer: string) {
    if (owner === viewer) return true;
    const sharing = options(owner);
    const visibility = privacy(owner).progress_visibility;
    return sharing.achievements === 1 && (visibility === "public" || (visibility === "friends" && mutual(owner, viewer))) && !blocked(owner, viewer);
  }
  function coaching(id: string) {
    return db.prepare("SELECT * FROM coaching_relationships WHERE id = ?").get(id) as { id: string; client_id: string; trainer_id: string; requested_by: string; status: "pending" | "active"; created: string; updated: string } | undefined;
  }
  function coachingView(row: { id: string; client_id: string; trainer_id: string; requested_by: string; status: "pending" | "active"; created: string; updated: string }, viewer: string) {
    const otherId = row.client_id === viewer ? row.trainer_id : row.client_id;
    const other = getUser(otherId)!;
    const consent = db.prepare("SELECT enabled FROM coaching_stats_consent WHERE client_id = ? AND trainer_id = ?").get(row.client_id, row.trainer_id) as { enabled: number } | undefined;
    return { id: row.id, status: row.status, role: row.client_id === viewer ? "client" : "trainer", requestedByMe: row.requested_by === viewer, statsConsent: consent?.enabled === 1,
      created: row.created, updated: row.updated, person: { id: other.id, handle: other.handle, name: other.name, avatar: (db.prepare("SELECT avatar FROM user_avatars WHERE user_id = ?").get(other.id) as { avatar: string } | undefined)?.avatar ?? "mountain" } };
  }
  const profileCommentsAudience = (id: string) => (db.prepare("SELECT audience FROM profile_comment_settings WHERE user_id = ?").get(id) as { audience: "everyone" | "friends" | "none" } | undefined)?.audience ?? "friends";
  const canComment = (author: string, profile: string) => author === profile || (profileCommentsAudience(profile) === "everyone" || (profileCommentsAudience(profile) === "friends" && mutual(author, profile)));
  function trainerStats(trainerId: string) {
    const active = (db.prepare("SELECT count(*) total FROM coaching_relationships WHERE trainer_id = ? AND status = 'active'").get(trainerId) as { total: number }).total;
    const rows = db.prepare(`SELECT p.data FROM coaching_progress p JOIN coaching_stats_consent c ON c.client_id=p.client_id AND c.trainer_id=p.trainer_id
      JOIN coaching_relationships r ON r.client_id=p.client_id AND r.trainer_id=p.trainer_id WHERE p.trainer_id = ? AND c.enabled = 1 AND r.status = 'active'`).all(trainerId) as { data: string }[];
    const sessions = rows.map(row => { try { const progress = JSON.parse(row.data) as { workouts?: { date: string }[] }; return (progress.workouts ?? []).filter(workout => Date.parse(workout.date) >= Date.now() - 90 * 86_400_000).length; } catch { return 0; } });
    const eligible = sessions.length;
    return { clientsActive: active, clientsSupported: (db.prepare("SELECT count(DISTINCT client_id) total FROM coaching_relationships WHERE trainer_id = ?").get(trainerId) as { total: number }).total,
      eligibleClients: eligible, sampleSufficient: eligible >= 5,
      ...(eligible >= 5 ? { averageSessions90Days: Math.round(sessions.reduce((sum, value) => sum + value, 0) / eligible * 10) / 10, consistencyRate: Math.round(100 * sessions.filter(value => value >= 8).length / eligible) } : {}) };
  }
  if (!userColumns.some(column => column.name === "city")) db.exec("ALTER TABLE users ADD COLUMN city TEXT NOT NULL DEFAULT ''");
  const sharingColumns = db.prepare("PRAGMA table_info(sharing_options)").all() as { name: string }[];
  if (!sharingColumns.some(column => column.name === "achievements")) db.exec("ALTER TABLE sharing_options ADD COLUMN achievements INTEGER NOT NULL DEFAULT 0");
  const achievementColumns = db.prepare("PRAGMA table_info(achievements)").all() as { name: string }[];
  if (!achievementColumns.some(column => column.name === "kind")) db.exec("ALTER TABLE achievements ADD COLUMN kind TEXT");
  if (!achievementColumns.some(column => column.name === "details")) db.exec("ALTER TABLE achievements ADD COLUMN details TEXT NOT NULL DEFAULT '{}'");
  if (!achievementColumns.some(column => column.name === "dedupe_key")) db.exec("ALTER TABLE achievements ADD COLUMN dedupe_key TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS achievements_dedupe_key ON achievements(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL");

  function publicProfile(user: User, viewer: string) {
    const count = (sql: string) => (db.prepare(sql).get(user.id) as { total: number }).total;
    const own = user.id === viewer;
    const settings = privacy(user.id);
    const sharing = options(user.id);
    const connected = mutual(viewer, user.id);
    // A single audience now governs every training artifact: routine, progress,
    // body-map data, detailed sessions, body weight and achievements.
    const trainingVisibility = settings.progress_visibility;
    const routineVisible = own || trainingVisibility === "public" || (connected && trainingVisibility === "friends");
    const progressVisible = own || settings.progress_visibility === "public" || (connected && settings.progress_visibility === "friends");
    return { id: user.id, handle: user.handle, name: user.name, bio: user.bio, level: user.level,
      avatar: (db.prepare("SELECT avatar FROM user_avatars WHERE user_id = ?").get(user.id) as { avatar: string } | undefined)?.avatar ?? "mountain",
      trainingPlace: user.training_place ?? "", gymId: user.gym_id ?? null, city: user.city ?? "",
      posts: own || sharing.achievements === 1 ? count("SELECT count(*) total FROM achievements WHERE user_id = ?") : 0,
      followers: count("SELECT count(*) total FROM follows WHERE followed_id = ?"),
      following: count("SELECT count(*) total FROM follows WHERE user_id = ?"),
      followed: !!db.prepare("SELECT 1 FROM follows WHERE user_id = ? AND followed_id = ?").get(viewer, user.id),
      followsYou: !!db.prepare("SELECT 1 FROM follows WHERE user_id = ? AND followed_id = ?").get(user.id, viewer),
      connected, trainerEnabled: user.trainer_enabled === 1,
      routineId: routineVisible ? (db.prepare("SELECT id FROM shared_routines WHERE user_id = ?").get(user.id) as { id: string } | undefined)?.id ?? null : null,
      progressVisible,
      ...(own ? { routinePublic: settings.routine_public === 1, progressPublic: settings.progress_visibility !== "private", progressVisibility: settings.progress_visibility, trainingVisibility,
        detailsPublic: sharing.details === 1, bodyWeightPublic: sharing.body_weight === 1, rankingPublic: sharing.ranking === 1, achievementsPublic: sharing.achievements === 1 } : {}),
    };
  }
  type ProgressSnapshot = {
    points?: number; pointsCoverage?: number; pointsReliability?: number; sessions?: number;
    exercises?: { id: string; name: string; maximum?: number; weight: number; load?: number; reps: number; date: string }[];
    weekly?: { weekStart: string; complete: boolean; completed: number; scheduled: number; adherence: number; strengthPercent?: number; strengthCompared: number; personalBests: number; improvingWeeks: number };
  };
  const createAchievement = (userId: string, type: "tier" | "personal_best", kind: string, details: Record<string, unknown>, dedupeKey: string, fields: { tierId?: string; exerciseId?: string; exerciseName?: string } = {}) => {
    db.prepare(`INSERT OR IGNORE INTO achievements (id, user_id, type, tier_id, exercise_id, exercise_name, kind, details, dedupe_key, created)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(randomUUID(), userId, type, fields.tierId ?? null, fields.exerciseId ?? null, fields.exerciseName?.slice(0, 160) ?? null, kind, JSON.stringify(details), dedupeKey, new Date().toISOString());
  };
  function recordAchievements(userId: string, previous: ProgressSnapshot | undefined, current: ProgressSnapshot) {
    // Keep achievements privately even while Community sharing is disabled. The
    // single training-visibility setting decides whether they can be read.
    if (!previous) return;
    const before = Number.isFinite(previous.points) ? previous.points! : 0;
    const after = Number.isFinite(current.points) ? current.points! : 0;
    const reached = pointsTiers.slice(1).filter(tier => before < tier.minimum && after >= tier.minimum).at(-1);
    if (reached) createAchievement(userId, "tier", "tier", { beforePoints: before, afterPoints: after, gainedPoints: Math.round((after - before) * 10) / 10, coverage: current.pointsCoverage, reliability: current.pointsReliability }, `tier:${reached.id}`, { tierId: reached.id });
    const prior = new Map((previous.exercises ?? []).map(exercise => [exercise.id, exercise]));
    const milestonesFor = (exerciseId: string) => {
      // Arm and unilateral work has meaningful landmarks well below 100 kg;
      // compound lifts use deliberately sparse, memorable plate milestones.
      if (/(curl|triceps|katana|lateral|rear|kickback)/.test(exerciseId)) return [20, 30, 40, 50, 60];
      if (/(pullup|dip)/.test(exerciseId)) return [20, 40, 60, 80, 100];
      return [100, 150, 200, 250, 300, 350, 400, 500];
    };
    for (const exercise of current.exercises ?? []) {
      const old = prior.get(exercise.id);
      const beforeLoad = old?.load ?? old?.weight ?? 0;
      const load = exercise.load ?? exercise.weight ?? 0;
      const reached = milestonesFor(exercise.id).filter(milestone => beforeLoad < milestone && load >= milestone).at(-1);
      if (old && reached !== undefined) {
        createAchievement(userId, "personal_best", "personal_best", {
          milestone: reached, weight: exercise.weight, load: exercise.load, reps: exercise.reps, date: exercise.date,
        }, `load-milestone:${exercise.id}:${reached}`, { exerciseId: exercise.id, exerciseName: exercise.name });
      }
    }
    for (const milestone of [10, 25, 50, 100, 250, 500]) if ((previous.sessions ?? 0) < milestone && (current.sessions ?? 0) >= milestone)
      createAchievement(userId, "tier", "sessions", { sessions: current.sessions }, `sessions:${milestone}`);
    for (const milestone of [5, 8, 11]) if ((previous.pointsCoverage ?? 0) < milestone && (current.pointsCoverage ?? 0) >= milestone)
      createAchievement(userId, "tier", "coverage", { coverage: current.pointsCoverage }, `coverage:${milestone}`);
    for (const milestone of [50, 75, 100]) if ((previous.pointsReliability ?? 0) < milestone && (current.pointsReliability ?? 0) >= milestone)
      createAchievement(userId, "tier", "reliability", { reliability: current.pointsReliability }, `reliability:${milestone}`);
    const weekly = current.weekly;
    if (weekly?.complete && weekly.scheduled > 0 && weekly.completed === weekly.scheduled)
      createAchievement(userId, "tier", "perfect_week", { weekStart: weekly.weekStart, completed: weekly.completed, scheduled: weekly.scheduled }, `perfect-week:${weekly.weekStart}`);
    for (const milestone of [3, 6, 12]) if ((previous.weekly?.improvingWeeks ?? 0) < milestone && (weekly?.improvingWeeks ?? 0) >= milestone)
      createAchievement(userId, "tier", "consistency", { weeks: weekly!.improvingWeeks, strengthPercent: weekly!.strengthPercent, compared: weekly!.strengthCompared }, `improving-weeks:${milestone}`);
  }
  function getUser(id: string) { return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as User | undefined; }
  function accountIdentity(assertion: string) {
    if (!accountFederationSecret) fail(503, "El acceso unificado todavÃ­a no estÃ¡ disponible.");
    const [body, signature, extra] = assertion.split(".");
    if (!body || !signature || extra) fail(401, "La credencial de Akhyles no es vÃ¡lida.");
    const expected = createHmac("sha256", Buffer.from(accountFederationSecret, "base64")).update(body).digest();
    let received: Buffer;
    try { received = Buffer.from(signature, "base64url"); } catch { return fail(401, "La credencial de Akhyles no es vÃ¡lida."); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) fail(401, "La credencial de Akhyles no es vÃ¡lida.");
    let claims: unknown;
    try { claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch { return fail(401, "La credencial de Akhyles no es vÃ¡lida."); }
    if (!claims || typeof claims !== "object" || Array.isArray(claims)) fail(401, "La credencial de Akhyles no es vÃ¡lida.");
    const value = claims as Record<string, unknown>;
    const issuedAt = value.iat, expires = value.exp, now = Math.floor(Date.now() / 1000);
    if (typeof value.sub !== "string" || !/^[a-f0-9]{32}$/i.test(value.sub) || typeof value.name !== "string" || value.name.length > 80 ||
      value.iss !== "akhyles-accounts" || value.aud !== "akhyles-community" || typeof issuedAt !== "number" || typeof expires !== "number" ||
      !Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expires) || expires < now || expires > now + 301 || issuedAt > now + 60)
      fail(401, "La credencial de Akhyles no es vÃ¡lida.");
    return { accountId: value.sub, name: value.name.trim() || "Atleta" };
  }
  function newSession(user: User) {
    db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
    const token = randomBytes(32).toString("hex");
    db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hash(token), user.id, Date.now() + 30 * 86_400_000);
    return { token, user: publicProfile(user, user.id) };
  }
  const server = createServer(async (req, res) => {
    const requestId = randomUUID();
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(value));
    };
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Origin");
    res.setHeader("X-Request-Id", requestId);
    try {
      // Only enable behind a private proxy which overwrites this header (Caddy).
      const forwarded = req.headers["x-forwarded-for"];
      const clientIp = trustProxy && typeof forwarded === "string" && isIP(forwarded.trim()) ? forwarded.trim() : req.socket.remoteAddress;
      const origin = req.headers.origin;
      if (origin && !origins.includes(origin)) fail(403, "Origen no permitido.");
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
      if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url ?? "/", "http://localhost");
      const path = url.pathname;
      const method = req.method;
      if (path === "/health" && method === "GET") { db.prepare("SELECT 1").get(); json(200, { service: "akhyles-community", ok: true }); return; }
      if (path === "/auth/google/config" && method === "GET") {
        rateLimit(`google-config:${clientIp}`, authLimit);
        for (const [key, expires] of nonces) if (expires < Date.now()) nonces.delete(key);
        const nonce = randomBytes(32).toString("hex");
        if (nonces.size >= 10000) fail(503, "Servidor ocupado. Vuelve a intentarlo.");
        if (googleClientId) nonces.set(nonce, Date.now() + 5 * 60_000);
        json(200, { clientId: googleClientId, nonce: googleClientId ? nonce : "" }); return;
      }
      if (path === "/auth/google" && method === "POST") {
        rateLimit(`auth:${clientIp}`, authLimit);
        if (!googleClientId) fail(503, "El acceso con Google todavía no está configurado.");
        const data = await body(req);
        const credential = str(data.credential, 12000), nonce = str(data.nonce, 64);
        const expires = nonces.get(nonce);
        nonces.delete(nonce);
        if (!expires || expires < Date.now()) fail(401, "El acceso con Google ha caducado. Vuelve a intentarlo.");
        let identity;
        try { identity = await verifyGoogle(credential, nonce); }
        catch { return fail(401, "No se ha podido verificar la cuenta de Google."); }
        const existing = db.prepare("SELECT user_id FROM google_identities WHERE subject = ?").get(identity.sub) as { user_id: string } | undefined;
        let googleUser = existing ? getUser(existing.user_id) : undefined;
        if (!googleUser) {
          const id = randomUUID();
          googleUser = { id, handle: `akh_${id.replace(/-/g, "").slice(0, 16)}`, name: identity.name?.slice(0, 80).trim() || "Akhyles", bio: "", level: validLevel(data.level) ? String(data.level) : "beginner", salt: randomBytes(16).toString("hex"), password: randomBytes(64).toString("hex") };
          db.exec("BEGIN");
          try {
            db.prepare("INSERT INTO users (id, handle, name, bio, level, salt, password, training_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, googleUser.handle, googleUser.name, "", googleUser.level, googleUser.salt, googleUser.password, "");
            db.prepare("INSERT INTO google_identities VALUES (?, ?)").run(identity.sub, id);
            db.exec("COMMIT");
          } catch (error) { db.exec("ROLLBACK"); throw error; }
        }
        json(200, newSession(googleUser)); return;
      }
      if (path === "/auth/akhyles" && method === "POST") {
        rateLimit(`auth:${clientIp}`, authLimit);
        const data = await body(req);
        const identity = accountIdentity(str(data.assertion, 2000));
        let accountUser = db.prepare("SELECT * FROM users WHERE account_id = ?").get(identity.accountId) as unknown as User | undefined;
        if (!accountUser) {
          const id = randomUUID();
          accountUser = {
            id,
            handle: `akh_${createHash("sha256").update(identity.accountId).digest("hex").slice(0, 16)}`,
            name: identity.name,
            bio: "",
            level: validLevel(data.level) ? String(data.level) : "beginner",
            salt: randomBytes(16).toString("hex"),
            password: randomBytes(64).toString("hex"),
          };
          try {
            db.prepare("INSERT INTO users (id, account_id, handle, name, bio, level, salt, password, training_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
              .run(id, identity.accountId, accountUser.handle, accountUser.name, "", accountUser.level, accountUser.salt, accountUser.password, "");
          } catch { fail(409, "No se ha podido preparar tu perfil de Comunidad."); }
        }
        json(200, newSession(accountUser)); return;
      }
      // Photos are public only after the explicit publication action; never serve original metadata.
      if (/^\/photos\/[\w-]+$/.test(path) && method === "GET") {
        const post = db.prepare("SELECT photo FROM posts WHERE id = ?").get(path.split("/")[2]) as { photo: Uint8Array } | undefined;
        if (!post) fail(404, "Foto no encontrada.");
        res.writeHead(200, { "Content-Type": "image/jpeg", "Content-Security-Policy": "default-src 'none'" });
        res.end(post.photo); return;
      }
      if (["/auth/register", "/auth/login"].includes(path) && method === "POST") {
        rateLimit(`auth:${clientIp}`, authLimit);
        const data = await body(req);
        const handle = str(data.handle, 24).toLowerCase().replace(/^@/, "");
        if (!/^[a-z0-9_]{3,24}$/.test(handle)) fail(400, "El @ necesita entre 3 y 24 letras, números o guiones bajos.");
        const password = data.password;
        if (typeof password !== "string" || password.length < 10 || password.length > 128) fail(400, "La contraseña necesita entre 10 y 128 caracteres.");
        let user = db.prepare("SELECT * FROM users WHERE handle = ?").get(handle) as unknown as User | undefined;
        if (path === "/auth/register") {
          if (user) fail(409, "Ese @ ya está registrado.");
          const name = str(data.name, 80);
          if (!name || !validLevel(data.level)) fail(400, "Indica tu nombre y nivel.");
          const salt = randomBytes(16).toString("hex");
          const digest = (await derive(password, salt, 64) as Buffer).toString("hex");
          user = { id: randomUUID(), handle, name, bio: "", level: String(data.level), salt, password: digest, training_place: "" };
          try { db.prepare("INSERT INTO users (id, handle, name, bio, level, salt, password, training_place) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(user.id, handle, name, "", user.level, salt, digest, ""); }
          catch { fail(409, "Ese @ ya está registrado."); }
        } else {
          const digest = await derive(password, user?.salt ?? "missing-account", 64) as Buffer;
          if (!user || !timingSafeEqual(digest, Buffer.from(user.password, "hex"))) fail(401, "Usuario o contraseña incorrectos.");
        }
        json(200, newSession(user!)); return;
      }
      const token = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
      const session = db.prepare("SELECT user_id FROM sessions WHERE token = ? AND expires > ?").get(hash(token), Date.now()) as { user_id: string } | undefined;
      if (!session) fail(401, "Inicia sesión en Comunidad para continuar.");
      const user = getUser(session.user_id)!;
      const isAdmin = adminAccountIds.includes(user.account_id ?? "");
      const requireSession = () => {
        if (!db.prepare("SELECT 1 FROM sessions WHERE token = ? AND user_id = ? AND expires > ?").get(hash(token), user.id, Date.now()))
          fail(401, "Inicia sesión en Comunidad para continuar.");
      };
      requestGuards.set(req, requireSession);
      rateLimit(`user:${user.id}`, 600);
      if (path === "/me/trainer-profile" && method === "PUT") {
        const data = await body(req);
        if (user.trainer_enabled !== 1) fail(400, "Activa primero el perfil de entrenador.");
        const specialties = Array.isArray(data.specialties) ? data.specialties.map(value => str(value, 40)).slice(0, 8) : fail(400, "Revisa las especialidades.");
        const modalities = Array.isArray(data.modalities) ? data.modalities.map(value => str(value, 30)).slice(0, 3) : fail(400, "Revisa las modalidades.");
        const years = Number(data.experienceYears);
        if (!Number.isInteger(years) || years < 0 || years > 60 || typeof data.public !== "boolean" || typeof data.statsPublic !== "boolean") fail(400, "Revisa el perfil profesional.");
        const profile = { public: data.public, specialties, modalities, experienceYears: years, credentials: str(data.credentials ?? "", 500), availability: str(data.availability ?? "", 160), pricing: str(data.pricing ?? "", 160), statsPublic: data.statsPublic };
        const now = new Date().toISOString();
        db.prepare(`INSERT INTO trainer_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET public=excluded.public, specialties=excluded.specialties, modalities=excluded.modalities, experience_years=excluded.experience_years, credentials=excluded.credentials, availability=excluded.availability, pricing=excluded.pricing, stats_public=excluded.stats_public, updated=excluded.updated`)
          .run(user.id, Number(profile.public), JSON.stringify(profile.specialties), JSON.stringify(profile.modalities), profile.experienceYears, profile.credentials, profile.availability, profile.pricing, Number(profile.statsPublic), now);
        json(200, profile); return;
      }
      if (/^\/profiles\/[\w-]+\/trainer$/.test(path) && method === "GET") {
        const target = getUser(path.split("/")[2]);
        if (!target || !target.trainer_enabled || blocked(user.id, target.id)) fail(404, "Perfil profesional no disponible.");
        const profile = db.prepare("SELECT * FROM trainer_profiles WHERE user_id = ?").get(target.id) as { public: number; specialties: string; modalities: string; experience_years: number; credentials: string; availability: string; pricing: string; stats_public: number; updated: string } | undefined;
        if (!profile || (!profile.public && target.id !== user.id)) fail(404, "Perfil profesional no disponible.");
        json(200, { public: profile.public === 1, specialties: JSON.parse(profile.specialties), modalities: JSON.parse(profile.modalities), experienceYears: profile.experience_years, credentials: profile.credentials, availability: profile.availability, pricing: profile.pricing, statsPublic: profile.stats_public === 1, updated: profile.updated, ...(profile.stats_public === 1 || target.id === user.id ? { stats: trainerStats(target.id) } : {}) }); return;
      }
      if (/^\/coaching\/[\w-]+\/stats-consent$/.test(path) && method === "PUT") {
        const row = coaching(path.split("/")[2]); const data = await body(req);
        if (!row || row.client_id !== user.id || row.status !== "active" || typeof data.enabled !== "boolean") fail(400, "No se puede actualizar este consentimiento.");
        db.prepare(`INSERT INTO coaching_stats_consent VALUES (?, ?, ?, ?) ON CONFLICT(client_id, trainer_id) DO UPDATE SET enabled=excluded.enabled, updated=excluded.updated`).run(row.client_id, row.trainer_id, Number(data.enabled), new Date().toISOString());
        if (!data.enabled) db.prepare("DELETE FROM coaching_progress WHERE client_id = ? AND trainer_id = ?").run(row.client_id, row.trainer_id);
        json(200, { enabled: data.enabled }); return;
      }
      if (path === "/coaching/progress/me" && method === "PUT") {
        const data = await body(req);
        if (!isSharedProgress(data)) fail(400, "El progreso no es válido.");
        const trainers = db.prepare(`SELECT r.trainer_id FROM coaching_relationships r JOIN coaching_stats_consent c ON c.client_id=r.client_id AND c.trainer_id=r.trainer_id WHERE r.client_id=? AND r.status='active' AND c.enabled=1`).all(user.id) as { trainer_id: string }[];
        const now = new Date().toISOString();
        for (const trainer of trainers) db.prepare(`INSERT INTO coaching_progress VALUES (?, ?, ?, ?) ON CONFLICT(client_id, trainer_id) DO UPDATE SET data=excluded.data, updated=excluded.updated`).run(user.id, trainer.trainer_id, JSON.stringify(data), now);
        json(200, { sharedWith: trainers.length }); return;
      }
      if (path === "/exercise-proposals" && method === "POST") {
        const data = await body(req);
        const name = str(data.name, 120);
        const muscle = str(data.muscle, 20);
        const secondary = Array.isArray(data.secondary) ? data.secondary.map(value => str(value, 20)) : fail(400, "Revisa los músculos secundarios.");
        const type = str(data.type, 20), variant = str(data.variant, 20);
        const range = data.range;
        const muscles = ["chest", "back", "shoulders", "biceps", "triceps", "glutes", "quads", "hamstrings", "adductors", "calves", "abs"];
        if (name.length < 2 || !muscles.includes(muscle) || secondary.length > 4 || secondary.some(value => !muscles.includes(value)) || !["compound", "isolation"].includes(type) || !["machine", "free", "cable", "smith", "bodyweight"].includes(variant) || !Array.isArray(range) || range.length !== 2 || !range.every(Number.isInteger) || range[0] < 1 || range[1] < range[0] || range[1] > 30) fail(400, "La propuesta de ejercicio no es válida.");
        const duplicate = db.prepare("SELECT id FROM exercise_proposals WHERE user_id = ? AND name = ? AND status = 'pending'").get(user.id, name) as { id: string } | undefined;
        if (duplicate) fail(409, "Ya tienes una propuesta pendiente con ese nombre.");
        const proposal = { id: randomUUID(), name, muscle, secondary, type, variant, range, status: "pending", submitted: new Date().toISOString(), reviewNote: "" };
        db.prepare("INSERT INTO exercise_proposals (id, user_id, name, muscle, secondary_muscles, type, variant, rep_min, rep_max, status, submitted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(proposal.id, user.id, name, muscle, JSON.stringify(secondary), type, variant, range[0], range[1], proposal.status, proposal.submitted);
        await notifyImplementationSuggestion(user, "ejercicio", name, { muscle, secondary, type, variant, range, proposalId: proposal.id });
        json(201, proposal); return;
      }
      if (path === "/exercise-proposals/me" && method === "GET") {
        const rows = db.prepare("SELECT id, name, muscle, secondary_muscles, type, variant, rep_min, rep_max, status, submitted, reviewed, review_note FROM exercise_proposals WHERE user_id = ? ORDER BY submitted DESC LIMIT 100").all(user.id) as { id: string; name: string; muscle: string; secondary_muscles: string; type: string; variant: string; rep_min: number; rep_max: number; status: string; submitted: string; reviewed?: string; review_note: string }[];
        json(200, rows.map(row => ({ id: row.id, name: row.name, muscle: row.muscle, secondary: JSON.parse(row.secondary_muscles), type: row.type, variant: row.variant, range: [row.rep_min, row.rep_max], status: row.status, submitted: row.submitted, reviewed: row.reviewed, reviewNote: row.review_note }))); return;
      }
      if (path === "/admin/exercise-proposals" && method === "GET") {
        if (!isAdmin) fail(403, "No tienes permiso para revisar propuestas.");
        const status = url.searchParams.get("status") ?? "pending";
        if (!["pending", "approved", "rejected"].includes(status)) fail(400, "Estado de propuesta no válido.");
        const rows = db.prepare("SELECT p.*, u.handle, u.name AS author_name FROM exercise_proposals p JOIN users u ON u.id = p.user_id WHERE p.status = ? ORDER BY p.submitted ASC LIMIT 200").all(status) as { id: string; name: string; muscle: string; secondary_muscles: string; type: string; variant: string; rep_min: number; rep_max: number; status: string; submitted: string; review_note: string; handle: string; author_name: string }[];
        json(200, rows.map(row => ({ id: row.id, name: row.name, muscle: row.muscle, secondary: JSON.parse(row.secondary_muscles), type: row.type, variant: row.variant, range: [row.rep_min, row.rep_max], status: row.status, submitted: row.submitted, reviewNote: row.review_note, author: { handle: row.handle, name: row.author_name } }))); return;
      }
      if (/^\/admin\/exercise-proposals\/[\w-]+$/.test(path) && method === "PATCH") {
        if (!isAdmin) fail(403, "No tienes permiso para revisar propuestas.");
        const data = await body(req), status = str(data.status, 20), reviewNote = data.reviewNote === undefined ? "" : str(data.reviewNote, 500);
        if (!["approved", "rejected"].includes(status)) fail(400, "Elige aprobar o rechazar la propuesta.");
        const id = path.split("/")[3];
        const result = db.prepare("UPDATE exercise_proposals SET status = ?, reviewed = ?, reviewer_id = ?, review_note = ? WHERE id = ? AND status = 'pending'").run(status, new Date().toISOString(), user.id, reviewNote, id);
        if (!result.changes) fail(404, "La propuesta ya no está pendiente.");
        json(200, { id, status, reviewNote }); return;
      }
      if (path === "/coaching" && method === "GET") {
        const rows = db.prepare("SELECT * FROM coaching_relationships WHERE client_id = ? OR trainer_id = ? ORDER BY updated DESC").all(user.id, user.id) as { id: string; client_id: string; trainer_id: string; requested_by: string; status: "pending" | "active"; created: string; updated: string }[];
        json(200, rows.filter(row => !blocked(user.id, row.client_id === user.id ? row.trainer_id : row.client_id)).map(row => coachingView(row, user.id))); return;
      }
      if (path === "/coaching/requests" && method === "POST") {
        const data = await body(req);
        const targetId = str(data.targetId, 80);
        const target = getUser(targetId);
        if (!target || target.id === user.id || blocked(user.id, target.id)) fail(404, "Perfil no disponible.");
        const trainerId = user.trainer_enabled === 1 ? user.id : target.trainer_enabled === 1 ? target.id : null;
        if (!trainerId) fail(400, "Esta persona no ofrece entrenamiento.");
        const clientId = trainerId === user.id ? target.id : user.id;
        const existing = db.prepare("SELECT * FROM coaching_relationships WHERE client_id = ? AND trainer_id = ?").get(clientId, trainerId) as { id: string; client_id: string; trainer_id: string; requested_by: string; status: "pending" | "active"; created: string; updated: string } | undefined;
        if (existing?.status === "active") fail(409, "Ya tenÃ©is una colaboraciÃ³n activa.");
        const now = new Date().toISOString();
        const row = existing ?? { id: randomUUID(), client_id: clientId, trainer_id: trainerId, requested_by: user.id, status: "pending" as const, created: now, updated: now };
        if (existing) db.prepare("UPDATE coaching_relationships SET requested_by = ?, status = 'pending', updated = ? WHERE id = ?").run(user.id, now, existing.id);
        else db.prepare("INSERT INTO coaching_relationships VALUES (?, ?, ?, ?, ?, ?, ?)").run(row.id, row.client_id, row.trainer_id, row.requested_by, row.status, row.created, row.updated);
        json(201, coachingView({ ...row, requested_by: user.id, updated: now }, user.id)); return;
      }
      if (/^\/coaching\/[\w-]+$/.test(path) && method === "PATCH") {
        const data = await body(req);
        const row = coaching(path.split("/")[2]);
        if (!row || (row.client_id !== user.id && row.trainer_id !== user.id) || blocked(user.id, row.client_id === user.id ? row.trainer_id : row.client_id)) fail(404, "ColaboraciÃ³n no disponible.");
        const action = String(data.action);
        if (action === "revoke") { db.prepare("DELETE FROM coaching_relationships WHERE id = ?").run(row.id); json(200, { ok: true }); return; }
        if (row.status !== "pending" || row.requested_by === user.id || !["accept", "decline"].includes(action)) fail(400, "No puedes completar esta solicitud.");
        if (action === "decline") { db.prepare("DELETE FROM coaching_relationships WHERE id = ?").run(row.id); json(200, { ok: true }); return; }
        const now = new Date().toISOString();
        db.prepare("UPDATE coaching_relationships SET status = 'active', updated = ? WHERE id = ?").run(now, row.id);
        json(200, coachingView({ ...row, status: "active", updated: now }, user.id)); return;
      }
      if (path === "/coaching/routine/me" && method === "PUT") {
        const data = await body(req);
        if (!isSharedRoutine(data) || data.days.length === 0 || data.days.length > 30 || data.days.reduce((total, day) => total + day.exercises.length, 0) > 500) fail(400, "La rutina gestionada no es vÃ¡lida.");
        const existing = db.prepare("SELECT revision FROM managed_routines WHERE client_id = ?").get(user.id) as { revision: number } | undefined;
        if (existing) { json(200, { revision: existing.revision, existing: true }); return; }
        const revision = 1, now = new Date().toISOString();
        db.prepare(`INSERT INTO managed_routines (client_id, data, revision, updated, author_id) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(client_id) DO UPDATE SET data=excluded.data, revision=excluded.revision, updated=excluded.updated, author_id=excluded.author_id`).run(user.id, JSON.stringify(data), revision, now, user.id);
        db.prepare("INSERT INTO managed_routine_revisions VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), user.id, revision, JSON.stringify(data), user.id, now);
        json(200, { revision, updated: now }); return;
      }
      if (/^\/coaching\/[\w-]+\/routine$/.test(path) && ["GET", "PUT"].includes(method!)) {
        const data = method === "PUT" ? await body(req) : {};
        const row = coaching(path.split("/")[2]);
        if (!row || row.status !== "active" || (row.client_id !== user.id && row.trainer_id !== user.id) || blocked(user.id, row.client_id === user.id ? row.trainer_id : row.client_id)) fail(404, "Rutina gestionada no disponible.");
        if (method === "GET") {
          const routine = db.prepare("SELECT data, revision, updated, author_id FROM managed_routines WHERE client_id = ?").get(row.client_id) as { data: string; revision: number; updated: string; author_id: string } | undefined;
          if (!routine) fail(404, "El deportista todavÃ­a no ha sincronizado su rutina.");
          const author = getUser(routine.author_id)!;
          json(200, { routine: JSON.parse(routine.data), revision: routine.revision, updated: routine.updated, author: { id: author.id, handle: author.handle, name: author.name } }); return;
        }
        if (user.id !== row.trainer_id || !isSharedRoutine(data.routine) || !Number.isInteger(data.revision)) fail(400, "Revisa la rutina y su versiÃ³n.");
        const current = db.prepare("SELECT revision FROM managed_routines WHERE client_id = ?").get(row.client_id) as { revision: number } | undefined;
        if (!current) fail(404, "El deportista todavÃ­a no ha sincronizado su rutina.");
        if (current.revision !== data.revision) fail(409, "La rutina ha cambiado. RecÃ¡rgala antes de guardar.");
        const revision = current.revision + 1, now = new Date().toISOString(), encoded = JSON.stringify(data.routine);
        db.prepare("UPDATE managed_routines SET data = ?, revision = ?, updated = ?, author_id = ? WHERE client_id = ?").run(encoded, revision, now, user.id, row.client_id);
        db.prepare("INSERT INTO managed_routine_revisions VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), row.client_id, revision, encoded, user.id, now);
        json(200, { revision, updated: now }); return;
      }
      if (/^\/routines\/[\w-]+$/.test(path) && method === "GET") {
        const routine = db.prepare(`SELECT r.id, r.user_id, r.data, r.updated, u.handle, u.name
          FROM shared_routines r JOIN users u ON u.id = r.user_id WHERE r.id = ?`).get(path.split("/")[2]) as
          { id: string; user_id: string; data: string; updated: string; handle: string; name: string } | undefined;
        if (!routine) fail(404, "Rutina compartida no encontrada.");
        if (blocked(user.id, routine.user_id)) fail(404, "Rutina no disponible.");
        const visibility = privacy(routine.user_id).progress_visibility;
        if (routine.user_id !== user.id && visibility !== "public" && (visibility !== "friends" || !mutual(user.id, routine.user_id)))
          fail(403, "Esta rutina es privada o solo estÃ¡ disponible entre seguidores mutuos.");
        json(200, { id: routine.id, owner: { handle: routine.handle, name: routine.name }, routine: JSON.parse(routine.data), updated: routine.updated }); return;
      }
      if (path === "/auth/logout" && method === "POST") {
        db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(token)); json(200, { ok: true }); return;
      }
      if (path === "/me" && method === "DELETE") {
        // Foreign keys cascade to sessions, posts/photos, follows, likes, reports,
        // shared data, samples, avatars and Google identity links.
        db.prepare("DELETE FROM users WHERE id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/me" && method === "GET") { json(200, publicProfile(user, user.id)); return; }
      if (path === "/me" && method === "PATCH") {
        const data = await body(req);
        const name = str(data.name, 80), bio = str(data.bio, 300);
        const city = data.city === undefined ? user.city : str(data.city, 80);
        const trainingPlace = data.trainingPlace === undefined ? user.training_place : str(data.trainingPlace, 80);
        const gymId = data.gymId === undefined ? user.gym_id : data.gymId === null || data.gymId === "" ? null : str(data.gymId, 80);
        if (!name || !validLevel(data.level)) fail(400, "Revisa el nombre y el nivel.");
        if (data.trainerEnabled !== undefined && typeof data.trainerEnabled !== "boolean") fail(400, "Revisa la opciÃ³n de entrenador.");
        if (gymId && !db.prepare("SELECT 1 FROM gyms WHERE id = ?").get(gymId)) fail(400, "El gimnasio seleccionado ya no existe.");
        let avatar = data.avatar;
        if (avatar !== undefined && !validAvatar(avatar)) {
          if (!validAvatarPhoto(avatar)) fail(400, "Imagen de perfil no válida.");
          try {
            const photo = await sharp(Buffer.from(String(avatar).split(",")[1], "base64"), { limitInputPixels: 25_000_000 }).rotate().resize(256, 256, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
            avatar = `data:image/jpeg;base64,${photo.toString("base64")}`;
          } catch { return fail(400, "No se ha podido procesar la foto de perfil."); }
        }
        requireSession();
        if (avatar !== undefined) db.prepare("INSERT OR REPLACE INTO user_avatars VALUES (?, ?)").run(user.id, String(avatar));
        db.prepare("UPDATE users SET name = ?, bio = ?, level = ?, training_place = ?, gym_id = ?, city = ?, trainer_enabled = ? WHERE id = ?").run(name, bio, String(data.level), trainingPlace ?? "", gymId ?? null, city ?? "", data.trainerEnabled === undefined ? Number(user.trainer_enabled ?? 0) : Number(data.trainerEnabled), user.id);
        if (data.level !== user.level) db.prepare("DELETE FROM samples WHERE user_id = ?").run(user.id);
        json(200, publicProfile(getUser(user.id)!, user.id)); return;
      }
      if (path === "/gyms" && method === "GET") {
        const query = normalizeGym(url.searchParams.get("q") ?? "");
        const city = normalizeGym(url.searchParams.get("city") ?? "");
        const province = normalizeGym(url.searchParams.get("province") ?? "");
        const chainId = url.searchParams.get("chainId")?.trim() ?? "";
        if (query.length < 2 && !city && !province) { json(200, []); return; }
        const gyms = db.prepare(`SELECT id, provider, provider_place_id, name, address, city, status FROM gyms
          WHERE (? = '' OR normalized_name LIKE ?) AND (? = '' OR normalized_city = ?) AND (? = '' OR normalized_province = ?) AND (? = '' OR chain_id = ?) ORDER BY province, city, name LIMIT 100`).all(query, `%${query}%`, city, city, province, province, chainId, chainId) as unknown as Gym[];
        json(200, gyms.map(gym => ({ id: gym.id, provider: gym.provider, name: gym.name, address: gym.address, city: gym.city, status: gym.status }))); return;
      }
      if (path === "/gym-locations" && method === "GET") {
        const chainId = url.searchParams.get("chainId")?.trim() ?? "";
        const province = normalizeGym(url.searchParams.get("province") ?? "");
        const rows = db.prepare(`SELECT DISTINCT province, city FROM gyms WHERE status != 'rejected' AND (? = '' OR chain_id = ?) AND (? = '' OR normalized_province = ?) ORDER BY province, city`).all(chainId, chainId, province, province) as unknown as Array<{ province: string; city: string }>;
        json(200, rows);
        return;
      }
      if (path === "/gym-chains" && method === "GET") {
        const chains = db.prepare("SELECT id, name, sort_order, status FROM gym_chains WHERE status = 'active' ORDER BY sort_order, name COLLATE NOCASE").all() as unknown as GymChain[];
        json(200, chains.map(chain => ({ id: chain.id, name: chain.name, sortOrder: chain.sort_order })));
        return;
      }
      if (path === "/machine-brands" && method === "GET") {
        const exerciseId = url.searchParams.get("exercise") ?? "";
        if (!validExerciseId(exerciseId)) fail(400, "Revisa el ejercicio.");
        const mine = getUser(user.id)!;
        const gym = mine.gym_id ? (db.prepare("SELECT brand FROM gym_machine_brands WHERE gym_id = ? AND exercise_id = ? ORDER BY uses DESC, brand COLLATE NOCASE").all(mine.gym_id, exerciseId) as { brand: string }[]).map(row => row.brand) : [];
        const global = (db.prepare("SELECT brand, sum(uses) total FROM gym_machine_brands WHERE exercise_id = ? GROUP BY brand ORDER BY total DESC, brand COLLATE NOCASE LIMIT 100").all(exerciseId) as { brand: string }[]).map(row => row.brand);
        json(200, { gym, global }); return;
      }
      if (path === "/machine-brands" && method === "POST") {
        const data = await body(req);
        const exerciseId = typeof data.exerciseId === "string" ? data.exerciseId : "";
        const brand = typeof data.brand === "string" ? data.brand.trim().replace(/\s+/g, " ") : "";
        const suggested = data.suggested === true;
        if (!validExerciseId(exerciseId) || brand.length < 2 || brand.length > 60) fail(400, "Revisa la marca de la máquina.");
        const mine = getUser(user.id)!;
        if (mine.gym_id) db.prepare("INSERT INTO gym_machine_brands (gym_id, exercise_id, brand, uses, updated) VALUES (?, ?, ?, 1, ?) ON CONFLICT(gym_id, exercise_id, brand) DO UPDATE SET uses=uses+1, updated=excluded.updated").run(mine.gym_id, exerciseId, brand, new Date().toISOString());
        if (suggested) await notifyImplementationSuggestion(user, "marca de máquina", brand, { exerciseId, gymId: mine.gym_id ?? null });
        json(200, { brand }); return;
      }
      if (path === "/gyms" && method === "POST") {
        const data = await body(req);
        const name = str(data.name, 80), city = str(data.city, 80), province = data.province === undefined ? "" : str(data.province, 80), address = data.address === undefined ? "" : str(data.address, 160);
        const chainId = data.chainId === undefined || data.chainId === null ? "" : str(data.chainId, 80);
        if (chainId && !db.prepare("SELECT 1 FROM gym_chains WHERE id = ? AND status = 'active'").get(chainId)) fail(400, "La cadena seleccionada no existe.");
        const normalizedName = normalizeGym(name), normalizedCity = normalizeGym(city);
        const normalizedProvince = normalizeGym(province);
        if (normalizedName.length < 2) fail(400, "Escribe el nombre del gimnasio.");
        const existing = db.prepare("SELECT id, provider, name, address, city, status FROM gyms WHERE normalized_name = ? AND normalized_city = ?").get(normalizedName, normalizedCity) as Gym | undefined;
        if (existing) { json(200, existing); return; }
        const gym = { id: randomUUID(), provider: "community", name: name.trim(), address: address.trim(), city: city.trim(), province: province.trim(), status: "community", chainId: chainId || null };
        db.prepare("INSERT INTO gyms (id, chain_id, provider, name, normalized_name, address, city, normalized_city, province, normalized_province, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
          .run(gym.id, gym.chainId, gym.provider, gym.name, normalizedName, gym.address, gym.city, normalizedCity, gym.province, normalizedProvince, gym.status);
        json(201, gym); return;
      }
      if (path === "/me/privacy" && method === "PATCH") {
        const data = await body(req);
        const unified = data.trainingVisibility;
        if (unified !== undefined && !["private", "friends", "public"].includes(String(unified))) fail(400, "Revisa quién puede ver tus entrenamientos.");
        if (unified === undefined && (typeof data.routinePublic !== "boolean" || typeof data.progressPublic !== "boolean"))
          fail(400, "Elige la privacidad de rutina y progreso.");
        if (data.progressVisibility !== undefined && !["private", "friends", "public"].includes(String(data.progressVisibility))) fail(400, "Revisa la visibilidad del progreso.");
        for (const key of ["detailsPublic", "bodyWeightPublic", "rankingPublic", "achievementsPublic"]) if (data[key] !== undefined && typeof data[key] !== "boolean") fail(400, "Revisa las opciones para compartir.");
        const old = options(user.id);
        const visibility = unified !== undefined ? String(unified) : data.progressPublic ? String(data.progressVisibility ?? "friends") : "private";
        const sharingEverything = unified !== undefined ? visibility !== "private" : undefined;
        db.prepare(`INSERT INTO sharing_options (user_id, details, body_weight, ranking, achievements) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
          details=excluded.details, body_weight=excluded.body_weight, ranking=excluded.ranking, achievements=excluded.achievements`).run(user.id,
          Number(data.detailsPublic ?? sharingEverything ?? old.details), Number(data.bodyWeightPublic ?? sharingEverything ?? old.body_weight), Number(data.rankingPublic ?? old.ranking), Number(data.achievementsPublic ?? sharingEverything ?? old.achievements));
        db.prepare(`INSERT INTO community_privacy (user_id, routine_public, progress_public, progress_visibility) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET routine_public = excluded.routine_public, progress_public = excluded.progress_public, progress_visibility = excluded.progress_visibility`)
          .run(user.id, Number(unified !== undefined ? visibility !== "private" : data.routinePublic), Number(visibility !== "private"), visibility);
        json(200, publicProfile(user, user.id)); return;
      }
      if (path === "/routines/me" && method === "PUT") {
        const data = await body(req);
        if (!isSharedRoutine(data) || data.days.length === 0 || data.days.length > 30 || data.days.reduce((total, day) => total + day.exercises.length, 0) > 500)
          fail(400, "La rutina compartida no es vÃ¡lida.");
        const existing = db.prepare("SELECT id FROM shared_routines WHERE user_id = ?").get(user.id) as { id: string } | undefined;
        const id = existing?.id ?? randomUUID();
        db.prepare(`INSERT INTO shared_routines (id, user_id, data, updated) VALUES (?, ?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`)
          .run(id, user.id, JSON.stringify(data), new Date().toISOString());
        json(200, { id }); return;
      }
      if (path === "/routines/me" && method === "DELETE") {
        db.prepare("DELETE FROM shared_routines WHERE user_id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/progress/me" && method === "PUT") {
        const existingProgress = db.prepare("SELECT data FROM shared_progress WHERE user_id = ?").get(user.id) as { data: string } | undefined;
        let previousProgress: ProgressSnapshot | undefined;
        try { previousProgress = existingProgress ? JSON.parse(existingProgress.data) as ProgressSnapshot : undefined; } catch { previousProgress = undefined; }
        const data = await body(req);
        if (!isSharedProgress(data)) fail(400, "El resumen de progreso no es vÃ¡lido.");
        db.prepare(`INSERT INTO shared_progress (user_id, data, updated) VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated = excluded.updated`)
          .run(user.id, JSON.stringify(data), data.updated);
        recordAchievements(user.id, previousProgress, data);
        json(200, { ok: true }); return;
      }
      if (path === "/progress/me" && method === "DELETE") {
        db.prepare("DELETE FROM shared_progress WHERE user_id = ?").run(user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/profiles" && method === "GET") {
        const query = (url.searchParams.get("q") ?? "").replace(/^@/, "").toLowerCase();
        const users = db.prepare("SELECT * FROM users WHERE instr(handle, ?) > 0 OR instr(lower(name), ?) > 0 ORDER BY handle LIMIT 30").all(query, query) as unknown as User[];
        json(200, users.filter(u => !blocked(user.id, u.id)).map(u => publicProfile(u, user.id))); return;
      }
      if (/^\/profiles\/[\w-]+$/.test(path) && method === "GET") {
        const target = getUser(path.split("/")[2]);
        if (!target || blocked(user.id, target.id)) fail(404, "Perfil no encontrado.");
        json(200, publicProfile(target, user.id)); return;
      }
      if (/^\/profiles\/[\w-]+\/(followers|following)$/.test(path) && method === "GET") {
        const [, , targetId, relation] = path.split("/");
        const target = getUser(targetId);
        if (!target || blocked(user.id, target.id)) fail(404, "Perfil no encontrado.");
        const rows = db.prepare(relation === "followers"
          ? "SELECT u.* FROM users u JOIN follows f ON f.user_id = u.id WHERE f.followed_id = ? ORDER BY u.handle LIMIT 100"
          : "SELECT u.* FROM users u JOIN follows f ON f.followed_id = u.id WHERE f.user_id = ? ORDER BY u.handle LIMIT 100")
          .all(target.id) as unknown as User[];
        json(200, rows.filter(row => !blocked(user.id, row.id)).map(row => publicProfile(row, user.id))); return;
      }
      if (/^\/profiles\/[\w-]+\/progress$/.test(path) && method === "GET") {
        const targetId = path.split("/")[2];
        const target = getUser(targetId);
        if (!target || blocked(user.id, target.id)) fail(404, "Perfil no encontrado.");
        const visibility = privacy(target.id).progress_visibility;
        if (target.id !== user.id && visibility !== "public" && (visibility !== "friends" || !mutual(user.id, target.id)))
          fail(403, "Este progreso es privado o solo estÃ¡ disponible entre seguidores mutuos.");
        const progress = db.prepare("SELECT data, updated FROM shared_progress WHERE user_id = ?").get(target.id) as { data: string; updated: string } | undefined;
        if (!progress) fail(404, "Esta persona todavÃ­a no ha compartido un progreso.");
        const sharing = options(target.id);
        const { workouts, pointsHistory, bodyWeights, ...summary } = JSON.parse(progress.data);
        json(200, { ...summary, updated: progress.updated,
          ...(sharing.details ? { workouts, pointsHistory } : {}), ...(sharing.body_weight ? { bodyWeights } : {}) }); return;
      }
      if (path === "/ranking" && method === "GET") {
        const board = url.searchParams.get("format") === "board";
        const scope = (url.searchParams.get("scope") ?? "global") as RankingScope;
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (!["friends", "global", "gym", "city"].includes(scope) || !Number.isSafeInteger(offset) || offset < 0)
          fail(400, "Revisa el ámbito y la página del ranking.");
        const location = scope === "gym" ? user.training_place ?? "" : scope === "city" ? user.city ?? "" : "";
        const needsLocation = (scope === "gym" && !user.gym_id && !normalizeLocation(location)) || (scope === "city" && !normalizeLocation(location));
        const rows = db.prepare(`SELECT u.*, p.data, a.avatar FROM users u JOIN shared_progress p ON p.user_id=u.id
          JOIN sharing_options o ON o.user_id=u.id LEFT JOIN user_avatars a ON a.user_id=u.id WHERE o.ranking=1`).all() as unknown as (User & { data: string; avatar?: string })[];
        const cohort = rows.filter(row => {
          if (blocked(user.id, row.id) || needsLocation) return false;
          if (scope === "friends" && !mutual(user.id, row.id)) return false;
          if (scope === "gym" && ((user.gym_id && row.gym_id !== user.gym_id) || (!user.gym_id && normalizeLocation(row.training_place) !== normalizeLocation(location)) ||
            (normalizeLocation(user.city) && normalizeLocation(row.city) !== normalizeLocation(user.city)))) return false;
          if (scope === "city" && normalizeLocation(row.city) !== normalizeLocation(location)) return false;
          return true;
        }).flatMap(row => {
          const progress = JSON.parse(row.data);
          if (progress.pointsModel !== POINTS_MODEL || progress.pointsRankingEligible !== true || !Number.isFinite(progress.points)) return [];
          return [{ id: row.id, handle: row.handle, name: row.name, avatar: row.avatar,
            points: progress.points, coverage: progress.pointsCoverage, reliability: progress.pointsReliability ?? 0 }];
        });
        if (!board) {
          json(200, cohort.sort((a, b) => b.points - a.points || a.handle.localeCompare(b.handle)).slice(0, 100)); return;
        }
        json(200, { scope, location, needsLocation: !!needsLocation, ...rankCohort(cohort, user.id, offset) }); return;
      }
      if (path === "/connections" && method === "GET") {
        const rows = db.prepare(`SELECT u.* FROM users u WHERE u.id IN (SELECT followed_id FROM follows WHERE user_id = ?)
          OR u.id IN (SELECT user_id FROM follows WHERE followed_id = ?) ORDER BY u.handle LIMIT 100`).all(user.id, user.id) as unknown as User[];
        json(200, rows.filter(row => !blocked(user.id, row.id)).map(row => publicProfile(row, user.id))); return;
      }
      if (path === "/blocks" && method === "GET") {
        json(200, db.prepare("SELECT u.id, u.handle FROM users u JOIN blocks b ON b.blocked_id=u.id WHERE b.user_id=?").all(user.id)); return;
      }
      if (/^\/blocks\/[\w-]+$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const target = path.split("/")[2];
        if (target === user.id || !getUser(target)) fail(400, "Perfil no válido.");
        if (method === "PUT") {
          db.prepare("INSERT OR IGNORE INTO blocks VALUES (?, ?)").run(user.id, target);
          db.prepare("DELETE FROM follows WHERE (user_id=? AND followed_id=?) OR (user_id=? AND followed_id=?)").run(user.id, target, target, user.id);
        } else db.prepare("DELETE FROM blocks WHERE user_id=? AND blocked_id=?").run(user.id, target);
        json(200, { ok: true }); return;
      }
      if (path === "/profile-reports" && method === "POST") {
        const data = await body(req);
        const target = str(data.userId, 80), reason = str(data.reason, 300);
        if (target === user.id || !getUser(target) || !reason) fail(400, "Indica el perfil y el motivo.");
        db.prepare("INSERT OR REPLACE INTO profile_reports VALUES (?, ?, ?, ?)").run(user.id, target, reason, new Date().toISOString());
        json(200, { ok: true }); return;
      }
      if ((/^\/profiles\/[\w-]+\/comments$/.test(path) || /^\/comments\/[\w-]+(?:\/report)?$/.test(path) || path === "/me/comment-settings")) fail(410, "Los comentarios de perfil ya no están disponibles.");
      if (/^\/profiles\/[\w-]+\/comments$/.test(path) && method === "GET") {
        const profileId = path.split("/")[2], target = getUser(profileId);
        if (!target || blocked(user.id, profileId) || (!canComment(user.id, profileId) && user.id !== profileId)) fail(404, "Comentarios no disponibles.");
        const rows = db.prepare(`SELECT c.id, c.body, c.created, c.updated, c.author_id, u.handle, u.name, a.avatar FROM profile_comments c JOIN users u ON u.id=c.author_id LEFT JOIN user_avatars a ON a.user_id=u.id
          WHERE c.profile_id=? AND NOT EXISTS(SELECT 1 FROM comment_reports r WHERE r.comment_id=c.id AND r.user_id=?) ORDER BY c.created DESC LIMIT 100`).all(profileId, user.id) as { id: string; body: string; created: string; updated?: string; author_id: string; handle: string; name: string; avatar?: string }[];
        json(200, { audience: profileCommentsAudience(profileId), comments: rows.map(row => ({ id: row.id, body: row.body, created: row.created, updated: row.updated, authorId: row.author_id, author: { handle: row.handle, name: row.name, avatar: row.avatar ?? "mountain" } })) }); return;
      }
      if (/^\/profiles\/[\w-]+\/comments$/.test(path) && method === "POST") {
        const profileId = path.split("/")[2], data = await body(req), text = str(data.body, 500);
        if (!text || !getUser(profileId) || blocked(user.id, profileId) || !canComment(user.id, profileId)) fail(403, "No puedes comentar en este perfil.");
        rateLimit(`comment:${user.id}`, 30);
        const comment = { id: randomUUID(), body: text, created: new Date().toISOString(), authorId: user.id, author: { handle: user.handle, name: user.name, avatar: (db.prepare("SELECT avatar FROM user_avatars WHERE user_id=?").get(user.id) as { avatar: string } | undefined)?.avatar ?? "mountain" } };
        db.prepare("INSERT INTO profile_comments (id, profile_id, author_id, body, created) VALUES (?, ?, ?, ?, ?)").run(comment.id, profileId, user.id, text, comment.created);
        json(201, comment); return;
      }
      if (/^\/comments\/[\w-]+$/.test(path) && method === "DELETE") {
        const id = path.split("/")[2];
        const result = db.prepare("DELETE FROM profile_comments WHERE id=? AND (author_id=? OR profile_id=?)").run(id, user.id, user.id);
        if (!result.changes) fail(404, "Comentario no disponible.");
        json(200, { ok: true }); return;
      }
      if (/^\/comments\/[\w-]+\/report$/.test(path) && method === "POST") {
        const id = path.split("/")[2], data = await body(req), reason = str(data.reason, 300);
        if (!reason || !db.prepare("SELECT 1 FROM profile_comments WHERE id=?").get(id)) fail(400, "Indica el comentario y el motivo.");
        db.prepare("INSERT OR REPLACE INTO comment_reports VALUES (?, ?, ?, ?)").run(user.id, id, reason, new Date().toISOString()); json(200, { ok: true }); return;
      }
      if (path === "/me/comment-settings" && method === "PUT") {
        const data = await body(req), audience = str(data.audience, 20);
        if (!["everyone", "friends", "none"].includes(audience)) fail(400, "Revisa quién puede comentar.");
        db.prepare("INSERT INTO profile_comment_settings VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET audience=excluded.audience").run(user.id, audience);
        json(200, { audience }); return;
      }
      if (/^\/profiles\/[\w-]+\/reviews$/.test(path) && method === "GET") {
        const trainerId = path.split("/")[2];
        const rows = db.prepare(`SELECT r.id, r.rating, r.communication, r.adaptation, r.follow_up, r.body, r.created, u.handle, u.name FROM trainer_reviews r JOIN users u ON u.id=r.client_id WHERE r.trainer_id=? ORDER BY r.created DESC LIMIT 100`).all(trainerId) as { id: string; rating: number; communication: number; adaptation: number; follow_up: number; body: string; created: string; handle: string; name: string }[];
        const average = rows.length ? Math.round(rows.reduce((sum, row) => sum + row.rating, 0) / rows.length * 10) / 10 : null;
        json(200, { average, reviews: rows.map(row => ({ id: row.id, rating: row.rating, communication: row.communication, adaptation: row.adaptation, followUp: row.follow_up, body: row.body, created: row.created, author: { handle: row.handle, name: row.name } })) }); return;
      }
      if (/^\/profiles\/[\w-]+\/reviews$/.test(path) && method === "PUT") {
        const trainerId = path.split("/")[2], data = await body(req);
        const relationship = db.prepare("SELECT id FROM coaching_relationships WHERE client_id=? AND trainer_id=? AND status='active'").get(user.id, trainerId) as { id: string } | undefined;
        const values = [data.rating, data.communication, data.adaptation, data.followUp];
        if (!relationship || values.some(value => typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5)) fail(400, "Solo puedes reseñar una colaboración activa con valores de 1 a 5.");
        const [rating, communication, adaptation, followUp] = values as number[];
        const review = { body: str(data.body ?? "", 800), now: new Date().toISOString() };
        db.prepare(`INSERT INTO trainer_reviews VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(client_id, relationship_id) DO UPDATE SET rating=excluded.rating, communication=excluded.communication, adaptation=excluded.adaptation, follow_up=excluded.follow_up, body=excluded.body, updated=excluded.updated`).run(randomUUID(), user.id, trainerId, relationship.id, rating, communication, adaptation, followUp, review.body, review.now, review.now);
        json(200, { ok: true }); return;
      }
      if (/^\/follow\/[\w-]+$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const target = path.split("/")[2];
        if (target === user.id || !getUser(target) || blocked(user.id, target)) fail(400, "Perfil no válido.");
        if (method === "PUT") {
          const result = db.prepare("INSERT OR IGNORE INTO follows VALUES (?, ?)").run(user.id, target);
          if (result.changes > 0) db.prepare("INSERT OR IGNORE INTO notifications VALUES (?, ?, ?, ?, ?, NULL)").run(randomUUID(), target, user.id, "follow", Date.now());
        }
        else db.prepare("DELETE FROM follows WHERE user_id = ? AND followed_id = ?").run(user.id, target);
        json(200, publicProfile(getUser(target)!, user.id)); return;
      }
      if (path === "/notifications" && method === "GET") {
        const rows = db.prepare(`SELECT n.id, n.type, n.created, n.read_at, n.actor_id actorId, u.handle, u.name, (SELECT avatar FROM user_avatars WHERE user_id = u.id) avatar FROM notifications n JOIN users u ON u.id = n.actor_id WHERE n.recipient_id = ? ORDER BY n.created DESC`).all(user.id);
        json(200, rows); return;
      }
      if (path === "/notifications/read" && method === "PATCH") {
        db.prepare("UPDATE notifications SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL").run(Date.now(), user.id);
        json(200, { ok: true }); return;
      }
      if (path === "/me/notification-preferences") {
        if (method === "GET") { json(200, { achievementLikes: achievementLikeNotificationsEnabled(user.id) }); return; }
        if (method === "PATCH") {
          const data = await body(req);
          if (typeof data.achievementLikes !== "boolean") fail(400, "Revisa las notificaciones de felicitaciones.");
          db.prepare("INSERT INTO community_notification_preferences (user_id, achievement_likes) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET achievement_likes=excluded.achievement_likes").run(user.id, Number(data.achievementLikes));
          json(200, { achievementLikes: data.achievementLikes }); return;
        }
      }
      if (path === "/achievements" && method === "GET") {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) fail(400, "Revisa la página de logros.");
        const owner = url.searchParams.get("user") ?? "";
        const following = url.searchParams.get("following") === "1" ? 1 : 0;
        const rows = db.prepare(`SELECT a.id, a.user_id userId, a.type, a.tier_id tierId, a.exercise_id exerciseId, a.exercise_name exerciseName, a.kind, a.details, a.created, u.handle, u.name,
          (SELECT count(*) FROM achievement_likes l WHERE l.achievement_id = a.id) likes,
          EXISTS(SELECT 1 FROM achievement_likes l WHERE l.achievement_id = a.id AND l.user_id = ?) liked
          FROM achievements a JOIN users u ON u.id=a.user_id JOIN sharing_options o ON o.user_id=a.user_id JOIN community_privacy c ON c.user_id=a.user_id
          WHERE (? = '' OR a.user_id = ?) AND (? = 0 OR a.user_id IN (SELECT followed_id FROM follows WHERE user_id = ?))
          AND (a.user_id = ? OR (o.achievements = 1 AND (c.progress_visibility = 'public' OR (c.progress_visibility = 'friends' AND EXISTS(SELECT 1 FROM follows first JOIN follows second ON first.followed_id=second.user_id AND first.user_id=second.followed_id WHERE first.user_id=? AND first.followed_id=a.user_id)))))
          AND NOT EXISTS(SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=a.user_id) OR (user_id=a.user_id AND blocked_id=?))
          ORDER BY a.created DESC, a.id DESC LIMIT 21 OFFSET ?`).all(user.id, owner, owner, following, user.id, user.id, user.id, user.id, user.id, offset);
        json(200, { achievements: rows.slice(0, 20).map(row => {
          const item = row as Record<string, unknown>;
          let details: unknown = {};
          try { details = JSON.parse(String(item.details ?? "{}")); } catch { details = {}; }
          delete item.details;
          return { ...item, details };
        }), next: rows.length > 20 ? offset + 20 : null }); return;
      }
      if (/^\/achievements\/[\w-]+\/like$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const id = path.split("/")[2];
        const achievement = db.prepare("SELECT user_id FROM achievements WHERE id = ?").get(id) as { user_id: string } | undefined;
        if (!achievement || !canViewAchievements(achievement.user_id, user.id)) fail(404, "Logro no encontrado.");
        if (method === "PUT") {
          const result = db.prepare("INSERT OR IGNORE INTO achievement_likes VALUES (?, ?)").run(user.id, id);
          if (result.changes > 0 && achievement.user_id !== user.id && achievementLikeNotificationsEnabled(achievement.user_id))
            db.prepare("INSERT OR IGNORE INTO notifications VALUES (?, ?, ?, ?, ?, NULL)").run(randomUUID(), achievement.user_id, user.id, `achievement_like:${id}`, Date.now());
        }
        else db.prepare("DELETE FROM achievement_likes WHERE user_id = ? AND achievement_id = ?").run(user.id, id);
        json(200, { ok: true }); return;
      }
      if (path === "/posts" || /^\/posts\/[\w-]+(?:\/like)?$/.test(path) || path === "/reports") fail(410, "El muro de fotos ya no está disponible.");
      if (path === "/posts" && method === "GET") {
        const offset = Number(url.searchParams.get("offset") ?? 0);
        if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) fail(400, "Revisa la página de publicaciones.");
        const owner = url.searchParams.get("user") ?? "";
        const following = url.searchParams.get("following") === "1" ? 1 : 0;
        const posts = db.prepare(`SELECT p.id, p.user_id userId, p.caption, p.created, u.handle, u.name,
          (SELECT count(*) FROM likes WHERE post_id = p.id) likes,
          EXISTS(SELECT 1 FROM likes WHERE post_id = p.id AND user_id = ?) liked
          FROM posts p JOIN users u ON p.user_id = u.id
          WHERE (? = '' OR p.user_id = ?) AND (? = 0 OR p.user_id IN (SELECT followed_id FROM follows WHERE user_id = ?))
          AND NOT EXISTS(SELECT 1 FROM reports WHERE post_id = p.id AND user_id = ?)
          AND NOT EXISTS(SELECT 1 FROM blocks WHERE (user_id=? AND blocked_id=p.user_id) OR (user_id=p.user_id AND blocked_id=?))
          ORDER BY p.created DESC, p.id DESC LIMIT 21 OFFSET ?`).all(user.id, owner, owner, following, user.id, user.id, user.id, user.id, offset);
        json(200, { posts: posts.slice(0, 20), next: posts.length > 20 ? offset + 20 : null }); return;
      }
      if (path === "/posts" && method === "POST") {
        rateLimit(`upload:${user.id}`, 15);
        const data = await body(req);
        const caption = str(data.caption, 1000);
        const photo = str(data.photo, 7_000_000);
        const match = /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(photo);
        if (!match) fail(400, "Selecciona una imagen JPEG, PNG o WebP.");
        const input = Buffer.from(match[1], "base64");
        if (input.length > 5_000_000) fail(413, "La fotografía supera los 5 MB.");
        let output: Buffer;
        try { output = await sharp(input, { limitInputPixels: 25_000_000 }).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer(); }
        catch { return fail(400, "No se ha podido procesar la fotografía. Prueba otra imagen."); }
        requireSession();
        const id = randomUUID();
        db.prepare("INSERT INTO posts VALUES (?, ?, ?, ?, ?)").run(id, user.id, caption, output, new Date().toISOString());
        json(201, { id }); return;
      }
      if (/^\/posts\/[\w-]+$/.test(path) && method === "DELETE") {
        const result = db.prepare("DELETE FROM posts WHERE id = ? AND user_id = ?").run(path.split("/")[2], user.id);
        if (!result.changes) fail(404, "No puedes borrar esta publicación.");
        json(200, { ok: true }); return;
      }
      if (/^\/posts\/[\w-]+\/like$/.test(path) && ["PUT", "DELETE"].includes(method!)) {
        const id = path.split("/")[2];
        if (!db.prepare("SELECT 1 FROM posts WHERE id = ?").get(id)) fail(404, "Publicación no encontrada.");
        const author = db.prepare("SELECT user_id FROM posts WHERE id=?").get(id) as { user_id: string };
        if (blocked(user.id, author.user_id)) fail(404, "Publicación no encontrada.");
        if (method === "PUT") db.prepare("INSERT OR IGNORE INTO likes VALUES (?, ?)").run(user.id, id);
        else db.prepare("DELETE FROM likes WHERE user_id = ? AND post_id = ?").run(user.id, id);
        json(200, { ok: true }); return;
      }
      if (path === "/reports" && method === "POST") {
        const data = await body(req);
        const id = str(data.postId, 80), reason = str(data.reason, 300);
        if (!reason || !db.prepare("SELECT 1 FROM posts WHERE id = ?").get(id)) fail(400, "Indica una publicación y un motivo.");
        db.prepare("INSERT OR REPLACE INTO reports VALUES (?, ?, ?, ?)").run(user.id, id, reason, new Date().toISOString());
        json(200, { ok: true }); return;
      }
      if (path === "/comparison" && method === "DELETE") {
        db.prepare("DELETE FROM samples WHERE user_id = ?").run(user.id); json(200, { ok: true }); return;
      }
      if (path === "/comparison" && method === "POST") {
        const data = await body(req);
        if (!validLevel(data.level) || !Array.isArray(data.records) || data.records.length > 3000) fail(400, "Datos de progreso no válidos.");
        for (const r of data.records) {
          if (!r || !comparableIds.has(r.exerciseId) || !Number.isFinite(Date.parse(r.date)) || !Number.isFinite(r.strength) || r.strength <= 0 || r.strength > 2000 || (r.machineBrand !== undefined && (typeof r.machineBrand !== "string" || r.machineBrand.length > 60))) fail(400, "Registro de ejercicio no válido.");
        }
        const sample = data as unknown as ComparisonSample;
        db.prepare("INSERT OR REPLACE INTO samples VALUES (?, ?, ?)").run(user.id, JSON.stringify(sample), Date.now());
        db.prepare("DELETE FROM samples WHERE updated < ?").run(Date.now() - 28 * 86_400_000);
        const others = db.prepare("SELECT data FROM samples WHERE user_id != ?").all(user.id) as { data: string }[];
        json(200, compareProgress(sample, others.map(row => JSON.parse(row.data)))); return;
      }
      fail(404, "Ruta no encontrada.");
    } catch (error) {
      if (!(error instanceof ApiError)) console.error(JSON.stringify({ event: "request_error", requestId }));
      if (error instanceof ApiError && error.status === 429) res.setHeader("Retry-After", "900");
      if (!res.headersSent) json(error instanceof ApiError ? error.status : 500, { requestId, error: error instanceof ApiError ? error.message : "No se ha podido completar la operación. Inténtalo de nuevo." });
      else res.end();
    }
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.on("close", () => db.close());
  return server;
}
