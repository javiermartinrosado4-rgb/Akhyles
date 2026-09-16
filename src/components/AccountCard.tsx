import { useLanguage } from "../i18n";
import { router } from "expo-router";
import { useAccount } from "../state/Account";
import { useStore } from "../state/Store";
import { accountUrl } from "../services/account";
import { Button, Card, Txt } from "./ui";
export function AccountCard(){
  const { t, locale } = useLanguage();
  const {user,status}=useAccount();const {state}=useStore();
  return <Card><Txt weight="600">Cuenta y copias</Txt>
    <Txt muted size={13} translate={!user}>{user?user.email:accountUrl?"Entra con Google o correo para recuperar tu progreso en otro móvil.":"Tus entrenamientos se guardan en este dispositivo. La copia en la nube está pendiente de activación."}</Txt>
    {user&&<Txt size={13}>{status==="saved"?"Guardado en este dispositivo y en la nube":status==="conflict"?"Hay dos copias que necesitan revisión":"Guardado local. Hay cambios pendientes de comprobar en la nube."}</Txt>}
    {user&&state.cloud?.syncedAt&&<Txt muted size={12}>{t("Última copia: {value1}", { value1: new Date(state.cloud.syncedAt).toLocaleString(locale) })}</Txt>}
    <Button label={user?"Gestionar cuenta y copias":"Entrar o crear cuenta"} variant="secondary" icon="cloud" onPress={()=>router.push("/account")}/>
  </Card>;
}
