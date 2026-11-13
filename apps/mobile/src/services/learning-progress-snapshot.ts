import type { LocalLearningProgress, StudyDay } from "../types/learning";
import { loadLocalLearningProgress, parseLocalLearningProgress } from "./local-learning-progress";
import { loadVisualVocabularyProgress, parseVisualVocabularyProgress, type VisualVocabularyProgress } from "./local-visual-vocabulary-progress";
import { loadStudyDays, parseStudyDays } from "./local-learning-activity";

export type LearningProgressSnapshot = {
  schemaVersion: 1;
  learning: LocalLearningProgress;
  visualVocabulary: VisualVocabularyProgress;
  studyDays: StudyDay[];
};

export type LearningProgressRow = {
  schema_version: number;
  progress: unknown;
};

export function createLocalLearningSnapshot(): LearningProgressSnapshot {
  return {
    schemaVersion: 1,
    learning: loadLocalLearningProgress(),
    visualVocabulary: loadVisualVocabularyProgress(),
    studyDays: loadStudyDays(),
  };
}

export function parseLearningProgressSnapshot(value: unknown): LearningProgressSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { schemaVersion: 1, learning: parseLocalLearningProgress(null), visualVocabulary: parseVisualVocabularyProgress(null), studyDays: [] };
  }
  const candidate = value as Record<string, unknown>;
  return {
    schemaVersion: 1,
    learning: parseLocalLearningProgress(candidate.learning),
    visualVocabulary: parseVisualVocabularyProgress(candidate.visualVocabulary),
    studyDays: parseStudyDays(candidate.studyDays),
  };
}

function latestTimestamp(left: string | null, right: string | null): string | null {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(left) >= Date.parse(right) ? left : right;
}

export function mergeLearningProgressSnapshots(
  localValue: unknown,
  remoteValue: unknown,
): LearningProgressSnapshot {
  const local = parseLearningProgressSnapshot(localValue);
  const remote = parseLearningProgressSnapshot(remoteValue);

  const reviewSchedule = { ...remote.learning.reviewSchedule };
  for (const [phraseId, localEntry] of Object.entries(local.learning.reviewSchedule)) {
    const remoteEntry = reviewSchedule[phraseId];
    if (!remoteEntry || Date.parse(localEntry.lastReviewedAt) > Date.parse(remoteEntry.lastReviewedAt)) {
      reviewSchedule[phraseId] = localEntry;
    }
  }

  const history = new Map<string, LocalLearningProgress["reviewHistory"][number]>();
  for (const item of [...remote.learning.reviewHistory, ...local.learning.reviewHistory]) {
    history.set(`${item.phraseId}:${item.reviewedAt}`, item);
  }
  const reviewHistory = [...history.values()]
    .sort((a, b) => Date.parse(a.reviewedAt) - Date.parse(b.reviewedAt))
    .slice(-500);

  const studyByDate = new Map<string, number>();
  for (const day of [...remote.studyDays, ...local.studyDays]) {
    studyByDate.set(day.date, Math.max(studyByDate.get(day.date) ?? 0, day.seconds));
  }

  const completedPhraseIds = new Set([
    ...remote.learning.completedPhraseIds,
    ...local.learning.completedPhraseIds,
  ]);
  // A newer "again" review must be allowed to undo an older mastery mark.
  for (const [phraseId, schedule] of Object.entries(reviewSchedule)) {
    if (schedule.repetitions === 0 && schedule.lapses > 0) {
      completedPhraseIds.delete(phraseId);
    } else if (schedule.repetitions > 0) {
      completedPhraseIds.add(phraseId);
    }
  }

  return {
    schemaVersion: 1,
    learning: {
      completedPhraseIds: [...completedPhraseIds],
      reviewedPhraseIds: [...new Set([...remote.learning.reviewedPhraseIds, ...local.learning.reviewedPhraseIds])],
      reviewSchedule,
      reviewHistory,
    },
    visualVocabulary: {
      masteredEntryIds: [...new Set([...remote.visualVocabulary.masteredEntryIds, ...local.visualVocabulary.masteredEntryIds])],
      lastPracticedAt: latestTimestamp(
        remote.visualVocabulary.lastPracticedAt,
        local.visualVocabulary.lastPracticedAt,
      ),
    },
    studyDays: [...studyByDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-90)
      .map(([date, seconds]) => ({ date, seconds })),
  };
}

