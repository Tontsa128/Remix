import {
  DEFAULT_LANGUAGE_PREFERENCES,
  LANGUAGES,
  type LanguageCode,
} from "../config/languages";
import type { UserLanguagePreferences } from "../types/preferences";

const STORAGE_KEY = "elovio.language-preferences.v1";
const supportedCodes = new Set(LANGUAGES.map((language) => language.code));

function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && supportedCodes.has(value);
}

function isPreferences(value: unknown): value is UserLanguagePreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    isLanguageCode(candidate.interfaceLanguage) &&
    isLanguageCode(candidate.nativeLanguage) &&
    isLanguageCode(candidate.learningLanguage) &&
    isLanguageCode(candidate.interpretationSourceLanguage) &&
    isLanguageCode(candidate.interpretationTargetLanguage)
  );
}

export function loadLocalLanguagePreferences(): UserLanguagePreferences {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LANGUAGE_PREFERENCES };
    const parsed: unknown = JSON.parse(raw);
    return isPreferences(parsed)
      ? parsed
      : { ...DEFAULT_LANGUAGE_PREFERENCES };
  } catch {
    return { ...DEFAULT_LANGUAGE_PREFERENCES };
  }
}

export function saveLocalLanguagePreferences(
  preferences: UserLanguagePreferences,
): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
