import { useEffect, useState } from "react";
import { Modal, Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import { messages } from "../content/es";
import { useLanguage } from "../i18n";
import { Avatar, AvatarPhotoPicker } from "../components/Avatar";
import { AccountCard } from "../components/AccountCard";
import { CommunityPeople } from "../components/CommunityPeople";
import { CommunityPrivacyToggle } from "../components/CommunityPrivacyToggle";
import { TrainingSharingSelect } from "../components/TrainingSharingSelect";
import { ExerciseTiers } from "../components/ExerciseTiers";
import { ProfileFields } from "../components/ProfileFields";
import { TrainingPreferences } from "../components/TrainingPreferences";
import { StrengthReferences } from "../components/StrengthReferences";
import { DaysSelect, LevelSelect, PrioritySelect } from "../components/Selections";
import { Button, Card, Choice, Field, Heading, Icon, Notice, Page, Row, Txt } from "../components/ui";
import { variants } from "../data/options";
import { nextPointsTier, pointsTier, presentationPoints } from "../logic/achievements";
import { scoreProgress } from "../logic/progress";
import { exerciseMasteries } from "../logic/exerciseMastery";
import { personalAchievements } from "../logic/personalAchievements";
import { displayName, generateRoutine } from "../logic/routine";
import { exportProgress, exportRoutine } from "../logic/sharing";
import { localDateKey } from "../logic/schedule";
import { number, profileErrors } from "../logic/validation";
import { AchievementPage, CommunityUser, TrainingVisibility } from "../services/community";
import { useCommunity } from "../state/Community";
import { useStore } from "../state/Store";
import { Profile as ProfileType, StrengthReference } from "../types";
import { useTheme } from "../theme";

type EditSection = "training" | "community" | "app";
type CommunityNotification = { id: string; type: string; created: number; read_at: number | null; actorId: string; handle: string; name: string; avatar?: string };
type CommunityNotificationPreferences = { achievementLikes: boolean };

export default function Profile() {
  const { t, locale } = useLanguage();
  const { colors } = useTheme();
  const { state, update } = useStore();
  const { user, request, refresh } = useCommunity();
  const [editing, setEditing] = useState(false);
  const [section, setSection] = useState<EditSection | null>(null);
  const [profile, setProfile] = useState(state.profile);
  const [prefs, setPrefs] = useState(state.preferences);
  const [strengthReferences, setStrengthReferences] = useState<StrengthReference[]>(state.strengthReferences ?? []);
  const [confirmTrainerDisable, setConfirmTrainerDisable] = useState(false);
  const [communityProfile, setCommunityProfile] = useState<CommunityUser | null>(user);
  const [communityDraft, setCommunityDraft] = useState<CommunityUser | null>(user);
  const [achievementCount, setAchievementCount] = useState(0);
  const [notifications, setNotifications] = useState<CommunityNotification[]>([]);
  const [achievementLikesEnabled, setAchievementLikesEnabled] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [connections, setConnections] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const score = scoreProgress(state);
  const masteries = exerciseMasteries(state);
  const localAchievements = personalAchievements(state);
  const points = score.points.at(-1)?.value;
  const visiblePoints = presentationPoints(points);
  const nextTier = nextPointsTier(points);
  const social = communityProfile ?? user;

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void Promise.all([
      request<CommunityUser>("/me"),
      request<AchievementPage>(`/achievements?user=${user.id}`),
      request<CommunityNotification[]>("/notifications"),
      request<CommunityNotificationPreferences>("/me/notification-preferences"),
    ]).then(([person, page, notices, notificationPreferences]) => {
      if (!alive) return;
      setCommunityProfile(person); setCommunityDraft(person); setAchievementCount(page.achievements.length); setNotifications(notices); setAchievementLikesEnabled(notificationPreferences.achievementLikes);
    }).catch(() => { if (alive) setCommunityProfile(user); });
    return () => { alive = false; };
  }, [request, user]);

  const change = (patch: Partial<ProfileType>) => { setProfile(value => ({ ...value, ...patch })); setErrors({}); };
  const changeAvatar = (avatar: string) => {
    update(value => ({ ...value, profile: { ...value.profile, avatar } }));
    setProfile(value => ({ ...value, avatar }));
    if (communityDraft) setCommunityDraft(value => value ? { ...value, avatar } : value);
  };
  const openEditor = () => {
    setProfile(state.profile); setPrefs(state.preferences); setStrengthReferences(state.strengthReferences ?? []); setCommunityDraft(communityProfile ?? user); setConfirmTrainerDisable(false); setErrors({}); setMessage(""); setSection(null); setEditing(true);
  };
  const save = async () => {
    const found = profileErrors(profile);
    if (Object.keys(found).length) { setErrors(found); setSection("training"); return; }
    if (!prefs.equipment.length) { setSection("training"); setMessage(messages.Profile.seleccionaAlMenosUnTipoDeEquipamiento); return; }
    if (strengthReferences.some(item => !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 1000 || !Number.isInteger(item.reps) || item.reps < 1 || item.reps > 10)) { setSection("training"); setMessage("Revisa el peso y las repeticiones de las referencias de fuerza."); return; }
    const planChanged = ["sex", "level", "days", "priority", "includeGlutes"].some(key => profile[key as keyof ProfileType] !== state.profile[key as keyof ProfileType])
      || JSON.stringify(profile.trainingDays) !== JSON.stringify(state.profile.trainingDays)
      || JSON.stringify(prefs) !== JSON.stringify(state.preferences);
    setBusy(true); setMessage("");
    try {
      update(value => ({
        ...value, profile, preferences: prefs, strengthReferences, programRevision: planChanged ? 6 : value.programRevision,
        bodyWeights: number(value.profile.weight) === number(profile.weight) && value.bodyWeights?.length ? value.bodyWeights : [...(value.bodyWeights ?? []), { date: new Date().toISOString(), weight: number(profile.weight) }],
        routine: planChanged ? generateRoutine(profile, prefs, value.volumeTargets) : value.routine,
        plannedWorkouts: planChanged ? (value.plannedWorkouts ?? []).filter(item => new Date(item.date) < new Date(new Date().setHours(0, 0, 0, 0))) : value.plannedWorkouts,
        skippedWorkoutDates: planChanged ? (value.skippedWorkoutDates ?? []).filter(date => date < localDateKey(new Date())) : value.skippedWorkoutDates,
      }));
      if (communityDraft) {
        const next = await request<CommunityUser>("/me", "PATCH", {
          name: profile.name, avatar: profile.avatar, level: profile.level, bio: communityDraft.bio,
          trainingPlace: communityDraft.trainingPlace ?? "", gymId: communityDraft.gymId ?? null,
          city: communityDraft.city ?? "", trainerEnabled: !!communityDraft.trainerEnabled,
        });
        const visibility = communityDraft.trainingVisibility ?? communityDraft.progressVisibility ?? "private";
        if (visibility !== "private" || communityDraft.rankingPublic) await request("/progress/me", "PUT", exportProgress({ ...state, profile, preferences: prefs, strengthReferences }, visibility !== "private", visibility !== "private"));
        setCommunityProfile(next); setCommunityDraft(next); await refresh();
      }
      setEditing(false); setMessage(planChanged ? "Perfil actualizado y rutina regenerada." : "Perfil actualizado.");
    } catch (reason) { setMessage((reason as Error).message); }
    finally { setBusy(false); }
  };
  const updatePrivacy = async (change: Partial<Pick<CommunityUser, "rankingPublic">>) => {
    if (!communityDraft || busy) return;
    setBusy(true); setMessage("");
    try {
      const next = { ...communityDraft, ...change };
      const visibility = next.trainingVisibility ?? next.progressVisibility ?? "private";
      if (visibility !== "private") await request("/routines/me", "PUT", exportRoutine(state.routine, state.preferences));
      if (visibility !== "private" || next.rankingPublic) await request("/progress/me", "PUT", exportProgress(state, visibility !== "private", visibility !== "private"));
      const saved = await request<CommunityUser>("/me/privacy", "PATCH", {
        trainingVisibility: visibility, rankingPublic: !!next.rankingPublic,
      });
      setCommunityDraft(saved); setCommunityProfile(saved); await refresh();
    } catch (reason) { setMessage((reason as Error).message); }
    finally { setBusy(false); }
  };
  const updateTrainingVisibility = async (visibility: TrainingVisibility) => {
    if (!communityDraft || busy) return;
    setBusy(true); setMessage("");
    try {
      const saved = await request<CommunityUser>("/me/privacy", "PATCH", { trainingVisibility: visibility });
      if (visibility !== "private") {
        await request("/routines/me", "PUT", exportRoutine(state.routine, state.preferences));
        await request("/progress/me", "PUT", exportProgress(state, true, true));
      }
      setCommunityDraft(saved); setCommunityProfile(saved); await refresh();
    } catch (reason) { setMessage((reason as Error).message); }
    finally { setBusy(false); }
  };
  const unread = notifications.filter(item => !item.read_at);
  const openNotifications = () => {
    setNotificationsOpen(true);
    if (user && unread.length) void request("/notifications/read", "PATCH").then(() => setNotifications(value => value.map(item => ({ ...item, read_at: item.read_at ?? Date.now() }))));
  };
  const setAchievementNotifications = (achievementLikes: boolean) => {
    if (!user || busy) return;
    setAchievementLikesEnabled(achievementLikes);
    setBusy(true);
    void request<CommunityNotificationPreferences>("/me/notification-preferences", "PATCH", { achievementLikes })
      .then(preferences => setAchievementLikesEnabled(preferences.achievementLikes))
      .catch(() => setAchievementLikesEnabled(value => !value))
      .finally(() => setBusy(false));
  };

  if (editing) return <Page>
    <Button label="Volver al perfil" icon="arrow-left" compact variant="ghost" onPress={() => { setEditing(false); setErrors({}); setMessage(""); }} />
    <Heading eyebrow="Editar perfil" title="Todo en su sitio" subtitle="Actualiza tus datos y guarda cuando termines." />
    <Card style={{ gap: 14 }}>
      <Row style={{ alignItems: "center", gap: 12 }}><AvatarPhotoPicker onChange={avatar => change({ avatar })}><Avatar id={profile.avatar} size={60} /></AvatarPhotoPicker><Txt muted size={13}>Toca tu foto para cambiarla.</Txt></Row>
      <Field label="Nombre" value={profile.name ?? ""} onChangeText={name => change({ name })} error={errors.name} />
      <Field label="Nombre de usuario (@)" value={profile.handle ?? ""} onChangeText={handle => change({ handle: handle.replace(/^@/, "") })} error={errors.handle} />
    </Card>
    <View style={{ gap: 8 }}>
      {([
        ["training", "Entrenamiento", "activity"], ["community", "Comunidad", "users"], ["app", "App y cuenta", "settings"],
      ] as const).map(([id, label, icon]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ expanded: section === id }} onPress={() => setSection(value => value === id ? null : id)} style={({ pressed }) => ({ minHeight: 62, paddingHorizontal: 16, borderRadius: 15, borderWidth: 1, borderColor: section === id ? colors.selectionHighlight : colors.border, backgroundColor: section === id ? colors.selection : colors.surface, flexDirection: "row", alignItems: "center", gap: 12, opacity: pressed ? 0.75 : 1 })}>
        <Icon name={icon} /><Txt weight="600" style={{ flex: 1 }}>{label}</Txt><Icon name={section === id ? "chevron-up" : "chevron-down"} size={18} />
      </Pressable>)}
    </View>
    {section === "training" && <Card>
      <Txt weight="600" size={20}>Opciones de entrenamiento</Txt>
      <ProfileFields profile={profile} change={change} errors={errors} showIdentity={false} />
      <Txt weight="600">Nivel</Txt><LevelSelect profile={profile} change={change} />
      <Txt weight="600">Disponibilidad</Txt><DaysSelect profile={profile} change={change} />
      {!!errors.trainingDays && <Notice error>{errors.trainingDays}</Notice>}
      <Txt weight="600">Músculo prioritario</Txt><PrioritySelect profile={profile} change={change} dropdown />
      <TrainingPreferences profile={profile} change={change} />
      <Txt weight="600">Equipamiento de tu gimnasio</Txt>
      {variants.map(variant => <Choice multiple key={variant.id} title={variant.name} selected={prefs.equipment.includes(variant.id)} onPress={() => setPrefs(value => ({ ...value, equipment: value.equipment.includes(variant.id) ? value.equipment.filter(id => id !== variant.id) : [...value.equipment, variant.id] }))} />)}
      <StrengthReferences value={strengthReferences} bodyWeight={number(profile.weight)} sex={profile.sex} onChange={setStrengthReferences} />
      {!!prefs.unavailable.length && <><Txt weight="600">Ejercicios descartados</Txt>{prefs.unavailable.map(id => <View key={id} style={{ gap: 5 }}><Txt size={13} translate={false}>{displayName(id, prefs)}</Txt><Button label={t("Volver a permitir {name}", { name: displayName(id, prefs) })} compact variant="secondary" onPress={() => setPrefs(value => ({ ...value, unavailable: value.unavailable.filter(item => item !== id) }))} /></View>)}</>}
    </Card>}
    {section === "community" && <Card>
      <Txt weight="600" size={20}>Opciones de comunidad</Txt>
      {communityDraft ? <>
        <Field label="Biografía" value={communityDraft.bio} onChangeText={bio => setCommunityDraft(value => value ? { ...value, bio } : value)} maxLength={300} multiline />
        <Field label="Gimnasio" value={communityDraft.trainingPlace ?? ""} onChangeText={trainingPlace => setCommunityDraft(value => value ? { ...value, trainingPlace } : value)} maxLength={80} />
        <Field label="Ciudad" value={communityDraft.city ?? ""} onChangeText={city => setCommunityDraft(value => value ? { ...value, city } : value)} maxLength={80} />
        <TrainingSharingSelect value={communityDraft.trainingVisibility ?? communityDraft.progressVisibility ?? "private"} disabled={busy} onChange={value => void updateTrainingVisibility(value)} />
        <CommunityPrivacyToggle label="Participar en rankings" description="Muestra A-Points y cobertura de grupos" value={!!communityDraft.rankingPublic} disabled={busy} onChange={() => void updatePrivacy({ rankingPublic: !communityDraft.rankingPublic })} />
        <CommunityPrivacyToggle label="Ofrezco entrenamiento" description="Las personas podrán solicitar una colaboración contigo" value={!!communityDraft.trainerEnabled} disabled={busy} onChange={() => {
          if (communityDraft.trainerEnabled) setConfirmTrainerDisable(true);
          else setCommunityDraft(value => value ? { ...value, trainerEnabled: true } : value);
        }} />
        {confirmTrainerDisable && <Card style={{ backgroundColor: colors.accentSoft, borderColor: colors.selectionHighlight }}>
          <Txt weight="600">¿Desactivar el perfil de entrenador?</Txt>
          <Txt muted size={13}>Dejarás de aparecer como entrenador y no podrán solicitar nuevas colaboraciones. Las colaboraciones activas no se borrarán.</Txt>
          <Row>
            <Button label="Confirmar desactivación" compact onPress={() => { setCommunityDraft(value => value ? { ...value, trainerEnabled: false } : value); setConfirmTrainerDisable(false); }} />
            <Button label="Cancelar" compact variant="ghost" onPress={() => setConfirmTrainerDisable(false)} />
          </Row>
        </Card>}
      </> : <><Txt muted>Conecta tu cuenta para configurar tu perfil social y su privacidad.</Txt><Button label="Conectar Comunidad" icon="users" variant="secondary" onPress={() => router.push("/community")} /></>}
    </Card>}
    {section === "app" && <>
      <AccountCard />
      <Card><Txt weight="600" size={20}>Opciones de app</Txt><Txt muted>Idioma, aspecto, notificaciones y preferencias generales.</Txt><Button label="Idioma y apariencia" icon="settings" variant="secondary" onPress={() => router.push("/settings?from=profile")} /><Button label="Notificaciones" icon="bell" variant="secondary" onPress={() => router.push("/settings?from=profile")} /></Card>
      <Button label="Cerrar sesión" variant="ghost" icon="log-out" onPress={() => { update(value => ({ ...value, signedOut: true })); router.replace("/"); }} />
    </>}
    {!!Object.keys(errors).length && <Notice error>{messages.Profile.revisaLosCamposIndicadosEnElPerfil}</Notice>}
    {!!message && <Notice error>{message}</Notice>}
    <Button label={busy ? "Guardando…" : "Guardar perfil"} disabled={busy} onPress={() => void save()} />
  </Page>;

  return <Page>
    <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
      <View style={{ flex: 1, minWidth: 0 }}><Heading eyebrow={messages.Profile.tuEspacio} title="Perfil" subtitle="Tu entrenamiento, tu comunidad y tus avances." /></View>
      <View style={{ position: "relative", marginLeft: 12 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={unread.length ? `${unread.length} notificaciones nuevas` : "Notificaciones"} onPress={openNotifications} style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.soft, opacity: pressed ? 0.72 : 1 })}>
          <Icon name="bell" size={21} />
        </Pressable>
        {!!unread.length && <View style={{ position: "absolute", top: -3, right: -3, minWidth: 19, height: 19, borderRadius: 10, backgroundColor: "#C94B45", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.surface }}><Txt size={10} weight="700" style={{ color: "#FFF" }}>{unread.length > 9 ? "9+" : unread.length}</Txt></View>}
      </View>
    </Row>
    <Card style={{ gap: 18 }}>
      <Row style={{ alignItems: "flex-start" }}>
        <AvatarPhotoPicker onChange={changeAvatar}><Avatar id={state.profile.avatar} size={76} /></AvatarPhotoPicker>
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Txt size={24} weight="600" numberOfLines={2} translate={false}>{state.profile.name || t("Tu perfil")}</Txt>
          {!!state.profile.handle && <Txt muted size={13} translate={false}>@{state.profile.handle}</Txt>}
          {!!social && <Row style={{ gap: 16, flexWrap: "wrap" }}>
            <Pressable accessibilityRole="button" onPress={() => setConnections(true)}><Txt size={13} weight="600">{social.followers} {social.followers === 1 ? "seguidor" : "seguidores"}</Txt></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setConnections(true)}><Txt size={13} weight="600">{social.following} siguiendo</Txt></Pressable>
          </Row>}
        </View>
      </Row>
      <View style={{ gap: 7 }}>
        {!!social?.bio && <Txt translate={false}>{social.bio}</Txt>}
        {!!social?.trainingPlace && <Row style={{ gap: 7 }}><Icon name="map-pin" size={15} color={colors.muted} /><Txt muted size={13} style={{ flex: 1 }} translate={false}>{social.trainingPlace}{social.city ? ` · ${social.city}` : ""}</Txt></Row>}
        {!social?.bio && !social?.trainingPlace && <Txt muted size={13}>Añade una biografía y tu gimnasio desde Editar perfil.</Txt>}
      </View>
      <Row style={{ flexWrap: "wrap" }}><Button label="Editar perfil" icon="edit-2" variant="secondary" compact onPress={openEditor} />{social && <Button label={connections ? "Ocultar conexiones" : "Personas y conexiones"} icon="users" variant="ghost" compact onPress={() => setConnections(value => !value)} />}</Row>
    </Card>
    {points !== undefined && <Card style={{ gap: 7 }}>
      <Row style={{ justifyContent: "space-between" }}><View><Txt muted size={11}>TU PROGRESO</Txt><Txt weight="600" size={20}>{pointsTier(points).name}</Txt></View><Txt weight="700" size={22}>{visiblePoints?.toLocaleString(locale, { maximumFractionDigits: 1 })} <Txt muted size={12}>A-Points</Txt></Txt></Row>
      <Txt muted size={12}>{nextTier ? `Siguiente meta: ${nextTier.name} a los ${nextTier.minimum.toLocaleString(locale)} A-Points · te faltan ${(nextTier.minimum - visiblePoints!).toLocaleString(locale, { maximumFractionDigits: 1 })}.` : "Nivel máximo alcanzado. Tu puntuación puede seguir aumentando."}</Txt>
    </Card>}
    <Card style={{ gap: 6 }}><Txt weight="600">Logros</Txt><Txt muted size={13}>{localAchievements.length === 1 ? "1 logro personal" : `${localAchievements.length} logros personales`}{social ? ` · ${achievementCount === 1 ? "1 logro compartido" : `${achievementCount} logros compartidos`}` : ""}.</Txt>{localAchievements.slice(0, 2).map(item => <Txt key={item.id} muted size={13}><Txt weight="600">{item.title}</Txt> · {item.description}</Txt>)}{masteries.length ? <View style={{ gap: 3 }}><Txt weight="600" size={13}>Dominio por ejercicio</Txt>{masteries.slice(0, 4).map(item => <Txt key={item.exerciseId} muted size={13}>{item.name} — <Txt weight="600">{item.rank}</Txt> · {item.ratio.toLocaleString(locale, { maximumFractionDigits: 2 })}× BW</Txt>)}</View> : <Txt muted size={12}>Registra peso corporal y un básico para desbloquear tus rangos por ejercicio.</Txt>}<Button label="Ver todos mis logros" compact variant="ghost" icon="award" onPress={() => router.push("/achievements" as never)} />{social && <Button label="Ver novedades de Comunidad" compact variant="ghost" icon="star" onPress={() => router.push("/community")} />}</Card>
    {connections && social && <CommunityPeople openProfile={id => router.push({ pathname: "/community", params: { profile: id } })} />}
    <ExerciseTiers preferences={state.preferences} profile={state.profile} setPreferences={action => update(value => ({ ...value, preferences: typeof action === "function" ? action(value.preferences) : action }))} />
    <Modal visible={notificationsOpen} animationType="slide" onRequestClose={() => setNotificationsOpen(false)}>
      <Page><Row style={{ justifyContent: "space-between" }}><View><Txt weight="600" size={24}>Notificaciones</Txt><Txt muted size={13}>Todo tu historial</Txt></View><Button label="Cerrar" compact variant="ghost" onPress={() => setNotificationsOpen(false)} /></Row>
      {user && <Card><Row style={{ alignItems: "center" }}><View style={{ flex: 1 }}><Txt weight="600">Felicitaciones por logros</Txt><Txt muted size={12}>Avisa cuando alguien felicite uno de tus logros.</Txt></View><Switch accessibilityLabel="Felicitaciones por logros" value={achievementLikesEnabled} disabled={busy} onValueChange={setAchievementNotifications} trackColor={{ false: colors.border, true: colors.accent }} /></Row></Card>}
      {!user ? <Card><Txt weight="600">Conecta Comunidad para ver tus avisos</Txt><Txt muted>Los seguimientos y novedades de tu perfil aparecerán aquí.</Txt><Button label="Conectar Comunidad" icon="users" variant="secondary" onPress={() => { setNotificationsOpen(false); router.push("/community"); }} /></Card> : notifications.length ? notifications.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => { setNotificationsOpen(false); router.push({ pathname: "/community", params: { profile: item.actorId } }); }} style={({ pressed }) => ({ paddingVertical: 14, paddingHorizontal: 2, gap: 4, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.7 : 1 })}>
        <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}><Txt style={{ flex: 1 }}><Txt weight="600" translate={false}>@{item.handle}</Txt>{item.type.startsWith("achievement_like:") ? " ha felicitado uno de tus logros." : " ha empezado a seguirte."}</Txt><Txt muted size={11}>{item.read_at ? "Vista" : "Nueva"}</Txt></Row><Txt muted size={12}>{new Date(item.created).toLocaleString(locale)}</Txt>
      </Pressable>) : <Card><Txt weight="600">Aún no hay notificaciones</Txt><Txt muted>Cuando alguien te siga o haya una novedad de Comunidad, se guardará aquí.</Txt></Card>}</Page>
    </Modal>
    {!!message && <Notice>{message}</Notice>}
  </Page>;
}
