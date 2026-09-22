import { useLanguage } from "../i18n";
import { Pressable, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useTheme } from "../theme";
import { EmeraldSurface, Icon, LaurelCrown, Txt } from "./ui";

export function CommunityTabs<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: React.ComponentProps<typeof Icon>["name"] | "laurel" | "trophy" }[];
  onChange: (value: T) => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", padding: 4, gap: 3, borderRadius: 16, backgroundColor: colors.soft }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={t(option.label)}
      accessibilityState={{ selected: value === option.value }} aria-selected={value === option.value} onPress={() => onChange(option.value)}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 2, position: "relative", overflow: "hidden",
        alignItems: "center", justifyContent: "center", gap: 4, opacity: pressed ? 0.7 : 1,
        backgroundColor: value === option.value ? colors.selection : "transparent", borderWidth: value === option.value ? 1 : 0, borderColor: colors.selectionHighlight })}>
      {value === option.value && <EmeraldSurface />}
      {option.icon === "laurel" ? <LaurelCrown size={20} /> : option.icon === "trophy" ? <FontAwesome name="trophy" size={19} color={colors.accent} /> : option.icon && <Icon name={option.icon} size={18} color={value === option.value ? "#F4FFF9" : colors.muted} />}
      <Txt size={12} weight="600" numberOfLines={1} style={{ color: value === option.value ? "#F4FFF9" : colors.muted }}>{option.label}</Txt>
    </Pressable>)}
  </View>;
}
