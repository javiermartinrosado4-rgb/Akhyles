import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, router } from "expo-router";
import { Button, Card, Heading, Loading, Notice, Page, Txt } from "../components/ui";
import { useAccount } from "../state/Account";
import { useStore } from "../state/Store";

/** Consumes the single-use registration link from the Akhyles verification email. */
export default function VerifyAccountLink() {
  const { challengeId, code } = useLocalSearchParams<{ challengeId?: string; code?: string }>();
  const account = useAccount();
  const { state } = useStore();
  const started = useRef(false);
  const [error, setError] = useState("");
  const valid = typeof challengeId === "string" && /^[a-f0-9]{64}$/i.test(challengeId) && typeof code === "string" && /^\d{8}$/.test(code);
  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    void account.verify(challengeId!, code!).catch(reason => setError(reason instanceof Error ? reason.message : "No se ha podido confirmar la cuenta."));
  }, [account, challengeId, code, valid]);
  useEffect(() => {
    if (account.user) router.replace(state.completed ? "/today" : "/onboarding");
  }, [account.user, state.completed]);
  return <Page>
    <Heading title="Confirmando tu cuenta" subtitle="Estamos dejando Akhyles listo para ti." />
    {!valid ? <Card><Notice error>Este enlace no es válido. Solicita otro desde la pantalla de cuenta.</Notice><Button label="Ir a mi cuenta" onPress={() => router.replace("/account")} /></Card>
      : error ? <Card><Notice error>{error}</Notice><Button label="Ir a mi cuenta" onPress={() => router.replace("/account")} /></Card>
      : account.user ? <Card><Txt weight="600" size={19}>Tu cuenta está confirmada.</Txt><Txt muted>Ya has iniciado sesión y puedes sincronizar tu progreso.</Txt><Button label="Empezar a entrenar" onPress={() => router.replace("/today")} /></Card>
      : <Loading />}
  </Page>;
}
