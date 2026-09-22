import { useEffect, useState } from "react";
import { useCommunity } from "../state/Community";
import { TrainerProfile, TrainerPublicStats } from "../services/community";
import { Button, Card, Field, Notice, Row, Txt } from "./ui";

const blank: TrainerProfile = { public: false, specialties: [], modalities: [], experienceYears: 0, credentials: "", availability: "", pricing: "", statsPublic: false };

export function TrainerProfileCard({ profileId, mine }: { profileId: string; mine: boolean }) {
  const { request } = useCommunity();
  const [profile, setProfile] = useState<TrainerProfile>(blank);
  const [publicStats, setPublicStats] = useState<TrainerPublicStats | null>(null);
  const [editing, setEditing] = useState(false);
  const [specialties, setSpecialties] = useState("");
  const [modalities, setModalities] = useState("");
  const [error, setError] = useState("");
  const load = () => { void Promise.all([request<TrainerProfile>(`/profiles/${profileId}/trainer`), request<TrainerPublicStats>(`/profiles/${profileId}/trainer-stats`).catch(() => null)]).then(([next, stats]) => { setProfile(next); setPublicStats(stats); setSpecialties(next.specialties.join(", ")); setModalities(next.modalities.join(", ")); }).catch(reason => { if (mine) setProfile(blank); else setError(reason.message); }); };
  useEffect(load, [profileId]);
  const save = () => void request<TrainerProfile>("/me/trainer-profile", "PUT", { ...profile, specialties: specialties.split(",").map(value => value.trim()).filter(Boolean), modalities: modalities.split(",").map(value => value.trim()).filter(Boolean) }).then(value => { setProfile(value); setEditing(false); }).catch(reason => setError(reason.message));
  if (!mine && !profile.updated) return null;
  return <Card>
    <Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={19}>Perfil profesional</Txt><Txt style={{ color: "#1B7A42" }} weight="600">Entrenador</Txt></Row>
    {editing ? <>
      <Field label="Especialidades (separadas por comas)" value={specialties} onChangeText={setSpecialties} maxLength={320} />
      <Field label="Modalidades" value={modalities} onChangeText={setModalities} maxLength={120} />
      <Field label="Años de experiencia" value={String(profile.experienceYears)} onChangeText={value => setProfile(current => ({ ...current, experienceYears: Number(value) || 0 }))} numeric />
      <Field label="Credenciales" value={profile.credentials} onChangeText={value => setProfile(current => ({ ...current, credentials: value }))} multiline maxLength={500} />
      <Field label="Disponibilidad" value={profile.availability} onChangeText={value => setProfile(current => ({ ...current, availability: value }))} maxLength={160} />
      <Field label="Tarifas o contacto" value={profile.pricing} onChangeText={value => setProfile(current => ({ ...current, pricing: value }))} maxLength={160} />
      <Row><Button label={profile.public ? "Perfil público" : "Perfil privado"} compact variant={profile.public ? "primary" : "secondary"} onPress={() => setProfile(current => ({ ...current, public: !current.public }))} /><Button label={profile.statsPublic ? "Estadísticas públicas" : "Estadísticas privadas"} compact variant={profile.statsPublic ? "primary" : "secondary"} onPress={() => setProfile(current => ({ ...current, statsPublic: !current.statsPublic }))} /></Row>
      <Button label="Guardar perfil profesional" onPress={save} />
    </> : <>
      <Txt>{profile.specialties.join(" · ") || "Especialidades por definir"}</Txt><Txt muted>{profile.modalities.join(" · ")}</Txt><Txt muted>{profile.experienceYears ? `${profile.experienceYears} años de experiencia` : "Experiencia no indicada"}</Txt>{!!profile.credentials && <Txt translate={false}>{profile.credentials}</Txt>}{!!profile.availability && <Txt muted translate={false}>{profile.availability}</Txt>}{!!profile.pricing && <Txt muted translate={false}>{profile.pricing}</Txt>}
      {publicStats && <Card style={{ padding: 12 }}><Txt weight="600">Resultados agregados en Akhyles</Txt>{publicStats.sampleSufficient ? <><Txt>{publicStats.adherenceMedian ?? "—"}% de adherencia mediana · {publicStats.eligibleClients} deportistas elegibles</Txt><Txt muted size={12}>{publicStats.strengthMedian === undefined || publicStats.strengthMedian === null ? "Mejora de fuerza aún sin datos comparables." : `${publicStats.strengthMedian >= 0 ? "+" : ""}${publicStats.strengthMedian}% de mejora mediana en 12 semanas.`}</Txt></> : <Txt muted>Necesita al menos 5 deportistas elegibles que hayan autorizado resultados agregados.</Txt>}<Txt muted size={11}>{publicStats.methodology}</Txt></Card>}
      {mine && <Button label="Editar perfil profesional" compact variant="secondary" onPress={() => setEditing(true)} />}
    </>}
    {!!error && <Notice error>{error}</Notice>}
  </Card>;
}
