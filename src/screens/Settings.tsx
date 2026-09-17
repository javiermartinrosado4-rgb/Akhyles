import { messages } from "../content/es";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Choice, Heading, Page, Txt } from "../components/ui";
import { useStore } from "../state/Store";
import { copy } from "../config";
import { LanguageSelector } from "../components/LanguageSelector";
import { NotificationSettings } from "../components/NotificationSettings";
export default function Settings() {
  const { state, update } = useStore();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = () => {
    // Settings is opened from Perfil as a nested option. Returning explicitly
    // avoids Expo restoring the root route (Entrenamiento) on a shallow stack.
    if (from === "profile") return router.replace("/profile");
    if (from === "account") return router.replace("/account");
    return router.canGoBack() ? router.back() : router.replace("/profile");
  };
  return (
    <Page>
      <Button
        label={messages.Settings.volver}
        icon="arrow-left"
        compact
        variant="ghost"
        onPress={goBack}
      />
      <Heading
        eyebrow={messages.Settings.configuracion}
        title={messages.Settings.aTuManera}
        subtitle="Personaliza idioma, apariencia y avisos de la app."
      />
      <LanguageSelector />
      {(
        [
          {
            id: "system",
            title: messages.Settings.usarTemaDelSistema,
            icon: "monitor",
          },
          { id: "light", title: messages.Settings.temaClaro, icon: "sun" },
          { id: "dark", title: messages.Settings.temaOscuro, icon: "moon" },
        ] as const
      ).map((t) => (
        <Choice
          key={t.id}
          title={t.title}
          icon={t.icon}
          selected={state.theme === t.id}
          onPress={() => update((s) => ({ ...s, theme: t.id }))}
        />
      ))}
      <NotificationSettings />
      <Card>
        <Txt weight="600">{messages.Settings.unEspacioPrivado}</Txt>
        <Txt muted size={13}>
          {copy.local}
          {messages.Settings.laEleccionDelTemaSeGuardaAutomaticamente}
        </Txt>
      </Card>
    </Page>
  );
}
