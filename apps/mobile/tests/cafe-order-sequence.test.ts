import assert from "node:assert/strict";
import test from "node:test";
import { CAFE_ORDER_SEQUENCE } from "../src/content/cafe-order-sequence";
import { createCafeOrderRound, isNextCafeOrderStep } from "../src/services/cafe-order-sequence";

test("café order sequence has four unique ordered steps in Finnish, Spanish and English", () => {
  assert.equal(CAFE_ORDER_SEQUENCE.length, 4);
  assert.deepEqual(CAFE_ORDER_SEQUENCE.map((step) => step.order), [1, 2, 3, 4]);
  assert.equal(new Set(CAFE_ORDER_SEQUENCE.map((step) => step.id)).size, 4);
  for (const step of CAFE_ORDER_SEQUENCE) for (const language of ["fi", "es", "en"] as const) {
    assert.ok(step.words[language].trim());
    assert.ok(step.description[language].trim());
  }
});

test("café order accepts only the next step", () => {
  assert.equal(isNextCafeOrderStep("read-menu", 0), true);
  assert.equal(isNextCafeOrderStep("pay-order", 0), false);
  assert.equal(isNextCafeOrderStep("pay-order", 2), true);
  assert.equal(isNextCafeOrderStep("collect-order", 4), false);
});

test("café order rounds shuffle without losing or duplicating steps", () => {
  const round = createCafeOrderRound(() => 0);
  assert.equal(new Set(round.optionIds).size, CAFE_ORDER_SEQUENCE.length);
  assert.deepEqual([...round.optionIds].sort(), CAFE_ORDER_SEQUENCE.map((step) => step.id).sort());
  assert.notDeepEqual(round.optionIds, CAFE_ORDER_SEQUENCE.map((step) => step.id));
});
