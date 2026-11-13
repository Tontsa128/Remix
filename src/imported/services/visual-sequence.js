import { COFFEE_PREPARATION_SEQUENCE } from "../content/visual-sequences";
function shuffle(items, random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}
export function createVisualSequenceRound(random = Math.random) {
    return { optionIds: shuffle(COFFEE_PREPARATION_SEQUENCE, random).map((step) => step.id) };
}
export function isNextVisualSequenceStep(selectedId, nextIndex) {
    const expected = COFFEE_PREPARATION_SEQUENCE[nextIndex];
    return Boolean(expected && expected.id === selectedId);
}
