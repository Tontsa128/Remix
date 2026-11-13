export const REALTIME_TRANSCRIPTION_LANGUAGES = ["fi", "es", "en"] as const;
export type RealtimeTranscriptionLanguage = (typeof REALTIME_TRANSCRIPTION_LANGUAGES)[number];

export type RealtimeTranscriptionSession = {
  clientSecret: string;
  expiresAt: number;
};

export function parseRealtimeTranscriptionSession(value: unknown): RealtimeTranscriptionSession | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.value !== "string" || candidate.value.length < 20 || candidate.value.length > 4096) return null;
  if (typeof candidate.expires_at !== "number" || !Number.isInteger(candidate.expires_at)) return null;
  return { clientSecret: candidate.value, expiresAt: candidate.expires_at };
}
