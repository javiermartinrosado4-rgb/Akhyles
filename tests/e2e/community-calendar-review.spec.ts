import { expect, test } from "@playwright/test";
import { createDemoScenario } from "../../src/data/demoScenarios";
import { localDateKey, scheduledDay } from "../../src/logic/schedule";
import { socialFixture } from "./social-fixture";

test("monthly calendar distinguishes known absences and preserves previous months after a plan edit", async ({ page }) => {
  const state = createDemoScenario(false);
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(12, 0, 0, 0);
  state.history = state.history.filter(item => localDateKey(item.date) !== localDateKey(yesterday));
  state.plannedWorkouts = [{ date: yesterday.toISOString(), dayId: state.routine[0].id, day: state.routine[0] }];
  await page.goto("/");
  await page.evaluate(state => localStorage.setItem("gym60:state:v1", JSON.stringify(state)), state);
  await page.goto("/routine");
  await expect(page.getByRole("button", { name: "Semana", exact: true })).toHaveCount(0);
  const missed = page.getByRole("button", { name: new RegExp(`${yesterday.toLocaleDateString("es")}.*sin realizar`, "i") });
  await expect(missed).toBeVisible();
  await expect(missed).toHaveCSS("background-color", "rgba(162, 54, 50, 0.13)");
  await page.getByRole("button", { name: "Mes anterior", exact: true }).click();
  const before = await page.getByRole("button", { name: /^\d+\/\d+\/\d+/ }).allTextContents();
  // Exercise editor and profile both write through this Store boundary. Exercise
  // the real profile form for the subsequent change.
  await page.goto("/profile");
  await page.getByRole("button", { name: "Editar perfil y gimnasio" }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: "Guardar perfil", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).profile.days)).toBe(3);
  await page.goto("/routine");
  await page.getByRole("button", { name: "Mes anterior", exact: true }).click();
  expect(await page.getByRole("button", { name: /^\d+\/\d+\/\d+/ }).allTextContents()).toEqual(before);
  const firstVersion = state.routineVersions![0];
  const earliest = new Date(firstVersion.effectiveFrom + "T12:00:00"); earliest.setDate(earliest.getDate() - 7);
  expect(scheduledDay(state.profile, state.routine, earliest, state.routineVersions)).toBeUndefined();
});

test("local friends can open shared sessions, load charts and compare opted-in Points", async ({ page }) => {
  const fixture = await socialFixture(page);
  try {
  await page.goto("/");
  await page.evaluate(person => {
    localStorage.setItem("gym60:state:v1", JSON.stringify(person.state));
    localStorage.setItem("akhyles:community:http://localhost:8082", person.token);
  }, fixture.people[0]);
  await page.goto("/community");
  await page.getByRole("tab", { name: "Personas", exact: true }).click();
  const friend = fixture.people[1].user.handle;
  await page.getByRole("button", { name: `Ver perfil de @${friend}`, exact: true }).click();
  await page.getByRole("button", { name: `Ver progreso de @${friend}`, exact: true }).click();
  await expect(page.getByText("PROGRESO COMPARTIDO", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gráficas", exact: true }).click();
  await page.getByRole("button", { name: "Mes", exact: true }).click();
  await page.getByRole("button", { name: "Peso y cargas", exact: true }).click();
  await expect(page.getByRole("img", { name: /Peso corporal y cargas.*Gráfica de líneas/ })).toBeVisible();
  await page.getByRole("button", { name: "Entrenamientos", exact: true }).click();
  await page.getByRole("button", { name: fixture.people[1].state.routine[0].name, exact: true }).click();
  await expect(page.getByText("Vista previa completa", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Ranking", exact: true }).click();
  await expect(page.getByRole("button", { name: new RegExp(`@${friend}.*Points`) })).toBeVisible();
  } finally { await fixture.close(); }
});
