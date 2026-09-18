import type { NativeDatabase } from './native-sqlite';

let nativeDatabase: NativeDatabase | undefined;
let nativeDatabasePromise: Promise<NativeDatabase | undefined> | undefined;

export async function getNativeDatabase(): Promise<NativeDatabase | undefined> {
  if (nativeDatabase) return nativeDatabase;
  if (!nativeDatabasePromise) nativeDatabasePromise = import('expo-sqlite').then(({ openDatabaseSync }) => {
    nativeDatabase = openDatabaseSync('akhyles-state.db') as unknown as NativeDatabase;
    nativeDatabase.execSync('CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY NOT NULL, payload TEXT NOT NULL); CREATE TABLE IF NOT EXISTS app_recovery (id INTEGER PRIMARY KEY AUTOINCREMENT, payload TEXT NOT NULL, created INTEGER NOT NULL);');
    nativeDatabase.runSync('DELETE FROM app_recovery WHERE id NOT IN (SELECT id FROM app_recovery ORDER BY created DESC LIMIT 3)');
    return nativeDatabase;
  }).catch(() => {
    nativeDatabasePromise = undefined;
    return undefined;
  });
  return nativeDatabasePromise;
}
