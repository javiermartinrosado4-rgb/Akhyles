import { useLanguage } from "../i18n";
import { ReactNode, useRef } from "react";
import { Pressable, View } from "react-native";
import { Button } from "./ui";

async function compress(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const value = new Image(); value.onload = () => resolve(value); value.onerror = reject; value.src = source;
  });
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 1080 / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.76);
}

export function CommunityPhoto({ onSelect, onError, label = "Seleccionar foto para publicar", renderTrigger }: { onSelect: (data: string) => void; onError: (message: string) => void; label?: string; renderTrigger?: ReactNode }) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  const openPicker = () => input.current?.click();
  return <View>
    <input ref={input} type="file" aria-label={t(label)} accept="image/jpeg,image/png,image/webp" style={{ display: "none" }}
      onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { onError("Elige una foto JPEG, PNG o WebP."); return; }
        try {
          const photo = await compress(file);
          if (photo.length > 1_950_000) { onError("No hemos podido reducirla lo suficiente. Prueba a recortarla un poco más."); return; }
          onSelect(photo);
        } catch { onError("No se ha podido preparar la fotografía."); }
      }} />
    {renderTrigger ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={openPicker}>{renderTrigger}</Pressable> : <Button label={label} icon="image" variant="secondary" onPress={openPicker} />}
  </View>;
}
