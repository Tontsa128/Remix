import { LANGUAGES, type LanguageCode } from "../config/languages";
import type { InterpreterSessionConfig, InterpreterTranscriptTurn } from "../types/interpreter";

const languageCodes = new Set(LANGUAGES.map((language) => language.code));

export function validateInterpreterSessionConfig(value: unknown): value is InterpreterSessionConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  return typeof config.userLanguage === "string" &&
    languageCodes.has(config.userLanguage) &&
    (config.counterpartLanguage === "auto" ||
      (typeof config.counterpartLanguage === "string" && languageCodes.has(config.counterpartLanguage))) &&
    ["face_to_face", "headphones", "both"].includes(String(config.mode)) &&
    ["text", "audio", "both"].includes(String(config.output)) &&
    ["off", "opt_in"].includes(String(config.history)) &&
    (config.historyConsentAt === undefined ||
      (typeof config.historyConsentAt === "string" && !Number.isNaN(Date.parse(config.historyConsentAt))));
}

/** Route each speaker's words to the other participant's language. */
export function getTurnTargetLanguage(input: {
  speaker: "user" | "counterpart";
  userLanguage: LanguageCode;
  counterpartLanguage: LanguageCode;
  detectedSourceLanguage: LanguageCode;
}): LanguageCode | null {
  const { speaker, userLanguage, counterpartLanguage, detectedSourceLanguage } = input;
  if (detectedSourceLanguage !== userLanguage && detectedSourceLanguage !== counterpartLanguage) return null;
  if (speaker === "counterpart") return detectedSourceLanguage === userLanguage ? null : userLanguage;
  return detectedSourceLanguage === counterpartLanguage ? null : counterpartLanguage;
}

export function canPersistTranscript(config: InterpreterSessionConfig, explicitConsent: boolean): boolean {
  return config.history === "opt_in" && explicitConsent;
}

export function validateTranscriptTurn(value: unknown): value is InterpreterTranscriptTurn {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const turn = value as Record<string, unknown>;
  return typeof turn.id === "string" && turn.id.trim().length > 0 && turn.id.length <= 128 &&
    (turn.speaker === "user" || turn.speaker === "counterpart") &&
    typeof turn.sourceLanguage === "string" && languageCodes.has(turn.sourceLanguage) &&
    typeof turn.targetLanguage === "string" && languageCodes.has(turn.targetLanguage) &&
    turn.sourceLanguage !== turn.targetLanguage &&
    typeof turn.originalText === "string" && turn.originalText.trim().length > 0 && turn.originalText.length <= 4000 &&
    typeof turn.translatedText === "string" && turn.translatedText.trim().length > 0 && turn.translatedText.length <= 4000 &&
    (turn.stage === "partial" || turn.stage === "final") &&
    typeof turn.createdAt === "string" && !Number.isNaN(Date.parse(turn.createdAt));
}
