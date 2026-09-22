import { useLanguage } from "../i18n";
import { Switch, View } from "react-native";
import { useTheme } from "../theme";
import { Txt } from "./ui";

export function CommunityPrivacyToggle({ label, description, value, disabled, onChange }: {
  label: string; description: string; value: boolean; disabled: boolean; onChange: () => void;
}) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 56, paddingVertical: 6 }}>
    <View style={{ flex: 1 }}><Txt weight="600" size={14}>{label}</Txt><Txt muted size={12}>{description}</Txt></View>
    <Switch accessibilityLabel={t(label)} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.selection }} />
  </View>;
}
