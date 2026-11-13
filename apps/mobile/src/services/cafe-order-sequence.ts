import { CAFE_ORDER_SEQUENCE } from "../content/cafe-order-sequence";

export function createCafeOrderRound(random: () => number = Math.random): { optionIds: string[] } {
  const optionIds = CAFE_ORDER_SEQUENCE.map((step) => step.id);
  for (let index = optionIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
    [optionIds[index], optionIds[swapIndex]] = [optionIds[swapIndex], optionIds[index]];
  }
  return { optionIds };
}

export function isNextCafeOrderStep(selectedId: string, nextIndex: number): boolean {
  return CAFE_ORDER_SEQUENCE[nextIndex]?.id === selectedId;
}
