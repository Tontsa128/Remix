import { HOTEL_CHECKIN_SEQUENCE } from "../content/hotel-checkin-sequence";

export function createHotelCheckinRound(random: () => number = Math.random): { optionIds: string[] } {
  const optionIds = HOTEL_CHECKIN_SEQUENCE.map((step) => step.id);
  for (let index = optionIds.length - 1; index > 0; index -= 1) {
    const value = random();
    const swapIndex = Math.max(0, Math.min(index, Math.floor(value * (index + 1))));
    [optionIds[index], optionIds[swapIndex]] = [optionIds[swapIndex], optionIds[index]];
  }
  return { optionIds };
}

export function isNextHotelCheckinStep(selectedId: string, nextIndex: number): boolean {
  return HOTEL_CHECKIN_SEQUENCE[nextIndex]?.id === selectedId;
}
