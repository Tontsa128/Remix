export const SPEECH_LANGUAGES = {
  fi: "fi-FI",
  es: "es-ES",
  en: "en-US",
} as const;

export type SpeechLanguage = keyof typeof SPEECH_LANGUAGES;
export type SpeechGender = "FEMALE" | "MALE";

export type SynthesisRequest = {
  text: string;
  language: SpeechLanguage;
  voiceName: string;
  gender: SpeechGender;
};

export function parseSynthesisRequest(value: unknown): SynthesisRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input["text"] !== "string") return null;
  const text = input["text"].trim();
  if (!text || text.length > 1200) return null;
  if (typeof input["language"] !== "string" || !(input["language"] in SPEECH_LANGUAGES)) return null;
  if (typeof input["voiceName"] !== "string" || !/^[A-Za-z0-9-]{3,100}$/.test(input["voiceName"])) return null;
  if (input["gender"] !== "FEMALE" && input["gender"] !== "MALE") return null;
  return {
    text,
    language: input["language"] as SpeechLanguage,
    voiceName: input["voiceName"],
    gender: input["gender"],
  };
}

export type SpeechVoice = {
  name: string;
  languageCode: string;
  gender: SpeechGender;
  naturalSampleRateHertz: number;
};

export function parseSpeechVoices(value: unknown, languageCode: string): SpeechVoice[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const voices = (value as Record<string, unknown>)["voices"];
  if (!Array.isArray(voices)) return null;
  const result: SpeechVoice[] = [];
  for (const item of voices) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const voice = item as Record<string, unknown>;
    if (typeof voice["name"] !== "string" || !/^[A-Za-z0-9-]{3,100}$/.test(voice["name"])) continue;
    if (voice["ssmlGender"] !== "FEMALE" && voice["ssmlGender"] !== "MALE") continue;
    if (!Array.isArray(voice["languageCodes"]) || !voice["languageCodes"].includes(languageCode)) continue;
    if (typeof voice["naturalSampleRateHertz"] !== "number" ||
        !Number.isInteger(voice["naturalSampleRateHertz"]) ||
        voice["naturalSampleRateHertz"] < 8000 || voice["naturalSampleRateHertz"] > 96000) continue;
    result.push({
      name: voice["name"],
      languageCode,
      gender: voice["ssmlGender"],
      naturalSampleRateHertz: voice["naturalSampleRateHertz"],
    });
  }
  return result;
}

export function parseSynthesisResult(value: unknown): { audioContent: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const audioContent = (value as Record<string, unknown>)["audioContent"];
  if (typeof audioContent !== "string" || audioContent["length"] < 100 ||
      audioContent["length"] > 4_000_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audioContent)) return null;
  return { audioContent };
}
