import assert from "node:assert/strict";
import test from "node:test";
import { createGeminiTutorProvider, TutorProviderError } from "../../../reference/mobile-provider-tests/api/_lib/tutor-provider";

test("Gemini adapter maps conversation roles and requests the structured response contract", async () => {
  let requestedUrl = "";
  let requestBody: Record<string, unknown> | undefined;
  let requestHeaders: Record<string, string> | undefined;
  const provider = createGeminiTutorProvider("server-secret", "gemini-test", async (url, init) => {
    requestedUrl = String(url);
    requestHeaders = init?.headers as Record<string, string>;
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({ message: "Hola", targetExample: "Buenos días", translation: "Hyvää huomenta", nextPrompt: "¿Qué tal?", confidence: "high", needsClarification: false }) }] } }],
    }), { status: 200 });
  });

  const output = await provider.generate({
    systemInstruction: "Be a tutor",
    messages: [
      { role: "user", content: "Hola" },
      { role: "assistant", content: "¡Hola!" },
      { role: "user", content: "¿Cómo estás?" },
    ],
  });

  assert.match(requestedUrl, /models\/gemini-test:generateContent/);
  assert.doesNotMatch(requestedUrl, /server-secret/);
  assert.equal(requestHeaders?.["x-goog-api-key"], "server-secret");
  assert.equal(JSON.parse(output).message, "Hola");
  const contents = requestBody?.contents as Array<{ role: string }>;
  assert.deepEqual(contents.map((item) => item.role), ["user", "model", "user"]);
  const config = requestBody?.generationConfig as Record<string, unknown>;
  assert.equal(config.responseMimeType, "application/json");
  const schema = config.responseJsonSchema as { properties?: Record<string, unknown> };
  assert.deepEqual(schema.properties?.visualVocabularyId, { type: ["string", "null"], enum: ["apple", "dog", "house", "coffee", "bus", "book", null] });
  assert.equal(config.responseSchema, undefined);
});

test("Gemini adapter returns a generic error without exposing provider details", async () => {
  const provider = createGeminiTutorProvider("secret", "gemini-test", async () =>
    new Response("private provider error", { status: 500 }),
  );
  await assert.rejects(
    provider.generate({ systemInstruction: "test", messages: [{ role: "user", content: "hola" }] }),
    (error: unknown) => error instanceof TutorProviderError && !error.message.includes("private"),
  );
});
