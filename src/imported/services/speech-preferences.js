import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.speech-preferences.v1";
function isGender(value) {
    return value === "FEMALE" || value === "MALE";
}
function parsePreferences(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return {};
    const candidate = value;
    const result = {};
    for (const language of ["fi", "es", "en"]) {
        const entry = candidate[language];
        if (!entry || typeof entry !== "object" || Array.isArray(entry))
            continue;
        const preference = entry;
        if (!isGender(preference.gender) || typeof preference.voiceName !== "string" ||
            !/^[A-Za-z0-9-]{3,100}$/.test(preference.voiceName))
            continue;
        result[language] = { gender: preference.gender, voiceName: preference.voiceName };
    }
    return result;
}
function resolveStorage(storage) {
    if (storage)
        return storage;
    try {
        return globalThis.localStorage;
    }
    catch {
        return undefined;
    }
}
export function loadLocalSpeechPreferences(storage) {
    try {
        const raw = resolveStorage(storage)?.getItem(accountStorageKey(STORAGE_KEY));
        return raw ? parsePreferences(JSON.parse(raw)) : {};
    }
    catch {
        return {};
    }
}
export function saveLocalSpeechPreferences(preferences, storage) {
    try {
        const target = resolveStorage(storage);
        if (!target)
            return false;
        target.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(parsePreferences(preferences)));
        return true;
    }
    catch {
        return false;
    }
}
