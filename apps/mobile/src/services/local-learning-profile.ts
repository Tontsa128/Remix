import type { LearningProfile } from "../types/learning";

const STORAGE_KEY = "elovio.learning-profile.v1";

export const DEFAULT_LEARNING_PROFILE: LearningProfile = {
  displayName: "",
  dailyGoalMinutes: 15,
  weeklyGoalDays: 5,
};

function isLearningProfile(value: unknown): value is LearningProfile {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.displayName === "string" &&
    candidate.displayName.length <= 80 &&
    typeof candidate.dailyGoalMinutes === "number" &&
    [5, 10, 15, 20, 30].includes(candidate.dailyGoalMinutes) &&
    typeof candidate.weeklyGoalDays === "number" &&
    Number.isInteger(candidate.weeklyGoalDays) &&
    candidate.weeklyGoalDays >= 1 &&
    candidate.weeklyGoalDays <= 7
  );
}

export function loadLocalLearningProfile(): LearningProfile {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_LEARNING_PROFILE };
    const parsed: unknown = JSON.parse(raw);
    return isLearningProfile(parsed)
      ? parsed
      : { ...DEFAULT_LEARNING_PROFILE };
  } catch {
    return { ...DEFAULT_LEARNING_PROFILE };
  }
}

export function saveLocalLearningProfile(profile: LearningProfile): boolean {
  if (!isLearningProfile(profile)) return false;
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}
