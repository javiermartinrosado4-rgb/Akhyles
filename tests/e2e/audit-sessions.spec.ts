import { expect, test } from "@playwright/test";
import { socialFixture } from "./social-fixture";

test("private account owners do not inherit another owner's social session, and social logout works offline", async ({ page }) => {
  const fixture = await socialFixture(page);
  try {
    await page.goto("/");
    await page.evaluate(person => {
      localStorage.setItem("gym60:state:v1", JSON.stringify({ ...person.state, cloud: { owner: "owner-one", revision: 0, base: null } }));
      localStorage.setItem("akhyles:community:http://localhost:8082:owner:owner-one", person.token);
    }, fixture.people[0]);
    await page.goto("/community");
    await page.getByRole("tab", { name: "Mi perfil", exact: true }).click();
    await expect(page.getByText(`@${fixture.people[0].user.handle}`, { exact: true })).toBeVisible();
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("gym60:state:v1")!);
      state.cloud.owner = "owner-two";
      localStorage.setItem("gym60:state:v1", JSON.stringify(state));
    });
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Usuario de Comunidad", exact: true })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Mi perfil", exact: true })).toHaveCount(0);
    await page.evaluate(() => {
      const state = JSON.parse(localStorage.getItem("gym60:state:v1")!);
      state.cloud.owner = "owner-one";
      localStorage.setItem("gym60:state:v1", JSON.stringify(state));
    });
    await page.reload();
    await page.getByRole("tab", { name: "Mi perfil", exact: true }).click();
    await page.getByRole("button", { name: "Privacidad y cuenta", exact: true }).click();
    await page.route("**/auth/logout", route => route.abort("internetdisconnected"));
    await page.getByRole("button", { name: "Cerrar sesión de Comunidad", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Usuario de Comunidad", exact: true })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("akhyles:community:http://localhost:8082:owner:owner-one"))).toBeNull();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Usuario de Comunidad", exact: true })).toBeVisible();
  } finally { await fixture.close(); }
});
