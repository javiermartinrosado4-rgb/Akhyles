import { View } from "react-native";
import { StrengthReference, StrengthReferenceId } from "../types";
import { strengthReferenceDefinitions } from "../logic/strengthReferences";
import { Button, Card, Field, Notice, Row, Txt } from "./ui";

export function StrengthReferences({ value, bodyWeight, sex, onChange }: { value: StrengthReference[]; bodyWeight: number; sex: "male" | "female" | ""; onChange: (value: StrengthReference[]) => void }) {
  const ready = Number.isFinite(bodyWeight) && bodyWeight >= 40 && bodyWeight <= 200 && !!sex;
  const change = (id: StrengthReferenceId, key: "weight" | "reps", raw: string) => {
    if (!ready) return;
    const current = value.find(item => item.id === id);
    const parsed = Number(raw.replace(",", "."));
    if (!raw.trim()) { if (current) onChange(value.filter(item => item.id !== id)); return; }
    const base: StrengthReference = current ?? { id, weight: 0, reps: 1, bodyWeight, sex: sex || "male", date: new Date().toISOString() };
    const next = { ...base, [key]: parsed, bodyWeight, sex: sex || "male", date: new Date().toISOString() };
    onChange([...value.filter(item => item.id !== id), next]);
  };
  return <Card style={{ gap: 12 }}>
    <View style={{ gap: 3 }}><Txt weight="600" size={18}>Referencias de fuerza</Txt><Txt muted size={12}>Opcional. Akhyles usa tu mejor evidencia por grupo; estas marcas declaradas no se suman a tus entrenamientos.</Txt></View>
    {!ready && <Notice error>Indica sexo y un peso corporal válido para calcular referencias relativas.</Notice>}
    {(Object.keys(strengthReferenceDefinitions) as StrengthReferenceId[]).map(id => {
      const definition = strengthReferenceDefinitions[id]; const item = value.find(entry => entry.id === id);
      return <View key={id} style={{ gap: 7, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#00000012" }}>
        <Row style={{ justifyContent: "space-between" }}><View style={{ flex: 1 }}><Txt weight="600">{definition.name}</Txt><Txt muted size={11}>{definition.pullup ? "Introduce solo el lastre; 0 kg para peso corporal." : "Peso total movido, incluida la barra."}</Txt></View>{item && <Button label="Quitar" compact variant="ghost" onPress={() => onChange(value.filter(entry => entry.id !== id))} />}</Row>
        <Row style={{ gap: 8 }}><View style={{ flex: 1 }}><Field label="kg" value={item ? String(item.weight) : ""} placeholder="—" numeric onChangeText={raw => change(id, "weight", raw)} /></View><View style={{ flex: 1 }}><Field label="Repeticiones" value={item ? String(item.reps) : ""} placeholder="1–10" numeric onChangeText={raw => change(id, "reps", raw)} /></View></Row>
      </View>;
    })}
  </Card>;
}
