import assert from "node:assert/strict";
import test from "node:test";
import { GROCERY_SHOPPING_SEQUENCE } from "../../src/imported/content/grocery-shopping-sequence";
import { createGroceryShoppingRound, isNextGroceryShoppingStep } from "../../src/imported/services/grocery-shopping-sequence";
test("grocery shopping has four unique ordered and localized steps", () => {
    assert.equal(GROCERY_SHOPPING_SEQUENCE.length, 4);
    assert.deepEqual(GROCERY_SHOPPING_SEQUENCE.map((step) => step.order), [1, 2, 3, 4]);
    assert.equal(new Set(GROCERY_SHOPPING_SEQUENCE.map((step) => step.id)).size, 4);
    for (const step of GROCERY_SHOPPING_SEQUENCE) {
        for (const language of ["fi", "es", "en"]) {
            assert.ok(step.words[language].trim());
            assert.ok(step.description[language].trim());
        }
    }
});
test("grocery shopping accepts only the next semantic step", () => {
    assert.equal(isNextGroceryShoppingStep("take-basket", 0), true);
    assert.equal(isNextGroceryShoppingStep("pay-groceries", 0), false);
    assert.equal(isNextGroceryShoppingStep("pay-groceries", 2), true);
    assert.equal(isNextGroceryShoppingStep("pack-groceries", 4), false);
});
test("grocery shopping rounds contain every unique step in shuffled order", () => {
    const round = createGroceryShoppingRound(() => 0);
    assert.equal(new Set(round.optionIds).size, 4);
    assert.deepEqual([...round.optionIds].sort(), GROCERY_SHOPPING_SEQUENCE.map((step) => step.id).sort());
    assert.notDeepEqual(round.optionIds, GROCERY_SHOPPING_SEQUENCE.map((step) => step.id));
});
