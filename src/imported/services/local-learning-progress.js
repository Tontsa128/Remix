import { STARTER_PHRASES } from "../content/initial-phrases";
import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.learning-progress.v1";
const EMPTY_PROGRESS = {
    completedPhraseIds: [],
    reviewedPhraseIds: [],
    reviewSchedule: {},
    reviewHistory: [],
};
const validIds = new Set(STARTER_PHRASES.map((phrase) => phrase.id));
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function parseSchedule(value) {
    if (!isRecord(value))
        return {};
    const schedule = {};
    for (const [phraseId, candidate] of Object.entries(value)) {
        if (!validIds.has(phraseId) || !isRecord(candidate))
            continue;
        const { repetitions, intervalDays, dueAt, lastReviewedAt, lapses } = candidate;
        if (typeof repetitions !== "number" || !Number.isInteger(repetitions) || repetitions < 0 ||
            typeof intervalDays !== "number" || !Number.isFinite(intervalDays) || intervalDays < 0 ||
            typeof dueAt !== "string" || !Number.isFinite(Date.parse(dueAt)) ||
            typeof lastReviewedAt !== "string" || !Number.isFinite(Date.parse(lastReviewedAt)) ||
            typeof lapses !== "number" || !Number.isInteger(lapses) || lapses < 0)
            continue;
        schedule[phraseId] = { repetitions, intervalDays, dueAt, lastReviewedAt, lapses };
    }
    return schedule;
}
function parseHistory(value) {
    if (!Array.isArray(value))
        return [];
    return value.filter((candidate) => {
        if (!isRecord(candidate))
            return false;
        return (typeof candidate.phraseId === "string" && validIds.has(candidate.phraseId) &&
            (candidate.result === "known" || candidate.result === "again") &&
            typeof candidate.reviewedAt === "string" && Number.isFinite(Date.parse(candidate.reviewedAt)) &&
            typeof candidate.dueAt === "string" && Number.isFinite(Date.parse(candidate.dueAt)) &&
            typeof candidate.intervalDays === "number" && Number.isFinite(candidate.intervalDays) &&
            candidate.intervalDays >= 0);
    }).slice(-500);
}
export function parseLocalLearningProgress(value) {
    if (!isRecord(value))
        return { ...EMPTY_PROGRESS };
    const completedPhraseIds = Array.isArray(value.completedPhraseIds)
        ? [...new Set(value.completedPhraseIds.filter((id) => typeof id === "string" && validIds.has(id)))]
        : [];
    const reviewedPhraseIds = Array.isArray(value.reviewedPhraseIds)
        ? [...new Set(value.reviewedPhraseIds.filter((id) => typeof id === "string" && validIds.has(id)))]
        : [];
    return {
        completedPhraseIds,
        reviewedPhraseIds,
        reviewSchedule: parseSchedule(value.reviewSchedule),
        reviewHistory: parseHistory(value.reviewHistory),
    };
}
export function loadLocalLearningProgress() {
    try {
        const raw = globalThis.localStorage?.getItem(accountStorageKey(STORAGE_KEY));
        if (!raw)
            return { ...EMPTY_PROGRESS };
        return parseLocalLearningProgress(JSON.parse(raw));
    }
    catch {
        return { ...EMPTY_PROGRESS };
    }
}
export function saveLocalLearningProgress(progress) {
    try {
        const storage = globalThis.localStorage;
        if (!storage)
            return false;
        storage.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(parseLocalLearningProgress(progress)));
        return true;
    }
    catch {
        return false;
    }
}
