export type LearningProfile = {
  displayName: string;
  dailyGoalMinutes: number;
  weeklyGoalDays: number;
};

export type ReviewScheduleEntry = {
  repetitions: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string;
  lapses: number;
};

export type ReviewHistoryEntry = {
  phraseId: string;
  result: "known" | "again";
  reviewedAt: string;
  dueAt: string;
  intervalDays: number;
};

export type LocalLearningProgress = {
  completedPhraseIds: string[];
  reviewedPhraseIds: string[];
  reviewSchedule: Record<string, ReviewScheduleEntry>;
  reviewHistory: ReviewHistoryEntry[];
};

export type StudyDay = {
  date: string;
  seconds: number;
};
