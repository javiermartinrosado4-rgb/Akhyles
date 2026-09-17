import React from "react";
import { Redirect, Slot, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Platform, useWindowDimensions, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { APP } from "../config";
import { StoreProvider, useStore } from "../state/Store";
import { CommunityProvider } from "../state/Community";
import { ThemeProvider, useTheme } from "../theme";
import { Button, Loading, Notice } from "../components/ui";
import { WeightReminder } from "../components/WeightReminder";
import { TrainingReminder } from "../components/TrainingReminder";
import { NotificationNavigation } from "../components/NotificationNavigation";
import { AccountProvider, useAccount } from "../state/Account";
import { LanguageProvider, useLanguage } from "../i18n";
import { accountUrl } from "../services/account";
export { ErrorBoundary } from "../components/RouteError";
function Frame() {
  const { language, t } = useLanguage();
  const { ready, storageBlocked, storageError, retry } = useStore();
  const { colors, dark } = useTheme();
  const account = useAccount();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === "web" && width >= 840;
  // The browser build is a private companion to the mobile app. Local Expo
  // development intentionally stays open so the interface can be built and
  // tested before the account API is deployed.
  const requiresWebSignIn = Platform.OS === "web" && !__DEV__ && !!accountUrl;
  const publicPath = pathname === "/" || pathname === "/account" || pathname === "/+not-found";
  React.useEffect(() => {
    if (Platform.OS === "web") {
      document.title = `${APP.name} · ${t('Entrena con intención')}`;
      document.documentElement.lang = language;
      document.body.style.backgroundColor = colors.outside;
    }
  }, [colors.outside, language, t]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.outside,
        alignItems: "center",
        paddingVertical: wide ? 24 : 0,
      }}
    >
      <StatusBar style={dark ? "light" : "dark"} />
      <SafeAreaView
        style={{
          flex: 1,
          width: "100%",
          // On the web this is the actual application, not a phone preview.
          // Keep the compact mobile frame on small screens while allowing the
          // authenticated area to use a comfortable desktop workspace.
          maxWidth: wide ? 1440 : 480,
          maxHeight: wide ? undefined : undefined,
          backgroundColor: colors.background,
          borderRadius: wide ? 24 : 0,
          overflow: "hidden",
          borderWidth: wide ? 1 : 0,
          borderColor: colors.border,
          boxShadow: wide ? "0 8px 40px rgba(0,0,0,0.05)" : undefined,
        }}
      >
        {storageError ? (
          <View style={{ padding: 16, gap: 8 }}>
            <Notice error>{storageError}</Notice>
            <Button
              label="Reintentar"
              onPress={retry}
              compact
              variant="secondary"
            />
          </View>
        ) : null}
        {!ready || (requiresWebSignIn && !account.ready) ? <Loading /> : storageBlocked ? null : requiresWebSignIn && !account.user && !publicPath ? <Redirect href="/account" /> : <><WeightReminder /><TrainingReminder /><NotificationNavigation /><Slot /></>}
      </SafeAreaView>
    </View>
  );
}
function ProfileCommunity() {
  const { state, ready } = useStore();
  // Account switches must unmount social requests before the new profile can publish.
  return <CommunityProvider key={ready ? state.cloud?.owner ?? "guest" : "hydrating"}><Frame /></CommunityProvider>;
}
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
      <StoreProvider>
        <ThemeProvider>
          <AccountProvider><ProfileCommunity /></AccountProvider>
        </ThemeProvider>
      </StoreProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
