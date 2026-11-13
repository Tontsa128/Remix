export function isElovioApiOriginAllowed(
  origin: string | null,
  requestOrigin: string,
  configuredOrigins: readonly string[] = [],
): boolean {
  if (!origin) return true; // Native clients authenticate with a bearer token and do not send Origin.
  try {
    const parsed = new URL(origin);
    if (parsed.origin !== origin || (parsed.protocol !== "https:" && parsed.hostname !== "localhost")) return false;
    return configuredOrigins.includes(origin) || requestOrigin === origin;
  } catch {
    return false;
  }
}
