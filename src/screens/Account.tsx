import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Platform, Share } from "react-native";
import { CloudRecovery, useAccount } from "../state/Account";
import { useStore } from "../state/Store";
import { accountRequest, accountUrl } from "../services/account";
import { AppState } from "../types";
import { displayName } from "../logic/routine";
import { personalExport, personalExportFilename } from "../logic/personalExport";
import { AccountGoogle } from "../components/AccountGoogle";
import { LanguageSelector } from "../components/LanguageSelector";
import { NotificationSettings } from "../components/NotificationSettings";
import { Button, Card, Field, Heading, Notice, Page, Txt } from "../components/ui";
type Mode="login"|"register"|"verify"|"forgot"|"reset";
const generatedDayNames = [
  [], ["Full body"], ["Full body A", "Full body B"],
  ["Torso", "Pierna", "Full body"],
  ["Torso A", "Pierna A", "Torso B", "Pierna B"],
  ["Torso", "Pierna", "Torso", "Pierna", "Especialización"],
];
function Summary({state,label}:{state:AppState;label:string}){
  const {t,locale}=useLanguage();
  // Recognize the generator's complete ID/name signature. Imported routines use
  // shared-day-* IDs; other or renamed routines retain their original text.
  const expectedNames=generatedDayNames[state.routine.length];
  const generated=!!expectedNames&&state.routine.every((day,index)=>day.id===`day-${index}`&&day.name===expectedNames[index]);
  return <Card><Txt weight="600">{label}</Txt><Txt>{t("{workouts} entrenamientos · {days} días de rutina",{workouts:state.history.length,days:state.routine.length})}</Txt>
    <Txt muted size={12}>{state.history.at(-1)?.date ? t("Último entrenamiento: {date}",{date:new Date(state.history.at(-1)!.date).toLocaleDateString(locale)}):t("Sin entrenamientos registrados")}</Txt>
    {state.routine.map(day=><Txt key={day.id} size={12} translate={false}>{generated?t(day.name):day.name}: {day.exercises.map(e=>`${displayName(e.exerciseId,state.preferences)} (${e.weight} kg)`).join(", ")}</Txt>)}
  </Card>;
}
export default function Account(){
  const {t,locale}=useLanguage();
  const params=useLocalSearchParams<{mode?:string;from?:string}>();
  const account=useAccount(); const {state,update}=useStore();
  // Keep the account page usable for account management, but leave it
  // immediately when this screen itself has just completed a sign-in.
  const enteredSignedOut=useRef(!account.user);
  useEffect(()=>{ if(enteredSignedOut.current&&account.user) router.replace(state.completed?"/today":"/onboarding"); },[account.user,state.completed]);
  const [mode,setMode]=useState<Mode>(params.mode==="register"?"register":"login"),[email,setEmail]=useState(""),[name,setName]=useState(state.profile.name??"");
  const [password,setPassword]=useState(""),[code,setCode]=useState(""),[challengeId,setChallenge]=useState("");
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const [deleting,setDeleting]=useState(false),[confirmEmail,setConfirmEmail]=useState("");
  const [archives,setArchives]=useState<CloudRecovery[]>([]),[selectedArchive,setSelectedArchive]=useState<string|null>(null);
  const [restoreConfirm,setRestoreConfirm]=useState<string|null>(null);
  const exportData=async()=>{
    const contents=personalExport(state); const filename=personalExportFilename();
    if(Platform.OS==="web") {
      const url=URL.createObjectURL(new Blob([contents],{type:"application/json"})); const link=document.createElement("a");
      link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),0);
    } else await Share.share({title:"Datos de Akhyles",message:contents});
    setMessage("Tus datos se han preparado para exportar.");
  };
  const run=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError("");setMessage("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"No se ha podido completar la operación.");}finally{setBusy(false);}};
  const switchMode=(next:Mode)=>{setMode(next);setError("");setMessage("");setPassword("");setCode("");};
  const submit=async()=>{
    if(mode==="login") {await account.login(email.trim(),password);setPassword("");}
    else if(mode==="verify"){await account.verify(challengeId,code.trim());setCode("");setMode("login");}
    else if(mode==="reset"){
      await accountRequest("/auth/reset",undefined,"POST",{challengeId,code:code.trim(),password});switchMode("login");setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
    }else{
      const result=await accountRequest<{challengeId:string;message:string}>(mode==="register"?"/auth/register":"/auth/forgot",undefined,"POST",{email:email.trim(),password,name});
      setChallenge(result.challengeId);setMode(mode==="register"?"verify":"reset");setPassword("");setMessage(result.message);
    }
  };
  const leave=()=>{update(s=>({...s,signedOut:false}));router.replace(state.completed?"/today":"/onboarding");};
  return <Page>
    <Button label="Volver" compact variant="ghost" icon="arrow-left" onPress={()=>router.replace(params.from==="profile"?"/profile":state.completed?"/today":"/")}/>
    <Heading title="Tu cuenta Akhyles" subtitle="Tu rutina, tus pesos y tu progreso, contigo."/>
    <LanguageSelector/>
    <NotificationSettings/>
    {!accountUrl&&<Notice>El servicio de cuentas todavía no está activado en esta versión. Puedes seguir entrenando con guardado local.</Notice>}
    {account.user?<>
      <Card><Txt weight="600" translate={false}>{account.user.name}</Txt><Txt translate={false}>{account.user.email}</Txt>
        <Txt>{account.status==="saved"?"Guardado en el dispositivo y en la nube":account.status==="syncing"?"Sincronizando…":account.status==="conflict"?"Revisa las dos copias":"Guardado local; sincronización pendiente"}</Txt>
        {state.cloud?.syncedAt&&<Txt muted size={12}>{t("Última copia confirmada: {date}",{date:new Date(state.cloud.syncedAt).toLocaleString(locale)})}</Txt>}
        <Button label="Sincronizar ahora" disabled={busy||account.status==="syncing"} onPress={()=>void run(account.sync)}/>
      </Card>
      {account.conflict&&<>
        <Notice>Hay cambios diferentes en este dispositivo y en la nube. Elige la copia que quieres seguir usando. Guardaremos las dos en el archivo de recuperación de este dispositivo.</Notice>
        {!!account.conflict.areas.length&&<Txt muted size={12}>La diferencia afecta a: {account.conflict.areas.join(" · ")}.</Txt>}
        <Summary label="En este dispositivo" state={state}/>
        {account.conflict.remote.state&&<Summary label="En la nube" state={account.conflict.remote.state}/>}
        <Button label="Usar la copia de este dispositivo" disabled={busy} onPress={()=>void run(()=>account.resolve("local"))}/>
        <Button label="Usar la copia de la nube" variant="secondary" disabled={busy||!account.conflict.remote.state} onPress={()=>void run(()=>account.resolve("cloud"))}/>
      </>}
      {!account.user.googleLinked&&<AccountGoogle link/>}
      <Button label="Ver copias de recuperación en la nube" variant="secondary" onPress={()=>void run(async()=>{const list=await account.listRecoveryCopies();setArchives(list);if(!list.length)setMessage("Todavía no hay copias de recuperación en la nube.");})}/>
      {archives.map(a=><Card key={a.key}><Txt size={13}>{t("{date} · {workouts} entrenamientos",{date:new Date(a.updated).toLocaleString(locale),workouts:a.state.history.length})}</Txt>
        <Button label="Revisar esta copia" variant="ghost" compact onPress={()=>setSelectedArchive(a.key)}/>
        {selectedArchive===a.key&&<><Summary label="Copia seleccionada" state={a.state}/>
          {restoreConfirm===a.key?<Card><Notice>Esta acción sustituirá los datos actuales de este dispositivo por esta copia. La copia actual se conservará en la nube antes de restaurar.</Notice><Button label="Confirmar restauración" disabled={busy} onPress={()=>void run(async()=>{await account.restoreArchive(a.key);setArchives([]);setSelectedArchive(null);setRestoreConfirm(null);setMessage("Copia restaurada correctamente.");})}/><Button label="Cancelar" compact variant="ghost" onPress={()=>setRestoreConfirm(null)}/></Card>:<Button label="Restaurar esta copia" disabled={busy} onPress={()=>setRestoreConfirm(a.key)}/>}</>}
      </Card>)}
      <Button label="Exportar mis datos" variant="secondary" disabled={busy} icon="download" onPress={()=>void run(exportData)}/>
      <Txt muted size={12}>Descarga una copia privada de tu rutina, historial, pesos y progreso. No incluye sesión, tokens ni datos de otros usuarios.</Txt>
      <Button label="Continuar entrenando" onPress={leave}/>
      <Button label="Cerrar sesión de la cuenta" variant="secondary" disabled={busy} onPress={()=>void run(account.logout)}/>
      <Txt muted size={12}>Al cerrar sesión, los datos locales permanecen en este dispositivo. Puedes seguir entrenando y sincronizarlos al volver a entrar.</Txt>
      <Button label="Eliminar mi cuenta de la nube" variant="ghost" onPress={()=>setDeleting(!deleting)}/>
      {deleting&&<Card><Notice>Se eliminarán la cuenta, sus sesiones y las copias del servicio de nube. El historial local seguirá en este dispositivo. Esta acción no se puede deshacer desde la app.</Notice>
        <Field label="Escribe tu correo para confirmar" value={confirmEmail} onChangeText={setConfirmEmail} email maxLength={254}/>
        <Button label="Eliminar definitivamente la cuenta" disabled={busy||confirmEmail!==account.user.email} onPress={()=>void run(async()=>{await account.deleteAccount(confirmEmail);setDeleting(false);setConfirmEmail("");setMessage("Cuenta y copias de la nube eliminadas. Conservas tus datos locales.");})}/>
      </Card>}
    </>:<>
      <AccountGoogle/>
      <Card><Txt weight="600">{({login:"Entrar con correo",register:"Crear cuenta con correo",verify:"Verificar tu correo",forgot:"Recuperar contraseña",reset:"Crear una contraseña nueva"})[mode]}</Txt>
        {mode==="register"&&<Field label="Tu nombre" value={name} onChangeText={setName} maxLength={80}/>}
        {mode!=="verify"&&mode!=="reset"&&<Field label="Correo electrónico" value={email} onChangeText={setEmail} email maxLength={254}/>}
        {(mode==="verify"||mode==="reset")&&<><Txt muted size={13}>{t("Introduce el código enviado a {email}.",{email})}</Txt><Field label="Código de 8 cifras" value={code} onChangeText={setCode} maxLength={8}/></>}
        {(mode==="login"||mode==="register"||mode==="reset")&&<Field label={mode==="reset"?"Nueva contraseña":"Contraseña"} value={password} onChangeText={setPassword} secure maxLength={72}/>}
        {(mode==="register"||mode==="reset")&&<Txt muted size={12}>Usa al menos 12 caracteres. No reutilices una contraseña de otro servicio.</Txt>}
        {mode==="register"&&<Txt muted size={12}>Usaremos tu correo para verificar la cuenta, darte la bienvenida y ayudarte a recuperar el acceso. La copia de entrenamiento es privada; no te suscribes a publicidad.</Txt>}
        <Button label={busy?"Un momento…":({login:"Iniciar sesión",register:"Enviar código de verificación",verify:"Verificar y entrar",forgot:"Enviar código de recuperación",reset:"Guardar nueva contraseña"})[mode]} disabled={busy||!accountUrl||!account.ready} onPress={()=>void run(submit)}/>
      </Card>
      <Button label={mode==="login"?"No tengo cuenta: registrarme":"Ya tengo cuenta: iniciar sesión"} variant="ghost" disabled={busy} onPress={()=>switchMode(mode==="login"?"register":"login")}/>
      <Button label="He olvidado mi contraseña" variant="ghost" disabled={busy} onPress={()=>switchMode("forgot")}/>
      {(mode==="verify"||mode==="reset")&&<Button label="Solicitar otro código" variant="ghost" disabled={busy} onPress={()=>switchMode(mode==="verify"?"register":"forgot")}/>}
      <Button label="Continuar con guardado local" variant="secondary" onPress={leave}/>
    </>}
    {!!message&&<Notice>{t(message)}</Notice>}{!!error&&<Notice error>{t(error)}</Notice>}{!!account.error&&<Notice error>{t(account.error)}</Notice>}
    <Button label="Privacidad y uso de los datos" compact variant="ghost" onPress={()=>void Linking.openURL("https://akhyles.com/politica-de-privacidad")}/>
  </Page>;
}
