import assert from "node:assert/strict";
import test from "node:test";
import { COFFEE_PREPARATION_SEQUENCE } from "../src/content/visual-sequences";
import { createVisualSequenceRound, isNextVisualSequenceStep } from "../src/services/visual-sequence";

test("coffee preparation sequence has four distinct ordered steps and three language variants", () => {
  assert.equal(COFFEE_PREPARATION_SEQUENCE.length, 4);
  assert.deepEqual(COFFEE_PREPARATION_SEQUENCE.map((step) => step.order), [1, 2, 3, 4]);
  assert.equal(new Set(COFFEE_PREPARATION_SEQUENCE.map((step) => step.id)).size, 4);
  for (const step of COFFEE_PREPARATION_SEQUENCE) {
    assert.ok(step.words.fi && step.words.es && step.words.en, step.id);
    assert.ok(step.description.fi && step.description.es && step.description.en, step.id);
  }
});

test("visual sequence round contains every real step exactly once", () => {
  const round = createVisualSequenceRound(() => 0.5);
  assert.equal(round.optionIds.length, 4);
  assert.deepEqual([...round.optionIds].sort(), COFFEE_PREPARATION_SEQUENCE.map((step) => step.id).sort());
});

test("sequence validator accepts only the next process step", () => {
  assert.equal(isNextVisualSequenceStep("fill-kettle", 0), true);
  assert.equal(isNextVisualSequenceStep("heat-water", 0), false);
  assert.equal(isNextVisualSequenceStep("heat-water", 1), true);
  assert.equal(isNextVisualSequenceStep("pour-water", 4), false);
});
