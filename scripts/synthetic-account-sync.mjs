import { randomUUID } from "node:crypto";

const base=(process.env.AKHYLES_SYNTHETIC_ACCOUNT_URL||process.env.EXPO_PUBLIC_ACCOUNT_URL||"").replace(/\/$/,"");
const email=process.env.AKHYLES_SYNTHETIC_EMAIL||"";
const password=process.env.AKHYLES_SYNTHETIC_PASSWORD||"";
if(!/^https:\/\//.test(base)||!email||!password) throw new Error("Define AKHYLES_SYNTHETIC_ACCOUNT_URL, AKHYLES_SYNTHETIC_EMAIL y AKHYLES_SYNTHETIC_PASSWORD.");
async function call(path,method="GET",token,body){
  const response=await fetch(base+path,{method,headers:{...(token?{Authorization:`Bearer ${token}`}:{}) ,...(method==="GET"?{}:{"Content-Type":"application/json"})},body:method==="GET"?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  const json=await response.json().catch(()=>({})); if(!response.ok) throw new Error(`${method} ${path}: ${json.error||response.status}`); return json;
}
const first=await call("/auth/login","POST",undefined,{email,password});
const second=await call("/auth/login","POST",undefined,{email,password});
const initial=await call("/sync","GET",first.token);
if(!initial.state) throw new Error("La cuenta sintética necesita una copia inicial válida.");
const marker=`synthetic-${randomUUID()}`;
const next=structuredClone(initial.state);
next.history=[...next.history,{id:marker,dayName:"Synthetic monitor",date:new Date().toISOString().slice(0,10),minutes:1,records:[]}];
let written=false;
try {
  const saved=await call("/sync","PUT",first.token,{revision:initial.revision,state:next}); written=true;
  const mirrored=await call("/sync","GET",second.token);
  if(!mirrored.state?.history?.some(item=>item.id===marker)) throw new Error("El segundo cliente no recibió el entrenamiento sintético.");
  const clean=structuredClone(mirrored.state); clean.history=clean.history.filter(item=>item.id!==marker);
  await call("/sync","PUT",second.token,{revision:mirrored.revision,state:clean});
  console.log(JSON.stringify({ok:true,marker,revision:saved.revision,checkedAt:new Date().toISOString()}));
} catch(error) {
  if(written) console.error("El marcador sintético puede requerir limpieza manual:",marker);
  throw error;
}
