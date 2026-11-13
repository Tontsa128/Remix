import type { TutorChatMessage } from "./tutor-validation";

export type TutorGenerationInput = {
  systemInstruction: string;
  messages: TutorChatMessage[];
};

export interface TutorProvider {
  generate(input: TutorGenerationInput): Promise<string>;
}

export class TutorProviderError extends Error {
  constructor() {
    super("AI provider request failed");
    this.name = "TutorProviderError";
  }
}

export function createGeminiTutorProvider(
  apiKey: string,
  model = "gemini-3.5-flash-lite",
  fetcher: typeof fetch = fetch,
): TutorProvider {
  return {
    async generate(input) {
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(model) + ":generateContent";
      try {
        const response = await fetcher(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: input.systemInstruction }] },
            contents: input.messages.map((message) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
            generationConfig: {
              temperature: 0.65,
              maxOutputTokens: 700,
              responseMimeType: "application/json",
              responseJsonSchema: {
                type: "object",
                properties: {
                  message: { type: "string" },
                  targetExample: { type: "string" },
                  translation: { type: "string" },
                  correction: {
                    type: "object",
                    properties: {
                      original: { type: "string" },
                      corrected: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["original", "corrected", "reason"],
                  },
                  nextPrompt: { type: "string" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  needsClarification: { type: "boolean" },
                  visualVocabularyId: { type: ["string", "null"], enum: ["apple", "dog", "house", "coffee", "bus", "book", null] },
                },
                required: ["message", "targetExample", "translation", "nextPrompt", "confidence", "needsClarification", "visualVocabularyId"],
              },
            },
          }),
          signal: AbortSignal.timeout(20_000),
        });
        if (!response.ok) throw new TutorProviderError();
        const result = await response.json() as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = result.candidates?.[0]?.content?.parts
          ?.map((part) => part.text ?? "").join("").trim();
        if (!text) throw new TutorProviderError();
        return text;
      } catch {
        throw new TutorProviderError();
      }
    },
  };
}
