import { test, expect, Page } from "@playwright/test";
import { catalog } from "../../src/data/catalog";
import { demoProfile, emptyPreferences } from "../../src/data/options";
import { prescribe } from "../../src/logic/routine";
import { startWorkout } from "../../src/logic/workout";
import type { AppState, Exercise } from "../../src/types";

async function loadWorkout(page: Page, exercises = catalog, theme: AppState["theme"] = "light") {
  const day = { id: "photos", name: "Mi entrenamiento", exercises: exercises.map(exercise => prescribe(exercise, emptyPreferences)) };
  const state: AppState = {
    version: 1, completed: true, onboardingStep: 0, programRevision: 2, theme,
    profile: demoProfile,
    preferences: { ...emptyPreferences, custom: exercises.filter(exercise => exercise.custom) },
    history: [], routine: [day], active: startWorkout(day, "80"),
  };
  await page.route("**:8082/**", route => route.fulfill({ json: { clientId: "", nonce: "" } }));
  await page.goto("/");
  await page.evaluate(value => localStorage.setItem("gym60:state:v1", JSON.stringify(value)), state);
  await page.goto("/workout");
}

async function expectLoadedPhoto(page: Page) {
  const card = page.getByTestId("equipment-photo");
  await expect(card).toBeVisible();
  await expect.poll(() => card.locator("img").evaluateAll(images => images.length > 0 && images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

test("every catalog exercise has a local equipment photo and changing exercise changes the card", async ({ page }) => {
  test.setTimeout(180000);
  await loadWorkout(page);
  for (const [index, exercise] of catalog.entries()) {
    await expect(page.getByRole("heading", { name: exercise.name, exact: true })).toBeVisible();
    await expect(page.getByTestId("equipment-photo")).toHaveAccessibleName(`Ampliar foto: ${exercise.name}`);
    await expectLoadedPhoto(page);
    const src = (await page.getByTestId("equipment-photo").locator("img").first().getAttribute("src"))!;
    expect(src).not.toMatch(/gymleco|skelcore|shopify/);
    if (index < catalog.length - 1) await page.getByRole("button", { name: "Ejercicio siguiente", exact: true }).click();
  }
});

for (const theme of ["light", "dark"] as const) {
  test(`photo stays to the right on small screens and expands without losing draft (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const exercise = catalog.find(item => item.id === "chest-press")!;
    await loadWorkout(page, [exercise], theme);
    await expectLoadedPhoto(page);
    const title = await page.getByRole("heading", { name: exercise.name, exact: true }).boundingBox();
    const photo = await page.getByTestId("equipment-photo").boundingBox();
    expect(photo!.x).toBeGreaterThanOrEqual(title!.x + title!.width);
    expect(photo!.x + photo!.width).toBeLessThanOrEqual(360);
    expect(photo!.height).toBeLessThan(180);
    await page.screenshot({ path: `test-results/equipment-${theme}-mobile.png` });
    await page.getByRole("textbox", { name: "Peso total serie 1", exact: true }).fill("35");
    await page.getByTestId("equipment-photo").click();
    await expect(page.getByText("TU EQUIPAMIENTO", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Ver foto original de Gymleco" })).toBeVisible();
    await expect.poll(() => page.getByText("TU EQUIPAMIENTO", { exact: true }).evaluate(element => {
      for (let parent: Element | null = element; parent; parent = parent.parentElement) {
        if (Number(getComputedStyle(parent).opacity) < 1) return false;
      }
      return true;
    })).toBe(true);
    await page.screenshot({ path: `test-results/equipment-${theme}-expanded.png` });
    await page.getByRole("button", { name: "Volver al ejercicio", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toHaveValue("35");
    await page.reload();
    await expectLoadedPhoto(page);
    await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toHaveValue("35");
  });
}

test("custom equipment is not misidentified as a catalog machine", async ({ page }) => {
  const exercise: Exercise = { ...catalog[0], id: "custom-apparatus", name: "Mi máquina personalizada", custom: true };
  await loadWorkout(page, [exercise]);
  await expect(page.getByTestId("equipment-photo-fallback").getByText("Equipo personalizado", { exact: true })).toBeVisible();
  await expect(page.getByTestId("equipment-photo")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toBeVisible();
});
