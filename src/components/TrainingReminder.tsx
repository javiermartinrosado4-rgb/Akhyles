import { useEffect, useMemo, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { motivationalQuoteForDate } from "../content/motivation";
import { localDateKey, routineSchedule } from "../logic/schedule";
import { useStore } from "../state/Store";
import { useLanguage } from "../i18n";

// Eight weeks keeps even a seven-day routine below the common 64 pending-notification limit.
const nextDatesForWeekday = (weekday: number, count = 8) => {
  const first = new Date(); first.setHours(9, 0, 0, 0);
  const today = first.getDay() || 7;
  first.setDate(first.getDate() + (weekday - today + 7) % 7);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(first); date.setDate(date.getDate() + index * 7); return date;
  });
};

/** Keeps one concise local reminder for each scheduled training day. */
export function TrainingReminder() {
  const { state, update } = useStore();
  const { language, t } = useLanguage();
  const enabled = !!state.profile.trainingReminder;
  const ids = useMemo(() => state.trainingReminderNotificationIds ?? [], [state.trainingReminderNotificationIds]);
  const schedule = useMemo(() => routineSchedule(state.profile, state.routine), [state.profile, state.routine]);
  // Individual dated notifications keep the motivational quote fresh each week
  // and naturally refresh when the app is opened on a later date.
  const signature = `v3:${localDateKey(new Date())}:${language}:${schedule.map(item => `${item.weekday}-${item.day.id}-${item.day.name}`).join("|")}`;
  const wasEnabled = useRef(false);
  const requestInFlight = useRef<ReturnType<typeof Notifications.requestPermissionsAsync> | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;
    const newlyEnabled = enabled && !wasEnabled.current;
    wasEnabled.current = enabled;
    let alive = true;
    void (async () => {
      if (!enabled || !schedule.length) {
        await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
        if (alive && ids.length) update(value => ({ ...value, trainingReminderNotificationIds: undefined }));
        return;
      }
      if (Platform.OS === "android") await Notifications.setNotificationChannelAsync("training-reminders", {
        name: t("Entrenamientos programados"), importance: Notifications.AndroidImportance.DEFAULT,
      });
      const current = await Notifications.getPermissionsAsync();
      if (current.status !== "granted" && !ids.length && newlyEnabled && !requestInFlight.current) requestInFlight.current = Notifications.requestPermissionsAsync();
      const permission = requestInFlight.current ? await requestInFlight.current : current;
      if (alive) requestInFlight.current = null;
      if (!alive || permission.status !== "granted") {
        if (alive) update(value => ({ ...value, profile: { ...value.profile, trainingReminder: false } }));
        return;
      }
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const upcoming = schedule.flatMap(item => nextDatesForWeekday(item.weekday).map(date => ({ ...item, date })));
      if (ids.length === upcoming.length && ids.every(id => scheduled.some(item => item.identifier === id && item.content.data?.signature === signature))) return;
      await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
      const nextIds = await Promise.all(upcoming.map(async item => {
        const quote = motivationalQuoteForDate(item.date);
        return Notifications.scheduleNotificationAsync({
          content: {
            title: t("Hoy toca {day}", { day: item.day.name }),
            body: `${quote.text}${quote.author ? ` · ${quote.author}` : ""}`,
            data: { screen: "today", language, signature },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: "training-reminders" },
        });
      }));
      if (alive) update(value => ({ ...value, trainingReminderNotificationIds: nextIds }));
      else await Promise.all(nextIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));
    })().catch(() => {
      requestInFlight.current = null;
      if (alive) update(value => ({ ...value, profile: { ...value.profile, trainingReminder: false } }));
    });
    return () => { alive = false; };
  }, [enabled, ids, language, schedule, signature, t, update]);
  return null;
}
