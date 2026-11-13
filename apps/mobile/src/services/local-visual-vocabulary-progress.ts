import { VISUAL_VOCABULARY } from "../content/visual-vocabulary";

const STORAGE_KEY = "elovio.visual-vocabulary-progress.v1";
const validIds = new Set(VISUAL_VOCABULARY.map((entry) => entry.id));

export type VisualVocabularyProgress = {
  masteredEntryIds: string[];
  lastPracticedAt: string | null;
};

export const EMPTY_VISUAL_VOCABULARY_PROGRESS: VisualVocabularyProgress = {
  masteredEntryIds: [],
  lastPracticedAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function parseVisualVocabularyProgress(value: unknown): VisualVocabularyProgress {
  if (!isRecord(value)) return { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
  const masteredEntryIds = Array.isArray(value.masteredEntryIds)
    ? [...new Set(value.masteredEntryIds.filter(
        (id): id is string => typeof id === "string" && validIds.has(id),
      ))]
    : [];
  const lastPracticedAt = typeof value.lastPracticedAt === "string" &&
    Number.isFinite(Date.parse(value.lastPracticedAt))
    ? value.lastPracticedAt
    : null;
  return { masteredEntryIds, lastPracticedAt };
}

export function loadVisualVocabularyProgress(): VisualVocabularyProgress {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? parseVisualVocabularyProgress(JSON.parse(raw)) : { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
  } catch {
    return { ...EMPTY_VISUAL_VOCABULARY_PROGRESS };
  }
}

export function saveVisualVocabularyProgress(progress: VisualVocabularyProgress): boolean {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(parseVisualVocabularyProgress(progress)));
    return true;
  } catch {
    return false;
  }
}

export function markVisualVocabularyMastered(
  progress: VisualVocabularyProgress,
  entryId: string,
  practicedAt = new Date(),
): VisualVocabularyProgress {
  if (!validIds.has(entryId) || !Number.isFinite(practicedAt.getTime())) return progress;
  return {
    masteredEntryIds: [...new Set([...progress.masteredEntryIds, entryId])],
    lastPracticedAt: practicedAt.toISOString(),
  };
}
