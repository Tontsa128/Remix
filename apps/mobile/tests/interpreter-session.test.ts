import assert from "node:assert/strict";
import test from "node:test";
import { canPersistTranscript, getTurnTargetLanguage, validateInterpreterSessionConfig, validateTranscriptTurn } from "../src/services/interpreter-session";

test("accepts both approved interpreter modes and text plus audio output", () => {
  assert.equal(validateInterpreterSessionConfig({ userLanguage:"fi", counterpartLanguage:"auto", mode:"both", output:"both", history:"opt_in" }), true);
});
test("rejects unsupported languages and invalid session options", () => {
  assert.equal(validateInterpreterSessionConfig({ userLanguage:"xx", counterpartLanguage:"auto", mode:"both", output:"both", history:"off" }), false);
  assert.equal(validateInterpreterSessionConfig({ userLanguage:"fi", counterpartLanguage:"es", mode:"secret", output:"both", history:"off" }), false);
  assert.equal(validateInterpreterSessionConfig({ userLanguage:"fi", counterpartLanguage:"es", mode:"both", output:"audio", history:"always" }), false);
});
test("routes counterpart speech to the user and user speech to the counterpart", () => {
  assert.equal(getTurnTargetLanguage({ speaker:"counterpart", userLanguage:"fi", counterpartLanguage:"es", detectedSourceLanguage:"es" }), "fi");
  assert.equal(getTurnTargetLanguage({ speaker:"user", userLanguage:"fi", counterpartLanguage:"es", detectedSourceLanguage:"fi" }), "es");
});
test("rejects language/speaker mismatches instead of guessing", () => {
  assert.equal(getTurnTargetLanguage({ speaker:"counterpart", userLanguage:"fi", counterpartLanguage:"es", detectedSourceLanguage:"fi" }), null);
  assert.equal(getTurnTargetLanguage({ speaker:"user", userLanguage:"fi", counterpartLanguage:"es", detectedSourceLanguage:"en" }), null);
});
test("persists transcript only with opt-in and explicit consent", () => {
  const off = { userLanguage:"fi", counterpartLanguage:"auto" as const, mode:"both" as const, output:"both" as const, history:"off" as const };
  const optIn = { ...off, history:"opt_in" as const };
  assert.equal(canPersistTranscript(off, true), false);
  assert.equal(canPersistTranscript(optIn, false), false);
  assert.equal(canPersistTranscript(optIn, true), true);
});
test("validates bounded transcript turns", () => {
  const valid = { id:"turn-1", speaker:"counterpart", sourceLanguage:"es", targetLanguage:"fi", originalText:"¿Tiene una reserva?", translatedText:"Onko teillä varaus?", stage:"final", createdAt:"2026-11-08T12:00:00.000Z" };
  assert.equal(validateTranscriptTurn(valid), true);
  assert.equal(validateTranscriptTurn({ ...valid, targetLanguage:"es" }), false);
  assert.equal(validateTranscriptTurn({ ...valid, originalText:" " }), false);
  assert.equal(validateTranscriptTurn({ ...valid, translatedText:"x".repeat(4001) }), false);
});
