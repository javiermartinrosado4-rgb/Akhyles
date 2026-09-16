import { test, expect, Page } from "@playwright/test";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { displayName, generateRoutine } from "../../src/logic/routine";
import { AppState, Weekday, Workout } from "../../src/types";
const seed = (): AppState => ({ version: 1, profile: demoProfile, preferences: emptyPreferences, completed: true, onboardingStep: 0, theme: "system", programRevision: 2, routine: generateRoutine(demoProfile, emptyPreferences), history: [] });
async function load(page: Page, state: AppState) {
  // Training now starts from today's calendar, not from a per-day start button.
  state = { ...state, plannedWorkouts: [{ date: new Date().toISOString(), dayId: state.routine[0].id, day: state.routine[0] }] };
  await page.goto("/");
  await page.evaluate(s => localStorage.setItem("gym60:state:v1", JSON.stringify(s)), state);
  await page.goto("/today");
}
test("Today previews every planned exercise before training starts", async ({ page }) => {
  const state = seed();
  await load(page, state);
  const preview = page.getByTestId("session-preview");
  await expect(preview.getByText("Vista previa completa", { exact: true })).toBeVisible();
  for (const entry of state.routine[0].exercises)
    await expect(preview.getByText(displayName(entry.exerciseId, state.preferences), { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar entrenamiento", exact: true })).toBeVisible();
});
test("reorder, profile edits during a workout, community and local logout survive reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  const initial = seed();
  await load(page, initial);
  await expect(page).toHaveTitle(/Akhyles/);
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.getByRole("button", { name: "Bajar ejercicio 1", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).routine[0].exercises[0].id)).toBe(initial.routine[0].exercises[1].id);
  await page.reload();
  await page.getByRole("button", { name: "Iniciar entrenamiento", exact: true }).click();
  await page.getByRole("textbox", { name: "Peso total serie 1", exact: true }).fill("35");
  await page.getByRole("button", { name: "Guardar y salir", exact: true }).click();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByRole("button", { name: "Editar perfil y gimnasio", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Javier");
  await page.getByRole("textbox", { name: "Nombre de usuario (@)", exact: true }).fill("javier_gym");
  await page.getByRole("textbox", { name: "Peso corporal", exact: true }).fill("78");
  await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
  await expect(page.getByText("Datos personales actualizados.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Comunidad", exact: true }).click();
  await expect(page.getByText("@javier_gym", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Progreso", exact: true }).click();
  await expect(page.getByText("Peso corporal · siempre visible", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/akhyles-progreso.png" });
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page.getByRole("button", { name: "Cerrar sesión", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Continuar con mi perfil", exact: true })).toBeVisible();
  await page.goto("/workout");
  await expect(page.getByRole("button", { name: "Continuar con mi perfil", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar con mi perfil", exact: true }).click();
  await page.getByRole("button", { name: "Continuar entrenamiento", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toHaveValue("35");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.active.bodyWeight).toBe(76.5);
  expect(saved.profile.weight).toBe("78");
  expect(saved.routine[0].exercises[0].id).toBe(initial.routine[0].exercises[1].id);
  expect(errors).toEqual([]);
});
test("old plans remain intact until updating the new rules and small viewports fit", async ({ page }) => {
  const state = seed();
  delete state.programRevision;
  delete state.profile.name;
  delete state.profile.handle;
  state.routine[0].exercises[0].sets = 6;
  await load(page, state);
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await expect(page.getByRole("button", { name: "Actualizar rutina a nuevas reglas", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Actualizar rutina a nuevas reglas", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Actualizar rutina a nuevas reglas", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Comunidad", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Usuario de Comunidad", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/akhyles-comunidad.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test("workout arrows preserve drafts and skipped exercises only affect today's session", async ({ page }) => {
  const state = seed();
  const exerciseCount = state.routine[0].exercises.length;
  const routineIds = state.routine[0].exercises.map((entry) => entry.id);
  await load(page, state);
  await page.getByRole("button", { name: "Iniciar entrenamiento", exact: true }).click();
  await page.getByRole("textbox", { name: "Peso total serie 1", exact: true }).fill("35");
  await page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true }).fill("8");
  await page.getByRole("button", { name: "Ejercicio siguiente", exact: true }).click();
  await page.getByRole("button", { name: "Ejercicio anterior", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toHaveValue("35");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true })).toHaveValue("8");
  const weights = page.getByRole("textbox", { name: /^Peso total serie / });
  const repetitions = page.getByRole("textbox", { name: /^Repeticiones serie / });
  for (let i = 0; i < await weights.count(); i++) {
    await weights.nth(i).fill("35");
    await repetitions.nth(i).fill("8");
  }
  await page.getByRole("button", { name: "Guardar y siguiente ejercicio", exact: true }).click();
  for (let i = 1; i < exerciseCount; i++)
    await page.getByRole("button", { name: "Hoy no he podido hacer este ejercicio", exact: true }).click();
  await expect(page.getByText(/Hoy no has podido hacer:/)).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!));
  expect(saved.history.at(-1).records).toHaveLength(1);
  expect(saved.history.at(-1).skipped).toHaveLength(exerciseCount - 1);
  expect(saved.routine[0].exercises.map((entry: { id: string }) => entry.id)).toEqual(routineIds);
});
test("Today follows the weekday and shows completed performance trends", async ({ page }) => {
  const state = seed();
  const today = (new Date().getDay() || 7) as Weekday;
  state.profile = { ...state.profile, days: 1, trainingDays: [today] };
  state.routine = generateRoutine(state.profile, emptyPreferences);
  const entry = state.routine[0].exercises[0];
  const makeWorkout = (id: string, date: string, weight: number): Workout => ({
    id,
    dayId: state.routine[0].id,
    dayName: state.routine[0].name,
    date,
    minutes: 45,
    records: [{
      prescription: entry,
      name: "Ejercicio comparable",
      type: "compound",
      sets: Array.from({ length: entry.sets }, () => ({ weight, reps: 8 })),
    }],
  });
  const previousDate = new Date();
  previousDate.setDate(previousDate.getDate() - 7);
  state.history = [
    makeWorkout("previous", previousDate.toISOString(), 30),
    makeWorkout("today", new Date().toISOString(), 35),
  ];
  await load(page, state);
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: "Sesión terminada", exact: true })).toBeVisible();
  await expect(page.getByText(/Vas progresando:/)).toBeVisible();
  await expect(page.getByText("Consejos para recuperarte", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Tu último entrenamiento", { exact: true })).toBeVisible();
  await expect(page.getByText("Estadísticas generales", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem("gym60:state:v1")!);
    for (const set of saved.history.at(-1).records[0].sets) set.weight = 20;
    localStorage.setItem("gym60:state:v1", JSON.stringify(saved));
  });
  await page.reload();
  await expect(page.getByText(/Esta sesión ha bajado/)).toBeVisible();
  await expect(page.getByText("Consejos para recuperarte", { exact: true })).toBeVisible();
  await expect(page.getByText(/Descanso:.*dormir 8 horas.*mismos horarios/)).toBeVisible();
  await expect(page.getByText(/Proteína:.*1,8 gramos por kilo de peso corporal al día/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/hoy-sesion-terminada.png" });
});
