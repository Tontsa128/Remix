import { STARTER_PHRASES } from "../content/initial-phrases";
import type {
  LocalLearningProgress,
  ReviewHistoryEntry,
  ReviewScheduleEntry,
} from "../types/learning";

export type { LocalLearningProgress } from "../types/learning";

const STORAGE_KEY = "elovio.learning-progress.v1";
const EMPTY_PROGRESS: LocalLearningProgress = {
  completedPhraseIds: [],
  reviewedPhraseIds: [],
  reviewSchedule: {},
  reviewHistory: [],
};

const validIds = new Set(STARTER_PHRASES.map((phrase) => phrase.id));

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseSchedule(value: unknown): Record<string, ReviewScheduleEntry> {
  if (!isRecord(value)) return {};
  const schedule: Record<string, ReviewScheduleEntry> = {};
  for (const [phraseId, candidate] of Object.entries(value)) {
    if (!validIds.has(phraseId) || !isRecord(candidate)) continue;
    const { repetitions, intervalDays, dueAt, lastReviewedAt, lapses } = candidate;
    if (
      typeof repetitions !== "number" || !Number.isInteger(repetitions) || repetitions < 0 ||
      typeof intervalDays !== "number" || !Number.isFinite(intervalDays) || intervalDays < 0 ||
      typeof dueAt !== "string" || !Number.isFinite(Date.parse(dueAt)) ||
      typeof lastReviewedAt !== "string" || !Number.isFinite(Date.parse(lastReviewedAt)) ||
      typeof lapses !== "number" || !Number.isInteger(lapses) || lapses < 0
    ) continue;
    schedule[phraseId] = { repetitions, intervalDays, dueAt, lastReviewedAt, lapses };
  }
  return schedule;
}

function parseHistory(value: unknown): ReviewHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((candidate): candidate is ReviewHistoryEntry => {
    if (!isRecord(candidate)) return false;
    return (
      typeof candidate.phraseId === "string" && validIds.has(candidate.phraseId) &&
      (candidate.result === "known" || candidate.result === "again") &&
      typeof candidate.reviewedAt === "string" && Number.isFinite(Date.parse(candidate.reviewedAt)) &&
      typeof candidate.dueAt === "string" && Number.isFinite(Date.parse(candidate.dueAt)) &&
      typeof candidate.intervalDays === "number" && Number.isFinite(candidate.intervalDays) &&
      candidate.intervalDays >= 0
    );
  }).slice(-500);
}

export function parseLocalLearningProgress(value: unknown): LocalLearningProgress {
  if (!isRecord(value)) return { ...EMPTY_PROGRESS };
  const completedPhraseIds = Array.isArray(value.completedPhraseIds)
    ? [...new Set(value.completedPhraseIds.filter(
        (id): id is string => typeof id === "string" && validIds.has(id),
      ))]
    : [];
  const reviewedPhraseIds = Array.isArray(value.reviewedPhraseIds)
    ? [...new Set(value.reviewedPhraseIds.filter(
        (id): id is string => typeof id === "string" && validIds.has(id),
      ))]
    : [];
  return {
    completedPhraseIds,
    reviewedPhraseIds,
    reviewSchedule: parseSchedule(value.reviewSchedule),
    reviewHistory: parseHistory(value.reviewHistory),
  };
}

export function loadLocalLearningProgress(): LocalLearningProgress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_PROGRESS };
    return parseLocalLearningProgress(JSON.parse(raw));
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

export function saveLocalLearningProgress(progress: LocalLearningProgress): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(parseLocalLearningProgress(progress)));
    return true;
  } catch {
    return false;
  }
}
