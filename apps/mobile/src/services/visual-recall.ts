import { VISUAL_VOCABULARY, type VisualVocabularyEntry } from "../content/visual-vocabulary";

export type VisualRecallRound = {
  sequenceIds: string[];
  targetPosition: number;
  choiceIds: string[];
};

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function createVisualRecallRound(
  entries: readonly Pick<VisualVocabularyEntry, "id">[] = VISUAL_VOCABULARY,
  random: () => number = Math.random,
): VisualRecallRound | null {
  if (entries.length < 3 || new Set(entries.map((entry) => entry.id)).size !== entries.length) return null;
  const sequence = shuffle(entries, random).slice(0, 3);
  const targetPosition = Math.min(2, Math.floor(random() * sequence.length));
  return {
    sequenceIds: sequence.map((entry) => entry.id),
    targetPosition,
    choiceIds: shuffle(sequence, random).map((entry) => entry.id),
  };
}
