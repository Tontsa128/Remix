import assert from "node:assert/strict";
import test from "node:test";
import { ASKING_DIRECTIONS_SEQUENCE } from "../src/content/asking-directions-sequence";
import { createAskingDirectionsRound, isNextAskingDirectionsStep } from "../src/services/asking-directions-sequence";

test("asking directions contains four unique ordered steps in all initial languages", () => {
  assert.equal(ASKING_DIRECTIONS_SEQUENCE.length, 4);
  assert.deepEqual(ASKING_DIRECTIONS_SEQUENCE.map((step) => step.order), [1, 2, 3, 4]);
  assert.equal(new Set(ASKING_DIRECTIONS_SEQUENCE.map((step) => step.id)).size, 4);
  for (const step of ASKING_DIRECTIONS_SEQUENCE) {
    for (const language of ["fi", "es", "en"] as const) {
      assert.ok(step.words[language].trim());
      assert.ok(step.description[language].trim());
    }
  }
});

test("asking directions accepts only the next semantic step", () => {
  assert.equal(isNextAskingDirectionsStep("check-map", 0), true);
  assert.equal(isNextAskingDirectionsStep("listen-directions", 0), false);
  assert.equal(isNextAskingDirectionsStep("listen-directions", 2), true);
  assert.equal(isNextAskingDirectionsStep("follow-route", 4), false);
});

test("each directions round contains every unique step", () => {
  const round = createAskingDirectionsRound(() => 0);
  assert.equal(new Set(round.optionIds).size, 4);
  assert.deepEqual([...round.optionIds].sort(), ASKING_DIRECTIONS_SEQUENCE.map((step) => step.id).sort());
  assert.notDeepEqual(round.optionIds, ASKING_DIRECTIONS_SEQUENCE.map((step) => step.id));
});
