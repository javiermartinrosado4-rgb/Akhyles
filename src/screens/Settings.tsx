import { messages } from "../content/es";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Heading, Page, Txt } from "../components/ui";
import { copy } from "../config";
import { LanguageSelector } from "../components/LanguageSelector";
import { NotificationSettings } from "../components/NotificationSettings";
export default function Settings() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  const goBack = () => {
    // Settings is opened from Perfil as a nested option. Returning explicitly
    // avoids Expo restoring the root route (Entrenamiento) on a shallow stack.
    if (from === "profile") return router.replace("/profile");
    if (from === "account") return router.replace("/account");
    return router.replace("/profile");
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
        subtitle="Personaliza idioma y avisos de la app."
      />
      <LanguageSelector />
      <NotificationSettings />
      <Card>
        <Txt weight="600">{messages.Settings.unEspacioPrivado}</Txt>
        <Txt muted size={13}>
          {copy.local} La aplicación usa siempre el tema oscuro. Las fotografías de la simulación no se guardan en el perfil.
        </Txt>
      </Card>
    </Page>
  );
}
