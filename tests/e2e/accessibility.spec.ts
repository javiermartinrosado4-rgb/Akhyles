import { test, expect } from "@playwright/test";

test("keyboard controls and visible focus work without a mouse", async ({
  page,
}) => {
  await page.goto("/settings");
  const dark = page.getByRole("radio", { name: "Tema oscuro", exact: true });
  await dark.focus();
  await expect(dark).toBeFocused();
  await dark.press("Space");
  await expect(dark).toHaveAttribute("aria-checked", "true");
  await page.goto("/");
  const start = page.getByRole("button", {
    name: "Crear mi rutina",
    exact: true,
  });
  await start.focus();
  await expect(start).toBeFocused();
  await start.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Empecemos por ti" }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Edad", exact: true }).focus();
  await page.keyboard.type("25");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("textbox", { name: "Altura", exact: true }),
  ).toBeFocused();
});

test("corrupted local data are preserved and a friendly recovery message appears", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("gym60:state:v1", "{invalid data"),
  );
  await page.goto("/");
  await expect(
    page.getByText(/No hemos podido recuperar tus datos/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByText(/No hemos podido recuperar tus datos/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("gym60:state:v1")),
  ).toBe("{invalid data");
  await expect(page.getByRole("button", { name: "Crear mi rutina", exact: true })).toHaveCount(0);
});

test("failed storage writes show a recoverable error", async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === "gym60:state:v1")
        throw new DOMException("Test quota exceeded", "QuotaExceededError");
      original.call(this, key, value);
    };
    (window as unknown as { restoreStorage: () => void }).restoreStorage =
      () => {
        Storage.prototype.setItem = original;
      };
  });
  await page.goto("/settings");
  await page.getByRole("radio", { name: "Tema oscuro", exact: true }).click();
  await expect(
    page.getByText(/No se han podido guardar los últimos cambios/),
  ).toBeVisible();
  await page.evaluate(() =>
    (window as unknown as { restoreStorage: () => void }).restoreStorage(),
  );
  await page.getByRole("button", { name: "Reintentar", exact: true }).click();
  await expect(
    page.getByText(/No se han podido guardar los últimos cambios/),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("gym60:state:v1")!).theme,
    ),
  ).toBe("dark");
});
