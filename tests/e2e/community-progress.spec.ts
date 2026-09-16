import { test, expect, Page } from "@playwright/test";
import { AddressInfo } from "node:net";
import { readFileSync } from "node:fs";
import { createGymServer } from "../../server/app";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { generateRoutine, getExercise, prescribe } from "../../src/logic/routine";
import { AppState } from "../../src/types";

const server = createGymServer({ authLimit: 100, origins: ["http://localhost:8093", "http://localhost:8081"] });
let apiUrl: string;
test.beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async () => { await new Promise<void>(resolve => server.close(() => resolve())); });
async function seed(page: Page) {
  await page.route(/http:\/\/(localhost|127\.0\.0\.1):8082\//, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: apiUrl + url.pathname + url.search });
    await route.fulfill({ response });
  });
  const state: AppState = { version: 1, completed: true, onboardingStep: 0, programRevision: 2, theme: "system", profile: { ...demoProfile, name: "Javier", handle: "javier_gym" }, preferences: emptyPreferences, routine: generateRoutine(demoProfile, emptyPreferences), history: [] };
  for (let i = 0; i < 3; i++) {
    const date = new Date(Date.now() - (14 - i * 7) * 86_400_000 - 1000).toISOString();
    state.history.push({ id: `session-${i}`, date, level: "intermediate", dayName: "Torso", bodyWeight: 75 + i, minutes: 40,
      records: ["dumbbell-curl", "lateral-dumbbell"].map(id => ({ name: id, type: "isolation", prescription: prescribe(getExercise(id, emptyPreferences), emptyPreferences), sets: [{ weight: 10 + i, reps: 10 }] })) });
  }
  await page.goto("/");
  await page.evaluate(s => localStorage.setItem("gym60:state:v1", JSON.stringify(s)), state);
  await page.goto("/progress");
}

test("line graphs overlay muscle exercises while bodyweight remains visible and persists", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", error => errors.push(error.message));
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText("Peso corporal · siempre visible", { exact: true })).toBeVisible();
  const lateralName = getExercise("lateral-dumbbell", emptyPreferences).name;
  const curlName = getExercise("dumbbell-curl", emptyPreferences).name;
  const actualCurl = page.getByRole("checkbox", { name: curlName, exact: true });
  await page.getByRole("button", { name: "Mostrar ejercicios de Bíceps", exact: true }).click();
  await actualCurl.click();
  await page.getByRole("button", { name: "Mostrar ejercicios de Hombros", exact: true }).click();
  await page.getByRole("checkbox", { name: lateralName, exact: true }).click();
  await page.getByRole("button", { name: "Mostrar ejercicios de Bíceps", exact: true }).click();
  await expect(actualCurl).toBeChecked();
  await expect(page.getByTestId("line-chart").first().locator("polyline")).toHaveCount(3);
  await actualCurl.click();
  await expect(page.getByTestId("line-chart").first().locator("polyline")).toHaveCount(2);
  await page.getByRole("textbox", { name: "Peso corporal de hoy", exact: true }).fill("78,2");
  await page.getByRole("button", { name: "Guardar peso corporal", exact: true }).click();
  await expect(page.getByText("Peso corporal guardado.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Peso corporal de hoy", exact: true })).toHaveValue("78,2");
  await expect(page.getByText("Gráficas", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Mostrar ejercicios de Bíceps", exact: true }).click();
  await page.getByRole("checkbox", { name: curlName, exact: true }).click();
  await page.getByRole("button", { name: "Mostrar ejercicios de Hombros", exact: true }).click();
  await page.getByRole("checkbox", { name: lateralName, exact: true }).click();
  await page.getByTestId("line-chart").first().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/progreso-lineas.png" });
  expect(errors).toEqual([]);
});

test("social account uploads a real photo, another account sees it, and owner can delete", async ({ page, browser }) => {
  test.setTimeout(180000);
  await seed(page);
  await page.goto("/community");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await page.getByRole("textbox", { name: "Nombre público", exact: true }).fill("Javier social");
  await page.getByRole("textbox", { name: "Usuario de Comunidad", exact: true }).fill("javier_social");
  await page.getByLabel("Contraseña de Comunidad", { exact: true }).fill("gym-test-password-123");
  await page.getByRole("button", { name: "Crear mi cuenta de Comunidad", exact: true }).click();
  await page.getByRole("tab", { name: "Mi perfil", exact: true }).click();
  await expect(page.getByText("@javier_social", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Nueva publicación", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "gym.png", mimeType: "image/png", buffer: readFileSync("assets/brand/icon.png") });
  await expect(page.getByRole("img", { name: "Vista previa de tu publicación" })).toBeVisible();
  await page.getByRole("textbox", { name: "Texto de la publicación", exact: true }).fill("Entrenamiento completado");
  await page.getByRole("button", { name: "Publicar foto", exact: true }).click();
  await expect(page.getByText("Foto publicada.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Mi perfil", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir publicación: Entrenamiento completado", exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/comunidad-perfil.png" });

  const context = await browser.newContext({ baseURL: new URL(page.url()).origin, locale: "es-ES" });
  try {
    const other = await context.newPage();
    await seed(other);
    await other.goto("/community");
    await other.getByRole("button", { name: "Crear cuenta", exact: true }).click();
    await other.getByRole("textbox", { name: "Usuario de Comunidad", exact: true }).fill("otra_persona");
    await other.getByLabel("Contraseña de Comunidad", { exact: true }).fill("gym-test-password-123");
    await other.getByRole("button", { name: "Crear mi cuenta de Comunidad", exact: true }).click();
    await other.getByRole("tab", { name: "Mi perfil", exact: true }).click();
    await expect(other.getByText("@otra_persona", { exact: true })).toBeVisible();
    await other.getByRole("tab", { name: "Muro", exact: true }).click();
    await other.getByRole("tab", { name: "Descubrir", exact: true }).click();
    await expect(other.getByText("Entrenamiento completado", { exact: true })).toBeVisible();
    await other.getByRole("button", { name: "Me gusta · 0", exact: true }).click();
    await expect(other.getByRole("button", { name: "Quitar me gusta · 1", exact: true })).toBeVisible();
    await other.getByRole("button", { name: "@javier_social", exact: true }).click();
    await other.getByRole("button", { name: "Seguir", exact: true }).click();
    await expect(other.getByText("1 seguidor", { exact: true })).toBeVisible();
    await other.getByRole("tab", { name: "Muro", exact: true }).click();
    await other.getByRole("tab", { name: "Siguiendo", exact: true }).click();
    await expect(other.getByText("Entrenamiento completado", { exact: true })).toBeVisible();
  } finally { await context.close(); }

  await page.getByRole("button", { name: "Abrir publicación: Entrenamiento completado", exact: true }).click();
  await expect(page.getByRole("button", { name: "Eliminar publicación", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Eliminar publicación", exact: true }).click();
  await page.getByRole("button", { name: "Confirmar eliminación", exact: true }).click();
  await expect(page.getByText("0 fotos", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Privacidad y cuenta", exact: true }).click();
  await page.getByRole("button", { name: "Compartir registros y comparar", exact: true }).click();
  await expect(page.getByText("Aún faltan datos comparables", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Retirar mis datos de la comparación", exact: true }).click();
  await expect(page.getByText("Tus registros se han retirado de la comparación.", { exact: true })).toBeVisible();
});
