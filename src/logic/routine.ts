import { APP } from "../config";
import { translate } from "../i18n/translate";
import { catalog } from "../data/catalog";
import { levelRank } from "../data/options";
import {
  Day,
  Exercise,
  Muscle,
  Level,
  Preferences,
  Prescription,
  Profile,
  Workout,
} from "../types";
import { startOfWeek } from "./schedule";
export const allExercises = (prefs: Preferences) => [
  ...catalog,
  ...prefs.custom,
];
export const getExercise = (id: string, prefs: Preferences) =>
  allExercises(prefs).find((e) => e.id === id)!;
export const displayName = (id: string, prefs: Preferences) => {
  // User text is neither translated nor normalized, even when it matches a key.
  if (prefs.names[id]) return prefs.names[id];
  const exercise = getExercise(id, prefs);
  if (exercise && (exercise.custom || prefs.custom.includes(exercise))) return exercise.name;
  return translate(exercise?.name || "Ejercicio");
};

/** Direct effective sets actually completed since this Monday. */
export function completedWeeklyVolume(
  history: Workout[],
  prefs: Preferences,
  now = new Date(),
): Partial<Record<Muscle, number>> {
  const start = startOfWeek(now).getTime();
  return history.reduce<Partial<Record<Muscle, number>>>((total, workout) => {
    if (new Date(workout.date).getTime() < start) return total;
    for (const record of workout.records) {
      const exercise = getExercise(record.prescription.exerciseId, prefs);
      if (!exercise) continue;
      total[exercise.muscle] = (total[exercise.muscle] ?? 0) + record.sets.length;
    }
    return total;
  }, {});
}
export const movementFamily = (exercise: Exercise) => {
  if (exercise.muscle === "back" && exercise.pullPattern)
    return `back-${exercise.pullPattern}`;
  if (exercise.muscle === "chest" && exercise.type === "compound")
    return "chest-press";
  if (exercise.muscle === "shoulders" && exercise.type === "compound")
    return "shoulder-press";
  return undefined;
};
export function candidates(
  muscle: Muscle,
  profile: Profile,
  prefs: Preferences,
  compound = false,
): Exercise[] {
  return allExercises(prefs)
    .filter(
      (e) =>
        e.muscle === muscle &&
        // Saved advanced favourites are aspirational options. Their harder
        // execution is clearly flagged in the tier list; tiers alone never
        // make an advanced movement appear in an automatic routine.
        (levelRank[e.minLevel] <= levelRank[profile.level] ||
          Boolean(prefs.favorites?.includes(e.id))) &&
        prefs.equipment.includes(e.variant) &&
        !prefs.unavailable.includes(e.id) &&
        // Beginner suggestions favour machines and simple, repeatable setups.
        // Cable is kept for the two easy pulldown patterns, but not suggested
        // for shoulder or arm isolation, nor for the seated cable pec deck.
        !(profile.level === "beginner" && e.variant === "cable" && (
          ["shoulders", "biceps", "triceps"].includes(e.muscle) ||
          e.id === "chest-cable" ||
          (e.muscle === "back" && !["neutral-pulldown", "wide-pulldown"].includes(e.id))
        )),
    )
    .sort(
      (a, b) =>
        // For hypertrophy, a guided Romanian deadlift is preferred before the
        // free-bar version; conventional deadlift remains a strength-focused
        // Tier A option for intermediate and advanced lifters.
        (muscle === "hamstrings" && prefs.equipment.includes("smith")
          ? Number(b.id === "rdl-smith") - Number(a.id === "rdl-smith")
          : 0) ||
        // Advanced lifters normally get the more stable cable choices first
        // for shoulders and triceps, while still retaining free-weight options
        // for variety and substitutions.
        (profile.level === "advanced" && (muscle === "shoulders" || muscle === "triceps")
          ? Number(b.variant === "cable") - Number(a.variant === "cable")
          : 0) ||
        Number(!!prefs.favorites?.includes(b.id)) - Number(!!prefs.favorites?.includes(a.id)) ||
        a.priority - b.priority ||
        (compound
          ? Number(b.type === "compound") - Number(a.type === "compound")
          : 0) ||
        (profile.level === "beginner"
          ? Number(b.variant === "machine") - Number(a.variant === "machine")
          : 0),
    );
}
export function replacementCandidates(
  original: Exercise,
  profile: Profile,
  prefs: Preferences,
): Exercise[] {
  const family = movementFamily(original);
  return candidates(original.muscle, profile, prefs)
    .filter(exercise => exercise.id !== original.id)
    .map((exercise, index) => ({ exercise, index }))
    .sort((a, b) =>
      // The seated machine press is the closest like-for-like replacement for
      // the lying machine chest press when a gym has that layout instead.
      Number(b.exercise.id === "seated-press" && original.id === "chest-press") -
        Number(a.exercise.id === "seated-press" && original.id === "chest-press") ||
      Number(movementFamily(b.exercise) === family) -
        Number(movementFamily(a.exercise) === family) ||
      Number(b.exercise.type === original.type) - Number(a.exercise.type === original.type) ||
      a.index - b.index,
    )
    .map(({ exercise }) => exercise);
}
export function prescribe(
  e: Exercise,
  prefs: Preferences,
  id = e.id,
): Prescription {
  return {
    id,
    exerciseId: e.id,
    sets: APP.defaultSets,
    range: prefs.ranges[e.id] ?? [...e.range],
    weight: prefs.weights[e.id] ?? 0,
  };
}
export const restSeconds = (e: Exercise) => (e.type === "compound" ? 240 : 180);
export const exerciseLimit = (level: Level) => level === "beginner" ? 5 : 6;
export const heavyExerciseLimit = (days: number) => (days > 3 ? 2 : Infinity);
export const isHeavyExercise = (exercise: Exercise) => exercise.type === "compound";
export const isFullBodyDay = (day: Day) => day.name.startsWith("Full body");
// Full-body sessions are deliberately kept below the fatigue of a full split:
// three multi-joint lifts at most, with the rest of the work kept lighter.
export const conservativeLegSplit = (profile?: Profile) =>
  Boolean(profile && (profile.level === "beginner" || Number(profile.age) > 48));
export const automaticHeavyExerciseLimit = (day: Day, days: number, profile?: Profile) =>
  isFullBodyDay(day) ? 3 :
    (day.name.startsWith("Pierna") && conservativeLegSplit(profile) ? 1 : heavyExerciseLimit(days));
export function heavyExerciseCount(day: Day, prefs: Preferences) {
  return day.exercises.filter((p) => isHeavyExercise(getExercise(p.exerciseId, prefs))).length;
}
export function canPlaceExercise(
  day: Day,
  exercise: Exercise,
  prefs: Preferences,
  days: number,
  replacingId?: string,
) {
  if (!isHeavyExercise(exercise)) return true;
  const existing = day.exercises.filter((p) => p.id !== replacingId);
  return existing.filter((p) => isHeavyExercise(getExercise(p.exerciseId, prefs))).length < heavyExerciseLimit(days);
}
export function duration(day: Day, prefs: Preferences): number {
  if (!day.exercises.length) return 0;
  // Effective sets take around 30 seconds. Rest is counted between sets only;
  // warm-up and approximation sets remain separate from the session estimate.
  const calculated = Math.ceil(
    day.exercises.reduce(
        (sum, p) =>
          sum +
          (p.sets * 30 +
            Math.max(0, p.sets - 1) * restSeconds(getExercise(p.exerciseId, prefs))) /
            60,
        0,
      ),
  );
  // This is guidance, not a countdown. Short plans still reserve time for
  // preparation, transitions and a calm pace between exercises.
  return Math.max(45, calculated);
}
export function fitDay(day: Day, prefs: Preferences, preserveId?: string, level: Level = "intermediate"): Day {
  // Exercise limits guide automatic generation only. A user editing a plan can
  // keep every exercise they deliberately add.
  return day;
}
const upper: Muscle[] = ["chest", "back", "shoulders", "biceps", "triceps"];
const lower: Muscle[] = ["quads", "hamstrings", "glutes", "adductors", "calves", "abs"];

// These are deliberately narrower than the primary muscle. Two exercises can
// train the same muscle while still being useful together (for example a hack
// squat and a leg extension), but repeating the same joint action in one day
// adds fatigue without adding much stimulus.
export const lowerMovementFamily = (exercise: Exercise) => {
  if (exercise.muscle === "quads") {
    if (exercise.id === "hack" || exercise.id === "pendulum") return "quad-squat-machine";
    if (exercise.id === "leg-extension") return "quad-extension";
    if (exercise.id === "leg-press") return "quad-press";
  }
  if (exercise.muscle === "hamstrings" &&
    ["standing-curl", "seated-curl", "lying-curl"].includes(exercise.id))
    return "hamstring-curl";
  return undefined;
};

const isQuadExtension = (exercise: Exercise) => exercise.id === "leg-extension";
const isRomanianDeadlift = (exercise: Exercise) =>
  ["rdl-bar", "rdl-dumbbell", "rdl-smith", "rdl-machine"].includes(exercise.id);
const isPreacherCurl = (exercise: Exercise) => exercise.id.includes("preacher");
const chestPressAngle = (exercise: Exercise) => {
  if (["chest-press", "chest-press-free", "bench-smith", "dumbbell-bench"].includes(exercise.id)) return "flat";
  if (["seated-press", "seated-press-free"].includes(exercise.id)) return "seated";
  if (["incline-press", "incline-press-free", "incline-smith"].includes(exercise.id)) return "incline";
  return undefined;
};
const isQuadSquatMachine = (exercise: Exercise) =>
  exercise.id === "hack" || exercise.id === "pendulum";
const isHamstringMachineCurl = (exercise: Exercise) =>
  ["standing-curl", "seated-curl", "lying-curl"].includes(exercise.id);
const isChestPress = (exercise: Exercise) =>
  exercise.muscle === "chest" && exercise.type === "compound";
const isPecDec = (exercise: Exercise) =>
  ["chest-cable", "pec-deck", "standing-cable-pec-dec"].includes(exercise.id);
const isShoulderPress = (exercise: Exercise) =>
  ["shoulder-press", "shoulder-press-free"].includes(exercise.id);
const isLateralRaise = (exercise: Exercise) => exercise.id.includes("lateral");
const isRearDeltFly = (exercise: Exercise) =>
  ["rear-machine", "rear-cable", "rear-free"].includes(exercise.id);

export const glutesEnabled = (p: Profile) => p.includeGlutes ?? (p.sex === "female" || p.priority === "glutes");
// Choosing a muscle to specialize starts its mesocycle. `mesocycle` remains
// persisted for older profiles, while priority is the source of truth for the
// generator so existing routines behave consistently after an update.
export const hasMesocycle = (p: Profile) => p.priority !== "balanced";
export const specializationTarget = (p: Profile) => {
  if (p.priority === "balanced") return 0;
  const days = Math.min(APP.maxDays, Math.max(1, p.days));
  const base = p.level === "beginner" ? 6 : 8;
  if (days === 1) return base;
  if (days === 2) return base + 2;
  if (days === 3) return base + 4;
  if (days === 4) return p.level === "beginner" ? 12 : 14;
  return p.level === "beginner" ? 14 : 16;
};
export function weeklyTargets(
  p: Profile,
  overrides?: Partial<Record<Muscle, number>>,
): Record<Muscle, number> {
  const large = p.level === "beginner" ? 6 : 8;
  const targets: Record<Muscle, number> = {
    chest: 4, shoulders: 4, biceps: 4, triceps: 4, adductors: 0, calves: 4, abs: 4,
    back: large, quads: large, hamstrings: large,
    glutes: glutesEnabled(p) ? large + (p.sex === "female" ? 2 : 0) : 0,
  };
  // In a one- or two-day full-body plan, weekly recovery and session space
  // are limited. Allocate the available volume from large groups down to
  // smaller ones, with a sex-specific emphasis when the goal is balanced.
  if (p.days <= 2) {
    targets.chest = p.sex === "male" ? 6 : 4;
    targets.back = p.sex === "male" ? 8 : 6;
    targets.quads = p.sex === "female" ? 8 : 6;
    targets.hamstrings = 4;
    targets.glutes = glutesEnabled(p) ? (p.sex === "female" ? 8 : 4) : 0;
    targets.shoulders = 2;
    targets.biceps = 2;
    targets.triceps = 2;
    targets.calves = 0;
    targets.abs = 0;
  }
  // With two leg days, one accessory slot goes to adductors and the other to calves.
  if (p.days >= 4) {
    targets.adductors = 2;
    targets.calves = 2;
  }
  if (p.priority !== "balanced") targets[p.priority] = specializationTarget(p);
  for (const muscle of [...upper, ...lower]) {
    const target = overrides?.[muscle];
    if (typeof target === "number" && Number.isFinite(target))
      targets[muscle] = Math.max(0, Math.floor(target));
  }
  return targets;
}
export function weeklyVolume(routine: Day[], prefs: Preferences): Record<Muscle, number> {
  const result = Object.fromEntries([...upper, ...lower].map(m => [m, 0])) as Record<Muscle, number>;
  for (const day of routine) for (const p of day.exercises) result[getExercise(p.exerciseId, prefs).muscle] += p.sets;
  return result;
}
export function orderExercises(entries: Prescription[], prefs: Preferences): Prescription[] {
  const remaining = [...entries];
  const ordered: Prescription[] = [];
  while (remaining.length) {
    const previous = ordered.at(-1);
    // Always open with a compound movement when the session has one. The
    // alternating-muscle sort below handles the rest of the session.
    if (!previous) {
      remaining.sort((a, b) =>
        Number(isHeavyExercise(getExercise(b.exerciseId, prefs))) -
        Number(isHeavyExercise(getExercise(a.exerciseId, prefs))));
      ordered.push(remaining.shift()!);
      continue;
    }
    const muscle = previous && getExercise(previous.exerciseId, prefs).muscle;
    // Prefer a different primary muscle; within that group, heavy movements first.
    remaining.sort((a, b) => {
      const ea = getExercise(a.exerciseId, prefs), eb = getExercise(b.exerciseId, prefs);
      const lowerRank = (exercise: Exercise) => {
        const family = lowerMovementFamily(exercise);
        if (exercise.muscle === "quads")
          return family === "quad-squat-machine" ? 0 : family === "quad-extension" ? 1 : family === "quad-press" ? 2 : 3;
        if (exercise.muscle === "hamstrings") return family === "hamstring-curl" ? 1 : 0;
        return 0;
      };
      const chestRank = (exercise: Exercise) =>
        isChestPress(exercise) ? 0 : isPecDec(exercise) ? 1 : 2;
      return Number(ea.muscle === muscle) - Number(eb.muscle === muscle)
        || (ea.muscle === eb.muscle && ea.muscle === "chest" ? chestRank(ea) - chestRank(eb) : 0)
        || (ea.muscle === eb.muscle ? lowerRank(ea) - lowerRank(eb) : 0)
        || Number(eb.type === "compound") - Number(ea.type === "compound");
    });
    ordered.push(remaining.shift()!);
  }
  return ordered;
}
export function generateRoutine(
  profile: Profile,
  prefs: Preferences,
  overrides?: Partial<Record<Muscle, number>>,
): Day[] {
  const count = Math.min(APP.maxDays, Math.max(1, profile.days));
  const targets = weeklyTargets(profile, overrides);
  const baseTargets = weeklyTargets(profile);
  // Keep the familiar day names/split. Automatic prescriptions always start
  // at the app's conservative two effective sets per exercise.
  const names = [
    [], ["Full body"], ["Full body A", "Full body B"],
    ["Torso", "Pierna", "Full body"],
    ["Torso A", "Pierna A", "Torso B", "Pierna B"],
    ["Torso", "Pierna", "Torso", "Pierna", "Especialización"],
  ][count];
  const days: Day[] = names.map((name, i) => ({ id: `day-${i}`, name, exercises: [] }));
  const torsoDays = days.filter((day) => day.name.startsWith("Torso"));
  const used: Partial<Record<Muscle, number>> = {};
  let lastPull: Exercise["pullPattern"] = "vertical";
  const allowed = (day: Day, muscle: Muscle) => {
    // Calves and abs are worthwhile, but they make a full-body session longer
    // without being central to its main multi-joint work. They belong on lower
    // split days instead; users can still add them manually whenever desired.
    if (isFullBodyDay(day) && (muscle === "calves" || muscle === "abs")) return false;
    const isSpecialization = hasMesocycle(profile) && profile.priority === muscle;
    if (isSpecialization) return true;
    // Alternating arms keeps a standard torso split concise. It is a default,
    // not a restriction: a user who asks for more direct arm volume can use
    // both torso sessions to accommodate those extra series.
    const requestedExtraArmVolume = (muscle === "biceps" || muscle === "triceps") &&
      targets[muscle] > baseTargets[muscle];
    if (count > 3 && (muscle === "biceps" || muscle === "triceps") &&
      profile.priority !== muscle && !requestedExtraArmVolume) {
      const torsoIndex = torsoDays.findIndex((torso) => torso.id === day.id);
      return muscle === "biceps" ? torsoIndex === 0 : torsoIndex === 1;
    }
    return count <= 2 || day.name.startsWith("Full") || day.name === "Especialización" || (day.name.startsWith("Torso") ? upper : lower).includes(muscle);
  };
  const currentVolume = (muscle: Muscle) => days
    .flatMap(day => day.exercises)
    .filter(entry => getExercise(entry.exerciseId, prefs).muscle === muscle)
    .reduce((sum, entry) => sum + entry.sets, 0);
  const exerciseUses = (exerciseId: string) => days
    .flatMap(day => day.exercises)
    .filter(entry => entry.exerciseId === exerciseId).length;
  const frequencyTwoExercises = new Set(["supported-row", "lateral-cable"]);
  const overlappingQuadPatterns = new Set(["hack", "pendulum"]);
  const canUseExercise = (day: Day, exercise: Exercise) => {
    if (frequencyTwoExercises.has(exercise.id)) {
      if (exerciseUses(exercise.id) >= 2) return false;
      if (count > 3 && !day.name.startsWith("Torso") && day.name !== "Especialización") return false;
    }
    // Gironda is an extra horizontal pull, not the replacement for the main
    // supported row. It only enters a back specialization after frequency two.
    if (exercise.id === "gironda-row")
      return profile.priority === "back" && exerciseUses("supported-row") >= 2;
    // Do not repeat Jaca in an automatic week. Prensa is the normal second
    // heavy quad pattern. An advanced athlete can only receive Jaca plus
    // pendular when the volume need is high and Prensa is unavailable.
    if (overlappingQuadPatterns.has(exercise.id)) {
      if (exerciseUses(exercise.id) > 0) return false;
      const otherSquatPatternUsed = [...overlappingQuadPatterns]
        .some(id => id !== exercise.id && exerciseUses(id) > 0);
      const legPressAvailable = candidates("quads", profile, prefs, true)
        .some(candidate => candidate.id === "leg-press");
      if (otherSquatPatternUsed &&
        !(profile.level === "advanced" && targets.quads >= 12 && !legPressAvailable))
        return false;
    }
    const family = lowerMovementFamily(exercise);
    const isHamstringMesocycle = hasMesocycle(profile) && profile.priority === "hamstrings";
    // In a normal plan, one curl machine per session avoids redundant knee
    // flexion. During a hamstring mesocycle, seated and lying curls may share
    // a session when the extra volume calls for four direct curl sets.
    if (family && day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === family) &&
      !(isHamstringMesocycle && family === "hamstring-curl"))
      return false;
    const sameMuscle = day.exercises
      .map(entry => getExercise(entry.exerciseId, prefs))
      .filter(item => item.muscle === exercise.muscle);
    const currentExercises = day.exercises.map(entry => getExercise(entry.exerciseId, prefs));
    if (isPreacherCurl(exercise) && currentExercises.some(isPreacherCurl)) return false;
    if (isRomanianDeadlift(exercise) && currentExercises.some(isRomanianDeadlift)) return false;
    const pressAngle = chestPressAngle(exercise);
    if (pressAngle && currentExercises.some(item => chestPressAngle(item) === pressAngle)) return false;
    if (isRearDeltFly(exercise)) {
      const programmedShoulders = days
        .flatMap(candidateDay => candidateDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs));
      // Rear-delt flies are an extra shoulder movement, not the foundation:
      // require more than six direct weekly sets and the press + lateral base.
      if (targets.shoulders <= 6 ||
        !programmedShoulders.some(isShoulderPress) ||
        !programmedShoulders.some(isLateralRaise)) return false;
    }
    if (count === 3 && profile.priority === "balanced" && day.name.startsWith("Torso") &&
      (exercise.muscle === "biceps" || exercise.muscle === "triceps") && sameMuscle.length >= 1)
      return false;
    const directArms = day.exercises
      .map(entry => getExercise(entry.exerciseId, prefs))
      .filter(item => item.muscle === "biceps" || item.muscle === "triceps");
    if ((exercise.muscle === "biceps" || exercise.muscle === "triceps") && directArms.length) {
      const opposite = exercise.muscle === "biceps" ? "triceps" : "biceps";
      // When two direct arm movements fit in the same session, pair biceps
      // with triceps before repeating the same elbow action. A requested zero
      // target remains respected rather than injecting unwanted arm volume.
      if (directArms.some(item => item.muscle === exercise.muscle) &&
        !directArms.some(item => item.muscle === opposite) &&
        currentVolume(opposite) < targets[opposite]) return false;
    }
    // One- and three-day mixed plans retain their original fatigue ceiling.
    // The two-day Full Body template intentionally overrides it so each day
    // can contain its required torso and lower-body compound movement.
    if (count !== 2 && isFullBodyDay(day) && isHeavyExercise(exercise)) {
      const heavyFullBodyEntries = days
        .filter(isFullBodyDay)
        .flatMap(fullBodyDay => fullBodyDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs))
        .filter(item => item.muscle === exercise.muscle && isHeavyExercise(item));
      if (heavyFullBodyEntries.length >= 1) return false;
    }
    if (count <= 2 && isFullBodyDay(day) &&
      ((isRomanianDeadlift(exercise) && day.exercises.some(entry => isQuadSquatMachine(getExercise(entry.exerciseId, prefs)))) ||
        (isQuadSquatMachine(exercise) && day.exercises.some(entry => isRomanianDeadlift(getExercise(entry.exerciseId, prefs))))))
      return false;
    if (exercise.muscle === "chest") {
      const chestExercises = days
        .flatMap(candidateDay => candidateDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs))
        .filter(item => item.muscle === "chest");
      const hasPecDec = chestExercises.some(isPecDec);
      const hasChestPress = chestExercises.some(isChestPress);
      // Four direct chest sets are deliberately split across one press and
      // one fly/pec-dec movement instead of repeating either pattern.
      if (targets.chest === 4) {
        if (isChestPress(exercise) && hasChestPress) return false;
        if (isPecDec(exercise) && hasPecDec) return false;
      }
      // Pec Dec is a useful complement, not the only chest pattern in an
      // automatic plan. The next chest slot must be a press (machine, free
      // weight or Smith) before another isolation is considered.
      if (hasPecDec && !hasChestPress) return isChestPress(exercise);
    }
    if (exercise.muscle === "quads") {
      // A second quad slot is always the extension. A third is the press;
      // beyond that the automatic generator spreads work to another day.
      if (sameMuscle.length === 1) return isQuadExtension(exercise);
      if (sameMuscle.length === 2) return exercise.id === "leg-press";
      if (sameMuscle.length >= 3) return false;
    }
    if (exercise.muscle === "abs" && sameMuscle.length >= 1 &&
      !(hasMesocycle(profile) && profile.priority === "abs")) return false;
    // For a balanced three-day plan the leg day gets motivating abs by
    // default; calves become the alternative instead of extending the day
    // with both accessories.
    if (exercise.muscle === "calves" && count === 3 && profile.priority === "balanced" &&
      day.name.startsWith("Pierna") && day.exercises.some(entry =>
        getExercise(entry.exerciseId, prefs).muscle === "abs")) return false;
    if (exercise.muscle === "hamstrings" && sameMuscle.length === 1 &&
      isRomanianDeadlift(sameMuscle[0]))
      return isHamstringMachineCurl(exercise);
    if (exercise.muscle === "chest" && sameMuscle.length === 1 &&
      isChestPress(sameMuscle[0]))
      return isPecDec(exercise);
    return true;
  };
  const add = (day: Day, muscle: Muscle) => {
    if (currentVolume(muscle) >= targets[muscle]) return false;
    let options = candidates(muscle, profile, prefs, true).filter(e =>
      !day.exercises.some(p => p.exerciseId === e.id) &&
      (!isHeavyExercise(e) || heavyExerciseCount(day, prefs) < automaticHeavyExerciseLimit(day, count, profile)) &&
      canUseExercise(day, e),
    );
    if (muscle === "back") {
      const plannedBack = days
        .flatMap(candidateDay => candidateDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs))
        .filter(exercise => exercise.muscle === "back" && exercise.pullPattern);
      const plannedPatterns = new Set(plannedBack.map(exercise => exercise.pullPattern));
      // A second row should never take the slot that ought to establish the
      // missing vertical pull (or vice versa), whatever the split length.
      const missingRoutinePattern = plannedPatterns.size === 1
        ? plannedPatterns.has("horizontal") ? "vertical" : "horizontal"
        : undefined;
      const routinePatternPriority = (exercise: Exercise) =>
        Number(!!missingRoutinePattern && exercise.pullPattern === missingRoutinePattern);
      // In the standard Torso A / Torso B split, make the distinction obvious:
      // the first torso day rows and the second one uses a pulldown.
      const torsoIndex = torsoDays.length === 2
        ? torsoDays.findIndex(torso => torso.id === day.id)
        : -1;
      const torsoPattern = torsoIndex === 0 ? "horizontal"
        : torsoIndex === 1 ? "vertical"
          : undefined;
      const torsoPatternPriority = (exercise: Exercise) =>
        Number(!!torsoPattern && exercise.pullPattern === torsoPattern);
      const fullBodyBack = days
        .filter(isFullBodyDay)
        .flatMap(fullBodyDay => fullBodyDay.exercises)
        .map(entry => getExercise(entry.exerciseId, prefs))
        .filter(exercise => exercise.muscle === "back" && exercise.pullPattern);
      const fullBodyPatterns = new Set(fullBodyBack.map(exercise => exercise.pullPattern));
      // A full-body plan may only have two back slots. Cover both movement
      // patterns before repeating one, so two rows do not occupy them both.
      const missingFullBodyPattern = isFullBodyDay(day) && fullBodyPatterns.size === 1
        ? fullBodyPatterns.has("horizontal") ? "vertical" : "horizontal"
        : undefined;
      const fullBodyPatternPriority = (exercise: Exercise) =>
        Number(!!missingFullBodyPattern && exercise.pullPattern === missingFullBodyPattern);
      const wideUsed = exerciseUses("wide-pulldown");
      const neutralUsed = exerciseUses("neutral-pulldown");
      const pulldowns = options.filter(exercise =>
        exercise.id === "wide-pulldown" || exercise.id === "neutral-pulldown",
      );
      // Once a primary pulldown is already in the plan, give the other grip
      // precedence before a lower-volume vertical accessory such as pullover.
      const shouldDiversifyPulldowns = pulldowns.length === 2 &&
        ((wideUsed > 0 && neutralUsed === 0) || (neutralUsed > 0 && wideUsed === 0));
      const pulldownVariety = (exercise: Exercise) =>
        (wideUsed > 0 && neutralUsed === 0 && exercise.id === "neutral-pulldown") ||
        (neutralUsed > 0 && wideUsed === 0 && exercise.id === "wide-pulldown")
          ? 1
          : 0;
      // In a back specialization, the supported row remains the first
      // horizontal pattern twice per week. Once that base and both primary
      // vertical pulls are already present, Gironda is the extra horizontal
      // option rather than repeating a lower-value variation first.
      const shouldAddGironda = profile.priority === "back" &&
        exerciseUses("supported-row") >= 2 &&
        wideUsed > 0 &&
        neutralUsed > 0;
      const girondaPriority = (exercise: Exercise) =>
        shouldAddGironda && exercise.id === "gironda-row" ? 1 : 0;
      options = options.sort((a, b) =>
        girondaPriority(b) - girondaPriority(a) ||
        torsoPatternPriority(b) - torsoPatternPriority(a) ||
        routinePatternPriority(b) - routinePatternPriority(a) ||
        fullBodyPatternPriority(b) - fullBodyPatternPriority(a) ||
        (shouldDiversifyPulldowns
          ? pulldownVariety(b) - pulldownVariety(a)
          : 0) ||
        a.priority - b.priority ||
        Number(b.pullPattern !== lastPull && !!b.pullPattern) - Number(a.pullPattern !== lastPull && !!a.pullPattern));
    }
    // In 4–5 day plans reserve the two heavy slots for the chest/back work.
    // Hombro can still be trained hard when it is the stated priority.
    if (count > 3 && muscle === "shoulders" && profile.priority !== "shoulders")
      options = options.sort((a, b) => Number(b.type === "isolation") - Number(a.type === "isolation"));
    if (muscle === "hamstrings" && (used[muscle] ?? 0) % 2 === 1) {
      options = options.sort((a, b) => Number(b.id === "seated-curl") - Number(a.id === "seated-curl"));
    }
    if (muscle === "hamstrings" && hasMesocycle(profile) && profile.priority === "hamstrings") {
      const sessionCurls = day.exercises
        .map(entry => getExercise(entry.exerciseId, prefs).id)
        .filter(id => ["standing-curl", "seated-curl", "lying-curl"].includes(id));
      // Favor the seated/lying pairing for the optional second curl slot. It
      // provides the requested four curl sets without selecting a duplicate.
      const companion = sessionCurls.includes("seated-curl") ? "lying-curl"
        : sessionCurls.includes("lying-curl") ? "seated-curl"
          : undefined;
      if (companion)
        options = options.sort((a, b) => Number(b.id === companion) - Number(a.id === companion));
    }
    if (muscle === "quads") {
      // The pendulum hack is the preferred Jaca pattern whenever the user
      // can perform it. Jaca remains the automatic intermediate option.
      if (profile.level === "advanced" && options.some(exercise => exercise.id === "pendulum"))
        options = options.sort((a, b) => Number(b.id === "pendulum") - Number(a.id === "pendulum"));
      const hasSquatMachine = day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === "quad-squat-machine");
      const hasExtension = day.exercises.some(p => lowerMovementFamily(getExercise(p.exerciseId, prefs)) === "quad-extension");
      // After a heavy jaca/pendulum, the useful next quad exercise is an
      // isolation extension. If a third quad exercise is needed, use the
      // press so the session contains three distinct patterns.
      if (hasSquatMachine && !hasExtension)
        options = options.sort((a, b) => Number(b.id === "leg-extension") - Number(a.id === "leg-extension"));
      else if (hasSquatMachine && hasExtension)
        options = options.sort((a, b) => Number(b.id === "leg-press") - Number(a.id === "leg-press"));
    }
    // Once a Jaca or Hack Pendular plus base quad work is in place, Prensa is
    // the preferred additional heavy pattern instead of stacking similar squats.
    if (muscle === "quads" &&
      currentVolume("quads") >= 4 &&
      [...overlappingQuadPatterns].some(id => exerciseUses(id) > 0)) {
      options = options.sort((a, b) => Number(b.id === "leg-press") - Number(a.id === "leg-press"));
    }
    const e = options[0];
    if (!e) return false;
    // A generated exercise is never given a partial or inflated prescription:
    // every automatic entry uses exactly two sets.
    if (targets[muscle] - currentVolume(muscle) < APP.defaultSets) return false;
    day.exercises.push(prescribe(e, prefs, `${day.id}-${e.id}`));
    used[muscle] = (used[muscle] ?? 0) + 1;
    if (e.pullPattern) lastPull = e.pullPattern;
    return true;
  };
  // Put glutes next to the other lower-body staples so their base work lands
  // on the leg day before a full-body day spends its limited heavy slots.
  const muscles: Muscle[] = ["quads", "glutes", "chest", "back", "hamstrings", "shoulders", "abs", "adductors", "calves", "biceps", "triceps"];
  if (profile.priority !== "balanced") muscles.sort((a, b) => Number(b === profile.priority) - Number(a === profile.priority));
  const addFullBodyHeavy = (day: Day, preferredMuscles: Muscle[]) => {
    for (const muscle of preferredMuscles) {
      if (targets[muscle] - currentVolume(muscle) < APP.defaultSets) continue;
      const exercise = candidates(muscle, profile, prefs, true).find(candidate =>
        isHeavyExercise(candidate) &&
        !day.exercises.some(entry => entry.exerciseId === candidate.id) &&
        heavyExerciseCount(day, prefs) < automaticHeavyExerciseLimit(day, count, profile) &&
        canUseExercise(day, candidate),
      );
      if (!exercise) continue;
      day.exercises.push(prescribe(exercise, prefs, `${day.id}-${exercise.id}`));
      used[muscle] = (used[muscle] ?? 0) + 1;
      if (exercise.pullPattern) lastPull = exercise.pullPattern;
      return true;
    }
    return false;
  };
  // A full-body session is built around two demanding patterns before its
  // accessory work: one torso movement and one lower-body movement. Alternating
  // chest/back and quad/hip-hinge priorities gives the week a balanced base.
  if (count === 2) {
    for (let index = 0; index < days.length; index++) {
      const day = days[index];
      addFullBodyHeavy(day, index % 2 === 0 ? ["chest", "back"] : ["back", "chest"]);
      addFullBodyHeavy(day, index % 2 === 0 ? ["quads", "hamstrings", "glutes"] : ["hamstrings", "quads", "glutes"]);
    }
  }
  // Seed the two lower accessories before general allocation so they are
  // deliberately split across leg days instead of both landing together.
  if (count >= 4) {
    const legDays = days.filter(day => day.name.startsWith("Pierna"));
    if (legDays.length === 2) {
      // Beginners and people over 48 use one heavy lower lift per leg day:
      // quads on A and hamstrings on B. Other levels retain the higher-volume
      // lower split with a quad compound at the start of both days.
      for (let index = 0; index < legDays.length; index++) {
        const day = legDays[index];
        const muscle: Muscle = conservativeLegSplit(profile) && index === 1 ? "hamstrings" : "quads";
        if (targets[muscle] - currentVolume(muscle) < APP.defaultSets) continue;
        const preferred = muscle === "hamstrings"
          ? ["rdl-smith", "rdl", "deadlift"]
          : (index === 0 ? ["leg-press", "squat-smith"] : ["squat-smith", "leg-press"]);
        const compound = candidates(muscle, profile, prefs, true)
          .filter(candidate => isHeavyExercise(candidate) &&
            !day.exercises.some(entry => entry.exerciseId === candidate.id) &&
            heavyExerciseCount(day, prefs) < automaticHeavyExerciseLimit(day, count, profile) &&
            canUseExercise(day, candidate))
          .sort((a, b) => preferred.indexOf(a.id) - preferred.indexOf(b.id))[0];
        if (!compound) continue;
        day.exercises.push(prescribe(compound, prefs, `${day.id}-${compound.id}`));
        used[muscle] = (used[muscle] ?? 0) + 1;
      }
      const addRequiredLowerIsolation = (day: Day, muscle: "quads" | "hamstrings", ids: string[]) => {
        const exercise = candidates(muscle, profile, prefs, true).find(candidate =>
          ids.includes(candidate.id) &&
          !day.exercises.some(entry => entry.exerciseId === candidate.id) &&
          canUseExercise(day, candidate),
        );
        if (!exercise) return;
        day.exercises.push(prescribe(exercise, prefs, `${day.id}-${exercise.id}`));
        used[muscle] = (used[muscle] ?? 0) + 1;
      };
      for (let index = 0; index < legDays.length; index++) {
        addRequiredLowerIsolation(legDays[index], "quads", ["leg-extension"]);
        addRequiredLowerIsolation(legDays[index], "hamstrings",
          index === 0 ? ["seated-curl", "lying-curl"] : ["lying-curl", "seated-curl"]);
      }
      add(legDays[0], "adductors");
      add(legDays[1], "calves");
    }
  }
  if (profile.priority !== "balanced") {
    for (const day of days.slice(0, 3)) add(day, profile.priority);
  }
  // Cover each group first. Repeated rounds distribute exposure across the week.
  for (let round = 0; round < 30; round++) {
    let changed = false;
    for (const muscle of muscles) {
      if (targets[muscle] <= currentVolume(muscle)) continue;
      const possible = days.filter(d => allowed(d, muscle) && d.exercises.length < exerciseLimit(profile.level));
      possible.sort((a, b) =>
        a.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length - b.exercises.filter(p => getExercise(p.exerciseId, prefs).muscle === muscle).length
        || a.exercises.length - b.exercises.length);
      for (const day of possible) if (add(day, muscle)) { changed = true; break; }
    }
    if (!changed) break;
  }
  // Automatic sessions start with at least five exercises. If core work did
  // not fill the session, add distinct compatible accessories; users remain
  // free to remove any exercise from the editor.
  const addAccessory = (day: Day, preferred: Muscle[]) => {
    for (const muscle of preferred) {
      if (["adductors", "calves"].includes(muscle) && day.exercises.some(entry =>
        getExercise(entry.exerciseId, prefs).muscle === muscle,
      )) continue;
      const otherLegHasAccessory = days
        .filter(candidate => candidate.id !== day.id && candidate.name.startsWith("Pierna"))
        .some(candidate => candidate.exercises.some(entry =>
          getExercise(entry.exerciseId, prefs).muscle === muscle,
        ));
      if (["adductors", "calves"].includes(muscle) && otherLegHasAccessory) continue;
      const exercise = candidates(muscle, profile, prefs)
        .find(candidate =>
          candidate.type === "isolation" &&
          !day.exercises.some(entry => entry.exerciseId === candidate.id) &&
          canUseExercise(day, candidate),
        );
      if (!exercise) continue;
      day.exercises.push(prescribe(exercise, prefs, `${day.id}-${exercise.id}`));
      return true;
    }
    return false;
  };
  for (const day of days) {
    const legDays = days.filter(candidate => candidate.name.startsWith("Pierna"));
    const legIndex = legDays.findIndex(candidate => candidate.id === day.id);
    const preferred = day.name.startsWith("Torso")
      ? ["biceps", "triceps", "shoulders", "chest", "back"] as Muscle[]
      : day.name.startsWith("Pierna")
        ? (legIndex === 1
          ? ["calves", "abs", "hamstrings", "quads", "adductors"]
          : ["adductors", "abs", "hamstrings", "quads", "calves"]) as Muscle[]
        : ["biceps", "triceps", "shoulders", "quads", "hamstrings", "chest", "back"] as Muscle[];
    while (day.exercises.length < 5 && addAccessory(day, preferred)) {
      // Continue only while another compatible accessory exists.
    }
  }
  return days.map(d => ({ ...d, exercises: orderExercises(d.exercises, prefs) }));
}
