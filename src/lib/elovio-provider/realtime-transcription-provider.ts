import { parseRealtimeTranscriptionSession, REALTIME_TRANSCRIPTION_LANGUAGES } from "./realtime-transcription-validation";

export class RealtimeTranscriptionProviderError extends Error {
  constructor() {
    super("Realtime transcription provider request failed");
    this.name = "RealtimeTranscriptionProviderError";
  }
}

export interface RealtimeTranscriptionProvider {
  createSession(): Promise<{ clientSecret: string; expiresAt: number }>;
}

export function createOpenAIRealtimeTranscriptionProvider(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): RealtimeTranscriptionProvider {
  return {
    async createSession() {
      try {
        const response = await fetcher("https://api.openai.com/v1/realtime/client_secrets", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expires_after: { anchor: "created_at", seconds: 60 },
            session: {
              type: "transcription",
              audio: {
                input: {
                  format: { type: "audio/pcm", rate: 24000 },
                  transcription: {
                    model: "gpt-transcribe",
                    languages: [...REALTIME_TRANSCRIPTION_LANGUAGES],
                  },
                  turn_detection: null,
                },
              },
            },
          }),
          signal: AbortSignal.timeout(12_000),
        });
        if (!response.ok) throw new RealtimeTranscriptionProviderError();
        const session = parseRealtimeTranscriptionSession(await response.json());
        if (!session || session.expiresAt <= Math.floor(Date.now() / 1000)) {
          throw new RealtimeTranscriptionProviderError();
        }
        return session;
      } catch {
        throw new RealtimeTranscriptionProviderError();
      }
    },
  };
}
