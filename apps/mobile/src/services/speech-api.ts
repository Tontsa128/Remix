import type { SpeechGender, SpeechLanguage } from "./speech-preferences";

export type SpeechVoice = {
  name: string;
  languageCode: string;
  gender: SpeechGender;
  naturalSampleRateHertz: number;
};

export class SpeechApiError extends Error {
  constructor(readonly code: string) {
    super("Speech service request failed");
    this.name = "SpeechApiError";
  }
}

function endpoint(path: string, baseUrl: string, isWeb: boolean): string {
  const base = baseUrl.trim().replace(/\/$/, "");
  if (base) return base + path;
  if (isWeb) return path;
  throw new SpeechApiError("server_missing");
}

function parseVoices(value: unknown): SpeechVoice[] {
  if (!value || typeof value !== "object" || !Array.isArray((value as Record<string, unknown>).voices)) {
    throw new SpeechApiError("invalid_response");
  }
  return ((value as { voices: unknown[] }).voices).filter((item): item is SpeechVoice => {
    if (!item || typeof item !== "object") return false;
    const voice = item as Record<string, unknown>;
    return typeof voice.name === "string" &&
      (voice.gender === "FEMALE" || voice.gender === "MALE") &&
      typeof voice.languageCode === "string" &&
      typeof voice.naturalSampleRateHertz === "number";
  });
}

export async function fetchSpeechVoices(
  language: SpeechLanguage,
  accessToken: string,
  baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  fetcher: typeof fetch = fetch,
  isWeb = typeof window !== "undefined",
): Promise<SpeechVoice[]> {
  try {
    const url = endpoint("/api/ai/voices?language=" + language, baseUrl, isWeb);
    const response = await fetcher(url, { headers: { Authorization: "Bearer " + accessToken } });
    const payload = await response.json() as unknown;
    if (!response.ok) throw new SpeechApiError((payload as { error?: string })?.error ?? "request_failed");
    const voices = parseVoices(payload);
    return voices;
  } catch (error) {
    if (error instanceof SpeechApiError) throw error;
    throw new SpeechApiError("request_failed");
  }
}

export async function synthesizeSpeech(
  text: string,
  language: SpeechLanguage,
  voiceName: string,
  gender: SpeechGender,
  accessToken: string,
  baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  fetcher: typeof fetch = fetch,
  isWeb = typeof window !== "undefined",
): Promise<string> {
  try {
    const url = endpoint("/api/ai/synthesize", baseUrl, isWeb);
    const response = await fetcher(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + accessToken },
      body: JSON.stringify({ text, language, voiceName, gender }),
    });
    const payload = await response.json() as { audioContent?: unknown; error?: string };
    if (!response.ok) throw new SpeechApiError(payload.error ?? "request_failed");
    if (typeof payload.audioContent !== "string" ||
        payload.audioContent.length < 100 ||
        payload.audioContent.length > 4_000_000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.audioContent)) {
      throw new SpeechApiError("invalid_response");
    }
    return payload.audioContent;
  } catch (error) {
    if (error instanceof SpeechApiError) throw error;
    throw new SpeechApiError("request_failed");
  }
}
