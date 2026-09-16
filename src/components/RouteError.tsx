import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { ErrorBoundaryProps } from "expo-router";
import { Pressable, Text, View } from "react-native";
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  const { t } = useLanguage();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#F8F8F5",
        alignItems: "center",
        justifyContent: "center",
        padding: 28,
        gap: 20,
      }}
    >
      <Text style={{ color: "#242C28", fontSize: 22 }}>
        {t(messages.RouteError.noHemosPodidoAbrirEstaPantalla)}
      </Text>
      <Text style={{ color: "#667068" }}>
        {t(messages.RouteError.tusDatosGuardadosSiguenEnElDispositivo)}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={{ padding: 18, backgroundColor: "#456351", borderRadius: 12 }}
      >
        <Text style={{ color: "#FFFFFF" }}>
          {t(messages.RouteError.volverAIntentarlo)}
        </Text>
      </Pressable>
    </View>
  );
}
