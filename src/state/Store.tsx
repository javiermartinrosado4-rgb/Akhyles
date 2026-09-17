import { messages } from "../content/es";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "../types";
import { emptyPreferences, emptyProfile } from "../data/options";
import { archiveState, localRepository, purgeArchivedStates } from "../storage/repository";
import { repairLegacyDemoScores } from "../data/demoScenarios";
import { resumeWorkout } from "../logic/workout";
import { syncPersonalAchievements } from "../logic/personalAchievements";
import { ensureProgramHistory, preserveProgramHistory } from "../logic/programHistory";
export const initialState: AppState = {
  version: 1, profile: emptyProfile, preferences: emptyPreferences,
  onboardingStep: 0, completed: false, theme: "system", routine: [], history: [],
};
type Store = {
  state: AppState;
  update: (fn: (s: AppState) => AppState) => void;
  persist: (fn: (s: AppState) => AppState) => Promise<AppState>;
  getState: () => AppState;
  ready: boolean; storageBlocked: boolean; storageError: string; retry: () => void;
};
const Context = createContext<Store | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [ready, setReady] = useState(false);
  const [storageError, setError] = useState("");
  const [storageBlocked, setStorageBlocked] = useState(true);
  const blocked = useRef(true);
  const queue = useRef(Promise.resolve());
  const stateRef = useRef(state);
  const getState = useCallback(() => stateRef.current, []);
  const hydrate = useCallback(async () => {
    try {
      // Migrate legacy full-state recovery rows before any screen can query
      // them; reading an oversized Android row can itself throw CursorWindow.
      await purgeArchivedStates();
      const saved = await localRepository.load();
      if (saved) {
        const repaired = __DEV__ ? repairLegacyDemoScores(saved) : saved;
        if (repaired !== saved) await archiveState(saved);
        const migrated = ensureProgramHistory(repaired);
        // Achievements are derived data. Rebuild them on hydration so users
        // with an existing history receive milestones retroactively, even when
        // an older state already contains an empty achievements array.
        const hydrated = syncPersonalAchievements(migrated);
        if (hydrated !== saved) await localRepository.save(hydrated);
        stateRef.current = hydrated; setState(hydrated);
      }
      blocked.current = false; setStorageBlocked(false); setError("");
    } catch { setError(messages.Store.noHemosPodidoRecuperarTusDatosPuedes); }
    finally { setReady(true); }
  }, []);
  useEffect(() => { void Promise.resolve().then(hydrate); }, [hydrate]);
  const persist = useCallback((fn: (s: AppState) => AppState): Promise<AppState> => {
    if (blocked.current) return Promise.reject(new Error("El almacenamiento local aún no está disponible."));
    const changed = syncPersonalAchievements(preserveProgramHistory(stateRef.current, fn(stateRef.current)));
    const next = changed.active ? { ...changed, active: resumeWorkout(changed) } : changed;
    stateRef.current = next; setState(next);
    const write = queue.current.then(() => localRepository.save(next)).then(() => { setError(""); return next; });
    queue.current = write.then(() => undefined, () => { setError(messages.Store.noSeHanPodidoGuardarLosUltimos); });
    return write;
  }, []);
  const update = useCallback((fn: (s: AppState) => AppState) => { void persist(fn).catch(() => undefined); }, [persist]);
  const retry = useCallback(() => {
    if (blocked.current) void hydrate();
    else void persist(s => s).catch(() => undefined);
  }, [hydrate,persist]);
  return <Context.Provider value={{state,update,persist,getState,ready,storageBlocked,storageError,retry}}>{children}</Context.Provider>;
}
export function useStore() { const v=useContext(Context); if (!v) throw new Error("Store missing"); return v; }
