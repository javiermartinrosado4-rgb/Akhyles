import { expect, test, type Page } from "@playwright/test";
import { createDemoScenario } from "../../src/data/demoScenarios";
import { startWorkout } from "../../src/logic/workout";
import type { AppState } from "../../src/types";

const languageKey = "akhyles:language:v1";
const stateKey = "gym60:state:v1";
type Language = "es" | "en";
const deviceLabel = { es: "Usar el idioma del dispositivo", en: "Use device language" };
const choice = (page: Page, name: string) => page.getByRole("radio", { name, exact: true });
const storedLanguage = (page: Page) => page.evaluate(key => localStorage.getItem(key), languageKey);
const storedState = (page: Page): Promise<AppState> => page.evaluate(key => JSON.parse(localStorage.getItem(key)!), stateKey);
// Metro pages can remain waiting on subresources after the app is interactive.
// Each caller checks the actual UI instead of waiting for the window load event.
const visit = (page: Page, path: string) => page.goto(path, { waitUntil: "domcontentloaded" });
const reload = (page: Page) => page.reload({ waitUntil: "domcontentloaded" });

async function expectLanguage(page: Page, language: Language) {
  await expect(choice(page, deviceLabel[language])).toBeVisible();
  await expect(page.getByText(language === "es" ? "Idioma" : "Language", { exact: true })).toBeVisible();
  await expect(choice(page, "Español")).toBeVisible();
  await expect(choice(page, "English")).toBeVisible();
}

async function selectLanguage(page: Page, language: Language) {
  await choice(page, language === "es" ? "Español" : "English").click();
  await expectLanguage(page, language);
  await expect(choice(page, language === "es" ? "Español" : "English")).toBeChecked();
  await expect.poll(() => storedLanguage(page)).toBe(language);
}

// Playwright's page fixture creates and disposes a fresh, nonpersistent context
// for every test. Only synthetic training data is seeded; language changes use UI.
// Registration never submits. Avoid request routing here so HTTP caching remains
// available across reloads of the large Metro development bundle.

for (const locale of ["es-ES", "en-US", "fr-FR"]) {
  test.describe(locale, () => {
    test.use({ locale });
    const automatic: Language = locale === "es-ES" ? "es" : "en";

    test("fresh device language and unsupported-language fallback across entry routes", async ({ page }) => {
      await visit(page, "/settings");
      expect(await page.evaluate(() => navigator.language)).toBe(locale);
      expect(await storedLanguage(page)).toBeNull();
      await expectLanguage(page, automatic);
      await expect(choice(page, deviceLabel[automatic])).toBeChecked();
      await reload(page);
      await expectLanguage(page, automatic);
      for (const path of ["/onboarding", "/account", "/"]) {
        await visit(page, path);
        await expectLanguage(page, automatic);
        await expect(choice(page, deviceLabel[automatic])).toBeChecked();
      }
      await expect(page.getByRole("button", { name: automatic === "es" ? "Crear mi rutina" : "Create my routine", exact: true })).toBeVisible();
    });

    test("explicit overrides survive reload and device-language reset restores the primary locale", async ({ page }) => {
      await visit(page, "/settings");
      await expectLanguage(page, automatic);
      for (const language of (automatic === "es" ? ["en", "es"] : ["es", "en"]) as Language[]) {
        await selectLanguage(page, language);
        await reload(page);
        await expectLanguage(page, language);
        await expect(choice(page, language === "es" ? "Español" : "English")).toBeChecked();
        expect(await storedLanguage(page)).toBe(language);
      }
      await selectLanguage(page, automatic === "es" ? "en" : "es");
      await page.getByRole("radio", { name: /^(Use device language|Usar el idioma del dispositivo)$/ }).click();
      await expect.poll(() => storedLanguage(page)).toBe("system");
      await expectLanguage(page, automatic);
      await reload(page);
      await expectLanguage(page, automatic);
      await expect(choice(page, deviceLabel[automatic])).toBeChecked();
      expect(await storedLanguage(page)).toBe("system");
    });
  });
}

test.describe("language switches preserve user data", () => {
  test.use({ locale: "es-ES" });

  test("registration selector preserves unsent name, email and password", async ({ page }) => {
    await visit(page, "/account");
    await page.getByRole("button", { name: "No tengo cuenta: registrarme", exact: true }).click();
    await page.getByRole("textbox", { name: "Tu nombre", exact: true }).fill("Álex QA");
    await page.getByRole("textbox", { name: "Correo electrónico", exact: true }).fill("language-qa@example.test");
    await page.getByLabel("Contraseña", { exact: true }).fill("isolated-language-2026");
    await selectLanguage(page, "en");
    await expect(page.getByRole("textbox", { name: "Your name", exact: true })).toHaveValue("Álex QA");
    await expect(page.getByRole("textbox", { name: "Email address", exact: true })).toHaveValue("language-qa@example.test");
    await expect(page.getByLabel("Password", { exact: true })).toHaveValue("isolated-language-2026");
    await selectLanguage(page, "es");
    await expect(page.getByRole("textbox", { name: "Tu nombre", exact: true })).toHaveValue("Álex QA");
    await expect(page.getByRole("textbox", { name: "Correo electrónico", exact: true })).toHaveValue("language-qa@example.test");
    await expect(page.getByLabel("Contraseña", { exact: true })).toHaveValue("isolated-language-2026");
  });

  test("onboarding keeps entered values when switching and reloading", async ({ page }) => {
    await visit(page, "/onboarding");
    await page.getByRole("textbox", { name: "Nombre", exact: true }).fill("Atleta QA");
    await page.getByRole("textbox", { name: "Peso corporal", exact: true }).fill("76,5");
    await selectLanguage(page, "en");
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Atleta QA");
    await expect(page.getByRole("textbox", { name: "Body weight", exact: true })).toHaveValue("76,5");
    await reload(page);
    await expectLanguage(page, "en");
    await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveValue("Atleta QA");
    await expect(page.getByRole("textbox", { name: "Body weight", exact: true })).toHaveValue("76,5");
    await selectLanguage(page, "es");
    await expect(page.getByRole("textbox", { name: "Peso corporal", exact: true })).toHaveValue("76,5");
  });

  test("switching preserves workout draft, routine, history and custom exercise names", async ({ page }) => {
    const state = createDemoScenario(false);
    state.preferences.names[state.routine[0].exercises[0].exerciseId] = "Mi ejercicio QA";
    state.active = startWorkout(state.routine[0], state.profile.weight, state.profile.level, state.profile.sex);
    await visit(page, "/settings");
    await expectLanguage(page, "es");
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: stateKey, state });
    await visit(page, "/workout");
    await page.getByRole("textbox", { name: "Peso total serie 1", exact: true }).fill("42,5");
    await page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true }).fill("11");
    await expect.poll(async () => (await storedState(page)).active?.draft[0].reps).toBe("11");
    const before = await storedState(page);
    for (const language of ["en", "es"] as const) {
      await visit(page, "/settings");
      await selectLanguage(page, language);
      await reload(page);
      await expectLanguage(page, language);
      const after = await storedState(page);
      for (const key of ["routine", "history", "preferences", "profile", "active", "bodyWeights", "routineVersions"] as const) {
        expect(after[key], `${key} must survive ${language}`).toEqual(before[key]);
      }
      await visit(page, "/workout");
      await expect(page.getByRole("heading", { name: "Mi ejercicio QA", exact: true })).toBeVisible();
      await expect(page.getByRole("textbox", { name: language === "es" ? "Peso total serie 1" : "Total weight, set 1", exact: true })).toHaveValue("42,5");
      await expect(page.getByRole("textbox", { name: language === "es" ? "Repeticiones serie 1" : "Repetitions for set 1", exact: true })).toHaveValue("11");
    }
  });
});

test.describe("mobile English charts", () => {
  test.use({ locale: "en-US", viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1 });
  test("charts render without horizontal overflow", async ({ page }, testInfo) => {
    await visit(page, "/settings");
    await expectLanguage(page, "en");
    const state = createDemoScenario(false);
    await page.evaluate(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key: stateKey, state });
    await visit(page, "/progress");
    await expect(page.getByRole("button", { name: "Progress", exact: true })).toBeVisible();
    const chart = page.getByRole("img", { name: /line chart/i }).first();
    await expect(chart).toBeVisible();
    await chart.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath("mobile-english-charts.png"), fullPage: true });
    const overflow = await page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      return {
        width, scrollWidth: document.documentElement.scrollWidth,
        elements: Array.from(document.querySelectorAll("body *")).filter(el => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && (rect.right > width + 1 || rect.left < -1) && getComputedStyle(el).visibility !== "hidden";
        }).slice(0, 25).map(el => ({ tag: el.tagName, role: el.getAttribute("role"), text: el.textContent?.slice(0, 100), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })),
      };
    });
    await testInfo.attach("horizontal-overflow", { body: JSON.stringify(overflow, null, 2), contentType: "application/json" });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.width + 1);
    expect(overflow.elements).toEqual([]);
  });
});
