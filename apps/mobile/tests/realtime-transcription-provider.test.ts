import assert from "node:assert/strict";
import test from "node:test";
import { createOpenAIRealtimeTranscriptionProvider, RealtimeTranscriptionProviderError } from "../../../reference/mobile-provider-tests/api/_lib/realtime-transcription-provider";

test("requests a short-lived realtime token with committed-turn language detection hints", async () => {
  let url = "";
  let headers: HeadersInit | undefined;
  let body: Record<string, unknown> = {};
  const provider = createOpenAIRealtimeTranscriptionProvider("server-secret", async (requestUrl, init) => {
    url = String(requestUrl);
    headers = init?.headers;
    body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      value: "ephemeral-client-secret-value",
      expires_at: Math.floor(Date.now() / 1000) + 60,
    }), { status: 200 });
  });
  const result = await provider.createSession();
  assert.equal(url, "https://api.openai.com/v1/realtime/client_secrets");
  assert.deepEqual(headers, { Authorization: "Bearer server-secret", "Content-Type": "application/json" });
  assert.deepEqual(body, {
    expires_after: { anchor: "created_at", seconds: 60 },
    session: {
      type: "transcription",
      audio: {
        input: {
          format: { type: "audio/pcm", rate: 24000 },
          transcription: { model: "gpt-transcribe", languages: ["fi", "es", "en"] },
          turn_detection: null,
        },
      },
    },
  });
  assert.equal(result.clientSecret, "ephemeral-client-secret-value");
});

test("hides upstream failures and rejects expired session tokens", async () => {
  const failed = createOpenAIRealtimeTranscriptionProvider("secret", async () => new Response("private error", { status: 401 }));
  await assert.rejects(failed.createSession(), RealtimeTranscriptionProviderError);
  const expired = createOpenAIRealtimeTranscriptionProvider("secret", async () => new Response(JSON.stringify({
    value: "ephemeral-client-secret-value",
    expires_at: 1,
  }), { status: 200 }));
  await assert.rejects(expired.createSession(), RealtimeTranscriptionProviderError);
});
