
export interface AccountUser { id: string; email: string; name: string; googleLinked: boolean; hasPassword: boolean }
export interface AccountSession { token: string; user: AccountUser }
export function resolveAccountUrl(value: string | undefined, development = false): string {
  if (!value?.trim()) return "";
  const url = new URL(value.trim());
  if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== "https:" && !(development && url.protocol === "http:" && ["localhost", "127.0.0.1", "10.0.2.2"].includes(url.hostname))))
    throw new Error("La cuenta de Akhyles necesita una dirección HTTPS válida.");
  return url.toString().replace(/\/$/, "");
}
// Expo's static web export can omit a locally supplied EXPO_PUBLIC_* variable
// from the browser bundle. Keep production web builds connected to the hosted
// account API while preserving the offline default for native/dev builds.
const configuredAccountUrl = process.env.EXPO_PUBLIC_ACCOUNT_URL ||
  (typeof window !== "undefined" ? "https://api.akhyles.com" : undefined);
export const accountUrl = resolveAccountUrl(configuredAccountUrl, typeof __DEV__ !== "undefined" && __DEV__);
export class AccountError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function accountRequest<T>(path: string, token?: string, method = "GET", data?: unknown): Promise<T> {
  if (!accountUrl) throw new AccountError(0, "El guardado en la nube aún no está activado en esta versión. Tus datos se guardan en este dispositivo.");
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${accountUrl}${path}`, {
      method, signal: controller.signal, cache: "no-store",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(method !== "GET" ? { "Content-Type": "application/json" } : {}) },
      body: method === "GET" ? undefined : JSON.stringify(data ?? {}),
    });
    const result = await response.json();
    if (!response.ok) throw new AccountError(response.status, result.error ?? "No se ha podido completar la operación.");
    return result as T;
  } catch (e) {
    if (e instanceof AccountError) throw e;
    throw new AccountError(0, "No se puede conectar. Tus cambios siguen en este dispositivo; volveremos a intentar sincronizarlos.");
  } finally { clearTimeout(timer); }
}
export async function latestAppVersion(): Promise<{ version: string; androidUrl?: string }> {
  return accountRequest<{ version: string; androidUrl?: string }>("/app/version");
}
