export function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}

export function resolveAppUrl(path: string, fallbackOrigin?: string) {
  const base = getSiteUrl() || fallbackOrigin || "";
  if (!base) return path;

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
