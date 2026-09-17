import { Pressable, View } from "react-native";
import { useState } from "react";
import { useTheme } from "../theme";
import { Icon, Txt } from "./ui";
import type { TrainingVisibility } from "../services/community";

const options: { value: TrainingVisibility; label: string; description: string }[] = [
  { value: "private", label: "Nadie", description: "Tu rutina, progreso, entrenamientos y logros quedan privados." },
  { value: "friends", label: "Mis amigos", description: "Solo las personas que os seguís mutuamente podrán verlo." },
  { value: "public", label: "Todos", description: "Cualquier persona de Comunidad podrá verlo." },
];

export function TrainingSharingSelect({ value, disabled, onChange, kind = "training" }: { value: TrainingVisibility; disabled?: boolean; onChange: (value: TrainingVisibility) => void; kind?: "training" | "achievements" }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find(option => option.value === value) ?? options[0];
  const title = kind === "achievements" ? "Compartir logros" : "Compartir información de entrenamientos";
  return <View style={{ gap: 8 }}>
    <Txt weight="600" size={14}>{title}</Txt>
    <Pressable accessibilityRole="button" accessibilityLabel={`Cambiar quién puede ver tus ${kind === "achievements" ? "logros" : "entrenamientos"}`} accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => setOpen(current => !current)} style={({ pressed }) => ({ minHeight: 54, borderWidth: 1, borderColor: open ? colors.accent : colors.border, borderRadius: 13, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surface, opacity: disabled || pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1 }}><Txt weight="600">{selected.label}</Txt><Txt muted size={12}>{selected.description}</Txt></View><Icon name={open ? "chevron-up" : "chevron-down"} size={18} />
    </Pressable>
    {open && <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 13, overflow: "hidden" }}>
      {options.map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: option.value === value }} onPress={() => { setOpen(false); onChange(option.value); }} style={({ pressed }) => ({ padding: 13, gap: 3, backgroundColor: option.value === value ? colors.accentSoft : pressed ? colors.soft : colors.surface, borderBottomWidth: option.value === "public" ? 0 : 1, borderBottomColor: colors.border })}>
        <Txt weight="600">{option.label}</Txt><Txt muted size={12}>{option.description}</Txt>
      </Pressable>)}
    </View>}
  </View>;
}
