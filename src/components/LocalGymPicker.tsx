import { useEffect, useState } from "react";
import { Modal, Pressable, SafeAreaView, View } from "react-native";
import { Button, Card, Field, Heading, Icon, Row, Txt } from "./ui";
import { CommunityGym } from "../services/community";
import { useTheme } from "../theme";

type Chain = { id: string; name: string; sortOrder: number };
type Location = { province: string; city: string };

export function LocalGymPicker({ request, city, onPick, onIndependent }: {
  request: <T>(path: string, method?: string, data?: unknown) => Promise<T>;
  city: string;
  onPick: (gym: CommunityGym) => void;
  onIndependent: () => void;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [chains, setChains] = useState<Chain[]>([]);
  const [chain, setChain] = useState<Chain | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [province, setProvince] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [query, setQuery] = useState("");
  const [gyms, setGyms] = useState<CommunityGym[]>([]);

  useEffect(() => { if (!open) return; void request<Chain[]>("/gym-chains").then(setChains).catch(() => setChains([])); }, [open, request]);
  useEffect(() => {
    if (!chain) return;
    void request<Location[]>(`/gym-locations?chainId=${encodeURIComponent(chain.id)}`).then(value => {
      setLocations(value);
      const preferred = value.find(item => item.city.toLocaleLowerCase("es") === city.trim().toLocaleLowerCase("es"));
      if (preferred) { setProvince(preferred.province); setSelectedCity(preferred.city); }
    }).catch(() => setLocations([]));
  }, [chain, city, request]);
  useEffect(() => {
    if (!chain || !selectedCity && !query.trim()) return;
    const timer = setTimeout(() => void request<CommunityGym[]>(`/gyms?q=${encodeURIComponent(query)}&city=${encodeURIComponent(selectedCity)}&province=${encodeURIComponent(province)}&chainId=${encodeURIComponent(chain.id)}`).then(setGyms).catch(() => setGyms([])), 180);
    return () => clearTimeout(timer);
  }, [chain, province, query, request, selectedCity]);
  const chooseChain = (value: Chain) => { setChain(value); setProvince(""); setSelectedCity(""); setQuery(""); setGyms([]); };
  const close = () => { setOpen(false); setChain(null); setProvince(""); setSelectedCity(""); setQuery(""); setGyms([]); };
  const provinces = [...new Set(locations.map(item => item.province))];
  const cities = locations.filter(item => !province || item.province === province).map(item => item.city);
  return <>
    <Button label="Seleccionar del catálogo" icon="map-pin" compact variant="secondary" onPress={() => setOpen(true)} />
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: 20, gap: 14 }}>
          <Row style={{ justifyContent: "space-between" }}><Heading title="Elige tu gimnasio" subtitle="Selecciona una cadena, ubicación y sede." /><Button label="Cerrar" icon="x" compact tight hideLabel variant="ghost" onPress={close} /></Row>
          {!chain && <><Txt weight="600">Cadenas</Txt><Card style={{ padding: 0, gap: 0 }}>{chains.map(item => <Pressable key={item.id} onPress={() => chooseChain(item)} style={({ pressed }) => ({ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.soft : colors.surface })}><Row><Icon name="chevron-right" size={17} /><Txt weight="600">{item.name}</Txt></Row></Pressable>)}</Card><Button label="Gimnasio independiente" compact variant="ghost" onPress={() => { close(); onIndependent(); }} /></>}
          {!!chain && <>
            <Button label={chain.name} icon="arrow-left" compact variant="ghost" onPress={() => { setChain(null); setGyms([]); }} />
            <Txt weight="600">Provincia</Txt>
            <Row style={{ flexWrap: "wrap" }}>{provinces.map(item => <Button key={item} label={item} compact variant={province === item ? "primary" : "secondary"} onPress={() => { setProvince(item); setSelectedCity(""); }} />)}</Row>
            {!!province && <><Txt weight="600">Ciudad</Txt><Row style={{ flexWrap: "wrap" }}>{cities.map(item => <Button key={item} label={item} compact variant={selectedCity === item ? "primary" : "secondary"} onPress={() => setSelectedCity(item)} />)}</Row></>}
            <Field label="Buscar sede" value={query} onChangeText={setQuery} placeholder="Nombre, barrio o dirección" />
            {!gyms.length && <Txt muted>{locations.length ? "Elige una ciudad o busca entre las sedes disponibles." : "Aún no hay sedes catalogadas para esta cadena."}</Txt>}
            {!!gyms.length && <Card style={{ padding: 0, gap: 0 }}>{gyms.map(gym => <Pressable key={gym.id} onPress={() => { onPick(gym); close(); }} style={({ pressed }) => ({ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.soft : colors.surface })}><Txt weight="600" translate={false}>{gym.name}</Txt><Txt muted size={12} translate={false}>{gym.city}{gym.address ? ` · ${gym.address}` : ""}</Txt></Pressable>)}</Card>}
            <Button label="Ver más opciones" compact variant="ghost" onPress={() => { setProvince(""); setSelectedCity(""); }} />
            <Button label="Gimnasio independiente" compact variant="ghost" onPress={() => { close(); onIndependent(); }} />
          </>}
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
