import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { googleGymDetails, GoogleGymPrediction, googlePlacesEnabled, searchGoogleGyms } from "../services/googlePlaces";
import { useTheme } from "../theme";
import { Button, Card, Field, Heading, Icon, Notice, Row, Txt } from "./ui";

export interface PickedGoogleGym { name: string; address: string; city: string; placeId: string; latitude?: number; longitude?: number; }

export function GoogleGymPicker({ value, language, onPick }: { value: string; language: "es" | "en"; onPick: (gym: PickedGoogleGym) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GoogleGymPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      if (query.trim().length < 2 || !googlePlacesEnabled()) { setResults([]); return; }
      setLoading(true); setError("");
      void searchGoogleGyms(query, language).then(setResults).catch(reason => setError(reason instanceof Error ? reason.message : "No se ha podido buscar.")).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [language, open, query]);

  const choose = async (prediction: GoogleGymPrediction) => {
    setLoading(true); setError("");
    try {
      const place = await googleGymDetails(prediction, language);
      onPick(place); setOpen(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se ha podido elegir este gimnasio."); }
    finally { setLoading(false); }
  };

  return <>
    <Button label="Buscar en Google Maps" icon="map-pin" compact variant="secondary" onPress={() => { setQuery(value); setError(""); setOpen(true); }} />
    <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, padding: 20, gap: 14 }}>
          <Row style={{ justifyContent: "space-between" }}><View style={{ flex: 1, gap: 3 }}><Txt size={11} muted weight="600" style={{ letterSpacing: 1.2 }}>GOOGLE MAPS</Txt><Heading title="Elige tu gimnasio" subtitle="Busca el centro real y guarda su nombre y dirección." /></View><Button label="Cerrar" icon="x" compact tight hideLabel accessibilityLabel="Cerrar el buscador de Google Maps" variant="ghost" onPress={() => setOpen(false)} /></Row>
          <Field label="Buscar gimnasio" value={query} onChangeText={setQuery} placeholder="Nombre o zona" maxLength={100} />
          {!googlePlacesEnabled() && <Notice>Google Maps no está configurado aún en esta compilación local. Puedes probar el diseño y seguir usando el buscador de la comunidad o el alta manual.</Notice>}
          {!!error && <Notice error>{error}</Notice>}
          {loading && <Row><ActivityIndicator color={colors.accent} /><Txt muted>Buscando gimnasios…</Txt></Row>}
          {!!results.length && <Card style={{ padding: 0, gap: 0 }}>
            {results.map(place => <Pressable key={place.placeId} accessibilityRole="button" accessibilityLabel={`Elegir ${place.name}`} disabled={loading} onPress={() => void choose(place)} style={({ pressed }) => ({ padding: 14, gap: 3, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: pressed ? colors.soft : colors.surface })}>
              <Row><Icon name="map-pin" size={17} /><Txt weight="600" translate={false}>{place.name}</Txt></Row>
              {!!place.address && <Txt size={12} muted translate={false}>{place.address}</Txt>}
            </Pressable>)}
          </Card>}
          {googlePlacesEnabled() && query.trim().length >= 2 && !loading && !results.length && !error && <Txt muted>No encontramos gimnasios con esa búsqueda. Prueba con el nombre o una zona cercana.</Txt>}
          <Txt muted size={11} style={{ marginTop: "auto" }}>Resultados y datos de ubicación proporcionados por Google Maps.</Txt>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}
