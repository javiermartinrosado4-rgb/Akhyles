import { isAbsolute } from "node:path";
import { requirePublicHttps } from "../src/logic/endpoints";

export function serverConfig(env: NodeJS.ProcessEnv = process.env) {
  const production = env.NODE_ENV === "production";
  const database = env.GYM_DATABASE ?? "server/data/akhyles.sqlite";
  const port = Number(env.GYM_API_PORT ?? 8082);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("GYM_API_PORT no válido.");
  if (production && (!env.GYM_DATABASE || !isAbsolute(database) || database === ":memory:"))
    throw new Error("Producción requiere GYM_DATABASE absoluto en disco persistente.");
  if (production && env.GYM_ALLOWED_ORIGINS === undefined)
    throw new Error("Define GYM_ALLOWED_ORIGINS; vacío permite únicamente clientes nativos sin Origin.");
  const origins = env.GYM_ALLOWED_ORIGINS === undefined ? undefined : env.GYM_ALLOWED_ORIGINS.split(",").map(s => s.trim()).filter(Boolean);
  for (const origin of origins ?? []) {
    const parsed = production ? requirePublicHttps(origin) : new URL(origin);
    if (parsed.origin !== origin) throw new Error("GYM_ALLOWED_ORIGINS requiere orígenes exactos sin rutas ni barra final.");
  }
  const googleClientId = env.GYM_GOOGLE_CLIENT_ID?.trim() ?? "";
  if (googleClientId && !/^[\w-]+\.apps\.googleusercontent\.com$/.test(googleClientId)) throw new Error("GYM_GOOGLE_CLIENT_ID no válido.");
  const accountFederationSecret = env.GYM_ACCOUNT_FEDERATION_SECRET?.trim() ?? "";
  if (accountFederationSecret) {
    const decoded = Buffer.from(accountFederationSecret, "base64");
    if (decoded.length < 32) throw new Error("GYM_ACCOUNT_FEDERATION_SECRET debe contener al menos 32 bytes en base64.");
  }
  return { database, origins, port, googleClientId, accountFederationSecret, host: env.GYM_API_HOST ?? "127.0.0.1", trustProxy: env.GYM_TRUST_PROXY === "1" };
}
