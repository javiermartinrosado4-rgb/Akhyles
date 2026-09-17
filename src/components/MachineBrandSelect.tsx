import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { machineBrands, normalizeMachineBrand } from "../data/machineBrands";
import { useCommunity } from "../state/Community";
import { Button, Card, Field, Page, Row, Txt } from "./ui";

type BrandPage = { gym: string[]; global: string[] };

export function MachineBrandSelect({ exerciseId, value, onChange }: { exerciseId: string; value?: string; onChange: (brand?: string) => void }) {
  const { user, request } = useCommunity();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [gym, setGym] = useState<string[]>([]);
  const [global, setGlobal] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !user) return;
    void request<BrandPage>(`/machine-brands?exercise=${encodeURIComponent(exerciseId)}`).then(page => { setGym(page.gym); setGlobal(page.global); }).catch(() => undefined);
  }, [open, user, request, exerciseId]);
  const choose = (brand?: string) => {
    const next = brand && normalizeMachineBrand(brand);
    onChange(next || undefined); setOpen(false); setSearch("");
    const suggested = !!next && !all.some(known => known.localeCompare(next, "es", { sensitivity: "accent" }) === 0);
    if (next && user) void request("/machine-brands", "POST", { exerciseId, brand: next, suggested }).catch(() => undefined);
  };
  const all = [...new Set([...machineBrands, ...global])].sort((a, b) => a.localeCompare(b, "es"));
  const matches = (brand: string) => !search.trim() || brand.toLocaleLowerCase("es").includes(search.trim().toLocaleLowerCase("es"));
  return <>
    <Button label={value ? `Máquina · ${value}` : "Indicar marca"} compact variant="ghost" icon="tag" onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}><Page>
      <Row style={{ justifyContent: "space-between" }}><View><Txt weight="600" size={22}>Marca de la máquina</Txt><Txt muted size={13}>Opcional; mejora las comparaciones.</Txt></View><Button label="Cerrar" compact variant="ghost" onPress={() => setOpen(false)} /></Row>
      <Field label="Buscar marca" value={search} onChangeText={setSearch} placeholder="Ej. Panatta" />
      {!!gym.filter(matches).length && <Card><Txt weight="600">En tu gimnasio</Txt>{gym.filter(matches).map(brand => <Button key={brand} label={brand} compact variant="ghost" onPress={() => choose(brand)} />)}</Card>}
      <Card><Txt weight="600">Todas las marcas</Txt>{all.filter(matches).map(brand => <Button key={brand} label={brand} compact variant="ghost" onPress={() => choose(brand)} />)}</Card>
      {search.trim() && !all.some(brand => brand.localeCompare(search.trim(), "es", { sensitivity: "accent" }) === 0) && <Button label={`Usar “${normalizeMachineBrand(search)}”`} variant="secondary" onPress={() => choose(search)} />}
      <Button label="No lo sé / quitar marca" compact variant="ghost" onPress={() => choose(undefined)} />
    </Page></Modal>
  </>;
}
