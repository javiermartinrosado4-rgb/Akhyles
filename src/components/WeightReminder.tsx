import { useLanguage } from "../i18n";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { useStore } from "../state/Store";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Schedules only after the person explicitly opts in from their profile. */
export function WeightReminder() {
  const { t, language } = useLanguage();
  const { state, update } = useStore();
  const enabled = !!state.profile.weightReminder;
  const notificationId = state.weightReminderNotificationId;
  const wasEnabled = useRef(false);
  const permissionRequest = useRef<ReturnType<typeof Notifications.requestPermissionsAsync> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const newlyEnabled = enabled && !wasEnabled.current;
    wasEnabled.current = enabled;
    let alive = true;
    void (async () => {
      if (!enabled) {
        if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
        if (alive && notificationId) update(s => ({ ...s, weightReminderNotificationId: undefined }));
        return;
      }
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("weight-reminders", {
          name: t("Recordatorios de peso"),
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
      const current = await Notifications.getPermissionsAsync();
      if (!alive) return;
      // Updating a scheduled reminder must never prompt again for permission.
      if (current.status !== "granted" && !notificationId && newlyEnabled && !permissionRequest.current) {
        permissionRequest.current = Notifications.requestPermissionsAsync();
      }
      const permission = permissionRequest.current ? await permissionRequest.current : current;
      if (alive) permissionRequest.current = null;
      if (!alive || permission.status !== "granted") {
        if (alive) update(s => ({ ...s, profile: { ...s.profile, weightReminder: false } }));
        return;
      }
      if (notificationId) {
        const scheduled = await Notifications.getAllScheduledNotificationsAsync();
        if (!alive) return;
        const existing = scheduled.find(item => item.identifier === notificationId);
        if (existing?.content.data?.language === language && existing.content.data?.reminder === "weekly-weight-v3") return;
        await Notifications.cancelScheduledNotificationAsync(notificationId);
      }
      if (!alive) return;
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: t("Actualiza tu peso corporal"),
          body: t("Registra tu peso de esta semana para que Akhyles mantenga tus gráficas al día."),
          data: { screen: "progress", language, reminder: "weekly-weight-v3" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          // Expo uses 1 = Sunday. Wednesday is the weekly weigh-in day.
          weekday: 4,
          hour: 8,
          minute: 0,
          channelId: "weight-reminders",
        },
      });
      if (alive) update(s => ({ ...s, weightReminderNotificationId: id }));
      else await Notifications.cancelScheduledNotificationAsync(id);
    })().catch(() => {
      permissionRequest.current = null;
      if (alive) update(s => ({ ...s, profile: { ...s.profile, weightReminder: false } }));
    });
    return () => { alive = false; };
  }, [enabled, notificationId, update, language, t]);
  return null;
}
