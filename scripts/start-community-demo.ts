import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createGymServer } from "../server/app";
import { createAdvancedMachineDemoScenario, createCommunityFriendDemoScenario, createDemoScenario } from "../src/data/demoScenarios";
import { exportCoachProgress, exportProgress, exportRoutine } from "../src/logic/sharing";

async function main() {
  const port = Number(process.env.GYM_API_PORT ?? 8082);
  const database = resolve(process.env.GYM_DATABASE ?? "server/data/akhyles.sqlite");
  mkdirSync(dirname(database), { recursive: true });
  const server = createGymServer({ database, origins: ["http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:8090", "http://127.0.0.1:8090"], authLimit: 100 });
  await new Promise<void>(resolve => server.listen(port, "127.0.0.1", resolve));
  const call = async (path: string, method: string, data: unknown, token?: string) => {
    const response = await fetch(`http://127.0.0.1:${port}${path}`, { method,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  };
  const people = [];
  for (const state of [createAdvancedMachineDemoScenario(), createCommunityFriendDemoScenario()]) {
    const credentials = { handle: state.profile.handle, name: state.profile.name, password: "Akhyles-demo-local-2026", level: state.profile.level };
    let account;
    try { account = await call("/auth/login", "POST", credentials); }
    catch { account = await call("/auth/register", "POST", credentials); }
    const token = account.token;
    await call("/me", "PATCH", { name: state.profile.name, bio: state.profile.handle === "marcos_avanza" ? "Dos años de entrenamiento avanzado, con rutina torso-pierna y registros de máquinas." : "Seis meses de entrenamiento constante en rutina torso-pierna. Perfil de demostración.", level: state.profile.level }, token);
    await call("/routines/me", "PUT", exportRoutine(state.routine, state.preferences), token);
    await call("/progress/me", "PUT", exportProgress(state, true, true), token);
    await call("/me/privacy", "PATCH", { routinePublic: true, progressPublic: true, detailsPublic: true, bodyWeightPublic: true, rankingPublic: true }, token);
    people.push(account);
  }
  await call(`/follow/${people[1].user.id}`, "PUT", {}, people[0].token);
  await call(`/follow/${people[0].user.id}`, "PUT", {}, people[1].token);
  const trainer = people[0];
  await call("/me", "PATCH", { trainerEnabled: true, name: "Marcos Avanza", bio: "Entrenador de prueba local: datos ficticios.", level: "advanced" }, trainer.token);
  await call("/me/trainer-profile", "PUT", { public: true, specialties: ["Fuerza", "Hipertrofia"], modalities: ["Presencial", "Online"], experienceYears: 8, credentials: "Perfil profesional simulado", availability: "Demo local", pricing: "Solo prueba", statsPublic: true }, trainer.token);
  const clients = ["lucia_fuerza", "diego_constante", "sofia_progreso", "ivan_torso", "clara_disciplina", "hugo_atleta"];
  for (const [index, handle] of clients.entries()) {
    let account;
    try { account = await call("/auth/login", "POST", { handle, password: "Akhyles-demo-local-2026" }); }
    catch { account = await call("/auth/register", "POST", { handle, name: ["Lucia Fuerza", "Diego Constante", "Sofia Progreso", "Ivan Torso", "Clara Disciplina", "Hugo Atleta"][index], password: "Akhyles-demo-local-2026", level: index % 2 ? "intermediate" : "advanced" }); }
    const clientState = handle === "lucia_fuerza" ? createDemoScenario(true) : createCommunityFriendDemoScenario();
    await call("/me", "PATCH", { name: ["Lucia Fuerza", "Diego Constante", "Sofia Progreso", "Ivan Torso", "Clara Disciplina", "Hugo Atleta"][index], bio: "Deportista ficticio de la demostracion local.", level: index % 2 ? "intermediate" : "advanced" }, account.token);
    await call("/routines/me", "PUT", exportRoutine(clientState.routine, clientState.preferences), account.token);
    await call("/progress/me", "PUT", exportProgress(clientState, true, true), account.token);
    const request = await call("/coaching/requests", "POST", { targetId: trainer.user.id }, account.token);
    await call(`/coaching/${request.id}`, "PATCH", { action: "accept" }, trainer.token);
    await call(`/coaching/${request.id}/stats-consent`, "PUT", { enabled: true }, account.token);
    await call("/coaching/routine/me", "PUT", exportRoutine(clientState.routine, clientState.preferences), account.token);
    await call("/coaching/progress/me", "PUT", exportCoachProgress(clientState), account.token);
  }
  console.log("Comunidad local lista en 127.0.0.1:" + port + "; Marcos y Leo están conectados.");
}
void main().catch(error => { console.error(error.message); process.exit(1); });
