import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP } from "../config";
import { AppState } from "../types";
import { catalog } from "../data/catalog";
import { validRange, validWeight } from "../logic/validation";
import { validAvatar, validAvatarPhoto } from "../data/avatars";
import { resumeWorkout } from "../logic/workout";
import { localDateKey } from "../logic/schedule";
import { validBarWeight } from "../logic/load";
import { validStoredCollections } from "../logic/storedState";
import { defaultTrainingDays } from "../data/options";
import { validStrengthReference } from "../logic/strengthReferences";
export interface StateRepository {
  load(): Promise<AppState | null>;
  save(state: AppState): Promise<void>;
}

type NativeDatabase = { execSync(source: string): void; runSync(source: string, ...params: unknown[]): unknown; getFirstSync<T>(source: string): T | null };
let nativeDatabase: NativeDatabase | undefined;
let nativeDatabasePromise: Promise<NativeDatabase | undefined> | undefined;
async function sqlite() {
  const isNative = typeof navigator !== "undefined" && navigator.product === "ReactNative";
  if (!isNative) return undefined;
  if (nativeDatabase) return nativeDatabase;
  if (!nativeDatabasePromise) nativeDatabasePromise = import("expo-sqlite").then(({ openDatabaseSync }) => {
    nativeDatabase = openDatabaseSync("akhyles-state.db") as unknown as NativeDatabase;
    nativeDatabase.execSync("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS app_recovery (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created INTEGER NOT NULL);");
    nativeDatabase.runSync("DELETE FROM app_recovery WHERE id NOT IN (SELECT id FROM app_recovery ORDER BY created DESC LIMIT 3)");
    return nativeDatabase;
  }).catch(() => { nativeDatabasePromise = undefined; return undefined; });
  return nativeDatabasePromise;
}

/**
 * A stale weekday selection can survive a program import or an earlier app
 * version. Availability is derived metadata, so repair it while reading data
 * instead of blocking a complete workout history or its cloud sync.
 */
export function repairTrainingDays(profile: AppState["profile"]): AppState["profile"] {
  const { days, trainingDays } = profile;
  if (trainingDays === undefined || !Number.isInteger(days) || days < 1 || days > 7) return profile;
  const valid = Array.isArray(trainingDays)
    ? [...new Set(trainingDays.filter(day => Number.isInteger(day) && day >= 1 && day <= 7))]
    : [];
  if (Array.isArray(trainingDays) && valid.length === days && valid.length === trainingDays.length) return profile;
  const repaired = [...valid, ...defaultTrainingDays(days).filter(day => !valid.includes(day))].slice(0, days);
  return { ...profile, trainingDays: repaired };
}

function repairStoredTrainingDays(state: AppState): AppState {
  const profile = repairTrainingDays(state.profile);
  const routineVersions = Array.isArray(state.routineVersions)
    ? state.routineVersions.map(version => version && typeof version === "object" && "profile" in version
      ? { ...version, profile: repairTrainingDays(version.profile) }
      : version)
    : state.routineVersions;
  return profile === state.profile && routineVersions === state.routineVersions ? state : { ...state, profile, routineVersions };
}
function repairStoredMaps(state: AppState): AppState {
  const map = (value: unknown) => Array.isArray(value) && value.length === 0 ? {} : value;
  const preferences = state.preferences && {
    ...state.preferences,
    names: map(state.preferences.names),
    weights: map(state.preferences.weights),
    ranges: map(state.preferences.ranges),
    notes: map(state.preferences.notes),
    loadSteps: map(state.preferences.loadSteps),
    barWeights: map(state.preferences.barWeights),
    apparatusWeights: map(state.preferences.apparatusWeights),
    machineBrands: map(state.preferences.machineBrands),
    loadModes: map(state.preferences.loadModes),
  } as AppState["preferences"];
  const active = state.active && {
    ...state.active,
    drafts: map(state.active.drafts),
    barWeights: map(state.active.barWeights),
    apparatusWeights: map(state.active.apparatusWeights),
    machineBrands: map(state.active.machineBrands),
    weighted: map(state.active.weighted),
    loadModes: map(state.active.loadModes),
  } as AppState["active"];
  return preferences === state.preferences && active === state.active ? state : { ...state, preferences, active };
}
export function decodeState(raw: string): AppState {
  const s = repairStoredMaps(repairStoredTrainingDays(JSON.parse(raw) as AppState));
  if (!validStoredCollections(s)) throw new Error("Invalid stored collections");
  if (
    !s ||
    s.version !== 1 ||
    !s.profile ||
    !s.preferences ||
    !Array.isArray(s.routine) ||
    !Array.isArray(s.history) ||
    !["system", "light", "dark"].includes(s.theme)
  )
    throw new Error("Invalid state");
  const p = s.profile;
  if (s.preferences.barWeights !== undefined && (!s.preferences.barWeights || typeof s.preferences.barWeights !== "object" || Array.isArray(s.preferences.barWeights) || Object.values(s.preferences.barWeights).some(value => !validBarWeight(value)))) throw new Error("Invalid bar weights");
  if (s.preferences.apparatusWeights !== undefined && (!s.preferences.apparatusWeights || typeof s.preferences.apparatusWeights !== "object" || Array.isArray(s.preferences.apparatusWeights) || Object.values(s.preferences.apparatusWeights).some(value => !validBarWeight(value)))) throw new Error("Invalid apparatus weights");
  if (s.history.some(workout => workout.records?.some(record => (record.barWeight !== undefined && !validBarWeight(record.barWeight)) || (record.apparatusWeight !== undefined && !validBarWeight(record.apparatusWeight))))) throw new Error("Invalid historical base weight");
  if (s.routineVersions !== undefined && (!Array.isArray(s.routineVersions) || s.routineVersions.some(version =>
    !version || typeof version.effectiveFrom !== "string" || !Number.isFinite(Date.parse(version.effectiveFrom)) ||
    !version.profile || !Number.isInteger(version.profile.days) || version.profile.days < 1 || version.profile.days > 7 ||
    (version.profile.trainingDays !== undefined && (!Array.isArray(version.profile.trainingDays) ||
      new Set(version.profile.trainingDays).size !== version.profile.days || version.profile.trainingDays.some(day => !Number.isInteger(day) || day < 1 || day > 7))) ||
    !Array.isArray(version.routine) || version.routine.some(day => !day || typeof day.id !== "string" || typeof day.name !== "string" ||
      !Array.isArray(day.exercises) || day.exercises.some(entry => !entry || typeof entry.exerciseId !== "string" ||
        !validRange(entry.range) || !validWeight(entry.weight) || !Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > 6))
  ))) throw new Error("Invalid routine history");
  if (s.cloud !== undefined && (!s.cloud || typeof s.cloud.owner !== "string" ||
      !Number.isSafeInteger(s.cloud.revision) || s.cloud.revision < 0 ||
      (s.cloud.base !== null && typeof s.cloud.base !== "string"))) throw new Error("Invalid sync metadata");
  if (p.avatar !== undefined && !validAvatar(p.avatar) && !validAvatarPhoto(p.avatar)) throw new Error("Invalid avatar");
  if ((p.name !== undefined && typeof p.name !== "string") || (p.handle !== undefined && typeof p.handle !== "string") ||
    (p.includeGlutes !== undefined && typeof p.includeGlutes !== "boolean") || (p.mesocycle !== undefined && typeof p.mesocycle !== "boolean") ||
    (s.signedOut !== undefined && typeof s.signedOut !== "boolean")) throw new Error("Invalid profile additions");
  if (
    p.trainingDays !== undefined &&
    (!Array.isArray(p.trainingDays) ||
      new Set(p.trainingDays).size !== p.days ||
      p.trainingDays.some((day) => !Number.isInteger(day) || day < 1 || day > 7))
  )
    throw new Error("Invalid training days");
  if (s.bodyWeights !== undefined && (!Array.isArray(s.bodyWeights) || s.bodyWeights.some(p => !Number.isFinite(p.weight) || p.weight < 30 || p.weight > 350 || !Number.isFinite(Date.parse(p.date))))) throw new Error("Invalid body weight history");
  if (s.strengthReferences !== undefined && (!Array.isArray(s.strengthReferences) || s.strengthReferences.length > 5 || s.strengthReferences.some(item => !validStrengthReference(item)) || new Set(s.strengthReferences.map(item => item.id)).size !== s.strengthReferences.length)) throw new Error("Invalid strength references");
  if (s.weightReminderNotificationId !== undefined && typeof s.weightReminderNotificationId !== "string") throw new Error("Invalid weight reminder");
  if (s.trainingReminderNotificationIds !== undefined && (!Array.isArray(s.trainingReminderNotificationIds) || s.trainingReminderNotificationIds.some(id => typeof id !== "string"))) throw new Error("Invalid training reminders");
  if (s.volumeTargets !== undefined && (
    typeof s.volumeTargets !== "object" ||
    Object.entries(s.volumeTargets).some(([muscle, value]) =>
      !catalog.some(exercise => exercise.muscle === muscle) ||
      !Number.isInteger(value) || value < 0 || value > 60,
    )
  )) throw new Error("Invalid volume targets");
  if (s.plannedWorkouts !== undefined && (!Array.isArray(s.plannedWorkouts) || s.plannedWorkouts.some(item =>
    !item || typeof item.dayId !== "string" || !item.day || typeof item.day.name !== "string" || !Array.isArray(item.day.exercises) || !Number.isFinite(Date.parse(item.date))))
  ) throw new Error("Invalid planned workouts");
  if (s.plannedWorkouts && new Set(s.plannedWorkouts.map(item => localDateKey(item.date))).size !== s.plannedWorkouts.length) throw new Error("Duplicate planned workouts");
  if (s.skippedWorkoutDates !== undefined && (
    !Array.isArray(s.skippedWorkoutDates) ||
    s.skippedWorkoutDates.some(date => typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) ||
    new Set(s.skippedWorkoutDates).size !== s.skippedWorkoutDates.length
  )) throw new Error("Invalid skipped workout dates");
  if (
    !["beginner", "intermediate", "advanced"].includes(p.level) ||
    !Number.isInteger(p.days) ||
    p.days < 1 ||
    p.days > 7 ||
    !["male", "female", ""].includes(p.sex) ||
    ![p.age, p.height, p.weight].every((v) => typeof v === "string") ||
    (p.birthDate !== undefined && typeof p.birthDate !== "string") ||
    (p.weightReminder !== undefined && typeof p.weightReminder !== "boolean") ||
    (p.trainingReminder !== undefined && typeof p.trainingReminder !== "boolean")
  )
    throw new Error("Invalid profile");
  const prefs = s.preferences;
  if (
    !Array.isArray(prefs.custom) ||
    !Array.isArray(prefs.unavailable) ||
    (prefs.favorites !== undefined &&
      (!Array.isArray(prefs.favorites) ||
        prefs.favorites.some(id => typeof id !== "string") ||
        new Set(prefs.favorites).size !== prefs.favorites.length)) ||
    !Array.isArray(prefs.equipment) ||
    !prefs.names ||
    (prefs.notes !== undefined &&
      (typeof prefs.notes !== "object" ||
        Object.values(prefs.notes).some(note => typeof note !== "string" || note.length > 300))) ||
    !prefs.weights ||
    !prefs.ranges
  )
    throw new Error("Invalid preferences");
  const ids = new Set([...catalog, ...prefs.custom].map((e) => e.id));
  if (prefs.favorites?.some(id => !ids.has(id))) throw new Error("Invalid favorite exercises");
  if (
    s.routine.some(
      (d) =>
        !Array.isArray(d.exercises) ||
        d.exercises.some(
          (e) =>
            !ids.has(e.exerciseId) ||
            !validRange(e.range) ||
            !validWeight(e.weight) ||
            !Number.isInteger(e.sets) ||
            e.sets < 1 ||
            e.sets > 6,
        ),
    )
  )
    throw new Error("Invalid routine");
  if (s.plannedWorkouts?.some(item => item.day.exercises.some(e =>
    !ids.has(e.exerciseId) || !validRange(e.range) || !validWeight(e.weight) || !Number.isInteger(e.sets) || e.sets < 1 || e.sets > 6,
  ))) throw new Error("Invalid planned workout exercises");
  if (
    s.active &&
    (!Array.isArray(s.active.draft) ||
      (s.active.skipped !== undefined &&
        (!Array.isArray(s.active.skipped) ||
          s.active.skipped.some((id) => typeof id !== "string"))) ||
      (s.active.drafts !== undefined &&
        (typeof s.active.drafts !== "object" ||
          Object.values(s.active.drafts).some((draft) => !Array.isArray(draft)))) ||
      !s.active.day?.exercises?.length ||
      !Number.isInteger(s.active.index) ||
      s.active.index < 0 ||
      s.active.index >= s.active.day.exercises.length)
  )
    throw new Error("Invalid session");
  // Older local profiles can contain the retired body-fat estimator. Drop it
  // during hydration so it can neither reappear in the UI nor affect weight data.
  const { fatMode: _fatMode, bodyFat: _bodyFat, photoConfirmed: _photoConfirmed, ...profile } = p as typeof p & {
    fatMode?: unknown; bodyFat?: unknown; photoConfirmed?: unknown;
  };
  // Existing profiles predate the explicit bodyweight category. Keep it
  // available without making users revisit their gym-equipment settings.
  const preferences: AppState["preferences"] = s.preferences.equipment.includes("bodyweight")
    ? s.preferences
    : { ...s.preferences, equipment: [...s.preferences.equipment, "bodyweight"] as AppState["preferences"]["equipment"] };
  const next = { ...s, profile, preferences };
  return next.active ? { ...next, active: resumeWorkout(next) } : next;
}
export const localRepository: StateRepository = {
  async load() {
    const db = await sqlite();
    let raw = db?.getFirstSync<{ payload: string }>("SELECT payload FROM app_state WHERE id=1")?.payload;
    if (!raw) {
      raw = (await AsyncStorage.getItem(APP.storageKey)) ?? undefined;
      if (raw && db) {
        try {
          const decoded = decodeState(raw);
          db.runSync("INSERT INTO app_state(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", raw);
          await AsyncStorage.removeItem(APP.storageKey);
          return decoded;
        } catch {
          db.runSync("INSERT INTO app_recovery(payload,created) VALUES(?,?)", raw, Date.now());
          await AsyncStorage.removeItem(APP.storageKey);
          return null;
        }
      }
    }
    if (!raw) return null;
    try {
      return decodeState(raw);
    } catch (error) {
      if (db) {
        db.runSync("INSERT INTO app_recovery(payload,created) VALUES(?,?)", raw, Date.now());
        db.runSync("DELETE FROM app_state WHERE id=1");
        return null;
      }
      // A state written by an older release can fail the current collection
      // validator. Keep the exact payload recoverable, but move it out of the
      // primary slot so account login and cloud restore are not blocked by a
      // stale local schema.
      const recoveryKey = `${APP.storageKey}:invalid:${Date.now()}`;
      try {
        await AsyncStorage.setItem(recoveryKey, raw);
        await AsyncStorage.removeItem(APP.storageKey);
      } catch {
        // If the quarantine cannot be completed, retain the original failure
        // rather than risking an overwrite of the only local copy.
        throw error;
      }
      return null;
    }
  },
  async save(state) {
    const raw = JSON.stringify(state);
    const db = await sqlite();
    if (db) db.runSync("INSERT INTO app_state(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload", raw);
    else await AsyncStorage.setItem(APP.storageKey, raw);
  },
};

/**
 * Recovery copies now live in the encrypted cloud revision history. Older
 * releases stored complete AppState rows in AsyncStorage; those rows could
 * exceed Android's CursorWindow even when the database itself had space.
 * Remove only the legacy archive keys. The primary state and workout history
 * use a different key and are never touched here.
 */
export async function archiveState(state: AppState): Promise<string> {
  void state;
  await purgeArchivedStates();
  return "";
}
export async function purgeArchivedStates(): Promise<void> {
  const keys = (await AsyncStorage.getAllKeys()).filter(key => key.startsWith("akhyles:archive:"));
  if (keys.length) await AsyncStorage.multiRemove(keys);
}
export async function archivedStates(owner: string): Promise<{ key: string; state: AppState }[]> {
  void owner;
  await purgeArchivedStates();
  return [];
}
