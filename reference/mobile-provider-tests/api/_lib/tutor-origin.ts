export function isTutorOriginAllowed(
  origin: string,
  requestHost: string | undefined,
  allowedOrigins: string[],
): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (!requestHost) return false;
  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
  } catch {
    return false;
  }
}
