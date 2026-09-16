import { useLanguage } from "../i18n";
import { Dispatch, SetStateAction, useState } from "react";
import { Pressable, View } from "react-native";
import { catalog } from "../data/catalog";
import { muscles, levelName, levelRank } from "../data/options";
import { ExerciseTier, Muscle, Preferences, Profile } from "../types";
import { Button, Card, Icon, Notice, Txt } from "./ui";

export function ExerciseTiers({
  preferences,
  setPreferences,
  profile,
}: {
  preferences: Preferences;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  profile?: Profile;
}) {
  const { t } = useLanguage();
  const [muscle, setMuscle] = useState<Muscle>("chest");
  const [open, setOpen] = useState(false);
  const group = catalog.filter(e => e.muscle === muscle).sort((a, b) => a.priority - b.priority);
  const tiers: ExerciseTier[] = ["S+", "S", "A", "B"];
  const toggleFavorite = (id: string) => setPreferences(current => ({
    ...current,
    favorites: current.favorites?.includes(id)
      ? current.favorites.filter(favorite => favorite !== id)
      : [...(current.favorites ?? []), id],
  }));
  const favorites = preferences.favorites?.length ?? 0;
  return <Card>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("Ejercicios recomendados y favoritos")}
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen(value => !value)}
      style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 4 }}>
        <Txt weight="600" size={20}>Ejercicios recomendados y favoritos</Txt>
        <Txt muted size={13}>{t(favorites === 1 ? "{n} favorito guardado" : "{n} favoritos guardados", { n: favorites })}</Txt>
      </View>
      <Icon name={open ? "chevron-up" : "chevron-down"} />
    </Pressable>
    {open && <View style={{ gap: 12 }}>
      <Notice>Marca tus favoritos para que Akhyles los proponga antes cuando encajen con tu nivel, material y el patrón de la rutina. Nunca sustituye una restricción de seguridad o un ejercicio que hayas descartado.</Notice>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {muscles.filter(m => m.id !== "balanced").map(m => <Button key={m.id} compact label={t("Tier {name}", { name: t(m.name) })} variant={muscle === m.id ? "primary" : "secondary"} onPress={() => setMuscle(m.id as Muscle)} />)}
      </View>
      {tiers.map((tier) => {
      const entries = group.filter(e => e.tier === tier);
      return <View key={tier} style={{ gap: 8 }}>
        <Txt weight="600">{tier} · {t(tier === "S+" ? "Máxima prioridad" : tier === "S" ? "Prioridad alta" : tier === "A" ? "Alternativas preferentes" : "Otras opciones")}</Txt>
        {entries.length ? entries.map(e => {
          const favorite = preferences.favorites?.includes(e.id);
          const advancedFavorite = Boolean(favorite && profile && levelRank[e.minLevel] > levelRank[profile.level]);
          return <View key={e.id} style={{ gap: 3 }}>
          <Txt>{e.name}</Txt>
          <Txt muted size={12}>{t("{equipment} · desde {level}", { equipment: t(e.equipment), level: t(levelName(e.minLevel)) })}</Txt>
          {advancedFavorite && <Txt size={12} muted>Favorito avanzado: Akhyles puede sugerirlo, pero su ejecucion es dificil. Aprende la tecnica antes de cargarlo.</Txt>}
          <Button
            compact
            variant={favorite ? "primary" : "secondary"}
            icon="heart"
            label={favorite ? "Favorito" : "Marcar favorito"}
            onPress={() => toggleFavorite(e.id)}
          />
        </View>;
        }) : <Txt muted size={12}>Sin ejercicios en este tier.</Txt>}
      </View>;
      })}
      <Txt muted size={12}>{t("{n} favoritos guardados. Los tiers no restringen tu rutina ni puntúan ejercicios personalizados.", { n: favorites })}</Txt>
    </View>}
  </Card>;
}
