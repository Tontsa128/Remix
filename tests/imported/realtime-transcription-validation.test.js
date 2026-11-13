import assert from "node:assert/strict";
import test from "node:test";
import { parseRealtimeTranscriptionSession, REALTIME_TRANSCRIPTION_LANGUAGES } from "../../src/lib/elovio-provider/realtime-transcription-validation";
test("restricts initial realtime transcription hints to the three launch languages", () => {
    assert.deepEqual(REALTIME_TRANSCRIPTION_LANGUAGES, ["fi", "es", "en"]);
});
test("parses a valid short-lived client secret", () => {
    assert.deepEqual(parseRealtimeTranscriptionSession({
        value: "ephemeral-client-secret-value",
        expires_at: 1_900_000_000,
    }), {
        clientSecret: "ephemeral-client-secret-value",
        expiresAt: 1_900_000_000,
    });
});
test("rejects missing, malformed and unbounded session secrets", () => {
    assert.equal(parseRealtimeTranscriptionSession(null), null);
    assert.equal(parseRealtimeTranscriptionSession({}), null);
    assert.equal(parseRealtimeTranscriptionSession({ value: "short", expires_at: 1_900_000_000 }), null);
    assert.equal(parseRealtimeTranscriptionSession({ value: "x".repeat(4097), expires_at: 1_900_000_000 }), null);
    assert.equal(parseRealtimeTranscriptionSession({ value: "valid-secret-value-123", expires_at: "later" }), null);
});
