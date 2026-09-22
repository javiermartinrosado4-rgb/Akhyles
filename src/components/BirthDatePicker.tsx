import { Modal, Pressable, View } from "react-native";
import { useMemo, useState } from "react";
import { useLanguage } from "../i18n";
import { Button, Card, GoldSurface, Txt } from "./ui";
import { useTheme } from "../theme";

const atNoon = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate(), 12);
const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const readDate = (value?: string) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? atNoon(new Date(`${value}T12:00:00`)) : undefined;
const monthStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1, 12);

/** Existing ISO dates remain unchanged until the person explicitly selects a new date. */
export function BirthDatePicker({ value, error, onChange }: { value?: string; error?: string; onChange: (value: string) => void }) {
  const { locale } = useLanguage();
  const { colors } = useTheme();
  const selected = readDate(value);
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(() => monthStart(selected ?? new Date(new Date().getFullYear() - 25, 0, 1)));
  const days = useMemo(() => {
    const start = monthStart(cursor), offset = (start.getDay() + 6) % 7;
    return Array.from({ length: 42 }, (_, index) => new Date(cursor.getFullYear(), cursor.getMonth(), index - offset + 1, 12));
  }, [cursor]);
  const maximum = atNoon(new Date());
  const choose = (date: Date) => { if (date <= maximum) { onChange(dateKey(date)); setOpen(false); } };
  return <View style={{ flex: 1, gap: 6 }}>
    <Txt weight="600" size={13}>Fecha de nacimiento</Txt>
    <Pressable accessibilityRole="button" accessibilityLabel="Elegir fecha de nacimiento" onPress={() => { setCursor(monthStart(selected ?? cursor)); setOpen(true); }} style={({ pressed }) => ({ minHeight: 52, justifyContent: "center", paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: error ? colors.error : colors.border, backgroundColor: pressed ? colors.soft : colors.surface })}>
      <Txt muted={!selected}>{selected ? selected.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "Elegir en calendario"}</Txt>
    </Pressable>
    {!!error && <Txt size={12} style={{ color: colors.error }}>{error}</Txt>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.48)" }}>
        <Card style={{ maxWidth: 470, width: "100%", alignSelf: "center" }}>
          <Txt weight="600" size={20}>Elige tu fecha de nacimiento</Txt>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Button label="Año anterior" icon="chevrons-left" hideLabel compact variant="ghost" onPress={() => setCursor(value => new Date(value.getFullYear() - 1, value.getMonth(), 1, 12))} />
            <Button label="Mes anterior" icon="chevron-left" hideLabel compact variant="ghost" onPress={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))} />
            <Txt weight="600" style={{ textTransform: "capitalize" }}>{cursor.toLocaleDateString(locale, { month: "long", year: "numeric" })}</Txt>
            <Button label="Mes siguiente" icon="chevron-right" hideLabel compact variant="ghost" onPress={() => setCursor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))} />
            <Button label="Año siguiente" icon="chevrons-right" hideLabel compact variant="ghost" onPress={() => setCursor(value => new Date(value.getFullYear() + 1, value.getMonth(), 1, 12))} />
          </View>
          <View style={{ flexDirection: "row" }}>{Array.from({ length: 7 }, (_, index) => <Txt key={index} size={11} muted style={{ width: "14.285%", textAlign: "center" }}>{new Date(2024, 0, index + 1).toLocaleDateString(locale, { weekday: "narrow" })}</Txt>)}</View>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{days.map(date => {
            const sameMonth = date.getMonth() === cursor.getMonth(), picked = !!selected && dateKey(date) === dateKey(selected), disabled = date > maximum;
            return <Pressable key={dateKey(date)} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString(locale)} disabled={disabled} onPress={() => choose(date)} style={({ pressed }) => ({ width: "14.285%", minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 9, overflow: "hidden", position: "relative", opacity: !sameMonth || disabled ? 0.32 : pressed ? 0.72 : 1, backgroundColor: picked ? colors.accent : "transparent" })}>{picked && <GoldSurface />}<Txt weight={picked ? "600" : "400"} style={{ color: picked ? colors.onAccent : colors.text }}>{date.getDate()}</Txt></Pressable>;
          })}</View>
          <Button label="Cerrar" compact variant="ghost" onPress={() => setOpen(false)} />
        </Card>
      </View>
    </Modal>
  </View>;
}
