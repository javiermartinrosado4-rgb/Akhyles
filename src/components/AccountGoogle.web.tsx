import { useLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "../state/Account";
import { accountRequest, accountUrl } from "../services/account";
import { Button, Notice, Txt } from "./ui";
interface GoogleApi { accounts:{id:{initialize:(o:{client_id:string;nonce:string;auto_select:boolean;callback:(r:{credential:string})=>void})=>void;renderButton:(el:HTMLElement,o:Record<string,string>)=>void}} }
let sdk:Promise<GoogleApi>|undefined;
function loadGoogle(){
  if(!sdk) sdk=new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    const fail=()=>{script.remove();sdk=undefined;reject(new Error("Google no responde. Vuelve a intentarlo."));};
    const timer=setTimeout(fail,15000);
    script.src="https://accounts.google.com/gsi/client";script.async=true;
    script.onload=()=>{clearTimeout(timer);resolve((window as unknown as {google:GoogleApi}).google);};
    script.onerror=()=>{clearTimeout(timer);fail();};document.head.appendChild(script);
  });return sdk;
}
export function AccountGoogle({link=false}:{link?:boolean}){
  const { language } = useLanguage();
  const account=useAccount(),host=useRef<HTMLDivElement>(null),callback=useRef(account.authenticateGoogle);
  useEffect(()=>{callback.current=link?account.linkGoogle:account.authenticateGoogle;},[link,account.linkGoogle,account.authenticateGoogle]);
  const [attempt,setAttempt]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  useEffect(()=>{
    let alive=true;if(!accountUrl)return;
    void accountRequest<{clientId:string;nonce:string}>("/auth/google/config").then(async config=>{
      const google=await loadGoogle();if(!alive||!host.current)return;
      google.accounts.id.initialize({client_id:config.clientId,nonce:config.nonce,auto_select:false,callback:r=>{
        if(!alive)return;setBusy(true);setError("");
        void callback.current(r.credential,config.nonce).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive){setBusy(false);setAttempt(a=>a+1);}});
      }});
      host.current.replaceChildren();google.accounts.id.renderButton(host.current,{type:"standard",theme:"outline",size:"large",text:"continue_with",locale: language});
    }).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};
  },[attempt,link,language]);
  if(!accountUrl)return null;
  return <><div ref={host} style={{minHeight:error?0:44,pointerEvents:busy?"none":"auto"}}/>{busy&&<Txt>Verificando tu cuenta…</Txt>}{!!error&&<><Notice error>{error}</Notice><Button label="Reintentar Google" compact variant="ghost" onPress={()=>{setError("");setAttempt(a=>a+1);}}/></>}</>;
}
