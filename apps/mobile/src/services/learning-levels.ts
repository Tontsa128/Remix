export const LEARNING_LEVELS = [
  { id: "beginner", threshold: 0, labelKey: "levelBeginner" },
  { id: "starter", threshold: 7, labelKey: "levelStarter" },
  { id: "developing", threshold: 14, labelKey: "levelDeveloping" },
  { id: "confident", threshold: 22, labelKey: "levelConfident" },
  { id: "independent", threshold: 30, labelKey: "levelIndependent" },
] as const;

export type LearningLevel = (typeof LEARNING_LEVELS)[number];

export function getLearningLevel(learnedPhraseCount: number): {
  current: LearningLevel;
  next: LearningLevel | null;
  learned: number;
  progressToNext: number;
} {
  const learned = Math.max(0, Math.min(30, Math.floor(Number.isFinite(learnedPhraseCount) ? learnedPhraseCount : 0)));
  let currentIndex = 0;
  for (let index = 1; index < LEARNING_LEVELS.length; index += 1) {
    if (learned >= LEARNING_LEVELS[index]!.threshold) currentIndex = index;
  }
  const current = LEARNING_LEVELS[currentIndex]!;
  const next = LEARNING_LEVELS[currentIndex + 1] ?? null;
  const progressToNext = next
    ? Math.round(((learned - current.threshold) / (next.threshold - current.threshold)) * 100)
    : 100;
  return { current, next, learned, progressToNext };
}
