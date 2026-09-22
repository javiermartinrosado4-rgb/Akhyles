import { chromium } from "playwright";

const webUrl="http://localhost:8093";
const apiUrl="http://127.0.0.1:8094";
const email=`realtime-standalone-${Date.now()}@example.test`;
const password="test-long-password-2026";

async function api(path,options={}) {
  const response=await fetch(apiUrl+path,{...options,headers:{"Content-Type":"application/json",...options.headers}});
  const body=await response.json();
  if(!response.ok) throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
}

async function stored(page) {
  return page.evaluate(async()=>{
    const request=indexedDB.open("akhyles-local-state",1);
    const database=await new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    const raw=await new Promise((resolve,reject)=>{
      const get=database.transaction("state","readonly").objectStore("state").get("primary");
      get.onsuccess=()=>resolve(get.result);
      get.onerror=()=>reject(get.error);
    });
    database.close();
    if(!raw.startsWith("akhyles:gzip:v1:")) return JSON.parse(raw);
    const bytes=Uint8Array.from(atob(raw.slice("akhyles:gzip:v1:".length)),character=>character.charCodeAt(0));
    const stream=new DecompressionStream("gzip");
    const output=new Response(stream.readable).text();
    const writer=stream.writable.getWriter();
    await writer.write(bytes);await writer.close();
    return JSON.parse(await output);
  });
}

async function saveStored(page,state) {
  await page.evaluate(async value=>{
    const stream=new CompressionStream("gzip");
    const output=new Response(stream.readable).arrayBuffer();
    const writer=stream.writable.getWriter();
    await writer.write(new TextEncoder().encode(JSON.stringify(value)));await writer.close();
    const bytes=new Uint8Array(await output);
    let binary="";for(const byte of bytes) binary+=String.fromCharCode(byte);
    const raw="akhyles:gzip:v1:"+btoa(binary);
    const request=indexedDB.open("akhyles-local-state",1);
    const database=await new Promise((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
    await new Promise((resolve,reject)=>{const put=database.transaction("state","readwrite").objectStore("state").put(raw,"primary");put.onsuccess=resolve;put.onerror=()=>reject(put.error)});
    database.close();
  },state);
}

const registration=await api("/auth/register",{method:"POST",body:JSON.stringify({email,name:"Atleta realtime",password})});
const mails=await api("/test/mail");
const code=mails.find(mail=>mail.email===email)?.text.match(/\b\d{8}\b/)?.[0];
if(!code) throw new Error("No se encontró el código de verificación.");
const session=await api("/auth/verify",{method:"POST",body:JSON.stringify({challengeId:registration.challengeId,code})});

const browser=await chromium.launch({headless:true});
try {
  const page=await browser.newPage({locale:"es-ES",viewport:{width:1280,height:900}});
  await page.route("**/auth/google/config",route=>route.fulfill({status:503,json:{error:"No usado en esta prueba."}}));
  await page.goto(webUrl+"/account");
  await page.getByRole("textbox",{name:"Correo electrónico",exact:true}).fill(email);
  await page.getByRole("textbox",{name:"Contraseña",exact:true}).fill(password);
  await page.getByRole("button",{name:"Iniciar sesión",exact:true}).click();
  await page.waitForURL(/\/(today|onboarding)$/,{timeout:30000});
  await page.goto(webUrl+"/account");
  await page.getByText("Guardado en el dispositivo y en la nube",{exact:true}).waitFor({timeout:30000});

  const remote=await api("/sync",{headers:{Authorization:`Bearer ${session.token}`}});
  remote.state.history=[...remote.state.history,{id:"instant-workout",dayName:"Martes",date:"2026-09-22T10:00:00.000Z",minutes:45,records:[]}];
  const started=Date.now();
  await api("/sync",{method:"PUT",headers:{Authorization:`Bearer ${session.token}`},body:JSON.stringify({revision:remote.revision,state:remote.state})});
  let received=false;
  while(Date.now()-started<5000) {
    received=(await stored(page)).history.some(item=>item.id==="instant-workout");
    if(received) break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!received) throw new Error("La web no recibió el entrenamiento en cinco segundos.");
  console.log(`PASS sincronización recibida en ${Date.now()-started} ms`);

  await page.route(apiUrl+"/sync",route=>route.request().method()==="PUT"?route.abort("internetdisconnected"):route.continue());
  const local=await stored(page);local.profile.weight="71";await saveStored(page,local);await page.reload();
  const firstRemote=await api("/sync",{headers:{Authorization:`Bearer ${session.token}`}});
  firstRemote.state.profile.weight="80";
  await api("/sync",{method:"PUT",headers:{Authorization:`Bearer ${session.token}`},body:JSON.stringify({revision:firstRemote.revision,state:firstRemote.state})});
  await page.getByText("Revisa las dos copias",{exact:true}).waitFor({timeout:10000});
  const racingRemote=await api("/sync",{headers:{Authorization:`Bearer ${session.token}`}});
  racingRemote.state.profile.weight="81";
  await api("/sync",{method:"PUT",headers:{Authorization:`Bearer ${session.token}`},body:JSON.stringify({revision:racingRemote.revision,state:racingRemote.state})});
  await page.unroute(apiUrl+"/sync");
  await page.getByRole("button",{name:"Usar la copia de este dispositivo",exact:true}).click();
  await page.getByText("Guardado en el dispositivo y en la nube",{exact:true}).waitFor({timeout:10000});
  const resolved=await api("/sync",{headers:{Authorization:`Bearer ${session.token}`}});
  if(resolved.state.profile.weight!=="71") throw new Error("La resolución concurrente no conservó la copia elegida del dispositivo.");
  console.log("PASS conflicto concurrente reintentado y confirmado exactamente");
} finally {
  await browser.close();
}
