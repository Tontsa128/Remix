import { DEFAULT_LANGUAGE_PREFERENCES, LANGUAGES, } from "../config/languages";
import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.language-preferences.v1";
const supportedCodes = new Set(LANGUAGES.map((language) => language.code));
function isLanguageCode(value) {
    return typeof value === "string" && supportedCodes.has(value);
}
function isPreferences(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return (isLanguageCode(candidate.interfaceLanguage) &&
        isLanguageCode(candidate.nativeLanguage) &&
        isLanguageCode(candidate.learningLanguage) &&
        isLanguageCode(candidate.interpretationSourceLanguage) &&
        isLanguageCode(candidate.interpretationTargetLanguage));
}
export function loadLocalLanguagePreferences() {
    try {
        const raw = globalThis.localStorage?.getItem(accountStorageKey(STORAGE_KEY));
        if (!raw)
            return { ...DEFAULT_LANGUAGE_PREFERENCES };
        const parsed = JSON.parse(raw);
        return isPreferences(parsed)
            ? parsed
            : { ...DEFAULT_LANGUAGE_PREFERENCES };
    }
    catch {
        return { ...DEFAULT_LANGUAGE_PREFERENCES };
    }
}
export function saveLocalLanguagePreferences(preferences) {
    try {
        const storage = globalThis.localStorage;
        if (!storage)
            return false;
        if (!isPreferences(preferences)) return false;
        storage.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(preferences));
        return true;
    }
    catch {
        return false;
    }
}
