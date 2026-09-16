import { useLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { communityRequest } from "../services/community";
import { Button, Notice, Txt } from "./ui";

interface GoogleApi { accounts: { id: {
  initialize: (options: { client_id: string; nonce: string; callback: (response: { credential: string }) => void; auto_select: boolean }) => void;
  renderButton: (element: HTMLElement, options: { type: string; theme: string; size: string; text: string; locale: string }) => void;
} } }
let sdk: Promise<GoogleApi> | undefined;
function loadGoogle() {
  if (!sdk) sdk = new Promise<GoogleApi>((resolve, reject) => {
    const script = document.createElement("script");
    const timeout = setTimeout(() => { script.remove(); sdk = undefined; reject(new Error("Google no responde. Vuelve a intentarlo.")); }, 15000);
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => { clearTimeout(timeout); resolve((window as unknown as { google: GoogleApi }).google); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); sdk = undefined; reject(new Error("No se ha podido cargar Google. Comprueba tu conexión.")); };
    document.head.appendChild(script);
  });
  return sdk;
}
export function GoogleSignIn({ enter = false }: { enter?: boolean }) {
  const { t, language } = useLanguage();
  const { authenticateGoogle, user } = useCommunity();
  const { state } = useStore();
  const host = useRef<HTMLDivElement>(null);
  const callback = useRef(authenticateGoogle);
  useEffect(() => { callback.current = authenticateGoogle; }, [authenticateGoogle]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    if (user) return;
    void communityRequest<{ clientId: string; nonce: string }>("/auth/google/config").then(async config => {
      if (!config.clientId) throw new Error("El acceso con Google está pendiente de activación.");
      const google = await loadGoogle();
      if (!alive || !host.current) return;
      google.accounts.id.initialize({ client_id: config.clientId, nonce: config.nonce, auto_select: false,
        callback: response => {
          if (!alive) return;
          setBusy(true); setError("");
          void callback.current(response.credential, config.nonce).then(() => {
            if (enter) router.replace(state.completed ? "/today" : "/onboarding");
          }).catch(error => { if (alive) setError(error.message); }).finally(() => { if (alive) setBusy(false); });
        },
      });
      host.current.replaceChildren();
      google.accounts.id.renderButton(host.current, { type: "standard", theme: "outline", size: "large", text: "continue_with", locale: language });
    }).catch(error => { if (alive) setError(error.message); });
    return () => { alive = false; };
  }, [attempt, enter, state.completed, user, language]);
  if (user) return <Txt muted>{t("Conectado como {value1}", { value1: user.name })}</Txt>;
  return <>
    <div ref={host} style={{ minHeight: error ? 0 : 44, pointerEvents: busy ? "none" : "auto" }} />
    {busy && <Txt muted>Verificando tu cuenta…</Txt>}
    {!!error && <><Notice>{error}</Notice><Button label="Reintentar acceso con Google" compact variant="ghost" onPress={() => { setError(""); setAttempt(a => a + 1); }} /></>}
  </>;
}
