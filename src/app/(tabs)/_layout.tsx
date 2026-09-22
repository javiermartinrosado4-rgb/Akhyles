import { Redirect, Slot, router, usePathname } from "expo-router";
import { useState } from "react";
import { Image, Platform, Pressable, useWindowDimensions, View } from "react-native";
import { useStore } from "../../state/Store";
import { useTheme } from "../../theme";
import { Icon, Row, Txt } from "../../components/ui";
import { useLanguage } from "../../i18n";
import { useAccount } from "../../state/Account";
import { useCommunity } from "../../state/Community";
import { Avatar } from "../../components/Avatar";
import { trainerWorkspaceEnabled } from "../../logic/trainerWorkspace";
const coreTabs = [
  { path: "/today", name: "Entrenamiento", icon: "sun" },
  { path: "/routine", name: "Calendario", icon: "grid" },
  { path: "/progress", name: "Progreso", icon: "bar-chart-2" },
  { path: "/community", name: "Comunidad", icon: "users" },
] as const;
export default function TabsLayout() {
  const { t } = useLanguage();
  const { state } = useStore();
  const account = useAccount();
  const community = useCommunity();
  const path = usePathname();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === "web" && width >= 840;
  const [focused, setFocused] = useState<string | null>(null);
  const tabs = [...coreTabs, ...(community.user?.trainerEnabled && trainerWorkspaceEnabled() ? [{ path: "/trainer", name: "Entrenador", icon: "briefcase" }] : [])];
  if (!state.completed || state.signedOut) return <Redirect href="/" />;
  const navigation = (
      <View
        style={{
          flexDirection: desktop ? "column" : "row",
          gap: desktop ? 6 : 2,
          padding: desktop ? 20 : 8,
          width: desktop ? 248 : undefined,
          borderTopWidth: desktop ? 0 : 1,
          borderRightWidth: desktop ? 1 : 0,
          borderColor: colors.border,
          backgroundColor: desktop ? colors.surface : colors.marble,
        }}
      >
        {desktop && <View style={{ paddingHorizontal: 10, paddingBottom: 22 }}><Row style={{ alignItems: "center", gap: 10 }}><Image source={require("../../../assets/brand/icon.png")} style={{ width: 32, height: 32, borderRadius: 8 }} accessibilityLabel="Akhyles" /><Txt size={22} weight="600">Akhyles</Txt></Row></View>}
        {tabs.map((tab) => (
          <Pressable
            key={tab.path}
            accessibilityRole="button"
            accessibilityLabel={t(tab.name)}
            accessibilityState={{ selected: path === tab.path }}
            aria-current={path === tab.path ? "page" : undefined}
            onFocus={() => setFocused(tab.path)}
            onBlur={() => setFocused(null)}
            onPress={() => router.replace(tab.path as never)}
            style={({ pressed }) => ({
              flex: desktop ? undefined : 1,
              minHeight: desktop ? 52 : 58,
              gap: 5,
              paddingVertical: desktop ? 10 : 8,
              paddingHorizontal: desktop ? 12 : 2,
              alignItems: desktop ? "flex-start" : "center",
              flexDirection: desktop ? "row" : "column",
              justifyContent: "center",
              borderRadius: desktop ? 13 : 12,
              // The gold icon alone identifies the current section. Keeping
              // the row transparent removes the heavy card-within-card look.
              borderWidth: focused === tab.path ? 1 : 0,
              borderColor: colors.accent,
              backgroundColor: "transparent",
              opacity: pressed ? 0.65 : 1,
            })}
          >
            <Icon
              name={tab.icon as never}
              size={20}
              color={path === tab.path ? colors.accent : desktop ? colors.muted : "#D5E0D5"}
            />
            <Txt
              size={desktop ? 14 : 11}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              weight="400"
              muted={desktop}
              style={{ textAlign: desktop ? "left" : "center", width: desktop ? undefined : "100%", color: !desktop ? "#D5E0D5" : undefined }}
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
      <View style={{ flex: 1, minWidth: 0 }}>
        {desktop && <View style={{ minHeight: 66, paddingHorizontal: 28, alignItems: "flex-end", justifyContent: "center", backgroundColor: colors.background }}><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push("/profile")} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.7 : 1 })}><View style={{ alignItems: "flex-end" }}><Txt weight="600" size={13} numberOfLines={1} translate={false}>{community.user?.name ?? state.profile.name ?? "Perfil"}</Txt><Txt muted size={11}>Perfil</Txt></View><Avatar id={community.user?.avatar ?? state.profile.avatar} size={38} /></Pressable></View>}
        {!desktop && <View style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 8, alignItems: "flex-end", justifyContent: "center", backgroundColor: colors.background }}><Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" onPress={() => router.push("/profile")} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><Avatar id={community.user?.avatar ?? state.profile.avatar} size={38} /></Pressable></View>}
        <Slot />
      </View>
      {!desktop && navigation}
    </View>
  );
}
