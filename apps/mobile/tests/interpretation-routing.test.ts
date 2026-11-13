import assert from "node:assert/strict";
import test from "node:test";
import { resolveInterpretationDirection } from "../src/services/interpretation-routing";

test("routes a detected user-language turn to the counterpart language", () => {
  assert.deepEqual(resolveInterpretationDirection("fi", "fi", "es"), {
    speaker: "user",
    sourceLanguage: "fi",
    targetLanguage: "es",
  });
});

test("routes a detected counterpart-language turn to the user language", () => {
  assert.deepEqual(resolveInterpretationDirection("es-ES", "fi", "es"), {
    speaker: "counterpart",
    sourceLanguage: "es",
    targetLanguage: "fi",
  });
});

test("supports all launch language pairs in both directions", () => {
  for (const [user, counterpart] of [["fi", "es"], ["fi", "en"], ["es", "en"]] as const) {
    assert.equal(resolveInterpretationDirection(user, user, counterpart)?.targetLanguage, counterpart);
    assert.equal(resolveInterpretationDirection(counterpart, user, counterpart)?.targetLanguage, user);
  }
});

test("does not guess when detection is absent, unsupported or outside selected languages", () => {
  assert.equal(resolveInterpretationDirection(undefined, "fi", "es"), null);
  assert.equal(resolveInterpretationDirection("sv", "fi", "es"), null);
  assert.equal(resolveInterpretationDirection("en", "fi", "es"), null);
  assert.equal(resolveInterpretationDirection("fi", "fi", "fi"), null);
  assert.equal(resolveInterpretationDirection("es", "sv", "es"), null);
});
