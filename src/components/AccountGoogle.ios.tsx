import { useRef, useState } from "react";
import { GoogleOneTapSignIn, isSuccessResponse, isErrorWithCode, statusCodes } from "react-native-nitro-google-signin";
import { useAccount } from "../state/Account";
import { accountRequest, accountUrl } from "../services/account";
import { Button, Notice } from "./ui";

export function AccountGoogle({ link = false }: { link?: boolean }) {
  const account = useAccount();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const signIn = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const config = await accountRequest<{ clientId: string; nonce: string }>("/auth/google/config");
      if (!config.clientId || !config.nonce) throw new Error("El acceso con Google está pendiente de activación.");
      GoogleOneTapSignIn.configure({ webClientId: config.clientId, nonce: config.nonce, autoSelectOnSignIn: false });
      const result = await GoogleOneTapSignIn.presentExplicitSignIn();
      if (isSuccessResponse(result)) await (link ? account.linkGoogle : account.authenticateGoogle)(result.data.idToken, config.nonce);
    } catch (cause) {
      if (!(isErrorWithCode(cause) && cause.code === statusCodes.SIGN_IN_CANCELLED))
        setError(cause instanceof Error ? cause.message : "No se ha podido conectar con Google.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return <>
    <Button label={busy ? "Conectando…" : link ? "Vincular Google" : "Continuar con Google"} variant="secondary" disabled={busy || !accountUrl} onPress={() => void signIn()} />
    {!!error && <Notice error>{error}</Notice>}
  </>;
}
