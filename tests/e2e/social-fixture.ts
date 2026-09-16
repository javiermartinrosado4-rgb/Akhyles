import { Page } from "@playwright/test";
import { AddressInfo } from "node:net";
import { createGymServer } from "../../server/app";
import { createDemoScenario } from "../../src/data/demoScenarios";
import { exportProgress, exportRoutine } from "../../src/logic/sharing";

export async function socialFixture(page: Page) {
  const server = createGymServer({ origins: ["http://localhost:8093", "http://localhost:8081"], authLimit: 100 });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (path: string, data: unknown, token?: string, method = "POST") => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
    if (!response.ok) throw new Error(`Fixture ${path}: ${response.status}`);
    return response.json();
  };
  const people = [];
  for (const female of [false, true]) {
    const state = createDemoScenario(female);
    const person = await call("/auth/register", { handle: state.profile.handle, name: state.profile.name, level: state.profile.level, password: "Akhyles-demo-local-2026" });
    await call("/routines/me", exportRoutine(state.routine, state.preferences), person.token, "PUT");
    await call("/progress/me", exportProgress(state, true, true), person.token, "PUT");
    await call("/me/privacy", { routinePublic: true, progressPublic: true, detailsPublic: true, bodyWeightPublic: true, rankingPublic: true }, person.token, "PATCH");
    people.push({ ...person, state });
  }
  await call(`/follow/${people[1].user.id}`, {}, people[0].token, "PUT");
  await call(`/follow/${people[0].user.id}`, {}, people[1].token, "PUT");
  await page.route(/http:\/\/(localhost|127\.0\.0\.1):8082\//, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: base + url.pathname + url.search });
    await route.fulfill({ response });
  });
  return { people, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}
