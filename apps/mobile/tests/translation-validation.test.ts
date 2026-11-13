import assert from "node:assert/strict";
import test from "node:test";
import { parseTranslationRequest, parseTranslationResult } from "../../../reference/mobile-provider-tests/api/_lib/translation-validation";

test("accepts automatic source detection and selected Finnish, Spanish or English targets", () => {
  assert.deepEqual(parseTranslationRequest({ text: "¿Dónde está la recepción?", sourceLanguage: "auto", targetLanguage: "fi" }), {
    text: "¿Dónde está la recepción?", sourceLanguage: "auto", targetLanguage: "fi",
  });
  assert.equal(parseTranslationRequest({ text: "Good morning", sourceLanguage: "en", targetLanguage: "es" })?.targetLanguage, "es");
});

test("trims input and rejects unsupported, same-language, empty and oversized requests", () => {
  assert.equal(parseTranslationRequest({ text: " hola ", sourceLanguage: "es", targetLanguage: "fi" })?.text, "hola");
  assert.equal(parseTranslationRequest({ text: "hola", sourceLanguage: "es", targetLanguage: "es" }), null);
  assert.equal(parseTranslationRequest({ text: "hola", sourceLanguage: "xx", targetLanguage: "fi" }), null);
  assert.equal(parseTranslationRequest({ text: " ", sourceLanguage: "auto", targetLanguage: "fi" }), null);
  assert.equal(parseTranslationRequest({ text: "x".repeat(4001), sourceLanguage: "auto", targetLanguage: "fi" }), null);
});

test("accepts only bounded translations with a supported detected source", () => {
  assert.deepEqual(parseTranslationResult({ translatedText: "Missä vastaanotto on?", detectedSourceLanguage: "es" }, "fi"), {
    translatedText: "Missä vastaanotto on?", detectedSourceLanguage: "es", targetLanguage: "fi",
  });
  assert.equal(parseTranslationResult({ translatedText: "Hola", detectedSourceLanguage: "xx" }, "fi"), null);
  assert.equal(parseTranslationResult({ translatedText: "", detectedSourceLanguage: "es" }, "fi"), null);
  assert.equal(parseTranslationResult({ translatedText: "Hola", detectedSourceLanguage: "fi" }, "fi"), null);
});
