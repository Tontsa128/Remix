import type { InterpreterLanguage } from "./translation-validation";

export type TranslationProviderInput = {
  text: string;
  sourceLanguage: InterpreterLanguage | "auto";
  targetLanguage: InterpreterLanguage;
};

export interface TranslationProvider {
  translate(input: TranslationProviderInput): Promise<{ translatedText: string; detectedSourceLanguage: string }>;
}

export class TranslationProviderError extends Error {
  constructor() {
    super("Translation provider request failed");
    this.name = "TranslationProviderError";
  }
}

export function createGoogleTranslationProvider(
  apiKey: string,
  fetcher: typeof fetch = fetch,
): TranslationProvider {
  return {
    async translate(input) {
      try {
        const response = await fetcher(
          "https://translation.googleapis.com/language/translate/v2?key=" + encodeURIComponent(apiKey),
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              q: input.text,
              target: input.targetLanguage,
              ...(input.sourceLanguage === "auto" ? {} : { source: input.sourceLanguage }),
              format: "text",
            }),
            signal: AbortSignal.timeout(12_000),
          },
        );
        if (!response.ok) throw new TranslationProviderError();
        const payload = await response.json() as {
          data?: { translations?: Array<{ translatedText?: string; detectedSourceLanguage?: string }> };
        };
        const translation = payload.data?.translations?.[0];
        if (typeof translation?.translatedText !== "string" || !translation.translatedText.trim()) {
          throw new TranslationProviderError();
        }
        // Google may omit detectedSourceLanguage when the caller supplied source explicitly.
        // In that case the validated request language is the authoritative source.
        const detected = input.sourceLanguage === "auto"
          ? translation.detectedSourceLanguage
          : input.sourceLanguage;
        if (typeof detected !== "string") throw new TranslationProviderError();
        return {
          translatedText: translation.translatedText,
          detectedSourceLanguage: detected.toLowerCase().split("-")[0],
        };
      } catch {
        throw new TranslationProviderError();
      }
    },
  };
}
