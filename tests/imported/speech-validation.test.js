import assert from "node:assert/strict";
import test from "node:test";
import { parseSpeechVoices, parseSynthesisRequest, parseSynthesisResult, SPEECH_LANGUAGES } from "../../src/lib/elovio-provider/speech-validation";
test("maps supported app languages to explicit locale tags", () => {
    assert.deepEqual(SPEECH_LANGUAGES, { fi: "fi-FI", es: "es-ES", en: "en-US" });
});
test("validates synthesis input and rejects unsupported or oversized requests", () => {
    assert.deepEqual(parseSynthesisRequest({ text: " Hei ", language: "fi", voiceName: "fi-FI-Chirp3-HD-Aoede", gender: "FEMALE" }), {
        text: "Hei", language: "fi", voiceName: "fi-FI-Chirp3-HD-Aoede", gender: "FEMALE",
    });
    assert.equal(parseSynthesisRequest({ text: "x".repeat(1201), language: "fi", voiceName: "fi-FI-Chirp3-HD-Aoede", gender: "FEMALE" }), null);
    assert.equal(parseSynthesisRequest({ text: "hello", language: "de", voiceName: "de-DE-Voice-A", gender: "FEMALE" }), null);
    assert.equal(parseSynthesisRequest({ text: "hello", language: "en", voiceName: "en-US-Voice-A", gender: "NEUTRAL" }), null);
});
test("filters provider voice catalogue to exact locale and real male/female voice IDs", () => {
    const result = parseSpeechVoices({ voices: [
            { name: "fi-FI-Chirp3-HD-Aoede", languageCodes: ["fi-FI"], ssmlGender: "FEMALE", naturalSampleRateHertz: 24000 },
            { name: "fi-FI-Chirp3-HD-Charon", languageCodes: ["fi-FI"], ssmlGender: "MALE", naturalSampleRateHertz: 24000 },
            { name: "en-US-Neural2-A", languageCodes: ["en-US"], ssmlGender: "FEMALE", naturalSampleRateHertz: 24000 },
            { name: "fi-FI-Unknown", languageCodes: ["fi-FI"], ssmlGender: "NEUTRAL", naturalSampleRateHertz: 24000 },
        ] }, "fi-FI");
    assert.deepEqual(result?.map((voice) => [voice.name, voice.gender]), [
        ["fi-FI-Chirp3-HD-Aoede", "FEMALE"], ["fi-FI-Chirp3-HD-Charon", "MALE"],
    ]);
});
test("rejects malformed audio responses", () => {
    assert.equal(parseSynthesisResult({ audioContent: "not-base64!" }), null);
    assert.equal(parseSynthesisResult({ audioContent: "A".repeat(4_000_001) }), null);
    assert.equal(parseSynthesisResult({ audioContent: "A".repeat(4_000_000) })?.audioContent.length, 4_000_000);
    assert.equal(parseSynthesisResult({ audioContent: "A".repeat(200) })?.audioContent.length, 200);
});
