import type { LanguageCode } from "../config/languages";

export type InterpreterMode = "face_to_face" | "headphones" | "both";
export type InterpreterOutput = "text" | "audio" | "both";
export type InterpreterHistory = "off" | "opt_in";
export type InterpreterSpeaker = "user" | "counterpart";
export type TranscriptStage = "partial" | "final";

export type InterpreterSessionConfig = {
  userLanguage: LanguageCode;
  counterpartLanguage: LanguageCode | "auto";
  mode: InterpreterMode;
  output: InterpreterOutput;
  history: InterpreterHistory;
  historyConsentAt?: string;
};

export type InterpreterTranscriptTurn = {
  id: string;
  speaker: InterpreterSpeaker;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  originalText: string;
  translatedText: string;
  stage: TranscriptStage;
  createdAt: string;
};

export type InterpreterServiceStatus =
  | "not_configured" | "connecting" | "listening" | "processing" | "error";
