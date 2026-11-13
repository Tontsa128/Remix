import { ASKING_DIRECTIONS_SEQUENCE } from "../content/asking-directions-sequence";

export function createAskingDirectionsRound(random: () => number = Math.random): { optionIds: string[] } {
  const optionIds = ASKING_DIRECTIONS_SEQUENCE.map((step) => step.id);
  for (let index = optionIds.length - 1; index > 0; index -= 1) {
    const value = random();
    const swapIndex = Math.max(0, Math.min(index, Math.floor(value * (index + 1))));
    [optionIds[index], optionIds[swapIndex]] = [optionIds[swapIndex], optionIds[index]];
  }
  return { optionIds };
}

export function isNextAskingDirectionsStep(selectedId: string, nextIndex: number): boolean {
  return ASKING_DIRECTIONS_SEQUENCE[nextIndex]?.id === selectedId;
}
