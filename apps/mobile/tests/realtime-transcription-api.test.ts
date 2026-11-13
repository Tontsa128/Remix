import assert from "node:assert/strict";
import test from "node:test";
import {
  createRealtimeTranscriptionSession,
  RealtimeTranscriptionApiError,
} from "../src/services/realtime-transcription-api";

const validSession = () => ({
  clientSecret: "ephemeral-client-secret-value",
  expiresAt: Math.floor(Date.now() / 1000) + 60,
  websocketUrl: "wss://api.openai.com/v1/realtime?intent=transcription",
  audio: { format: "pcm16", sampleRate: 24000, channels: 1 },
  languageHints: ["fi", "es", "en"],
});

test("requests an authenticated ephemeral realtime session and validates its audio contract", async () => {
  let requestedUrl = "";
  let requestedInit: RequestInit | undefined;
  const session = await createRealtimeTranscriptionSession(
    "supabase-access-token",
    "https://api.example.test/",
    async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return new Response(JSON.stringify(validSession()), { status: 200 });
    },
    false,
  );
  assert.equal(requestedUrl, "https://api.example.test/api/ai/transcription-session");
  assert.equal(requestedInit?.method, "POST");
  assert.equal((requestedInit?.headers as Record<string, string>).Authorization, "Bearer supabase-access-token");
  assert.equal(session.audio.sampleRate, 24000);
  assert.deepEqual(session.languageHints, ["fi", "es", "en"]);
});

test("rejects invalid tokens, malformed session responses and expired secrets", async () => {
  await assert.rejects(
    createRealtimeTranscriptionSession("", "https://api.example.test", fetch, false),
    RealtimeTranscriptionApiError,
  );
  await assert.rejects(
    createRealtimeTranscriptionSession("token", "https://api.example.test", async () =>
      new Response(JSON.stringify({ ...validSession(), expiresAt: 1 }), { status: 200 }), false),
    RealtimeTranscriptionApiError,
  );
  await assert.rejects(
    createRealtimeTranscriptionSession("token", "https://api.example.test", async () =>
      new Response(JSON.stringify({ ...validSession(), websocketUrl: "ws://insecure.test" }), { status: 200 }), false),
    RealtimeTranscriptionApiError,
  );
});

test("returns bounded provider errors without leaking response details", async () => {
  await assert.rejects(
    createRealtimeTranscriptionSession("token", "https://api.example.test", async () =>
      new Response(JSON.stringify({ error: "transcription_provider_not_configured", detail: "secret" }), { status: 503 }), false),
    (error: unknown) => error instanceof RealtimeTranscriptionApiError &&
      error.code === "transcription_provider_not_configured" &&
      !error.message.includes("secret"),
  );
});
