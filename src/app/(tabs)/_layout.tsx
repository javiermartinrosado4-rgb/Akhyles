import { Redirect, Slot, router, usePathname } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useStore } from "../../state/Store";
import { useTheme } from "../../theme";
import { Icon, Txt } from "../../components/ui";
import { useLanguage } from "../../i18n";
import { useAccount } from "../../state/Account";
const tabs = [
  { path: "/today", name: "Entrenamiento", icon: "sun" },
  { path: "/routine", name: "Calendario", icon: "grid" },
  { path: "/progress", name: "Progreso", icon: "bar-chart-2" },
  { path: "/community", name: "Comunidad", icon: "users" },
  { path: "/profile", name: "Perfil", icon: "user" },
] as const;
export default function TabsLayout() {
  const { t } = useLanguage();
  const { state } = useStore();
  const account = useAccount();
  const path = usePathname();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 840;
  const [focused, setFocused] = useState<string | null>(null);
  if (!state.completed || state.signedOut) return <Redirect href="/" />;
  const navigation = (
      <View
        style={{
          flexDirection: desktop ? "column" : "row",
          gap: desktop ? 6 : 2,
          padding: desktop ? 18 : 10,
          width: desktop ? 232 : undefined,
          borderTopWidth: desktop ? 0 : 1,
          borderRightWidth: desktop ? 1 : 0,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
      >
        {desktop && <View style={{ paddingHorizontal: 10, paddingBottom: 18, gap: 4 }}>
          <Txt size={22} weight="600">Akhyles</Txt>
          <Txt size={12} muted>Tu espacio de entrenamiento</Txt>
        </View>}
        {tabs.map((tab) => (
          <Pressable
            key={tab.path}
            accessibilityRole="button"
            accessibilityLabel={t(tab.name)}
            accessibilityState={{ selected: path === tab.path }}
            aria-current={path === tab.path ? "page" : undefined}
            onFocus={() => setFocused(tab.path)}
            onBlur={() => setFocused(null)}
            onPress={() => router.replace(tab.path)}
            style={({ pressed }) => ({
              flex: desktop ? undefined : 1,
              minHeight: desktop ? 52 : 56,
              gap: 5,
              paddingVertical: desktop ? 10 : 8,
              paddingHorizontal: desktop ? 12 : 2,
              alignItems: desktop ? "flex-start" : "center",
              flexDirection: desktop ? "row" : "column",
              justifyContent: "center",
              borderRadius: 12,
              borderWidth: 2,
              borderColor: focused === tab.path ? colors.accent : "transparent",
              backgroundColor:
                path === tab.path ? colors.accentSoft : "transparent",
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Icon
              name={tab.icon}
              size={20}
              color={path === tab.path ? colors.accent : colors.muted}
            />
            <Txt
              size={desktop ? 14 : 11}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ textAlign: desktop ? "left" : "center", width: desktop ? undefined : "100%" }}
              weight={path === tab.path ? "600" : "400"}
              muted={path !== tab.path}
            >
              {tab.name}
            </Txt>
          </Pressable>
        ))}
        {desktop && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={account.user ? "Gestionar cuenta" : "Preparar cuenta"}
            onPress={() => router.push("/account")}
            style={({ pressed }) => ({
              marginTop: "auto",
              padding: 14,
              gap: 4,
              borderRadius: 14,
              backgroundColor: colors.soft,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Txt size={12} weight="600" translate={false}>
              {account.user ? account.user.name : "MODO LOCAL"}
            </Txt>
            <Txt size={12} muted>
              {account.user
                ? account.status === "saved"
                  ? "Copia sincronizada"
                  : "Sincronización pendiente"
                : "Tu cuenta se podrá conectar aquí"}
            </Txt>
          </Pressable>
        )}
      </View>
  );
  return (
    <View style={{ flex: 1, flexDirection: desktop ? "row" : "column" }}>
      {desktop && navigation}
      <View style={{ flex: 1, minWidth: 0 }}><Slot /></View>
      {!desktop && navigation}
    </View>
  );
}
