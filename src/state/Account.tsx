import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState as NativeAppState, Platform } from "react-native";
import { accountRequest, accountUrl, AccountError, AccountSession, AccountUser } from "../services/account";
import { communitySession as secureSession } from "../storage/communitySession";
import { acknowledge, cloudState, conflictAreas, mergeConcurrentProgress, RemoteCopy, snapshot, syncDecision } from "../logic/cloud";
import { archiveState, archivedStates, decodeState } from "../storage/repository";
import { AppState } from "../types";
import { initialState, useStore } from "./Store";

type Status = "local" | "pending" | "syncing" | "saved" | "conflict" | "error";
interface Conflict { remote: RemoteCopy; local: AppState; areas: string[] }
export interface CloudRecovery { key: string; revision: number; updated: string; state: AppState }
interface AccountContext {
  user: AccountUser | null; ready: boolean; status: Status; error: string; conflict: Conflict | null;
  login: (email: string,password: string) => Promise<void>;
  verify: (challengeId: string,code: string) => Promise<void>;
  authenticateGoogle: (credential: string,nonce: string) => Promise<void>;
  linkGoogle: (credential: string,nonce: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (confirmEmail: string) => Promise<void>;
  sync: () => Promise<void>;
  resolve: (choice: "local" | "cloud") => Promise<void>;
  restoreArchive: (key: string) => Promise<void>;
  listRecoveryCopies: () => Promise<CloudRecovery[]>;
  request: <T>(path: string, method?: string, data?: unknown) => Promise<T>;
}
const Context = createContext<AccountContext | null>(null);
const sessionKey = `akhyles:account:${accountUrl}`;
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady, getState, persist } = useStore();
  const [session,setSession] = useState<AccountSession | null>(null);
  const current = useRef<AccountSession | null>(null);
  const [ready,setReady] = useState(false);
  const [status,setStatus] = useState<Status>("local");
  const [error,setError] = useState("");
  const [conflict,setConflict] = useState<Conflict | null>(null);
  const conflictRef = useRef<Conflict | null>(null);
  const busy = useRef(false);
  const rerun = useRef(false);
  const syncRef = useRef<() => Promise<void>>(async () => undefined);
  const authenticating = useRef(false);
  const generation = useRef(0);
  const setCurrent = useCallback((s: AccountSession | null) => { current.current=s; setSession(s); },[]);
  const showConflict = useCallback((c: Conflict | null) => { conflictRef.current=c; setConflict(c); },[]);
  const report = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "No se ha podido sincronizar."); setStatus("error");
    const token=current.current?.token;
    // Never send the error message or workout data: the server stores only a daily aggregate count.
    if (token) void accountRequest("/telemetry/event",token,"POST",{event:"sync_error"}).catch(()=>undefined);
  },[]);
  useEffect(() => {
    let alive=true;
    void secureSession.getItem(sessionKey).then(raw => {
      if (!alive || !raw) return;
      const s=JSON.parse(raw) as AccountSession;
      if (typeof s.token !== "string" || typeof s.user?.id !== "string" || typeof s.user.email !== "string") throw new Error("Sesión no válida. Vuelve a entrar.");
      setCurrent(s);
    }).catch(report).finally(() => { if (alive) setReady(true); });
    return () => { alive=false; };
  },[report,setCurrent]);
  const request = useCallback(async <T,>(path: string,method="GET",data?: unknown) => {
    const s=current.current;
    if (!s) throw new Error("Inicia sesión para continuar.");
    return accountRequest<T>(path,s.token,method,data);
  },[]);
  const listRecoveryCopies = useCallback(async (): Promise<CloudRecovery[]> => {
    const s = current.current;
    if (!s) throw new Error("Inicia sesión para continuar.");
    const result = await accountRequest<{versions:{revision:number;updated:string}[]}>("/sync/versions",s.token);
    const versions = Array.isArray(result.versions) ? result.versions.slice(0,20) : [];
    return Promise.all(versions.map(async version => {
      const copy = await accountRequest<{revision:number;updated:string;state:AppState}>(`/sync/versions/${version.revision}`,s.token);
      return { key:`cloud:${copy.revision}`, revision:copy.revision, updated:copy.updated, state:decodeState(JSON.stringify(cloudState(copy.state))) };
    }));
  },[]);
  const sync = useCallback(async () => {
    const s=current.current;
    if (!s || authenticating.current || conflictRef.current || !storeReady || getState().signedOut) return;
    // Never drop a sync request just because another request is in flight.
    // A completed workout can otherwise remain local until the next launch.
    if (busy.current) { rerun.current=true; return; }
    busy.current=true; const epoch=generation.current; setStatus("syncing"); setError("");
    const active = () => generation.current===epoch && current.current?.user.id===s.user.id;
    try {
      // Local persistence is normally complete before this timer runs. If a
      // browser quota or device database error occurs, do not strand the
      // in-memory finished workout: account users can still make the cloud
      // copy durable and restore it on the next launch.
      try { await persist(v=>v); } catch { /* StoreProvider exposes the local warning separately. */ }
      const remote=await accountRequest<RemoteCopy>("/sync",s.token);
      if (!active()) return;
      if (!Number.isSafeInteger(remote.revision) || remote.revision<0) throw new Error("La respuesta de la nube no es válida.");
      if (remote.state) remote.state=decodeState(JSON.stringify(cloudState(remote.state)));
      const local=getState(); const decision=syncDecision(local,remote,s.user.id);
      if (decision==="wrong-account") throw new Error("Estos datos pertenecen a otra cuenta. Vuelve a iniciar sesión.");
      if (decision==="conflict") {
        // Append-only completed workouts and weigh-ins can be combined without
        // choosing a winner. Edits to a shared record still require review.
        const merged = remote.state ? mergeConcurrentProgress(local, remote.state) : null;
        if (merged) {
          const sent = snapshot(merged);
          const result = await accountRequest<{revision:number;updated:string}>("/sync",s.token,"PUT",{revision:remote.revision,state:cloudState(merged)});
          if (!active()) return;
          try { await persist(v=>acknowledge({ ...v, ...merged, signedOut:false },s.user.id,result.revision,sent,result.updated)); }
          catch { /* The merged cloud copy is durable and remains recoverable. */ }
          if (active()) setStatus(snapshot(getState())===getState().cloud?.base ? "saved" : "pending");
          return;
        }
        showConflict({local,remote,areas:remote.state ? conflictAreas(local,remote.state) : []}); setStatus("conflict"); return;
      }
      if (decision==="download") {
        await archiveState(local);
        if (!active()) return;
        if (snapshot(getState())!==snapshot(local)) { showConflict({local:getState(),remote,areas:remote.state ? conflictAreas(getState(),remote.state) : []}); setStatus("conflict"); return; }
        try { await persist(v=>acknowledge({ ...v, ...cloudState(remote.state!), signedOut:false },s.user.id,remote.revision,snapshot(remote.state!),remote.updated)); }
        catch { /* The downloaded copy remains authoritative in cloud. */ }
      } else if (decision==="same") {
        if (local.cloud?.revision!==remote.revision || local.cloud?.base!==snapshot(local))
          try { await persist(v=>acknowledge(v,s.user.id,remote.revision,snapshot(local),remote.updated)); } catch { /* Cloud metadata can be rebuilt next sync. */ }
      } else {
        const sent=snapshot(local);
        const result=await accountRequest<{revision:number;updated:string}>("/sync",s.token,"PUT",{revision:remote.revision,state:cloudState(local)});
        if (!active()) return;
        // Edits made during the request remain pending; acknowledge only the snapshot actually sent.
        try { await persist(v=>acknowledge(v,s.user.id,result.revision,sent,result.updated)); }
        catch { /* The server acknowledgement is still a durable recovery point. */ }
      }
      if (active()) setStatus(snapshot(getState())===getState().cloud?.base ? "saved" : "pending");
    } catch(e) {
      if (!active()) return;
      if (e instanceof AccountError && e.status===409) {
        setStatus("pending"); setError("La nube ha cambiado. Vamos a revisar la nueva copia."); rerun.current=true;
      }
      else report(e);
    } finally {
      busy.current=false;
      if (rerun.current && active()) {
        rerun.current=false;
        setTimeout(() => void syncRef.current(), 0);
      }
    }
  },[getState,persist,report,showConflict,storeReady]);
  useEffect(() => { syncRef.current=sync; },[sync]);
  const accept = useCallback(async (result: AccountSession) => {
    generation.current++;
    const local=getState();
    if (local.cloud && local.cloud.owner!==result.user.id) {
      await archiveState(local);
      const saved=await archivedStates(result.user.id);
      if(snapshot(getState())!==snapshot(local)) throw new Error("Has cambiado tu progreso. Repite el inicio de sesión.");
      await persist(()=>({...saved[0]?.state ?? initialState, cloud:saved[0]?.state.cloud ?? {owner:result.user.id,revision:0,base:null}}));
    } else if (!local.cloud) {
      await archiveState(local);
      await persist(v=>({...v,cloud:{owner:result.user.id,revision:0,base:null}}));
    }
    await secureSession.setItem(sessionKey,JSON.stringify(result));
    await persist(v=>({...v,signedOut:false}));
    setCurrent(result); showConflict(null); setError(""); setStatus("pending");
  },[getState,persist,setCurrent,showConflict]);
  const authenticate = useCallback(async (path:string,data:unknown) => {
    if (authenticating.current || busy.current) throw new Error("Espera a que termine la sincronización e inténtalo de nuevo.");
    authenticating.current=true;
    const epoch=generation.current;
    try {
      const result=await accountRequest<AccountSession>(path,undefined,"POST",data);
      if(epoch!==generation.current) { void accountRequest("/auth/logout",result.token,"POST").catch(()=>undefined); return; }
      await accept(result);
    }
    finally { authenticating.current=false; }
  },[accept]);
  const logout = useCallback(async () => {
    if (authenticating.current) throw new Error("Espera a que termine el inicio de sesión.");
    generation.current++; const s=current.current;
    await persist(v=>v); await secureSession.removeItem(sessionKey);
    setCurrent(null); showConflict(null); setStatus("local"); setError("");
    if (s) void accountRequest("/auth/logout",s.token,"POST").catch(()=>undefined);
  },[persist,setCurrent,showConflict]);
  useEffect(() => { if (state.signedOut && current.current) void logout().catch(report); },[state.signedOut,logout,report]);
  const fingerprint=snapshot(state);
  useEffect(() => {
    if (!ready || !storeReady || !session || state.signedOut || conflict) return;
    const timer=setTimeout(()=>void sync(),300);
    return ()=>clearTimeout(timer);
  },[fingerprint,ready,storeReady,session,state.signedOut,state.cloud?.base,conflict,sync]);
  useEffect(() => {
    const trigger=()=>void sync();
    const timer=setInterval(trigger,15000);
    const listener=NativeAppState.addEventListener("change",next=>{
      // Pull when returning and make a best-effort push before mobile suspension.
      if(next==="active" || next==="inactive" || next==="background") trigger();
    });
    const visibility=()=>{ if(typeof document!=="undefined" && document.visibilityState==="visible") trigger(); };
    if(Platform.OS==="web" && typeof window!=="undefined") {
      window.addEventListener("focus",trigger);
      window.addEventListener("online",trigger);
      document.addEventListener("visibilitychange",visibility);
    }
    return ()=>{
      clearInterval(timer); listener.remove();
      if(Platform.OS==="web" && typeof window!=="undefined") {
        window.removeEventListener("focus",trigger);
        window.removeEventListener("online",trigger);
        document.removeEventListener("visibilitychange",visibility);
      }
    };
  },[sync]);
  useEffect(() => {
    if (!ready || !storeReady || !session || state.signedOut) return;
    let stopped=false, polling=false;
    const visible=()=>Platform.OS!=="web" || typeof document==="undefined" || document.visibilityState==="visible";
    const poll=async()=>{
      if(stopped || polling || !visible()) return;
      polling=true;
      try {
        const remote=await accountRequest<{revision:number;updated:string}>("/sync/revision",session.token);
        if(!stopped && Number.isSafeInteger(remote.revision) && remote.revision!==getState().cloud?.revision) await syncRef.current();
      } catch { /* The regular sync path reports persistent connectivity failures. */ }
      finally { polling=false; }
    };
    void poll();
    const timer=setInterval(()=>void poll(),Platform.OS==="web"?1000:2000);
    return()=>{stopped=true;clearInterval(timer);};
  },[ready,storeReady,session,state.signedOut,getState]);
  const resolve = useCallback(async (choice:"local"|"cloud") => {
    const c=conflictRef.current, s=current.current;
    if (!c || !s || busy.current) return;
    busy.current=true; const epoch=generation.current;
    try {
      const local=getState(); await archiveState(local);
      if (c.remote.state) await archiveState(acknowledge(c.remote.state,s.user.id,c.remote.revision,snapshot(c.remote.state),c.remote.updated));
      if(epoch!==generation.current) return;
      if (choice==="cloud") {
        if (!c.remote.state) throw new Error("No hay una copia en la nube para restaurar.");
        if (snapshot(getState())!==snapshot(local)) throw new Error("Has editado tu progreso. Revisa la elección de nuevo.");
        await persist(v=>acknowledge({...v,...cloudState(c.remote.state!),signedOut:false},s.user.id,c.remote.revision,snapshot(c.remote.state!),c.remote.updated));
      } else {
        const sent=snapshot(local);
        let revision=c.remote.revision, confirmed:RemoteCopy|null=null;
        for(let attempt=0;attempt<3&&!confirmed;attempt++) {
          if(epoch!==generation.current) return;
          if(snapshot(getState())!==sent) throw new Error("Has editado tu progreso. Revisa la elección de nuevo.");
          try {
            const result=await accountRequest<{revision:number;updated:string}>("/sync",s.token,"PUT",{revision,state:cloudState(local)});
            if(epoch!==generation.current) return;
            const check=await accountRequest<RemoteCopy>("/sync",s.token);
            if(epoch!==generation.current) return;
            if(check.revision===result.revision && check.state && snapshot(decodeState(JSON.stringify(cloudState(check.state))))===sent) confirmed=check;
            else revision=check.revision;
          } catch(e) {
            if(!(e instanceof AccountError) || e.status!==409) throw e;
            const latest=await accountRequest<RemoteCopy>("/sync",s.token);
            if(epoch!==generation.current) return;
            revision=latest.revision;
          }
        }
        if(!confirmed) throw new Error("La nube ha seguido cambiando y no ha confirmado la copia de este dispositivo. Tus datos locales se conservan; vuelve a intentarlo.");
        await persist(v=>acknowledge(v,s.user.id,confirmed!.revision,sent,confirmed!.updated));
      }
      showConflict(null); setError("");
      setStatus(snapshot(getState())===getState().cloud?.base ? "saved" : "pending");
      if(snapshot(getState())!==getState().cloud?.base) setTimeout(()=>void syncRef.current(),0);
    } catch(e) {
      if (e instanceof AccountError && e.status===409) { showConflict(null); setStatus("pending"); }
      else report(e);
    } finally {busy.current=false;}
  },[getState,persist,report,showConflict]);
  const restoreArchive = useCallback(async (key:string) => {
    const s=current.current;
    if (!s || busy.current || authenticating.current) throw new Error("Espera a que termine la sincronización.");
    busy.current=true; const epoch=generation.current; const local=getState();
    try {
      if (!key.startsWith("cloud:")) throw new Error("Copia no encontrada para esta cuenta.");
      const revision = Number(key.slice("cloud:".length));
      if (!Number.isSafeInteger(revision) || revision < 1) throw new Error("Copia no encontrada para esta cuenta.");
      const saved = await accountRequest<{revision:number;updated:string;state:AppState}>(`/sync/versions/${revision}`,s.token);
      const restored = decodeState(JSON.stringify(cloudState(saved.state)));
      await archiveState(local);
      if (epoch!==generation.current || current.current?.token!==s.token) return;
      if (snapshot(getState())!==snapshot(local)) throw new Error("Has editado tu progreso. Revisa la copia de nuevo.");
      await persist(v=>({...restored,cloud:v.cloud,signedOut:false,weightReminderNotificationId:v.weightReminderNotificationId,trainingReminderNotificationIds:v.trainingReminderNotificationIds}));
      showConflict(null); setStatus("pending");
    } finally {busy.current=false;}
  },[getState,persist,showConflict]);
  const displayedStatus=status==="saved" && fingerprint!==state.cloud?.base ? "pending" : status;
  return <Context.Provider value={{user:session?.user ?? null,ready,status:displayedStatus,error,conflict,request,sync,resolve,restoreArchive,listRecoveryCopies,logout,
    login:(email,password)=>authenticate("/auth/login",{email,password}),
    verify:(challengeId,code)=>authenticate("/auth/verify",{challengeId,code}),
    authenticateGoogle:(credential,nonce)=>authenticate("/auth/google",{credential,nonce}),
    linkGoogle:async(credential,nonce)=>{
      const s=current.current; if (!s) throw new Error("Inicia sesión primero.");
      if (authenticating.current || busy.current) throw new Error("Espera a que termine la sincronización.");
      authenticating.current=true;
      try {
        const user=await request<AccountUser>("/auth/google/link","POST",{credential,nonce});
        const updated={...s,user}; await secureSession.setItem(sessionKey,JSON.stringify(updated)); setCurrent(updated);
      } finally { authenticating.current=false; }
    },
    deleteAccount:async confirmEmail=>{
      if(busy.current || authenticating.current) throw new Error("Espera a que termine la sincronización.");
      busy.current=true;
      try {
        await request("/me","DELETE",{confirmEmail}); await logout();
        await persist(v=>{const {cloud:_cloud,...local}=v;return local;});
      } finally { busy.current=false; }
    },
  }}>{children}</Context.Provider>;
}
export function useAccount() { const c=useContext(Context); if (!c) throw new Error("Account missing"); return c; }
