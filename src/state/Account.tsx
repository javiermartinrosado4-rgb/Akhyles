import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState as NativeAppState } from "react-native";
import { accountRequest, accountUrl, AccountError, AccountSession, AccountUser } from "../services/account";
import { communitySession as secureSession } from "../storage/communitySession";
import { acknowledge, cloudState, RemoteCopy, snapshot, syncDecision } from "../logic/cloud";
import { archiveState, archivedStates, decodeState } from "../storage/repository";
import { AppState } from "../types";
import { initialState, useStore } from "./Store";

type Status = "local" | "pending" | "syncing" | "saved" | "conflict" | "error";
interface Conflict { remote: RemoteCopy; local: AppState }
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
  request: <T>(path: string, method?: string, data?: unknown) => Promise<T>;
}
const Context = createContext<AccountContext | null>(null);
const sessionKey = `akhyles:account:${accountUrl}`;
export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, ready: storeReady, storageError, getState, persist } = useStore();
  const [session,setSession] = useState<AccountSession | null>(null);
  const current = useRef<AccountSession | null>(null);
  const [ready,setReady] = useState(false);
  const [status,setStatus] = useState<Status>("local");
  const [error,setError] = useState("");
  const [conflict,setConflict] = useState<Conflict | null>(null);
  const conflictRef = useRef<Conflict | null>(null);
  const busy = useRef(false);
  const authenticating = useRef(false);
  const generation = useRef(0);
  const setCurrent = useCallback((s: AccountSession | null) => { current.current=s; setSession(s); },[]);
  const showConflict = useCallback((c: Conflict | null) => { conflictRef.current=c; setConflict(c); },[]);
  const report = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : "No se ha podido sincronizar."); setStatus("error");
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
  const sync = useCallback(async () => {
    const s=current.current;
    if (!s || busy.current || authenticating.current || conflictRef.current || !storeReady || storageError || getState().signedOut) return;
    busy.current=true; const epoch=generation.current; setStatus("syncing"); setError("");
    const active = () => generation.current===epoch && current.current?.user.id===s.user.id;
    try {
      await persist(v=>v);
      const remote=await accountRequest<RemoteCopy>("/sync",s.token);
      if (!active()) return;
      if (!Number.isSafeInteger(remote.revision) || remote.revision<0) throw new Error("La respuesta de la nube no es válida.");
      if (remote.state) remote.state=decodeState(JSON.stringify(cloudState(remote.state)));
      const local=getState(); const decision=syncDecision(local,remote,s.user.id);
      if (decision==="wrong-account") throw new Error("Estos datos pertenecen a otra cuenta. Vuelve a iniciar sesión.");
      if (decision==="conflict") { showConflict({local,remote}); setStatus("conflict"); return; }
      if (decision==="download") {
        await archiveState(local);
        if (!active()) return;
        if (snapshot(getState())!==snapshot(local)) { showConflict({local:getState(),remote}); setStatus("conflict"); return; }
        await persist(v=>acknowledge({ ...remote.state!, signedOut:false, weightReminderNotificationId:v.weightReminderNotificationId },s.user.id,remote.revision,snapshot(remote.state!),remote.updated));
      } else if (decision==="same") {
        if (local.cloud?.revision!==remote.revision || local.cloud?.base!==snapshot(local))
          await persist(v=>acknowledge(v,s.user.id,remote.revision,snapshot(local),remote.updated));
      } else {
        const sent=snapshot(local);
        const result=await accountRequest<{revision:number;updated:string}>("/sync",s.token,"PUT",{revision:remote.revision,state:cloudState(local)});
        if (!active()) return;
        // Edits made during the request remain pending; acknowledge only the snapshot actually sent.
        await persist(v=>acknowledge(v,s.user.id,result.revision,sent,result.updated));
      }
      if (active()) setStatus(snapshot(getState())===getState().cloud?.base ? "saved" : "pending");
    } catch(e) {
      if (!active()) return;
      if (e instanceof AccountError && e.status===409) { setStatus("pending"); setError("La nube ha cambiado. Vamos a revisar la nueva copia."); }
      else report(e);
    } finally { busy.current=false; }
  },[getState,persist,report,showConflict,storeReady,storageError]);
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
    const timer=setTimeout(()=>void sync(),1500);
    return ()=>clearTimeout(timer);
  },[fingerprint,ready,storeReady,session,state.signedOut,state.cloud?.base,conflict,sync]);
  useEffect(() => {
    const timer=setInterval(()=>void sync(),30000);
    const listener=NativeAppState.addEventListener("change",next=>{ if(next==="active") void sync(); });
    return ()=>{clearInterval(timer);listener.remove();};
  },[sync]);
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
        await persist(v=>acknowledge({...c.remote.state!,signedOut:false,weightReminderNotificationId:v.weightReminderNotificationId},s.user.id,c.remote.revision,snapshot(c.remote.state!),c.remote.updated));
      } else {
        const result=await accountRequest<{revision:number;updated:string}>("/sync",s.token,"PUT",{revision:c.remote.revision,state:cloudState(local)});
        if (epoch!==generation.current) return;
        await persist(v=>acknowledge(v,s.user.id,result.revision,snapshot(local),result.updated));
      }
      showConflict(null); setError(""); setStatus("pending");
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
      const saved=(await archivedStates(s.user.id)).find(x=>x.key===key);
      if (!saved) throw new Error("Copia no encontrada para esta cuenta.");
      await archiveState(local);
      if (epoch!==generation.current || current.current?.token!==s.token) return;
      if (snapshot(getState())!==snapshot(local)) throw new Error("Has editado tu progreso. Revisa la copia de nuevo.");
      await persist(v=>({...saved.state,cloud:v.cloud,signedOut:false,weightReminderNotificationId:v.weightReminderNotificationId}));
      showConflict(null); setStatus("pending");
    } finally {busy.current=false;}
  },[getState,persist,showConflict]);
  const displayedStatus=status==="saved" && fingerprint!==state.cloud?.base ? "pending" : status;
  return <Context.Provider value={{user:session?.user ?? null,ready,status:displayedStatus,error,conflict,request,sync,resolve,restoreArchive,logout,
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
