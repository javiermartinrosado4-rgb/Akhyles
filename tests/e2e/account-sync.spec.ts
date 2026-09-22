import { test, expect, Page } from "@playwright/test";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { generateRoutine } from "../../src/logic/routine";
import { AppState } from "../../src/types";
const base="http://localhost:8093",api="http://127.0.0.1:8094";
test.setTimeout(180000);
const seed=():AppState=>({version:1,profile:demoProfile,preferences:emptyPreferences,completed:true,onboardingStep:0,theme:"system",programRevision:6,routine:generateRoutine(demoProfile,emptyPreferences),history:[]});
async function setup(page:Page){
  await page.route("**/auth/google/config",route=>route.fulfill({status:503,json:{error:"Google se valida por separado en las pruebas de servidor."}}));
  await page.goto(base+"/account");
}
async function register(page:Page,email:string){
  await page.getByRole("button",{name:"No tengo cuenta: registrarme",exact:true}).click();
  await page.getByRole("textbox",{name:"Tu nombre",exact:true}).fill("Atleta prueba");
  await page.getByRole("textbox",{name:"Correo electrónico",exact:true}).fill(email);
  await page.getByRole("textbox",{name:"Contraseña",exact:true}).fill("test-long-password-2026");
  await page.getByRole("button",{name:"Enviar código de verificación",exact:true}).click();
  await expect(page.getByRole("textbox",{name:"Código de 8 cifras",exact:true})).toBeVisible();
  const mails=await (await page.request.get(api+"/test/mail")).json();
  const code=mails.find((m:{email:string;subject:string})=>m.email===email&&m.subject.includes("Verifica")).text.match(/\b\d{8}\b/)[0];
  await page.getByRole("textbox",{name:"Código de 8 cifras",exact:true}).fill(code);
  await page.getByRole("button",{name:"Verificar y entrar",exact:true}).click();
  await page.waitForURL(/\/(today|onboarding)$/);
  await page.goto(base+"/account");
  await expect(page.getByText("Guardado en el dispositivo y en la nube",{exact:true})).toBeVisible();
}
async function login(page:Page,email:string){
  await page.getByRole("textbox",{name:"Correo electrónico",exact:true}).fill(email);
  await page.getByRole("textbox",{name:"Contraseña",exact:true}).fill("test-long-password-2026");
  await page.getByRole("button",{name:"Iniciar sesión",exact:true}).click();
  await page.waitForURL(/\/(today|onboarding)$/);
  await page.goto(base+"/account");
  await expect(page.getByText("Guardado en el dispositivo y en la nube",{exact:true})).toBeVisible();
}
const stored=(page:Page)=>page.evaluate(async()=>{
  const request=indexedDB.open("akhyles-local-state",1);
  const database=await new Promise<IDBDatabase>((resolve,reject)=>{
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  const raw=await new Promise<string>((resolve,reject)=>{
    const transaction=database.transaction("state","readonly");
    const get=transaction.objectStore("state").get("primary");
    get.onsuccess=()=>resolve(get.result);
    get.onerror=()=>reject(get.error);
  });
  database.close();
  if(!raw.startsWith("akhyles:gzip:v1:")) return JSON.parse(raw);
  const binary=atob(raw.slice("akhyles:gzip:v1:".length));
  const bytes=Uint8Array.from(binary,character=>character.charCodeAt(0));
  const stream=new DecompressionStream("gzip");
  const output=new Response(stream.readable).text();
  const writer=stream.writable.getWriter();
  await writer.write(bytes);await writer.close();
  return JSON.parse(await output);
});
test("email account preserves an existing routine and restores exact weights on a new phone",async({page,browser})=>{
  await setup(page);const initial=seed();initial.routine[0].exercises[0].weight=47.5;
  await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),initial);await page.reload();
  const email=`qa-${Date.now()}@example.test`;await register(page,email);
  expect((await stored(page)).routine).toEqual(initial.routine);
  await page.reload();await expect(page.getByText("Guardado en el dispositivo y en la nube",{exact:true})).toBeVisible();
  const second=await browser.newContext({viewport:{width:390,height:844}});const phone=await second.newPage();
  await setup(phone);await login(phone,email);
  expect((await stored(phone)).routine).toEqual(initial.routine);
  await phone.screenshot({path:"test-results/akhyles-account-restored.png",fullPage:true});
  await second.close();
});
test("an open second client receives a completed workout within seconds",async({page,browser})=>{
  await setup(page);const initial=seed();await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),initial);await page.reload();
  const email=`realtime-${Date.now()}@example.test`;await register(page,email);
  const second=await browser.newContext({viewport:{width:1280,height:900}});const web=await second.newPage();
  await setup(web);await login(web,email);
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem("akhyles:account:http://127.0.0.1:8094")!));
  const remote=await(await page.request.get(api+"/sync",{headers:{Authorization:`Bearer ${session.token}`}})).json();
  remote.state.history=[...remote.state.history,{id:"instant-workout",dayName:"Martes",date:"2026-09-22T10:00:00.000Z",minutes:45,records:[]}];
  expect((await page.request.put(api+"/sync",{headers:{Authorization:`Bearer ${session.token}`},data:{revision:remote.revision,state:remote.state}})).ok()).toBe(true);
  await expect.poll(async()=>(await stored(web)).history.some((item:{id:string})=>item.id==="instant-workout"),{timeout:5000}).toBe(true);
  await second.close();
});
test("two divergent devices require a choice and archive both versions without data loss",async({page})=>{
  await setup(page);const initial=seed();await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),initial);await page.reload();
  const email=`conflict-${Date.now()}@example.test`;await register(page,email);
  const local=await stored(page);const changed=structuredClone(local);changed.routine[0].exercises[0].weight=60;
  const session=await page.evaluate(()=>JSON.parse(localStorage.getItem("akhyles:account:http://127.0.0.1:8094")!));
  const remote=await(await page.request.get(api+"/sync",{headers:{Authorization:`Bearer ${session.token}`}})).json();
  const cloud=structuredClone(remote.state);cloud.routine[0].exercises[0].weight=80;
  expect((await page.request.put(api+"/sync",{headers:{Authorization:`Bearer ${session.token}`},data:{revision:remote.revision,state:cloud}})).ok()).toBe(true);
  await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),changed);await page.reload();
  await expect(page.getByText("Revisa las dos copias",{exact:true})).toBeVisible();
  expect((await stored(page)).routine[0].exercises[0].weight).toBe(60);
  await page.getByRole("button",{name:"Usar la copia de este dispositivo",exact:true}).click();
  await expect(page.getByText("Guardado en el dispositivo y en la nube",{exact:true})).toBeVisible();
  const saved=await(await page.request.get(api+"/sync",{headers:{Authorization:`Bearer ${session.token}`}})).json();expect(saved.state.routine[0].exercises[0].weight).toBe(60);
  const archives=await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith("akhyles:archive:")).map(k=>JSON.parse(localStorage.getItem(k)!)));
  expect(archives.some(a=>a.routine[0]?.exercises[0].weight===80)).toBe(true);
  expect(archives.some(a=>a.routine[0]?.exercises[0].weight===60)).toBe(true);
});
test("different email on the same device starts separately and original account recovers its routine",async({page})=>{
  await setup(page);const initial=seed();initial.routine[0].exercises[0].weight=73;
  await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),initial);await page.reload();
  const email=`owner-${Date.now()}@example.test`;await register(page,email);
  await page.getByRole("button",{name:"Cerrar sesión de la cuenta",exact:true}).click();
  await register(page,`second-${Date.now()}@example.test`);
  expect((await stored(page)).routine).toEqual([]);
  await page.getByRole("button",{name:"Cerrar sesión de la cuenta",exact:true}).click();
  await login(page,email);expect((await stored(page)).routine).toEqual(initial.routine);
});
test("offline edits survive reload and a late upload response cannot erase newer weights",async({page})=>{
  await setup(page);const initial=seed();await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),initial);await page.reload();
  await register(page,`offline-${Date.now()}@example.test`);
  await page.route(api+"/sync",route=>route.abort("internetdisconnected"));
  const changed=await stored(page);changed.routine[0].exercises[0].weight=91;
  await page.evaluate(s=>localStorage.setItem("gym60:state:v1",JSON.stringify(s)),changed);await page.reload();
  await expect(page.getByText(/No se puede conectar\. Tus cambios siguen/)).toBeVisible();
  expect((await stored(page)).routine[0].exercises[0].weight).toBe(91);
  await page.unroute(api+"/sync");
  await page.getByRole("button",{name:"Sincronizar ahora",exact:true}).click();
  await expect(page.getByText("Guardado en el dispositivo y en la nube",{exact:true})).toBeVisible();
  let release:()=>void=()=>{};const gate=new Promise<void>(r=>{release=r;});let intercepted=false;
  await page.route(api+"/sync",async route=>{
    if(route.request().method()==="PUT"&&!intercepted){intercepted=true;await gate;await route.continue();}else await route.continue();
  });
  await page.goto(base+"/profile");
  async function weight(value:string){
    await page.getByRole("button",{name:"Editar perfil y gimnasio",exact:true}).click();
    await page.getByRole("textbox",{name:"Peso corporal",exact:true}).fill(value);
    await page.getByRole("button",{name:"Guardar perfil",exact:true}).click();
  }
  await weight("81");await expect.poll(()=>intercepted).toBe(true);
  await weight("82");release();
  await expect.poll(async()=>{const s=await stored(page);return JSON.parse(s.cloud.base).profile.weight;}).toBe("82");
  const saved=await stored(page);expect(saved.profile.weight).toBe("82");expect(saved.routine[0].exercises[0].weight).toBe(91);
});
