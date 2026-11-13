import { accountStorageKey } from './account-storage';
const STORAGE_KEY = "elovio.study-activity.v1";
const MAX_DAILY_SECONDS = 24 * 60 * 60;
function localDayKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
export function parseStudyDays(value) {
    if (!Array.isArray(value))
        return [];
    const valid = new Map();
    for (const item of value) {
        if (!isRecord(item) || typeof item.date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(item.date) ||
            typeof item.seconds !== "number" || !Number.isFinite(item.seconds) ||
            item.seconds < 0)
            continue;
        const seconds = Math.min(MAX_DAILY_SECONDS, Math.floor(item.seconds));
        valid.set(item.date, Math.min(MAX_DAILY_SECONDS, (valid.get(item.date) ?? 0) + seconds));
    }
    return [...valid.entries()].sort(([a], [b]) => a.localeCompare(b))
        .slice(-90).map(([date, seconds]) => ({ date, seconds }));
}
export function loadStudyDays() {
    try {
        const raw = globalThis.localStorage?.getItem(accountStorageKey(STORAGE_KEY));
        return raw ? parseStudyDays(JSON.parse(raw)) : [];
    }
    catch {
        return [];
    }
}
export function saveStudyDays(days) {
    try {
        const storage = globalThis.localStorage;
        if (!storage)
            return false;
        storage.setItem(accountStorageKey(STORAGE_KEY), JSON.stringify(parseStudyDays(days)));
        return true;
    }
    catch {
        return false;
    }
}
export function recordStudySeconds(days, seconds, date = new Date()) {
    if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(date.getTime()))
        return days;
    const dateKey = localDayKey(date);
    const addition = Math.min(MAX_DAILY_SECONDS, Math.floor(seconds));
    const current = days.find((day) => day.date === dateKey)?.seconds ?? 0;
    return parseStudyDays([
        ...days.filter((day) => day.date !== dateKey),
        { date: dateKey, seconds: Math.min(MAX_DAILY_SECONDS, current + addition) },
    ]);
}
export function getStudySummary(days, now = new Date()) {
    const today = localDayKey(now);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
    const weekKeys = new Set();
    for (let offset = 0; offset < 7; offset += 1) {
        const day = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + offset);
        weekKeys.add(localDayKey(day));
    }
    const todaySeconds = days.find((day) => day.date === today)?.seconds ?? 0;
    const weekDays = days.filter((day) => weekKeys.has(day.date) && day.seconds > 0).length;
    const weekSeconds = days.filter((day) => weekKeys.has(day.date))
        .reduce((total, day) => total + day.seconds, 0);
    return { todaySeconds, weekDays, weekSeconds };
}
