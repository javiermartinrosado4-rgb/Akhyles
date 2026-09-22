import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { useTheme } from "../theme";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { Card, Txt } from "./ui";

function Option({ label, description, value, onChange, disabled = false }: { label: string; description: string; value: boolean; onChange: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", gap: 12, alignItems: "center", minHeight: 58 }}>
    <View style={{ flex: 1 }}><Txt weight="600" size={14}>{label}</Txt><Txt muted size={12}>{description}</Txt></View>
    <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.border, true: colors.accent }} />
  </View>;
}

/** Device-local reminders; iOS/Android asks permission only when one is enabled. */
export function NotificationSettings({ compact = false }: { compact?: boolean }) {
  const { state, update } = useStore();
  const { user, request } = useCommunity();
  const [achievementLikes, setAchievementLikes] = useState(true);
  const [savingSocial, setSavingSocial] = useState(false);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void request<{ achievementLikes: boolean }>("/me/notification-preferences").then(value => { if (alive) setAchievementLikes(value.achievementLikes); }).catch(() => undefined);
    return () => { alive = false; };
  }, [user, request]);
  const changeAchievementLikes = (next: boolean) => {
    if (!user || savingSocial) return;
    setAchievementLikes(next); setSavingSocial(true);
    void request<{ achievementLikes: boolean }>("/me/notification-preferences", "PATCH", { achievementLikes: next })
      .then(value => setAchievementLikes(value.achievementLikes))
      .catch(() => setAchievementLikes(current => !current))
      .finally(() => setSavingSocial(false));
  };
  const content = <>
    <Txt weight="600" size={compact ? 16 : 20}>Gestionar notificaciones</Txt>
    <Txt muted size={12}>Puedes cambiarlas cuando quieras. No enviamos publicidad.</Txt>
    <Option label="Recordatorio de peso semanal" description="Cada miércoles a las 08:00 te pedirá registrar tu peso." value={!!state.profile.weightReminder} onChange={() => update(value => ({ ...value, profile: { ...value.profile, weightReminder: !value.profile.weightReminder } }))} />
    <Option label="Aviso de entrenamiento" description="A las 9:00 de tus días de entrenamiento: sesión prevista y frase del día." value={!!state.profile.trainingReminder} onChange={() => update(value => ({ ...value, profile: { ...value.profile, trainingReminder: !value.profile.trainingReminder } }))} />
    {user && <Option label="Felicitaciones por logros" description="Avisa cuando alguien felicite uno de tus logros en Comunidad." value={achievementLikes} disabled={savingSocial} onChange={() => changeAchievementLikes(!achievementLikes)} />}
  </>;
  return compact ? <View style={{ gap: 10 }}>{content}</View> : <Card style={{ gap: 10 }}>{content}</Card>;
}
