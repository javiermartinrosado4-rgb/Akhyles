import { messages } from "../content/es";
import { router } from "expo-router";
import { Button, Card, Choice, Heading, Page, Txt } from "../components/ui";
import { useStore } from "../state/Store";
import { copy } from "../config";
import { LanguageSelector } from "../components/LanguageSelector";
export default function Settings() {
  const { state, update } = useStore();
  return (
    <Page>
      <Button
        label={messages.Settings.volver}
        icon="arrow-left"
        compact
        variant="ghost"
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/")
        }
      />
      <Heading
        eyebrow={messages.Settings.configuracion}
        title={messages.Settings.aTuManera}
        subtitle="Personaliza el idioma y la apariencia de tu app."
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
