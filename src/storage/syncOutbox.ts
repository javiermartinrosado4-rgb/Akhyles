import { Platform } from "react-native";
import { SyncEntity, SyncEntityType } from "../logic/syncV2";
import { getNativeDatabase } from "./native-sqlite";

export interface PendingSyncOperation {
  opId: string;
  type: SyncEntityType;
  id: string;
  baseRevision: number;
  deleted?: boolean;
  data?: unknown;
  createdAt: number;
}

function operationId(): string {
  const value = globalThis.crypto?.randomUUID?.();
  return value ? `sync2_${value}` : `sync2_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}
export function newSyncOperation(entity: SyncEntity, baseRevision = 0): PendingSyncOperation {
  return { opId: operationId(), type: entity.type, id: entity.id, baseRevision, data: entity.data, createdAt: Date.now() };
}

const WEB_DB = "akhyles-sync-v2"; const WEB_STORE = "outbox";
async function webStore(): Promise<IDBDatabase | null> {
  if (Platform.OS !== "web" || typeof indexedDB === "undefined") return null;
  return new Promise(resolve => {
    try {
      const request = indexedDB.open(WEB_DB, 1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(WEB_STORE)) request.result.createObjectStore(WEB_STORE, { keyPath: "opId" }); };
      request.onsuccess = () => resolve(request.result); request.onerror = request.onblocked = () => resolve(null);
    } catch { resolve(null); }
  });
}
async function webTransaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore, done: (value: T) => void) => void): Promise<T | null> {
  const database = await webStore(); if (!database) return null;
  return new Promise(resolve => {
    try {
      const tx = database.transaction(WEB_STORE, mode); let result: T | null = null;
      run(tx.objectStore(WEB_STORE), value => { result = value; });
      tx.oncomplete = () => { database.close(); resolve(result); };
      tx.onerror = tx.onabort = () => { database.close(); resolve(null); };
    } catch { database.close(); resolve(null); }
  });
}

/** A separate durable queue means cloud retries never enlarge the app state blob. */
export async function enqueueSyncOperations(operations: PendingSyncOperation[]): Promise<void> {
  if (!operations.length) return;
  if (Platform.OS === "web") {
    const saved = await webTransaction<void>("readwrite", (store, done) => { operations.forEach(operation => store.put(operation)); done(undefined); });
    if (saved === null) throw new Error("No se puede guardar la cola de sincronizaciÃ³n en este navegador.");
    return;
  }
  const db = await getNativeDatabase();
  if (!db) throw new Error("No se puede abrir la cola de sincronizaciÃ³n local.");
  db.execSync("BEGIN IMMEDIATE");
  try { for (const operation of operations) db.runSync("INSERT OR REPLACE INTO sync_v2_outbox(operation_id,payload,created) VALUES (?,?,?)", operation.opId, JSON.stringify(operation), operation.createdAt); db.execSync("COMMIT"); }
  catch (error) { db.execSync("ROLLBACK"); throw error; }
}
export async function pendingSyncOperations(limit = 100): Promise<PendingSyncOperation[]> {
  if (Platform.OS === "web") {
    const values = await webTransaction<PendingSyncOperation[]>("readonly", (store, done) => {
      const request = store.getAll(); request.onsuccess = () => done((request.result as PendingSyncOperation[]).sort((a,b) => a.createdAt-b.createdAt).slice(0, limit));
    });
    return values ?? [];
  }
  const db = await getNativeDatabase(); if (!db) return [];
  return db.getAllSync<{ payload: string }>("SELECT payload FROM sync_v2_outbox ORDER BY created ASC LIMIT ?", limit)
    .flatMap(row => { try { return [JSON.parse(row.payload) as PendingSyncOperation]; } catch { return []; } });
}
export async function acknowledgeSyncOperations(ids: string[]): Promise<void> {
  if (!ids.length) return;
  if (Platform.OS === "web") { await webTransaction<void>("readwrite", (store, done) => { ids.forEach(id => store.delete(id)); done(undefined); }); return; }
  const db = await getNativeDatabase(); if (!db) return;
  db.execSync("BEGIN IMMEDIATE");
  try { for (const id of ids) db.runSync("DELETE FROM sync_v2_outbox WHERE operation_id=?", id); db.execSync("COMMIT"); }
  catch (error) { db.execSync("ROLLBACK"); throw error; }
}
