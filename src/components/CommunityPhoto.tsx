import * as ImagePicker from "expo-image-picker";
import { ReactNode } from "react";
import { Pressable } from "react-native";
import { Button } from "./ui";

export function CommunityPhoto({ onSelect, onError, label = "Seleccionar foto para publicar", renderTrigger }: { onSelect: (data: string) => void; onError: (message: string) => void; label?: string; renderTrigger?: ReactNode }) {
  const select = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], base64: true, exif: false, quality: 0.5 });
      if (result.canceled) return;
      const photo = result.assets[0].base64;
      if (!photo || photo.length > 1_950_000) { onError("No hemos podido reducirla lo suficiente. Prueba a recortarla un poco más."); return; }
      onSelect(`data:image/jpeg;base64,${photo}`);
    } catch { onError("No se ha podido seleccionar la fotografía."); }
  };
  return renderTrigger ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={select}>{renderTrigger}</Pressable> : <Button label={label} icon="image" variant="secondary" onPress={select} />;
}
