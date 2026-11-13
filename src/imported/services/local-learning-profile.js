import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.learning-profile.v1";
export const DEFAULT_LEARNING_PROFILE = {
    displayName: "",
    dailyGoalMinutes: 15,
    weeklyGoalDays: 5,
};
function isLearningProfile(value) {
    if (!value || typeof value !== "object")
        return false;
    const candidate = value;
    return (typeof candidate.displayName === "string" &&
        candidate.displayName.length <= 80 &&
        typeof candidate.dailyGoalMinutes === "number" &&
        [5, 10, 15, 20, 30].includes(candidate.dailyGoalMinutes) &&
        typeof candidate.weeklyGoalDays === "number" &&
        Number.isInteger(candidate.weeklyGoalDays) &&
        candidate.weeklyGoalDays >= 1 &&
        candidate.weeklyGoalDays <= 7);
}
export function loadLocalLearningProfile() {
    try {
        const raw = globalThis.localStorage?.getItem(accountStorageKey(STORAGE_KEY));
        if (!raw)
            return { ...DEFAULT_LEARNING_PROFILE };
        const parsed = JSON.parse(raw);
        return isLearningProfile(parsed)
            ? parsed
            : { ...DEFAULT_LEARNING_PROFILE };
    }
    catch {
        return { ...DEFAULT_LEARNING_PROFILE };
    }
}
export function saveLocalLearningProfile(profile) {
    if (!isLearningProfile(profile))
        return false;
    try {
        const storage = globalThis.localStorage;
        if (!storage)
            return false;
        storage.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(profile));
        return true;
    }
    catch {
        return false;
    }
}
