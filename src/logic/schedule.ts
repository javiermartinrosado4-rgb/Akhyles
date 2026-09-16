import { defaultTrainingDays, weekdays } from "../data/options";
import { Day, PlannedWorkout, Profile, RoutineVersion, Weekday, Workout } from "../types";

export const isoWeekday = (date: Date): Weekday =>
  (date.getDay() === 0 ? 7 : date.getDay()) as Weekday;

export const localDateKey = (value: Date | string) => {
  // Calendar-only dates have no timezone; parsing them as UTC shifts western users a day.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const availableWeekdays = (profile: Profile) => {
  const chosen = profile.trainingDays;
  return chosen?.length === profile.days
    ? [...chosen].sort((a, b) => a - b)
    : defaultTrainingDays(profile.days);
};

export function scheduledWeekdays(profile: Profile, sessions: number): Weekday[] {
  const available = availableWeekdays(profile);
  if (sessions >= available.length) return available.slice(0, sessions);
  if (sessions <= 1) return [available[0]];
  return Array.from(
    new Set(
      Array.from({ length: sessions }, (_, index) =>
        available[Math.round((index * (available.length - 1)) / (sessions - 1))],
      ),
    ),
  );
}

export function routineSchedule(profile: Profile, routine: Day[]) {
  const days = scheduledWeekdays(profile, routine.length);
  return routine.map((day, index) => ({ day, weekday: days[index] }));
}

/** Resolves the program that was actually in force on a date. */
export function routineAt(
  profile: Profile,
  routine: Day[],
  versions: RoutineVersion[] | undefined,
  date: Date,
) {
  const key = localDateKey(date);
  const version = [...(versions ?? [])]
    .map(item => ({ ...item, effectiveFrom: /^\d{4}-\d{2}-\d{2}$/.test(item.effectiveFrom) ? item.effectiveFrom : localDateKey(item.effectiveFrom) }))
    .filter(item => item.effectiveFrom <= key)
    .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom))
    .at(-1);
  return version ? { profile: version.profile, routine: version.routine } : { profile, routine: versions?.length ? [] : routine };
}

export const weekdayName = (day: Weekday) =>
  weekdays.find((option) => option.id === day)?.name ?? "";

export function scheduledDay(
  profile: Profile,
  routine: Day[],
  date = new Date(),
  versions?: RoutineVersion[],
) {
  const program = routineAt(profile, routine, versions, date);
  return routineSchedule(program.profile, program.routine).find(
    (item) => item.weekday === isoWeekday(date),
  )?.day;
}

export function scheduledWorkout(
  profile: Profile,
  routine: Day[],
  planned: PlannedWorkout[] | undefined,
  date = new Date(),
  skippedDates?: string[],
  versions?: RoutineVersion[],
) {
  const key = localDateKey(date);
  if (skippedDates?.includes(key)) return undefined;
  const override = planned?.find(item => localDateKey(item.date) === key);
  const program = routineAt(profile, routine, versions, date);
  const base = scheduledDay(profile, routine, date, versions);
  if (!override) return base;
  // Date-specific plans keep their chosen loads, while the current routine remains
  // the source of truth for sets and ranges. This prevents old saved overrides
  // from reviving an outdated four-set prescription.
  const source = base?.id === override.day.id
    ? base
    : program.routine.find(day => day.id === override.dayId || day.id === override.day.id);
  if (source) {
    return {
      ...override.day,
      exercises: source.exercises.map(entry => {
        const saved = override.day.exercises.find(item => item.id === entry.id && item.exerciseId === entry.exerciseId);
        return saved ? { ...entry, weight: saved.weight } : entry;
      }),
    };
  }
  return override.day;
}

export const startOfWeek = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - isoWeekday(start) + 1);
  return start;
};

export const datesForWeek = (date: Date) =>
  Array.from({ length: 7 }, (_, offset) => {
    const item = startOfWeek(date);
    item.setDate(item.getDate() + offset);
    return item;
  });

export const datesForMonth = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, offset) => {
    const item = new Date(start);
    item.setDate(start.getDate() + offset);
    return item;
  });
};

export const workoutsOnDate = (history: Workout[], date = new Date()) =>
  history.filter((workout) => localDateKey(workout.date) === localDateKey(date));

export function weeklyAdherence(
  profile: Profile,
  routine: Day[],
  history: Workout[],
  planned: PlannedWorkout[] | undefined,
  skippedDates: string[] | undefined,
  week: Date,
  versions?: RoutineVersion[],
) {
  const dates = datesForWeek(week);
  // A recorded session is historical evidence even when its legacy plan is unknown
  // or its day ID changed during a same-day regeneration.
  const scheduled = dates.filter(date => !!scheduledWorkout(profile, routine, planned, date, skippedDates, versions) || workoutsOnDate(history, date).length > 0);
  const completed = scheduled.filter(date => {
    return workoutsOnDate(history, date).length > 0;
  });
  return { scheduled: scheduled.length, completed: completed.length, minimum: Math.ceil(scheduled.length / 2), perfect: scheduled.length > 0 && completed.length === scheduled.length };
}

/** Consecutive qualifying weeks. Completing at least half the planned sessions
 * keeps the streak alive; a complete week receives a separate visual reward. */
export function trainingStreak(
  profile: Profile,
  routine: Day[],
  history: Workout[],
  planned: PlannedWorkout[] | undefined,
  skippedDates: string[] | undefined,
  now = new Date(),
  versions?: RoutineVersion[],
) {
  const cursor = startOfWeek(now);
  let streak = 0;
  const current = weeklyAdherence(profile, routine, history, planned, skippedDates, cursor, versions);
  if (current.scheduled && current.completed >= current.minimum) {
    // Show the ongoing week as soon as its 50% threshold is reached.
    streak++;
  } else {
    // An ongoing week stays alive while reaching its weekly threshold is possible.
    const today = localDateKey(now);
    const remaining = datesForWeek(cursor).filter(date => localDateKey(date) >= today &&
      !!scheduledWorkout(profile, routine, planned, date, skippedDates, versions) && !workoutsOnDate(history, date).length).length;
    if (current.scheduled && current.completed + remaining < current.minimum) return 0;
  }
  // Check completed weeks before the current in-progress one.
  cursor.setDate(cursor.getDate() - 7);
  for (let checked = 0; checked < 52; checked++) {
    const adherence = weeklyAdherence(profile, routine, history, planned, skippedDates, cursor, versions);
    if (!adherence.scheduled || adherence.completed < adherence.minimum) break;
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}
