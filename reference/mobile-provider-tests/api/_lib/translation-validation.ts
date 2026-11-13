export const INTERPRETER_LANGUAGES = ["fi", "es", "en"] as const;
export type InterpreterLanguage = (typeof INTERPRETER_LANGUAGES)[number];

export type TranslationRequest = {
  text: string;
  sourceLanguage: InterpreterLanguage | "auto";
  targetLanguage: InterpreterLanguage;
};

export type TranslationResult = {
  translatedText: string;
  detectedSourceLanguage: InterpreterLanguage;
  targetLanguage: InterpreterLanguage;
};

export function parseTranslationRequest(value: unknown): TranslationRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (typeof input.text !== "string") return null;
  const text = input.text.trim();
  if (!text || text.length > 4000) return null;
  const sourceLanguage = input.sourceLanguage ?? "auto";
  const targetLanguage = input.targetLanguage;
  if (!(sourceLanguage === "auto" || INTERPRETER_LANGUAGES.includes(sourceLanguage as InterpreterLanguage))) return null;
  if (typeof targetLanguage !== "string" || !INTERPRETER_LANGUAGES.includes(targetLanguage as InterpreterLanguage)) return null;
  if (sourceLanguage === targetLanguage) return null;
  return { text, sourceLanguage: sourceLanguage as TranslationRequest["sourceLanguage"], targetLanguage: targetLanguage as InterpreterLanguage };
}

export function parseTranslationResult(value: unknown, targetLanguage: InterpreterLanguage): TranslationResult | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  if (typeof result.translatedText !== "string" || !result.translatedText.trim() || result.translatedText.length > 8000) return null;
  if (typeof result.detectedSourceLanguage !== "string" ||
      !INTERPRETER_LANGUAGES.includes(result.detectedSourceLanguage as InterpreterLanguage) ||
      result.detectedSourceLanguage === targetLanguage) return null;
  return {
    translatedText: result.translatedText,
    detectedSourceLanguage: result.detectedSourceLanguage as InterpreterLanguage,
    targetLanguage,
  };
}
