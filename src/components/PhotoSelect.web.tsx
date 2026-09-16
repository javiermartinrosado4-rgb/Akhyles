import { useLanguage } from "../i18n";
import { messages } from "../content/es";
import { useRef } from "react";
import { View } from "react-native";
import { Button } from "./ui";
export function PhotoSelect({
  label,
  onSelect,
  onError,
}: {
  label: string;
  onSelect: (name: string) => void;
  onError: (message: string) => void;
}) {
  const { t } = useLanguage();
  const input = useRef<HTMLInputElement>(null);
  return (
    <View>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label={t(label)}
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            if (
              !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
              file.size > 20 * 1024 * 1024
            )
              onError(messages.PhotoSelect.eligeUnaImagenJpgPngOWebp);
            else onSelect(file.name);
          }
          // Only the filename is used in this simulation. Release the file immediately; never read or upload its contents.
          event.target.value = "";
        }}
      />
      <Button
        label={label}
        variant="secondary"
        icon="image"
        onPress={() => input.current?.click()}
      />
    </View>
  );
}
