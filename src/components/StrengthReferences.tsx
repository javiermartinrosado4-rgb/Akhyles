import { View } from "react-native";
import { useState } from "react";
import { StrengthReference, StrengthReferenceId } from "../types";
import { strengthReferenceDefinitions } from "../logic/strengthReferences";
import { Button, Card, Field, Notice, Row, Txt } from "./ui";

type ReferenceDraft = { weight: string; reps: string };

/** A declared mark is only replaced by an explicit confirmation, never by typing. */
export function StrengthReferences({ value, bodyWeight, sex, onChange }: { value: StrengthReference[]; bodyWeight: number; sex: "male" | "female" | ""; onChange: (value: StrengthReference[]) => void }) {
  const ready = Number.isFinite(bodyWeight) && bodyWeight >= 40 && bodyWeight <= 200 && !!sex;
  const [drafts, setDrafts] = useState<Partial<Record<StrengthReferenceId, ReferenceDraft>>>({});
  const [error, setError] = useState("");
  const draftFor = (id: StrengthReferenceId, current?: StrengthReference): ReferenceDraft => drafts[id] ?? { weight: current ? String(current.weight) : "", reps: current ? String(current.reps) : "" };
  const change = (id: StrengthReferenceId, current: StrengthReference | undefined, key: keyof ReferenceDraft, raw: string) => {
    setError("");
    setDrafts(previous => ({ ...previous, [id]: { ...draftFor(id, current), [key]: raw } }));
  };
  const commit = (id: StrengthReferenceId, current?: StrengthReference) => {
    if (!ready) return;
    const draft = draftFor(id, current);
    const weight = Number(draft.weight.replace(",", "."));
    const reps = Number(draft.reps.replace(",", "."));
    if (!Number.isFinite(weight) || weight < 0 || weight > 1000 || !Number.isInteger(reps) || reps < 1 || reps > 10) {
      setError("Completa un peso válido y entre 1 y 10 repeticiones antes de actualizar la marca."); return;
    }
    const next: StrengthReference = { ...(current ?? { id }), weight, reps, bodyWeight, sex: sex || "male", date: new Date().toISOString() };
    onChange([...value.filter(item => item.id !== id), next]);
    setDrafts(previous => ({ ...previous, [id]: { weight: String(weight), reps: String(reps) } }));
  };
  return <Card style={{ gap: 12 }}>
    <View style={{ gap: 3 }}><Txt weight="600" size={18}>Referencias de fuerza</Txt><Txt muted size={12}>Opcional. Cada marca sigue vigente hasta que confirmes una actualización o la quites.</Txt></View>
    {!ready && <Notice error>Indica sexo y un peso corporal válido para calcular referencias relativas.</Notice>}
    {!!error && <Notice error>{error}</Notice>}
    {(Object.keys(strengthReferenceDefinitions) as StrengthReferenceId[]).map(id => {
      const definition = strengthReferenceDefinitions[id]; const item = value.find(entry => entry.id === id); const draft = draftFor(id, item);
      return <View key={id} style={{ gap: 7, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#00000012" }}>
        <Row style={{ justifyContent: "space-between" }}><View style={{ flex: 1 }}><Txt weight="600">{definition.name}</Txt><Txt muted size={11}>{definition.pullup ? "Introduce solo el lastre; 0 kg para peso corporal." : "Peso total movido, incluida la barra."}</Txt></View>{item && <Button label="Quitar" compact variant="ghost" onPress={() => { onChange(value.filter(entry => entry.id !== id)); setDrafts(previous => ({ ...previous, [id]: { weight: "", reps: "" } })); }} />}</Row>
        <Row style={{ gap: 8 }}><View style={{ flex: 1 }}><Field label="kg" value={draft.weight} placeholder="—" numeric onChangeText={raw => change(id, item, "weight", raw)} /></View><View style={{ flex: 1 }}><Field label="Repeticiones" value={draft.reps} placeholder="1–10" numeric onChangeText={raw => change(id, item, "reps", raw)} /></View></Row>
        <Button label={item ? "Actualizar marca" : "Guardar marca"} compact variant="secondary" disabled={!ready} onPress={() => commit(id, item)} />
      </View>;
    })}
  </Card>;
}
