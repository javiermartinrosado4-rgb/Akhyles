import { useLanguage } from "../i18n";
import { useState } from "react";
import { messages } from "../content/es";
import { Pressable, View } from "react-native";
import { APP } from "../config";
import { defaultTrainingDays, levels, muscles, weekdays } from "../data/options";
import { Profile, Weekday } from "../types";
import { Button, Choice, Icon, Notice, Txt } from "./ui";
import { useTheme } from "../theme";
export function LevelSelect({
  profile,
  change,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
}) {
  return (
    <View style={{ gap: 12 }}>
      {levels.map((l) => (
        <Choice
          key={l.id}
          title={l.name}
          description={l.description}
          selected={profile.level === l.id}
          onPress={() => change({ level: l.id })}
        />
      ))}
    </View>
  );
}
export function DaysSelect({
  profile,
  change,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
}) {
  const { t } = useLanguage();
  return (
    <View style={{ gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
          <View key={day} style={{ flex: 1, minWidth: 0 }}>
            <Button
              label={String(day)}
              tight
              variant={profile.days === day ? "primary" : "secondary"}
              onPress={() => change({ days: day, trainingDays: defaultTrainingDays(day) })}
            />
          </View>
        ))}
      </View>
      <Txt weight="600">
        {t(profile.days === 1 ? "{count} día disponible por semana" : "{count} días disponibles por semana", { count: profile.days })}
      </Txt>
      <Txt weight="600">¿Qué días puedes entrenar?</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {weekdays.map((day) => {
          const selected = (profile.trainingDays ?? defaultTrainingDays(profile.days)).includes(day.id);
          const full = (profile.trainingDays ?? defaultTrainingDays(profile.days)).length >= profile.days;
          return (
            <View key={day.id} style={{ width: 92 }}>
              <Button
                label={day.name}
                compact
                variant={selected ? "primary" : "secondary"}
                disabled={!selected && full}
                onPress={() => {
                  const current = profile.trainingDays ?? defaultTrainingDays(profile.days);
                  change({
                    trainingDays: (selected
                      ? current.filter((id) => id !== day.id)
                      : [...current, day.id].sort((a, b) => a - b)) as Weekday[],
                  });
                }}
              />
            </View>
          );
        })}
      </View>
      <Txt size={12} muted>
        {profile.days <= APP.maxDays
          ? t("Seleccionados {value1} de {value2} días.", { value1: (profile.trainingDays ?? defaultTrainingDays(profile.days)).length, value2: profile.days })
          : t("Seleccionados {value1} días disponibles; se programarán {value2} sesiones.", { value1: (profile.trainingDays ?? defaultTrainingDays(profile.days)).length, value2: APP.maxDays })}
      </Txt>
      {profile.days > 5 && (
        <Notice>
          {messages.Selections.recomendamosYProgramaremosUnMaximoDe5}
        </Notice>
      )}
    </View>
  );
}
export function PrioritySelect({
  profile,
  change,
  dropdown = false,
}: {
  profile: Profile;
  change: (p: Partial<Profile>) => void;
  /** The settings screen keeps the same choices behind a compact disclosure. */
  dropdown?: boolean;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = muscles.find((muscle) => muscle.id === profile.priority) ?? muscles[0];
  const description = selected.id === "balanced"
    ? messages.Selections.sinPrioridadConcreta
    : "Este músculo será tu mesociclo de especialización: aumenta sus series según tus días disponibles; desde 4 días se acerca a 16 series en nivel intermedio o avanzado.";
  const choose = (id: Profile["priority"]) => {
    change({ priority: id, mesocycle: id !== "balanced" });
    setOpen(false);
  };
  if (dropdown) {
    return (
      <View style={{ gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("Elegir mesociclo: {name}", { name: t(selected.name) })}
          accessibilityState={{ expanded: open }}
          onPress={() => setOpen((value) => !value)}
          style={({ pressed }) => ({
            minHeight: 66,
            padding: 16,
            borderRadius: 15,
            borderWidth: 2,
            borderColor: open ? colors.accent : colors.border,
            backgroundColor: open ? colors.accentSoft : colors.surface,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Txt weight="600">{selected.name}</Txt>
            <Txt size={13} muted>{description}</Txt>
          </View>
          <Icon name={open ? "chevron-up" : "chevron-down"} />
        </Pressable>
        {open && (
          <View
            accessibilityRole="menu"
            style={{ gap: 8, padding: 8, borderRadius: 16, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.border }}
          >
            {muscles.map((muscle) => (
              <Choice
                key={muscle.id}
                title={muscle.name}
                selected={profile.priority === muscle.id}
                onPress={() => choose(muscle.id)}
              />
            ))}
          </View>
        )}
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {muscles.map((m) => (
        <Choice
          key={m.id}
          title={m.name}
          description={m.id === "balanced" ? messages.Selections.sinPrioridadConcreta : "Este músculo será tu mesociclo de especialización: aumenta sus series según tus días disponibles; desde 4 días se acerca a 16 series en nivel intermedio o avanzado."}
          selected={profile.priority === m.id}
          onPress={() => choose(m.id)}
        />
      ))}
    </View>
  );
}
