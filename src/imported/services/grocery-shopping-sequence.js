import { GROCERY_SHOPPING_SEQUENCE } from "../content/grocery-shopping-sequence";
export function createGroceryShoppingRound(random = Math.random) {
    const optionIds = GROCERY_SHOPPING_SEQUENCE.map((step) => step.id);
    for (let index = optionIds.length - 1; index > 0; index -= 1) {
        const value = random();
        const swapIndex = Math.max(0, Math.min(index, Math.floor(value * (index + 1))));
        [optionIds[index], optionIds[swapIndex]] = [optionIds[swapIndex], optionIds[index]];
    }
    return { optionIds };
}
export function isNextGroceryShoppingStep(selectedId, nextIndex) {
    return GROCERY_SHOPPING_SEQUENCE[nextIndex]?.id === selectedId;
}
