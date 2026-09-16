import { lookup } from "node:dns/promises";
import { requirePublicHttps } from "../src/logic/endpoints";

async function main() {
  const url = requirePublicHttps(process.env.EXPO_PUBLIC_COMMUNITY_URL ?? "");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => {
    if (address.includes(":")) return !/^[23][0-9a-f]{3}:/i.test(address); // Global unicast 2000::/3.
    const [a, b, c] = address.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || (b === 0 && (c === 0 || c === 2)))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113) ||
      (a === 100 && b >= 64 && b <= 127);
  })) throw new Error("El DNS de Comunidad no apunta exclusivamente a direcciones públicas.");
  const response = await fetch(`${url.toString().replace(/\/$/, "")}/health`, { redirect: "error", signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  if (!response.ok || body.service !== "akhyles-community" || body.ok !== true) throw new Error("El backend HTTPS no supera /health.");
  console.log("Backend público HTTPS y DNS comprobados.");
}
void main().catch(() => { console.error("La URL pública de Comunidad no supera HTTPS, DNS o salud del servicio."); process.exitCode = 1; });
