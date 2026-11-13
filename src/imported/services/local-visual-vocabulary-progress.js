import { VISUAL_VOCABULARY } from "../content/visual-vocabulary";
import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.visual-vocabulary-progress.v1";
const validIds = new Set(VISUAL_VOCABULARY.map((entry) => entry.id));
export const EMPTY_VISUAL_VOCABULARY_PROGRESS = {
    masteredEntryIds: [],
    lastPracticedAt: null,
};
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function parseVisualVocabularyProgress(value) {
    if (!isRecord(value))
        return { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
    const masteredEntryIds = Array.isArray(value.masteredEntryIds)
        ? [...new Set(value.masteredEntryIds.filter((id) => typeof id === "string" && validIds.has(id)))]
        : [];
    const lastPracticedAt = typeof value.lastPracticedAt === "string" &&
        Number.isFinite(Date.parse(value.lastPracticedAt))
        ? value.lastPracticedAt
        : null;
    return { masteredEntryIds, lastPracticedAt };
}
export function loadVisualVocabularyProgress() {
    try {
        const raw = globalThis.localStorage?.getItem(accountStorageKey(STORAGE_KEY));
        return raw ? parseVisualVocabularyProgress(JSON.parse(raw)) : { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
    }
    catch {
        return { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
    }
}
export function saveVisualVocabularyProgress(progress) {
    try {
        const storage = globalThis.localStorage;
        if (!storage)
            return false;
        storage.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(parseVisualVocabularyProgress(progress)));
        return true;
    }
    catch {
        return false;
    }
}
export function markVisualVocabularyMastered(progress, entryId, practicedAt = new Date()) {
    if (!validIds.has(entryId) || !Number.isFinite(practicedAt.getTime()))
        return progress;
    return {
        masteredEntryIds: [...new Set([...progress.masteredEntryIds, entryId])],
        lastPracticedAt: practicedAt.toISOString(),
    };
}
