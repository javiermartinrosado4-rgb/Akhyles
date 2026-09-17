import { test, expect, Page } from "@playwright/test";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { getExercise, prescribe } from "../../src/logic/routine";
import { startWorkout } from "../../src/logic/workout";
import { AppState, Weekday } from "../../src/types";

const seed = (): AppState => ({ version: 1, completed: true, onboardingStep: 0, programRevision: 2, theme: "system", profile: { ...demoProfile, days: 1, trainingDays: [(new Date().getDay() || 7) as Weekday] }, preferences: emptyPreferences, history: [], routine: [{ id: "day", name: "Mi sesión", exercises: [prescribe(getExercise("chest-press", emptyPreferences), emptyPreferences)] }] });
async function load(page: Page, state: AppState, path = "/today") {
  await page.route("**:8082/auth/google/config", route => route.fulfill({ json: { clientId: "", nonce: "" } }));
  await page.goto("/");
  await page.evaluate(s => localStorage.setItem("gym60:state:v1", JSON.stringify(s)), state);
  await page.goto(path);
  if (path === "/today") await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
}
test("resume only from Today, restore two sets, finish once and show calories", async ({ page }) => {
  const state = seed();
  state.active = startWorkout(state.routine[0], "80");
  state.active.day.exercises[0].sets = 4;
  state.active.draft = Array.from({ length: 4 }, () => ({ weight: "30", reps: "" }));
  await load(page, state);
  await page.getByRole("button", { name: "Continuar entrenamiento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Peso total serie / })).toHaveCount(2);
  await page.getByRole("textbox", { name: "Notas para este ejercicio", exact: true }).fill("Pecho apoyado y hombros abajo.");
  await page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true }).fill("8");
  await page.getByRole("button", { name: "Guardar y salir", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Continuar entrenamiento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Notas para este ejercicio", exact: true })).toHaveValue("Pecho apoyado y hombros abajo.");
  await expect(page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true })).toHaveValue("8");
  await page.getByRole("textbox", { name: "Repeticiones serie 2", exact: true }).fill("8");
  await page.getByRole("button", { name: "Finalizar entrenamiento", exact: true }).click();
  await expect(page.getByText(/≈ \d+ kcal/, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Volver a Entrenamiento", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Continuar entrenamiento", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Iniciar entrenamiento", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).history.length)).toBe(1);
});
test("Today uses the date's planned workout instead of yesterday's unfinished one", async ({ page }) => {
  const state = seed();
  const torso = state.routine[0];
  const leg = {
    id: "leg",
    name: "Pierna",
    exercises: [prescribe(getExercise("leg-extension", emptyPreferences), emptyPreferences)],
  };
  state.routine = [torso, leg];
  state.plannedWorkouts = [{ date: new Date().toISOString(), dayId: leg.id, day: leg }];
  state.active = startWorkout(torso, "80");
  state.active.startedAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await load(page, state);
  await expect(page.getByText("Pierna", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar entrenamiento", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Iniciar entrenamiento", exact: true })).toBeVisible();
});
test("third heavy exercise is editable and profile changes preserve the routine", async ({ page }) => {
  const state = seed();
  state.profile = { ...demoProfile, days: 4, trainingDays: [1, 2, 4, 5] };
  state.routine[0].exercises.push(prescribe(getExercise("seated-press", emptyPreferences), emptyPreferences));
  await load(page, state);
  await page.getByRole("button", { name: "Añadir ejercicio", exact: true }).click();
  await page.getByRole("button", { name: "Crear ejercicio personalizado", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre del ejercicio", exact: true }).fill("Tercer pesado libre");
  await page.getByRole("radio", { name: "Multiarticular", exact: true }).click();
  await page.getByRole("button", { name: "Guardar ejercicio personalizado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Ver detalles de Tercer pesado libre", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByRole("button", { name: "Editar perfil y gimnasio", exact: true }).click();
  await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("img", { name: "Avatar Montaña", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.profile.avatar).toBe("mountain");
  expect(saved.routine[0].exercises).toHaveLength(3);
  await page.getByRole("button", { name: "Ejercicios recomendados y favoritos", exact: true }).click();
  await page.getByRole("button", { name: "Tier Espalda", exact: true }).click();
  await expect(page.getByText("S · Prioridad alta", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Marcar favorito", exact: true }).first().click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).preferences.favorites?.length)).toBe(1);
  await page.reload();
  expect((await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).preferences.favorites)).length).toBe(1);
  await page.screenshot({ path: "test-results/tiers-updates.png" });
});

test("a moved session keeps its current two-set prescription when it starts", async ({ page }) => {
  const state = seed();
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  state.profile = { ...state.profile, trainingDays: [(tomorrow.getDay() || 7) as Weekday] };
  state.plannedWorkouts = [{
    date: new Date().toISOString(),
    dayId: state.routine[0].id,
    day: { ...state.routine[0], exercises: state.routine[0].exercises.map(entry => ({ ...entry, sets: 4 })) },
  }];
  await load(page, state);
  await page.getByRole("button", { name: "Iniciar entrenamiento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: /^Peso total serie / })).toHaveCount(2);
});

test("exercise replacement suggests matching patterns with tiers and keeps custom input open", async ({ page }) => {
  const state = seed();
  state.routine[0].exercises = [prescribe(getExercise("wide-pulldown", emptyPreferences), emptyPreferences)];
  await load(page, state);
  await page.getByRole("button", { name: "Editar ejercicio 1", exact: true }).click();
  await page.getByRole("button", { name: "Sustituir ejercicio", exact: true }).click();
  await expect(page.getByText("Sugerencias compatibles, ordenadas por patrón y tier.", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Jalón Neutro", exact: true })).toBeVisible();
  await expect(page.getByText("Tier S", { exact: true }).first()).toBeVisible();
  await page.getByRole("textbox", { name: "Buscar o escribir otro ejercicio", exact: true }).fill("Mi jalón personalizado");
  await expect(page.getByRole("button", { name: "Crear “Mi jalón personalizado” como ejercicio personalizado", exact: true })).toBeVisible();
});

test("routine regeneration keeps two-set blocks with a one-set target and manual additions stay available", async ({ page }) => {
  const state = seed();
  state.routine[0].exercises = Array.from({ length: 6 }, (_, index) => ({
    ...state.routine[0].exercises[0],
    id: `manual-${index}`,
  }));
  await load(page, state);
  await expect(page.getByRole("button", { name: "Añadir ejercicio", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Regenerar y ajustar series", exact: true }).click();
  await page.getByRole("textbox", { name: "Series semanales de Pecho", exact: true }).fill("1");
  await page.getByRole("button", { name: "Aplicar y regenerar", exact: true }).click();
  await expect(page.getByText("Rutina regenerada con tus series semanales. Las cargas guardadas se mantienen.", { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).volumeTargets.chest)).toBe(1);
  await page.reload();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.getByRole("button", { name: "Regenerar y ajustar series", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Series semanales de Pecho", exact: true })).toHaveValue("1");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  const chest = saved.routine.flatMap((day: { exercises: { exerciseId: string; sets: number }[] }) => day.exercises)
    .find((entry: { exerciseId: string }) => entry.exerciseId === "chest-press" || entry.exerciseId === "chest-cable");
  expect(chest).toBeUndefined();
});

test("exercise replacement updates the same-day plan immediately", async ({ page }) => {
  const state = seed();
  state.routine[0].exercises = [prescribe(getExercise("wide-pulldown", emptyPreferences), emptyPreferences)];
  state.plannedWorkouts = [{ date: new Date().toISOString(), dayId: state.routine[0].id, day: { ...state.routine[0], exercises: state.routine[0].exercises.map(entry => ({ ...entry, weight: 42 })) } }];
  state.active = startWorkout(state.routine[0], "80");
  await load(page, state);
  await page.goto("/today");
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.getByRole("button", { name: "Editar ejercicio 1", exact: true }).click();
  await page.getByRole("button", { name: "Sustituir ejercicio", exact: true }).click();
  await page.getByRole("radio", { name: "Jalón Neutro", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.routine[0].exercises[0].exerciseId).toBe("neutral-pulldown");
  expect(saved.plannedWorkouts[0].day.exercises[0].exerciseId).toBe("neutral-pulldown");
  expect(saved.active.day.exercises[0].exerciseId).toBe("neutral-pulldown");
});

test("replacing an exercise already recorded keeps its completed work in the active session", async ({ page }) => {
  const state = seed();
  state.routine[0].exercises = [prescribe(getExercise("wide-pulldown", emptyPreferences), emptyPreferences)];
  state.active = startWorkout(state.routine[0], "80");
  const original = state.active.day.exercises[0];
  state.active.records = [{ prescription: original, name: "Jalón al pecho", type: "compound", sets: [{ weight: 42, reps: 10 }] }];
  await load(page, state);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).active.records.length)).toBe(1);
  await page.getByRole("button", { name: "Editar ejercicio 1", exact: true }).click();
  await page.getByRole("button", { name: "Sustituir ejercicio", exact: true }).click();
  await page.getByRole("radio", { name: "Jalón Neutro", exact: true }).click();
  await expect(page.getByText("El ejercicio ya registrado se conserva en esta sesión. El cambio se aplicará a las próximas sesiones.", { exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.routine[0].exercises[0].exerciseId).toBe("neutral-pulldown");
  expect(saved.active.day.exercises[0].exerciseId).toBe("wide-pulldown");
  expect(saved.active.records[0].prescription.exerciseId).toBe("wide-pulldown");
  await page.getByRole("button", { name: "Iniciar entrenamiento", exact: true }).click();
  await expect(page.getByText("Ejercicio registrado · puedes corregirlo", { exact: true })).toBeVisible();
  await expect(page.getByText("Jalón al pecho", { exact: true }).first()).toBeVisible();
});
