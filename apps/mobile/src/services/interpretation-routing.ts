export type InterpretationLanguage = "fi" | "es" | "en";

export type InterpretationDirection = {
  speaker: "user" | "counterpart";
  sourceLanguage: InterpretationLanguage;
  targetLanguage: InterpretationLanguage;
};

/**
 * Resolve the direction from provider-detected speech only when it matches
 * one of the two explicitly selected conversation languages.
 */
export function resolveInterpretationDirection(
  detectedLanguage: string | undefined,
  userLanguage: string,
  counterpartLanguage: string,
): InterpretationDirection | null {
  if (!detectedLanguage) return null;
  const source = detectedLanguage.toLowerCase().split("-")[0];
  const user = userLanguage.toLowerCase().split("-")[0];
  const counterpart = counterpartLanguage.toLowerCase().split("-")[0];

  if (source !== "fi" && source !== "es" && source !== "en") return null;
  if (user !== "fi" && user !== "es" && user !== "en") return null;
  if (counterpart !== "fi" && counterpart !== "es" && counterpart !== "en") return null;
  if (user === counterpart) return null;

  if (source === user) {
    return {
      speaker: "user",
      sourceLanguage: source,
      targetLanguage: counterpart,
    };
  }
  if (source === counterpart) {
    return {
      speaker: "counterpart",
      sourceLanguage: counterpart,
      targetLanguage: user,
    };
  }
  return null;
}
