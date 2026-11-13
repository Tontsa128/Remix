export type SupportedContentLanguage = "fi" | "es" | "en";

/** Resolve a requested language to content available in the current learning catalogue. */
export function resolveContentLanguage(language: string, fallback: SupportedContentLanguage = "fi"): SupportedContentLanguage {
  return language === "fi" || language === "es" || language === "en" ? language : fallback;
}
