import assert from "node:assert/strict";
import test from "node:test";
import { isStudyAnswerCorrect, normalizeStudyAnswer } from "../src/services/answer-normalization";
import { getVisualVocabularyOptions, VISUAL_VOCABULARY } from "../src/content/visual-vocabulary";

test("normalizes surrounding and repeated whitespace without changing letters", () => {
  assert.equal(normalizeStudyAnswer("  MANZÁNA   "), "manzána");
  assert.equal(normalizeStudyAnswer("  perro  "), "perro");
});

test("accepts case and whitespace variants but preserves meaningful accents", () => {
  assert.equal(isStudyAnswerCorrect("  MANZÁNA ", "manzána"), true);
  assert.equal(isStudyAnswerCorrect("pera", "manzana"), false);
  assert.equal(isStudyAnswerCorrect("año", "ano"), false);
  assert.equal(isStudyAnswerCorrect("talo", "tälö"), false);
  assert.equal(isStudyAnswerCorrect("", "apple"), false);
});

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("visual word choices contain the correct answer and two unique real distractors", () => {
  for (const entry of VISUAL_VOCABULARY) {
    const options = getVisualVocabularyOptions(entry.id, "es", seededRandom(17));
    assert.equal(options.length, 3);
    assert.equal(options.filter((option) => option.id === entry.id).length, 1);
    assert.equal(new Set(options.map((option) => option.id)).size, 3);
    for (const option of options) {
      const catalogueEntry = VISUAL_VOCABULARY.find((item) => item.id === option.id);
      assert.ok(catalogueEntry);
      assert.equal(option.word, catalogueEntry.words.es);
    }
  }
});

test("visual word choices are reproducible with an injected random source", () => {
  const first = getVisualVocabularyOptions("apple", "en", seededRandom(42));
  const second = getVisualVocabularyOptions("apple", "en", seededRandom(42));
  assert.deepEqual(first, second);
});

test("correct answer position and distractors vary between visual rounds", () => {
  const rounds = Array.from({ length: 12 }, (_, index) =>
    getVisualVocabularyOptions("apple", "fi", seededRandom(index + 1)),
  );
  const correctPositions = new Set(rounds.map((options) => options.findIndex((option) => option.id === "apple")));
  const distractorSets = new Set(rounds.map((options) => options.filter((option) => option.id !== "apple").map((option) => option.id).sort().join(",")));
  assert.ok(correctPositions.size > 1);
  assert.ok(distractorSets.size > 1);
});

test("visual word choices return no options for unknown content identifiers", () => {
  assert.deepEqual(getVisualVocabularyOptions("not-in-the-catalogue", "fi"), []);
});
