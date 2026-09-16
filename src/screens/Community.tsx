import { useLanguage } from "../i18n";
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, Card, Field, Heading, Icon, Notice, Page, Pill, Row, Txt } from "../components/ui";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { useAccount } from "../state/Account";
import { AchievementPage, CoachingRelationship, CommunityAchievement, CommunityGym, CommunityUser, PublishedProgress } from "../services/community";
import { levelName } from "../data/options";
import { useTheme } from "../theme";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { Avatar, AvatarSelect } from "../components/Avatar";
import { exportProgress, exportRoutine } from "../logic/sharing";
import { SharedProgressView } from "../components/SharedProgressView";
import { CommunityPrivacyToggle } from "../components/CommunityPrivacyToggle";
import { RankingScope } from "../logic/leaderboard";
import { CommunityRanking } from "../components/CommunityRanking";
import { CommunityTabs } from "../components/CommunityTabs";
import { ComparisonCard } from "../components/ComparisonCard";
import { TrainerProfileCard } from "../components/TrainerProfileCard";
import { GoogleGymPicker } from "../components/GoogleGymPicker";
import { pointsTier } from "../logic/achievements";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Community() {
  const { user } = useCommunity();
  return <CommunityScreen key={user?.id ?? "guest"} />;
}

function CommunityScreen() {
  const { profile: requestedProfile } = useLocalSearchParams<{ profile?: string }>();
  const { t, locale } = useLanguage();
  const { state } = useStore();
  const { user: accountUser } = useAccount();
  const { user, token, ready, error: connectionError, authenticate, logout, deleteAccount, request, refresh } = useCommunity();
  const { colors } = useTheme();
  const [register, setRegister] = useState(false);
  const [handle, setHandle] = useState(state.profile.handle ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(state.profile.name ?? "");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(state.profile.avatar ?? "mountain");
  const [trainerEnabled, setTrainerEnabled] = useState(false);
  const [editing, setEditing] = useState(false);
  const [trainingPlace, setTrainingPlace] = useState("");
  const [gymMatches, setGymMatches] = useState<CommunityGym[]>([]);
  const [city, setCity] = useState("");
  const [settings, setSettings] = useState(false);
  const [rankingScope, setRankingScope] = useState<RankingScope>("friends");
  const [tab, setTab] = useState<"ranking" | "people" | "profile" | "all" | "following">("ranking");
  const [profileOrigin, setProfileOrigin] = useState<"ranking" | "people" | "all" | "following">("people");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommunityUser | null>(null);
  const [networkList, setNetworkList] = useState<"followers" | "following" | null>(null);
  const [networkPeople, setNetworkPeople] = useState<CommunityUser[]>([]);
  const [coaching, setCoaching] = useState<CoachingRelationship[]>([]);
  const [sharedProgress, setSharedProgress] = useState<PublishedProgress | null>(null);
  const [achievements, setAchievements] = useState<CommunityAchievement[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [caption, setCaption] = useState("");
  const [composer, setComposer] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmAccountDeletion, setConfirmAccountDeletion] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [reportProfile, setReportProfile] = useState(false);
  const [profileOptions, setProfileOptions] = useState(false);
  const generation = useRef(0);
  const owner = profileId ?? user?.id;
  const mine = owner === user?.id;
  const queryPath = `/achievements?${tab === "profile" ? `user=${owner}` : tab === "following" ? "following=1" : ""}`;
  const activePost = achievements.find(item => item.id === selected);

  useEffect(() => {
    const query = trainingPlace.trim();
    const timer = setTimeout(() => {
      if (!editing || query.length < 2) { setGymMatches([]); return; }
      void request<CommunityGym[]>(`/gyms?q=${encodeURIComponent(query)}&city=${encodeURIComponent(city.trim())}`)
        .then(setGymMatches).catch(() => setGymMatches([]));
    }, editing && query.length >= 2 ? 250 : 0);
    return () => clearTimeout(timer);
  }, [city, editing, request, trainingPlace]);

  useEffect(() => {
    const current = ++generation.current;
    if (!user || tab === "ranking" || tab === "people") return;
    Promise.resolve().then(() => {
      if (generation.current !== current) return null;
      setAchievements([]); setNext(null); setProfile(null); setSharedProgress(null);
      setLoading(true); setError("");
      return Promise.all([request<AchievementPage>(queryPath), request<CommunityUser>(`/profiles/${owner}`)]);
    })
      .then(result => { if (result && generation.current === current) { const [page, person] = result; setAchievements(page.achievements); setNext(page.next); setProfile(person); } })
      .catch(error => { if (generation.current === current) setError(error.message); })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current = current + 1; };
  }, [owner, queryPath, request, revision, user, tab]);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    request<CoachingRelationship[]>("/coaching").then(value => { if (alive) setCoaching(value); }).catch(() => { if (alive) setCoaching([]); });
    return () => { alive = false; };
  }, [request, revision, user]);
  useEffect(() => {
    if (!user || !coaching.some(item => item.status === "active" && item.role === "client" && item.statsConsent)) return;
    void request("/coaching/progress/me", "PUT", exportProgress(state, true, false)).catch(() => undefined);
  }, [coaching, request, state, user]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  };
  const openNetworkList = (relation: "followers" | "following") => run(async () => {
    if (!profile) return;
    setNetworkPeople(await request<CommunityUser[]>(`/profiles/${profile.id}/${relation}`));
    setNetworkList(relation);
  });
  const openProfile = (id: string) => { if (tab !== "profile") setProfileOrigin(tab); setProfile(null); setNetworkList(null); setNetworkPeople([]); setRevision(value => value + 1); setProfileId(id); setTab("profile"); setSettings(false); setEditing(false); setReportProfile(false); setProfileOptions(false); setSharedProgress(null); };
  useEffect(() => {
    if (!requestedProfile || requestedProfile === profileId) return;
    const timer = setTimeout(() => {
      setProfileOrigin(tab === "ranking" ? "ranking" : "following"); setProfile(null); setNetworkList(null); setNetworkPeople([]); setRevision(value => value + 1); setProfileId(requestedProfile); setTab("profile"); setSettings(false); setEditing(false); setReportProfile(false); setProfileOptions(false); setSharedProgress(null);
    }, 0);
    return () => clearTimeout(timer);
  }, [profileId, requestedProfile, tab]);
  const relationship = profile ? coaching.find(item => item.person.id === profile.id) : undefined;
  const refreshCoaching = async () => setCoaching(await request<CoachingRelationship[]>("/coaching"));
  const congratulate = (achievement: CommunityAchievement) => run(async () => {
    await request(`/achievements/${achievement.id}/like`, achievement.liked ? "DELETE" : "PUT");
    setAchievements(list => list.map(item => item.id === achievement.id ? { ...item, liked: !item.liked, likes: item.likes + (item.liked ? -1 : 1) } : item));
  });
  const updatePrivacy = (routinePublic: boolean, progressPublic: boolean, change: Partial<Pick<CommunityUser, "detailsPublic" | "bodyWeightPublic" | "rankingPublic" | "achievementsPublic" | "progressVisibility">> = {}) => run(async () => {
    const sharing = { detailsPublic: !!profile?.detailsPublic, bodyWeightPublic: !!profile?.bodyWeightPublic, rankingPublic: !!profile?.rankingPublic, achievementsPublic: !!profile?.achievementsPublic, ...change };
    if (routinePublic) await request("/routines/me", "PUT", exportRoutine(state.routine, state.preferences));
    if (progressPublic || sharing.rankingPublic) await request("/progress/me", "PUT", exportProgress(state, progressPublic && sharing.detailsPublic, progressPublic && sharing.bodyWeightPublic));
    setProfile(await request<CommunityUser>("/me/privacy", "PATCH", { routinePublic, progressPublic, progressVisibility: progressPublic ? change.progressVisibility ?? profile?.progressVisibility ?? "friends" : "private", ...sharing }));
    setSharedProgress(null);
    await refresh();
    setMessage("Privacidad de Comunidad actualizada.");
  });
  const loadSharedProgress = () => run(async () => {
    if (!profile) return;
    setSharedProgress(await request<PublishedProgress>(`/profiles/${profile.id}/progress`));
  });
  const postDetails = (post: CommunityAchievement) => <>
    <Button label={`@${post.handle}`} variant="ghost" compact onPress={() => openProfile(post.userId)} />
    <Txt weight="600">{post.type === "tier" ? `Nuevo tier · ${pointsTier({ base: 0, progress: 100, athlete: 200, advanced: 350, elite: 500, titan: 650, "greek-god": 800, olympian: 1000 }[post.tierId ?? "base"] ?? 0).name}` : `Nueva marca personal · ${post.exerciseName}`}</Txt>
    <Txt muted size={12}>{new Date(post.created).toLocaleString(locale)}</Txt>
    <Button label={post.liked ? `Quitar felicitación · ${post.likes}` : `Felicitar · ${post.likes}`} icon="heart" variant="secondary" disabled={busy} onPress={() => void congratulate(post)} />
  </>;

  return <Page>
    <Heading eyebrow="Comunidad" title="Crecer juntos" subtitle="Tu gente. Tus marcas. El próximo puesto." />
    {!!error && <Notice error>{error}</Notice>}
    {!!message && <Notice>{message}</Notice>}
    {!user ? <>
      <Card>
        <Txt weight="600" size={22} translate={false}>{state.profile.name || t("Tu perfil")}</Txt>
        {!!state.profile.handle && <Txt muted translate={false}>@{state.profile.handle}</Txt>}
        <Txt muted>Un perfil para tus avances, tus logros y las personas que te inspiran.</Txt>
        <Button label="Editar mi perfil" variant="ghost" compact onPress={() => router.replace("/profile")} />
      </Card>
      {!!connectionError && <Notice error>{connectionError}</Notice>}
      {accountUser ? <Card>
        <Txt weight="600">Tu cuenta Akhyles es tu cuenta de Comunidad</Txt>
        <Txt muted>Estamos preparando tu perfil social. No necesitas otra contraseña ni volver a registrarte.</Txt>
        {!!connectionError && <Button label="Reintentar conexión" onPress={() => void run(refresh)} />}
      </Card> : token ? <Button label="Reintentar conexión" onPress={() => void run(refresh)} /> : <Card>
        <GoogleSignIn />
        <Row style={{ flexWrap: "wrap" }}>
          <Button label="Iniciar sesión" compact variant={!register ? "primary" : "secondary"} onPress={() => { setRegister(false); setPassword(""); }} />
          <Button label="Crear cuenta" compact variant={register ? "primary" : "secondary"} onPress={() => { setRegister(true); setPassword(""); }} />
        </Row>
        {register && <Field label="Nombre público" value={name} onChangeText={setName} />}
        <Field label="Usuario de Comunidad" value={handle} onChangeText={setHandle} placeholder="tu_usuario" maxLength={24} />
        <Field label="Contraseña de Comunidad" value={password} onChangeText={setPassword} secure maxLength={128} placeholder="Mínimo 10 caracteres" />
        <Txt muted size={12}>Tu cuenta social tiene contraseña propia. Tu rutina e historial de entrenamiento siguen guardados en este dispositivo. Tú decides si compartes tus logros.</Txt>
        <Button label={busy ? "Conectando…" : register ? "Crear mi cuenta de Comunidad" : "Entrar en Comunidad"} disabled={busy || !ready} onPress={() => void run(async () => {
          await authenticate(register, { handle, password, name, level: state.profile.level });
          setPassword("");
        })} />
      </Card>}
    </> : <>
      {tab !== "profile" && <CommunityTabs value={tab === "all" ? "following" : tab} options={[
        { value: "ranking", label: "Ranking", icon: "award" },
        { value: "following", label: "Logros", icon: "star" },
      ]} onChange={value => { setError(""); setMessage(""); setTab(value); }} />}
      {tab === "ranking" && <CommunityRanking scope={rankingScope} onScopeChange={setRankingScope} openProfile={openProfile} findPeople={() => router.replace("/profile")} editLocation={() => router.replace("/profile")} />}
      {(tab === "all" || tab === "following") && <CommunityTabs value={tab} options={[{ value: "following", label: "Siguiendo" }, { value: "all", label: "Descubrir" }]} onChange={setTab} />}
      {(tab === "profile" || tab === "all" || tab === "following") && <>
      {tab === "profile" && !mine && <Button label={profileOrigin === "ranking" ? "Volver al ranking" : "Volver a logros"} icon="arrow-left" variant="ghost" compact onPress={() => setTab(profileOrigin === "ranking" ? "ranking" : "following")} />}
      {tab === "profile" && profile && <Card>
        <Row>
          <Avatar id={profile.avatar} />
          <View style={{ flex: 1, minWidth: 0 }}><Txt size={23} weight="600" numberOfLines={2} translate={false}>{profile.name}</Txt><Txt muted numberOfLines={1} translate={false}>@{profile.handle}</Txt></View>
        </Row>
        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Txt size={13}>{t(profile.posts === 1 ? "{count} logro" : "{count} logros", { count: profile.posts })}</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel={t(profile.followers === 1 ? "Ver {count} seguidor" : "Ver {count} seguidores", { count: profile.followers })} onPress={() => void openNetworkList("followers")}><Txt size={13} weight="600">{t(profile.followers === 1 ? "{count} seguidor" : "{count} seguidores", { count: profile.followers })}</Txt></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t(profile.following === 1 ? "Ver {count} seguido" : "Ver {count} seguidos", { count: profile.following })} onPress={() => void openNetworkList("following")}><Txt size={13} weight="600">{t("{value1} siguiendo", { value1: profile.following })}</Txt></Pressable>
        </Row>
        {networkList && <Card style={{ padding: 12 }}>
          <Row style={{ justifyContent: "space-between" }}><Txt weight="600" size={18}>{networkList === "followers" ? "Seguidores" : "Siguiendo"}</Txt><Button label="Cerrar" compact variant="ghost" onPress={() => setNetworkList(null)} /></Row>
          {networkPeople.length ? networkPeople.map(person => <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={t("Ver perfil de @{value1}", { value1: person.handle })} onPress={() => openProfile(person.id)} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, backgroundColor: pressed ? colors.soft : "transparent" })}>
            <Avatar id={person.avatar} size={42} /><View style={{ flex: 1, minWidth: 0 }}><Txt weight="600" numberOfLines={1} translate={false}>{person.name}</Txt><Txt muted size={12} translate={false}>@{person.handle}</Txt></View><Icon name="chevron-right" size={18} />
          </Pressable>) : <Txt muted>Aún no hay personas en esta lista.</Txt>}
        </Card>}
        <Pill>{levelName(profile.level)}</Pill>
        {!!profile.bio && <Txt translate={false}>{profile.bio}</Txt>}
        {!!profile.trainingPlace && <Txt muted>{t("Entrena en {value1}", { value1: profile.trainingPlace })}</Txt>}
        {!!profile.city && <Txt muted translate={false}>{profile.city}</Txt>}
        {profile.trainerEnabled && <Pill>Entrenador</Pill>}
        {profile.trainerEnabled && <TrainerProfileCard profileId={profile.id} mine={mine} />}
        {mine ? <Button label="Editar perfil social" compact variant="secondary" onPress={() => { setName(profile.name); setBio(profile.bio); setAvatar(profile.avatar ?? "mountain"); setTrainingPlace(profile.trainingPlace ?? ""); setCity(profile.city ?? ""); setTrainerEnabled(!!profile.trainerEnabled); setEditing(!editing); }} /> :
          <Button label={profile.followed ? "Dejar de seguir" : profile.followsYou ? "Devolver seguimiento" : "Seguir"} disabled={busy} onPress={() => void run(async () => {
            setProfile(await request<CommunityUser>(`/follow/${profile.id}`, profile.followed ? "DELETE" : "PUT"));
            setSharedProgress(null);
          })} />}
        {editing && mine && <>
          <Field label="Nombre público" value={name} onChangeText={setName} />
          <Field label="Biografía" value={bio} onChangeText={setBio} maxLength={300} />
          <Field label="Gimnasio" value={trainingPlace} onChangeText={setTrainingPlace} placeholder="Busca tu gimnasio" maxLength={80} />
          <GoogleGymPicker value={trainingPlace} language={locale.startsWith("en") ? "en" : "es"} onPick={gym => { setTrainingPlace(gym.name); setCity(gym.city); setGymMatches([]); setMessage(gym.address ? `Gimnasio seleccionado: ${gym.address}` : "Gimnasio seleccionado desde Google Maps."); }} />
          {!!gymMatches.length && <Card style={{ padding: 0, gap: 0 }}>
            {gymMatches.map(gym => <Pressable key={gym.id} accessibilityRole="button" accessibilityLabel={t("Elegir {name}", { name: `${gym.name}${gym.city ? `, ${gym.city}` : ""}` })} onPress={() => { setTrainingPlace(gym.name); if (!city && gym.city) setCity(gym.city); setGymMatches([]); }} style={({ pressed }) => ({ padding: 12, backgroundColor: pressed ? colors.soft : colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border })}>
              <Txt weight="600" translate={false}>{gym.name}</Txt>{!!gym.city && <Txt muted size={12} translate={false}>{gym.city}{gym.address ? ` · ${gym.address}` : ""}</Txt>}
            </Pressable>)}
          </Card>}
          <Field label="Ciudad" value={city} onChangeText={setCity} placeholder="Ej. Madrid" maxLength={80} />
          <Txt muted size={12}>Busca y elige tu gimnasio. Si no existe, al guardarlo lo añadiremos una sola vez para que el resto pueda encontrarlo.</Txt>
          <AvatarSelect value={avatar} onChange={setAvatar} />
          <CommunityPrivacyToggle label="Ofrezco entrenamiento" description="Las personas podrán solicitar una colaboración contigo" value={trainerEnabled} disabled={busy} onChange={() => setTrainerEnabled(value => !value)} />
          <Txt muted size={12}>{t("Nivel actual del entrenamiento: {value1}.", { value1: t(levelName(state.profile.level)) })}</Txt>
          <Button label="Guardar perfil social" disabled={busy} onPress={() => void run(async () => {
            const gym = trainingPlace.trim() ? await request<CommunityGym>("/gyms", "POST", { name: trainingPlace.trim(), city: city.trim() }) : null;
            setProfile(await request<CommunityUser>("/me", "PATCH", { name, bio, avatar, level: state.profile.level, trainingPlace: gym?.name ?? "", gymId: gym?.id ?? null, city: gym?.city || city.trim(), trainerEnabled }));
            setEditing(false); await refresh();
          })} />
          <Button label="Cancelar edición" compact variant="ghost" disabled={busy} onPress={() => setEditing(false)} />
        </>}
        {!mine && <>
          {!relationship && (profile.trainerEnabled || user?.trainerEnabled) && <Button label={profile.trainerEnabled ? "Solicitar colaboración" : "Invitar a colaborar"} icon="user-plus" disabled={busy} onPress={() => void run(async () => {
            await request("/coaching/requests", "POST", { targetId: profile.id }); await refreshCoaching(); setMessage("Solicitud de colaboración enviada.");
          })} />}
          {relationship?.status === "pending" && relationship.requestedByMe && <Notice>Solicitud de colaboración pendiente.</Notice>}
          {relationship?.status === "active" && relationship.role === "client" && <CommunityPrivacyToggle label="Contribuir a estadísticas agregadas" description="Tu entrenador solo verá resultados globales; nunca tu historial individual en su perfil." value={!!relationship.statsConsent} disabled={busy} onChange={() => void run(async () => { await request(`/coaching/${relationship.id}/stats-consent`, "PUT", { enabled: !relationship.statsConsent }); await refreshCoaching(); if (!relationship.statsConsent) await request("/coaching/progress/me", "PUT", exportProgress(state, true, false)); })} />}
          {relationship?.status === "pending" && !relationship.requestedByMe && <Card style={{ padding: 12 }}><Txt weight="600">Solicitud de colaboración</Txt><Txt muted>Al aceptarla, la otra persona podrá gestionar la rutina con el permiso que estás concediendo.</Txt><Button label="Aceptar colaboración" disabled={busy} onPress={() => void run(async () => { await request(`/coaching/${relationship.id}`, "PATCH", { action: "accept" }); await refreshCoaching(); setRevision(value => value + 1); })} /><Button label="Rechazar" compact variant="ghost" disabled={busy} onPress={() => void run(async () => { await request(`/coaching/${relationship.id}`, "PATCH", { action: "decline" }); await refreshCoaching(); })} /></Card>}
          {relationship?.status === "active" && <Card style={{ padding: 12 }}><Txt weight="600">Colaboración activa</Txt><Txt muted>{relationship.role === "trainer" ? "Puedes revisar y modificar la rutina de esta persona." : "Esta persona puede revisar y modificar tu rutina."}</Txt>{relationship.role === "trainer" ? <Button label="Gestionar su rutina" compact variant="secondary" onPress={() => router.push({ pathname: "/coach-routine", params: { relationship: relationship.id } })} /> : <><Button label="Sincronizar mi rutina con el entrenador" compact variant="secondary" disabled={busy} onPress={() => void run(async () => { await request("/coaching/routine/me", "PUT", exportRoutine(state.routine, state.preferences)); setMessage("Tu rutina está lista para que el entrenador la revise."); })} /><Button label="Revisar rutina gestionada" compact variant="secondary" onPress={() => router.push({ pathname: "/coach-routine", params: { relationship: relationship.id, mode: "client" } })} /></>}<Button label="Revocar colaboración" compact variant="ghost" disabled={busy} onPress={() => void run(async () => { await request(`/coaching/${relationship.id}`, "PATCH", { action: "revoke" }); await refreshCoaching(); setRevision(value => value + 1); setMessage("Colaboración revocada."); })} /></Card>}
          <Txt muted size={12}>{profile.connected ? "Amigos · seguimiento mutuo" : profile.followsYou ? "Te sigue · devuelve el seguimiento para conectar" : "Seguid ambos perfiles para compartir el progreso permitido"}</Txt>
          <Button label={profileOptions ? "Cerrar opciones" : "Más opciones"} icon="more-horizontal" compact variant="ghost" onPress={() => setProfileOptions(value => !value)} />
          {profileOptions && <Card style={{ padding: 12 }}><Button label="Bloquear usuario" compact variant="ghost" disabled={busy} onPress={() => void run(async () => {
            await request(`/blocks/${profile.id}`, "PUT"); setProfile(null); openProfile(user.id); setRevision(value => value + 1); setMessage("Usuario bloqueado. Puedes desbloquearlo desde Bloqueados.");
          })} />
          <Button label="Denunciar perfil" compact variant="ghost" onPress={() => setReportProfile(value => !value)} />
          {reportProfile && <>
            <Field label="Motivo de la denuncia del perfil" value={reason} onChangeText={setReason} maxLength={300} />
            <Button label="Enviar denuncia del perfil" disabled={busy || !reason.trim()} onPress={() => void run(async () => {
              await request("/profile-reports", "POST", { userId: profile.id, reason }); setReason(""); setReportProfile(false); setMessage("Denuncia registrada.");
            })} />
          </>}
          </Card>}
        </>}
        {!!profile.routineId && <Button
          label={mine ? "Ver mi rutina compartida" : t("Ver rutina de @{value1}", { value1: profile.handle })}
          icon="copy"
          compact
          variant="secondary"
          onPress={() => router.push({ pathname: "/shared-routine", params: { id: profile.routineId! } })}
        />}
        {!!profile.progressVisible && (!mine || !!profile.progressPublic) && <Button
          label={sharedProgress ? "Ocultar progreso" : mine ? "Ver mi progreso compartido" : t("Ver progreso de @{value1}", { value1: profile.handle })}
          icon="trending-up"
          compact
          variant="secondary"
          onPress={() => sharedProgress ? setSharedProgress(null) : void loadSharedProgress()}
        />}
        {sharedProgress && <SharedProgressView key={profile.id} progress={sharedProgress} routineId={profile.routineId} />}
        {mine && <Button label={settings ? "Cerrar privacidad y cuenta" : "Privacidad y cuenta"} icon="settings" compact variant="ghost" onPress={() => setSettings(value => !value)} />}
        {mine && settings && <Card style={{ padding: 14 }}>
          <Txt weight="600">Tú decides qué compartes</Txt>
          <CommunityPrivacyToggle label="Rutina" description="Visible solo para amigos mutuos" value={!!profile.routinePublic} disabled={busy} onChange={() => void updatePrivacy(!profile.routinePublic, !!profile.progressPublic)} />
          <CommunityPrivacyToggle label="Resumen de progreso" description="Comparte tus gráficas y marcas según la visibilidad elegida abajo" value={!!profile.progressPublic} disabled={busy} onChange={() => void updatePrivacy(!!profile.routinePublic, !profile.progressPublic)} />
          {!!profile.progressPublic && <><Txt weight="600" size={14}>Quién puede ver tu progreso</Txt><CommunityTabs value={profile.progressVisibility ?? "friends"} options={[{ value: "private", label: "Privado" }, { value: "friends", label: "Amigos" }, { value: "public", label: "Público" }]} onChange={value => void updatePrivacy(!!profile.routinePublic, true, { progressVisibility: value as "private" | "friends" | "public" })} /></>}
          <CommunityPrivacyToggle label="Entrenamientos y gráficas" description="Fechas, ejercicios, series y cargas de hasta 180 sesiones" value={!!profile.progressPublic && !!profile.detailsPublic} disabled={busy} onChange={() => void updatePrivacy(!!profile.routinePublic, true, { detailsPublic: !(profile.progressPublic && profile.detailsPublic) })} />
          <CommunityPrivacyToggle label="Peso corporal" description="Solo para amigos; no es necesario para participar en el ranking" value={!!profile.progressPublic && !!profile.bodyWeightPublic} disabled={busy} onChange={() => void updatePrivacy(!!profile.routinePublic, true, { bodyWeightPublic: !(profile.progressPublic && profile.bodyWeightPublic) })} />
          <CommunityPrivacyToggle label="Participar en rankings" description="Perfil, A-Points y cobertura visibles para la comunidad" value={!!profile.rankingPublic} disabled={busy} onChange={() => void updatePrivacy(!!profile.routinePublic, !!profile.progressPublic, { rankingPublic: !profile.rankingPublic })} />
          <CommunityPrivacyToggle label="Compartir logros" description="Publica tus nuevos tiers y marcas personales en Logros" value={!!profile.achievementsPublic} disabled={busy} onChange={() => void updatePrivacy(!!profile.routinePublic, !!profile.progressPublic, { achievementsPublic: !profile.achievementsPublic })} />
        </Card>}
        {mine && settings && <ComparisonCard />}

      </Card>}
      {false && <Button label="Nueva publicación" icon="plus" onPress={() => { setComposer(true); setError(""); }} />}
      {false && composer && <Card>
        <Txt weight="600" size={20}>Comparte tu entrenamiento</Txt>
        <Field label="Texto de la publicación" value={caption} onChangeText={setCaption} maxLength={1000} placeholder="Un pequeño avance también cuenta…" />
        <Txt muted size={12}>{t("Se publicará como @{value1}. El texto será público.", { value1: user?.handle ?? "" })}</Txt>
        <Button label={busy ? "Publicando…" : "Publicar"} disabled={busy || !caption.trim()} onPress={() => void run(async () => {
          await request("/posts", "POST", { caption });
          setCaption(""); setComposer(false); if (user) openProfile(user.id); setRevision(r => r + 1); setMessage("Publicación creada.");
        })} />
        <Button label="Cancelar publicación" disabled={busy} compact variant="ghost" onPress={() => { setComposer(false); setCaption(""); }} />
      </Card>}
      {!sharedProgress && <><Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Txt weight="600" size={18}>{tab === "profile" ? "Logros" : tab === "all" ? "Logros de la comunidad" : "Logros de tu gente"}</Txt><Button label="Actualizar logros" compact variant="ghost" disabled={loading} onPress={() => setRevision(r => r + 1)} /></Row>
      {loading ? <Txt muted>Cargando logros…</Txt> : achievements.length === 0 ? <Card><Icon name="award" size={28} /><Txt weight="600">Todavía no hay logros aquí</Txt><Txt muted>{tab === "following" ? "Sigue a personas para celebrar sus avances." : "Los ascensos de tier y las marcas personales aparecerán aquí."}</Txt></Card> : achievements.map(achievement => <Card key={achievement.id}>{postDetails(achievement)}</Card>)}
      {next !== null && <Button label="Cargar más logros" disabled={busy} variant="secondary" onPress={() => void run(async () => {
        const version = generation.current;
        const page = await request<AchievementPage>(`${queryPath}&offset=${next}`);
        if (version === generation.current) { setAchievements(previous => [...previous, ...page.achievements.filter(item => !previous.some(old => old.id === item.id))]); setNext(page.next); }
      })} />}</>}
      {tab === "profile" && mine && settings && <>
      <Button label="Cerrar sesión de Comunidad" compact variant="ghost" disabled={busy} onPress={() => void run(logout)} />
      <Button label="Eliminar cuenta de Comunidad" compact variant="ghost" disabled={busy} onPress={() => setConfirmAccountDeletion(true)} />
      {confirmAccountDeletion && <Card>
        <Txt weight="600">¿Eliminar tu cuenta de Comunidad?</Txt>
        <Txt muted>Se borrarán tu perfil social, logros, seguidores, reacciones, datos compartidos y sesión. Tu rutina e historial locales no se borran.</Txt>
        <Button label="Eliminar mi cuenta definitivamente" disabled={busy} onPress={() => void run(async () => { await deleteAccount(); })} />
        <Button label="Conservar mi cuenta" compact variant="ghost" disabled={busy} onPress={() => setConfirmAccountDeletion(false)} />
      </Card>}
      </>}
      </>}
    </>}
    <Modal visible={false} animationType="slide" onRequestClose={() => setSelected(null)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
        <Button label="Cerrar publicación" variant="ghost" onPress={() => setSelected(null)} />
      <Page>
        {activePost && <Card>
          {postDetails(activePost)}
          {activePost.userId === user?.id ? <>
            <Button label="Eliminar publicación" compact variant="ghost" onPress={() => setConfirmDelete(true)} />
            {confirmDelete && <>
              <Notice>Se eliminará la publicación y sus me gusta del servidor.</Notice>
              <Button label="Confirmar eliminación" disabled={busy} onPress={() => void run(async () => {
                await request(`/posts/${activePost.id}`, "DELETE"); setSelected(null); setRevision(r => r + 1);
              })} />
              <Button label="Conservar publicación" compact variant="ghost" onPress={() => setConfirmDelete(false)} />
            </>}
          </> : <>
            <Button label="Denunciar y ocultar" variant="ghost" compact onPress={() => setReporting(true)} />
            {reporting && <>
              <Field label="Motivo de la denuncia" value={reason} onChangeText={setReason} maxLength={300} />
              <Button label="Enviar denuncia" disabled={busy || !reason.trim()} onPress={() => void run(async () => {
                await request("/reports", "POST", { postId: activePost.id, reason }); setSelected(null); setReason(""); setRevision(r => r + 1); setMessage("Denuncia registrada. Hemos ocultado la publicación para ti.");
              })} />
            </>}
          </>}
          {!!error && <Notice error>{error}</Notice>}
        </Card>}
      </Page>
      </SafeAreaView>
    </Modal>
  </Page>;
}
