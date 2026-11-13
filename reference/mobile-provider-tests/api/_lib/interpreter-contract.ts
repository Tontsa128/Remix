import { LANGUAGES } from "../../../../apps/mobile/src/config/languages";

const languageCodes = new Set(LANGUAGES.map((language) => language.code));

export type RecognizedInterpreterTurn = {
  sessionId: string;
  speaker: "user" | "counterpart";
  sourceLanguage: string;
  targetLanguage: string;
  transcript: string;
  stage: "partial" | "final";
};

export function parseRecognizedInterpreterTurn(value: unknown): RecognizedInterpreterTurn | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (typeof body.sessionId !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(body.sessionId) ||
      (body.speaker !== "user" && body.speaker !== "counterpart") ||
      typeof body.sourceLanguage !== "string" || !languageCodes.has(body.sourceLanguage) ||
      typeof body.targetLanguage !== "string" || !languageCodes.has(body.targetLanguage) ||
      body.sourceLanguage === body.targetLanguage ||
      typeof body.transcript !== "string" || body.transcript.trim().length === 0 ||
      body.transcript.length > 4000 || (body.stage !== "partial" && body.stage !== "final")) return null;
  return {
    sessionId: body.sessionId, speaker: body.speaker,
    sourceLanguage: body.sourceLanguage, targetLanguage: body.targetLanguage,
    transcript: body.transcript.trim(), stage: body.stage,
  };
}
