import { expect, test } from "@playwright/test";
import { createDemoScenario } from "../../src/data/demoScenarios";
import { startWorkout } from "../../src/logic/workout";

test("an unfinished session from yesterday can be resumed without replacing today's plan", async ({ page }) => {
  const state = createDemoScenario(false);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  state.active = startWorkout(state.routine[0], "80", state.profile.level, state.profile.sex);
  state.active.startedAt = yesterday.toISOString();
  state.active.draft[0] = { weight: "42,5", reps: "8" };
  await page.goto("/");
  await page.evaluate(value => localStorage.setItem("gym60:state:v1", JSON.stringify(value)), state);
  await page.goto("/today");
  await expect(page.getByText("ENTRENAMIENTO PENDIENTE", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continuar entrenamiento pendiente", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Continuar entrenamiento pendiente", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Peso total serie 1", exact: true })).toHaveValue("42,5");
  await expect(page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true })).toHaveValue("8");
});
