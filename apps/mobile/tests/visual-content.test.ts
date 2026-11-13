import assert from "node:assert/strict";
import test from "node:test";
import { getVisualVocabularyOptions, isValidVisualVocabularyEntry, VISUAL_VOCABULARY } from "../src/content/visual-vocabulary";

test("visual vocabulary contains both real photographs and original illustrations", () => {
  assert.ok(VISUAL_VOCABULARY.some((entry) => entry.mediaType === "photograph"));
  assert.ok(VISUAL_VOCABULARY.some((entry) => entry.mediaType === "illustration"));
});

test("every visual vocabulary entry has three language forms and complete source metadata", () => {
  for (const entry of VISUAL_VOCABULARY) {
    assert.equal(isValidVisualVocabularyEntry(entry), true, entry.id);
    assert.ok(entry.words.fi && entry.words.es && entry.words.en, entry.id);
    assert.ok(entry.imageDescription.fi && entry.imageDescription.es && entry.imageDescription.en, entry.id);
  }
});

test("each external photograph declares a matching original illustration for offline fallback", () => {
  const photos = VISUAL_VOCABULARY.filter((entry) => entry.mediaType === "photograph");
  assert.deepEqual(photos.map((entry) => entry.offlineFallbackIllustration), ["apple", "dog"]);
  assert.ok(photos.every((entry) => entry.offlineFallbackIllustration));
});

test("photographs have source links while original illustrations do not claim external licences", () => {
  const photographs = VISUAL_VOCABULARY.filter((entry) => entry.mediaType === "photograph");
  const illustrations = VISUAL_VOCABULARY.filter((entry) => entry.mediaType === "illustration");
  assert.ok(photographs.every((entry) => entry.image && entry.sourceUrl && entry.author && entry.license));
  assert.ok(illustrations.every((entry) => !entry.image && entry.author === "Elovio" && entry.license === "Original Elovio artwork"));
});

test("visual matching offers the correct word and real vocabulary distractors", () => {
  for (const entry of VISUAL_VOCABULARY) {
    const options = getVisualVocabularyOptions(entry.id, "es");
    assert.equal(options.length, Math.min(3, VISUAL_VOCABULARY.length));
    assert.ok(options.some((option) => option.id === entry.id && option.word === entry.words.es));
    assert.equal(new Set(options.map((option) => option.id)).size, options.length);
  }
  assert.deepEqual(getVisualVocabularyOptions("unknown", "fi"), []);
});
