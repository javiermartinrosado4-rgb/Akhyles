import { useLanguage } from "../i18n";
import { useRef, useState } from "react";
import { router } from "expo-router";
import { GoogleOneTapSignIn, isSuccessResponse, isErrorWithCode, statusCodes } from "react-native-nitro-google-signin";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { communityRequest } from "../services/community";
import { Button, Notice, Txt } from "./ui";

export function GoogleSignIn({ enter = false }: { enter?: boolean }) {
  const { t } = useLanguage();
  const { authenticateGoogle, user } = useCommunity();
  const { state } = useStore();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const config = await communityRequest<{ clientId: string; nonce: string }>("/auth/google/config");
      if (!config.clientId || !config.nonce) throw new Error("El acceso con Google está pendiente de activación. Puedes continuar con tu perfil local.");
      GoogleOneTapSignIn.configure({ webClientId: config.clientId, nonce: config.nonce, autoSelectOnSignIn: false });
      await GoogleOneTapSignIn.checkPlayServices();
      const result = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (!isSuccessResponse(result)) return;
      await authenticateGoogle(result.data.idToken, config.nonce);
      if (enter) router.replace(state.completed ? "/today" : "/onboarding");
    } catch (cause) {
      if (isErrorWithCode(cause) && cause.code === statusCodes.SIGN_IN_CANCELLED) return;
      setError(cause instanceof Error ? cause.message : "No se ha podido iniciar sesión con Google. Vuelve a intentarlo.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  if (user) return <Txt muted>{t("Conectado como {value1}", { value1: user.name })}</Txt>;
  return <>
    <Button label={busy ? "Conectando con Google…" : "Continuar con Google"} variant="secondary" disabled={busy} onPress={() => void signIn()} />
    {!!error && <Notice error>{error}</Notice>}
  </>;
}
