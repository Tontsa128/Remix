export type RealtimeTranscriptionSession = {
  clientSecret: string;
  expiresAt: number;
  websocketUrl: string;
  audio: { format: "pcm16"; sampleRate: 24_000; channels: 1 };
  languageHints: Array<"fi" | "es" | "en">;
};

export class RealtimeTranscriptionApiError extends Error {
  constructor(readonly code: string) {
    super("Realtime transcription session request failed");
    this.name = "RealtimeTranscriptionApiError";
  }
}

function resolveEndpoint(baseUrl: string, isWeb: boolean): string {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (base) return base + "/api/ai/transcription-session";
  if (isWeb) return "/api/ai/transcription-session";
  throw new RealtimeTranscriptionApiError("server_missing");
}

function parseSession(value: unknown): RealtimeTranscriptionSession {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RealtimeTranscriptionApiError("invalid_response");
  }
  const session = value as Record<string, unknown>;
  const audio = session.audio;
  if (typeof session.clientSecret !== "string" ||
      session.clientSecret.length < 16 ||
      session.clientSecret.length > 4096 ||
      typeof session.expiresAt !== "number" ||
      !Number.isSafeInteger(session.expiresAt) ||
      session.expiresAt <= Math.floor(Date.now() / 1000) ||
      typeof session.websocketUrl !== "string" ||
      !session.websocketUrl.startsWith("wss://") ||
      !audio || typeof audio !== "object" ||
      (audio as Record<string, unknown>).format !== "pcm16" ||
      (audio as Record<string, unknown>).sampleRate !== 24_000 ||
      (audio as Record<string, unknown>).channels !== 1 ||
      !Array.isArray(session.languageHints) ||
      !session.languageHints.every((item) => item === "fi" || item === "es" || item === "en")) {
    throw new RealtimeTranscriptionApiError("invalid_response");
  }
  return session as unknown as RealtimeTranscriptionSession;
}

export async function createRealtimeTranscriptionSession(
  accessToken: string,
  baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  fetcher: typeof fetch = fetch,
  isWeb = typeof window !== "undefined",
): Promise<RealtimeTranscriptionSession> {
  if (!accessToken || accessToken.length > 8192) {
    throw new RealtimeTranscriptionApiError("authentication_required");
  }
  try {
    const response = await fetcher(resolveEndpoint(baseUrl, isWeb), {
      method: "POST",
      headers: { Authorization: "Bearer " + accessToken },
    });
    const payload = await response.json() as unknown;
    if (!response.ok) {
      const code = payload && typeof payload === "object" &&
        typeof (payload as Record<string, unknown>).error === "string"
        ? (payload as Record<string, string>).error
        : "request_failed";
      throw new RealtimeTranscriptionApiError(code);
    }
    return parseSession(payload);
  } catch (error) {
    if (error instanceof RealtimeTranscriptionApiError) throw error;
    throw new RealtimeTranscriptionApiError("request_failed");
  }
}
