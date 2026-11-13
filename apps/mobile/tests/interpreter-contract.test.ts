import assert from "node:assert/strict";
import test from "node:test";
import { parseRecognizedInterpreterTurn } from "../../../reference/mobile-provider-tests/api/_lib/interpreter-contract";

test("accepts bounded recognized turns and normalizes transcript whitespace", () => {
  const parsed = parseRecognizedInterpreterTurn({ sessionId:"session_12345678", speaker:"counterpart", sourceLanguage:"es", targetLanguage:"fi", transcript:"  Buenos días.  ", stage:"final" });
  assert.equal(parsed?.transcript, "Buenos días.");
  assert.equal(parsed?.targetLanguage, "fi");
});
test("rejects unsupported languages, same-language output and malformed input", () => {
  const base = { sessionId:"session_12345678", speaker:"user", sourceLanguage:"fi", targetLanguage:"es", transcript:"Hei", stage:"partial" };
  assert.equal(parseRecognizedInterpreterTurn({ ...base, sourceLanguage:"xx" }), null);
  assert.equal(parseRecognizedInterpreterTurn({ ...base, targetLanguage:"fi" }), null);
  assert.equal(parseRecognizedInterpreterTurn({ ...base, sessionId:"bad" }), null);
  assert.equal(parseRecognizedInterpreterTurn({ ...base, transcript:" " }), null);
  assert.equal(parseRecognizedInterpreterTurn({ ...base, transcript:"x".repeat(4001) }), null);
  assert.equal(parseRecognizedInterpreterTurn({ ...base, stage:"complete" }), null);
});
