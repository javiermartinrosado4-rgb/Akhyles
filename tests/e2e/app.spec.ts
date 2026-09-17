import { test, expect, Page } from "@playwright/test";
async function onboard(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Crear mi rutina", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Rellenar con datos de ejemplo" })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("radio", { name: "Principiante", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("radio", { name: "Pecho", exact: true }).click();
  await page.getByRole("button", { name: "Generar mi rutina" }).click();
  await expect(
    page.getByRole("button", { name: "Entrenamiento", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
}

test("profile changes regenerate five days and keep unavailable exercise preferences", async ({
  page,
}) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Editar ejercicio 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mi gimnasio no lo tiene", exact: true })
    .click();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page
    .getByRole("button", { name: "Editar perfil y gimnasio", exact: true })
    .click();
  await page.getByRole("radio", { name: "Avanzado", exact: true }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await page.getByRole("button", { name: /^Elegir mesociclo:/ }).click();
  await page.getByRole("radio", { name: "Glúteos", exact: true }).click();
  await page.getByRole("checkbox", { name: "Peso libre", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Guardar perfil",
      exact: true,
    })
    .click();
  await expect(page.getByText(/Perfil actualizado/)).toBeVisible();
  await page.getByRole("button", { name: "Entrenamiento", exact: true }).click();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Especialización/ }),
  ).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("gym60:state:v1")!),
  );
  expect(saved.profile.level).toBe("advanced");
  expect(saved.profile.days).toBe(7);
  expect(saved.routine).toHaveLength(5);
  expect(saved.preferences.unavailable).toContain("chest-press");
  expect(saved.preferences.equipment).not.toContain("free");
  expect(
    saved.routine
      .flatMap((d: { exercises: { exerciseId: string }[] }) => d.exercises)
      .some((p: { exerciseId: string }) => p.exerciseId === "chest-press"),
  ).toBe(false);
});
test("complete onboarding, back navigation, validation, editing, workout and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.screenshot({ path: "test-results/bienvenida.png" });
  await page
    .getByRole("button", { name: "Crear mi rutina", exact: true })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByText("Revisa los campos indicados para continuar."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Rellenar con datos de ejemplo" })
    .click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("radio", { name: "Principiante", exact: true }).click();
  await page.getByRole("button", { name: "Atrás", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Peso corporal", exact: true }),
  ).toHaveValue("76,5");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Peso corporal", exact: true }),
  ).toHaveValue("76,5");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: "Principiante", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expect(
    page.getByText(/Recomendamos y programaremos un máximo/),
  ).toBeVisible();
  await page.getByRole("button", { name: "3", exact: true }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole("radio", { name: "Pecho", exact: true }).click();
  await page.getByRole("button", { name: "Generar mi rutina" }).click();
  await expect(
    page.getByRole("button", { name: "Entrenamiento", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.screenshot({ path: "test-results/rutina.png" });
  await page
    .getByRole("button", { name: "Editar ejercicio 1", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nombre del ejercicio" })
    .fill("Pecho en mi gimnasio");
  await page
    .getByRole("textbox", { name: "Peso inicial", exact: true })
    .fill("20,25");
  await page
    .getByRole("textbox", { name: "Series efectivas", exact: true })
    .fill("3");
  await expect(page.getByText(/Ajusta las series teniendo/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Series efectivas", exact: true })
    .fill("2");
  await page
    .getByRole("button", { name: "Guardar cambios", exact: true })
    .click();
  await page.reload();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ver detalles de Pecho en mi gimnasio", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    const key = "gym60:state:v1";
    const saved = JSON.parse(localStorage.getItem(key)!);
    const torso = saved.routine.find((day: { name: string }) => day.name === "Torso") ?? saved.routine[0];
    const today = new Date().toISOString();
    saved.plannedWorkouts = [
      ...(saved.plannedWorkouts ?? []).filter((item: { date: string }) => item.date.slice(0, 10) !== today.slice(0, 10)),
      { date: today, dayId: torso.id, day: torso },
    ];
    localStorage.setItem(key, JSON.stringify(saved));
  });
  await page.reload();
  await page.getByRole("button", { name: "Iniciar entrenamiento", exact: true }).click();
  await page
    .getByRole("button", { name: "Guardar" })
    .click();
  await expect(
    page.getByText(/Completa cada serie con un peso válido/),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Peso total serie 1", exact: true })
    .fill("20,25");
  await page
    .getByRole("textbox", { name: "Repeticiones serie 1", exact: true })
    .fill("10");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Repeticiones serie 1", exact: true }),
  ).toHaveValue("10");
  let finished = false;
  for (let i = 0; i < 10; i++) {
    const weights = page.getByRole("textbox", { name: /^Peso total serie / });
    const repetitions = page.getByRole("textbox", { name: /^Repeticiones serie / });
    for (let j = 0; j < await weights.count(); j++) {
      await weights.nth(j).fill("35");
      await repetitions.nth(j).fill("9");
    }
    const next = page.getByRole("button", { name: "Ejercicio siguiente", exact: true });
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    if (!(await next.isEnabled())) {
      finished = true;
      break;
    }
    await next.click();
  }
  expect(finished).toBe(true);
  await expect(page.getByText("ENTRENAMIENTO GUARDADO")).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar próximo peso", exact: true })).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).preferences.weights["chest-press"])).toBe(36.25);
  await page.getByRole("button", { name: "Volver a Entrenamiento", exact: true }).click();
  await page.getByRole("button", { name: "Progreso", exact: true }).click();
  await expect(page.getByText("Gráficas", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Peso corporal de hoy", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("retired body-fat simulation is removed from legacy profiles without losing weight", async ({ page }) => {
  await page.goto("/onboarding");
  await page.getByRole("button", { name: "Rellenar con datos de ejemplo" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).profile.weight)).toBe("76,5");
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("gym60:state:v1")!);
    s.profile.fatMode = "photo"; s.profile.bodyFat = "16,25"; s.profile.photoConfirmed = true;
    localStorage.setItem("gym60:state:v1", JSON.stringify(s));
  });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Peso corporal", exact: true })).toHaveValue("76,5");
  await expect(page.getByRole("radio", { name: "Estimarlo mediante fotografías", exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: "Edad", exact: true }).fill("30");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("gym60:state:v1")!).profile.fatMode)).toBeUndefined();
});

test("substitution preferences, custom exercises, demo progression, themes and small viewport", async ({
  page,
}) => {
  await onboard(page);
  await page
    .getByRole("button", { name: "Editar ejercicio 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mi gimnasio no lo tiene", exact: true })
    .click();
  await expect(page.getByText(/Preferencia guardada/)).toBeVisible();
  await page.reload();
  const unavailable = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("gym60:state:v1")!).preferences
        .unavailable,
  );
  expect(unavailable).toContain("chest-press");
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.getByRole("button", { name: "Editar ejercicio 1", exact: true }).click();
  await page.getByRole("button", { name: "Sustituir ejercicio", exact: true }).click();
  await page
    .getByRole("button", { name: "Crear ejercicio personalizado" })
    .click();
  await page
    .getByRole("textbox", { name: "Nombre del ejercicio" })
    .fill("Mi máquina de pecho");
  await page
    .getByRole("button", {
      name: "Guardar ejercicio personalizado",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "Ver detalles de Mi máquina de pecho", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Perfil", exact: true }).click();
  await page
    .getByRole("button", { name: "Configuración y apariencia" })
    .click();
  await page.getByRole("radio", { name: "Tema oscuro", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "Tema oscuro", exact: true }),
  ).toHaveAttribute("aria-checked", "true");
  await page.screenshot({ path: "test-results/tema-oscuro.png" });
  await page.getByRole("radio", { name: "Usar tema del sistema" }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(231, 232, 226)",
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(13, 16, 14)",
  );
  await page.getByRole("button", { name: "Volver", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Entrenamiento", exact: true }).click();
  await page.getByRole("button", { name: "Editar mi rutina", exact: true }).click();
  await page.screenshot({ path: "test-results/movil.png" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
