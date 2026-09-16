export function requirePublicHttps(value: string): URL {
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  // Require a public DNS name; reject all literal IPs, local names and URL tricks.
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
      !host.includes(".") || /^[\d.]+$/.test(host) || host.includes(":") ||
      /(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) ||
      /(^|\.)example\.(com|net|org)$/.test(host) || (url.port && url.port !== "443")) {
    throw new Error("Comunidad requiere un dominio público HTTPS sin credenciales, parámetros ni direcciones locales.");
  }
  return url;
}

export function resolveCommunityUrl(configured: string | undefined, webOrigin?: string, developmentHost?: string, production = false): string {
  if (configured?.trim()) {
    const url = production ? requirePublicHttps(configured) : new URL(configured.trim());
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      throw new Error("La dirección de Comunidad debe ser una URL HTTP(S) sin credenciales ni parámetros.");
    }
    return url.toString().replace(/\/$/, "");
  }
  if (production) return "";
  if (webOrigin) {
    const url = new URL(webOrigin);
    // Dedicated local review pair: two isolated browser stores, one demo API.
    url.port = ["localhost", "127.0.0.1"].includes(url.hostname) && ["8090", "8091"].includes(url.port) ? "9010" : "8082";
    return url.origin;
  }
  if (developmentHost) return `http://${developmentHost}:8082`;
  return "";
}

export function routineShareUrl(id: string, webUrl: string | undefined, nativeUrl: string): string {
  if (!webUrl?.trim()) return nativeUrl;
  const url = new URL(webUrl);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("La dirección pública de la app debe usar HTTPS.");
  url.pathname = `${url.pathname.replace(/\/$/, "")}/shared-routine`;
  url.search = "";
  url.hash = "";
  url.searchParams.set("id", id);
  return url.toString();
}
