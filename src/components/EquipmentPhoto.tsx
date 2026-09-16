import { useLanguage } from "../i18n";
import { useState } from "react";
import { Image, Linking, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { getEquipmentPhoto } from "../data/equipment";
import { useTheme } from "../theme";
import { Button, Icon, Txt } from "./ui";

export function EquipmentPhoto({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const { t } = useLanguage();
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const equipment = getEquipmentPhoto(exerciseId);
  const size = width < 370 ? 104 : 132;

  if (!equipment || failed) {
    return (
      <View testID="equipment-photo-fallback" style={{ width: size, minHeight: size, backgroundColor: colors.soft, borderRadius: 18, padding: 12, gap: 8, alignItems: "center", justifyContent: "center" }}>
        <Icon name="tool" size={25} />
        <Txt muted size={11} style={{ textAlign: "center" }}>{failed ? "Foto no disponible" : "Equipo personalizado"}</Txt>
      </View>
    );
  }

  const photo = (large = false) => (
    <View style={{ width: "100%", aspectRatio: 1, backgroundColor: "#FFFFFF", overflow: "hidden", borderRadius: large ? 18 : 0 }}>
      <Image
        source={equipment.image}
        resizeMode="contain"
        accessibilityLabel={t("Equipamiento: {name}", { name: t(equipment.label) })}
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
        onError={() => { setFailed(true); setExpanded(false); }}
      />
      {equipment.extraImage && (
        <View style={{ position: "absolute", right: 5, bottom: 5, width: large ? 100 : 42, aspectRatio: 1, backgroundColor: "#FFFFFF", borderRadius: 9, overflow: "hidden", borderWidth: 1, borderColor: "#D9DED7" }}>
          <Image source={equipment.extraImage} resizeMode="contain" accessibilityLabel={t("Material adicional: {name}", { name: t(equipment.label) })} style={{ width: "100%", height: "100%" }} />
        </View>
      )}
      {/* A subtle sage photographic treatment retains all mechanical details.
          The original bundled photos remain untouched and readable in both themes. */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: "none", backgroundColor: "#789574", opacity: dark ? 0.2 : 0.1 }]} />
    </View>
  );

  return (
    <>
      <Pressable
        testID="equipment-photo"
        accessibilityRole="button"
        accessibilityLabel={t("Ampliar foto: {name}", { name: exerciseName })}
        accessibilityHint={t("Muestra el equipamiento en grande")}
        onPress={() => setExpanded(true)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={({ pressed }) => ({ width: size, flexShrink: 0, borderRadius: 18, overflow: "hidden", borderWidth: 1, borderColor: focused ? colors.accent : colors.border, backgroundColor: colors.accentSoft, opacity: pressed ? 0.8 : 1 })}
      >
        {photo()}
        <View style={{ paddingHorizontal: 8, paddingVertical: 8, gap: 6, flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          <Icon name="maximize-2" size={12} />
          <Txt size={10} weight="600" style={{ color: colors.accent }}>VER EQUIPO</Txt>
        </View>
      </Pressable>
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(8, 16, 10, 0.64)", justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Pressable accessibilityLabel={t("Cerrar foto del equipo")} accessibilityRole="button" onPress={() => setExpanded(false)} style={StyleSheet.absoluteFill} />
          <View accessibilityViewIsModal style={{ width: "100%", maxWidth: 440, maxHeight: "90%", borderRadius: 24, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, overflow: "hidden" }}>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
              <Txt size={11} weight="600" muted style={{ letterSpacing: 2 }}>TU EQUIPAMIENTO</Txt>
              <Txt translate={false} accessibilityRole="header" size={23} weight="600">{exerciseName}</Txt>
              {photo(true)}
              <Txt weight="600">{equipment.label}</Txt>
              <Txt muted size={12}>Foto orientativa: el modelo de tu gimnasio puede variar.</Txt>
              <Pressable accessibilityRole="link" accessibilityLabel={t("Ver foto original de {credit}", { credit: equipment.credit })} onPress={() => { void Linking.openURL(equipment.sourceUrl).catch(() => {}); }}>
                <Txt size={12} style={{ color: colors.accent, textDecorationLine: "underline" }}>{t("Foto: {credit} ↗", { credit: equipment.credit })}</Txt>
              </Pressable>
              <Button label="Volver al ejercicio" icon="arrow-left" onPress={() => setExpanded(false)} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
