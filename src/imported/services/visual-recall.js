import { VISUAL_VOCABULARY } from "../content/visual-vocabulary";
function shuffle(items, random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}
export function createVisualRecallRound(entries = VISUAL_VOCABULARY, random = Math.random) {
    if (entries.length < 3 || new Set(entries.map((entry) => entry.id)).size !== entries.length)
        return null;
    const sequence = shuffle(entries, random).slice(0, 3);
    const targetPosition = Math.min(2, Math.floor(random() * sequence.length));
    return {
        sequenceIds: sequence.map((entry) => entry.id),
        targetPosition,
        choiceIds: shuffle(sequence, random).map((entry) => entry.id),
    };
}
