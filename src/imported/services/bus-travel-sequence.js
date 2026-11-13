import { BUS_TRAVEL_SEQUENCE } from "../content/bus-travel-sequence";
export function createBusTravelSequenceRound(random = Math.random) {
    const optionIds = BUS_TRAVEL_SEQUENCE.map((step) => step.id);
    for (let index = optionIds.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
        [optionIds[index], optionIds[swapIndex]] = [optionIds[swapIndex], optionIds[index]];
    }
    return { optionIds };
}
export function isNextBusTravelStep(selectedId, nextIndex) {
    const expected = BUS_TRAVEL_SEQUENCE[nextIndex];
    return Boolean(expected && expected.id === selectedId);
}
