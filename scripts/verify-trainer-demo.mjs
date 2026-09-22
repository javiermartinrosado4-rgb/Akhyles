import { chromium } from "playwright";

const webUrl = process.env.AKHYLES_DEMO_WEB_URL ?? "http://localhost:8081/?demo";
const apiUrl = process.env.AKHYLES_DEMO_API_URL ?? "http://127.0.0.1:8082";
const credentials = { handle: "marcos_avanza", password: "Akhyles-demo-local-2026" };

const fail = message => {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
};

let apiSession;
try {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) throw new Error(`login HTTP ${response.status}`);
  apiSession = await response.json();
  if (apiSession.user?.trainerEnabled !== true) throw new Error("trainerEnabled no es true");
  console.log(`PASS API: ${apiSession.user.handle} con trainerEnabled=true`);
} catch (error) {
  fail(`API local no disponible: ${error.message}`);
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(webUrl, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(2_000);
  const body = await page.locator("body").innerText();
  const trainerCount = await page.getByText("Entrenador", { exact: true }).count();
  if (!body.includes("Tu espacio de entrenamiento")) fail("la Web no ha cargado el shell autenticado");
  if (page.url().includes("onboarding") || body.includes("Crear mi rutina")) fail("la Web sigue en bienvenida/onboarding");
  if (!trainerCount) fail("no aparece la pestaña Entrenador");
  if (pageErrors.length) fail(`hay errores de página: ${pageErrors.join(" | ")}`);
  if (!process.exitCode) console.log(`PASS Web: ${page.url()} · pestaña Entrenador visible`);
} catch (error) {
  fail(`Web local no verificable: ${error.message}`);
} finally {
  await browser.close();
}

if (process.exitCode) process.exit(process.exitCode);
