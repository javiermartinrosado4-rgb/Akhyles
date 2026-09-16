import { useLanguage } from "../i18n";
import { Pressable, View } from "react-native";
import { useTheme } from "../theme";
import { Icon, Txt } from "./ui";

export function CommunityTabs<T extends string>({ value, options, onChange }: {
  value: T; options: { value: T; label: string; icon?: React.ComponentProps<typeof Icon>["name"] }[];
  onChange: (value: T) => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", padding: 4, gap: 3, borderRadius: 16, backgroundColor: colors.soft }}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={t(option.label)}
      accessibilityState={{ selected: value === option.value }} aria-selected={value === option.value} onPress={() => onChange(option.value)}
      style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 48, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 2,
        alignItems: "center", justifyContent: "center", gap: 4, opacity: pressed ? 0.7 : 1,
        backgroundColor: value === option.value ? colors.accent : "transparent" })}>
      {option.icon && <Icon name={option.icon} size={18} color={value === option.value ? colors.onAccent : colors.muted} />}
      <Txt size={12} weight="600" numberOfLines={1} style={{ color: value === option.value ? colors.onAccent : colors.muted }}>{option.label}</Txt>
    </Pressable>)}
  </View>;
}
