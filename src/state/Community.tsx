import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { communityRequest, CommunityError, CommunityUser } from "../services/community";
import { useStore } from "./Store";
import { useAccount } from "./Account";
import { exportProgress, exportRoutine } from "../logic/sharing";

interface CommunityContext {
  token: string | null;
  user: CommunityUser | null;
  ready: boolean;
  error: string;
  authenticate: (register: boolean, data: unknown) => Promise<void>;
  authenticateGoogle: (credential: string, nonce: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refresh: () => Promise<void>;
  request: <T>(path: string, method?: string, data?: unknown) => Promise<T>;
}
const Context = createContext<CommunityContext | null>(null);
export function CommunityProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady } = useStore();
  const { user: accountUser, request: accountRequest } = useAccount();
  const [token, setToken] = useState<string | null>(null);
  const demoSession = useRef(false);
  const currentToken = useRef<string | null>(null);
  const uploads = useRef(Promise.resolve());
  const scheduleUpload = useCallback((session: string, upload: () => Promise<unknown>) => {
    let alive = true;
    const timer = setTimeout(() => {
      uploads.current = uploads.current.then(async () => {
        if (alive && currentToken.current === session) await upload();
      }).catch(() => undefined);
    }, 1000);
    return () => { alive = false; clearTimeout(timer); };
  }, []);
  const setSessionToken = useCallback((value: string | null) => { currentToken.current = value; setToken(value); }, []);
  const [user, setUser] = useState<CommunityUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    if (alive) { setSessionToken(accountUser?.id ?? null); setReady(true); }
    return () => { alive = false; currentToken.current = null; };
  }, [accountUser?.id, setSessionToken]);
  useEffect(() => {
    if (accountUser || !__DEV__ || typeof window === "undefined" || !new URLSearchParams(window.location.search).has("demo")) return;
    let alive = true;
    void communityRequest<{ token: string; user: CommunityUser }>("/auth/login", undefined, "POST", { handle: "marcos_avanza", password: "Akhyles-demo-local-2026" })
      .then(session => { if (alive) { demoSession.current = true; setSessionToken(session.token); setUser(session.user); setError(""); } })
      .catch(error => { if (alive) setError(error.message); });
    return () => { alive = false; };
  }, [accountUser, setSessionToken]);
  const request = useCallback(async <T,>(path: string, method = "GET", data?: unknown): Promise<T> => {
    try { return demoSession.current ? await communityRequest<T>(path, currentToken.current ?? undefined, method, data) : await accountRequest<T>(`/community${path}`, method, data); }
    catch (error) {
      if (error instanceof CommunityError && error.status === 401) { setSessionToken(null); setUser(null); }
      throw error;
    }
  }, [accountRequest, setSessionToken]);
  const refresh = useCallback(async () => {
    if (!token) return;
    const profile = await request<CommunityUser>("/me");
    if (currentToken.current !== token) return;
    setUser(profile); setError("");
  }, [token, request]);
  useEffect(() => {
    if (!token) return;
    let alive = true;
    request<CommunityUser>("/me").then(profile => { if (alive) { setUser(profile); setError(""); } })
      .catch(error => {
        if (!alive) return;
        if (error instanceof CommunityError && error.status === 401) { setSessionToken(null); setUser(null); }
        setError(error.message);
      });
    return () => { alive = false; };
  }, [token, request, setSessionToken]);
  // The @ chosen in the main profile is the Community handle too. The server
  // is authoritative: it reserves the handle and rejects duplicates.
  useEffect(() => {
    const handle = (state.profile.handle ?? "").trim().replace(/^@/, "").toLowerCase();
    if (!token || !user || !/^[a-z0-9_]{3,24}$/.test(handle) || handle === user.handle) return;
    let alive = true;
    request<CommunityUser>("/me", "PATCH", {
      handle,
      name: state.profile.name || user.name,
      avatar: state.profile.avatar || user.avatar,
      level: state.profile.level || user.level,
    }).then(profile => { if (alive) { setUser(profile); setError(""); } })
      .catch(error => { if (alive) setError(error.message); });
    return () => { alive = false; };
  }, [token, user?.handle, user?.name, user?.avatar, user?.level, state.profile.handle, state.profile.name, state.profile.avatar, state.profile.level, request]);
  const logout = useCallback(async () => {
    setSessionToken(null); setUser(null); setError("");
  }, [setSessionToken]);
  const deleteAccount = useCallback(async () => {
    throw new Error("Tu perfil de Comunidad forma parte de tu cuenta Akhyles. Gestiona la cuenta desde Cuenta y copias.");
  }, []);
  useEffect(() => {
    if (state.signedOut && token) {
      currentToken.current = null;
      setSessionToken(null); setUser(null);
    }
  }, [state.signedOut, token, setSessionToken]);
  // Detailed history and body measurements each require their own opt-in.
  useEffect(() => {
    if (!storeReady || state.signedOut || !token || !(user?.progressPublic || user?.rankingPublic)) return;
    return scheduleUpload(token, () => request("/progress/me", "PUT", exportProgress(state, !!user?.detailsPublic && !!user?.progressPublic, !!user?.bodyWeightPublic && !!user?.progressPublic)));
  }, [state, storeReady, token, user?.progressPublic, user?.detailsPublic, user?.bodyWeightPublic, user?.rankingPublic, scheduleUpload, request]);
  useEffect(() => {
    if (!storeReady || state.signedOut || !token || !user?.routinePublic || !state.routine.length) return;
    return scheduleUpload(token, () => request("/routines/me", "PUT", exportRoutine(state.routine, state.preferences)));
  }, [storeReady, state.signedOut, state.routine, state.preferences, token, user?.routinePublic, scheduleUpload, request]);
  // Managed routines are separate from public Community sharing. A client only syncs a plan
  // after an explicitly accepted coaching relationship exists.
  useEffect(() => {
    if (!storeReady || state.signedOut || !token || !state.routine.length) return;
    let alive = true;
    void request<{ status: string; role: string }[]>("/coaching").then(relationships => {
      if (alive && relationships.some(item => item.status === "active" && item.role === "client"))
        return request("/coaching/routine/me", "PUT", exportRoutine(state.routine, state.preferences));
      return undefined;
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [storeReady, state.signedOut, state.routine, state.preferences, token, request]);
  return <Context.Provider value={{ token, user, ready, error, request, refresh, logout, deleteAccount,
    authenticateGoogle: async () => { throw new Error("Inicia sesión con tu cuenta Akhyles."); },
    authenticate: async () => { throw new Error("Crea o inicia sesión en tu cuenta Akhyles."); },
  }}>{children}</Context.Provider>;
}
export function useCommunity() {
  const value = useContext(Context);
  if (!value) throw new Error("CommunityProvider missing");
  return value;
}
