export type SpeechLanguage = "fi" | "es" | "en";
export type SpeechGender = "FEMALE" | "MALE";
export type SpeechVoicePreference = { gender: SpeechGender; voiceName: string };
export type SpeechPreferences = Partial<Record<SpeechLanguage, SpeechVoicePreference>>;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

const STORAGE_KEY = "elovio.speech-preferences.v1";

function isGender(value: unknown): value is SpeechGender {
  return value === "FEMALE" || value === "MALE";
}

function parsePreferences(value: unknown): SpeechPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const candidate = value as Record<string, unknown>;
  const result: SpeechPreferences = {};
  for (const language of ["fi", "es", "en"] as const) {
    const entry = candidate[language];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const preference = entry as Record<string, unknown>;
    if (!isGender(preference.gender) || typeof preference.voiceName !== "string" ||
        !/^[A-Za-z0-9-]{3,100}$/.test(preference.voiceName)) continue;
    result[language] = { gender: preference.gender, voiceName: preference.voiceName };
  }
  return result;
}

function resolveStorage(storage?: StorageLike): StorageLike | undefined {
  if (storage) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadLocalSpeechPreferences(storage?: StorageLike): SpeechPreferences {
  try {
    const raw = resolveStorage(storage)?.getItem(STORAGE_KEY);
    return raw ? parsePreferences(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveLocalSpeechPreferences(
  preferences: SpeechPreferences,
  storage?: StorageLike,
): boolean {
  try {
    const target = resolveStorage(storage);
    if (!target) return false;
    target.setItem(STORAGE_KEY, JSON.stringify(parsePreferences(preferences)));
    return true;
  } catch {
    return false;
  }
}
