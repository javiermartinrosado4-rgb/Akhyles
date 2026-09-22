import { emptyPreferences } from "./options";
import { getExercise, generateRoutine, prescribe } from "../logic/routine";
import { localDateKey, routineSchedule, startOfWeek } from "../logic/schedule";
import { AppState, Day, Preferences, Profile, Workout } from "../types";

const currentProfile: Profile = {
  name: "Álex Martín",
  handle: "alex_entrena",
  sex: "male",
  age: "29",
  height: "178",
  weight: "76,8",
  weightReminder: true,
  level: "intermediate",
  days: 5,
  trainingDays: [1, 2, 3, 4, 5],
  priority: "shoulders",
  mesocycle: true,
};

const fourDayProfile: Profile = {
  ...currentProfile,
  days: 4,
  trainingDays: [1, 2, 4, 5],
  priority: "balanced",
  mesocycle: false,
};

/** A contrasting profile to exercise the same flows with different training choices. */
const femaleProfile: Profile = {
  name: "Lucía Ortega",
  handle: "lucia_fuerza",
  sex: "female",
  age: "34",
  height: "165",
  weight: "61,4",
  weightReminder: true,
  level: "advanced",
  days: 4,
  trainingDays: [1, 3, 5, 7],
  priority: "glutes",
  includeGlutes: true,
  mesocycle: true,
};

const femaleFourDayProfile: Profile = {
  ...femaleProfile,
  days: 3,
  trainingDays: [1, 3, 5],
  priority: "balanced",
  mesocycle: false,
};

const preferences: Preferences = {
  ...emptyPreferences,
  // Máquinas que este gimnasio no tiene: el generador debe ofrecer alternativas.
  unavailable: ["hack", "pendulum", "chest-press", "shoulder-press", "lateral-machine", "rear-machine", "supported-row"],
  favorites: ["shoulder-press-free", "lateral-cable", "t-row", "leg-press"],
  names: { "t-row": "Remo en T", "shoulder-press-free": "Press militar con mancuernas" },
  notes: {
    "shoulder-press-free": "Banco a 75°. Mantener 2 RIR.",
    "lateral-cable": "Unilateral, sin balanceo.",
    "leg-press": "La prensa horizontal está disponible; la hack no.",
  },
  weights: {
    "shoulder-press-free": 26,
    "lateral-cable": 12.5,
    "t-row": 62.5,
    "leg-press": 140,
    "rdl-smith": 70,
    "leg-extension": 55,
    "seated-curl": 48,
    "lying-curl": 42,
    "bench-smith": 65,
    "dumbbell-bench": 30,
    "wide-pulldown": 60,
    "neutral-pulldown": 65,
  },
};

const femalePreferences: Preferences = {
  ...emptyPreferences,
  unavailable: ["hack", "pendulum", "hip-thrust", "abductor", "lying-curl", "shoulder-press"],
  favorites: ["rdl-smith", "leg-press", "bulgarian-free", "lateral-cable", "t-row"],
  names: { "rdl-smith": "Peso muerto rumano en Smith", "t-row": "Remo en T", "lateral-cable": "Elevación lateral en polea" },
  notes: {
    "rdl-smith": "Usa correas si el agarre limita. Tempo 3-1-1.",
    "leg-press": "Plataforma ocupada a veces: sustituir por zancada búlgara.",
    "lateral-cable": "Registrar el peso por lado.",
  },
  weights: { "rdl-smith": 72.5, "leg-press": 165, "bulgarian-free": 20, "t-row": 47.5, "lateral-cable": 7.5, "seated-curl": 43, "leg-extension": 50, "wide-pulldown": 52 },
  ranges: { "rdl-smith": [6, 9], "bulgarian-free": [8, 12], "lateral-cable": [12, 18] },
};

const advancedMachineProfile: Profile = {
  name: "Marcos Vidal",
  handle: "marcos_avanza",
  sex: "male",
  age: "31",
  height: "181",
  weight: "82,2",
  weightReminder: true,
  level: "advanced",
  days: 4,
  trainingDays: [1, 2, 4, 5],
  priority: "balanced",
  mesocycle: false,
};

const advancedMachinePreferences: Preferences = {
  ...emptyPreferences,
  favorites: ["chest-press", "supported-row", "leg-press", "seated-curl", "leg-extension"],
  weights: {
    "chest-press": 78,
    "supported-row": 72,
    "shoulder-press": 48,
    "lateral-machine": 36,
    "preacher-curl": 34,
    "triceps-machine": 46,
    "pec-deck": 68,
    "wide-pulldown": 76,
    "seated-press": 74,
    "leg-press": 190,
    "rdl-smith": 112,
    "leg-extension": 74,
    "seated-curl": 64,
    "lying-curl": 58,
    "adductor-machine": 76,
    "standing-calf": 92,
    "leg-press-calf": 170,
    "machine-crunch": 62,
  },
};

function machineDay(id: string, name: string, exerciseIds: string[], preferences: Preferences): Day {
  return {
    id,
    name,
    exercises: exerciseIds.map((exerciseId, index) => prescribe(getExercise(exerciseId, preferences), preferences, id + "-" + index)),
  };
}

function advancedMachineRoutine(preferences: Preferences): Day[] {
  return [
    machineDay("torso-a", "Torso A", ["chest-press", "supported-row", "shoulder-press", "lateral-machine", "preacher-curl", "triceps-machine"], preferences),
    machineDay("pierna-a", "Pierna A", ["leg-press", "rdl-smith", "leg-extension", "seated-curl", "adductor-machine", "standing-calf"], preferences),
    machineDay("torso-b", "Torso B", ["pec-deck", "wide-pulldown", "seated-press", "lateral-machine", "preacher-curl", "triceps-machine"], preferences),
    machineDay("pierna-b", "Pierna B", ["leg-press", "lying-curl", "leg-extension", "leg-press-calf", "adductor-machine", "machine-crunch"], preferences),
  ];
}

function createMachineScenario(profile: Profile, preferences: Preferences, weeks: number, startingWeight: number, weeklyWeightChange: number, now = new Date()): AppState {
  const routine = advancedMachineRoutine(preferences);
  const start = startOfWeek(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  start.setHours(10, 0, 0, 0);
  const history: Workout[] = [];
  for (let week = 0; week < weeks; week++) {
    for (const [index, item] of routineSchedule(profile, routine).entries()) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + item.weekday - 1);
      if (localDateKey(date) >= localDateKey(now)) continue;
      const completed = workout(item.day, date, week, index, preferences, startingWeight, weeklyWeightChange);
      completed.level = profile.level;
      completed.sex = profile.sex;
      completed.startedAt = date.toISOString();
      history.push(completed);
    }
  }
  const bodyWeights = Array.from({ length: weeks }, (_, week) => {
    const date = new Date(start);
    date.setDate(start.getDate() + week * 7);
    return { date: date.toISOString(), weight: Number((startingWeight - week * weeklyWeightChange).toFixed(1)) };
  });
  return JSON.parse(JSON.stringify({
    version: 1,
    completed: true,
    onboardingStep: 0,
    theme: "dark",
    programRevision: 1,
    profile,
    preferences,
    routine,
    history,
    bodyWeights,
    routineVersions: [{ effectiveFrom: localDateKey(start), profile, routine }],
  })) as AppState;
}

/** Two years of continuous, machine-heavy torso/leg training for local visual review. */
export function createAdvancedMachineDemoScenario(now = new Date()): AppState {
  return createMachineScenario(advancedMachineProfile, advancedMachinePreferences, 105, 86.3, 4.1 / 104, now);
}

/** A connected friend with six months of consistent machine-based torso/leg training. */
export function createCommunityFriendDemoScenario(now = new Date()): AppState {
  const profile: Profile = {
    ...advancedMachineProfile,
    name: "Leo Serrano",
    handle: "leo_entrena",
    age: "26",
    height: "176",
    weight: "74,8",
    level: "intermediate",
  };
  const preferences: Preferences = {
    ...advancedMachinePreferences,
    favorites: ["chest-press", "leg-press", "seated-curl"],
    weights: Object.fromEntries(Object.entries(advancedMachinePreferences.weights).map(([id, weight]) => [id, Math.round(weight * 0.68 * 4) / 4])),
  };
  return createMachineScenario(profile, preferences, 27, 76.1, 1.3 / 26, now);
}

const baseLoad = (muscle: string, compound: boolean) => {
  if (muscle === "quads") return compound ? 110 : 48;
  if (muscle === "hamstrings") return compound ? 62 : 38;
  if (muscle === "back") return compound ? 48 : 32;
  if (muscle === "chest") return compound ? 52 : 25;
  if (muscle === "shoulders") return compound ? 18 : 8;
  if (muscle === "calves") return 45;
  return 18;
};

function workout(day: Day, date: Date, week: number, sequence: number, prefs: Preferences, startingWeight: number, weeklyWeightChange = 0.14, progressWeek = week): Workout {
  return {
    id: `demo-${week}-${sequence}-${day.id}`,
    dayId: day.id,
    dayName: day.name,
    date: date.toISOString(),
    startedAt: new Date(date.getTime() + 18 * 60 * 60 * 1000).toISOString(),
    minutes: 58 + (sequence % 3) * 5,
    level: "intermediate",
    bodyWeight: Number((startingWeight - week * weeklyWeightChange).toFixed(1)),
    records: day.exercises.map((prescription, index) => {
      const exercise = getExercise(prescription.exerciseId, prefs);
      const initial = prefs.weights[exercise.id] ?? baseLoad(exercise.muscle, exercise.type === "compound");
      const gain = exercise.type === "compound" ? progressWeek * 0.8 : progressWeek * 0.3;
      const weight = Math.round(Math.max(2.5, initial - 9 + gain + (sequence % 2) * 0.5) * 4) / 4;
      return {
        prescription: { ...prescription, weight },
        name: prefs.names[exercise.id] ?? exercise.name,
        type: exercise.type,
        sets: Array.from({ length: prescription.sets }, (_, set) => ({
          weight,
          reps: Math.min(prescription.range[1], 8 + ((week + index + set) % 4)),
        })),
      };
    }),
  };
}


/** Recover a missing field in our old fictitious fixtures, never infer real demographics. */
export function repairLegacyDemoScores(state: AppState): AppState {
  const fixture = [currentProfile, femaleProfile].find(profile =>
    state.profile.name === profile.name && state.profile.handle === profile.handle);
  if (!fixture) return state;
  let changed = false;
  const history = state.history.map(workout => {
    if (workout.sex !== undefined || !/^demo-\d+-\d+-/.test(workout.id)) return workout;
    changed = true;
    return { ...workout, sex: fixture.sex };
  });
  return changed ? { ...state, history } : state;
}

export function createDemoScenario(female = false, now = new Date()): AppState {
  const profile = { ...(female ? femaleProfile : currentProfile) };
  const previousProfile = { ...(female ? femaleFourDayProfile : fourDayProfile) };
  const prefs = female ? femalePreferences : preferences;
  const oldRoutine = generateRoutine(previousProfile, prefs);
  const routine = generateRoutine(profile, prefs);
  const weeks = female ? 105 : 12;
  const start = startOfWeek(now);
  start.setDate(start.getDate() - (weeks - 1) * 7);
  start.setHours(10, 0, 0, 0);
  const revisedOn = new Date(start);
  const revisionWeek = female ? 52 : 8;
  revisedOn.setDate(start.getDate() + revisionWeek * 7);
  const currentWeight = Number(profile.weight.replace(",", "."));
  const startingWeight = currentWeight + (female ? 4.8 : 1.66);
  const weeklyWeightChange = (startingWeight - currentWeight) / (weeks - 1);
  const history: Workout[] = [];
  const cancelled: string[] = [];
  for (let week = 0; week < weeks; week++) {
    const phaseProfile = week < revisionWeek ? previousProfile : profile;
    const phaseRoutine = week < revisionWeek ? oldRoutine : routine;
    for (const [index, item] of routineSchedule(phaseProfile, phaseRoutine).entries()) {
      const date = new Date(start);
      date.setDate(start.getDate() + week * 7 + item.weekday - 1);
      if (localDateKey(date) >= localDateKey(now)) continue;
      // Known absences remain visible; a deliberately cancelled day is a rest day.
      if (week === 4 && index === 0) { cancelled.push(localDateKey(date)); continue; }
      if ((week === 5 && index === 1) || (week === 9 && index > 0)) continue;
      const progressWeek = female ? week * 12 / (weeks - 1) : week;
      const completed = workout(item.day, date, week, index, prefs, startingWeight, weeklyWeightChange, progressWeek);
      completed.level = phaseProfile.level;
      completed.sex = phaseProfile.sex;
      completed.startedAt = date.toISOString();
      // Fictitious benchmark sets exercise the complete, sex-adjusted score.
      if (week % 4 === 0 && index === 0) {
        completed.dayName += " · básicos de referencia";
        for (const [exerciseId, base] of [["squat-free", female ? 35 : 65], ["chest-press-free", female ? 15 : 45], ["deadlift-conventional", female ? 45 : 85]] as const) {
          if (completed.records.some(record => record.prescription.exerciseId === exerciseId)) continue;
          const exercise = getExercise(exerciseId, prefs);
          const weight = base + progressWeek * 0.5;
          completed.records.push({ name: exercise.name, type: "compound",
            prescription: { id: `benchmark-${exerciseId}`, exerciseId, sets: 1, range: [5, 5], weight },
            sets: [{ weight, reps: 5 }],
          });
        }
      }
      if (week === 6 && index === 1 && completed.records.length) {
        completed.records[0].sets = completed.records[0].sets.slice(0, 1);
        const omitted = completed.records.pop();
        completed.skipped = omitted ? [omitted.prescription.id] : [];
      }
      if (week === 10 && index === 0 && completed.records.length) {
        const record = completed.records[0];
        record.sets = Array.from({ length: 6 }, (_, set) => ({ weight: record.sets[0].weight, reps: 12 - set }));
      }
      history.push(completed);
    }
  }
  const tomorrow = new Date(now); tomorrow.setHours(12, 0, 0, 0); tomorrow.setDate(tomorrow.getDate() + 1);
  return JSON.parse(JSON.stringify({
    version: 1, completed: true, onboardingStep: 0, theme: "dark", programRevision: 7,
    profile, preferences: prefs, routine, history,
    routineVersions: [
      { effectiveFrom: localDateKey(start), profile: previousProfile, routine: oldRoutine },
      { effectiveFrom: localDateKey(revisedOn), profile, routine },
    ],
    plannedWorkouts: [{ date: tomorrow.toISOString(), dayId: routine[0].id, day: routine[0] }],
    skippedWorkoutDates: cancelled,
    bodyWeights: Array.from({ length: Math.floor(((weeks - 1) * 7) / 14) + 1 }, (_, index) => index * 14).map(days => {
      const date = new Date(start); date.setDate(start.getDate() + days);
      const trend = startingWeight - days / 7 * weeklyWeightChange;
      const variation = female ? Math.sin(days / 24) * 0.22 : 0;
      return { date: date.toISOString(), weight: Number((trend + variation).toFixed(1)) };
    }),
  })) as AppState;
}
