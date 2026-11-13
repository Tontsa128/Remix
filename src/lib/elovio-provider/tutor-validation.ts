import { STARTER_PHRASES } from "../../imported/content/initial-phrases";
import { VISUAL_VOCABULARY } from "../../imported/content/visual-vocabulary";

export type TutorChatMessage = { role: "user" | "assistant"; content: string };
export type TutorLearningContext = {
  completedPhraseIds: string[];
  duePhraseIds: string[];
  difficultPhraseIds: string[];
  masteredVisualEntryIds: string[];
};
export type TutorRequest = {
  interfaceLanguage: string;
  nativeLanguage: string;
  learningLanguage: string;
  learnerLevel: string;
  learningContext: TutorLearningContext;
  messages: TutorChatMessage[];
};

const LANGUAGES = new Set(["fi", "es", "en"]);
const LEVELS = new Set(["beginner", "elementary", "intermediate", "advanced"]);
const PHRASE_IDS = new Set(STARTER_PHRASES.map((phrase) => phrase.id));
const VISUAL_IDS = new Set(VISUAL_VOCABULARY.map((entry) => entry.id));
function parseIdList(value: unknown, allowed: Set<string>, max: number): string[] | null {
  if (!Array.isArray(value) || value.length > max) return null;
  if (!value.every((id) => typeof id === "string" && allowed.has(id))) return null;
  return [...new Set(value)];
}

export function parseTutorRequest(value: unknown): TutorRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const languages = [body["interfaceLanguage"], body["nativeLanguage"], body["learningLanguage"]];
  if (!languages.every((item) => typeof item === "string" && LANGUAGES.has(item))) return null;
  if (typeof body["learnerLevel"] !== "string" || !LEVELS.has(body["learnerLevel"])) return null;
  const context = body["learningContext"] && typeof body["learningContext"] === "object" && !Array.isArray(body["learningContext"])
    ? body["learningContext"] as Record<string, unknown>
    : {};
  const completedPhraseIds = parseIdList(context["completedPhraseIds"] ?? [], PHRASE_IDS, 30);
  const duePhraseIds = parseIdList(context["duePhraseIds"] ?? [], PHRASE_IDS, 12);
  const difficultPhraseIds = parseIdList(context["difficultPhraseIds"] ?? [], PHRASE_IDS, 8);
  const masteredVisualEntryIds = parseIdList(context["masteredVisualEntryIds"] ?? [], VISUAL_IDS, 6);
  if (!completedPhraseIds || !duePhraseIds || !difficultPhraseIds || !masteredVisualEntryIds) return null;
  if (!Array.isArray(body["messages"]) || body["messages"].length < 1 || body["messages"].length > 12) return null;
  const messages: TutorChatMessage[] = [];
  for (let index = 0; index < body["messages"].length; index += 1) {
    const item = body["messages"][index];
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const message = item as Record<string, unknown>;
    if ((message["role"] !== "user" && message["role"] !== "assistant") ||
        typeof message["content"] !== "string" ||
        message["content"].trim().length === 0 ||
        message["content"].length > 2000) return null;
    const expectedRole = index % 2 === 0 ? "user" : "assistant";
    if (message["role"] !== expectedRole) return null;
    messages.push({ role: message["role"], content: message["content"].trim() });
  }
  if (messages[messages.length - 1]?.role !== "user") return null;
  return {
    interfaceLanguage: body["interfaceLanguage"] as string,
    nativeLanguage: body["nativeLanguage"] as string,
    learningLanguage: body["learningLanguage"] as string,
    learnerLevel: body["learnerLevel"],
    learningContext: { completedPhraseIds, duePhraseIds, difficultPhraseIds, masteredVisualEntryIds },
    messages,
  };
}


export type TutorStructuredResponse = {
  message: string;
  targetExample: string;
  translation: string;
  correction?: { original: string; corrected: string; reason: string };
  nextPrompt: string;
  confidence: "high" | "medium" | "low";
  needsClarification: boolean;
  visualVocabularyId: string | null;
};

export function parseTutorStructuredResponse(value: unknown): TutorStructuredResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  const requiredStrings = ["message", "targetExample", "translation", "nextPrompt"];
  if (!requiredStrings.every((key) => typeof result[key] === "string" && (result[key] as string).length <= 2000)) return null;
  if (!(result["message"] as string).trim()) return null;
  if (!["high", "medium", "low"].includes(String(result["confidence"]))) return null;
  if (typeof result["needsClarification"] !== "boolean") return null;
  if (result["visualVocabularyId"] !== null && result["visualVocabularyId"] !== undefined &&
      (typeof result["visualVocabularyId"] !== "string" || !VISUAL_IDS.has(result["visualVocabularyId"]))) return null;

  let correction: TutorStructuredResponse["correction"];
  if (result["correction"] !== undefined && result["correction"] !== null) {
    if (typeof result["correction"] !== "object" || Array.isArray(result["correction"])) return null;
    const candidate = result["correction"] as Record<string, unknown>;
    if (![candidate["original"], candidate["corrected"], candidate["reason"]].every(
      (item) => typeof item === "string" && item.trim().length > 0 && item.length <= 1000,
    )) return null;
    correction = {
      original: candidate["original"] as string,
      corrected: candidate["corrected"] as string,
      reason: candidate["reason"] as string,
    };
  }

  return {
    message: result["message"] as string,
    targetExample: result["targetExample"] as string,
    translation: result["translation"] as string,
    ...(correction ? { correction } : {}),
    nextPrompt: result["nextPrompt"] as string,
    confidence: result["confidence"] as TutorStructuredResponse["confidence"],
    needsClarification: result["needsClarification"],
    visualVocabularyId: typeof result["visualVocabularyId"] === "string" ? result["visualVocabularyId"] : null,
  };
}
