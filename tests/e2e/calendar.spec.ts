import { expect, test } from "@playwright/test";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { getExercise, prescribe } from "../../src/logic/routine";
import { isoWeekday, localDateKey } from "../../src/logic/schedule";
import { AppState, Day } from "../../src/types";

const atNoon = (date: Date) => { const value = new Date(date); value.setHours(12, 0, 0, 0); return value; };
test("routine calendar edits a registered workout and only the chosen future session", async ({ page }) => {
  const yesterday = atNoon(new Date()); yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = atNoon(new Date()); tomorrow.setDate(tomorrow.getDate() + 1);
  const exercise = getExercise("chest-press", emptyPreferences);
  const day: Day = { id: "day-0", name: "Sesión de prueba", exercises: [prescribe(exercise, emptyPreferences, "press")] };
  const state: AppState = {
    version: 1, completed: true, onboardingStep: 0, theme: "system", profile: { ...demoProfile, days: 1, trainingDays: [1] }, preferences: emptyPreferences, routine: [day],
    history: [{ id: "past", dayId: day.id, dayName: day.name, date: yesterday.toISOString(), minutes: 20, records: [{ prescription: day.exercises[0], name: exercise.name, type: exercise.type, sets: [{ weight: 20, reps: 8 }, { weight: 20, reps: 8 }] }] }],
    plannedWorkouts: [{ date: tomorrow.toISOString(), dayId: day.id, day: { ...day, exercises: [{ ...day.exercises[0], weight: 25 }] } }],
  };
  await page.goto("/");
  await page.evaluate(value => localStorage.setItem("gym60:state:v1", JSON.stringify(value)), state);
  await page.goto("/routine");
  await expect(page.getByText("Calendario de entrenamiento", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Semana", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: new RegExp(`${yesterday.toLocaleDateString("es")}.*entrenamiento registrado`, "i") }).click();
  await page.getByRole("textbox", { name: `Peso ${exercise.name}, serie 1`, exact: true }).fill("22,5");
  await page.getByRole("button", { name: "Guardar corrección", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).history[0].records[0].sets[0].weight)).toBe(22.5);
  await page.getByRole("button", { name: new RegExp(`${tomorrow.toLocaleDateString("es")}.*Sesión de prueba`) }).click();
  await page.getByRole("textbox", { name: `Peso para ${exercise.name}`, exact: true }).fill("37,5");
  await page.getByRole("button", { name: "Guardar pesos para esta sesión", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.plannedWorkouts).toHaveLength(1);
  expect(saved.plannedWorkouts[0].day.exercises[0].weight).toBe(37.5);
  expect(saved.routine[0].exercises[0].weight).toBe(0);
  expect(localDateKey(saved.plannedWorkouts[0].date)).toBe(localDateKey(tomorrow));
  await page.screenshot({ path: "test-results/routine-calendar.png" });
});

test("routine calendar can move, remove and insert a future session", async ({ page }) => {
  const tomorrow = atNoon(new Date()); tomorrow.setDate(tomorrow.getDate() + 1);
  const target = atNoon(new Date()); target.setDate(target.getDate() + 2);
  const exercise = getExercise("chest-press", emptyPreferences);
  const day: Day = { id: "flex", name: "Sesion flexible", exercises: [prescribe(exercise, emptyPreferences, "flex-press")] };
  const state: AppState = {
    version: 1, completed: true, onboardingStep: 0, theme: "system",
    profile: { ...demoProfile, days: 1, trainingDays: [isoWeekday(tomorrow)] }, preferences: emptyPreferences, routine: [day], history: [],
  };
  await page.goto("/");
  await page.evaluate(value => localStorage.setItem("gym60:state:v1", JSON.stringify(value)), state);
  await page.goto("/routine");
  await page.getByRole("button", { name: new RegExp(`${tomorrow.toLocaleDateString("es")}.*Sesion flexible`) }).click();
  await page.getByRole("button", { name: /Mover esta/ }).click();
  await page.getByRole("button", { name: new RegExp(`${target.toLocaleDateString("es")}.*descanso`, "i") }).click();
  await page.getByRole("button", { name: /Mover aqu/ }).click();
  let saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.skippedWorkoutDates).toContain(localDateKey(tomorrow));
  expect(localDateKey(saved.plannedWorkouts[0].date)).toBe(localDateKey(target));
  await page.getByRole("button", { name: /Quitar sesi/ }).click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.plannedWorkouts).toHaveLength(0);
  await page.getByRole("button", { name: /calendario/ }).click();
  await page.getByRole("radio", { name: /Sesion flexible/ }).first().click();
  saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(localDateKey(saved.plannedWorkouts[0].date)).toBe(localDateKey(target));
});
